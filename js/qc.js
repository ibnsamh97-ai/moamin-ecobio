/* =====================================================================
   EcoBio AI — مدقق نتائج المختبر (ضبط جودة البيانات قبل التحليل)
   معايير القبول من Standard Methods for the Examination of Water and
   Wastewater، القسم 1030E «فحص صحة التحليل» (APHA 2017، الطبعة 23)،
   وتشبّع الأكسجين من معادلة Benson & Krause (1984) المعتمدة في 4500-O،
   والقيم الشاذة بطريقة Z المعدّلة (Iglewicz & Hoaglin 1993).
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, TB = ECO.tab;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const F = (v, d = 2) => U.fmt(v, d);

  /* المعايير: مفتاح، اسم، تعرّف من اسم العمود */
  const COLS = [
    ["id", null], ["ph", /^\s*ph\b|الأس الهيدروجيني|الاس الهيدروجيني|الرقم الهيدروجيني/i],
    ["ec", /^\s*e\.?c\b|توصيل|ايصالي|إيصالي|conductiv/i], ["tds", /\btds\b|المواد الصلبة الذائبة|الأملاح الذائبة|الاملاح الذائبة/i],
    ["temp", /temp|حرار/i], ["do", /^\s*d\.?o\b|الأكسجين المذاب|الاوكسجين المذاب|الأوكسجين المذاب|dissolved oxygen/i],
    ["bod", /\bbod/i], ["cod", /\bcod\b/i],
    ["ca", /^\s*ca\b(?!.*hard)|كالسيوم(?!.*عسر)/i], ["mg", /^\s*mg\b(?!\s*\/)(?!.*hard)|مغنيسيوم(?!.*عسر)|مغنسيوم/i],
    ["na", /^\s*na\b|صوديوم/i], ["k", /^\s*k\b|بوتاسيوم/i],
    ["hco3", /hco3|hco₃|بيكاربونات|بيكربونات/i], ["co3", /^\s*co3|co₃|^\s*كاربونات|^\s*كربونات/i],
    ["alk", /alk|القاعدية|القلوية/i], ["cl", /^\s*cl\b|cl⁻|كلوريد/i], ["so4", /so4|so₄|كبريتات/i],
    ["no3", /no3|no₃|نترات/i], ["f", /^\s*f\b|فلوريد/i], ["sio2", /sio2|sio₂|سليكا|سيليكا/i],
    ["th", /^\s*t\.?h\b|العسرة الكلية|عسرة كلية|total hard/i], ["turb", /turb|عكور/i],
    ["pb", /^\s*pb\b|رصاص/i], ["cd", /^\s*cd\b|كادميوم/i], ["cr", /^\s*cr\b|كروم/i], ["ni", /^\s*ni\b|نيكل/i],
    ["fe", /^\s*fe\b|حديد/i], ["zn", /^\s*zn\b|زنك|خارصين/i], ["cu", /^\s*cu\b|نحاس/i], ["mn", /^\s*mn\b|منغنيز/i],
    ["as", /^\s*as\b|زرنيخ/i], ["hg", /^\s*hg\b|زئبق/i]
  ];
  const NAME = { ph: "pH", ec: "EC", tds: "TDS", temp: "الحرارة", do: "DO", bod: "BOD₅", cod: "COD", ca: "Ca", mg: "Mg", na: "Na", k: "K", hco3: "HCO₃", co3: "CO₃", alk: "القاعدية", cl: "Cl", so4: "SO₄", no3: "NO₃", f: "F", sio2: "SiO₂", th: "العسرة الكلية", turb: "العكورة", pb: "Pb", cd: "Cd", cr: "Cr", ni: "Ni", fe: "Fe", zn: "Zn", cu: "Cu", mn: "Mn", as: "As", hg: "Hg" };
  /* مكافئ الكتلة (ملغم لكل مليمكافئ) */
  const EQ = { ca: 20.04, mg: 12.153, na: 22.99, k: 39.098, hco3: 61.017, co3: 30.004, cl: 35.453, so4: 48.03, no3: 62.004, f: 18.998 };
  /* أعلى تركيز معقول للعناصر في مياه سطحية أو جوفية (mg/L)؛ ما فوقه غالباً خطأ وحدة (µg/L أُدخلت mg/L) */
  const METAL_MAX = { pb: 1, cd: 0.5, cr: 2, ni: 2, cu: 5, zn: 20, fe: 50, mn: 20, as: 2, hg: 0.05 };

  const S = { rows: null, cols: [], map: {}, units: { ec: "us", no3: "no3", alk: "caco3" }, res: null, label: "" };

  function detect(header) {
    const map = {};
    header.forEach((h, i) => {
      const hard = /عسر|hard/i.test(String(h));   // «عسرة الكالسيوم» ليست تركيز Ca
      const hit = COLS.find(([k, re]) => re && re.test(String(h)) && map[k] == null && !(hard && (k === "ca" || k === "mg")));
      if (hit) map[hit[0]] = i;
    });
    // عمود المعرّف: أول عمود غير مستعمل
    const used = new Set(Object.values(map));
    const idCol = header.findIndex((h, i) => !used.has(i));
    if (idCol >= 0) map.id = idCol;
    const H = header.map(h => String(h));
    if (map.ec != null && /ms\/?cm|mS/i.test(H[map.ec]) && !/µs|us\/?cm|μs/i.test(H[map.ec])) S.units.ec = "ms";
    if (map.no3 != null && /no3[-–_ ]*n\b|as n\b|كنتروجين|نتروجين/i.test(H[map.no3])) S.units.no3 = "n";
    if (map.alk != null && /hco3|بيكاربونات/i.test(H[map.alk])) S.units.alk = "hco3";
    return map;
  }

  /* تشبّع الأكسجين في الماء العذب عند 1 جو (Benson & Krause 1984؛ APHA 4500-O) */
  const doSat = t => { const T = t + 273.15; return Math.exp(-139.34411 + 1.575701e5 / T - 6.642308e7 / T ** 2 + 1.2438e10 / T ** 3 - 8.621949e11 / T ** 4); };

  function analyze() {
    const [head, ...body] = S.rows, M = S.map;
    const val = (r, k) => M[k] == null ? NaN : TB.num(r[M[k]]);
    const raw = (r, k) => M[k] == null ? null : TB.cell(r[M[k]]);
    const samples = body.map((r, i) => {
      const id = M.id != null ? String(r[M.id] || "").trim() || `عيّنة ${i + 1}` : `عيّنة ${i + 1}`;
      const v = {}; Object.keys(NAME).forEach(k => { v[k] = val(r, k); });
      if (S.units.ec === "ms" && isFinite(v.ec)) v.ec *= 1000;
      if (S.units.no3 === "n" && isFinite(v.no3)) v.no3 *= 4.4268;
      const c = {}; const below = Object.keys(NAME).filter(k => { const x = raw(r, k); return x && x.below; });
      const neg = Object.keys(NAME).filter(k => isFinite(v[k]) && v[k] < 0 && k !== "temp");
      // القاعدية بمكافئ CaCO3، أو البيكاربونات والكاربونات
      let alkMeq = NaN;
      if (isFinite(v.alk)) alkMeq = S.units.alk === "hco3" ? v.alk / EQ.hco3 : v.alk / 50.04;
      else if (isFinite(v.hco3)) alkMeq = v.hco3 / EQ.hco3 + (isFinite(v.co3) ? v.co3 / EQ.co3 : 0);
      const has = ks => ks.every(k => isFinite(v[k]));
      // 1) توازن الأيونات
      if (has(["ca", "mg", "na", "cl", "so4"]) && isFinite(alkMeq)) {
        const cat = v.ca / EQ.ca + v.mg / EQ.mg + v.na / EQ.na + (isFinite(v.k) ? v.k / EQ.k : 0);
        const an = alkMeq + v.cl / EQ.cl + v.so4 / EQ.so4 + (isFinite(v.no3) ? v.no3 / EQ.no3 : 0) + (isFinite(v.f) ? v.f / EQ.f : 0);
        const diff = cat - an, pct = 100 * diff / (cat + an);
        // APHA 1030E: مجموع الأنيونات 0–3 مكافئ: ±0.2 مكافئ؛ 3–10: ±2%؛ 10–800: ±5%
        const ok = an <= 3 ? Math.abs(diff) <= 0.2 : an <= 10 ? Math.abs(pct) <= 2 : Math.abs(pct) <= 5;
        const lim = an <= 3 ? "±0.2 meq/L" : an <= 10 ? "±2%" : "±5%";
        const bad = an <= 3 ? Math.abs(diff) > 0.6 : Math.abs(pct) > (an <= 10 ? 6 : 10);
        c.ib = { st: ok ? "ok" : bad ? "fail" : "warn", val: `${F(pct, 1)}%`, msg: `الكاتيونات ${F(cat)} والأنيونات ${F(an)} مليمكافئ/لتر، الفرق ${F(pct, 1)}% (المقبول ${lim} لهذا المدى).` + (!isFinite(v.k) ? " (K غير مقاس فلم يدخل)" : ""), cat, an };
      } else c.ib = { st: "na", msg: "يحتاج Ca وMg وNa وCl وSO₄ والقاعدية أو HCO₃." };
      // 2) TDS المحسوب مقابل المقاس
      let tdsCalc = NaN;
      if (has(["ca", "mg", "na", "cl", "so4"]) && isFinite(alkMeq)) {
        tdsCalc = 0.6 * alkMeq * 50.04 + v.na + (v.k || 0) + v.ca + v.mg + v.cl + v.so4 + (isFinite(v.sio2) ? v.sio2 : 0) + (isFinite(v.no3) ? v.no3 : 0) + (isFinite(v.f) ? v.f : 0);
        if (isFinite(v.tds)) { const r = v.tds / tdsCalc; c.tdsc = { st: r >= 1 && r <= 1.2 ? "ok" : r >= 0.9 && r <= 1.3 ? "warn" : "fail", val: F(r), msg: `TDS المقاس ÷ المحسوب من الأيونات = ${F(r)} (المقبول 1.0–1.2). المحسوب ${F(tdsCalc, 0)} mg/L.` }; }
        else c.tdsc = { st: "na", msg: "TDS غير مقاس." };
      } else c.tdsc = { st: "na", msg: "يحتاج الأيونات الرئيسية لحساب TDS." };
      // 3) TDS/EC
      if (isFinite(v.tds) && isFinite(v.ec) && v.ec > 0) {
        const r = v.tds / v.ec;
        c.tdsec = { st: r >= 0.55 && r <= 0.7 ? "ok" : r >= 0.5 && r <= 0.8 ? "warn" : "fail", val: F(r), msg: `TDS ÷ EC = ${F(r)} (المقبول 0.55–0.70 للمياه الطبيعية).` + (r < 0.3 && S.units.ec === "us" ? " إذا كانت EC بوحدة mS/cm فغيّرها من خيارات الوحدات." : "") + (r > 1 ? " نسبة أعلى من 1 تعني غالباً أن EC بوحدة mS/cm أو أن TDS خاطئ." : "") };
      } else c.tdsec = { st: "na", msg: "يحتاج TDS وEC." };
      // 4) مجموع الأيونات × 100 ≈ EC
      if (c.ib.cat && isFinite(v.ec) && v.ec > 0) {
        const rc = c.ib.cat * 100 / v.ec, ra = c.ib.an * 100 / v.ec;
        const okr = x => x >= 0.9 && x <= 1.1, near = x => x >= 0.8 && x <= 1.2;
        c.ec = { st: okr(rc) && okr(ra) ? "ok" : near(rc) && near(ra) ? "warn" : "fail", val: `${F(rc)} / ${F(ra)}`, msg: `مجموع الكاتيونات×100÷EC = ${F(rc)} والأنيونات = ${F(ra)} (المقبول 0.9–1.1 لكل منهما).` };
      } else c.ec = { st: "na", msg: "يحتاج الأيونات الرئيسية وEC." };
      // 5) العسرة
      if (isFinite(v.th) && isFinite(v.ca) && isFinite(v.mg)) {
        const thc = 2.497 * v.ca + 4.118 * v.mg, d = 100 * (v.th - thc) / thc;
        c.th = { st: Math.abs(d) <= 10 ? "ok" : Math.abs(d) <= 20 ? "warn" : "fail", val: `${F(d, 0)}%`, msg: `العسرة المحسوبة من Ca وMg = ${F(thc, 0)} mg/L CaCO₃، والمقاسة ${F(v.th, 0)} (الفرق ${F(d, 0)}%؛ يُتوقع أقل من 10%).` };
      } else c.th = { st: "na", msg: "يحتاج العسرة الكلية وCa وMg." };
      // 6) الأكسجين المذاب مقابل التشبع
      if (isFinite(v.do) && isFinite(v.temp) && v.temp >= 0 && v.temp <= 40) {
        const sat = doSat(v.temp), p = 100 * v.do / sat;
        c.do = { st: v.do < 0 ? "fail" : p <= 120 ? "ok" : p <= 200 ? "warn" : "fail", val: `${F(p, 0)}%`, msg: `التشبع عند ${F(v.temp, 1)} °م = ${F(sat)} mg/L، فالقيمة ${F(p, 0)}% منه.` + (p > 120 && p <= 200 ? " فوق التشبع: ممكن بنشاط طحالب قوي ظهراً، تحقّق من وقت القياس." : p > 200 ? " أعلى من الممكن فيزيائياً في مياه طبيعية: تحقق من القياس أو الوحدة." : "") };
      } else c.do = { st: "na", msg: isFinite(v.do) ? "يحتاج حرارة الماء لحساب التشبع." : "DO غير مقاس." };
      // 7) BOD ≤ COD
      if (isFinite(v.bod) && isFinite(v.cod) && v.cod > 0) {
        const r = v.bod / v.cod;
        c.bc = { st: r <= 1 ? "ok" : "fail", val: F(r), msg: `BOD₅ ÷ COD = ${F(r)}` + (r > 1 ? " — مستحيل كيميائياً (BOD جزء من COD): أحد القياسين خاطئ." : r < 0.1 ? " — مادة عضوية صعبة التحلل الحيوي أو تثبيط للأحياء." : r >= 0.5 ? " — مادة عضوية سهلة التحلل الحيوي." : "") };
      } else c.bc = { st: "na", msg: "يحتاج BOD₅ وCOD." };
      // 8) pH
      if (isFinite(v.ph)) c.ph = { st: v.ph < 0 || v.ph > 14 ? "fail" : v.ph < 4 || v.ph > 11 ? "warn" : "ok", val: F(v.ph, 2), msg: v.ph < 0 || v.ph > 14 ? "خارج مقياس pH." : v.ph < 4 || v.ph > 11 ? "غير مألوف لمياه طبيعية؛ تحقق إن لم تكن عيّنة صناعية." : "ضمن المعتاد." };
      else c.ph = { st: "na", msg: "pH غير مقاس." };
      // 9) وحدات العناصر الثقيلة
      const unit = Object.keys(METAL_MAX).filter(k => isFinite(v[k]) && v[k] > METAL_MAX[k]);
      c.mu = unit.length ? { st: "warn", val: unit.map(k => NAME[k]).join("، "), msg: `قيم مرتفعة جداً لمياه طبيعية: ${unit.map(k => `${NAME[k]} = ${F(v[k], 3)}`).join("، ")} mg/L. تأكد أن الوحدة mg/L لا µg/L (ppb).` }
        : { st: Object.keys(METAL_MAX).some(k => isFinite(v[k])) ? "ok" : "na", msg: "قيم العناصر الثقيلة ضمن مدى معقول." };
      // 10) قيم سالبة وتحت حد الكشف
      c.neg = neg.length ? { st: "fail", val: neg.map(k => NAME[k]).join("، "), msg: `قيم سالبة لا معنى فيزيائياً لها: ${neg.map(k => NAME[k]).join("، ")}.` } : { st: "ok", msg: "لا قيم سالبة." };
      if (below.length) c.neg.msg += ` قيم تحت حد الكشف (${below.map(k => NAME[k]).join("، ")}) لم تدخل الحسابات؛ اذكر حد الكشف في المنهجية.`;
      return { id, v, c, row: i + 2 };
    });
    // 11) القيم الشاذة لكل معيار (Z المعدّلة > 3.5)
    const outl = [];
    Object.keys(NAME).forEach(k => {
      const xs = samples.map(s => s.v[k]).filter(isFinite);
      if (xs.length < 5) return;
      const med = ECO.stats.median(xs), mad = ECO.stats.median(xs.map(x => Math.abs(x - med)));
      if (!(mad > 0)) return;
      samples.forEach(s => { const x = s.v[k]; if (!isFinite(x)) return; const z = 0.6745 * (x - med) / mad; if (Math.abs(z) > 3.5) outl.push({ s, k, x, z }); });
    });
    samples.forEach(s => {
      const mine = outl.filter(o => o.s === s);
      s.c.out = mine.length ? { st: "warn", val: mine.map(o => NAME[o.k]).join("، "), msg: `قيم شاذة مقارنة ببقية العيّنات (Z المعدّلة > 3.5): ${mine.map(o => `${NAME[o.k]} = ${F(o.x, 3)} (Z = ${F(o.z, 1)})`).join("، ")}. ليست خطأً بالضرورة: تحقق من سجل المختبر قبل الحذف.` }
        : { st: samples.length >= 5 ? "ok" : "na", msg: samples.length >= 5 ? "لا قيم شاذة." : "يحتاج 5 عيّنات على الأقل." };
    });
    // تكرار المعرّفات
    const ids = {}; samples.forEach(s => { ids[s.id] = (ids[s.id] || 0) + 1; });
    S.res = { samples, dup: Object.keys(ids).filter(k => ids[k] > 1) };
    render();
  }

  const CHECKS = [["ib", "توازن الأيونات"], ["tdsc", "TDS المقاس/المحسوب"], ["tdsec", "TDS/EC"], ["ec", "الأيونات×100/EC"], ["th", "العسرة"], ["do", "تشبع الأكسجين"], ["bc", "BOD/COD"], ["ph", "pH"], ["mu", "وحدات العناصر"], ["neg", "قيم سالبة"], ["out", "قيم شاذة"]];
  const ST_TXT = { ok: "مقبول", warn: "تحقّق", fail: "مرفوض", na: "—" };
  const badge = c => `<span class="qc-b qc-${c.st}" title="${esc(c.msg)}">${c.st === "ok" ? ico("i-check") : c.st === "na" ? "" : ico("i-warn")}${c.val ? `<i>${esc(c.val)}</i>` : ST_TXT[c.st]}</span>`;

  function render() {
    const R = S.res, out = U.$("#qc-out");
    const used = CHECKS.filter(([k]) => R.samples.some(s => s.c[k].st !== "na"));
    const n = st => R.samples.reduce((a, s) => a + used.filter(([k]) => s.c[k].st === st).length, 0);
    const issues = R.samples.flatMap(s => used.filter(([k]) => s.c[k].st === "warn" || s.c[k].st === "fail").map(([k, t]) => ({ s, k, t, c: s.c[k] })));
    const found = Object.keys(S.map).filter(k => k !== "id");
    out.innerHTML = `
      <div class="panel">
        <div class="panel-h"><h3>${ico("i-table")}الأعمدة التي تعرّفت عليها</h3><span class="sub">${esc(S.label)} · ${R.samples.length} عيّنة</span></div>
        <p class="qc-cols">${found.map(k => `<span class="chip tone-none"><b>${esc(NAME[k])}</b>: <bdi>${esc(S.rows[0][S.map[k]])}</bdi></span>`).join("") || "لم يُتعرّف على أي معيار؛ تأكد من صف العناوين."}</p>
        <div class="qc-units">
          <label>EC <select class="input" data-u="ec"><option value="us"${S.units.ec === "us" ? " selected" : ""}>µS/cm</option><option value="ms"${S.units.ec === "ms" ? " selected" : ""}>mS/cm</option></select></label>
          <label>النترات <select class="input" data-u="no3"><option value="no3"${S.units.no3 === "no3" ? " selected" : ""}>mg/L NO₃</option><option value="n"${S.units.no3 === "n" ? " selected" : ""}>mg/L NO₃-N</option></select></label>
          <label>القاعدية <select class="input" data-u="alk"><option value="caco3"${S.units.alk === "caco3" ? " selected" : ""}>mg/L CaCO₃</option><option value="hco3"${S.units.alk === "hco3" ? " selected" : ""}>mg/L HCO₃</option></select></label>
          <span class="faint">باقي الأيونات والعناصر بـ mg/L، والحرارة بـ °م.</span>
        </div>
        ${R.dup.length ? `<div class="notice warn">${ico("i-warn")}<span>معرّفات مكررة: ${R.dup.map(esc).join("، ")}. تأكد أنها مكررات مقصودة لا صفوف منسوخة.</span></div>` : ""}
      </div>
      <div class="qc-sum">
        <div class="db-kpi tone-b-good"><span class="k">فحوص مقبولة</span><span class="v">${n("ok")}</span></div>
        <div class="db-kpi tone-b-warn"><span class="k">تحتاج تحقّقاً</span><span class="v">${n("warn")}</span></div>
        <div class="db-kpi tone-b-bad"><span class="k">مرفوضة</span><span class="v">${n("fail")}</span></div>
      </div>
      <div class="panel">
        <div class="panel-h"><h3>${ico("i-check")}نتيجة الفحص لكل عيّنة</h3><span class="sub">مرّر المؤشر أو اضغط على أي خانة لقراءة السبب</span></div>
        <div class="tbl-wrap"><table class="tbl qc-tbl"><thead><tr><th>العيّنة</th>${used.map(([, t]) => `<th>${t}</th>`).join("")}</tr></thead>
          <tbody>${R.samples.map((s, i) => `<tr><td>${esc(s.id)}</td>${used.map(([k]) => `<td data-i="${i}" data-k="${k}">${badge(s.c[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <div id="qc-why" class="qc-why" hidden></div>
      </div>
      <div class="panel">
        <div class="panel-h"><h3>${ico("i-warn")}ما يحتاج مراجعة (${issues.length})</h3></div>
        ${issues.length ? `<ol class="qc-issues">${issues.map(x => `<li class="qc-${x.c.st}"><b>${esc(x.s.id)}</b> · ${x.t}: ${esc(x.c.msg)}</li>`).join("")}</ol>` : `<p class="ok">لا توجد مشكلات في الفحوص الممكنة لهذه البيانات.</p>`}
        <div class="row u-mt14">
          <button type="button" class="btn" id="qc-xlsx">${ico("i-down")}تنزيل نتيجة الفحص Excel</button>
          <button type="button" class="btn" id="qc-method">${ico("i-copy")}نسخ فقرة المنهجية</button>
          <a class="btn btn-ghost" href="#analyzer">${ico("i-table")}انقل البيانات بعد تصحيحها إلى المحلّل</a>
        </div>
      </div>
      <details class="db-method"><summary>${ico("i-book")}معايير القبول ومراجعها</summary>
        <ul class="qc-ref">
          <li>توازن الأيونات: 100 × (Σكاتيونات − Σأنيونات) ÷ (Σكاتيونات + Σأنيونات) بالمليمكافئ/لتر؛ المقبول ±0.2 مليمكافئ إذا كان مجموع الأنيونات حتى 3، و±2% بين 3 و10، و±5% بين 10 و800 (APHA 1030E).</li>
          <li>TDS المحسوب = 0.6 × القاعدية (CaCO₃) + Na + K + Ca + Mg + Cl + SO₄ + SiO₂ + NO₃ + F؛ ونسبة المقاس إلى المحسوب بين 1.0 و1.2 (APHA 1030E).</li>
          <li>نسبة TDS إلى EC بين 0.55 و0.70، ومجموع الكاتيونات ومجموع الأنيونات ×100 بين 0.9 و1.1 من EC (APHA 1030E).</li>
          <li>العسرة المحسوبة = 2.497 Ca + 4.118 Mg (APHA 2340B).</li>
          <li>تشبع الأكسجين في الماء العذب عند 1 جو بمعادلة Benson & Krause (1984) المعتمدة في APHA 4500-O.</li>
          <li>القيم الشاذة: Z المعدّلة = 0.6745 (x − الوسيط) ÷ MAD، والحد 3.5 (Iglewicz & Hoaglin, 1993).</li>
          <li>المرجع: APHA, AWWA, WEF (2017). Standard Methods for the Examination of Water and Wastewater, 23rd ed. Section 1030E: Checking Analyses’ Correctness.</li>
        </ul>
      </details>`;
    out.querySelectorAll("[data-u]").forEach(sel => sel.onchange = () => { S.units[sel.dataset.u] = sel.value; analyze(); });
    out.querySelector(".qc-tbl").onclick = e => {
      const td = e.target.closest("td[data-k]"); if (!td) return;
      const s = R.samples[+td.dataset.i], k = td.dataset.k, why = U.$("#qc-why");
      why.hidden = false; why.innerHTML = `<b>${esc(s.id)} · ${CHECKS.find(c => c[0] === k)[1]}:</b> ${esc(s.c[k].msg)}`;
    };
    U.$("#qc-xlsx").onclick = () => TB.xlsx([
      { name: "نتيجة الفحص", rows: [["العيّنة"].concat(used.map(([, t]) => t))].concat(R.samples.map(s => [s.id].concat(used.map(([k]) => s.c[k].st === "na" ? "—" : `${ST_TXT[s.c[k].st]}${s.c[k].val ? " (" + s.c[k].val + ")" : ""}`)))) },
      { name: "الملاحظات", rows: [["العيّنة", "الفحص", "الحالة", "التفصيل"]].concat(issues.map(x => [x.s.id, x.t, ST_TXT[x.c.st], x.c.msg])) }
    ], `فحص-جودة-${(S.label || "البيانات").replace(/[^\p{L}\p{N}]+/gu, "-")}.xlsx`);
    U.$("#qc-method").onclick = () => TB.copy(methodText(used, R));
  }

  function methodText(used, R) {
    const t = used.map(([, x]) => x).join("، ");
    const fails = R.samples.filter(s => used.some(([k]) => s.c[k].st === "fail")).length;
    return `ضبط جودة البيانات: فُحصت صحة نتائج التحليل لـ ${R.samples.length} عيّنة وفق معايير القسم 1030E من Standard Methods (APHA, 2017)، وشملت الفحوص: ${t}. حُسب توازن الأيونات بالمليمكافئ/لتر وقورن بحدود القبول المعتمدة لكل مدى من مجموع الأنيونات، وقورنت نسبة TDS إلى التوصيلية الكهربائية بالمدى 0.55–0.70، وحُسب تشبع الأكسجين المذاب من معادلة Benson وKrause (1984)، وكُشفت القيم الشاذة بطريقة Z المعدّلة (Iglewicz و Hoaglin، 1993) بحد 3.5. ${fails ? `أظهرت ${fails} عيّنة فحصاً واحداً على الأقل خارج حدود القبول، وأُعيد التحقق منها قبل التحليل الإحصائي.` : "جاءت كل الفحوص الممكنة ضمن حدود القبول."}`;
  }

  /* بيانات منشورة للتجربة: مياه صرف مصافي بيجي (الحمداني وآخرون، 2025) */
  function demoBaiji() {
    const r = (ECO.RESEARCH || []).find(x => x.id === "baiji-2025"), t = r && r.tables.find(x => x.id === "water");
    if (!t) return [];
    const pick = lbl => t.rows.find(x => String(x[0]).startsWith(lbl));
    const keys = [["EC", "EC (µS/cm)"], ["pH", "pH"], ["TDS", "TDS (mg/L)"], ["SO₄", "SO4 (mg/L)"], ["COD", "COD (mg/L)"], ["BOD", "BOD (mg/L)"]];
    const head = ["المحطة"].concat(keys.map(k => k[1]));
    return [head].concat(t.cols.map((c, i) => [c].concat(keys.map(([lbl]) => { const row = pick(lbl); return row ? row[i + 1] : ""; }))));
  }

  ECO.views.qc = {
    init() {
      TB.input(U.$("#qc-in"), {
        id: "qc", placeholder: "العيّنة\tpH\tEC (µS/cm)\tTDS\tCa\tMg\tNa\tK\tHCO3\tCl\tSO4\tNO3",
        template: [["العيّنة", "pH", "EC (µS/cm)", "TDS (mg/L)", "الحرارة (°م)", "DO (mg/L)", "BOD5 (mg/L)", "COD (mg/L)", "Ca (mg/L)", "Mg (mg/L)", "Na (mg/L)", "K (mg/L)", "HCO3 (mg/L)", "CO3 (mg/L)", "Cl (mg/L)", "SO4 (mg/L)", "NO3 (mg/L)", "العسرة الكلية (mg/L CaCO3)"], ["م1"]],
        templateName: "قالب-فحص-نتائج-المختبر.xlsx", templateSheet: "النتائج",
        demos: [{ label: "مياه صرف مصافي بيجي (منشور 2025)", rows: demoBaiji }],
        onLoad(rows, meta) {
          S.rows = rows; S.units = { ec: "us", no3: "no3", alk: "caco3" }; S.map = detect(rows[0]);
          S.label = meta.demo ? "مياه صرف مصافي بيجي – الحمداني وآخرون (2025)، مجلة تكريت للعلوم الصرفة 30(6)" : meta.label;
          analyze();
          U.$("#qc-out").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
        }
      });
    }
  };
})();
