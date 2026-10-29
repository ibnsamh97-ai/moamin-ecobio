/* =====================================================================
   دجلة من الفضاء — جودة مياه النهر من صور Sentinel-2 الحقيقية
   ---------------------------------------------------------------------
   المصدر: Copernicus Sentinel-2 Level-2A (دقة 10 م) عبر Microsoft
   Planetary Computer: بحث الصور (STAC) وقراءة قيم البكسل وبلاطات ملونة.
   مجاني ولا يحتاج مفتاحاً. إذا رفض المتصفح الطلب يمر عبر الخادم المشترك.

   المؤشرات (من الانعكاسية السطحية):
     NDTI = (B04 − B03)/(B04 + B03)  مؤشر العكورة   (Lacaux et al., 2007)
     NDCI = (B05 − B04)/(B05 + B04)  مؤشر الكلوروفيل (Mishra & Mishra, 2012)
     NDWI = (B03 − B08)/(B03 + B08)  مؤشر الماء     (McFeeters, 1996)
   الانعكاسية = (DN − الإزاحة) / 10000، والإزاحة 1000 لصور خط المعالجة
   04.00 فأحدث (ESA، منذ 25 كانون الثاني 2022).
   يُقبل البكسل ماءً إذا صنّفته ESA ماءً (SCL = 6).
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const PC = "https://planetarycomputer.microsoft.com/api";
  const COL = "sentinel-2-l2a";
  // نقطة البداية: وسط مجرى دجلة في تكريت (صنّفتها ESA ماءً في صورة 17 تشرين الأول 2026)
  const HOME = { lat: 34.605, lon: 43.695, name: "تكريت – وسط النهر" };
  const S = { map: null, layers: [], mode: "ndti", date: null, dates: [], dayItems: [], via: "direct", marker: null, pt: null, series: null, range: "6m", seq: 0, tseq: 0, center: null, tileErr: 0, tileOk: 0, inited: false };
  const px = new Map();

  /* حدود القراءة الفضائية: لقطات منفصلة، وNDCI في المياه الطينية */
  const SNAP_NOTE = "كل قراءة لقطة واحدة: يمر Sentinel-2 فوق صلاح الدين نحو الحادية عشرة صباحاً بتوقيت بغداد كل 5 أيام تقريباً إذا صفا الجو، فالقراءة تصف النهر لحظة الصورة فقط، وقد يحدث تلوث ويزول بين صورتين دون أن يظهر.";
  const NDCI_NOTE = "الطين العالق الكثيف في دجلة يرفع انعكاس الحزمتين الحمراء وحافة الأحمر معاً، فقد يرتفع NDCI دون زيادة حقيقية في الطحالب؛ إذا كانت العكورة مرتفعة فاقرأ NDCI بحذر وأكّد الكلوروفيل مختبرياً. المؤشران نسبيان وليسا تراكيز.";
  const SCL_AR = { 0: "لا بيانات", 1: "بكسل معيب", 2: "منطقة داكنة", 3: "ظل غيوم", 4: "نبات", 5: "أرض جرداء", 6: "ماء", 7: "غير مصنّف", 8: "غيوم متوسطة", 9: "غيوم كثيفة", 10: "غيوم رقيقة", 11: "ثلج" };
  const RANGES = { "6m": { label: "6 أشهر", months: 6, win: 3 }, "1y": { label: "سنة", months: 12, win: 7 }, "all": { label: "منذ 2017", months: 0, win: 30 } };

  /* ألوان البلاطات: فترات قيم، والقيمة −9 (ليست ماء) شفافة */
  const CMAP = {
    ndti: [[[-10, -1.5], [0, 0, 0, 0]], [[-1.5, -0.2], [29, 78, 137, 255]], [[-0.2, -0.12], [42, 122, 176, 255]], [[-0.12, -0.06], [79, 176, 198, 255]], [[-0.06, 0], [159, 213, 181, 255]], [[0, 0.06], [232, 211, 90, 255]], [[0.06, 0.12], [227, 154, 59, 255]], [[0.12, 1.5], [160, 82, 45, 255]]],
    ndci: [[[-10, -1.5], [0, 0, 0, 0]], [[-1.5, -0.1], [43, 92, 138, 255]], [[-0.1, -0.05], [59, 139, 176, 255]], [[-0.05, 0], [95, 183, 166, 255]], [[0, 0.05], [147, 221, 138, 255]], [[0.05, 0.1], [92, 191, 74, 255]], [[0.1, 0.2], [46, 154, 58, 255]], [[0.2, 1.5], [17, 107, 43, 255]]]
  };
  const LEG = {
    ndti: { name: "مؤشر العكورة NDTI", lo: "أصفى", hi: "أعكر", ticks: ["-0.2", "-0.12", "-0.06", "0", "0.06", "0.12"] },
    ndci: { name: "مؤشر الكلوروفيل NDCI", lo: "كلوروفيل أقل", hi: "كلوروفيل أكثر", ticks: ["-0.1", "-0.05", "0", "0.05", "0.1", "0.2"] }
  };
  const rgb = a => `rgb(${a[0]},${a[1]},${a[2]})`;
  const colorFor = (mode, v) => { const c = CMAP[mode].slice(1).find(([[a, b]]) => v >= a && v < b); return c ? rgb(c[1]) : "#888"; };

  /* ---------- الاتصال: مباشرة، ثم عبر الخادم المشترك ---------- */
  async function pcGet(kind, path, params) {
    const qs = (params instanceof URLSearchParams ? params : new URLSearchParams(params)).toString();
    const proxy = ECO.gemini && ECO.gemini.proxy && ECO.gemini.proxy();
    let r = null;
    if (S.via === "direct") {
      try { r = await fetch(`${PC}/${kind}/v1/${path}?${qs}`); }
      catch (e) { if (!proxy) throw Object.assign(new Error("NET"), { net: true }); S.via = "proxy"; }
    }
    if (S.via === "proxy") {
      try { r = await fetch(`${proxy}/v1/pc/${kind}/${path}?${qs}`); }
      catch (e) { throw Object.assign(new Error("NET"), { net: true }); }
      if (r.status === 404) throw Object.assign(new Error("OLD_WORKER"), { old: true });
    }
    if (!r.ok) {
      let m = ""; try { const j = await r.json(); m = (typeof j.detail === "string" && j.detail) || (j.error && j.error.message) || ""; } catch (e) { /* */ }
      throw Object.assign(new Error(m || "HTTP " + r.status), { status: r.status });
    }
    return r.json();
  }
  const errText = e => e && e.old ? "الخادم المشترك يحتاج تحديث الكود (خطوة Cloudflare نفسها)."
    : e && e.net ? "تعذّر الاتصال بخدمة الأقمار الصناعية الآن. تأكد من الإنترنت ثم أعد المحاولة."
    : "خدمة الأقمار الصناعية لم تُجب (" + U.esc(e && e.message || "") + ").";

  /* ---------- البحث عن الصور (STAC) ---------- */
  const toItem = f => ({ id: f.id, bbox: f.bbox, time: f.properties.datetime, date: String(f.properties.datetime || "").slice(0, 10), cloud: f.properties["eo:cloud_cover"], pb: f.properties["s2:processing_baseline"], tile: f.properties["s2:mgrs_tile"] });
  async function search({ bbox, datetime, cloud, limit = 100, sort = "-datetime", all = false, onPage }) {
    const p = new URLSearchParams({ collections: COL, bbox: bbox.map(v => (+v).toFixed(5)).join(","), datetime, limit: String(limit), sortby: sort, fields: "id,bbox,properties.datetime,properties.eo:cloud_cover,properties.s2:processing_baseline,properties.s2:mgrs_tile" });
    if (cloud != null) { p.set("filter-lang", "cql2-text"); p.set("filter", `eo:cloud_cover<${cloud}`); }
    let out = [], params = p, pages = 0;
    for (;;) {
      const j = await pcGet("stac", "search", params);
      out = out.concat((j.features || []).map(toItem));
      pages++; onPage && onPage(out.length);
      const next = all && (j.links || []).find(l => l.rel === "next");
      if (!next || pages >= 12) break;
      try { params = new URL(next.href).searchParams; } catch (e) { break; }
      if (next.method && next.method.toUpperCase() === "POST") break;
    }
    return out;
  }
  // صورة واحدة لكل يوم (أقل غيوماً عند التكرار أو تداخل المربعات)
  const perDay = items => {
    const m = new Map();
    items.forEach(it => { const o = m.get(it.date); if (!o || (it.cloud || 0) < (o.cloud || 0)) m.set(it.date, it); });
    return [...m.values()];
  };
  const inBox = (it, lat, lon) => !it.bbox || (lon >= it.bbox[0] && lon <= it.bbox[2] && lat >= it.bbox[1] && lat <= it.bbox[3]);
  const iso = d => d.toISOString().slice(0, 10);

  /* ---------- قراءة البكسل وحساب المؤشرات ---------- */
  const offsetOf = it => { const pb = parseFloat(it.pb); return isFinite(pb) ? (pb >= 4 ? 1000 : 0) : (it.date >= "2022-01-25" ? 1000 : 0); };
  const nd = (a, b) => (U.isNum(a) && U.isNum(b) && a + b > 0.002 ? (a - b) / (a + b) : NaN);
  function compute(v, it) {
    const off = offsetOf(it), rf = k => (U.isNum(v[k]) && v[k] > 0 ? (v[k] - off) / 10000 : NaN);
    const g = rf("B03"), r = rf("B04"), re = rf("B05"), n = rf("B08");
    const o = { id: it.id, date: it.date, cloud: it.cloud, scl: v.SCL, rho: { B02: rf("B02"), B03: g, B04: r, B05: re, B08: n }, ndti: nd(r, g), ndci: nd(re, r), ndwi: nd(g, n) };
    const s = o.scl;
    o.cls = !U.isNum(s) || s === 0 || s === 1 || !U.isNum(o.ndti) ? "nodata"
      : [3, 8, 9, 10].includes(s) ? "cloud"
      : s === 6 || ((s === 2 || s === 7) && o.ndwi > 0.3) ? "water" : "land";
    return o;
  }
  async function pixel(it, lat, lon) {
    const key = `${it.id}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
    if (px.has(key)) return px.get(key);
    const p = new URLSearchParams({ collection: COL, item: it.id, expression: "B02;B03;B04;B05;B08;SCL", asset_as_band: "true" });
    const j = await pcGet("data", `item/point/${lon.toFixed(6)},${lat.toFixed(6)}`, p);
    const v = {}; (j.band_names || []).forEach((b, i) => { v[String(b).replace(/_b\d+$/, "")] = j.values[i]; });
    const o = compute(v, it); px.set(key, o); return o;
  }

  /* ---------- طبقات الخريطة ---------- */
  function tileQuery(it) {
    const p = new URLSearchParams({ collection: COL, item: it.id, tile_format: "png" });
    if (S.mode === "rgb") { p.set("assets", "visual"); p.set("asset_bidx", "visual|1,2,3"); p.set("nodata", "0"); }
    else {
      const d = offsetOf(it) ? "-2000" : "";
      p.set("expression", S.mode === "ndti" ? `where(SCL==6,(B04-B03)/(B04+B03${d}),-9)` : `where(SCL==6,(B05-B04)/(B05+B04${d}),-9)`);
      p.set("asset_as_band", "true"); p.set("colormap", JSON.stringify(CMAP[S.mode]));
    }
    return p;
  }
  async function showLayers() {
    const seq = ++S.seq;
    S.layers.forEach(l => S.map.removeLayer(l)); S.layers = [];
    S.tileErr = 0; S.tileOk = 0; setMapNote("");
    if (!S.date) return;
    const b = S.map.getBounds(), c = S.map.getCenter();
    const w = Math.min(0.5, (b.getEast() - b.getWest()) / 2), h = Math.min(0.5, (b.getNorth() - b.getSouth()) / 2);
    let items;
    try { items = await search({ bbox: [c.lng - w, c.lat - h, c.lng + w, c.lat + h], datetime: `${S.date}T00:00:00Z/${S.date}T23:59:59Z`, limit: 8 }); }
    catch (e) { if (seq === S.seq) setMapNote(errText(e)); return; }
    if (seq !== S.seq) return;
    S.dayItems = items;
    if (!items.length) { setMapNote("لا توجد صورة لهذا اليوم فوق هذه المنطقة؛ اختر تاريخاً آخر."); return; }
    for (const it of items.slice(0, 4)) {
      let tpl;
      try { const tj = await pcGet("data", "item/tilejson.json", tileQuery(it)); tpl = tj.tiles && tj.tiles[0]; }
      catch (e) { tpl = null; }
      if (seq !== S.seq) return;
      if (!tpl) tpl = `${PC}/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?${tileQuery(it)}`;
      const lyr = L.tileLayer(tpl, { maxNativeZoom: 15, maxZoom: 19, minZoom: S.mode === "rgb" ? 6 : 9, opacity: S.mode === "rgb" ? 1 : 0.92, zIndex: 6, attribution: "Copernicus Sentinel-2 (ESA) · Microsoft Planetary Computer" });
      lyr.on("tileload", () => { S.tileOk++; });
      lyr.on("tileerror", () => { S.tileErr++; if (S.tileErr >= 6 && !S.tileOk) setMapNote("تعذّر تحميل صورة القمر الصناعي الآن. جرّب «صورة حقيقية» أو تاريخاً آخر."); });
      lyr.addTo(S.map); S.layers.push(lyr);
    }
    if (S.mode !== "rgb" && S.map.getZoom() < 9) setMapNote("قرّب الخريطة لرؤية المؤشر الملوّن.");
    renderLegend();
  }
  function setMapNote(t) { const n = U.$("#sp-mapnote"); if (n) { n.textContent = t; n.hidden = !t; } }

  /* ---------- التواريخ المتاحة ---------- */
  async function loadDates(force) {
    const c = S.map.getCenter();
    if (!force && S.center && Math.abs(c.lat - S.center.lat) < 0.25 && Math.abs(c.lng - S.center.lng) < 0.25) return;
    S.center = { lat: c.lat, lng: c.lng };
    const box = U.$("#sp-dates"); box.innerHTML = `<span class="faint">جارٍ البحث عن الصور…</span>`;
    const end = new Date(), start = new Date(Date.now() - 150 * 86400000);
    let items;
    try { items = await search({ bbox: [c.lng - 0.01, c.lat - 0.01, c.lng + 0.01, c.lat + 0.01], datetime: `${iso(start)}/${iso(end)}T23:59:59Z`, cloud: 35, limit: 80 }); }
    catch (e) { box.innerHTML = `<div class="notice warn"><span>${errText(e)}</span><button class="btn btn-sm" type="button" data-sp-retry>إعادة المحاولة</button></div>`; return; }
    S.dates = perDay(items).sort((a, b) => b.date.localeCompare(a.date));
    U.$("#sp-count").textContent = S.dates.length ? `${S.dates.length} صورة صافية خلال 5 أشهر` : "";
    if (!S.dates.length) { box.innerHTML = `<span class="faint">لا توجد صور صافية حديثة لهذه المنطقة.</span>`; return; }
    if (!S.date || !S.dates.find(d => d.date === S.date)) S.date = S.dates[0].date;
    renderDates(); showLayers();
  }
  function renderDates() {
    const box = U.$("#sp-dates");
    box.innerHTML = S.dates.slice(0, 10).map(d => `<button type="button" class="sp-date${d.date === S.date ? " on" : ""}" data-d="${d.date}"><b>${fmtDate(d.date)}</b><small>غيوم ${U.fmt(d.cloud, 0)}%</small></button>`).join("");
    U.$("#sp-date").value = S.date || "";
  }
  const fmtDate = d => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  async function pickDate(d) {
    // تاريخ من التقويم: أقرب صورة صافية خلال ±10 أيام
    const c = S.map.getCenter(), a = new Date(Date.parse(d) - 10 * 86400000), b = new Date(Date.parse(d) + 10 * 86400000);
    U.$("#sp-dates").insertAdjacentHTML("afterbegin", `<span class="faint" id="sp-pick-wait">جارٍ البحث…</span>`);
    let items = [];
    try { items = await search({ bbox: [c.lng - 0.01, c.lat - 0.01, c.lng + 0.01, c.lat + 0.01], datetime: `${iso(a)}/${iso(b)}T23:59:59Z`, cloud: 50, limit: 40 }); }
    catch (e) { U.toast(errText(e).replace(/<[^>]+>/g, "")); }
    const w = U.$("#sp-pick-wait"); if (w) w.remove();
    const days = perDay(items);
    if (!days.length) { U.toast("لا توجد صورة صافية قرب هذا التاريخ"); return; }
    days.sort((x, y) => Math.abs(Date.parse(x.date) - Date.parse(d)) - Math.abs(Date.parse(y.date) - Date.parse(d)));
    const best = days[0];
    if (!S.dates.find(x => x.date === best.date)) S.dates = [best, ...S.dates];
    S.date = best.date; renderDates(); showLayers();
    if (best.date !== d) U.toast("أقرب صورة صافية: " + fmtDate(best.date));
    if (S.pt) inspect(S.pt.lat, S.pt.lon, true);
  }

  function renderLegend() {
    const el = U.$("#sp-legend");
    if (S.mode === "rgb") { el.innerHTML = `<p class="faint sp-note">صورة بالألوان الحقيقية (B04، B03، B02) بدقة 10 أمتار. لون الماء البني يدل على العكورة، والأخضر على الطحالب.</p>`; return; }
    const L2 = LEG[S.mode], cols = CMAP[S.mode].slice(1).map(c => rgb(c[1]));
    el.innerHTML = `<div class="sp-leg"><div class="sp-leg-t"><b>${L2.name}</b><span class="faint">يظهر على بكسلات الماء فقط</span></div>
      <div class="sp-bar" style="background:linear-gradient(90deg,${cols.join(",")})"></div>
      <div class="sp-ticks" dir="ltr">${L2.ticks.map(t => `<span>${t}</span>`).join("")}</div>
      <div class="sp-ends"><span>${L2.lo}</span><span>${L2.hi}</span></div></div>`;
  }

  /* ---------- قراءة نقطة ---------- */
  async function inspect(lat, lon, keepSeries) {
    S.pt = { lat, lon };
    if (S.marker) S.marker.setLatLng([lat, lon]); else S.marker = L.marker([lat, lon], { icon: L.divIcon({ className: "sp-pin", html: "<span></span>", iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(S.map);
    const box = U.$("#sp-read");
    box.innerHTML = `<p class="faint">جارٍ قراءة البكسل من صورة ${fmtDate(S.date)}…</p>`;
    if (!keepSeries) { S.series = null; U.$("#sp-series").hidden = true; }
    let it = S.dayItems.find(x => inBox(x, lat, lon));
    try {
      if (!it) {
        const items = await search({ bbox: [lon - 0.0005, lat - 0.0005, lon + 0.0005, lat + 0.0005], datetime: `${S.date}T00:00:00Z/${S.date}T23:59:59Z`, limit: 4 });
        it = items[0];
      }
      if (!it) { box.innerHTML = `<p class="warnc">لا توجد صورة لهذا التاريخ فوق هذه النقطة.</p>`; return; }
      const o = await pixel(it, lat, lon);
      if (S.pt.lat !== lat || S.pt.lon !== lon) return;
      S.last = o; renderRead(o, lat, lon);
    } catch (e) { box.innerHTML = `<div class="notice warn"><span>${errText(e)}</span></div>`; }
  }
  const bar = (mode, v) => {
    const lo = mode === "ndti" ? -0.25 : -0.15, hi = mode === "ndti" ? 0.2 : 0.25, k = U.clamp((v - lo) / (hi - lo), 0, 1);
    return `<span class="sp-mini" style="background:linear-gradient(90deg,${CMAP[mode].slice(1).map(c => rgb(c[1])).join(",")})"><i style="left:${(k * 100).toFixed(1)}%"></i></span>`;
  };
  function renderRead(o, lat, lon) {
    const box = U.$("#sp-read");
    const head = `<div class="sp-rh"><b>${fmtDate(o.date)}</b><span class="faint" dir="ltr">${lat.toFixed(5)}, ${lon.toFixed(5)}</span></div>`;
    if (o.cls !== "water") {
      const why = o.cls === "cloud" ? `غيوم فوق النقطة في هذا اليوم (${SCL_AR[o.scl]}).` : o.cls === "nodata" ? "لا توجد قيمة صالحة لهذه النقطة." : `هذه النقطة ليست ماءً في الصورة: صنّفتها وكالة الفضاء الأوروبية «${SCL_AR[o.scl] || o.scl}».`;
      box.innerHTML = `${head}<div class="notice info"><span>${why} اضغط وسط مجرى النهر، أو اختر طبقة «العكورة» لترى بكسلات الماء ملوّنة.</span></div>`;
      return;
    }
    box.innerHTML = `${head}
      <div class="sp-cards">
        <div class="sp-card"><span class="k">العكورة NDTI</span><b dir="ltr">${U.fmt(o.ndti, 3)}</b>${bar("ndti", o.ndti)}</div>
        <div class="sp-card"><span class="k">الكلوروفيل NDCI</span><b dir="ltr">${U.fmt(o.ndci, 3)}</b>${bar("ndci", o.ndci)}</div>
      </div>
      <div class="sp-refl" dir="ltr">${["B02", "B03", "B04", "B05", "B08"].map(k => `<span><small>${k}</small>${U.fmt(o.rho[k] * 100, 1)}%</span>`).join("")}</div>
      <p class="faint sp-note">الانعكاسية السطحية لكل حزمة طيفية. تصنيف ESA للبكسل: ماء (SCL ${o.scl}) · مؤشر الماء NDWI ${U.fmt(o.ndwi, 2)}</p>
      <p class="faint sp-note">${SNAP_NOTE} ${NDCI_NOTE}</p>
      <div class="sp-track"><span>تتبّع هذه النقطة عبر الزمن:</span>${Object.entries(RANGES).map(([k, r]) => `<button type="button" class="btn btn-sm${S.series && S.range === k ? " btn-primary" : ""}" data-sp-range="${k}">${r.label}</button>`).join("")}</div>`;
  }

  /* ---------- السلسلة الزمنية ---------- */
  function thin(items, days) {
    if (days <= 1) return items;
    const m = new Map();
    items.forEach(it => { const k = Math.floor(Date.parse(it.date) / (days * 86400000)); const o = m.get(k); if (!o || (it.cloud || 0) < (o.cloud || 0)) m.set(k, it); });
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  const SKEY = "space_series";
  function cacheGet(key) { try { const c = U.store.get(SKEY, {}); const o = c[key]; return o && Date.now() - o.at < 12 * 3600000 ? o.data : null; } catch (e) { return null; } }
  function cacheSet(key, data) { try { const c = U.store.get(SKEY, {}); c[key] = { at: Date.now(), data }; const keys = Object.keys(c); if (keys.length > 4) delete c[keys.sort((a, b) => c[a].at - c[b].at)[0]]; U.store.set(SKEY, c); } catch (e) { /* */ } }

  async function track(range) {
    if (!S.pt) return;
    S.range = range; const R = RANGES[range], seq = ++S.tseq, { lat, lon } = S.pt;
    const box = U.$("#sp-series"); box.hidden = false;
    U.$$("[data-sp-range]").forEach(b => b.classList.toggle("btn-primary", b.dataset.spRange === range));
    const key = `${lat.toFixed(4)},${lon.toFixed(4)},${range}`;
    const cached = cacheGet(key);
    if (cached) { S.series = cached; renderSeries(); return; }
    const prog = t => { const p = U.$("#sp-prog"); if (p) p.textContent = t; };
    box.innerHTML = `<div class="panel-h"><h3>السلسلة الزمنية – ${R.label}</h3></div><p class="faint" id="sp-prog">جارٍ البحث عن الصور الصافية…</p><div class="sp-progbar"><i id="sp-pbar"></i></div>`;
    const end = new Date(), start = R.months ? new Date(Date.now() - R.months * 30.44 * 86400000) : new Date("2017-03-28T00:00:00Z");
    let items;
    try { items = await search({ bbox: [lon - 0.0005, lat - 0.0005, lon + 0.0005, lat + 0.0005], datetime: `${iso(start)}/${iso(end)}T23:59:59Z`, cloud: 40, limit: 250, sort: "datetime", all: true, onPage: n => prog(`عُثر على ${n} صورة…`) }); }
    catch (e) { if (seq === S.tseq) box.innerHTML = `<div class="notice warn"><span>${errText(e)}</span></div>`; return; }
    if (seq !== S.tseq) return;
    const list = thin(perDay(items).sort((a, b) => a.date.localeCompare(b.date)), R.win);
    if (!list.length) { box.innerHTML = `<p class="warnc">لا توجد صور صافية لهذه النقطة في هذه الفترة.</p>`; return; }
    const res = []; let done = 0, fail = 0;
    const queue = list.slice();
    const worker = async () => {
      while (queue.length && seq === S.tseq) {
        const it = queue.shift();
        try { res.push(await pixel(it, lat, lon)); } catch (e) { fail++; if (e.net || e.old) { queue.length = 0; } }
        done++;
        prog(`قراءة البكسل من الصور: ${done} من ${list.length}`);
        const b = U.$("#sp-pbar"); if (b) b.style.width = (done / list.length * 100).toFixed(0) + "%";
      }
    };
    await Promise.all([1, 2, 3, 4, 5].map(worker));
    if (seq !== S.tseq) return;
    if (!res.length) { box.innerHTML = `<div class="notice warn"><span>تعذّرت قراءة الصور الآن. أعد المحاولة بعد قليل.</span></div>`; return; }
    res.sort((a, b) => a.date.localeCompare(b.date));
    S.series = { lat, lon, range, at: Date.now(), points: res.map(o => ({ date: o.date, cloud: o.cloud, cls: o.cls, scl: o.scl, ndti: o.ndti, ndci: o.ndci, ndwi: o.ndwi, id: o.id })), failed: fail, candidates: list.length };
    if (!fail) cacheSet(key, S.series);
    renderSeries();
  }

  function stats(arr) {
    const v = arr.filter(U.isNum); if (!v.length) return null;
    const s = v.slice().sort((a, b) => a - b);
    return { n: v.length, mean: U.mean(v), min: s[0], max: s[s.length - 1], median: U.median(v) };
  }
  function trend(pts, k) {
    const d = pts.filter(p => U.isNum(p[k])); if (d.length < 6) return null;
    const x = d.map(p => Date.parse(p.date) / (365.25 * 86400000)), y = d.map(p => p[k]);
    const mx = U.mean(x), my = U.mean(y);
    let sxy = 0, sxx = 0; x.forEach((xi, i) => { sxy += (xi - mx) * (y[i] - my); sxx += (xi - mx) ** 2; });
    return sxx ? sxy / sxx : null;
  }
  const pct = (arr, v) => { const a = arr.filter(U.isNum); return a.length ? Math.round(a.filter(x => x < v).length / a.length * 100) : null; };

  function nearSamples(ser) {
    const list = ECO.samples ? ECO.samples.list() : [];
    const dkm = (a, b) => { const r = Math.PI / 180, h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
    const water = ser.points.filter(p => p.cls === "water");
    return list.filter(s => s.date && U.isNum(s.lat) && dkm(s, ser) <= 2).map(s => {
      const best = water.map(p => ({ p, dd: Math.abs(Date.parse(p.date) - Date.parse(s.date)) / 86400000 })).sort((a, b) => a.dd - b.dd)[0];
      return { s, km: dkm(s, ser), sat: best && best.dd <= 3 ? best.p : null, dd: best ? Math.round(best.dd) : null };
    });
  }

  function renderSeries() {
    const ser = S.series, box = U.$("#sp-series"); if (!ser) return;
    const water = ser.points.filter(p => p.cls === "water");
    const nCloud = ser.points.filter(p => p.cls === "cloud").length, nLand = ser.points.filter(p => p.cls === "land" || p.cls === "nodata").length;
    const st = { ndti: stats(water.map(p => p.ndti)), ndci: stats(water.map(p => p.ndci)) };
    const last = water[water.length - 1];
    const tr = { ndti: trend(water, "ndti"), ndci: trend(water, "ndci") };
    const R = RANGES[ser.range];
    const near = nearSamples(ser);
    let summary = "";
    if (last && st.ndti) {
      const p1 = pct(water.map(p => p.ndti), last.ndti);
      summary = `آخر صورة صافية (${fmtDate(last.date)}): العكورة أعلى من ${p1}% من صور هذه النقطة خلال ${R.label}.`;
      if (tr.ndti != null && water.length >= 10) summary += ` الاتجاه الخطي للعكورة: ${tr.ndti > 0 ? "تزايد" : "تناقص"} بمقدار ${U.fmt(Math.abs(tr.ndti), 3)} في السنة.`;
    }
    box.innerHTML = `<div class="panel-h"><h3>السلسلة الزمنية – ${R.label}</h3><span class="sub">${water.length} قراءة ماء من ${ser.points.length} صورة</span></div>
      ${water.length ? `<div class="chart-box sp-chart"><canvas id="sp-chart"></canvas></div>` : `<div class="notice info"><span>كل الصور لهذه النقطة غائمة أو ليست ماءً. جرّب نقطة وسط النهر.</span></div>`}
      ${summary ? `<p class="sp-sum">${summary}</p>` : ""}
      ${water.length ? `<p class="faint sp-note">${SNAP_NOTE}</p>` : ""}
      ${st.ndti ? `<div class="tbl-wrap"><table class="tbl sp-tbl"><thead><tr><th>المؤشر</th><th>المتوسط</th><th>الوسيط</th><th>الأدنى</th><th>الأعلى</th><th>الاتجاه/سنة</th></tr></thead><tbody>
        ${["ndti", "ndci"].map(k => `<tr><td>${k === "ndti" ? "العكورة NDTI" : "الكلوروفيل NDCI"}</td><td dir="ltr">${U.fmt(st[k].mean, 3)}</td><td dir="ltr">${U.fmt(st[k].median, 3)}</td><td dir="ltr">${U.fmt(st[k].min, 3)}</td><td dir="ltr">${U.fmt(st[k].max, 3)}</td><td dir="ltr">${tr[k] == null ? "—" : (tr[k] > 0 ? "+" : "") + U.fmt(tr[k], 3)}</td></tr>`).join("")}
      </tbody></table></div>` : ""}
      <p class="faint sp-note">استُبعدت ${nCloud} صورة غائمة فوق النقطة و${nLand} صورة لم تُصنَّف فيها النقطة ماءً${ser.failed ? `، وتعذّرت قراءة ${ser.failed}` : ""}. ${R.win > 1 ? `أُخذت أصفى صورة في كل ${R.win} أيام.` : ""}</p>
      ${near.length ? `<div class="sp-near"><b>عيناتك الحقلية القريبة (ضمن 2 كم)</b>${near.map(n => `<div class="sp-nr"><span>${U.esc(n.s.code)} · ${U.esc(n.s.site || "")} · ${U.esc(n.s.date)}${U.isNum(n.s.v && n.s.v.turb) ? ` · العكورة المختبرية ${n.s.v.turb} NTU` : ""}</span><span>${n.sat ? `NDTI القمر ${U.fmt(n.sat.ndti, 3)} (${fmtDate(n.sat.date)}${n.dd ? `، فرق ${n.dd} يوم` : ""})` : "لا توجد صورة صافية خلال ±3 أيام"}</span></div>`).join("")}</div>` : `<p class="faint sp-note">أضف عيّنة حقلية قرب هذه النقطة في «خريطة العينات» مع تاريخها وعكورتها لتظهر مقارنتها هنا.</p>`}
      <div class="row sp-acts"><button class="btn btn-sm" type="button" data-sp-csv><svg><use href="#i-down"/></svg>تنزيل البيانات CSV</button><button class="btn btn-sm btn-primary" type="button" data-sp-pdf><svg><use href="#i-file"/></svg>تقرير PDF</button><button class="btn btn-sm" type="button" data-sp-ask><svg><use href="#i-chat"/></svg>اسأل المساعد</button></div>`;
    ECO.lastSpace = { point: [+ser.lat.toFixed(5), +ser.lon.toFixed(5)], range: R.label, images: ser.points.length, water: water.length, ndti: st.ndti, ndci: st.ndci, trend: tr, last: last ? { date: last.date, ndti: +last.ndti.toFixed(3), ndci: +last.ndci.toFixed(3) } : null };
    if (!water.length) return;
    const labels = water.map(p => p.date);
    U.chart(U.$("#sp-chart"), {
      type: "line",
      data: { labels, datasets: [
        { label: "العكورة NDTI", data: water.map(p => p.ndti), borderColor: "#e6ae4f", backgroundColor: water.map(p => colorFor("ndti", p.ndti)), pointRadius: water.length > 60 ? 2 : 3.5, borderWidth: 1.6, tension: 0.25 },
        { label: "الكلوروفيل NDCI", data: water.map(p => p.ndci), borderColor: "#93dd8a", backgroundColor: water.map(p => colorFor("ndci", p.ndci)), pointRadius: water.length > 60 ? 2 : 3.5, borderWidth: 1.6, tension: 0.25 }
      ] },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: { x: { ticks: { maxTicksLimit: 6, maxRotation: 0, callback(v) { return fmtDate(labels[v]); } }, grid: { display: false } }, y: { title: { display: true, text: "قيمة المؤشر" } } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: c => fmtDate(labels[c[0].dataIndex]) + ` · غيوم المشهد ${U.fmt(water[c[0].dataIndex].cloud, 0)}%` } } }
      }
    });
  }

  function csv() {
    const ser = S.series; if (!ser) return;
    const rows = [["date", "item_id", "scene_cloud_%", "scl_class", "water", "NDTI", "NDCI", "NDWI"]].concat(ser.points.map(p => [p.date, p.id, U.isNum(p.cloud) ? p.cloud.toFixed(2) : "", p.scl, p.cls === "water" ? 1 : 0, U.isNum(p.ndti) ? p.ndti.toFixed(4) : "", U.isNum(p.ndci) ? p.ndci.toFixed(4) : "", U.isNum(p.ndwi) ? p.ndwi.toFixed(4) : ""]));
    const head = `# Sentinel-2 L2A (Microsoft Planetary Computer) – point ${ser.lat.toFixed(5)}, ${ser.lon.toFixed(5)}\n`;
    const blob = new Blob(["﻿" + head + rows.map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `sentinel2-tigris-${ser.lat.toFixed(4)}_${ser.lon.toFixed(4)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function pdf(mode) {
    const ser = S.series; if (!ser) return;
    const water = ser.points.filter(p => p.cls === "water"), R = RANGES[ser.range];
    const st = { ndti: stats(water.map(p => p.ndti)), ndci: stats(water.map(p => p.ndci)) };
    ECO.report.run({
      title: "جودة مياه دجلة من صور Sentinel-2", subtitle: `النقطة ${ser.lat.toFixed(5)}, ${ser.lon.toFixed(5)} · ${R.label}`, file: "دجلة-من-الفضاء",
      blocks: [
        { type: "text", html: "قيم مستخرجة من صور القمر الأوروبي Sentinel-2 (المستوى 2A، انعكاسية سطحية، دقة 10 م) عبر Microsoft Planetary Computer. يُقبل البكسل ماءً حسب تصنيف ESA للمشهد (SCL = 6) وتُستبعد الصور الغائمة فوق النقطة. المؤشرات نسبية للمقارنة الزمنية والمكانية ولا تساوي تراكيز مختبرية." },
        { type: "kv", items: [["الإحداثيات", `${ser.lat.toFixed(5)}, ${ser.lon.toFixed(5)}`], ["الفترة", R.label], ["الصور المفحوصة", String(ser.points.length)], ["قراءات الماء الصالحة", String(water.length)]] },
        ECO.report.chartFrom(U.$("#sp-chart")) ? { type: "chart", src: ECO.report.chartFrom(U.$("#sp-chart"), 680, 280), caption: "السلسلة الزمنية لمؤشري العكورة والكلوروفيل" } : null,
        st.ndti ? { type: "table", caption: "إحصاءات المؤشرين", head: ["المؤشر", "المتوسط", "الوسيط", "الأدنى", "الأعلى"], rows: ["ndti", "ndci"].map(k => [k.toUpperCase(), U.fmt(st[k].mean, 3), U.fmt(st[k].median, 3), U.fmt(st[k].min, 3), U.fmt(st[k].max, 3)]) } : null,
        { type: "table", caption: "القراءات (صور الماء الصالحة)", head: ["التاريخ", "NDTI", "NDCI", "غيوم المشهد %"], rows: water.slice(-40).map(p => [p.date, U.fmt(p.ndti, 3), U.fmt(p.ndci, 3), U.fmt(p.cloud, 0)]) },
        { type: "refs", items: ["Copernicus Sentinel-2 Level-2A data (ESA), accessed via Microsoft Planetary Computer.", "Lacaux, J.P. et al. (2007). Classification of ponds from high-spatial resolution remote sensing: Application to Rift Valley Fever epidemics in Senegal. Remote Sensing of Environment, 106(1), 66–74.", "Mishra, S. & Mishra, D.R. (2012). Normalized difference chlorophyll index: A novel model for remote estimation of chlorophyll-a concentration in turbid productive waters. Remote Sensing of Environment, 117, 394–406.", "McFeeters, S.K. (1996). The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features. International Journal of Remote Sensing, 17(7), 1425–1432."] },
        { type: "sign" }
      ]
    }, mode);
  }

  /* ---------- البناء ---------- */
  function build() {
    if (!window.L) return;
    S.map = L.map("sp-map", { center: [HOME.lat, HOME.lon], zoom: 13, zoomSnap: 0.5, maxZoom: 19 });
    S.map.attributionControl.setPrefix(false);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri" }).addTo(S.map);
    U.labelLayers().addTo(S.map);
    // مواقع البحوث للمساعدة في التنقل
    (ECO.RESEARCH || []).filter(r => r.lat != null).forEach(r => L.marker([r.lat, r.lon], { icon: L.divIcon({ className: "rs-pin" + (r.supervisor ? " sup" : ""), html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9] }) }).bindTooltip(r.place + " (موقع تقريبي)", { className: "eco-tip" }).addTo(S.map));
    S.map.on("click", e => inspect(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)));
    S.map.on("moveend", U.debounce(() => { loadDates(false); if (S.date) showLayersIfMoved(); }, 500));
    U.$("#sp-layer").innerHTML = [["ndti", "العكورة"], ["ndci", "الكلوروفيل"], ["rgb", "صورة حقيقية"]].map(([k, l]) => `<button type="button" data-m="${k}" class="${k === S.mode ? "on" : ""}">${l}</button>`).join("");
    U.$("#sp-layer").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.mode = b.dataset.m; U.$$("#sp-layer button").forEach(x => x.classList.toggle("on", x === b)); showLayers(); };
    U.$("#sp-dates").onclick = e => { if (e.target.closest("[data-sp-retry]")) { loadDates(true); return; } const b = e.target.closest(".sp-date"); if (!b) return; S.date = b.dataset.d; renderDates(); showLayers(); if (S.pt) inspect(S.pt.lat, S.pt.lon, true); };
    const di = U.$("#sp-date"); di.max = iso(new Date()); di.min = "2017-03-28";
    di.onchange = () => { if (di.value) pickDate(di.value); };
    U.$("#sp-home").onclick = () => { S.map.setView([HOME.lat, HOME.lon], 14); inspect(HOME.lat, HOME.lon); };
    U.$("#view-space").addEventListener("click", e => {
      const r = e.target.closest("[data-sp-range]"); if (r) { track(r.dataset.spRange); return; }
      if (e.target.closest("[data-sp-csv]")) csv();
      if (e.target.closest("[data-sp-pdf]")) pdf();
      if (e.target.closest("[data-sp-ask]")) { ECO.go("assistant"); setTimeout(() => { const t = U.$("#chat-text"); if (t) { t.value = "فسّر لي نتائج «دجلة من الفضاء» للنقطة التي اخترتها: ماذا تعني قيم العكورة والكلوروفيل واتجاهها، وما الفحوص الحقلية التي تؤكدها؟"; t.focus(); } }, 300); }
    });
    renderLegend();
    S.lastLayerCenter = S.map.getCenter();
  }
  function showLayersIfMoved() {
    const c = S.map.getCenter(), o = S.lastLayerCenter;
    if (!o || Math.abs(c.lat - o.lat) > 0.3 || Math.abs(c.lng - o.lng) > 0.3) { S.lastLayerCenter = c; showLayers(); }
  }

  ECO.space = { state: S, compute, offsetOf, inspect, track, pixel, pcGet, search, perDay, tileQuery: (it, mode) => { const m = S.mode; S.mode = mode; const q = tileQuery(it); S.mode = m; return q; }, CMAP, errText };
  ECO.views.space = {
    async init() {
      build(); S.inited = true;
      const go = ECO._spaceGoto; ECO._spaceGoto = null;
      if (go) S.map.setView([go.lat, go.lon], 12);
      await loadDates(true);
      // أول زيارة: نقرأ وسط النهر في تكريت ونعرض آخر 6 أشهر مباشرة
      if (!go && S.date && !S.pt) { await inspect(HOME.lat, HOME.lon); if (S.last && S.last.cls === "water") track("6m"); }
    },
    show() {
      if (!S.map) return;
      setTimeout(() => S.map.invalidateSize(), 60);
      const go = ECO._spaceGoto; ECO._spaceGoto = null;
      if (go) S.map.setView([go.lat, go.lon], 12);
    }
  };
})();
