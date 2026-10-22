/* =====================================================================
   EcoBio AI — محلّل بيانات البيئة
   ارفع جدول نتائجك (Excel أو CSV أو لصق من Excel) لتحصل على:
   جدول المتوسطات ± الانحراف المعياري مع حروف دنكن، تحليل التباين،
   مصفوفة الارتباط، المقارنة بالمواصفات، مؤشرات التلوث، ورسوم للنشر.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const ST = () => ECO.stats || window.ECO_STATS;

  const S = { cols: [], rows: [], gA: -1, gB: -1, params: [], kind: "water", res: null, src: "", file: "", lod: 0, tab: "table", chartP: null, corrSel: null };

  /* ------------------------------------------------------------------
     قراءة القيم
  ------------------------------------------------------------------ */
  const AR_DIG = /[٠-٩۰-۹]/g;
  const latin = s => String(s).replace(AR_DIG, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d) >= 0 ? "٠١٢٣٤٥٦٧٨٩".indexOf(d) : "۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/٫/g, ".").replace(/٬/g, "");
  function toNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : NaN;
    if (v == null) return NaN;
    let s = latin(v).trim().replace(/ /g, "");
    if (!s) return NaN;
    if (/^(<|>|≤|≥)|^(n\.?d\.?|bdl|lod|loq|nd|-|—|–|n\/a|na)$/i.test(s)) { S._lod++; return NaN; }
    s = s.replace(/\s+/g, "");
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
    return /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s) ? parseFloat(s) : NaN;
  }
  function parseText(text) {
    text = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    const first = text.split("\n").find(l => l.trim()) || "";
    const cand = ["\t", ";", ","].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1]);
    const d = cand[0][1] > 1 ? cand[0][0] : ",";
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"' && cell === "") q = true;
      else if (c === d) { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ""));
  }

  /* التعرف على المعايير المعروفة من اسم العمود */
  const ALIAS = [
    ["ph", /^\s*ph\b|الأس الهيدروجيني|الاس الهيدروجيني|الرقم الهيدروجيني/i], ["tds", /\btds\b|المواد الصلبة الذائبة|الأملاح الذائبة/i],
    ["turb", /turb|عكور/i], ["do", /^\s*do\b|\bd\.o\b|الأكسجين المذاب|الاوكسجين المذاب|الأوكسجين المذاب/i], ["bod", /\bbod/i],
    ["no3", /no3|no₃|نترات/i], ["po4", /po4|po₄|فوسفات/i], ["cl", /^\s*cl\b|cl⁻|كلوريد/i], ["so4", /so4|so₄|كبريتات/i], ["th", /^\s*t\.?h\b|العسرة|عسرة/i],
    ["pb", /^\s*pb\b|رصاص/i], ["cd", /^\s*cd\b|كادميوم|كادميوم/i], ["cr", /^\s*cr\b|كروم/i], ["ni", /^\s*ni\b|نيكل/i], ["fe", /^\s*fe\b|حديد/i], ["zn", /^\s*zn\b|زنك|خارصين/i], ["cu", /^\s*cu\b|نحاس/i],
    ["co", /^\s*co\b(?!d)|كوبلت/i], ["mn", /^\s*mn\b|منغنيز/i], ["as", /^\s*as\b|زرنيخ/i], ["hg", /^\s*hg\b|زئبق/i]
  ];
  const keyOf = name => { const n = String(name || ""); const a = ALIAS.find(([, re]) => re.test(n)); return a ? a[0] : null; };
  const METAL_KEYS = ["pb", "cd", "cr", "ni", "fe", "zn", "cu", "co", "mn", "as", "hg"];
  const SED_SYM = { pb: "Pb", cd: "Cd", cr: "Cr", ni: "Ni", zn: "Zn", cu: "Cu", co: "Co", mn: "Mn", as: "As", hg: "Hg" };

  /* ------------------------------------------------------------------
     تحميل البيانات
  ------------------------------------------------------------------ */
  function load(table, src, file) {
    const t = table.filter(r => r && r.some(x => x != null && String(x).trim() !== ""));
    if (t.length < 2) { U.toast("الجدول فارغ أو فيه صف عناوين فقط"); return; }
    const width = Math.max(...t.map(r => r.length));
    S.cols = Array.from({ length: width }, (_, i) => { const h = t[0][i]; return h == null || String(h).trim() === "" ? `عمود ${i + 1}` : String(h).trim(); });
    S.rows = t.slice(1).map(r => Array.from({ length: width }, (_, i) => (r[i] == null ? "" : r[i])));
    S.src = src || ""; S.file = file || "";
    // نوع كل عمود
    S._lod = 0;
    const numeric = S.cols.map((_, i) => { const vals = S.rows.map(r => r[i]).filter(v => String(v).trim() !== ""); if (!vals.length) return false; return vals.filter(v => isFinite(toNum(v))).length / vals.length >= 0.6; });
    S.numeric = numeric;
    const cats = S.cols.map((_, i) => i).filter(i => !numeric[i]);
    S.gA = cats.length ? cats[0] : -1; S.gB = -1;
    S.params = S.cols.map((_, i) => i).filter(i => numeric[i]);
    S.chartP = S.params[0];
    const metals = S.params.filter(i => METAL_KEYS.includes(keyOf(S.cols[i]))).length;
    S.kind = /رواسب|تربة|sediment|soil/i.test(S.cols.join(" ") + " " + (S.file || "")) ? "sed" : "water";
    if (S.kind === "water" && metals && metals === S.params.length && /mg\/kg|ppm.*جاف|dry/i.test(S.cols.join(" "))) S.kind = "sed";
    buildMap(); analyze();
    U.$("#an-work").hidden = false;
    U.$("#an-work").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
  }

  async function onFile(f) {
    if (!f) return;
    const name = f.name || "";
    try {
      if (/\.xlsx$/i.test(name)) { const r = await ECO.xlsx.read(await f.arrayBuffer()); load(r.rows, `ملف Excel: ${name}${r.sheetNames.length > 1 ? ` (الورقة الأولى «${r.sheetNames[0]}»)` : ""}`, name); }
      else if (/\.xls$/i.test(name)) U.toast("صيغة xls القديمة غير مدعومة؛ احفظ الملف من Excel بصيغة xlsx أو CSV");
      else load(parseText(await f.text()), `ملف: ${name}`, name);
    } catch (e) { console.error(e); U.toast("تعذّرت قراءة الملف: " + e.message); }
  }

  /* بيانات منشورة للتجربة */
  function demo(id) {
    const R = ECO.RESEARCH || [];
    if (id === "bact") {
      const r = R.find(x => x.id === "tikrit-2023"), t = r && r.tables.find(x => x.id === "bact"); if (!t) return;
      const rows = [["المحطة", "الفصل", `العدد الكلي للبكتيريا (${t.unit})`]];
      t.rows.forEach(row => t.cols.forEach((c, i) => rows.push([row[0], c, row[i + 1]])));
      load(rows, `بيانات منشورة: ${r.authors} (${r.year})، ${r.journal}. الجدول: ${t.title}.`, "tikrit-bacteria");
      setB(1);
    } else if (id === "baiji") {
      const r = R.find(x => x.id === "baiji-2025"), t = r && r.tables.find(x => x.id === "water"); if (!t) return;
      const rows = [["المحطة", ...t.rows.map(x => x[0])]];
      t.cols.forEach((c, i) => rows.push([c, ...t.rows.map(x => x[i + 1])]));
      load(rows, `بيانات منشورة: ${r.authors} (${r.year})، ${r.journal}. الجدول: ${t.title}. قيمة واحدة لكل محطة، لذلك لا يُحسب تحليل التباين.`, "baiji-water");
    }
  }
  function setB(i) { S.gB = i; const sel = U.$("#an-gb"); if (sel) sel.value = String(i); analyze(); }

  function template() {
    const head = ["المحطة", "الفصل", "pH", "TDS (mg/L)", "BOD5 (mg/L)", "NO3 (mg/L)", "PO4 (mg/L)", "Pb (mg/L)", "Cd (mg/L)"];
    const blob = ECO.xlsx.write([{ name: "نتائجي", rows: [head, ["م1", "صيف"], ["م1", "شتاء"], ["م2", "صيف"], ["م2", "شتاء"]] }]);
    ECO.xlsx.download(blob, "قالب-بيانات-EcoBio.xlsx");
  }

  /* ------------------------------------------------------------------
     ربط الأعمدة
  ------------------------------------------------------------------ */
  function buildMap() {
    const opt = (sel, allowNone) => (allowNone ? `<option value="-1">— بدون —</option>` : "") + S.cols.map((c, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${U.esc(c)}</option>`).join("");
    U.$("#an-src").textContent = `${S.src} — ${S.rows.length} صفاً، ${S.cols.length} أعمدة.`;
    U.$("#an-ga").innerHTML = opt(S.gA, true);
    U.$("#an-gb").innerHTML = opt(S.gB, true);
    U.$("#an-params").innerHTML = S.cols.map((c, i) => {
      if (!S.numeric[i]) return "";
      const k = keyOf(c);
      return `<label${k ? ` title="معيار معروف: تظهر مقارنته بالمواصفات والمؤشرات"` : ""}><input type="checkbox" value="${i}" ${S.params.includes(i) ? "checked" : ""}><bdi>${U.esc(c)}</bdi></label>`;
    }).join("");
    U.$$("#an-kind button").forEach(b => b.classList.toggle("on", b.dataset.k === S.kind));
  }

  /* ------------------------------------------------------------------
     التحليل
  ------------------------------------------------------------------ */
  function levels(ci) { if (ci < 0) return []; const seen = []; S.rows.forEach(r => { const v = String(r[ci]).trim(); if (v !== "" && !seen.includes(v)) seen.push(v); }); return seen; }

  function analyze() {
    const st = ST(); if (!st || !S.rows.length) return;
    S._lod = 0;
    const A = levels(S.gA), useB = S.gB >= 0 && S.gB !== S.gA;
    const P = S.params.map(ci => {
      const name = S.cols[ci], key = keyOf(name);
      const data = S.rows.map(r => ({ a: S.gA >= 0 ? String(r[S.gA]).trim() : "الكل", b: useB ? String(r[S.gB]).trim() : null, y: toNum(r[ci]) }));
      const all = st.describe(data.map(d => d.y));
      const byG = (A.length ? A : ["الكل"]).map(l => Object.assign({ l }, st.describe(data.filter(d => d.a === l).map(d => d.y))));
      const an = S.gA >= 0 && A.length > 1 ? st.anova(data, useB) : null;
      let letters = null, dn = null;
      if (an) {
        if (an.pA <= 0.05) { dn = st.duncan(an.groups, an.MSE, an.dfE); letters = dn ? dn.letters : null; }
        else { letters = {}; an.groups.forEach(g => { letters[g.l] = "a"; }); }
      }
      return { ci, name, key, data, all, byG, an, letters, dn };
    });
    // الارتباط
    const lod = S._lod;
    const corr = P.map(p => P.map(q => (p === q ? { r: 1, p: 0, n: p.all.n } : st.pearson(p.data.map(d => d.y), q.data.map(d => d.y)))));
    S.res = { P, A: A.length ? A : ["الكل"], useB, corr, lod: lod / Math.max(1, 1) };
    render();
  }

  /* ------------------------------------------------------------------
     العرض
  ------------------------------------------------------------------ */
  const bi = t => `<bdi>${U.esc(t)}</bdi>`;
  const LRI = t => `\u2066${t}\u2069`, FSI = t => `\u2068${t}\u2069`;
  const nf = (v, ref) => { if (!U.isNum(v)) return "—"; const a = Math.abs(ref != null && U.isNum(ref) ? ref : v); const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 1 : a >= 1 ? 2 : 3; return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  const nsd = (sd, mean) => { if (!U.isNum(sd)) return "—"; if (sd === 0) return "0"; const a = Math.abs(U.isNum(mean) ? mean : sd); const dm = a >= 100 ? 1 : a >= 10 ? 1 : a >= 1 ? 2 : 3; const d = Math.min(5, Math.max(dm, -Math.floor(Math.log10(Math.abs(sd))))); return sd.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  const pf = p => !U.isNum(p) ? "—" : p < 0.001 ? "< 0.001" : p.toFixed(3);
  const stars = p => !U.isNum(p) ? "" : p <= 0.01 ? "**" : p <= 0.05 ? "*" : "";

  function cellText(g, letters, withRange) {
    if (!g.n) return { html: "—", txt: "—" };
    const L = letters && letters[g.l] ? letters[g.l] : "";
    if (g.n === 1) return { html: `<span class="num" dir="ltr">${nf(g.mean)}</span>`, txt: nf(g.mean) };
    const ms = `${nf(g.mean)} ± ${nsd(g.sd, g.mean)}`;
    return { html: `${withRange ? `<small class="faint num" dir="ltr">${nf(g.min)} – ${nf(g.max)}</small><br>` : ""}<span class="num" dir="ltr">${ms}${L ? `<sup>${L}</sup>` : ""}</span>`, txt: `${ms}${L ? " " + L : ""}`, range: `${nf(g.min)} – ${nf(g.max)}` };
  }

  function renderTable() {
    const R = S.res, hasAn = R.P.some(p => p.an);
    const head = `<tr><th>المعيار</th>${R.A.map(l => `<th>${U.esc(l)}</th>`).join("")}${hasAn ? "<th>F</th><th>p</th>" : ""}</tr>`;
    const body = R.P.map(p => `<tr><td>${bi(p.name)}</td>${p.byG.map(g => `<td>${cellText(g, p.letters, true).html}</td>`).join("")}${hasAn ? `<td class="num">${p.an ? nf(p.an.FA) : "—"}</td><td class="num${p.an && p.an.pA <= 0.05 ? " sig" : ""}">${p.an ? pf(p.an.pA) + stars(p.an.pA) : "—"}</td>` : ""}</tr>`).join("");
    const reps = R.P[0] ? R.P[0].byG.map(g => g.n) : [];
    const noRep = reps.length && reps.every(n => n <= 1) && !R.useB;
    const note = noRep ? `قيمة واحدة لكل ${U.esc(S.cols[S.gA] || "مجموعة")}، فلا يُحسب الانحراف المعياري ولا تحليل التباين. أضف مكررات (مثلاً قياسات أشهر أو فصول) لكل محطة، أو اختر عاملاً ثانياً.`
      : `القيم: المدى (الأدنى – الأعلى) ثم المتوسط ± الانحراف المعياري. الحروف المختلفة في الصف الواحد تعني فرقاً معنوياً بين مستويات «${U.esc(S.cols[S.gA] || "المجموعات")}» عند p ≤ 0.05 (اختبار دنكن متعدد المدى)، والحرف a لأعلى متوسط. إذا لم يكن F معنوياً تأخذ كل المجموعات الحرف a. ${R.useB ? `حُسب تحليل التباين بنموذج جمعي: ${U.esc(S.cols[S.gA])} + ${U.esc(S.cols[S.gB])}.` : ""} * معنوي عند 0.05، ** عند 0.01.`;
    U.$("#an-p-table").innerHTML = `<div class="tbl-wrap"><table class="tbl an-tbl" id="an-tbl-main"><thead>${head}</thead><tbody>${body}</tbody></table></div>
      <p class="pl-mini">${note}${R.lod ? ` عُوملت ${R.lod} قيمة مكتوبة كأقل من حد الكشف (مثل &lt;0.01 أو ND) كقيم مفقودة.` : ""}</p>
      <div class="an-interp">${interp()}</div>`;
  }

  function interp() {
    const R = S.res, gName = `«${U.esc(S.cols[S.gA] || "المجموعات")}»`, out = [];
    const N = S.rows.length, np = R.P.length;
    out.push(`شمل التحليل ${N} قياساً موزعة على ${R.A.length} من مستويات ${gName} (${R.A.map(U.esc).join("، ")})، ${np === 1 ? "لمعيار واحد" : `لـ ${np} معايير`}.`);
    const sig = R.P.filter(p => p.an && p.an.pA <= 0.05), ns = R.P.filter(p => p.an && p.an.pA > 0.05);
    if (sig.length) out.push(`أظهر تحليل التباين فروقاً معنوية بين مستويات ${gName} (p ≤ 0.05) في: <b>${sig.map(p => bi(p.name)).join("، ")}</b>.`);
    if (ns.length) out.push(`ولم تكن الفروق معنوية في: ${ns.map(p => bi(p.name)).join("، ")}.`);
    R.P.slice(0, 6).forEach(p => {
      const g = p.byG.filter(x => x.n), hi = g.slice().sort((a, b) => b.mean - a.mean)[0], lo = g.slice().sort((a, b) => a.mean - b.mean)[0];
      if (hi && lo && hi !== lo) out.push(`${bi(p.name)}: أعلى متوسط في ${bi(hi.l)} (${nf(hi.mean)}) وأدناه في ${bi(lo.l)} (${nf(lo.mean)}).`);
    });
    const pairs = [];
    R.P.forEach((p, i) => R.P.forEach((q, j) => { if (j > i && U.isNum(R.corr[i][j].r) && R.corr[i][j].p <= 0.05) pairs.push([p, q, R.corr[i][j]]); }));
    pairs.sort((a, b) => Math.abs(b[2].r) - Math.abs(a[2].r));
    if (pairs.length) out.push(`أقوى ارتباط معنوي: ${bi(pairs[0][0].name)} مع ${bi(pairs[0][1].name)} (r = ${pairs[0][2].r.toFixed(3)}، p ${pf(pairs[0][2].p).startsWith("<") ? pf(pairs[0][2].p) : "= " + pf(pairs[0][2].p)}).`);
    return out.join(" ");
  }

  function renderAnova() {
    const R = S.res, P = R.P.filter(p => p.an);
    if (!P.length) { U.$("#an-p-anova").innerHTML = `<p class="empty">تحليل التباين يحتاج مجموعتين على الأقل، وأكثر من قياس لكل مجموعة أو عاملاً ثانياً. اختر عمود المجموعات (مثل المحطة) من الأعلى.</p>`; return; }
    const sel = P.find(p => p.ci === S.anSel) || P[0]; S.anSel = sel.ci;
    const a = sel.an, B = R.useB;
    const src = [[U.esc(S.cols[S.gA]), a.dfA, a.SSA, a.MSA, a.FA, a.pA]].concat(B ? [[U.esc(S.cols[S.gB]), a.dfB, a.SSB, a.MSB, a.FB, a.pB]] : []).concat([["الخطأ التجريبي", a.dfE, a.SSE, a.MSE, null, null], ["الكلي", a.N - 1, a.SST, null, null, null]]);
    const dn = sel.dn;
    U.$("#an-p-anova").innerHTML = `<div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th>المعيار</th><th>F</th><th>درجات الحرية</th><th>p</th><th>الدلالة</th><th>CV%</th></tr></thead><tbody>${P.map(p => `<tr><td><button type="button" class="link-btn" data-an-sel="${p.ci}">${U.esc(p.name)}</button></td><td class="num">${nf(p.an.FA)}</td><td class="num">${p.an.dfA}, ${p.an.dfE}</td><td class="num${p.an.pA <= 0.05 ? " sig" : ""}">${pf(p.an.pA)}</td><td>${p.an.pA <= 0.01 ? "معنوي جداً **" : p.an.pA <= 0.05 ? "معنوي *" : "غير معنوي"}</td><td class="num">${nf(Math.sqrt(p.an.MSE) / p.all.mean * 100)}</td></tr>`).join("")}</tbody></table></div>
      <h4 class="an-h">جدول تحليل التباين: ${U.esc(sel.name)}</h4>
      <div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th>مصدر التباين</th><th>درجات الحرية</th><th>مجموع المربعات</th><th>متوسط المربعات</th><th>F</th><th>p</th></tr></thead><tbody>${src.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${nf(r[2])}</td><td class="num">${r[3] == null ? "" : nf(r[3])}</td><td class="num">${r[4] == null ? "" : nf(r[4])}</td><td class="num${r[5] != null && r[5] <= 0.05 ? " sig" : ""}">${r[5] == null ? "" : pf(r[5])}</td></tr>`).join("")}</tbody></table></div>
      ${!a.balanced ? `<p class="notice warn pl-mini">التصميم غير متوازن (أعداد مختلفة في المستويات) مع عاملين؛ مجاميع المربعات تقريبية.</p>` : ""}
      ${dn ? `<h4 class="an-h">قيم المدى المعنوي لدنكن (α = 0.05، درجات حرية الخطأ ${a.dfE})</h4>
        <div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th>عدد المتوسطات p</th>${Object.keys(dn.ssr).map(p => `<th class="num">${p}</th>`).join("")}</tr></thead><tbody><tr><td>SSR</td>${Object.values(dn.ssr).map(v => `<td class="num">${v.toFixed(3)}</td>`).join("")}</tr></tbody></table></div>
        <p class="pl-mini">المتوسطات مرتبة تنازلياً: ${dn.order.map(l => `${U.esc(l)} <sup>${dn.letters[l]}</sup>`).join(" ، ")}</p>` : `<p class="pl-mini">${a.pA > 0.05 ? "F غير معنوي، لذا لا تُجرى المقارنات المتعددة." : ""}</p>`}
      <p class="faint pl-mini">قيم المدى المعنوي محسوبة من توزيع المدى المعياري بمستوى حماية دنكن αp = 1 − (1 − α)^(p−1)، وتطابق جداول دنكن المنشورة. للأعداد غير المتساوية يُستخدم تعديل Kramer.</p>`;
  }


  /* ------------------------------------------------------------------
     المشرف الإحصائي: يتحقق من شروط تحليل التباين ويقترح الاختبار الصحيح
  ------------------------------------------------------------------ */
  function advise(p) {
    const st = ST(), a = p.an; if (!a) return null;
    const G = a.groups.map(g => g.ys), ns = G.map(g => g.length), nMin = Math.min(...ns);
    const res = []; a.groups.forEach(g => g.ys.forEach(y => res.push(y - g.mean)));
    const sw = st.shapiro(res);
    const allPos = G.every(g => g.every(v => v > 0));
    let swLog = null;
    if (allPos && sw && sw.p <= 0.05) { const r2 = []; G.forEach(g => { const L = g.map(Math.log), m = L.reduce((s, v) => s + v, 0) / L.length; L.forEach(v => r2.push(v - m)); }); swLog = st.shapiro(r2); }
    const lev = st.levene(G), kw = st.kruskal(G), wl = st.welch(G);
    const out = G.map(g => st.outliersIQR(g).length).reduce((s, v) => s + v, 0);
    const eta2 = a.SST > 0 ? a.SSA / a.SST : NaN, need = st.nPerGroup(eta2, G.length);
    const normal = sw ? sw.p > 0.05 : null, eqVar = lev ? lev.p > 0.05 : null;
    let rec, recP, why;
    if (nMin < 3) { rec = "زِد المكررات"; recP = NaN; why = `أقل مجموعة فيها ${nMin} ${nMin === 1 ? "قياس" : "قياسان"} فقط، ولا تكفي لفحص التوزيع أو التباين بشكل موثوق.`; }
    else if (normal !== false && eqVar !== false) { rec = "تحليل التباين ANOVA + دنكن"; recP = a.pA; why = "البواقي تتبع التوزيع الطبيعي والتباين متجانس، فشروط تحليل التباين متحققة."; }
    else if (normal !== false && eqVar === false) { rec = "تحليل تباين ويلش (Welch)"; recP = wl ? wl.p : NaN; why = "البواقي طبيعية لكن التباين غير متجانس بين المجموعات (ليفين معنوي)، وويلش لا يفترض تساوي التباين."; }
    else if (swLog && swLog.p > 0.05) { rec = "ANOVA على لوغاريتم القيم"; recP = (() => { const rows = []; a.groups.forEach(g => g.ys.forEach(y => rows.push({ a: g.l, y: Math.log(y) }))); const r = st.anova(rows, false); return r ? r.pA : NaN; })(); why = "البواقي ليست طبيعية، لكنها تصبح طبيعية بعد تحويل اللوغاريتم (شائع في تراكيز الملوثات)."; }
    else { rec = "كروسكال–والس (لا معلمي)"; recP = kw ? kw.p : NaN; why = "البواقي لا تتبع التوزيع الطبيعي حتى بعد التحويل، فالاختبار اللامعلمي أصح."; }
    return { ns, nMin, sw, swLog, lev, kw, wl, out, eta2, need, rec, recP, why, normal, eqVar, anovaP: a.pA };
  }

  function renderAdvisor() {
    const R = S.res, P = R.P.filter(p => p.an), box = U.$("#an-p-advisor"); if (!box) return;
    box.onclick = e => { if (e.target.closest("#an-write")) writeUp(); };
    if (!P.length) { box.innerHTML = `<p class="empty">المشرف الإحصائي يحتاج عمود مجموعات (مثل المحطة أو المعاملة) وأكثر من قياس لكل مجموعة.</p>`; return; }
    const A = P.map(p => Object.assign({ p }, advise(p)));
    const yes = (ok, t, f) => ok == null ? "—" : ok ? `<span class="ok">${t}</span>` : `<span class="bad">${f}</span>`;
    const agree = x => U.isNum(x.recP) && U.isNum(x.anovaP) && ((x.recP <= 0.05) !== (x.anovaP <= 0.05));
    box.innerHTML = `<div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th>المعيار</th><th class="num">أقل مكررات</th><th>التوزيع الطبيعي للبواقي<br><small>شابيرو–ويلك</small></th><th>تجانس التباين<br><small>ليفين</small></th><th class="num">قيم شاذة</th><th class="num">حجم الأثر η²</th><th>الاختبار المناسب</th><th class="num">p</th></tr></thead><tbody>
      ${A.map(x => `<tr><td>${bi(x.p.name)}</td><td class="num">${x.nMin}</td><td>${x.sw ? yes(x.normal, "نعم", "لا") + ` <small class="faint">(p ${pf(x.sw.p)})</small>` : "—"}</td><td>${x.lev ? yes(x.eqVar, "متجانس", "غير متجانس") + ` <small class="faint">(p ${pf(x.lev.p)})</small>` : "—"}</td><td class="num">${x.out || "0"}</td><td class="num">${U.isNum(x.eta2) ? nf(x.eta2) : "—"}</td><td><b>${U.esc(x.rec)}</b></td><td class="num${x.recP <= 0.05 ? " sig" : ""}">${pf(x.recP)}${stars(x.recP)}</td></tr>`).join("")}</tbody></table></div>
      <div class="an-interp">${A.map(x => `<p><b>${bi(x.p.name)}:</b> ${x.why} ${agree(x) ? `<b class="bad">انتبه: نتيجة الاختبار المناسب (p ${pf(x.recP)}) تختلف عن ANOVA العادي (p ${pf(x.anovaP)})، فاعتمد الاختبار المناسب في رسالتك.</b>` : ""}
        ${x.out ? `وُجدت ${x.out} قيمة شاذة بقاعدة IQR؛ تأكد أنها ليست خطأ إدخال قبل حذفها، ولا تحذفها لمجرد أنها بعيدة.` : ""}
        ${x.need && x.need > x.nMin ? `لكشف فرق بحجم الأثر الحالي (η² = ${nf(x.eta2)}) بقوة 80% تحتاج نحو <b>${x.need}</b> مكررات لكل مجموعة (لديك ${x.nMin}).` : x.need ? `عدد المكررات كافٍ لكشف هذا الأثر بقوة 80%.` : ""}</p>`).join("")}
        <div class="an-write"><button type="button" class="btn btn-sm" id="an-write">اكتب فقرتي المنهجية الإحصائية والنتائج</button><div id="an-write-out"></div></div>
        <p class="faint pl-mini">الطرق: شابيرو–ويلك على بواقي النموذج (Royston 1995)، ليفين بالوسيط (Brown–Forsythe 1974)، ويلش (1951)، كروسكال–والس مع تصحيح التعادل، القيم الشاذة بقاعدة توكي 1.5×IQR، وحجم العينة من جداول القوة لكوهين (1988). نتائجها مطابقة لمكتبة SciPy. ملاحظة: اختبار دنكن متساهل نسبياً، وبعض المجلات تفضّل توكي HSD.</p></div>`;
  }

  /* كاتب فقرات الرسالة: يكتب من الأرقام المحسوبة هنا فقط */
  function writeUp() {
    const out = U.$("#an-write-out"), R = S.res; if (!R) return;
    if (ECO.gemini.ready && !ECO.gemini.ready()) { ECO.gemini.renderInto(out, ""); return; }
    const facts = R.P.map(p => { const x = advise(p) || {};
      return `المعيار: ${p.name}\n` + p.byG.filter(g => g.n).map(g => `  ${g.l}: n=${g.n}، المتوسط=${nf(g.mean)}، الانحراف=${nsd(g.sd, g.mean)}${p.letters && p.letters[g.l] ? "، حرف دنكن=" + p.letters[g.l] : ""}`).join("\n")
        + (p.an ? `\n  ANOVA: F(${p.an.dfA}, ${p.an.dfE}) = ${nf(p.an.FA)}، p = ${pf(p.an.pA)}` : "")
        + (x.rec ? `\n  الاختبار المناسب حسب الشروط: ${x.rec}، p = ${pf(x.recP)}؛ شابيرو–ويلك للبواقي p = ${x.sw ? pf(x.sw.p) : "—"}؛ ليفين p = ${x.lev ? pf(x.lev.p) : "—"}؛ η² = ${U.isNum(x.eta2) ? nf(x.eta2) : "—"}` : ""); }).join("\n\n");
    const corr = []; R.P.forEach((p, i) => R.P.forEach((q, j) => { const c = R.corr[i][j]; if (j > i && U.isNum(c.r) && c.p <= 0.05) corr.push(`${p.name} مع ${q.name}: r = ${c.r.toFixed(3)}، p = ${pf(c.p)}، n = ${c.n}`); }));
    out.innerHTML = `<p class="typing"><i></i><i></i><i></i></p>`;
    ECO.gemini.generate({ temperature: 0.3,
      system: "أنت محرر علمي لرسائل الماجستير في علوم البيئة. اكتب فقط من الأرقام المعطاة حرفياً، ولا تضف أي رقم أو تفسير سببي غير مدعوم. استعمل صيغة البحوث المحكمة.",
      contents: [{ role: "user", parts: [{ text: `اكتب لرسالتي:
1) فقرة «التحليل الإحصائي» (Statistical analysis) تصف الاختبارات المستعملة فعلاً حسب الشروط أدناه (ANOVA أو ويلش أو كروسكال–والس، ودنكن، وبيرسون) مع مستوى المعنوية 0.05 وبرنامج التحليل: منصة EcoBio AI.
2) فقرة «النتائج» تصف الفروق بين مستويات «${S.cols[S.gA] || "المجموعات"}» لكل معيار بالأرقام، وتشير إلى الجدول بـ «الجدول (1)».
اكتب الفقرتين بالعربية ثم ترجمتهما الإنكليزية.

البيانات المحسوبة:
${facts}

الارتباطات المعنوية:
${corr.join("\n") || "لا توجد"}` }] }],
      onText: t => { out.innerHTML = U.md(t); } })
      .then(() => out.insertAdjacentHTML("beforeend", `<p class="faint pl-mini">مسودة مكتوبة من أرقامك المحسوبة أعلاه؛ راجعها مع مشرفك وأضف تفسيرك العلمي ومقارنتك بالدراسات السابقة.</p>`))
      .catch(e => { out.innerHTML = `<div class="notice warn">${U.esc(e.message)}</div>`; });
  }

  function renderCorr() {
    const R = S.res, P = R.P;
    if (P.length < 2) { U.$("#an-p-corr").innerHTML = `<p class="empty">اختر معيارين على الأقل لحساب الارتباط.</p>`; return; }
    const col = r => { if (!U.isNum(r)) return "transparent"; const a = Math.min(1, Math.abs(r)); return r >= 0 ? `rgba(79,200,220,${(a * 0.55).toFixed(2)})` : `rgba(238,122,79,${(a * 0.55).toFixed(2)})`; };
    const short = s => s.length > 16 ? s.slice(0, 15) + "…" : s;
    U.$("#an-p-corr").innerHTML = `<div class="tbl-wrap"><table class="tbl an-tbl an-heat"><thead><tr><th></th>${P.map(p => `<th title="${U.esc(p.name)}">${U.esc(short(p.name))}</th>`).join("")}</tr></thead><tbody>${P.map((p, i) => `<tr><th title="${U.esc(p.name)}">${U.esc(short(p.name))}</th>${P.map((q, j) => { const c = R.corr[i][j]; return `<td class="num" style="background:${i === j ? "var(--ink-2)" : col(c.r)}">${i === j ? "1" : U.isNum(c.r) ? c.r.toFixed(2) + stars(c.p) : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="an-legend"><span><i style="background:rgba(79,200,220,.55)"></i>ارتباط موجب</span><span><i style="background:rgba(238,122,79,.55)"></i>ارتباط سالب</span><span>* معنوي عند 0.05 · ** عند 0.01 (معامل بيرسون، ثنائي الطرف)</span><span>عدد الأزواج n = ${R.corr[0][1] ? R.corr[0][1].n : "—"}</span></div>
      ${S.rows.length < 8 ? `<p class="notice warn pl-mini">عدد القياسات قليل (${S.rows.length})؛ الارتباط مع عيّنة صغيرة غير مستقر، فتعامل معه بحذر.</p>` : ""}`;
  }

  function renderStd() {
    const R = S.res, box = U.$("#an-p-std");
    const known = R.P.filter(p => p.key);
    if (!known.length) { box.innerHTML = `<p class="empty">لم يُتعرف على معايير معروفة من أسماء الأعمدة (مثل pH، TDS، BOD، NO3، Pb، Cd). سمِّ الأعمدة بالرمز أو الاسم العربي لتظهر المقارنة والمؤشرات.</p>`; return; }
    if (S.kind === "water") {
      const lim = k => { const w = (ECO.WATER_PARAMS || []).find(x => x.key === k), m = (ECO.METALS || []).find(x => x.key === k); return w ? { std: w.std, min: w.min, src: w.src } : m ? { std: m.std, src: "IQS 417 / WHO" } : null; };
      const rows = known.map(p => {
        const L = lim(p.key); if (!L) return null;
        const over = v => U.isNum(v) && (p.key === "ph" ? v < (L.min || 6.5) || v > L.std : p.key === "do" ? v < L.std : v > L.std);
        const vals = p.data.map(d => d.y).filter(U.isNum), ex = vals.filter(over).length;
        return `<tr><td>${U.esc(p.name)}</td><td class="num">${p.key === "ph" ? `${L.min || 6.5}–${L.std}` : p.key === "do" ? `≥ ${L.std}` : `≤ ${L.std}`}</td><td><small>${U.esc(L.src)}</small></td>${p.byG.map(g => `<td class="num${over(g.mean) ? " over" : ""}">${nf(g.mean)}</td>`).join("")}<td class="num${ex ? " over" : ""}">${ex}/${vals.length} (${vals.length ? Math.round(ex / vals.length * 100) : 0}%)</td></tr>`;
      }).filter(Boolean).join("");
      const idx = R.A.map((l, gi) => {
        const v = {}; known.forEach(p => { const g = p.byG[gi]; if (g && U.isNum(g.mean)) v[p.key] = g.mean; });
        const w = ECO.waterIndex ? ECO.waterIndex.wqi(v) : null, h = ECO.waterIndex ? ECO.waterIndex.hpi(v) : null;
        const wc = w && ECO.waterIndex.wqiClass(w.wqi);
        return `<tr><td>${U.esc(l)}</td><td class="num">${w ? nf(w.wqi) : "—"}</td><td>${wc ? `<span class="chip tone-${wc[1]}">${wc[0]}</span>` : "—"}</td><td class="num">${w ? w.rows.length : 0}</td><td class="num">${h ? nf(h.hpi) : "—"}</td><td>${h ? `<span class="chip tone-${h.hpi > 100 ? "severe" : "good"}">${h.hpi > 100 ? "فوق الحد الحرج 100" : "دون الحد الحرج"}</span>` : "—"}</td></tr>`;
      }).join("");
      box.innerHTML = `<h4 class="an-h">المقارنة بحدود مياه الشرب (متوسط كل ${U.esc(S.cols[S.gA] || "مجموعة")})</h4>
        <div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th>المعيار</th><th>الحد</th><th>المصدر</th>${R.A.map(l => `<th>${U.esc(l)}</th>`).join("")}<th>القياسات المتجاوزة</th></tr></thead><tbody>${rows || `<tr><td colspan="9" class="faint">لا توجد حدود لهذه المعايير.</td></tr>`}</tbody></table></div>
        <h4 class="an-h">مؤشرا جودة المياه WQI وتلوث العناصر الثقيلة HPI</h4>
        <div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th>${U.esc(S.cols[S.gA] || "المجموعة")}</th><th>WQI</th><th>التصنيف</th><th>عدد المعايير الداخلة</th><th>HPI</th><th>الحكم</th></tr></thead><tbody>${idx}</tbody></table></div>
        <p class="pl-mini">WQI بطريقة المتوسط الحسابي الموزون (Brown et al., 1972)، وHPI لـ Mohan et al. (1996)، بنفس حدود مختبر جودة المياه في المنصة (يمكن تعديلها هناك). المؤشر يُحسب من المعايير المتوفرة فقط؛ كلما قلّ عددها قلّت دقته. وحدات المعادن يجب أن تكون mg/L.</p>`;
    } else {
      const BG = ECO.SEDBG || {};
      const mets = known.filter(p => SED_SYM[p.key] && BG[SED_SYM[p.key]]);
      if (!mets.length) { box.innerHTML = `<p class="empty">لم يُتعرف على عناصر ثقيلة لها قيم خلفية (Pb، Cd، Ni، Cu، Zn، Cr، Co، As، Hg، Mn).</p>`; return; }
      const igB = v => v <= 0 ? ["غير ملوث", "good"] : v <= 1 ? ["غير ملوث–متوسط", "fair"] : v <= 2 ? ["متوسط", "warn"] : v <= 3 ? ["متوسط–شديد", "bad"] : v <= 4 ? ["شديد", "severe"] : v <= 5 ? ["شديد–شديد جداً", "severe"] : ["شديد جداً", "hazard"];
      const body = R.A.map((l, gi) => {
        let prod = 1, n = 0;
        const cells = mets.map(p => { const g = p.byG[gi], bn = BG[SED_SYM[p.key]][0]; if (!g || !U.isNum(g.mean) || g.mean <= 0) return "<td>—</td><td>—</td>"; const cf = g.mean / bn, ig = Math.log2(g.mean / (1.5 * bn)); prod *= cf; n++; const b = igB(ig); return `<td class="num">${nf(cf)}</td><td><span class="chip tone-${b[1]}">${nf(ig)}</span></td>`; }).join("");
        const pli = n ? Math.pow(prod, 1 / n) : NaN;
        return `<tr><td>${U.esc(l)}</td>${cells}<td class="num${pli > 1 ? " over" : ""}">${nf(pli)}</td></tr>`;
      }).join("");
      box.innerHTML = `<h4 class="an-h">مؤشرات تلوث الرواسب والتربة لكل ${U.esc(S.cols[S.gA] || "مجموعة")}</h4>
        <div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th rowspan="2">${U.esc(S.cols[S.gA] || "المجموعة")}</th>${mets.map(p => `<th colspan="2">${SED_SYM[p.key]} (Bn = ${BG[SED_SYM[p.key]][0]})</th>`).join("")}<th rowspan="2">PLI</th></tr><tr>${mets.map(() => "<th>CF</th><th>Igeo</th>").join("")}</tr></thead><tbody>${body}</tbody></table></div>
        <p class="pl-mini">CF = C/Bn، Igeo = log₂(C / 1.5·Bn) (Müller 1969)، PLI = (CF₁ × … × CFₙ)^(1/n) (Tomlinson et al. 1980). القيم الخلفية Bn لمعدل الطَّفل العالمي: ${U.esc(ECO.SEDBG_REF || "Turekian & Wedepohl (1961)")}. يجب أن تكون التراكيز mg/kg وزناً جافاً؛ استبدل القيم الخلفية بقيم محلية إن توفرت من الحاسبات العلمية.</p>`;
    }
  }

  /* الرسم: متوسط ± الانحراف المعياري مع حروف دنكن */
  const ERR = {
    id: "ecoErr",
    afterDatasetsDraw(chart, _a, o) {
      const meta = chart.getDatasetMeta(0), ds = chart.data.datasets[0], y = chart.scales.y, ctx = chart.ctx;
      if (!meta || !ds) return;
      ctx.save(); ctx.strokeStyle = o.color; ctx.fillStyle = o.color; ctx.lineWidth = 1.5; ctx.font = `600 ${o.size || 13}px "IBM Plex Sans Arabic", sans-serif`; ctx.textAlign = "center";
      meta.data.forEach((bar, i) => {
        const m = ds.data[i], sd = (ds.sd || [])[i], L = (ds.letters || [])[i];
        if (!isFinite(m)) return;
        let top = y.getPixelForValue(m);
        if (isFinite(sd) && sd > 0) {
          const y1 = y.getPixelForValue(m + sd), y0 = y.getPixelForValue(Math.max(y.min, m - sd)), w = Math.min(12, bar.width / 4);
          ctx.beginPath(); ctx.moveTo(bar.x, y0); ctx.lineTo(bar.x, y1); ctx.moveTo(bar.x - w, y1); ctx.lineTo(bar.x + w, y1); ctx.moveTo(bar.x - w, y0); ctx.lineTo(bar.x + w, y0); ctx.stroke();
          top = y1;
        }
        if (L) ctx.fillText(L, bar.x, top - 6);
      });
      ctx.restore();
    }
  };
  function chartCfg(p, light) {
    const g = p.byG.filter(x => x.n);
    const max = Math.max(...g.map(x => x.mean + (U.isNum(x.sd) ? x.sd : 0)));
    return {
      type: "bar",
      data: { labels: g.map(x => x.l), datasets: [{ label: p.name, data: g.map(x => x.mean), sd: g.map(x => x.sd), letters: g.map(x => (p.letters ? p.letters[x.l] : "")), backgroundColor: light ? "#7cc4d1" : "rgba(79,200,220,.55)", borderColor: light ? "#2b8a9a" : "#4fc8dc", borderWidth: 1, borderRadius: 4, maxBarThickness: 64 }] },
      options: {
        plugins: { legend: { display: false }, ecoErr: { color: light ? "#22343b" : "#e4f1ed", size: light ? 14 : 13 }, tooltip: { callbacks: { label: c => `${nf(c.parsed.y)} ± ${nsd(g[c.dataIndex].sd, g[c.dataIndex].mean)} (n = ${g[c.dataIndex].n})` } } },
        scales: { y: { beginAtZero: true, suggestedMax: max * 1.15, title: { display: true, text: p.name, color: light ? "#3c5259" : undefined }, ticks: light ? { color: "#3c5259" } : {}, grid: light ? { color: "#e4ecee" } : {} },
          x: { reverse: true, title: { display: true, text: S.cols[S.gA] || "", color: light ? "#3c5259" : undefined }, ticks: light ? { color: "#3c5259" } : {}, grid: { display: false } } }
      },
      plugins: [ERR]
    };
  }
  function chartImage(p, w = 700, h = 320) {
    const c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2;
    const box = U.el("div", { style: `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px` }); box.appendChild(c); document.body.appendChild(box);
    const cfg = chartCfg(p, true); cfg.options.responsive = false; cfg.options.animation = false; cfg.options.devicePixelRatio = 2; cfg.options.maintainAspectRatio = false;
    c.style.width = w + "px"; c.style.height = h + "px";
    let url = null; try { const ch = new Chart(c, cfg); url = c.toDataURL("image/png"); ch.destroy(); } catch (e) { url = null; /* الرسم غير متاح: يُحذف من التقرير */ }
    box.remove(); return url;
  }
  function renderChart() {
    const R = S.res, P = R.P; if (!P.length) { U.$("#an-p-chart").innerHTML = `<p class="empty">لا توجد معايير.</p>`; return; }
    if (!P.find(p => p.ci === S.chartP)) S.chartP = P[0].ci;
    const p = P.find(x => x.ci === S.chartP);
    const pane = U.$("#an-p-chart");
    if (!pane.dataset.built) {
      pane.innerHTML = `<div class="row"><div class="field"><label for="an-chart-p">المعيار</label><select id="an-chart-p" class="input"></select></div><button type="button" class="btn btn-sm" id="an-chart-png">${'<svg aria-hidden="true"><use href="#i-down"/></svg>'}تنزيل الرسم PNG</button></div><div class="chart-box an-chart"><canvas id="an-chart" aria-label="رسم المتوسطات والانحراف المعياري وحروف دنكن"></canvas></div><p class="pl-mini">الأعمدة: المتوسط، والخطوط: ± الانحراف المعياري، والحروف: نتيجة اختبار دنكن عند p ≤ 0.05.</p>`;
      pane.dataset.built = "1";
    }
    U.$("#an-chart-p").innerHTML = P.map(x => `<option value="${x.ci}" ${x.ci === S.chartP ? "selected" : ""}>${U.esc(x.name)}</option>`).join("");
    S.chart = U.chart(U.$("#an-chart"), chartCfg(p, false));
  }

  function render() {
    const R = S.res; if (!R) return;
    renderTable(); renderAnova(); renderAdvisor(); renderCorr(); renderStd();
    if (S.tab === "chart") renderChart(); else U.$("#an-p-chart").dataset.stale = "1";
  }

  /* ------------------------------------------------------------------
     التصدير
  ------------------------------------------------------------------ */
  function sheetsData() {
    const R = S.res, hasAn = R.P.some(p => p.an);
    const main = [["المعيار", ...R.A, ...(hasAn ? ["F", "p"] : [])]].concat(R.P.map(p => [p.name, ...p.byG.map(g => cellText(g, p.letters, false).txt), ...(hasAn ? [p.an ? +p.an.FA.toFixed(3) : "", p.an ? +p.an.pA.toFixed(4) : ""] : [])]));
    const range = [["المعيار", ...R.A]].concat(R.P.map(p => [p.name, ...p.byG.map(g => (g.n ? `${nf(g.min)} – ${nf(g.max)}` : "—"))]));
    const desc = [["المعيار", "المجموعة", "n", "المتوسط", "الانحراف المعياري", "الخطأ القياسي", "الأدنى", "الأعلى", "حرف دنكن"]];
    R.P.forEach(p => p.byG.forEach(g => desc.push([p.name, g.l, g.n, g.mean, g.sd, g.se, g.min, g.max, p.letters ? p.letters[g.l] || "" : ""].map(v => (typeof v === "number" && !isFinite(v) ? "" : v)))));
    const an = [["المعيار", "مصدر التباين", "df", "SS", "MS", "F", "p"]];
    R.P.filter(p => p.an).forEach(p => { const a = p.an; an.push([p.name, S.cols[S.gA], a.dfA, a.SSA, a.MSA, a.FA, a.pA]); if (R.useB) an.push([p.name, S.cols[S.gB], a.dfB, a.SSB, a.MSB, a.FB, a.pB]); an.push([p.name, "الخطأ", a.dfE, a.SSE, a.MSE, "", ""]); });
    const cr = [["", ...R.P.map(p => p.name)]].concat(R.P.map((p, i) => [p.name, ...R.P.map((q, j) => (U.isNum(R.corr[i][j].r) ? +R.corr[i][j].r.toFixed(4) : ""))]));
    const crp = [["", ...R.P.map(p => p.name)]].concat(R.P.map((p, i) => [p.name, ...R.P.map((q, j) => (i === j ? "" : U.isNum(R.corr[i][j].p) ? +R.corr[i][j].p.toFixed(4) : ""))]));
    const raw = [S.cols].concat(S.rows);
    return [{ name: "جدول النتائج", rows: main }, { name: "المدى", rows: range }, { name: "الإحصاء الوصفي", rows: desc }, { name: "تحليل التباين", rows: an }, { name: "الارتباط r", rows: cr }, { name: "قيم p للارتباط", rows: crp }, { name: "البيانات", rows: raw }];
  }
  function exportXlsx() { if (!S.res) return; ECO.xlsx.download(ECO.xlsx.write(sheetsData()), `تحليل-${(S.file || "بيانات").replace(/\.[^.]+$/, "")}.xlsx`); }
  async function copyTable() {
    const t = U.$("#an-tbl-main"); if (!t) return;
    const R = S.res, hasAn = R.P.some(p => p.an);
    const html = `<table border="1" style="border-collapse:collapse;direction:rtl;font-family:'Times New Roman';font-size:11pt"><thead><tr><th>المعيار</th>${R.A.map(l => `<th>${U.esc(l)}</th>`).join("")}${hasAn ? "<th>F</th><th>p</th>" : ""}</tr></thead><tbody>${R.P.map(p => `<tr><td>${U.esc(p.name)}</td>${p.byG.map(g => { const c = cellText(g, p.letters, false); return `<td style="text-align:center">${c.range ? c.range + "<br>" : ""}${U.esc(c.txt.replace(/ ([a-z]+)$/, ""))}${p.letters && p.letters[g.l] && g.n > 1 ? `<sup>${p.letters[g.l]}</sup>` : ""}</td>`; }).join("")}${hasAn ? `<td>${p.an ? nf(p.an.FA) : "—"}</td><td>${p.an ? pf(p.an.pA) + stars(p.an.pA) : "—"}</td>` : ""}</tr>`).join("")}</tbody></table>`;
    const text = [["المعيار", ...R.A].join("\t")].concat(R.P.map(p => [p.name, ...p.byG.map(g => cellText(g, p.letters, false).txt)].join("\t"))).join("\n");
    try {
      if (navigator.clipboard && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
      else await navigator.clipboard.writeText(text);
      U.toast("نُسخ الجدول؛ الصقه في Word");
    } catch (e) { U.toast("تعذّر النسخ تلقائياً؛ استخدم تنزيل Excel"); }
  }
  function pdf() {
    if (!S.res) return;
    const R = S.res, hasAn = R.P.some(p => p.an);
    const blocks = [
      { type: "kv", items: [["مصدر البيانات", S.src], ["عدد القياسات", String(S.rows.length)], ["المجموعات", `${S.cols[S.gA] || "—"} (${R.A.length})`], ["العامل الثاني", R.useB ? S.cols[S.gB] : "—"], ["نوع العيّنات", S.kind === "water" ? "مياه" : "تربة / رواسب"]] },
      { type: "h", text: "جدول النتائج" },
      { type: "table", head: ["المعيار", ...R.A, ...(hasAn ? ["F", "p"] : [])], rows: R.P.map(p => [FSI(p.name), ...p.byG.map(g => LRI(cellText(g, p.letters, false).txt)), ...(hasAn ? [p.an ? LRI(nf(p.an.FA)) : "—", p.an ? LRI(pf(p.an.pA) + stars(p.an.pA)) : "—"] : [])]) },
      { type: "note", text: "المتوسط ± الانحراف المعياري؛ الحروف المختلفة في الصف الواحد تعني فرقاً معنوياً عند p ≤ 0.05 (اختبار دنكن متعدد المدى)، والحرف a لأعلى متوسط. * معنوي عند 0.05، ** عند 0.01." },
      { type: "text", html: interp() },
      ...R.P.filter(p => p.byG.some(g => g.n)).slice(0, 4).map(p => ({ type: "image", src: chartImage(p), caption: `${FSI(p.name)}: المتوسط ± الانحراف المعياري وحروف دنكن`, maxH: 300 })),
      R.P.length > 1 ? { type: "h", text: "مصفوفة ارتباط بيرسون" } : null,
      R.P.length > 1 ? { type: "table", head: ["", ...R.P.map(p => FSI(p.name))], rows: R.P.map((p, i) => [FSI(p.name), ...R.P.map((q, j) => (i === j ? "1" : U.isNum(R.corr[i][j].r) ? LRI(R.corr[i][j].r.toFixed(2) + stars(R.corr[i][j].p)) : "—"))]) } : null,
      { type: "refs", items: ["Duncan, D.B. (1955). Multiple range and multiple F tests. Biometrics 11: 1–42.", "Kramer, C.Y. (1956). Extension of multiple range tests to group means with unequal numbers of replications. Biometrics 12: 307–310.", "Copenhaver, M.D., Holland, B. (1988). Computation of the distribution of the maximum studentized range statistic. J. Stat. Comput. Simul. 30: 1–15.", "Brown, R.M. et al. (1972). A water quality index—crashing the psychological barrier. Indicators of Environmental Quality: 173–182.", "Mohan, S.V., Nithila, P., Reddy, S.J. (1996). Estimation of heavy metals in drinking water and development of heavy metal pollution index. J. Environ. Sci. Health A31: 283–289.", "Müller, G. (1969). Index of geoaccumulation in sediments of the Rhine River. GeoJournal 2: 108–118.", "Tomlinson, D.L. et al. (1980). Problems in the assessment of heavy-metal levels in estuaries and the formation of a pollution index. Helgoländer Meeresunters. 33: 566–575."] },
      { type: "sign" }
    ];
    ECO.report.run({ title: "تقرير التحليل الإحصائي للبيانات البيئية", subtitle: "محلّل بيانات البيئة – EcoBio AI", file: "تحليل-بيانات", blocks }, "pdf");
  }

  /* ------------------------------------------------------------------
     التهيئة
  ------------------------------------------------------------------ */
  function setTab(t) {
    S.tab = t;
    U.$$("#an-tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
    U.$$(".an-panel").forEach(p => { p.hidden = p.id !== "an-p-" + t; });
    if (t === "chart" && S.res) renderChart();
  }

  function init() {
    const root = U.$("#view-analyzer"), drop = U.$("#an-drop"), fileIn = U.$("#an-file");
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("drag"); onFile(e.dataTransfer.files[0]); });
    fileIn.addEventListener("change", () => { onFile(fileIn.files[0]); fileIn.value = ""; });
    root.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.id === "an-pick") fileIn.click();
      else if (b.dataset.demo) demo(b.dataset.demo);
      else if (b.id === "an-template") template();
      else if (b.id === "an-paste-go") { const t = U.$("#an-paste").value; if (t.trim()) load(parseText(t), "بيانات ملصوقة", "ملصوق"); else U.toast("الصق الجدول في المربع أولاً"); }
      else if (b.dataset.tab) setTab(b.dataset.tab);
      else if (b.dataset.k) { S.kind = b.dataset.k; U.$$("#an-kind button").forEach(x => x.classList.toggle("on", x === b)); renderStd(); }
      else if (b.dataset.anSel) { S.anSel = +b.dataset.anSel; renderAnova(); }
      else if (b.id === "an-xlsx") exportXlsx();
      else if (b.id === "an-copy") copyTable();
      else if (b.id === "an-pdf") pdf();
      else if (b.id === "an-chart-png") { const c = U.$("#an-chart"); const p = S.res.P.find(x => x.ci === S.chartP); const url = p ? chartImage(p, 900, 420) : c.toDataURL(); const a = document.createElement("a"); a.href = url; a.download = `رسم-${p ? p.name.replace(/[\\/:*?"<>|]/g, "-") : "معيار"}.png`; a.click(); }
      else if (b.id === "an-reset") { S.rows = []; S.res = null; U.$("#an-work").hidden = true; U.$("#an-drop").scrollIntoView({ behavior: "smooth" }); }
    });
    root.addEventListener("change", e => {
      if (e.target.id === "an-ga") { S.gA = +e.target.value; analyze(); }
      else if (e.target.id === "an-gb") { S.gB = +e.target.value; analyze(); }
      else if (e.target.closest("#an-params")) { S.params = U.$$("#an-params input:checked").map(i => +i.value); analyze(); }
      else if (e.target.id === "an-chart-p") { S.chartP = +e.target.value; renderChart(); }
    });
    const tabs = U.$("#an-tabs");
    tabs.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const bs = U.$$("button", tabs), i = bs.findIndex(x => x.getAttribute("aria-selected") === "true");
      const n = (i + (e.key === "ArrowLeft" ? 1 : -1) + bs.length) % bs.length; bs[n].focus(); setTab(bs[n].dataset.tab);
    });
  }

  ECO.analyzer = { parseText, toNum, load, keyOf };
  ECO.views.analyzer = { init, show() { if (S.chart) S.chart.resize(); } };
})();
