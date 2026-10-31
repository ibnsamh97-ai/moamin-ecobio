/* =====================================================================
   EcoBio AI — الرئيسية (الإصدار الخامس) وسلوك الشريط العلوي
   - البطل: الكرة الأرضية الحية (globe.js) مع بحث سريع واختصارات للأدوات.
   - الرسوم المتحركة (illus.js) بدل الصور، تتوقف حين تخرج من الشاشة.
   - «تابع من حيث توقفت»: آخر الأدوات التي فتحها المستخدم على جهازه.
   - الشريط العلوي: شفاف فوق البطل، زجاجي بعده، يختفي عند النزول ويعود عند الصعود.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const reduced = mq("(prefers-reduced-motion: reduce)");
  const body = document.body;
  const onHome = () => body.dataset.view === "home";
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const secOf = t => (ECO.SECTIONS || []).find(s => s.tools.includes(t));

  /* الأرقام الحقيقية تحت البطل */
  function stats() {
    const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = String(v); };
    const T = ECO.TOOLS || {};
    set("st-tools", Object.keys(T).filter(t => !T[t].hidden && document.getElementById("view-" + t)).length);
    set("st-stations", (ECO.STATIONS || []).length);
    set("st-years", new Date().getFullYear() - 1984);
    set("st-exps", ECO.LAB && ECO.LAB.EXPS && ECO.LAB.EXPS.length);
  }

  /* الرسوم المتحركة في الرئيسية */
  function illustrate(root) {
    if (!ECO.illus) return;
    (root || document).querySelectorAll("[data-illus]:not([data-done])").forEach(el => {
      el.innerHTML = ECO.illus(el.dataset.illus); el.setAttribute("data-done", "");
    });
    if (ECO.illusWatch) ECO.illusWatch(document);
  }

  /* اختصارات الأدوات الأكثر استعمالاً في البطل */
  const QUICK = ["lab", "districts", "water", "analyzer", "plant", "research"];
  function quick() {
    const box = document.getElementById("hx-quick"), T = ECO.TOOLS || {}; if (!box) return;
    box.innerHTML = `<span class="qk-cap">الأكثر استعمالاً</span>` + QUICK.filter(t => T[t] && document.getElementById("view-" + t)).map(t => {
      const s = secOf(t);
      return `<a class="qk" href="#${t}" style="--hue:${s ? s.hue : "var(--river)"}">${ico(T[t].icon)}<span>${U.esc(T[t].label)}</span></a>`;
    }).join("");
  }

  /* تابع من حيث توقفت */
  function recent() {
    const sec = document.getElementById("recent"), box = document.getElementById("rc-list"), T = ECO.TOOLS || {};
    if (!sec || !box || !ECO.recent) return;
    const list = ECO.recent();
    sec.hidden = !list.length;
    box.innerHTML = list.map(t => {
      const s = secOf(t);
      return `<a class="rc" href="#${t}" style="--hue:${s ? s.hue : "var(--river)"}"><span class="tt-ic">${ico(T[t].icon)}</span><span class="rc-t"><b>${U.esc(T[t].label)}</b><small>${s ? U.esc(s.label) : ""}</small></span>${ico("i-chev")}</a>`;
    }).join("");
  }

  /* الشريط العلوي: شفاف فوق البطل، يختفي عند النزول ويعود عند الصعود */
  function header() {
    let lastY = window.scrollY, ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY, hero = onHome() ? document.getElementById("hx") : null;
      const limit = hero ? Math.max(40, Math.min(hero.offsetHeight - 120, 360)) : 8;
      body.classList.toggle("hdr-solid", y > limit);
      if (!reduced) {
        const down = y > lastY + 4, up = y < lastY - 4;
        if (y < 200 || up) body.classList.remove("hdr-hide");
        else if (down && !document.querySelector(".nav-group:hover, .nav-group:focus-within")) body.classList.add("hdr-hide");
      }
      lastY = y;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("hashchange", () => { body.classList.remove("hdr-hide"); requestAnimationFrame(update); });
    document.addEventListener("focusin", e => { if (e.target.closest && e.target.closest(".topbar")) body.classList.remove("hdr-hide"); });
    update();
  }

  function start() {
    stats(); quick(); recent(); header();
    illustrate();
    document.addEventListener("click", e => {
      if (e.target.closest("[data-clear-recent]")) { if (ECO.recentClear) ECO.recentClear(); recent(); }
    });
    window.addEventListener("hashchange", () => { if (onHome()) recent(); setTimeout(() => illustrate(), 30); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
