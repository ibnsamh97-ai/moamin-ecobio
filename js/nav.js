/* =====================================================================
   EcoBio AI — هيكل المنصة والتنقل
   الأقسام مرتبة على مسار الباحث البيئي: الرصد ← التحليل ← المعالجة ← البحث
   كل أداة لها: وصف، وما تحتاجه، وما تحصل عليه، وكلمات بحث، والخطوة التالية.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;

  /* ------------------------------------------------------------------
     الأقسام (n = رقم المرحلة في المسار، 0 = خارج المسار)
  ------------------------------------------------------------------ */
  const SECTIONS = [
    { id: "observe", n: 1, label: "الرصد", icon: "i-sat", hue: "#4fc8dc",
      q: "ما حالة الهواء والنهر الآن؟",
      lead: "قراءات حية من الأقمار الصناعية لهواء صلاح الدين ونهر دجلة، وصور فضائية للنهر منذ عام 1984، وتوقّع لتراكيز الهواء.",
      photo: { src: "assets/photos/observe.jpg", alt: "الكرة الأرضية في المنصة تُظهر العراق ومحطات الرصد على نهر دجلة" },
      tools: ["monitor", "space", "twin", "analysis"] },
    { id: "analyze", n: 2, label: "التحليل", icon: "i-flask", hue: "#e6ae4f",
      q: "عندك عيّنة أو نتائج مختبر؟",
      lead: "ثبّت موقع العيّنة، واحسب مؤشرات جودتها، واقرأ صور الماء وشرائح الطحالب، وحلّل جداول نتائجك إحصائياً.",
      photo: { src: "assets/photos/lab.jpg", alt: "مختبر في قسم علوم الحياة بجامعة تكريت، ومجاهر مغطاة على المناضد" },
      tools: ["samples", "water", "analyzer", "calc", "palmer", "vision"] },
    { id: "treat", n: 3, label: "المعالجة", icon: "i-leaf", hue: "#93dd8a",
      q: "كيف تُزال هذه الملوثات؟",
      lead: "صمّم سلسلة معالجة لمياهك وتنبّأ بكفاءتها قبل أي تجربة، وتعرّف على آليات المعالجة الحيوية والنباتية بنماذج ثلاثية الأبعاد.",
      photo: { src: "assets/photos/garden.jpg", alt: "حديقة كلية التربية للعلوم الصرفة ومجسم المجهر الأبيض" },
      tools: ["plant", "river", "micro", "molecules"] },
    { id: "studies", n: 4, label: "البحث", icon: "i-book", hue: "#a5b6ff",
      q: "ماذا دُرس قبلك، وماذا بقي؟",
      lead: "بحوث جامعة تكريت المنشورة على الخريطة، والمواقع والملوثات التي لم تُدرس بعد، وتقارير PDF جاهزة للعرض على المشرف.",
      photo: { src: "assets/photos/board.jpg", alt: "لوحة جامعة تكريت – كلية التربية للعلوم الصرفة" },
      tools: ["research", "gaps", "reports"] },
    { id: "department", n: 0, label: "القسم", icon: "i-building", hue: "#c4d3cf",
      q: "قسم علوم الحياة – جامعة تكريت",
      lead: "تجوّل في القسم ومختبراته بثلاثة أبعاد، وتعرّف على أهداف المنصة ومنهجيتها وحدود دقتها.",
      photo: { src: "assets/photos/college.jpg", alt: "لافتة كلية التربية للعلوم الصرفة – قسم علوم الحياة" },
      tools: ["campus", "about"] }
  ];

  /* ------------------------------------------------------------------
     الأدوات
  ------------------------------------------------------------------ */
  const TOOLS = {
    monitor: { label: "الرصد الحي للهواء", icon: "i-sat",
      desc: "تراكيز عشرة ملوثات هواء لسبع محطات على دجلة، تُحدَّث كل 30 دقيقة، مع صور الأقمار اليومية.",
      need: "لا شيء، القراءات جاهزة", get: "مؤشر الهواء الصحي وخريطة المحطات ومقارنة الملوثات",
      kw: "هواء AQI PM2.5 PM10 غبار NO2 SO2 O3 CO اوزون نتروجين كبريت CAMS NASA اقمار محطات تكريت" },
    space: { label: "دجلة من الفضاء", icon: "i-layers",
      desc: "عكورة النهر وطحالبه من صور القمر Sentinel-2 بدقة 10 م، لأي نقطة وأي تاريخ منذ 2017.",
      need: "نقطة على النهر وتاريخ", get: "مؤشرات NDTI وNDCI وسلسلة زمنية",
      kw: "عكوره طحالب كلوروفيل Sentinel NDTI NDCI NDWI صور فضائيه نهر" },
    twin: { label: "توأم دجلة الرقمي", icon: "i-cube",
      desc: "النهر الحقيقي ثلاثي الأبعاد، وآلة زمن من 1984 تحسب مساحة الماء، ومحاكاة تسرب تحسب وصول الملوث لكل مدينة.",
      need: "متصفح يدعم العرض ثلاثي الأبعاد", get: "مساحة الماء عبر السنين وزمن وصول التسرب",
      kw: "3D توام رقمي Landsat تسرب نفط زمن وصول تصريف GloFAS اله زمن ثلاثي الابعاد" },
    analysis: { label: "توقّع الهواء وكشف الشذوذ", icon: "i-brain",
      desc: "نموذج تعلم آلي يتدرّب في متصفحك على بيانات 30 يوماً، ويكشف الأيام الشاذة واتجاه مصادر التلوث.",
      need: "لا شيء، يستخدم بيانات الرصد", get: "توقع PM2.5 والأيام الشاذة ودقة النموذج",
      kw: "تعلم الي Ridge انحدار شذوذ Z-score توقع تنبؤ ذكاء اصطناعي" },
    samples: { label: "خريطة العينات", icon: "i-pin",
      desc: "ثبّت مواقع عيّناتك على صور فضائية عالية الدقة، وسجّل نتائجها وصورها، وشاركها برابط.",
      need: "موقع العيّنة (GPS أو نقرة على الخريطة)", get: "سجل عيّنات وخريطة قابلة للمشاركة",
      kw: "GPS موقع عينه محطه احداثيات حقل خريطه مشاركه" },
    water: { label: "مختبر جودة المياه", icon: "i-drop",
      desc: "أدخل نتائج عيّنة الماء لتحصل على WQI وHPI والمطابقة للمواصفة العراقية 417 ومعالجة مقترحة.",
      need: "نتائج تحليل عيّنة ماء", get: "WQI وHPI وجدول مطابقة وخطة معالجة",
      kw: "WQI HPI جوده مياه مواصفه عراقيه 417 شرب pH TDS عسره BOD نترات معادن رصاص كادميوم" },
    analyzer: { label: "محلّل بيانات البيئة", icon: "i-table", isNew: true,
      desc: "ارفع جدول نتائجك (Excel أو CSV) لتحصل على مؤشرات التلوث والإحصاء والرسوم الجاهزة للنشر.",
      need: "ملف Excel أو CSV بنتائجك", get: "ANOVA ودنكن والارتباط والمؤشرات وجداول ورسوم",
      kw: "احصاء ANOVA دنكن Duncan LSD ارتباط Pearson CSV Excel جدول رسم بياني متوسط انحراف معياري WQI HPI Igeo PLI CF" },
    calc: { label: "الحاسبات العلمية", icon: "i-calc",
      desc: "أكثر من 20 حاسبة بمعادلاتها ومراجعها: SAR وIgeo وRI وHQ وBOD والامتزاز وغيرها.",
      need: "قيم مقيسة لمعادلة واحدة", get: "النتيجة وتصنيفها ومرجع المعادلة",
      kw: "حاسبه SAR Igeo RI HQ BOD COD لانكماير فرندلش BCF معادله رواسب مخاطر صحيه معادن ثقيله رصاص كادميوم نيكل" },
    palmer: { label: "المجهر الذكي", icon: "i-scan",
      desc: "صوّر شريحة الطحالب بهاتفك، فيقترح الذكاء الاصطناعي الأجناس ويُحسب مؤشر Palmer للتلوث العضوي.",
      need: "صورة شريحة من المجهر", get: "الأجناس المقترحة ومؤشر Palmer وتقرير",
      kw: "طحالب Palmer مجهر شريحه دايتومات اجناس تلوث عضوي" },
    vision: { label: "قراءة الصور", icon: "i-camera",
      desc: "اقرأ لون الماء بمؤشر Forel-Ule من صورة الهاتف، واستخرج أرقام ورقة نتائج المختبر آلياً.",
      need: "صورة ماء أو ورقة نتائج", get: "درجة لون الماء أو جدول القيم المستخرجة",
      kw: "لون الماء Forel-Ule صوره OCR ورقه نتائج كاميرا" },
    plant: { label: "محاكي محطة المعالجة", icon: "i-plant", isNew: true,
      desc: "ركّب سلسلة معالجة لمياهك وتنبّأ بنوعية المياه الخارجة ونسبة الإزالة والجرعات قبل أي تجربة.",
      need: "نوعية المياه الداخلة", get: "كفاءة كل مرحلة والجرعات والحجوم وتقرير تصميم",
      kw: "معالجه تخثير ترسيب امتزاز كاربون زيوليت حيويه حمأه منشطه BOD ازاله تصميم محطه جرعه شب كلور تعقيم معادن ثقيله رصاص نترات" },
    river: { label: "محاكاة دجلة 3D", icon: "i-river",
      desc: "شغّل مصادر التلوث على نموذج للنهر، وطبّق المعالجة النباتية والحيوية وراقب صحة النهر.",
      need: "لا شيء", get: "فهم أثر كل مصدر تلوث وكل معالجة",
      kw: "محاكاه نهر معالجه نباتيه حيويه مصادر تلوث ثلاثي الابعاد" },
    micro: { label: "العالم المجهري 3D", icon: "i-microbe",
      desc: "بكتيريا تفكك النفط أو تمتص المعادن الثقيلة، وتتغير حسب الحرارة وpH والمغذيات.",
      need: "لا شيء", get: "فهم آلية المعالجة الحيوية",
      kw: "بكتيريا Pseudomonas تفكك نفط امتصاص حيوي معادن ثلاثي الابعاد" },
    molecules: { label: "مكتبة الملوثات", icon: "i-atom",
      desc: "نماذج جزيئية لعشرة ملوثات مع مصادرها وحدودها المسموحة وطرق معالجتها.",
      need: "لا شيء", get: "بطاقة الملوث وحدوده ومعالجته",
      kw: "جزيئات BTEX PAHs بنزين ملوث حدود مسموحه ثلاثي الابعاد" },
    research: { label: "بحوث جامعة تكريت", icon: "i-book",
      desc: "نتائج منشورة لباحثي الجامعة على الخريطة وفي جداول، ومنها بحث المشرفة عن بكتيريا دجلة في تكريت.",
      need: "لا شيء", get: "قيم منشورة مع مرجعها الكامل",
      kw: "بحوث منشوره جامعه تكريت مراجع دراسات سابقه DOI مجله" },
    gaps: { label: "الفجوات البحثية", icon: "i-map",
      desc: "ماذا دُرس وأين ومتى في صلاح الدين، واقتراح عناوين رسائل للمواقع والملوثات غير المدروسة.",
      need: "لا شيء", get: "خريطة الفجوات وعناوين مقترحة",
      kw: "فجوات بحثيه عنوان رساله ماجستير اقتراح خطه بحث" },
    reports: { label: "التقارير PDF", icon: "i-file",
      desc: "تقارير رسمية باسم المختبر فيها الجداول والرسوم والصور، جاهزة للمشرف.",
      need: "نتيجة من أي أداة", get: "ملف PDF مرتّب",
      kw: "تقرير PDF طباعه مشرف ترويسه" },
    campus: { label: "جولة في القسم 3D", icon: "i-building",
      desc: "تجوّل داخل قسم علوم الحياة بطابقيه، وادخل المختبرات واضغط على الأجهزة لتعرف ما تقيسه.",
      need: "لا شيء", get: "معرفة مختبرات القسم وأجهزته",
      kw: "جوله قسم مختبرات اجهزه ثلاثي الابعاد كليه" },
    about: { label: "عن المشروع", icon: "i-info",
      desc: "أهداف المنصة ومنهجيتها وحدود دقتها ومصادر بياناتها.",
      need: "", get: "",
      kw: "منهجيه مصادر حدود دقه اهداف مشرف" },
    assistant: { label: "المساعد الذكي", icon: "i-chat",
      desc: "اسأل عن التلوث والمعالجة، ويقرأ المساعد بيانات المنصة وعيّناتك.",
      need: "مفتاح Gemini (مرة واحدة)", get: "إجابة علمية بالعربية",
      kw: "Gemini سؤال مساعد ذكاء اصطناعي محادثه" },
    review: { label: "مراجعة مساهمات الباحثين", icon: "i-check", hidden: true, desc: "", kw: "" }
  };

  /* الخطوة التالية بعد كل أداة: [الأداة، لماذا] */
  const NEXT = {
    monitor: [["analysis", "توقّع تراكيز الهواء واكشف الأيام الشاذة"], ["twin", "شاهد النهر ثلاثي الأبعاد"]],
    space: [["samples", "ثبّت نقطة العيّنة التي لفتت نظرك"], ["twin", "قارن مساحة الماء عبر السنين"]],
    twin: [["space", "اقرأ عكورة النهر وطحالبه بدقة 10 م"], ["plant", "صمّم معالجة لملوث متسرّب"]],
    analysis: [["reports", "اطبع تقرير الهواء PDF"], ["monitor", "عُد إلى القراءات الحية"]],
    samples: [["water", "احسب WQI وHPI لنتائج العيّنة"], ["analyzer", "حلّل نتائج كل العيّنات إحصائياً"]],
    water: [["plant", "صمّم معالجة لهذه المياه"], ["reports", "اطبع تقرير العيّنة PDF"]],
    analyzer: [["plant", "صمّم معالجة للملوثات المرتفعة"], ["reports", "اجمع النتائج في تقرير"]],
    calc: [["water", "قيّم العيّنة كاملة بمؤشر WQI"], ["plant", "انقل النتيجة إلى تصميم معالجة"]],
    palmer: [["water", "أكمل الصورة بالتحاليل الكيميائية"], ["reports", "اطبع تقرير المؤشر PDF"]],
    vision: [["water", "أدخل القيم المستخرجة في مختبر المياه"], ["palmer", "افحص شريحة طحالب من نفس الموقع"]],
    plant: [["reports", "اطبع تقرير التصميم PDF"], ["micro", "شاهد كيف تعمل البكتيريا في المعالجة الحيوية"]],
    river: [["plant", "صمّم المعالجة بأرقام حقيقية"], ["micro", "ادخل إلى المستوى المجهري"]],
    micro: [["plant", "طبّق المعالجة الحيوية في محطة"], ["molecules", "تعرّف على الملوث نفسه"]],
    molecules: [["plant", "صمّم طريقة إزالته"], ["calc", "احسب المخاطر الصحية HQ"]],
    research: [["gaps", "اعرف ماذا بقي دون دراسة"], ["analyzer", "قارن نتائجك بالمنشور"]],
    gaps: [["samples", "خطّط مواقع عيّناتك"], ["research", "اقرأ البحوث السابقة"]],
    reports: [["research", "راجع بحوث الجامعة"], ["analyzer", "حلّل جدول نتائجك"]],
    campus: [["about", "اعرف أهداف المنصة ومنهجيتها"]],
    about: [["campus", "تجوّل في القسم ثلاثي الأبعاد"]]
  };

  const has = id => !!document.getElementById("view-" + id);
  const SEC_OF = {};
  SECTIONS.forEach(s => { s.tools = s.tools.filter(has); s.tools.forEach(t => { SEC_OF[t] = s; }); });
  const PATH = SECTIONS.filter(s => s.n > 0);
  const secById = id => SECTIONS.find(s => s.id === id);

  const ico = (id, cls) => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = s => U.esc(s == null ? "" : String(s));

  /* ------------------------------------------------------------------
     بناء الواجهة الثابتة: القائمة العلوية، القائمة الجانبية، الشريط السفلي،
     صفحات الأقسام، مسار الرئيسية، التذييل، لوحة البحث
  ------------------------------------------------------------------ */
  function navHTML() {
    return SECTIONS.map(s => `<div class="nav-group" data-sec="${s.id}" style="--hue:${s.hue}">
      <a class="nav-btn" href="#${s.id}" data-sec-link="${s.id}">${ico(s.icon)}<span>${s.label}</span>${ico("i-chevd", "chev")}</a>
      <div class="mega">
        <div class="mega-head"><b>${esc(s.q)}</b><a href="#${s.id}">كل أدوات ${s.label}${ico("i-chev")}</a></div>
        <div class="mega-list">${s.tools.map(t => `<a href="#${t}" data-v="${t}" class="mega-item"><span class="mi-ic">${ico(TOOLS[t].icon)}</span><span><b>${esc(TOOLS[t].label)}${TOOLS[t].isNew ? ` <i class="tag-new">جديد</i>` : ""}</b><small>${esc(TOOLS[t].desc)}</small></span></a>`).join("")}</div>
      </div>
    </div>`).join("");
  }

  function drawerHTML() {
    return `<div class="drawer-head"><b>EcoBio <em>AI</em></b><button class="btn icon-btn btn-ghost" type="button" aria-label="إغلاق القائمة">${ico("i-close")}</button></div>
      <a href="#home" data-v="home">${ico("i-home")}<span>الرئيسية</span></a>
      ${SECTIONS.map(s => `<div class="dr-group" style="--hue:${s.hue}"><a class="dr-title" href="#${s.id}" data-sec-link="${s.id}">${ico(s.icon)}<span>${s.label}<small>${esc(s.q)}</small></span></a>
        ${s.tools.map(t => `<a href="#${t}" data-v="${t}" class="dr-item"><span>${esc(TOOLS[t].label)}${TOOLS[t].isNew ? ` <i class="tag-new">جديد</i>` : ""}</span></a>`).join("")}</div>`).join("")}
      <div class="dr-group"><a href="#assistant" data-v="assistant">${ico("i-chat")}<span>المساعد الذكي<small>اسأل عن التلوث والمعالجة</small></span></a>
      <button type="button" class="dr-btn" data-open-settings>${ico("i-gear")}<span>إعدادات المساعد</span></button></div>`;
  }

  function bottomHTML() {
    return `<a href="#home" data-v="home">${ico("i-home")}<span>الرئيسية</span></a>` +
      PATH.map(s => `<a href="#${s.id}" data-sec-link="${s.id}" style="--hue:${s.hue}">${ico(s.icon)}<span>${s.label}</span></a>`).join("");
  }

  function pathMini(cur) {
    return `<ol class="path-mini" aria-label="مراحل البحث البيئي">${PATH.map(s => `<li style="--hue:${s.hue}"${s.id === cur ? ' aria-current="step"' : ""}><a href="#${s.id}"><i>${s.n}</i>${s.label}</a></li>`).join("")}</ol>`;
  }

  function toolCard(t, feat) {
    const T = TOOLS[t];
    return `<a class="tool-card${feat ? " feat" : ""}" href="#${t}" data-v="${t}">
      <span class="tc-ic">${ico(T.icon)}</span>
      <span class="tc-body">
        <b class="tc-name">${esc(T.label)}${T.isNew ? ` <i class="tag-new">جديد</i>` : ""}</b>
        <span class="tc-desc">${esc(T.desc)}</span>
        ${T.need || T.get ? `<span class="tc-io">${T.need ? `<span><i>تحتاج</i>${esc(T.need)}</span>` : ""}${T.get ? `<span><i>تحصل على</i>${esc(T.get)}</span>` : ""}</span>` : ""}
      </span>
      ${ico("i-chev", "tc-go")}
    </a>`;
  }

  function hubHTML(s) {
    const nx = s.n > 0 ? PATH[s.n] : null;
    return `<div class="hub-hero">
      <div class="wrap hub-hero-in">
        <div class="hub-copy">
          ${s.n > 0 ? pathMini(s.id) : `<p class="kicker">${ico(s.icon)}${s.label}</p>`}
          <h1>${esc(s.q)}</h1>
          <p class="lead">${esc(s.lead)}</p>
        </div>
        <figure class="hub-photo"><img src="${s.photo.src}" alt="${esc(s.photo.alt)}" width="1280" height="720" loading="lazy" decoding="async"></figure>
      </div>
    </div>
    <div class="wrap hub-body">
      <h2 class="hub-h">${s.tools.length === 1 ? "الأداة" : `${s.tools.length} أدوات`} في قسم ${s.label}</h2>
      <div class="tool-list">${s.tools.map((t, i) => toolCard(t, i === 0)).join("")}</div>
      ${nx ? `<a class="hub-next" href="#${nx.id}" style="--hue:${nx.hue}"><span class="hn-k">المرحلة التالية</span><span class="hn-t"><b>${nx.label}</b>${esc(nx.q)}</span>${ico("i-chev")}</a>`
        : s.n === 4 ? `<a class="hub-next" href="#department" style="--hue:${secById("department").hue}"><span class="hn-k">تعرّف على القسم</span><span class="hn-t"><b>قسم علوم الحياة</b>جولة ثلاثية الأبعاد في المختبرات</span>${ico("i-chev")}</a>` : ""}
    </div>`;
  }

  function riverPathHTML() {
    return PATH.map(s => `<li class="rp-stop" style="--hue:${s.hue}">
      <a class="rp-node" href="#${s.id}" aria-label="المرحلة ${s.n}: ${s.label}">${ico(s.icon)}</a>
      <div class="rp-body">
        <span class="rp-n">المرحلة ${s.n}</span>
        <h3><a href="#${s.id}">${s.label}</a></h3>
        <p class="rp-q">${esc(s.q)}</p>
        <ul class="rp-tools">${s.tools.slice(0, 3).map(t => `<li><a href="#${t}">${ico(TOOLS[t].icon)}<span>${esc(TOOLS[t].label)}</span>${TOOLS[t].isNew ? `<i class="tag-new">جديد</i>` : ""}</a></li>`).join("")}</ul>
        <a class="rp-all" href="#${s.id}">${s.tools.length > 3 ? `كل أدوات ${s.label} (${s.tools.length})` : `ادخل قسم ${s.label}`}${ico("i-chev")}</a>
      </div>
    </li>`).join("");
  }

  function footHTML() {
    return `<div class="wrap foot-in">
      <div class="foot-brand">
        <a class="brand" href="#home" aria-label="EcoBio AI – الرئيسية"><svg viewBox="0 0 132 132" aria-hidden="true"><use href="#i-logo"/></svg><b>EcoBio <em>AI</em></b></a>
        <p>منصة مفتوحة لرصد التلوث البيئي ومعالجته، من قسم علوم الحياة في كلية التربية للعلوم الصرفة – جامعة تكريت.</p>
        <p class="foot-src">مصادر البيانات: Copernicus CAMS · Open-Meteo · NASA GIBS · Sentinel-2 · Landsat · المواصفة العراقية 417 · إرشادات WHO 2021</p>
      </div>
      ${SECTIONS.map(s => `<nav class="foot-col" aria-label="${s.label}" style="--hue:${s.hue}"><a class="fc-h" href="#${s.id}">${s.label}</a>${s.tools.map(t => `<a href="#${t}">${esc(TOOLS[t].label)}</a>`).join("")}</nav>`).join("")}
    </div>
    <div class="wrap foot-bar"><span id="foot-l"></span><a href="#assistant">المساعد الذكي</a></div>`;
  }

  function buildShell() {
    const nav = U.$("#nav"); if (nav) nav.innerHTML = navHTML();
    const dp = U.$("#drawer-panel"); if (dp) dp.innerHTML = drawerHTML();
    const bb = U.$("#bottombar"); if (bb) bb.innerHTML = bottomHTML();
    const rp = U.$("#river-path"); if (rp) rp.innerHTML = riverPathHTML();
    const ft = U.$("#foot"); if (ft) ft.innerHTML = footHTML();
    const main = U.$("main");
    SECTIONS.forEach(s => {
      if (document.getElementById("view-" + s.id)) return;
      const el = document.createElement("section");
      el.className = "view hub"; el.id = "view-" + s.id; el.dataset.title = s.label; el.style.setProperty("--hue", s.hue);
      el.innerHTML = hubHTML(s);
      main.appendChild(el);
    });
    buildPalette();
  }

  /* ------------------------------------------------------------------
     «أنت هنا» + أدوات القسم نفسه + الخطوة التالية (تُضاف لكل أداة مرة واحدة)
  ------------------------------------------------------------------ */
  function decorate(v) {
    const view = document.getElementById("view-" + v), s = SEC_OF[v];
    if (!view || view.dataset.decorated) return;
    view.dataset.decorated = "1";
    if (s) {
      view.style.setProperty("--hue", s.hue);
      const sibs = s.tools.length > 1 ? `<div class="sibs" role="list">${s.tools.map(t => `<a role="listitem" href="#${t}"${t === v ? ' aria-current="page"' : ""}>${ico(TOOLS[t].icon)}<span>${esc(TOOLS[t].label)}</span></a>`).join("")}</div>` : "";
      const cr = document.createElement("nav");
      cr.className = "crumbs"; cr.setAttribute("aria-label", "أنت هنا");
      cr.innerHTML = `<div class="crumbs-in"><ol class="crumb-trail"><li><a href="#home">الرئيسية</a></li><li><a class="c-sec" href="#${s.id}">${ico(s.icon)}${s.label}</a></li><li aria-current="page">${esc(TOOLS[v].label)}</li></ol>${sibs}</div>`;
      view.insertBefore(cr, view.firstChild);
    }
    const nx = (NEXT[v] || []).filter(([t]) => has(t));
    if (nx.length) {
      const box = document.createElement("div");
      box.className = "wrap next-wrap";
      box.innerHTML = `<aside class="next-steps" aria-label="الخطوة التالية"><h2>الخطوة التالية</h2><div class="ns-list">${nx.map(([t, why]) => {
        const ts = SEC_OF[t];
        return `<a class="ns-card" href="#${t}" style="--hue:${ts ? ts.hue : "var(--river)"}"><span class="tc-ic">${ico(TOOLS[t].icon)}</span><span><small>${esc(why)}</small><b>${esc(TOOLS[t].label)}</b></span>${ico("i-chev", "tc-go")}</a>`;
      }).join("")}</div></aside>`;
      view.appendChild(box);
    }
  }

  /* ------------------------------------------------------------------
     الموجّه
  ------------------------------------------------------------------ */
  const VIEW_IDS = new Set(["home", ...SECTIONS.map(s => s.id), ...Object.keys(TOOLS).filter(has)]);
  let current = null;
  const titleOf = v => v === "home" ? "EcoBio AI" : `${(TOOLS[v] || secById(v) || {}).label || ""} · EcoBio AI`;

  function route() {
    const raw = decodeURIComponent((location.hash || "#home").slice(1));
    const id = raw.split("=")[0].split("&")[0];
    const v = VIEW_IDS.has(id) ? id : "home";
    if (v === current) return;
    if (current && ECO.views[current] && ECO.views[current].hide) { try { ECO.views[current].hide(); } catch (e) { console.error(e); } }
    decorate(v);
    U.$$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
    const sec = secById(v) ? v : (SEC_OF[v] ? SEC_OF[v].id : null);
    U.$$("[data-v]").forEach(a => a.classList.toggle("active", a.dataset.v === v));
    U.$$("[data-sec-link]").forEach(a => a.classList.toggle("active", a.dataset.secLink === sec));
    U.$$(".nav-group").forEach(g => g.classList.toggle("active", g.dataset.sec === sec));
    document.body.dataset.view = v;
    document.body.dataset.sec = sec || "";
    const mod = ECO.views[v];
    if (mod) {
      if (!mod._inited && mod.init) { try { mod.init(); } catch (e) { console.error(e); } mod._inited = true; }
      if (mod.show) { try { mod.show(); } catch (e) { console.error(e); } }
    }
    current = v;
    document.title = titleOf(v);
    U.$("#drawer").hidden = true;
    closePalette();
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  ECO.go = id => { if (location.hash === "#" + id) route(); else location.hash = id; };

  /* ------------------------------------------------------------------
     البحث السريع عن أداة (زر البحث، أو / أو Ctrl+K)
  ------------------------------------------------------------------ */
  const norm = s => String(s || "").toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
    .replace(/[₀-₉]/g, d => String(d.charCodeAt(0) - 0x2080));
  let INDEX = [];
  function buildIndex() {
    INDEX = Object.keys(TOOLS).filter(t => has(t) && !TOOLS[t].hidden).map(t => {
      const T = TOOLS[t], s = SEC_OF[t];
      return { id: t, kind: "tool", label: T.label, icon: T.icon, sec: s ? s.label : "أداة عامة", hue: s ? s.hue : "#4fc8dc", desc: T.desc,
        L: norm(T.label), K: norm(T.kw + " " + (T.need || "") + " " + (T.get || "")), D: norm(T.desc), S: norm(s ? s.label : "") };
    }).concat(SECTIONS.map(s => ({ id: s.id, kind: "sec", label: "قسم " + s.label, icon: s.icon, sec: "قسم", hue: s.hue, desc: s.q,
      L: norm(s.label), K: "", D: norm(s.q + " " + s.lead), S: "" })));
  }
  function search(q) {
    const toks = norm(q).split(/[\s،,]+/).filter(Boolean).map(t => t.length > 3 && t.startsWith("ال") ? t.slice(2) : t);
    if (!toks.length) return null;
    return INDEX.map(e => {
      let sc = 0;
      for (const t of toks) {
        let m = 0;
        if (e.L.startsWith(t)) m = 30; else if (e.L.includes(t)) m = 20;
        if (!m && e.K.includes(t)) m = 12;
        if (!m && e.D.includes(t)) m = 6;
        if (!m && e.S.includes(t)) m = 4;
        if (!m) return null;
        sc += m;
      }
      return { e, sc: sc + (e.kind === "tool" ? 1 : 0) };
    }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 8).map(x => x.e);
  }
  const SUGGEST = ["water", "analyzer", "plant", "monitor", "palmer", "research"];

  function buildPalette() {
    if (U.$("#palette")) return;
    const el = document.createElement("div");
    el.className = "palette"; el.id = "palette"; el.hidden = true;
    el.innerHTML = `<div class="pal-box" role="dialog" aria-modal="true" aria-labelledby="pal-label">
      <div class="pal-in">${ico("i-search")}<label id="pal-label" for="pal-q" class="sr-only">ابحث عن أداة أو مؤشر أو ملوث</label>
        <input id="pal-q" type="search" autocomplete="off" spellcheck="false" placeholder="ابحث: WQI، رصاص، طحالب، Sentinel…" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list">
        <button type="button" class="btn icon-btn btn-ghost" data-pal-close aria-label="إغلاق البحث">${ico("i-close")}</button></div>
      <div class="pal-res" id="pal-list" role="listbox" aria-label="النتائج"></div>
      <p class="pal-hint"><kbd>↑</kbd><kbd>↓</kbd> للتنقل · <kbd>Enter</kbd> للفتح · <kbd>Esc</kbd> للإغلاق</p>
    </div>`;
    document.body.appendChild(el);
    const q = U.$("#pal-q");
    q.addEventListener("input", () => renderPal(q.value));
    q.addEventListener("keydown", e => {
      const items = U.$$("#pal-list [role=option]"); let i = items.findIndex(x => x.getAttribute("aria-selected") === "true");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!items.length) return;
        i = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items.forEach((x, k) => x.setAttribute("aria-selected", String(k === i)));
        q.setAttribute("aria-activedescendant", items[i].id); items[i].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault(); const it = items[Math.max(i, 0)]; if (it) it.click();
      }
    });
    el.addEventListener("click", e => {
      if (e.target === el || e.target.closest("[data-pal-close]")) closePalette();
      const ask = e.target.closest("[data-pal-ask]");
      if (ask) { const text = q.value.trim(); closePalette(); ECO.go("assistant"); setTimeout(() => { const t = U.$("#chat-text"); if (t) { t.value = text; t.focus(); } }, 250); }
    });
  }
  function renderPal(qv) {
    const box = U.$("#pal-list"), r = search(qv);
    const list = r || SUGGEST.filter(has).map(t => INDEX.find(e => e.id === t)).filter(Boolean);
    if (r && !r.length) {
      box.innerHTML = `<div class="pal-empty"><b>لا توجد أداة تطابق «${esc(qv)}»</b><span>جرّب كلمة أقصر، مثل: WQI أو رصاص أو طحالب أو هواء.</span><button type="button" class="btn btn-sm" data-pal-ask>${ico("i-chat")}اسأل المساعد عن «${esc(qv)}»</button></div>`;
      U.$("#pal-q").removeAttribute("aria-activedescendant");
      return;
    }
    box.innerHTML = (r ? "" : `<p class="pal-cap">الأكثر استخداماً</p>`) + list.map((e, i) =>
      `<a id="pal-o${i}" role="option" aria-selected="${i === 0}" href="#${e.id}" style="--hue:${e.hue}"><span class="tc-ic">${ico(e.icon)}</span><span class="po-t"><b>${esc(e.label)}</b><small>${esc(e.sec)} · ${esc(e.desc)}</small></span></a>`).join("");
    U.$("#pal-q").setAttribute("aria-activedescendant", "pal-o0");
  }
  let palReturn = null;
  function openPalette() {
    const el = U.$("#palette"); if (!el) return;
    if (!INDEX.length) buildIndex();
    palReturn = document.activeElement;
    el.hidden = false; const q = U.$("#pal-q"); q.value = ""; renderPal(""); setTimeout(() => q.focus(), 20);
  }
  function closePalette() {
    const el = U.$("#palette"); if (!el || el.hidden) return;
    el.hidden = true; if (palReturn && palReturn.focus) palReturn.focus();
  }
  ECO.openSearch = openPalette;

  /* ------------------------------------------------------------------
     التفاعلات العامة
  ------------------------------------------------------------------ */
  function wire() {
    document.addEventListener("click", e => {
      const op = e.target.closest("[data-open-search]"); if (op) { e.preventDefault(); openPalette(); return; }
      const sc = e.target.closest("[data-scroll]");
      if (sc) { e.preventDefault(); const t = U.$(sc.dataset.scroll); if (t) { t.scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" }); const f = t.querySelector("h2, a"); if (f) f.focus({ preventScroll: true }); } return; }
      const sk = e.target.closest("[data-skip]");
      if (sk) { e.preventDefault(); const m = U.$(".view.active h1, .view.active h2"); if (m) { m.setAttribute("tabindex", "-1"); m.focus(); } return; }
      const st = e.target.closest("[data-open-settings]"); if (st) { U.$("#drawer").hidden = true; const b = U.$("#open-settings"); if (b) b.click(); return; }
      // إغلاق القائمة المنسدلة بعد اختيار أداة (تبقى مفتوحة ما دام المؤشر فوقها)
      const mi = e.target.closest(".nav-group a"); if (mi) { const g = mi.closest(".nav-group"); g.classList.add("closed"); g.addEventListener("mouseleave", () => g.classList.remove("closed"), { once: true }); }
    });
    document.addEventListener("keydown", e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openPalette(); }
      else if (e.key === "/" && !typing) { e.preventDefault(); openPalette(); }
      else if (e.key === "Escape") { closePalette(); U.$("#drawer").hidden = true; }
    });
    const dr = U.$("#drawer");
    U.$("#open-menu").onclick = e => { dr.hidden = false; if (e.detail === 0) { const f = dr.querySelector("a.active, a"); if (f) f.focus(); } };
    dr.addEventListener("click", e => { if (e.target === dr || e.target.closest("a") || e.target.closest(".drawer-head button")) dr.hidden = true; });
  }

  buildShell();
  ECO.SECTIONS = SECTIONS; ECO.TOOLS = TOOLS; ECO.NAV = Object.keys(TOOLS).map(id => Object.assign({ id }, TOOLS[id]));
  ECO.router = { start() { wire(); window.addEventListener("hashchange", route); route(); }, current: () => current };
})();
