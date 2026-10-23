/* =====================================================================
   EcoBio AI — «دليل المنصة» و«الأسئلة والأجوبة»
   المحتوى كله من js/guide-data.js (يُحمَّل عند أول فتح)، والأجوبة الذكية
   تُؤسَّس على هذا الدليل نفسه: يُسترجع منه ما يخص السؤال ويُرسل مع كل سؤال
   إلى Gemini، ويُلزَم بالإجابة منه وقول «لا أعرف» حين لا يغطيه.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = (id, cls) => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="#${id}"/></svg>`;
  const T = () => ECO.TOOLS || {};
  const SEC = () => ECO.SECTIONS || [];
  const label = id => (T()[id] || {}).label || id;

  /* ---------- تحميل الدليل عند الحاجة ---------- */
  let loading = null;
  function loadGuide() {
    if (ECO.GUIDE) return Promise.resolve(ECO.GUIDE);
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "js/guide-data.js"; s.async = true;
      s.onload = () => ECO.GUIDE ? res(ECO.GUIDE) : rej(new Error("guide"));
      s.onerror = () => { loading = null; rej(new Error("تعذّر تحميل الدليل. تحقق من الاتصال ثم أعد فتح الصفحة.")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  /* ---------- تنسيق نصوص الدليل: [[tool]] و[[tool|نص]] و**عريض** ---------- */
  const rich = s => esc(s)
    .replace(/\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g, (m, id, txt) => T()[id] ? `<a href="#${id}">${txt || esc(label(id))}</a>` : (txt || id))
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  // للنص المرسل إلى Gemini: روابط Markdown بدل HTML
  const plain = s => String(s || "")
    .replace(/\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g, (m, id, txt) => `[${txt || label(id)}](#${id})`)
    .replace(/\*\*(.+?)\*\*/g, "$1");

  /* ---------- البحث بالعربية (نفس تطبيع البحث السريع) ---------- */
  const norm = s => String(s || "").toLowerCase()
    .replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
    .replace(/[₀-₉]/g, d => String(d.charCodeAt(0) - 0x2080));
  const STOP = new Set("في من على الى عن ما ماذا هل كيف لماذا متى اين هي هو هذه هذا ذلك التي الذي او ثم مع كل بعد قبل عند اذا لا نعم انا انت اريد يمكن ممكن شلون شنو اكو ليش وين".split(" "));
  const toks = q => norm(q).split(/[^a-z0-9؀-ۿ.₀-₉]+/).filter(Boolean)
    .map(t => t.length > 4 && t.startsWith("ال") ? t.slice(2) : t.length > 4 && t.startsWith("وال") ? t.slice(3) : t)
    .filter(t => t.length > 1 && !STOP.has(t));
  // تطابق الكلمة كاملة، أو جذعها التقريبي (أول 4 أحرف) بوزن أقل: «إحصائياً» تطابق «إحصاء»
  function score(qt, fields) {
    let sc = 0;
    for (const t of qt) {
      let best = 0;
      for (const [txt, w] of fields) if (txt.includes(t)) best = Math.max(best, w);
      if (!best && t.length >= 6 && /[\u0600-\u06ff]/.test(t)) {
        const st = t.slice(0, 4);
        for (const [txt, w] of fields) if (txt.includes(st)) best = Math.max(best, w * 0.6);
      }
      sc += best;
    }
    return sc;
  }
  let IDX = null;
  function index(G) {
    if (IDX) return IDX;
    const L = Object.entries(G.lessons).filter(([id]) => T()[id]).map(([id, l]) => ({
      id, l,
      f: [[norm(label(id)), 6], [norm(l.kw), 4], [norm((T()[id] || {}).desc + " " + l.who + " " + l.when), 2],
        [norm([].concat(l.need, l.steps, l.read, l.method, l.data, l.limits, l.tips || []).join(" ")), 1]]
    }));
    const F = G.faq.map((x, i) => ({ i, x, f: [[norm(x.q), 5], [norm(x.a), 2]] }));
    IDX = { L, F };
    return IDX;
  }
  function retrieve(G, q, nL = 4, nF = 6) {
    const qt = toks(q), I = index(G);
    if (!qt.length) return { lessons: [], faq: [] };
    const lessons = I.L.map(e => ({ e, s: score(qt, e.f) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, nL).map(r => r.e.id);
    const faq = I.F.map(e => ({ e, s: score(qt, e.f) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, nF).map(r => r.e.i);
    return { lessons, faq };
  }

  /* =================================================================
     دليل المنصة
  ================================================================= */
  const SECTION_OF = id => SEC().find(s => s.tools.includes(id));
  const param = k => { const m = new RegExp("[#&]" + k + "=([^&]+)").exec(location.hash); return m ? decodeURIComponent(m[1]) : ""; };

  function citation() {
    const P = ECO.profile ? ECO.profile() : {};
    const y = new Date().getFullYear(), d = new Date().toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });
    const url = location.origin.startsWith("http") && !/localhost|127\./.test(location.host) ? location.origin + "/" : "https://moamin-ecobio.vercel.app/";
    return { ar: `EcoBio AI (${y}). منصة رصد التلوث البيئي ومعالجته. ${P.department || "قسم علوم الحياة"}، ${P.college || "كلية التربية للعلوم الصرفة"}، ${P.university || "جامعة تكريت"}. ${url} (تاريخ الاطلاع: ${d}).`,
      en: `EcoBio AI (${y}). Environmental pollution monitoring and remediation platform. Department of Biology, College of Education for Pure Sciences, Tikrit University. ${url} (accessed ${new Date().toISOString().slice(0, 10)}).` };
  }

  function lessonCard(id, G) {
    const t = T()[id], l = G.lessons[id], s = SECTION_OF(id);
    return `<a class="ln-card" href="#learn&t=${id}" style="--hue:${s ? s.hue : "var(--river)"}">
      <span class="tc-ic">${ico(t.icon)}</span>
      <span class="ln-c-body"><b>${esc(t.label)}</b><small>${esc(l.when)}</small></span>
      ${ico("i-chev", "tc-go")}</a>`;
  }

  function renderIndex(root, G) {
    const C = citation(), n = Object.keys(G.lessons).filter(id => T()[id]).length;
    const groups = SEC().map(s => ({ s, ids: s.tools.filter(id => G.lessons[id]) })).filter(g => g.ids.length);
    root.innerHTML = `
      <div class="ln-top">
        <div class="ln-stats"><span><b class="num">${n}</b> درساً لكل أداة</span><span><b class="num">${G.paths.length}</b> مسارات حسب البحث</span><span><b class="num">${G.faq.length}</b> سؤالاً شائعاً</span></div>
        <div class="field ln-search"><label class="sr-only" for="ln-q">ابحث في الدليل</label>
          <input id="ln-q" class="input" type="search" placeholder="ابحث في الدليل: WQI، دنكن، Sentinel، تصريف، استشهاد…" autocomplete="off"></div>
      </div>
      <div id="ln-results" hidden></div>
      <div id="ln-browse">
        <section class="panel ln-paths" aria-labelledby="ln-paths-h">
          <div class="panel-h"><h3 id="ln-paths-h">${ico("i-gps")}مسارات حسب بحثك</h3><span class="sub">ترتيب الأدوات من الفكرة إلى التقرير</span></div>
          <div class="ln-path-list">${G.paths.map(p => `<details class="ln-path"><summary><b>${esc(p.title)}</b><small>${esc(p.who)}</small></summary>
            <ol>${p.steps.map(([id, what]) => `<li><a href="#${id}">${ico((T()[id] || {}).icon || "i-info")}${esc(label(id))}</a><span>${esc(what)}</span>${G.lessons[id] ? `<a class="ln-mini" href="#learn&t=${id}">الدرس</a>` : ""}</li>`).join("")}</ol></details>`).join("")}</div>
        </section>
        ${groups.map(g => `<section class="ln-group" style="--hue:${g.s.hue}" aria-label="دروس ${esc(g.s.label)}">
          <h3 class="ln-gh">${ico(g.s.icon)}${esc(g.s.label)}<small>${esc(g.s.q)}</small></h3>
          <div class="ln-grid">${g.ids.map(id => lessonCard(id, G)).join("")}</div></section>`).join("")}
        <section class="panel ln-cite" aria-labelledby="ln-cite-h">
          <div class="panel-h"><h3 id="ln-cite-h">${ico("i-book")}كيف تستشهد بالمنصة في رسالتك</h3></div>
          <p class="muted">اذكر المنصة، واذكر معها المصدر الأصلي لكل بيانات استعملتها (مثل Copernicus CAMS أو ERA5 أو Sentinel-2) ومرجع كل معادلة كما تعرضه الأداة.</p>
          <div class="ln-cite-box"><p>${esc(C.ar)}</p><button type="button" class="btn btn-sm" data-copy="ar">${ico("i-copy")}نسخ</button></div>
          <div class="ln-cite-box" dir="ltr"><p>${esc(C.en)}</p><button type="button" class="btn btn-sm" data-copy="en">${ico("i-copy")}Copy</button></div>
        </section>
      </div>`;
    root.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copy(C[b.dataset.copy]));
    const q = root.querySelector("#ln-q");
    q.oninput = () => searchGuide(G, q.value);
  }

  function searchGuide(G, v) {
    const res = U.$("#ln-results"), br = U.$("#ln-browse");
    if (!v.trim()) { res.hidden = true; br.hidden = false; return; }
    const r = retrieve(G, v, 8, 8);
    br.hidden = true; res.hidden = false;
    res.innerHTML = !r.lessons.length && !r.faq.length
      ? `<div class="notice info">${ico("i-info")}<span>لا يوجد في الدليل ما يطابق «${esc(v)}». جرّب كلمة أخرى، أو اسأل في <a href="#faq">الأسئلة والأجوبة</a>.</span></div>`
      : (r.lessons.length ? `<h3 class="ln-gh">دروس</h3><div class="ln-grid">${r.lessons.map(id => lessonCard(id, G)).join("")}</div>` : "") +
        (r.faq.length ? `<h3 class="ln-gh">أسئلة شائعة</h3>${r.faq.map(i => faqItem(G.faq[i])).join("")}` : "");
  }

  const block = (title, icon, items, cls = "", ordered = false) => !items || !items.length ? "" :
    `<section class="ln-block ${cls}"><h3>${ico(icon)}${title}</h3>${typeof items === "string" ? `<p>${rich(items)}</p>`
      : `<${ordered ? "ol" : "ul"}>${items.map(x => `<li>${rich(x)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`}</section>`;

  function renderLesson(root, G, id) {
    const t = T()[id], l = G.lessons[id], s = SECTION_OF(id);
    if (!t || !l) { location.hash = "learn"; return; }
    const faqs = G.faq.filter(x => (x.tools || []).includes(id) || new RegExp("\\[\\[" + id + "(\\||\\]\\])").test(x.a)).slice(0, 6);
    const own = (l.faq || []).map(([q, a]) => ({ q, a }));
    root.innerHTML = `
      <article class="ln-lesson" style="--hue:${s ? s.hue : "var(--river)"}">
        <a class="ln-back" href="#learn">${ico("i-chev")}كل الدروس</a>
        <header class="ln-head">
          <span class="tc-ic">${ico(t.icon)}</span>
          <div><p class="kicker">${s ? esc(s.label) + " · " : ""}درس الأداة</p><h2>${esc(t.label)}</h2><p class="lead">${esc(t.desc)}</p></div>
          <a class="btn btn-primary" href="#${id}">${ico("i-chev")}افتح الأداة</a>
        </header>
        <div class="ln-cols">
          <div>
            ${block("لمن هذه الأداة؟", "i-info", l.who)}
            ${block("متى تستعملها؟", "i-spark", l.when)}
            ${block("ما تحتاجه", "i-file", l.need)}
            ${block("خطوات العمل", "i-gps", l.steps, "ln-steps", true)}
            ${block("كيف تقرأ النتيجة", "i-layers", l.read)}
            ${block("نصائح للرسالة والبحث", "i-book", l.tips, "ln-tips")}
          </div>
          <div>
            ${block("المنهجية العلمية ومراجعها", "i-flask", l.method)}
            ${block("مصادر البيانات", "i-db", l.data)}
            ${block("حدود الدقة", "i-warn", l.limits, "ln-limits")}
            ${own.length || faqs.length ? `<section class="ln-block"><h3>${ico("i-qa")}أسئلة عن هذه الأداة</h3>${own.concat(faqs).map(faqItem).join("")}</section>` : ""}
            <button type="button" class="btn ln-ask" data-ask="${esc(t.label)}">${ico("i-qa")}اسأل عن «${esc(t.label)}»</button>
          </div>
        </div>
      </article>`;
    root.querySelector("[data-ask]").onclick = e => { ECO._askPrefill = `عن أداة «${e.currentTarget.dataset.ask}»: `; location.hash = "faq"; };
  }

  async function showLearn() {
    const root = U.$("#learn-root"); if (!root) return;
    let G;
    try { G = await loadGuide(); }
    catch (e) { root.innerHTML = `<div class="notice warn">${ico("i-warn")}<span>${esc(e.message)}</span></div>`; return; }
    const t = param("t"), head = U.$("#view-learn .view-head");
    if (head) head.hidden = !!t;   // صفحة الدرس تبدأ بعنوان الدرس نفسه
    if (t) renderLesson(root, G, t); else renderIndex(root, G);
  }

  /* =================================================================
     الأسئلة والأجوبة
  ================================================================= */
  const CATS = [["all", "الكل"], ["platform", "عن المنصة"], ["data", "البيانات ودقتها"], ["thesis", "للرسائل والبحوث"], ["methods", "المنهجية"], ["app", "التطبيق والمساعد"]];
  const SUGG = [
    "هل قراءات الهواء في المنصة قياس محطات أرضية؟",
    "كيف أختار الاختبار الإحصائي المناسب لنتائجي؟",
    "دراستي في البصرة، أي أدوات تفيدني؟",
    "كيف أحصل على بيانات تصريف دجلة كملف CSV؟",
    "كيف يُحسب WQI وما مرجعه؟",
    "كيف أستشهد بالمنصة في رسالتي؟"
  ];
  const faqItem = x => `<details class="faq-it"><summary>${esc(x.q)}</summary><div class="faq-a">${rich(x.a)}</div></details>`;
  let fState = { cat: "all", q: "" };

  function renderFaqList(G) {
    const box = U.$("#faq-list"); if (!box) return;
    let items = G.faq.map((x, i) => ({ x, i })).filter(r => fState.cat === "all" || r.x.cat === fState.cat);
    if (fState.q.trim()) {
      const qt = toks(fState.q), I = index(G);
      items = items.map(r => ({ ...r, s: score(qt, I.F[r.i].f) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s);
    }
    box.innerHTML = items.length ? items.map(r => faqItem(r.x)).join("")
      : `<p class="muted">لا يوجد سؤال شائع يطابق بحثك. اكتب سؤالك في المربع أعلى الصفحة.</p>`;
  }

  const SYSTEM = `أنت «مرشد EcoBio AI»: تجيب الباحثين وطلبة الدراسات العليا في العراق عن منصة EcoBio AI (قسم علوم الحياة، كلية التربية للعلوم الصرفة، جامعة تكريت): أدواتها، وبياناتها، ومنهجيتها، وحدود دقتها، وطريقة استعمالها في البحث.
قواعد ملزمة:
1. كل معلومة عن المنصة (ما تفعله أداة، مصدر بيانات، تكرار التحديث، الدقة، الحدود، الأزرار والخطوات) تأخذها حصراً من «دليل المنصة» المرفق مع السؤال. إذا لم يغطِّ الدليل السؤال فقل بوضوح: «هذه المعلومة غير موجودة في دليل المنصة»، ولا تخمّن ولا تخترع ميزة.
2. السؤال العلمي العام (تعريف مؤشر، آلية معالجة، اختيار اختبار إحصائي): أجب بإيجاز من المعرفة العلمية الراسخة، دون اختراع أرقام أو مراجع أو دراسات، واقترح [الباحث الذكي](#scholar) لجمع المراجع المنشورة.
3. لا تذكر رقماً (دقة نموذج، قيمة تلوث، تاريخ) غير موجود في الدليل.
4. اربط الأدوات بروابط Markdown بالصيغة [اسم الأداة](#المعرّف)، والدروس بالصيغة [درس اسم الأداة](#learn&t=المعرّف)، ولا تستعمل إلا المعرّفات الواردة في «خريطة المنصة».
5. بيانات الرصد اليومية تغطي أقضية صلاح الدين الستة على دجلة فقط؛ أدوات التحليل والإحصاء والمعالجة والباحث الذكي تعمل على بيانات أي باحث من أي محافظة.
6. اكتب بالعربية الفصحى الواضحة وبإيجاز: جواب مباشر أولاً، ثم خطوات مرقّمة إذا كان السؤال «كيف»، ثم سطر لحدود الدقة إن وُجدت. بلا مقدمات ولا مجاملات.
7. لا تقدّم تشخيصاً طبياً لفرد، ولا تطلب معلومات شخصية.`;

  function contextFor(G, q) {
    const r = retrieve(G, q);
    const map = Object.entries(T()).filter(([id, t]) => !t.hidden).map(([id, t]) => `- ${t.label} (#${id}): ${t.desc || ""}`).join("\n");
    const L = r.lessons.map(id => {
      const l = G.lessons[id];
      const sec = (h, v) => !v || !v.length ? "" : `${h}:\n${(Array.isArray(v) ? v : [v]).map(x => "- " + plain(x)).join("\n")}`;
      return [`### درس: ${label(id)} (#${id})`, sec("لمن", l.who), sec("متى", l.when), sec("ما تحتاجه", l.need), sec("الخطوات", l.steps), sec("قراءة النتيجة", l.read),
        sec("المنهجية والمراجع", l.method), sec("مصادر البيانات", l.data), sec("حدود الدقة", l.limits), sec("نصائح", l.tips)].filter(Boolean).join("\n");
    }).join("\n\n");
    const F = r.faq.map(i => `س: ${G.faq[i].q}\nج: ${plain(G.faq[i].a)}`).join("\n\n");
    return { r, text: `[دليل المنصة — الإصدار ${G.version}]\n\n## خريطة المنصة (المعرّفات المسموحة للروابط)\n${map}\n\n## دروس ذات صلة بالسؤال\n${L || "(لا يوجد درس مطابق)"}\n\n## أسئلة شائعة ذات صلة\n${F || "(لا يوجد)"}` };
  }

  let hist = [], ctrl = null;
  const HKEY = "faq_chat";
  function renderChat() {
    const log = U.$("#faq-log"); if (!log) return;
    log.innerHTML = hist.map(m => m.role === "user"
      ? `<div class="msg user">${esc(m.text)}</div>`
      : `<div class="msg bot"><div class="who">مرشد EcoBio AI · مبني على دليل المنصة</div>${U.md(m.text)}${m.src && m.src.length ? `<p class="faq-src">اعتمد الجواب على: ${m.src.map(id => `<a href="#learn&t=${id}">درس ${esc(label(id))}</a>`).join("، ")}</p>` : ""}</div>`).join("");
    U.$("#faq-clear").hidden = !hist.length;
  }

  async function ask(G, text) {
    text = (text || "").trim();
    if (ctrl) { ctrl.abort(); return; }
    if (!text) return;
    const G2 = ECO.gemini;
    const input = U.$("#faq-q"); input.value = "";
    hist.push({ role: "user", text }); renderChat();
    const log = U.$("#faq-log");
    const out = U.el("div", { class: "msg bot" }, `<div class="who">مرشد EcoBio AI · مبني على دليل المنصة</div><p class="typing"><i></i><i></i><i></i></p>`);
    log.appendChild(out); out.scrollIntoView({ block: "nearest" });
    if (!G2 || !G2.ready()) {
      out.innerHTML = `<div class="notice warn">${ico("i-warn")}<span>خدمة الإجابة الذكية غير متاحة الآن. اقرأ الأسئلة الشائعة أدناه، أو أضف مفتاح Gemini المجاني من إعدادات المساعد.</span></div>`;
      hist.pop(); return;
    }
    const C = contextFor(G, text + " " + hist.slice(-4, -1).filter(m => m.role === "user").map(m => m.text).join(" "));
    const prev = hist.slice(-7, -1).map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] }));
    const contents = prev.concat([{ role: "user", parts: [{ text: `${C.text}\n\n---\nسؤال الباحث: ${text}` }] }]);
    ctrl = new AbortController(); setBusy(true);
    try {
      const full = await G2.generate({ contents, system: SYSTEM, temperature: 0.25, signal: ctrl.signal,
        onText: t => { out.innerHTML = `<div class="who">مرشد EcoBio AI · مبني على دليل المنصة</div>${U.md(t)}`; } });
      hist.push({ role: "model", text: full, src: C.r.lessons });
    } catch (e) {
      if (e.name === "AbortError") hist.push({ role: "model", text: (out.textContent || "").replace("مرشد EcoBio AI · مبني على دليل المنصة", "").trim() + "\n\n_(أُوقف الرد)_", src: C.r.lessons });
      else { hist.pop(); out.remove(); renderChat(); U.$("#faq-log").insertAdjacentHTML("beforeend", `<div class="msg err">${esc(e.message === "NO_KEY" ? "خدمة الإجابة غير مفعّلة." : e.message)}</div>`); }
    }
    ctrl = null; setBusy(false);
    hist = hist.slice(-30); U.store.set(HKEY, hist); renderChat();
    const last = U.$("#faq-log .msg.bot:last-child"); if (last) last.scrollIntoView({ block: "nearest" });
  }
  function setBusy(b) {
    const btn = U.$("#faq-send"); if (!btn) return;
    btn.innerHTML = b ? `${ico("i-close")}إيقاف` : `${ico("i-send")}اسأل`;
    btn.classList.toggle("btn-primary", !b);
  }

  async function showFaq() {
    const root = U.$("#faq-root"); if (!root) return;
    let G;
    try { G = await loadGuide(); }
    catch (e) { root.innerHTML = `<div class="notice warn">${ico("i-warn")}<span>${esc(e.message)}</span></div>`; return; }
    if (!root.dataset.built) {
      root.dataset.built = "1";
      hist = U.store.get(HKEY, []);
      root.innerHTML = `
        <section class="panel faq-ask" aria-labelledby="faq-ask-h">
          <div class="panel-h"><h3 id="faq-ask-h">${ico("i-qa")}اسأل عن المنصة أو منهجيتها أو استعمالها في بحثك</h3><span class="sub">خاص بك، ويُحفظ في جهازك فقط</span></div>
          <div id="faq-log" class="faq-log" aria-live="polite"></div>
          <form id="faq-form" class="faq-form">
            <label class="sr-only" for="faq-q">سؤالك</label>
            <textarea id="faq-q" class="input" rows="2" placeholder="مثال: أي أداة أستعمل لمقارنة محطات العيّنات إحصائياً؟"></textarea>
            <button type="submit" class="btn btn-primary" id="faq-send">${ico("i-send")}اسأل</button>
          </form>
          <div class="faq-sugg" id="faq-sugg">${SUGG.map(s => `<button type="button" class="chip">${esc(s)}</button>`).join("")}</div>
          <p class="faint faq-note">${ico("i-info")}الأجوبة يكتبها Gemini من <a href="#learn">دليل المنصة</a> (${Object.keys(G.lessons).length} درساً و${G.faq.length} سؤالاً)، ويقول «غير موجود في الدليل» حين لا يغطيه السؤال. سؤالك يُرسل إلى خدمة Gemini للإجابة فقط ولا تحفظه المنصة. <button type="button" class="linkbtn" id="faq-clear" hidden>مسح أسئلتي</button></p>
        </section>
        <section class="faq-browse" aria-labelledby="faq-h">
          <div class="faq-bar">
            <h3 id="faq-h">الأسئلة الشائعة</h3>
            <div class="seg" id="faq-cats" role="tablist" aria-label="تصنيف الأسئلة">${CATS.map(([k, v]) => `<button type="button" role="tab" data-cat="${k}" class="${k === fState.cat ? "on" : ""}" aria-selected="${k === fState.cat}">${v}</button>`).join("")}</div>
            <label class="sr-only" for="faq-f">ابحث في الأسئلة الشائعة</label>
            <input id="faq-f" class="input" type="search" placeholder="ابحث في الأسئلة الشائعة…" autocomplete="off">
          </div>
          <div id="faq-list"></div>
        </section>`;
      U.$("#faq-form").onsubmit = e => { e.preventDefault(); ask(G, U.$("#faq-q").value); };
      U.$("#faq-q").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(G, U.$("#faq-q").value); } });
      U.$("#faq-sugg").onclick = e => { const b = e.target.closest("button"); if (b) ask(G, b.textContent); };
      U.$("#faq-clear").onclick = () => { if (ctrl) ctrl.abort(); hist = []; U.store.del(HKEY); renderChat(); };
      U.$("#faq-cats").onclick = e => { const b = e.target.closest("button"); if (!b) return; fState.cat = b.dataset.cat; U.$$("#faq-cats button").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", String(x === b)); }); renderFaqList(G); };
      U.$("#faq-f").oninput = e => { fState.q = e.target.value; renderFaqList(G); };
      renderChat(); renderFaqList(G);
    }
    if (ECO._askPrefill) { const t = U.$("#faq-q"); t.value = ECO._askPrefill; ECO._askPrefill = null; setTimeout(() => { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }, 60); }
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); U.toast("نُسخ"); }
    catch (e) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); U.toast("نُسخ"); } catch (x) { /* */ } t.remove(); }
  }

  ECO.views.learn = { show: showLearn };
  ECO.views.faq = { show: showFaq };
  // تبديل الدرس داخل الصفحة نفسها (#learn&t=…) لا يمر بالموجّه لأن الصفحة لم تتغير
  window.addEventListener("hashchange", () => {
    if (ECO.router && ECO.router.current() === "learn" && /^#learn(&|$)/.test(location.hash)) {
      showLearn().then(() => { if (ECO.motion && ECO.motion.top) ECO.motion.top(); else window.scrollTo(0, 0); });
    }
  });
  ECO.guide = { load: loadGuide, retrieve };
})();
