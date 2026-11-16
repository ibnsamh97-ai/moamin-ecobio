/* =====================================================================
   EcoBio AI — الريح والغبار الآن
   جسيمات تجري مع الريح الحقيقية (10 م فوق الأرض) فوق العراق وجيرانه،
   وتحتها طبقة الغبار من نموذج CAMS، لأمس واليوم والأيام الجاية.
   الشبكة: نقطة كل درجة (13×15 = 195 نقطة) من Open-Meteo، وبينها
   استيفاء ثنائي الخطية (bilinear). الخريطة تصوّر نموذجاً، ليست قياس محطة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  if (!document.getElementById("view-wind")) return;
  const { ico, esc } = L;

  const LAT = [], LON = [];
  for (let a = 28; a <= 40; a++) LAT.push(a);
  for (let o = 36; o <= 50; o++) LON.push(o);
  const NY = LAT.length, NX = LON.length;
  const TIKRIT = [34.6071, 43.6782];
  const S = { map: null, t: 0, times: [], u: null, v: null, dust: null, now: 0, play: false, layer: null, showWind: true, showDust: true, at: 0, fetched: 0 };

  /* ---------- البيانات ---------- */
  async function fetchGrid() {
    const la = [], lo = [];
    LAT.forEach(a => LON.forEach(o => { la.push(a); lo.push(o); }));
    const q = `latitude=${la.join(",")}&longitude=${lo.join(",")}&past_days=1&forecast_days=3&timezone=GMT`;
    const get = u => fetch(u).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    const [W, A] = await Promise.all([
      get(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`),
      get(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&hourly=dust&domains=cams_global`).catch(() => null)
    ]);
    const WL = Array.isArray(W) ? W : [W], AL = A ? (Array.isArray(A) ? A : [A]) : null;
    const times = WL[0].hourly.time;
    const nT = times.length, n = NY * NX;
    const u = new Float32Array(nT * n), v = new Float32Array(nT * n), dust = new Float32Array(nT * n).fill(NaN);
    WL.forEach((loc, k) => {
      const h = loc.hourly;
      for (let t = 0; t < nT; t++) {
        const s = h.wind_speed_10m[t], d = h.wind_direction_10m[t];
        if (s == null || d == null) { u[t * n + k] = NaN; v[t * n + k] = NaN; continue; }
        const r = d * Math.PI / 180; // الاتجاه الذي تهب منه الريح
        u[t * n + k] = -s * Math.sin(r); v[t * n + k] = -s * Math.cos(r);
      }
    });
    if (AL) AL.forEach((loc, k) => {
      const h = loc.hourly, idx = new Map(h.time.map((x, i) => [x, i]));
      for (let t = 0; t < nT; t++) { const i = idx.get(times[t]); const x = i == null ? null : h.dust[i]; dust[t * n + k] = x == null ? NaN : x; }
    });
    S.times = times.map(x => Date.parse(x + "Z")); S.u = u; S.v = v; S.dust = AL ? dust : null; S.fetched = Date.now();
    const nowH = Math.floor(Date.now() / 3600e3) * 3600e3;
    S.now = Math.max(0, S.times.findIndex(x => x >= nowH));
    S.t = S.now;
  }

  /* استيفاء ثنائي الخطية في الشبكة للساعة t */
  function sample(arr, t, lat, lon) {
    const fy = lat - LAT[0], fx = lon - LON[0];
    if (fy < 0 || fx < 0 || fy > NY - 1 || fx > NX - 1) return NaN;
    const y0 = Math.min(NY - 2, Math.floor(fy)), x0 = Math.min(NX - 2, Math.floor(fx)), dy = fy - y0, dx = fx - x0, b = t * NY * NX;
    const a = arr[b + y0 * NX + x0], c = arr[b + y0 * NX + x0 + 1], d = arr[b + (y0 + 1) * NX + x0], e = arr[b + (y0 + 1) * NX + x0 + 1];
    return (a * (1 - dx) + c * dx) * (1 - dy) + (d * (1 - dx) + e * dx) * dy;
  }
  const windAt = (t, lat, lon) => [sample(S.u, t, lat, lon), sample(S.v, t, lat, lon)];

  /* ---------- الألوان ---------- */
  const SPD = [[0, "#9fd8ff"], [3, "#c9f2c4"], [6, "#f4f19a"], [9, "#ffc46b"], [12, "#ff8a5c"], [16, "#ff4f6d"]];
  const spdBin = s => { let i = 0; while (i < SPD.length - 1 && s >= SPD[i + 1][0]) i++; return i; };
  /* الغبار µg/m³ على مقياس لوغاريتمي */
  const DUST = [[20, [240, 214, 140, 0]], [50, [240, 200, 120, 70]], [100, [232, 170, 90, 110]], [200, [222, 130, 60, 145]], [500, [196, 88, 44, 175]], [1000, [150, 52, 30, 200]], [3000, [90, 24, 16, 220]]];
  function dustRGBA(x) {
    if (!(x >= DUST[0][0])) return null;
    for (let i = 0; i < DUST.length - 1; i++) {
      const [a, ca] = DUST[i], [b, cb] = DUST[i + 1];
      if (x <= b) { const f = (Math.log(x) - Math.log(a)) / (Math.log(b) - Math.log(a)); return ca.map((v, k) => Math.round(v + (cb[k] - v) * f)); }
    }
    return DUST[DUST.length - 1][1];
  }

  /* ---------- طبقة الخريطة ---------- */
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  let anim = 0, parts = [], origin = null, size = null;
  const WindLayer = window.L ? window.L.Layer.extend({
    onAdd(map) {
      S.layer = this;
      this._d = window.L.DomUtil.create("canvas", "lv-dcv"); this._w = window.L.DomUtil.create("canvas", "lv-wcv");
      const pane = map.getPane("windPane"); pane.appendChild(this._d); pane.appendChild(this._w);
      map.on("moveend", this.reset, this); map.on("zoomstart", this.hide, this); map.on("resize", this.reset, this);
      this.reset();
    },
    onRemove(map) { this._d.remove(); this._w.remove(); map.off("moveend", this.reset, this); map.off("zoomstart", this.hide, this); map.off("resize", this.reset, this); stop(); },
    hide() { this._d.style.opacity = 0; this._w.style.opacity = 0; stop(); },
    reset() {
      const map = this._map; size = map.getSize(); origin = map.containerPointToLayerPoint([0, 0]);
      const r = dpr();
      [this._d, this._w].forEach(c => { c.width = size.x * r; c.height = size.y * r; c.style.width = size.x + "px"; c.style.height = size.y + "px"; window.L.DomUtil.setPosition(c, origin); c.style.opacity = 1; });
      this._w.getContext("2d").setTransform(r, 0, 0, r, 0, 0);
      drawDust(); seed(); start();
    }
  }) : null;

  const toGeo = (x, y) => S.map.layerPointToLatLng([x + origin.x, y + origin.y]);

  function drawDust() {
    const c = S.layer && S.layer._d; if (!c) return;
    const ctx = c.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    if (!S.showDust || !S.dust) return;
    const step = 6, w = Math.ceil(size.x / step), h = Math.ceil(size.y / step);
    const off = document.createElement("canvas"); off.width = w; off.height = h;
    const ox = off.getContext("2d"), img = ox.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const g = toGeo(i * step + step / 2, j * step + step / 2), col = dustRGBA(sample(S.dust, S.t, g.lat, g.lng));
      if (!col) continue;
      const k = (j * w + i) * 4; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = col[3];
    }
    ox.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, c.width, c.height);
  }

  function seed() {
    const n = U.reduced ? 0 : Math.round(U.clamp(size.x * size.y / 260, 500, 3200));
    parts = Array.from({ length: n }, () => spawn({}));
    const ctx = S.layer._w.getContext("2d"); ctx.clearRect(0, 0, size.x, size.y);
    if (U.reduced) arrows();
  }
  function spawn(p) { p.x = Math.random() * size.x; p.y = Math.random() * size.y; p.age = Math.floor(Math.random() * 90); p.max = 60 + Math.random() * 60; return p; }

  /* بلا حركة (تفضيل تقليل الحركة): أسهم ثابتة على الشبكة */
  function arrows() {
    const ctx = S.layer._w.getContext("2d"); ctx.clearRect(0, 0, size.x, size.y);
    if (!S.showWind) return;
    LAT.forEach(a => LON.forEach(o => {
      const p = S.map.latLngToLayerPoint([a, o]), x = p.x - origin.x, y = p.y - origin.y;
      if (x < 0 || y < 0 || x > size.x || y > size.y) return;
      const [u, v] = windAt(S.t, a, o), s = Math.hypot(u, v); if (!isFinite(s)) return;
      const len = 6 + s * 2.2, dx = u / s * len, dy = -v / s * len;
      ctx.strokeStyle = SPD[spdBin(s)][1]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - dx / 2, y - dy / 2); ctx.lineTo(x + dx / 2, y + dy / 2);
      const ang = Math.atan2(dy, dx); ctx.lineTo(x + dx / 2 - 5 * Math.cos(ang - 0.5), y + dy / 2 - 5 * Math.sin(ang - 0.5)); ctx.moveTo(x + dx / 2, y + dy / 2); ctx.lineTo(x + dx / 2 - 5 * Math.cos(ang + 0.5), y + dy / 2 - 5 * Math.sin(ang + 0.5)); ctx.stroke();
    }));
  }

  function frame() {
    anim = requestAnimationFrame(frame);
    const ctx = S.layer._w.getContext("2d");
    ctx.globalCompositeOperation = "destination-in"; ctx.fillStyle = "rgba(0,0,0,0.92)"; ctx.fillRect(0, 0, size.x, size.y);
    ctx.globalCompositeOperation = "source-over";
    if (!S.showWind) return;
    const k = 0.32 * Math.pow(2, (S.map.getZoom() - 6) * 0.35); // بكسل لكل م/ث في الإطار
    const bins = SPD.map(() => []);
    for (const p of parts) {
      if (++p.age > p.max) { spawn(p); p.age = 0; continue; }
      const g = toGeo(p.x, p.y), [u, v] = windAt(S.t, g.lat, g.lng);
      if (!isFinite(u)) { spawn(p); continue; }
      const nx = p.x + u * k, ny = p.y - v * k;
      bins[spdBin(Math.hypot(u, v))].push(p.x, p.y, nx, ny);
      p.x = nx; p.y = ny;
      if (nx < 0 || ny < 0 || nx > size.x || ny > size.y) spawn(p);
    }
    ctx.lineWidth = 1.3; ctx.lineCap = "round";
    bins.forEach((b, i) => { if (!b.length) return; ctx.strokeStyle = SPD[i][1]; ctx.beginPath(); for (let j = 0; j < b.length; j += 4) { ctx.moveTo(b[j], b[j + 1]); ctx.lineTo(b[j + 2], b[j + 3]); } ctx.stroke(); });
  }
  function start() { stop(); if (!U.reduced && S.layer && document.body.dataset.view === "wind" && !document.hidden) anim = requestAnimationFrame(frame); }
  function stop() { if (anim) cancelAnimationFrame(anim); anim = 0; }

  /* ---------- الواجهة ---------- */
  const DIRS = ["الشمال", "الشمال الشرقي", "الشرق", "الجنوب الشرقي", "الجنوب", "الجنوب الغربي", "الغرب", "الشمال الغربي"];
  const fromDir = (u, v) => { const d = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360; return DIRS[Math.round(d / 45) % 8]; };
  const fmtT = ms => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { timeZone: "Asia/Baghdad", weekday: "long", hour: "numeric" }).format(new Date(ms));
  function relT(i) {
    const h = Math.round((S.times[i] - S.times[S.now]) / 3600e3);
    return h === 0 ? "الآن" : h > 0 ? `بعد ${h} ${h === 1 ? "ساعة" : h <= 10 ? "ساعات" : "ساعة"}` : `قبل ${-h} ${-h === 1 ? "ساعة" : -h <= 10 ? "ساعات" : "ساعة"}`;
  }

  function setT(i) {
    S.t = U.clamp(i, 0, S.times.length - 1);
    const r = U.$("#wd-range"); if (r && +r.value !== S.t) r.value = S.t;
    U.$("#wd-when").innerHTML = `<b>${relT(S.t)}</b><span>${fmtT(S.times[S.t])} بتوقيت بغداد</span>`;
    drawDust(); if (U.reduced) arrows();
    tikrit();
  }

  function tikrit() {
    const box = U.$("#wd-tik"); if (!box) return;
    const [u, v] = windAt(S.t, TIKRIT[0], TIKRIT[1]), s = Math.hypot(u, v);
    const dNow = S.dust ? sample(S.dust, S.t, TIKRIT[0], TIKRIT[1]) : NaN;
    let peak = null;
    if (S.dust) for (let i = S.now; i < S.times.length; i++) { const x = sample(S.dust, i, TIKRIT[0], TIKRIT[1]); if (isFinite(x) && (!peak || x > peak.x)) peak = { i, x }; }
    box.innerHTML = `
      <div class="wd-k"><small>الريح في تكريت · ${relT(S.t)}</small><b><bdi dir="ltr">${U.fmt(s, 1)} m/s</bdi></b><span>${isFinite(s) && s >= 0.5 ? `تهب من ${fromDir(u, v)} · <bdi dir="ltr">${U.fmt(s * 3.6, 0)} km/h</bdi>` : "ساكنة تقريباً"}</span></div>
      <div class="wd-k"><small>الغبار قرب الأرض · ${relT(S.t)}</small><b><bdi dir="ltr">${isFinite(dNow) ? U.fmt(dNow, 0) : "—"} µg/m³</bdi></b><span>تقدير نموذج CAMS</span></div>
      <div class="wd-k"><small>أعلى غبار متوقّع في تكريت حتى نهاية التوقع</small><b><bdi dir="ltr">${peak ? U.fmt(peak.x, 0) : "—"} µg/m³</bdi></b><span>${peak ? `${relT(peak.i)} · ${fmtT(S.times[peak.i])}` : "غير متاح"}</span>${peak ? `<button type="button" class="btn btn-sm" data-wd-go="${peak.i}">${ico("i-play")}اعرض تلك الساعة</button>` : ""}</div>`;
  }

  function legend() {
    return `<div class="wd-leg"><span>سرعة الريح (m/s)</span><div class="wd-sw" dir="ltr">${SPD.map(([v, c]) => `<i style="background:${c}"></i><em>${v}</em>`).join("")}</div></div>
      <div class="wd-leg"><span>الغبار (µg/m³)</span><div class="wd-sw" dir="ltr">${DUST.map(([v, c]) => `<i style="background:rgba(${c[0]},${c[1]},${c[2]},${Math.max(0.25, c[3] / 255)})"></i><em>${v}</em>`).join("")}</div></div>`;
  }

  function render() {
    const box = U.$("#wd-root");
    box.innerHTML = `
      <div class="wd-stage">
        <div id="wd-map" class="wd-map" role="application" aria-label="خريطة الريح والغبار فوق العراق"></div>
        <div class="wd-bar">
          <button type="button" class="btn btn-icon" id="wd-play" aria-label="شغّل الزمن">${ico("i-play")}</button>
          <div class="wd-when" id="wd-when" aria-live="polite"></div>
          <input type="range" id="wd-range" min="0" max="${S.times.length - 1}" value="${S.t}" aria-label="الساعة" dir="ltr">
          <div class="wd-tg">
            <label class="toggle"><input type="checkbox" id="wd-sw-w" checked><span class="sw"></span>الريح</label>
            <label class="toggle"><input type="checkbox" id="wd-sw-d" ${S.dust ? "checked" : "disabled"}><span class="sw"></span>الغبار</label>
          </div>
        </div>
      </div>
      <div class="wd-tik" id="wd-tik"></div>
      <section class="panel wd-legs">${legend()}<p class="faint">اضغط أي مكان على الخريطة لترى الريح والغبار فيه. ${S.dust ? "" : "<span class=\"warnc\">تعذّر جلب الغبار الآن، فالخريطة تعرض الريح فقط.</span>"}</p></section>
      <div class="next-tools wd-next">
        <a class="btn" href="#monitor">${ico("i-map")}منين جا الهواء؟ (المسار الخلفي)</a>
        <a class="btn" href="#districts">${ico("i-db")}سجل الغبار اليومي لكل قضاء</a>
      </div>
      <details class="panel ws-method">
        <summary>${ico("i-info")}المنهجية وحدود الدقة</summary>
        <ul>
          <li>الريح: سرعة الريح واتجاهها على ارتفاع 10 م من نماذج الطقس عبر Open-Meteo (أفضل نموذج متاح للمنطقة، وأساسه ECMWF IFS)، لأمس واليوم ويومين قادمين، كل ساعة.</li>
          <li>الغبار: تركيز الغبار قرب سطح الأرض من نموذج CAMS العالمي (Copernicus، دقته ≈ 0.4° أي نحو 45 كم)، وهو تقدير نموذج يدمج أرصاد الأقمار، وليس قياس محطة أرضية.</li>
          <li>الشبكة: نقطة كل درجة واحدة (13 × 15 = 195 نقطة من 28° إلى 40° شمالاً و36° إلى 50° شرقاً)، وبين النقاط استيفاء ثنائي الخطية، فالتفاصيل الأصغر من نحو 100 كم لا تظهر.</li>
          <li>الجسيمات للتوضيح: كل جسيم يتحرك باتجاه الريح وسرعته متناسبة معها، ولونه حسب السرعة؛ الأرقام الصحيحة هي التي تظهر عند الضغط على الخريطة.</li>
        </ul>
        <p class="faint ws-refs">Open-Meteo Forecast & Air Quality APIs (CC BY 4.0) · Copernicus Atmosphere Monitoring Service (CAMS) global forecasts · Map © OpenStreetMap contributors © CARTO</p>
      </details>`;

    const map = S.map = window.L.map("wd-map", { zoomControl: true, attributionControl: true, minZoom: 5, maxZoom: 9, maxBounds: [[LAT[0] - 1, LON[0] - 2], [LAT[NY - 1] + 1, LON[NX - 1] + 2]], worldCopyJump: false }).setView([34.2, 43.6], innerWidth < 640 ? 5 : 6);
    map.createPane("windPane").style.zIndex = 420; map.getPane("windPane").style.pointerEvents = "none";
    map.createPane("labelPane").style.zIndex = 460; map.getPane("labelPane").style.pointerEvents = "none";
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 9, attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 9, pane: "labelPane" }).addTo(map);
    window.L.circleMarker(TIKRIT, { radius: 5, color: "#fff", weight: 2, fillColor: "#ff8f6b", fillOpacity: 1, pane: "labelPane" }).addTo(map);
    S.layer = new WindLayer().addTo(map);
    map.on("click", e => {
      const [u, v] = windAt(S.t, e.latlng.lat, e.latlng.lng), s = Math.hypot(u, v), d = S.dust ? sample(S.dust, S.t, e.latlng.lat, e.latlng.lng) : NaN;
      const html = isFinite(s) ? `<div class="wd-pop"><b>${U.fmt(e.latlng.lat, 2)}° ش · ${U.fmt(e.latlng.lng, 2)}° ق</b><span>الريح <bdi dir="ltr">${U.fmt(s, 1)} m/s</bdi>${s >= 0.5 ? ` من ${fromDir(u, v)}` : ""}</span><span>الغبار <bdi dir="ltr">${isFinite(d) ? U.fmt(d, 0) : "—"} µg/m³</bdi></span><small>${relT(S.t)} · ${fmtT(S.times[S.t])}</small></div>` : "خارج منطقة البيانات";
      window.L.popup({ closeButton: true }).setLatLng(e.latlng).setContent(html).openOn(map);
    });

    U.$("#wd-range").oninput = e => setT(+e.target.value);
    U.$("#wd-play").onclick = togglePlay;
    U.$("#wd-sw-w").onchange = e => { S.showWind = e.target.checked; if (U.reduced) arrows(); };
    U.$("#wd-sw-d").onchange = e => { S.showDust = e.target.checked; drawDust(); };
    box.addEventListener("click", e => { const b = e.target.closest("[data-wd-go]"); if (b) { setT(+b.dataset.wdGo); U.$("#wd-map").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "center" }); } });
    setT(S.t);
  }

  let playT = 0;
  function togglePlay() {
    S.play = !S.play;
    const b = U.$("#wd-play"); b.innerHTML = ico(S.play ? "i-pause" : "i-play"); b.setAttribute("aria-label", S.play ? "أوقف الزمن" : "شغّل الزمن");
    clearInterval(playT);
    if (S.play) playT = setInterval(() => setT(S.t >= S.times.length - 1 ? 0 : S.t + 1), 700);
  }

  let loading = false;
  async function load() {
    if (loading) return; loading = true;
    const box = U.$("#wd-root");
    if (!S.map) box.innerHTML = `<div class="panel lv-load"><span class="spinner"></span>جارٍ جلب الريح والغبار لـ 195 نقطة…</div>`;
    try {
      await fetchGrid();
      if (!S.map) render(); else { U.$("#wd-range").max = S.times.length - 1; setT(S.now); }
    } catch (e) {
      if (!S.map) L.fail(box, "تعذّر جلب بيانات الريح الآن. تحقّق من الاتصال ثم أعد فتح الصفحة.");
    } finally { loading = false; }
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });
  ECO.views.wind = {
    init: load,
    show() {
      if (S.map) { setTimeout(() => { S.map.invalidateSize(); if (S.layer) S.layer.reset(); }, 60); if (Date.now() - S.fetched > 30 * 60e3) load(); }
    },
    hide() { stop(); if (S.play) togglePlay(); }
  };
})();
