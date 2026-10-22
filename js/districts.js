/* =====================================================================
   EcoBio AI — قاعدة بيانات أقضية دجلة في صلاح الدين
   قاعدة SQLite حقيقية تُبنى وتُحدَّث كل يوم آلياً على GitHub Actions
   (مجلد etl/)، وتُقرأ هنا كاملة داخل المتصفح بمحرك sql.js،
   وتُحفظ نسخة منها في الجهاز للعمل دون إنترنت.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  if (!document.getElementById("view-districts")) return;

  const RAW = "https://raw.githubusercontent.com/ibnsamh97-ai/moamin-ecobio/db/";
  const CACHE = "ecobio-db-v1";
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const N = (v, d = "auto") => `<bdi class="db-n">${U.fmt(v, d)}</bdi>`;
  const NU = (v, d, u) => `<bdi class="db-n" dir="ltr">${U.fmt(v, d)} ${u}</bdi>`; // رقم ووحدته كتلة واحدة داخل النص العربي
  const LTR = s => `<bdi dir="ltr">${esc(s)}</bdi>`;
  const dayF = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const monF = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" });
  const stampF = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baghdad" });
  const fD = iso => iso ? dayF.format(new Date(String(iso).slice(0, 10) + "T12:00:00Z")) : "—";
  const fM = ym => ym ? monF.format(new Date(String(ym).slice(0, 7) + "-15T12:00:00Z")) : "—";
  const fStamp = s => { try { return stampF.format(new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z")); } catch (e) { return s || "—"; } };
  const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const today = () => U.isoDate(new Date());

  /* ------------------------------------------------------------------
     مسميات ثابتة
  ------------------------------------------------------------------ */
  const DCOL = { shirqat: "#b493ff", baiji: "#ee7a4f", tikrit: "#4fc8dc", dour: "#93dd8a", samarra: "#e6ae4f", balad: "#f08fb8" };
  const MODEL = { persistence: "الاستمرارية (خط الأساس)", ridge: "انحدار Ridge", random_forest: "الغابة العشوائية", gradient_boosting: "التعزيز التدرّجي", mlp: "شبكة عصبية MLP", cams: "توقّع CAMS" };
  const KIND = {
    refinery: ["مصفاة نفط", "#ef5a64"], oil_facility: ["منشأة نفطية", "#ee7a4f"], power_plant: ["محطة كهرباء", "#e6ae4f"],
    wastewater: ["محطة معالجة مياه صرف", "#4fc8dc"], landfill: ["مكبّ نفايات", "#b493ff"], oil_well: ["بئر نفط", "#c98b5a"],
    oil_storage: ["خزّان نفط", "#f2b27a"], quarry: ["مقلع", "#9aa7a4"], works: ["معمل", "#e8d35a"], industrial: ["منطقة صناعية", "#c4d3cf"]
  };
  /* عمود كل معيار في جداول القاعدة: [الجدول، العمود، شهري؟] */
  const COLS = {
    pm2_5: ["air_daily", "pm2_5"], pm10: ["air_daily", "pm10"], dust: ["air_daily", "dust"], no2: ["air_daily", "no2"], so2: ["air_daily", "so2"],
    o3: ["air_daily", "o3_max"], co: ["air_daily", "co"], aqi_pm25: ["air_daily", "aqi_pm25"],
    t_max: ["weather_daily", "t_max"], t_max_adj: ["v_weather_corrected", "t_max_adj"], t_min_adj: ["v_weather_corrected", "t_min_adj"], t_mean: ["weather_daily", "t_mean"], precip: ["weather_daily", "precip"], wind_max: ["weather_daily", "wind_max"],
    rh_mean: ["weather_daily", "rh_mean"], et0: ["weather_daily", "et0"],
    discharge: ["river_daily", "discharge"],
    ndti: ["water_rs_monthly", "ndti", true], ndci: ["water_rs_monthly", "ndci", true]
  };
  const CAT = { air: "الهواء (CAMS)", weather: "الطقس (ERA5)", river: "النهر (GloFAS)", water_rs: "الماء من الفضاء (Sentinel-2)" };
  const SRC_NOTE = {
    air: "قيم CAMS العالمية: نموذج يدمج قياسات الأقمار الصناعية بدقة ≈45 كم، فهي تمثّل هواء المنطقة المحيطة بالقضاء وليست قراءة محطة أرضية.",
    weather: "ERA5 إعادة تحليل بدقة ≈25 كم. آخر أيام قليلة من نموذج التنبؤ لأن أرشيف ERA5 يتأخر نحو 5 أيام.",
    river: "تصريف GloFAS v4 محسوب بنموذج هيدرولوجي لخلية النهر عند القضاء (≈5 كم)، وليس قراءة محطة قياس.",
    water_rs: "مؤشرات نسبية من انعكاس الماء في أصفى مشهد Sentinel-2 كل شهر (بكسلات الماء فقط): كلما زادت دلّت على عكورة أو كلوروفيل أعلى، وليست تراكيز بالملغم/لتر."
  };
  const FEAT = {
    pm10_lag0: "PM10 اليوم", dust_lag0: "الغبار اليوم", no2_lag0: "NO₂ اليوم", co_lag0: "CO اليوم", o3_lag0: "O₃ اليوم",
    pm25_ma7: "متوسط PM2.5 لآخر أسبوع", pm25_ma30: "متوسط PM2.5 لآخر شهر", wind_lag0: "أقوى رياح اليوم",
    t_max_target: "حرارة يوم التوقّع", wind_max_target: "رياح يوم التوقّع", precip_target: "أمطار يوم التوقّع", rh_mean_target: "رطوبة يوم التوقّع",
    doy_sin: "الموسم (جيب)", doy_cos: "الموسم (جيب تمام)"
  };
  const featLabel = f => {
    const m = /^pm25_lag(\d)$/.exec(f);
    if (m) return m[1] === "0" ? "PM2.5 اليوم" : `PM2.5 قبل ${m[1] === "1" ? "يوم" : m[1] === "2" ? "يومين" : m[1] + " أيام"}`;
    return FEAT[f] || f;
  };
  const PNAME = { pm2_5: "PM2.5", pm10: "PM10", dust: "الغبار", no2: "NO₂", so2: "SO₂", o3: "O₃", co: "CO" };
  const tone = (v, lim) => !U.isNum(v) ? "none" : !lim ? "info" : (r => r < 0.5 ? "good" : r < 1 ? "fair" : r < 2 ? "warn" : r < 3 ? "bad" : r < 5 ? "severe" : "hazard")(v / lim);
  const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

  /* ------------------------------------------------------------------
     الحالة
  ------------------------------------------------------------------ */
  const S = { db: null, gz: null, meta: null, from: "", D: [], P: {}, d: null, tab: "overview", task: "pm25_d1",
    ts: { p: "pm2_5", span: 365, cmp: "" }, cmpP: "pm2_5", map: null, mapG: null, tigris: null, sqlLast: null, painted: {} };
  const TABS = [["overview", "لوحة القضاء", "i-home"], ["ground", "المقاس فعلاً", "i-pin"], ["series", "السلاسل الزمنية", "i-layers"], ["ai", "الذكاء الاصطناعي", "i-brain"],
    ["plan", "خطة العينات", "i-gps"], ["compare", "مقارنة الأقضية", "i-table"], ["studies", "البحوث ومصادر التلوث", "i-book"]];
  const DIST_TABS = new Set(["overview", "ground", "series", "ai", "plan", "studies"]);

  /* ------------------------------------------------------------------
     الاستعلام
  ------------------------------------------------------------------ */
  function q(sql, params) {
    const st = S.db.prepare(sql);
    try { if (params) st.bind(params); const out = []; while (st.step()) out.push(st.getAsObject()); return out; }
    finally { st.free(); }
  }
  const q1 = (sql, p) => q(sql, p)[0] || null;
  const dist = () => S.D.find(d => d.id === S.d) || S.D[0];
  const hasT = n => { try { return !!q1("SELECT 1 x FROM sqlite_master WHERE name = ?", [n]); } catch (e) { return false; } };

  /* ------------------------------------------------------------------
     التحميل: البيانات الوصفية ← النسخة المحفوظة أو التنزيل ← فك الضغط ← sql.js
  ------------------------------------------------------------------ */
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return res();
      const s = document.createElement("script"); s.src = src; s.dataset.src = src; s.async = true;
      s.onload = res; s.onerror = () => rej(new Error("تعذّر تحميل " + src)); document.head.appendChild(s);
    });
  }
  let SQLp = null;
  const initSQL = () => SQLp || (SQLp = loadScript("vendor/sqljs/sql-wasm.js").then(() => window.initSqlJs({ locateFile: f => "vendor/sqljs/" + f })).catch(e => { SQLp = null; throw e; }));

  async function fetchMeta() {
    try {
      const r = await fetch(RAW + "ecobio-meta.json?t=" + Math.floor(Date.now() / 300000), { cache: "no-store" });
      if (r.ok) return await r.json();
      if (r.status === 404) return { missing: true };
    } catch (e) { /* دون اتصال */ }
    return null;
  }
  async function openCache() { try { return "caches" in window ? await caches.open(CACHE) : null; } catch (e) { return null; } }
  async function getGz(meta, prog) {
    const cache = await openCache(), key = RAW + "ecobio.db.gz";
    const stamp = U.store.get("dbStamp", null);
    if (cache) {
      const hit = await cache.match(key);
      if (hit && (!meta || meta.missing || stamp === meta.updated_at)) return { buf: await hit.arrayBuffer(), from: meta && !meta.missing ? "cache" : "offline" };
    }
    if (meta && meta.missing) { const e = new Error("missing"); e.code = 404; throw e; }
    try {
      const r = await fetch(key + "?v=" + encodeURIComponent(meta ? meta.updated_at : Date.now()));
      if (!r.ok) { const e = new Error("HTTP " + r.status); e.code = r.status; throw e; }
      const total = +r.headers.get("content-length") || (meta && meta.bytes_gz) || 0;
      let buf;
      if (r.body && r.body.getReader) {
        const rd = r.body.getReader(), parts = []; let got = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (total) prog(Math.min(1, got / total)); }
        buf = new Uint8Array(got); let o = 0; parts.forEach(p => { buf.set(p, o); o += p.length; }); buf = buf.buffer;
      } else buf = await r.arrayBuffer();
      if (cache) { try { await cache.put(key, new Response(buf.slice(0))); U.store.set("dbStamp", meta ? meta.updated_at : null); } catch (e) { /* لا مساحة */ } }
      return { buf, from: "net" };
    } catch (e) {
      if (cache) { const hit = await cache.match(key); if (hit) return { buf: await hit.arrayBuffer(), from: "offline" }; }
      throw e;
    }
  }
  async function gunzip(buf) {
    if (!("DecompressionStream" in window)) throw new Error("متصفحك قديم ولا يدعم فك الضغط. حدّثه أو افتح المنصة في Chrome.");
    return new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  }

  function setLoad(text, f) {
    const t = U.$("#db-load-t"), b = U.$("#db-prog-bar");
    if (t) t.textContent = text;
    if (b && f != null) b.style.transform = `scaleX(${U.clamp(f, 0, 1)})`;
  }
  let loadP = null;
  function load(force) {
    if (loadP && !force) return loadP;
    U.$("#db-load").hidden = false; U.$("#db-app").hidden = true;
    U.$("#db-load").innerHTML = `<div class="db-load-box"><span class="db-load-ic">${ico("i-db")}</span><b id="db-load-t">جارٍ التحقق من آخر تحديث…</b><div class="db-prog" role="progressbar" aria-label="تحميل قاعدة البيانات"><i id="db-prog-bar"></i></div><small>القاعدة كاملة تنزل مرة واحدة (بضعة ميغابايت) وتُحفظ في جهازك، فتعمل بعدها حتى دون إنترنت.</small></div>`;
    loadP = (async () => {
      const meta = await fetchMeta();
      setLoad("جارٍ التحضير…", 0.04);
      const sqlP = initSQL();
      const got = await getGz(meta, f => setLoad(`جارٍ تنزيل قاعدة البيانات… ${Math.round(f * 100)}%`, 0.06 + f * 0.84));
      setLoad("جارٍ فك الضغط وفتح القاعدة…", 0.94);
      const raw = await gunzip(got.buf);
      const SQL = await sqlP;
      if (S.db) try { S.db.close(); } catch (e) { /* */ }
      S.db = new SQL.Database(raw); S.gz = got.buf; S.from = got.from; S.bytes = raw.length;
      const m = q1("SELECT value FROM meta WHERE key = 'summary'");
      S.meta = m ? JSON.parse(m.value) : (meta && !meta.missing ? meta : {});
      S.painted = {};
      boot();
    })();
    loadP.catch(e => { loadP = null; showError(e); });
    return loadP;
  }
  function showError(e) {
    console.error(e);
    const first = e && e.code === 404;
    U.$("#db-load").innerHTML = `<div class="db-load-box">${ico(first ? "i-refresh" : "i-info")}
      <b>${first ? "قاعدة البيانات تُبنى الآن لأول مرة" : "تعذّر فتح قاعدة البيانات"}</b>
      <p class="muted">${first ? "البناء الأول يجلب سجلاً كاملاً منذ عام 2000 ويدرّب نماذج الذكاء الاصطناعي، ويستغرق نحو ساعة. ارجع بعد قليل." : esc(e && e.message || e) + "<br>تأكد من اتصالك بالإنترنت ثم أعد المحاولة."}</p>
      <button type="button" class="btn btn-primary" data-db-retry>${ico("i-refresh")}أعد المحاولة</button></div>`;
  }

  /* ------------------------------------------------------------------
     الهيكل بعد التحميل
  ------------------------------------------------------------------ */
  function boot() {
    S.P = {}; q("SELECT * FROM parameters").forEach(p => { S.P[p.code] = p; });
    S.D = q("SELECT * FROM districts ORDER BY ord");
    S.ground = hasT("station_daily") && !!q1("SELECT 1 x FROM station_daily LIMIT 1");
    S.dustM = hasT("dust_prob") && !!q1("SELECT 1 x FROM dust_prob LIMIT 1");
    if (S.ground) {   // الحرارة بعد تصحيح خطأ ERA5 بالقياس الأرضي
      S.P.t_max_adj = { code: "t_max_adj", name_ar: "أعلى درجة حرارة (مصححة بالقياس)", unit: "°C", category: "weather" };
      S.P.t_min_adj = { code: "t_min_adj", name_ar: "أدنى درجة حرارة (مصححة بالقياس)", unit: "°C", category: "weather" };
    }
    readHash();
    if (!S.D.find(d => d.id === S.d)) S.d = U.store.get("dbDistrict", "tikrit");
    if (!S.D.find(d => d.id === S.d)) S.d = S.D[0] && S.D[0].id;
    U.$("#db-load").hidden = true; U.$("#db-app").hidden = false;
    renderStatus(); renderRibbon(); renderTabs(); paint();
    requestAnimationFrame(centerPressed);
  }

  function renderStatus() {
    const m = S.meta || {}, from = { net: "نُزّلت الآن", cache: "محفوظة في جهازك", offline: "نسخة محفوظة (دون اتصال)" }[S.from] || "";
    U.$("#db-status").innerHTML = `<span class="chip ${S.from === "offline" ? "tone-warn" : "tone-good"}">${ico(S.from === "offline" ? "i-info" : "i-check")}${from}</span>
      <span class="updated">آخر تحديث: ${esc(fStamp(m.updated_at))} · ${U.fileSize(S.bytes || 0)}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-db-reload title="أعد التحقق من وجود تحديث">${ico("i-refresh")}تحديث</button>`;
  }

  function renderRibbon() {
    const last = {};
    q(`SELECT a.district_id id, a.pm2_5 v FROM air_daily a JOIN (SELECT district_id, MAX(date) m FROM air_daily GROUP BY district_id) l
       ON l.district_id = a.district_id AND l.m = a.date`).forEach(r => { last[r.id] = r.v; });
    U.$("#db-ribbon").innerHTML = `<span class="rb-end">شمال</span>
      <ol>${S.D.map(d => `<li><button type="button" data-d="${d.id}" aria-pressed="${d.id === S.d}" style="--dc:${DCOL[d.id] || "var(--river)"}">
        <i class="rb-dot" aria-hidden="true"></i><b>${esc(d.name_ar)}</b>
        <span class="chip tone-${tone(last[d.id], 15)}" title="متوسط PM2.5 لآخر يوم مكتمل (µg/m³)">${U.isNum(last[d.id]) ? N(last[d.id], 0) : "—"}</span></button></li>`).join("")}</ol>
      <span class="rb-end">جنوب</span>
      <button type="button" class="btn btn-ghost btn-sm rb-near" data-db-near>${ico("i-gps")}أقرب قضاء لي</button>`;
  }

  function renderTabs() {
    U.$("#db-tabs").innerHTML = TABS.map(([id, label, ic]) => `<button type="button" role="tab" id="db-t-${id}" aria-controls="db-p-${id}" aria-selected="${id === S.tab}" data-tab="${id}">${ico(ic)}${label}</button>`).join("");
    U.$$("#db-panels > .an-panel").forEach(p => { p.hidden = p.id !== "db-p-" + S.tab; });
    U.$("#view-districts").classList.toggle("db-no-dist", !DIST_TABS.has(S.tab));
  }

  /* يرسم التبويب الحالي إن تغيّر القضاء منذ آخر رسم */
  function paint() {
    const key = DIST_TABS.has(S.tab) ? S.d + (S.tab === "ai" ? ":" + S.task : "") : "all";
    const el = U.$("#db-p-" + S.tab);
    if (S.painted[S.tab] === key) { if (S.tab === "overview" && S.map) setTimeout(() => S.map.invalidateSize(), 50); return; }
    S.painted[S.tab] = key;
    try { ({ overview: rOverview, ground: rGround, plan: rPlan, series: rSeries, ai: rAI, compare: rCompare, studies: rStudies })[S.tab](el); }
    catch (e) { console.error(e); el.innerHTML = `<div class="notice warn">${ico("i-info")}<span>تعذّر عرض هذا القسم: ${esc(e.message)}</span></div>`; }
    writeHash();
  }

  function readHash() {
    const h = decodeURIComponent(location.hash.slice(1)).split("&").slice(1);
    h.forEach(kv => { const [k, v] = kv.split("="); if (k === "d" && v) S.d = v; if (k === "t" && TABS.some(t => t[0] === v)) S.tab = v; });
  }
  function writeHash() {
    const h = `#districts&d=${S.d}&t=${S.tab}`;
    if (location.hash !== h && ECO.router && ECO.router.current() === "districts") history.replaceState(null, "", h);
  }

  function centerPressed() {
    const b = U.$('#db-ribbon [aria-pressed="true"]'), r = U.$("#db-ribbon");
    if (b && r && r.scrollWidth > r.clientWidth + 4) { const bb = b.getBoundingClientRect(), rb = r.getBoundingClientRect(); r.scrollBy({ left: (bb.left + bb.width / 2) - (rb.left + rb.width / 2), behavior: "instant" in r ? "instant" : "auto" }); }
  }
  function setDistrict(id) {
    if (!S.D.find(d => d.id === id) || id === S.d) return;
    S.d = id; U.store.set("dbDistrict", id);
    U.$$("#db-ribbon [data-d]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.d === id)));
    centerPressed();
    paint();
  }
  function setTab(id) {
    S.tab = id; renderTabs(); paint();
    const t = U.$("#db-t-" + id); if (t) t.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  /* ------------------------------------------------------------------
     الرسوم
  ------------------------------------------------------------------ */
  const CH = {};
  function chart(panel, canvas, cfg) { const c = U.chart(canvas, cfg); if (c) (CH[panel] = CH[panel] || []).push(c); return c; }
  function clearCharts(panel) { (CH[panel] || []).forEach(c => { try { c.destroy(); } catch (e) { /* */ } }); CH[panel] = []; }
  const limitLine = (labels, v, text) => ({ type: "line", label: text, data: labels.map(() => v), borderColor: "rgba(239,90,100,.75)", borderDash: [6, 5], borderWidth: 1.2, pointRadius: 0, fill: false, tension: 0, order: 9 });
  const xTicks = { maxTicksLimit: 8, maxRotation: 0, autoSkip: true };

  /* ------------------------------------------------------------------
     1) لوحة القضاء
  ------------------------------------------------------------------ */
  function rOverview(el) {
    clearCharts("overview");
    if (!el.dataset.built) {
      el.innerHTML = `<div class="db-ov"><div class="db-ov-main" id="db-ov-main"></div>
        <aside class="db-ov-side"><div class="panel db-map-panel"><div class="panel-h"><h3>الموقع ومصادر التلوث</h3><span class="sub">OpenStreetMap</span></div><div class="db-map" id="db-map" role="img" aria-label="خريطة القضاء ونهر دجلة ومصادر التلوث"></div><div class="db-map-leg" id="db-map-leg"></div></div>
        <div class="panel" id="db-ov-facts"></div></aside></div>`;
      el.dataset.built = "1";
    }
    const d = dist();
    const air = q1("SELECT * FROM air_daily WHERE district_id = ? ORDER BY date DESC LIMIT 1", [d.id]);
    const y = air ? q1(`SELECT COUNT(pm2_5) n, AVG(pm2_5) m, SUM(pm2_5 > 15) o, SUM(pm10 > 45) o10, MAX(pm2_5) mx FROM air_daily WHERE district_id = ? AND date > date(?, '-365 day')`, [d.id, air.date]) : null;
    const fcs = air ? q("SELECT * FROM forecasts WHERE district_id = ? AND target = 'pm2_5' AND for_date > ? ORDER BY for_date", [d.id, air.date]) : [];
    const FC = {}; fcs.forEach(f => { const o = FC[f.for_date] = FC[f.for_date] || {}; if (f.model === "cams") o.cams = f; else o.best = f; });
    const fDates = Object.keys(FC).sort();
    const riv = q1("SELECT date, discharge FROM river_daily WHERE district_id = ? ORDER BY date DESC LIMIT 1", [d.id]);
    const rp = riv ? q1("SELECT 100.0 * SUM(discharge < ?) / COUNT(*) pct, AVG(discharge) avg, MIN(substr(date,1,4)) y0 FROM river_daily WHERE district_id = ? AND substr(date,6,2) = substr(?,6,2)", [riv.discharge, d.id, riv.date]) : null;
    const rs = q1("SELECT * FROM water_rs_monthly WHERE district_id = ? AND ndti IS NOT NULL ORDER BY month DESC LIMIT 1", [d.id]);
    const rsAvg = q1("SELECT AVG(ndti) a, COUNT(*) n FROM water_rs_monthly WHERE district_id = ? AND ndti IS NOT NULL", [d.id]);
    const reg = q1("SELECT r.label_ar l, a.date FROM air_regime_daily a JOIN regimes r ON r.cluster = a.cluster WHERE a.district_id = ? ORDER BY a.date DESC LIMIT 1", [d.id]);
    const wx = air ? q1(S.ground ? "SELECT * FROM v_weather_corrected WHERE district_id = ? AND date = ?" : "SELECT * FROM weather_daily WHERE district_id = ? AND date = ?", [d.id, air.date]) : null;
    const gn = S.ground ? groundNow(d) : null;
    /* هل أكّد الرصد الأرضي غبار ذلك اليوم؟ */
    const gd = S.ground && air ? q1(`SELECT s.name_ar, x.dust_hours, x.haze_hours, x.vis_min FROM district_stations ds JOIN stations s ON s.id = ds.station_id
      JOIN station_daily x ON x.station_id = s.id AND x.date = ? WHERE ds.district_id = ? AND ds.role = 'now'`, [air.date, d.id]) : null;
    const dp = S.dustM ? q1("SELECT * FROM dust_prob WHERE district_id = ? AND date >= ? ORDER BY date LIMIT 1", [d.id, today()]) || q1("SELECT * FROM dust_prob WHERE district_id = ? ORDER BY date DESC LIMIT 1", [d.id]) : null;
    const camsHigh = air && ((U.isNum(air.dust) && air.dust >= 100) || (U.isNum(air.pm2_5) && air.pm2_5 >= 75));
    const unconfirmed = camsHigh && gd && gd.dust_hours === 0 && U.isNum(gd.vis_min) && gd.vis_min >= 8;

    const kpi = (k, v, sub, t, extra = "") => `<div class="db-kpi${t ? " tone-b-" + t : ""}"><span class="k">${k}</span><span class="v">${v}</span><span class="d">${sub}</span>${extra}</div>`;
    const f1 = fDates[0] && FC[fDates[0]];
    const ratio = air && U.isNum(air.pm2_5) ? air.pm2_5 / 15 : NaN;
    const kpis = [
      air ? kpi("PM2.5 آخر يوم مكتمل", `${N(air.pm2_5, 1)}<small>µg/m³</small>`, `تقدير نموذج CAMS${unconfirmed ? " (لم يؤكده الرصد الأرضي)" : gd && gd.dust_hours > 0 ? " · الرصد الأرضي أكّد غباراً" : ""} · ${fD(air.date)} · ${ratio >= 1 ? `${N(ratio, 1)} ضعف حد الصحة العالمية` : "ضمن حد الصحة العالمية (15)"}`, tone(air.pm2_5, 15)) : kpi("PM2.5", "—", "لا بيانات"),
      gn ? kpi("مقاس فعلاً · آخر رصد", `${N(gn.t, 0)}<small>°C</small>`, `${esc(gn.name_ar)} على بعد ${N(gn.dist_km, 0)} كم · ${esc(gn.ago)}${gn.wxText ? " · " + esc(gn.wxText) : gn.vis != null ? " · رؤية " + esc(visKm(gn.vis)) : ""}`, gn.dust ? "warn" : "info",
        `<button type="button" class="linkbtn db-kpi-go" data-tab-go="ground">التفاصيل والمقارنة</button>`) : "",
      dp ? kpi(`احتمال غبار فعلي · ${fD(dp.date)}`, `${N(100 * dp.prob, 0)}<small>%</small>`, `نموذجنا المتعلَّم من الرصد الأرضي${U.isNum(dp.cams_dust) ? ` · CAMS يقدّر ${N(dp.cams_dust, 0)} µg/m³` : ""}`, dustTone(dp.prob),
        `<button type="button" class="linkbtn db-kpi-go" data-tab-go="ground">كيف نحسبه ودقته</button>`) : "",
      f1 && f1.best ? kpi(`توقّع ${fD(fDates[0])}`, `${N(f1.best.value, 1)}<small>µg/m³</small>`, `${esc(MODEL[f1.best.model] || f1.best.model)} · المدى المرجّح ${N(f1.best.lo, 0)}–${N(f1.best.hi, 0)}${f1.cams ? ` · CAMS: ${N(f1.cams.value, 1)}` : ""}`, tone(f1.best.value, 15))
        : f1 && f1.cams ? kpi(`توقّع ${fD(fDates[0])}`, `${N(f1.cams.value, 1)}<small>µg/m³</small>`, "توقّع CAMS (نموذجنا لم يُدرَّب بعد)", tone(f1.cams.value, 15)) : kpi("توقّع الغد", "—", "لا توقّع بعد"),
      y && y.n ? kpi("أيام فوق حد الصحة العالمية", `${N(100 * y.o / y.n, 0)}<small>%</small>`, `${N(y.o, 0)} يوماً من آخر ${N(y.n, 0)} يوماً تجاوز فيها PM2.5 الحد 15`, y.o / y.n > 0.5 ? "bad" : y.o / y.n > 0.2 ? "warn" : "fair") : kpi("أيام فوق الحد", "—", ""),
      riv ? kpi("تصريف دجلة", `${N(riv.discharge, 0)}<small>m³/s</small>`, `${fD(riv.date)} · ${rp && U.isNum(rp.pct) ? (rp.pct < 50 ? `أقل من ${N(100 - rp.pct, 0)}% من أيام ${MONTHS[+riv.date.slice(5, 7) - 1]} منذ ${rp.y0}` : `أعلى من ${N(rp.pct, 0)}% من أيام ${MONTHS[+riv.date.slice(5, 7) - 1]} منذ ${rp.y0}`) : ""}`, rp && rp.pct < 15 ? "warn" : "info") : kpi("تصريف دجلة", "—", "لا بيانات"),
      rs ? kpi("عكورة الماء NDTI", N(rs.ndti, 3), `${fM(rs.month)} · ${rsAvg && rs.ndti > rsAvg.a ? "أعكر" : "أصفى"} من متوسط القضاء (${N(rsAvg.a, 3)})`, rsAvg && rs.ndti > rsAvg.a + 0.03 ? "warn" : "info") : kpi("عكورة الماء NDTI", "—", "لا مشهد صافٍ بعد"),
      reg ? kpi("نمط الهواء", `<span class="db-kpi-t">${esc(reg.l)}</span>`, `${fD(reg.date)} · تصنيف K-Means`, "info") : kpi("نمط الهواء", "—", "")
    ];

    // الخلاصة بلغة بسيطة
    const say = [];
    if (unconfirmed) say.push(`<b>تنبيه:</b> نموذج CAMS يقدّر غباراً وجسيمات عالية في ${fD(air.date)}، لكن محطة ${esc(gd.name_ar)} لم ترصد أي غبار ذلك اليوم وكانت الرؤية ${N(gd.vis_min, 0)} كم فأكثر، فالرقم على الأرجح مبالغ فيه. قياساتنا تبيّن أن CAMS يقدّر غباراً في كثير من الأيام التي لا يُرصد فيها غبار فعلاً.`);
    if (dp) say.push(`احتمال أن يُرصد غبار فعلاً في ${fD(dp.date)}: ${N(100 * dp.prob, 0)}% (${dustWord(dp.prob)}) حسب نموذجنا المتعلَّم من أرصاد المطارات.`);
    if (air) say.push(`في آخر يوم مكتمل (${fD(air.date)}) كان متوسط الجسيمات الدقيقة PM2.5 في ${esc(d.name_ar)} ${NU(air.pm2_5, 1, "µg/m³")}${ratio >= 1 ? `، أي ${N(ratio, 1)} ضعف حد منظمة الصحة العالمية` : "، ضمن حد منظمة الصحة العالمية"}${U.isNum(air.dust) && air.dust > 100 ? `، مع غبار مرتفع (${NU(air.dust, 0, "µg/m³")})` : ""}.`);
    if (y && y.n) say.push(`خلال آخر سنة تجاوز PM2.5 الحد في ${N(100 * y.o / y.n, 0)}% من الأيام، وبلغ أعلاه ${NU(y.mx, 0, "µg/m³")}.`);
    if (f1 && f1.best) say.push(`يتوقّع نموذج ${esc(MODEL[f1.best.model] || f1.best.model)} ليوم ${fD(fDates[0])} قيمة ${N(f1.best.value, 0)} (بين ${N(f1.best.lo, 0)} و${N(f1.best.hi, 0)})${f1.cams ? `، ويتوقّع CAMS ${N(f1.cams.value, 0)}` : ""}.`);
    if (riv && rp) say.push(`تصريف دجلة عند القضاء ${N(riv.discharge, 0)} م³/ثا، ${rp.pct < 50 ? `وهو أقل من المعتاد لهذا الشهر` : `وهو أعلى من المعتاد لهذا الشهر`} (متوسط الشهر منذ ${rp.y0}: ${N(rp.avg, 0)}).`);
    if (wx && U.isNum(wx.t_max_adj)) say.push(`الحرارة العظمى نحو ${N(wx.t_max_adj, 0)}° بعد تصحيح خطأ النموذج بالقياس الأرضي (النموذج وحده: ${N(wx.t_max, 0)}°).`);
    else if (wx && U.isNum(wx.t_max)) say.push(`الحرارة العظمى ${N(wx.t_max, 0)}° حسب نموذج ERA5${U.isNum(wx.wind_max) ? ` وأقوى رياح ${N(wx.wind_max, 0)} كم/ساعة` : ""}.`);
    if (gn) say.push(`آخر قياس حقيقي من ${esc(gn.name_ar)} (${esc(gn.ago)}): ${N(gn.t, 0)}°${gn.wxText ? "، " + esc(gn.wxText) : ""}.`);

    U.$("#db-ov-main").innerHTML = `<div class="db-kpis">${kpis.filter(Boolean).join("")}</div>
      <div class="panel db-say"><h3>${ico("i-spark")}الخلاصة بلغة بسيطة</h3><p>${say.join(" ") || "لا تتوفر بيانات كافية بعد."}</p></div>
      <div class="panel"><div class="panel-h"><h3>PM2.5 في آخر 120 يوماً والتوقّع القادم</h3><span class="sub">µg/m³ · المتوسط اليومي</span></div><div class="chart-box"><canvas id="db-ov-c"></canvas></div>
        <p class="db-cap">${esc(SRC_NOTE.air)}</p></div>
      ${anomBlock(d.id, 4, "آخر الأيام الشاذة")}`;

    // الرسم
    if (air) {
      const hist = q("SELECT date, pm2_5 FROM air_daily WHERE district_id = ? AND date > date(?, '-120 day') ORDER BY date", [d.id, air.date]);
      const labels = hist.map(r => r.date).concat(fDates);
      const pad = a => hist.map(() => null).concat(a);
      chart("overview", U.$("#db-ov-c"), {
        type: "line",
        data: { labels, datasets: [
          { label: "تقدير CAMS (نموذج)", data: hist.map(r => r.pm2_5).concat(fDates.map(() => null)), borderColor: ECO.COL.river, backgroundColor: "rgba(79,200,220,.12)", fill: true, borderWidth: 1.6 },
          { label: "توقّع نموذجنا", data: pad(fDates.map(x => FC[x].best ? FC[x].best.value : null)), borderColor: ECO.COL.chloro, pointRadius: 4, pointBackgroundColor: ECO.COL.chloro, showLine: false },
          { label: "مدى التوقّع 80%", data: pad(fDates.map(x => FC[x].best ? FC[x].best.hi : null)), borderColor: "rgba(147,221,138,.35)", pointRadius: 2, pointStyle: "line", showLine: false },
          { label: " ", data: pad(fDates.map(x => FC[x].best ? FC[x].best.lo : null)), borderColor: "rgba(147,221,138,.35)", pointRadius: 2, pointStyle: "line", showLine: false },
          { label: "توقّع CAMS", data: pad(fDates.map(x => FC[x].cams ? FC[x].cams.value : null)), borderColor: ECO.COL.silt, pointRadius: 4, pointStyle: "rectRot", pointBackgroundColor: ECO.COL.silt, showLine: false },
          limitLine(labels, 15, "حد الصحة العالمية 15")
        ] },
        options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: xTicks }, y: { beginAtZero: true } },
          plugins: { legend: { labels: { filter: i => i.text.trim() } } } }
      });
    }

    // الحقائق
    const nSrc = q1("SELECT COUNT(*) n FROM pollution_sources WHERE district_id = ?", [d.id]).n;
    const nSt = q1("SELECT COUNT(*) n FROM study_districts WHERE district_id = ?", [d.id]).n;
    const ranges = q1(`SELECT (SELECT MIN(date) FROM air_daily WHERE district_id = :d) a0, (SELECT MIN(date) FROM weather_daily WHERE district_id = :d) w0,
      (SELECT MIN(date) FROM river_daily WHERE district_id = :d) r0, (SELECT COUNT(*) FROM water_rs_monthly WHERE district_id = :d AND ndti IS NOT NULL) rsn`, { ":d": d.id });
    U.$("#db-ov-facts").innerHTML = `<div class="panel-h"><h3>بطاقة ${esc(d.name_ar)}</h3><span class="sub">${esc(d.name_en)}</span></div>
      <dl class="kv">
        <dt>مركز القضاء</dt><dd>${LTR(d.lat.toFixed(4) + ", " + d.lon.toFixed(4))}</dd>
        <dt>أقرب نقطة على دجلة</dt><dd>${d.river_lat != null ? `${LTR(d.river_lat.toFixed(4) + ", " + d.river_lon.toFixed(4))} · ${N(d.river_dist_km, 1)} كم` : "—"}</dd>
        <dt>خلية تصريف GloFAS</dt><dd>${d.glofas_lat != null ? LTR(d.glofas_lat.toFixed(3) + ", " + d.glofas_lon.toFixed(3)) : "—"}</dd>
        <dt>السجل</dt><dd>هواء منذ ${fD(ranges.a0)} · طقس منذ ${fD(ranges.w0)} · تصريف منذ ${fD(ranges.r0)} · ${N(ranges.rsn, 0)} شهراً من Sentinel-2</dd>
        <dt>مصادر تلوث مرسومة</dt><dd>${N(nSrc, 0)} <button type="button" class="linkbtn" data-tab-go="studies">عرض القائمة</button></dd>
        <dt>بحوث الجامعة</dt><dd>${N(nSt, 0)} ${nSt ? `<button type="button" class="linkbtn" data-tab-go="studies">عرض البحوث</button>` : ""}</dd>
      </dl>`;
    drawMap(d);
  }

  function anomBlock(did, limit, title) {
    const rows = q(`SELECT an.*, a.pm2_5, a.pm10, a.dust, a.no2, a.so2, a.o3, a.co FROM anomalies an LEFT JOIN air_daily a ON a.district_id = an.district_id AND a.date = an.date
      WHERE an.district_id = ? ORDER BY an.date DESC LIMIT ?`, [did, limit]);
    if (!rows.length) return "";
    const col = { pm2_5: "pm2_5", pm10: "pm10", dust: "dust", no2: "no2", so2: "so2", o3: "o3", co: "co" };
    return `<div class="panel"><div class="panel-h"><h3>${title}</h3><span class="sub">Isolation Forest</span></div><div class="anom-list">${rows.map(r =>
      `<div class="anom"><span class="z">${r.top_z > 0 ? "+" : ""}${U.fmt(r.top_z, 1)}σ</span><div><b>${fD(r.date)}</b><br><span class="muted">أبعد معيار عن المعتاد: ${esc(PNAME[r.top_param] || r.top_param)} = ${NU(r[col[r.top_param]], 1, "µg/m³")} (${r.top_z > 0 ? "أعلى" : "أقل"} من الوسيط بـ ${U.fmt(Math.abs(r.top_z), 1)} انحراف قوي)</span></div></div>`).join("")}</div></div>`;
  }

  async function drawMap(d) {
    if (!window.L) return;
    const box = U.$("#db-map");
    if (!S.map) {
      S.map = L.map(box, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      const b = ECO.BASEMAPS.find(x => x.id === "esri") || ECO.BASEMAPS[0];
      L.tileLayer(b.url, { maxNativeZoom: b.max, maxZoom: 18, attribution: b.attr, crossOrigin: true }).addTo(S.map);
      if (U.labelLayers) { const lab = U.labelLayers(); if (lab) lab.addTo(S.map); }
      S.mapG = L.layerGroup().addTo(S.map);
      S.riverG = L.layerGroup().addTo(S.map);
    }
    S.mapG.clearLayers();
    const src = q("SELECT * FROM pollution_sources WHERE district_id = ? AND lat IS NOT NULL", [d.id]);
    src.forEach(s => {
      const k = KIND[s.kind] || [s.kind, "#c4d3cf"];
      L.circleMarker([s.lat, s.lon], { radius: 5, color: "#041114", weight: 1, fillColor: k[1], fillOpacity: 0.95 })
        .bindTooltip(`${esc(k[0])}${s.name ? " · " + esc(s.name) : ""}${U.isNum(s.dist_river_km) ? ` · ${U.fmt(s.dist_river_km, 1)} كم عن النهر` : ""}`).addTo(S.mapG);
    });
    L.circleMarker([d.lat, d.lon], { radius: 8, color: "#fff", weight: 2, fillColor: DCOL[d.id] || ECO.COL.river, fillOpacity: 1 }).bindTooltip("مركز " + esc(d.name_ar), { permanent: true, direction: "top", className: "db-tip" }).addTo(S.mapG);
    if (d.river_lat != null) L.circleMarker([d.river_lat, d.river_lon], { radius: 5, color: ECO.COL.river, weight: 2, fillColor: "#041114", fillOpacity: 1 }).bindTooltip("نقطة النهر المعتمدة للقضاء").addTo(S.mapG);
    const pts = [[d.lat, d.lon]].concat(d.river_lat != null ? [[d.river_lat, d.river_lon]] : []);
    S.map.fitBounds(L.latLngBounds(pts).pad(0.5), { maxZoom: 12 });
    if (S.map.getZoom() > 12) S.map.setZoom(12);
    if (S.map.getZoom() < 10) S.map.setView([d.lat, d.lon], 11);
    const kinds = {}; src.forEach(s => { kinds[s.kind] = (kinds[s.kind] || 0) + 1; });
    U.$("#db-map-leg").innerHTML = Object.keys(kinds).length ? Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, c]) => `<span><i style="background:${(KIND[k] || [0, "#c4d3cf"])[1]}"></i>${esc((KIND[k] || [k])[0])} ${N(c, 0)}</span>`).join("")
      : `<span class="muted">لا توجد مصادر تلوث مرسومة في OpenStreetMap ضمن 30 كم.</span>`;
    setTimeout(() => S.map.invalidateSize(), 60);
    if (!S.tigris) {
      try {
        const c = await openCache(), key = RAW + "tigris.json";
        let r = c && await c.match(key);
        if (!r) { r = await fetch(key); if (r.ok && c) c.put(key, r.clone()); }
        if (r && r.ok !== false) S.tigris = await r.json();
      } catch (e) { S.tigris = []; }
      if (S.tigris && S.tigris.length) S.tigris.forEach(ln => L.polyline(ln, { color: ECO.COL.river, weight: 3, opacity: 0.85 }).addTo(S.riverG));
    }
  }


  /* ------------------------------------------------------------------
     1ب) المقاس فعلاً: أرصاد المطارات الحقيقية مقابل النماذج
  ------------------------------------------------------------------ */
  const dustWord = p => p >= 0.4 ? "مرجّح جداً" : p >= 0.2 ? "مرجّح" : p >= 0.1 ? "ممكن" : "ضعيف";
  const dustTone = p => p >= 0.4 ? "bad" : p >= 0.2 ? "warn" : p >= 0.1 ? "fair" : "good";
  const visKm = v => !U.isNum(v) ? "—" : v >= 10 ? "10 كم فأكثر" : `${U.fmt(v, v < 1 ? 1 : 0)} كم`;
  const SNAME = id => (q1("SELECT name_ar FROM stations WHERE id = ?", [id]) || {}).name_ar || id;
  function agoText(ms) {
    const m = Math.round((Date.now() - ms) / 60000);
    return m < 1 ? "الآن" : m < 60 ? `قبل ${m} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم`;
  }
  /* آخر رصد لأقرب محطة تبث: من القاعدة، ثم يُستبدل بالرصد الحي إن كان أحدث */
  function groundNow(d) {
    const st = q1("SELECT s.*, ds.dist_km FROM district_stations ds JOIN stations s ON s.id = ds.station_id WHERE ds.district_id = ? AND ds.role = 'now'", [d.id]);
    if (!st) return null;
    const h = q1("SELECT * FROM station_hourly WHERE station_id = ? AND t IS NOT NULL ORDER BY valid DESC LIMIT 1", [st.id]);
    let o = h ? { t: h.t, rh: h.rh, wind: h.wind, vis: h.vis, ms: Date.parse(h.valid.replace(" ", "T") + ":00+03:00"), raw: h.metar, wx: h.wx } : null;
    const G = ECO.ground, live = G && G.state === "ok" && (G.stations || []).find(x => x.id === st.icao);
    if (live && live.last && (!o || live.last.time * 1000 > o.ms) && U.isNum(live.last.temp)) {
      const L = live.last;
      o = { t: L.temp, rh: null, wind: L.wind ? L.wind.kmh : null, vis: U.isNum(L.vis) ? L.vis / 1000 : null, ms: L.time * 1000, raw: L.raw, live: true };
    }
    if (!o) return null;
    const P = o.raw && G && G.parse ? G.parse(o.raw) : null;
    return Object.assign(o, { id: st.id, icao: st.icao, name_ar: st.name_ar, dist_km: st.dist_km, ago: agoText(o.ms),
      wxText: P && P.wxText && P.wxText.length ? P.wxText.join("، ") : "", dust: !!(P && P.dust) });
  }

  function rGround(el) {
    clearCharts("ground");
    const d = dist();
    if (!S.ground) {
      el.innerHTML = `<div class="notice info">${ico("i-info")}<span>القياسات الأرضية الحقيقية أضيفت حديثاً، وتظهر هنا بعد تحديث القاعدة القادم (يتم يومياً آلياً).</span></div>`;
      return;
    }
    const now = q1("SELECT s.*, ds.dist_km FROM district_stations ds JOIN stations s ON s.id = ds.station_id WHERE ds.district_id = ? AND ds.role = 'now'", [d.id]);
    const cal = q1("SELECT s.*, ds.dist_km FROM district_stations ds JOIN stations s ON s.id = ds.station_id WHERE ds.district_id = ? AND ds.role = 'calib'", [d.id]);
    el.innerHTML = `
      <div class="notice info">${ico("i-info")}<span>كل الأرقام في هذا القسم <b>قياسات أجهزة حقيقية</b> من محطات الأرصاد الرسمية في المطارات (تقارير METAR)، وليست نموذجاً. لا توجد اليوم محطة رسمية تبث من داخل ${esc(d.name_ar)}، فنعرض أقرب محطة تبث، ونستعمل أرشيف المحطات التي كانت داخل الأقضية لمعرفة خطأ النموذج وتصحيحه.</span></div>
      <div class="grid g-2 db-g2">
        <div class="panel" id="db-g-now"></div>
        <div class="panel" id="db-g-adj"></div>
      </div>
      <div class="panel"><div class="panel-h"><h3 id="db-g-st-h"></h3><span class="sub">نفس المكان ونفس الأيام · °C</span></div><div class="chart-box"><canvas id="db-g-st"></canvas></div><p class="db-cap" id="db-g-st-cap"></p></div>
      <div class="grid g-2 db-g2">
        <div class="panel"><div class="panel-h"><h3 id="db-g-bias-h"></h3><span class="sub">المقاس − النموذج · °C</span></div><div class="chart-box sm"><canvas id="db-g-bias"></canvas></div><p class="db-cap" id="db-g-bias-cap"></p></div>
        <div class="panel" id="db-g-dm"></div>
        <div class="panel"><div class="panel-h"><h3 id="db-g-dust-h"></h3><span class="sub">أيام في الشهر</span></div><div class="chart-box sm"><canvas id="db-g-dust"></canvas></div><p class="db-cap" id="db-g-dust-cap"></p></div>
      </div>
      <div class="panel"><div class="panel-h"><h3>محطات القياس المستعملة</h3><span class="sub">أرشيف Iowa Environmental Mesonet لتقارير METAR</span></div><div id="db-g-list"></div></div>`;

    // 1) الآن
    const paintNow = () => {
      const g = groundNow(d), box = U.$("#db-g-now"); if (!box) return;
      box.innerHTML = !g ? `<div class="panel-h"><h3>المقاس الآن</h3></div><p class="empty">لا يوجد رصد حديث.</p>` : `
        <div class="panel-h"><h3>المقاس الآن في ${esc(g.name_ar)}</h3><span class="sub">${g.live ? "رصد حي" : "من آخر تحديث للقاعدة"} · ${esc(g.ago)}</span></div>
        <div class="db-gnow">
          <div><span class="k">الحرارة</span><b>${NU(g.t, 0, "°C")}</b></div>
          ${U.isNum(g.rh) ? `<div><span class="k">الرطوبة</span><b>${NU(g.rh, 0, "%")}</b></div>` : ""}
          <div><span class="k">الرياح</span><b>${U.isNum(g.wind) ? NU(g.wind, 0, "km/h") : "—"}</b></div>
          <div><span class="k">مدى الرؤية</span><b>${esc(visKm(g.vis))}</b></div>
        </div>
        <p class="db-cap">${g.wxText ? `<b>الظواهر:</b> ${esc(g.wxText)}. ` : "لا ظواهر جوية مسجلة (لا غبار ولا مطر). "}المحطة على بعد ${N(g.dist_km, 0)} كم من مركز ${esc(d.name_ar)}.${g.raw ? `<br><bdi dir="ltr" class="db-metar">${esc(g.raw)}</bdi>` : ""}</p>`;
    };
    paintNow();
    if (ECO.ground && ECO.ground.load) ECO.ground.load().then(paintNow).catch(() => {});

    // 2) الحرارة المصححة للقضاء
    const adj = q(`SELECT date, src, t_max, t_min, t_max_adj, t_min_adj, t_max_bias FROM v_weather_corrected WHERE district_id = ? AND date >= ? ORDER BY date LIMIT 4`, [d.id, today()]);
    U.$("#db-g-adj").innerHTML = `<div class="panel-h"><h3>حرارة ${esc(d.name_ar)} بعد التصحيح</h3><span class="sub">${cal ? `محطة التصحيح: ${esc(cal.name_ar)} (${N(cal.dist_km, 0)} كم)` : ""}</span></div>
      ${adj.length && adj.some(r => U.isNum(r.t_max_adj)) ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>اليوم</th><th class="num">النموذج</th><th class="num">بعد التصحيح</th></tr></thead><tbody>
        ${adj.map(r => `<tr><td>${fD(r.date).replace(/\s*\d{4}$/, "")}</td><td class="num">${U.fmt(r.t_max, 0)}° / ${U.fmt(r.t_min, 0)}°</td><td class="num"><b>${U.fmt(r.t_max_adj, 0)}° / ${U.fmt(r.t_min_adj, 0)}°</b></td></tr>`).join("")}</tbody></table></div>
        <p class="db-cap">التصحيح = متوسط فرق القياس الحقيقي عن نموذج ERA5 في هذا الشهر من السنة، محسوب في ${cal ? esc(cal.name_ar) : "محطة التصحيح"} على ${N((q1("SELECT n FROM station_bias WHERE station_id = ? AND var = 't_max' AND month = ?", [cal && cal.id, +today().slice(5, 7)]) || {}).n, 0)} يوماً متطابقاً.</p>`
        : `<p class="empty">لا يتوفر تصحيح لهذا الشهر بعد.</p>`}`;

    // 3) المقاس مقابل ERA5 عند محطة القياس نفسها
    const vs = now ? q("SELECT date, t_max, era5_t_max, t_min, era5_t_min FROM station_daily WHERE station_id = ? AND t_max IS NOT NULL AND date > date((SELECT MAX(date) FROM station_daily WHERE station_id = ?), '-180 day') ORDER BY date", [now.id, now.id]) : [];
    U.$("#db-g-st-h").textContent = now ? `${now.name_ar}: الحرارة العظمى المقاسة مقابل نموذج ERA5 (آخر 6 أشهر)` : "المقاس مقابل النموذج";
    if (vs.length) {
      const pr = vs.filter(r => U.isNum(r.era5_t_max));
      const mae = pr.length ? U.mean(pr.map(r => Math.abs(r.t_max - r.era5_t_max))) : NaN, bias = pr.length ? U.mean(pr.map(r => r.t_max - r.era5_t_max)) : NaN;
      chart("ground", U.$("#db-g-st"), { type: "line", data: { labels: vs.map(r => r.date), datasets: [
        { label: "المقاس فعلاً (العظمى)", data: vs.map(r => r.t_max), borderColor: ECO.COL.crimson, borderWidth: 1.8, pointRadius: 0 },
        { label: "نموذج ERA5 (العظمى)", data: vs.map(r => r.era5_t_max), borderColor: ECO.COL.river, borderDash: [5, 4], borderWidth: 1.4, pointRadius: 0 },
        { label: "المقاس فعلاً (الصغرى)", data: vs.map(r => r.t_min), borderColor: "#e6ae4f", borderWidth: 1.2, pointRadius: 0 },
        { label: "نموذج ERA5 (الصغرى)", data: vs.map(r => r.era5_t_min), borderColor: "#a5b6ff", borderDash: [5, 4], borderWidth: 1.2, pointRadius: 0 }] },
        options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: xTicks } } } });
      U.$("#db-g-st-cap").innerHTML = pr.length ? `على ${N(pr.length, 0)} يوماً: متوسط الخطأ المطلق للعظمى ${NU(mae, 1, "°C")}، و${bias > 0 ? `النموذج <b>أبرد</b> من الواقع بـ ${NU(bias, 1, "°C")} في المتوسط` : `النموذج <b>أحرّ</b> من الواقع بـ ${NU(-bias, 1, "°C")} في المتوسط`}. أرشيف ERA5 يتأخر نحو 5 أيام فتنقص الأيام الأخيرة من خطه.` : "";
    }

    // 4) خطأ النموذج شهرياً في محطة التصحيح
    if (cal) {
      const B = q("SELECT var, month, n, bias, mae FROM station_bias WHERE station_id = ? AND var IN ('t_max','t_min') ORDER BY month", [cal.id]);
      const bx = {}, bn = {}; B.forEach(r => { (r.var === "t_max" ? bx : bn)[r.month] = r; });
      U.$("#db-g-bias-h").textContent = `خطأ نموذج ERA5 في ${cal.name_ar} لكل شهر`;
      chart("ground", U.$("#db-g-bias"), { type: "bar", data: { labels: MONTHS, datasets: [
        { label: "العظمى", data: MONTHS.map((_, i) => bx[i + 1] ? bx[i + 1].bias : null), backgroundColor: "rgba(239,90,100,.75)", borderRadius: 3 },
        { label: "الصغرى", data: MONTHS.map((_, i) => bn[i + 1] ? bn[i + 1].bias : null), backgroundColor: "rgba(165,182,255,.75)", borderRadius: 3 }] },
        options: { scales: { x: { ticks: { maxRotation: 60, minRotation: 45, font: { size: 10 } } } } } });
      const worst = Object.values(bx).sort((a, b) => Math.abs(b.bias) - Math.abs(a.bias))[0];
      const nd = q1("SELECT COUNT(*) n, MIN(date) a, MAX(date) b FROM station_daily WHERE station_id = ? AND t_max IS NOT NULL AND era5_t_max IS NOT NULL", [cal.id]);
      U.$("#db-g-bias-cap").innerHTML = `${worst ? `أكبر خطأ في ${MONTHS[worst.month - 1]}: القياس الحقيقي ${worst.bias > 0 ? "أعلى" : "أقل"} من النموذج بـ ${NU(Math.abs(worst.bias), 1, "°C")} للعظمى. ` : ""}العمود فوق الصفر يعني أن النموذج أبرد من الواقع. محسوب على ${N(nd.n, 0)} يوماً من قياسات ${esc(cal.name_ar)} (${nd.a ? nd.a.slice(0, 4) : ""}–${nd.b ? nd.b.slice(0, 4) : ""}) مقابل ERA5 في الأيام نفسها.`;
    }

    // 5) هل يرى نموذج CAMS الغبار الذي رُصد فعلاً؟
    if (now) {
      const rows = q("SELECT substr(date,1,7) m, SUM(dust_hours > 0) obs, SUM(cams_dust >= 100) cams, SUM(dust_hours > 0 AND cams_dust >= 100) hit, SUM(dust_hours > 0 AND cams_dust IS NOT NULL) obsN, SUM(cams_dust >= 100 AND dust_hours = 0) fa FROM station_daily WHERE station_id = ? AND cams_dust IS NOT NULL GROUP BY m ORDER BY m DESC LIMIT 24", [now.id]).reverse();
      U.$("#db-g-dust-h").textContent = `الغبار في ${now.name_ar}: المرصود فعلاً مقابل نموذج CAMS`;
      if (rows.length) {
        chart("ground", U.$("#db-g-dust"), { type: "bar", data: { labels: rows.map(r => fM(r.m)), datasets: [
          { label: "أيام رُصد فيها غبار فعلاً", data: rows.map(r => r.obs), backgroundColor: "rgba(230,174,79,.85)", borderRadius: 3 },
          { label: "أيام قدّر فيها CAMS غباراً ≥ 100", data: rows.map(r => r.cams), backgroundColor: "rgba(79,200,220,.6)", borderRadius: 3 }] },
          options: { scales: { x: { ticks: { maxRotation: 60, minRotation: 45, font: { size: 10 } } } } } });
        const T = q1("SELECT SUM(dust_hours > 0) obs, SUM(dust_hours > 0 AND cams_dust >= 100) hit, SUM(cams_dust >= 100) cams, SUM(cams_dust >= 100 AND dust_hours = 0) fa, COUNT(*) n FROM station_daily WHERE station_id = ? AND cams_dust IS NOT NULL AND dust_hours IS NOT NULL", [now.id]);
        U.$("#db-g-dust-cap").innerHTML = T && T.obs ? `منذ آب 2022: رصدت المحطة غباراً أو رمالاً في ${N(T.obs, 0)} يوماً من ${N(T.n, 0)}. قدّر النموذج غباراً عالياً في ${N(100 * T.hit / T.obs, 0)}% من هذه الأيام، وقدّره في ${N(T.fa, 0)} يوماً لم يُرصد فيها غبار. هذا يبيّن لماذا نعامل أرقام غبار CAMS كتقدير لا كقياس.` : "";
      }
    }

    // 5ب) نموذجنا للغبار مقابل CAMS
    if (S.dustM) {
      const E = {}; q("SELECT * FROM dust_eval").forEach(r => { E[r.model] = r; });
      const P = q("SELECT date, prob, cams_dust, obs_dust, kind FROM dust_prob WHERE district_id = ? ORDER BY date DESC LIMIT 120", [d.id]).reverse();
      const L = E.logistic, C = E.cams_100, Pe = E.persistence;
      const row = (name, r) => r ? `<tr><td>${name}</td><td class="num">${U.fmt(100 * r.pod, 0)}%</td><td class="num">${U.fmt(100 * r.far, 0)}%</td><td class="num"><b>${U.fmt(r.csi, 2)}</b></td><td class="num">${U.fmt(r.auc, 2)}</td></tr>` : "";
      U.$("#db-g-dm").innerHTML = `<div class="panel-h"><h3>احتمال الغبار الفعلي في ${esc(d.name_ar)}</h3><span class="sub">انحدار لوجستي متعلَّم من أيام الغبار المرصودة في المطارات</span></div>
        <div class="chart-box sm"><canvas id="db-g-dm-c"></canvas></div>
        ${L ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الطريقة</th><th class="num">كشف</th><th class="num">إنذار كاذب</th><th class="num">CSI</th><th class="num">AUC</th></tr></thead><tbody>
          ${row("نموذجنا", L)}${row("CAMS (غبار ≥ 100)", C)}${row("اليوم مثل أمس", Pe)}</tbody></table></div>
        <p class="db-cap">اختُبر على سنة لم يرها النموذج (${fD(L.test_from)} ← ${fD(L.test_to)}، ${N(L.n_test, 0)} يوماً فيها ${N(L.n_events, 0)} يوم غبار مرصود في بغداد وأربيل وكركوك). CSI مؤشر النجاح: 1 مثالي و0 فاشل. «كشف» = نسبة أيام الغبار الحقيقية التي نبّه عليها، و«إنذار كاذب» = نسبة تنبيهاته التي لم يُرصد فيها غبار. التوقع ليوم واحد صعب في كل العالم، والرقم المهم أن نموذجنا ${L.csi > (C ? C.csi : 0) ? `أدق من CAMS بنحو ${N(L.csi / Math.max(0.01, C.csi), 1)} مرة` : "لم يتفوق على CAMS بعد"}. يُطبَّق على ${esc(d.name_ar)} بقيم CAMS والطقس عند القضاء وبرصد أقرب محطة لليوم السابق.</p>` : ""}`;
      if (P.length) chart("ground", U.$("#db-g-dm-c"), { type: "line", data: { labels: P.map(r => r.date), datasets: [
        { label: "احتمال الغبار (نموذجنا) %", data: P.map(r => 100 * r.prob), borderColor: ECO.COL.silt, backgroundColor: "rgba(230,174,79,.15)", fill: true, borderWidth: 1.6, pointRadius: P.map(r => r.kind === "forecast" ? 4 : 0), yAxisID: "y" },
        { type: "bar", label: "رُصد غبار فعلاً في أقرب محطة", data: P.map(r => r.obs_dust === 1 ? 100 : null), backgroundColor: "rgba(239,90,100,.55)", barPercentage: 1, categoryPercentage: 1, yAxisID: "y" },
        { label: "غبار CAMS µg/m³", data: P.map(r => r.cams_dust), borderColor: "rgba(79,200,220,.6)", borderWidth: 1, pointRadius: 0, yAxisID: "y2" }] },
        options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: xTicks }, y: { position: "right", min: 0, max: 100, title: { display: true, text: "%" } }, y2: { position: "left", grid: { display: false }, beginAtZero: true } } } });
    }

    // 6) قائمة المحطات
    const L = q(`SELECT s.*, (SELECT COUNT(*) FROM station_daily x WHERE x.station_id = s.id) n,
      (SELECT dist_km FROM district_stations WHERE district_id = :d AND station_id = s.id LIMIT 1) dk FROM stations s ORDER BY s.kind, s.id`, { ":d": d.id });
    U.$("#db-g-list").innerHTML = `<ul class="db-st-list">${L.map(s => `<li><b>${esc(s.name_ar)}</b> <small class="muted">${LTR(s.icao || "")}</small>
        <span>${s.kind === "current" ? `<em class="db-live">تبث الآن</em>` : "أرشيف منتهٍ"} · ${U.fmt(km(d.lat, d.lon, s.lat, s.lon), 0)} كم عن ${esc(d.name_ar)} · ${s.first_date ? `${s.first_date.slice(0, 4)}–${s.last_date.slice(0, 4)}` : "—"} (${U.fmt(s.n, 0)} يوماً)</span></li>`).join("")}</ul>
      <p class="db-cap">${esc(SNAME(now ? now.id : ""))} هي أقرب محطة تبث إلى ${esc(d.name_ar)}. المحطات المؤرشفة داخل الأقضية (تكريت وبيجي وبلد) توقفت عن النشر العام، لكن سجلها الحقيقي يكشف خطأ النموذج في المكان نفسه.</p>`;
  }


  /* ------------------------------------------------------------------
     خطة أخذ العينات: مواقع حقيقية على مجرى دجلة حول مصادر التلوث المرسومة،
     ومواسم من سجل التصريف والحرارة، وعدد المكررات من معامل الاختلاف
  ------------------------------------------------------------------ */
  async function getTigris() {
    if (S.tigris) return S.tigris;
    try {
      const c = await openCache(), key = RAW + "tigris.json";
      let r = c && await c.match(key);
      if (!r) { r = await fetch(key); if (r.ok && c) c.put(key, r.clone()); }
      S.tigris = r && r.ok !== false ? await r.json() : [];
    } catch (e) { S.tigris = []; }
    return S.tigris;
  }
  function nearestOnRiver(lines, lat, lon) {
    let best = null;
    lines.forEach((ln, li) => ln.forEach((p, i) => { const dk = km(lat, lon, p[0], p[1]); if (!best || dk < best.dk) best = { li, i, dk }; }));
    return best;
  }
  /* السير على المجرى: dir = +1 مع التيار (نحو الجنوب في صلاح الدين)، −1 عكسه */
  function walk(ln, i, dir, dist) {
    const span = Math.min(30, ln.length - 1), a = ln[Math.max(0, i - span)], b = ln[Math.min(ln.length - 1, i + span)];
    const down = b[0] < a[0] ? 1 : -1;               // أي اتجاه في ترتيب النقاط يذهب جنوباً
    const step = dir * down; let acc = 0, j = i;
    while (acc < dist) { const k = j + step; if (k < 0 || k >= ln.length) break; acc += km(ln[j][0], ln[j][1], ln[k][0], ln[k][1]); j = k; }
    return { p: ln[j], ok: acc >= dist * 0.8 };
  }
  function tInv975(df) { let lo = 0, hi = 50; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; (ECO.stats.pT2(m, df) > 0.05 ? (lo = m) : (hi = m)); } return (lo + hi) / 2; }
  function replicates(cv, e) {
    if (!(cv > 0 && e > 0)) return null;
    let n = Math.max(2, Math.ceil((1.96 * cv / e) ** 2));
    for (let it = 0; it < 20; it++) { const m = Math.max(2, Math.ceil((tInv975(n - 1) * cv / e) ** 2)); if (m === n) break; n = m; }
    return n;
  }
  const PRIO = { refinery: 1, wastewater: 2, oil_facility: 3, power_plant: 4, landfill: 5, industrial: 6, works: 7, oil_storage: 8, quarry: 9, oil_well: 10 };

  async function rPlan(el) {
    const d = dist();
    el.innerHTML = `<p class="muted">جارٍ تحميل مجرى النهر…</p>`;
    const lines = (await getTigris()) || [];
    if (dist().id !== d.id) return;
    // مصادر قريبة من النهر
    const src = q("SELECT * FROM pollution_sources WHERE district_id = ? AND lat IS NOT NULL AND dist_river_km IS NOT NULL AND dist_river_km <= 3 ORDER BY dist_river_km", [d.id])
      .sort((a, b) => (PRIO[a.kind] || 20) - (PRIO[b.kind] || 20) || a.dist_river_km - b.dist_river_km)
      .filter((x, i, arr) => !arr.slice(0, i).some(y => (x.name && y.name === x.name) || km(x.lat, x.lon, y.lat, y.lon) < 1)).slice(0, 3);
    const pts = [];
    const add = (p, kind, why) => { if (!p) return; const x = pts.find(x => km(x.lat, x.lon, p[0], p[1]) < 0.8); if (x) { if (x.n < 2) { x.why += "؛ " + why; x.n++; } return; } pts.push({ lat: +p[0].toFixed(5), lon: +p[1].toFixed(5), kind, why, n: 1 }); };
    const anchor = d.river_lat != null ? nearestOnRiver(lines, d.river_lat, d.river_lon) : null;
    const proj = src.map(s => ({ s, n: nearestOnRiver(lines, s.lat, s.lon) })).filter(x => x.n && x.n.dk < 4);
    if (lines.length && anchor) {
      const ln = lines[anchor.li];
      const onLine = proj.filter(x => x.n.li === anchor.li);
      // ترتيب المصادر مع التيار: الأبعد شمالاً أولاً
      onLine.sort((a, b) => ln[b.n.i][0] - ln[a.n.i][0]);
      const top = onLine.length ? onLine[0].n.i : anchor.i, bottom = onLine.length ? onLine[onLine.length - 1].n.i : anchor.i;
      const ref = walk(ln, top, -1, 5); add(ref.p, "ref", "موقع مرجعي قبل كل المصادر (5 كم عكس التيار)");
      onLine.forEach(({ s }) => { const k = (KIND[s.kind] || [s.kind])[0], nm = s.name ? ` «${s.name}»` : "", i = nearestOnRiver([ln], s.lat, s.lon).i;
        add(walk(ln, i, -1, 0.5).p, "up", `قبل ${k}${nm} بـ 500 م`); add(walk(ln, i, 1, 1).p, "down", `بعد ${k}${nm} بـ 1 كم (نقطة التأثير)`); });
      if (onLine.length) add(walk(ln, bottom, 1, 3).p, "mix", "بعد آخر مصدر بـ 3 كم (منطقة الاختلاط)");
      add(ln[anchor.i], "city", `عند مدينة ${d.name_ar}`);
      const end = walk(ln, bottom, 1, 5); add(end.p, "end", "نهاية القطاع (5 كم بعد آخر مصدر)");
    }
    pts.forEach((p, i) => { p.id = `${d.id.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, "0")}`; });
    // المواسم من السجل الحقيقي
    const qc = q("SELECT CAST(substr(date,6,2) AS INTEGER) m, AVG(discharge) v FROM river_daily WHERE district_id = ? GROUP BY m", [d.id]);
    const tc = q("SELECT CAST(substr(date,6,2) AS INTEGER) m, AVG(t_max) v FROM weather_daily WHERE district_id = ? AND src = 'era5' GROUP BY m", [d.id]);
    const hiQ = qc.slice().sort((a, b) => b.v - a.v)[0], loQ = qc.slice().sort((a, b) => a.v - b.v)[0], hot = tc.slice().sort((a, b) => b.v - a.v)[0], cold = tc.slice().sort((a, b) => a.v - b.v)[0];
    const occ = [hiQ && [hiQ.m, `أعلى تصريف (${N(hiQ.v, 0)} م³/ثا): تخفيف أعلى وعكورة من الجريان`], loQ && [loQ.m, `أدنى تصريف (${N(loQ.v, 0)} م³/ثا): أسوأ حالة لتركيز الملوثات`], hot && [hot.m, `أحر شهر (عظمى ${N(hot.v, 0)}°): أعلى نشاط بكتيري وطحلبي وأقل أكسجين`], cold && [cold.m, `أبرد شهر (عظمى ${N(cold.v, 0)}°)`]].filter(Boolean);
    const occU = []; occ.forEach(o => { const x = occU.find(y => y[0] === o[0]); if (x) x[1] += "؛ " + o[1]; else occU.push(o.slice()); });
    // معاملات الاختلاف من البحوث المنشورة للقضاء
    const cvs = q(`SELECT v.item, v.unit, GROUP_CONCAT(v.value) vals, s.title FROM study_values v JOIN studies s ON s.id = v.study_id JOIN study_districts sd ON sd.study_id = s.id
      WHERE sd.district_id = ? AND v.stat = 'value' GROUP BY v.study_id, v.item HAVING COUNT(*) >= 3`, [d.id]).map(r => { const v = r.vals.split(",").map(Number).filter(U.isNum); const m = U.mean(v), sd = U.std(v); return { item: r.item, cv: m > 0 ? 100 * sd / m : NaN, n: v.length, title: r.title }; }).filter(r => U.isNum(r.cv) && r.cv > 0).slice(0, 30);
    S.plan = { d, pts, occU };
    el.innerHTML = `<div class="notice info">${ico("i-info")}<span>خطة مقترحة لأخذ عينات مياه دجلة في ${esc(d.name_ar)}، مبنية على بيانات حقيقية: مجرى النهر من OpenStreetMap، ومصادر التلوث المرسومة ضمن 3 كم من النهر، ومواسم التصريف والحرارة من سجل القاعدة، وتباين القياسات المنشورة. راجعها مع مشرفك وتأكد من إمكانية الوصول والأمان في الموقع.</span></div>
      <div class="grid g-2 db-g2">
        <div class="panel"><div class="panel-h"><h3>مواقع أخذ العينات (${N(pts.length, 0)})</h3><div class="row"><button type="button" class="btn btn-ghost btn-sm" data-plan="csv">${ico("i-down")}CSV</button><button type="button" class="btn btn-ghost btn-sm" data-plan="gpx">${ico("i-gps")}GPX للهاتف</button></div></div>
          <div class="db-map" id="db-plan-map" role="img" aria-label="خريطة مواقع العينات المقترحة"></div>
          <ol class="db-plan-list">${pts.map(p => `<li><b>${p.id}</b> <span class="db-plan-k k-${p.kind}"></span>${esc(p.why)} <small class="muted">${LTR(p.lat + ", " + p.lon)}</small></li>`).join("") || `<li class="muted">لا يتوفر مجرى النهر لهذا القضاء.</li>`}</ol>
          ${!proj.length ? `<p class="db-cap">لا توجد مصادر تلوث مرسومة ضمن 3 كم من النهر في ${esc(d.name_ar)}، فاقتُرح موقع مرجعي وموقع المدينة ونهاية القطاع فقط.</p>` : ""}</div>
        <div>
          <div class="panel"><div class="panel-h"><h3>متى تأخذ العينات</h3><span class="sub">من سجل القضاء</span></div>
            <ul class="db-plan-occ">${occU.map(o => `<li><b>${MONTHS[o[0] - 1]}</b>: ${o[1]}</li>`).join("")}</ul>
            <p class="db-cap">${N(occU.length, 0)} مواعيد تغطي التباين الموسمي الحقيقي في القضاء، وتسمح بتحليل التباين حسب الموسم.</p></div>
          <div class="panel"><div class="panel-h"><h3>كم مكرراً في كل موقع</h3></div>
            <div class="db-ctrl">
              <div class="field"><label for="db-plan-cv">معامل الاختلاف CV%</label><select id="db-plan-cv" class="input">
                <option value="30">افتراضي 30%</option>${cvs.map(c => `<option value="${c.cv.toFixed(1)}">${esc(c.item)}: ${U.fmt(c.cv, 0)}% (بحث منشور، ${c.n} قيم)</option>`).join("")}<option value="custom">قيمة من تجربتك…</option></select></div>
              <div class="field" id="db-plan-cvc-f" hidden><label for="db-plan-cvc">CV% من تجربتك</label><input id="db-plan-cvc" class="input" type="number" min="1" step="1" value="25"></div>
              <div class="field"><label for="db-plan-e">الدقة المطلوبة للمتوسط</label><select id="db-plan-e" class="input"><option value="10">± 10%</option><option value="20" selected>± 20%</option><option value="30">± 30%</option></select></div>
            </div>
            <div id="db-plan-n"></div></div>
        </div>
      </div>`;
    const calcN = () => {
      const sel = U.$("#db-plan-cv").value, cust = sel === "custom"; U.$("#db-plan-cvc-f").hidden = !cust;
      const cv = cust ? +U.$("#db-plan-cvc").value : +sel, e = +U.$("#db-plan-e").value, nRep = replicates(cv, e);
      const tot = nRep ? nRep * pts.length * occU.length : null;
      U.$("#db-plan-n").innerHTML = nRep ? `<div class="db-gnow"><div><span class="k">مكررات لكل موقع وموعد</span><b>${N(nRep, 0)}</b></div><div><span class="k">مجموع العينات</span><b>${N(tot, 0)}</b></div></div>
        <p class="db-cap">n = (t × CV / E)² مع t من توزيع ستيودنت عند ثقة 95%، أي ${N(nRep, 0)} مكررات تقدّر المتوسط ضمن ±${e}% عندما يكون CV ${U.fmt(cv, 0)}%. المجموع = ${N(pts.length, 0)} مواقع × ${N(occU.length, 0)} مواعيد × ${N(nRep, 0)} مكررات. ${nRep > 10 ? "العدد كبير؛ خفّف الدقة المطلوبة أو قلّل المعايير، أو ركّز على مواقع التأثير." : ""}</p>` : "";
    };
    U.$("#db-plan-cv").onchange = calcN; U.$("#db-plan-e").onchange = calcN; U.$("#db-plan-cvc").oninput = calcN; calcN();
    if (window.L && pts.length) {
      const m = L.map(U.$("#db-plan-map"), { scrollWheelZoom: false }); const b = ECO.BASEMAPS.find(x => x.id === "esri") || ECO.BASEMAPS[0];
      L.tileLayer(b.url, { maxNativeZoom: b.max, maxZoom: 18, attribution: b.attr, crossOrigin: true }).addTo(m);
      lines.forEach(ln => L.polyline(ln, { color: ECO.COL.river, weight: 3, opacity: 0.8 }).addTo(m));
      proj.forEach(({ s }) => L.circleMarker([s.lat, s.lon], { radius: 5, color: "#041114", weight: 1, fillColor: (KIND[s.kind] || [0, "#c4d3cf"])[1], fillOpacity: 0.95 }).bindTooltip(esc((KIND[s.kind] || [s.kind])[0]) + (s.name ? " · " + esc(s.name) : "")).addTo(m));
      const COLK = { ref: "#93dd8a", up: "#4fc8dc", down: "#ef5a64", mix: "#e6ae4f", city: "#b493ff", end: "#c4d3cf" };
      pts.forEach(p => L.circleMarker([p.lat, p.lon], { radius: 7, color: "#fff", weight: 2, fillColor: COLK[p.kind], fillOpacity: 1 }).bindTooltip(`${p.id}: ${esc(p.why)}`).addTo(m));
      m.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lon])).pad(0.25));
      setTimeout(() => m.invalidateSize(), 80);
    }
    el.onclick = e => {
      const b = e.target.closest("[data-plan]"); if (!b || !S.plan) return;
      const P = S.plan;
      if (b.dataset.plan === "csv") save(new Blob([csvOf(["id", "lat", "lon", "purpose"], P.pts.map(p => [p.id, p.lat, p.lon, p.why]))], { type: "text/csv;charset=utf-8" }), `خطة-عينات-${P.d.id}.csv`);
      else {
        const x = s2 => String(s2).replace(/[<&>"]/g, c => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;", '"': "&quot;" })[c]);
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="EcoBio AI" xmlns="http://www.topografix.com/GPX/1/1">\n${P.pts.map(p => `<wpt lat="${p.lat}" lon="${p.lon}"><name>${x(p.id)}</name><desc>${x(p.why)}</desc></wpt>`).join("\n")}\n</gpx>\n`;
        save(new Blob([gpx], { type: "application/gpx+xml" }), `خطة-عينات-${P.d.id}.gpx`);
      }
    };
  }

  /* ------------------------------------------------------------------
     2) السلاسل الزمنية
  ------------------------------------------------------------------ */
  function paramOptions(sel, only) {
    const groups = {};
    Object.keys(COLS).forEach(code => { const p = S.P[code]; if (!p || (only && !only.includes(code))) return; (groups[p.category] = groups[p.category] || []).push(p); });
    return Object.keys(groups).map(c => `<optgroup label="${esc(CAT[c] || c)}">${groups[c].map(p => `<option value="${p.code}"${p.code === sel ? " selected" : ""}>${esc(p.name_ar)}${p.unit ? ` (${esc(p.unit)})` : ""}</option>`).join("")}</optgroup>`).join("");
  }

  function getSeries(p, did, span) {
    const [t, c, monthly] = COLS[p];
    const kc = monthly ? "month" : "date";
    let where = `district_id = ? AND ${c} IS NOT NULL`; const args = [did];
    if (/weather/.test(t)) { where += " AND date <= ?"; args.push(today()); }
    const last = (q1(`SELECT MAX(${kc}) m FROM ${t} WHERE ${where}`, args) || {}).m;
    if (!last) return { pts: [], raw: [], agg: "day" };
    if (span) {
      if (monthly) { where += " AND month >= strftime('%Y-%m', date(?, ?))"; args.push(last + "-01", `-${span} day`); }
      else { where += " AND date > date(?, ?)"; args.push(last, `-${span} day`); }
    }
    const raw = q(`SELECT ${kc} x, ${c} y FROM ${t} WHERE ${where} ORDER BY x`, args);
    if (!monthly && raw.length > 1200) {
      return { agg: "month", raw, pts: q(`SELECT substr(date, 1, 7) x, AVG(${c}) y FROM ${t} WHERE ${where} GROUP BY x ORDER BY x`, args) };
    }
    return { agg: monthly ? "monthly" : "day", raw, pts: raw };
  }

  function rSeries(el) {
    if (!el.dataset.built) {
      el.innerHTML = `<div class="db-ctrl">
          <div class="field"><label for="db-ts-p">المعيار</label><select id="db-ts-p" class="input">${paramOptions(S.ts.p)}</select></div>
          <div class="field"><span class="lbl" id="db-ts-span-l">المدة</span><div class="seg" id="db-ts-span" role="group" aria-labelledby="db-ts-span-l">${[[90, "3 أشهر"], [365, "سنة"], [1095, "3 سنوات"], [0, "كل السجل"]].map(([v, l]) => `<button type="button" data-span="${v}" class="${v === S.ts.span ? "on" : ""}">${l}</button>`).join("")}</div></div>
          <div class="field"><label for="db-ts-cmp">قارن مع قضاء آخر</label><select id="db-ts-cmp" class="input"><option value="">بلا مقارنة</option>${S.D.map(d => `<option value="${d.id}">${esc(d.name_ar)}</option>`).join("")}</select></div>
        </div>
        <div class="panel"><div class="panel-h"><h3 id="db-ts-h"></h3><div class="row"><button type="button" class="btn btn-ghost btn-sm" data-db-csv>${ico("i-down")}CSV</button><button type="button" class="btn btn-ghost btn-sm" data-db-xlsx>${ico("i-table")}Excel للقضاء</button></div></div>
          <div class="chart-box lg"><canvas id="db-ts-c"></canvas></div><p class="db-cap" id="db-ts-cap"></p></div>
        <div class="db-stats" id="db-ts-stats"></div>
        <div class="grid g-2 db-g2">
          <div class="panel"><div class="panel-h"><h3>الدورة الموسمية</h3><span class="sub">متوسط كل شهر على كامل السجل</span></div><div class="chart-box sm"><canvas id="db-ts-clim"></canvas></div></div>
          <div class="panel"><div class="panel-h"><h3>حسب السنة</h3></div><div class="tbl-wrap db-years" id="db-ts-years"></div></div>
        </div>`;
      el.dataset.built = "1";
      U.$("#db-ts-p").onchange = e => { S.ts.p = e.target.value; drawSeries(); };
      U.$("#db-ts-cmp").onchange = e => { S.ts.cmp = e.target.value; drawSeries(); };
      U.$("#db-ts-span").onclick = e => { const b = e.target.closest("[data-span]"); if (!b) return; S.ts.span = +b.dataset.span; U.$$("#db-ts-span button").forEach(x => x.classList.toggle("on", x === b)); drawSeries(); };
    }
    U.$$("#db-ts-cmp option").forEach(o => { o.disabled = o.value === S.d; });
    if (S.ts.cmp === S.d) { S.ts.cmp = ""; U.$("#db-ts-cmp").value = ""; }
    drawSeries();
  }

  function drawSeries() {
    clearCharts("series");
    const d = dist(), p = S.ts.p, P = S.P[p] || {}, [t, c, monthly] = COLS[p], lim = P.limit_value;
    const A = getSeries(p, d.id, S.ts.span), B = S.ts.cmp ? getSeries(p, S.ts.cmp, S.ts.span) : null;
    const cmpD = B && S.D.find(x => x.id === S.ts.cmp);
    const unit = P.unit ? ` (${P.unit})` : "";
    U.$("#db-ts-h").textContent = `${P.name_ar || p} في ${d.name_ar}${cmpD ? " و" + cmpD.name_ar : ""}`;
    const labels = Array.from(new Set(A.pts.map(r => r.x).concat(B ? B.pts.map(r => r.x) : []))).sort();
    const map = arr => { const m = {}; arr.forEach(r => { m[r.x] = r.y; }); return labels.map(x => m[x] ?? null); };
    const ds = [{ label: d.name_ar + unit, data: map(A.pts), borderColor: DCOL[d.id], backgroundColor: DCOL[d.id] + "22", fill: !B, borderWidth: 1.5, pointRadius: monthly ? 3 : 0, spanGaps: monthly }];
    if (B) ds.push({ label: cmpD.name_ar + unit, data: map(B.pts), borderColor: DCOL[cmpD.id], borderWidth: 1.5, pointRadius: monthly ? 3 : 0, spanGaps: monthly });
    if (lim && (A.agg === "day" || p === "aqi_pm25")) ds.push(limitLine(labels, lim, `الحد: ${lim} (${P.limit_ref || ""})`));
    chart("series", U.$("#db-ts-c"), { type: "line", data: { labels, datasets: ds },
      options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: xTicks }, y: { beginAtZero: ["air", "river"].includes(P.category) } } } });
    const cat = P.category;
    U.$("#db-ts-cap").innerHTML = `${esc(SRC_NOTE[cat] || "")}${A.agg === "month" ? " المدة طويلة فعُرض المتوسط الشهري؛ الإحصاءات أدناه محسوبة على القيم اليومية." : ""}${p === "o3" ? " قيمة الأوزون هنا أعلى متوسط لثماني ساعات خلال اليوم، وهو ما يقارن به حد الصحة العالمية." : ""}`;

    const ys = A.raw.map(r => r.y).filter(U.isNum);
    const over = lim ? ys.filter(v => v > lim).length : null;
    const stat = (k, v, dd) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div>${dd ? `<div class="d">${dd}</div>` : ""}</div>`;
    U.$("#db-ts-stats").innerHTML = ys.length ? [
      stat("عدد القيم", N(ys.length, 0), `${A.raw.length ? (monthly ? fM(A.raw[0].x) : fD(A.raw[0].x)) : ""} ← ${A.raw.length ? (monthly ? fM(A.raw[A.raw.length - 1].x) : fD(A.raw[A.raw.length - 1].x)) : ""}`),
      stat("المتوسط", N(U.mean(ys)), "الوسيط " + U.fmt(U.median(ys), "auto")),
      stat("الأدنى", N(Math.min(...ys)), "الانحراف المعياري " + U.fmt(U.std(ys), "auto")),
      stat("الأعلى", N(Math.max(...ys)), monthly ? fM(A.raw.find(r => r.y === Math.max(...ys)).x) : fD(A.raw.find(r => r.y === Math.max(...ys)).x)),
      lim ? stat("فوق الحد", `${N(100 * over / ys.length, 0)}%`, `${N(over, 0)} ${monthly ? "شهراً" : "يوماً"} فوق ${lim}`) : ""
    ].join("") : `<p class="empty">لا توجد قيم لهذا المعيار في هذه المدة.</p>`;

    // الدورة الموسمية والسنوات (كامل السجل)
    const kc = monthly ? "month" : "date";
    const w = `district_id = ? AND ${c} IS NOT NULL${/weather/.test(t) ? " AND date <= ?" : ""}`, wa = /weather/.test(t) ? [d.id, today()] : [d.id];
    const clim = q(`SELECT CAST(substr(${kc}, 6, 2) AS INTEGER) m, AVG(${c}) y FROM ${t} WHERE ${w} GROUP BY m ORDER BY m`, wa);
    const cm = {}; clim.forEach(r => { cm[r.m] = r.y; });
    chart("series", U.$("#db-ts-clim"), { type: "bar", data: { labels: MONTHS, datasets: [{ label: (P.name_ar || p) + unit, data: MONTHS.map((_, i) => cm[i + 1] ?? null), backgroundColor: DCOL[d.id] + "aa", borderRadius: 4 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 60, minRotation: 45, font: { size: 10 } } } } } });
    const yrs = q(`SELECT substr(${kc}, 1, 4) yr, COUNT(${c}) n, AVG(${c}) m, MIN(${c}) mn, MAX(${c}) mx${lim ? `, SUM(${c} > ${+lim}) o` : ""} FROM ${t} WHERE ${w} GROUP BY yr ORDER BY yr DESC`, wa);
    U.$("#db-ts-years").innerHTML = `<table class="tbl"><thead><tr><th>السنة</th><th class="num">${monthly ? "أشهر" : "أيام"}</th><th class="num">المتوسط</th><th class="num">الأدنى</th><th class="num">الأعلى</th>${lim ? `<th class="num">فوق ${lim}</th>` : ""}</tr></thead>
      <tbody>${yrs.map(r => `<tr><td>${esc(r.yr)}</td><td class="num">${U.fmt(r.n, 0)}</td><td class="num">${U.fmt(r.m, "auto")}</td><td class="num">${U.fmt(r.mn, "auto")}</td><td class="num">${U.fmt(r.mx, "auto")}</td>${lim ? `<td class="num">${U.fmt(r.o, 0)} <small class="muted">(${U.fmt(100 * r.o / r.n, 0)}%)</small></td>` : ""}</tr>`).join("")}</tbody></table>`;
    S.tsLast = { labels, ds: ds.filter(x => !String(x.label).startsWith("الحد")), name: `${p}_${d.id}${cmpD ? "_" + cmpD.id : ""}` };
  }

  function csvOf(header, rows) {
    const cell = v => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    return "﻿" + [header].concat(rows).map(r => r.map(cell).join(",")).join("\n");
  }
  function save(blob, name) { if (ECO.native && ECO.native.save) return ECO.native.save(blob, name); ECO.xlsx.download(blob, name); }

  function exportDistrictXlsx() {
    const d = dist();
    const sheet = (name, sql) => { const r = S.db.exec(sql, [d.id])[0]; return { name, rows: r ? [r.columns].concat(r.values) : [["لا بيانات"]] }; };
    const blob = ECO.xlsx.write([
      sheet("الهواء اليومي", "SELECT date, pm2_5, pm2_5_max, pm10, dust, no2, so2, o3, o3_max, co, aqi_pm25, aqi, hours FROM air_daily WHERE district_id = ? ORDER BY date"),
      sheet("الطقس اليومي", "SELECT date, t_max, t_min, t_mean, precip, wind_max, wind_dir, rh_mean, et0, radiation, src FROM weather_daily WHERE district_id = ? ORDER BY date"),
      sheet("تصريف دجلة", "SELECT date, discharge FROM river_daily WHERE district_id = ? ORDER BY date"),
      ...(S.ground ? [
        sheet("حرارة مصححة بالقياس", "SELECT date, t_max AS t_max_era5, t_max_adj, t_min AS t_min_era5, t_min_adj, calib_station FROM v_weather_corrected WHERE district_id = ? ORDER BY date"),
        sheet("قياس أقرب مطار", "SELECT s.name_ar AS station, x.date, x.t_max, x.t_min, x.t_mean, x.rh_mean, x.wind_mean, x.wind_max, x.vis_min, x.dust_hours, x.rain_hours, x.era5_t_max, x.cams_dust FROM station_daily x JOIN stations s ON s.id = x.station_id WHERE x.station_id = (SELECT station_id FROM district_stations WHERE district_id = ? AND role = 'now') ORDER BY x.date")] : []),
      sheet("Sentinel-2 شهري", "SELECT month, ndti, ndci, ndti_p90, ndci_p90, n_pixels, scene_date, cloud_pct, scene_id FROM water_rs_monthly WHERE district_id = ? ORDER BY month"),
      sheet("توقعات", "SELECT for_date, model, value, lo, hi, run_at FROM forecasts WHERE district_id = ? ORDER BY for_date, model"),
      { name: "المصادر", rows: [["المصدر", "المزوّد", "الدقة", "الترخيص", "المرجع"]].concat(q("SELECT * FROM sources").map(s => [s.name, s.provider, s.resolution, s.license, s.citation])) }
    ]);
    save(blob, `EcoBio-${d.id}-${today()}.xlsx`);
  }

  /* ------------------------------------------------------------------
     3) الذكاء الاصطناعي
  ------------------------------------------------------------------ */
  function rAI(el) {
    clearCharts("ai");
    const d = dist();
    const runAt = (q1("SELECT MAX(run_at) r FROM model_runs WHERE district_id = ?", [d.id]) || {}).r;
    const head = `<div class="db-ai-head"><div class="seg" id="db-ai-task" role="group" aria-label="أفق التوقّع"><button type="button" data-task="pm25_d1" class="${S.task === "pm25_d1" ? "on" : ""}">توقّع اليوم التالي</button><button type="button" data-task="pm25_d2" class="${S.task === "pm25_d2" ? "on" : ""}">توقّع بعد يومين</button></div>
      ${runAt ? `<span class="updated">آخر تدريب: ${esc(fStamp(runAt))}</span>` : ""}</div>`;
    if (!runAt) { el.innerHTML = head + `<p class="empty">لم تُدرَّب النماذج لهذا القضاء بعد (تحتاج 300 يوم بيانات على الأقل).</p>` + regimesBlock(d.id) + relBlock(d.id); afterAI(d); return; }
    const runs = q("SELECT * FROM model_runs WHERE district_id = ? AND run_at = ? AND task = ? ORDER BY rmse", [d.id, runAt, S.task]);
    const best = runs.find(r => r.is_best), pers = runs.find(r => r.model === "persistence");
    const h = S.task === "pm25_d2" ? 2 : 1;
    const fi = best ? q("SELECT * FROM feature_importance WHERE run_id = ? ORDER BY importance DESC LIMIT 12", [best.id]) : [];
    const hist = q("SELECT run_at, rmse, skill, model FROM model_runs WHERE district_id = ? AND task = ? AND is_best = 1 ORDER BY run_at", [d.id, S.task]);
    const r0 = runs[0] || {};

    el.innerHTML = head + `
      <div class="db-ai-grid">
        <div class="panel"><div class="panel-h"><h3>مقارنة خمسة نماذج على بيانات لم ترها</h3><span class="sub">${r0.test_from ? `اختبار: ${fD(r0.test_from)} ← ${fD(r0.test_to)} (${N(r0.n_test, 0)} يوماً) · تدريب على ${N(r0.n_train, 0)} يوماً قبلها` : ""}</span></div>
          <div class="tbl-wrap"><table class="tbl db-models"><thead><tr><th>النموذج</th><th class="num" title="متوسط الخطأ المطلق">MAE</th><th class="num" title="جذر متوسط مربع الخطأ">RMSE</th><th class="num" title="معامل التحديد">R²</th><th class="num" title="التحسّن على خط الأساس">المهارة</th></tr></thead>
          <tbody>${runs.map(r => `<tr class="${r.is_best ? "is-best" : ""}"><td>${esc(MODEL[r.model] || r.model)}${r.is_best ? ` <span class="chip tone-good">الأفضل</span>` : ""}</td><td class="num">${U.fmt(r.mae, 2)}</td><td class="num">${U.fmt(r.rmse, 2)}</td><td class="num">${U.fmt(r.r2, 3)}</td><td class="num">${r.model === "persistence" ? "—" : `${r.skill > 0 ? "+" : ""}${U.fmt(100 * r.skill, 1)}%`}</td></tr>`).join("")}</tbody></table></div>
          <p class="db-cap"><b>كيف تُقرأ:</b> MAE بكم µg/m³ يخطئ النموذج في المتوسط، وRMSE مثله لكنه يعاقب الأخطاء الكبيرة أكثر، وR² نسبة التغيّر التي يفسّرها النموذج (1 مثالي)، والمهارة هي التحسّن على خط الأساس «الغد مثل اليوم». ${best && best.model === "persistence" ? "<b>لم يتفوق أي نموذج على خط الأساس هنا، فاعتمدناه بصدق.</b>" : best && pers ? `أفضل نموذج قلّل الخطأ بـ ${U.fmt(100 * best.skill, 0)}% مقارنة بخط الأساس.` : ""}</p>
        </div>
        <div class="panel"><div class="panel-h"><h3>أهمية المتغيرات في ${esc(best ? MODEL[best.model] || best.model : "")}</h3><span class="sub">طريقة التبديل (Permutation)</span></div>
          ${fi.length ? `<div class="chart-box"><canvas id="db-ai-fi"></canvas></div><p class="db-cap">كل عمود: كم يزداد خطأ النموذج (RMSE) لو خلطنا قيم هذا المتغير عشوائياً. كلما طال كان المتغير أهم للتوقّع.</p>` : `<p class="empty">لا تُحسب الأهمية حين يكون خط الأساس هو الأفضل.</p>`}
        </div>
      </div>
      <div class="panel"><div class="panel-h"><h3>التوقّع مقابل الواقع في فترة الاختبار</h3><span class="sub">PM2.5 · µg/m³</span></div><div class="chart-box lg"><canvas id="db-ai-pred"></canvas></div>
        <p class="db-cap">أيام الاختبار لم يرها النموذج أثناء التدريب (تقسيم زمني: الماضي للتدريب والأحدث للاختبار، بلا خلط). المنحنى البرتقالي هو خط الأساس: قيمة اليوم نفسها توقّعاً لـ${h === 1 ? "الغد" : "بعد يومين"}.</p></div>
      ${hist.length >= 3 ? `<div class="panel"><div class="panel-h"><h3>ثبات الأداء عبر التحديثات اليومية</h3><span class="sub">RMSE لأفضل نموذج في كل تدريب</span></div><div class="chart-box sm"><canvas id="db-ai-hist"></canvas></div></div>` : ""}
      <div class="grid g-2 db-g2">${anomBlock(d.id, 10, "الأيام الشاذة في " + esc(d.name_ar)) || `<div class="panel"><p class="empty">لا أيام شاذة مسجلة.</p></div>`}${relBlock(d.id)}</div>
      ${regimesBlock(d.id)}
      <details class="panel db-method"><summary>${ico("i-info")}المنهجية بالتفصيل</summary><div class="prose">
        <p><b>الهدف:</b> متوسط PM2.5 اليومي بعد ${h === 1 ? "يوم" : "يومين"} لكل قضاء على حدة (استراتيجية مباشرة: نموذج مستقل لكل أفق).</p>
        <p><b>المدخلات (${N(fi.length ? q1("SELECT COUNT(*) n FROM feature_importance WHERE run_id = ?", [best.id]).n : 21, 0)} متغيراً):</b> قيم PM2.5 لآخر سبعة أيام، ومتوسطاها الأسبوعي والشهري، وPM10 والغبار وNO₂ وCO وO₃ اليوم، وأقوى رياح اليوم، وطقس يوم التوقّع من النموذج الجوي (الحرارة والرياح والأمطار والرطوبة)، والموسم بدالتي الجيب والجيب تمام ليوم السنة.</p>
        <p><b>النماذج:</b> الاستمرارية خط أساس، وRidge (α = 1)، والغابة العشوائية (300 شجرة)، والتعزيز التدرّجي (HistGradientBoosting، 400 تكرار)، وشبكة عصبية MLP (64 و32 عصبونة مع إيقاف مبكر). كلها تتعلم لوغاريتم القيمة (log1p) لأن توزيع الملوثات ملتوٍ.</p>
        <p><b>التقييم:</b> آخر 180 يوماً (أو 20% من السجل إن كان أقصر) للاختبار. يُختار النموذج الأقل RMSE، ولا يُعتمد إلا إذا تفوّق على خط الأساس. بعدها يُعاد تدريبه على كل البيانات ويُصدر التوقّع، ونطاق 80% من المئين العاشر والتسعين لأخطاء الاختبار.</p>
        <p><b>الشذوذ:</b> Isolation Forest على لوغاريتم الملوثات السبعة (نسبة متوقعة 2%)، ويُذكر المعيار الأبعد عن الوسيط بمقياس الانحراف المطلق الوسيط.</p>
        <p><b>الأنماط:</b> K-Means على كل أيام الأقضية معاً بعد التقييس، ويُختار عدد المجموعات (3–6) بأعلى معامل Silhouette، وتُسمّى المجموعات آلياً من مراكزها.</p>
        <p><b>إعادة الإنتاج:</b> كل الشيفرة في مجلد <bdi dir="ltr">etl/</bdi> في مستودع المنصة، والبذرة العشوائية ثابتة (42).</p></div></details>`;

    U.$("#db-ai-task").onclick = e => { const b = e.target.closest("[data-task]"); if (!b || b.dataset.task === S.task) return; S.task = b.dataset.task; paint(); };
    if (fi.length) {
      chart("ai", U.$("#db-ai-fi"), { type: "bar", data: { labels: fi.map(f => featLabel(f.feature)), datasets: [{ label: "زيادة RMSE", data: fi.map(f => Math.max(0, f.importance)), backgroundColor: ECO.COL.chloro + "bb", borderRadius: 3 }] },
        options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `+${U.fmt(fi[c.dataIndex].importance, 2)} ± ${U.fmt(fi[c.dataIndex].std, 2)} µg/m³` } } }, scales: { y: { position: "right", ticks: { font: { size: 10.5 } } } } } });
    }
    if (best) {
      const pred = q("SELECT date, actual, predicted FROM model_test_predictions WHERE run_id = ? ORDER BY date", [best.id]);
      if (pred.length) {
        const prev = {}; q("SELECT date, pm2_5 FROM air_daily WHERE district_id = ? AND date BETWEEN date(?, ?) AND ?", [d.id, pred[0].date, `-${h} day`, pred[pred.length - 1].date]).forEach(r => { prev[r.date] = r.pm2_5; });
        const back = x => { const t = new Date(x + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - h); return t.toISOString().slice(0, 10); };
        chart("ai", U.$("#db-ai-pred"), { type: "line", data: { labels: pred.map(r => r.date), datasets: [
          { label: "الواقع", data: pred.map(r => r.actual), borderColor: ECO.COL.text, borderWidth: 1.4 },
          { label: MODEL[best.model] || best.model, data: pred.map(r => r.predicted), borderColor: ECO.COL.chloro, borderWidth: 1.6 },
          ...(best.model !== "persistence" ? [{ label: "خط الأساس", data: pred.map(r => prev[back(r.date)] ?? null), borderColor: ECO.COL.silt + "aa", borderWidth: 1, borderDash: [4, 4] }] : [])
        ] }, options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: xTicks }, y: { beginAtZero: true } } } });
      }
    }
    if (hist.length >= 3) chart("ai", U.$("#db-ai-hist"), { type: "line", data: { labels: hist.map(r => r.run_at.slice(0, 10)), datasets: [{ label: "RMSE", data: hist.map(r => r.rmse), borderColor: ECO.COL.river, pointRadius: 2 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: xTicks } } } });
    afterAI(d);
  }

  function relBlock(did) {
    const rel = q("SELECT * FROM relationships WHERE district_id = ? ORDER BY x, y", [did]);
    if (!rel.length) return `<div class="panel"><div class="panel-h"><h3>علاقات النهر والماء</h3></div><p class="empty">تحتاج 12 شهراً على الأقل من مشاهد Sentinel-2 الصافية.</p></div>`;
    const L = { discharge: "تصريف دجلة", ndti: "العكورة NDTI", ndci: "الكلوروفيل NDCI", t_mean: "متوسط الحرارة" };
    const strength = r => { const a = Math.abs(r); return a < 0.2 ? "ضعيفة جداً" : a < 0.4 ? "ضعيفة" : a < 0.6 ? "متوسطة" : a < 0.8 ? "قوية" : "قوية جداً"; };
    return `<div class="panel"><div class="panel-h"><h3>علاقات النهر والماء</h3><span class="sub">ارتباط سبيرمان الشهري</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>العلاقة</th><th class="num">ρ</th><th class="num">p</th><th class="num">أشهر</th><th>القراءة</th></tr></thead><tbody>${rel.map(r =>
        `<tr><td>${L[r.x] || r.x} و${L[r.y] || r.y}</td><td class="num">${U.fmt(r.coef, 2)}</td><td class="num">${r.p_value < 0.001 ? "&lt;0.001" : U.fmt(r.p_value, 3)}</td><td class="num">${U.fmt(r.n, 0)}</td>
        <td>${r.p_value < 0.05 ? `${r.coef > 0 ? "طردية" : "عكسية"} ${strength(r.coef)}، دالة إحصائياً` : "غير دالة إحصائياً"}</td></tr>`).join("")}</tbody></table></div></div>`;
  }

  function regimesBlock(did) {
    const R = q("SELECT * FROM regimes ORDER BY cluster");
    if (!R.length) return "";
    const share = {}; let tot = 0;
    q("SELECT cluster, COUNT(*) n FROM air_regime_daily WHERE district_id = ? AND date > date((SELECT MAX(date) FROM air_regime_daily), '-365 day') GROUP BY cluster", [did]).forEach(r => { share[r.cluster] = r.n; tot += r.n; });
    const pal = ["#4fc8dc", "#e6ae4f", "#93dd8a", "#ef5a64", "#b493ff", "#c4d3cf"];
    S.regPal = pal;
    return `<div class="panel"><div class="panel-h"><h3>أنماط الهواء اليومية</h3><span class="sub">K-Means على ${N(R.reduce((s, r) => s + r.n_days, 0), 0)} يوماً من كل الأقضية</span></div>
      <div class="db-regs">${R.map(r => { const c = JSON.parse(r.centroid_json || "{}"); return `<div class="db-reg" style="--rc:${pal[r.cluster % pal.length]}"><b><i></i>${esc(r.label_ar)}</b>
        <span class="muted">${N(share[r.cluster] || 0, 0)} يوماً في هذا القضاء خلال آخر سنة${tot ? ` (${U.fmt(100 * (share[r.cluster] || 0) / tot, 0)}%)` : ""}</span>
        <span class="db-reg-v"><span>PM2.5 ${N(c.pm2_5, 0)}</span><span>غبار ${N(c.dust, 0)}</span><span>NO₂ ${N(c.no2, 1)}</span><span>O₃ ${N(c.o3, 0)}</span></span></div>`; }).join("")}</div>
      <h4 class="db-h4">نمط كل يوم في آخر سنة</h4><div class="db-cal" id="db-cal" role="img" aria-label="تقويم أنماط الهواء لآخر سنة"></div></div>`;
  }

  function afterAI(d) {
    const cal = U.$("#db-cal"); if (!cal) return;
    const rows = q(`SELECT a.date, a.cluster, r.label_ar l FROM air_regime_daily a JOIN regimes r ON r.cluster = a.cluster WHERE a.district_id = ? AND a.date > date((SELECT MAX(date) FROM air_regime_daily), '-365 day') ORDER BY a.date`, [d.id]);
    cal.innerHTML = rows.map(r => `<i style="background:${S.regPal[r.cluster % S.regPal.length]}" title="${esc(r.date)}: ${esc(r.l)}"></i>`).join("");
  }

  /* ------------------------------------------------------------------
     4) مقارنة الأقضية
  ------------------------------------------------------------------ */
  function rCompare(el) {
    clearCharts("compare");
    const rows = q("SELECT * FROM v_district_summary");
    const best = (k, hi) => { const v = rows.map(r => r[k]).filter(U.isNum); return v.length ? (hi ? Math.max(...v) : Math.min(...v)) : null; };
    const mxPm = best("pm25_mean_365", true);
    const same = q(`SELECT a.district_id x, b.district_id y, AVG(ABS(a.pm2_5 - b.pm2_5)) dif, COUNT(*) n FROM air_daily a JOIN air_daily b ON a.date = b.date AND a.district_id < b.district_id
      WHERE a.date > date((SELECT MAX(date) FROM air_daily), '-365 day') GROUP BY x, y HAVING n > 30 AND dif < 0.05`);
    const nm = id => (S.D.find(d => d.id === id) || {}).name_ar || id;
    el.innerHTML = `<div class="panel"><div class="panel-h"><h3>الأقضية الستة في آخر سنة</h3><span class="sub">من أعلى النهر إلى أسفله</span></div>
        <div class="tbl-wrap"><table class="tbl db-cmp"><thead><tr><th>القضاء</th><th class="num">متوسط PM2.5</th><th class="num">أيام فوق حد WHO</th><th class="num">متوسط التصريف m³/s</th><th class="num">متوسط NDTI</th><th class="num">مصادر تلوث</th><th class="num">بحوث</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td><button type="button" class="linkbtn" data-d="${r.id}" style="--dc:${DCOL[r.id]}"><i class="rb-dot"></i>${esc(r.name_ar)}</button></td>
          <td class="num${r.pm25_mean_365 === mxPm ? " db-max" : ""}">${U.fmt(r.pm25_mean_365, 1)}</td><td class="num">${U.isNum(r.pct_days_over_who_365) ? U.fmt(r.pct_days_over_who_365, 0) + "%" : "—"}</td>
          <td class="num">${U.fmt(r.discharge_mean_365, 0)}</td><td class="num">${U.fmt(r.ndti_mean_365, 3)}</td><td class="num">${U.fmt(r.n_sources, 0)}</td><td class="num">${U.fmt(r.n_studies, 0)}</td></tr>`).join("")}</tbody></table></div>
        ${same.length ? `<div class="notice info">${ico("i-info")}<span>قيم الهواء متطابقة تقريباً بين ${same.map(s => `${esc(nm(s.x))} و${esc(nm(s.y))}`).join("، ")}، لأن الأقضية المتجاورة تقع في الخلية نفسها من شبكة CAMS (≈45 كم). هذا حد في دقة المصدر وليس خطأ في القاعدة؛ للتمييز بينها تلزم محطات رصد أرضية.</span></div>` : ""}
      </div>
      <div class="panel"><div class="panel-h"><h3>المتوسط الشهري لكل الأقضية</h3><div class="field db-inline"><label for="db-cmp-p" class="sr-only">المعيار</label><select id="db-cmp-p" class="input">${paramOptions(S.cmpP, ["pm2_5", "pm10", "dust", "no2", "so2", "o3", "co", "t_max", "precip", "discharge", "ndti", "ndci"])}</select></div></div>
        <div class="chart-box lg"><canvas id="db-cmp-c"></canvas></div><p class="db-cap" id="db-cmp-cap"></p></div>
      <div class="panel" id="db-api"><div class="panel-h"><h3>البيانات المفتوحة للباحثين</h3><span class="sub">CSV وJSON تتحدّث يومياً</span></div><p class="muted">جارٍ تحميل الفهرس…</p></div>`;
    U.$("#db-cmp-p").onchange = e => { S.cmpP = e.target.value; drawCompare(); };
    drawCompare();
    renderApi();
  }
  async function renderApi() {
    const box = U.$("#db-api"); if (!box) return;
    let I = null;
    try { const r = await fetch(RAW + "api/index.json?t=" + Math.floor(Date.now() / 3600000), { cache: "no-store" }); if (r.ok) I = await r.json(); } catch (e) { /* دون اتصال */ }
    if (!I) { box.querySelector("p").textContent = "الفهرس غير متاح الآن (يُنشر مع تحديث القاعدة القادم، أو أنك دون اتصال)."; return; }
    const base = I.base, ds = Object.entries(I.datasets), L = (p, t) => `<a href="${base}${p}" target="_blank" rel="noopener" download>${t}</a>`;
    box.innerHTML = `<div class="panel-h"><h3>البيانات المفتوحة للباحثين</h3><span class="sub">آخر تحديث ${fD(I.updated_at)}</span></div>
      <p class="db-cap">كل جداول القاعدة متاحة كروابط ثابتة تتحدّث يومياً، يسحبها Excel وPython وR مباشرة. اذكر المنصة والمصدر الأصلي لكل جدول عند الاستعمال في بحثك.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>القضاء</th>${ds.map(([k, v]) => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>
        ${I.districts.map(d => `<tr><td>${esc(d.name_ar)}</td>${ds.map(([k, v]) => `<td>${v.files[d.id] ? L(v.files[d.id].path, `CSV <small class="muted">(${U.fmt(v.files[d.id].rows, 0)})</small>`) : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="db-cap">${ds.map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v.description)}`).join(" · ")}</p>
      <p class="db-cap"><b>محطات الرصد الأرضي:</b> ${I.stations.map(s => L(s.path, esc(s.name_ar))).join("، ")}. الفهرس الكامل بالأعمدة والمصادر: ${L("index.json", "index.json")}.</p>
      <details class="db-method"><summary>${ico("i-code")}مثال: قراءة البيانات في Python وR وExcel</summary><pre class="db-code" dir="ltr">import pandas as pd
df = pd.read_csv("${base}tikrit/air.csv", parse_dates=["date"])

# R
df &lt;- read.csv("${base}tikrit/air.csv")

# Excel: Data → From Web → الصق الرابط</pre></details>`;
  }

  function drawCompare() {
    const p = S.cmpP, [t, c, monthly] = COLS[p], P = S.P[p] || {};
    const kc = monthly ? "month" : "date";
    const rows = q(`SELECT district_id id, substr(${kc}, 1, 7) m, AVG(${c}) y FROM ${t} WHERE ${c} IS NOT NULL AND ${kc} >= strftime('%Y-%m', date('now', '-36 months'))${t === "weather_daily" ? ` AND date <= '${today()}'` : ""} GROUP BY id, m ORDER BY m`);
    const labels = Array.from(new Set(rows.map(r => r.m))).sort();
    const by = {}; rows.forEach(r => { (by[r.id] = by[r.id] || {})[r.m] = r.y; });
    chart("compare", U.$("#db-cmp-c"), { type: "line", data: { labels, datasets: S.D.map(d => ({ label: d.name_ar, data: labels.map(m => (by[d.id] || {})[m] ?? null), borderColor: DCOL[d.id], borderWidth: 1.6, pointRadius: monthly ? 2 : 0, spanGaps: true })) },
      options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: xTicks } } } });
    U.$("#db-cmp-cap").textContent = `${P.name_ar || p}${P.unit ? " (" + P.unit + ")" : ""}، متوسط كل شهر لآخر 36 شهراً. ${SRC_NOTE[P.category] || ""}`;
  }

  /* ------------------------------------------------------------------
     5) البحوث ومصادر التلوث
  ------------------------------------------------------------------ */
  /* المخاطر الصحية لشرب الماء من القيم المنشورة (US EPA: HQ = CDI / RfD) */
  const RFD = { Pb: [0.0035, "WHO PTWI 25 µg/kg/أسبوع"], Cd: [0.0005, "US EPA IRIS"], Cr: [0.003, "US EPA IRIS (Cr VI)"], Ni: [0.02, "US EPA IRIS"], Cu: [0.04, "US EPA HEAST"], Zn: [0.3, "US EPA IRIS"], Fe: [0.7, "US EPA PPRTV"], As: [0.0003, "US EPA IRIS"] };
  const METAL = [[/الرصاص|\bPb\b/, "Pb", "الرصاص"], [/الكادميوم|\bCd\b/, "Cd", "الكادميوم"], [/الكروم|\bCr\b/, "Cr", "الكروم"], [/النيكل|\bNi\b/, "Ni", "النيكل"], [/النحاس|\bCu\b/, "Cu", "النحاس"], [/الزنك|\bZn\b/, "Zn", "الزنك"], [/الحديد|\bFe\b/, "Fe", "الحديد"], [/الزرنيخ|\bAs\b/, "As", "الزرنيخ"]];
  function healthBlock(s) {
    if (!/مياه\s*(آبار|نهر|شرب)/.test(s.medium || "") || /صرف/.test(s.medium || "")) return "";
    const M = {};
    q("SELECT item, value, unit FROM study_values WHERE study_id = ?", [s.id]).forEach(v => {
      if (/–|أوراق|جذور|سيقان|رواسب|تربة/.test(v.item) || !U.isNum(v.value)) return;
      if (v.unit && !/mg\/L|ppm|ملغم\/لتر/i.test(v.unit) && !/\((ppm|mg\/L)\)/i.test(v.item)) return;
      const m = METAL.find(([re]) => re.test(v.item)); if (!m) return;
      (M[m[1]] = M[m[1]] || { name: m[2], v: [] }).v.push(v.value);
    });
    const ks = Object.keys(M); if (!ks.length) return "";
    const hq = (c, ir, bw, k) => c * ir / (bw * RFD[k][0]);
    let HIa = 0, HIc = 0;
    const rows = ks.map(k => { const c = Math.max(...M[k].v), a = hq(c, 2, 70, k), ch = hq(c, 1, 15, k); HIa += a; HIc += ch;
      return `<tr><td>${esc(M[k].name)} <small class="muted">${k}</small></td><td class="num">${U.fmt(c, "auto")}</td><td class="num"><b class="${a >= 1 ? "bad" : "ok"}">${U.fmt(a, 2)}</b></td><td class="num"><b class="${ch >= 1 ? "bad" : "ok"}">${U.fmt(ch, 2)}</b></td><td><small>${esc(RFD[k][1])}</small></td></tr>`; }).join("");
    return `<div class="db-health"><h5>المخاطر الصحية لو شُرب هذا الماء يومياً</h5>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>العنصر</th><th class="num">أعلى تركيز mg/L</th><th class="num">HQ بالغ</th><th class="num">HQ طفل</th><th>مرجع RfD</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2"><b>مؤشر الخطورة HI</b></td><td class="num"><b class="${HIa >= 1 ? "bad" : "ok"}">${U.fmt(HIa, 2)}</b></td><td class="num"><b class="${HIc >= 1 ? "bad" : "ok"}">${U.fmt(HIc, 2)}</b></td><td></td></tr></tfoot></table></div>
      <p class="db-cap">محسوب بنموذج US EPA لمياه الشرب: بالغ يشرب 2 لتر يومياً ووزنه 70 كغم، وطفل يشرب لتراً ووزنه 15 كغم، على أعلى تركيز منشور في البحث (أسوأ حالة). HQ أكبر من 1 يعني احتمال أثر صحي مزمن مع الشرب المستمر. ${HIc >= 1 ? "<b>النتيجة: هذا الماء غير آمن للشرب المستمر، خصوصاً للأطفال، بحسب القيم المنشورة.</b>" : ""} لحساب عيّنتك أنت استعمل <a href="#calc">حاسبة المخاطر الصحية</a>.</p></div>`;
  }

  function studyCard(s) {
    const vals = q("SELECT table_id, item, col, stat, value, unit, note FROM study_values WHERE study_id = ? ORDER BY id", [s.id]);
    const nAll = q1("SELECT COUNT(*) n FROM study_values WHERE study_id = ?", [s.id]).n;
    const ST = { min: "أدنى", max: "أعلى", value: "قيمة" };
    return `<article class="db-study"><h4>${esc(s.title)}</h4>
      <p class="muted">${esc(s.authors || "")}${s.journal ? ` · <i>${esc(s.journal)}</i>` : ""}${s.volume ? ` ${esc(s.volume)}` : ""}${s.year ? ` · ${esc(s.year)}` : ""}</p>
      ${s.summary ? `<p>${esc(s.summary)}</p>` : ""}
      <p class="db-study-m">${s.place ? `<span>${ico("i-pin")}${esc(s.place)}</span>` : ""}${s.medium ? `<span>${ico("i-drop")}${esc(s.medium)}</span>` : ""}${s.period ? `<span>${ico("i-layers")}${esc(s.period)}</span>` : ""}
        ${s.doi ? `<a href="https://doi.org/${encodeURI(s.doi)}" target="_blank" rel="noopener">${ico("i-ext")}DOI</a>` : s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${ico("i-ext")}رابط البحث</a>` : ""}</p>
      ${vals.length ? `<details><summary>القيم المنشورة في القاعدة (${N(nAll, 0)})</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>المعيار أو الصف</th><th>العمود</th><th>النوع</th><th class="num">القيمة</th><th>الوحدة</th></tr></thead><tbody>${vals.map(v =>
        `<tr><td>${esc(v.item)}</td><td>${esc(v.col || "—")}</td><td>${ST[v.stat] || esc(v.stat)}</td><td class="num">${U.fmt(v.value, "auto")}</td><td><bdi>${esc(v.unit || "")}</bdi></td></tr>`).join("")}</tbody></table></div>
</details>` : ""}${healthBlock(s)}</article>`;
  }
  function rStudies(el) {
    const d = dist();
    const st = q("SELECT s.* FROM studies s JOIN study_districts sd ON sd.study_id = s.id WHERE sd.district_id = ? ORDER BY s.year DESC", [d.id]);
    const gov = q("SELECT * FROM studies WHERE id NOT IN (SELECT study_id FROM study_districts) ORDER BY year DESC");
    const src = q("SELECT * FROM pollution_sources WHERE district_id = ? ORDER BY dist_river_km IS NULL, dist_river_km", [d.id]);
    const kinds = {}; src.forEach(s => { kinds[s.kind] = (kinds[s.kind] || 0) + 1; });
    el.innerHTML = `<div class="grid db-st-grid">
      <section class="panel"><div class="panel-h"><h3>بحوث جامعة تكريت في ${esc(d.name_ar)}</h3><a class="linkbtn" href="#research">كل البحوث على الخريطة</a></div>
        ${st.length ? st.map(studyCard).join("") : `<p class="empty">لا يوجد بحث منشور مرتبط بهذا القضاء في المنصة بعد. هذه فجوة بحثية: <a href="#gaps">اقترح عنواناً</a>.</p>`}
        ${gov.length ? `<h4 class="db-h4">بحوث على مستوى المحافظة</h4>${gov.map(studyCard).join("")}` : ""}</section>
      <section class="panel"><div class="panel-h"><h3>مصادر التلوث المرسومة حول ${esc(d.name_ar)}</h3><span class="sub">OpenStreetMap · ضمن 30 كم</span></div>
        ${src.length ? `<div class="db-kinds">${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, c]) => `<span class="chip" style="--kc:${(KIND[k] || [0, "#c4d3cf"])[1]}"><i></i>${esc((KIND[k] || [k])[0])} ${N(c, 0)}</span>`).join("")}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>النوع</th><th>الاسم</th><th class="num">عن النهر</th><th class="num">عن المركز</th><th></th></tr></thead><tbody>${src.map(s =>
          `<tr><td><i class="db-kdot" style="background:${(KIND[s.kind] || [0, "#c4d3cf"])[1]}"></i>${esc((KIND[s.kind] || [s.kind])[0])}</td><td>${esc(s.name || "بلا اسم في الخريطة")}</td>
          <td class="num">${U.isNum(s.dist_river_km) ? U.fmt(s.dist_river_km, 1) + " كم" : "—"}</td><td class="num">${U.isNum(s.lat) ? U.fmt(km(d.lat, d.lon, s.lat, s.lon), 1) + " كم" : "—"}</td>
          <td><a href="https://www.openstreetmap.org/${esc(s.id)}" target="_blank" rel="noopener" aria-label="افتح في OpenStreetMap">${ico("i-ext")}</a></td></tr>`).join("")}</tbody></table></div>
        <p class="db-cap">القائمة بقدر ما رسمه متطوعو OpenStreetMap؛ قد تنقصها منشآت غير مرسومة. ساهم بإضافتها في الخريطة لتظهر هنا بعد أسبوع.</p>`
        : `<p class="empty">لا توجد منشآت ملوِّثة مرسومة في OpenStreetMap ضمن 30 كم من مركز القضاء.</p>`}</section></div>`;
  }

  /* ------------------------------------------------------------------
     أقرب قضاء
  ------------------------------------------------------------------ */
  function nearest() {
    const done = (lat, lon) => {
      const best = S.D.map(d => [d, km(lat, lon, d.lat, d.lon)]).sort((a, b) => a[1] - b[1])[0];
      if (!best) return;
      setDistrict(best[0].id);
      U.toast(best[1] > 60 ? `أنت على بعد ${Math.round(best[1])} كم من أقرب قضاء (${best[0].name_ar}).` : `أقرب قضاء إليك: ${best[0].name_ar} (${Math.round(best[1])} كم).`);
    };
    if (ECO.native && ECO.native.locate) { ECO.native.locate().then(p => done(p.lat, p.lon)).catch(() => U.toast("تعذّر تحديد موقعك.")); return; }
    if (!navigator.geolocation) { U.toast("جهازك لا يدعم تحديد الموقع."); return; }
    navigator.geolocation.getCurrentPosition(p => done(p.coords.latitude, p.coords.longitude), () => U.toast("لم يُسمح بتحديد الموقع أو تعذّر."), { timeout: 12000, maximumAge: 600000 });
  }

  /* ------------------------------------------------------------------
     الأحداث
  ------------------------------------------------------------------ */
  function wire() {
    const v = U.$("#view-districts");
    v.addEventListener("click", e => {
      if (e.target.closest("[data-db-retry]")) { load(true); return; }
      if (e.target.closest("[data-db-reload]")) { load(true); return; }
      if (e.target.closest("[data-db-near]")) { nearest(); return; }
      if (e.target.closest("[data-db-csv]") && S.tsLast) { const L = S.tsLast; save(new Blob([csvOf(["x"].concat(L.ds.map(d => d.label)), L.labels.map((x, i) => [x].concat(L.ds.map(d => d.data[i]))))], { type: "text/csv;charset=utf-8" }), `ecobio-${L.name}.csv`); return; }
      if (e.target.closest("[data-db-xlsx]")) { exportDistrictXlsx(); return; }
      const dB = e.target.closest("[data-d]"); if (dB) { setDistrict(dB.dataset.d); if (dB.closest(".db-cmp")) setTab("overview"); return; }
      const t = e.target.closest("[data-tab]"); if (t) { setTab(t.dataset.tab); return; }
      const tg = e.target.closest("[data-tab-go]"); if (tg) { setTab(tg.dataset.tabGo); return; }
    });
    U.$("#db-tabs").addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const ids = TABS.map(t => t[0]); let i = ids.indexOf(S.tab);
      i = e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : (i + (e.key === "ArrowLeft" ? 1 : -1) + ids.length) % ids.length; // RTL
      e.preventDefault(); setTab(ids[i]); U.$("#db-t-" + ids[i]).focus();
    });
    window.addEventListener("hashchange", () => {
      if (!S.db || !ECO.router || ECO.router.current() !== "districts") return;
      const d0 = S.d, t0 = S.tab; readHash();
      if (S.tab !== t0) renderTabs();
      if (S.d !== d0) U.$$("#db-ribbon [data-d]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.d === S.d)));
      if (S.d !== d0 || S.tab !== t0) paint();
    });
  }

  /* واجهة للأدوات الأخرى والتطبيق (الإشعار اليومي): ملخص قضاء */
  ECO.districtsDB = {
    ready: () => !!S.db,
    load: () => load(),
    summary(id) {
      if (!S.db) return null;
      const d = S.D.find(x => x.id === id); if (!d) return null;
      const air = q1("SELECT date, pm2_5, dust FROM air_daily WHERE district_id = ? ORDER BY date DESC LIMIT 1", [id]);
      const fc = air ? q1("SELECT for_date, value, lo, hi, model FROM forecasts WHERE district_id = ? AND target = 'pm2_5' AND model != 'cams' AND for_date > ? ORDER BY for_date LIMIT 1", [id, air.date]) : null;
      return { district: d, air, forecast: fc };
    }
  };

  ECO.views.districts = {
    init() { wire(); load(); },
    show() {
      if (S.db) { const d0 = S.d, t0 = S.tab; readHash(); if (S.tab !== t0) renderTabs(); if (S.d !== d0) renderRibbon(); paint(); writeHash(); }
      if (S.map) setTimeout(() => S.map.invalidateSize(), 80);
    }
  };
})();
