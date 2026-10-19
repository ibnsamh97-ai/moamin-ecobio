/* =====================================================================
   EcoBio AI — خريطة العينات الحقلية: تحديد، حفظ، مشاركة، تصدير، تقارير
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const S = { list: U.store.get("samples", []), map: null, layer: null, rsLayer: null, stLayer: null, base: null, labels: null, baseId: U.store.get("smp_base", "esri"), adding: false, pending: null, editing: null, markers: {} };
  const PARAMS = () => [{ key: "ec", name: "التوصيلية الكهربائية", sym: "EC", unit: "µS/cm" }, ...ECO.WATER_PARAMS, ...ECO.METALS.map(m => ({ ...m, unit: "mg/L" }))];
  const save = () => U.store.set("samples", S.list);
  const isWater = t => /مياه|ماء/.test(t || "");
  const gmaps = U.gmaps;
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return U.isoDate(d); };

  function nextCode() {
    let n = 1; const used = new Set(S.list.map(s => s.code));
    while (used.has("S-" + String(n).padStart(3, "0"))) n++;
    return "S-" + String(n).padStart(3, "0");
  }
  function evalSample(s) {
    if (!isWater(s.type) || !ECO.water) { s.wqi = null; s.cls = null; s.tone = "info"; return s; }
    const r = ECO.water.compute(s.v || {});
    s.wqi = r && U.isNum(r.wqi) ? +r.wqi.toFixed(1) : null; s.cls = r ? r.cls : null; s.tone = r && r.wqi != null ? r.tone : "info"; s.hpi = r && r.hpi != null ? +r.hpi.toFixed(1) : null;
    return s;
  }

  /* ---------------- الخريطة ---------------- */
  function pinIcon(s, sel) {
    const col = ECO.TONES[s.tone || "info"] || ECO.TONES.info;
    return L.divIcon({ className: "pin3d" + (sel ? " sel" : ""), html: `<span class="pin-body" style="--c:${col}"><b>${U.esc(s.code.replace("S-", ""))}</b></span><span class="pin-shadow"></span>`, iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -38] });
  }
  const rsIcon = r => L.divIcon({ className: "rs-pin" + (r.supervisor ? " sup" : ""), html: `<span></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });

  function setBase(id) {
    S.baseId = id; U.store.set("smp_base", id);
    const b = ECO.BASEMAPS.find(x => x.id === id) || ECO.BASEMAPS[0];
    if (S.base) S.map.removeLayer(S.base);
    if (S.labels) { S.map.removeLayer(S.labels); S.labels = null; }
    if (b.gibs) {
      const d = U.$("#smp-date").value || yesterday();
      S.base = L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, { maxNativeZoom: 9, maxZoom: 18, attribution: b.attr });
    } else S.base = L.tileLayer(b.url, { maxNativeZoom: b.max, maxZoom: 19, attribution: b.attr, crossOrigin: true });
    S.base.addTo(S.map); S.base.bringToBack();
    if (id !== "osm") S.labels = U.labelLayers().addTo(S.map);
    U.$("#smp-date-f").hidden = !b.gibs;
    U.$$("#smp-base button").forEach(x => x.classList.toggle("on", x.dataset.b === id));
  }

  function buildMap() {
    if (!window.L) return;
    S.map = L.map("smp-map", { center: [34.62, 43.68], zoom: 12, zoomSnap: 0.5, maxZoom: 19 });
    S.map.attributionControl.setPrefix(false);
    U.$("#smp-base").innerHTML = ECO.BASEMAPS.map(b => `<button type="button" data-b="${b.id}">${b.name}</button>`).join("");
    U.$("#smp-base").onclick = e => { const b = e.target.closest("button"); if (b) setBase(b.dataset.b); };
    U.$("#smp-date").value = yesterday(); U.$("#smp-date").max = U.isoDate(new Date());
    U.$("#smp-date").onchange = () => setBase("gibs");
    setBase(S.baseId);
    L.polyline(ECO.TIGRIS, { color: "#4fc8dc", weight: 2, opacity: 0.55, dashArray: "6 6" }).addTo(S.map);
    S.layer = L.layerGroup().addTo(S.map);
    S.rsLayer = L.layerGroup().addTo(S.map);
    S.stLayer = L.layerGroup();
    (ECO.RESEARCH || []).filter(r => r.lat != null).forEach(r => {
      L.marker([r.lat, r.lon], { icon: rsIcon(r) }).addTo(S.rsLayer)
        .bindPopup(`<div class="pop"><span class="chip ${r.supervisor ? "tone-good" : "tone-info"}">${r.supervisor ? "بحث المشرفة" : "بحث جامعة تكريت"} · ${r.year}</span><b>${U.esc(r.place)}</b><p>${U.esc(r.title)}</p><small>${U.esc(r.coordNote)}</small><div class="pop-act"><a class="btn btn-sm" href="#research" data-rs="${r.id}">التفاصيل والجداول</a></div></div>`, { className: "eco-pop", maxWidth: 300 });
    });
    ECO.STATIONS.forEach(s => L.circleMarker([s.lat, s.lon], { radius: 6, color: "#e6ae4f", weight: 2, fillOpacity: 0.3 }).bindTooltip("محطة رصد هواء: " + s.name, { className: "eco-tip" }).addTo(S.stLayer));
    U.$("#smp-show-rs").onchange = e => (e.target.checked ? S.rsLayer.addTo(S.map) : S.map.removeLayer(S.rsLayer));
    U.$("#smp-show-st").onchange = e => (e.target.checked ? S.stLayer.addTo(S.map) : S.map.removeLayer(S.stLayer));

    S.map.on("click", e => { if (S.adding) { setAdding(false); openSheet({ lat: e.latlng.lat, lon: e.latlng.lng, ...(S.pending || {}) }); S.pending = null; } });
    U.$("#smp-map").addEventListener("click", e => {
      const a = e.target.closest("[data-act]"); if (!a) return;
      const s = S.list.find(x => x.id === a.dataset.id); if (!s) return;
      if (a.dataset.act === "edit") openSheet(s);
      if (a.dataset.act === "lab") ECO.water.fill(s.v || {}, { name: s.code + " – " + (s.site || ""), site: s.site, date: s.date, source: `عيّنة ${s.code} من خريطة العينات` });
      if (a.dataset.act === "pdf") sampleReport(s);
    });
    U.$("#smp-legend").innerHTML = [["good", "WQI ≤ 50 جيدة"], ["warn", "51–75 رديئة"], ["bad", "76–100 رديئة جداً"], ["severe", "> 100 غير صالحة"], ["info", "عينة بلا WQI"]].map(([t, l]) => `<span><i style="background:${ECO.TONES[t]}"></i>${l}</span>`).join("") + `<span><i class="lg-rs"></i>بحث منشور</span><span><i class="lg-ct"></i>موقع باحث</span>`;
    ECO.bus.emit("samples-map", S.map);
  }

  function popupHTML(s) {
    const vals = PARAMS().filter(p => s.v && U.isNum(s.v[p.key])).slice(0, 8).map(p => `<tr><td>${p.sym}</td><td dir="ltr">${U.fmt(s.v[p.key], "auto")} ${p.unit || ""}</td></tr>`).join("");
    return `<div class="pop">
      <span class="chip tone-${s.tone || "info"}">${U.esc(s.type || "")}${s.wqi != null ? ` · WQI ${s.wqi}` : ""}</span>
      <b>${U.esc(s.code)} – ${U.esc(s.site || "بلا اسم")}</b>
      <small dir="ltr">${s.lat.toFixed(5)}, ${s.lon.toFixed(5)} · ${U.esc(s.date || "")}</small>
      ${s.photo ? `<img src="${s.photo}" alt="">` : ""}
      ${vals ? `<table>${vals}</table>` : ""}
      <div class="pop-act">
        <a class="btn btn-sm" href="${gmaps(s.lat, s.lon)}" target="_blank" rel="noopener">Google Maps</a>
        <a class="btn btn-sm" href="${U.gdir(s.lat, s.lon)}" target="_blank" rel="noopener">الطريق إليه</a>
        <button class="btn btn-sm" type="button" data-act="edit" data-id="${s.id}">تعديل</button>
        ${isWater(s.type) ? `<button class="btn btn-sm" type="button" data-act="lab" data-id="${s.id}">المختبر</button>` : ""}
        <button class="btn btn-sm" type="button" data-act="pdf" data-id="${s.id}">PDF</button>
      </div></div>`;
  }

  function render() {
    if (!S.map) return;
    S.layer.clearLayers(); S.markers = {};
    S.list.forEach(s => { S.markers[s.id] = L.marker([s.lat, s.lon], { icon: pinIcon(s) }).addTo(S.layer).bindPopup(popupHTML(s), { className: "eco-pop", maxWidth: 300 }); });
    renderList(); renderStats();
  }
  function renderList() {
    const q = (U.$("#smp-search").value || "").trim();
    const items = S.list.filter(s => !q || (s.code + " " + (s.site || "") + " " + (s.type || "")).includes(q)).sort((a, b) => (b.created || 0) - (a.created || 0));
    U.$("#smp-list").innerHTML = items.length ? items.map(s => `<button type="button" class="smp-item tile3d" data-id="${s.id}">
        <span class="smp-dot" style="background:${ECO.TONES[s.tone || "info"]}"></span>
        <span class="smp-main"><b>${U.esc(s.code)} · ${U.esc(s.site || "بلا اسم")}</b><small>${U.esc(s.type || "")} · ${U.esc(s.date || "")}</small></span>
        ${s.wqi != null ? `<span class="chip tone-${s.tone}">${s.wqi}</span>` : ""}</button>`).join("")
      : `<div class="empty">لا توجد عينات بعد. اضغط «إضافة عينة» ثم اضغط على الخريطة في موقع العينة، أو «عينة في موقعي» لاستخدام GPS الهاتف.</div>`;
  }
  function renderStats() {
    const w = S.list.filter(s => s.wqi != null), mean = U.mean(w.map(s => s.wqi));
    const worst = w.slice().sort((a, b) => b.wqi - a.wqi)[0];
    U.$("#smp-stats").innerHTML = `<div class="mini-stat"><span>العينات</span><b>${S.list.length}</b></div><div class="mini-stat"><span>عينات مياه بمؤشر</span><b>${w.length}</b></div><div class="mini-stat"><span>متوسط WQI</span><b>${U.isNum(mean) ? U.fmt(mean, 1) : "—"}</b></div><div class="mini-stat"><span>الأسوأ</span><b>${worst ? U.esc(worst.code) : "—"}</b></div>`;
  }

  /* ---------------- النموذج ---------------- */
  function setAdding(on) {
    S.adding = on; U.$("#smp-hint").hidden = !on;
    U.$("#smp-map").classList.toggle("adding", on);
    U.$("#smp-add").classList.toggle("on", on);
  }
  function openSheet(s) {
    const isNew = !s.id; S.editing = isNew ? null : s.id;
    U.$("#smp-form-title").textContent = isNew ? "عينة جديدة" : "تعديل العينة " + s.code;
    U.$("#sf-code").value = s.code || nextCode();
    U.$("#sf-site").value = s.site || "";
    U.$("#sf-type").value = s.type || "مياه نهر";
    U.$("#sf-date").value = s.date || U.isoDate(new Date());
    U.$("#sf-time").value = s.time || new Date().toTimeString().slice(0, 5);
    U.$("#sf-by").value = s.by || ECO.profile().student;
    U.$("#sf-lat").value = U.isNum(s.lat) ? s.lat.toFixed(6) : "";
    U.$("#sf-lon").value = U.isNum(s.lon) ? s.lon.toFixed(6) : "";
    U.$("#sf-temp").value = U.isNum(s.temp) ? s.temp : "";
    U.$("#sf-notes").value = s.notes || "";
    PARAMS().forEach(p => { U.$("#sfp-" + p.key).value = s.v && U.isNum(s.v[p.key]) ? s.v[p.key] : ""; });
    S.photo = s.photo || null;
    const pv = U.$("#sf-photo-prev"); pv.hidden = !S.photo; if (S.photo) pv.src = S.photo; U.$("#sf-photo").value = "";
    U.$("#smp-del").hidden = isNew; U.$("#smp-form-status").textContent = "";
    U.$("#smp-sheet").hidden = false;
    if (S.map && U.isNum(s.lat)) S.map.flyTo([s.lat, s.lon], Math.max(S.map.getZoom(), 14), { duration: 0.6 });
  }
  const closeSheet = () => { U.$("#smp-sheet").hidden = true; };

  function readForm() {
    const v = {}; PARAMS().forEach(p => { const x = parseFloat(U.$("#sfp-" + p.key).value); if (U.isNum(x)) v[p.key] = x; });
    return {
      code: U.$("#sf-code").value.trim() || nextCode(), site: U.$("#sf-site").value.trim(), type: U.$("#sf-type").value,
      date: U.$("#sf-date").value, time: U.$("#sf-time").value, by: U.$("#sf-by").value.trim(),
      lat: parseFloat(U.$("#sf-lat").value), lon: parseFloat(U.$("#sf-lon").value), temp: parseFloat(U.$("#sf-temp").value),
      notes: U.$("#sf-notes").value.trim(), v, photo: S.photo
    };
  }

  function compress(file, max = 640) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.78)); }; img.onerror = rej; img.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  /* ---------------- مشاركة واستيراد وتصدير ---------------- */
  const b64e = str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const b64d = str => decodeURIComponent(escape(atob(str.replace(/-/g, "+").replace(/_/g, "/"))));
  function shareLink() {
    if (!S.list.length) { U.toast("لا توجد عينات للمشاركة"); return; }
    const data = S.list.map(s => ({ c: s.code, s: s.site, t: s.type, d: s.date, la: +s.lat.toFixed(6), lo: +s.lon.toFixed(6), v: s.v, n: s.notes, b: s.by }));
    const url = location.href.split("#")[0] + "#samples=" + b64e(JSON.stringify(data));
    const done = () => U.toast("نُسخ رابط المشاركة (بدون الصور)");
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) navigator.share({ title: "عينات EcoBio AI", url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => window.prompt("انسخ الرابط", url));
  }
  function checkShared() {
    const m = location.hash.match(/samples=([A-Za-z0-9_-]+)/); if (!m) return;
    try {
      const arr = JSON.parse(b64d(m[1]));
      U.$("#smp-import-bar").innerHTML = `<div class="notice info" style="margin-bottom:14px"><span>وصلك رابط فيه <b>${arr.length}</b> عينة مشتركة.</span><button class="btn btn-sm btn-primary" type="button" id="smp-imp-ok">أضفها إلى خريطتي</button><button class="btn btn-sm btn-ghost" type="button" id="smp-imp-no">تجاهل</button></div>`;
      U.$("#smp-imp-ok").onclick = () => { addMany(arr.map(o => ({ code: o.c, site: o.s, type: o.t, date: o.d, lat: o.la, lon: o.lo, v: o.v || {}, notes: o.n, by: o.b }))); U.$("#smp-import-bar").innerHTML = ""; history.replaceState(null, "", "#samples"); };
      U.$("#smp-imp-no").onclick = () => { U.$("#smp-import-bar").innerHTML = ""; history.replaceState(null, "", "#samples"); };
    } catch (e) { console.warn(e); }
  }
  function addMany(arr) {
    let n = 0;
    arr.forEach(o => {
      if (!U.isNum(o.lat) || !U.isNum(o.lon)) return;
      const s = evalSample({ id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: Date.now(), ...o });
      if (S.list.some(x => x.code === s.code)) s.code = nextCode();
      S.list.push(s); n++;
    });
    save(); render(); fit(); U.toast(`أُضيفت ${n} عينة`);
  }
  function fit() { if (S.map && S.list.length) S.map.fitBounds(L.latLngBounds(S.list.map(s => [s.lat, s.lon])).pad(0.3), { maxZoom: 15 }); }
  function download(name, text, type) {
    const a = U.el("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.appendChild(a); a.click(); a.remove();
  }
  function exportGeoJSON() {
    if (!S.list.length) { U.toast("لا توجد عينات"); return; }
    const fc = { type: "FeatureCollection", features: S.list.map(s => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lon, s.lat] }, properties: { code: s.code, site: s.site, type: s.type, date: s.date, time: s.time, collector: s.by, temp: s.temp, notes: s.notes, wqi: s.wqi, class: s.cls, ...(s.v || {}) } })) };
    download("ecobio-samples.geojson", JSON.stringify(fc, null, 1), "application/geo+json");
  }
  function exportCSV() {
    if (!S.list.length) { U.toast("لا توجد عينات"); return; }
    const keys = PARAMS().map(p => p.key);
    const head = ["code", "site", "type", "date", "time", "lat", "lon", "collector", "temp", "wqi", "class", ...keys, "notes"];
    const rows = S.list.map(s => [s.code, s.site, s.type, s.date, s.time, s.lat, s.lon, s.by, s.temp, s.wqi, s.cls, ...keys.map(k => (s.v && U.isNum(s.v[k]) ? s.v[k] : "")), s.notes]);
    download("ecobio-samples.csv", "﻿" + [head, ...rows].map(r => r.map(x => `"${String(x == null || (typeof x === "number" && !isFinite(x)) ? "" : x).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  }
  function importFile(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const txt = String(fr.result).replace(/^﻿/, "");
        if (/^\s*[{[]/.test(txt)) {
          const j = JSON.parse(txt), feats = j.features || [];
          addMany(feats.filter(f => f.geometry && f.geometry.type === "Point").map(f => { const p = f.properties || {}, v = {}; PARAMS().forEach(x => { if (U.isNum(+p[x.key]) && p[x.key] !== "" && p[x.key] != null) v[x.key] = +p[x.key]; }); return { code: p.code, site: p.site || p.name, type: p.type || "مياه نهر", date: p.date, time: p.time, by: p.collector, temp: +p.temp, notes: p.notes, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], v }; }));
        } else {
          const lines = txt.split(/\r?\n/).filter(Boolean), parse = l => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map(x => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
          const h = parse(lines[0]).map(x => x.trim().toLowerCase());
          addMany(lines.slice(1).map(l => { const c = parse(l), g = k => c[h.indexOf(k)], v = {}; PARAMS().forEach(x => { const val = parseFloat(g(x.key)); if (U.isNum(val)) v[x.key] = val; }); return { code: g("code"), site: g("site"), type: g("type") || "مياه نهر", date: g("date"), time: g("time"), by: g("collector"), temp: parseFloat(g("temp")), notes: g("notes"), lat: parseFloat(g("lat")), lon: parseFloat(g("lon")), v }; }));
        }
      } catch (e) { U.toast("تعذّرت قراءة الملف: " + e.message); }
    };
    fr.readAsText(file);
  }

  /* ---------------- التقارير ---------------- */
  async function mapImage() {
    try {
      if (!window.html2canvas) return null;
      const c = await html2canvas(U.$("#smp-map"), { useCORS: true, backgroundColor: "#0b1a20", scale: 1.5, logging: false, ignoreElements: el => el.classList && (el.classList.contains("leaflet-control-container")) });
      return c.toDataURL("image/jpeg", 0.85);
    } catch (e) { console.warn("map snapshot failed", e); return null; }
  }
  function paramTable(list) {
    const ps = PARAMS().filter(p => list.some(s => s.v && U.isNum(s.v[p.key])));
    return { head: ["الرمز", ...ps.map(p => p.sym)], rows: list.map(s => [s.code, ...ps.map(p => (s.v && U.isNum(s.v[p.key]) ? U.fmt(s.v[p.key], "auto") : "—"))]) };
  }
  async function campaignReport(mode) {
    if (!S.list.length) { U.toast("لا توجد عينات للتقرير"); return; }
    fit(); await new Promise(r => setTimeout(r, 900));
    const img = await mapImage(), w = S.list.filter(s => s.wqi != null), pt = paramTable(S.list);
    ECO.report.run({
      title: "تقرير حملة جمع العينات", subtitle: `${S.list.length} عينة`, file: "تقرير-حملة-العينات",
      blocks: [
        { type: "cards", items: [{ label: "عدد العينات", value: S.list.length }, { label: "عينات مياه بمؤشر", value: w.length }, { label: "متوسط WQI", value: w.length ? U.fmt(U.mean(w.map(s => s.wqi)), 1) : "—" }, { label: "أعلى WQI", value: w.length ? U.fmt(Math.max(...w.map(s => s.wqi)), 1) : "—", tone: "bad" }] },
        img ? { type: "image", src: img, caption: "مواقع العينات على الخريطة الفضائية", maxH: 420 } : { type: "note", text: "تعذّر التقاط صورة الخريطة (قد تمنع بعض خوادم الصور ذلك)؛ الإحداثيات مذكورة في الجدول." },
        { type: "h", text: "سجل العينات" },
        { type: "table", head: ["الرمز", "الموقع", "النوع", "التاريخ", "خط العرض", "خط الطول", "WQI", "الصنف"], rows: S.list.map(s => [s.code, s.site || "—", s.type, s.date, s.lat.toFixed(5), s.lon.toFixed(5), s.wqi ?? "—", s.cls || "—"]) },
        pt.head.length > 1 ? { type: "h", text: "نتائج التحليل" } : null,
        pt.head.length > 1 ? { type: "table", head: pt.head, rows: pt.rows } : null,
        S.list.some(s => s.photo) ? { type: "h", text: "صور المواقع" } : null,
        S.list.some(s => s.photo) ? { type: "images", items: S.list.filter(s => s.photo).slice(0, 12).map(s => ({ src: s.photo, caption: s.code + " – " + (s.site || "") })) } : null,
        { type: "refs", items: ["Brown, R.M., et al. (1972). A water quality index – crashing the psychological barrier.", "خرائط الأساس: Esri World Imagery؛ Sentinel-2 cloudless 2023 (EOX)؛ NASA GIBS."] },
        { type: "sign" }
      ]
    }, mode);
  }
  function sampleReport(s) {
    const ps = PARAMS().filter(p => s.v && U.isNum(s.v[p.key]));
    ECO.report.run({
      title: "بطاقة عينة حقلية", subtitle: s.code + " – " + (s.site || ""), file: "عينة-" + s.code,
      blocks: [
        { type: "kv", items: [["الرمز", s.code], ["الموقع", s.site], ["النوع", s.type], ["التاريخ والوقت", (s.date || "") + " " + (s.time || "")], ["جامع العينة", s.by], ["الإحداثيات", `${s.lat.toFixed(6)}, ${s.lon.toFixed(6)}`], ["حرارة الماء", U.isNum(s.temp) ? s.temp + " °C" : "—"], ["رابط الموقع", gmaps(s.lat, s.lon)]] },
        s.wqi != null ? { type: "cards", items: [{ label: "WQI", value: s.wqi, sub: s.cls, tone: s.tone }, { label: "HPI", value: s.hpi ?? "—" }] } : null,
        ps.length ? { type: "table", head: ["المعيار", "القيمة", "الوحدة"], rows: ps.map(p => [p.name + " (" + p.sym + ")", U.fmt(s.v[p.key], "auto"), p.unit || ""]) } : null,
        s.photo ? { type: "image", src: s.photo, caption: "صورة الموقع / العينة", maxH: 380 } : null,
        s.notes ? { type: "note", text: s.notes } : null,
        { type: "sign" }
      ]
    });
  }

  /* ---------------- واجهة عامة ---------------- */
  ECO.samples = {
    list: () => S.list,
    map: () => S.map,
    params: PARAMS,
    startAdd(pending) { S.pending = pending || null; ECO.go("samples"); setTimeout(() => { setAdding(true); U.toast("اضغط على الخريطة في موقع العينة، أو اختر «عينة في موقعي»"); }, 300); },
    openNew(data) { ECO.go("samples"); setTimeout(() => openSheet(data), 350); }
  };

  ECO.views.samples = {
    init() {
      U.$("#sf-type").innerHTML = ECO.SAMPLE_TYPES.map(t => `<option>${t}</option>`).join("");
      U.$("#sf-params").innerHTML = PARAMS().map(p => `<div class="field"><label for="sfp-${p.key}"><span>${p.name} (${p.sym})</span><span class="u">${p.unit || ""}</span></label><input type="number" step="any" id="sfp-${p.key}" inputmode="decimal"></div>`).join("");
      S.list.forEach(evalSample);
      buildMap(); render(); checkShared();
      U.$("#smp-add").onclick = () => setAdding(!S.adding);
      U.$("#smp-gps").onclick = () => {
        if (!navigator.geolocation) { U.toast("الجهاز لا يدعم تحديد الموقع"); return; }
        U.toast("جارٍ تحديد موقعك…");
        navigator.geolocation.getCurrentPosition(p => openSheet({ lat: p.coords.latitude, lon: p.coords.longitude, notes: `دقة GPS ±${Math.round(p.coords.accuracy)} م`, ...(S.pending || {}) }), err => U.toast("تعذّر تحديد الموقع: " + (err.code === 1 ? "لم يُسمح بالوصول للموقع" : err.message)), { enableHighAccuracy: true, timeout: 15000 });
      };
      U.$("#smp-close").onclick = closeSheet;
      U.$("#smp-sheet").addEventListener("click", e => { if (e.target.id === "smp-sheet") closeSheet(); });
      U.$("#sf-photo").onchange = async e => { const f = e.target.files[0]; if (!f) return; S.photo = await compress(f); const pv = U.$("#sf-photo-prev"); pv.src = S.photo; pv.hidden = false; };
      U.$("#smp-form").onsubmit = e => {
        e.preventDefault();
        const d = readForm();
        if (!U.isNum(d.lat) || !U.isNum(d.lon) || Math.abs(d.lat) > 90 || Math.abs(d.lon) > 180) { U.$("#smp-form-status").innerHTML = `<span class="bad">أدخل إحداثيات صحيحة أو اختر الموقع من الخريطة.</span>`; return; }
        if (S.editing) { const i = S.list.findIndex(x => x.id === S.editing); S.list[i] = evalSample({ ...S.list[i], ...d }); }
        else S.list.push(evalSample({ id: "s" + Date.now().toString(36), created: Date.now(), ...d }));
        try { save(); } catch (er) { U.toast("الذاكرة ممتلئة؛ احذف بعض الصور"); }
        render(); closeSheet(); U.toast("حُفظت العينة " + d.code);
      };
      U.$("#smp-del").onclick = () => { S.list = S.list.filter(x => x.id !== S.editing); save(); render(); closeSheet(); U.toast("حُذفت العينة"); };
      U.$("#smp-to-lab").onclick = () => { const d = readForm(); closeSheet(); ECO.water.fill(d.v, { name: d.code + " – " + d.site, site: d.site, date: d.date, source: `عيّنة ${d.code} من خريطة العينات` }); };
      U.$("#smp-list").onclick = e => { const b = e.target.closest(".smp-item"); if (!b) return; const s = S.list.find(x => x.id === b.dataset.id); if (!s) return; S.map.flyTo([s.lat, s.lon], 15, { duration: 0.6 }); setTimeout(() => S.markers[s.id] && S.markers[s.id].openPopup(), 650); if (window.innerWidth < 1100) U.$("#smp-map").scrollIntoView({ behavior: "smooth", block: "center" }); };
      U.$("#smp-search").oninput = renderList;
      U.$("#smp-share").onclick = shareLink;
      U.$("#smp-geojson").onclick = exportGeoJSON;
      U.$("#smp-csv").onclick = exportCSV;
      U.$("#smp-import").onchange = e => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ""; };
      U.$("#smp-report").onclick = () => campaignReport();
      if (S.list.length) setTimeout(fit, 200);
    },
    show() { if (S.map) setTimeout(() => S.map.invalidateSize(), 80); checkShared(); }
  };
  ECO.samplesReport = campaignReport;
})();
