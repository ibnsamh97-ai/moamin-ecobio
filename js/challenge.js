/* =====================================================================
   EcoBio AI — تحدّيات البيانات
   مسائل مختبرية بأرقام مولّدة من نموذج معروف مع خطأ قياس عشوائي، لكل
   طالب نسخة مختلفة (رمز النسخة يعيد الأرقام نفسها). الإجابة الصحيحة تُحسب
   من الأرقام المعروضة نفسها، ويظهر الحل خطوة بخطوة بعد المحاولة.
   البيانات تدريبية وليست قياسات حقيقية، ومكتوب ذلك على كل نسخة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  if (!document.getElementById("view-challenge")) return;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const ST = U.store.get("chal_v1", { solved: {}, cur: null, seed: null });
  const saveST = () => U.store.set("chal_v1", ST);

  /* ---------- مولّد أرقام قابل للإعادة ---------- */
  const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const uni = (r, a, b) => a + (b - a) * r();
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const rd = (v, d) => +(+v).toFixed(d);
  const ols = (x, y) => { const n = x.length, mx = U.mean(x), my = U.mean(y); let sxx = 0, sxy = 0, syy = 0; x.forEach((xi, i) => { sxx += (xi - mx) ** 2; sxy += (xi - mx) * (y[i] - my); syy += (y[i] - my) ** 2; }); const b = sxy / sxx, a = my - b * mx; return { a, b, r2: sxy * sxy / (sxx * syy), n }; };
  const F = (v, d = 3) => U.fmt(v, d);
  const newSeed = () => Math.floor(Math.random() * 9e5) + 1e5;

  /* ---------- التحديات ---------- */
  const CH = [
    { id: "cal", title: "منحنى المعايرة", level: "سهل", tool: "calc", icon: "i-chart",
      intro: "قستَ امتصاصية محاليل قياسية للفوسفات ثم عيّنة مجهولة خُففت قبل القياس. احسب معادلة المنحنى وتركيز العيّنة الأصلية.",
      gen(r) {
        const b1 = uni(r, 0.08, 0.13), b0 = uni(r, 0.002, 0.012), std = [0, 0.5, 1, 2, 4, 6];
        const A = std.map(c => rd(b0 + b1 * c + 0.004 * gauss(r), 3));
        const DF = pick(r, [1, 2, 5]), cd = uni(r, 1.2, 5.2), Au = rd(b0 + b1 * cd + 0.003 * gauss(r), 3);
        const f = ols(std, A), cu = (Au - f.a) / f.b * DF;
        return { head: ["التركيز القياسي (mg/L)", "الامتصاصية"], rows: std.map((c, i) => [c, A[i].toFixed(3)]),
          given: [["امتصاصية العيّنة المخففة", Au.toFixed(3)], ["معامل التخفيف", DF === 1 ? "1 (بلا تخفيف)" : `${DF} (1 حجم عيّنة إلى ${DF} حجم كلي)`]],
          ask: [{ k: "b", l: "ميل المنحنى", u: "لكل mg/L", ans: f.b, tol: 0.02 }, { k: "c", l: "تركيز العيّنة الأصلية", u: "mg/L", ans: cu, tol: 0.03 }],
          sol: [`انحدار خطي (المربعات الصغرى) للامتصاصية على التركيز: الميل = ${F(f.b, 4)}، والتقاطع = ${F(f.a, 4)}، وR² = ${F(f.r2, 4)}.`,
            `تركيز المحلول المقاس = (الامتصاصية − التقاطع) ÷ الميل = ⟦(${Au.toFixed(3)} − ${F(f.a, 4)}) ÷ ${F(f.b, 4)} = ${F((Au - f.a) / f.b, 3)} mg/L⟧.`,
            `التركيز الأصلي = ⟦${F((Au - f.a) / f.b, 3)} × ${DF} = ${F(cu, 3)} mg/L⟧.`] };
      } },
    { id: "rem", title: "نسبة الإزالة والسعة", level: "سهل", tool: "sorb", icon: "i-leaf",
      intro: "رجّيت كتلة من مادة مازّة مع محلول ملوث بثلاثة مكررات، وقستَ التركيز المتبقي. احسب متوسط نسبة الإزالة ومتوسط السعة.",
      gen(r) {
        const C0 = rd(uni(r, 10, 50), 1), V = pick(r, [50, 100]), m = rd(uni(r, 0.1, 0.5), 2), eff = uni(r, 0.45, 0.92);
        const Ce = [0, 1, 2].map(() => rd(C0 * (1 - eff) * (1 + 0.05 * gauss(r)), 2));
        const R = Ce.map(c => 100 * (C0 - c) / C0), q = Ce.map(c => (C0 - c) * V / 1000 / m);
        return { head: ["المكرر", "Ce (mg/L)"], rows: Ce.map((c, i) => [i + 1, c.toFixed(2)]),
          given: [["التركيز الابتدائي C₀", `${C0} mg/L`], ["حجم المحلول V", `${V} mL`], ["كتلة المادة المازّة m", `${m} g`]],
          ask: [{ k: "r", l: "متوسط نسبة الإزالة", u: "%", ans: U.mean(R), abs: 0.5 }, { k: "q", l: "متوسط السعة qe", u: "mg/g", ans: U.mean(q), tol: 0.02 }],
          sol: [`⟦R% = (C₀ − Ce) ÷ C₀ × 100⟧ لكل مكرر: ${R.map(v => F(v, 2)).join("، ")} ← المتوسط ${F(U.mean(R), 2)}%.`,
            `⟦qe = (C₀ − Ce) × V ÷ 1000 ÷ m⟧ لكل مكرر: ${q.map(v => F(v, 3)).join("، ")} ← المتوسط ${F(U.mean(q), 3)} mg/g.`,
            "انتبه: تحويل الحجم من mL إلى L هو أكثر خطأ شائع في هذه المسألة."] };
      } },
    { id: "lang", title: "متساوي حرارة لانكماير", level: "متوسط", tool: "sorb", icon: "i-trend",
      intro: "هذه نتائج اتزان الامتزاز عند تراكيز مختلفة. استعمل الصيغة الخطية للانكماير (Ce/qe مقابل Ce) لإيجاد السعة القصوى وثابت لانكماير.",
      gen(r) {
        const qm = uni(r, 10, 40), KL = uni(r, 0.05, 0.5), Ce = [1, 3, 8, 15, 30, 50, 80].map(c => rd(c * uni(r, 0.9, 1.1), 2));
        const qe = Ce.map(c => rd(qm * KL * c / (1 + KL * c) * (1 + 0.025 * gauss(r)), 2));
        const f = ols(Ce, Ce.map((c, i) => c / qe[i])), qmax = 1 / f.b, K = f.b / f.a;
        return { head: ["Ce (mg/L)", "qe (mg/g)"], rows: Ce.map((c, i) => [c.toFixed(2), qe[i].toFixed(2)]), given: [],
          ask: [{ k: "qm", l: "السعة القصوى qmax", u: "mg/g", ans: qmax, tol: 0.06 }, { k: "kl", l: "ثابت لانكماير KL", u: "L/mg", ans: K, tol: 0.1 }],
          sol: [`احسب Ce/qe لكل نقطة: ${Ce.map((c, i) => F(c / qe[i], 4)).join("، ")}.`,
            `انحدار Ce/qe على Ce: الميل = ${F(f.b, 5)} والتقاطع = ${F(f.a, 5)} (R² = ${F(f.r2, 4)}).`,
            `qmax = 1 ÷ الميل = ⟦${F(qmax, 3)} mg/g⟧، وKL = الميل ÷ التقاطع = ⟦${F(K, 4)} L/mg⟧.`,
            "الصيغة غير الخطية (كما في «مقيّم المواد المازّة») تعطي قيماً قريبة لكنها ليست متطابقة؛ اذكر في رسالتك أي صيغة استعملت."] };
      } },
    { id: "pso", title: "حركية الرتبة الثانية الكاذبة", level: "متوسط", tool: "sorb", icon: "i-trend",
      intro: "قستَ كمية الممتز مع الزمن. استعمل الصيغة الخطية (t/qt مقابل t) لإيجاد سعة الاتزان وثابت السرعة.",
      gen(r) {
        const qe0 = uni(r, 5, 25), k2 = uni(r, 0.004, 0.04), t = [5, 10, 20, 30, 60, 90, 120, 180];
        const qt = t.map(x => rd(qe0 * qe0 * k2 * x / (1 + qe0 * k2 * x) * (1 + 0.02 * gauss(r)), 2));
        const f = ols(t, t.map((x, i) => x / qt[i])), qe = 1 / f.b, k = f.b * f.b / f.a;
        return { head: ["الزمن t (min)", "qt (mg/g)"], rows: t.map((x, i) => [x, qt[i].toFixed(2)]), given: [],
          ask: [{ k: "qe", l: "سعة الاتزان qe", u: "mg/g", ans: qe, tol: 0.05 }, { k: "k2", l: "ثابت السرعة k₂", u: "g/(mg·min)", ans: k, tol: 0.12 }],
          sol: [`احسب t/qt لكل زمن: ${t.map((x, i) => F(x / qt[i], 3)).join("، ")}.`,
            `انحدار t/qt على t: الميل = ${F(f.b, 5)} والتقاطع = ${F(f.a, 4)} (R² = ${F(f.r2, 4)}).`,
            `qe = 1 ÷ الميل = ⟦${F(qe, 3)} mg/g⟧، وk₂ = الميل² ÷ التقاطع = ⟦${F(k, 5)} g/(mg·min)⟧.`] };
      } },
    { id: "bod", title: "المتطلب الحيوي للأكسجين BOD₅", level: "سهل", tool: "calc", icon: "i-drop",
      intro: "خففت عيّنة مياه صرف في قنينة BOD وقستَ الأكسجين المذاب قبل الحضن وبعد 5 أيام عند 20°م. احسب BOD₅ (بلا تصحيح للبذرة).",
      gen(r) {
        const Vs = pick(r, [5, 10, 15, 20]), Vb = 300, D1 = rd(uni(r, 7.6, 8.8), 2), dep = uni(r, 2.2, 5.5), D2 = rd(D1 - dep, 2), P = Vs / Vb, B = (D1 - D2) / P;
        return { head: ["القياس", "القيمة"], rows: [["الأكسجين المذاب الابتدائي D₁", `${D1} mg/L`], ["الأكسجين المذاب بعد 5 أيام D₂", `${D2} mg/L`]],
          given: [["حجم العيّنة في القنينة", `${Vs} mL`], ["حجم القنينة", `${Vb} mL`]],
          ask: [{ k: "bod", l: "BOD₅", u: "mg/L", ans: B, tol: 0.02 }],
          sol: [`P = حجم العيّنة ÷ حجم القنينة = ⟦${Vs} ÷ ${Vb} = ${F(P, 4)}⟧.`, `⟦BOD₅ = (D₁ − D₂) ÷ P = (${D1} − ${D2}) ÷ ${F(P, 4)} = ${F(B, 2)} mg/L⟧.`,
            "شرط الصلاحية (APHA 5210 B): أن يستهلك الأكسجين 2 mg/L على الأقل ويتبقى 1 mg/L على الأقل."] };
      } },
    { id: "anova", title: "تحليل التباين ANOVA", level: "متقدم", tool: "exp", icon: "i-table",
      intro: "ثلاث معاملات (أربعة مكررات لكل منها) لنسبة إزالة ملوث. احسب قيمة F وقرّر هل الفرق بين المعاملات معنوي عند مستوى 0.05.",
      gen(r) {
        const base = uni(r, 50, 70), eff = uni(r, 0, 9), sd = uni(r, 2.5, 5), G = ["معاملة أ", "معاملة ب", "معاملة ج"];
        const data = G.map((_, g) => [0, 1, 2, 3].map(() => rd(base + eff * (g - 1) + sd * gauss(r), 1)));
        const all = data.flat(), gm = U.mean(all), k = 3, n = 12;
        const ssb = data.reduce((s, g) => s + g.length * (U.mean(g) - gm) ** 2, 0), ssw = data.reduce((s, g) => s + g.reduce((t, v) => t + (v - U.mean(g)) ** 2, 0), 0);
        const Fv = (ssb / (k - 1)) / (ssw / (n - k)), p = ECO.stats.pF(Fv, k - 1, n - k);
        return { head: ["المكرر"].concat(G), rows: [0, 1, 2, 3].map(i => [i + 1].concat(data.map(g => g[i].toFixed(1)))), given: [],
          ask: [{ k: "f", l: "قيمة F", u: "", ans: Fv, tol: 0.03 }, { k: "sig", l: "هل الفرق معنوي عند 0.05؟", choice: ["نعم", "لا"], ans: p < 0.05 ? 0 : 1 }],
          sol: [`المتوسطات: ${data.map((g, i) => `${G[i]} ${F(U.mean(g), 2)}`).join("، ")}، والمتوسط العام ${F(gm, 3)}.`,
            `مجموع مربعات بين المعاملات = ${F(ssb, 3)} (درجات حرية 2)، وداخلها = ${F(ssw, 3)} (درجات حرية 9).`,
            `⟦F = (${F(ssb, 3)} ÷ 2) ÷ (${F(ssw, 3)} ÷ 9) = ${F(Fv, 3)}⟧، و⟦p = ${p < 0.001 ? "< 0.001" : F(p, 4)}⟧، والقيمة الحرجة ⟦F(2, 9) = 4.256⟧ عند مستوى 0.05.`,
            p < 0.05 ? "p أقل من 0.05: الفرق معنوي، فتُكمل باختبار دنكن لمعرفة أي المعاملات تختلف." : "p أكبر من 0.05: لا دليل على فرق معنوي بين المعاملات."] };
      } }
  ];
  const byId = id => CH.find(c => c.id === id);

  const math = s => esc(s).replace(/⟦(.+?)⟧/g, '<bdi dir="ltr" class="ch-m">$1</bdi>');

  /* ---------- التحقق ---------- */
  function judge(a, v) {
    if (a.choice) return v === String(a.ans);
    const x = ECO.tab.num(v); if (!U.isNum(x)) return null;
    return a.abs != null ? Math.abs(x - a.ans) <= a.abs : Math.abs(x - a.ans) <= Math.abs(a.ans) * a.tol;
  }

  /* ---------- العرض ---------- */
  let cur = null;
  function open(id, seed) {
    const c = byId(id); if (!c) return;
    seed = seed || newSeed(); ST.cur = id; ST.seed = seed; saveST();
    const P = c.gen(rng(seed + id.length * 7919));
    cur = { c, P, seed, shown: false };
    const box = U.$("#ch-play");
    box.innerHTML = `<div class="panel ch-card">
      <div class="panel-h"><h3>${ico(c.icon)}${esc(c.title)}</h3><span class="sub">نسخة <bdi dir="ltr">${seed}</bdi> · ${esc(c.level)}</span></div>
      <p class="ch-intro">${esc(c.intro)}</p>
      <div class="tbl-wrap"><table class="tbl ch-tbl"><thead><tr>${P.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${P.rows.map(r => `<tr>${r.map(v => `<td class="num">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      ${P.given.length ? `<dl class="kv ch-given">${P.given.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
      <div class="ch-ask">${P.ask.map(a => `<div class="field"><label for="ch-a-${a.k}">${esc(a.l)}${a.u ? ` <small class="muted">(${esc(a.u)})</small>` : ""}</label>${a.choice
        ? `<select id="ch-a-${a.k}" class="input"><option value="">اختر</option>${a.choice.map((o, i) => `<option value="${i}">${esc(o)}</option>`).join("")}</select>`
        : `<input id="ch-a-${a.k}" class="input num" inputmode="decimal" dir="ltr" autocomplete="off">`}<span class="ch-res" id="ch-r-${a.k}" aria-live="polite"></span></div>`).join("")}</div>
      <div class="row ch-acts"><button type="button" class="btn btn-primary" id="ch-check">${ico("i-check")}تحقّق من إجابتي</button>
        <button type="button" class="btn btn-ghost" id="ch-sol">${ico("i-book")}اعرض الحل</button>
        <button type="button" class="btn btn-ghost" id="ch-new">${ico("i-refresh")}نسخة بأرقام جديدة</button>
        <a class="btn btn-ghost" href="#${c.tool}">${ico("i-ext")}افتح الأداة المناسبة</a></div>
      <div id="ch-solbox"></div>
      <p class="faint ch-note">أرقام تدريبية مولّدة من نموذج معروف مع خطأ قياس عشوائي، وليست قياسات حقيقية. الإجابة الصحيحة محسوبة من الأرقام المعروضة نفسها، وتُقبل ضمن هامش تقريب صغير.</p>
    </div>`;
    U.$("#ch-check").onclick = check;
    U.$("#ch-sol").onclick = showSol;
    U.$("#ch-new").onclick = () => open(id);
    U.$$("#ch-list [data-ch]").forEach(b => b.classList.toggle("on", b.dataset.ch === id));
    box.querySelectorAll(".ch-ask input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") check(); }));
  }
  function check() {
    if (!cur) return;
    let all = true, any = false;
    cur.P.ask.forEach(a => {
      const v = U.$("#ch-a-" + a.k).value.trim(), out = U.$("#ch-r-" + a.k);
      if (!v) { out.textContent = ""; out.className = "ch-res"; all = false; return; }
      any = true; const ok = judge(a, v);
      out.className = "ch-res " + (ok ? "ok" : "bad");
      out.textContent = ok == null ? "اكتب رقماً" : ok ? "صحيح" : "غير صحيح، راجع حسابك";
      if (!ok) all = false;
    });
    if (!any) { U.toast("اكتب إجابتك أولاً"); return; }
    if (all && !cur.shown) { ST.solved[cur.c.id] = (ST.solved[cur.c.id] || 0) + 1; saveST(); renderList(); U.toast("أحسنت، كل الإجابات صحيحة"); showSol(); }
  }
  function showSol() {
    if (!cur) return;
    cur.shown = true;
    const fmtA = a => a.choice ? a.choice[a.ans] : `${F(a.ans, Math.abs(a.ans) < 0.1 ? 5 : 3)}${a.u ? " " + a.u : ""}`;
    U.$("#ch-solbox").innerHTML = `<div class="ch-sol"><h4>${ico("i-book")}الحل</h4><ol>${cur.P.sol.map(s => `<li>${math(s)}</li>`).join("")}</ol>
      <p><b>الإجابات:</b> ${cur.P.ask.map(a => `${esc(a.l)} = <bdi dir="ltr">${esc(fmtA(a))}</bdi>`).join("، ")}</p></div>`;
  }
  function renderList() {
    U.$("#ch-list").innerHTML = CH.map(c => `<button type="button" class="ch-pick${ST.cur === c.id ? " on" : ""}" data-ch="${c.id}">${ico(c.icon)}<span><b>${esc(c.title)}</b><small>${esc(c.level)}${ST.solved[c.id] ? ` · حلّيته ${ST.solved[c.id]} ${ST.solved[c.id] === 1 ? "مرة" : "مرات"}` : ""}</small></span></button>`).join("");
  }

  /* ---------- نسخ للطلاب مع مفتاح الإجابة ---------- */
  function printSet() {
    const id = U.$("#ch-t-c").value, n = Math.max(1, Math.min(40, +U.$("#ch-t-n").value || 1)), c = byId(id);
    if (!c || !ECO.report) return;
    const blocks = [], key = [];
    for (let i = 0; i < n; i++) {
      const seed = newSeed(), P = c.gen(rng(seed + id.length * 7919));
      blocks.push({ type: "h", text: `النسخة ${seed} — اسم الطالب: ....................` });
      blocks.push({ type: "text", html: esc(c.intro) });
      blocks.push({ type: "table", head: P.head, rows: P.rows.map(r => r.map(String)) });
      if (P.given.length) blocks.push({ type: "kv", items: P.given });
      blocks.push({ type: "text", html: "<b>المطلوب:</b> " + P.ask.map(a => `${esc(a.l)}${a.u ? ` (${esc(a.u)})` : ""}${a.choice ? ` [${a.choice.join(" / ")}]` : ""}`).join("، ") });
      key.push([String(seed)].concat(P.ask.map(a => a.choice ? a.choice[a.ans] : F(a.ans, Math.abs(a.ans) < 0.1 ? 5 : 3))));
    }
    const ask0 = c.gen(rng(1)).ask;
    blocks.push({ type: "h", text: "مفتاح الإجابة (للأستاذ)" });
    blocks.push({ type: "table", head: ["النسخة"].concat(ask0.map(a => a.l + (a.u ? ` (${a.u})` : ""))), rows: key });
    blocks.push({ type: "text", html: "أرقام تدريبية مولّدة من نموذج معروف مع خطأ قياس عشوائي. تُقبل الإجابة ضمن هامش تقريب صغير. يمكن لكل طالب فتح نسخته في المنصة برمز النسخة من صفحة «تحدّيات البيانات» لرؤية الحل خطوة بخطوة." });
    ECO.report.run({ title: `تحدّي: ${c.title}`, subtitle: `${n} ${n === 1 ? "نسخة" : "نسخ"} مختلفة مع مفتاح الإجابة`, file: `تحدي-${id}`, blocks }, "pdf");
  }

  function init() {
    renderList();
    U.$("#ch-list").onclick = e => { const b = e.target.closest("[data-ch]"); if (b) open(b.dataset.ch); };
    U.$("#ch-t-c").innerHTML = CH.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join("");
    U.$("#ch-t-go").onclick = printSet;
    U.$("#ch-code-go").onclick = () => { const v = +U.$("#ch-code").value.replace(/\D/g, ""), id = U.$("#ch-code-c").value; if (!v) { U.toast("اكتب رمز النسخة"); return; } open(id, v); U.$("#ch-play").scrollIntoView({ behavior: "smooth", block: "start" }); };
    U.$("#ch-code-c").innerHTML = CH.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join("");
    if (ST.cur && byId(ST.cur)) open(ST.cur, ST.seed); else open(CH[0].id);
  }
  let inited = false;
  ECO.views.challenge = { init() { if (!inited) { inited = true; init(); } }, show() {} };
  ECO.challenge = { CH, rng, judge };
})();
