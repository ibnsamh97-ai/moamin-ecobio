/* =====================================================================
   EcoBio AI — الأقمار فوق راسك
   مواقع أقمار رصد الأرض الآن، محسوبة في متصفحك من عناصر مداراتها
   (CelesTrak، تُحدَّث كل يوم) بنموذج SGP4 (مكتبة satellite.js)، وموعد
   تصويرها القادم لتكريت: حين تمر نقطة القمر الأرضية على مسافة أقل من
   نصف عرض مسحه من تكريت والشمس فوق الأفق.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  if (!document.getElementById("view-sats")) return;
  const { ico, esc } = L;
  const TIK = { lat: 34.6071, lon: 43.6782 };
  const D2R = Math.PI / 180, RE = 6371;

  /* ما يقيسه كل قمر وأين تستعمله المنصة */
  const INFO = [
    { re: /^SENTINEL-2/, col: "#93dd8a", what: "ألوان الأرض والماء بدقة 10 م كل بضعة أيام", tool: ["space", "دجلة من الفضاء: العكورة والطحالب"], day: true },
    { re: /^LANDSAT/, col: "#4fc8dc", what: "ألوان الأرض وحرارة سطحها بدقة 30 م، أرشيف منذ 1984", tool: ["swipe", "قبل وبعد من الفضاء"], day: true },
    { re: /^SENTINEL-5P/, col: "#e6ae4f", what: "غازات التلوث: NO₂ وSO₂ وCO والأوزون، مرة يومياً", tool: ["districts", "NO₂ اليومي في قاعدة الأقضية"], day: true },
    { re: /^(AQUA|TERRA)/, col: "#ff8f6b", what: "جهاز MODIS: الحرائق وشعلات الغاز والغبار، مرتين يومياً", tool: ["flares", "مصادر التلوث من الفضاء"], day: true },
    { re: /^SENTINEL-3/, col: "#b493ff", what: "لون المياه وحرارة سطح الأرض بدقة 300 م يومياً", tool: null, day: true }
  ];
  const infoOf = n => INFO.find(i => i.re.test(n)) || { col: "#e4f1ed", what: "", tool: null, day: true };
  const nice = n => n.replace(/^SENTINEL-/, "Sentinel-").replace(/^LANDSAT /, "Landsat ").replace(/^AQUA/, "Aqua").replace(/^TERRA/, "Terra");

  const S = { data: null, sats: [], map: null, marks: [], track: null, foot: null, sel: 0, tick: 0, passes: null };

  /* ---------- الفلك ---------- */
  function geo(sat, t) {
    const pv = satellite.propagate(sat.rec, t);
    if (!pv || !pv.position) return null;
    const g = satellite.eciToGeodetic(pv.position, satellite.gstime(t));
    return { lat: satellite.degreesLat(g.latitude), lon: satellite.degreesLong(g.longitude), h: g.height };
  }
  function gc(a1, o1, a2, o2) { // مسافة الدائرة العظمى كم
    const p1 = a1 * D2R, p2 = a2 * D2R, dp = p2 - p1, dl = (o2 - o1) * D2R;
    return 2 * RE * Math.asin(Math.sqrt(Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2));
  }
  /* ارتفاع الشمس (درجات) بخوارزمية NOAA المبسطة */
  function sunElev(t, lat, lon) {
    const d = t.getTime() / 864e5 + 2440587.5 - 2451545.0, g = (357.529 + 0.98560028 * d) * D2R, q = 280.459 + 0.98564736 * d;
    const Lm = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R, e = (23.439 - 0.00000036 * d) * D2R;
    const ra = Math.atan2(Math.cos(e) * Math.sin(Lm), Math.cos(Lm)), dec = Math.asin(Math.sin(e) * Math.sin(Lm));
    const gmst = (18.697374558 + 24.06570982441908 * d) % 24, ha = ((gmst * 15 + lon) * D2R) - ra;
    return Math.asin(Math.sin(lat * D2R) * Math.sin(dec) + Math.cos(lat * D2R) * Math.cos(dec) * Math.cos(ha)) / D2R;
  }

  /* المرور القادم الذي يصوّر فيه القمر تكريت (حتى 16 يوماً) */
  async function nextPass(sat, from) {
    const half = sat.swath / 2, step = 60e3, end = from + 16 * 864e5;
    let prev = null, prev2 = null, n = 0;
    for (let t = from; t < end; t += step) {
      const g = geo(sat, new Date(t)); if (!g) return null;
      const d = gc(g.lat, g.lon, TIK.lat, TIK.lon);
      if (prev && prev2 && prev.d < prev2.d && prev.d <= d && prev.d < half + 400) {
        // أدق: بخطوة 5 ثوانٍ حول أقرب نقطة
        let best = { t: prev.t, d: prev.d };
        for (let u = prev.t - step; u <= prev.t + step; u += 5e3) { const h = geo(sat, new Date(u)); const x = h && gc(h.lat, h.lon, TIK.lat, TIK.lon); if (x != null && x < best.d) best = { t: u, d: x }; }
        if (best.d <= half && (!sat.day || sunElev(new Date(best.t), TIK.lat, TIK.lon) > 5)) return best;
      }
      prev2 = prev; prev = { t, d };
      if (++n % 4000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return null;
  }

  /* ---------- العرض ---------- */
  const fmtAt = ms => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { timeZone: "Asia/Baghdad", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(ms));
  const where = g => `${U.fmt(Math.abs(g.lat), 1)}° ${g.lat >= 0 ? "شمالاً" : "جنوباً"} و${U.fmt(Math.abs(g.lon), 1)}° ${g.lon >= 0 ? "شرقاً" : "غرباً"}`;
  const days = d => d === 1 ? "يوم" : d === 2 ? "يومين" : d <= 10 ? `${d} أيام` : `${d} يوماً`;
  function countdown(ms) {
    let s = Math.max(0, Math.round((ms - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    return d > 0 ? `${d <= 2 ? (d === 1 ? "يوم" : "يومين") : days(d)} و${h} س ${m} د` : h > 0 ? `${h} س ${m} د ${s} ث` : `${m} د ${s} ث`;
  }

  function track(sat) {
    const segs = [[]], now = Date.now(); let last = null;
    for (let t = now - 15 * 60e3; t <= now + 100 * 60e3; t += 30e3) {
      const g = geo(sat, new Date(t)); if (!g) continue;
      if (last != null && Math.abs(g.lon - last) > 180) segs.push([]);
      segs[segs.length - 1].push([g.lat, g.lon]); last = g.lon;
    }
    return segs;
  }

  function draw() {
    const now = new Date(), m = S.map;
    S.sats.forEach((s, i) => {
      const g = geo(s, now); if (!g) return;
      s.now = g;
      if (!S.marks[i]) {
        S.marks[i] = window.L.circleMarker([g.lat, g.lon], { radius: 6, color: "#fff", weight: 1.5, fillColor: s.info.col, fillOpacity: 1 })
          .bindTooltip(nice(s.name), { permanent: true, direction: "right", className: "st-lab", offset: [6, 0] }).addTo(m)
          .on("click", () => select(i));
      } else S.marks[i].setLatLng([g.lat, g.lon]);
    });
    const s = S.sats[S.sel];
    if (s && s.now) {
      if (S.foot) S.foot.setLatLng([s.now.lat, s.now.lon]).setRadius(s.swath / 2 * 1000);
      else S.foot = window.L.circle([s.now.lat, s.now.lon], { radius: s.swath / 2 * 1000, color: s.info.col, weight: 1, fillOpacity: 0.12, interactive: false }).addTo(m);
      const dist = gc(s.now.lat, s.now.lon, TIK.lat, TIK.lon);
      U.$("#st-now").innerHTML = `<b>${nice(s.name)}</b> الآن فوق ${where(s.now)} على ارتفاع <bdi dir="ltr">${U.fmt(s.now.h, 0)} km</bdi>، يبعد عن تكريت <bdi dir="ltr">${U.fmt(dist, 0)} km</bdi>، ويرى تحته شريطاً عرضه <bdi dir="ltr">${U.fmt(s.swath, 0)} km</bdi>.`;
    }
    // العدادات
    U.$$("[data-cd]").forEach(el => { el.textContent = countdown(+el.dataset.cd); });
    const near = S.sats.filter(x => x.now).map(x => ({ x, d: gc(x.now.lat, x.now.lon, TIK.lat, TIK.lon) })).sort((a, b) => a.d - b.d)[0];
    if (near) U.$("#st-near").innerHTML = `أقرب قمر إلى تكريت الآن: <b>${nice(near.x.name)}</b> على بعد <bdi dir="ltr">${U.fmt(near.d, 0)} km</bdi>`;
  }

  function select(i) {
    S.sel = i; const s = S.sats[i];
    if (S.track) S.map.removeLayer(S.track);
    S.track = window.L.layerGroup(track(s).map(seg => window.L.polyline(seg, { color: s.info.col, weight: 2, opacity: 0.85, dashArray: "6 6", interactive: false }))).addTo(S.map);
    if (S.foot) { S.map.removeLayer(S.foot); S.foot = null; }
    U.$$(".st-card").forEach(c => c.classList.toggle("on", +c.dataset.i === i));
    draw();
  }

  function cards() {
    const box = U.$("#st-list"), order = S.sats.map((s, i) => ({ s, i })).sort((a, b) => (a.s.pass ? a.s.pass.t : 9e15) - (b.s.pass ? b.s.pass.t : 9e15));
    box.innerHTML = order.map(({ s, i }) => `
      <article class="st-card${i === S.sel ? " on" : ""}" data-i="${i}" style="--c:${s.info.col}" tabindex="0" role="button" aria-label="اعرض مدار ${esc(nice(s.name))}">
        <header><i></i><b>${esc(nice(s.name))}</b><small>عرض المسح ${U.fmt(s.swath, 0)} كم</small></header>
        <p>${esc(s.info.what)}</p>
        ${s.pass === undefined ? `<div class="st-when"><span class="spinner"></span> يحسب المرور القادم…</div>`
          : s.pass ? `<div class="st-when"><small>يصوّر تكريت بعد</small><b data-cd="${s.pass.t}">${countdown(s.pass.t)}</b><span>${fmtAt(s.pass.t)} · أقرب مسافة ${U.fmt(s.pass.d, 0)} كم من نقطة تحته</span></div>`
          : `<div class="st-when"><small>لا مرور نهاري فوق تكريت خلال 16 يوماً</small></div>`}
        ${s.info.tool ? `<a href="#${s.info.tool[0]}" class="st-tool">${ico("i-chev")}${esc(s.info.tool[1])}</a>` : ""}
      </article>`).join("");
  }

  async function passes() {
    const from = Date.now();
    for (const s of S.sats) { s.pass = await nextPass(s, from); cards(); }
  }

  function render() {
    const D = S.data, box = U.$("#st-root");
    const ep = S.sats.map(s => Date.parse(s.epoch + "Z")).filter(isFinite), age = (Date.now() - Math.max(...ep)) / 864e5;
    box.innerHTML = `
      <div class="st-stage">
        <div id="st-map" class="st-map" aria-label="خريطة مواقع الأقمار الآن"></div>
        <div class="st-hud"><p id="st-near" aria-live="polite"></p><p id="st-now"></p></div>
      </div>
      <h3 class="st-h">${ico("i-orbit")}من يصوّر تكريت أولاً؟ <small>اضغط أي قمر لترى مداره</small></h3>
      <div class="st-list" id="st-list"></div>
      <details class="panel ws-method">
        <summary>${ico("i-info")}كيف يُحسب هذا؟</summary>
        <ul>
          <li>عناصر المدار (GP/TLE) لـ ${S.sats.length} أقمار من CelesTrak، تُجلب يومياً. أحدث عناصر بعمر ${U.fmt(age, 1)} يوم (آخر جلب ${esc(String(D.fetched || "").slice(0, 16).replace("T", " "))} UTC).</li>
          <li>الموقع يُحسب في متصفحك كل ثانية بنموذج SGP4 (Vallado et al. 2006) عبر مكتبة satellite.js؛ خطؤه مع عناصر بعمر يوم أو يومين بحدود بضعة كيلومترات، أي ثوانٍ في التوقيت.</li>
          <li>«يصوّر تكريت»: أقرب نقطة يمر بها القمر عمودياً تقع ضمن نصف عرض مسحه من تكريت والشمس أعلى من 5° فوق الأفق. هذا حساب هندسي؛ التصوير الفعلي يتبع خطة البعثة (Sentinel-2 وLandsat يصوّران اليابسة بانتظام)، والغيوم قد تحجب الصورة.</li>
          <li>الخط المتقطع مسار القمر من قبل ربع ساعة إلى بعد 100 دقيقة، والدائرة الشريط الذي يراه تحته.</li>
        </ul>
        <p class="faint ws-refs">CelesTrak GP data (T.S. Kelso) · Vallado, D.A., Crawford, P., Hujsak, R., Kelso, T.S. (2006). Revisiting Spacetrack Report #3. AIAA 2006-6753 · satellite.js (MIT)</p>
      </details>`;
    const map = S.map = window.L.map("st-map", { minZoom: 1, maxZoom: 7, worldCopyJump: true }).setView([22, 44], innerWidth < 640 ? 1 : 2);
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 7, attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    window.L.circleMarker([TIK.lat, TIK.lon], { radius: 5, color: "#ff8f6b", weight: 2, fillColor: "#fff", fillOpacity: 1 }).bindTooltip("تكريت", { permanent: true, direction: "left", className: "st-lab st-home" }).addTo(map);
    box.addEventListener("click", e => { const c = e.target.closest(".st-card"); if (c && !e.target.closest("a")) select(+c.dataset.i); });
    box.addEventListener("keydown", e => { const c = e.target.closest(".st-card"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(+c.dataset.i); } });
    cards(); select(S.sats.findIndex(s => /SENTINEL-2/.test(s.name)) >= 0 ? S.sats.findIndex(s => /SENTINEL-2/.test(s.name)) : 0);
    passes();
  }

  function start() { stop(); if (S.map) { draw(); S.tick = setInterval(draw, 1000); } }
  function stop() { clearInterval(S.tick); S.tick = 0; }

  let loading = false;
  async function load() {
    if (S.data || loading) return; loading = true;
    const box = U.$("#st-root");
    box.innerHTML = `<div class="panel lv-load"><span class="spinner"></span>جارٍ تحميل مدارات الأقمار…</div>`;
    try {
      if (!window.satellite) throw new Error("lib");
      const D = await L.get("tle.json");
      S.data = D;
      S.sats = D.sats.map(o => { let rec = null; try { rec = satellite.json2satrec(o); } catch (e) { rec = null; } const name = o.OBJECT_NAME; return { name, rec, swath: o.SWATH_KM, epoch: o.EPOCH, info: infoOf(name), day: infoOf(name).day }; })
        .filter(s => s.rec && geo(s, new Date()))
        .sort((a, b) => INFO.indexOf(a.info) - INFO.indexOf(b.info) || a.name.localeCompare(b.name));
      if (!S.sats.length) throw new Error("no sats");
      render(); start();
    } catch (e) {
      L.fail(box, "تعذّر تحميل مدارات الأقمار. تحقّق من الاتصال وأعد فتح الصفحة.");
    } finally { loading = false; }
  }
  document.addEventListener("visibilitychange", () => { if (document.body.dataset.view !== "sats") return; if (document.hidden) stop(); else start(); });
  L.sats = { sunElev, nextPass, geo, gc, state: S }; // للاختبار
  ECO.views.sats = {
    init: load,
    show() { if (S.map) { setTimeout(() => S.map.invalidateSize(), 60); start(); } },
    hide: stop
  };
})();
