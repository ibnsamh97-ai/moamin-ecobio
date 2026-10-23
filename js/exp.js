/* =====================================================================
   EcoBio AI — مصمّم ومحلّل التجارب
   1) تصميم التجارب بمنهجية سطح الاستجابة (RSM): Box–Behnken وCCD والعاملي
      مع نقاط مركزية، ثم ملاءمة النموذج التربيعي وANOVA وعدم الملاءمة،
      والظروف المثلى بفترة تنبؤ 95% وتجربة التأكيد (Box & Wilson 1951؛
      Montgomery, Design and Analysis of Experiments).
   2) اختبار الجرة: الجرعة المثلى من منحنى تربيعي (ASTM D2035).
   3) نماذج الامتزاز: ملاءمة غير خطية لستة أيزوثيرمات وأربعة نماذج حركية
      ومقارنتها بـ AICc (Foo & Hameed 2010؛ Tran et al. 2017).
   4) منحنيات التحلل والنمو: الرتبة الأولى ونصف العمر، ومقارنة المعاملات،
      ونموذج Gompertz المعدّل للنمو (Zwietering et al. 1990).
   كل الحسابات في المتصفح، وتُحفظ التجربة في جهازك لتكملها لاحقاً.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, TB = ECO.tab, FL = ECO.fit, ST = () => ECO.stats;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const F = (v, d = 3) => (isFinite(v) ? U.fmt(v, d) : "—");
  // معاملات النماذج بأربعة أرقام معنوية وأخطاؤها برقمين، مهما صغرت القيمة
  const G4 = v => (!isFinite(v) ? "—" : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(3) : String(Number(v.toPrecision(4))));
  const G2 = v => (!isFinite(v) ? "—" : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1) : String(Number(v.toPrecision(2))));
  const P = p => (!isFinite(p) ? "—" : p < 0.0001 ? "< 0.0001" : U.fmt(p, 4));
  const sig = p => (p < 0.05 ? "sig" : "");
  const charts = {};
  const chart = (id, cfg) => { if (charts[id]) charts[id].destroy(); const c = U.$("#" + id); if (!c || !window.Chart) return null; charts[id] = new Chart(c, cfg); return charts[id]; };
  const store = (k, v) => (v === undefined ? U.store.get("exp_" + k, null) : U.store.set("exp_" + k, v));

  /* =================================================================
     1) تصميم التجارب RSM
  ================================================================= */
  const D = store("doe") || {
    factors: [{ n: "pH", u: "", lo: 4, hi: 9 }, { n: "جرعة المادة المازّة", u: "g/L", lo: 0.5, hi: 2.5 }, { n: "زمن التماس", u: "دقيقة", lo: 30, hi: 120 }],
    resp: "نسبة الإزالة", ru: "%", goal: "max", design: "bbd", cp: 3, runs: null
  };
  const saveD = () => store("doe", D);

  function designPoints(k, type, cp) {
    const pts = [];
    if (type === "bbd") {
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) for (const a of [-1, 1]) for (const b of [-1, 1]) { const x = new Array(k).fill(0); x[i] = a; x[j] = b; pts.push(x); }
    } else {
      for (let m = 0; m < 1 << k; m++) pts.push(Array.from({ length: k }, (_, i) => ((m >> i) & 1 ? 1 : -1)));
      if (type === "ccd" || type === "ccf") {
        const a = type === "ccf" ? 1 : Math.pow(2 ** k, 0.25);
        for (let i = 0; i < k; i++) for (const s of [-a, a]) { const x = new Array(k).fill(0); x[i] = s; pts.push(x); }
      }
    }
    for (let c = 0; c < cp; c++) pts.push(new Array(k).fill(0));
    return pts;
  }
  const defaultCP = (k, t) => (t === "bbd" ? (k >= 5 ? 6 : 3) : t === "fact" ? 3 : k <= 2 ? 5 : 6);
  const alphaOf = (k, t) => (t === "ccd" ? Math.pow(2 ** k, 0.25) : 1);
  const toActual = (f, c) => (f.lo + f.hi) / 2 + c * (f.hi - f.lo) / 2;
  const toCoded = (f, v) => (v - (f.lo + f.hi) / 2) / ((f.hi - f.lo) / 2);
  const round = v => Math.round(v * 1e6) / 1e6;

  function seededShuffle(n, seed) {
    const a = Array.from({ length: n }, (_, i) => i); let s = seed >>> 0 || 1;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function makeRuns() {
    const k = D.factors.length, pts = designPoints(k, D.design, D.cp), order = seededShuffle(pts.length, Date.now() & 0xffff);
    D.runs = order.map((si, ri) => ({ run: ri + 1, std: si + 1, x: pts[si], y: null }));
    D.fit = null; saveD();
  }

  /* حدود النموذج: [اسم، دالة الحساب على القيم المرمّزة، مجموعة] */
  function terms(k, quad) {
    const T = [["الثابت", x => 1, "c"]];
    for (let i = 0; i < k; i++) T.push([`A${i}`, x => x[i], "lin", [i]]);
    if (quad) for (let i = 0; i < k; i++) T.push([`A${i}²`, x => x[i] * x[i], "sq", [i, i]]);
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) T.push([`A${i}·A${j}`, x => x[i] * x[j], "int", [i, j]]);
    return T;
  }
  const L = i => String.fromCharCode(65 + i); // A B C D E
  const termName = t => t[0].replace(/A(\d)/g, (m, d) => L(+d));

  function analyzeDOE() {
    const k = D.factors.length, rows = D.runs.filter(r => isFinite(r.y));
    const quad = D.design !== "fact";
    const T = terms(k, quad), p = T.length;
    if (rows.length < p + 2) return { err: `أدخل نتائج ${p + 2} تجارب على الأقل (أدخلت ${rows.length}). النموذج فيه ${p} معاملاً.` };
    const X = rows.map(r => T.map(t => t[1](r.x))), y = rows.map(r => r.y);
    const o = FL.ols(X, y);
    if (!o) return { err: "مصفوفة التصميم منفردة: تأكد أن التجارب المنفّذة تغطي كل مستويات العوامل." };
    // ANOVA بمجاميع المربعات المعدّلة لكل مجموعة حدود
    const group = g => {
      const idx = T.map((t, i) => (t[2] === g ? i : -1)).filter(i => i >= 0); if (!idx.length) return null;
      const keep = T.map((t, i) => i).filter(i => !idx.includes(i));
      const r = FL.ols(X.map(row => keep.map(i => row[i])), y);
      const ss = (r ? r.sse : o.sst) - o.sse, df = idx.length, F_ = (ss / df) / o.mse;
      return { ss, df, ms: ss / df, F: F_, p: ST().pF(F_, df, o.df) };
    };
    const ssM = o.sst - o.sse, dfM = p - 1, FM = (ssM / dfM) / o.mse;
    const an = [{ src: "النموذج", ss: ssM, df: dfM, ms: ssM / dfM, F: FM, p: ST().pF(FM, dfM, o.df) }];
    [["lin", "الحدود الخطية"], ["sq", "الحدود التربيعية"], ["int", "التداخلات الثنائية"]].forEach(([g, n]) => { const r = group(g); if (r) an.push(Object.assign({ src: n, sub: true }, r)); });
    // عدم الملاءمة والخطأ الصافي من التجارب المكررة
    const reps = {}; rows.forEach(r => { const key = r.x.map(v => v.toFixed(4)).join(","); (reps[key] = reps[key] || []).push(r.y); });
    let ssPE = 0, dfPE = 0; Object.values(reps).forEach(g => { if (g.length > 1) { const m = g.reduce((a, b) => a + b, 0) / g.length; ssPE += g.reduce((s, v) => s + (v - m) ** 2, 0); dfPE += g.length - 1; } });
    an.push({ src: "البواقي", ss: o.sse, df: o.df, ms: o.mse });
    if (dfPE > 0 && o.df - dfPE > 0) {
      const ssLOF = o.sse - ssPE, dfLOF = o.df - dfPE, FL_ = (ssLOF / dfLOF) / (ssPE / dfPE);
      an.push({ src: "عدم الملاءمة", ss: ssLOF, df: dfLOF, ms: ssLOF / dfLOF, F: FL_, p: ST().pF(FL_, dfLOF, dfPE), sub: true });
      an.push({ src: "الخطأ الصافي", ss: ssPE, df: dfPE, ms: ssPE / dfPE, sub: true });
    }
    an.push({ src: "المجموع", ss: o.sst, df: rows.length - 1 });
    // معادلة بالقيم الفعلية (إعادة الملاءمة بالوحدات الأصلية تعطي النموذج نفسه)
    const Xa = rows.map(r => T.map(t => t[1](r.x.map((c, i) => toActual(D.factors[i], c))))), oa = FL.ols(Xa, y);
    // الظروف المثلى ضمن مدى التصميم المرمّز
    const lim = D.design === "ccd" && D.optBox === "axial" ? alphaOf(k, D.design) : 1;
    const pred = x => T.reduce((s, t, i) => s + o.beta[i] * t[1](x), 0);
    const sgn = D.goal === "min" ? -1 : 1;
    const steps = k <= 2 ? 101 : k === 3 ? 41 : k === 4 ? 21 : 13;
    let best = null, x = new Array(k).fill(-lim);
    const grid = i => { if (i === k) { const v = sgn * pred(x); if (!best || v > best.v) best = { v, x: x.slice() }; return; } for (let s = 0; s < steps; s++) { x[i] = -lim + 2 * lim * s / (steps - 1); grid(i + 1); } };
    grid(0);
    let bx = best.x, h = 2 * lim / (steps - 1);
    for (let it = 0; it < 60 && h > 1e-5; it++) {
      let moved = false;
      for (let i = 0; i < k; i++) for (const d of [-h, h]) { const c = bx.slice(); c[i] = Math.max(-lim, Math.min(lim, c[i] + d)); if (sgn * pred(c) > sgn * pred(bx) + 1e-12) { bx = c; moved = true; } }
      if (!moved) h /= 2;
    }
    const x0 = T.map(t => t[1](bx)), v0 = x0.reduce((s, a, i) => s + a * o.XtXi[i].reduce((q, b, j) => q + b * x0[j], 0), 0);
    const tq = FL.qt(0.05, o.df), yo = pred(bx);
    const opt = { x: bx, y: yo, ci: tq * Math.sqrt(o.mse * v0), pi: tq * Math.sqrt(o.mse * (1 + v0)), edge: bx.map(v => Math.abs(v) >= lim * 0.98) };
    // اتجاه الصعود الأشد عند الحافة (بالوحدات المرمّزة)
    const grad = bx.map((_, i) => { const e = 1e-4, a = bx.slice(), b = bx.slice(); a[i] += e; b[i] -= e; return sgn * (pred(a) - pred(b)) / (2 * e); });
    return { o, oa, T, an, opt, grad, pred, rows, lim, quad };
  }

  function eqText(beta, T, actual) {
    const nm = t => (actual ? termName(t).replace(/[A-E]/g, c => `[${D.factors[c.charCodeAt(0) - 65].n}]`) : termName(t));
    return `${D.resp} = ` + beta.map((b, i) => (i === 0 ? F(b, 4) : `${b < 0 ? "−" : "+"} ${F(Math.abs(b), 4)}·${nm(T[i])}`)).join(" ");
  }

  function renderDOE() {
    const host = U.$("#ex-doe"); if (!host) return;
    const k = D.factors.length;
    host.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3><span class="pl-step">1</span>العوامل والاستجابة</h3><span class="sub">2 إلى 5 عوامل بمستويين أدنى وأعلى</span></div>
        <div class="tbl-wrap"><table class="tbl ex-ft"><thead><tr><th>الرمز</th><th>العامل</th><th>الوحدة</th><th>الأدنى (−1)</th><th>الأعلى (+1)</th><th></th></tr></thead><tbody>
          ${D.factors.map((f, i) => `<tr><td class="num">${L(i)}</td><td><input class="input" data-f="${i}" data-k="n" value="${esc(f.n)}"></td><td><input class="input" data-f="${i}" data-k="u" value="${esc(f.u)}"></td><td><input class="input num" data-f="${i}" data-k="lo" value="${f.lo}" inputmode="decimal"></td><td><input class="input num" data-f="${i}" data-k="hi" value="${f.hi}" inputmode="decimal"></td><td>${k > 2 ? `<button type="button" class="btn btn-ghost btn-sm" data-del="${i}" aria-label="حذف العامل">${ico("i-trash")}</button>` : ""}</td></tr>`).join("")}
        </tbody></table></div>
        ${k < 5 ? `<button type="button" class="btn btn-sm" id="ex-addf">${ico("i-plus")}أضف عاملاً</button>` : ""}
        <div class="db-ctrl u-mt14">
          <div class="field"><label for="ex-resp">الاستجابة</label><input id="ex-resp" class="input" value="${esc(D.resp)}"></div>
          <div class="field"><label for="ex-ru">وحدتها</label><input id="ex-ru" class="input" value="${esc(D.ru)}"></div>
          <div class="field"><label for="ex-goal">الهدف</label><select id="ex-goal" class="input"><option value="max"${D.goal === "max" ? " selected" : ""}>أعلى قيمة (مثل نسبة الإزالة)</option><option value="min"${D.goal === "min" ? " selected" : ""}>أدنى قيمة (مثل التركيز المتبقي)</option></select></div>
          <div class="field"><label for="ex-des">التصميم</label><select id="ex-des" class="input">
            <option value="bbd"${D.design === "bbd" ? " selected" : ""}${k < 3 ? " disabled" : ""}>Box–Behnken (3 عوامل فأكثر)</option>
            <option value="ccd"${D.design === "ccd" ? " selected" : ""}>مركّب مركزي دوّار CCD (α = ${F(alphaOf(k, "ccd"), 3)})</option>
            <option value="ccf"${D.design === "ccf" ? " selected" : ""}>مركّب مركزي بأوجه CCF (α = 1)</option>
            <option value="fact"${D.design === "fact" ? " selected" : ""}>عاملي 2^k مع نقاط مركزية (فرز العوامل)</option></select></div>
          <div class="field"><label for="ex-cp">النقاط المركزية</label><input id="ex-cp" class="input num" type="number" min="1" max="10" value="${D.cp}"></div>
        </div>
        <p class="faint ex-note">${D.design === "ccd" ? `تنبيه: في CCD الدوّار تقع نقاط المحاور خارج مداك (±${F(alphaOf(k, "ccd"), 3)})، فتأكد أنها ممكنة عملياً (مثلاً pH لا يتجاوز حدود التجربة)، وإلا اختر CCF.` : D.design === "fact" ? "التصميم العاملي يقدّر الآثار الخطية والتداخلات فقط، ويفيد لفرز العوامل المهمة قبل RSM." : "Box–Behnken لا يحتوي تجارب في زوايا المدى، فيناسب حين تكون التوليفات المتطرفة صعبة أو خطرة."}</p>
        <button type="button" class="btn btn-primary" id="ex-make">${ico("i-table")}${D.runs ? "أعد إنشاء جدول التجارب" : "أنشئ جدول التجارب"}</button>
        ${D.runs ? `<span class="faint">إعادة الإنشاء تمسح النتائج المُدخلة.</span>` : ""}
      </section>
      ${D.runs ? runsHTML() : ""}
      <div id="ex-doe-res"></div>`;
    host.querySelectorAll("[data-f]").forEach(inp => inp.onchange = () => {
      const f = D.factors[+inp.dataset.f], kk = inp.dataset.k;
      f[kk] = kk === "lo" || kk === "hi" ? TB.num(inp.value) : inp.value.trim(); saveD();
      if (D.runs) renderRunsOnly();
    });
    host.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { D.factors.splice(+b.dataset.del, 1); if (D.factors.length < 3 && D.design === "bbd") D.design = "ccf"; D.cp = defaultCP(D.factors.length, D.design); D.runs = null; saveD(); renderDOE(); });
    const add = U.$("#ex-addf"); if (add) add.onclick = () => { D.factors.push({ n: `عامل ${L(D.factors.length)}`, u: "", lo: 0, hi: 1 }); D.cp = defaultCP(D.factors.length, D.design); D.runs = null; saveD(); renderDOE(); };
    U.$("#ex-resp").onchange = e => { D.resp = e.target.value.trim() || "الاستجابة"; saveD(); };
    U.$("#ex-ru").onchange = e => { D.ru = e.target.value.trim(); saveD(); };
    U.$("#ex-goal").onchange = e => { D.goal = e.target.value; saveD(); if (D.runs) analyzeAndRender(); };
    U.$("#ex-des").onchange = e => { D.design = e.target.value; D.cp = defaultCP(D.factors.length, D.design); saveD(); renderDOE(); };
    U.$("#ex-cp").onchange = e => { D.cp = Math.max(1, Math.min(10, Math.round(TB.num(e.target.value) || 1))); saveD(); };
    U.$("#ex-make").onclick = () => {
      const badF = D.factors.find(f => !(isFinite(f.lo) && isFinite(f.hi) && f.hi > f.lo));
      if (badF) { U.toast(`حدّد مستويين صحيحين للعامل «${badF.n}» (الأعلى أكبر من الأدنى)`); return; }
      if (D.design === "bbd" && D.factors.length < 3) { U.toast("Box–Behnken يحتاج 3 عوامل على الأقل"); return; }
      makeRuns(); renderDOE();
    };
    if (D.runs) { wireRuns(); if (D.runs.filter(r => isFinite(r.y)).length) analyzeAndRender(); }
  }

  function runsHTML() {
    const k = D.factors.length, filled = D.runs.filter(r => isFinite(r.y)).length;
    return `<section class="panel" id="ex-runs">
      <div class="panel-h"><h3><span class="pl-step">2</span>جدول التجارب (${D.runs.length} تجربة)</h3><span class="sub">نفّذها بالترتيب العشوائي، وأدخل الاستجابة لكل تجربة · ${filled}/${D.runs.length}</span></div>
      <div class="tbl-wrap"><table class="tbl ex-rt"><thead><tr><th>التجربة</th><th>القياسي</th>${D.factors.map((f, i) => `<th>${L(i)}: ${esc(f.n)}${f.u ? ` (${esc(f.u)})` : ""}</th>`).join("")}<th>${esc(D.resp)}${D.ru ? ` (${esc(D.ru)})` : ""}</th></tr></thead>
        <tbody>${D.runs.map((r, i) => `<tr${r.x.every(v => v === 0) ? ' class="ex-cpt"' : ""}><td class="num">${r.run}</td><td class="num faint">${r.std}</td>${r.x.map((c, j) => `<td class="num">${F(round(toActual(D.factors[j], c)), 4)}${Math.abs(c) > 1.0001 ? ` <small class="faint">(α)</small>` : ""}</td>`).join("")}<td><input class="input num" data-y="${i}" value="${isFinite(r.y) ? r.y : ""}" inputmode="decimal" aria-label="نتيجة التجربة ${r.run}"></td></tr>`).join("")}</tbody></table></div>
      <div class="row u-mt14">
        <button type="button" class="btn" id="ex-xl">${ico("i-down")}تنزيل الجدول Excel</button>
        <label class="btn" for="ex-up">${ico("i-upload")}أدخل النتائج من Excel</label><input id="ex-up" type="file" accept=".xlsx,.csv" hidden>
        <button type="button" class="btn btn-primary" id="ex-an">${ico("i-spark")}حلّل النتائج</button>
      </div>
      <p class="faint ex-note">الصفوف المظللة نقاط مركزية مكررة: منها يُقدَّر الخطأ الصافي واختبار عدم الملاءمة. الترتيب العشوائي يحمي النتائج من أثر الزمن والانجراف.</p>
    </section>`;
  }
  function renderRunsOnly() { const s = U.$("#ex-runs"); if (s) { s.outerHTML = runsHTML(); wireRuns(); } }
  function wireRuns() {
    U.$$("[data-y]").forEach(inp => inp.onchange = () => { const v = TB.num(inp.value); D.runs[+inp.dataset.y].y = isFinite(v) ? v : null; saveD(); });
    U.$("#ex-xl").onclick = () => TB.xlsx([{ name: "التجارب", rows: [["التجربة", "الترتيب القياسي"].concat(D.factors.map((f, i) => `${L(i)}: ${f.n}${f.u ? ` (${f.u})` : ""}`), D.factors.map((f, i) => `${L(i)} مرمّز`), [`${D.resp}${D.ru ? ` (${D.ru})` : ""}`])]
      .concat(D.runs.map(r => [r.run, r.std].concat(r.x.map((c, j) => round(toActual(D.factors[j], c))), r.x.map(c => round(c)), [isFinite(r.y) ? r.y : ""]))) }], "تصميم-التجارب-RSM.xlsx");
    U.$("#ex-up").onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      try {
        const { rows } = await TB.readFile(f); const head = rows[0].map(String);
        const ri = head.findIndex(h => /التجربة|run/i.test(h)), yi = head.length - 1;
        let n = 0; rows.slice(1).forEach(r => { const run = TB.num(r[ri]), v = TB.num(r[yi]); const R = D.runs.find(x => x.run === run); if (R && isFinite(v)) { R.y = v; n++; } });
        saveD(); renderRunsOnly(); U.toast(`أُدخلت ${n} نتيجة`); if (n) analyzeAndRender();
      } catch (x) { U.toast("تعذّرت قراءة الملف: " + x.message); }
    };
    U.$("#ex-an").onclick = () => { U.$$("[data-y]").forEach(inp => { const v = TB.num(inp.value); D.runs[+inp.dataset.y].y = isFinite(v) ? v : null; }); saveD(); analyzeAndRender(true); };
  }

  function analyzeAndRender(scroll) {
    const out = U.$("#ex-doe-res"); if (!out) return;
    const R = analyzeDOE();
    if (R.err) { out.innerHTML = `<div class="notice info">${ico("i-info")}<span>${esc(R.err)}</span></div>`; return; }
    const k = D.factors.length, o = R.o, opt = R.opt;
    const warn = [];
    if (R.an[0].p >= 0.05) warn.push("النموذج ككل غير معنوي (p ≥ 0.05): العوامل في هذا المدى لا تفسّر تغيّر الاستجابة بما يكفي.");
    const lof = R.an.find(a => a.src === "عدم الملاءمة");
    if (lof && lof.p < 0.05) warn.push("عدم الملاءمة معنوي (p < 0.05): النموذج التربيعي لا يصف البيانات جيداً؛ تحقق من القيم الشاذة أو من حاجة لتحويل الاستجابة.");
    if (isFinite(o.pred) && o.adj - o.pred > 0.2) warn.push(`R² التنبؤي (${F(o.pred)}) أقل من المعدّل (${F(o.adj)}) بأكثر من 0.2: قد تكون هناك تجربة مؤثرة جداً أو نموذج أكبر من اللازم.`);
    if (!lof) warn.push("لا توجد تجارب مكررة لتقدير الخطأ الصافي، فلم يُحسب اختبار عدم الملاءمة.");
    const edge = opt.edge.map((e, i) => (e ? i : -1)).filter(i => i >= 0);
    out.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3><span class="pl-step">3</span>النموذج وجودته</h3><span class="sub">${o.n} تجربة · ${o.k} معاملاً</span></div>
        <div class="qc-sum">
          <div class="db-kpi tone-b-${o.r2 >= 0.9 ? "good" : o.r2 >= 0.7 ? "fair" : "warn"}"><span class="k">R²</span><span class="v">${F(o.r2, 4)}</span></div>
          <div class="db-kpi tone-b-info"><span class="k">R² المعدّل</span><span class="v">${F(o.adj, 4)}</span></div>
          <div class="db-kpi tone-b-info"><span class="k">R² التنبؤي</span><span class="v">${F(o.pred, 4)}</span></div>
          <div class="db-kpi tone-b-${R.an[0].p < 0.05 ? "good" : "bad"}"><span class="k">معنوية النموذج</span><span class="v">${P(R.an[0].p)}</span></div>
        </div>
        ${warn.map(w => `<div class="notice warn u-mt10">${ico("i-warn")}<span>${esc(w)}</span></div>`).join("")}
        <h4 class="ex-h4">جدول تحليل التباين ANOVA</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المصدر</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p</th></tr></thead><tbody>
          ${R.an.map(a => `<tr class="${a.sub ? "ex-sub" : ""} ${isFinite(a.p) ? sig(a.p) : ""}"><td>${a.src}</td><td class="num">${F(a.ss, 4)}</td><td class="num">${a.df}</td><td class="num">${F(a.ms, 4)}</td><td class="num">${F(a.F, 3)}</td><td class="num">${P(a.p)}</td></tr>`).join("")}
        </tbody></table></div>
        <h4 class="ex-h4">المعاملات (بالقيم المرمّزة)</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>الحد</th><th>المعامل</th><th>الخطأ المعياري</th><th>t</th><th>p</th></tr></thead><tbody>
          ${R.T.map((t, i) => `<tr class="${i && o.p[i] < 0.05 ? "sig" : ""}"><td>${termName(t)}</td><td class="num">${F(o.beta[i], 4)}</td><td class="num">${F(o.se[i], 4)}</td><td class="num">${F(o.t[i], 3)}</td><td class="num">${P(o.p[i])}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="ex-eq" dir="ltr">${esc(eqText(o.beta, R.T, false))}</p>
        <details class="db-method"><summary>${ico("i-code")}المعادلة بالقيم الفعلية</summary><p class="ex-eq" dir="ltr">${esc(eqText(R.oa.beta, R.T, true))}</p></details>
        <p class="faint ex-note">الحروف: ${D.factors.map((f, i) => `${L(i)} = ${esc(f.n)}`).join("، ")}. الصفوف المظللة معنوية عند 0.05. المعاملات المرمّزة تقارن أهمية العوامل مباشرة لأن كل العوامل بمقياس واحد (−1 إلى +1).</p>
      </section>
      <section class="panel">
        <div class="panel-h"><h3><span class="pl-step">4</span>الظروف المثلى وتجربة التأكيد</h3><span class="sub">${D.goal === "min" ? "أدنى" : "أعلى"} قيمة متوقعة ضمن المدى المدروس</span></div>
        <div class="ex-opt">${D.factors.map((f, i) => `<div class="db-kpi tone-b-info"><span class="k">${L(i)}: ${esc(f.n)}</span><span class="v">${F(round(toActual(f, opt.x[i])), 3)}<small>${esc(f.u)}</small></span></div>`).join("")}
          <div class="db-kpi tone-b-good"><span class="k">${esc(D.resp)} المتوقعة</span><span class="v">${F(opt.y, 2)}<small>${esc(D.ru)}</small></span><span class="d">فترة تنبؤ 95% لتجربة واحدة: ${F(opt.y - opt.pi, 2)} – ${F(opt.y + opt.pi, 2)}</span></div></div>
        <div class="notice info u-mt10">${ico("i-check")}<span><b>تجربة التأكيد:</b> نفّذ 3 مكررات عند هذه الظروف. إذا وقع متوسطها داخل فترة التنبؤ (${F(opt.y - opt.pi, 2)} – ${F(opt.y + opt.pi, 2)}) فالنموذج مؤكَّد تجريبياً، وهذه الخطوة تطلبها لجان المناقشة عادةً.</span></div>
        ${edge.length ? `<div class="notice warn u-mt10">${ico("i-warn")}<span>المثلى على حافة المدى المدروس للعامل ${edge.map(i => `«${esc(D.factors[i].n)}»`).join(" و")}، فقد تكون القيمة الأفضل خارج المدى. اتجاه التحسن (الصعود الأشد): ${edge.map(i => `${esc(D.factors[i].n)} ${R.grad[i] > 0 ? "↑ زيادة" : "↓ نقصان"}`).join("، ")}. وسّع المدى في هذا الاتجاه وأعد التصميم حوله قبل اعتماد المثلى.</span></div>` : ""}
        ${k >= 2 ? `<div class="ex-cont-ctl">
          <label>المحور الأفقي <select class="input" id="ex-cx">${D.factors.map((f, i) => `<option value="${i}"${i === (D.cx || 0) ? " selected" : ""}>${L(i)}: ${esc(f.n)}</option>`).join("")}</select></label>
          <label>المحور العمودي <select class="input" id="ex-cy">${D.factors.map((f, i) => `<option value="${i}"${i === (D.cy || 1) ? " selected" : ""}>${L(i)}: ${esc(f.n)}</option>`).join("")}</select></label>
          <span class="faint">${k > 2 ? "بقية العوامل مثبتة عند قيمها المثلى." : ""}</span></div>
          <div class="ex-cont"><canvas id="ex-contour" width="640" height="460" aria-label="رسم كنتوري لسطح الاستجابة"></canvas></div>` : ""}
        <div class="row u-mt14"><button type="button" class="btn" id="ex-rxl">${ico("i-down")}تنزيل التحليل Excel</button><button type="button" class="btn" id="ex-rmeth">${ico("i-copy")}نسخ فقرة المنهجية والنتائج</button></div>
      </section>`;
    if (k >= 2) {
      const draw = () => contour(R, +U.$("#ex-cx").value, +U.$("#ex-cy").value);
      U.$("#ex-cx").onchange = e => { D.cx = +e.target.value; saveD(); draw(); };
      U.$("#ex-cy").onchange = e => { D.cy = +e.target.value; saveD(); draw(); };
      draw();
    }
    U.$("#ex-rxl").onclick = () => TB.xlsx([
      { name: "ANOVA", rows: [["المصدر", "SS", "df", "MS", "F", "p"]].concat(R.an.map(a => [a.src, a.ss, a.df, a.ms, isFinite(a.F) ? a.F : "", isFinite(a.p) ? a.p : ""])) },
      { name: "المعاملات", rows: [["الحد", "المعامل المرمّز", "الخطأ المعياري", "t", "p", "المعامل بالقيم الفعلية"]].concat(R.T.map((t, i) => [termName(t), o.beta[i], o.se[i], o.t[i], o.p[i], R.oa.beta[i]])) },
      { name: "المثلى", rows: [["العامل", "القيمة المثلى"]].concat(D.factors.map((f, i) => [f.n + (f.u ? ` (${f.u})` : ""), round(toActual(f, opt.x[i]))]), [[D.resp + " المتوقعة", opt.y], ["الحد الأدنى لفترة التنبؤ 95%", opt.y - opt.pi], ["الحد الأعلى لفترة التنبؤ 95%", opt.y + opt.pi], ["R²", o.r2], ["R² المعدّل", o.adj], ["R² التنبؤي", o.pred]]) }
    ], "تحليل-RSM.xlsx");
    U.$("#ex-rmeth").onclick = () => TB.copy(doeText(R));
    if (scroll) out.scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
  }

  function doeText(R) {
    const o = R.o, k = D.factors.length, opt = R.opt;
    const des = { bbd: "تصميم Box–Behnken", ccd: `التصميم المركّب المركزي الدوّار (α = ${F(alphaOf(k, "ccd"), 3)})`, ccf: "التصميم المركّب المركزي بأوجه (α = 1)", fact: `التصميم العاملي 2^${k}` }[D.design];
    const sigT = R.T.map((t, i) => (i && o.p[i] < 0.05 ? termName(t) : null)).filter(Boolean);
    return `صُمّمت التجارب بمنهجية سطح الاستجابة باستعمال ${des} لـ ${k} عوامل (${D.factors.map((f, i) => `${L(i)}: ${f.n} ${f.lo}–${f.hi}${f.u ? " " + f.u : ""}`).join("؛ ")}) بمجموع ${D.runs.length} تجربة منها ${D.cp} نقاط مركزية، ونُفّذت بترتيب عشوائي. ` +
      `لُوئم نموذج ${R.quad ? "متعدد حدود من الدرجة الثانية" : "خطي مع التداخلات"} بطريقة المربعات الصغرى على القيم المرمّزة، وقُيّمت معنوية النموذج وحدوده بتحليل التباين عند مستوى 0.05. ` +
      `كان النموذج معنوياً (F = ${F(R.an[0].F, 2)}، p ${R.an[0].p < 0.0001 ? "< 0.0001" : "= " + F(R.an[0].p, 4)}) بمعامل تحديد R² = ${F(o.r2, 4)} وR² معدّل = ${F(o.adj, 4)} وR² تنبؤي = ${F(o.pred, 4)}` +
      (R.an.find(a => a.src === "عدم الملاءمة") ? `، وكان اختبار عدم الملاءمة ${R.an.find(a => a.src === "عدم الملاءمة").p < 0.05 ? "معنوياً" : "غير معنوي"} (p = ${F(R.an.find(a => a.src === "عدم الملاءمة").p, 4)})` : "") + `. ` +
      `الحدود المعنوية: ${sigT.join("، ") || "لا يوجد"} (${D.factors.map((f, i) => `${L(i)} = ${f.n}`).join("، ")}). ` +
      `بلغت ${D.resp} المتوقعة ${D.goal === "min" ? "الدنيا" : "القصوى"} ${F(opt.y, 2)}${D.ru ? " " + D.ru : ""} عند ${D.factors.map((f, i) => `${f.n} = ${F(round(toActual(f, opt.x[i])), 3)}${f.u ? " " + f.u : ""}`).join("، ")}، بفترة تنبؤ 95% بين ${F(opt.y - opt.pi, 2)} و${F(opt.y + opt.pi, 2)}.`;
  }

  /* رسم كنتوري: خلايا ملوّنة + خطوط تساوي بطريقة المربعات المتحركة */
  function contour(R, ix, iy) {
    const cv = U.$("#ex-contour"); if (!cv) return;
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, pad = { l: 64, r: 18, t: 16, b: 52 };
    ctx.clearRect(0, 0, W, H);
    if (ix === iy) { ctx.fillStyle = "#8eaea7"; ctx.font = "14px 'IBM Plex Sans Arabic', sans-serif"; ctx.textAlign = "center"; ctx.fillText("اختر عاملين مختلفين للمحورين", W / 2, H / 2); return; }
    const lim = R.lim, n = 70, base = R.opt.x.slice(), Z = [];
    let zmin = Infinity, zmax = -Infinity;
    for (let j = 0; j <= n; j++) { Z[j] = []; for (let i = 0; i <= n; i++) { const x = base.slice(); x[ix] = -lim + 2 * lim * i / n; x[iy] = -lim + 2 * lim * j / n; const z = R.pred(x); Z[j][i] = z; zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); } }
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, X = i => pad.l + pw * i / n, Y = j => pad.t + ph * (1 - j / n);
    const stops = [[11, 42, 51], [26, 94, 110], [79, 200, 220], [147, 221, 138], [230, 214, 120]];
    const col = z => { let t = (z - zmin) / (zmax - zmin || 1); if (D.goal === "min") t = 1 - t; t = Math.max(0, Math.min(1, t)) * (stops.length - 1); const a = Math.floor(Math.min(t, stops.length - 2)), f = t - a; return `rgb(${stops[a].map((v, q) => Math.round(v + (stops[a + 1][q] - v) * f)).join(",")})`; };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { ctx.fillStyle = col((Z[j][i] + Z[j][i + 1] + Z[j + 1][i] + Z[j + 1][i + 1]) / 4); ctx.fillRect(X(i), Y(j + 1), pw / n + 0.6, ph / n + 0.6); }
    // خطوط التساوي
    ctx.strokeStyle = "rgba(5,17,22,.55)"; ctx.lineWidth = 1; ctx.fillStyle = "#051116"; ctx.font = "11px 'IBM Plex Mono', monospace"; ctx.textAlign = "center";
    const levels = 8;
    for (let L_ = 1; L_ < levels; L_++) {
      const lv = zmin + (zmax - zmin) * L_ / levels; let labeled = false;
      ctx.beginPath();
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = Z[j][i], b = Z[j][i + 1], c = Z[j + 1][i + 1], d = Z[j + 1][i], pts = [];
        const e = (p, q, v1, v2) => [p[0] + (q[0] - p[0]) * (lv - v1) / (v2 - v1), p[1] + (q[1] - p[1]) * (lv - v1) / (v2 - v1)];
        const P0 = [i, j], P1 = [i + 1, j], P2 = [i + 1, j + 1], P3 = [i, j + 1];
        if ((a - lv) * (b - lv) < 0) pts.push(e(P0, P1, a, b));
        if ((b - lv) * (c - lv) < 0) pts.push(e(P1, P2, b, c));
        if ((c - lv) * (d - lv) < 0) pts.push(e(P2, P3, c, d));
        if ((d - lv) * (a - lv) < 0) pts.push(e(P3, P0, d, a));
        if (pts.length >= 2) { ctx.moveTo(X(pts[0][0]), Y(pts[0][1])); ctx.lineTo(X(pts[1][0]), Y(pts[1][1])); if (!labeled && i > n * 0.3 && i < n * 0.7) { ctx.save(); ctx.fillStyle = "rgba(5,17,22,.85)"; ctx.fillText(F(lv, 1), X(pts[0][0]), Y(pts[0][1]) - 3); ctx.restore(); labeled = true; } }
      }
      ctx.stroke();
    }
    // نقاط التصميم والمثلى
    const fx = D.factors[ix], fy = D.factors[iy], cx = c => X((c + lim) / (2 * lim) * n), cy = c => Y((c + lim) / (2 * lim) * n);
    R.rows.forEach(r => { if (Math.abs(r.x[ix]) > lim + 1e-9 || Math.abs(r.x[iy]) > lim + 1e-9) return; ctx.beginPath(); ctx.arc(cx(r.x[ix]), cy(r.x[iy]), 3.2, 0, 7); ctx.fillStyle = "#051116"; ctx.fill(); ctx.strokeStyle = "#e4f1ed"; ctx.stroke(); });
    ctx.beginPath(); ctx.arc(cx(R.opt.x[ix]), cy(R.opt.x[iy]), 7, 0, 7); ctx.strokeStyle = "#ef5a64"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.lineWidth = 1;
    // المحاور
    ctx.fillStyle = "#c9dcd7"; ctx.font = "11px 'IBM Plex Mono', monospace";
    for (let s = 0; s <= 4; s++) { const c = -lim + 2 * lim * s / 4; ctx.textAlign = "center"; ctx.fillText(F(round(toActual(fx, c)), 3), cx(c), H - pad.b + 16); ctx.textAlign = "right"; ctx.fillText(F(round(toActual(fy, c)), 3), pad.l - 6, cy(c) + 4); }
    ctx.font = "13px 'IBM Plex Sans Arabic', sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${fx.n}${fx.u ? ` (${fx.u})` : ""}`, pad.l + pw / 2, H - 10);
    ctx.save(); ctx.translate(16, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`${fy.n}${fy.u ? ` (${fy.u})` : ""}`, 0, 0); ctx.restore();
  }

  /* =================================================================
     2) اختبار الجرة
  ================================================================= */
  const J = store("jar") || { c0: "", unit: "NTU", coag: "الشب (كبريتات الألمنيوم)", rows: [[10, ""], [20, ""], [30, ""], [40, ""], [50, ""], [60, ""]] };
  function renderJar() {
    const host = U.$("#ex-jar"); if (!host) return;
    host.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-flask")}نتائج الجرار</h3><span class="sub">جرعة المخثر والعكورة (أو التركيز) المتبقية بعد الترسيب</span></div>
        <div class="db-ctrl">
          <div class="field"><label for="jr-coag">المخثر</label><input id="jr-coag" class="input" value="${esc(J.coag)}"></div>
          <div class="field"><label for="jr-c0">القيمة الابتدائية قبل المعالجة (اختياري)</label><input id="jr-c0" class="input num" value="${esc(J.c0)}" inputmode="decimal"></div>
          <div class="field"><label for="jr-u">وحدة القياس</label><input id="jr-u" class="input" value="${esc(J.unit)}"></div>
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>الجرة</th><th>الجرعة (mg/L)</th><th>المتبقي بعد الترسيب</th></tr></thead><tbody>
          ${J.rows.map((r, i) => `<tr><td class="num">${i + 1}</td><td><input class="input num" data-jr="${i}" data-c="0" value="${r[0]}" inputmode="decimal"></td><td><input class="input num" data-jr="${i}" data-c="1" value="${r[1]}" inputmode="decimal"></td></tr>`).join("")}
        </tbody></table></div>
        <div class="row u-mt10"><button type="button" class="btn btn-sm" id="jr-add">${ico("i-plus")}جرة أخرى</button><button type="button" class="btn btn-primary" id="jr-go">${ico("i-spark")}احسب الجرعة المثلى</button></div>
      </section>
      <div id="jr-out"></div>`;
    host.querySelectorAll("[data-jr]").forEach(inp => inp.onchange = () => { J.rows[+inp.dataset.jr][+inp.dataset.c] = inp.value.trim(); store("jar", J); });
    U.$("#jr-coag").onchange = e => { J.coag = e.target.value; store("jar", J); };
    U.$("#jr-c0").onchange = e => { J.c0 = e.target.value; store("jar", J); };
    U.$("#jr-u").onchange = e => { J.unit = e.target.value; store("jar", J); };
    U.$("#jr-add").onclick = () => { J.rows.push(["", ""]); store("jar", J); renderJar(); };
    U.$("#jr-go").onclick = () => { host.querySelectorAll("[data-jr]").forEach(inp => { J.rows[+inp.dataset.jr][+inp.dataset.c] = inp.value.trim(); }); store("jar", J); jarAnalyze(); };
    if (J.rows.filter(r => isFinite(TB.num(r[0])) && isFinite(TB.num(r[1]))).length >= 4) jarAnalyze();
  }
  function jarAnalyze() {
    const out = U.$("#jr-out");
    const pts = J.rows.map(r => [TB.num(r[0]), TB.num(r[1])]).filter(p => isFinite(p[0]) && isFinite(p[1])).sort((a, b) => a[0] - b[0]);
    if (pts.length < 4) { out.innerHTML = `<div class="notice info">${ico("i-info")}<span>أدخل نتائج 4 جرار على الأقل.</span></div>`; return; }
    const o = FL.ols(pts.map(p => [1, p[0], p[0] * p[0]]), pts.map(p => p[1]));
    const [a, b, c] = o.beta, dmin = pts[0][0], dmax = pts[pts.length - 1][0], c0 = TB.num(J.c0);
    const bestObs = pts.reduce((m, p) => (p[1] < m[1] ? p : m), pts[0]);
    const vertex = c > 0 ? -b / (2 * c) : NaN, inside = isFinite(vertex) && vertex >= dmin && vertex <= dmax;
    const yv = inside ? a + b * vertex + c * vertex * vertex : NaN;
    const step = (dmax - dmin) / (pts.length - 1);
    const center = inside ? vertex : bestObs[0];
    let next;
    if (inside) next = Array.from({ length: 6 }, (_, i) => Math.max(0, round(center + (i - 2.5) * step / 2)));
    else if (bestObs[0] === dmax) next = Array.from({ length: 6 }, (_, i) => round(dmax + i * step));
    else if (bestObs[0] === dmin) next = Array.from({ length: 6 }, (_, i) => Math.max(0, round(dmin - (5 - i) * step / 2)));
    else next = Array.from({ length: 6 }, (_, i) => Math.max(0, round(center + (i - 2.5) * step / 2)));
    const rise = pts.findIndex((p, i) => i > 0 && i > pts.indexOf(bestObs) && p[1] > bestObs[1] * 1.25) >= 0;
    const rem = v => (isFinite(c0) && c0 > 0 ? ` (إزالة ${F(100 * (c0 - v) / c0, 1)}%)` : "");
    out.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-check")}الجرعة المثلى</h3><span class="sub">منحنى تربيعي R² = ${F(o.r2, 3)}</span></div>
        <div class="ex-opt">
          <div class="db-kpi tone-b-good"><span class="k">${inside ? "الجرعة المثلى من المنحنى" : "أفضل جرعة مجرَّبة"}</span><span class="v">${F(inside ? vertex : bestObs[0], 1)}<small>mg/L</small></span><span class="d">${esc(J.coag)}</span></div>
          <div class="db-kpi tone-b-info"><span class="k">المتبقي المتوقع</span><span class="v">${F(inside ? yv : bestObs[1], 2)}<small>${esc(J.unit)}</small></span><span class="d">${rem(inside ? yv : bestObs[1])}</span></div>
        </div>
        ${!inside ? `<div class="notice warn u-mt10">${ico("i-warn")}<span>${bestObs[0] === dmax ? "أقل متبقٍّ عند أعلى جرعة مجرّبة: الجرعة المثلى غالباً أعلى من مداك." : bestObs[0] === dmin ? "أقل متبقٍّ عند أدنى جرعة: الجرعة المثلى غالباً أقل من مداك." : "المنحنى لا يصف القيمة الدنيا جيداً؛ اعتمد أفضل جرعة مجرّبة وضيّق المدى حولها."}</span></div>` : ""}
        ${rise ? `<div class="notice info u-mt10">${ico("i-info")}<span>العكورة ترتفع بعد الجرعة المثلى: علامة على إعادة الاستقرار بزيادة المخثر (Restabilization)، فلا تزد الجرعة.</span></div>` : ""}
        <div class="notice info u-mt10">${ico("i-gps")}<span><b>الجولة الثانية المقترحة:</b> ${next.map(v => F(v, 1)).join("، ")} mg/L — مدى أضيق حول ${inside ? "المثلى" : "أفضل نتيجة"} بخطوة ${F(inside ? step / 2 : step, 1)} mg/L. ثبّت pH والحرارة وسرعات الخلط كما في الجولة الأولى (ASTM D2035).</span></div>
        <div class="chart-box sm u-mt14"><canvas id="jr-chart"></canvas></div>
        <p class="faint ex-note">المنحنى: المتبقي = ${F(a, 4)} ${b < 0 ? "−" : "+"} ${F(Math.abs(b), 5)}·الجرعة ${c < 0 ? "−" : "+"} ${F(Math.abs(c), 7)}·الجرعة². المرجع: ASTM D2035-19 Standard Practice for Coagulation-Flocculation Jar Test of Water.</p>
      </section>`;
    const xs = Array.from({ length: 60 }, (_, i) => dmin + (dmax - dmin) * i / 59);
    chart("jr-chart", { type: "scatter", data: { datasets: [
      { label: "القياس", data: pts.map(p => ({ x: p[0], y: p[1] })), backgroundColor: "#4fc8dc", pointRadius: 5 },
      { label: "المنحنى التربيعي", data: xs.map(x => ({ x, y: a + b * x + c * x * x })), type: "line", borderColor: "#93dd8a", pointRadius: 0, borderWidth: 2 }].concat(inside ? [{ label: "المثلى", data: [{ x: vertex, y: yv }], backgroundColor: "#ef5a64", pointRadius: 7, pointStyle: "rectRot" }] : []) },
      options: { maintainAspectRatio: false, scales: { x: { title: { display: true, text: "الجرعة (mg/L)" } }, y: { title: { display: true, text: `المتبقي (${J.unit})` } } } } });
  }

  /* =================================================================
     3) نماذج الامتزاز
  ================================================================= */
  const RG = 8.314; // J/mol/K
  const ISO = [
    { id: "lang", n: "لانكماير", p: ["qm (mg/g)", "KL (L/mg)"], f: (x, p) => p[0] * p[1] * x / (1 + p[1] * x), p0: (C, q) => [Math.max(...q) * 1.2, 1 / U.mean(C)], lo: [0, 0] },
    { id: "freu", n: "فرندلش", p: ["KF", "n"], f: (x, p) => p[0] * Math.pow(x, 1 / p[1]), p0: (C, q) => [q[0] / Math.pow(C[0], 0.5), 2], lo: [0, 0.05] },
    { id: "temk", n: "تمكين", p: ["B = RT/bT", "AT (L/mg)"], f: (x, p) => p[0] * Math.log(Math.max(1e-12, p[1] * x)), p0: (C, q) => [(Math.max(...q) - Math.min(...q)) / Math.log(Math.max(...C) / Math.min(...C) || 2), 1], lo: [0, 1e-9] },
    { id: "sips", n: "سيبس (Sips)", p: ["qm (mg/g)", "Ks (L/mg)^ns", "ns"], f: (x, p) => { const a = Math.pow(p[1] * x, p[2]); return p[0] * a / (1 + a); }, p0: (C, q) => [Math.max(...q) * 1.2, 1 / U.mean(C), 1], lo: [0, 0, 0.05], k: 3 },
    { id: "rp", n: "ريدليتش–بيترسون", p: ["KR (L/g)", "aR (L/mg)^g", "g"], f: (x, p) => p[0] * x / (1 + p[1] * Math.pow(x, p[2])), p0: (C, q) => [q[0] / C[0] * 1.2, 1 / U.mean(C), 0.9], lo: [0, 0, 0], up: [Infinity, Infinity, 1], k: 3 },
    { id: "dr", n: "دوبينين–رادوشكيفيتش", p: ["qm (mg/g)", "β (mol²/kJ²)"], dr: true, f: null, lo: [0, 0] }
  ];
  const KIN = [
    { id: "pfo", n: "الرتبة الأولى الكاذبة", p: ["qe (mg/g)", "k1 (1/دقيقة)"], f: (t, p) => p[0] * (1 - Math.exp(-p[1] * t)), p0: (T, q) => [Math.max(...q), 1 / U.mean(T)], lo: [0, 0] },
    { id: "pso", n: "الرتبة الثانية الكاذبة", p: ["qe (mg/g)", "k2 (g/mg·دقيقة)"], f: (t, p) => p[1] * p[0] * p[0] * t / (1 + p[1] * p[0] * t), p0: (T, q) => [Math.max(...q) * 1.1, 1 / (Math.max(...q) * U.mean(T))], lo: [0, 0] },
    { id: "elov", n: "إيلوفيتش", p: ["α (mg/g·دقيقة)", "β (g/mg)"], f: (t, p) => Math.log(1 + p[0] * p[1] * t) / p[1], p0: (T, q) => [Math.max(...q) / U.mean(T), 1 / Math.max(...q)], lo: [1e-9, 1e-9] },
    { id: "ipd", n: "الانتشار داخل الجسيمات (Weber–Morris)", p: ["kid (mg/g·دقيقة^0.5)", "C (mg/g)"], f: (t, p) => p[0] * Math.sqrt(t) + p[1], p0: (T, q) => [1, 0], lo: [-Infinity, -Infinity] }
  ];
  const A = store("ads") || { mode: "iso", T: 25, M: "", rows: [["", ""], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""]] };
  function renderAds() {
    const host = U.$("#ex-ads"); if (!host) return;
    const iso = A.mode === "iso";
    host.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-atom")}بيانات الامتزاز</h3><span class="sub">${iso ? "تراكيز التوازن Ce والسعة qe" : "الزمن والسعة qt"}</span></div>
        <div class="seg" id="ad-mode" role="tablist"><button type="button" data-m="iso" class="${iso ? "on" : ""}">الأيزوثيرمات (التوازن)</button><button type="button" data-m="kin" class="${!iso ? "on" : ""}">الحركية (الزمن)</button></div>
        ${iso ? `<div class="db-ctrl u-mt10"><div class="field"><label for="ad-T">حرارة التجربة (°م)</label><input id="ad-T" class="input num" value="${esc(A.T)}" inputmode="decimal"></div>
          <div class="field"><label for="ad-M">الكتلة المولية للملوث g/mol (لنموذج D–R)</label><input id="ad-M" class="input num" value="${esc(A.M)}" placeholder="مثال: 207.2 للرصاص" inputmode="decimal"></div></div>` : ""}
        <div class="tbl-wrap u-mt10"><table class="tbl"><thead><tr><th>${iso ? "Ce (mg/L)" : "الزمن t (دقيقة)"}</th><th>${iso ? "qe (mg/g)" : "qt (mg/g)"}</th></tr></thead><tbody>
          ${A.rows.map((r, i) => `<tr><td><input class="input num" data-ad="${i}" data-c="0" value="${esc(r[0])}" inputmode="decimal"></td><td><input class="input num" data-ad="${i}" data-c="1" value="${esc(r[1])}" inputmode="decimal"></td></tr>`).join("")}
        </tbody></table></div>
        <p class="faint ex-note">لصق من Excel: انسخ عمودين (بلا عناوين) والصقهما في الخانة الأولى. qe = (C₀ − Ce) × V ÷ m.</p>
        <div class="row u-mt10"><button type="button" class="btn btn-sm" id="ad-add">${ico("i-plus")}صف آخر</button><button type="button" class="btn btn-primary" id="ad-go">${ico("i-spark")}قارن النماذج</button></div>
      </section>
      <div id="ad-out"></div>`;
    host.querySelectorAll("#ad-mode button").forEach(b => b.onclick = () => { A.mode = b.dataset.m; store("ads", A); renderAds(); });
    const tIn = U.$("#ad-T"); if (tIn) tIn.onchange = e => { A.T = e.target.value; store("ads", A); };
    const mIn = U.$("#ad-M"); if (mIn) mIn.onchange = e => { A.M = e.target.value; store("ads", A); };
    host.querySelectorAll("[data-ad]").forEach(inp => {
      inp.onchange = () => { A.rows[+inp.dataset.ad][+inp.dataset.c] = inp.value.trim(); store("ads", A); };
      inp.onpaste = e => {
        const t = (e.clipboardData || window.clipboardData).getData("text"); if (!/[\t\n]/.test(t)) return;
        e.preventDefault(); const rows = TB.parseText(t).filter(r => r.length >= 2 && isFinite(TB.num(r[0])));
        if (!rows.length) return; A.rows = rows.map(r => [r[0], r[1]]); store("ads", A); renderAds();
      };
    });
    U.$("#ad-add").onclick = () => { A.rows.push(["", ""]); store("ads", A); renderAds(); };
    U.$("#ad-go").onclick = () => { host.querySelectorAll("[data-ad]").forEach(inp => { A.rows[+inp.dataset.ad][+inp.dataset.c] = inp.value.trim(); }); store("ads", A); adsAnalyze(); };
    if (A.rows.filter(r => isFinite(TB.num(r[0])) && isFinite(TB.num(r[1]))).length >= 4) adsAnalyze();
  }
  function adsAnalyze() {
    const out = U.$("#ad-out"), iso = A.mode === "iso";
    const pts = A.rows.map(r => [TB.num(r[0]), TB.num(r[1])]).filter(p => isFinite(p[0]) && isFinite(p[1]) && p[0] > 0 && p[1] >= 0).sort((a, b) => a[0] - b[0]);
    if (pts.length < 4) { out.innerHTML = `<div class="notice info">${ico("i-info")}<span>أدخل 4 نقاط على الأقل (والأفضل 6 فأكثر للنماذج ثلاثية المعاملات).</span></div>`; return; }
    const x = pts.map(p => p[0]), y = pts.map(p => p[1]), Tk = (TB.num(A.T) || 25) + 273.15, M = TB.num(A.M);
    const list = (iso ? ISO : KIN).map(m => {
      if ((m.k || 2) > pts.length - 2) return { m, skip: `يحتاج ${(m.k || 2) + 2} نقاط على الأقل` };
      let f = m.f, p0 = m.p0 ? m.p0(x, y) : null;
      if (m.dr) {
        if (!(M > 0)) return { m, skip: "أدخل الكتلة المولية للملوث" };
        const eps = c => RG / 1000 * Tk * Math.log(1 + 1 / (c / 1000 / M));   // kJ/mol، Ce بالمول/لتر
        f = (c, p) => p[0] * Math.exp(-p[1] * eps(c) ** 2); p0 = [Math.max(...y) * 1.2, 1e-3];
      }
      const r = m.id === "ipd" ? (() => { const o = FL.ols(x.map(t => [Math.sqrt(t), 1]), y); if (!o) return null; return { p: o.beta, se: o.se, sse: o.sse, n: o.n, m: 2, r2: o.r2, adj: o.adj, rmse: Math.sqrt(o.sse / o.n), fit: o.fit, chi2: y.reduce((s, v, i) => s + (o.fit[i] ? (v - o.fit[i]) ** 2 / Math.abs(o.fit[i]) : 0), 0), aicc: (() => { const aic = o.n * Math.log(o.sse / o.n) + 4; return o.n - 3 > 0 ? aic + 12 / (o.n - 3) : Infinity; })() }; })()
        : FL.lm(f, p0, x, y, { lower: m.lo, upper: m.up });
      return r ? { m, r, f: m.id === "ipd" ? ((t, p) => p[0] * Math.sqrt(t) + p[1]) : f } : { m, skip: "لم تتقارب الملاءمة" };
    });
    const ok = list.filter(z => z.r && isFinite(z.r.aicc));
    FL.akaike(ok.map(z => z.r));
    ok.sort((a, b) => a.r.aicc - b.r.aicc);
    const best = ok[0];
    const extra = z => {
      if (!z.r) return "";
      const p = z.r.p;
      if (z.m.id === "lang") { const c0 = Math.max(...x); const RL = 1 / (1 + p[1] * c0); return `RL عند أعلى Ce = ${F(RL, 3)} (${RL > 0 && RL < 1 ? "ملائم" : RL === 1 ? "خطي" : "غير ملائم"})`; }
      if (z.m.id === "freu") return `1/n = ${F(1 / p[1], 3)} (${1 / p[1] < 1 ? "امتزاز ملائم" : "غير ملائم"})`;
      if (z.m.id === "temk") return `bT = ${F(RG * Tk / p[0], 1)} J/mol`;
      if (z.m.id === "dr") { const E = 1 / Math.sqrt(2 * p[1]); return `E = ${F(E, 2)} kJ/mol (${E < 8 ? "امتزاز فيزيائي" : E <= 16 ? "تبادل أيوني" : "امتزاز كيميائي"})`; }
      if (z.m.id === "pso" || z.m.id === "pfo") return `qe المحسوبة ${F(p[0], 3)} مقابل أعلى قيمة مقاسة ${F(Math.max(...y), 3)}`;
      if (z.m.id === "ipd") return p[1] > 0.05 * Math.max(...y) ? "C > 0: الانتشار داخل الجسيمات ليس الخطوة المحددة الوحيدة" : "الخط يمر قرب الأصل";
      return "";
    };
    out.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-check")}مقارنة النماذج (ملاءمة غير خطية)</h3><span class="sub">مرتبة حسب AICc: الأقل أفضل</span></div>
        ${best ? `<div class="notice info">${ico("i-check")}<span>أفضل نموذج: <b>${esc(best.m.n)}</b> بوزن أكايكي ${F(100 * best.r.wAicc, 0)}%${ok[1] && ok[1].r.dAicc < 2 ? ` — لكن «${esc(ok[1].m.n)}» قريب منه (ΔAICc < 2)، فلا يمكن تفضيل أحدهما بثقة` : ""}.</span></div>` : ""}
        <div class="tbl-wrap u-mt10"><table class="tbl"><thead><tr><th>النموذج</th><th>المعاملات ± الخطأ المعياري</th><th>R²</th><th>R² المعدّل</th><th>RMSE</th><th>χ²</th><th>AICc</th><th>الوزن</th><th>ملاحظة</th></tr></thead><tbody>
          ${ok.map(z => `<tr class="${z === best ? "sig" : ""}"><td>${esc(z.m.n)}</td><td class="num">${z.m.p.map((pn, i) => `${pn} = ${G4(z.r.p[i])} ± ${G2(z.r.se[i])}`).join("<br>")}</td><td class="num">${F(z.r.r2, 4)}</td><td class="num">${F(z.r.adj, 4)}</td><td class="num">${F(z.r.rmse, 3)}</td><td class="num">${F(z.r.chi2, 3)}</td><td class="num">${F(z.r.aicc, 2)}</td><td class="num">${F(100 * z.r.wAicc, 0)}%</td><td>${esc(extra(z))}</td></tr>`).join("")}
          ${list.filter(z => z.skip).map(z => `<tr class="faint"><td>${esc(z.m.n)}</td><td colspan="8">${esc(z.skip)}</td></tr>`).join("")}
        </tbody></table></div>
        <div class="chart-box u-mt14"><canvas id="ad-chart"></canvas></div>
        <div class="row u-mt10"><button type="button" class="btn" id="ad-xl">${ico("i-down")}تنزيل المقارنة Excel</button></div>
        <details class="db-method"><summary>${ico("i-book")}لماذا الملاءمة غير الخطية؟</summary>
          <p>الصيغ الخطية (مثل Ce/qe مقابل Ce للانكماير) تغيّر بنية الخطأ فتعطي معاملات منحازة، وتختلف نتائجها باختلاف طريقة التحويل؛ لذلك يُنصح بالملاءمة غير الخطية ومقارنة النماذج بمعيار معلوماتي مثل AICc الذي يعاقب على زيادة المعاملات. المراجع: Foo, K.Y. & Hameed, B.H. (2010) Chem. Eng. J. 156:2–10؛ Tran, H.N. et al. (2017) Water Research 120:88–116؛ Burnham & Anderson (2002) Model Selection and Multimodel Inference.</p></details>
      </section>`;
    const xs = Array.from({ length: 80 }, (_, i) => x[0] * 0 + (Math.max(...x)) * (i + 1) / 80);
    const cols = ["#4fc8dc", "#93dd8a", "#e6ae4f", "#b493ff", "#ee7a4f", "#a5b6ff"];
    chart("ad-chart", { type: "scatter", data: { datasets: [{ label: "القياس", data: pts.map(p => ({ x: p[0], y: p[1] })), backgroundColor: "#e4f1ed", pointRadius: 5 }]
      .concat(ok.slice(0, 4).map((z, i) => ({ label: z.m.n, data: xs.map(v => ({ x: v, y: z.f(v, z.r.p) })), type: "line", borderColor: cols[i], pointRadius: 0, borderWidth: z === best ? 2.5 : 1.5, borderDash: z === best ? [] : [5, 4] }))) },
      options: { maintainAspectRatio: false, scales: { x: { title: { display: true, text: iso ? "Ce (mg/L)" : "الزمن (دقيقة)" } }, y: { title: { display: true, text: iso ? "qe (mg/g)" : "qt (mg/g)" } } } } });
    U.$("#ad-xl").onclick = () => TB.xlsx([{ name: "النماذج", rows: [["النموذج", "المعاملات", "R²", "R² المعدّل", "RMSE", "χ²", "AICc", "وزن أكايكي", "ملاحظة"]].concat(ok.map(z => [z.m.n, z.m.p.map((pn, i) => `${pn} = ${z.r.p[i]} ± ${z.r.se[i]}`).join(" ; "), z.r.r2, z.r.adj, z.r.rmse, z.r.chi2, z.r.aicc, z.r.wAicc, extra(z)])) },
      { name: "البيانات", rows: [[iso ? "Ce" : "t", iso ? "qe" : "qt"]].concat(pts) }], `نماذج-${iso ? "الأيزوثيرم" : "الحركية"}.xlsx`);
  }

  /* =================================================================
     4) منحنيات التحلل والنمو
  ================================================================= */
  const C = store("curve") || { mode: "decay", text: "" };
  function renderCurve() {
    const host = U.$("#ex-cur"); if (!host) return;
    const decay = C.mode === "decay";
    host.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-microbe")}بيانات عبر الزمن</h3><span class="sub">عمود للزمن وعمود لكل معاملة</span></div>
        <div class="seg" id="cu-mode"><button type="button" data-m="decay" class="${decay ? "on" : ""}">تحلّل ملوث (تركيز يتناقص)</button><button type="button" data-m="growth" class="${!decay ? "on" : ""}">نمو أحياء (OD أو log CFU)</button></div>
        <div class="field u-mt10"><label for="cu-txt">الصق الجدول من Excel مع صف العناوين (الزمن أولاً)</label>
          <textarea id="cu-txt" class="input mono" rows="6" dir="ltr" placeholder="${decay ? "الزمن (يوم)\tبدون معالجة\tبكتيريا معزولة\tبكتيريا + مغذيات\n0\t500\t500\t500\n7\t470\t390\t330\n…" : "الزمن (ساعة)\tمعاملة 1\tمعاملة 2\n0\t0.05\t0.05\n4\t0.06\t0.09\n…"}">${esc(C.text)}</textarea></div>
        <p class="faint ex-note">${decay ? "يُلاءم نموذج الرتبة الأولى C = C₀·e^(−kt) والرتبة الثانية لكل معاملة، ويُحسب نصف العمر، ويُختبر تساوي ثابت السرعة بين المعاملات." : "يُلاءم نموذج Gompertz المعدّل (Zwietering وآخرون 1990): طور التأخر λ، وأقصى معدل نمو μm، والزيادة القصوى A. للـ CFU أدخل ln(N/N₀) أو log."}</p>
        <button type="button" class="btn btn-primary" id="cu-go">${ico("i-spark")}حلّل المنحنيات</button>
      </section>
      <div id="cu-out"></div>`;
    host.querySelectorAll("#cu-mode button").forEach(b => b.onclick = () => { C.mode = b.dataset.m; store("curve", C); renderCurve(); });
    U.$("#cu-go").onclick = () => { C.text = U.$("#cu-txt").value; store("curve", C); curveAnalyze(); };
    if (C.text.trim()) curveAnalyze();
  }
  function curveAnalyze() {
    const out = U.$("#cu-out"), rows = TB.parseText(C.text);
    if (rows.length < 4 || rows[0].length < 2) { out.innerHTML = `<div class="notice info">${ico("i-info")}<span>الصق جدولاً فيه صف عناوين و4 أزمنة على الأقل.</span></div>`; return; }
    const head = rows[0], body = rows.slice(1).map(r => r.map(TB.num)).filter(r => isFinite(r[0]));
    const series = head.slice(1).map((h, j) => ({ name: String(h || `معاملة ${j + 1}`), pts: body.map(r => [r[0], r[j + 1]]).filter(p => isFinite(p[1])) })).filter(s => s.pts.length >= 4);
    if (!series.length) { out.innerHTML = `<div class="notice warn">${ico("i-warn")}<span>لا توجد معاملة فيها 4 قيم رقمية على الأقل.</span></div>`; return; }
    const cols = ["#4fc8dc", "#93dd8a", "#e6ae4f", "#b493ff", "#ee7a4f", "#a5b6ff", "#ef5a64"];
    if (C.mode === "decay") {
      const res = series.map(s => {
        const t = s.pts.map(p => p[0]), c = s.pts.map(p => p[1]), c0 = c[0] || Math.max(...c);
        const f1 = (x, p) => p[0] * Math.exp(-p[1] * x), f2 = (x, p) => p[0] / (1 + p[0] * p[1] * x);
        const r1 = FL.lm(f1, [c0, Math.max(1e-6, Math.log(Math.max(c0, 1e-9) / Math.max(c[c.length - 1], 1e-9)) / (t[t.length - 1] || 1))], t, c, { lower: [0, 0] });
        const r2 = FL.lm(f2, [c0, 1e-4], t, c, { lower: [0, 0] });
        const k = r1 ? r1.p[1] : NaN, seK = r1 ? r1.se[1] : NaN, half = Math.LN2 / k, seHalf = Math.LN2 / (k * k) * seK;
        const removal = 100 * (c[0] - c[c.length - 1]) / c[0];
        return { s, t, c, r1, r2, f1, f2, k, seK, half, seHalf, removal, best: r1 && r2 && r2.aicc < r1.aicc - 2 ? 2 : 1 };
      });
      // اختبار تساوي k بين المعاملات (مجموع المربعات الإضافي)
      let eq = null;
      if (res.length >= 2 && res.every(r => r.r1)) {
        const sseSep = res.reduce((s, r) => s + r.r1.sse, 0), nTot = res.reduce((s, r) => s + r.t.length, 0), pSep = 2 * res.length;
        const xs = [], ys = []; res.forEach((r, g) => r.t.forEach((tt, i) => { xs.push([g, tt]); ys.push(r.c[i]); }));
        const fShared = (x, p) => p[1 + x[0]] * Math.exp(-p[0] * x[1]);
        const sh = FL.lm(fShared, [U.mean(res.map(r => r.k)), ...res.map(r => r.r1.p[0])], xs, ys, { lower: [0].concat(res.map(() => 0)) });
        if (sh) { const pSh = 1 + res.length, df1 = pSep - pSh, df2 = nTot - pSep, Fv = ((sh.sse - sseSep) / df1) / (sseSep / df2); eq = { F: Fv, df1, df2, p: df2 > 0 ? ST().pF(Fv, df1, df2) : NaN }; }
      }
      out.innerHTML = `<section class="panel">
        <div class="panel-h"><h3>${ico("i-check")}ثابت سرعة التحلل ونصف العمر</h3><span class="sub">ملاءمة غير خطية لكل معاملة</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المعاملة</th><th>k (1/وحدة زمن) ± SE</th><th>نصف العمر t½ ± SE</th><th>R² (رتبة أولى)</th><th>الأفضل حسب AICc</th><th>الإزالة الكلية</th></tr></thead><tbody>
          ${res.map(r => `<tr><td>${esc(r.s.name)}</td><td class="num">${G4(r.k)} ± ${G2(r.seK)}</td><td class="num">${G4(r.half)} ± ${G2(r.seHalf)}</td><td class="num">${F(r.r1 && r.r1.r2, 4)}</td><td>${r.best === 2 ? "الرتبة الثانية" : "الرتبة الأولى"}</td><td class="num">${F(r.removal, 1)}%</td></tr>`).join("")}
        </tbody></table></div>
        ${eq ? `<div class="notice ${eq.p < 0.05 ? "info" : "warn"} u-mt10">${ico(eq.p < 0.05 ? "i-check" : "i-info")}<span>اختبار تساوي ثابت السرعة بين المعاملات (مجموع المربعات الإضافي): F(${eq.df1}, ${eq.df2}) = ${F(eq.F, 3)}، ${eq.p < 0.0001 ? "p < 0.0001" : "p = " + P(eq.p)} — ${eq.p < 0.05 ? "ثوابت السرعة تختلف معنوياً بين المعاملات." : "لا فرق معنوي بين ثوابت السرعة."}</span></div>` : ""}
        <div class="chart-box u-mt14"><canvas id="cu-chart"></canvas></div>
        <p class="faint ex-note">نصف العمر = ln2 ÷ k، وخطؤه المعياري بطريقة دلتا. وحدة الزمن كما في عمودك الأول.</p>
      </section>`;
      chart("cu-chart", { type: "scatter", data: { datasets: res.flatMap((r, i) => {
        const tmax = Math.max(...r.t), xs = Array.from({ length: 60 }, (_, q) => tmax * q / 59);
        return [{ label: r.s.name, data: r.t.map((tt, q) => ({ x: tt, y: r.c[q] })), backgroundColor: cols[i % cols.length], pointRadius: 4 },
          { label: r.s.name + " (رتبة أولى)", data: r.r1 ? xs.map(x => ({ x, y: r.f1(x, r.r1.p) })) : [], type: "line", borderColor: cols[i % cols.length], pointRadius: 0, borderWidth: 1.6 }];
      }) }, options: { maintainAspectRatio: false, plugins: { legend: { labels: { filter: it => !/\(رتبة/.test(it.text) } } }, scales: { x: { title: { display: true, text: String(head[0] || "الزمن") } }, y: { title: { display: true, text: "التركيز" } } } } });
    } else {
      const g = (t, p) => p[0] * Math.exp(-Math.exp(p[1] * Math.E / p[0] * (p[2] - t) + 1));
      const res = series.map(s => {
        const t = s.pts.map(p => p[0]), y0 = s.pts[0][1], y = s.pts.map(p => p[1] - y0), A0 = Math.max(...y);
        const r = FL.lm(g, [Math.max(A0, 1e-6), Math.max(A0, 1e-6) / (t[t.length - 1] / 2 || 1), t[1] || 0.1], t, y, { lower: [1e-9, 1e-9, 0] });
        return { s, t, y, y0, r };
      });
      out.innerHTML = `<section class="panel">
        <div class="panel-h"><h3>${ico("i-check")}معاملات النمو (Gompertz المعدّل)</h3><span class="sub">y − y₀ = A·exp(−exp(μm·e/A·(λ − t) + 1))</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المعاملة</th><th>طور التأخر λ ± SE</th><th>أقصى معدل نمو μm ± SE</th><th>الزيادة القصوى A ± SE</th><th>R²</th></tr></thead><tbody>
          ${res.map(r => `<tr><td>${esc(r.s.name)}</td>${r.r ? `<td class="num">${G4(r.r.p[2])} ± ${G2(r.r.se[2])}</td><td class="num">${G4(r.r.p[1])} ± ${G2(r.r.se[1])}</td><td class="num">${G4(r.r.p[0])} ± ${G2(r.r.se[0])}</td><td class="num">${F(r.r.r2, 4)}</td>` : `<td colspan="4">لم تتقارب الملاءمة؛ تحقق أن المنحنى يُظهر طور نمو واضحاً.</td>`}</tr>`).join("")}
        </tbody></table></div>
        <div class="chart-box u-mt14"><canvas id="cu-chart"></canvas></div>
        <p class="faint ex-note">المرجع: Zwietering, M.H. et al. (1990) Modeling of the bacterial growth curve. Applied and Environmental Microbiology 56(6):1875–1881. وحدات λ وμm بوحدة زمن عمودك الأول.</p>
      </section>`;
      chart("cu-chart", { type: "scatter", data: { datasets: res.flatMap((r, i) => {
        const tmax = Math.max(...r.t), xs = Array.from({ length: 60 }, (_, q) => tmax * q / 59);
        return [{ label: r.s.name, data: r.t.map((tt, q) => ({ x: tt, y: r.y[q] + r.y0 })), backgroundColor: cols[i % cols.length], pointRadius: 4 },
          { label: r.s.name + " (نموذج)", data: r.r ? xs.map(x => ({ x, y: g(x, r.r.p) + r.y0 })) : [], type: "line", borderColor: cols[i % cols.length], pointRadius: 0, borderWidth: 1.6 }];
      }) }, options: { maintainAspectRatio: false, plugins: { legend: { labels: { filter: it => !/\(نموذج\)/.test(it.text) } } }, scales: { x: { title: { display: true, text: String(head[0] || "الزمن") } } } } });
    }
  }

  /* ---------- الصفحة ---------- */
  const TABS = [["doe", "تصميم التجارب RSM", renderDOE], ["jar", "اختبار الجرة", renderJar], ["ads", "نماذج الامتزاز", renderAds], ["cur", "منحنيات التحلل والنمو", renderCurve]];
  function tab(id) {
    U.$$("#ex-tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === id)));
    TABS.forEach(([t, , fn]) => { const p = U.$("#ex-" + t); if (!p) return; p.hidden = t !== id; if (t === id && !p.dataset.built) { p.dataset.built = "1"; fn(); } });
    U.store.set("exp_tab", id);
  }
  ECO.views.exp = {
    init() {
      U.$("#ex-tabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (b) tab(b.dataset.tab); };
      tab(U.store.get("exp_tab", "doe"));
    }
  };
})();
