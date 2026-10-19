/* =====================================================================
   المجهر الذكي — مؤشر Palmer لتلوث المياه العضوي بالطحالب
   ---------------------------------------------------------------------
   Palmer, C.M. (1969). A composite rating of algae tolerating organic
   pollution. Journal of Phycology, 5(1), 78–82.
   عشرون جنساً من الطحالب المتحملة للتلوث العضوي، لكل جنس درجة (1–5).
   مجموع درجات الأجناس الموجودة في العينة:
     20 فأكثر  تلوث عضوي عالٍ
     15 – 19   تلوث عضوي محتمل
     أقل من 15 تلوث عضوي قليل
   يُحتسب الجنس إذا تجاوزت كثافته 50 خلية/مل (كما طبّقه Jaffer وآخرون،
   2025، في هور الحمار – البصرة).
   الذكاء الاصطناعي يقترح الأجناس من صور المجهر فقط، والقرار للمختص.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;

  const GENERA = [
    { g: "Anacystis", s: 1, grp: "cyan", alt: ["Microcystis"], hint: "مستعمرات كروية أو غير منتظمة من خلايا كروية صغيرة داخل غلاف هلامي، غالباً بفجوات غازية داكنة. تُسمّى حالياً Microcystis." },
    { g: "Oscillatoria", s: 5, grp: "cyan", alt: [], hint: "خيوط غير متفرعة من خلايا قرصية قصيرة، بلا غلاف واضح، وتتحرك حركة تذبذبية بطيئة." },
    { g: "Phormidium", s: 1, grp: "cyan", alt: [], hint: "خيوط تشبه Oscillatoria لكن داخل غلاف رقيق، وتكوّن حصائر على الأسطح." },
    { g: "Ankistrodesmus", s: 2, grp: "green", alt: [], hint: "خلايا إبرية أو هلالية رفيعة مدببة الطرفين، مفردة أو في حزم." },
    { g: "Chlamydomonas", s: 4, grp: "green", alt: [], hint: "خلية مفردة بيضوية بسوطين متساويين وبقعة عينية حمراء وبلاستيدة كأسية." },
    { g: "Chlorella", s: 3, grp: "green", alt: [], hint: "خلية كروية صغيرة مفردة بلا أسواط، ببلاستيدة كأسية واحدة." },
    { g: "Closterium", s: 1, grp: "green", alt: [], hint: "خلية هلالية متناظرة كبيرة، في كل طرف فجوة صغيرة فيها بلورات متحركة." },
    { g: "Micractinium", s: 1, grp: "green", alt: [], hint: "مستعمرات صغيرة من خلايا كروية تحمل أشواكاً طويلة رفيعة." },
    { g: "Pandorina", s: 1, grp: "green", alt: [], hint: "مستعمرة كروية من 8–32 خلية متراصة بإحكام، لكل خلية سوطان." },
    { g: "Scenedesmus", s: 4, grp: "green", alt: ["Desmodesmus"], hint: "مستعمرة مسطحة من 2–8 خلايا بيضوية متجاورة، وقد تحمل الخلايا الطرفية أشواكاً." },
    { g: "Stigeoclonium", s: 2, grp: "green", alt: [], hint: "خيوط خضراء متفرعة تنتهي فروعها بشعيرات مدببة." },
    { g: "Euglena", s: 5, grp: "eug", alt: [], hint: "خلية مغزلية مرنة متغيرة الشكل بسوط واحد ظاهر وبقعة عينية حمراء." },
    { g: "Lepocinclis", s: 1, grp: "eug", alt: [], hint: "يوغلينيّ صلب الجدار، بيضوي أو مغزلي ينتهي بذيل مدبب، مخطط حلزونياً." },
    { g: "Phacus", s: 2, grp: "eug", alt: [], hint: "يوغلينيّ مسطح ورقي الشكل صلب، ينتهي بذيل مدبب ملتوٍ." },
    { g: "Cyclotella", s: 1, grp: "diat", alt: [], hint: "دايتوم مركزي قرصي الشكل، حافته مخططة شعاعياً ووسطه أملس." },
    { g: "Gomphonema", s: 1, grp: "diat", alt: [], hint: "دايتوم ريشي وتدي الشكل (أحد الطرفين أعرض)، كثيراً ما يكون على سويقة هلامية." },
    { g: "Melosira", s: 1, grp: "diat", alt: ["Aulacoseira"], hint: "دايتوم مركزي أسطواني يكوّن سلاسل خيطية من خلايا متصلة." },
    { g: "Navicula", s: 3, grp: "diat", alt: [], hint: "دايتوم ريشي زورقي الشكل متناظر، بشق مركزي على طوله." },
    { g: "Nitzschia", s: 3, grp: "diat", alt: [], hint: "دايتوم ريشي طويل رفيع، شقّه على حافة الصمام مع نقاط بارزة." },
    { g: "Synedra", s: 2, grp: "diat", alt: ["Ulnaria", "Fragilaria"], hint: "دايتوم ريشي إبري طويل جداً ومستقيم، مفرد أو في مجموعات مروحية." }
  ];
  const GROUPS = { cyan: "الطحالب الخضراء المزرقة (البكتيريا الزرقاء)", green: "الطحالب الخضراء", eug: "اليوغلينيات", diat: "الدايتومات" };
  const MAX = GENERA.reduce((a, x) => a + x.s, 0);
  const S = { on: {}, dens: {}, ai: {}, imgs: [], aiInfo: null, site: "", date: "", sample: "" };
  const hist = () => U.store.get("palmer_hist", []);

  const band = sc => sc >= 20 ? { tone: "bad", label: "تلوث عضوي عالٍ" } : sc >= 15 ? { tone: "warn", label: "تلوث عضوي محتمل" } : { tone: "good", label: "تلوث عضوي قليل" };
  // الجنس يُحتسب إذا اختير، وإن كُتبت كثافته فيجب أن تتجاوز 50 خلية/مل
  const counted = x => S.on[x.g] && !(U.isNum(S.dens[x.g]) && S.dens[x.g] <= 50);
  const score = () => GENERA.filter(counted).reduce((a, x) => a + x.s, 0);

  function renderList() {
    U.$("#pm-list").innerHTML = Object.entries(GROUPS).map(([k, name]) => `<div class="pm-grp"><h4>${name}</h4>${GENERA.filter(x => x.grp === k).map(x => {
      const ai = S.ai[x.g];
      return `<div class="pm-row${S.on[x.g] ? " on" : ""}${S.on[x.g] && !counted(x) ? " low" : ""}">
        <label class="pm-chk"><input type="checkbox" data-g="${x.g}" ${S.on[x.g] ? "checked" : ""}><span class="pm-name"><i dir="ltr">${x.g}</i>${ai ? `<span class="chip tone-info pm-ai" title="${U.esc(ai.evidence || "")}">مقترح من الصورة${U.isNum(ai.confidence) ? " " + Math.round(ai.confidence * 100) + "%" : ""}</span>` : ""}</span><b class="pm-s">${x.s}</b></label>
        <p class="pm-hint">${x.hint}</p>
        ${S.on[x.g] ? `<div class="pm-den"><label for="pm-d-${x.g}">الكثافة (خلية/مل) – اختياري</label><input id="pm-d-${x.g}" class="input" type="number" min="0" step="any" dir="ltr" data-d="${x.g}" value="${U.isNum(S.dens[x.g]) ? S.dens[x.g] : ""}" placeholder="&gt; 50"></div>` : ""}
      </div>`;
    }).join("")}</div>`).join("");
  }

  function renderScore() {
    const sc = score(), b = band(sc), list = GENERA.filter(counted);
    U.$("#pm-gauge").innerHTML = U.gauge({ value: sc, max: 40, tone: b.tone, label: b.label, sub: `مجموع درجات ${list.length} جنس من 20 · الحد الأعلى الممكن ${MAX}` });
    U.$("#pm-sel").innerHTML = list.length ? list.map(x => `<span class="chip tone-none" dir="ltr">${x.g} <b>${x.s}</b></span>`).join("") : `<span class="faint">لم يُختر أي جنس بعد.</span>`;
    const low = GENERA.filter(x => S.on[x.g] && !counted(x));
    U.$("#pm-low").innerHTML = low.length ? `<p class="faint pm-note">لم تُحتسب (كثافة 50 خلية/مل أو أقل): <span dir="ltr">${low.map(x => x.g).join(", ")}</span></p>` : "";
    const fl = U.$("#pm-float");
    if (fl) fl.innerHTML = `<span>المجموع <b>${sc}</b> من ${list.length} جنس</span><span class="chip tone-${b.tone}">${b.label}</span>`;
    ECO.lastPalmer = list.length ? { score: sc, class: b.label, genera: list.map(x => x.g), site: S.site, date: S.date } : null;
  }
  const refresh = () => { renderList(); renderScore(); };

  /* ---------- الصور ---------- */
  function addFiles(files) {
    [...files].slice(0, 4 - S.imgs.length).forEach(f => {
      if (!/^image\//.test(f.type)) { U.toast("اختر صوراً فقط"); return; }
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        S.imgs.push(c.toDataURL("image/jpeg", 0.88)); renderImgs();
      }; img.onerror = () => U.toast("تعذّر فتح الصورة"); img.src = fr.result; };
      fr.readAsDataURL(f);
    });
  }
  function renderImgs() {
    U.$("#pm-imgs").innerHTML = S.imgs.map((d, i) => `<div class="pm-img"><img src="${d}" alt="صورة مجهرية ${i + 1}"><button type="button" class="btn icon-btn btn-ghost" data-rm="${i}" aria-label="حذف الصورة"><svg><use href="#i-close"/></svg></button></div>`).join("")
      + (S.imgs.length < 4 ? `<label class="pm-add" for="pm-file"><svg><use href="#i-camera"/></svg><span>${S.imgs.length ? "صورة أخرى" : "صوّر الشريحة أو ارفع صورة"}</span></label>` : "");
    U.$("#pm-ai").disabled = !S.imgs.length;
  }

  function aiSuggest() {
    const out = U.$("#pm-ai-out");
    if (!S.imgs.length) { out.innerHTML = `<p class="warnc">ارفع صورة مجهرية أولاً.</p>`; return; }
    if (!ECO.gemini.ready()) { ECO.gemini.renderInto(out, ""); return; }
    const names = GENERA.map(x => x.g + (x.alt.length ? ` (ويشمل ${x.alt.join("/")})` : "")).join("، ");
    const prompt = `الصور المرفقة (${S.imgs.length}) لشرائح مجهرية من عينة مياه عذبة من العراق. حدّد أجناس الطحالب التي تظهر بوضوح فقط.
قائمة أجناس مؤشر Palmer (1969): ${names}.
أعد JSON فقط بالشكل:
{"genera":[{"genus":"اسم الجنس اللاتيني من القائمة","confidence":0.0,"abundance":"قليل|متوسط|كثير","evidence":"الصفات الشكلية التي رأيتها بالعربية باختصار"}],
 "other":[{"genus":"جنس غير موجود في القائمة","evidence":""}],
 "image_quality":"جيدة|متوسطة|ضعيفة","magnification_note":"","notes":""}
قواعد: لا تذكر جنساً لم تره بوضوح؛ القائمة الفارغة أفضل من التخمين. confidence بين 0 و1. اكتب أسماء الأجناس اللاتينية كما هي. إذا لم تكن الصورة مجهرية أو لا تظهر فيها طحالب فاذكر ذلك في notes وأعد قائمة فارغة.`;
    out.innerHTML = `<p class="typing"><i></i><i></i><i></i></p>`;
    const parts = S.imgs.map(d => ({ inline_data: { mime_type: "image/jpeg", data: d.split(",")[1] } })).concat([{ text: prompt }]);
    ECO.gemini.generate({ json: true, temperature: 0.1, system: "أنت خبير في تصنيف طحالب المياه العذبة تحت المجهر الضوئي. دقيق ومتحفظ ولا تخمّن.", contents: [{ role: "user", parts }] })
      .then(txt => {
        const j = JSON.parse(txt.replace(/^```json|```$/g, "").trim());
        S.aiInfo = j; S.ai = {};
        const found = [];
        (j.genera || []).forEach(o => {
          const n = String(o.genus || "").trim().split(/\s+/)[0].toLowerCase();
          const x = GENERA.find(y => y.g.toLowerCase() === n || y.alt.some(a => a.toLowerCase() === n));
          if (x && (!U.isNum(+o.confidence) || +o.confidence >= 0.35)) { S.ai[x.g] = { confidence: +o.confidence, evidence: o.evidence, from: o.genus }; S.on[x.g] = true; found.push(x.g + (x.g.toLowerCase() !== n ? ` (${o.genus})` : "")); }
        });
        const other = (j.other || []).map(o => o.genus).filter(Boolean);
        out.innerHTML = `<div class="notice ${found.length ? "ok" : "info"}"><span>${found.length ? `اقترح الذكاء الاصطناعي ${found.length} جنساً من قائمة Palmer وأشّرها لك: <b dir="ltr">${found.join(", ")}</b>. راجع كل جنس تحت المجهر قبل اعتماد النتيجة.` : "لم يتعرف الذكاء الاصطناعي بثقة على أي جنس من قائمة Palmer في الصور. اختر الأجناس يدوياً من القائمة."}</span></div>
          ${other.length ? `<p class="faint pm-note">أجناس أخرى ظهرت (لا تدخل في المؤشر): <span dir="ltr">${U.esc(other.join(", "))}</span></p>` : ""}
          ${j.image_quality ? `<p class="faint pm-note">جودة الصور: ${U.esc(j.image_quality)}${j.notes ? " · " + U.esc(j.notes) : ""}</p>` : ""}`;
        refresh();
      })
      .catch(e => { out.innerHTML = `<div class="notice warn">${U.esc(/Unexpected|JSON/.test(e.message) ? "لم يُرجع الذكاء الاصطناعي نتيجة منظمة؛ جرّب صورة أوضح." : e.message)}</div>`; });
  }

  /* ---------- الحفظ والتقرير ---------- */
  function save() {
    const list = GENERA.filter(counted);
    if (!list.length) { U.toast("اختر الأجناس الموجودة أولاً"); return; }
    const rec = { at: Date.now(), site: U.$("#pm-site").value.trim(), date: U.$("#pm-date").value, sample: U.$("#pm-sample").value, score: score(), class: band(score()).label, genera: list.map(x => x.g), dens: Object.fromEntries(list.filter(x => U.isNum(S.dens[x.g])).map(x => [x.g, S.dens[x.g]])), ai: Object.keys(S.ai) };
    const h = hist(); h.unshift(rec); U.store.set("palmer_hist", h.slice(0, 30));
    if (rec.sample && ECO.samples && ECO.samples.attach) ECO.samples.attach(rec.sample, { palmer: { score: rec.score, class: rec.class, genera: rec.genera, date: rec.date } });
    renderHist(); U.toast(rec.sample ? "حُفظت النتيجة وأُضيفت إلى العيّنة على الخريطة" : "حُفظت النتيجة");
  }
  function renderHist() {
    const h = hist();
    U.$("#pm-hist").innerHTML = h.length ? h.map((r, i) => `<div class="pm-h"><span><b>${U.esc(r.site || "بلا اسم")}</b><small>${U.esc(r.date || "")} · <span dir="ltr">${r.genera.join(", ")}</span></small></span><span class="chip tone-${band(r.score).tone}">${r.score} · ${r.class}</span><button type="button" class="btn btn-sm btn-ghost" data-load="${i}">فتح</button></div>`).join("") : `<p class="faint">لا توجد نتائج محفوظة بعد.</p>`;
  }
  function loadRec(r) {
    S.on = {}; S.dens = {}; S.ai = {};
    r.genera.forEach(g => { S.on[g] = true; }); Object.assign(S.dens, r.dens || {});
    U.$("#pm-site").value = r.site || ""; U.$("#pm-date").value = r.date || ""; U.$("#pm-sample").value = r.sample || "";
    refresh(); U.$("#pm-gauge").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function pdf(mode) {
    const list = GENERA.filter(counted);
    if (!list.length) { U.toast("اختر الأجناس الموجودة أولاً"); return; }
    const sc = score(), b = band(sc), site = U.$("#pm-site").value.trim(), date = U.$("#pm-date").value;
    ECO.report.run({
      title: "تقييم التلوث العضوي بمؤشر Palmer للطحالب", subtitle: [site, date].filter(Boolean).join(" · "), file: "مؤشر-Palmer",
      blocks: [
        { type: "kv", items: [["الموقع", site || "—"], ["تاريخ العينة", date || "—"], ["مجموع المؤشر", `${sc} من ${MAX}`], ["التصنيف", b.label], ["عدد الأجناس المحتسبة", String(list.length)]] },
        { type: "table", caption: "الأجناس المحتسبة ودرجاتها (Palmer, 1969)", head: ["الجنس", "المجموعة", "الدرجة", "الكثافة (خلية/مل)", "المصدر"], rows: list.map(x => [x.g, GROUPS[x.grp], String(x.s), U.isNum(S.dens[x.g]) ? String(S.dens[x.g]) : "—", S.ai[x.g] ? "مقترح من الصورة ومؤكد يدوياً" : "تشخيص يدوي"]) },
        ...S.imgs.slice(0, 2).map((d, i) => ({ type: "chart", src: d, caption: `صورة مجهرية ${i + 1}` })),
        { type: "text", html: "التفسير: مجموع 20 فأكثر يدل على تلوث عضوي عالٍ، و15–19 تلوث عضوي محتمل، وأقل من 15 تلوث عضوي قليل. يُحتسب الجنس إذا تجاوزت كثافته 50 خلية/مل. المؤشر أداة فرز سريعة ويُدعم بفحوص BOD وCOD والمغذيات." },
        { type: "refs", items: ["Palmer, C.M. (1969). A composite rating of algae tolerating organic pollution. Journal of Phycology, 5(1), 78–82.", "Jaffer, E.M., Abbas, A.F. & Al-Knaany, S.A. (2025). Assessment of organic pollution in East Al-Hammar Marsh using Palmer's Algal Index, Basrah, Southern of Iraq. Bulletin of the Iraq Natural History Museum, 18(4), 929–942."] },
        { type: "sign" }
      ]
    }, mode);
  }

  function fillSamples() {
    const list = ECO.samples ? ECO.samples.list() : [];
    U.$("#pm-sample").innerHTML = `<option value="">بدون ربط</option>` + list.map(s => `<option value="${U.esc(s.id)}">${U.esc(s.code)} – ${U.esc(s.site || "")}</option>`).join("");
  }

  function init() {
    renderImgs(); refresh(); renderHist(); fillSamples();
    U.$("#pm-date").value = U.isoDate(new Date());
    U.$("#pm-file").onchange = e => { addFiles(e.target.files); e.target.value = ""; };
    U.$("#pm-imgs").onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { S.imgs.splice(+b.dataset.rm, 1); renderImgs(); } };
    U.$("#pm-ai").onclick = aiSuggest;
    U.$("#pm-list").addEventListener("change", e => {
      const c = e.target.closest("input[type=checkbox][data-g]");
      if (c) { S.on[c.dataset.g] = c.checked; if (!c.checked) { delete S.dens[c.dataset.g]; delete S.ai[c.dataset.g]; } refresh(); }
    });
    U.$("#pm-list").addEventListener("input", e => {
      const d = e.target.closest("input[data-d]"); if (!d) return;
      const v = parseFloat(d.value); if (U.isNum(v)) S.dens[d.dataset.d] = v; else delete S.dens[d.dataset.d];
      renderScore(); d.closest(".pm-row").classList.toggle("low", U.isNum(v) && v <= 50);
    });
    U.$("#pm-clear").onclick = () => { S.on = {}; S.dens = {}; S.ai = {}; U.$("#pm-ai-out").innerHTML = ""; refresh(); };
    U.$("#pm-save").onclick = save;
    U.$("#pm-pdf").onclick = () => pdf();
    U.$("#pm-hist").onclick = e => { const b = e.target.closest("[data-load]"); if (b) loadRec(hist()[+b.dataset.load]); };
    ["pm-site", "pm-date"].forEach(id => U.$("#" + id).addEventListener("input", () => { S.site = U.$("#pm-site").value; S.date = U.$("#pm-date").value; }));
    U.$("#pm-sample").onchange = e => { const s = (ECO.samples ? ECO.samples.list() : []).find(x => x.id === e.target.value); if (s) { U.$("#pm-site").value = s.site || s.code; if (s.date) U.$("#pm-date").value = s.date; } };
  }

  ECO.palmer = { GENERA, score, band, state: S, refresh };
  ECO.views.palmer = { init, show() { fillSamples(); } };
})();
