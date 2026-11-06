/* =====================================================================
   EcoBio AI — مقيّم المواد المازّة
   أداة بحثية لتقييم كفاءة مادة مازّة رخيصة (مثل ليف المبردة الجديد
   والمستهلك) في إزالة ملوث من الماء بتجارب الدفعات (Batch):
     1) الإعداد وخطة التجارب وورقة المختبر.
     2) منحنى المعايرة: الامتصاصية ← التركيز، مع LOD وLOQ (ICH Q2).
     3) التجارب: pH، ونقطة الشحنة الصفرية pHpzc (طريقة إضافة الملح)،
        والجرعة، والزمن (الحركية)، والتركيز (الأيزوثيرمات)، والحرارة
        (الديناميكا الحرارية بمعادلة فانت هوف، Milonjić 2007).
     4) النتائج: مقارنة المواد بالإحصاء، والمقارنة بالأدبيات، وفقرة
        المنهجية، وفقرة النتائج بالذكاء الاصطناعي من الأرقام المحسوبة فقط.
   كل الأرقام من تجارب المستخدم نفسه، ولا توجد أي قيمة افتراضية كنتيجة.
   تُحفظ الدراسة في جهاز المستخدم، وتُنقل بملف JSON أو Excel.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, TB = ECO.tab, FL = ECO.fit, ST = () => ECO.stats;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const ok = v => typeof v === "number" && isFinite(v);
  const F = (v, d = 2) => (ok(v) ? U.fmt(v, d) : "—");
  const G4 = v => (!ok(v) ? "—" : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(3) : String(Number(v.toPrecision(4))));
  const G2 = v => (!ok(v) ? "—" : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1) : String(Number(v.toPrecision(2))));
  const P = p => (!ok(p) ? "—" : p < 0.001 ? "< 0.001" : U.fmt(p, 3));
  const num = v => (v === "" || v == null ? NaN : TB.num(v));
  const COLS = ["#4fc8dc", "#e6ae4f", "#93dd8a", "#b493ff"];
  const R = 8.314; // J/mol·K
  const KEY = "sorb_v1";

  /* الملوثات وطرق قياسها (Standard Methods for the Examination of Water and Wastewater) */
  const POL = {
    po4: { n: "الفوسفات (PO₄³⁻)", M: 94.97, ch: "anion", m: "حامض الأسكوربيك (SM 4500-P E) عند 880 nm" },
    no3: { n: "النترات (NO₃⁻)", M: 62.0, ch: "anion", m: "الأشعة فوق البنفسجية (SM 4500-NO₃⁻ B) عند 220 و275 nm" },
    pb: { n: "الرصاص (Pb²⁺)", M: 207.2, ch: "cation", m: "الامتصاص الذري باللهب (SM 3111 B)" },
    cd: { n: "الكادميوم (Cd²⁺)", M: 112.41, ch: "cation", m: "الامتصاص الذري باللهب (SM 3111 B)" },
    cu: { n: "النحاس (Cu²⁺)", M: 63.55, ch: "cation", m: "الامتصاص الذري باللهب (SM 3111 B)" },
    mb: { n: "صبغة المثيلين الأزرق", M: 319.85, ch: "cation", m: "مطياف UV-Vis عند 664 nm" },
    custom: { n: "ملوث آخر", M: NaN, ch: "", m: "" }
  };
  const FIX = { C0: ["التركيز الابتدائي C₀", "mg/L"], V: ["حجم المحلول", "mL"], m: ["كتلة المادة", "g"], pH: ["pH", ""], t: ["زمن التماس", "دقيقة"], T: ["الحرارة", "°م"] };
  const EXPS = [
    { id: "ph", n: "تأثير الـ pH", s: "pH", fac: "pH", u: "", lv: "3, 5, 7, 9, 11", fx: ["C0", "V", "m", "t", "T"] },
    { id: "pzc", n: "نقطة الشحنة الصفرية pHpzc", s: "pHpzc", fac: "pH الابتدائي", u: "", lv: "2, 4, 6, 8, 10, 12", fx: [] },
    { id: "dose", n: "تأثير جرعة المادة المازّة", s: "الجرعة", fac: "الجرعة", u: "g/L", lv: "0.5, 1, 2, 4, 6, 8", fx: ["C0", "V", "pH", "t", "T"] },
    { id: "time", n: "تأثير زمن التماس (الحركية)", s: "الزمن", fac: "الزمن", u: "دقيقة", lv: "5, 10, 20, 30, 60, 90, 120, 180", fx: ["C0", "V", "m", "pH", "T"] },
    { id: "conc", n: "تأثير التركيز الابتدائي (الأيزوثيرمات)", s: "التركيز", fac: "C₀", u: "mg/L", lv: "5, 10, 20, 40, 60, 80, 100", fx: ["V", "m", "pH", "t", "T"] },
    { id: "temp", n: "تأثير الحرارة (الديناميكا الحرارية)", s: "الحرارة", fac: "الحرارة", u: "°م", lv: "25, 35, 45", fx: ["C0", "V", "m", "pH", "t"] }
  ];
  const EX = id => EXPS.find(e => e.id === id);

  const blankCal = () => Array.from({ length: 7 }, () => ["", ""]);
  const DEF = () => ({
    v: 1,
    title: "تقييم كفاءة ألياف الخشب المستهلكة من منظومات التبريد التبخيري في إزالة الفوسفات من المياه",
    pol: "po4", cname: "", cM: "", cch: "anion",
    mats: ["ليف مبردة جديد", "ليف مبردة مستهلك"],
    reps: 3,
    base: { C0: "20", V: "50", m: "0.1", pH: "7", t: "120", T: "25", rpm: "150" },
    input: "conc", dil: "1",
    cal: { rows: blankCal() },
    ex: Object.fromEntries(EXPS.map(e => [e.id, { lv: e.lv, fx: {}, d: [] }])),
    lit: [],
    tab: "setup", exp: "ph", lang: "ar"
  });
  let S = (() => { const s = U.store.get(KEY, null); if (!s || s.v !== 1) return DEF(); const d = DEF(); EXPS.forEach(e => { if (!s.ex[e.id]) s.ex[e.id] = d.ex[e.id]; }); return s; })();
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => U.store.set(KEY, S), 250); };
  const charts = {};
  const chart = (id, cfg) => { if (charts[id]) { charts[id].destroy(); delete charts[id]; } const c = document.getElementById(id); if (!c || !window.Chart) return null; charts[id] = new Chart(c, cfg); return charts[id]; };
  const errBars = { id: "sorbErr", afterDatasetsDraw(c) {
    const ctx = c.ctx;
    c.data.datasets.forEach((ds, di) => {
      const meta = c.getDatasetMeta(di); if (!ds.err || meta.hidden) return;
      const ys = c.scales[ds.yAxisID || "y"]; if (!ys) return;
      ctx.save(); ctx.strokeStyle = ds.borderColor || "#fff"; ctx.lineWidth = 1.2;
      meta.data.forEach((pt, i) => {
        const e = ds.err[i], v = ds.data[i] && ds.data[i].y; if (!(e > 0) || !ok(v)) return;
        const y1 = ys.getPixelForValue(v - e), y2 = ys.getPixelForValue(v + e);
        ctx.beginPath(); ctx.moveTo(pt.x, y1); ctx.lineTo(pt.x, y2); ctx.moveTo(pt.x - 4, y1); ctx.lineTo(pt.x + 4, y1); ctx.moveTo(pt.x - 4, y2); ctx.lineTo(pt.x + 4, y2); ctx.stroke();
      });
      ctx.restore();
    });
  } };

  /* ---------- قراءة الحالة ---------- */
  const pol = () => S.pol === "custom" ? { n: S.cname || "الملوث", M: num(S.cM), ch: S.cch, m: "" } : POL[S.pol];
  const levels = id => String(S.ex[id].lv || "").split(/[,،\s]+/).map(num).filter(ok);
  const fixed = (id, k) => { const v = S.ex[id].fx[k]; return num(v !== undefined && v !== "" ? v : S.base[k]); };
  const nm = () => S.mats.length;
  const repsN = () => Math.max(1, Math.min(6, Math.round(num(S.reps)) || 1));
  const cell = (id, mi, i, r) => { const d = S.ex[id].d; return d[mi] && d[mi][i] ? d[mi][i][r] : ""; };
  const setCell = (id, mi, i, r, v) => { const d = S.ex[id].d; d[mi] = d[mi] || []; d[mi][i] = d[mi][i] || []; d[mi][i][r] = v; };

  function describe(a) {
    const x = a.filter(ok), n = x.length; if (!n) return { n: 0, mean: NaN, sd: NaN, cv: NaN };
    const mean = x.reduce((s, v) => s + v, 0) / n, sd = n > 1 ? Math.sqrt(x.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : NaN;
    return { n, mean, sd, cv: mean ? sd / Math.abs(mean) * 100 : NaN, vals: x };
  }

  /* ---------- منحنى المعايرة ---------- */
  function calFit() {
    const pts = S.cal.rows.map(r => [num(r[0]), num(r[1])]).filter(p => ok(p[0]) && ok(p[1]));
    if (pts.length < 3) return null;
    const o = FL.ols(pts.map(p => [p[0], 1]), pts.map(p => p[1])); if (!o || !(o.beta[0] !== 0)) return null;
    const a = o.beta[0], b = o.beta[1], syx = Math.sqrt(o.sse / Math.max(1, o.n - 2));
    return { a, b, se: o.se, r2: o.r2, n: o.n, syx, lod: 3.3 * syx / Math.abs(a), loq: 10 * syx / Math.abs(a), xmin: Math.min(...pts.map(p => p[0])), xmax: Math.max(...pts.map(p => p[0])), amax: Math.max(...pts.map(p => p[1])), pts };
  }
  /* القراءة الخام ← التركيز المتبقي mg/L */
  function toConc(raw) {
    const v = num(raw); if (!ok(v)) return { c: NaN };
    const dil = num(S.dil) > 0 ? num(S.dil) : 1;
    if (S.input !== "abs") return { c: v * dil };
    const k = calFit(); if (!k) return { c: NaN, err: "nocal" };
    const c0 = (v - k.b) / k.a;
    return { c: c0 * dil, out: v > k.amax * 1.02 };
  }

  /* ---------- حساب تجربة واحدة ---------- */
  function compute(id) {
    const e = EX(id), L = levels(id), reps = repsN();
    if (id === "pzc") {
      return S.mats.map((name, mi) => {
        const pts = L.map((pi, i) => { const vals = Array.from({ length: reps }, (_, r) => num(cell(id, mi, i, r))).filter(ok); const pf = describe(vals); return { L: pi, pf, d: pf.n ? pf.mean - pi : NaN }; });
        const v = pts.filter(p => ok(p.d));
        let pzc = NaN;
        for (let i = 1; i < v.length; i++) { const p = v[i - 1], q = v[i]; if (p.d === 0) { pzc = p.L; break; } if (p.d * q.d < 0) { pzc = p.L + (0 - p.d) * (q.L - p.L) / (q.d - p.d); break; } }
        if (!ok(pzc) && v.length && v[v.length - 1].d === 0) pzc = v[v.length - 1].L;
        return { name, mi, pts, pzc, has: v.length > 0 };
      });
    }
    return S.mats.map((name, mi) => {
      const rows = L.map((lv, i) => {
        const C0 = id === "conc" ? lv : fixed(id, "C0"), V = fixed(id, "V");
        const m = id === "dose" ? lv * V / 1000 : fixed(id, "m");
        const raw = Array.from({ length: reps }, (_, r) => cell(id, mi, i, r));
        const conv = raw.map(toConc), ce = conv.map(c => c.c);
        const rem = ce.map(c => (ok(c) && C0 > 0 ? (C0 - c) / C0 * 100 : NaN));
        const q = ce.map(c => (ok(c) && m > 0 ? (C0 - c) * V / 1000 / m : NaN));
        const warn = [];
        if (ce.some(c => ok(c) && c > C0 * 1.02)) warn.push("Ce أكبر من C₀");
        if (conv.some(c => c.out)) warn.push("امتصاصية خارج مدى المعايرة");
        if (conv.some(c => c.err === "nocal")) warn.push("أكمل منحنى المعايرة");
        const D = describe(rem); if (D.n > 1 && D.cv > 10) warn.push(`تباين المكررات ${F(D.cv, 0)}%`);
        return { lv, i, C0, V, m, T: id === "temp" ? lv : fixed(id, "T"), ce: describe(ce), rem: D, q: describe(q), remVals: rem.filter(ok), warn };
      });
      const has = rows.filter(r => r.ce.n).length;
      // ANOVA ودنكن على نسبة الإزالة بين المستويات (عند وجود مكررات)
      let an = null, dn = null;
      const longRows = []; rows.forEach(r => r.remVals.forEach(y => longRows.push({ a: String(r.lv), y })));
      if (repsN() > 1 && rows.filter(r => r.rem.n > 1).length >= 2) { an = ST().anova(longRows, false); if (an) dn = ST().duncan(an.groups, an.MSE, an.dfE); }
      return { name, mi, rows, has, an, dn };
    });
  }

  /* نماذج الحركية والأيزوثيرم لمادة واحدة */
  function models(id, mr) {
    if (!ECO.adsFit) return null;
    const pts = mr.rows.filter(r => r.q.n && ok(r.q.mean) && (id === "time" ? r.lv > 0 : r.ce.mean > 0)).map(r => [id === "time" ? r.lv : r.ce.mean, r.q.mean]).sort((a, b) => a[0] - b[0]);
    if (pts.length < 4) return { few: pts.length };
    return ECO.adsFit(pts, id === "conc", fixed(id, "T"), pol().M);
  }
  /* الديناميكا الحرارية: K° = 1000 × Kd (Milonjić 2007)، ΔG° = −RT lnK°، فانت هوف */
  function thermo(mr) {
    const pts = mr.rows.filter(r => r.ce.n && r.ce.mean > 0 && r.q.mean > 0).map(r => { const Tk = r.lv + 273.15, Kd = r.q.mean / r.ce.mean, K0 = 1000 * Kd; return { Tc: r.lv, Tk, Kd, K0, lnK: Math.log(K0), dG: -R * Tk * Math.log(K0) / 1000 }; });
    if (pts.length < 2) return { pts, few: true };
    const o = FL.ols(pts.map(p => [1 / p.Tk, 1]), pts.map(p => p.lnK));
    if (!o) return { pts, few: true };
    return { pts, dH: -o.beta[0] * R / 1000, dS: o.beta[1] * R, r2: pts.length > 2 ? o.r2 : NaN, n: pts.length };
  }
  const bestLevel = mr => { const r = mr.rows.filter(x => x.rem.n).sort((a, b) => b.rem.mean - a.rem.mean)[0]; return r || null; };
  /* أقل جرعة تحقق 95% من أعلى إزالة، وأقصر زمن يحقق 95% من أعلى سعة (المعيار مذكور للمستخدم) */
  const plateau = (rows, key) => { const v = rows.filter(r => r[key].n); if (!v.length) return null; const mx = Math.max(...v.map(r => r[key].mean)); return v.slice().sort((a, b) => a.lv - b.lv).find(r => r[key].mean >= 0.95 * mx) || null; };

  /* =================================================================
     الواجهة
  ================================================================= */
  const TABS = [["setup", "1. الإعداد والخطة", "i-gear"], ["cal", "2. المعايرة", "i-chart"], ["exps", "3. التجارب", "i-flask"], ["res", "4. النتائج والمقارنة", "i-file"]];
  function root() { return document.getElementById("sorb-root"); }
  function shell() {
    const host = root(); if (!host) return;
    host.innerHTML = `
      <div class="sb-top">
        <div class="sb-prog" id="sb-prog"></div>
        <div class="sb-file">
          <button type="button" class="btn btn-sm" data-act="json-save">${ico("i-down")}حفظ الدراسة (ملف)</button>
          <label class="btn btn-sm" for="sb-json">${ico("i-upload")}فتح دراسة</label><input id="sb-json" type="file" accept=".json,application/json" hidden>
          <button type="button" class="btn btn-sm btn-ghost" data-act="reset">${ico("i-trash")}دراسة جديدة</button>
        </div>
      </div>
      <div class="an-tabs" id="sb-tabs" role="tablist" aria-label="مراحل الدراسة">${TABS.map(([id, l, ic]) => `<button type="button" role="tab" data-sbtab="${id}" aria-selected="${S.tab === id}">${ico(ic)}${l}</button>`).join("")}</div>
      <div id="sb-body"></div>`;
    host.onclick = onClick;
    host.addEventListener("change", onChange);
    host.addEventListener("input", onInput);
    host.addEventListener("paste", onPaste);
    document.getElementById("sb-json").onchange = loadJSON;
    renderTab();
  }
  function progress() {
    const el = document.getElementById("sb-prog"); if (!el) return;
    const cal = S.input === "abs" ? !!calFit() : true;
    const items = [["الإعداد", true], ["المعايرة", cal]].concat(EXPS.map(e => [e.s, compute(e.id).some(m => m.has)]));
    el.innerHTML = items.map(([l, d]) => `<span class="sb-step ${d ? "done" : ""}">${d ? ico("i-check") : "<i></i>"}${esc(l)}</span>`).join("");
  }
  function renderTab() {
    document.querySelectorAll("#sb-tabs [data-sbtab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.sbtab === S.tab)));
    const body = document.getElementById("sb-body"); if (!body) return;
    Object.keys(charts).forEach(k => { charts[k].destroy(); delete charts[k]; });
    body.innerHTML = S.tab === "setup" ? setupHTML() : S.tab === "cal" ? calHTML() : S.tab === "exps" ? expsHTML() : resHTML();
    if (S.tab === "cal") drawCal();
    if (S.tab === "exps") renderExp();
    if (S.tab === "res") drawRes();
    progress();
  }

  /* ---------- 1) الإعداد والخطة ---------- */
  function setupHTML() {
    const p = pol();
    const totals = EXPS.map(e => ({ e, n: levels(e.id).length * nm() * (e.id === "pzc" ? 1 : repsN()) }));
    const total = totals.reduce((s, x) => s + x.n, 0);
    return `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-book")}عنوان الدراسة والمواد</h3></div>
        <div class="field"><label for="sb-title">عنوان البحث</label><input id="sb-title" class="input" data-k="title" value="${esc(S.title)}"></div>
        <div class="sb-grid">
          <div class="field"><label for="sb-pol">الملوث</label><select id="sb-pol" class="input" data-k="pol">${Object.entries(POL).map(([k, v]) => `<option value="${k}" ${S.pol === k ? "selected" : ""}>${esc(v.n)}</option>`).join("")}</select></div>
          ${S.pol === "custom" ? `<div class="field"><label for="sb-cname">اسم الملوث</label><input id="sb-cname" class="input" data-k="cname" value="${esc(S.cname)}"></div>
          <div class="field"><label for="sb-cM">الكتلة المولية g/mol</label><input id="sb-cM" class="input num" data-k="cM" value="${esc(S.cM)}" inputmode="decimal"></div>
          <div class="field"><label for="sb-cch">شحنته في الماء</label><select id="sb-cch" class="input" data-k="cch"><option value="anion" ${S.cch === "anion" ? "selected" : ""}>سالبة (أنيون)</option><option value="cation" ${S.cch === "cation" ? "selected" : ""}>موجبة (كاتيون)</option><option value="" ${!S.cch ? "selected" : ""}>متعادلة أو غير معروفة</option></select></div>` : ""}
          <div class="field"><label for="sb-reps">عدد المكررات لكل معاملة</label><input id="sb-reps" class="input num" data-k="reps" value="${esc(S.reps)}" inputmode="numeric"></div>
        </div>
        ${p.m ? `<p class="faint ex-note">${ico("i-info")}طريقة القياس المعتمدة: ${esc(p.m)}.</p>` : ""}
        <div class="sb-mats">${S.mats.map((m, i) => `<div class="sb-mat" style="--c:${COLS[i % COLS.length]}"><i></i><input class="input" data-mat="${i}" value="${esc(m)}" aria-label="اسم المادة ${i + 1}">${S.mats.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" data-act="mat-del" data-i="${i}" aria-label="حذف المادة">${ico("i-close")}</button>` : ""}</div>`).join("")}
          ${S.mats.length < 4 ? `<button type="button" class="btn btn-sm" data-act="mat-add">${ico("i-plus")}مادة أخرى (مثل ليف معدّل)</button>` : ""}</div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-flask")}الظروف الأساسية</h3><span class="sub">تُستعمل في كل تجربة ما لم تغيّرها داخلها</span></div>
        <div class="sb-grid">${Object.entries(FIX).map(([k, [l, u]]) => `<div class="field"><label for="sb-b-${k}">${l}${u ? ` (${u})` : ""}</label><input id="sb-b-${k}" class="input num" data-base="${k}" value="${esc(S.base[k])}" inputmode="decimal"></div>`).join("")}
          <div class="field"><label for="sb-b-rpm">سرعة الرج (دورة/دقيقة)</label><input id="sb-b-rpm" class="input num" data-base="rpm" value="${esc(S.base.rpm)}" inputmode="decimal"></div></div>
        <p class="faint ex-note">الجرعة = ${F(fixed("ph", "m") / fixed("ph", "V") * 1000, 2)} g/L. القيم الابتدائية هنا شائعة في بحوث الامتزاز وليست نتائج؛ عدّلها حسب خطة مشرفك.</p>
        <div class="sb-grid">
          <div class="field"><label for="sb-input">ماذا ستُدخل من المختبر؟</label><select id="sb-input" class="input" data-k="input"><option value="conc" ${S.input === "conc" ? "selected" : ""}>التركيز المتبقي Ce مباشرة (mg/L)</option><option value="abs" ${S.input === "abs" ? "selected" : ""}>الامتصاصية من المطياف (تتحول بمنحنى المعايرة)</option></select></div>
          <div class="field"><label for="sb-dil">معامل التخفيف قبل القياس</label><input id="sb-dil" class="input num" data-k="dil" value="${esc(S.dil)}" inputmode="decimal"></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-table")}خطة التجارب وورقة المختبر</h3><span class="sub">${total} عيّنة${S.input === "abs" ? " + محاليل المعايرة" : ""}</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>التجربة</th><th>المستويات</th><th>عدد العيّنات</th></tr></thead><tbody>
          ${totals.map(({ e, n }) => `<tr><td>${esc(e.n)}</td><td><input class="input num sb-lv" data-lv="${e.id}" value="${esc(S.ex[e.id].lv)}" aria-label="مستويات ${esc(e.n)}"> <span class="faint">${esc(e.u)}</span></td><td class="num">${n}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="faint ex-note">افصل المستويات بفاصلة. نقطة الشحنة الصفرية تُقاس مرة لكل مستوى (طريقة إضافة الملح: 0.01 M NaCl، 24 ساعة).</p>
        <div class="row u-mt10"><button type="button" class="btn btn-primary" data-act="sheet-print">${ico("i-file")}اطبع ورقة المختبر</button><button type="button" class="btn" data-act="sheet-xlsx">${ico("i-down")}ورقة المختبر Excel</button></div>
      </section>`;
  }

  /* ---------- 2) المعايرة ---------- */
  function calHTML() {
    const k = calFit();
    return `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-chart")}منحنى المعايرة</h3><span class="sub">${S.input === "abs" ? "يُستعمل لتحويل امتصاصية كل عيّنة إلى تركيز" : "اختياري: اخترت إدخال التركيز مباشرة"}</span></div>
        <div class="sb-cal">
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>تركيز المحلول القياسي (mg/L)</th><th>الامتصاصية</th></tr></thead><tbody>
            ${S.cal.rows.map((r, i) => `<tr><td><input class="input num" data-cal="${i}" data-c="0" value="${esc(r[0])}" inputmode="decimal" aria-label="تركيز ${i + 1}"></td><td><input class="input num" data-cal="${i}" data-c="1" value="${esc(r[1])}" inputmode="decimal" aria-label="امتصاصية ${i + 1}"></td></tr>`).join("")}
          </tbody></table></div>
          <div><div class="chart-box sm"><canvas id="sb-cal-chart"></canvas></div><div id="sb-cal-out">${calOut(k)}</div></div>
        </div>
        <div class="row u-mt10"><button type="button" class="btn btn-sm" data-act="cal-add">${ico("i-plus")}محلول آخر</button></div>
        <p class="faint ex-note">لصق من Excel: انسخ عمودين بلا عناوين والصقهما في الخانة الأولى. LOD = 3.3·s(y/x)/الميل، LOQ = 10·s(y/x)/الميل (ICH Q2(R2)).</p>
      </section>`;
  }
  function calOut(k) {
    if (!k) return `<div class="notice info">${ico("i-info")}<span>أدخل 3 محاليل قياسية على الأقل (والأفضل 5–7 مع المحلول الصفري).</span></div>`;
    return `<dl class="sb-kv">
      <div><dt>المعادلة</dt><dd class="num">A = ${G4(k.a)}·C ${k.b >= 0 ? "+" : "−"} ${G4(Math.abs(k.b))}</dd></div>
      <div><dt>R²</dt><dd class="num ${k.r2 < 0.995 ? "bad" : "ok"}">${F(k.r2, 4)}</dd></div>
      <div><dt>حد الكشف LOD</dt><dd class="num">${G4(k.lod)} mg/L</dd></div>
      <div><dt>حد التقدير LOQ</dt><dd class="num">${G4(k.loq)} mg/L</dd></div>
      <div><dt>المدى الخطي</dt><dd class="num">${G4(k.xmin)}–${G4(k.xmax)} mg/L</dd></div></dl>
      ${k.r2 < 0.995 ? `<div class="notice warn">${ico("i-warn")}<span>R² أقل من 0.995: أعد تحضير المحاليل القياسية أو استبعد النقطة الشاذة قبل الاعتماد على المنحنى.</span></div>` : ""}`;
  }
  function drawCal() {
    const k = calFit(); const out = document.getElementById("sb-cal-out"); if (out) out.innerHTML = calOut(k);
    const pts = S.cal.rows.map(r => ({ x: num(r[0]), y: num(r[1]) })).filter(p => ok(p.x) && ok(p.y));
    chart("sb-cal-chart", { type: "scatter", data: { datasets: [{ label: "المحاليل القياسية", data: pts, backgroundColor: "#e4f1ed", pointRadius: 5 }].concat(k ? [{ label: "الخط", type: "line", data: [{ x: 0, y: k.b }, { x: k.xmax, y: k.a * k.xmax + k.b }], borderColor: COLS[0], pointRadius: 0, borderWidth: 2 }] : []) },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: "التركيز (mg/L)" } }, y: { title: { display: true, text: "الامتصاصية" } } } } });
  }

  /* ---------- 3) التجارب ---------- */
  function expsHTML() {
    return `<div class="sb-exps" role="tablist" aria-label="التجارب">${EXPS.map(e => { const has = compute(e.id).some(m => m.has); return `<button type="button" data-exp="${e.id}" class="${S.exp === e.id ? "on" : ""}" aria-pressed="${S.exp === e.id}">${has ? ico("i-check") : ""}${esc(e.s)}</button>`; }).join("")}</div>
      <div id="sb-exp"></div>`;
  }
  function gridHTML(id) {
    const e = EX(id), L = levels(id), reps = repsN();
    const head = id === "pzc" ? "pH النهائي" : S.input === "abs" ? "الامتصاصية" : "Ce (mg/L)";
    return `<div class="sb-grids">${S.mats.map((m, mi) => `
      <div class="sb-g" style="--c:${COLS[mi % COLS.length]}">
        <h4><i></i>${esc(m)}</h4>
        <div class="tbl-wrap"><table class="tbl sb-tbl"><thead><tr><th>${esc(e.fac)}${e.u ? ` (${esc(e.u)})` : ""}</th>${Array.from({ length: reps }, (_, r) => `<th>${esc(head)}${reps > 1 ? ` ${r + 1}` : ""}</th>`).join("")}</tr></thead><tbody>
          ${L.map((lv, i) => `<tr><th class="num">${G4(lv)}</th>${Array.from({ length: reps }, (_, r) => `<td><input class="input num" data-x="${id}" data-m="${mi}" data-i="${i}" data-r="${r}" value="${esc(cell(id, mi, i, r))}" inputmode="decimal" aria-label="${esc(m)} · ${esc(e.fac)} ${G4(lv)} · مكرر ${r + 1}"></td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
      </div>`).join("")}</div>`;
  }
  function renderExp() {
    const host = document.getElementById("sb-exp"); if (!host) return;
    const e = EX(S.exp);
    host.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-flask")}${esc(e.n)}</h3><span class="sub">${id2note(e.id)}</span></div>
        ${e.fx.length ? `<div class="sb-grid sb-fx">${e.fx.map(k => `<div class="field"><label for="sb-fx-${k}">${FIX[k][0]}${FIX[k][1] ? ` (${FIX[k][1]})` : ""}</label><input id="sb-fx-${k}" class="input num" data-fx="${k}" value="${esc(S.ex[e.id].fx[k] !== undefined ? S.ex[e.id].fx[k] : "")}" placeholder="${esc(S.base[k])}" inputmode="decimal"></div>`).join("")}</div>` : ""}
        <div class="field sb-lvf"><label for="sb-lv-in">المستويات (${esc(e.fac)}${e.u ? `، ${esc(e.u)}` : ""})</label><input id="sb-lv-in" class="input num" data-lv="${e.id}" value="${esc(S.ex[e.id].lv)}"></div>
        ${gridHTML(e.id)}
        <p class="faint ex-note">لصق من Excel: انسخ الأعمدة (المكررات) بلا عناوين والصقها في أول خانة من جدول المادة. ${S.input === "abs" && e.id !== "pzc" ? "تتحول الامتصاصية إلى تركيز بمنحنى المعايرة." : ""}</p>
      </section>
      <div id="sb-exp-out"></div>`;
    expOut();
  }
  function id2note(id) {
    return { ph: "ابحث عن pH الأمثل، وفسّره بنقطة الشحنة الصفرية", pzc: "ΔpH = pH النهائي − الابتدائي؛ نقطة الشحنة الصفرية حيث ΔpH = 0", dose: "الجرعة g/L = الكتلة ÷ الحجم؛ qe تقل والإزالة تزيد مع الجرعة عادة", time: "تُحسب qt لكل زمن وتُلاءم أربعة نماذج حركية", conc: "تُحسب Ce وqe لكل تركيز وتُلاءم ستة أيزوثيرمات", temp: "3 درجات حرارة على الأقل لمعادلة فانت هوف" }[id] || "";
  }
  let outT = 0;
  const expOutSoon = () => { clearTimeout(outT); outT = setTimeout(() => { expOut(); progress(); markExps(); }, 350); };
  function markExps() { document.querySelectorAll(".sb-exps [data-exp]").forEach(b => { const has = compute(b.dataset.exp).some(m => m.has); b.innerHTML = (has ? ico("i-check") : "") + esc(EX(b.dataset.exp).s); }); }

  function expOut() {
    const host = document.getElementById("sb-exp-out"); if (!host) return;
    const id = S.exp, e = EX(id), res = compute(id);
    if (!res.some(m => m.has)) { host.innerHTML = `<div class="notice info">${ico("i-info")}<span>أدخل قراءات المختبر في الجداول أعلاه، والنتائج تظهر هنا مباشرة.</span></div>`; return; }
    if (id === "pzc") { host.innerHTML = pzcOut(res); drawPzc(res); return; }
    const showQ = id !== "ph";
    host.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-check")}النتائج</h3><span class="sub">المتوسط ± الانحراف المعياري${repsN() > 1 ? "، والحروف من اختبار دنكن (α = 0.05)" : ""}</span></div>
        ${findings(id, res)}
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(e.fac)}${e.u ? ` (${esc(e.u)})` : ""}</th>${res.map(m => `<th>${esc(m.name)}: Ce (mg/L)</th><th>الإزالة %</th>${showQ ? `<th>q (mg/g)</th>` : ""}`).join("")}</tr></thead><tbody>
          ${levels(id).map((lv, i) => `<tr><td class="num">${G4(lv)}</td>${res.map(m => { const r = m.rows[i]; const lt = m.dn && m.dn.letters[String(lv)] ? `<sup class="sb-let">${m.dn.letters[String(lv)]}</sup>` : ""; return `<td class="num">${pm(r.ce)}</td><td class="num">${pm(r.rem, 1)}${lt}</td>${showQ ? `<td class="num">${pm(r.q, 3)}</td>` : ""}`; }).join("")}</tr>${res.some(m => m.rows[i].warn.length) ? `<tr class="sb-warnrow"><td colspan="${1 + res.length * (showQ ? 3 : 2)}">${res.filter(m => m.rows[i].warn.length).map(m => `${ico("i-warn")}${esc(m.name)}: ${esc(m.rows[i].warn.join("، "))}`).join(" · ")}</td></tr>` : ""}`).join("")}
        </tbody></table></div>
        ${res.some(m => m.an) ? `<p class="faint ex-note">${res.filter(m => m.an).map(m => `${esc(m.name)}: ANOVA F(${m.an.dfA}, ${m.an.dfE}) = ${F(m.an.FA, 2)}، p ${m.an.pA < 0.001 ? "< 0.001" : "= " + P(m.an.pA)}`).join(" · ")}. المستويات التي تشترك بحرف لا تختلف معنوياً.</p>` : ""}
        <div class="chart-box u-mt14"><canvas id="sb-chart"></canvas></div>
      </section>
      ${id === "time" || id === "conc" ? modelsHTML(id, res) : ""}
      ${id === "temp" ? thermoHTML(res) : ""}`;
    drawExp(id, res);
  }
  const pm = (d, dec = 2) => (!d.n ? "—" : `${F(d.mean, dec)}${d.n > 1 && ok(d.sd) ? ` ± ${F(d.sd, dec)}` : ""}`);

  /* استنتاجات مكتوبة بقواعد ثابتة (لا ذكاء اصطناعي) */
  function findings(id, res) {
    const li = [];
    res.forEach(m => {
      if (!m.has) return;
      const b = bestLevel(m), nm2 = `<b>${esc(m.name)}</b>`;
      if (id === "ph" && b) {
        let t = `${nm2}: أعلى إزالة ${F(b.rem.mean, 1)}% عند pH ${G4(b.lv)}`;
        const z = compute("pzc").find(x => x.mi === m.mi);
        if (z && ok(z.pzc)) {
          const ch = pol().ch;
          if (ch === "anion") t += `؛ ونقطة الشحنة الصفرية ${F(z.pzc, 2)}، فتحت هذا الـ pH يكون السطح موجباً ويجذب ${esc(pol().n)} السالب`;
          if (ch === "cation") t += `؛ ونقطة الشحنة الصفرية ${F(z.pzc, 2)}، فوق هذا الـ pH يكون السطح سالباً ويجذب ${esc(pol().n)} الموجب`;
        }
        if (m.dn) { const same = levels(id).filter(lv => lv !== b.lv && m.dn.letters[String(lv)] && m.dn.letters[String(lv)].split("").some(c => (m.dn.letters[String(b.lv)] || "").includes(c))); if (same.length) t += `. لا يختلف معنوياً عن pH ${same.map(G4).join(" و")}`; }
        li.push(t + ".");
      }
      if (id === "dose") { const p = plateau(m.rows, "rem"); if (p) li.push(`${nm2}: الجرعة المثلى ${G4(p.lv)} g/L (أقل جرعة تعطي 95% من أعلى إزالة) بإزالة ${F(p.rem.mean, 1)}% وسعة ${F(p.q.mean, 3)} mg/g.`); }
      if (id === "time") { const p = plateau(m.rows, "q"); if (p) li.push(`${nm2}: يُبلغ التوازن تقريباً عند ${G4(p.lv)} دقيقة (أول زمن يحقق 95% من أعلى سعة)، بسعة ${F(p.q.mean, 3)} mg/g.`); }
      if (id === "conc" && b) { const hi = m.rows.filter(r => r.q.n).sort((a, c) => c.q.mean - a.q.mean)[0]; if (hi) li.push(`${nm2}: أعلى سعة مقاسة ${F(hi.q.mean, 3)} mg/g عند C₀ = ${G4(hi.lv)} mg/L، وأعلى نسبة إزالة ${F(b.rem.mean, 1)}% عند ${G4(b.lv)} mg/L.`); }
      if (id === "temp" && b) li.push(`${nm2}: أعلى إزالة ${F(b.rem.mean, 1)}% عند ${G4(b.lv)} °م.`);
    });
    return li.length ? `<ul class="sb-find">${li.map(x => `<li>${x}</li>`).join("")}</ul>` : "";
  }
  function drawExp(id, res) {
    const e = EX(id), qMode = id === "time" || id === "conc", xLab = id === "conc" ? "Ce (mg/L)" : `${e.fac}${e.u ? ` (${e.u})` : ""}`;
    const ds = res.filter(m => m.has).map(m => {
      const rows = m.rows.filter(r => (qMode ? r.q.n : r.rem.n));
      const pts = rows.map(r => ({ x: id === "conc" ? r.ce.mean : r.lv, y: qMode ? r.q.mean : r.rem.mean })).filter(p => ok(p.x));
      const err = rows.map(r => (qMode ? r.q.sd : r.rem.sd));
      const ord = pts.map((p, i) => [p, err[i]]).sort((a, b) => a[0].x - b[0].x);
      return { label: m.name, data: ord.map(o => o[0]), err: ord.map(o => o[1]), borderColor: COLS[m.mi % COLS.length], backgroundColor: COLS[m.mi % COLS.length], showLine: id !== "conc", pointRadius: 5, borderWidth: 2, tension: 0 };
    });
    if (qMode) res.filter(m => m.has).forEach(m => {
      const f = models(id, m); if (!f || !f.best) return;
      const xs = m.rows.map(r => (id === "conc" ? r.ce.mean : r.lv)).filter(ok); const mx = Math.max(...xs);
      ds.push({ label: `${m.name}: ${f.best.m.n}`, type: "line", data: Array.from({ length: 60 }, (_, i) => { const x = mx * (i + 1) / 60; return { x, y: f.best.f(x, f.best.r.p) }; }), borderColor: COLS[m.mi % COLS.length], borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 });
    });
    if (id === "dose") res.filter(m => m.has).forEach(m => {
      const rows = m.rows.filter(r => r.q.n);
      ds.push({ label: `${m.name}: q (mg/g)`, data: rows.map(r => ({ x: r.lv, y: r.q.mean })), yAxisID: "y2", borderColor: COLS[m.mi % COLS.length], backgroundColor: "transparent", borderDash: [3, 3], showLine: true, pointRadius: 3, pointStyle: "rectRot", borderWidth: 1.4 });
    });
    const scales = { x: { type: "linear", title: { display: true, text: xLab } }, y: { title: { display: true, text: qMode ? (id === "time" ? "qt (mg/g)" : "qe (mg/g)") : "الإزالة %" }, beginAtZero: !qMode ? false : true } };
    if (id === "dose") scales.y2 = { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "q (mg/g)" }, beginAtZero: true };
    chart("sb-chart", { type: "scatter", data: { datasets: ds }, options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales }, plugins: [errBars] });
  }

  function modelsHTML(id, res) {
    const iso = id === "conc";
    const blocks = res.filter(m => m.has).map(m => {
      const f = models(id, m);
      if (!f || f.few !== undefined) return `<div class="notice info">${ico("i-info")}<span>${esc(m.name)}: تحتاج 4 ${iso ? "تراكيز" : "أزمنة"} على الأقل للملاءمة (والأفضل 6 فأكثر).</span></div>`;
      const extra = z => f.extra(z);
      return `<h4 class="sb-mh" style="--c:${COLS[m.mi % COLS.length]}"><i></i>${esc(m.name)}${f.best ? ` · الأفضل: <b>${esc(f.best.m.n)}</b> (وزن أكايكي ${F(100 * f.best.r.wAicc, 0)}%)` : ""}</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>النموذج</th><th>المعاملات ± الخطأ المعياري</th><th>R²</th><th>RMSE</th><th>AICc</th><th>ملاحظة</th></tr></thead><tbody>
          ${f.ok.map(z => `<tr class="${z === f.best ? "sig" : ""}"><td>${esc(z.m.n)}</td><td class="num">${z.m.p.map((pn, i) => `${pn} = ${G4(z.r.p[i])} ± ${G2(z.r.se[i])}`).join("<br>")}</td><td class="num">${F(z.r.r2, 4)}</td><td class="num">${F(z.r.rmse, 3)}</td><td class="num">${F(z.r.aicc, 2)}</td><td>${esc(extra(z))}</td></tr>`).join("")}
          ${f.list.filter(z => z.skip).map(z => `<tr class="faint"><td>${esc(z.m.n)}</td><td colspan="5">${esc(z.skip)}</td></tr>`).join("")}
        </tbody></table></div>
        ${f.ok[1] && f.ok[1].r.dAicc < 2 ? `<p class="faint ex-note">«${esc(f.ok[1].m.n)}» قريب من الأفضل (ΔAICc < 2)، فلا يُفضَّل أحدهما بثقة.</p>` : ""}`;
    }).join("");
    return `<section class="panel"><div class="panel-h"><h3>${ico("i-atom")}${iso ? "الأيزوثيرمات" : "النماذج الحركية"} (ملاءمة غير خطية)</h3><span class="sub">مرتبة حسب AICc: الأقل أفضل</span></div>${blocks}
      <details class="db-method"><summary>${ico("i-book")}الطريقة والمراجع</summary><p>تُلاءم النماذج على متوسط المكررات بخوارزمية Levenberg–Marquardt، وتُقارن بمعيار AICc وأوزان أكايكي بدل R² وحده، لأن الصيغ الخطية تغيّر بنية الخطأ (Foo & Hameed 2010, Chem. Eng. J. 156:2–10؛ Tran et al. 2017, Water Research 120:88–116).</p></details></section>`;
  }
  function thermoHTML(res) {
    const rows = res.filter(m => m.has).map(m => ({ m, t: thermo(m) }));
    return `<section class="panel"><div class="panel-h"><h3>${ico("i-atom")}المعاملات الديناميكية الحرارية</h3><span class="sub">K° = 1000 × Kd (L/g)، ΔG° = −RT lnK°، ln K° = ΔS°/R − ΔH°/(RT)</span></div>
      ${rows.map(({ m, t }) => `<h4 class="sb-mh" style="--c:${COLS[m.mi % COLS.length]}"><i></i>${esc(m.name)}</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>T (K)</th><th>Kd (L/g)</th><th>ln K°</th><th>ΔG° (kJ/mol)</th></tr></thead><tbody>
          ${t.pts.map(p => `<tr><td class="num">${F(p.Tk, 2)}</td><td class="num">${G4(p.Kd)}</td><td class="num">${F(p.lnK, 3)}</td><td class="num">${F(p.dG, 2)}</td></tr>`).join("")}
        </tbody></table></div>
        ${t.few ? `<p class="faint ex-note">أدخل درجتي حرارة على الأقل لحساب ΔH° وΔS° (والأفضل 3 أو أكثر).</p>` : `<dl class="sb-kv"><div><dt>ΔH°</dt><dd class="num">${F(t.dH, 2)} kJ/mol</dd></div><div><dt>ΔS°</dt><dd class="num">${F(t.dS, 2)} J/mol·K</dd></div>${ok(t.r2) ? `<div><dt>R² (فانت هوف)</dt><dd class="num">${F(t.r2, 4)}</dd></div>` : ""}</dl>
          <p class="sb-note">${thermoText(t)}</p>`}`).join("")}
      <details class="db-method"><summary>${ico("i-book")}لماذا K° = 1000 × Kd؟</summary><p>ثابت التوازن في معادلة فانت هوف يجب أن يكون بلا وحدات؛ ضرب Kd (L/g) بكثافة الماء 1000 g/L يجعله كذلك (Milonjić, S.K. 2007, J. Serb. Chem. Soc. 72:1363–1367؛ Tran, H.N. et al. 2016, J. Environ. Manage. 187: 23–33 عن الأخطاء الشائعة في هذا الحساب).</p></details></section>`;
  }
  const thermoText = t => [t.dH > 0 ? "الامتزاز ماصّ للحرارة (ΔH° موجبة)، فيتحسن بارتفاع الحرارة" : "الامتزاز باعث للحرارة (ΔH° سالبة)، فيقل بارتفاع الحرارة",
    Math.abs(t.dH) < 40 ? `وقيمة |ΔH°| أقل من 40 kJ/mol تشير غالباً إلى امتزاز فيزيائي` : `وقيمة |ΔH°| فوق 40 kJ/mol تشير إلى مساهمة كيميائية`,
    t.pts.every(p => p.dG < 0) ? "وΔG° سالبة عند كل الحرارات: العملية تلقائية" : "وΔG° ليست سالبة عند كل الحرارات: العملية غير تلقائية في بعضها",
    t.dS > 0 ? "وΔS° موجبة: تزداد العشوائية عند السطح" : "وΔS° سالبة: يقل اضطراب الجزيئات عند السطح"].join("، ") + ".";

  function pzcOut(res) {
    return `<section class="panel"><div class="panel-h"><h3>${ico("i-check")}نقطة الشحنة الصفرية</h3><span class="sub">بالتقاطع الخطي لـ ΔpH مع الصفر</span></div>
      <dl class="sb-kv">${res.map(m => `<div><dt>${esc(m.name)}</dt><dd class="num">${m.has ? (ok(m.pzc) ? `pHpzc = ${F(m.pzc, 2)}` : "لا يعبر الصفر في المدى المقاس") : "—"}</dd></div>`).join("")}</dl>
      <p class="sb-note">${pol().ch === "anion" ? `${esc(pol().n)} يحمل شحنة سالبة، فيُفضَّل امتزازه عندما يكون pH المحلول أقل من pHpzc (سطح موجب).` : pol().ch === "cation" ? `${esc(pol().n)} يحمل شحنة موجبة، فيُفضَّل امتزازه عندما يكون pH المحلول أعلى من pHpzc (سطح سالب).` : ""}</p>
      <div class="chart-box u-mt14"><canvas id="sb-chart"></canvas></div></section>`;
  }
  function drawPzc(res) {
    chart("sb-chart", { type: "scatter", data: { datasets: res.filter(m => m.has).map(m => ({ label: m.name, data: m.pts.filter(p => ok(p.d)).map(p => ({ x: p.L, y: p.d })), borderColor: COLS[m.mi % COLS.length], backgroundColor: COLS[m.mi % COLS.length], showLine: true, pointRadius: 5 })) },
      options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { x: { type: "linear", title: { display: true, text: "pH الابتدائي" } }, y: { title: { display: true, text: "ΔpH" }, grid: { color: c => (c.tick && c.tick.value === 0 ? "rgba(228,241,237,.5)" : ECO.COL.grid) } } } } });
  }

  /* ---------- 4) النتائج والمقارنة ---------- */
  function summary() {
    const P1 = compute("ph"), Z = compute("pzc"), D = compute("dose"), Tm = compute("time"), C = compute("conc"), Th = compute("temp");
    return S.mats.map((name, mi) => {
      const ph = P1[mi], b = ph && ph.has ? bestLevel(ph) : null, dz = D[mi].has ? plateau(D[mi].rows, "rem") : null, tq = Tm[mi].has ? plateau(Tm[mi].rows, "q") : null;
      const kin = Tm[mi].has ? models("time", Tm[mi]) : null, iso = C[mi].has ? models("conc", C[mi]) : null;
      const lang = iso && iso.ok ? iso.ok.find(z => z.m.id === "lang") : null;
      const th = Th[mi].has ? thermo(Th[mi]) : null;
      const maxRem = Math.max(...[P1, D, Tm, C, Th].map(X => X[mi].rows.filter(r => r.rem.n).map(r => r.rem.mean)).flat().filter(ok));
      return { name, mi, bestPh: b, pzc: Z[mi].pzc, dose: dz, teq: tq, kin: kin && kin.best ? kin.best : null, iso: iso && iso.best ? iso.best : null, qmax: lang ? { v: lang.r.p[0], se: lang.r.se[0] } : null, th: th && !th.few ? th : null, maxRem: ok(maxRem) ? maxRem : NaN };
    });
  }
  function ttest() {
    // مقارنة أول مادتين عند pH الأمثل للمادة الأفضل (المكررات نفسها)
    if (nm() < 2) return null;
    const ph = compute("ph"); if (!ph[0].has || !ph[1].has) return null;
    const best = [ph[0], ph[1]].map(bestLevel).filter(Boolean).sort((a, b) => b.rem.mean - a.rem.mean)[0]; if (!best) return null;
    const i = best.i, g = [ph[0].rows[i].remVals, ph[1].rows[i].remVals];
    if (g.some(x => x.length < 2)) return null;
    const w = ST().welch(g); if (!w) return null;
    return { lv: best.lv, t: Math.sqrt(w.F), df: w.df2, p: w.p, m: g.map(x => describe(x)) };
  }
  function resHTML() {
    const sm = summary(), tt = ttest();
    const rowsDef = [
      ["أعلى إزالة مقاسة (%)", s => F(s.maxRem, 1)],
      ["pH الأمثل", s => (s.bestPh ? `${G4(s.bestPh.lv)} (${F(s.bestPh.rem.mean, 1)}%)` : "—")],
      ["نقطة الشحنة الصفرية pHpzc", s => F(s.pzc, 2)],
      ["الجرعة المثلى (g/L)", s => (s.dose ? G4(s.dose.lv) : "—")],
      ["زمن التوازن (دقيقة)", s => (s.teq ? G4(s.teq.lv) : "—")],
      ["أفضل نموذج حركي", s => (s.kin ? `${esc(s.kin.m.n)} (R² ${F(s.kin.r.r2, 3)})` : "—")],
      ["أفضل أيزوثيرم", s => (s.iso ? `${esc(s.iso.m.n)} (R² ${F(s.iso.r.r2, 3)})` : "—")],
      ["السعة القصوى qmax لانكماير (mg/g)", s => (s.qmax ? `${G4(s.qmax.v)} ± ${G2(s.qmax.se)}` : "—")],
      ["ΔH° (kJ/mol)", s => (s.th ? F(s.th.dH, 2) : "—")],
      ["ΔS° (J/mol·K)", s => (s.th ? F(s.th.dS, 2) : "—")],
      ["ΔG° عند أقل حرارة (kJ/mol)", s => (s.th ? F(s.th.pts[0].dG, 2) : "—")]
    ];
    const anyData = EXPS.some(e => compute(e.id).some(m => m.has));
    const imp = nm() >= 2 && sm[0].qmax && sm[1].qmax ? (sm[1].qmax.v - sm[0].qmax.v) / sm[0].qmax.v * 100 : NaN;
    return `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-check")}ملخص الدراسة</h3><span class="sub">${esc(pol().n)}</span></div>
        ${anyData ? "" : `<div class="notice info">${ico("i-info")}<span>لا توجد قراءات بعد. أدخلها في «3. التجارب» ويمتلئ هذا الجدول تلقائياً.</span></div>`}
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المؤشر</th>${sm.map(s => `<th><span class="sb-dot" style="--c:${COLS[s.mi % COLS.length]}"></span>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>
          ${rowsDef.map(([l, f]) => `<tr><td>${l}</td>${sm.map(s => `<td class="num">${f(s)}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
        ${ok(imp) ? `<div class="notice ${imp > 0 ? "ok" : "info"} u-mt10">${ico(imp > 0 ? "i-check" : "i-info")}<span>السعة القصوى لـ «${esc(sm[1].name)}» ${imp > 0 ? "أعلى" : "أقل"} من «${esc(sm[0].name)}» بـ ${F(Math.abs(imp), 1)}%.</span></div>` : ""}
        ${tt ? `<div class="notice ${tt.p < 0.05 ? "ok" : "info"} u-mt10">${ico(tt.p < 0.05 ? "i-check" : "i-info")}<span>عند pH ${G4(tt.lv)}: الإزالة ${F(tt.m[0].mean, 1)}% مقابل ${F(tt.m[1].mean, 1)}%، اختبار t لويلش: t(${F(tt.df, 1)}) = ${F(tt.t, 2)}، p ${tt.p < 0.001 ? "< 0.001" : "= " + P(tt.p)} — ${tt.p < 0.05 ? "الفرق بين المادتين معنوي." : "لا فرق معنوي بين المادتين."}</span></div>` : ""}
      </section>
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-book")}المقارنة بالأدبيات</h3><span class="sub">أضف قيماً من بحوث منشورة مع مرجعها</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المادة المازّة</th><th>qmax (mg/g)</th><th>pH</th><th>المرجع أو DOI</th><th></th></tr></thead><tbody>
          ${S.lit.map((r, i) => `<tr><td><input class="input" data-lit="${i}" data-c="0" value="${esc(r[0])}" aria-label="المادة"></td><td><input class="input num" data-lit="${i}" data-c="1" value="${esc(r[1])}" inputmode="decimal" aria-label="qmax"></td><td><input class="input num" data-lit="${i}" data-c="2" value="${esc(r[2])}" inputmode="decimal" aria-label="pH"></td><td><input class="input" data-lit="${i}" data-c="3" value="${esc(r[3])}" aria-label="المرجع" dir="ltr"></td><td><button type="button" class="btn btn-ghost btn-sm" data-act="lit-del" data-i="${i}" aria-label="حذف">${ico("i-close")}</button></td></tr>`).join("")}
        </tbody></table></div>
        <div class="row u-mt10"><button type="button" class="btn btn-sm" data-act="lit-add">${ico("i-plus")}أضف بحثاً</button><a class="btn btn-sm btn-ghost" href="#scholar">${ico("i-search")}ابحث في الأدبيات بالباحث الذكي</a></div>
        <div class="chart-box sm u-mt14"><canvas id="sb-lit-chart"></canvas></div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-file")}فقرة طرائق العمل</h3><span class="sub">مكتوبة من إعداداتك، راجعها وأكمل الناقص</span></div>
        <div class="sb-text" id="sb-methods">${methodsText()}</div>
        <div class="row u-mt10"><button type="button" class="btn btn-sm" data-act="copy-methods">${ico("i-copy")}انسخ الفقرة</button></div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-spark")}فقرة النتائج بالذكاء الاصطناعي</h3><span class="sub">من الأرقام المحسوبة أعلاه فقط، راجعها قبل نسخها</span></div>
        <div class="row"><select class="input sb-lang" data-k="lang" aria-label="اللغة"><option value="ar" ${S.lang === "ar" ? "selected" : ""}>بالعربية</option><option value="en" ${S.lang === "en" ? "selected" : ""}>بالإنكليزية</option></select><button type="button" class="btn btn-primary" data-act="ai" ${anyData ? "" : "disabled"}>${ico("i-spark")}اكتب فقرة النتائج</button></div>
        <div id="sb-ai" class="sb-text u-mt10"></div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-down")}التصدير</h3></div>
        <div class="row"><button type="button" class="btn btn-primary" data-act="xlsx">${ico("i-table")}كل البيانات والنتائج Excel</button><button type="button" class="btn" data-act="json-save">${ico("i-down")}ملف الدراسة (للمشرف أو جهاز آخر)</button></div>
      </section>`;
  }
  function drawRes() {
    const sm = summary();
    const own = sm.filter(s => s.qmax).map(s => ({ l: s.name, v: s.qmax.v, c: COLS[s.mi % COLS.length] }));
    const lit = S.lit.filter(r => ok(num(r[1]))).map(r => ({ l: r[0] || "—", v: num(r[1]), c: "rgba(228,241,237,.35)" }));
    const all = own.concat(lit);
    if (!all.length) return;
    chart("sb-lit-chart", { type: "bar", data: { labels: all.map(x => x.l), datasets: [{ label: "qmax (mg/g)", data: all.map(x => x.v), backgroundColor: all.map(x => x.c), borderRadius: 5 }] },
      options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, title: { display: true, text: "qmax (mg/g)" } } } } });
  }
  function methodsText() {
    const p = pol(), b = S.base, list = EXPS.filter(e => levels(e.id).length);
    const dose = num(b.m) / num(b.V) * 1000;
    const parts = list.filter(e => e.id !== "pzc").map(e => `${e.s} (${levels(e.id).map(G4).join("، ")}${e.u ? " " + e.u : ""})`);
    return `<p>أُجريت تجارب الامتزاز بنظام الدفعات (Batch) لتقييم كفاءة ${S.mats.map(m => `«${esc(m)}»`).join(" و")} في إزالة ${esc(p.n)} من محاليل مائية مُحضّرة مختبرياً. استُعمل في كل تجربة ${esc(b.V)} mL من المحلول مع ${esc(b.m)} g من المادة المازّة (جرعة ${F(dose, 2)} g/L)، ورُجّت العينات بسرعة ${esc(b.rpm)} دورة/دقيقة لمدة ${esc(b.t)} دقيقة عند ${esc(b.T)} °م، ثم رُشّحت وقيس التركيز المتبقي${p.m ? ` بطريقة ${esc(p.m)}` : ""}${S.input === "abs" ? " باستعمال منحنى معايرة من محاليل قياسية" : ""}.</p>
      <p>دُرس تأثير ${parts.join("، و")} مع تثبيت بقية الظروف${list.some(e => e.id === "pzc") ? "، وحُدّدت نقطة الشحنة الصفرية (pHpzc) بطريقة إضافة الملح" : ""}. نُفّذت كل معاملة بـ ${repsN()} ${repsN() > 2 ? "مكررات" : "مكرر"}، وحُسبت نسبة الإزالة R% = (C₀ − Ce)/C₀ × 100 والسعة qe = (C₀ − Ce)·V/m.</p>
      <p>حُلّلت البيانات الحركية بنماذج الرتبة الأولى والثانية الكاذبتين وإيلوفيتش والانتشار داخل الجسيمات، وبيانات التوازن بأيزوثيرمات لانكماير وفرندلش وتمكين وسيبس وريدليتش–بيترسون ودوبينين–رادوشكيفيتش، بملاءمة غير خطية وقورنت النماذج بمعيار AICc. وحُسبت المعاملات الديناميكية الحرارية من معادلة فانت هوف، وقورنت المعاملات بتحليل التباين الأحادي واختبار دنكن عند مستوى معنوية 0.05.</p>`;
  }
  async function aiResults() {
    const out = document.getElementById("sb-ai"); if (!out || !ECO.gemini) return;
    const sm = summary(), tt = ttest();
    const data = { title: S.title, pollutant: pol().n, materials: sm.map(s => ({
      name: s.name, maxRemovalPct: r1(s.maxRem), optimumPH: s.bestPh ? s.bestPh.lv : null, removalAtOptimumPH: s.bestPh ? r1(s.bestPh.rem.mean) : null, pHpzc: r2(s.pzc),
      optimumDose_gL: s.dose ? s.dose.lv : null, equilibriumTime_min: s.teq ? s.teq.lv : null,
      bestKinetic: s.kin ? { model: s.kin.m.n, R2: r2(s.kin.r.r2), params: Object.fromEntries(s.kin.m.p.map((n2, i) => [n2, Number(G4(s.kin.r.p[i]))])) } : null,
      bestIsotherm: s.iso ? { model: s.iso.m.n, R2: r2(s.iso.r.r2), params: Object.fromEntries(s.iso.m.p.map((n2, i) => [n2, Number(G4(s.iso.r.p[i]))])) } : null,
      qmaxLangmuir_mgg: s.qmax ? Number(G4(s.qmax.v)) : null,
      thermo: s.th ? { dH_kJmol: r2(s.th.dH), dS_JmolK: r2(s.th.dS), dG_kJmol: s.th.pts.map(p => ({ T_K: r2(p.Tk), dG: r2(p.dG) })) } : null })),
      tTest: tt ? { atPH: tt.lv, means: tt.m.map(x => r1(x.mean)), t: r2(tt.t), df: r1(tt.df), p: Number(P(tt.p).replace("< ", "")) || tt.p } : null };
    const en = S.lang === "en";
    const system = en
      ? "You are a scientific editor for environmental engineering theses. Write the Results and Discussion paragraph using ONLY the numbers in the JSON. Never invent numbers, references or mechanisms that are not implied by the given values. Mark anything that needs the student's confirmation with [confirm]. Formal academic English, passive voice, 2–4 paragraphs."
      : "أنت محرر علمي لرسائل الماجستير في علوم البيئة. اكتب فقرة النتائج والمناقشة من الأرقام الموجودة في JSON فقط. لا تخترع أي رقم أو مرجع أو آلية لا تدل عليها القيم. ضع [يُتحقق] بعد أي جملة تحتاج تأكيد الطالب. لغة عربية فصحى أكاديمية بسيطة، 2–4 فقرات.";
    ECO.gemini.renderInto(out, `${en ? "Study data" : "بيانات الدراسة"}:\n${JSON.stringify(data, null, 1)}`, { system, temperature: 0.2 });
  }
  const r1 = v => (ok(v) ? Math.round(v * 10) / 10 : null), r2 = v => (ok(v) ? Math.round(v * 100) / 100 : null);

  /* ---------- التصدير ---------- */
  function sheetRows() {
    const rows = [["رمز العيّنة", "التجربة", "المادة", "المستوى", "المكرر", S.input === "abs" ? "الامتصاصية" : "Ce (mg/L)", "ملاحظات"]];
    EXPS.forEach(e => S.mats.forEach((m, mi) => levels(e.id).forEach((lv, i) => {
      const reps = e.id === "pzc" ? 1 : repsN();
      for (let r = 0; r < reps; r++) rows.push([`${e.id.toUpperCase()}-${mi + 1}-${i + 1}${reps > 1 ? "-" + (r + 1) : ""}`, e.s, m, `${G4(lv)}${e.u ? " " + e.u : ""}`, reps > 1 ? r + 1 : "", "", ""]);
    })));
    return rows;
  }
  function printSheet() {
    const rows = sheetRows();
    const w = window.open("", "_blank"); if (!w) { U.toast("اسمح بالنوافذ المنبثقة للطباعة"); return; }
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ورقة المختبر</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:18px;color:#111}h1{font-size:16px;margin:0 0 4px}p{font-size:12px;margin:0 0 10px;color:#444}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #999;padding:5px 6px;text-align:right}th{background:#eee}td:nth-child(6),td:nth-child(7){width:18%}@media print{button{display:none}}</style></head><body>
      <h1>${esc(S.title)}</h1><p>${esc(pol().n)} · ${S.mats.map(esc).join(" / ")} · ${repsN()} مكررات · الحجم ${esc(S.base.V)} mL · طُبعت من EcoBio AI</p>
      <table><thead><tr>${rows[0].map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }
  function exportXlsx() {
    const sheets = [{ name: "الإعداد", rows: [["العنوان", S.title], ["الملوث", pol().n], ["المواد", S.mats.join(" / ")], ["المكررات", repsN()], ["طريقة الإدخال", S.input === "abs" ? "امتصاصية" : "تركيز"], ["معامل التخفيف", S.dil]].concat(Object.entries(FIX).map(([k, [l, u]]) => [`${l}${u ? " (" + u + ")" : ""}`, S.base[k]])) }];
    const k = calFit(); if (k) sheets.push({ name: "المعايرة", rows: [["التركيز", "الامتصاصية"]].concat(k.pts).concat([[], ["الميل", k.a], ["التقاطع", k.b], ["R²", k.r2], ["LOD", k.lod], ["LOQ", k.loq]]) });
    EXPS.forEach(e => {
      const res = compute(e.id); if (!res.some(m => m.has)) return;
      if (e.id === "pzc") { sheets.push({ name: "pHpzc", rows: [["المادة", "pH الابتدائي", "pH النهائي", "ΔpH"]].concat(res.flatMap(m => m.pts.map(p => [m.name, p.L, p.pf.mean, p.d]))).concat(res.map(m => [m.name, "pHpzc", m.pzc])) }); return; }
      sheets.push({ name: e.s, rows: [["المادة", e.fac, "C0", "V (mL)", "m (g)", "Ce متوسط", "Ce SD", "الإزالة %", "SD", "q (mg/g)", "SD", "دنكن"]].concat(res.flatMap(m => m.rows.map(r => [m.name, r.lv, r.C0, r.V, r.m, r.ce.mean, r.ce.sd, r.rem.mean, r.rem.sd, r.q.mean, r.q.sd, m.dn ? m.dn.letters[String(r.lv)] || "" : ""]))) });
      if (e.id === "time" || e.id === "conc") res.forEach(m => { const f = models(e.id, m); if (f && f.ok) sheets.push({ name: `${e.id === "time" ? "حركية" : "أيزوثيرم"}-${m.mi + 1}`, rows: [["النموذج", "المعاملات", "R²", "RMSE", "AICc", "وزن أكايكي"]].concat(f.ok.map(z => [z.m.n, z.m.p.map((pn, i) => `${pn} = ${z.r.p[i]} ± ${z.r.se[i]}`).join(" ; "), z.r.r2, z.r.rmse, z.r.aicc, z.r.wAicc])) }); });
      if (e.id === "temp") res.forEach(m => { const t = thermo(m); sheets.push({ name: `حرارية-${m.mi + 1}`, rows: [["T (K)", "Kd (L/g)", "lnK°", "ΔG° (kJ/mol)"]].concat(t.pts.map(p => [p.Tk, p.Kd, p.lnK, p.dG])).concat(t.few ? [] : [[], ["ΔH° (kJ/mol)", t.dH], ["ΔS° (J/mol·K)", t.dS]]) }); });
    });
    if (S.lit.length) sheets.push({ name: "الأدبيات", rows: [["المادة", "qmax", "pH", "المرجع"]].concat(S.lit) });
    TB.xlsx(sheets, "دراسة-الامتزاز.xlsx");
  }
  function saveJSON() {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "دراسة-الامتزاز.json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function loadJSON(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    f.text().then(t => { const s = JSON.parse(t); if (!s || s.v !== 1 || !s.ex) throw new Error("ليس ملف دراسة من هذه الأداة"); const d = DEF(); EXPS.forEach(x => { if (!s.ex[x.id]) s.ex[x.id] = d.ex[x.id]; }); S = s; U.store.set(KEY, S); shell(); U.toast("فُتحت الدراسة"); })
      .catch(x => U.toast("تعذّر فتح الملف: " + x.message)).finally(() => { e.target.value = ""; });
  }

  /* ---------- الأحداث ---------- */
  function onClick(e) {
    const t = e.target.closest("[data-sbtab]"); if (t) { S.tab = t.dataset.sbtab; save(); renderTab(); return; }
    const x = e.target.closest("[data-exp]"); if (x) { S.exp = x.dataset.exp; save(); document.querySelectorAll(".sb-exps [data-exp]").forEach(b => { const on = b.dataset.exp === S.exp; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }); renderExp(); return; }
    const a = e.target.closest("[data-act]"); if (!a) return;
    const act = a.dataset.act;
    if (act === "mat-add") { S.mats.push(`مادة ${S.mats.length + 1}`); save(); renderTab(); }
    if (act === "mat-del") { const i = +a.dataset.i; S.mats.splice(i, 1); EXPS.forEach(ex => S.ex[ex.id].d.splice(i, 1)); save(); renderTab(); }
    if (act === "cal-add") { S.cal.rows.push(["", ""]); save(); renderTab(); }
    if (act === "lit-add") { S.lit.push(["", "", "", ""]); save(); renderTab(); }
    if (act === "lit-del") { S.lit.splice(+a.dataset.i, 1); save(); renderTab(); }
    if (act === "sheet-print") printSheet();
    if (act === "sheet-xlsx") TB.xlsx([{ name: "ورقة المختبر", rows: sheetRows() }], "ورقة-المختبر.xlsx");
    if (act === "xlsx") exportXlsx();
    if (act === "json-save") saveJSON();
    if (act === "copy-methods") { const el = document.getElementById("sb-methods"); if (el) TB.copy(el.innerText).then(() => U.toast("نُسخت الفقرة")); }
    if (act === "ai") aiResults();
    if (act === "reset") { if (a.dataset.sure) { S = DEF(); U.store.set(KEY, S); shell(); U.toast("بدأت دراسة جديدة"); } else { a.dataset.sure = "1"; a.innerHTML = `${ico("i-warn")}اضغط مرة أخرى لمسح كل البيانات`; setTimeout(() => { if (a.isConnected) { delete a.dataset.sure; a.innerHTML = `${ico("i-trash")}دراسة جديدة`; } }, 4000); } }
  }
  function onInput(e) {
    const el = e.target;
    if (el.dataset.x) { setCell(el.dataset.x, +el.dataset.m, +el.dataset.i, +el.dataset.r, el.value.trim()); save(); expOutSoon(); return; }
    if (el.dataset.cal !== undefined) { S.cal.rows[+el.dataset.cal][+el.dataset.c] = el.value.trim(); save(); clearTimeout(outT); outT = setTimeout(() => { drawCal(); progress(); }, 300); return; }
    if (el.dataset.lit !== undefined) { S.lit[+el.dataset.lit][+el.dataset.c] = el.value; save(); clearTimeout(outT); outT = setTimeout(drawRes, 400); return; }
    if (el.dataset.fx) { S.ex[S.exp].fx[el.dataset.fx] = el.value.trim(); save(); expOutSoon(); return; }
    if (el.dataset.mat !== undefined) { S.mats[+el.dataset.mat] = el.value; save(); return; }
    if (el.dataset.base) { S.base[el.dataset.base] = el.value.trim(); save(); return; }
    if (el.dataset.k === "title" || el.dataset.k === "cname" || el.dataset.k === "cM") { S[el.dataset.k] = el.value; save(); }
  }
  function onChange(e) {
    const el = e.target;
    if (el.dataset.lv) { S.ex[el.dataset.lv].lv = el.value; save(); if (S.tab === "exps") renderExp(); else renderTab(); return; }
    if (el.dataset.k && ["pol", "reps", "input", "dil", "cch", "lang"].includes(el.dataset.k)) { S[el.dataset.k] = el.value; save(); if (el.dataset.k !== "lang") renderTab(); return; }
    if (el.dataset.base || el.dataset.mat !== undefined || el.dataset.k === "cM") { renderTab(); }
  }
  /* لصق عمود أو جدول من Excel داخل الشبكة */
  function onPaste(e) {
    const el = e.target, txt = (e.clipboardData || window.clipboardData).getData("text");
    if (!/[\t\n]/.test(txt)) return;
    const rows = TB.parseText(txt).map(r => r.map(c => String(c == null ? "" : c).trim())).filter(r => r.some(c => c !== ""));
    if (!rows.length) return;
    if (el.dataset.x) {
      e.preventDefault();
      const id = el.dataset.x, mi = +el.dataset.m, i0 = +el.dataset.i, r0 = +el.dataset.r, L = levels(id).length, reps = id === "pzc" ? repsN() : repsN();
      rows.forEach((row, di) => row.forEach((v, dj) => { const i = i0 + di, r = r0 + dj; if (i < L && r < reps) setCell(id, mi, i, r, v); }));
      save(); renderExp(); return;
    }
    if (el.dataset.cal !== undefined) {
      e.preventDefault();
      const i0 = +el.dataset.cal; rows.forEach((row, di) => { const i = i0 + di; while (S.cal.rows.length <= i) S.cal.rows.push(["", ""]); S.cal.rows[i] = [row[0] || "", row[1] || ""]; });
      save(); renderTab();
    }
  }

  /* للمساعد الموجّه: يقرأ ما ينقص الدراسة */
  ECO.sorbState = () => ({ tab: S.tab, exp: S.exp, done: EXPS.filter(e => compute(e.id).some(m => m.has)).map(e => e.id), mats: S.mats.slice(), pol: pol().n });
  ECO.sorbGo = (tab, exp) => { if (tab) S.tab = tab; if (exp && EX(exp)) S.exp = exp; save(); if (root() && root().firstChild) renderTab(); };

  ECO.views.sorb = {
    init() { shell(); },
    show() { if (root() && !root().firstChild) shell(); }
  };
})();
