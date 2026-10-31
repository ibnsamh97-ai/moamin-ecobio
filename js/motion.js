/* =====================================================================
   الحركة في المنصة
   - Lenis للتمرير الناعم، مربوط بمؤقّت GSAP (gsap.ticker) حتى يمشيا معاً،
     ويُحدّث ScrollTrigger مع كل إطار تمرير. على اللمس يبقى تمرير الجهاز الأصلي.
   - كل قسم يظهر بحركة ناعمة عند وصوله بالتمرير (ScrollTrigger.batch).
   - الأرقام البارزة تعدّ من الصفر إلى قيمتها ثم تعود نصّها الأصلي حرفياً.
   - افتتاحية الرئيسية: العنوان بـ BlurText، أشعة LightRays بلون المنصة،
     ونجمة StarBorder تدور على الزر الأساسي (ملف reactbits.js).
   مع «تقليل الحركة» في الجهاز: لا تمرير ناعم ولا ظهور متحرك ولا عدّ،
   والأشعة تبقى صورة ثابتة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = (window.ECO = window.ECO || {});
  const RB = ECO.rb || {};
  const html = document.documentElement;
  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const reduced = mq("(prefers-reduced-motion: reduce)");
  const finePointer = mq("(hover: hover) and (pointer: fine)");
  const G = window.gsap, ST = window.ScrollTrigger;
  const hasGsap = !!(G && ST);
  // التحميل كان بطيئاً جداً: صمّام CSS أظهر الافتتاحية، فلا نخفيها لنعيدها
  const late = !window.performance || performance.now() > 2300;

  /* عناصر تظهر بالتمرير، وما يُستثنى منها (طبقات ثابتة ومشاهد ثلاثية الأبعاد) */
  const REVEAL = [".sec-head", ".paths-more", ".feature-study", ".kpi", ".stg", ".fx", ".duo-card", ".closing-in", ".row-head", ".rc",
    ".view-head", ".tool-card", ".ns-card", ".hub-next", ".sibs",
    ".panel", ".an-panel", ".calc-card", ".study-card", ".rep-card"].join(",");
  const SKIP = ".hero, .hx, #view-twin, .tw-stage, .tour-stage, .modal, .drawer, .palette, .sheet-wrap, #report-stage, [data-mo-skip]";
  const COUNT = ".hl-main > b, .hl-stat > b, .stat .v, .metric .v, .db-kpi .v, .db-gnow b, .kpi > b";
  const COUNT_SKIP = "#view-twin, .tw-stage, .tour-stage, #report-stage, .leaflet-container, .chart-box, [data-mo-skip]";
  const PREVENT = ".drawer, .palette, .modal, .sheet-wrap, .tour-stage, .tw-stage, [data-lenis-prevent]";

  const activeView = () => document.querySelector(".view.active");
  const headerOffset = () => { const t = document.querySelector(".topbar"); return t ? t.getBoundingClientRect().height : 0; };

  /* ------------------------------------------------------------------
     Lenis + GSAP ticker
  ------------------------------------------------------------------ */
  let lenis = null;
  if (hasGsap) {
    G.registerPlugin(ST);
    G.config({ nullTargetWarn: false });
    ST.config({ ignoreMobileResize: true });
  }
  if (hasGsap && !reduced && finePointer && window.Lenis) {
    try {
      lenis = new window.Lenis({
        autoRaf: false,            // الإطارات يقودها مؤقّت GSAP لا حلقة Lenis الخاصة
        lerp: 0.1,
        smoothWheel: true,
        anchors: false,            // روابط # في المنصة صفحات (موجّه)، لا مراسٍ داخل الصفحة
        allowNestedScroll: true,   // الجداول والقوائم القابلة للتمرير تتمرّر هي أولاً
        prevent: n => n.matches(PREVENT),
        // عجلة الفأرة داخل مشهد ثلاثي الأبعاد تُستعمل للتكبير، فلا نمرّر الصفحة معها
        virtualScroll: d => !(d.event && d.event.defaultPrevented)
      });
      lenis.on("scroll", ST.update);
      G.ticker.add(time => lenis.raf(time * 1000));
      G.ticker.lagSmoothing(0);
    } catch (e) { console.error(e); lenis = null; }
  }

  // قفزة فورية فعلاً: الصفحة تضع scroll-behavior: smooth، فنعطّله لحظة القفز
  const jump = y => {
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto"; window.scrollTo(0, y); html.style.scrollBehavior = prev;
  };
  // إعادة الحساب «الآمنة» تنتظر توقف التمرير، فلا تقطع تمريراً ناعماً جارياً
  const refresh = () => { if (hasGsap) ST.refresh(true); };

  ECO.motion = {
    lenis,
    // الانتقال لصفحة جديدة: إلى الأعلى فوراً، مع إيقاف أي تمرير ناعم جارٍ
    top() {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else if (window.scrollY > 0) jump(0);
    },
    // تمرير إلى قسم مع ترك مسافة الشريط العلوي الثابت
    scrollTo(el) {
      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerOffset());
      if (lenis) lenis.scrollTo(y, { duration: 1.1, easing: t => 1 - Math.pow(1 - t, 3) });
      else if (reduced) jump(y);
      else window.scrollTo({ top: y, behavior: "smooth" });
    },
    refresh
  };

  /* ------------------------------------------------------------------
     ظهور الأقسام مع التمرير
  ------------------------------------------------------------------ */
  const pend = new Set();       // عناصر مخفية تنتظر وصول التمرير إليها
  const done = new WeakSet();   // عناصر ظهرت مرة فلا تُخفى ثانية
  let triggers = [];
  const shown = el => el.getClientRects().length > 0;
  const below = el => el.getBoundingClientRect().top >= window.innerHeight * 0.92;
  const pendingAncestor = el => { for (let p = el; p; p = p.parentElement) if (pend.has(p)) return p; return null; };

  function candidates(list) {
    return list.filter(el => !done.has(el) && !pend.has(el) && el.isConnected && !el.closest(SKIP) &&
      !(el.parentElement && el.parentElement.closest(REVEAL)) && shown(el));
  }
  function arm(els) {
    // ما يظهر على الشاشة الآن يبقى كما هو؛ نخفي فقط ما تحت حافة الشاشة
    els = els.filter(below);
    if (!els.length) return;
    els.forEach(el => { pend.add(el); el.classList.add("mo-pend"); });
    G.set(els, { opacity: 0, translate: "0px 16px" });
    triggers = triggers.concat(ST.batch(els, { start: "clamp(top 92%)", once: true, onEnter: show }));
  }
  function show(batch) {
    batch = batch.filter(el => pend.has(el));
    if (!batch.length) return;
    batch.forEach(el => { pend.delete(el); done.add(el); el.classList.remove("mo-pend"); });
    G.to(batch, {
      opacity: 1, translate: "0px 0px", duration: 0.6, ease: "power2.out", stagger: 0.08, overwrite: true,
      onComplete: () => G.set(batch, { clearProps: "opacity,translate" })
    });
    batch.forEach(el => releaseCounts(el, 0.15));
  }
  // إلغاء كل الانتظار (عند مغادرة الصفحة): يعود كل شيء ظاهراً كما كان
  function disarm() {
    triggers.forEach(t => t.kill()); triggers = [];
    if (!pend.size) return;
    const els = Array.from(pend); pend.clear();
    els.forEach(el => el.classList.remove("mo-pend"));
    G.killTweensOf(els); G.set(els, { clearProps: "opacity,translate" });
  }
  // صمّام: أي عنصر وصلت إليه الشاشة ولم يظهر لسبب ما يظهر فوراً
  function sweep() {
    if (!pend.size) return;
    const lim = window.innerHeight * 0.92, missed = [];
    pend.forEach(el => { if (!el.isConnected || el.getBoundingClientRect().top < lim) missed.push(el); });
    if (missed.length) show(missed);
  }

  /* ------------------------------------------------------------------
     عدّاد الأرقام (CountUp)
  ------------------------------------------------------------------ */
  const seen = new WeakSet();   // عناصر فُحصت
  const counted = new Set();    // مواضع عُدّت في هذه الزيارة للصفحة (فلا يُعاد العدّ مع كل تحديث للبيانات)
  const waiting = new Set();    // أرقام تنتظر ظهور قسمها
  let heroWait = false;         // أرقام بطاقة الهواء تنتظر افتتاحية الرئيسية
  const keyOf = el => {
    const host = el.parentElement && el.parentElement.closest("[id]");
    const list = host ? host.querySelectorAll(COUNT) : [];
    return (host ? host.id : "") + ":" + Array.prototype.indexOf.call(list, el);
  };
  const inScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight && r.width > 0; };
  const blocked = el => !!pendingAncestor(el) || (heroWait && !!el.closest(".hero-data"));
  const count = (el, delay = 0) => RB.countUp && RB.countUp(el, { duration: 1.6, delay });
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    if (!e.target.isConnected) return;
    if (blocked(e.target)) waiting.add(e.target); else count(e.target);
  }), { rootMargin: "0px 0px -6% 0px" }) : null;

  function queueCount(el) {
    if (seen.has(el)) return; seen.add(el);
    if (!RB.countable || !RB.countable(el)) return;
    const k = keyOf(el); if (counted.has(k)) return; counted.add(k);
    if (blocked(el)) waiting.add(el);
    else if (inScreen(el)) count(el);          // ظاهر الآن: يبدأ قبل أول رسم فلا يومض الرقم النهائي
    else if (io) io.observe(el);
  }
  function releaseCounts(scope, delay = 0) {
    waiting.forEach(el => {
      if (!el.isConnected) { waiting.delete(el); return; }
      if (!scope.contains(el) || blocked(el)) return;
      waiting.delete(el);
      if (inScreen(el)) count(el, delay); else if (io) io.observe(el);
    });
  }
  const scanCounts = scope => {
    if (!scope || scope.closest(COUNT_SKIP)) return;
    (scope.matches(COUNT) ? [scope] : []).concat(Array.from(scope.querySelectorAll(COUNT)))
      .filter(el => !el.closest(COUNT_SKIP)).forEach(queueCount);
  };

  /* ------------------------------------------------------------------
     افتتاحية الرئيسية
  ------------------------------------------------------------------ */
  let intro = null, introPlayed = false;
  function prepIntro() {
    const hero = document.querySelector("#view-home .hx"); if (!hero) return;
    const copy = hero.querySelector(".hx-copy"), h1 = copy && copy.querySelector("h1");
    const bits = copy ? Array.from(copy.children).filter(x => x !== h1) : [];
    const foot = hero.querySelector(".hx-data");
    intro = { hero, h1, bits, foot, bt: null };
    if (!hasGsap || reduced || late) return;
    intro.bt = h1 && RB.blurText ? RB.blurText(h1, { delay: 90, blur: 12, distance: 22, direction: "bottom", stepDuration: 0.42 }) : null;
    if (intro.bt) intro.bt.hide();
    G.set(bits, { opacity: 0, translate: "0px 22px" });
    if (foot) G.set(foot, { opacity: 0 });
  }

  function playIntro() {
    if (introPlayed || !intro) return;
    const view = document.getElementById("view-home");
    if (!view || !view.classList.contains("active")) return;   // تُعرض أول مرة تُفتح فيها الرئيسية
    introPlayed = true;
    if (!hasGsap || reduced || late) return;
    const { bits, foot, bt } = intro;
    const [eyebrow, ...rest] = bits;
    const tl = G.timeline({ defaults: { duration: 0.9, ease: "expo.out" } });
    const up = { opacity: 1, translate: "0px 0px" };
    if (eyebrow) tl.to(eyebrow, up, 0.1);
    if (bt) tl.add(bt.play(), 0.25);
    rest.forEach((el, i) => tl.to(el, up, 0.85 + i * 0.16));
    if (foot) tl.to(foot, { opacity: 1, duration: 1.2, ease: "power2.out" }, 1.3);
    tl.eventCallback("onComplete", () => G.set(bits.concat(foot || []), { clearProps: "opacity,translate" }));
  }
  // شاشة الترحيب (أول زيارة في الجلسة) تغطي الرئيسية 3 ثوانٍ: الافتتاحية تبدأ مع تلاشيها
  let splashGate = null;
  function whenSplashGone(fn) {
    if (splashGate) { splashGate.push(fn); return; }
    const sp = document.getElementById("splash");
    if (!sp || sp.classList.contains("done")) { fn(); return; }
    splashGate = [fn];
    let fired = false;
    const go = () => {
      if (fired) return; fired = true; ob.disconnect(); clearTimeout(t);
      setTimeout(() => { const q = splashGate; splashGate = null; q.forEach(f => f()); }, 120);
    };
    const ob = new MutationObserver(() => { if (sp.classList.contains("done") || !sp.isConnected) go(); });
    ob.observe(sp, { attributes: true, attributeFilter: ["class"] });
    const t = setTimeout(go, 4500);
  }

  /* ------------------------------------------------------------------
     تهيئة كل صفحة عند فتحها، ومتابعة ما يُرسم لاحقاً
  ------------------------------------------------------------------ */
  let currentView = null;
  function onView() {
    const v = activeView(); if (!v) return;
    if (v.id !== currentView) {
      currentView = v.id;
      counted.clear(); waiting.clear();
      if (hasGsap) disarm();
    }
    if (v.id === "view-home" && !introPlayed) whenSplashGone(playIntro);
    if (!hasGsap || reduced) return;
    arm(candidates(Array.from(v.querySelectorAll(REVEAL))));
    scanCounts(v);
    refresh();
  }

  // صفوف الجداول الكبيرة والرسوم لا تحوي أقساماً ولا أرقاماً بارزة: نتجاوزها بسرعة
  const INERT = new Set(["TR", "TD", "TH", "TBODY", "THEAD", "TFOOT", "OPTION", "IMG", "CANVAS", "BR", "SCRIPT", "STYLE"]);
  const XHTML = "http://www.w3.org/1999/xhtml";
  const queued = new Set(); let raf = 0;
  function flush() {
    raf = 0;
    const v = activeView(); if (!v) { queued.clear(); return; }
    const roots = Array.from(queued).filter(n => n.isConnected && v.contains(n)); queued.clear();
    const fresh = [];
    roots.forEach(n => {
      if (n.closest(COUNT_SKIP)) return;
      if (!n.closest(SKIP)) {
        if (n.matches(REVEAL)) fresh.push(n);
        n.querySelectorAll(REVEAL).forEach(x => fresh.push(x));
      }
      scanCounts(n);
    });
    if (fresh.length) arm(candidates(fresh));
  }

  function start() {
    onView();
    // بعد الموجّه: الانتقال لصفحة أخرى يعيد تهيئة الظهور والعدّ لها
    window.addEventListener("hashchange", () => requestAnimationFrame(onView));
    if (!hasGsap || reduced) return;
    const main = document.querySelector("main") || document.body;
    new MutationObserver(ms => {
      ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.namespaceURI === XHTML && !INERT.has(n.tagName)) queued.add(n); }));
      if (queued.size && !raf) raf = requestAnimationFrame(flush);
    }).observe(main, { childList: true, subtree: true });
    // تغيّر طول الصفحة (بيانات وصلت، لوحة فُتحت) يعيد حساب مواضع الظهور
    if ("ResizeObserver" in window) {
      let rt = 0;
      new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(refresh, 180); }).observe(document.body);
    }
    ST.addEventListener("refresh", sweep);
    // من يصل بلوحة المفاتيح إلى عنصر داخل قسم لم يظهر بعد: يظهر فوراً
    document.addEventListener("focusin", e => { const p = pendingAncestor(e.target); if (p) show([p]); });
  }

  // نجهّز الافتتاحية الآن (قبل أول رسم) حتى لا يظهر العنوان ثم يختفي؛
  // من هنا تمسك GSAP الحالة الأولى بدل قاعدة CSS المؤقتة
  try { prepIntro(); } catch (e) { console.error(e); }
  html.classList.add("mo-run");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
