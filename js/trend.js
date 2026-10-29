/* =====================================================================
   EcoBio AI — تحليل الاتجاه الزمني
   على بيانات المنصة (تصريف دجلة منذ 2000، الطقس منذ 2015، الهواء منذ 2022،
   عكورة الماء وكلوروفيله من Sentinel-2 منذ 2017) أو على جدول الباحث:
   Mann–Kendall الأصلي والمعدّل (Hamed & Rao 1998)، Kendall الموسمي
   (Hirsch et al. 1982)، ميل Sen بفترة ثقة، واختبار Pettitt لنقطة التغيّر.
   الحسابات في js/trendlib.js ومطابقة لـ pymannkendall وpyhomogeneity.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, TB = ECO.tab, TL = ECO.trend;
  if (!document.getElementById("view-trend")) return;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const RAW = "https://raw.githubusercontent.com/ibnsamh97-ai/moamin-ecobio/db/api/";
  const DIST = [["shirqat", "الشرقاط"], ["baiji", "بيجي"], ["tikrit", "تكريت"], ["dour", "الدور"], ["samarra", "سامراء"], ["balad", "بلد"]];
  /* متغيرات المنصة: [الملف، العمود، الاسم، الوحدة، دقة السلسلة: d يومي / m شهري] */
  const VARS = [
    ["river", "discharge", "تصريف دجلة (GloFAS)", "m³/s", "d"],
    ["weather", "t_max", "العظمى اليومية (ERA5)", "°م", "d"], ["weather", "t_min", "الصغرى اليومية (ERA5)", "°م", "d"],
    ["weather", "t_mean", "متوسط الحرارة (ERA5)", "°م", "d"], ["weather", "rh_mean", "الرطوبة النسبية (ERA5)", "%", "d"],
    ["air", "pm2_5", "PM2.5 (CAMS)", "µg/m³", "d"], ["air", "pm10", "PM10 (CAMS)", "µg/m³", "d"], ["air", "dust", "الغبار (CAMS)", "µg/m³", "d"],
    ["air", "no2", "NO₂ (CAMS)", "µg/m³", "d"], ["air", "so2", "SO₂ (CAMS)", "µg/m³", "d"], ["air", "o3", "O₃ (CAMS)", "µg/m³", "d"], ["air", "co", "CO (CAMS)", "µg/m³", "d"],
    ["water", "ndti", "عكورة الماء NDTI (Sentinel-2)", "", "m"], ["water", "ndci", "كلوروفيل الماء NDCI (Sentinel-2)", "", "m"]
  ];
  const S = { src: "platform", d: "tikrit", v: 1, agg: "annual", test: "hr", alpha: 0.05, series: null, label: "", res: null, sel: 0, chart: null };
  const F = (v, d = 3) => (isFinite(v) ? U.fmt(v, d) : "—");
  const pf = p => (!isFinite(p) ? "—" : p < 0.001 ? "< 0.001" : p.toFixed(3));
  /* لون محايد: الزيادة ليست سيئة دائماً (التصريف مثلاً) */
  const TREND = { increasing: ["متزايد", "info"], decreasing: ["متناقص", "info"], none: ["لا اتجاه معنوي", "none"] };
  const RAW_MAX = 1500;

  /* ------------------------------------------------------------------
     التواريخ: سنة، سنة-شهر، تاريخ كامل، يوم/شهر/سنة، أو رقم تسلسلي من Excel
  ------------------------------------------------------------------ */
  function parseDate(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v).trim())) {
      const x = +v;
      if (x >= 1900 && x <= 2100 && Number.isInteger(x)) return { y: x, m: null, d: null };
      if (x > 20000 && x < 80000) { const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(x) * 864e5); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; }
      return null;
    }
    const s = String(v).trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660));
    let m = /^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/.exec(s);
    if (m) return { y: +m[1], m: +m[2], d: m[3] ? +m[3] : null };
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
    if (m) return { y: +m[3], m: +m[2], d: +m[1] };
    return null;
  }
  const decYear = o => {
    if (o.m == null) return o.y + 0.5;
    const leap = (o.y % 4 === 0 && o.y % 100 !== 0) || o.y % 400 === 0, dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const doy = dim.slice(0, o.m - 1).reduce((a, b) => a + b, 0) + (o.d || dim[o.m - 1] / 2);
    return o.y + (doy - 0.5) / (leap ? 366 : 365);
  };

  /* سلسلة واحدة: [{o: تاريخ, t: سنة عشرية, x}]. res: "d" يومية، "m" شهرية، غير ذلك قياسات متفرقة */
  /* التجميع على قواعد WMO (2017، WMO-No. 1203): الشهر اليومي صالح إذا نقصت منه 10 أيام أو أقل
     ولم تنقص منه 5 أيام متتالية،
     والسنة تُحسب من 12 شهراً صالحاً (متوسط المتوسطات الشهرية) حتى لا تُحسب سنة ناقصة الشتاء أدفأ.
     القياسات المتفرقة (جدول الباحث) تُجمع بمتوسط بسيط مع تنبيه. */
  const DIM = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  function aggregate(pts, agg, res) {
    if (agg === "raw") return pts.slice().sort((a, b) => a.t - b.t);
    const skipped = [];
    const mk = (y, m, x, nObs) => ({ o: { y, m, d: null }, t: m == null ? y : decYear({ y, m, d: null }), x, nObs, label: m == null ? String(y) : `${y}-${String(m).padStart(2, "0")}` });
    /* المتوسطات الشهرية */
    const gm = new Map();
    const gd = new Map();
    pts.forEach(p => {
      if (!p.o.m) return; const k = p.o.y * 100 + p.o.m;
      if (!gm.has(k)) { gm.set(k, []); gd.set(k, new Set()); }
      gm.get(k).push(p.x); if (p.o.d) gd.get(k).add(p.o.d);
    });
    /* أطول فترة أيام ناقصة متتالية في الشهر */
    const gap = (days, n) => { let run = 0, mx = 0; for (let d = 1; d <= n; d++) { if (days.has(d)) run = 0; else mx = Math.max(mx, ++run); } return mx; };
    const months = [];
    [...gm.keys()].sort((a, b) => a - b).forEach(k => {
      const y = Math.floor(k / 100), m = k % 100, a = gm.get(k);
      if (res === "d") {
        const n = DIM(y, m), days = gd.get(k), miss = n - days.size, run = gap(days, n);
        if (miss > 10 || run >= 5) { if (agg === "monthly") skipped.push(`${y}-${String(m).padStart(2, "0")} (${days.size} يوماً)`); return; }
      }
      months.push(mk(y, m, avg(a), a.length));
    });
    if (agg === "monthly") return { list: months, skipped };
    if (res === "d" || res === "m") {
      const gy = new Map(); months.forEach(o => { if (!gy.has(o.o.y)) gy.set(o.o.y, []); gy.get(o.o.y).push(o); });
      const ys = new Set(pts.map(p => p.o.y)), list = [];
      [...ys].sort((a, b) => a - b).forEach(y => {
        const a = gy.get(y) || [];
        if (a.length < 12) { skipped.push(`${y} (${a.length} من 12 شهراً)`); return; }
        list.push(mk(y, null, avg(a.map(o => o.x)), a.reduce((s, o) => s + o.nObs, 0)));
      });
      return { list, skipped };
    }
    const gy = new Map();
    pts.forEach(p => { if (!gy.has(p.o.y)) gy.set(p.o.y, []); gy.get(p.o.y).push(p.x); });
    return { list: [...gy.keys()].sort((a, b) => a - b).map(y => mk(y, null, avg(gy.get(y)), gy.get(y).length)), skipped };
  }

  function analyzeSeries(name, unit, pts, res) {
    if (S.agg === "raw" && pts.length > RAW_MAX) return { name, unit, list: [], skipped: [], n: pts.length, warn: [], err: `السلسلة فيها ${pts.length} قيمة؛ اختر متوسطاً سنوياً أو شهرياً (القيم اليومية مترابطة بقوة، وحساب ميل Sen لها ثقيل على الهاتف).` };
    const A = aggregate(pts, S.agg, res), list = Array.isArray(A) ? A : A.list, skipped = Array.isArray(A) ? [] : A.skipped;
    if (S.agg === "raw") list.forEach(p => { p.label = p.o.d ? `${p.o.y}-${String(p.o.m).padStart(2, "0")}-${String(p.o.d).padStart(2, "0")}` : p.o.m ? `${p.o.y}-${String(p.o.m).padStart(2, "0")}` : String(p.o.y); });
    const x = list.map(p => p.x), t = list.map(p => p.t), n = x.length;
    const r = { name, unit, list, skipped, n, warn: [] };
    if (n < 4) { r.err = `القيم المجمّعة (${n}) أقل من 4؛ اختبار الاتجاه يحتاج 4 قيم على الأقل، ويُفضّل 10 فأكثر.`; return r; }
    if (S.agg === "annual" && res !== "d" && res !== "m") {
      const c = list.map(p => p.nObs), lo = Math.min(...c), hi = Math.max(...c);
      if (hi >= 2 * lo) r.warn.push(`عدد القياسات يختلف بين السنوات (من ${lo} إلى ${hi})؛ إذا كانت القياسات في مواسم مختلفة فقد يعكس المتوسط السنوي الموسم لا الاتجاه. جرّب المتوسط الشهري مع الاختبار الموسمي.`);
    }
    if (n < 10) r.warn.push(`n = ${n} أقل من 10: قيمة p من التقريب الطبيعي تقريبية؛ قارنها بجدول القيم الحرجة الدقيقة لـ Mann–Kendall.`);
    if (S.agg === "monthly") {
      const seas = Array.from({ length: 12 }, () => []);
      list.forEach(p => seas[p.o.m - 1].push({ t: p.o.y, x: p.x }));
      const sk = TL.seasonal(seas, S.alpha);
      r.test = "seasonal"; r.mk = sk;
      r.sen = sk ? { slope: sk.slope, lo: NaN, hi: NaN, intercept: TL.median(x) - sk.slope * TL.median(t) } : null;
      /* Pettitt على الانحرافات عن متوسط كل شهر حتى لا تقوده الموسمية */
      const clim = seas.map(a => (a.length ? a.reduce((s, o) => s + o.x, 0) / a.length : NaN));
      r.anom = list.map(p => p.x - clim[p.o.m - 1]);
      r.pt = TL.pettitt(r.anom, S.alpha);
      if (seas.some(a => a.length < 3)) r.warn.push("بعض الأشهر لها أقل من 3 سنوات؛ الاختبار الموسمي يحتاج سنوات أكثر لكل شهر.");
    } else {
      r.test = S.test;
      const base = TL.mk(x, S.alpha);
      r.mk = S.test === "hr" ? TL.hamedRao(x, S.alpha) : base;
      r.mk0 = base;
      r.sen = TL.sen(t, x, S.alpha, base.varS);
      r.pt = TL.pettitt(x, S.alpha);
      if (S.test === "hr" && r.mk && r.mk.ratio > 1.0001) r.warn.push(`الارتباط الذاتي المعنوي ضاعف تباين S بمعامل ${F(r.mk.ratio, 2)}؛ لذلك p المعدّلة (${pf(r.mk.p)}) أكبر من p الأصلية (${pf(base.p)}).`);
    }
    if (r.pt) { const k = r.pt.loc; r.pt.label = list[k - 1] ? list[k - 1].label : ""; r.pt.next = list[k] ? list[k].label : ""; }
    const mean = x.reduce((s, v) => s + v, 0) / n;
    r.mean = mean;
    r.span = t[n - 1] - t[0];
    if (r.sen && isFinite(r.sen.slope) && mean !== 0) r.pctDecade = (100 * r.sen.slope * 10) / Math.abs(mean);
    return r;
  }

  /* ------------------------------------------------------------------
     مصادر البيانات
  ------------------------------------------------------------------ */
  const cache = new Map();
  async function platformSeries() {
    const [file, col, name, unit, res] = VARS[S.v], url = `${RAW}${S.d}/${file}.csv`;
    let text = cache.get(url);
    if (!text) { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error("HTTP " + r.status); text = await r.text(); cache.set(url, text); }
    const rows = TB.parseText(text), h = rows[0], ci = h.indexOf(col), di = h.indexOf(file === "water" ? "month" : "date"), si = h.indexOf("src");
    if (ci < 0 || di < 0) throw new Error("تغيّر شكل ملف البيانات");
    const pts = [];
    rows.slice(1).forEach(r => {
      if (si >= 0 && r[si] && r[si] !== "era5") return;   // أيام التنبؤ ليست قياساً بعد
      const v = TB.num(r[ci]), o = parseDate(r[di]); if (!isFinite(v) || !o) return;
      pts.push({ o, t: decYear(o), x: v });
    });
    const dn = DIST.find(d => d[0] === S.d)[1];
    return [{ name: `${name} – ${dn}`, unit, pts, res }];
  }

  function tableSeries(rows) {
    const head = rows[0].map(h => String(h == null ? "" : h).trim()), body = rows.slice(1);
    let di = head.findIndex(h => /date|time|year|month|تاريخ|التاريخ|السنة|سنة|الشهر|الزمن/i.test(h));
    if (di < 0) di = head.findIndex((_, j) => body.filter(r => parseDate(r[j])).length >= 0.8 * body.length);
    if (di < 0) throw new Error("لم أجد عمود تاريخ أو سنة؛ اجعل العمود الأول التاريخ (2024-05-01) أو السنة (2024).");
    const out = [];
    head.forEach((h, j) => {
      if (j === di) return;
      const pts = [];
      body.forEach(r => { const o = parseDate(r[di]), v = TB.num(r[j]); if (o && isFinite(v)) pts.push({ o, t: decYear(o), x: v }); });
      if (pts.length >= 4) out.push({ name: h || `عمود ${j + 1}`, unit: "", pts, res: "" });
    });
    if (!out.length) throw new Error("لا يوجد عمود رقمي فيه 4 قيم مؤرخة على الأقل.");
    return out;
  }

  /* ------------------------------------------------------------------
     الواجهة
  ------------------------------------------------------------------ */
  function renderControls() {
    const opt = (v, t, on) => `<option value="${v}"${on ? " selected" : ""}>${esc(t)}</option>`;
    U.$("#tr-ctl").innerHTML = `
      <div class="an-tabs" role="tablist" aria-label="مصدر البيانات">
        <button type="button" role="tab" data-src="platform" aria-selected="${S.src === "platform"}">بيانات المنصة</button>
        <button type="button" role="tab" data-src="mine" aria-selected="${S.src === "mine"}">بياناتي</button>
      </div>
      <div id="tr-src-platform" ${S.src === "platform" ? "" : "hidden"}>
        <div class="src-opts">
          <label>القضاء <select class="input" id="tr-d">${DIST.map(([id, n]) => opt(id, n, id === S.d)).join("")}</select></label>
          <label>المتغير <select class="input" id="tr-v">${VARS.map((v, i) => opt(i, v[2], i === S.v)).join("")}</select></label>
        </div>
        <p class="src-hint">تصريف GloFAS منذ 2000، والطقس ERA5 منذ 2015، والهواء CAMS منذ آب 2022، والعكورة والكلوروفيل الشهريان من Sentinel-2 منذ 2017. حسب قواعد WMO: الشهر الذي نقصت منه أكثر من 10 أيام أو 5 أيام متتالية يُستبعد، والسنة تُحسب من 12 شهراً صالحاً فقط، فالسنة الجارية والسنة الأولى الناقصة لا تدخلان المتوسط السنوي.</p>
      </div>
      <div id="tr-src-mine" ${S.src === "mine" ? "" : "hidden"}><div id="tr-in"></div></div>
      <div class="src-opts u-mt14">
        <label>التجميع <select class="input" id="tr-agg">${opt("annual", "متوسط سنوي", S.agg === "annual")}${opt("monthly", "متوسط شهري (اختبار موسمي)", S.agg === "monthly")}${opt("raw", "القيم كما هي", S.agg === "raw")}</select></label>
        <label>اختبار Mann–Kendall <select class="input" id="tr-test" ${S.agg === "monthly" ? "disabled" : ""}>${opt("hr", "معدّل للارتباط الذاتي (Hamed & Rao)", S.test === "hr")}${opt("mk", "الأصلي", S.test === "mk")}</select></label>
        <label>مستوى المعنوية <select class="input" id="tr-alpha">${opt("0.05", "0.05", S.alpha === 0.05)}${opt("0.01", "0.01", S.alpha === 0.01)}${opt("0.1", "0.10", S.alpha === 0.1)}</select></label>
        <button type="button" class="btn btn-primary" id="tr-go">${ico("i-spark")}احسب الاتجاه</button>
      </div>`;
    const c = U.$("#tr-ctl");
    c.querySelectorAll("[data-src]").forEach(b => b.onclick = () => { S.src = b.dataset.src; renderControls(); });
    U.$("#tr-d").onchange = e => { S.d = e.target.value; };
    U.$("#tr-v").onchange = e => { S.v = +e.target.value; };
    U.$("#tr-agg").onchange = e => { S.agg = e.target.value; U.$("#tr-test").disabled = S.agg === "monthly"; if (S.series) run(); };
    U.$("#tr-test").onchange = e => { S.test = e.target.value; if (S.series) run(); };
    U.$("#tr-alpha").onchange = e => { S.alpha = +e.target.value; if (S.series) run(); };
    U.$("#tr-go").onclick = async () => {
      if (S.src === "platform") {
        const b = U.$("#tr-go"); b.disabled = true; b.setAttribute("aria-busy", "true");
        try { S.series = await platformSeries(); S.label = `${VARS[S.v][2]} – ${DIST.find(d => d[0] === S.d)[1]}`; S.sel = 0; run(); }
        catch (e) { U.toast("تعذّر جلب البيانات: " + e.message); }
        finally { b.disabled = false; b.removeAttribute("aria-busy"); }
      } else if (S.series) run(); else U.toast("حمّل جدولك أولاً");
    };
    if (S.src === "mine") TB.input(U.$("#tr-in"), {
      id: "tr", placeholder: "التاريخ\tالتوصيلية\tالنترات",
      template: [["التاريخ", "المعيار 1", "المعيار 2"], ["2020-01-15"]], templateName: "قالب-الاتجاه-الزمني.xlsx", templateSheet: "السلسلة",
      onLoad(rows, meta) {
        try { S.series = tableSeries(rows); S.label = meta.label; S.sel = 0; if (S.agg === "monthly" && !S.series.some(s => s.pts.some(p => p.o.m))) S.agg = "annual"; renderControls(); run(); }
        catch (e) { U.$("#tr-out").innerHTML = `<div class="notice warn">${ico("i-warn")}<span>${esc(e.message)}</span></div>`; }
      }
    });
  }

  function run() {
    S.res = S.series.map(s => analyzeSeries(s.name, s.unit, s.pts, s.res));
    if (S.sel >= S.res.length) S.sel = 0;
    render();
  }

  function sentence(r) {
    if (r.err || !r.mk) return "";
    const u = r.unit ? ` ${r.unit}` : "", tr = TREND[r.mk.trend][0];
    const slope = r.sen && isFinite(r.sen.slope) ? `${F(r.sen.slope, 4)}${u} في السنة${isFinite(r.sen.lo) ? ` (فترة ثقة 95%: ${F(r.sen.lo, 4)} إلى ${F(r.sen.hi, 4)})` : ""}` : "—";
    let s = `${r.test === "seasonal" ? "اختبار Kendall الموسمي" : r.test === "hr" ? "اختبار Mann–Kendall المعدّل (Hamed & Rao)" : "اختبار Mann–Kendall"}: ${tr} (Z = ${F(r.mk.z, 2)}، p = ${pf(r.mk.p)}، τ = ${F(r.mk.tau, 3)}). ميل Sen = ${slope}${isFinite(r.pctDecade) ? `، أي ${F(r.pctDecade, 1)}% من المتوسط لكل عقد` : ""}.`;
    if (r.pt) s += r.pt.h ? ` اختبار Pettitt: تغيّر معنوي بعد ${r.pt.label} (K = ${r.pt.K}، p = ${pf(r.pt.p)})؛ ${r.test === "seasonal" ? "متوسط الانحراف عن المعدل الشهري" : "المتوسط"} ${F(r.pt.before, 3)} قبله و${F(r.pt.after, 3)} بعده.` : ` اختبار Pettitt: لا نقطة تغيّر معنوية (p = ${pf(r.pt.p)}).`;
    return s;
  }

  function render() {
    const out = U.$("#tr-out"), R = S.res, r = R[S.sel];
    out.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-chart")}النتائج</h3><span class="sub">${esc(S.label)} · ${S.agg === "annual" ? "متوسطات سنوية" : S.agg === "monthly" ? "متوسطات شهرية" : "القيم كما هي"} · α = ${S.alpha}</span></div>
        <div class="tbl-wrap"><table class="tbl src-tbl"><thead><tr><th>المتغير</th><th>الاتجاه</th><th>p</th><th>ميل Sen / سنة</th><th>فترة الثقة 95%</th><th>% لكل عقد</th><th>Pettitt</th><th>n</th><th>الفترة</th><th>S</th><th>Z</th></tr></thead>
          <tbody>${R.map((x, i) => x.err ? `<tr><td><bdi>${esc(x.name)}</bdi></td><td colspan="10" class="faint">${esc(x.err)}</td></tr>` : `<tr class="tr-row${i === S.sel ? " on" : ""}" data-i="${i}"><td><bdi>${esc(x.name)}</bdi></td><td><span class="chip tone-${TREND[x.mk.trend][1]}">${TREND[x.mk.trend][0]}</span></td><td class="num">${pf(x.mk.p)}</td><td class="num">${F(x.sen && x.sen.slope, 4)}</td><td class="num">${x.sen && isFinite(x.sen.lo) ? `${F(x.sen.lo, 4)} – ${F(x.sen.hi, 4)}` : "—"}</td><td class="num">${F(x.pctDecade, 1)}</td><td>${x.pt ? (x.pt.h ? `<span class="chip tone-warn">بعد ${esc(x.pt.label)}</span>` : `<span class="faint">لا تغيّر</span>`) : "—"}</td><td class="num">${x.n}</td><td class="num">${esc(x.list[0].label)} – ${esc(x.list[x.n - 1].label)}</td><td class="num">${x.mk.s}</td><td class="num">${F(x.mk.z, 2)}</td></tr>`).join("")}</tbody></table></div>
        ${R.length > 1 ? `<p class="src-hint">اضغط أي صف لعرض رسمه وتفسيره.</p>` : ""}
      </section>
      ${r && !r.err ? `<section class="panel">
        <div class="panel-h"><h3>${ico("i-chart")}<bdi>${esc(r.name)}</bdi></h3><span class="sub">${r.unit ? esc(r.unit) : ""}</span></div>
        <div class="chart-box"><canvas id="tr-chart" aria-label="السلسلة الزمنية وخط Sen"></canvas></div>
        <p class="tr-say">${esc(sentence(r))}</p>
        ${r.warn.length || r.skipped.length ? `<div class="notice warn src-warn">${ico("i-warn")}<ul>${r.warn.map(w => `<li>${esc(w)}</li>`).join("")}${r.skipped.length ? `<li>استُبعدت فترات ناقصة: ${esc(r.skipped.slice(0, 12).join("، "))}${r.skipped.length > 12 ? ` و${r.skipped.length - 12} غيرها` : ""}.</li>` : ""}</ul></div>` : ""}
      </section>` : ""}
      <section class="panel">
        <div class="row">
          <button type="button" class="btn btn-primary" id="tr-xlsx">${ico("i-down")}النتائج والسلاسل Excel</button>
          <button type="button" class="btn" id="tr-mar">${ico("i-copy")}فقرة المنهجية بالعربية</button>
          <button type="button" class="btn" id="tr-men">${ico("i-copy")}Methods paragraph (English)</button>
        </div>
      </section>
      <details class="db-method"><summary>${ico("i-book")}المنهجية والمراجع</summary>
        <ul class="qc-ref">
          <li>Mann–Kendall: S = Σ sign(xⱼ − xᵢ)، وتباينه مع تصحيح القيم المتساوية، وZ = (S ∓ 1)/√Var(S)، وp ثنائية الطرف. τ = S / [n(n−1)/2].</li>
          <li>Hamed–Rao: تُزال الاتجاهية بميل Sen، ويُضرب Var(S) في 1 + 2/[n(n−1)(n−2)] Σ(n−k)(n−k−1)(n−k−2)ρₖ لمعاملات الارتباط الذاتي المعنوية لرتب البواقي.</li>
          <li>Kendall الموسمي: S وVar(S) مجموعا قيم كل شهر عبر السنوات، والميل وسيط ميول الأشهر.</li>
          <li>ميل Sen: وسيط (xⱼ − xᵢ)/(tⱼ − tᵢ) على الزمن الفعلي بالسنوات، وفترة الثقة من رتب الميول (Gilbert, 1987).</li>
          <li>Pettitt: Uₖ = 2Σrᵢ − k(n+1)، وK = max|Uₖ|، وp ≈ 2exp(−6K²/(n³+n²)). في التجميع الشهري يُطبّق على الانحراف عن معدل كل شهر.</li>
          <li>Mann, H.B. (1945). Nonparametric tests against trend. Econometrica 13: 245–259.</li>
          <li>Kendall, M.G. (1975). Rank Correlation Methods, 4th ed. Charles Griffin, London.</li>
          <li>Sen, P.K. (1968). Estimates of the regression coefficient based on Kendall's tau. Journal of the American Statistical Association 63: 1379–1389.</li>
          <li>Hirsch, R.M., Slack, J.R., Smith, R.A. (1982). Techniques of trend analysis for monthly water quality data. Water Resources Research 18: 107–121.</li>
          <li>Hamed, K.H., Rao, A.R. (1998). A modified Mann-Kendall trend test for autocorrelated data. Journal of Hydrology 204: 182–196.</li>
          <li>Pettitt, A.N. (1979). A non-parametric approach to the change-point problem. Applied Statistics 28: 126–135.</li>
          <li>Gilbert, R.O. (1987). Statistical Methods for Environmental Pollution Monitoring. Van Nostrand Reinhold, New York.</li>
        </ul>
      </details>`;
    out.querySelectorAll(".tr-row").forEach(tr => tr.onclick = () => { S.sel = +tr.dataset.i; render(); });
    U.$("#tr-xlsx").onclick = exportXlsx;
    U.$("#tr-mar").onclick = () => TB.copy(methodAr());
    U.$("#tr-men").onclick = () => TB.copy(methodEn());
    if (r && !r.err) drawChart(r);
  }

  function drawChart(r) {
    if (S.chart) { try { S.chart.destroy(); } catch (e) { /* */ } S.chart = null; }
    const cv = U.$("#tr-chart"); if (!cv || !window.Chart) return;
    const pts = r.list.map(p => ({ x: p.t, y: p.x }));
    const t0 = r.list[0].t, t1 = r.list[r.n - 1].t;
    const ds = [{ label: r.name, data: pts, borderColor: ECO.COL.river, backgroundColor: ECO.COL.river, pointRadius: r.n > 150 ? 0 : 2.5, borderWidth: 1.6, showLine: true, tension: 0 }];
    if (r.sen && isFinite(r.sen.slope)) ds.push({ label: "خط Sen", data: [{ x: t0, y: r.sen.intercept + r.sen.slope * t0 }, { x: t1, y: r.sen.intercept + r.sen.slope * t1 }], borderColor: ECO.COL.silt, borderDash: [6, 4], pointRadius: 0, borderWidth: 2, showLine: true });
    if (r.pt && r.pt.h) {
      const k = r.pt.loc, tc = (r.list[k - 1].t + r.list[k].t) / 2, ys = r.list.map(p => p.x), lo = Math.min(...ys), hi = Math.max(...ys);
      ds.push({ label: "نقطة التغيّر (Pettitt)", data: [{ x: tc, y: lo }, { x: tc, y: hi }], borderColor: ECO.COL.crimson || "#ef5a64", borderDash: [3, 3], pointRadius: 0, borderWidth: 1.5, showLine: true });
    }
    S.chart = new Chart(cv, { type: "scatter", data: { datasets: ds }, options: { responsive: true, maintainAspectRatio: false, animation: false,
      scales: { x: { type: "linear", ticks: { callback: v => (S.agg === "annual" ? String(Math.round(v)) : v.toFixed(1)) } }, y: { title: { display: !!r.unit, text: r.unit } } },
      plugins: { legend: { position: "bottom", rtl: true, textDirection: "rtl" }, tooltip: { rtl: true, textDirection: "rtl", callbacks: { label: c => `${c.dataset.label}: ${U.fmt(c.parsed.y, 3)}` } } } } });
  }

  function exportXlsx() {
    const r4 = v => (isFinite(v) ? +(+v).toFixed(6) : "");
    const sheets = [{ name: "النتائج", rows: [["المتغير", "n", "البداية", "النهاية", "الاختبار", "S", "Var(S)", "Z", "p", "tau", "الاتجاه", "ميل Sen/سنة", "حد أدنى 95%", "حد أعلى 95%", "% لكل عقد", "Pettitt K", "Pettitt p", "آخر قيمة قبل التغيّر", "المتوسط قبل", "المتوسط بعد"]]
      .concat(S.res.filter(x => !x.err).map(x => [x.name, x.n, x.list[0].label, x.list[x.n - 1].label, x.test === "seasonal" ? "Seasonal Kendall" : x.test === "hr" ? "Hamed-Rao MK" : "Mann-Kendall", x.mk.s, r4(x.mk.varS), r4(x.mk.z), r4(x.mk.p), r4(x.mk.tau), TREND[x.mk.trend][0], r4(x.sen && x.sen.slope), r4(x.sen && x.sen.lo), r4(x.sen && x.sen.hi), r4(x.pctDecade), x.pt ? x.pt.K : "", x.pt ? r4(x.pt.p) : "", x.pt ? x.pt.label : "", x.pt ? r4(x.pt.before) : "", x.pt ? r4(x.pt.after) : ""])) }];
    S.res.filter(x => !x.err).slice(0, 20).forEach((x, i) => sheets.push({ name: `سلسلة ${i + 1}`, rows: [["الفترة", x.name, "عدد القياسات"]].concat(x.list.map(p => [p.label, r4(p.x), p.nObs || 1])) }));
    TB.xlsx(sheets, `الاتجاه-الزمني-${(S.label || "").slice(0, 40).replace(/[^\p{L}\p{N}]+/gu, "-")}.xlsx`);
  }

  function methodAr() {
    const ok = S.res.filter(x => !x.err), seas = S.agg === "monthly";
    return `تحليل الاتجاه الزمني: ${seas ? "جُمّعت القيم إلى متوسطات شهرية وطُبّق اختبار Kendall الموسمي (Hirsch et al., 1982)" : `${S.agg === "annual" ? "جُمّعت القيم إلى متوسطات سنوية، و" : ""}طُبّق اختبار Mann–Kendall اللامعلمي (Mann, 1945; Kendall, 1975)${S.test === "hr" ? " بصيغته المعدّلة لأثر الارتباط الذاتي (Hamed & Rao, 1998)" : ""}`} عند مستوى معنوية ${S.alpha}، وقُدّر مقدار الاتجاه بميل Sen (Sen, 1968)${seas ? "" : " مع فترة ثقة 95% (Gilbert, 1987)"}، وكُشفت نقطة التغيّر باختبار Pettitt (1979)${seas ? " على الانحرافات عن المعدل الشهري" : ""}. ${ok.map(x => `${x.name}: ${sentence(x)}`).join(" ")}`;
  }
  function methodEn() {
    const ok = S.res.filter(x => !x.err), seas = S.agg === "monthly";
    const tr = { increasing: "a significant increasing trend", decreasing: "a significant decreasing trend", none: "no significant trend" };
    return `Trend analysis: ${seas ? "values were aggregated to monthly means and the seasonal Kendall test (Hirsch et al., 1982) was applied" : `${S.agg === "annual" ? "values were aggregated to annual means and " : ""}the non-parametric Mann–Kendall test (Mann, 1945; Kendall, 1975)${S.test === "hr" ? ", modified for serial correlation (Hamed & Rao, 1998)," : ""} was applied`} at a significance level of ${S.alpha}. Trend magnitude was estimated with Sen's slope (Sen, 1968)${seas ? "" : " and its 95% confidence interval (Gilbert, 1987)"}, and change points were detected with the Pettitt test (Pettitt, 1979)${seas ? " applied to deviations from monthly means" : ""}. ${ok.map(x => `${x.name}: ${tr[x.mk.trend]} (Z = ${x.mk.z.toFixed(2)}, p = ${pf(x.mk.p)}; Sen's slope = ${x.sen ? x.sen.slope.toPrecision(3) : "—"}${x.unit ? " " + x.unit : ""} per year${x.pt && x.pt.h ? `; Pettitt change after ${x.pt.label}, p = ${pf(x.pt.p)}` : ""}).`).join(" ")}`;
  }

  ECO.views.trend = { init() { renderControls(); } };
})();
