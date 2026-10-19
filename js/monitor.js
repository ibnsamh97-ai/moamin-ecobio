/* =====================================================================
   EcoBio AI — الرصد الفضائي الحي: خريطة الأقمار الصناعية + القراءات + الرسوم
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, D = ECO.data;
  const S = { key: "pm2_5", cmp: "us_aqi", base: "viirs", overlays: U.store.get("overlays", { aod: true }), opacity: 0.7, data: null, cur: null };
  let map, baseLayer, ovLayers = {}, markers = {}, inited = false;

  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return U.isoDate(d); };
  const gibsUrl = (l, date) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.layer}/default/${date}/${l.tms}/{z}/{y}/{x}.${l.ext}`;

  function buildMap() {
    if (!window.L) { U.$("#map").innerHTML = `<div class="empty" style="margin:16px">تعذّر تحميل مكتبة الخرائط.</div>`; return; }
    map = L.map("map", { center: [34.75, 43.75], zoom: 7, minZoom: 4, maxZoom: 12, zoomSnap: 0.5, attributionControl: true });
    map.attributionControl.setPrefix(false);
    const date = U.$("#sat-date").value;
    const b = ECO.GIBS.base.find(x => x.id === S.base);
    baseLayer = L.tileLayer(gibsUrl(b, date), { maxNativeZoom: b.zoom, maxZoom: 12, attribution: '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA GIBS</a>' }).addTo(map);
    ECO.GIBS.overlays.forEach(o => {
      ovLayers[o.id] = L.tileLayer(gibsUrl(o, date), { maxNativeZoom: o.zoom, maxZoom: 12, opacity: S.opacity, zIndex: 5 });
      if (S.overlays[o.id]) ovLayers[o.id].addTo(map);
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 12, zIndex: 9, attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    L.polyline(ECO.TIGRIS, { color: "#4fc8dc", weight: 3, opacity: 0.85 }).addTo(map);
    ECO.STATIONS.forEach(s => {
      const m = L.circleMarker([s.lat, s.lon], { radius: 9, color: "#e4f1ed", weight: 2, fillColor: ECO.TONES.info, fillOpacity: 0.95 }).addTo(map);
      m.bindTooltip(`<b>${s.name}</b><br><span style="color:#8eaea7">${s.note}</span>`, { className: "eco-tip", direction: "top", offset: [0, -8] });
      m.on("click", () => select(s.id));
      markers[s.id] = m;
    });
    // مفتاح ألوان مؤشر الهواء الصحي على الخريطة
    const lg = L.control({ position: "bottomright" });
    lg.onAdd = () => {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = `<b>مؤشر الهواء الصحي (PM2.5)</b>` + [["good", "0–50 جيد"], ["fair", "51–100 مقبول"], ["warn", "101–150 حسّاس"], ["bad", "151–200 غير صحي"], ["severe", "201–300 جداً"], ["hazard", "> 300 خطر"]].map(([t, l]) => `<span><i style="background:${ECO.TONES[t]}"></i>${l}</span>`).join("");
      return div;
    };
    lg.addTo(map);
  }

  function setDate(date) {
    if (!map) return;
    const b = ECO.GIBS.base.find(x => x.id === S.base);
    baseLayer.setUrl(gibsUrl(b, date));
    ECO.GIBS.overlays.forEach(o => ovLayers[o.id].setUrl(gibsUrl(o, date)));
  }

  function buildControls() {
    const dIn = U.$("#sat-date");
    dIn.max = U.isoDate(new Date()); dIn.min = "2012-01-20"; dIn.value = yesterday();
    dIn.onchange = () => setDate(dIn.value || yesterday());

    U.$("#base-seg").innerHTML = ECO.GIBS.base.map(b => `<button type="button" data-b="${b.id}" class="${b.id === S.base ? "on" : ""}">${b.id.toUpperCase()}</button>`).join("");
    U.$("#base-seg").onclick = e => {
      const btn = e.target.closest("button"); if (!btn) return;
      S.base = btn.dataset.b; U.$$("#base-seg button").forEach(x => x.classList.toggle("on", x === btn));
      setDate(U.$("#sat-date").value || yesterday());
    };

    U.$("#layer-list").innerHTML = ECO.GIBS.overlays.map(o => `<label class="toggle" for="ov-${o.id}"><input type="checkbox" id="ov-${o.id}" ${S.overlays[o.id] ? "checked" : ""}><span class="sw"></span><span>${o.name}<small>${o.hint}</small></span></label>`).join("");
    ECO.GIBS.overlays.forEach(o => {
      U.$("#ov-" + o.id).onchange = e => {
        S.overlays[o.id] = e.target.checked; U.store.set("overlays", S.overlays);
        if (!map) return;
        if (e.target.checked) ovLayers[o.id].addTo(map); else map.removeLayer(ovLayers[o.id]);
      };
    });
    U.$("#ov-opacity").oninput = e => {
      S.opacity = e.target.value / 100; U.$("#ov-op-v").textContent = e.target.value + "%";
      Object.values(ovLayers).forEach(l => l.setOpacity(S.opacity));
    };

    const cmpKeys = [["us_aqi_pm2_5", "AQI صحي"], ["us_aqi", "AQI عام"], ["pm2_5", "PM2.5"], ["pm10", "PM10"], ["dust", "غبار"], ["nitrogen_dioxide", "NO₂"]];
    U.$("#cmp-seg").innerHTML = cmpKeys.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === S.cmp ? "on" : ""}">${l}</button>`).join("");
    U.$("#cmp-seg").onclick = e => {
      const btn = e.target.closest("button"); if (!btn) return;
      S.cmp = btn.dataset.k; U.$$("#cmp-seg button").forEach(x => x.classList.toggle("on", x === btn)); renderCmp();
    };

    const ar = U.$("#auto-refresh");
    ar.checked = U.store.get("autorefresh", true);
    ar.onchange = () => { U.store.set("autorefresh", ar.checked); ar.checked ? D.startAutoRefresh() : D.stopAutoRefresh(); };
    U.$("#mon-refresh").onclick = async () => {
      const btn = U.$("#mon-refresh"); btn.disabled = true;
      await D.refreshAll(); btn.disabled = false; U.toast("تم تحديث القراءات");
    };
  }

  function renderStations() {
    const cur = S.cur || {};
    U.$("#station-list").innerHTML = ECO.STATIONS.map(s => {
      const a = (cur[s.id] || {})[ECO.AQI_HEAD], tone = U.toneFor(ECO.AQI_HEAD, a);
      return `<button type="button" class="station ${s.id === ECO.state.station ? "on" : ""}" data-s="${s.id}"><span><span class="nm">${s.name}</span><span class="nt">${s.note}</span></span><span class="chip tone-${tone} aqi">${U.aqiText(a)}</span></button>`;
    }).join("");
    Object.entries(markers).forEach(([id, m]) => {
      const a = (cur[id] || {})[ECO.AQI_HEAD];
      m.setStyle({ fillColor: ECO.TONES[U.toneFor(ECO.AQI_HEAD, a)] || ECO.TONES.info, radius: id === ECO.state.station ? 12 : 8, weight: id === ECO.state.station ? 3 : 2 });
    });
  }

  function valueNow(d, k) {
    const c = d.current || {};
    if (U.isNum(c[k])) return c[k];
    const arr = d[k] || []; return arr[d.nowIdx];
  }

  function renderReadings() {
    const d = S.data;
    if (!d) {
      U.$("#mon-notice").innerHTML = ECO.offlineNotice();
      U.$("#readings").innerHTML = `<div class="empty" style="grid-column:1/-1">لا توجد قراءات متاحة الآن. لا نعرض أرقاماً تقديرية بدل البيانات الحقيقية.</div>`;
      U.$("#aqi-gauge").innerHTML = U.gauge({ value: NaN, max: 300, tone: "none", label: "لا بيانات" });
      const c = Chart.getChart && Chart.getChart(U.$("#chart-ts")); if (c) c.destroy();
      return;
    }
    const st = D.station(ECO.state.station);
    U.$("#readings-title").textContent = `القراءات الحالية – ${st.name}`;
    U.$("#readings").innerHTML = ECO.AIR.map(a => {
      const v = valueNow(d, a.key), tone = U.toneFor(a.key, v);
      let pct = 0;
      if (U.isNum(v)) {
        if (a.who) pct = Math.min(1, v / (a.who * 2));
        else if (a.key === "aerosol_optical_depth") pct = Math.min(1, v / 1.2);
        else if (a.key === "uv_index") pct = Math.min(1, v / 11);
        else if (a.key === "dust") pct = Math.min(1, v / 400);
        else pct = 0.5;
      }
      const d1 = a.key === "carbon_monoxide" || a.key === "methane" ? 0 : a.key === "aerosol_optical_depth" ? 2 : 1;
      return `<button type="button" class="reading ${a.key === S.key ? "on" : ""}" data-k="${a.key}" title="${U.esc(a.desc)}">
        <span class="k"><span>${a.short}</span><span class="chip tone-${tone}" style="padding:0 7px">${U.toneLabel[tone]}</span></span>
        <span class="v">${U.fmt(v, d1)}<small>${a.unit}</small></span>
        <span class="bar"><i style="width:${(pct * 100).toFixed(0)}%;background:${ECO.TONES[tone]}"></i></span>
        <span class="faint" style="font-size:.7rem">${a.name}${a.who ? ` · حد WHO ${a.who}` : ""}</span>
      </button>`;
    }).join("");
    const aqi = valueNow(d, ECO.AQI_HEAD), band = U.isNum(aqi) ? U.aqiBand(aqi) : null;
    const overall = valueNow(d, "us_aqi"), dustV = valueNow(d, "dust");
    U.$("#gauge-station").textContent = st.name;
    U.$("#aqi-gauge").innerHTML = U.gauge({ value: aqi, max: 300, big: U.isNum(aqi) ? U.aqiText(aqi) : null, tone: band ? band.tone : "none", label: band ? band.label : "لا بيانات", sub: "مؤشر الهواء الصحي (PM2.5) · US AQI · تقدير نموذج CAMS" });
    const ov = U.$("#aqi-overall");
    if (ov) ov.innerHTML = U.isNum(overall) ? `المؤشر العام لكل الملوثات: <b class="tone-${U.toneFor("us_aqi", overall)}">${U.aqiText(overall)}</b>${U.isNum(dustV) && dustV > 100 ? ` — مرتفع بسبب الغبار (${U.fmt(dustV, 0)} µg/m³)` : ""}` : "";
    const t = (d.current && d.current.time) || d.time[d.nowIdx];
    U.$("#mon-updated").textContent = t ? `تقدير النموذج لساعة ${U.fmtTime(t)}` : "";
    U.$("#mon-notice").innerHTML = ECO.offlineNotice();
  }

  function renderTS() {
    const d = S.data; if (!d) return;
    const a = ECO.AIR.find(x => x.key === S.key), arr = d[S.key] || [];
    U.$("#ts-title").textContent = `السلسلة الزمنية – ${a.name}`;
    const labels = d.time.map(t => U.fmtTime(t));
    const past = arr.map((v, i) => (i <= d.nowIdx ? v : null));
    const fut = arr.map((v, i) => (i >= d.nowIdx ? v : null));
    const ds = [
      { label: "سابق (تقدير CAMS)", data: past, borderColor: ECO.COL.river, backgroundColor: "rgba(79,200,220,0.12)", fill: true, borderWidth: 2 },
      { label: "توقعات CAMS", data: fut, borderColor: ECO.COL.silt, borderDash: [5, 4], borderWidth: 2, fill: false }
    ];
    if (a.who) ds.push({ label: `حد WHO (${a.who})`, data: arr.map(() => a.who), borderColor: ECO.COL.crimson, borderDash: [3, 3], borderWidth: 1, fill: false, pointRadius: 0 });
    U.chart(U.$("#chart-ts"), {
      type: "line", data: { labels, datasets: ds },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback(v) { return U.fmtDay(d.time[v]); } }, grid: { display: false } },
          y: { beginAtZero: true, title: { display: !!a.unit, text: a.unit } }
        },
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  function renderCmp() {
    const cur = S.cur; if (!cur) return;
    // AQI يُقطع عند 500 (نهاية المقياس الرسمي) حتى لا يظهر رقم خارج المقياس
    const vals = ECO.STATIONS.map(s => { const v = (cur[s.id] || {})[S.cmp]; return S.cmp === "us_aqi" ? U.aqiCap(v) : v; });
    U.chart(U.$("#chart-cmp"), {
      type: "bar",
      data: { labels: ECO.STATIONS.map(s => s.name), datasets: [{ data: vals, backgroundColor: vals.map(v => ECO.TONES[U.toneFor(S.cmp, v)] + "cc"), borderRadius: 6, maxBarThickness: 34 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true }, y: { grid: { display: false }, position: "right" } } }
    });
  }

  async function select(id) {
    ECO.state.station = id; U.store.set("station", id);
    renderStations();
    if (map) map.flyTo([D.station(id).lat, D.station(id).lon], Math.max(map.getZoom(), 7.5), { duration: 0.8 });
    S.data = await D.air(id, 7, 3);
    renderReadings(); renderTS();
  }

  async function load(force) {
    S.cur = await D.current(force);
    renderStations(); renderCmp();
    S.data = await D.air(ECO.state.station, 7, 3, force);
    renderReadings(); renderTS();
  }

  ECO.bus.on("current", cur => { S.cur = cur; if (inited) { renderStations(); renderCmp(); } });
  ECO.bus.on("refresh", () => { if (inited) load(false); });

  ECO.views.monitor = {
    init() {
      buildControls(); buildMap(); inited = true;
      U.$("#station-list").onclick = e => { const b = e.target.closest(".station"); if (b) select(b.dataset.s); };
      U.$("#readings").onclick = e => { const b = e.target.closest(".reading"); if (!b) return; S.key = b.dataset.k; U.$$(".reading").forEach(x => x.classList.toggle("on", x === b)); renderTS(); };
      load(false);
    },
    show() { if (map) setTimeout(() => map.invalidateSize(), 60); }
  };
})();
