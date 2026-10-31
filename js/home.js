/* =====================================================================
   EcoBio AI — الرئيسية الجديدة «نهر من الضوء» وسلوك الشريط العلوي
   - فيلم الخلفية: يُحمَّل بعد أول رسم، ويظهر بتلاشٍ هادئ. إلى أن يصل (أو إن تعذّر،
     أو عند توفير البيانات، أو «تقليل الحركة») يُرسم نهر الضوء نفسه على لوحة رسم خفيفة.
   - الشريط العلوي: شفاف فوق البطل، زجاجي بعده، يختفي عند النزول ويعود عند الصعود.
   - البيان: كلماته تضيء مع التمرير. المراحل: بطاقات تتراكم وتنكمش السابقة قليلاً.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const reduced = mq("(prefers-reduced-motion: reduce)");
  const html = document.documentElement, body = document.body;
  const onHome = () => body.dataset.view === "home";

  /* ------------------------------------------------------------------
     الأرقام الحقيقية في البيان
  ------------------------------------------------------------------ */
  function stats() {
    const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = String(v); };
    const T = ECO.TOOLS || {};
    set("st-tools", Object.keys(T).filter(t => !T[t].hidden && document.getElementById("view-" + t)).length);
    set("st-years", new Date().getFullYear() - 1984);
    set("st-papers", (ECO.RESEARCH || []).length);
  }

  /* ------------------------------------------------------------------
     نهر الضوء المرسوم (بديل الفيلم ومقدّمته)
  ------------------------------------------------------------------ */
  function ribbon(canvas) {
    const ctx = canvas.getContext("2d"); if (!ctx) return { start() {}, stop() {} };
    let W = 0, H = 0, raf = 0, last = 0, t = Math.random() * 40, running = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // هالة الضوء: نرسم النهر على لوحة صغيرة ثم نكبّرها فوق الأصل فتتوهج حوافه بلا تكلفة الضباب
    const glow = document.createElement("canvas"), gx = glow.getContext("2d"), GS = 8;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      glow.width = Math.max(1, Math.round(W / GS)); glow.height = Math.max(1, Math.round(H / GS));
    };
    // مسار النهر: يدخل من أسفل الوسط، ينعطف، ويصعد إلى أعلى اليسار (يترك يمين الشاشة للنص)
    const P = [[0.52, 1.12], [0.40, 0.64], [0.18, 0.72], [0.07, -0.08]];
    const bez = (u, i) => { const a = 1 - u; return a * a * a * P[0][i] + 3 * a * a * u * P[1][i] + 3 * a * u * u * P[2][i] + u * u * u * P[3][i]; };
    const dbez = (u, i) => { const a = 1 - u; return 3 * a * a * (P[1][i] - P[0][i]) + 6 * a * u * (P[2][i] - P[1][i]) + 3 * u * u * (P[3][i] - P[2][i]); };
    const N = 30, S = 90;
    const pts = Array.from({ length: S + 1 }, (_, j) => j / S);
    const sparks = Array.from({ length: 70 }, () => ({ u: Math.random(), o: Math.random() - 0.5, s: 0.02 + Math.random() * 0.05, r: 0.6 + Math.random() * 1.6 }));
    function draw() {
      const m = Math.min(W, H), wide = W / H < 1 ? 0.2 : 0.11;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#050a0c"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const frame = pts.map(u => {
        const x = bez(u, 0) * W, y = bez(u, 1) * H, dx = dbez(u, 0) * W, dy = dbez(u, 1) * H, L = Math.hypot(dx, dy) || 1;
        const env = Math.sin(Math.PI * Math.min(1, u * 1.08)) ** 0.7;
        const twist = Math.cos(Math.PI * 2 * (u * 1.25 - t * 0.035));
        return { x, y, nx: -dy / L, ny: dx / L, w: m * wide * env * (0.35 + 0.65 * Math.abs(twist)), tw: twist };
      });
      if (gx) {
        gx.globalCompositeOperation = "source-over"; gx.clearRect(0, 0, glow.width, glow.height);
        gx.globalCompositeOperation = "lighter"; gx.lineCap = "round"; gx.lineJoin = "round";
        for (let k = -3; k <= 3; k++) {
          gx.beginPath();
          frame.forEach((p, j) => { const off = k / 7 * p.w, x = (p.x + p.nx * off) / GS, y = (p.y + p.ny * off) / GS; j ? gx.lineTo(x, y) : gx.moveTo(x, y); });
          gx.strokeStyle = `rgba(30,150,255,${0.16 - Math.abs(k) * 0.03})`; gx.lineWidth = Math.max(1, m * wide / GS * 0.5); gx.stroke();
        }
        ctx.globalAlpha = 0.85; ctx.drawImage(glow, 0, 0, W, H); ctx.globalAlpha = 1;
      }
      for (let k = 0; k <= N; k++) {
        const f = k / N - 0.5, core = 1 - Math.abs(f) * 2;
        for (const pass of [0, 1]) {
          ctx.beginPath();
          frame.forEach((p, j) => {
            const off = f * p.w + Math.sin(j * 0.09 + t * 0.6 + k * 0.2) * m * 0.004;
            const x = p.x + p.nx * off, y = p.y + p.ny * off;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          });
          const a = pass ? 0.05 + 0.32 * core ** 2.2 : 0.018 + 0.03 * core;
          ctx.strokeStyle = pass ? `rgba(${Math.round(70 + 120 * core)},${Math.round(190 + 50 * core)},255,${a})` : `rgba(20,90,170,${a})`;
          ctx.lineWidth = (pass ? 1 : 7) * dpr;
          ctx.stroke();
        }
      }
      // شرر يجري مع التيار
      sparks.forEach(s => {
        const u = (s.u + t * s.s * 0.12) % 1, j = Math.floor(u * S), p = frame[j];
        if (!p) return;
        const x = p.x + p.nx * s.o * p.w, y = p.y + p.ny * s.o * p.w, a = 0.25 + 0.55 * Math.sin(Math.PI * u);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6 * s.r * dpr);
        g.addColorStop(0, `rgba(190,245,255,${a})`); g.addColorStop(1, "rgba(0,160,255,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 8 * s.r * dpr, y - 8 * s.r * dpr, 16 * s.r * dpr, 16 * s.r * dpr);
      });
    }
    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;          // نحو 30 إطاراً في الثانية تكفي لحركة هادئة
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
      t += dt;
      draw();
    }
    const api = {
      start() { if (running || reduced) return; running = true; last = 0; raf = requestAnimationFrame(loop); },
      stop() { running = false; cancelAnimationFrame(raf); },
      still() { resize(); draw(); }
    };
    resize(); draw();
    if ("ResizeObserver" in window) new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(canvas);
    return api;
  }

  /* ------------------------------------------------------------------
     الفيلم
  ------------------------------------------------------------------ */
  function film() {
    const hero = document.getElementById("cine"); if (!hero) return;
    const video = document.getElementById("cine-video"), cv = document.getElementById("cine-ribbon");
    const rb = ribbon(cv);
    const conn = navigator.connection || {};
    const lite = !!conn.saveData || /(^|-)[23]g$/.test(conn.effectiveType || "");
    let visible = true, ready = false, failed = false;
    const sync = () => {
      const on = visible && onHome() && !document.hidden;
      if (ready && !failed) { if (on) video.play().catch(() => {}); else video.pause(); rb.stop(); }
      else if (on) rb.start(); else rb.stop();
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.02 }).observe(hero);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("hashchange", () => setTimeout(sync, 30));
    sync();
    if (reduced || lite || !video) { hero.classList.add("is-still"); return; }
    const load = () => {
      video.muted = true; video.playsInline = true;
      video.src = video.dataset.src; video.preload = "auto";
      const fail = () => { if (ready) return; failed = true; hero.classList.add("is-still"); video.removeAttribute("src"); video.load(); sync(); };
      const timer = setTimeout(fail, 12000);
      video.addEventListener("error", () => { clearTimeout(timer); fail(); }, { once: true });
      video.addEventListener("playing", () => {
        if (failed) return;
        clearTimeout(timer); ready = true;
        video.classList.add("is-ready"); hero.classList.add("has-film");
        setTimeout(sync, 1700);              // بعد اكتمال التلاشي نوقف الرسم ونترك الفيلم وحده
      }, { once: true });
      if (onHome()) video.play().catch(() => {});
    };
    // بعد أول رسم ومع خمول الصفحة، حتى لا ينافس الفيلم تحميل المنصة
    const idle = window.requestIdleCallback || (f => setTimeout(f, 600));
    setTimeout(() => idle(load, { timeout: 1500 }), 300);
  }

  /* ------------------------------------------------------------------
     شريط الهواء الصغير في أسفل البطل
  ------------------------------------------------------------------ */
  function liveTicker() {
    const a = document.getElementById("cine-live"); if (!a) return;
    const span = a.querySelector("span");
    const render = cur => {
      const c = (cur && cur[ECO.DEFAULT_STATION]) || {}, v = c[ECO.AQI_HEAD];
      if (c.time && U.isNum(v)) {
        const tone = U.toneFor(ECO.AQI_HEAD, v);
        a.style.setProperty("--dot", (ECO.TONES && ECO.TONES[tone]) || "var(--river)");
        span.innerHTML = `هواء تكريت الآن <b class="num" dir="ltr">${U.aqiText(v)}</b> <em>${U.esc(U.aqiBand(v).label)}</em>`;
        a.classList.remove("is-off");
      } else if (ECO.state && ECO.state.mode === "offline") {
        span.textContent = "القراءات الحية غير متاحة الآن"; a.classList.add("is-off");
      }
    };
    ECO.bus.on("current", render);
    ECO.bus.on("mode", () => render(ECO._lastCurrent));
    if (ECO._lastCurrent) render(ECO._lastCurrent);
  }

  /* ------------------------------------------------------------------
     الشريط العلوي: شفاف فوق البطل، يختفي عند النزول ويعود عند الصعود
  ------------------------------------------------------------------ */
  function header() {
    let lastY = window.scrollY, ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY, hero = onHome() ? document.getElementById("cine") : null;
      const limit = hero ? Math.max(40, hero.offsetHeight - 120) : 8;
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

  /* ------------------------------------------------------------------
     شريط المصادر: نسخة ثانية للحركة المتصلة
  ------------------------------------------------------------------ */
  function marquee() {
    const tr = document.getElementById("ss-track"); if (!tr || tr.dataset.dup) return;
    tr.dataset.dup = "1";
    Array.from(tr.children).forEach(n => { const c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); tr.appendChild(c); });
  }

  /* ------------------------------------------------------------------
     حركات التمرير في الرئيسية (GSAP + ScrollTrigger)
  ------------------------------------------------------------------ */
  let scrollBuilt = false;
  function scrollFx() {
    const G = window.gsap, ST = window.ScrollTrigger;
    if (scrollBuilt || reduced || !G || !ST || !onHome()) return;
    scrollBuilt = true;
    G.registerPlugin(ST);
    // البيان: الكلمات تضيء بالتتابع مع التمرير
    const mf = document.querySelector(".mf-text");
    if (mf && !mf.dataset.split) {
      mf.dataset.split = "1";
      const label = mf.textContent.trim();
      mf.setAttribute("aria-label", label);
      mf.innerHTML = label.split(/\s+/).map(w => `<span class="mf-w" aria-hidden="true">${U.esc(w)}</span>`).join(" ");
      G.fromTo(mf.querySelectorAll(".mf-w"), { opacity: 0.16 }, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: mf, start: "top 82%", end: "bottom 46%", scrub: 0.6 }
      });
    }
    // المراحل: كل بطاقة تنكمش وتخفت قليلاً حين تغطيها التالية (الشاشات الواسعة فقط)
    const mm = G.matchMedia();
    mm.add("(min-width: 1101px)", () => {
      const cards = Array.from(document.querySelectorAll(".stg"));
      cards.slice(0, -1).forEach((li, i) => {
        const inner = li.querySelector(".stage-in"), next = cards[i + 1];
        G.fromTo(inner, { scale: 1, "--dim": 0 }, { scale: 0.93, "--dim": 0.6, ease: "none",
          scrollTrigger: { trigger: next, start: "top 85%", end: "top 18%", scrub: true } });
      });
    });
    ST.refresh();
  }

  function start() {
    stats(); marquee(); film(); liveTicker(); header();
    const go = () => requestAnimationFrame(() => setTimeout(scrollFx, 60));
    if (onHome()) go();
    window.addEventListener("hashchange", () => { if (onHome()) go(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
