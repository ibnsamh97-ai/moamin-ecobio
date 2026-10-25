/* =====================================================================
   EcoBio AI — مصادر التلوث
   من جدول العيّنات إلى المصادر المحتملة:
   - تحليل المكوّنات الرئيسة على مصفوفة الارتباط مع تدوير Varimax (Kaiser 1958)
     واختباري KMO (Kaiser 1974) وBartlett (1950)، والتحليل الموازي لعدد المكوّنات (Horn 1965).
   - نسبة مساهمة كل مصدر بنموذج APCS-MLR (Thurston & Spengler 1985).
   - التجميع الهرمي بطريقة Ward (1963) للعيّنات والمتغيرات.
   الحسابات في js/multivar.js، ونتائجها مطابقة لـ NumPy وSciPy.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, TB = ECO.tab, MV = ECO.mv, STT = ECO.stats;
  if (!document.getElementById("view-sources")) return;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const F = (v, d = 2) => (isFinite(v) ? U.fmt(v, d) : "—");
  const F2 = v => (isFinite(v) ? v.toFixed(2) : "—");
  const PAL = ["#4fc8dc", "#e6ae4f", "#93dd8a", "#b493ff", "#ee7a4f", "#f08fb8", "#e8d35a", "#ef5a64", "#a5b6ff", "#c98b5a"];
  const RAW = "https://raw.githubusercontent.com/ibnsamh97-ai/moamin-ecobio/db/api/";
  const QMAX = 400;           // أقصى عدد عيّنات للتجميع الهرمي للعيّنات
  const pfmt = p => (!isFinite(p) ? "—" : p < 0.001 ? "< 0.001" : "= " + p.toFixed(3));
  const pH = p => esc(pfmt(p));

  /* ------------------------------------------------------------------
     التعرّف على المتغيرات من أسماء الأعمدة (لاقتراح المصدر فقط)
  ------------------------------------------------------------------ */
  const KEYS = [
    ["coord", /^\s*(x|y|lat|lon|lng|long|latitude|longitude|easting|northing)\b|خط العرض|خط الطول|إحداثي|احداثي/i],
    ["pm25", /pm\s*2[.,_]?5|pm₂.₅/i], ["pm10", /pm\s*10|pm₁₀/i], ["dust", /dust|غبار/i],
    ["nox", /\bnox\b/i], ["no2", /no2|no₂/i], ["so2", /so2|so₂/i], ["o3", /^\s*o3\b|o₃|ozone|أوزون|اوزون/i],
    ["bc", /black\s*carbon|^\s*bc\b|الكربون الأسود/i],
    ["cd", /^\s*cd\b|cadmium|كادميوم/i], ["pb", /^\s*pb\b|^\s*lead\b|رصاص/i], ["zn", /^\s*zn\b|zinc|زنك|خارصين/i],
    ["cu", /^\s*cu\b|copper|نحاس/i], ["ni", /^\s*ni\b|nickel|نيكل/i], ["cr", /^\s*cr\b|chrom|كروم/i],
    ["cob", /^\s*co\b|cobalt|كوبلت|كوبالت/i], ["fe", /^\s*fe\b|iron|حديد/i], ["mn", /^\s*mn\b|mangan|منغنيز/i],
    ["as", /^\s*as\b|arsenic|زرنيخ/i], ["hg", /^\s*hg\b|mercury|زئبق/i], ["v", /^\s*v\b|vanad|فناديوم/i],
    ["al", /^\s*al\b|alumin|ألمنيوم|المنيوم/i], ["ti", /^\s*ti\b|titan|تيتانيوم/i], ["ba", /^\s*ba\b|barium|باريوم/i],
    ["sb", /^\s*sb\b|antimon|أنتيمون|انتيمون/i],
    ["ec", /^\s*e\.?c\b|conductiv|توصيل|ايصالي|إيصالي/i], ["tds", /\btds\b|الأملاح الذائبة|الاملاح الذائبة|المواد الصلبة الذائبة/i],
    ["na", /^\s*na\b|sodium|صوديوم/i], ["k", /^\s*k\b|potassium|بوتاسيوم/i], ["ca", /^\s*ca\b|calcium|كالسيوم/i],
    ["mg", /^\s*mg\b(?!\s*\/)|magnes|مغنيسيوم|مغنسيوم/i], ["cl", /^\s*cl\b|chlorid|كلوريد/i],
    ["so4", /so4|so₄|sulphate|sulfate|كبريتات/i], ["hco3", /hco3|hco₃|bicarb|بيكاربونات|بيكربونات/i],
    ["alk", /alkalin|القاعدية|القلوية/i], ["th", /hardness|عسرة|العسرة/i],
    ["no3", /no3|no₃|nitrate|نترات/i], ["po4", /po4|po₄|phosphat|فوسفات/i], ["nh4", /nh4|nh₄|nh3|ammon|أمونيا|امونيا|أمونيوم/i],
    ["bod", /\bbod/i], ["cod", /\bcod\b/i], ["do", /^\s*d\.?o\b|dissolved oxygen|الأكسجين المذاب|الاوكسجين المذاب|الأوكسجين المذاب/i],
    ["fc", /colifor|e\.?\s*coli|قولون/i], ["tss", /\btss\b|suspended|العالقة/i], ["turb", /turb|عكور/i],
    ["tph", /\btph\b|hydrocarbon|\boil\b|نفط|هيدروكاربون|زيوت/i], ["om", /^\s*o\.?m\b|organic matter|\bsoc\b|مادة عضوية|المادة العضوية/i],
    ["ph", /^\s*ph\b|الأس الهيدروجيني|الرقم الهيدروجيني/i], ["temp", /temp|حرار/i],
    ["elev", /elev|ارتفاع|منسوب/i], ["dist", /\bdist|مسافة|بعد عن|بُعد عن/i], ["depth", /depth|عمق/i]
  ];
  const AIRK = new Set(["pm25", "pm10", "dust", "no2", "so2", "o3", "nox"]);
  const keyOf = (name, air) => {
    if (air && /^\s*co\b|carbon monoxide|أول أكسيد الكربون|احادي اوكسيد الكاربون/i.test(name)) return "cog";
    const m = KEYS.find(([, re]) => re.test(name));
    return m ? m[0] : null;
  };
  /* متغيرات ليست كتلة تتجمع من مصادر: لا تُحسب لها مساهمات APCS */
  const NONMASS = new Set(["ph", "temp", "elev", "dist", "depth", "coord", "do"]);
  const EXCL = /^\s*(id|no\.?|n|#|رقم|ت|التسلسل|sample|sample\s*id|العينة|العيّنة|year|month|day|hours?|السنة|الشهر|اليوم|الساعات)\s*$/i;

  /* بصمات المصادر الشائعة في الأدبيات: اقتراح يحتاج تثبيتاً بمعرفة الموقع */
  const RULES = [
    { ctx: "air", set: ["dust", "pm10", "pm25", "al", "fe", "ti"], any: ["dust", "pm10"], min: 2, t: "غبار معدني: العواصف الترابية وإثارة التربة", why: "الجسيمات الخشنة والغبار ترتفع معاً حين يكون مصدرها التربة والصحراء." },
    { ctx: "air", set: ["so2", "no2", "v", "ni", "pm25"], any: ["so2"], min: 1, t: "حرق وقود عالي الكبريت: مصافٍ ومحطات كهرباء ومعامل", why: "SO₂ ينبعث أساساً من حرق النفط الأسود والوقود الثقيل، ويرافقه NO₂ من الاحتراق نفسه." },
    { ctx: "air", set: ["no2", "nox", "cog", "bc", "pm25"], min: 2, t: "احتراق: عوادم المركبات والمولدات والحرق المكشوف", why: "NO₂ وCO والكربون الأسود نواتج احتراق، وأقربها للتنفس عوادم المرور والمولدات." },
    { ctx: "air", set: ["o3"], any: ["o3"], min: 1, t: "تكوّن ثانوي بالتفاعلات الضوئية (الأوزون)", why: "الأوزون لا ينبعث من مدخنة؛ يتكوّن في الجو من أكاسيد النتروجين والمركبات العضوية بأشعة الشمس." },
    { set: ["cr", "ni", "cob", "fe", "mn", "v", "al", "ti"], min: 2, t: "مصدر طبيعي: الصخر الأم وتجوية التربة", why: "Cr وNi وCo وFe وMn تتبع غالباً تركيب الصخور والمعادن الطينية (Micó et al., 2006)." },
    { set: ["pb", "zn", "cu", "cd", "sb", "ba", "hg"], min: 2, t: "نشاط بشري: مرور وصناعة ومخلفات حضرية", why: "Pb وZn وCu وCd ترتبط بالمرور (الإطارات والمكابح والوقود القديم) والصناعة والنفايات (Micó et al., 2006)." },
    { set: ["cd", "as", "po4", "no3", "k"], any: ["cd", "as"], min: 2, t: "أنشطة زراعية: أسمدة فوسفاتية ومبيدات", why: "الأسمدة الفوسفاتية تحمل الكادميوم، وبعض المبيدات تحمل الزرنيخ." },
    { set: ["ec", "tds", "na", "cl", "so4", "k", "mg", "ca", "th"], min: 3, t: "ملوحة: ذوبان الصخور الملحية والجبسية والتبخر ومياه البزل", why: "الأيونات الرئيسة والتوصيلية تتحرك معاً حين يكون مصدرها ذوبان المعادن (Vega et al., 1998)." },
    { set: ["ca", "mg", "hco3", "alk", "th"], any: ["hco3", "alk"], min: 2, t: "تجوية الصخور الكربونية", why: "الكالسيوم والمغنيسيوم والبيكاربونات تأتي معاً من ذوبان الكلس والدولومايت." },
    { set: ["bod", "cod", "nh4", "po4", "fc", "tss", "turb"], min: 2, t: "مياه صرف عضوية: منزلية أو مخلفات غذائية وحيوانية", why: "BOD وCOD والأمونيا والقولونيات مؤشرات الحمل العضوي (Vega et al., 1998)." },
    { set: ["no3", "po4", "k", "nh4"], min: 2, t: "جريان زراعي محمّل بالأسمدة", why: "النترات والفوسفات والبوتاسيوم المكونات الرئيسة للأسمدة." },
    { set: ["tph", "cod", "so4", "pb", "v", "ni"], any: ["tph"], min: 1, t: "مخلفات نفطية", why: "الهيدروكاربونات النفطية ترفع COD، وتحمل الفناديوم والنيكل." },
    { set: ["turb", "tss", "fe", "al", "mn"], min: 2, t: "تعرية وجريان سطحي يحمل الدقائق العالقة", why: "العكورة والمواد العالقة ترتفع مع Fe وAl وMn المرتبطة بالطين." },
    { set: ["temp"], any: ["temp"], min: 1, t: "عامل موسمي فيزيائي (الحرارة)", why: "مكوّن تقوده الحرارة يعكس الفصول أكثر مما يعكس مصدراً ملوِّثاً." }
  ];

  function interpret(L, keys, j, air) {
    const strong = [], mod = [], neg = [];
    L.forEach((r, i) => { const v = r[j]; if (v >= 0.75) strong.push(i); else if (v >= 0.5) mod.push(i); else if (v <= -0.5) neg.push(i); });
    const pos = strong.concat(mod).map(i => keys[i]).filter(Boolean), ng = neg.map(i => keys[i]).filter(Boolean);
    let best = null;
    RULES.forEach(R => {
      if (R.ctx === "air" && !air) return;
      if (R.any && !R.any.some(k => pos.includes(k))) return;
      const m = R.set.filter(k => pos.includes(k)).length;
      if (m < R.min) return;
      if (!best || m > best.m || (m === best.m && m / R.set.length > best.m / best.R.set.length)) best = { R, m };
    });
    const extra = [];
    if (ng.includes("dist") || ng.includes("elev")) extra.push("ويقلّ بالابتعاد عن النهر وبارتفاع الأرض: علامة الترسّب من مياه الفيضان.");
    if (ng.includes("o3") && pos.some(k => ["no2", "nox", "cog", "so2"].includes(k))) extra.push("ويقلّ معه الأوزون: أكسيد النتريك المنبعث من الاحتراق يستهلك الأوزون قرب المصدر.");
    if (ng.includes("do") && pos.some(k => ["bod", "cod", "nh4", "temp", "fc"].includes(k))) extra.push("ويقلّ معه الأكسجين المذاب: يُستهلك بالتحلل العضوي أو يقلّ ذوبانه بارتفاع الحرارة.");
    if (air && pos.includes("dust") && ng.includes("cog")) extra.push("ويتعاكس مع CO: قد يعكس الموسمية (الغبار في الفصل الحار، وتراكم CO مع الانقلاب الحراري شتاءً).");
    return { strong, mod, neg, rule: best && best.R, extra };
  }

  /* ------------------------------------------------------------------
     الحالة
  ------------------------------------------------------------------ */
  const S = { head: null, body: null, cols: [], sel: new Set(), idCol: -1, tgt: -1, k: 0, log: false, label: "", demo: null, air: false, res: null, hk: 3, htab: "vars" };

  function load(rows, meta) {
    const head = rows[0].map((h, j) => String(h == null ? "" : h).trim() || `عمود ${j + 1}`);
    const body = rows.slice(1).filter(r => r.some(x => String(x == null ? "" : x).trim() !== ""));
    const cols = head.map((name, j) => {
      let num = 0, nd = 0, txt = 0;
      body.forEach(r => { const raw = r[j], c = TB.cell(raw); if (c) { if (c.below) nd++; else num++; } else if (String(raw == null ? "" : raw).trim()) txt++; });
      return { j, name, num, nd, txt, numeric: num >= 3 && txt <= Math.max(1, 0.05 * body.length) };
    });
    S.head = head; S.body = body; S.cols = cols;
    S.air = cols.some(c => c.numeric && AIRK.has(keyOf(c.name, false)));
    cols.forEach(c => { c.key = keyOf(c.name, S.air); });
    const idc = cols.find(c => !c.numeric && c.txt >= 0.5 * body.length);
    S.idCol = idc ? idc.j : -1;
    const d = meta.demo || null, want = d && d.vars;
    S.sel = new Set(cols.filter(c => c.numeric && (want ? want.includes(c.name) : !EXCL.test(c.name) && c.key !== "coord")).map(c => c.j));
    S.tgt = d && d.target ? (cols.find(c => c.name === d.target) || { j: -1 }).j : -1;
    if (S.tgt >= 0) S.sel.delete(S.tgt);
    Object.assign(S, { k: 0, log: false, res: null, hk: 3, htab: "vars", demo: d, label: d ? d.cite : meta.label });
    renderCfg();
    analyze();
    U.$("#src-cfg").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
  }

  /* مصفوفة التحليل: حذف العيّنات الناقصة، وتعويض «أقل من حد الكشف» بنصف الحد */
  function build() {
    const vars = [...S.sel].filter(j => j !== S.tgt).sort((a, b) => a - b);
    if (vars.length < 3) return { err: "اختر ثلاثة متغيرات رقمية على الأقل." };
    const val = raw => { const c = TB.cell(raw); if (!c) return [NaN, 0]; if (c.below) return isFinite(c.v) && c.v > 0 ? [c.v / 2, 1] : [NaN, 0]; return [c.v, 0]; };
    let X = [], Y = [], ids = [], nd = vars.map(() => 0), ndT = 0;
    S.body.forEach((r, ri) => {
      const vv = vars.map(j => val(r[j]));
      const yy = S.tgt >= 0 ? val(r[S.tgt]) : null;
      if (!vv.every(x => isFinite(x[0])) || (yy && !isFinite(yy[0]))) return;
      X.push(vv.map(x => x[0])); vv.forEach((x, i) => { nd[i] += x[1]; });
      if (yy) { Y.push(yy[0]); ndT += yy[1]; }
      ids.push(S.idCol >= 0 ? String(r[S.idCol] == null ? "" : r[S.idCol]).trim() || `#${ri + 1}` : String(ri + 1));
    });
    let names = vars.map(j => S.head[j]), keys = vars.map(j => S.cols[j].key);
    const dropped = S.body.length - X.length;
    /* متغيرات ثابتة القيمة لا تدخل الارتباط */
    const constant = [];
    if (X.length) {
      const keep = names.map((_, i) => { const a = X.map(r => r[i]), m = a.reduce((s, v) => s + v, 0) / a.length; return a.some(v => Math.abs(v - m) > 1e-12 * Math.max(1, Math.abs(m))); });
      keep.forEach((k, i) => { if (!k) constant.push(names[i]); });
      if (constant.length) { const f = (a) => a.filter((_, i) => keep[i]); X = X.map(f); names = f(names); keys = f(keys); nd = f(nd); }
    }
    const n = X.length, p = names.length;
    if (p < 3) return { err: `بقي أقل من ثلاثة متغيرات صالحة${constant.length ? ` بعد استبعاد المتغيرات ثابتة القيمة (${constant.map(esc).join("، ")})` : ""}.` };
    if (n < Math.max(5, p + 2)) return { err: `عدد العيّنات الكاملة (${n}) أقل من المطلوب لهذا العدد من المتغيرات: تحتاج ${Math.max(5, p + 2)} عيّنات على الأقل، ويُفضّل 50 فأكثر.` };
    if (S.log) {
      const bad = names.filter((_, i) => X.some(r => !(r[i] > 0)));
      if (bad.length) return { err: `التحويل اللوغاريتمي يحتاج قيماً موجبة؛ في ${bad.map(x => `<bdi>${esc(x)}</bdi>`).join("، ")} أصفار أو قيم سالبة. ألغِ التحويل أو أزل هذه المتغيرات.` };
    }
    return { X, Y: S.tgt >= 0 ? Y : null, ids, names, keys, nd, ndT, dropped, constant, total: S.body.length, tName: S.tgt >= 0 ? S.head[S.tgt] : null, tKey: S.tgt >= 0 ? S.cols[S.tgt].key : null };
  }

  const rP = (r, n) => { if (Math.abs(r) >= 1) return 0; const t = r * Math.sqrt((n - 2) / (1 - r * r)); return STT.pT2(Math.abs(t), n - 2); };
  const skew = a => { const n = a.length, m = a.reduce((s, v) => s + v, 0) / n; let m2 = 0, m3 = 0; a.forEach(v => { m2 += (v - m) ** 2; m3 += (v - m) ** 3; }); m2 /= n; m3 /= n; return m2 > 0 ? m3 / m2 ** 1.5 : 0; };

  let runT = 0;
  function analyze() {
    const out = U.$("#src-out");
    if (S.res) out.classList.add("is-busy"); else out.innerHTML = `<p class="faint src-busy">جارٍ التحليل…</p>`;
    clearTimeout(runT);
    runT = setTimeout(() => { try { run(); } catch (e) { S.res = null; out.innerHTML = `<div class="notice warn">${ico("i-warn")}<span>تعذّر التحليل: ${esc(e.message)}</span></div>`; } out.classList.remove("is-busy"); }, 30);
  }
  function run() {
    const out = U.$("#src-out");
    const D = build();
    if (D.err) { S.res = null; out.innerHTML = `<div class="notice warn">${ico("i-warn")}<span>${D.err}</span></div>`; return; }
    const Xp = S.log ? D.X.map(r => r.map(v => Math.log10(v))) : D.X;
    const n = Xp.length, p = Xp[0].length;
    const R = MV.apcsMlr(Xp, { k: S.k ? Math.min(S.k, p) : null, targets: !S.log && D.Y ? [D.Y] : [] });
    const pa = MV.parallel(n, p);
    const Z = MV.standardize(Xp).Z;
    const linkV = MV.ward(Z[0].map((_, j) => Z.map(r => r[j])));
    const linkS = n <= QMAX ? MV.ward(Z) : null;
    const rp = R.R.map((row, i) => row.map((r, j) => (i === j ? 0 : rP(r, n))));
    const sk = D.names.map((_, i) => skew(D.X.map(r => r[i])));
    S.hk = Math.max(2, Math.min(S.hk, Math.min(8, n - 1)));
    S.res = { D, R, pa, Z, linkV, linkS, rp, sk, n, p };
    render();
  }

  /* ------------------------------------------------------------------
     لوحة الإعدادات
  ------------------------------------------------------------------ */
  function renderCfg() {
    const host = U.$("#src-cfg"), num = S.cols.filter(c => c.numeric);
    const opt = (v, t, on) => `<option value="${v}"${on ? " selected" : ""}>${esc(t)}</option>`;
    host.innerHTML = `<section class="panel">
      <div class="panel-h"><h3><span class="pl-step">2</span>المتغيرات وإعدادات التحليل</h3><span class="sub">${esc(S.label)} · ${S.body.length} عيّنة</span></div>
      <p class="src-hint">المتغيرات المؤشّرة تدخل التحليل. استبعد الإحداثيات والأرقام التسلسلية، ولا تُدخل متغيرين يقيسان الشيء نفسه (مثل EC وTDS معاً) لأنهما يجعلان مصفوفة الارتباط شبه منفردة.</p>
      <div class="src-vars" role="group" aria-label="المتغيرات">
        ${num.map(c => `<label class="src-var${c.j === S.tgt ? " is-tgt" : ""}"><input type="checkbox" data-v="${c.j}"${S.sel.has(c.j) ? " checked" : ""}${c.j === S.tgt ? " disabled" : ""}><bdi>${esc(c.name)}</bdi><small>${c.num}${c.nd ? ` · ${c.nd} دون الحد` : ""}</small></label>`).join("")}
      </div>
      <div class="src-opts">
        <label>اسم العيّنة <select class="input" id="src-id">${opt(-1, "رقم الصف", S.idCol < 0)}${S.cols.filter(c => !c.numeric).map(c => opt(c.j, c.name, c.j === S.idCol)).join("")}</select></label>
        <label>كتلة كلية تُوزَّع على المصادر (اختياري) <select class="input" id="src-tgt">${opt(-1, "بدون", S.tgt < 0)}${num.map(c => opt(c.j, c.name, c.j === S.tgt)).join("")}</select></label>
        <label>عدد المصادر <select class="input" id="src-k">${opt(0, "تلقائي: القيم الذاتية > 1", !S.k)}${Array.from({ length: Math.max(0, Math.min(10, S.sel.size)) }, (_, i) => opt(i + 1, String(i + 1), S.k === i + 1)).join("")}</select></label>
        <label class="src-chk"><input type="checkbox" id="src-log"${S.log ? " checked" : ""}> تحويل لوغاريتمي log₁₀ للبيانات الملتوية</label>
      </div>
    </section>`;
    const rerun = U.debounce(() => { renderCfgCounts(); analyze(); }, 250);
    host.querySelectorAll("[data-v]").forEach(cb => cb.onchange = () => { const j = +cb.dataset.v; if (cb.checked) S.sel.add(j); else S.sel.delete(j); rerun(); });
    U.$("#src-id").onchange = e => { S.idCol = +e.target.value; analyze(); };
    U.$("#src-tgt").onchange = e => { S.tgt = +e.target.value; if (S.tgt >= 0) S.sel.delete(S.tgt); renderCfg(); analyze(); };
    U.$("#src-k").onchange = e => { S.k = +e.target.value; analyze(); };
    U.$("#src-log").onchange = e => { S.log = e.target.checked; analyze(); };
  }
  function renderCfgCounts() {
    const sel = U.$("#src-k"); if (!sel) return;
    const cur = S.k, m = Math.min(10, S.sel.size);
    sel.innerHTML = `<option value="0"${!cur ? " selected" : ""}>تلقائي: القيم الذاتية &gt; 1</option>` + Array.from({ length: m }, (_, i) => `<option value="${i + 1}"${cur === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("");
    if (cur > m) S.k = 0;
  }

  /* ------------------------------------------------------------------
     الرسوم
  ------------------------------------------------------------------ */
  const nice = x => { const e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };

  function scree(ev, pa, k) {
    const W = 560, H = 230, l = 40, r = 14, t = 12, b = 32, p = ev.length;
    const ymax = Math.max(...ev, ...(pa ? pa.p95 : []), 1.2) * 1.08, step = nice(ymax / 4);
    const X = i => l + (p === 1 ? (W - l - r) / 2 : (i * (W - l - r)) / (p - 1)), Y = v => t + (H - t - b) * (1 - v / ymax);
    let g = "";
    for (let v = 0; v <= ymax + 1e-9; v += step) g += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" class="src-grid"/><text x="${l - 6}" y="${Y(v) + 4}" class="src-ax" text-anchor="end">${+v.toFixed(2)}</text>`;
    const every = p > 24 ? 3 : p > 14 ? 2 : 1;
    ev.forEach((_, i) => { if (i % every === 0) g += `<text x="${X(i)}" y="${H - b + 18}" class="src-ax" text-anchor="middle">${i + 1}</text>`; });
    const line = a => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    g += `<line x1="${l}" x2="${W - r}" y1="${Y(1)}" y2="${Y(1)}" class="src-kaiser"/>`;
    if (pa) g += `<path d="${line(pa.p95)}" class="src-pa"/>`;
    g += `<path d="${line(ev)}" class="src-ev"/>`;
    ev.forEach((v, i) => { g += `<circle cx="${X(i)}" cy="${Y(v)}" r="${i < k ? 4.5 : 3.5}" class="${i < k ? "src-dot on" : "src-dot"}"><title>المكوّن ${i + 1}: ${v.toFixed(3)}</title></circle>`; });
    return `<svg class="src-svg" viewBox="0 0 ${W} ${H}" dir="ltr" role="img" aria-label="منحنى القيم الذاتية (Scree plot)">${g}</svg>
      <div class="src-leg"><span><i class="sw sw-ev"></i>القيمة الذاتية</span><span><i class="sw sw-k"></i>حد Kaiser = 1</span>${pa ? `<span><i class="sw sw-pa"></i>المئين 95 لبيانات عشوائية (التحليل الموازي)</span>` : ""}</div>`;
  }

  /* أشرطة مساهمة متباعدة: الموجب يميناً من الصفر والسالب يساراً */
  function bars(rows, k) {
    let lo = 0, hi = 100;
    rows.forEach(r => { let pos = 0, neg = 0; r.parts.forEach(v => { if (v > 0) pos += v; else neg += v; }); hi = Math.max(hi, pos); lo = Math.min(lo, neg); });
    const span = hi - lo, x = v => ((v - lo) / span) * 100, zero = x(0);
    const col = i => (i < k ? PAL[i % PAL.length] : "var(--faint)");
    const ticks = []; const st = nice(span / 4); for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) ticks.push(v);
    return `<div class="src-bars">
      ${rows.map(r => {
        let pp = 0, nn = 0;
        const seg = r.parts.map((v, i) => {
          if (!isFinite(v) || Math.abs(v) < 0.05) return "";
          const a = v > 0 ? pp : nn + v; if (v > 0) pp += v; else nn += v;
          return `<i style="left:${x(a).toFixed(2)}%;width:${((Math.abs(v) / span) * 100).toFixed(2)}%;background:${col(i)}"${i >= k ? ' class="un"' : ""} title="${i < k ? `المصدر ${i + 1}` : "غير مفسَّر"}: ${v.toFixed(1)}%"></i>`;
        }).join("");
        return `<div class="src-bar${r.flag ? " flag" : ""}"><span class="lbl"><bdi>${esc(r.name)}</bdi></span><span class="trk" dir="ltr"><b style="left:${zero.toFixed(2)}%"></b>${seg}</span></div>`;
      }).join("")}
      <div class="src-bar src-bar-ax"><span class="lbl"></span><span class="trk" dir="ltr">${ticks.map(v => `<em style="left:${x(v).toFixed(2)}%">${+v.toFixed(0)}%</em>`).join("")}</span></div>
    </div>`;
  }

  /* شجرة التجميع (Dendrogram) أفقية: الأوراق يميناً */
  function dendro(link, labels, groups) {
    const n = labels.length; if (n < 2) return "";
    const order = MV.leafOrder(link, n), pos = new Array(n);
    order.forEach((leaf, i) => { pos[leaf] = i; });
    const rowH = n <= 40 ? 22 : Math.max(4, Math.min(14, 1200 / n)), showLbl = rowH >= 10;
    const W = 640, lab = showLbl ? 150 : 24, l = 12, t = 10, H = t * 2 + rowH * n + 22;
    const hmax = link[link.length - 1][2] || 1, X = h => W - lab - ((W - lab - l) * h) / hmax, Y = i => t + rowH * (i + 0.5);
    const ny = new Array(2 * n - 1), nh = new Array(2 * n - 1).fill(0), ng = new Array(2 * n - 1);
    for (let i = 0; i < n; i++) { ny[i] = Y(pos[i]); ng[i] = groups ? groups[i] : -1; }
    let g = "";
    const st = nice(hmax / 4);
    for (let v = 0; v <= hmax + 1e-9; v += st) g += `<line x1="${X(v)}" x2="${X(v)}" y1="${t}" y2="${H - 22}" class="src-grid"/><text x="${X(v)}" y="${H - 6}" class="src-ax" text-anchor="middle">${+v.toFixed(v < 10 ? 1 : 0)}</text>`;
    link.forEach((m, s) => {
      const [a, b, h] = m, id = n + s;
      ny[id] = (ny[a] + ny[b]) / 2; nh[id] = h; ng[id] = ng[a] === ng[b] ? ng[a] : -1;
      const c = ng[id] >= 0 ? PAL[ng[id] % PAL.length] : "var(--muted)";
      const ca = ng[a] >= 0 ? PAL[ng[a] % PAL.length] : "var(--muted)", cb = ng[b] >= 0 ? PAL[ng[b] % PAL.length] : "var(--muted)";
      g += `<path d="M${X(nh[a]).toFixed(1)},${ny[a].toFixed(1)}H${X(h).toFixed(1)}" stroke="${ca}" class="src-br"/><path d="M${X(nh[b]).toFixed(1)},${ny[b].toFixed(1)}H${X(h).toFixed(1)}" stroke="${cb}" class="src-br"/><path d="M${X(h).toFixed(1)},${ny[a].toFixed(1)}V${ny[b].toFixed(1)}" stroke="${c}" class="src-br"/>`;
    });
    if (groups) {
      const kk = Math.max(...groups) + 1;
      if (kk > 1 && kk <= n - 1) { const hc = (link[n - kk - 1][2] + link[n - kk][2]) / 2; g += `<line x1="${X(hc)}" x2="${X(hc)}" y1="${t - 4}" y2="${H - 22}" class="src-cut"/>`; }
    }
    order.forEach((leaf, i) => {
      if (showLbl) g += `<text x="${W - lab + 6}" y="${Y(i) + 4}" class="src-lf"${groups ? ` fill="${PAL[groups[leaf] % PAL.length]}"` : ""}>${esc(String(labels[leaf]).slice(0, 22))}</text>`;
      else if (groups) g += `<rect x="${W - lab + 4}" y="${Y(i) - rowH / 2}" width="12" height="${rowH}" fill="${PAL[groups[leaf] % PAL.length]}"/>`;
    });
    return `<div class="src-dendro"><svg viewBox="0 0 ${W} ${H}" dir="ltr" role="img" aria-label="شجرة التجميع الهرمي بطريقة Ward" style="min-height:${Math.min(H, 260)}px">${g}</svg></div>`;
  }

  /* خلايا ملوّنة حسب القيمة: الموجب أزرق والسالب برتقالي */
  const heat = (v, strongAt = 0.75) => {
    if (!isFinite(v)) return `<td class="num">—</td>`;
    const a = Math.min(1, Math.abs(v)), bg = v >= 0 ? `rgba(79,200,220,${(a * 0.5).toFixed(3)})` : `rgba(238,122,79,${(a * 0.5).toFixed(3)})`;
    const cls = Math.abs(v) >= strongAt ? "s" : Math.abs(v) >= 0.5 ? "m" : Math.abs(v) < 0.3 ? "w" : "";
    return `<td class="num src-h ${cls}" style="background:${bg}">${v.toFixed(2)}</td>`;
  };

  /* ------------------------------------------------------------------
     العرض
  ------------------------------------------------------------------ */
  function render() {
    const { D, R, pa, n, p, rp, sk } = S.res, k = R.k, out = U.$("#src-out");
    const ev = R.eig.values, pct = ev.map(v => (100 * v) / p), cumAt = i => pct.slice(0, i + 1).reduce((a, b) => a + b, 0);
    const rotCum = R.pctRot.reduce((a, b) => a + b, 0);
    let paK = 0; while (paK < p && ev[paK] > pa.p95[paK]) paK++;
    const kmo = R.kmo, bt = R.bartlett, air = S.air;
    const tone = kmo ? (kmo.kmo >= 0.7 ? "good" : kmo.kmo >= 0.6 ? "fair" : kmo.kmo >= 0.5 ? "warn" : "bad") : "bad";
    const names = D.names, keys = D.keys;
    const comp = Array.from({ length: k }, (_, j) => interpret(R.L, keys, j, air));

    /* تحذيرات */
    const W = [];
    if (D.dropped) W.push(`حُذفت ${D.dropped} عيّنة من ${D.total} لنقص قيمة واحدة على الأقل في المتغيرات المختارة (الحذف الكامل للحالة).`);
    if (D.constant.length) W.push(`استُبعدت متغيرات ثابتة القيمة: ${D.constant.map(x => `<bdi>${esc(x)}</bdi>`).join("، ")}.`);
    if (n < 50 || n < 5 * p) W.push(`حجم العيّنة (${n} عيّنة لـ ${p} متغيرات) أقل من الموصى به للتحليل العاملي: 50 عيّنة فأكثر و5 عيّنات لكل متغير على الأقل (Hair et al., 2010). اعرض النتائج بوصفها استكشافية.`);
    const ndHi = names.map((x, i) => [x, D.nd[i] / n]).filter(([, f]) => f > 0.15);
    if (ndHi.length) W.push(`أكثر من 15% من قيم ${ndHi.map(([x, f]) => `<bdi>${esc(x)}</bdi> (${Math.round(f * 100)}%)`).join("، ")} دون حد الكشف؛ تعويضها بنصف الحد يشوّه الارتباطات عند هذه النسبة (US EPA QA/G-9). فكّر باستبعاد هذا المتغير.`);
    if (!kmo) W.push("مصفوفة الارتباط منفردة أو شبه منفردة (متغيرات مكررة أو مجموع متغيرات أخرى، مثل EC وTDS، أو عيّنات أقل من المتغيرات)؛ لذلك لا يُحسب KMO ولا اختبار Bartlett. احذف أحد المتغيرين المتطابقين.");
    else if (kmo.kmo < 0.5) W.push(`KMO = ${F2(kmo.kmo)} أقل من 0.5: الارتباطات الجزئية كبيرة والبيانات غير ملائمة للتحليل العاملي (Kaiser, 1974).`);
    if (kmo) { const low = names.filter((_, i) => kmo.msa[i] < 0.5); if (low.length) W.push(`كفاية العيّنة لكل متغير (MSA) أقل من 0.5 في: ${low.map(x => `<bdi>${esc(x)}</bdi>`).join("، ")}. حذف المتغير الأدنى ثم إعادة التحليل يرفع KMO غالباً.`); }
    if (bt && bt.p >= 0.05) W.push(`اختبار Bartlett غير معنوي (p ${pH(bt.p)}): المتغيرات غير مترابطة بما يكفي لاستخراج مكوّنات.`);
    if (paK !== k) W.push(`التحليل الموازي (Horn, 1965) يقترح ${paK} ${paK === 1 ? "مكوّناً" : "مكوّنات"} تتجاوز ما تنتجه بيانات عشوائية بالحجم نفسه، والمستبقى ${k}. ${paK < k ? "المكوّنات الأخيرة قد تكون ضجيجاً." : "قد يكون معيار Kaiser متحفظاً هنا."} غيّر «عدد المصادر» للمقارنة.`);
    const lowC = names.filter((_, i) => R.comm[i] < 0.5);
    if (lowC.length) W.push(`الشيوع (h²) أقل من 0.5 في ${lowC.map(x => `<bdi>${esc(x)}</bdi>`).join("، ")}: المكوّنات المستبقاة لا تمثّل هذه المتغيرات جيداً.`);
    if (!S.log) { const hs = names.filter((_, i) => Math.abs(sk[i]) > 2); if (hs.length) W.push(`توزيع ${hs.map(x => `<bdi>${esc(x)}</bdi>`).join("، ")} ملتوٍ بشدة (معامل الالتواء > 2)؛ القيم المتطرفة قد تسيطر على الارتباطات. جرّب التحويل اللوغاريتمي في PCA (Reimann et al., 2008)، مع العلم أنه يوقف حساب نسب المساهمة.`); }

    /* مساهمات APCS-MLR */
    let apcsHTML = "";
    if (S.log) apcsHTML = `<div class="notice">${ico("i-warn")}<span>نسب المساهمة بـ APCS-MLR تفترض أن التراكيز تُجمع خطياً من المصادر، وهذا لا يصح بعد التحويل اللوغاريتمي؛ ألغِ التحويل لحسابها.</span></div>`;
    else {
      const rowsC = [];
      if (D.tName && R.targets[0]) rowsC.push({ name: D.tName, m: R.targets[0], tgt: true, key: D.tKey });
      names.forEach((x, i) => { if (!NONMASS.has(keys[i])) rowsC.push({ name: x, m: R.mlr[i], key: keys[i] }); });
      rowsC.forEach(r => {
        const f = [];
        if (!r.m) { r.flag = true; r.note = "تعذّر الانحدار"; return; }
        if (r.m.pct.some(v => v < -5)) f.push("مساهمة سالبة");
        if (r.m.pct.some(v => v > 105)) f.push("مساهمة أكبر من 100%");
        if (Math.abs(r.m.pctUnexp) > 30) f.push(r.m.pctUnexp < 0 ? "ثابت سالب كبير" : "جزء كبير غير مفسَّر");
        if (r.m.r2 < 0.5) f.push("R² أقل من 0.5");
        r.flag = f.length > 0; r.note = f.join("، ");
      });
      const nFlag = rowsC.filter(r => r.flag).length;
      apcsHTML = rowsC.length ? `
        <div class="tbl-wrap"><table class="tbl src-tbl"><thead><tr><th>المتغير</th><th>R²</th><th>المتوسط</th>${Array.from({ length: k }, (_, j) => `<th><i class="dot" style="background:${PAL[j % PAL.length]}"></i>المصدر ${j + 1}</th>`).join("")}<th>غير مفسَّر</th><th>ملاحظة</th></tr></thead>
          <tbody>${rowsC.map(r => `<tr class="${r.tgt ? "src-tgt" : ""}${r.flag ? " src-flag" : ""}"><td><bdi>${esc(r.name)}</bdi>${r.tgt ? ' <span class="chip tone-none">الكتلة الكلية</span>' : ""}</td>
            ${r.m ? `<td class="num">${F2(r.m.r2)}</td><td class="num">${F(r.m.mean, "auto")}</td>${r.m.pct.map(v => `<td class="num${v < -5 ? " neg" : ""}">${v.toFixed(1)}%</td>`).join("")}<td class="num">${r.m.pctUnexp.toFixed(1)}%</td>` : `<td colspan="${k + 3}">—</td>`}
            <td class="src-note">${r.flag ? ico("i-warn") + esc(r.note) : ""}</td></tr>`).join("")}</tbody></table></div>
        ${bars(rowsC.filter(r => r.m).map(r => ({ name: r.name, parts: r.m.pct.concat([r.m.pctUnexp]), flag: r.flag })), k)}
        <div class="src-leg">${Array.from({ length: k }, (_, j) => `<span><i class="sw" style="background:${PAL[j % PAL.length]}"></i>المصدر ${j + 1}</span>`).join("")}<span><i class="sw sw-un"></i>غير مفسَّر (ثابت الانحدار)</span></div>
        ${nFlag ? `<div class="notice warn">${ico("i-warn")}<span>في ${nFlag} من ${rowsC.length} متغيرات مساهمات سالبة أو أكبر من 100% أو ثابت كبير. هذا معروف في APCS-MLR حين تتعاكس المتغيرات (مثل الغبار وCO، أو الأوزون وNO₂) أو تكون العلاقة غير خطية قرب الصفر. لا تحذف الإشارة السالبة ولا تعِد توزيع النسب يدوياً؛ اذكرها كما هي، أو استبعد المتغيرات المتعاكسة غير المنبعثة (الأوزون، الحرارة، الأكسجين)، أو جرّب عدداً آخر من المصادر، ويبقى EPA PMF 5.0 الأداة المرجعية لتوزيع موجب مقيّد.</span></div>` : `<p class="ok">${ico("i-check")}كل المساهمات موجبة ومعقولة، والنموذج يفسّر ${F2(Math.min(...rowsC.filter(r => r.m).map(r => r.m.r2)))} من التباين على الأقل.</p>`}` : `<p class="faint">لا توجد متغيرات تركيز لحساب مساهماتها (الأس الهيدروجيني والحرارة والارتفاع والمسافة لا تُوزَّع على مصادر).</p>`;
    }

    /* جدول التجميع للعيّنات */
    let hcaHTML = "";
    if (S.htab === "samples") {
      if (!S.res.linkS) hcaHTML = `<div class="notice">${ico("i-warn")}<span>عدد العيّنات (${n}) أكبر من ${QMAX}؛ شجرة العيّنات لا تُقرأ بهذا الحجم. جمّع العيّنات أولاً (متوسط لكل محطة أو شهر) أو استعمل شجرة المتغيرات.</span></div>`;
      else {
        const lab = MV.cutTree(S.res.linkS, n, S.hk);
        const gm = Array.from({ length: S.hk }, (_, c) => { const idx = lab.map((g, i) => (g === c ? i : -1)).filter(i => i >= 0); return { idx, mean: names.map((_, v) => idx.reduce((s, i) => s + D.X[i][v], 0) / idx.length) }; });
        S.res.lab = lab;
        hcaHTML = `<div class="src-hk"><label>عدد المجاميع <select class="input" id="src-hk">${Array.from({ length: Math.min(8, n - 1) - 1 }, (_, i) => `<option value="${i + 2}"${S.hk === i + 2 ? " selected" : ""}>${i + 2}</option>`).join("")}</select></label><span class="faint">الخط المتقطع موضع القطع.</span></div>
          ${dendro(S.res.linkS, D.ids, lab)}
          <h4 class="ex-h4">متوسط كل متغير في كل مجموعة (بالوحدات الأصلية)</h4>
          <div class="tbl-wrap"><table class="tbl src-tbl"><thead><tr><th>المجموعة</th><th>العدد</th>${names.map(x => `<th><bdi>${esc(x)}</bdi></th>`).join("")}<th>العيّنات</th></tr></thead>
            <tbody>${gm.map((g, c) => `<tr><td><i class="dot" style="background:${PAL[c % PAL.length]}"></i>${c + 1}</td><td class="num">${g.idx.length}</td>${g.mean.map(v => `<td class="num">${F(v, "auto")}</td>`).join("")}<td class="src-mem">${g.idx.slice(0, 14).map(i => esc(D.ids[i])).join("، ")}${g.idx.length > 14 ? ` … و${g.idx.length - 14}` : ""}</td></tr>`).join("")}</tbody></table></div>`;
      }
    } else hcaHTML = `${dendro(S.res.linkV, names, null)}<p class="src-hint">المتغيرات التي تلتقي مبكراً (يمين الشجرة) تتغير معاً، فالأرجح أن مصدرها واحد. المسافة بين متغيرين مقيّسين تساوي √(2(n−1)(1−r)).</p>`;

    out.innerHTML = `
      <div class="qc-sum src-sum">
        <div class="db-kpi tone-b-info"><span class="k">العيّنات المستعملة</span><span class="v">${n}<small>من ${D.total}</small></span></div>
        <div class="db-kpi tone-b-info"><span class="k">المتغيرات</span><span class="v">${p}</span></div>
        <div class="db-kpi tone-b-${tone}"><span class="k">KMO (كفاية العيّنة)</span><span class="v">${kmo ? F2(kmo.kmo) : "—"}<small>${kmo ? MV.kmoLabel(kmo.kmo) : "مصفوفة منفردة"}</small></span></div>
        <div class="db-kpi tone-b-${bt && bt.p < 0.05 ? "good" : "warn"}"><span class="k">اختبار Bartlett</span><span class="v"><span class="db-kpi-t">p ${bt ? pH(bt.p) : "—"}</span></span></div>
        <div class="db-kpi tone-b-good"><span class="k">المصادر المستخرجة</span><span class="v">${k}<small>تشرح ${rotCum.toFixed(1)}%</small></span></div>
      </div>
      ${W.length ? `<div class="notice warn src-warn">${ico("i-warn")}<ul>${W.map(w => `<li>${w}</li>`).join("")}</ul></div>` : ""}

      <section class="panel">
        <div class="panel-h"><h3>${ico("i-chart")}كم مصدراً في البيانات؟</h3><span class="sub">القيم الذاتية لمصفوفة الارتباط</span></div>
        ${scree(ev, pa, k)}
        <div class="tbl-wrap"><table class="tbl src-tbl"><thead><tr><th>المكوّن</th><th>القيمة الذاتية</th><th>% من التباين</th><th>% تراكمي</th><th>المئين 95 العشوائي</th><th>بعد التدوير %</th></tr></thead>
          <tbody>${ev.map((v, i) => `<tr class="${i < k ? "sig" : ""}"><td>${i + 1}${i < k ? ` <i class="dot" style="background:${PAL[i % PAL.length]}"></i>` : ""}</td><td class="num">${v.toFixed(3)}</td><td class="num">${pct[i].toFixed(2)}</td><td class="num">${cumAt(i).toFixed(2)}</td><td class="num">${pa.p95[i].toFixed(3)}</td><td class="num">${i < k ? R.pctRot[i].toFixed(2) : ""}</td></tr>`).join("")}</tbody></table></div>
        <p class="src-hint">يُستبقى المكوّن إذا زادت قيمته الذاتية على 1 (Kaiser, 1960)، والتحليل الموازي أدقّ: يُستبقى إذا زادت على المئين 95 لقيم ${pa.nsim} مجموعة بيانات عشوائية بالحجم نفسه (Horn, 1965؛ Glorfeld, 1995).</p>
      </section>

      <section class="panel">
        <div class="panel-h"><h3>${ico("i-layers")}المكوّنات بعد التدوير وما تشير إليه</h3><span class="sub">Varimax مع تطبيع Kaiser</span></div>
        <div class="tbl-wrap"><table class="tbl src-tbl src-load"><thead><tr><th>المتغير</th>${Array.from({ length: k }, (_, j) => `<th><i class="dot" style="background:${PAL[j % PAL.length]}"></i>المصدر ${j + 1}</th>`).join("")}<th title="الشيوع: نسبة تباين المتغير التي تفسّرها المكوّنات">h²</th>${kmo ? "<th>MSA</th>" : ""}</tr></thead>
          <tbody>${names.map((x, i) => `<tr><td><bdi>${esc(x)}</bdi></td>${R.L[i].map(v => heat(v)).join("")}<td class="num">${R.comm[i].toFixed(2)}</td>${kmo ? `<td class="num${kmo.msa[i] < 0.5 ? " neg" : ""}">${kmo.msa[i].toFixed(2)}</td>` : ""}</tr>`).join("")}</tbody>
          <tfoot><tr><td>مجموع مربعات التحميلات</td>${R.ssRot.map(v => `<td class="num">${v.toFixed(3)}</td>`).join("")}<td></td>${kmo ? "<td></td>" : ""}</tr>
            <tr><td>% من التباين</td>${R.pctRot.map(v => `<td class="num">${v.toFixed(2)}</td>`).join("")}<td></td>${kmo ? "<td></td>" : ""}</tr>
            <tr><td>% تراكمي</td>${R.pctRot.map((_, j) => `<td class="num">${R.pctRot.slice(0, j + 1).reduce((a, b) => a + b, 0).toFixed(2)}</td>`).join("")}<td></td>${kmo ? "<td></td>" : ""}</tr></tfoot></table></div>
        <p class="src-hint">التحميل قوي إذا زاد على 0.75، ومتوسط بين 0.50 و0.75، وضعيف بين 0.30 و0.50 (Liu et al., 2003). الأزرق موجب والبرتقالي سالب.</p>
        <ol class="src-int">${comp.map((c, j) => `<li style="--c:${PAL[j % PAL.length]}">
          <b>المصدر ${j + 1}</b> <span class="faint">(${R.pctRot[j].toFixed(1)}% من التباين)</span>:
          ${c.strong.length ? `تحميل قوي لـ ${c.strong.map(i => `<bdi>${esc(names[i])}</bdi>`).join("، ")}` : ""}${c.mod.length ? `${c.strong.length ? "، و" : ""}متوسط لـ ${c.mod.map(i => `<bdi>${esc(names[i])}</bdi>`).join("، ")}` : ""}${!c.strong.length && !c.mod.length ? "لا تحميل موجباً فوق 0.50" : ""}${c.neg.length ? `، وسالب لـ ${c.neg.map(i => `<bdi>${esc(names[i])}</bdi>`).join("، ")}` : ""}.
          <div class="src-why">${c.rule ? `<span class="src-tag">إشارة محتملة: ${esc(c.rule.t)}</span> ${esc(c.rule.why)}` : "لا تطابق هذه المجموعة بصمة معروفة في مكتبة الأداة؛ فسّرها بمعرفتك بالموقع."} ${c.extra.map(esc).join(" ")}</div></li>`).join("")}</ol>
        <p class="src-hint">${ico("i-warn")}تسمية المصدر فرضية تبنيها على التحميلات، وتثبّتها بمعرفة الموقع (المصانع، الطرق، الصخر الأم، الأراضي الزراعية) وبمؤشرات مثل عامل الإغناء EF وIgeo من [[calc]].</p>
      </section>

      <section class="panel">
        <div class="panel-h"><h3>${ico("i-spark")}نسبة مساهمة كل مصدر (APCS-MLR)</h3><span class="sub">من متوسط تركيز كل متغير</span></div>
        <p class="src-hint">تُحوَّل درجة كل عيّنة إلى درجة مطلقة بطرح درجة عيّنة افتراضية تراكيزها صفر، ثم يُنحدر تركيز كل متغير على الدرجات المطلقة؛ حاصل ضرب معامل كل مصدر في متوسط درجاته هو مساهمته، وثابت الانحدار هو الجزء غير المفسَّر (Thurston & Spengler, 1985).</p>
        ${apcsHTML}
      </section>

      <section class="panel">
        <div class="panel-h"><h3>${ico("i-table")}مصفوفة الارتباط (Pearson)</h3><span class="sub">${S.log ? "على اللوغاريتمات" : "على القيم الأصلية"} · * p &lt; 0.05 · ** p &lt; 0.01</span></div>
        <div class="tbl-wrap"><table class="tbl src-tbl src-cor"><thead><tr><th></th>${names.map(x => `<th><bdi>${esc(x)}</bdi></th>`).join("")}</tr></thead>
          <tbody>${names.map((x, i) => `<tr><td><bdi>${esc(x)}</bdi></td>${names.map((_, j) => j > i ? "<td></td>" : j === i ? '<td class="num faint">1</td>' : heat(R.R[i][j], 2).replace(/<\/td>$/, `${rp[i][j] < 0.01 ? "**" : rp[i][j] < 0.05 ? "*" : ""}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>
      </section>

      <section class="panel">
        <div class="panel-h"><h3>${ico("i-layers")}التجميع الهرمي (Ward)</h3><span class="sub">مسافة إقليدية على البيانات المقيّسة</span></div>
        <div class="an-tabs src-htabs" role="tablist" aria-label="نوع التجميع">
          <button type="button" role="tab" data-h="vars" aria-selected="${S.htab === "vars"}">المتغيرات</button>
          <button type="button" role="tab" data-h="samples" aria-selected="${S.htab === "samples"}">العيّنات</button>
        </div>
        ${hcaHTML}
      </section>

      <section class="panel">
        <div class="panel-h"><h3>${ico("i-down")}للرسالة</h3></div>
        <div class="row">
          <button type="button" class="btn btn-primary" id="src-xlsx">${ico("i-down")}كل الجداول Excel</button>
          <button type="button" class="btn" id="src-mar">${ico("i-copy")}فقرة المنهجية بالعربية</button>
          <button type="button" class="btn" id="src-men">${ico("i-copy")}Methods paragraph (English)</button>
        </div>
        <p class="src-hint">الإعدادات تكافئ في SPSS: Principal components، وVarimax with Kaiser normalization، ودرجات المكوّنات بطريقة الانحدار، فتطابق التحميلات والدرجات ما يخرجه SPSS (قد تنعكس إشارة مكوّن كامل، وهذا لا يغيّر التفسير).</p>
      </section>
      <details class="db-method"><summary>${ico("i-book")}المنهجية والمراجع</summary>
        <ul class="qc-ref">
          <li>PCA على مصفوفة ارتباط Pearson للبيانات المقيّسة (Z)؛ القيم والمتجهات الذاتية بطريقة Jacobi.</li>
          <li>Kaiser, H.F. (1958). The varimax criterion for analytic rotation in factor analysis. Psychometrika 23, 187–200.</li>
          <li>Kaiser, H.F. (1960). The application of electronic computers to factor analysis. Educational and Psychological Measurement 20, 141–151.</li>
          <li>Kaiser, H.F. (1974). An index of factorial simplicity. Psychometrika 39, 31–36.</li>
          <li>Bartlett, M.S. (1950). Tests of significance in factor analysis. British Journal of Psychology (Statistical Section) 3, 77–85.</li>
          <li>Horn, J.L. (1965). A rationale and test for the number of factors in factor analysis. Psychometrika 30, 179–185.</li>
          <li>Glorfeld, L.W. (1995). An improvement on Horn's parallel analysis methodology for selecting the correct number of factors to retain. Educational and Psychological Measurement 55, 377–393.</li>
          <li>Thurston, G.D., Spengler, J.D. (1985). A quantitative assessment of source contributions to inhalable particulate matter pollution in metropolitan Boston. Atmospheric Environment 19, 9–25.</li>
          <li>Ward, J.H. (1963). Hierarchical grouping to optimize an objective function. Journal of the American Statistical Association 58, 236–244.</li>
          <li>Liu, C.W., Lin, K.H., Kuo, Y.M. (2003). Application of factor analysis in the assessment of groundwater quality in a blackfoot disease area in Taiwan. Science of the Total Environment 313, 77–89.</li>
          <li>Micó, C., Recatalá, L., Peris, M., Sánchez, J. (2006). Assessing heavy metal sources in agricultural soils of an European Mediterranean area by multivariate analysis. Chemosphere 65, 863–872.</li>
          <li>Vega, M., Pardo, R., Barrado, E., Debán, L. (1998). Assessment of seasonal and polluting effects on the quality of river water by exploratory data analysis. Water Research 32, 3581–3592.</li>
          <li>Reimann, C., Filzmoser, P., Garrett, R.G., Dutter, R. (2008). Statistical Data Analysis Explained: Applied Environmental Statistics with R. Wiley.</li>
          <li>Hair, J.F., Black, W.C., Babin, B.J., Anderson, R.E. (2010). Multivariate Data Analysis, 7th ed. Pearson.</li>
          <li>US EPA (2000). Guidance for Data Quality Assessment: Practical Methods for Data Analysis (EPA QA/G-9).</li>
          ${S.demo ? `<li>البيانات: ${esc(S.demo.cite)}${S.demo.src ? ` — ${esc(S.demo.src)}` : ""}</li>` : ""}
        </ul>
      </details>`;

    /* روابط [[tool]] داخل التلميح */
    out.querySelectorAll(".src-hint").forEach(el => { el.innerHTML = el.innerHTML.replace(/\[\[(\w+)\]\]/g, (_, t) => `<a href="#${t}">الحاسبات العلمية</a>`); });
    out.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { S.htab = b.dataset.h; render(); });
    const hk = U.$("#src-hk"); if (hk) hk.onchange = e => { S.hk = +e.target.value; render(); };
    U.$("#src-xlsx").onclick = exportXlsx;
    U.$("#src-mar").onclick = () => TB.copy(methodAr());
    U.$("#src-men").onclick = () => TB.copy(methodEn());
  }

  /* ------------------------------------------------------------------
     التصدير وفقرات المنهجية
  ------------------------------------------------------------------ */
  function exportXlsx() {
    const { D, R, pa, n, p, rp } = S.res, k = R.k, names = D.names, r4 = v => (isFinite(v) ? +v.toFixed(4) : "");
    const ev = R.eig.values;
    const sheets = [
      { name: "البيانات المستعملة", rows: [["العيّنة"].concat(names, D.tName ? [D.tName] : [])].concat(D.X.map((r, i) => [D.ids[i]].concat(r, D.Y ? [D.Y[i]] : []))) },
      { name: "الارتباط", rows: [[""].concat(names)].concat(names.map((x, i) => [x].concat(names.map((_, j) => r4(R.R[i][j]))))).concat([[], ["قيم p"]], [[""].concat(names)], names.map((x, i) => [x].concat(names.map((_, j) => (i === j ? "" : r4(rp[i][j])))))) },
      { name: "القيم الذاتية", rows: [["المكوّن", "القيمة الذاتية", "% من التباين", "% تراكمي", "المئين 95 (تحليل موازٍ)", "مستبقى"]].concat(ev.map((v, i) => [i + 1, r4(v), r4((100 * v) / p), r4(ev.slice(0, i + 1).reduce((a, b) => a + b, 0) * 100 / p), r4(pa.p95[i]), i < k ? "نعم" : ""])).concat([[], ["KMO", R.kmo ? r4(R.kmo.kmo) : "—"], ["Bartlett χ²", R.bartlett ? r4(R.bartlett.chi2) : "—"], ["df", R.bartlett ? R.bartlett.df : "—"], ["p", R.bartlett ? R.bartlett.p : "—"]]) },
      { name: "التحميلات المدوّرة", rows: [["المتغير"].concat(Array.from({ length: k }, (_, j) => `المصدر ${j + 1}`), ["h²", "MSA"])].concat(names.map((x, i) => [x].concat(R.L[i].map(r4), [r4(R.comm[i]), R.kmo ? r4(R.kmo.msa[i]) : ""]))).concat([["مجموع المربعات"].concat(R.ssRot.map(r4)), ["% من التباين"].concat(R.pctRot.map(r4))]) },
      { name: "معاملات الدرجات", rows: [["المتغير"].concat(Array.from({ length: k }, (_, j) => `المصدر ${j + 1}`))].concat(names.map((x, i) => [x].concat(R.B[i].map(r4)))) },
      { name: "الدرجات وAPCS", rows: [["العيّنة"].concat(Array.from({ length: k }, (_, j) => `درجة ${j + 1}`), Array.from({ length: k }, (_, j) => `APCS ${j + 1}`), D.Y && R.targets[0] ? Array.from({ length: k }, (_, j) => `مساهمة ${j + 1} في ${D.tName}`) : [])].concat(R.scores.map((r, i) => [D.ids[i]].concat(r.map(r4), R.apcs[i].map(r4), D.Y && R.targets[0] ? R.apcs[i].map((a, j) => r4(a * R.targets[0].b[j])) : []))) }
    ];
    if (!S.log) {
      const rowsC = [];
      if (D.tName && R.targets[0]) rowsC.push([D.tName, R.targets[0]]);
      names.forEach((x, i) => { if (!NONMASS.has(D.keys[i]) && R.mlr[i]) rowsC.push([x, R.mlr[i]]); });
      sheets.push({ name: "APCS-MLR", rows: [["المتغير", "R²", "المتوسط", "الثابت"].concat(Array.from({ length: k }, (_, j) => `معامل ${j + 1}`), Array.from({ length: k }, (_, j) => `مساهمة ${j + 1}`), Array.from({ length: k }, (_, j) => `% ${j + 1}`), ["% غير مفسَّر"])].concat(rowsC.map(([x, m]) => [x, r4(m.r2), r4(m.mean), r4(m.b0)].concat(m.b.map(r4), m.contrib.map(r4), m.pct.map(r4), [r4(m.pctUnexp)]))) });
    }
    if (S.res.lab) sheets.push({ name: "مجاميع العيّنات", rows: [["العيّنة", "المجموعة"]].concat(D.ids.map((id, i) => [id, S.res.lab[i] + 1])) });
    TB.xlsx(sheets, `مصادر-التلوث-${(S.label || "البيانات").slice(0, 40).replace(/[^\p{L}\p{N}]+/gu, "-")}.xlsx`);
  }

  function methodAr() {
    const { D, R, pa, n, p } = S.res, k = R.k, bt = R.bartlett, kmo = R.kmo;
    const cum = R.pctRot.reduce((a, b) => a + b, 0).toFixed(1), nd = D.nd.some(v => v > 0);
    let paK = 0; while (paK < p && R.eig.values[paK] > pa.p95[paK]) paK++;
    let s = `تحديد مصادر التلوث: طُبّق تحليل المكوّنات الرئيسة (PCA) على مصفوفة ارتباط Pearson لـ ${n} عيّنة و${p} متغيرات (${D.names.join("، ")}) بعد تقييسها${S.log ? " وتحويلها لوغاريتمياً (log₁₀)" : ""}${nd ? "، وعُوّضت القيم الأقل من حد الكشف بنصف قيمة الحد" : ""}. `;
    if (kmo && bt) s += `بلغ مؤشر Kaiser–Meyer–Olkin ${kmo.kmo.toFixed(2)}، وكان اختبار Bartlett للكروية ${bt.p < 0.05 ? "معنوياً" : "غير معنوي"} (χ² = ${bt.chi2.toFixed(1)}، df = ${bt.df}، p ${pfmt(bt.p)})${bt.p < 0.05 && kmo.kmo >= 0.5 ? "، ما يؤكد ملاءمة البيانات للتحليل" : ""}. `;
    s += `استُبقيت ${k} ${S.k ? "مكوّنات حدّد الباحث عددها" : "مكوّنات قيمها الذاتية أكبر من 1 (Kaiser, 1960)"}${paK === k ? "، وأكّد التحليل الموازي (Horn, 1965) هذا العدد" : ""}، ودُوّرت بطريقة Varimax مع تطبيع Kaiser (Kaiser, 1958) فشرحت ${cum}% من التباين الكلي، وصُنّفت التحميلات إلى قوية (> 0.75) ومتوسطة (0.50–0.75) وضعيفة (0.30–0.50) (Liu et al., 2003). `;
    if (!S.log) s += `وقُدّرت مساهمة كل مصدر بنموذج الدرجات المطلقة للمكوّنات الرئيسة مع الانحدار الخطي المتعدد (APCS-MLR) (Thurston & Spengler, 1985)، إذ حُسبت الدرجات المطلقة بطرح درجة عيّنة افتراضية تراكيزها صفر من درجات العيّنات ثم انحدرت تراكيز كل متغير عليها${D.tName && R.targets[0] ? `، وفسّر النموذج ${(R.targets[0].r2 * 100).toFixed(1)}% من تباين ${D.tName}` : ""}. `;
    s += `وجُمعت ${S.res.linkS ? "العيّنات والمتغيرات" : "المتغيرات"} هرمياً بطريقة Ward (1963) على المسافة الإقليدية للبيانات المقيّسة.`;
    return s;
  }
  function methodEn() {
    const { D, R, pa, n, p } = S.res, k = R.k, bt = R.bartlett, kmo = R.kmo;
    const cum = R.pctRot.reduce((a, b) => a + b, 0).toFixed(1), nd = D.nd.some(v => v > 0);
    let paK = 0; while (paK < p && R.eig.values[paK] > pa.p95[paK]) paK++;
    let s = `Source identification: Principal component analysis (PCA) was applied to the Pearson correlation matrix of ${n} samples and ${p} variables (${D.names.join(", ")}) after standardization${S.log ? " and log10 transformation" : ""}${nd ? "; values below the detection limit were replaced by half the limit" : ""}. `;
    if (kmo && bt) s += `The Kaiser–Meyer–Olkin measure of sampling adequacy was ${kmo.kmo.toFixed(2)} and Bartlett's test of sphericity was ${bt.p < 0.05 ? "significant" : "not significant"} (χ² = ${bt.chi2.toFixed(1)}, df = ${bt.df}, p ${pfmt(bt.p)}). `;
    s += `${k} components ${S.k ? "were retained" : "with eigenvalues greater than 1 were retained (Kaiser, 1960)"}${paK === k ? ", a number confirmed by parallel analysis (Horn, 1965)" : ""}, and were rotated by Varimax with Kaiser normalization (Kaiser, 1958), explaining ${cum}% of the total variance. Loadings were classified as strong (> 0.75), moderate (0.50–0.75) and weak (0.30–0.50) (Liu et al., 2003). `;
    if (!S.log) s += `Source contributions were estimated by absolute principal component scores–multiple linear regression (APCS-MLR; Thurston & Spengler, 1985)${D.tName && R.targets[0] ? `, which explained ${(R.targets[0].r2 * 100).toFixed(1)}% of the variance of ${D.tName}` : ""}. `;
    s += `Hierarchical cluster analysis of ${S.res.linkS ? "samples and variables" : "variables"} used Ward's method (Ward, 1963) on Euclidean distances of standardized data.`;
    return s;
  }

  /* ------------------------------------------------------------------
     بيانات منشورة للتجربة
  ------------------------------------------------------------------ */
  async function demoBaiji() {
    const r = await fetch(RAW + "baiji/air.csv", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rows = TB.parseText(await r.text()), h = rows[0];
    const pick = [["date", "التاريخ"], ["pm2_5", "PM2.5 (µg/m³)"], ["pm10", "PM10 (µg/m³)"], ["dust", "Dust (µg/m³)"], ["no2", "NO2 (µg/m³)"], ["so2", "SO2 (µg/m³)"], ["o3", "O3 (µg/m³)"], ["co", "CO (µg/m³)"]];
    const ix = pick.map(([c]) => h.indexOf(c));
    if (ix.some(i => i < 0)) throw new Error("تغيّر شكل ملف البيانات");
    return [pick.map(x => x[1])].concat(rows.slice(1).map(row => ix.map(i => row[i])));
  }
  async function demoMeuse() {
    const r = await fetch("data/meuse.csv");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rows = TB.parseText(await r.text()), h = rows[0].map(s => String(s).trim());
    const pick = [["cadmium", "Cd (mg/kg)"], ["copper", "Cu (mg/kg)"], ["lead", "Pb (mg/kg)"], ["zinc", "Zn (mg/kg)"], ["om", "OM (%)"], ["elev", "الارتفاع (م)"], ["dist", "المسافة عن النهر (نسبية)"], ["x", "x (م)"], ["y", "y (م)"]];
    const ix = pick.map(([c]) => h.indexOf(c));
    if (ix.some(i => i < 0)) throw new Error("تغيّر شكل ملف البيانات");
    return [["العيّنة"].concat(pick.map(x => x[1]))].concat(rows.slice(1).map((row, i) => [`T${i + 1}`].concat(ix.map(j => row[j]))));
  }

  ECO.views.sources = {
    init() {
      TB.input(U.$("#src-in"), {
        id: "src", placeholder: "العيّنة\tPb\tCd\tZn\tCu\tNi\tCr\tFe\tMn",
        template: [["العيّنة", "Pb (mg/kg)", "Cd (mg/kg)", "Zn (mg/kg)", "Cu (mg/kg)", "Ni (mg/kg)", "Cr (mg/kg)", "Co (mg/kg)", "Fe (mg/kg)", "Mn (mg/kg)"], ["م1"]],
        templateName: "قالب-مصادر-التلوث.xlsx", templateSheet: "العيّنات",
        demos: [
          { label: "هواء بيجي اليومي (CAMS)", rows: demoBaiji, vars: ["PM2.5 (µg/m³)", "PM10 (µg/m³)", "Dust (µg/m³)", "NO2 (µg/m³)", "SO2 (µg/m³)", "O3 (µg/m³)", "CO (µg/m³)"],
            cite: "تراكيز الملوثات اليومية في قضاء بيجي من نموذج CAMS العالمي (Copernicus)، قاعدة بيانات أقضية دجلة في المنصة",
            src: "تقديرات نموذج بدقة ≈45 كم وليست قياسات أرضية؛ مناسبة للتعلّم على PCA" },
          { label: "تربة ملوثة بالعناصر الثقيلة (Meuse، 155 عيّنة)", rows: demoMeuse, vars: ["Cd (mg/kg)", "Cu (mg/kg)", "Pb (mg/kg)", "Zn (mg/kg)", "OM (%)", "الارتفاع (م)", "المسافة عن النهر (نسبية)"],
            cite: "تربة سهل نهر Meuse الفيضي – هولندا (Rikken & Van Rijn 1993؛ حزمة sp: Pebesma & Bivand 2005)",
            src: "بيانات تدريبية عالمية مقيسة، رخصة GPL-3.0" }
        ],
        onLoad: load
      });
    }
  };
})();
