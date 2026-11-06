/* =====================================================================
   EcoBio AI — المرشد داخل الأدوات
   يأخذ المستخدم خطوة بخطوة داخل أي أداة من نص «دليل المنصة» نفسه:
   لمن الأداة وماذا تحتاج، ثم خطوات العمل، ثم كيف تقرأ النتيجة.
   كل خطوة تذكر زراً أو تبويباً بين «» يُبرَز على الشاشة ويمكن فتحه بضغطة.
   لا يولّد نصاً بالذكاء الاصطناعي: النص من الدليل الموثّق كما هو.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const KEY = "coach";
  let C = null, box = null, hl = null;

  const label = id => ((ECO.TOOLS || {})[id] || {}).label || id;
  /* [[tool]] و[[tool|نص]] و**عريض** في نص الدليل */
  const plain = s => String(s || "").replace(/\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g, (m, t, txt) => txt || label(t));
  const rich = s => esc(plain(s)).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/«([^»]+)»/g, "<b class=\"co-q\">«$1»</b>");

  function stepsFor(id, g) {
    const out = [];
    const need = (g.need || []).map(x => `<li>${rich(x)}</li>`).join("");
    out.push({ k: "intro", h: "لمن هذه الأداة؟", html: `<p>${rich(g.who || "")}</p>${g.when ? `<p class="co-when">${ico("i-info")}${rich(g.when)}</p>` : ""}${need ? `<p class="co-sub">ستحتاج:</p><ul>${need}</ul>` : ""}` });
    (g.steps || []).forEach((s, i) => out.push({ k: "step", h: `الخطوة ${i + 1}`, html: `<p>${rich(s)}</p>`, raw: plain(s) }));
    if ((g.read || []).length) out.push({ k: "read", h: "كيف تقرأ النتيجة", html: `<ul>${g.read.map(x => `<li>${rich(x)}</li>`).join("")}</ul>` });
    return out;
  }

  /* أبرز العنصر الذي تذكره الخطوة بين «» داخل صفحة الأداة */
  const norm = s => String(s || "").replace(/\s+/g, " ").replace(/[«»"]/g, "").trim();
  function findTarget(id, raw) {
    const view = document.getElementById("view-" + id); if (!view || !raw) return null;
    const qs = [...raw.matchAll(/«([^»]+)»/g)].map(m => norm(m[1])).filter(q => q.length > 1);
    const cands = [...view.querySelectorAll("button, a.btn, [role=tab], label.btn, summary, .panel-h h3, h3, h4, label")].filter(el => el.offsetParent !== null && !el.closest(".crumbs, .next-steps, .coach"));
    for (const q of qs) {
      const qq = q.replace(/^\d+\.\s*/, "");
      const hit = cands.find(el => { const t = norm(el.textContent); return t && (t === q || t.includes(q) || (qq.length > 3 && t.includes(qq))); });
      if (hit) return hit;
    }
    return null;
  }
  function clearHL() { if (hl) { hl.classList.remove("coach-hl"); hl = null; } }
  function highlight(el) {
    clearHL(); if (!el) return;
    hl = el; el.classList.add("coach-hl");
    try { el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }); } catch (e) { el.scrollIntoView(); }
  }

  function render() {
    if (!C) return;
    const st = C.steps[C.i], last = C.i === C.steps.length - 1;
    if (!box) {
      box = document.createElement("aside");
      box.className = "coach"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "المرشد");
      document.body.appendChild(box);
      box.addEventListener("click", onClick);
    }
    const target = st.k === "step" ? findTarget(C.id, st.raw) : null;
    box.innerHTML = `
      <header class="co-h"><span class="co-ic">${ico("i-spark")}</span><div><b>المرشد</b><small>${esc(label(C.id))}</small></div><button type="button" class="co-x" data-co="close" aria-label="إغلاق المرشد">${ico("i-close")}</button></header>
      <div class="co-dots" aria-hidden="true">${C.steps.map((_, i) => `<i class="${i < C.i ? "done" : i === C.i ? "on" : ""}"></i>`).join("")}</div>
      <div class="co-body" aria-live="polite"><h4>${esc(st.h)} <span>${C.i + 1} من ${C.steps.length}</span></h4>${st.html}</div>
      ${target && /^(BUTTON|A|SUMMARY)$/.test(target.tagName) || (target && target.getAttribute("role") === "tab") ? `<button type="button" class="btn btn-sm co-do" data-co="do">${ico("i-play")}افتحها لي</button>` : ""}
      <footer class="co-f">
        <button type="button" class="btn btn-sm btn-ghost" data-co="ask">${ico("i-chat")}ما فهمت، اسأل المساعد</button>
        <span class="co-nav"><button type="button" class="btn btn-sm" data-co="prev" ${C.i === 0 ? "disabled" : ""} aria-label="السابق">${ico("i-chev")}</button><button type="button" class="btn btn-sm btn-primary" data-co="${last ? "close" : "next"}">${last ? "تم، شكراً" : "التالي"}</button></span>
      </footer>`;
    box.querySelector('[data-co="prev"] svg').style.transform = "scaleX(-1)";
    highlight(target);
    C.target = target;
    try { sessionStorage.setItem("ecobio:" + KEY, JSON.stringify({ id: C.id, i: C.i })); } catch (e) { /* */ }
    if (!box.contains(document.activeElement)) { const nx = box.querySelector(".co-f .btn-primary"); if (nx) nx.focus({ preventScroll: true }); }
  }
  function onClick(e) {
    const b = e.target.closest("[data-co]"); if (!b || !C) return;
    const a = b.dataset.co;
    if (a === "next" && C.i < C.steps.length - 1) { C.i++; render(); }
    if (a === "prev" && C.i > 0) { C.i--; render(); }
    if (a === "close") stop();
    if (a === "do" && C.target) { C.target.click(); setTimeout(() => { if (C) render(); }, 350); }
    if (a === "ask") {
      const st = C.steps[C.i], txt = `أنا في أداة «${label(C.id)}»، ${st.h}: ${norm(st.raw || box.querySelector(".co-body").innerText).slice(0, 300)}\nما فهمت هذه الخطوة، اشرحها لي ببساطة مع مثال.`;
      stop(); if (ECO.prefillChat) ECO.prefillChat(txt); location.hash = "assistant";
    }
  }
  function stop() {
    clearHL(); if (box) { box.remove(); box = null; } C = null;
    try { sessionStorage.removeItem("ecobio:" + KEY); } catch (e) { /* */ }
  }
  async function start(id, i = 0) {
    if (!(ECO.TOOLS || {})[id]) return;
    if ((location.hash.slice(1).split(/[&?=]/)[0] || "home") !== id) location.hash = id;
    let g = null;
    try { const G = await ECO.guide.load(); g = (G.lessons || {})[id]; } catch (e) { U.toast(e.message || "تعذّر تحميل الدليل"); return; }
    if (!g) { U.toast("لا يوجد درس لهذه الأداة بعد"); return; }
    C = { id, i: 0, steps: stepsFor(id, g) };
    C.i = Math.max(0, Math.min(i, C.steps.length - 1));
    setTimeout(render, 380);
  }
  ECO.coach = { start, stop };

  document.addEventListener("click", e => { const b = e.target.closest("[data-coach]"); if (b) { e.preventDefault(); start(b.dataset.coach); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && C) stop(); });
  /* الانتقال إلى أداة أخرى ينهي الإرشاد */
  window.addEventListener("hashchange", () => { if (C && (location.hash.slice(1).split(/[&?=]/)[0] || "home") !== C.id) stop(); });
  /* استئناف بعد إعادة تحميل الصفحة */
  window.addEventListener("load", () => {
    try { const s = JSON.parse(sessionStorage.getItem("ecobio:" + KEY) || "null"); if (s && s.id && (location.hash.slice(1).split(/[&?=]/)[0]) === s.id) setTimeout(() => start(s.id, s.i), 600); } catch (e) { /* */ }
  });
})();
