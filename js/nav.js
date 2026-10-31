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
      lead: "قاعدة بيانات يومية لكل قضاء على دجلة مع توقّعات الذكاء الاصطناعي، وقراءات حية من الأقمار الصناعية لهواء صلاح الدين ونهر دجلة، وصور فضائية للنهر منذ عام 1984.",
      tools: ["districts", "monitor", "space", "twin", "analysis"] },
    { id: "analyze", n: 2, label: "التحليل", icon: "i-flask", hue: "#e6ae4f",
      q: "عندك عيّنة أو نتائج مختبر؟",
      lead: "ثبّت موقع العيّنة، واحسب مؤشرات جودتها، واقرأ صور الماء وشرائح الطحالب، وحلّل جداول نتائجك إحصائياً.",
      tools: ["samples", "water", "qc", "analyzer", "sources", "trend", "calc", "palmer", "vision"] },
    { id: "treat", n: 3, label: "المعالجة", icon: "i-leaf", hue: "#93dd8a",
      q: "كيف تُزال هذه الملوثات؟",
      lead: "صمّم سلسلة معالجة لمياهك وتنبّأ بكفاءتها قبل أي تجربة، وتعرّف على آليات المعالجة الحيوية والنباتية بنماذج ثلاثية الأبعاد.",
      tools: ["exp", "plant", "river", "micro", "molecules"] },
    { id: "labs", n: 0, label: "المختبر", icon: "i-lab", hue: "#b493ff",
      q: "جرّب التجربة العملية قبل أن تدخل المختبر",
      lead: "مختبر افتراضي ثلاثي الأبعاد لتجارب المعالجة والتلوث: اختبار الجرة، والامتزاز، وBOD₅، والعسرة، والعناصر الثقيلة في القصب. تختار الأداة بنفسك وتشاهد التفاعل، والنتائج من بحوث منشورة.",
      tools: ["lab"] },
    { id: "studies", n: 4, label: "البحث", icon: "i-book", hue: "#a5b6ff",
      q: "ماذا دُرس قبلك، وماذا بقي؟",
      lead: "بحوث جامعة تكريت المنشورة على الخريطة، والمواقع والملوثات التي لم تُدرس بعد، وتقارير PDF جاهزة للعرض على المشرف.",
      tools: ["research", "scholar", "gaps", "reports"] },
    { id: "help", n: 0, label: "الدليل", icon: "i-learn", hue: "#f0a6c8",
      q: "كيف تستعمل المنصة في بحثك؟",
      lead: "درس لكل أداة بمنهجيتها ومراجعها وحدود دقتها، ومسارات جاهزة حسب نوع بحثك، وأسئلة يجيب عنها Gemini من دليل المنصة نفسه.",
      tools: ["learn", "faq", "assistant"] },
    { id: "department", n: 0, label: "القسم", icon: "i-building", hue: "#c4d3cf",
      q: "قسم علوم الحياة – جامعة تكريت",
      lead: "تجوّل في القسم ومختبراته بثلاثة أبعاد، وتعرّف على أهداف المنصة ومنهجيتها وحدود دقتها.",
      tools: ["campus", "about"] }
  ];

  /* مجموعات القائمة العلوية: ست بوابات واضحة. «المختبر» رابط مباشر،
     و«المنصة» تجمع الدليل والقسم (روابط الأقسام نفسها لم تتغير) */
  const NAV_GROUPS = [
    { secs: ["observe"] }, { secs: ["analyze"] }, { secs: ["treat"] },
    { secs: ["labs"], direct: "lab", badge: "3D" },
    { secs: ["studies"] },
    { secs: ["help", "department"], label: "المنصة", icon: "i-learn", hue: "#c4d3cf", q: "كيف تستعمل المنصة، ومن يقف وراءها؟" }
  ];

  /* ------------------------------------------------------------------
     الأدوات
  ------------------------------------------------------------------ */
  const TOOLS = {
    districts: { label: "قاعدة بيانات أقضية دجلة", icon: "i-db", isNew: true,
      desc: "سجل يومي لكل قضاء من الأقضية الستة على دجلة: قياسات أرضية حقيقية من محطات الأرصاد، وتقديرات الهواء والطقس والتصريف وعكورة الماء، مع توقّعات الذكاء الاصطناعي وكشف الأيام الشاذة.",
      need: "لا شيء، تتحدّث يومياً", get: "لوحة لكل قضاء وتوقّع الغد ورسوم وجداول Excel",
      kw: "قاعده بيانات اقضيه قضاء الشرقاط بيجي تكريت الدور سامراء بلد سجل تاريخي تصريف ERA5 GloFAS Sentinel ذكاء اصطناعي توقع شذوذ Random Forest غابه عشوائيه MLP K-Means تجميع Excel" },
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
    qc: { label: "مدقق نتائج المختبر", icon: "i-check", isNew: true,
      desc: "يفحص صحة نتائج تحليل المياه قبل الإحصاء بمعايير Standard Methods: توازن الأيونات، وTDS مقابل التوصيلية، والعسرة، وتشبع الأكسجين، وBOD/COD، والوحدات، والقيم الشاذة.",
      need: "جدول نتائج مختبرك (Excel أو CSV)", get: "حكم مقبول/تحقّق/مرفوض لكل عيّنة وسببه، وفقرة منهجية",
      kw: "مدقق فحص ضبط جودة QA QC توازن الايونات كاتيونات انيونات مليمكافئ TDS EC توصيلية عسرة كالسيوم مغنيسيوم صوديوم بوتاسيوم بيكاربونات كلوريد كبريتات تشبع الاكسجين BOD COD قيم شاذة وحدات Standard Methods 1030E APHA" },
    sources: { label: "مصادر التلوث", icon: "i-src", isNew: true,
      desc: "من جدول عيّناتك إلى مصادر التلوث: تحليل المكوّنات الرئيسة مع Varimax وKMO وBartlett، ونسبة مساهمة كل مصدر بـ APCS-MLR، والتجميع الهرمي بطريقة Ward، مع بصمات المصادر الشائعة في الأدبيات.",
      need: "جدول عيّنات بعدة متغيرات (عناصر ثقيلة، أيونات، ملوثات هواء)", get: "المكوّنات والتحميلات ونسب المساهمة والمجاميع وفقرة منهجية",
      kw: "مصادر التلوث تحليل المكونات الرئيسة PCA تحليل عاملي factor analysis varimax KMO Bartlett scree التحليل الموازي APCS MLR receptor model توزيع المصادر source apportionment تجميع هرمي cluster Ward dendrogram شجرة تجميع ارتباط بيرسون عناصر ثقيلة مصدر طبيعي بشري" },
    trend: { label: "الاتجاه الزمني", icon: "i-trend", isNew: true,
      desc: "هل يزداد الملوث أو يقل عبر السنين وبكم في السنة؟ Mann–Kendall الأصلي والمعدّل للارتباط الذاتي، وKendall الموسمي، وميل Sen بفترة ثقة، وPettitt لنقطة التغيّر، على تصريف دجلة وطقس وهواء الأقضية أو على جدولك.",
      need: "سلسلة قيم مؤرخة (سنة أو شهر أو يوم)، أو اختر متغيراً من بيانات المنصة", get: "الاتجاه ومعنويته وميله في السنة وسنة التغيّر ورسم وفقرة منهجية",
      kw: "اتجاه زمني trend مان كندال Mann Kendall سين Sen slope ميل هامد راو Hamed Rao ارتباط ذاتي autocorrelation موسمي seasonal Kendall Hirsch بيتيت Pettitt نقطة تغير change point homogeneity سلسلة زمنية time series تغير مناخ ارتفاع الحرارة تصريف النهر تراجع" },
    exp: { label: "مصمّم ومحلّل التجارب", icon: "i-flask", isNew: true,
      desc: "صمّم تجارب المعالجة بـ Box–Behnken أو CCD وحلّلها بـ ANOVA لتجد الظروف المثلى، واحسب جرعة اختبار الجرة، وقارن نماذج الامتزاز بـ AICc، وثوابت التحلل ونصف العمر ومعاملات النمو.",
      need: "عواملك ومستوياتها، أو نتائج تجاربك", get: "جدول التجارب، الظروف المثلى، أفضل نموذج، ثوابت السرعة",
      kw: "تصميم تجارب RSM سطح الاستجابة Box Behnken CCD مركب مركزي ANOVA عدم الملاءمة ظروف مثلى تحسين optimization اختبار الجرة جرعة مخثر شب امتزاز ايزوثيرم لانكماير فرندلش تمكين سيبس ريدليتش بيترسون دوبينين حركية رتبة اولى ثانية كاذبة ايلوفيتش انتشار AICc تحلل نصف عمر ثابت السرعة نمو بكتيري Gompertz طور التأخر" },
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
    lab: { label: "المختبر الافتراضي 3D", icon: "i-lab", isNew: true,
      desc: "خمس تجارب عملية تنفّذها خطوة بخطوة في مختبر ثلاثي الأبعاد: اختبار الجرة بالشب، وامتزاز الرصاص على كاربون ليف النخيل، وBOD₅ بطريقة ونكلر وعسرة ماء دجلة في تكريت، والعناصر الثقيلة في قصب قناة مصفى بيجي.",
      need: "لا شيء", get: "تجربة كاملة بخطواتها ودفتر نتائج حقيقية من بحوث منشورة",
      kw: "مختبر افتراضي تجربة عملية محاكاة ثلاثي الابعاد 3D اختبار الجرة jar test شب تخثير تلبيد عكارة امتزاز رصاص كاربون منشط ليف النخيل لانكماير فرندلش BOD ونكلر اوكسجين مذاب حضن عسرة EDTA EBT تسحيح سحاحة عناصر ثقيلة قصب هضم امتصاص ذري AAS بيجي TF BCF" },
    research: { label: "بحوث جامعة تكريت", icon: "i-book",
      desc: "نتائج منشورة لباحثي الجامعة على الخريطة وفي جداول، ومنها بحث المشرفة عن بكتيريا دجلة في تكريت.",
      need: "لا شيء", get: "قيم منشورة مع مرجعها الكامل",
      kw: "بحوث منشوره جامعه تكريت مراجع دراسات سابقه DOI مجله" },
    scholar: { label: "الباحث الذكي", icon: "i-search", isNew: true,
      desc: "اسأل الأدبيات العلمية فيجيبك من بحوث حقيقية مع مراجعها، واستخرج قيم أي بحث PDF، وقارن طرق معالجة أي ملوث.",
      need: "سؤال أو ملف بحث", get: "إجابة موثقة بالمراجع وجداول قيم",
      kw: "بحث علمي ادبيات مراجع مصادر ملخص pdf استخراج معالجة ازالة openalex scholar" },
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
    learn: { label: "دليل المنصة", icon: "i-learn", isNew: true,
      desc: "درس عملي لكل أداة: لمن هي، وخطوات العمل، وكيف تقرأ النتيجة، والمنهجية ومراجعها، وحدود الدقة، مع مسارات حسب نوع بحثك.",
      need: "لا شيء", get: "طريقة صحيحة لاستعمال كل أداة في رسالتك",
      kw: "دليل تعليم شرح درس دروس طريقة الاستخدام كيف استخدم خطوات منهجية مراجع حدود الدقة مسار استشهاد" },
    faq: { label: "الأسئلة والأجوبة", icon: "i-qa", isNew: true,
      desc: "اسأل عن أي أداة أو بيانات أو منهجية، فيجيبك Gemini من دليل المنصة مع روابط الأدوات، وأسئلة شائعة بإجابات موثقة.",
      need: "سؤالك", get: "إجابة مبنية على دليل المنصة",
      kw: "اسئلة اجوبة سؤال شائع مساعدة استفسار مشكلة دعم Gemini" },
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
    districts: [["trend", "اختبر اتجاه التصريف أو الحرارة عبر السنين"], ["analyzer", "حلّل جدولاً صدّرته من القاعدة إحصائياً"]],
    monitor: [["analysis", "توقّع تراكيز الهواء واكشف الأيام الشاذة"], ["twin", "شاهد النهر ثلاثي الأبعاد"]],
    space: [["samples", "ثبّت نقطة العيّنة التي لفتت نظرك"], ["twin", "قارن مساحة الماء عبر السنين"]],
    twin: [["space", "اقرأ عكورة النهر وطحالبه بدقة 10 م"], ["plant", "صمّم معالجة لملوث متسرّب"]],
    analysis: [["reports", "اطبع تقرير الهواء PDF"], ["monitor", "عُد إلى القراءات الحية"]],
    samples: [["water", "احسب WQI وHPI لنتائج العيّنة"], ["qc", "افحص صحة النتائج قبل التحليل"]],
    water: [["plant", "صمّم معالجة لهذه المياه"], ["reports", "اطبع تقرير العيّنة PDF"]],
    qc: [["analyzer", "حلّل البيانات بعد تصحيحها إحصائياً"], ["water", "احسب WQI وHPI لكل عيّنة"]],
    sources: [["calc", "احسب Igeo وEF للعناصر التي ظهرت في مصدر بشري"], ["analyzer", "قارن المحطات بـ ANOVA ودنكن"]],
    exp: [["plant", "انقل الظروف المثلى إلى تصميم محطة"], ["lab", "جرّب اختبار الجرة والامتزاز في المختبر الافتراضي"]],
    analyzer: [["sources", "حدّد مصادر التلوث بـ PCA وAPCS-MLR"], ["trend", "اختبر اتجاه القيم عبر السنين"]],
    trend: [["districts", "صدّر سلسلة قضاء آخر من القاعدة"], ["analyzer", "قارن الفترتين قبل نقطة التغيّر وبعدها"]],
    calc: [["water", "قيّم العيّنة كاملة بمؤشر WQI"], ["plant", "انقل النتيجة إلى تصميم معالجة"]],
    palmer: [["water", "أكمل الصورة بالتحاليل الكيميائية"], ["reports", "اطبع تقرير المؤشر PDF"]],
    vision: [["water", "أدخل القيم المستخرجة في مختبر المياه"], ["palmer", "افحص شريحة طحالب من نفس الموقع"]],
    plant: [["reports", "اطبع تقرير التصميم PDF"], ["micro", "شاهد كيف تعمل البكتيريا في المعالجة الحيوية"]],
    river: [["plant", "صمّم المعالجة بأرقام حقيقية"], ["micro", "ادخل إلى المستوى المجهري"]],
    micro: [["plant", "طبّق المعالجة الحيوية في محطة"], ["molecules", "تعرّف على الملوث نفسه"]],
    molecules: [["plant", "صمّم طريقة إزالته"], ["calc", "احسب المخاطر الصحية HQ"]],
    lab: [["exp", "صمّم تجربتك الحقيقية وحلّلها بـ ANOVA"], ["calc", "احسب BOD وLangmuir وBCF لنتائجك"]],
    research: [["gaps", "اعرف ماذا بقي دون دراسة"], ["analyzer", "قارن نتائجك بالمنشور"]],
    gaps: [["samples", "خطّط مواقع عيّناتك"], ["research", "اقرأ البحوث السابقة"]],
    reports: [["research", "راجع بحوث الجامعة"], ["analyzer", "حلّل جدول نتائجك"]],
    learn: [["faq", "اسأل عما لم تجده في الدليل"], ["analyzer", "ابدأ بتحليل جدول نتائجك"]],
    faq: [["learn", "اقرأ درس الأداة كاملاً"], ["scholar", "اجمع المراجع المنشورة لموضوعك"]],
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
  const groupOf = g => {
    const ss = g.secs.map(secById).filter(Boolean), s0 = ss[0];
    return { ss, id: g.secs.join(" "), label: g.label || s0.label, icon: g.icon || s0.icon, hue: g.hue || s0.hue, q: g.q || s0.q,
      tools: ss.flatMap(x => x.tools), href: "#" + (g.direct || s0.id), n: ss.length === 1 ? s0.n : 0 };
  };
  const megaItem = t => `<a href="#${t}" data-v="${t}" class="mega-item"><span class="mi-ic">${ico(TOOLS[t].icon)}</span><span class="mi-t"><b>${esc(TOOLS[t].label)}${TOOLS[t].isNew ? ` <i class="tag-new">جديد</i>` : ""}</b><small>${esc(TOOLS[t].desc)}</small></span></a>`;
  function navHTML() {
    return NAV_GROUPS.map(g => {
      const G = groupOf(g);
      if (g.direct) return `<div class="nav-group is-direct" data-sec="${G.id}" style="--hue:${G.hue}"><a class="nav-btn" href="#${g.direct}" data-v="${g.direct}">${ico(G.icon, "nav-ic")}<span>${G.label}</span>${g.badge ? `<i class="nav-badge">${g.badge}</i>` : ""}</a></div>`;
      const links = G.ss.length > 1 ? G.ss.map(x => `<a href="#${x.id}">${esc(x.label)}${ico("i-chev")}</a>`).join("") : `<a href="#${G.ss[0].id}">كل أدوات ${G.label} (${G.tools.length})${ico("i-chev")}</a>`;
      return `<div class="nav-group" data-sec="${G.id}" style="--hue:${G.hue}">
      <a class="nav-btn" href="${G.href}" aria-haspopup="true">${ico(G.icon, "nav-ic")}<span>${G.label}</span>${ico("i-chevd", "chev")}</a>
      <div class="mega"><div class="mega-in">
        <div class="mega-intro">${G.n ? `<span class="mg-idx">0${G.n} — مرحلة البحث</span>` : `<span class="mg-idx">${ico(G.icon)}</span>`}<b class="mg-t">${G.label}</b><p>${esc(G.q)}</p><div class="mg-links">${links}<a href="#tools" class="mg-all">كل أدوات المنصة${ico("i-chev")}</a></div></div>
        <div class="mega-list${G.tools.length > 4 ? " two" : ""}">${G.tools.map(megaItem).join("")}</div>
      </div></div>
    </div>`;
    }).join("");
  }

  function drawerHTML() {
    return `<div class="drawer-head"><b>EcoBio <em>AI</em></b><button class="btn icon-btn btn-ghost" type="button" aria-label="إغلاق القائمة">${ico("i-close")}</button></div>
      <div class="dr-top"><a class="dr-home" href="#home" data-v="home">${ico("i-home")}<span>الرئيسية</span></a><a class="dr-home" href="#tools" data-v="tools">${ico("i-grid")}<span>كل الأدوات</span></a><button type="button" class="dr-home" data-open-search>${ico("i-search")}<span>ابحث</span></button></div>
      ${SECTIONS.map(s => `<div class="dr-group" style="--hue:${s.hue}"><a class="dr-title" href="#${s.id}" data-sec-link="${s.id}">${s.n ? `<i class="dr-n">0${s.n}</i>` : ico(s.icon)}<span>${s.label}<small>${esc(s.q)}</small></span></a>
        ${s.tools.map(t => `<a href="#${t}" data-v="${t}" class="dr-item"><span>${esc(TOOLS[t].label)}${TOOLS[t].isNew ? ` <i class="tag-new">جديد</i>` : ""}</span></a>`).join("")}</div>`).join("")}
      <div class="dr-group"><button type="button" class="dr-btn" data-open-settings>${ico("i-gear")}<span>إعدادات المساعد</span></button></div>`;
  }

  /* الشريط السفلي (الهاتف والتطبيق): خمس تبويبات ثابتة */
  const TABS = [["home", "i-home", "الرئيسية"], ["tools", "i-grid", "الأدوات"], ["lab", "i-lab", "المختبر"], ["assistant", "i-chat", "المساعد"]];
  function bottomHTML() {
    return TABS.filter(([v]) => v === "home" || v === "tools" || has(v)).map(([v, ic, l]) => `<a href="#${v}" data-tab="${v}">${ico(ic)}<span>${l}</span></a>`).join("") +
      `<button type="button" data-open-menu aria-label="القائمة الكاملة">${ico("i-menu")}<span>القائمة</span></button>`;
  }
  const tabOf = v => v === "home" || v === "lab" || v === "assistant" ? v : "tools";

  function pathMini(cur) {
    return `<ol class="path-mini" aria-label="مراحل البحث البيئي">${PATH.map(s => `<li style="--hue:${s.hue}"${s.id === cur ? ' aria-current="step"' : ""}><a href="#${s.id}"><i>${s.n}</i>${s.label}</a></li>`).join("")}</ol>`;
  }

  function toolCard(t, feat, i) {
    const T = TOOLS[t];
    return `<a class="tool-card${feat ? " feat" : ""}" href="#${t}" data-v="${t}">
      ${i != null ? `<span class="tc-n">${String(i + 1).padStart(2, "0")}</span>` : ""}<span class="tc-ic">${ico(T.icon)}</span>
      <span class="tc-body">
        <b class="tc-name">${esc(T.label)}${T.isNew ? ` <i class="tag-new">جديد</i>` : ""}</b>
        <span class="tc-desc">${esc(T.desc)}</span>
        ${T.need || T.get ? `<span class="tc-io">${T.need ? `<span><i>تحتاج</i>${esc(T.need)}</span>` : ""}${T.get ? `<span><i>تحصل على</i>${esc(T.get)}</span>` : ""}</span>` : ""}
      </span>
      ${ico("i-chev", "tc-go")}
    </a>`;
  }

  const art = key => (ECO.illus ? ECO.illus(key) : "");
  function hubHTML(s) {
    const nx = s.n > 0 ? PATH[s.n] : null;
    return `<div class="hub-hero">
      <div class="wrap hub-hero-in">
        <div class="hub-copy">
          ${s.n > 0 ? pathMini(s.id) : `<p class="kicker">${ico(s.icon)}${s.label}</p>`}
          <h1>${esc(s.q)}</h1>
          <p class="lead">${esc(s.lead)}</p>
          <a class="hub-jump" href="#tools" data-tools-sec="${s.id}">${ico("i-grid")}<span>${s.tools.length === 1 ? "أداة واحدة" : `${s.tools.length} أدوات`} في هذا القسم · كل أدوات المنصة</span></a>
        </div>
        <div class="hub-art" aria-hidden="true">${art(s.id)}</div>
      </div>
    </div>
    <div class="wrap hub-body">
      <h2 class="hub-h"><span>${s.tools.length === 1 ? "الأداة" : `${s.tools.length} أدوات`}</span> في قسم ${s.label}</h2>
      <div class="tool-list">${s.tools.map((t, i) => toolCard(t, i === 0, i)).join("")}</div>
      ${nx ? `<a class="hub-next" href="#${nx.id}" style="--hue:${nx.hue}"><span class="hn-k">المرحلة التالية · 0${nx.n}</span><span class="hn-t"><b>${nx.label}</b>${esc(nx.q)}</span>${ico("i-chev")}</a>`
        : s.n === 4 ? `<a class="hub-next" href="#department" style="--hue:${secById("department").hue}"><span class="hn-k">تعرّف على القسم</span><span class="hn-t"><b>قسم علوم الحياة</b>جولة ثلاثية الأبعاد في المختبرات</span>${ico("i-chev")}</a>` : ""}
    </div>`;
  }

  /* مراحل البحث الأربع في الرئيسية: بطاقة لكل مرحلة برسمها المتحرك */
  function stagesHTML() {
    return PATH.map(s => `<li class="stg" style="--hue:${s.hue}">
      <article class="stg-card">
        <a class="stg-art" href="#${s.id}" tabindex="-1" aria-hidden="true">${art(s.id)}</a>
        <div class="stg-body">
          <span class="stg-n">المرحلة 0${s.n}</span>
          <h3><a href="#${s.id}">${s.label}</a></h3>
          <p class="stg-q">${esc(s.q)}</p>
          <ul class="stg-tools">${s.tools.slice(0, 3).map(t => `<li><a href="#${t}">${ico(TOOLS[t].icon)}<span>${esc(TOOLS[t].label)}</span>${TOOLS[t].isNew ? `<i class="tag-new">جديد</i>` : ""}</a></li>`).join("")}</ul>
          <a class="stg-all" href="#${s.id}"><span>${s.tools.length > 3 ? `كل أدوات ${s.label} (${s.tools.length})` : `ادخل قسم ${s.label}`}</span>${ico("i-chev")}</a>
        </div>
      </article>
    </li>`).join("");
  }

  /* «كل الأدوات»: دليل التطبيق، مرتب على الأقسام، مع فلتر فوري */
  function tileHTML(t) {
    const T = TOOLS[t], s = SEC_OF[t];
    return `<a class="tt" href="#${t}" data-tt="${t}" style="--hue:${s ? s.hue : "var(--river)"}"><span class="tt-ic">${ico(T.icon)}</span><span class="tt-t"><b>${esc(T.label)}${T.isNew ? ` <i class="tag-new">جديد</i>` : ""}</b><small>${esc(T.desc)}</small></span></a>`;
  }
  function toolsHTML() {
    const n = Object.keys(TOOLS).filter(t => has(t) && !TOOLS[t].hidden).length;
    return `<header class="tl-head">
        <div class="tl-title"><h1>كل الأدوات</h1><p><b class="num">${n}</b> أداة مرتبة على مراحل البحث البيئي. اكتب ما تحتاجه، أو اختر قسماً.</p></div>
        <div class="tl-bar">
          <label class="tl-find">${ico("i-search")}<span class="sr-only">فلترة الأدوات</span><input id="tl-q" type="search" autocomplete="off" spellcheck="false" placeholder="مثلاً: WQI، رصاص، طحالب، ANOVA"></label>
          <div class="tl-chips" role="group" aria-label="الأقسام"><button type="button" class="on" data-tl-sec="" aria-pressed="true">الكل</button>${SECTIONS.map(s => `<button type="button" data-tl-sec="${s.id}" aria-pressed="false" style="--hue:${s.hue}">${ico(s.icon)}${s.label}</button>`).join("")}</div>
        </div>
      </header>
      <div class="tl-body">${SECTIONS.map(s => `<section class="tl-group" data-sec="${s.id}" style="--hue:${s.hue}" aria-labelledby="tl-h-${s.id}">
        <header class="tl-gh">${s.n ? `<i class="tl-gn">0${s.n}</i>` : `<i class="tl-gn">${ico(s.icon)}</i>`}<div><h2 id="tl-h-${s.id}">${s.label}</h2><p>${esc(s.q)}</p></div><a href="#${s.id}">صفحة القسم${ico("i-chev")}</a></header>
        <div class="tl-grid">${s.tools.map(tileHTML).join("")}</div>
      </section>`).join("")}
      <div class="tl-empty" hidden><b>لا توجد أداة تطابق بحثك</b><span>جرّب كلمة أقصر، أو اسأل المساعد الذكي.</span><a class="btn btn-sm" href="#assistant">${ico("i-chat")}اسأل المساعد</a></div></div>`;
  }
  let tlSec = "";
  function filterTools() {
    const root = U.$("#tools-root"); if (!root) return;
    const q = (U.$("#tl-q") || {}).value || "";
    if (!INDEX.length) buildIndex();
    const toks = tokens(q);
    let shown = 0;
    U.$$(".tl-group", root).forEach(g => {
      let n = 0;
      const secOk = !tlSec || g.dataset.sec === tlSec;
      U.$$(".tt", g).forEach(a => {
        const e = INDEX.find(x => x.id === a.dataset.tt);
        const ok = secOk && (!toks.length || (e && scoreOf(e, toks) > 0));
        a.hidden = !ok; if (ok) n++;
      });
      g.hidden = !n; shown += n;
    });
    const em = U.$(".tl-empty", root); if (em) em.hidden = shown > 0;
  }
  function wireTools() {
    const root = U.$("#tools-root"); if (!root || root.dataset.wired) return;
    root.dataset.wired = "1";
    const q = U.$("#tl-q", root);
    q.addEventListener("input", filterTools);
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-tl-sec]"); if (!b) return;
      setToolsSec(b.dataset.tlSec);
    });
  }
  function setToolsSec(id) {
    tlSec = id || "";
    U.$$("[data-tl-sec]").forEach(x => { const on = x.dataset.tlSec === tlSec; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
    filterTools();
  }

  function footHTML() {
    return `<div class="wrap foot-in">
      <div class="foot-brand">
        <a class="brand" href="#home" aria-label="EcoBio AI – الرئيسية"><svg viewBox="0 0 132 132" aria-hidden="true"><use href="#i-logo"/></svg><b>EcoBio <em>AI</em></b></a>
        <p>منصة مفتوحة لرصد التلوث البيئي ومعالجته، من قسم علوم الحياة في كلية التربية للعلوم الصرفة – جامعة تكريت.</p>
        <p class="foot-src">مصادر البيانات: Copernicus CAMS · Open-Meteo · NASA GIBS · Sentinel-2 · Landsat · المواصفة العراقية 417 · إرشادات WHO 2021</p>
      </div>
      ${NAV_GROUPS.map(g => { const G = groupOf(g); return `<nav class="foot-col" aria-label="${G.label}" style="--hue:${G.hue}"><a class="fc-h" href="${G.href}">${G.label}</a>${G.tools.map(t => `<a href="#${t}">${esc(TOOLS[t].label)}</a>`).join("")}</nav>`; }).join("")}
    </div>
    <div class="foot-mark" aria-hidden="true">EcoBio</div>
    <div class="wrap foot-bar"><span id="foot-l"></span><span class="foot-links"><a href="#learn">دليل المنصة</a><a href="#faq">الأسئلة والأجوبة</a><a href="privacy.html">سياسة الخصوصية</a></span></div>`;
  }

  function buildShell() {
    const nav = U.$("#nav"); if (nav) nav.innerHTML = navHTML();
    const dp = U.$("#drawer-panel"); if (dp) dp.innerHTML = drawerHTML();
    const bb = U.$("#bottombar"); if (bb) bb.innerHTML = bottomHTML();
    const sg = U.$("#stages"); if (sg) sg.innerHTML = stagesHTML();
    const ft = U.$("#foot"); if (ft) ft.innerHTML = footHTML();
    const tr = U.$("#tools-root"); if (tr) { tr.innerHTML = toolsHTML(); wireTools(); }
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
  const NO_LESSON = new Set(["learn", "faq", "about", "review"]);
  function decorate(v) {
    const view = document.getElementById("view-" + v), s = SEC_OF[v];
    if (!view || view.dataset.decorated) return;
    view.dataset.decorated = "1";
    if (s) {
      view.style.setProperty("--hue", s.hue);
      const sibs = s.tools.length > 1 ? `<div class="sibs" role="list">${s.tools.map(t => `<a role="listitem" href="#${t}"${t === v ? ' aria-current="page"' : ""}>${ico(TOOLS[t].icon)}<span>${esc(TOOLS[t].label)}</span></a>`).join("")}</div>` : "";
      const cr = document.createElement("nav");
      cr.className = "crumbs"; cr.setAttribute("aria-label", "أنت هنا");
      const lesson = !NO_LESSON.has(v) ? `<a class="c-learn" href="#learn&t=${v}">${ico("i-learn")}<span>دليل الأداة</span></a>` : "";
      cr.innerHTML = `<div class="crumbs-in"><ol class="crumb-trail"><li><a href="#home">الرئيسية</a></li><li><a class="c-sec" href="#${s.id}">${ico(s.icon)}${s.label}</a></li><li aria-current="page">${esc(TOOLS[v].label)}</li></ol>${lesson}${sibs}</div>`;
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
  const VIEW_IDS = new Set(["home", "tools", ...SECTIONS.map(s => s.id), ...Object.keys(TOOLS).filter(has)]);
  let current = null;
  const titleOf = v => v === "home" ? "EcoBio AI" : v === "tools" ? "كل الأدوات · EcoBio AI" : `${(TOOLS[v] || secById(v) || {}).label || ""} · EcoBio AI`;

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
    const tab = tabOf(v);
    U.$$("[data-tab]").forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle("active", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    rememberTool(v);
    if (v === "tools") { const m = raw.match(/[&?]s=([a-z]+)/); setToolsSec(m && secById(m[1]) ? m[1] : ""); }
    U.$$("[data-sec-link]").forEach(a => a.classList.toggle("active", a.dataset.secLink === sec));
    U.$$(".nav-group").forEach(g => g.classList.toggle("active", !!sec && g.dataset.sec.split(" ").includes(sec)));
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
    // مع التمرير الناعم (motion.js) نوقف أي تمرير جارٍ ونصعد فوراً
    if (ECO.motion && ECO.motion.top) ECO.motion.top();
    else if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  /* آخر الأدوات التي فتحها المستخدم (على جهازه فقط) */
  const RECENT_MAX = 6;
  function rememberTool(v) {
    if (!TOOLS[v] || TOOLS[v].hidden || !has(v)) return;
    const list = U.store.get("recent", []).filter(x => x !== v && TOOLS[x]);
    list.unshift(v); U.store.set("recent", list.slice(0, RECENT_MAX));
  }
  ECO.recent = () => U.store.get("recent", []).filter(t => TOOLS[t] && !TOOLS[t].hidden && has(t));
  ECO.recentClear = () => U.store.del("recent");
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
  const tokens = q => norm(q).split(/[\s،,]+/).filter(Boolean).map(t => t.length > 3 && t.startsWith("ال") ? t.slice(2) : t);
  function scoreOf(e, toks) {
    let sc = 0;
    for (const t of toks) {
      let m = 0;
      if (e.L.startsWith(t)) m = 30; else if (e.L.includes(t)) m = 20;
      if (!m && e.K.includes(t)) m = 12;
      if (!m && e.D.includes(t)) m = 6;
      if (!m && e.S.includes(t)) m = 4;
      if (!m) return 0;
      sc += m;
    }
    return sc + (e.kind === "tool" ? 1 : 0);
  }
  function search(q) {
    const toks = tokens(q);
    if (!toks.length) return null;
    return INDEX.map(e => ({ e, sc: scoreOf(e, toks) })).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 8).map(x => x.e);
  }
  const SUGGEST = ["lab", "districts", "water", "analyzer", "plant", "research"];

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
      if (sc) {
        e.preventDefault(); const t = U.$(sc.dataset.scroll);
        if (t) {
          if (ECO.motion && ECO.motion.scrollTo) ECO.motion.scrollTo(t); else t.scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
          const f = t.querySelector("h2, a"); if (f) f.focus({ preventScroll: true });
        }
        return;
      }
      const ts = e.target.closest("[data-tools-sec]");
      if (ts) { e.preventDefault(); ECO.go("tools&s=" + ts.dataset.toolsSec); return; }
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
    const openMenu = e => { dr.hidden = false; if (e.detail === 0) { const f = dr.querySelector("a.active, a"); if (f) f.focus(); } };
    U.$("#open-menu").onclick = openMenu;
    document.addEventListener("click", e => { if (e.target.closest("[data-open-menu]")) openMenu(e); });
    dr.addEventListener("click", e => { if (e.target === dr || e.target.closest("a") || e.target.closest(".drawer-head button") || e.target.closest("[data-open-search]")) dr.hidden = true; });
  }

  buildShell();
  ECO.SECTIONS = SECTIONS; ECO.TOOLS = TOOLS; ECO.NAV = Object.keys(TOOLS).map(id => Object.assign({ id }, TOOLS[id]));
  ECO.router = { start() { wire(); window.addEventListener("hashchange", route); route(); }, current: () => current };
})();
