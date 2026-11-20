/* =====================================================================
   EcoBio AI — عمادة كلية التربية للعلوم الصرفة ثلاثية الأبعاد
   مبنية لقطةً لقطة على فيديوهات العمادة وصورها (تشرين الثاني 2026):
   الواجهة والممر المسقّف والحديقة، والطابق الأرضي (المدخل ولوحة الرؤية
   والاستعلامات والممر والشُّعب وشعبة التسجيل)، والدرج خلف الباب الزجاجي
   على يمين الداخل (يصعد شمالاً ثم يدور يميناً مرتين)، والطابق الأول (بهو
   شعبة الشؤون الإدارية والمالية، والممر بشُعبه وملصقات مهامها بنصّها،
   و«مكتب العميد» بجناحه، وقاعة مجلس الكلية تحت «امانة المجلس»).
   كل الأسماء واللوحات والملصقات مكتوبة نصّاً كما تظهر في الفيديو، ولا يظهر أي شخص.
   الأبعاد تقديرية من الفيديو (لا يوجد مخطط هندسي)، والغرف التي صُوِّر
   بابها فقط مبنية على طراز الغرف المصوّرة ومعلَّمة «تقريبية».
   المحاور: x شرق (+) / غرب (−)، z جنوب (+، جهة المدخل والحديقة) / شمال (−).
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  if (!document.getElementById("view-deanery")) return;
  const FH = 3.8, CH = 3.4, EYE = 1.62, GY = -0.45, RISE = FH / 20, RUN = 0.3;
  const FONT = '"Readex Pro","IBM Plex Sans Arabic","Noto Sans Arabic","Noto Naskh Arabic",Tahoma,Arial,sans-serif';
  const TEX = "assets/deanery/";
  const BX0 = -6, BX1 = 10, BZ0 = -34, BZ1 = 0;      // جسم المبنى
  const CX0 = 1.2, CX1 = 5.6, CXM = 3.4;             // ممر الطابق الأرضي العريض
  const UX0 = 3.2, UXM = 4.4;                         // ممر الطابق الأول أضيق (من 3.2 إلى 5.6)
  const ZE = -24;                                     // نهاية ممر الطابق الأرضي
  const ZE1 = -25;                                    // نهاية ممر الطابق الأول (واجهة «امانة المجلس»)
  const WX = CXM, WZ1 = 12.0;                         // الممر المسقّف أمام الباب
  const DEAN_NAME = "علي عبدالمجيد شهاب";

  /* الغرف. r: [x0, x1, z0, z1] (z0 الجهة الشمالية). الأبواب: s جهة الجدار (W غرب، E شرق، F جنوب، B شمال)،
     at موضعها، k نوعها. ph: 1 = مصوّرة من الداخل، 0 = صُوِّر بابها أو اسمها فقط (تقريبية) */
  const ROOMS = [
    // الطابق الأرضي: الجهة الغربية (يسار الداخل)
    { id: "g-store", short: "مخزن", lvl: 0, r: [BX0, CX0, -4.6, 0], name: "مخزن", code: "05S012", sub: "store", doors: [{ s: "E", at: -3.75 }], ph: 0 },
    { id: "g-001", short: "المعاون العلمي", lvl: 0, r: [BX0, CX0, -9.4, -4.6], name: "معاون العميد للشؤون العلمية", code: "00G001", sub: "deputy", doors: [{ s: "E", at: -5.5 }], ph: 0 },
    { id: "g-002", short: "المعاون الإداري", lvl: 0, r: [BX0, CX0, -14.2, -9.4], name: "معاون العميد للشؤون الإدارية", code: "00G002", sub: "deputy", doors: [{ s: "E", at: -10.3 }], ph: 0 },
    { id: "g-v001", short: "أضابير الدراسات العليا", lvl: 0, r: [BX0, CX0, -18.8, -14.2], name: "أضابير الدراسات العليا", code: "00V001", sub: "archive", doors: [{ s: "E", at: -15.1 }], ph: 0 },
    { id: "g-003", short: "الدراسات العليا", lvl: 0, r: [BX0, CX0, ZE, -18.8], name: "شعبة الدراسات العليا", code: "00G003", sub: "grad", doors: [{ s: "E", at: -21.5 }], wins: [{ s: "E", a: -20.75, b: -19.45 }, { s: "E", a: -23.55, b: -22.3 }], ph: 1 },
    // الجهة الشرقية (يمين الداخل): الدرج خلف الحاجز الزجاجي، ثم الشُّعب
    { id: "g-stair", short: "الدرج", lvl: 0, r: [CX1, BX1, -6.6, 0], name: "الدرج", sub: "stair", doors: [{ s: "W", at: -1.1, w: 0.95, k: "glassF" }], ph: 1, noPlate: 1 },
    { id: "g-009", short: "صندوق الحسابات", lvl: 0, r: [CX1, BX1, -15, -6.6], name: "صندوق الحسابات", code: "00G009", sub: "cash", doors: [{ s: "W", at: -13.4 }], ph: 0 },
    { id: "g-008", short: "الشؤون العلمية", lvl: 0, r: [CX1, BX1, ZE, -15], name: "شعبة الشؤون العلمية", code: "00G008", sub: "staff", doors: [{ s: "W", at: -21.4 }], ph: 0 },
    // نهاية الممر: شعبة التسجيل وغرفتاها
    { id: "g-reg", short: "التسجيل وشؤون الطلبة", lvl: 0, r: [-1, BX1, BZ0, ZE], name: "شعبة التسجيل وشؤون الطلبة", sub: "reg", doors: [{ s: "F", at: CXM, k: "carved" }], ph: 1, noPlate: 1 },
    { id: "g-010", short: "مدير التسجيل", lvl: 0, r: [BX0, -1, -29, ZE], name: "مدير شعبة التسجيل", code: "00G010", sub: "regmgr", doors: [{ s: "E", at: -27.7 }], ph: 1 },
    { id: "g-011", short: "وحدة الأضابير", lvl: 0, r: [BX0, -1, BZ0, -29], name: "وحدة الأضابير", code: "00G011", sub: "archive", doors: [{ s: "E", at: -30.2 }], ph: 0 },
    /* الطابق الأول (مستخرج من فيديو الصعود ثانيةً بثانية):
       الدرج يصعد شمالاً من الباب الأسود ثم يدور يميناً مرتين، فيصل الصاعد متجهاً جنوباً وأمامه باب الصحيات وعلى يساره شبّاك.
       يستدير يميناً (غرباً) في بهو تتقدّمه واجهة الشعبة القانونية الزجاجية يساراً وفتحة الدرج بدرابزينها الذهبي يميناً،
       وفي آخره الجدار الذهبي «شعبة الشؤون الإدارية والمالية». على يمين الجدار الذهبي باب الموارد البشرية وملصق مهامها،
       ثم يبدأ الممر الطويل شمالاً: يميناً (شرقاً) الترقيات فضمان الجودة فالتدقيق فالتخطيط، ويساراً (غرباً) الحسابات فالإعلام
       فـ«مكتب العميد»، وفي آخره باب قاعة المجلس تحت «امانة المجلس» وعلى يمينه باب أمين المجلس. */
    // جنوب البهو (جهة الواجهة الأمامية)
    { id: "u-wcm", short: "الصحيات (رجال)", lvl: 1, r: [7.4, BX1, -2.2, 0], name: "الصحيات (Man)", sub: "wc", doors: [{ s: "B", at: 9.25, k: "carvedLight" }], ph: 0, noPlate: 1, oval: ["الصحيات", "(Man)"] },
    { id: "u-wcw", short: "الصحيات (نساء)", lvl: 1, r: [5.0, 7.4, -2.2, 0], name: "الصحيات (Woman)", sub: "wc", doors: [{ s: "B", at: 6.55, k: "carvedLight" }], ph: 0, noPlate: 1, oval: ["الصحيات", "(Woman) 1-1-21"] },
    { id: "u-legal", short: "الشؤون القانونية", lvl: 1, r: [-1.6, 5.0, -3.0, 0], name: "شعبة الشؤون القانونية", code: "01G025", sub: "legal", doors: [{ s: "B", at: 3.9, k: "none" }], ph: 1, noPlate: 1 },
    { id: "u-sw", short: "غرفة", lvl: 1, r: [BX0, -1.6, -6.6, 0], name: "غرفة بباب يحمل شعار الكلية (لم تظهر لافتتها)", sub: "small", doors: [{ s: "E", at: -3.55, k: "dark", emblem: 1, ajar: 0.12 }], ph: 0, noPlate: 1 },
    // شمال البهو وغرب الممر
    { id: "u-hrm", short: "الموارد البشرية", lvl: 1, r: [-1.6, UX0, -11.2, -6.6], name: "شعبة الموارد البشرية", code: "01G024", sub: "hrMgr", doors: [{ s: "F", at: 0.2, k: "whiteB" }], ph: 1, noPlate: 1 },
    { id: "u-hrs", short: "موظفو الموارد البشرية", lvl: 1, r: [BX0, -1.6, -14.6, -6.6], name: "موظفو شعبة الموارد البشرية", sub: "hrStaff", doors: [{ s: "E", at: -10.45, k: "whiteB" }], ph: 1, noPlate: 1, winsW: [-8.6, -12.6] },
    { id: "u-hrb", short: "غرفة", lvl: 1, r: [-1.6, UX0, -14.6, -11.2], name: "غرفة خلف الباب الأسود (تقريبية)", sub: "small", doors: [{ s: "E", at: -12.6 }, { s: "F", at: -0.6, k: "blackT" }], ph: 0, noPlate: 1 },
    { id: "u-acc", short: "الحسابات", lvl: 1, r: [BX0, UX0, -20.0, -14.6], name: "شعبة الحسابات", code: "01G021", sub: "acc", doors: [{ s: "E", at: -17.6, logo: 1 }], ph: 1, poster: "acc", winsW: [-16.0, -18.6] },
    { id: "u-media", short: "الإعلام", lvl: 1, r: [BX0, UX0, -23.0, -20.0], name: "شعبة الإعلام", sub: "media1", doors: [{ s: "E", at: -22.2, logo: 1 }], ph: 1, poster: "media" },
    { id: "u-sec", short: "مكتب العميد", lvl: 1, r: [-1.4, UX0, -27.6, -23.0], name: "مكتب العميد – الاستقبال", sub: "deanSec", doors: [{ s: "E", at: -23.7, k: "diamond" }], ph: 1, noPlate: 1 },
    { id: "u-dstaff", short: "مدير مكتب العميد", lvl: 1, r: [-1.4, UX0, BZ0, -27.6], name: "مدير مكتب العميد", sub: "deanStaff", doors: [{ s: "F", at: 1.6, k: "diamond" }], ph: 1, noPlate: 1 },
    { id: "u-dean", short: "عميد الكلية", lvl: 1, r: [BX0, -1.4, BZ0, -23.0], name: "مكتب عميد الكلية", sub: "dean", doors: [{ s: "E", at: -29.0, k: "wood" }, { s: "E", at: -31.2, k: "shut" }, { s: "E", at: -24.6, k: "black" }], ph: 1, noPlate: 1, winsW: [-25.0, -29.0] },
    // آخر الممر: قاعة المجلس وأمين المجلس
    { id: "u-council", short: "مجلس الكلية", lvl: 1, r: [UX0, 7.4, BZ0, ZE1], name: "قاعة مجلس الكلية", sub: "council", doors: [{ s: "F", at: UXM, w: 1.4, k: "council" }, { s: "B", at: 5.3, w: 1.4, k: "shut2" }, { s: "E", at: -27.2, k: "white" }], ph: 1, noPlate: 1, noWin: 1 },
    { id: "u-amin", short: "أمين المجلس", lvl: 1, r: [CX1, BX1, ZE1, -23.0], name: "أمين المجلس", code: "01G017", sub: "aminE", doors: [{ s: "W", at: -24.1, k: "diamond" }], ph: 0, noPlate: 1 },
    { id: "u-amin2", short: "", hidden: 1, lvl: 1, r: [7.4, BX1, BZ0, ZE1], name: "أمين المجلس", code: "01G017", sub: "aminB", doors: [{ s: "F", at: 8.7, w: 2.4, k: "open" }], ph: 0, noPlate: 1 },
    // شرق الممر
    { id: "u-prom", short: "لجنة الترقيات", lvl: 1, r: [CX1, BX1, -10.4, -6.6], name: "لجنة الترقيات", code: "01G023", sub: "staff", doors: [{ s: "W", at: -9.7, logo: 1 }], ph: 0 },
    { id: "u-qa", short: "ضمان الجودة", lvl: 1, r: [CX1, BX1, -14.8, -10.4], name: "شعبة ضمان الجودة", code: "01G022", sub: "qa", doors: [{ s: "W", at: -11.2 }], ph: 1, noWin: 1 },
    { id: "u-aud", short: "التدقيق", lvl: 1, r: [CX1, BX1, -18.6, -14.8], name: "شعبة التدقيق", code: "01G020", sub: "aud", doors: [{ s: "W", at: -17.8, logo: 1 }], ph: 1 },
    { id: "u-plan", short: "التخطيط والمتابعة", lvl: 1, r: [CX1, BX1, -23.0, -18.6], name: "شعبة التخطيط والمتابعة", plate: "شعبة التخطيط", code: "01G018", sub: "plan", doors: [{ s: "W", at: -22.4, logo: 1 }], ph: 1, poster: "plan" }
  ];
  /* المناطق المفتوحة (بلا جدران خاصة بها) */
  const OPEN = [
    { id: "g-lobby", lvl: 0, r: [CX0, CX1, -4.6, 0], name: "المدخل والاستعلامات", short: "المدخل", kind: "lobby" },
    { id: "g-cor", lvl: 0, r: [CX0, CX1, ZE, -4.6], name: "الممر – الطابق الأرضي", short: "الممر", kind: "corridor" },
    { id: "u-stair", lvl: 1, r: [CX1, BX1, -3.4, -2.2], name: "رأس الدرج", short: "الدرج", kind: "stair" },
    { id: "u-hall", lvl: 1, r: [-1.6, CX1, -6.6, -2.2], name: "بهو شعبة الشؤون الإدارية والمالية", short: "البهو", kind: "lobby" },
    { id: "u-cor", lvl: 1, r: [UX0, CX1, ZE1, -6.6], name: "الممر – الطابق الأول", short: "الممر", kind: "corridor" }
  ];

  /* معلومات تظهر عند الضغط على بعض العناصر */
  const DEV = {
    board: { name: "لوحة رؤية الجامعة والكلية ورسالتهما وأهدافهما", what: "اللوحة المعلّقة على يسار الداخل في مدخل العمادة: رؤية جامعة تكريت ورسالتها وأهدافها، ورؤية كلية التربية للعلوم الصرفة ورسالتها وهدفها. النص مكتوب كما في اللوحة، وتحتها جهاز البصمة وصندوقا الشكاوى." },
    reception: { name: "الاستعلامات", what: "مكتب الاستعلامات على يمين الداخل، خلفه الحاجز الزجاجي الأسود الذي يُدخل منه إلى الدرج." },
    goldwall: { name: "شعبة الشؤون الإدارية والمالية", what: "الجدار الرخامي الذهبي في آخر بهو الطابق الأول، يقابل الصاعد من الدرج بعد أن يستدير يميناً. عليه «شعبة الشؤون الإدارية والمالية» بحروف ذهبية بارزة وشعار الكلية، وأمامه مقاعد انتظار جلدية صفراء، وعلى يساره باب خشبي بشعار الكلية وطفاية حريق، وعلى يمينه باب شعبة الموارد البشرية ثم مدخل الممر." },
    council: { name: "قاعة مجلس الكلية", what: "طاولة الاجتماعات الطويلة بإطار من خشب الماهوجني وسطوح جلدية زرقاء داكنة، وأمام المقاعد لوحات الأسماء، وكراسٍ جلدية بنية. في آخرها باب خشبي مزدوج فوقه «امانة مجلس كلية التربية للعلوم الصرفة» وعلم العراق وعلما الجامعة." },
    deandesk: { name: "مكتب عميد الكلية", what: "مكتب الأستاذ الدكتور " + DEAN_NAME + " عميد الكلية. يُدخل إليه من باب «مكتب العميد» في آخر الممر على اليسار: الاستقبال، ثم الباب المعيّني إلى مكتب مدير مكتب العميد، ثم الباب الخشبي إلى مكتب العميد، ولمكتب العميد باب أسود آخر إلى الاستقبال." },
    counter: { name: "شبابيك المراجعين", what: "حاجز خشبي بشبابيك زجاجية يراجع منها الطلبة والموظفون الشعبة دون الدخول إلى المكتب." },
    shelves: { name: "رفوف الأضابير", what: "رفوف تملأ جدران الغرفة بالأضابير السوداء والزرقاء." },
    reghall: { name: "شعبة التسجيل وشؤون الطلبة", what: "القاعة ذات السقف المزخرف والثريا الذهبية في نهاية ممر الطابق الأرضي، وفيها مكتب مدير شعبة التسجيل ووحدة الأضابير." }
  };
  /* ملصقات «مهام الشعبة» منقولة حرفياً من لقطات الفيديو القريبة (بإملائها كما طُبعت) */
  const POSTERS = {
    hr: { title: "مهام شعبة الموارد البشرية", room: "على جدار البهو بجانب باب شعبة الموارد البشرية", items: [
      "متابعة كل ما يتعلق بمنتسبي الكلية من تدريسيين وموظفين في ما يخص الاوامر الادارية من ( التعيين ، الاستقالة ، التقاعد ، الاجازات ، الترفيعات ، العلاوات وغيرها.",
      "تخطيط وتنظيم الشؤون الادارية للكلية ومتابعة سير العمل فيها واتخاذ ما يلزم لتحقيق افضل الصيغ الممكنة في ممارستها وتنفيذ قوانين الخدمة المدنية ، الخدمة الجامعية ، قانون رواتب موظفي الدولة والقطاع العام بقدر تعلق الامر بالعاملين في الكلية من تدريسيين وموظفين.",
      "متابعة دوام التدريسيين والموظفين وتنفيذ التعليمات القانونية بحق من ينقطع عن الدوام.",
      "متابعة البريد واجابة البريد الخاص بالشعبة والوحدات التابعة لها.",
      "اصدار الاوامر الادارية الخاصة باللجان المختلفة بعد تسمية السيد العميد أو السيد المعاون الاداري اعضاؤها.",
      "إعداد سجل الملاك يتضمن معلومات عن كافة المنتسبين من التدريسيين والموظفين.",
      "أعداد سجل الموارد البشرية للتدريسيين والموظفين وتثبيت كافة المعلومات الخاصة بهم والتي تتضمن اسم المنتسب وشهادته ولقبه العلمي او عنوانه الوظيفي، وتاريخ المباشرة.",
      "اعداد سجل العلاوات للتدريسيين والموظفين مبين فيه ام المنتسب وتاريخ حصوله على الدرجة والمرحلة وتاريخ استحقاقه للترفيع أو العلاوة السنوية حسب تاريخ استحقاقه.",
      "إعداد سجل خاص بالموظفين على الملاك المؤقت والموظفين بصفة أجور يومية على ملاك الكلية وتثبيت المعلومات الخاصة بهم.",
      "تسجيل وأرشفة كافة الكتب الواردة الى الكلية والصادرة منها وتوزيع البريد الصادر والوارد الى الشعب والوحدات التابعة للكلية بالإضافة الى طباعة البريد الخاص بالشعبة."], chart: "شعبة الشؤون الإدارية", frame: "woodDark" },
    acc: { title: "مهام شعبة الحسابات", room: "على جدار الممر بجانب باب شعبة الحسابات", items: [
      "تنظيم رواتب منتسبي الكلية مع إعداد قرص التقاعد الخاص بمنتسبي الكلية وتنظيم الاستقطاعات والاجابات للجهات",
      "مسك مستندات الصرف الصباحية وتحديد الصكوك المستحقة وتنظيم مستندات الصرف وتبويبها وفق النظام المحاسبي الموحد.",
      "تنظيم ومطابقة مستندات الصرف وتنظيم سجلات الصناديق.",
      "مسك سجلات الرواتب الخاصة بالموظفين والتدريسيين وأعداد قوائم الرواتب الشهرية وترحيلها على الحاسبة.",
      "إعداد كشوف الاستقطاع المختلفة والتي تقع ضمن ذمة الموظفين للدوائر الاخرى.",
      "مسك سجل المصروفات وسجل اليومية العامة من خلال ترحيل مستندات الصرف عليه.",
      "تنظيم الاستمارات الخاصة بمعاملات الصيانة والشراء.",
      "إعداد ميزان المراجعة الشهري قائمة المصروفات ، قائمة الايرادات ، كشف البنك ، الصكوك المدفوعة.",
      "تنظيم الحسابات الختامية نهاية كل سنة مالية وتقديمها الى ديوان الرقابة المالية في المحافظة.",
      "أجراء التحليلات المالية المختلفة لغرض المطابقة واستخراج البيانات وخاصة تحليل السيولة.",
      "اعداد الميزانية الخاصة بإيرادات الكلية وخاصة ايرادات الدراسة المسائية.",
      "تنفيذ ايعاز الصرف على الابواب المختلفة.",
      "تنظيم استمارات صرف أجور المحاضرات على الدراسة الصباحية والمسائية والدراسات العليا وأجور المناقشات."] },
    plan: { title: "مهام شعبة التخطيط والمتابعة", room: "على جدار الممر بجانب باب شعبة التخطيط", items: [
      "تقوم الشعبة بمتابعة رسم سياسة الكلية بما ينسجم والسياسة العامة للجامعة وتحقيق رسالتها.",
      "اعداد خطط قبول الطلبة للدراسات الصباحية والمسائية بالتعاون مع شعبة التسجيل.",
      "اعداد خطط المؤتمرات والندوات وورش العمل التي تقيمها الكلية خلال العام الدراسي والنظر في الخطط العلمية للأقسام العلمية بما يتعلق بالمؤتمرات والندوات العلمية ومتابعة كافة الانشطة العلمية والثقافية والفنية والرياضية في الكلية.",
      "التخطيط لأعداد الملاكات التدريسية في ضوء اقتراحات الاقسام في الكلية ومتابعة النظر بعناوين الفنيين والاداريين ضمن الملاك.",
      "متابعة تنفيذ الخطط بأنواعها والسياسات الموضوعة وتحديد معوقات تنفيذها."], chart: "شعبة التخطيط والمتابعة", frame: "white", foot: "جامعة تكريت" },
    media: { title: "مهام شعبة الاعلام", room: "على جدار الممر بجانب باب شعبة الإعلام", items: [
      "التعريف بدور الكلية ورسالتها. والسعي لبناء صورة ايجابية عن الكلية لدى الجمهور الداخلي والخارجي.",
      "العمل على تغطية النشاطات والفعاليات على اختلاف انواعها كالمؤتمرات ، الندوات ، الحلقات النقاشية ، المهرجانات الرياضية ، الاحتفالات ، المناسبات والمناقشات ونشاطات أخرى في الكلية وتسليط الضوء عليها ورفعها الى موقع الجامعة الرسمي.",
      "تنسيق وتسهيل مهام جميع القنوات الفضائية ووسائل الاعلام الاخرى لإنجاز تقاريرها الاعلامية عن الكلية وأنشطتها بعد استحصال موافقة الجامعة.",
      "تنظيم المؤتمرات والاحتفالات المركزية للكلية ومساندة الاقسام الاكاديمية اعلاميا في تنفيذ الفعاليات والمؤتمرات وانجاز الجوانب الاعلامية لتلك الاحتفالات من خلال وسائل الاعلام المقروءة والمسموعة والمرئية.",
      "تنظيم المقابلات التلفزيونية المطلوبة لعميد الكلية وأي مسؤول اخر في الكلية والحضور الدائم مع وسائل الاعلام في مثل تلك النشاطات.",
      "متابعة الجوانب الانسانية والاجتماعية لجميع منتسبي الكلية من موظفين وأساتذة، وتوجيه التهاني والتعازي في المناسبات المفرحة.",
      "القيام بالتغطية الصحفية للوفود الزائرة للكلية.",
      "توثيق الاعلامي لجميع أنشطة الكلية."], chart: "شعبة الإعلام", frame: "woodDark" }
  };
  Object.keys(POSTERS).forEach(k => { const p = POSTERS[k]; DEV["poster_" + k] = { name: p.title, what: "الملصق المعلّق " + p.room + "، منقول نصّه كما هو:", list: p.items }; });

  let st = null, scene, cam, stageEl, canvas, built = false, active = false, focused = false;
  const MAT = {}, BATCH = {}, INST = {}, SOLID = [[], []], PICK = [], FLOORS = [], BLOCK = [], TEXJOBS = [], REG = [];
  const LAYERS = {}; let LAYER = "s0";
  const P = { x: WX, z: 26, lvl: 0, yaw: 0, pitch: 0.03, bob: 0, gy: GY };
  const keys = {}, joy = { x: 0, y: 0 };
  const OV = { on: false, yaw: 0.38, pitch: 1.18, dist: 36, tdist: 36, floor: 0 };
  let walkPath = null, stuck = 0, anim = null, tour = false, whereT = 0, mapFloor = 0, lastWhere = "";

  /* ---------------------------------------------------------------
     أدوات مساعدة (نفسها في جولة القسم)
  --------------------------------------------------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function canvasTex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  function textTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    const job = () => { const g = c.getContext("2d"); g.clearRect(0, 0, w, h); g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "middle"; draw(g, w, h); t.needsUpdate = true; };
    job(); TEXJOBS.push(job); return t;
  }
  function fitFont(g, text, weight, size, maxW) { let s = size; do { g.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10); }
  const lam = (color, o) => new THREE.MeshLambertMaterial(Object.assign({ color }, o || {}));
  const basic = (color, o) => new THREE.MeshBasicMaterial(Object.assign({ color }, o || {}));
  const loader = new THREE.TextureLoader();
  const PHOTO = {};
  function photoTex(name) {
    if (!PHOTO[name]) { const t = loader.load(TEX + name, () => { if (st && !st.running) st.renderer.render(scene, cam); }); t.anisotropy = 4; PHOTO[name] = t; }
    return PHOTO[name];
  }
  const photo = (name, o) => lam(0xffffff, Object.assign({ map: photoTex(name) }, o || {}));
  const noise = (g, w, h, n, a, seed, size = 1.5) => { const R = rng(seed); for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${R() < 0.5 ? "0,0,0" : "255,255,255"},${R() * a})`; g.fillRect(R() * w, R() * h, size, size); } };
  const layerObj = () => LAYERS[LAYER];
  const addObj = o => { layerObj().add(o); return o; };

  /* تجميع الهندسة الثابتة حسب المادة والطبقة */
  const BOXG = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const bkey = key => key + "|" + LAYER;
  function addGeo(key, geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
    (BATCH[bkey(key)] = BATCH[bkey(key)] || []).push(g);
  }
  /* صندوق محاذٍ للمحاور بإحداثيات نسيج بالمتر */
  function bx(key, x0, y0, z0, x1, y1, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    const g = BOXG.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE.Quaternion(), new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0)));
    const base = y0 > -0.01 ? Math.floor((y0 + 0.02) / FH) * FH : 0;
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = n.getX(i), ny = n.getY(i), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.abs(ny) > 0.5) uv.setXY(i, x, -z);
      else if (Math.abs(nx) > 0.5) uv.setXY(i, nx > 0 ? -z : z, y - base);
      else uv.setXY(i, n.getZ(i) > 0 ? x : -x, y - base);
    }
    (BATCH[bkey(key)] = BATCH[bkey(key)] || []).push(g);
  }
  function flat(key, x0, z0, x1, z1, y, down = false) {
    const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0); if (w < 1e-3 || d < 1e-3) return;
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
    (BATCH[bkey(key)] = BATCH[bkey(key)] || []).push(g.toNonIndexed());
  }
  function mergeGeos(list) {
    let n = 0; list.forEach(g => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    list.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere(); return geo;
  }
  const BLOCKKEYS = /^(wall|wallM|ext|extSide|woodPanel|white|woodDark|mahog|glassDoor|slab|plinth|parapet|flute|goldMarble|roof|doorWood|doorDark|doorWhite|doorBlack|lattice)$/;
  function flushBatches() {
    for (const k in BATCH) {
      const [key, layer] = k.split("|");
      if (!MAT[key]) { console.warn("deanery: missing material", key); continue; }
      const mesh = new THREE.Mesh(mergeGeos(BATCH[k]), MAT[key]);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); LAYERS[layer].add(mesh);
      if (/^(carpet|terr|marbleF|grass|asphalt|mosaic|stairT|concrete|hexPav|rug|prayer|stoneT)$|^carpet/.test(key)) FLOORS.push(mesh);
      else if (BLOCKKEYS.test(key)) BLOCK.push(mesh);
    }
  }
  function defInst(key, geo, mat, device) { INST[key] = { geo: geo.index ? geo.toNonIndexed() : geo, mat, list: [], device }; }
  function addInst(key, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    INST[key].list.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)), l: LAYER });
  }
  function flushInst() {
    for (const k in INST) {
      const o = INST[k], by = {};
      o.list.forEach(e => (by[e.l] = by[e.l] || []).push(e.m));
      for (const l in by) {
        const im = new THREE.InstancedMesh(o.geo, o.mat, by[l].length);
        by[l].forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = false; LAYERS[l].add(im); if (o.device) { im.userData.device = o.device; PICK.push(im); }
      }
    }
  }
  const mg = parts => mergeGeos(parts.map(g => (g.index ? g.toNonIndexed() : g)));
  function solid(lvl, x0, z0, x1, z1, pad = 0) { SOLID[lvl].push([Math.min(x0, x1) - pad, Math.min(z0, z1) - pad, Math.max(x0, x1) + pad, Math.max(z0, z1) + pad]); }

  /* جدار ثابت x ممتد على z مع فتحات. القيم الرأسية نسبةً لأرضية الطابق */
  function wallZ(key, x, za, zb, lvl, t, holes = [], collide = true, y0o = 0, y1o = FH) {
    const y0 = lvl * FH + y0o, y1 = lvl * FH + y1o, z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    let cur = z0;
    const piece = (a, b, ya, yb, col) => { bx(key, x - t / 2, ya, a, x + t / 2, yb, b); if (col && collide) solid(lvl, x - t / 2, a, x + t / 2, b); };
    holes.slice().sort((p, q) => p.a - q.a).forEach(h => {
      if (h.b <= z0 || h.a >= z1) return;
      if (h.a > cur) piece(cur, h.a, y0, y1, true);
      const yb = lvl * FH + (h.bottom || 0), yt = lvl * FH + (h.top == null ? 2.25 : h.top);
      if (yb > y0 + 1e-3) piece(Math.max(h.a, z0), Math.min(h.b, z1), y0, yb, yb - y0 > 0.4);
      if (yt < y1 - 1e-3) piece(Math.max(h.a, z0), Math.min(h.b, z1), yt, y1, false);
      cur = Math.max(cur, h.b);
    });
    if (cur < z1) piece(cur, z1, y0, y1, true);
  }
  function wallX(key, z, xa, xb, lvl, t, holes = [], collide = true, y0o = 0, y1o = FH) {
    const y0 = lvl * FH + y0o, y1 = lvl * FH + y1o, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
    let cur = x0;
    const piece = (a, b, ya, yb, col) => { bx(key, a, ya, z - t / 2, b, yb, z + t / 2); if (col && collide) solid(lvl, a, z - t / 2, b, z + t / 2); };
    holes.slice().sort((p, q) => p.a - q.a).forEach(h => {
      if (h.b <= x0 || h.a >= x1) return;
      if (h.a > cur) piece(cur, h.a, y0, y1, true);
      const yb = lvl * FH + (h.bottom || 0), yt = lvl * FH + (h.top == null ? 2.25 : h.top);
      if (yb > y0 + 1e-3) piece(Math.max(h.a, x0), Math.min(h.b, x1), y0, yb, yb - y0 > 0.4);
      if (yt < y1 - 1e-3) piece(Math.max(h.a, x0), Math.min(h.b, x1), yt, y1, false);
      cur = Math.max(cur, h.b);
    });
    if (cur < x1) piece(cur, x1, y0, y1, true);
  }
  function frameX(key, z, a, b, y0, y1, t, d = t) { bx(key, a - t, y0, z - d, a, y1, z + d); bx(key, b, y0, z - d, b + t, y1, z + d); bx(key, a - t, y1, z - d, b + t, y1 + t, z + d); }
  function frameZ(key, x, a, b, y0, y1, t, d = t) { bx(key, x - d, y0, a - t, x + d, y1, a); bx(key, x - d, y0, b, x + d, y1, b + t); bx(key, x - d, y1, a - t, x + d, y1 + t, b + t); }
  function compact(g) {
    g.updateMatrixWorld(true);
    const buckets = new Map();
    g.traverse(o => { if (o.isMesh) { const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); geo.applyMatrix4(o.matrixWorld); if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(geo); } });
    const out = new THREE.Group();
    buckets.forEach((list, mat) => out.add(new THREE.Mesh(mergeGeos(list), mat)));
    out.userData = g.userData; return out;
  }
  const mm = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
  const B = (w, h, d, mat, x = 0, y = 0, z = 0) => mm(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
  const C = (r, h, mat, x = 0, y = 0, z = 0, seg = 16, r2) => mm(new THREE.CylinderGeometry(r2 == null ? r : r2, r, h, seg), mat, x, y + h / 2, z);
  let MATKEY = null;
  /* قطعة أثاث مركّبة: تُدمج في الدفعات إن لم تكن قابلة للضغط */
  function device(key, parts, x, y, z, ry, lvl, col) {
    const g = new THREE.Group(); parts.forEach(p => g.add(p));
    g.position.set(x, y, z); g.rotation.y = ry;
    const c = compact(g); c.userData.device = key;
    if (col) { const q = Math.abs(Math.sin(ry)) > 0.7, hx = q ? col[1] : col[0], hz = q ? col[0] : col[1]; solid(lvl, x - hx, z - hz, x + hx, z + hz); }
    if (!key) {
      if (!MATKEY) { MATKEY = new Map(); for (const k in MAT) if (MAT[k] && MAT[k].isMaterial && !MATKEY.has(MAT[k])) MATKEY.set(MAT[k], k); }
      c.children.slice().forEach(m => { const k = MATKEY.get(m.material); if (k) { (BATCH[bkey(k)] = BATCH[bkey(k)] || []).push(m.geometry); c.remove(m); } });
      if (c.children.length) addObj(c);
      return c;
    }
    addObj(c); PICK.push(c); return c;
  }
  function planeAt(mat, w, h, x, y, z, ry) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(x, y, z); p.rotation.y = ry; return addObj(p); }
  /* لوحة مصوّرة مع إطار. ry: اتجاه الوجه */
  function pic(mat, w, h, x, y, z, ry, frame = "frameBlack", fd = 0.03) {
    if (frame) { const m = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, fd), MAT[frame] || MAT.black); m.position.set(x - Math.sin(ry) * fd / 2, y, z - Math.cos(ry) * fd / 2); m.rotation.y = ry; addObj(m); }
    return planeAt(mat, w, h, x + Math.sin(ry) * 0.004, y, z + Math.cos(ry) * 0.004, ry);
  }
  /* اتجاه الوجه نحو جهة: الوجه الافتراضي +z */
  const FACE = { F: 0, B: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };

  /* ---------------------------------------------------------------
     الخامات: الألوان مأخوذة من صور العمادة (الحجر البيج المخطّط، الموكيت
     الرمادي، الإنارة الصفراء المخفية، الخشب الداكن، الرخام الذهبي...)
  --------------------------------------------------------------- */
  function materials() {
    const tiles = (base, joint, n, seed, vary = 10, size = 512) => canvasTex(size, size, (g, w, h) => {
      const R = rng(seed), t = w / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = (R() - 0.5) * vary; g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; g.fillRect(i * t, j * t, t, t); }
      noise(g, w, h, 3500, 0.07, seed + 1); g.strokeStyle = joint; g.lineWidth = 2;
      for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * t, 0); g.lineTo(k * t, h); g.moveTo(0, k * t); g.lineTo(w, k * t); g.stroke(); }
    });
    const carpet = (base, seed) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, 9000, 0.09, seed, 1.5); const R = rng(seed + 3); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.025})`; g.fillRect(0, R() * h, w, 2); } }, [1 / 2, 1 / 2]);
    const terr = canvasTex(512, 512, (g, w, h) => {
      const R = rng(7), chips = ["#bfb3a3", "#a99c8a", "#8d806f", "#e9e3d8", "#6d6152", "#c9bda9"];
      for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) { const v = (R() - 0.5) * 8; g.fillStyle = `rgb(${216 + v},${208 + v},${194 + v})`; g.fillRect(tx * w / 3, ty * h / 3, w / 3, h / 3); }
      for (let i = 0; i < 4200; i++) { g.fillStyle = chips[(R() * R() * chips.length) | 0]; const s = 0.8 + R() * R() * 4.5; g.beginPath(); g.ellipse(R() * w, R() * h, s, s * 0.7, R() * 3, 0, 7); g.fill(); }
      g.strokeStyle = "rgba(120,108,92,.5)"; g.lineWidth = 2; for (let k = 0; k <= 3; k++) { g.beginPath(); g.moveTo(k * w / 3, 0); g.lineTo(k * w / 3, h); g.moveTo(0, k * h / 3); g.lineTo(w, k * h / 3); g.stroke(); }
    }, [1 / 1.2, 1 / 1.2]);
    const marbleF = tiles([212, 200, 180], "rgba(150,135,112,.6)", 2, 21, 16); marbleF.wrapS = marbleF.wrapT = THREE.RepeatWrapping; marbleF.repeat.set(1 / 1.2, 1 / 1.2);
    // جدار داخلي أبيض بوزرة رمادية 10 سم
    const wallT = canvasTex(8, 512, (g, w, h) => { const yy = m => h - m / FH * h; g.fillStyle = "#f4f2ee"; g.fillRect(0, 0, w, h); g.fillStyle = "#8f8a82"; g.fillRect(0, yy(0.1), w, h - yy(0.1)); g.fillStyle = "#b9b3a8"; g.fillRect(0, yy(0.11), w, 2); });
    wallT.wrapS = THREE.RepeatWrapping; wallT.repeat.set(1, 1 / FH);
    // حجر الواجهة البيج المخطّط أفقياً، مداميك 60 سم (من صور الواجهة)
    const stone = canvasTex(512, 512, (g, w, h) => {
      const R = rng(31), ch = h / 4;
      for (let r = 0; r < 4; r++) { const off = (r % 2) * w / 4; for (let c = -1; c < 3; c++) { const v = (R() - 0.5) * 16; g.fillStyle = `rgb(${214 + v},${196 + v},${164 + v})`; g.fillRect(c * w / 2 + off, r * ch, w / 2, ch); } }
      for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${R() < 0.6 ? "120,98,66" : "245,236,214"},${0.07 + R() * 0.12})`; g.lineWidth = 1; const y = R() * h; g.beginPath(); g.moveTo(R() * w, y); g.lineTo(R() * w + 60, y + (R() - 0.5) * 2); g.stroke(); }
      noise(g, w, h, 6000, 0.08, 32, 2);
      g.fillStyle = "rgba(110,90,62,.55)"; for (let r = 0; r <= 4; r++) g.fillRect(0, r * ch - 1, w, 3);
      for (let r = 0; r < 4; r++) { const off = (r % 2) * w / 4; for (let c = -1; c < 3; c++) g.fillRect(c * w / 2 + off - 1, r * ch, 3, ch); }
    }, [1 / 2.4, 1 / 2.4]);
    // الستارة العلوية: ألواح حجرية عمودية فوقها كورنيش وتحتها شريط مسنّن
    const parapet = canvasTex(256, 512, (g, w, h) => {
      const R = rng(41), H = 1.6, py = m => h - m / H * h;
      g.fillStyle = "#d6c19c"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2; i++) { const v = (R() - 0.5) * 18; g.fillStyle = `rgb(${218 + v},${200 + v},${168 + v})`; g.fillRect(i * w / 2 + 2, py(1.45), w / 2 - 4, py(0.5) - py(1.45)); }
      g.fillStyle = "#c7af88"; g.fillRect(0, py(0.5), w, py(0.42) - py(0.5));
      for (let i = 0; i < 4; i++) { g.fillStyle = "#dcc7a2"; g.fillRect(i * w / 4 + 8, py(0.4), w / 4 - 30, py(0.12) - py(0.4)); g.fillStyle = "#b9a07a"; g.fillRect(i * w / 4 + w / 4 - 20, py(0.4), 10, py(0.12) - py(0.4)); }
      g.fillStyle = "#c2a982"; g.fillRect(0, py(0.12), w, h - py(0.12)); g.fillStyle = "#c9b28c"; g.fillRect(0, 0, w, py(1.45));
      noise(g, w, h, 5000, 0.08, 42, 2);
    });
    parapet.wrapS = parapet.wrapT = THREE.RepeatWrapping; parapet.repeat.set(1 / 1.0, 1 / 1.6);
    const plaster = (base, seed, a = 0.08) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, 5000, a, seed, 2); }, [1 / 2, 1 / 2]);
    // عمود حجري مضلّع (أكتاف الواجهة)
    const flute = canvasTex(128, 64, (g, w, h) => { g.fillStyle = "#d9c4a0"; g.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(120,96,64,.35)"; g.fillRect(i * w / 5 + 4, 0, 5, h); g.fillStyle = "rgba(255,248,230,.35)"; g.fillRect(i * w / 5 + 10, 0, 3, h); } }, [1 / 0.6, 1]);
    // لوحات حجرية بنصف دائرة محفورة (أسفل يسار الواجهة)
    const relief = canvasTex(256, 192, (g, w, h) => {
      g.fillStyle = "#dcc8a3"; g.fillRect(0, 0, w, h); noise(g, w, h, 3000, 0.08, 51, 2);
      g.strokeStyle = "rgba(118,94,60,.6)"; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
      g.lineWidth = 5; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(w / 2, h - 26, 30 + k * 26, Math.PI, 2 * Math.PI); g.stroke(); }
      g.fillStyle = "rgba(118,94,60,.35)"; g.fillRect(24, h - 30, w - 48, 6);
    });
    // باب خشبي داكن بحشوات (أبواب الغرف)
    const doorWood = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = "#5a3a26"; g.fillRect(0, 0, w, h); const R = rng(61);
      for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(30,16,8,${0.1 + R() * 0.2})`; g.beginPath(); const x = R() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.6, x + 1, h); g.stroke(); }
      g.strokeStyle = "rgba(25,12,5,.75)"; g.lineWidth = 4; g.strokeRect(16, 16, w - 32, h * 0.42); g.strokeRect(16, h * 0.5, w - 32, h * 0.45);
      g.strokeStyle = "rgba(160,110,70,.35)"; g.lineWidth = 2; g.strokeRect(20, 20, w - 40, h * 0.42 - 8); g.strokeRect(20, h * 0.5 + 4, w - 40, h * 0.45 - 8);
    });
    const doorWhite = canvasTex(128, 256, (g, w, h) => { g.fillStyle = "#f1eee6"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(0,0,0,.06)"; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1); g.strokeStyle = "rgba(120,110,95,.5)"; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28); });
    // باب أسود بنقشة معيّنات (مكتب العميد)
    const doorBlack = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = "#1b1b1d"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(150,150,155,.35)"; g.lineWidth = 2;
      for (let k = -h; k < w + h; k += 22) { g.beginPath(); g.moveTo(k, 20); g.lineTo(k + h, h + 20); g.stroke(); g.beginPath(); g.moveTo(k + h, 20); g.lineTo(k, h + 20); g.stroke(); }
      g.strokeStyle = "#0d0d0e"; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    });
    // شبكة خشبية (باب الصحيات)
    const lattice = canvasTex(128, 256, (g, w, h) => { g.fillStyle = "#3d2a1c"; g.fillRect(0, 0, w, h); g.fillStyle = "#e2d8c4"; for (let y = 22; y < h - 22; y += 14) for (let x = 18; x < w - 18; x += 14) g.fillRect(x, y, 8, 8); g.strokeStyle = "#5b3d27"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); });
    // ألواح خشبية للجدران (مكتب مدير الشعبة ومكتب العميد)
    const woodPanel = canvasTex(256, 256, (g, w, h) => {
      const R = rng(13); for (let x = 0; x < w; x += 64) { const v = 92 + R() * 18 | 0; g.fillStyle = `rgb(${v + 22},${v - 8},${v - 40})`; g.fillRect(x, 0, 64, h); g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(x, 0, 3, h); }
      for (let i = 0; i < 200; i++) { g.strokeStyle = `rgba(50,26,10,${0.06 + R() * 0.14})`; g.beginPath(); const x = R() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.6, x + 2, h); g.stroke(); }
    }, [1 / 1.2, 1 / 1.2]);
    const mahog = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#5b2a17"; g.fillRect(0, 0, w, h); const R = rng(19); for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? "30,10,4" : "140,70,40"},${0.08 + R() * 0.18})`; g.beginPath(); const y = R() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 5, w * 0.6, y - 5, w, y + 2); g.stroke(); } }, [1, 1]);
    // رخام ذهبي (جدار شعبة الشؤون الإدارية والمالية)
    const goldMarble = canvasTex(256, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#c9a160"); gr.addColorStop(0.5, "#e2c48a"); gr.addColorStop(1, "#b98c4c"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const R = rng(71); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? "110,70,30" : "255,240,200"},${0.15 + R() * 0.3})`; g.lineWidth = 0.6 + R() * 2; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.4) * 60; y += (R() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = "rgba(90,60,25,.5)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h / 2 - 2); g.strokeRect(1, h / 2, w - 2, h / 2 - 2);
    }, [1 / 1.4, 1 / 2.8]);
    // بلاط سداسي (ممر الجهة الشرقية)
    const hexPav = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#7e776c"; g.fillRect(0, 0, w, h); const R = rng(81), r = 18, dx = r * 1.732, dy = r * 1.5;
      for (let j = -1; j < h / dy + 1; j++) for (let i = -1; i < w / dx + 1; i++) { const cx = i * dx + (j % 2 ? dx / 2 : 0), cy = j * dy, v = (R() - 0.5) * 22; g.fillStyle = `rgb(${176 + v},${168 + v},${152 + v})`; g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2)); } g.fill(); }
    }, [1 / 1.4, 1 / 1.4]);
    const grass = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6f9140"; g.fillRect(0, 0, w, h); const R = rng(9); for (let i = 0; i < 7000; i++) { g.fillStyle = R() < 0.5 ? "rgba(74,110,36,.55)" : "rgba(150,176,86,.45)"; g.fillRect(R() * w, R() * h, 2, 3); } }, [1 / 3, 1 / 3]);
    const concrete = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#b9b2a5"; g.fillRect(0, 0, w, h); noise(g, w, h, 8000, 0.1, 91, 2); g.strokeStyle = "rgba(90,84,74,.35)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, [1 / 4, 1 / 4]);
    const asphalt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#8d8a84"; g.fillRect(0, 0, w, h); noise(g, w, h, 12000, 0.16, 92, 2); }, [1 / 5, 1 / 5]);
    // سقف الطابق الأول: بلاطات بيضاء 60 سم
    const ceilT = tiles([238, 237, 233], "rgba(170,168,160,.7)", 2, 101, 4, 256); ceilT.wrapS = ceilT.wrapT = THREE.RepeatWrapping; ceilT.repeat.set(1 / 1.2, 1 / 1.2);
    // السجادة الحمراء المنقوشة (سجاد الصلاة عند الدرج) وسجادة مكتب العميد
    const rugT = (bg, border, motif, seed) => canvasTex(256, 384, (g, w, h) => {
      g.fillStyle = border; g.fillRect(0, 0, w, h); g.fillStyle = bg; g.fillRect(16, 16, w - 32, h - 32);
      g.strokeStyle = motif; g.lineWidth = 3; g.strokeRect(26, 26, w - 52, h - 52);
      const R = rng(seed); g.fillStyle = motif; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.22, h * 0.2, 0, 0, 7); g.fill(); g.fillStyle = bg; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.14, h * 0.12, 0, 0, 7); g.fill();
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${R() < 0.5 ? "255,240,210" : "40,20,10"},${R() * 0.25})`; g.fillRect(30 + R() * (w - 60), 30 + R() * (h - 60), 3, 3); }
    });
    const prayer = canvasTex(128, 256, (g, w, h) => { g.fillStyle = "#8e1f22"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d9b36a"; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16); g.beginPath(); g.moveTo(20, 80); g.lineTo(w / 2, 26); g.lineTo(w - 20, 80); g.lineTo(w - 20, h - 20); g.lineTo(20, h - 20); g.closePath(); g.stroke(); g.fillStyle = "#1f3b6e"; g.fillRect(30, 100, w - 60, h - 130); noise(g, w, h, 1200, 0.2, 7, 2); });
    // نقشة المفتاح اليوناني على واجهات مكاتب السكرتارية
    const greek = canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#f2efe8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b99a5a"; g.lineWidth = 4; g.beginPath(); for (let x = 0; x < w; x += 32) { g.moveTo(x, 50); g.lineTo(x, 14); g.lineTo(x + 24, 14); g.lineTo(x + 24, 40); g.lineTo(x + 10, 40); g.lineTo(x + 10, 26); } g.stroke(); g.fillStyle = "#b99a5a"; g.fillRect(0, 4, w, 3); g.fillRect(0, 57, w, 3); }, [1 / 0.6, 1]);
    // فتحات الرسائل (غرفة الاستقبال)
    const pigeon = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e9e4d8"; g.fillRect(0, 0, w, h); g.fillStyle = "#4a3a2a"; for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) g.fillRect(8 + i * 41, 8 + j * 41, 34, 34); const R = rng(5); g.fillStyle = "#f6f3ea"; for (let i = 0; i < 18; i++) g.fillRect(10 + ((R() * 6) | 0) * 41, 30 + ((R() * 6) | 0) * 41, 30, 10); });
    // صفوف أضابير على الرفوف
    const binders = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#3a2c22"; g.fillRect(0, 0, w, h); const R = rng(77), pal = ["#1b1d22", "#1f3f8c", "#24262c", "#2a4ea0", "#6b1e1e", "#2d6b3a", "#1b1d22"]; let x = 2; while (x < w) { const bw = 9 + R() * 6; g.fillStyle = pal[(R() * pal.length) | 0]; g.fillRect(x, 6 + R() * 8, bw - 1.5, h - 10); g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(x + 2, h * 0.55, bw - 5.5, 10); x += bw; } }, [1 / 0.9, 1]);
    const leaf = canvasTex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const R = rng(17); for (let i = 0; i < 9; i++) { const x = w / 2 + (R() - 0.5) * w * 0.6; g.fillStyle = `rgb(${40 + R() * 30 | 0},${100 + R() * 40 | 0},${40 + R() * 20 | 0})`; g.beginPath(); g.moveTo(w / 2 + (R() - 0.5) * 16, h); g.quadraticCurveTo(x, h * 0.4, x + (R() - 0.5) * 40, h * (0.05 + R() * 0.2)); g.quadraticCurveTo(x + 8, h * 0.45, w / 2 + 8, h); g.fill(); g.strokeStyle = "rgba(220,210,120,.6)"; g.lineWidth = 2; g.stroke(); } });
    const crystal = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, "#fffbe9"); gr.addColorStop(1, "#d7c38a"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 8; i++) g.fillRect(i * 8 + 2, 0, 2, h); });

    Object.assign(MAT, {
      carpetG: lam(0xffffff, { map: carpet("#707377", 3) }), carpetB: lam(0xffffff, { map: carpet("#8e8576", 4) }), carpetS: lam(0xffffff, { map: carpet("#62666d", 5) }),
      terr: lam(0xffffff, { map: terr }), marbleF: lam(0xffffff, { map: marbleF }), stairT: lam(0x7f8287), stairNose: lam(0xc9a54a),
      grass: lam(0xffffff, { map: grass }), concrete: lam(0xffffff, { map: concrete }), asphalt: lam(0xffffff, { map: asphalt }), hexPav: lam(0xffffff, { map: hexPav }),
      mosaic: lam(0xffffff, { map: (() => { const t = photoTex("mosaic.jpg"); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.6, 1 / 1.0); return t; })() }),
      soil: lam(0x6e5a43),
      wall: lam(0xffffff, { map: wallT }), wallM: lam(0xf4f2ee), woodPanel: lam(0xffffff, { map: woodPanel }),
      ext: lam(0xffffff, { map: stone }), extSide: lam(0xffffff, { map: plaster("#ece7dc", 33) }), stoneT: lam(0xd3bd96), plinth: lam(0xb9a47f), slab: lam(0xd8d2c4),
      parapet: lam(0xffffff, { map: parapet }), flute: lam(0xffffff, { map: flute }), relief: lam(0xffffff, { map: relief }), roof: lam(0xb4ad9f),
      ceil: lam(0xffffff, { map: ceilT, emissive: 0x7a7974 }), ceilW: lam(0xe9e7e1, { emissive: 0x8c8a85 }), ceilReg: (() => { const t = photoTex("ceiling.jpg"); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.2, 1 / 1.0); return lam(0xffffff, { map: t, emissive: 0x333028 }); })(),
      cove: basic(0xffd27a), led: basic(0xfffaf0), ledWarm: basic(0xfff1cf), down: basic(0xfffdf4),
      molding: lam(0xe6d3a3), goldTrim: lam(0xc9a54a, { emissive: 0x2a1e06 }), gold: lam(0xc9a54a), brass: lam(0xd6b25b, { emissive: 0x2c2008 }),
      goldMarble: lam(0xffffff, { map: goldMarble, emissive: 0x2a1f0c }),
      doorWood: lam(0xffffff, { map: doorWood }), doorDark: lam(0x8a7f78, { map: doorWood }), doorWhite: lam(0xffffff, { map: doorWhite }), doorBlack: lam(0xffffff, { map: doorBlack }), lattice: lam(0xffffff, { map: lattice }),
      woodDark: lam(0x4a2f1f), wood: lam(0x8a5a36), woodLight: lam(0xc39a6b), mahog: lam(0xffffff, { map: mahog }), mahogDark: lam(0x3e1a0e),
      white: lam(0xf5f4f0), cream: lam(0xe8dcc2), greek: lam(0xffffff, { map: greek }), pigeon: lam(0xffffff, { map: pigeon }), binders: lam(0xffffff, { map: binders }),
      leatherBrown: lam(0x5a3320), leatherDark: lam(0x3b2316), leatherCream: lam(0xe9dcc5), leatherBeige: lam(0xd8c6a6), sofaGrey: lam(0xb9b0a2), leatherYellow: lam(0xd7a22c), leatherWhite: lam(0xefece6),
      leatherBlue: lam(0x24406e), seatBlue: lam(0x2f55a8), chrome: lam(0xc8cdd2), steel: lam(0xb4bac0), black: lam(0x232427), frameBlack: lam(0x18191b), grey: lam(0x8c9196), greyDark: lam(0x4a4e53),
      alu: lam(0x9ea3a8), glass: basic(0x9cb8c2, { transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }), glassDark: basic(0x2a3236, { transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide }),
      glassCab: basic(0x9fb4bb, { transparent: true, opacity: 0.25, depthWrite: false }), glassDoor: basic(0x46565c, { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), glass2s: basic(0xa9c3cc, { transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
      winGlass: basic(0xcfe6f2), winFrame: lam(0xf2f2ef), screen: basic(0x1d2730), screenOn: basic(0x2f6e8f), paper: lam(0xf6f4ee), devWhite: lam(0xf1f1ee), devGrey: lam(0xb8bec3),
      red: lam(0xc8322b), green: lam(0x2f6b3a), leafVar: lam(0x6f8f2c, { side: THREE.DoubleSide }), plantG: lam(0x3f7d3a), pot: lam(0xe9e5dc), potDark: lam(0x3a3634), trunk: lam(0x6b5038), foliage: lam(0x5b8a3c, { flatShading: true }), hedge: lam(0x4f7a33, { flatShading: true }),
      roofRed: lam(0x8f2f28), roofRedD: lam(0x7e2620), iron: lam(0x2b2a29), ironGold: lam(0xb8923e), truss: lam(0x5d5a56),
      leaf: lam(0xffffff, { map: leaf, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), crystal: basic(0xffffff, { map: crystal }),
      rugDean: lam(0xffffff, { map: rugT("#b79c74", "#5a3a24", "#6f4a2c", 11) }), rugRed: lam(0xffffff, { map: rugT("#8a2328", "#3c1c1a", "#d0a565", 12) }), rugBlue: lam(0xffffff, { map: rugT("#2c3e66", "#1a2238", "#c4a568", 13) }),
      prayer: lam(0xffffff, { map: prayer }), skyWin: basic(0xbcd8ea),
      
      ph_logo_col: photo("logo_col.jpg"), ph_logo_uni: photo("logo_uni.jpg")
    });
  }

  /* خامات إضافية مرسومة (بلا صور): الشبابيك والمشبّكات وورق الجدران والرخام والأسقف */
  function materials2() {
    const ct = (w, h, draw, rep) => canvasTex(w, h, draw, rep);
    const scroll = (g, x, y, r, a0, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(x, y, r, a0, a0 + Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(x + r * 0.55 * Math.cos(a0 + Math.PI * 1.5), y + r * 0.55 * Math.sin(a0 + Math.PI * 1.5), r * 0.45, a0 + Math.PI * 1.5, a0 + Math.PI * 2.8); g.stroke(); };
    // شبّاك خارجي: إطار حجري وردي، زجاج أزرق بقضبان أفقية، ومشبّك حديدي أسود
    const winT = (narrow) => ct(256, 320, (g, w, h) => {
      g.fillStyle = "#cfa996"; g.fillRect(0, 0, w, h); g.fillStyle = "#b98f7c"; g.fillRect(14, 14, w - 28, h - 28);
      g.fillStyle = "#2a5fa8"; g.fillRect(30, 30, w - 60, h - 60);
      g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(30, 30, (w - 60) * 0.45, h - 60);
      g.fillStyle = "#1a1c20"; for (let y = 38; y < h - 30; y += 16) g.fillRect(30, y, w - 60, 4);
      g.fillStyle = "#e6e6e2"; g.fillRect(w / 2 - 3, 30, 6, h - 60); g.fillRect(30, h * 0.55, w - 60, 6);
      g.strokeStyle = "#141518"; g.lineWidth = 5; g.strokeRect(30, 30, w - 60, h - 60);
      if (!narrow) for (let i = 0; i < 6; i++) scroll(g, 50 + i * 32, 46, 9, i, "#141518", 3);
    });
    // الشبّاك الكبير بمشبّك حديدي أسود مزخرف
    const bigG = ct(512, 320, (g, w, h) => {
      g.fillStyle = "#3a3d42"; g.fillRect(0, 0, w, h);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const cx = w * (0.25 + i * 0.5), cy = h * 0.5; g.strokeStyle = "#0e0f11"; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, h * 0.3, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, h * 0.14, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; scroll(g, cx + Math.cos(a) * h * 0.22, cy + Math.sin(a) * h * 0.22, 14, a, "#0e0f11", 5); } }
      g.strokeStyle = "#0e0f11"; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
      for (let i = 0; i < 16; i++) scroll(g, 20 + i * 31, 20, 8, i, "#0e0f11", 4);
      g.strokeStyle = "#c9b28c"; g.lineWidth = 16; g.strokeRect(0, 0, w, h);
    });
    // زجاج مشبّك بمعيّنات (لوحتا جانبي المدخل والباب الجانبي)
    const latG = ct(128, 512, (g, w, h) => { g.fillStyle = "#cfd9dc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#141518"; g.lineWidth = 4; for (let k = -h; k < w + h; k += 28) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); });
    // المشبّك الأسود بالأوراق الذهبية فوق الباب الرئيسي
    const tr = ct(512, 220, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = "#141518"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); g.fillRect(w / 3 - 4, 0, 8, h); g.fillRect(2 * w / 3 - 4, 0, 8, h);
      for (let i = 0; i < 3; i++) { const cx = w * (i + 0.5) / 3; for (let k = 0; k < 6; k++) scroll(g, cx + (k % 3 - 1) * 46, h * (k < 3 ? 0.33 : 0.67), 20, k * 1.1, "#141518", 6); g.fillStyle = "#d4a83a"; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + (k % 2 ? 30 : -30), h * (k < 2 ? 0.25 : 0.75), 13, 7, k, 0, 7); g.fill(); } }
    });
    const trL = ct(256, 96, (g, w, h) => { g.fillStyle = "#d9e2e6"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3d2a1c"; g.lineWidth = 4; for (let k = -h; k < w + h; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } });
    // باب خشبي داكن منحوت (باب شعبة التسجيل) وباب خشبي فاتح بزجاج مزخرف (الصحيات)
    const carved = (base, light) => ct(160, 320, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h); const R = rng(9);
      for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(20,10,5,${0.08 + R() * 0.15})`; g.beginPath(); const x = R() * w; g.moveTo(x, 0); g.lineTo(x + 2, h); g.stroke(); }
      g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = 4; g.beginPath(); g.moveTo(18, h * 0.42); g.quadraticCurveTo(w / 2, h * 0.3, w - 18, h * 0.42); g.lineTo(w - 18, h * 0.08); g.lineTo(18, h * 0.08); g.closePath(); g.stroke();
      if (light) { g.fillStyle = "#d8c27a"; g.fillRect(34, 40, w - 68, h * 0.42 - 50); g.strokeStyle = base; g.lineWidth = 7; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(w / 2, 70 + k * 30, 22, 14, 0, 0, 7); g.stroke(); } }
      else { g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 3; for (let k = -h; k < w + h; k += 16) { g.beginPath(); g.moveTo(k, h * 0.5); g.lineTo(k + h * 0.4, h * 0.9); g.stroke(); g.beginPath(); g.moveTo(k + h * 0.4, h * 0.5); g.lineTo(k, h * 0.9); g.stroke(); } }
      g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 4; g.strokeRect(18, h * 0.48, w - 36, h * 0.44);
      g.strokeStyle = light ? "rgba(255,230,180,.35)" : "rgba(160,110,70,.3)"; g.lineWidth = 2; g.strokeRect(22, h * 0.48 + 4, w - 44, h * 0.44 - 8);
    });
    const diamondDoor = ct(160, 320, (g, w, h) => { g.fillStyle = "#4a2e20"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = 3; for (let k = -h; k < w + h; k += 26) { g.beginPath(); g.moveTo(k, 20); g.lineTo(k + h, h + 20); g.stroke(); g.beginPath(); g.moveTo(k + h, 20); g.lineTo(k, h + 20); g.stroke(); } g.strokeStyle = "rgba(170,120,80,.35)"; g.lineWidth = 2; for (let k = -h + 3; k < w + h; k += 26) { g.beginPath(); g.moveTo(k, 20); g.lineTo(k + h, h + 20); g.stroke(); } g.strokeStyle = "#2c1a10"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); });
    // ورق جدران مضرّب بنقشة المعيّنات (بيت الدرج، التخطيط)
    const quilt = ct(256, 256, (g, w, h) => { g.fillStyle = "#e7dcc7"; g.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const cx = (i + (j % 2) * 0.5) * w / 4, cy = j * h / 4 + h / 8; const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 34); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(150,130,100,.25)"); g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy - 32); g.lineTo(cx + 32, cy); g.lineTo(cx, cy + 32); g.lineTo(cx - 32, cy); g.closePath(); g.fill(); } g.strokeStyle = "rgba(140,120,90,.45)"; g.lineWidth = 2; for (let k = -h; k < w + h; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } }, [1 / 1.2, 1 / 1.2]);
    // رخام أبيض بعروق رمادية (ممر الطابق الأول والدراسات العليا)
    const marbleW = ct(512, 512, (g, w, h) => { g.fillStyle = "#efefed"; g.fillRect(0, 0, w, h); const R = rng(44); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(160,160,158,${0.04 + R() * 0.08})`; g.lineWidth = 0.6 + R() * 1.6; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 90; y += 20 + R() * 40; g.lineTo(x, y); } g.stroke(); } noise(g, w, h, 4000, 0.05, 45, 2); }, [1 / 2.4, 1 / 2.4]);
    const panelW = ct(256, 256, (g, w, h) => { g.fillStyle = "#f6f6f4"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(0, 0, w, h * 0.15); g.strokeStyle = "rgba(180,180,175,.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 1); g.lineTo(w, 1); g.moveTo(1, 0); g.lineTo(1, h); g.stroke(); }, [1 / 1.2, 1 / 1.2]);
    const panelB = ct(256, 256, (g, w, h) => { g.fillStyle = "#e9dfc6"; g.fillRect(0, 0, w, h); g.fillStyle = "#6b4a2e"; g.fillRect(0, 0, 10, h); g.fillRect(0, h - 10, w, 10); noise(g, w, h, 2000, 0.05, 46, 2); }, [1 / 1.2, 1 / 1.2]);
    // أسقف: بلاطات بيج 60 سم ولوحة إنارة، وبلاطات بيضاء مثقّبة
    const tileC = ct(256, 256, (g, w, h) => { g.fillStyle = "#e3d8c0"; g.fillRect(0, 0, w, h); noise(g, w, h, 3000, 0.06, 47, 2); g.strokeStyle = "#b9a988"; g.lineWidth = 5; g.strokeRect(0, 0, w, h); }, [1 / 0.6, 1 / 0.6]);
    const perfC = ct(256, 256, (g, w, h) => { g.fillStyle = "#f3f3f1"; g.fillRect(0, 0, w, h); g.fillStyle = "#c9c9c6"; for (let y = 8; y < h; y += 12) for (let x = 8; x < w; x += 12) g.fillRect(x, y, 3, 3); g.strokeStyle = "#cfcfcb"; g.lineWidth = 6; g.strokeRect(0, 0, w, h); }, [1 / 0.6, 1 / 0.6]);
    // تيرازو بحبيبات (الحسابات) وبلاط مربعات أسود وأبيض (التدقيق)
    const tDots = ct(256, 256, (g, w, h) => { g.fillStyle = "#e7e3dc"; g.fillRect(0, 0, w, h); const R = rng(48), pal = ["#2b2b2b", "#7a7470", "#b3aca3", "#5a4b3d"]; for (let i = 0; i < 2600; i++) { g.fillStyle = pal[(R() * 4) | 0]; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); } }, [1 / 1.0, 1 / 1.0]);
    const tCheck = ct(256, 256, (g, w, h) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) % 2 ? "#2e2e30" : "#e9e7e2"; g.fillRect(i * w / 4, j * h / 4, w / 4, h / 4); } noise(g, w, h, 3000, 0.08, 49, 2); }, [1 / 1.2, 1 / 1.2]);
    const glassD = ct(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "rgba(210,225,230,.25)"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; [[0.15, 0.3], [0.85, 0.3], [0.5, 0.15], [0.3, 0.6], [0.7, 0.6]].forEach(([u, v]) => { g.save(); g.translate(u * w, v * h); g.rotate(Math.PI / 4); g.fillRect(-5, -5, 10, 10); g.restore(); }); });
    const frost = ct(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "rgba(200,215,220,.28)"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(245,248,248,.85)"; [0.3, 0.4, 0.5, 0.6].forEach(v => g.fillRect(0, v * h, w, 8)); });
    const mirrorG = ct(128, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#e8cf8a"); gr.addColorStop(0.5, "#fff1c4"); gr.addColorStop(1, "#c79f4c"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const roundRug = ct(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#e8e2d6"; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill(); g.strokeStyle = "#8a7a62"; g.lineWidth = 6; for (let r = 30; r < w / 2; r += 28) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); } });
    const beigeRug = ct(256, 384, (g, w, h) => { g.fillStyle = "#d9cbb0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8c6e4a"; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24); const R = rng(50); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,90,60,${0.3 + R() * 0.3})`; g.lineWidth = 2; g.beginPath(); g.arc(30 + R() * (w - 60), 30 + R() * (h - 60), 6 + R() * 14, 0, 7); g.stroke(); } });
    const latC = ct(256, 256, (g, w, h) => { g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#a9a9a4"; g.lineWidth = 6; for (let i = 0; i < 4; i++) { const s = 12 + i * 28; g.strokeRect(s, s, w - 2 * s, h - 2 * s); g.beginPath(); g.moveTo(w / 2, s); g.lineTo(w / 2, s + 16); g.moveTo(s, h / 2); g.lineTo(s + 16, h / 2); g.stroke(); } }, [3, 3]);
    const scrollT = ct(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) scroll(g, 32 + i * 64, 32 + j * 64, 22, i + j, "#141518", 7); g.strokeStyle = "#141518"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); });
    const rattan = ct(128, 256, (g, w, h) => { g.fillStyle = "#b08a5a"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(80,55,30,.6)"; g.lineWidth = 2; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 3); g.stroke(); } g.strokeStyle = "#5a3a20"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); });
    const blind = (a, b, rep) => ct(32, 128, (g, w, h) => { for (let y = 0; y < h; y += rep) { g.fillStyle = a; g.fillRect(0, y, w, rep / 2); g.fillStyle = b; g.fillRect(0, y + rep / 2, w, rep / 2); } });
    const cart = ct(512, 160, (g, w, h) => { g.fillStyle = "#d8c29c"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(110,86,54,.7)"; g.lineWidth = 6; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 12, 0, 0, 7); g.stroke(); for (let i = 0; i < 7; i++) { g.lineWidth = 5; g.strokeRect(70 + i * 55, 50, 34, 60); } noise(g, w, h, 2000, 0.08, 51, 2); });
    Object.assign(MAT, {
      winOut: lam(0xffffff, { map: winT(false) }), winOutS: lam(0xffffff, { map: winT(true) }), bigGrille: lam(0xffffff, { map: bigG }),
      latticeGlass: lam(0xffffff, { map: latG, side: THREE.DoubleSide }), transom: lam(0xffffff, { map: tr, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }),
      transomLattice: lam(0xffffff, { map: trL, side: THREE.DoubleSide }), doorCarved: lam(0xffffff, { map: carved("#3e271b", false) }), doorCarvedL: lam(0xffffff, { map: carved("#9a6a33", true) }), doorDiamond: lam(0xffffff, { map: diamondDoor }),
      quilt: lam(0xffffff, { map: quilt }), wallMarble: lam(0xffffff, { map: marbleW }), panelWhite: lam(0xffffff, { map: panelW, emissive: 0x202020 }), panelBeige: lam(0xffffff, { map: panelB }), panelTrim: lam(0xffffff),
      ceilTile: lam(0xffffff, { map: tileC, emissive: 0x4a463c }), ceilPerf: lam(0xffffff, { map: perfC, emissive: 0x5a5a58 }), terrDots: lam(0xffffff, { map: tDots }), terrCheck: lam(0xffffff, { map: tCheck }),
      glassDiamond: basic(0xffffff, { map: glassD, transparent: true, depthWrite: false, side: THREE.DoubleSide }), glassFrost: basic(0xffffff, { map: frost, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      goldMirror: lam(0xffffff, { map: mirrorG, emissive: 0x3a2c10 }), woodPanelD: lam(0x8a5a32), woodFrame: lam(0x6e4626), stairEdge: lam(0x1c1c1e), marbleStep: lam(0xf1efea),
      pinkStone: lam(0xc99c8c), cartouche: lam(0xffffff, { map: cart }), lampGlass: basic(0xffe7b0), rugBeige: lam(0xffffff, { map: beigeRug }), rugRound: lam(0xffffff, { map: roundRug, transparent: true, alphaTest: 0.5 }),
      nameGold: basic(0xe8c34a), glassTop: basic(0xbfd4dc, { transparent: true, opacity: 0.55 }), flowers: lam(0xe7a3b5, { flatShading: true }), medallion: lam(0x4a2a18), latticeCeil: lam(0xffffff, { map: latC, side: THREE.DoubleSide }),
      rattan: lam(0xffffff, { map: rattan }), foliageD: lam(0x3f6a2c, { flatShading: true }), gravel: lam(0x9d968a), roofUnder: lam(0x7a5a3c), ironScroll: lam(0xffffff, { map: scrollT, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }),
      zebra: basic(0xffffff, { map: blind("rgba(118,98,74,.97)", "rgba(236,228,214,.55)", 32), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      curtain: lam(0xf1ece0, { transparent: true, opacity: 0.85, side: THREE.DoubleSide }), roller: lam(0xd9cdb4, { side: THREE.DoubleSide })
    });
    MAT.glassDoor.opacity = 0.62;
  }

  /* اللوحات والنصوص (مكتوبة نصّاً كما في الصور) */
  function withLogos(g, w, h, y, s, both = true) {
    const a = logoImg(), b = uniImg();
    if (a.complete && a.naturalWidth) g.drawImage(a, w - s - 20, y, s, s);
    if (both && b.complete && b.naturalWidth) g.drawImage(b, 20, y, s * 0.62, s);
  }
  let _uni = null;
  function uniImg() { if (_uni) return _uni; _uni = new Image(); _uni.onload = () => TEXJOBS.forEach(j => j()); _uni.src = TEX + "logo_uni.jpg"; return _uni; }
  function signMat() { // اللوحة السوداء فوق المدخل
    return lam(0xffffff, { emissive: 0x222222, map: textTex(1024, 484, (g, w, h) => {
      g.fillStyle = "#0d0d0f"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c9a54a"; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
      withLogos(g, w, h, 40, 150);
      g.fillStyle = "#e3bb4f"; fitFont(g, "جامعة تكريت", 800, 78, 520); g.fillText("جامعة تكريت", w / 2, 82);
      g.fillStyle = "#ffffff"; fitFont(g, "عمادة", 900, 120, 420); g.fillText("عمادة", w / 2 + 40, 200);
      g.fillStyle = "#cfcfcf"; g.font = `600 30px ${FONT}`; g.fillText("تأسست ١٩٩٢", w / 2 - 200, 205);
      g.fillStyle = "#e0262c"; fitFont(g, "كلية التربية للعلوم الصرفة", 900, 118, w - 70); g.fillText("كلية التربية للعلوم الصرفة", w / 2, 360);
    }) });
  }
  function sideSignMat() { // اللوحة السوداء على الجدار الشرقي
    return lam(0xffffff, { map: textTex(1024, 250, (g, w, h) => {
      g.fillStyle = "#121214"; g.fillRect(0, 0, w, h); withLogos(g, w, h, 30, 150, false);
      g.fillStyle = "#f2f2f2"; fitFont(g, "جامعة تكريت", 800, 64, 600); g.fillText("جامعة تكريت", w / 2 - 60, 80);
      fitFont(g, "عمادة كلية التربية للعلوم الصرفة", 800, 72, 760); g.fillText("عمادة كلية التربية للعلوم الصرفة", w / 2 - 60, 175);
    }) });
  }
  function qualityBannerMat() { // لافتة «عام الجودة» بجانب الباب الجانبي
    return lam(0xffffff, { map: textTex(400, 512, (g, w, h) => {
      g.fillStyle = "#fbfaf7"; g.fillRect(0, 0, w, h); withLogos(g, w, h, 14, 70);
      g.fillStyle = "#b3141b"; fitFont(g, "عام الجودة", 900, 46, w - 170); g.fillText("عام الجودة", w / 2, 60);
      g.font = `800 32px ${FONT}`; g.fillText("٢٠٢٦ – ٢٠٢٧", w / 2, 108);
      fitFont(g, "كلية التربية للعلوم الصرفة", 900, 40, w - 30); g.fillText("كلية التربية للعلوم الصرفة", w / 2, 160);
      g.fillStyle = "#111"; fitFont(g, "اهلاً وسهلاً بطلبتنا الاعزاء", 800, 32, w - 40); g.fillText("اهلاً وسهلاً بطلبتنا الاعزاء", w / 2, 210);
      g.font = `600 20px ${FONT}`; ["نرحب بكم في رحاب كليتكم ونبارك للطلبة الجدد", "الانظمام الى اسرتنا العلمية متمنين لكم عاماً دراسياً", "حافلاً بالنجاح والتميز"].forEach((t, i) => { fitFont(g, t, 600, 20, w - 30); g.fillText(t, w / 2, 262 + i * 32); });
      g.fillStyle = "#b3141b"; g.font = `700 22px ${FONT}`; g.fillText("قسم علوم الحياة     قسم الفيزياء", w / 2, 410); g.fillText("قسم الكيمياء     قسم الرياضيات", w / 2, 450);
    }) });
  }
  function paperMat(t) { return lam(0xffffff, { map: textTex(256, 160, (g, w, h) => { g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; const parts = t.split(" "); if (parts.length > 1 && t.length > 10) { fitFont(g, parts[0], 700, 40, w - 20); g.fillText(parts[0], w / 2, h * 0.35); fitFont(g, parts.slice(1).join(" "), 700, 40, w - 20); g.fillText(parts.slice(1).join(" "), w / 2, h * 0.7); } else { fitFont(g, t, 700, 44, w - 20); g.fillText(t, w / 2, h / 2); } }) }); }
  function textPlateMat(a, b) { return lam(0xffffff, { map: textTex(512, 250, (g, w, h) => { g.fillStyle = "#f7f7f4"; g.fillRect(0, 0, w, h); g.fillStyle = "#1b1b1b"; fitFont(g, a, 700, 46, w - 40); g.fillText(a, w / 2, h * 0.36); fitFont(g, b, 700, 46, w - 40); g.fillText(b, w / 2, h * 0.7); }) }); }
  function exitMat() { return basic(0xffffff, { map: textTex(256, 100, (g, w, h) => { g.fillStyle = "#f4f7f2"; g.fillRect(0, 0, w, h); g.fillStyle = "#1c9b45"; g.fillRect(0, 0, w * 0.32, h); g.fillStyle = "#fff"; g.font = `800 34px ${FONT}`; g.fillText("←", w * 0.16, h / 2); g.fillStyle = "#1c9b45"; g.font = `800 36px Arial`; g.fillText("Exit", w * 0.62, h * 0.34); g.font = `800 34px ${FONT}`; g.fillText("خروج", w * 0.62, h * 0.74); }) }); }
  function fireSignMat() { return lam(0xffffff, { map: textTex(256, 180, (g, w, h) => { g.fillStyle = "#8e1418"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; fitFont(g, "تعليمات استخدام طفاية الحريق", 700, 22, w - 20); g.fillText("تعليمات استخدام طفاية الحريق", w / 2, 24); g.font = `600 16px ${FONT}`; ["اسحب مسمار الأمان", "احمل الجهاز", "وجّه القاذف", "اضغط ذراع التشغيل"].forEach((t, i) => g.fillText(t, w * 0.62, 62 + i * 30)); g.fillStyle = "#e33"; g.fillRect(28, 60, 36, 100); }) }); }
  function councilHeaderMat() { // لوحة باب قاعة المجلس: «امانة المجلس» بحروف ذهبية وشعار الكلية
    return lam(0xffffff, { emissive: 0x303030, map: textTex(640, 300, (g, w, h) => {
      g.fillStyle = "#fbfbf9"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d8c287"; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
      g.shadowColor = "rgba(90,60,10,.5)"; g.shadowBlur = 4; g.shadowOffsetY = 2; g.fillStyle = "#c9a13e"; fitFont(g, "امانة المجلس", 900, 110, w - 80); g.fillText("امانة المجلس", w / 2, 92); g.shadowBlur = 0; g.shadowOffsetY = 0;
      const a = logoImg(); if (a.complete && a.naturalWidth) g.drawImage(a, w / 2 - 60, 160, 120, 120);
    }) });
  }
  function deanPlateMat() { // لوحة الاسم على مكتب العميد
    return lam(0xffffff, { emissive: 0x2a2008, map: textTex(640, 140, (g, w, h) => {
      g.fillStyle = "#5a3820"; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f0d27c"); gr.addColorStop(1, "#c79b38"); g.fillStyle = gr; g.fillRect(70, 10, w - 140, h - 20);
      const a = logoImg(), b = uniImg(); if (a.complete && a.naturalWidth) g.drawImage(a, w - 66, 34, 60, 60); if (b.complete && b.naturalWidth) g.drawImage(b, 14, 30, 42, 68);
      g.fillStyle = "#111"; g.font = `700 22px ${FONT}`; g.fillText("الأستاذ الدكتور", w / 2, 30);
      fitFont(g, DEAN_NAME, 900, 50, w - 170); g.fillText(DEAN_NAME, w / 2, 72); g.font = `700 22px ${FONT}`; g.fillText("عميد الكلية", w / 2, 114);
    }) });
  }
  /* لوحة الرؤية والرسالة كما في صورتها */
  const BOARD = {
    uni: [["رؤية الجامعة", "مؤسسة رائدة ومتميزة بالتعليم العالي والبحث العلمي وخدمة المجتمع على المستوى المحلي والاقليمي وصولا الى مصاف الجامعات العالمية عالية الجودة."],
      ["رسالة الجامعة", "توفير بيئة تعليمية متميزة ودعم البحوث المنتجة ذات الجودة العالية وسد متطلبات سوق العمل بالمهارات المطلوبة التي تقوم على تطبيق تكنولوجيا المعلومات من اجل رفع مستوى الاداء بما يخدم الجهات المستفيدة ضمن الامكانيات المتاحة والمحفزة للابتكار والريادة."],
      ["اهداف الجامعة", "تطوير قدرات الجامعة البشرية والمادية والارتقاء بمستوى البحث العلمي محليا وعربيا وعالميا والتنوع باساليب التعليم والتعلم الحديثة للوفاء بمتطلبات الجودة وحوكمة الجامعة اداريا وماليا والتحول الى جامعة منتجة وتعزيز دور الجامعة في خدمة المجتمع."]],
    col: [["رؤية الكلية", "أن تكون الكلية واحدة من الكليات التربوية الرائدة ذات المكانة والسمعة الطيبة بالبلد لإعداد الكوادر الجيدة من الخريجين والمدرسين للعمل في الدوائر والمؤسسات ذات العلاقة وخدمة المجتمع. يتولى مهمة التدريس والإشراف على الطلبة نخبة طيبة من السادة التدريسيين والتدريسيات، ويسهمون جميعا في دعم المسيرة العلمية والتربوية للكلية والتوجه بها نحو آفاق رحبة من التقدم."],
      ["رسالة الكلية", "تتحدد رسالة كلية التربية للعلوم الصرفة بإعداد مدرسين (قادة ومربين وباحثين) بالمدارس الثانوية والمؤسسات التربوية لهم القدرة على الاسهام الفعال في خلق التغيرات العلمية والثقافية والاجتماعية وبما يخدم الوطن، ويساعده على مواكبة التطور العلمي في العالم وتطوير اساليب التعليم، والتعاون مع كليات جامعة بغداد والجامعات الاخرى ووزارة التربية ووزارة التعليم العالي والوزارات الأخرى المعنية وبما يخدم المجتمع."],
      ["هدف الكلية", "في ضوء الرؤية والرسالة للكلية فإن الأهداف لكلية التربية للعلوم الصرفة اعداد مدرسين أكفاء وفق الاتجاهات التربوية الحديثة للعمل في المدارس الثانوية العراقية (المتوسطة والإعدادية)، وإعداد متخصصين مؤهلين للعمل في مختلف المجالات التطبيقية، والمساهمة في رفع كفاءة معلمي ومدرسي وزارة التربية، وإعداد جيل من الباحثين في مختلف الاختصاصات التربوية والعلمية، ونشر الوعي التربوي والعلمي بين المجتمع، وتطوير المناهج والمقررات الدراسية، والعمل على استحداث دراسات او تخصصات حديثة وبما يخدم التطورات الحاصلة بالمجتمع وسوق العمل."]]
  };
  function wrapText(g, text, x, y, maxW, lh) {
    const words = text.split(" "); let line = "", yy = y;
    for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
    if (line) { g.fillText(line, x, yy); yy += lh; }
    return yy;
  }
  function boardMat() {
    return lam(0xffffff, { emissive: 0x2a2a2a, map: textTex(1400, 1230, (g, w, h) => {
      g.fillStyle = "#f2f2ef"; g.fillRect(0, 0, w, h); g.strokeStyle = "#1a1a1a"; g.lineWidth = 6; g.strokeRect(20, 20, w - 40, h - 40);
      g.fillStyle = "#4a1818"; fitFont(g, "جامعة تكريت", 900, 80, 600); g.fillText("جامعة تكريت", w / 2, 95); fitFont(g, "كلية التربية للعلوم الصرفة", 900, 84, 900); g.fillText("كلية التربية للعلوم الصرفة", w / 2, 200);
      const a = logoImg(), b = uniImg(); if (a.complete && a.naturalWidth) g.drawImage(a, 60, 40, 200, 200); if (b.complete && b.naturalWidth) g.drawImage(b, w - 200, 40, 120, 195);
      g.fillStyle = "#1a1a1a"; g.fillRect(20, 255, w - 40, 5); g.fillRect(w / 2 - 2, 260, 4, h - 280);
      const col = (list, x0, x1, fs) => { let y = 300; g.textAlign = "right"; list.forEach(([t, body]) => { g.fillStyle = "#111"; g.font = `800 ${fs + 8}px ${FONT}`; g.fillText(t, x1, y); y += fs + 22; g.font = `600 ${fs}px ${FONT}`; y = wrapText(g, body, x1, y, x1 - x0, fs * 1.42) + 22; }); g.textAlign = "center"; };
      col(BOARD.uni, w / 2 + 40, w - 50, 27); col(BOARD.col, 50, w / 2 - 30, 19);
    }) });
  }

  /* نصوص اللوحات: تُرسم على قماش وتُعاد بعد تحميل الخطوط */
  function plaqueMat(name, code) {
    return lam(0xffffff, { emissive: 0x2a2008, map: textTex(384, 112, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#e8c874"); gr.addColorStop(0.5, "#c9a24c"); gr.addColorStop(1, "#b48b36"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#6e521c"; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = "#1e1608"; fitFont(g, name, 700, 32, w - 34); g.fillText(name, w / 2, code ? h * 0.38 : h / 2);
      if (code) { g.font = `700 30px ${FONT}`; g.direction = "ltr"; g.fillText(code, w / 2, h * 0.74); }
    }) });
  }
  function lettersMat(text, w, h, color = "#e2bd62", size = 120, sub) {
    return basic(0xffffff, { transparent: true, depthWrite: false, map: textTex(w, h, (g, W, H) => {
      g.shadowColor = "rgba(60,40,10,.7)"; g.shadowBlur = 6; g.shadowOffsetY = 3; g.fillStyle = color;
      fitFont(g, text, 800, size, W - 20); g.fillText(text, W / 2, sub ? H * 0.38 : H / 2);
      if (sub) { fitFont(g, sub, 600, size * 0.45, W - 40); g.fillText(sub, W / 2, H * 0.78); }
    }) });
  }
  /* ملصق «مهام الشعبة» بنصّه الكامل كما صُوِّر: إطار زخرفي كحلي، عنوان أحمر، بنود مرقّمة بخط عريض، وشعار الكلية باهتاً في الوسط */
  const AR = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  function posterLines(g, P, W, fs) {
    g.font = `800 ${fs}px ${FONT}`;
    const R = W - 66, L = 58, lh = Math.round(fs * 1.55), out = []; let y = 0;
    P.items.forEach((it, i) => {
      const num = AR(i + 1) + " : ", nw = g.measureText(num).width, maxW = R - L - nw;
      let line = "", first = true;
      const push = () => { out.push({ t: line, y, num: first ? num : null, nw }); first = false; y += lh; line = ""; };
      it.split(" ").forEach(wd => { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > maxW && line) { push(); line = wd; } else line = t; });
      if (line) push();
      y += Math.round(fs * 0.22);
    });
    return { lines: out, h: y };
  }
  function ornament(g, w, h) {
    const m = 30, ink = "#17203b";
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = "round";
    g.lineWidth = 7; g.beginPath();
    g.moveTo(m + 120, m); g.lineTo(w / 2 - 170, m); g.moveTo(w / 2 + 170, m); g.lineTo(w - m - 120, m);
    g.moveTo(m + 120, h - m); g.lineTo(w / 2 - 170, h - m); g.moveTo(w / 2 + 170, h - m); g.lineTo(w - m - 120, h - m);
    g.moveTo(m, m + 120); g.lineTo(m, h - m - 120); g.moveTo(w - m, m + 120); g.lineTo(w - m, h - m - 120); g.stroke();
    const scroll = (cx, cy, s) => {
      g.lineWidth = 6;
      [-1, 1].forEach(d => {
        g.beginPath(); g.arc(cx + d * 44, cy + s * 4, 22, 0, Math.PI * 2 * 0.82); g.stroke();
        g.beginPath(); g.arc(cx + d * 104, cy + s * 2, 15, 0, Math.PI * 1.6); g.stroke();
        g.beginPath(); g.moveTo(cx + d * 20, cy - s * 14); g.quadraticCurveTo(cx + d * 80, cy - s * 30, cx + d * 165, cy); g.stroke();
      });
      g.beginPath(); g.arc(cx, cy - s * 2, 11, 0, 7); g.fill();
    };
    scroll(w / 2, m + 6, 1); scroll(w / 2, h - m - 6, -1);
    const corner = (x, y, sx, sy) => {
      g.lineWidth = 6;
      g.beginPath(); g.arc(x + sx * 52, y + sy * 52, 26, 0, Math.PI * 1.7); g.stroke();
      g.beginPath(); g.moveTo(x, y + sy * 118); g.quadraticCurveTo(x + sx * 4, y + sy * 4, x + sx * 118, y); g.stroke();
      g.beginPath(); g.arc(x + sx * 96, y + sy * 26, 12, 0, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(x + sx * 26, y + sy * 96, 12, 0, Math.PI * 1.5); g.stroke();
      g.beginPath(); g.moveTo(x + sx * 6, y + sy * 6); g.lineTo(x + sx * 30, y + sy * 14); g.lineTo(x + sx * 14, y + sy * 30); g.closePath(); g.fill();
    };
    corner(m - 10, m - 10, 1, 1); corner(w - m + 10, m - 10, -1, 1); corner(m - 10, h - m + 10, 1, -1); corner(w - m + 10, h - m + 10, -1, -1);
  }
  const POSTERMAT = {};
  function posterMat(key) {
    if (POSTERMAT[key]) return POSTERMAT[key];
    const P = POSTERS[key], W = 820, fs = 25, top = 136;
    const lay = posterLines(document.createElement("canvas").getContext("2d"), P, W, fs);
    const H = Math.round(top + lay.h + (P.foot ? 130 : 66));
    const mat = lam(0xffffff, { map: textTex(W, H, (g, w, h) => {
      g.fillStyle = "#fbfbf9"; g.fillRect(0, 0, w, h);
      const lg = logoImg(); if (lg.complete && lg.naturalWidth) { g.globalAlpha = 0.09; const s = Math.min(w, h) * 0.66; g.drawImage(lg, (w - s) / 2, (h - s) / 2, s, s); g.globalAlpha = 1; }
      ornament(g, w, h);
      g.fillStyle = "#b5171d"; fitFont(g, P.title, 900, 46, w - 230); g.fillText(P.title, w / 2, 92);
      const l2 = posterLines(g, P, w, fs); g.fillStyle = "#101010"; g.textAlign = "right";
      l2.lines.forEach(L => { g.font = `800 ${fs}px ${FONT}`; g.fillText(L.num ? L.num + L.t : L.t, w - 66 - (L.num ? 0 : L.nw), top + L.y); });
      g.textAlign = "center";
      if (P.foot) { g.fillStyle = "rgba(70,70,70,.38)"; g.font = `800 36px ${FONT}`; g.fillText(P.foot, w / 2, h - 72); }
    }) });
    return (POSTERMAT[key] = { mat, w: 0.88, h: 0.88 * H / W });
  }
  /* الهيكل التنظيمي المؤطّر تحت الملصق: الترويسة والعنوان، ومربعات بلا صور ولا أسماء أشخاص */
  const CHARTMAT = {};
  function chartMat(title) {
    if (CHARTMAT[title]) return CHARTMAT[title];
    return (CHARTMAT[title] = lam(0xffffff, { map: textTex(560, 400, (g, w, h) => {
      g.fillStyle = "#fbfbfa"; g.fillRect(0, 0, w, h);
      const a = logoImg(), b = uniImg(); if (a.complete && a.naturalWidth) g.drawImage(a, w - 76, 10, 58, 58); if (b.complete && b.naturalWidth) g.drawImage(b, 18, 8, 38, 62);
      g.fillStyle = "#333"; g.font = `700 13px ${FONT}`; g.fillText("جمهورية العراق", w / 2, 18); g.fillText("وزارة التعليم العالي والبحث العلمي", w / 2, 35); g.fillText("جامعة تكريت – كلية التربية للعلوم الصرفة", w / 2, 52);
      g.fillStyle = "#24407a"; g.fillRect(w / 2 - 135, 64, 270, 26); g.fillStyle = "#fff"; fitFont(g, title, 800, 17, 250); g.fillText(title, w / 2, 78);
      g.strokeStyle = "#9aa6b8"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 90); g.lineTo(w / 2, 104); g.moveTo(76, 104); g.lineTo(w - 76, 104); g.stroke();
      const box = (x, y) => { g.fillStyle = "#e8edf5"; g.fillRect(x, y, 92, 40); g.strokeRect(x, y, 92, 40); g.fillStyle = "#c3ccda"; g.fillRect(x + 6, y + 6, 24, 28); g.fillStyle = "#8d98aa"; g.fillRect(x + 36, y + 12, 48, 5); g.fillRect(x + 36, y + 24, 40, 5); };
      for (let i = 0; i < 5; i++) box(30 + i * 104, 112);
      for (let i = 0; i < 4; i++) box(82 + i * 104, 166);
      g.fillStyle = "#24407a"; g.fillRect(24, 224, w - 48, 20); g.strokeStyle = "#9aa6b8";
      for (let r = 0; r < 6; r++) g.strokeRect(24, 244 + r * 24, w - 48, 24);
      g.beginPath(); g.moveTo(w - 140, 244); g.lineTo(w - 140, 388); g.moveTo(150, 244); g.lineTo(150, 388); g.stroke();
      g.fillStyle = "#b6bdc8"; for (let r = 0; r < 6; r++) g.fillRect(170, 254 + r * 24, w - 330, 4);
    }) }));
  }
  /* حروف ذهبية بارزة على سطرين متساويين (جدار الشؤون الإدارية والمالية) */
  function goldLettersMat(a, b) {
    return basic(0xffffff, { transparent: true, depthWrite: false, map: textTex(1024, 512, (g, w, h) => {
      const line = (t, yy) => {
        fitFont(g, t, 900, 190, w - 60);
        g.fillStyle = "rgba(70,45,10,.85)"; g.fillText(t, w / 2 + 5, yy + 7);
        const gr = g.createLinearGradient(0, yy - 90, 0, yy + 90); gr.addColorStop(0, "#fff0b0"); gr.addColorStop(0.45, "#e2b84e"); gr.addColorStop(1, "#a97b22");
        g.fillStyle = gr; g.fillText(t, w / 2, yy);
      };
      line(a, h * 0.28); line(b, h * 0.74);
    }) });
  }
  /* لوحة الصحيات البيضوية الذهبية */
  function ovalPlaqueMat(a, b) {
    return lam(0xffffff, { transparent: true, alphaTest: 0.4, emissive: 0x2a2008, map: textTex(320, 150, (g, w, h) => {
      g.fillStyle = "#5a3d1c"; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 6, 0, 0, 7); g.fill();
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f1d27a"); gr.addColorStop(1, "#c79b38"); g.fillStyle = gr;
      g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 16, 0, 0, 7); g.fill();
      g.fillStyle = "#1e1608"; fitFont(g, a, 800, 40, w - 100); g.fillText(a, w / 2, h * 0.38);
      g.direction = "ltr"; fitFont(g, b, 700, 26, w - 110); g.fillText(b, w / 2, h * 0.7);
    }) });
  }
  function bannerMat(title, sub) {
    return lam(0xffffff, { map: textTex(512, 160, (g, w, h) => {
      g.fillStyle = "#f7f6f2"; g.fillRect(0, 0, w, h); g.fillStyle = "#123a6b"; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
      g.fillStyle = "#123a6b"; fitFont(g, title, 800, 56, w - 140); g.fillText(title, w / 2 - 30, sub ? h * 0.42 : h / 2);
      if (sub) { g.fillStyle = "#7a5a1e"; fitFont(g, sub, 600, 26, w - 160); g.fillText(sub, w / 2 - 30, h * 0.74); }
      const im = logoImg(); if (im.complete && im.naturalWidth) g.drawImage(im, w - 112, 22, 88, 116);
    }) });
  }
  let _logo = null;
  function logoImg() {
    if (_logo) return _logo; _logo = new Image(); _logo.onload = () => TEXJOBS.forEach(j => j()); _logo.src = TEX + "logo_col.jpg"; return _logo;
  }
  function flagMat(kind) {
    return lam(0xffffff, { side: THREE.DoubleSide, map: textTex(300, 200, (g, w, h) => {
      if (kind === "iq") {
        g.fillStyle = "#ce1126"; g.fillRect(0, 0, w, h / 3); g.fillStyle = "#ffffff"; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = "#111"; g.fillRect(0, 2 * h / 3, w, h / 3);
        g.fillStyle = "#007a3d"; g.font = `800 40px ${FONT}`; g.fillText("الله أكبر", w / 2, h / 2 + 2);
      } else {
        g.fillStyle = "#f2c230"; g.fillRect(0, 0, w, h); const im = logoImg(); if (im.complete && im.naturalWidth) g.drawImage(im, w / 2 - 52, h / 2 - 66, 104, 132);
      }
    }) });
  }
  function nameplateMat(text) {
    return lam(0xffffff, { map: textTex(256, 64, (g, w, h) => { g.fillStyle = "#c9a24c"; g.fillRect(0, 0, w, h); g.fillStyle = "#1b1d22"; g.fillRect(4, 4, w - 8, h - 8); g.fillStyle = "#e6c46c"; fitFont(g, text, 700, 30, w - 24); g.fillText(text, w / 2, h / 2 + 1); }) });
  }

  /* ---------------------------------------------------------------
     الهيكل: الجدران والأرضيات والسقوف والواجهات
  --------------------------------------------------------------- */
  const T = 0.14;
  const roomById = id => ROOMS.find(r => r.id === id);
  /* موضع الباب على جداره، واتجاهه نحو داخل الغرفة */
  function doorPos(r, d) {
    const [x0, x1, z0, z1] = r.r, w = d.w || 0.95;
    const top = d.k === "glass2" || d.k === "carved" ? 2.5 : (d.k === "council" || d.k === "wood2" || d.k === "shut2") ? 2.45 : d.k === "glassF" ? 2.6 : d.k === "blackT" ? 2.55 : 2.25;
    if (d.s === "W" || d.s === "E") { const c = d.s === "W" ? x0 : x1; return { axis: "Z", c, w, top, x: c, z: d.at, nx: d.s === "W" ? 1 : -1, nz: 0 }; }
    const c = d.s === "F" ? z1 : z0; return { axis: "X", c, w, top, x: d.at, z: c, nx: 0, nz: d.s === "F" ? -1 : 1 };
  }
  function holesOn(axis, c, lvl) {
    const out = [];
    ROOMS.forEach(r => {
      if (r.lvl !== lvl) return;
      (r.doors || []).forEach(d => { if (d.k === "shut" || d.k === "shut2" || d.k === "none" || d.k === "open") return; const p = doorPos(r, d); if (p.axis === axis && Math.abs(p.c - c) < 0.02) out.push({ a: d.at - p.w / 2, b: d.at + p.w / 2, top: p.top }); });
      (r.wins || []).forEach(wn => { const p = doorPos(r, { s: wn.s, at: 0 }); if (p.axis === axis && Math.abs(p.c - c) < 0.02) out.push({ a: wn.a, b: wn.b, bottom: 1.0, top: 2.0 }); });
    });
    return out;
  }
  function extX(z, xa, xb, lvl, s, holes = [], outKey = "ext") {
    wallX("wall", z - s * 0.09, xa, xb, lvl, 0.12, holes, true);
    wallX(outKey, z + s * 0.06, xa - 0.15, xb + 0.15, lvl, 0.18, holes.map(h => Object.assign({}, h)), false);
  }
  function extZ(x, za, zb, lvl, s, holes = [], outKey = "ext") {
    wallZ("wall", x - s * 0.09, za, zb, lvl, 0.12, holes, true);
    wallZ(outKey, x + s * 0.06, za - 0.15, zb + 0.15, lvl, 0.18, holes, false);
  }
  const WALLS = {
    0: { Z: [[CX0, ZE, 0], [CX1, ZE, -2.2], [-1, BZ0, ZE]],
         X: [[-4.6, BX0, CX0], [-9.4, BX0, CX0], [-14.2, BX0, CX0], [-18.8, BX0, CX0], [ZE, BX0, BX1], [-29, BX0, -1], [-6.6, CX1, BX1], [-15, CX1, BX1]] },
    1: { Z: [[-1.6, -14.6, 0], [5.0, -3.0, 0], [7.4, -2.2, 0], [UX0, ZE1, -6.6], [CX1, ZE1, -6.6], [-1.4, BZ0, -23.0], [7.4, BZ0, ZE1]],
         X: [[-2.2, 5.0, BX1], [-6.6, BX0, UX0], [-6.6, CX1, BX1], [-11.2, -1.6, UX0], [-14.6, BX0, UX0], [-20.0, BX0, UX0], [-23.0, BX0, UX0], [-27.6, -1.4, UX0], [ZE1, UX0, 7.4],
             [-10.4, CX1, BX1], [-14.8, CX1, BX1], [-18.6, CX1, BX1], [-23.0, CX1, BX1]] }
  };
  /* الأرضيات والسقوف للمناطق المفتوحة (القطع لا تتداخل) */
  const OPENFLOOR = {
    0: [{ r: [CX0, CX1, -4.6, 0], f: "carpetG", c: "tray" }, { r: [CX0, CX1, ZE, -4.6], f: "carpetG", c: "tray" }, { r: [CX1, BX1, -6.6, 0], f: "carpetG", c: "stairwell" }],
    1: [{ r: [-1.6, CX1, -6.6, -3.0], f: "carpetG", c: "tray" }, { r: [5.0, CX1, -3.0, -2.2], f: "carpetG", c: "ceilW" }, { r: [UX0, CX1, ZE1, -6.6], f: "carpetG", c: "trayRound" },
        { r: [CX1, 8.65, -3.4, -2.2], f: "carpetG", c: null }, { r: [8.65, BX1, -3.1, -2.2], f: "carpetG", c: null }, { r: [CX1, BX1, -6.6, -2.2], f: null, c: "ceilW" }]
  };
  const FLOORKEY = { store: "terr", archive: "terr", wc: "terr", acc: "terrDots", aud: "terrCheck", reg: "carpetS", council: "carpetS", grad: "marbleF", plan: "carpetG", hrMgr: "carpetG", hrStaff: "carpetG", legal: "carpetG", dean: "marbleF", deanSec: "marbleF", deanStaff: "carpetG", media1: "carpetG", aminE: "carpetG", aminB: "carpetG" };
  const CEILKEY = { reg: "ceilReg", council: "ceilW", dean: "ceilW", deanSec: "ceilW", deanStaff: "ceilW", hrMgr: "ceilTile", hrStaff: "ceilTile", plan: "ceilTile", grad: "ceilPerf", legal: "ceilTile", acc: "ceilTile", media1: "ceilW" };
  function shell() {
    [0, 1].forEach(lvl => {
      const y = lvl * FH;
      LAYER = lvl ? "s1" : "s0";
      extX(BZ1, BX0, BX1, lvl, 1, lvl ? [] : [{ a: WX - 0.92, b: WX + 0.92, top: 3.3 }]);
      extX(BZ0, BX0, BX1, lvl, -1);
      extZ(BX0, BZ0, BZ1, lvl, -1, lvl ? [] : [{ a: -2.75, b: -1.75, top: 2.3 }]);
      extZ(BX1, BZ0, BZ1, lvl, 1, [], "extSide");
      WALLS[lvl].Z.forEach(([x, a, b]) => wallZ("wall", x, a, b, lvl, T, holesOn("Z", x, lvl)));
      WALLS[lvl].X.forEach(([z, a, b]) => wallX("wall", z, a, b, lvl, T, holesOn("X", z, lvl)));
      ROOMS.filter(r => r.lvl === lvl && r.sub !== "stair").forEach(r => flat(FLOORKEY[r.sub] || "carpetB", r.r[0], r.r[2], r.r[1], r.r[3], y + 0.004));
      OPENFLOOR[lvl].forEach(o => o.f && flat(o.f, o.r[0], o.r[2], o.r[1], o.r[3], y + 0.004));
      LAYER = lvl ? "c1" : "c0";
      const cy = y + CH;
      ROOMS.filter(r => r.lvl === lvl && r.sub !== "stair").forEach(r => flat(CEILKEY[r.sub] || "ceil", r.r[0], r.r[2], r.r[1], r.r[3], cy, true));
      OPENFLOOR[lvl].forEach(o => {
        const [x0, x1, z0, z1] = o.r;
        if (o.c === "tray" || o.c === "trayRound") trayCeiling(x0, x1, z0, z1, cy, o.c === "trayRound");
        else if (o.c === "ceilW") flat("ceilW", x0, z0, x1, z1, cy, true);
        else if (o.c === "stairwell") { flat("ceilW", x0, -3.1, x1, z1, cy, true); flat("ceilW", x0, -3.4, 8.65, -3.1, cy, true); }
        else if (o.c === "stairtop") flat("ceilW", x0, z0, x1, z1, cy, true);
      });
    });
    // البلاطة بين الطابقين مع فتحة الدرج
    LAYER = "s1";
    [[BX0, BX1, BZ0, -6.6], [BX0, CX1, -6.6, BZ1], [CX1, BX1, -3.1, BZ1], [CX1, 8.65, -3.4, -3.1]].forEach(([x0, x1, z0, z1]) => bx("slab", x0, CH + 0.012, z0, x1, FH - 0.002, z1));
    // السطح والستارة
    LAYER = "roof";
    bx("slab", BX0, FH + CH + 0.012, BZ0, BX1, 2 * FH, BZ1);
    flat("roof", BX0 - 0.15, BZ0 - 0.15, BX1 + 0.15, BZ1 + 0.15, 2 * FH + 0.01);
    const pt = 0.26, PY0 = 2 * FH - 0.6, PY1 = 2 * FH + 1.0;
    bx("parapet", BX0 - 0.21, PY0, BZ1 - 0.05, BX1 + 0.21, PY1, BZ1 + 0.21);
    bx("parapet", BX0 - 0.21, PY0, BZ0 - 0.21, BX1 + 0.21, PY1, BZ0 + 0.05);
    bx("parapet", BX0 - 0.21, PY0, BZ0 + 0.05, BX0 + 0.05, PY1, BZ1 - 0.05);
    bx("parapet", BX1 - 0.05, PY0, BZ0 + 0.05, BX1 + 0.21, PY1, BZ1 - 0.05);
    bx("stoneT", BX0 - 0.24, PY1, BZ1 - pt, BX1 + 0.24, PY1 + 0.08, BZ1 + 0.24);
    bx("stoneT", BX0 - 0.24, PY1, BZ0 - 0.24, BX1 + 0.24, PY1 + 0.08, BZ0 + pt);
    bx("stoneT", BX0 - 0.24, PY1, BZ0 + pt, BX0 + pt, PY1 + 0.08, BZ1 - pt);
    bx("stoneT", BX1 - pt, PY1, BZ0 + pt, BX1 + 0.24, PY1 + 0.08, BZ1 - pt);
    stairsCore(); facade(); finishes(); stairGlass(); legalFront();
  }
  /* سقف بصواني مضاءة بشريط أصفر مخفي، مقسوم إلى أجزاء بجسور (ممرّا الطابقين) */
  function trayCeiling(x0, x1, z0, z1, cy, round) {
    const m = 0.55, d = 0.22, L = z1 - z0, n = Math.max(1, Math.round(L / 5.2)), bl = L / n;
    flat("ceilW", x0, z0, x0 + m, z1, cy - d, true); flat("ceilW", x1 - m, z0, x1, z1, cy - d, true);
    for (let i = 0; i < n; i++) {
      const a = z1 - i * bl, b = a - bl, ia = a - (i === 0 ? m : 0.2), ib = b + (i === n - 1 ? m : 0.2);
      flat("ceilW", x0 + m, ia, x1 - m, a, cy - d, true); flat("ceilW", x0 + m, b, x1 - m, ib, cy - d, true);
      flat("ceilW", x0 + m, ib, x1 - m, ia, cy, true);
      bx("cove", x0 + m - 0.02, cy - d, ib, x0 + m, cy, ia); bx("cove", x1 - m, cy - d, ib, x1 - m + 0.02, cy, ia);
      bx("cove", x0 + m, cy - d, ia, x1 - m, cy, ia + 0.02); bx("cove", x0 + m, cy - d, ib - 0.02, x1 - m, cy, ib);
      for (let z = a - 0.8; z > b + 0.4; z -= 1.3) { addInst("down", x0 + m / 2, cy - d - 0.005, z); addInst("down", x1 - m / 2, cy - d - 0.005, z); }
      if (round) addInst("roundL", (x0 + x1) / 2, cy - 0.01, (ia + ib) / 2);
    }
  }
  /* تكسية جدران الغرفة من الداخل (ورق جدران، ألواح خشب، رخام...) مع ترك فتحات الأبواب */
  function clad(r, key, y0 = 0, y1 = CH) {
    const [x0, x1, z0, z1] = r.r, lvl = r.lvl, o = k => (k === BX0 || k === BX1 || k === BZ0 || k === BZ1 ? 0.155 : T / 2 + 0.006);
    wallZ(key, x0 + o(x0) + 0.008, z0, z1, lvl, 0.016, holesOn("Z", x0, lvl), false, y0, y1);
    wallZ(key, x1 - o(x1) - 0.008, z0, z1, lvl, 0.016, holesOn("Z", x1, lvl), false, y0, y1);
    wallX(key, z0 + o(z0) + 0.008, x0, x1, lvl, 0.016, holesOn("X", z0, lvl), false, y0, y1);
    wallX(key, z1 - o(z1) - 0.008, x0, x1, lvl, 0.016, holesOn("X", z1, lvl), false, y0, y1);
  }
  function finishes() {
    const C = (id, key, y0, y1) => { LAYER = roomById(id).lvl ? "s1" : "s0"; clad(roomById(id), key, y0, y1); };
    C("g-003", "wallMarble"); C("u-plan", "quilt"); C("u-hrm", "woodPanel", 0, 2.7); C("u-hrm", "panelBeige", 2.7, CH); C("u-hrs", "panelBeige");
    C("u-council", "panelWhite"); C("u-dean", "panelWhite"); C("u-dstaff", "panelBeige"); C("u-sec", "panelWhite"); C("g-reg", "wall");
    // ممر الطابق الأول وبهوه: جدران رخامية بيضاء
    LAYER = "s1";
    wallZ("wallMarble", UX0 + T / 2 + 0.008, ZE1, -6.6, 1, 0.016, holesOn("Z", UX0, 1), false, 0, CH);
    wallZ("wallMarble", CX1 - T / 2 - 0.008, ZE1, -6.6, 1, 0.016, holesOn("Z", CX1, 1), false, 0, CH);
    wallX("wallMarble", -6.6 + T / 2 + 0.008, -1.6, UX0, 1, 0.016, holesOn("X", -6.6, 1), false, 0, CH);
    wallX("wallMarble", -2.2 - T / 2 - 0.008, CX1, BX1 - 0.15, 1, 0.016, holesOn("X", -2.2, 1), false, 0, CH);
    // بيت الدرج في الأرضي: ورق جدران مضرّب بنقشة المعيّنات خلف السجاد الأحمر
    LAYER = "s0";
    wallX("quilt", -6.6 + T / 2 + 0.008, 6.95, BX1, 0, 0.016, [], false, 0, 1.75);
    wallZ("quilt", BX1 - 0.163, -6.6, -2.2, 0, 0.016, [], false, 0, 2.4);
  }
  /* الشبابيك: إطار داخلي وزجاج، ومن الخارج إطار حجري وزجاج أزرق ومشبّك حديدي (مرسوم لا صورة) */
  function windowAt(side, u, lvl, w = 1.2, h = 1.3, y0 = 1.0, outMat = "winOut", ow = 1.4, oh = 1.45, oy, blind) {
    const y = lvl * FH + y0, cyy = y + h / 2;
    const P = {
      W: { xi: BX0 + 0.155, xo: BX0 - 0.155, ry: Math.PI / 2 }, E: { xi: BX1 - 0.155, xo: BX1 + 0.155, ry: -Math.PI / 2 },
      B: { zi: BZ0 + 0.155, zo: BZ0 - 0.155, ry: 0 }, F: { zi: BZ1 - 0.155, zo: BZ1 + 0.155, ry: Math.PI }
    }[side];
    const isZ = side === "W" || side === "E";
    const ix = isZ ? P.xi : u, iz = isZ ? u : P.zi, ox = isZ ? P.xo : u, oz = isZ ? u : P.zo;
    planeAt(MAT.skyWin, w, h, ix, cyy, iz, P.ry);
    const fr = (a0, b0, yy0, yy1) => isZ ? bx("winFrame", ix - 0.03, yy0, a0, ix + 0.03, yy1, b0) : bx("winFrame", a0, yy0, iz - 0.03, b0, yy1, iz + 0.03);
    fr(u - w / 2 - 0.06, u - w / 2, y - 0.06, y + h + 0.06); fr(u + w / 2, u + w / 2 + 0.06, y - 0.06, y + h + 0.06);
    fr(u - w / 2, u + w / 2, y - 0.06, y); fr(u - w / 2, u + w / 2, y + h, y + h + 0.06); fr(u - 0.025, u + 0.025, y, y + h);
    if (blind) { const n = { W: [1, 0], E: [-1, 0], B: [0, 1], F: [0, -1] }[side]; planeAt(MAT[blind], w + 0.1, blind === "curtain" ? h + 0.3 : h * 0.55, ix + n[0] * 0.05, blind === "curtain" ? cyy : y + h * 0.75, iz + n[1] * 0.05, P.ry); }
    if (isZ) bx("stoneT", ix - 0.12, y - 0.08, u - w / 2 - 0.1, ix + 0.12, y - 0.04, u + w / 2 + 0.1); else bx("stoneT", u - w / 2 - 0.1, y - 0.08, iz - 0.12, u + w / 2 + 0.1, y - 0.04, iz + 0.12);
    if (outMat) planeAt(MAT[outMat], ow, oh, ox, oy != null ? lvl * FH + oy : cyy, oz, P.ry + Math.PI);
  }
  function roomWindows() {
    ROOMS.forEach(r => {
      if (r.sub === "stair" || r.sub === "store" || r.sub === "wc" || r.noWin) return;
      LAYER = r.lvl ? "s1" : "s0";
      const [x0, x1, z0, z1] = r.r, bl = { dean: "zebra", plan: "zebra", hrStaff: "zebra", legal: "zebra", media1: "curtain", acc: "curtain", deanStaff: "curtain", deanSec: "zebra" }[r.sub];
      if (x0 === BX0 && r.winsW) r.winsW.forEach(z => windowAt("W", z, r.lvl, 1.2, 1.3, 1.0, "winOut", 1.4, 1.45, null, bl));
      else if (x0 === BX0 && z1 - z0 >= 1.8) windowAt("W", (z0 + z1) / 2, r.lvl, 1.2, 1.3, 1.0, "winOut", 1.4, 1.45, null, bl);
      if (x1 === BX1 && z1 - z0 >= 1.8) windowAt("E", (z0 + z1) / 2, r.lvl, 1.2, 1.3, 1.0, "winOut", 1.4, 1.45, null, bl);
      if (z0 === BZ0 && r.sub !== "dean") { const n = x1 - x0 > 7 ? 2 : 1; for (let i = 0; i < n; i++) windowAt("B", x0 + (x1 - x0) * (i + 0.5) / n, r.lvl, 1.2, 1.3, 1.0, "winOut", 1.4, 1.45, null, bl); }
    });
  }
  /* نقوش الواجهة: لوحة بارزة مستطيلة مزخرفة، وأهلّة وردية بمدرّجات حجرية */
  function cartouche(x, y, z, w = 2.0) {
    const g = new THREE.Group();
    g.add(mm(new THREE.BoxGeometry(w, 0.62, 0.08), MAT.stoneT, 0, 0, 0)); g.add(mm(new THREE.PlaneGeometry(w - 0.12, 0.5), MAT.cartouche, 0, 0, 0.041));
    g.position.set(x, y, z); addObj(compact(g));
  }
  function crescent(x, y, z, flip) {
    const sh = new THREE.Shape(); sh.absarc(0, 0, 0.62, -Math.PI / 2, Math.PI / 2, false); sh.absarc(0.18, 0, 0.5, Math.PI / 2, -Math.PI / 2, true);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
    const m = mm(geo, MAT.pinkStone, x, y, z, 0, flip ? Math.PI : 0, 0); addObj(m);
    for (let i = 0; i < 3; i++) bx("stoneT", flip ? x + 0.05 : x - 0.85 + i * 0.1, y - 0.42 + i * 0.28, z, flip ? x + 0.8 - i * 0.1 : x - 0.05, y - 0.3 + i * 0.28, z + 0.07);
  }
  function lantern(x, y, z, ry) {
    device(null, [B(0.06, 0.06, 0.22, MAT.black, 0, 0, 0.11), B(0.18, 0.04, 0.18, MAT.black, 0, -0.02, 0.25), B(0.16, 0.26, 0.16, MAT.lampGlass, 0, -0.28, 0.25), B(0.2, 0.04, 0.2, MAT.black, 0, -0.32, 0.25), mm(new THREE.ConeGeometry(0.14, 0.12, 4), MAT.black, 0, 0.06, 0.25, 0, Math.PI / 4, 0)], x, y, z, ry, 0);
  }
  function facade() {
    LAYER = "s0";
    const zf = BZ1 + 0.15;
    bx("plinth", BX0 - 0.17, GY, BZ0 - 0.17, BX1 + 0.17, 0.0, BZ1 + 0.17);
    // أحزمة حجرية بمستوى البلاطة على الجهات الحجرية
    bx("stoneT", BX0 - 0.2, FH - 0.12, zf - 0.02, BX1 + 0.2, FH + 0.12, zf + 0.08);
    bx("stoneT", BX0 - 0.25, FH - 0.12, BZ0 - 0.2, BX0 - 0.15, FH + 0.12, BZ1 + 0.2);
    // الأكتاف المضلّعة في الواجهة
    [BX0 + 0.3, 0.95, 5.85, BX1 - 0.3].forEach(x => bx("flute", x - 0.3, 0, zf - 0.02, x + 0.3, 2 * FH - 0.6, zf + 0.12));
    // الطابق الأرضي غرب المدخل بلا شبابيك: لوحتان مزخرفتان وأهلّة وردية (كما في الصور)
    cartouche(-3.5, 2.75, zf + 0.04, 2.2); cartouche(-0.4, 2.75, zf + 0.04, 1.8);
    crescent(-4.6, 1.15, zf + 0.01, false); crescent(-2.3, 1.15, zf + 0.01, true); crescent(-1.0, 1.15, zf + 0.01, false);
    lantern(1.75, 2.35, zf, 0); lantern(5.05, 2.35, zf, 0); lantern(-5.4, 2.35, zf, 0);
    device(null, [B(0.86, 0.3, 0.22, MAT.devWhite), B(0.8, 0.03, 0.02, MAT.devGrey, 0, 0.05, 0.11)], -5.0, 2.05, zf + 0.11, 0, 0);
    windowAt("F", 8.0, 0, 1.0, 1.1, 1.1, "winOut", 1.25, 1.3);
    // الطابق الأول: شبّاك كبير بمشبّك حديدي أسود، ثم شبّاك متوسط، ثم شبابيك صغيرة فوق المدخل والدرج
    LAYER = "s1";
    windowAt("F", -3.5, 1, 2.4, 1.6, 1.0, "bigGrille", 2.8, 1.75, 1.8);
    windowAt("F", -0.4, 1, 1.2, 1.2, 1.1, "winOut", 1.45, 1.4);
    [2.4, 4.4, 6.9, 8.7].forEach(x => windowAt("F", x, 1, 0.75, 1.1, 1.15, "winOutS", 0.95, 1.35));
    // المدخل: ثلاث درجات رخامية، بابان زجاجيان بإطار أسود، لوحتان مشبّكتان، ومشبّك أسود بأوراق ذهبية فوقهما
    LAYER = "s0";
    const ea = WX - 0.92, eb = WX + 0.92;
    frameX("frameBlack", 0, ea, eb, 0, 3.3, 0.08, 0.16);
    bx("frameBlack", ea, 2.42, -0.1, eb, 2.5, 0.1); bx("frameBlack", WX - 0.6, 0, -0.08, WX - 0.52, 2.45, 0.08); bx("frameBlack", WX + 0.52, 0, -0.08, WX + 0.6, 2.45, 0.08);
    planeAt(MAT.latticeGlass, 0.32, 2.42, ea + 0.16, 1.21, 0.0, 0); planeAt(MAT.latticeGlass, 0.32, 2.42, eb - 0.16, 1.21, 0.0, 0);
    planeAt(MAT.transom, eb - ea, 0.8, WX, 2.88, 0.0, 0);
    solid(0, ea, -0.1, WX - 0.55, 0.1); solid(0, WX + 0.55, -0.1, eb, 0.1);
    [[WX - 0.55, 1], [WX + 0.55, -1]].forEach(([hx, s]) => addObj(compactDoor([B(0.04, 2.3, 0.5, MAT.glassDoor, 0, 0.06, -0.27), B(0.06, 0.08, 0.56, MAT.frameBlack, 0, 0.02, -0.28), B(0.06, 0.08, 0.56, MAT.frameBlack, 0, 2.32, -0.28), B(0.06, 2.38, 0.05, MAT.frameBlack, 0, 0.02, -0.54), B(0.03, 0.5, 0.03, MAT.gold, s * 0.05, 0.85, -0.48), mm(new THREE.PlaneGeometry(0.42, 2.2), MAT.latticeGlass, 0.025, 1.18, -0.27, 0, Math.PI / 2, 0)], hx + s * 0.03, 0, -0.1, s * 0.1)));
    // لوحة العمادة السوداء فوق المدخل: «جامعة تكريت – عمادة – كلية التربية للعلوم الصرفة – تأسست ١٩٩٢»
    LAYER = "s1";
    bx("frameBlack", WX - 1.75, 3.42, zf + 0.06, WX + 1.75, 5.12, zf + 0.2);
    planeAt(signMat(), 3.42, 1.62, WX, 4.27, zf + 0.205, 0);
    [WX - 1.2, WX, WX + 1.2].forEach(x => device(null, [B(0.08, 0.06, 0.32, MAT.black, 0, 0, 0.16), B(0.18, 0.05, 0.1, MAT.led, 0, -0.03, 0.34)], x, 5.18, zf + 0.06, 0, 1));
    // درجات المدخل
    LAYER = "site";
    bx("marbleStep", WX - 1.6, -0.15, zf, WX + 1.6, 0.0, 0.9); bx("marbleStep", WX - 1.6, -0.3, 0.9, WX + 1.6, -0.15, 1.2); bx("marbleStep", WX - 1.6, GY, 1.2, WX + 1.6, -0.3, 1.5);
    // الجهة الغربية: حجر بنقوش هلالية كبيرة وفوانيس، وباب جانبي بمظلّة قرميد صغيرة ولافتة «عام الجودة»
    LAYER = "s0";
    const xw = BX0 - 0.16;
    [-7, -14, -21].forEach(z => { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.absarc(0, 0, 1.3, -Math.PI / 2, Math.PI / 2, false); sh.absarc(0.35, 0, 1.05, Math.PI / 2, -Math.PI / 2, true); g.add(mm(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), MAT.stoneT, 0, 0, 0)); g.position.set(xw, 1.7, z); g.rotation.y = -Math.PI / 2; addObj(compact(g)); lantern(xw, 2.4, z + 1.9, -Math.PI / 2); });
    bx("frameBlack", BX0 - 0.17, 0, -2.8, BX0 - 0.1, 2.35, -2.72); bx("frameBlack", BX0 - 0.17, 0, -1.78, BX0 - 0.1, 2.35, -1.7); bx("frameBlack", BX0 - 0.17, 2.3, -2.8, BX0 - 0.1, 2.38, -1.7);
    planeAt(MAT.latticeGlass, 1.0, 2.3, BX0 - 0.13, 1.15, -2.25, -Math.PI / 2); solid(0, BX0 - 0.2, -2.8, BX0 + 0.2, -1.7);
    LAYER = "site";
    bx("marbleStep", BX0 - 1.4, GY, -3.1, BX0 - 0.17, -0.25, -1.4); bx("marbleStep", BX0 - 0.9, -0.25, -3.1, BX0 - 0.17, 0, -1.4);
    [[BX0 - 2.0, -3.4], [BX0 - 2.0, -1.1]].forEach(([x, z]) => { device(null, [C(0.05, 2.55, MAT.iron, 0, 0, 0, 8)], x, GY, z, 0, 0); solid(0, x - 0.07, z - 0.07, x + 0.07, z + 0.07); });
    gableRoofZ(BX0 - 2.3, BX0 - 0.1, -3.7, -0.8, GY + 2.55, 0.55);
    pic(qualityBannerMat(), 1.3, 1.65, BX0 - 0.19, 1.35, -4.0, -Math.PI / 2, "white", 0.01);
    [[BX0 - 0.5, -4.9], [BX0 - 0.5, -0.4]].forEach(([x, z]) => device(null, [C(0.12, 0.6, MAT.steel, 0, 0, 0, 12), C(0.13, 0.04, MAT.chrome, 0, 0.6, 0, 12)], x, GY, z, 0, 0));
    // الجهة الشرقية: لياسة بيضاء بأكتاف حجرية، وحدات تبريد كثيرة، ولوحة سوداء باسم العمادة
    for (let z = -1.5; z > BZ0; z -= 6) bx("stoneT", BX1 + 0.15, 0, z - 0.3, BX1 + 0.27, 2 * FH - 0.6, z + 0.3);
    const R = rng(55);
    for (let z = -3.5; z > BZ0 + 1; z -= 2.2) [0, 1].forEach(l => { if (R() < 0.8) acOut(BX1 + 0.17, l * FH + 0.5 + R() * 1.4, z + (R() - 0.5) * 0.8); });
    LAYER = "s1";
    bx("frameBlack", BX1 + 0.16, FH + 1.5, -14.6, BX1 + 0.22, FH + 2.6, -10.4);
    planeAt(sideSignMat(), 4.1, 1.0, BX1 + 0.225, FH + 2.05, -12.5, Math.PI / 2);
    // العلم وكشّافات الإنارة على السطح
    LAYER = "roof";
    const fx = -0.3, fz = -1.0, fy = 2 * FH;
    device(null, [C(0.12, 0.3, MAT.stoneT, 0, 0, 0), C(0.035, 5.2, MAT.steel, 0, 0.3, 0, 8), mm(new THREE.SphereGeometry(0.07, 8, 6), MAT.gold, 0, 5.52, 0)], fx, fy, fz, 0, 1);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.1, 8, 1), flagMat("iq"));
    const pa = fl.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const u = (pa.getX(i) + 0.825) / 1.65; pa.setZ(i, Math.sin(u * 5.2) * 0.07 * u); }
    fl.geometry.computeVertexNormals(); fl.position.set(fx + 0.86, fy + 4.85, fz); addObj(fl);
    [[BX0 + 0.4, BZ1 - 0.3], [1.0, BZ1 - 0.3], [6.5, BZ1 - 0.3], [BX1 - 0.4, BZ1 - 0.3]].forEach(([x, z]) => device(null, [B(0.06, 0.4, 0.06, MAT.greyDark, 0, 0, 0), B(0.5, 0.36, 0.14, MAT.greyDark, 0, 0.4, 0.05), B(0.42, 0.28, 0.02, MAT.led, 0, 0.44, 0.13)], x, 2 * FH + 1.08, z, 0, 1));
  }
  function compactDoor(parts, x, y, z, ry) { const g = new THREE.Group(); parts.forEach(p => g.add(p)); g.position.set(x, y, z); g.rotation.y = ry; return compact(g); }
  function acOut(x, y, z) {
    device(null, [B(0.3, 0.55, 0.78, MAT.devWhite, 0.15, 0, 0), mm(new THREE.CircleGeometry(0.2, 18), MAT.greyDark, 0.305, 0.28, 0.08, 0, Math.PI / 2, 0), B(0.32, 0.03, 0.03, MAT.steel, 0.16, -0.03, -0.3), B(0.32, 0.03, 0.03, MAT.steel, 0.16, -0.03, 0.3)], x, y, z, 0, 0);
  }
  /* مدخل الدرج في الأرضي (كما في فيديو النزول): من المدخل باب زجاجي داكن بلا إطار في حاجز زجاجي أسود،
     ثم ممرّ صغير فيه أريكة مذهّبة ولوحة «خروج»، ثم باب زجاجي مزدوج بإطار أسود وشعار الكلية يُفتح على أول الدرج */
  function stairGlass() {
    LAYER = "s0";
    // الحاجز الزجاجي الأسود بين المدخل والممرّ الصغير (x = 5.6)
    const x = CX1, a = -2.2, b = -0.15, da = -1.575, db = -0.625;
    [[a, da], [db, b]].forEach(([p, q]) => { planeAt(MAT.glassDark, q - p, CH, x, CH / 2, (p + q) / 2, Math.PI / 2); solid(0, x - 0.05, p, x + 0.05, q); });
    [a, da, db, b].forEach(z => bx("frameBlack", x - 0.04, 0, z - 0.03, x + 0.04, CH, z + 0.03));
    bx("frameBlack", x - 0.04, 0, a, x + 0.04, 0.08, da); bx("frameBlack", x - 0.04, 0, db, x + 0.04, 0.08, b); bx("frameBlack", x - 0.04, CH - 0.06, a, x + 0.04, CH, b);
    planeAt(MAT.glassDark, db - da, CH - 2.6, x, (CH + 2.6) / 2, (da + db) / 2, Math.PI / 2);
    // الحاجز بين الممرّ الصغير وبيت الدرج (z = -2.2): باب مزدوج بإطار أسود وشعار، ثم زجاج داكن
    const z = -2.2, ea = 5.75, eb = 6.95;
    planeAt(MAT.glassDark, BX1 - 0.15 - eb, CH, (eb + BX1 - 0.15) / 2, CH / 2, z, 0); solid(0, eb, z - 0.05, BX1, z + 0.05);
    for (let xx = eb; xx <= BX1 - 0.1; xx += 0.96) bx("frameBlack", xx - 0.03, 0, z - 0.04, xx + 0.03, CH, z + 0.04);
    bx("frameBlack", eb, 0, z - 0.04, BX1 - 0.15, 0.08, z + 0.04); bx("frameBlack", ea, CH - 0.06, z - 0.04, BX1 - 0.15, CH, z + 0.04);
    frameX("frameBlack", z, ea, eb, 0, 2.45, 0.06, 0.06); planeAt(MAT.glassDark, eb - ea, CH - 2.51, (ea + eb) / 2, (CH + 2.51) / 2, z, 0);
    const lw = (eb - ea) / 2 - 0.02;
    [[ea + 0.01, 1], [eb - 0.01, -1]].forEach(([hx, s]) => addObj(compactDoor([
      B(lw, 2.4, 0.03, MAT.glassDoor, s * lw / 2, 0.02, 0), B(lw, 0.06, 0.05, MAT.frameBlack, s * lw / 2, 0, 0), B(lw, 0.06, 0.05, MAT.frameBlack, s * lw / 2, 2.38, 0),
      B(0.05, 2.44, 0.05, MAT.frameBlack, s * 0.025, 0, 0), B(0.05, 2.44, 0.05, MAT.frameBlack, s * (lw - 0.025), 0, 0),
      B(0.025, 0.55, 0.025, MAT.chrome, s * (lw - 0.1), 0.8, 0.04), mm(new THREE.CircleGeometry(0.15, 24), MAT.ph_logo_col, s * lw / 2, 1.45, 0.02), mm(new THREE.CircleGeometry(0.15, 24), MAT.ph_logo_col, s * lw / 2, 1.45, -0.02, 0, Math.PI, 0)
    ], hx, 0, z, s * 0.55 * -1)));
    // الممرّ الصغير: أريكة مذهّبة، لوحة «خروج»، وشبّاك صغير على الواجهة
    device(null, sofa(2, MAT.leatherCream, MAT.gold), 8.6, 0, -0.62, Math.PI, 0, [0.84, 0.43]);
    planeAt(exitMat(), 0.36, 0.14, BX1 - 0.155, 2.35, -1.1, -Math.PI / 2);
    plant(9.55, 0, -1.85, "snake", 0.9);
  }
  /* واجهة شعبة الشؤون القانونية على يسار البهو: زجاج داكن من الأرض إلى السقف بإطار أسود، وباب زجاجي عليه ورقة «الشعبة القانونية» */
  function legalFront() {
    LAYER = "s1";
    const z = -3.0, a = -1.6, b = 5.0, da = 3.42, db = 4.38, y = FH;
    [[a, da], [db, b]].forEach(([p, q]) => { planeAt(MAT.glassDark, q - p, CH, (p + q) / 2, y + CH / 2, z, 0); solid(1, p, z - 0.05, q, z + 0.05); });
    for (let xx = a; xx <= b + 0.01; xx += 1.1) bx("frameBlack", xx - 0.03, y, z - 0.04, xx + 0.03, y + CH, z + 0.04);
    bx("frameBlack", a, y, z - 0.04, b, y + 0.06, z + 0.04); bx("frameBlack", a, y + CH - 0.06, z - 0.04, b, y + CH, z + 0.04); bx("frameBlack", da, y + 2.55, z - 0.04, db, y + 2.62, z + 0.04);
    planeAt(MAT.glassDark, db - da, CH - 2.62, (da + db) / 2, y + (CH + 2.62) / 2, z, 0);
    addObj(compactDoor([B(db - da - 0.02, 2.53, 0.012, MAT.glassDoor, (db - da - 0.02) / 2, 0.01, 0), B(0.025, 0.9, 0.025, MAT.black, db - da - 0.12, 0.6, 0.05), B(0.025, 0.9, 0.025, MAT.black, db - da - 0.12, 0.6, -0.05), mm(new THREE.PlaneGeometry(0.3, 0.21), paperMat("الشعبة القانونية"), (db - da) / 2, 1.6, -0.012, 0, Math.PI, 0)], da + 0.01, y, z, 1.0));
    planeAt(paperMat("الشعبة القانونية"), 0.3, 0.21, 2.6, y + 1.6, z - 0.012, Math.PI);
    projPlateAt(4.45, y, z, "X", -1, "شعبة الشؤون القانونية", "01G025");
  }
  /* لوحة نحاسية بارزة عمودياً على الجدار (لوحات ممر الطابق الأول). axis: محور الجدار، out: جهة الممر */
  function projPlateAt(u, y, c, axis, out, name, code) {
    const m = plaqueMat(name, code), h = y + 2.42, d = T / 2 + 0.27;
    if (axis === "Z") { const x = c + out * d; planeAt(m, 0.5, 0.146, x, h, u + 0.007, 0); planeAt(m, 0.5, 0.146, x, h, u - 0.007, Math.PI); bx("black", Math.min(c + out * T / 2, x - out * 0.27), h - 0.085, u - 0.006, Math.max(c + out * T / 2, x - out * 0.27), h + 0.085, u + 0.006); }
    else { const z = c + out * d; planeAt(m, 0.5, 0.146, u - 0.007, h, z, -Math.PI / 2); planeAt(m, 0.5, 0.146, u + 0.007, h, z, Math.PI / 2); bx("black", u - 0.006, h - 0.085, Math.min(c + out * T / 2, z - out * 0.27), u + 0.006, h + 0.085, Math.max(c + out * T / 2, z - out * 0.27)); }
  }

  /* ---------------------------------------------------------------
     الدرج (من فيديو الصعود والنزول): يبدأ خلف الباب الأسود ويصعد شمالاً بمحاذاة
     الجدار الأيسر والدرابزين الذهبي على اليمين، ثم بسطة فيها نبتة، فدرجات قليلة
     شرقاً إلى بسطة ثانية تحت شبّاك بستارة، ثم يستدير يميناً ويصعد جنوباً حتى
     الطابق الأول. مكسوّ بموكيت رمادي، وتحت القلبة الأخيرة سجاد أحمر ورفّ أحذية.
  --------------------------------------------------------------- */
  const ST = { ax0: 5.75, ax1: 6.95, az: -2.3, mz0: -5.25, mz1: -6.45, bx0: 8.65, bx1: 9.85, run: 0.27 };
  const RZ = FH / 23, LY1 = 11 * RZ, LY2 = 15 * RZ, LY = LY2;
  function seg(key, a, b, t = 0.05) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
    const g = new THREE.BoxGeometry(t, t, L).toNonIndexed();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()), new THREE.Vector3(1, 1, 1)));
    (BATCH[bkey(key)] = BATCH[bkey(key)] || []).push(g);
  }
  /* درابزين ذهبي من نقطة إلى نقطة (y عند مستوى الدرج): أعمدة رفيعة وحاجز علوي */
  function railLine(a, b, step = 0.14) {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.round(L / step));
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t; bx("gold", x - 0.011, y, z - 0.011, x + 0.011, y + 0.92, z + 0.011); }
    seg("gold", [a[0], a[1] + 0.94, a[2]], [b[0], b[1] + 0.94, b[2]], 0.05);
    seg("gold", [a[0], a[1] + 0.45, a[2]], [b[0], b[1] + 0.45, b[2]], 0.022);
  }
  function newel(x, y, z, lvl) { device(null, [C(0.03, 1.12, MAT.gold, 0, 0, 0, 8), mm(new THREE.SphereGeometry(0.055, 10, 8), MAT.gold, 0, 1.16, 0)], x, y, z, 0, lvl); }
  function stairsCore() {
    LAYER = "s0";
    const { ax0, ax1, az, mz0, mz1, bx0, bx1, run } = ST;
    // القلبة الأولى: 11 درجة شمالاً
    for (let i = 0; i < 11; i++) { const za = az - i * run, zb = za - run, yt = (i + 1) * RZ; bx("stairT", ax0, 0, zb, ax1, yt, za); bx("stairEdge", ax0, yt - RZ, za - 0.02, ax1, yt, za); }
    // البسطة الأولى (فيها نبتة)
    const lz = az - 11 * run;
    bx("wallM", ax0, 0, mz1, ax1, LY1 - 0.02, lz); flat("stairT", ax0, mz1, ax1, lz, LY1);
    plant(ax0 + 0.25, LY1, mz1 + 0.25, "snake", 0.95);
    // القلبة الوسطى: 4 درجات شرقاً
    for (let k = 0; k < 4; k++) { const xa = ax1 + k * run, xb = xa + run, yt = LY1 + (k + 1) * RZ; bx("stairT", xa, 0, mz1, xb, yt, mz0); bx("stairEdge", xa - 0.02, yt - RZ, mz1, xa, yt, mz0); }
    // البسطة الثانية تحت شبّاك بستارة، وفيها نبتة
    const l2x = ax1 + 4 * run;
    bx("wallM", l2x, 0, mz1, bx1, LY2 - 0.02, mz0); flat("stairT", l2x, mz1, bx1, mz0, LY2);
    windowAt("E", (mz0 + mz1) / 2, 0, 1.0, 1.2, LY2 + 0.95, "winOutS", 1.15, 1.4, null, "roller");
    plant(bx1 - 0.25, LY2, mz1 + 0.25, "snake", 0.95);
    // القلبة الأخيرة: 8 درجات جنوباً حتى الطابق الأول (لوح مائل وتحته فراغ)
    for (let j = 0; j < 8; j++) { const za = mz0 + j * run, zb = za + run, yt = LY2 + (j + 1) * RZ; bx("wallM", bx0, yt - 0.48, za, bx1, yt - 0.2, zb); bx("stairT", bx0, yt - 0.2, za, bx1, yt, zb); bx("stairEdge", bx0, yt - RZ, za - 0.02, bx1, yt, za); }
    bx("wallM", bx0, LY2 - 0.3, mz0 - 0.02, bx1, LY2 + RZ - 0.2, mz0 + 0.02);
    // الدرابزين الذهبي على يمين الصاعد طوال الطريق
    railLine([ax1, 0, az], [ax1, LY1, lz]);
    railLine([ax1, LY1, mz0], [l2x, LY2, mz0]);
    railLine([l2x, LY2, mz0], [bx0, LY2, mz0]);
    railLine([bx0, LY2, mz0], [bx0, FH, mz0 + 8 * run]);
    newel(ax1, 0, az, 0);
    // تحت القلبة الأخيرة: سجاد أحمر طويل ورفّ أحذية خشبي داكن ومكيّف على الجدار المضرّب
    flat("prayer", 7.15, -3.5, 9.65, -2.5, 0.012); flat("prayer", 7.15, -4.75, 9.65, -3.75, 0.012);
    device(null, [B(1.1, 1.0, 0.34, MAT.woodDark)].concat([0, 1, 2, 3].map(i => B(1.04, 0.015, 0.3, MAT.black, 0, 0.24 * i + 0.02, 0.02))).concat([0, 1, 2].map(i => B(0.015, 0.98, 0.3, MAT.black, -0.27 + i * 0.27, 0.01, 0.02))), 9.62, 0, -4.4, -Math.PI / 2, 0, [0.55, 0.17]);
    wallItem(splitAC(), BX1 - 0.27, 2.45, -3.0, "W", 0);
    LAYER = "s0";
    // التصادم: القلبات والبسطات، والحاجز الزجاجي حول الباب الأسود
    solid(0, ax0, -2.78, ax1 + 0.03, mz1); solid(0, ax1, mz0 - 0.2, BX1, mz1 - 0.2); solid(0, bx0, mz0 + 0.05, BX1, mz0 - 0.2);
    // الطابق الأول: درابزين فتحة الدرج من جهة البهو ورأس الممر، وشبّاك رأس الدرج
    LAYER = "s1";
    railLine([CX1 + 0.02, FH, -3.4], [bx0, FH, -3.4]);
    railLine([CX1 + 0.02, FH, -3.4], [CX1 + 0.02, FH, -6.45]);
    newel(CX1 + 0.02, FH, -3.4, 1); newel(bx0, FH, -3.4, 1);
    plant(CX1 - 0.25, FH, -6.25, "ficus", 0.9);
    windowAt("E", -2.65, 1, 0.75, 1.2, 1.05, "winOutS", 0.95, 1.4);
    solid(1, CX1, -3.42, bx0, -6.6); solid(1, bx0 - 0.03, -3.5, BX1, -6.6); solid(1, CX1 - 0.04, -3.4, CX1 + 0.06, -6.6);
  }

  /* ---------------------------------------------------------------
     الأبواب ولوحاتها النحاسية (الاسم والرقم كما على اللوحات)
  --------------------------------------------------------------- */
  const LEAF = { wood: "doorWood", carved: "doorCarved", carvedLight: "doorCarvedL", black: "doorBlack", blackT: "doorBlack", white: "doorWhite", diamond: "doorDiamond", wood2: "doorWood", council: "doorWhite", glass2: "glassDoor", glassF: "glassDoor", shut: "doorWood", shut2: "doorWood", whiteB: "doorWhite", dark: "doorDark" };
  const FRAME = { white: "white", council: "white", black: "frameBlack", blackT: "frameBlack", glass2: "frameBlack", carvedLight: "woodLight", whiteB: "frameBlack" };
  function doors() {
    ROOMS.forEach(r => (r.doors || []).forEach(d => {
      const k = d.k || "wood";
      LAYER = r.lvl ? "s1" : "s0";
      if (k === "none" || k === "open") return; // تُرسم في دالة خاصة أو فتحة بلا باب
      const p = doorPos(r, d), y = r.lvl * FH, a = d.at - p.w / 2, b = d.at + p.w / 2, fk = FRAME[k] || "woodFrame";
      if (k === "glass2" || k === "glassF") { if (k === "glass2") glassDouble(p, y); else glassSingle(p, y); return; }
      if (p.axis === "Z") frameZ(fk, p.c, a, b, y, y + p.top, 0.09, T / 2 + 0.03); else frameX(fk, p.c, a, b, y, y + p.top, 0.09, T / 2 + 0.03);
      const lm = MAT[LEAF[k]];
      if (k === "shut2") { // باب خشبي مزدوج مغلق
        if (p.axis === "Z") { bx("doorWood", p.c - T / 2 - 0.01, y, a, p.c + T / 2 + 0.01, y + p.top, b); bx("black", p.c - T / 2 - 0.015, y, d.at - 0.008, p.c + T / 2 + 0.015, y + p.top, d.at + 0.008); }
        else { bx("doorWood", a, y, p.c - T / 2 - 0.01, b, y + p.top, p.c + T / 2 + 0.01); bx("black", d.at - 0.008, y, p.c - T / 2 - 0.015, d.at + 0.008, y + p.top, p.c + T / 2 + 0.015); }
        solid(r.lvl, p.axis === "Z" ? p.c - 0.1 : a, p.axis === "Z" ? a : p.c - 0.1, p.axis === "Z" ? p.c + 0.1 : b, p.axis === "Z" ? b : p.c + 0.1);
        return;
      }
      if (k === "shut") { // باب مغلق
        if (p.axis === "Z") bx("doorWood", p.c - T / 2 - 0.01, y, a, p.c + T / 2 + 0.01, y + p.top, b); else bx("doorWood", a, y, p.c - T / 2 - 0.01, b, y + p.top, p.c + T / 2 + 0.01);
        solid(r.lvl, p.axis === "Z" ? p.c - 0.1 : a, p.axis === "Z" ? a : p.c - 0.1, p.axis === "Z" ? p.c + 0.1 : b, p.axis === "Z" ? b : p.c + 0.1);
        return;
      }
      if (k === "carved" || k === "blackT") { // نافذة علوية مشبّكة فوق الباب
        const tz = y + p.top - 0.42;
        if (p.axis === "Z") { bx(fk, p.c - 0.05, tz - 0.04, a, p.c + 0.05, tz, b); planeAt(MAT.transomLattice, p.w - 0.04, 0.38, p.c, tz + 0.2, d.at, Math.PI / 2); }
        else { bx(fk, a, tz - 0.04, p.c - 0.05, b, tz, p.c + 0.05); planeAt(MAT.transomLattice, p.w - 0.04, 0.38, d.at, tz + 0.2, p.c, 0); }
      }
      const double = k === "wood2" || k === "council", lw = double ? p.w / 2 - 0.02 : p.w - 0.04, lh = (k === "carved" || k === "blackT" ? p.top - 0.46 : p.top - 0.03);
      const leaves = double ? [[a + 0.02, 1], [b - 0.02, -1]] : [[a + 0.02, 1]];
      leaves.forEach(([u, s]) => {
        const hx = p.axis === "Z" ? p.c + p.nx * (T / 2) : u, hz = p.axis === "Z" ? u : p.c + p.nz * (T / 2);
        const ry = Math.atan2(-p.nz, p.nx), parts = [B(lw, lh, 0.045, lm, lw / 2, 0, s * 0.03), B(0.03, 0.03, 0.14, MAT.brass, lw - 0.08, 1.02, s * 0.03)];
        if (d.logo) parts.push(mm(new THREE.CircleGeometry(0.17, 24), MAT.ph_logo_col, lw / 2, 1.5, s * 0.03 + 0.024), mm(new THREE.CircleGeometry(0.17, 24), MAT.ph_logo_col, lw / 2, 1.5, s * 0.03 - 0.024, 0, Math.PI, 0));
        if (d.emblem) [1, -1].forEach(f => parts.push(B(0.42, 0.2, 0.02, MAT.woodDark, lw / 2, 1.18, s * 0.03 + f * 0.03), mm(new THREE.CircleGeometry(0.15, 24), MAT.ph_logo_col, lw / 2, 1.55, s * 0.03 + f * 0.034, 0, f > 0 ? 0 : Math.PI, 0)));
        let ryy = ry;
        if (d.ajar != null) { const closed = p.axis === "Z" ? -Math.PI / 2 * s : (s > 0 ? 0 : Math.PI), dd = Math.atan2(Math.sin(ry - closed), Math.cos(ry - closed)); ryy = closed + Math.sign(dd) * d.ajar; }
        addObj(compactDoor(parts, hx, y, hz, ryy));
      });
      if (!r.noPlate) {
        if (r.lvl !== 1) plateAbove(p, y, r.name, r.code);
        else if (d === r.doors[0]) projPlateAt(d.at + p.w / 2 + 0.14, y, p.c, p.axis, p.axis === "Z" ? -p.nx : -p.nz, r.plate || r.name, r.code);
      }
    }));
    // لوحة بيضاء فوق باب شعبة التسجيل
    const rg = roomById("g-reg"), pg = doorPos(rg, rg.doors[0]);
    LAYER = "s0"; pic(textPlateMat("كلية التربية للعلوم الصرفة", "شعبة التسجيل وشؤون الطلبة"), 0.62, 0.3, pg.x, 2.95, pg.z + T / 2 + 0.03, 0, "goldTrim", 0.02);
  }
  function plateAbove(p, y, name, code) {
    const ox = -p.nx * (T / 2 + 0.013), oz = -p.nz * (T / 2 + 0.013);
    planeAt(plaqueMat(name, code), 0.5, 0.146, p.x + ox, y + p.top + 0.27, p.z + oz, Math.atan2(-p.nx, -p.nz));
  }
  function glassDouble(p, y) {
    const a = p.z - p.w / 2, b = p.z + p.w / 2;
    frameZ("frameBlack", p.c, a, b, y, y + p.top, 0.06, 0.06);
    [[a + 0.02, 1], [b - 0.02, -1]].forEach(([u, s]) => addObj(compactDoor([B(p.w / 2 - 0.04, p.top - 0.06, 0.03, MAT.glassDoor, (p.w / 2 - 0.04) / 2, 0.02, 0), B(p.w / 2 - 0.04, 0.05, 0.05, MAT.frameBlack, (p.w / 2 - 0.04) / 2, 0, 0), B(0.05, p.top - 0.06, 0.05, MAT.frameBlack, p.w / 2 - 0.06, 0, 0), B(0.025, 0.6, 0.025, MAT.chrome, p.w / 2 - 0.14, 0.75, s * 0.04), mm(new THREE.CircleGeometry(0.16, 24), MAT.ph_logo_col, (p.w / 2 - 0.04) / 2, 1.45, s * 0.02)], p.c + 0.04, y, u, 0)));
  }
  function glassSingle(p, y) {
    const a = p.z - p.w / 2;
    addObj(compactDoor([B(p.w - 0.02, p.top - 0.02, 0.012, MAT.glassDoor, (p.w - 0.02) / 2, 0.01, 0), B(0.025, 0.9, 0.025, MAT.black, p.w - 0.12, 0.6, 0.05), B(0.025, 0.9, 0.025, MAT.black, p.w - 0.12, 0.6, -0.05)], p.c + 0.01, y, a, -Math.PI / 2 - 1.2));
  }

  /* ---------------------------------------------------------------
     الأثاث: قطع بسيطة بأبعاد حقيقية، الوجه نحو +z
  --------------------------------------------------------------- */
  function execDesk(w = 1.9, d = 0.9, top = MAT.mahog, body = MAT.mahogDark, inlay = null) {
    const p = [B(w, 0.05, d, top, 0, 0.72, 0), B(0.08, 0.72, d - 0.04, body, -w / 2 + 0.06, 0, 0), B(0.08, 0.72, d - 0.04, body, w / 2 - 0.06, 0, 0), B(w - 0.12, 0.62, 0.04, body, 0, 0.08, d / 2 - 0.05), B(0.46, 0.68, d - 0.12, body, -w / 2 + 0.33, 0.02, 0)];
    if (inlay) p.push(B(w - 0.3, 0.006, d - 0.28, inlay, 0, 0.77, 0));
    return p;
  }
  function officeDesk(w = 1.4, d = 0.7, top = MAT.woodLight, body = MAT.white, pc = true) {
    const p = [B(w, 0.04, d, top, 0, 0.72, 0), B(0.04, 0.72, d, body, -w / 2 + 0.02, 0, 0), B(0.04, 0.72, d, body, w / 2 - 0.02, 0, 0), B(w - 0.06, 0.45, 0.03, body, 0, 0.25, d / 2 - 0.04), B(0.4, 0.6, d - 0.08, body, w / 2 - 0.24, 0.1, 0)];
    if (pc) p.push(B(0.52, 0.32, 0.03, MAT.screen, -0.1, 0.92, d / 2 - 0.2), B(0.08, 0.16, 0.06, MAT.black, -0.1, 0.76, d / 2 - 0.2), B(0.42, 0.02, 0.14, MAT.black, -0.1, 0.76, -d / 2 + 0.18), B(0.18, 0.36, 0.38, MAT.black, w / 2 - 0.26, 0.76, d / 2 - 0.24));
    p.push(B(0.24, 0.04, 0.32, MAT.paper, 0.32, 0.76, -0.08));
    return p;
  }
  function chairExec(mat = MAT.leatherBrown, tall = 0.8) {
    return [C(0.3, 0.04, MAT.black, 0, 0.02, 0, 10), C(0.035, 0.38, MAT.chrome, 0, 0.04, 0, 8), B(0.56, 0.12, 0.54, mat, 0, 0.42, 0.02), B(0.56, tall, 0.12, mat, 0, 0.54, -0.26), B(0.07, 0.24, 0.42, mat, -0.3, 0.54, 0.02), B(0.07, 0.24, 0.42, mat, 0.3, 0.54, 0.02)];
  }
  function chairGuest(mat = MAT.leatherBrown, frame = MAT.woodDark) {
    return [B(0.04, 0.45, 0.04, frame, -0.22, 0, 0.2), B(0.04, 0.45, 0.04, frame, 0.22, 0, 0.2), B(0.04, 0.9, 0.04, frame, -0.22, 0, -0.2), B(0.04, 0.9, 0.04, frame, 0.22, 0, -0.2), B(0.5, 0.1, 0.48, mat, 0, 0.42, 0), B(0.48, 0.42, 0.07, mat, 0, 0.55, -0.21)];
  }
  function sofa(n, mat = MAT.leatherBrown, arm = null, tuft = false) {
    const w = n * 0.68 + 0.32, am = arm || mat, p = [B(w, 0.22, 0.86, MAT.black, 0, 0.04, 0), B(w - 0.3, 0.2, 0.7, mat, 0, 0.24, 0.06), B(w, 0.52, 0.22, mat, 0, 0.26, -0.32), B(0.16, 0.62, 0.86, am, -w / 2 + 0.08, 0.04, 0), B(0.16, 0.62, 0.86, am, w / 2 - 0.08, 0.04, 0)];
    for (let i = 1; i < n; i++) p.push(B(0.012, 0.2, 0.66, MAT.black, -w / 2 + 0.16 + i * 0.68, 0.26, 0.07));
    if (tuft) for (let i = 0; i < n * 3; i++) for (let j = 0; j < 2; j++) p.push(B(0.02, 0.02, 0.01, MAT.black, -w / 2 + 0.3 + i * (w - 0.6) / (n * 3 - 1), 0.42 + j * 0.18, -0.205));
    return p;
  }
  function coffeeTable(w = 1.1, d = 0.6, mat = MAT.mahog) { return [B(w, 0.05, d, mat, 0, 0.4, 0), B(w - 0.1, 0.36, d - 0.1, MAT.mahogDark, 0, 0.04, 0), B(w * 0.5, 0.02, d * 0.4, MAT.goldTrim, 0, 0.45, 0)]; }
  function cabinet(w = 1.0, h = 1.9, d = 0.42, body = MAT.white, glass = true) {
    const p = [B(w, h, d, body, 0, 0, 0)];
    if (glass) { p.push(B(w - 0.08, h - 0.16, 0.01, MAT.binders, 0, 0.08, d / 2 - 0.03)); p.push(B(w - 0.04, h - 0.08, 0.012, MAT.glassCab, 0, 0.04, d / 2 + 0.006)); }
    else { p.push(B(0.006, h - 0.06, 0.01, MAT.black, 0, 0.03, d / 2 + 0.005)); p.push(B(0.02, 0.14, 0.03, MAT.chrome, -0.05, h * 0.5, d / 2 + 0.015), B(0.02, 0.14, 0.03, MAT.chrome, 0.05, h * 0.5, d / 2 + 0.015)); }
    return p;
  }
  function shelves(w = 1.8, h = 2.1, d = 0.36, frame = MAT.wood, rows = 5) {
    const p = [B(w, h, 0.02, frame, 0, 0, -d / 2 + 0.01), B(0.03, h, d, frame, -w / 2, 0, 0), B(0.03, h, d, frame, w / 2, 0, 0)];
    for (let i = 0; i <= rows; i++) p.push(B(w, 0.025, d, frame, 0, i * (h - 0.03) / rows, 0));
    for (let i = 0; i < rows; i++) p.push(B(w - 0.08, (h / rows) * 0.78, d - 0.08, MAT.binders, 0, i * (h - 0.03) / rows + 0.03, 0.01));
    return p;
  }
  function bookcase(w = 2.0, h = 2.2, d = 0.4, body = MAT.mahogDark) {
    const p = [B(w, h, d, body, 0, 0, -0.02)], rows = 5;
    for (let i = 0; i < rows; i++) {
      const yy = 0.12 + i * (h - 0.2) / rows;
      p.push(B(w - 0.12, (h - 0.2) / rows - 0.06, 0.02, i % 2 ? MAT.binders : MAT.mahog, 0, yy, d / 2 - 0.05));
      if (i >= 2 && i % 2 === 0) for (let k = -1; k <= 1; k++) p.push(C(0.05, 0.16, MAT.goldTrim, k * w * 0.3, yy, d / 2 - 0.02, 10, 0.08), C(0.03, 0.05, MAT.goldTrim, k * w * 0.3, yy - 0.04, d / 2 - 0.02, 8));
    }
    p.push(B(w + 0.06, 0.06, d + 0.04, MAT.goldTrim, 0, h, -0.02));
    return p;
  }
  function flagStand(kind) {
    return [C(0.17, 0.05, MAT.gold, 0, 0, 0, 16), C(0.016, 2.25, MAT.gold, 0, 0.05, 0, 8), mm(new THREE.SphereGeometry(0.045, 10, 8), MAT.gold, 0, 2.33, 0), mm(new THREE.CylinderGeometry(0.06, 0.15, 1.35, 12, 1, true), drapeMat(kind), 0.08, 1.58, 0)];
  }
  const DRAPE = {};
  function drapeMat(kind) {
    if (DRAPE[kind]) return DRAPE[kind];
    return (DRAPE[kind] = lam(0xffffff, { side: THREE.DoubleSide, map: textTex(256, 512, (g, w, h) => {
      if (kind === "iq") {
        g.fillStyle = "#ce1126"; g.fillRect(0, 0, w / 3, h); g.fillStyle = "#fff"; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = "#111"; g.fillRect(2 * w / 3, 0, w / 3, h);
        g.save(); g.translate(w / 2, h * 0.45); g.rotate(Math.PI / 2); g.fillStyle = "#007a3d"; g.font = `800 50px ${FONT}`; g.fillText("الله أكبر", 0, 0); g.restore();
      } else { g.fillStyle = kind === "uniW" ? "#f6f6f4" : "#f2c230"; g.fillRect(0, 0, w, h); const im = kind === "uniW" ? uniImg() : logoImg(); if (im.complete && im.naturalWidth) g.drawImage(im, w / 2 - 50, h * 0.3, 100, kind === "uniW" ? 160 : 130); }
    }) }));
  }
  function plantParts(kind = "snake", s = 1) {
    const p = [C(0.16 * s, 0.32 * s, kind === "yucca" ? MAT.pot : kind === "bamboo" || kind === "ficus" ? MAT.potDark : MAT.pot, 0, 0, 0, 14, 0.19 * s)];
    const R = rng(kind.length * 7 + 3);
    if (kind === "snake") { for (let i = 0; i < 9; i++) { const h = (0.55 + R() * 0.45) * s, a = R() * 6.28, r = R() * 0.09 * s; p.push(mm(new THREE.BoxGeometry(0.055 * s, h, 0.012), MAT.plantG, Math.cos(a) * r, 0.3 * s + h / 2, Math.sin(a) * r, (R() - 0.5) * 0.25, a, (R() - 0.5) * 0.25)); } }
    else if (kind === "croton") { for (let i = 0; i < 10; i++) { const a = R() * 6.28; p.push(mm(new THREE.PlaneGeometry(0.16 * s, 0.24 * s), MAT.leafVar, Math.cos(a) * 0.1 * s, (0.35 + R() * 0.3) * s, Math.sin(a) * 0.1 * s, -0.5 + R(), a, 0)); } }
    else if (kind === "bamboo") { for (let i = 0; i < 4; i++) { const a = i * 1.6, h = (1.2 + R() * 0.5) * s; p.push(C(0.012, h, MAT.green, Math.cos(a) * 0.05, 0.3 * s, Math.sin(a) * 0.05, 5)); for (let k = 0; k < 3; k++) p.push(mm(new THREE.PlaneGeometry(0.3 * s, 0.3 * s), MAT.leaf, Math.cos(a) * 0.05, 0.3 * s + h - k * 0.25, Math.sin(a) * 0.05, 0, a + k, 0)); } }
    else { p.push(C(0.03, 0.9 * s, MAT.trunk, 0, 0.3 * s, 0, 6)); [0, 1, 2].forEach(i => { const g = new THREE.PlaneGeometry(0.9 * s, 0.9 * s); g.translate(0, 0.45 * s, 0); g.rotateY(i * Math.PI / 3); p.push(mm(g, MAT.leaf, 0, 1.0 * s, 0)); }); }
    return p;
  }
  function plant(x, y, z, kind = "snake", s = 1) { device(null, plantParts(kind, s), x, y, z, 0, y > 1 ? 1 : 0, [0.18, 0.18]); }
  function waitingRow(n, mat = MAT.seatBlue) {
    const w = n * 0.56, p = [B(w, 0.05, 0.08, MAT.chrome, 0, 0.36, -0.05), B(0.05, 0.38, 0.4, MAT.chrome, -w / 2 + 0.1, 0, -0.05), B(0.05, 0.38, 0.4, MAT.chrome, w / 2 - 0.1, 0, -0.05)];
    for (let i = 0; i < n; i++) { const x = -w / 2 + 0.28 + i * 0.56; p.push(B(0.48, 0.05, 0.46, mat, x, 0.42, 0.02), mm(new THREE.BoxGeometry(0.48, 0.44, 0.05), mat, x, 0.7, -0.22, -0.12, 0, 0)); }
    return p;
  }
  function waterCooler() { return [B(0.32, 1.0, 0.32, MAT.devWhite), B(0.08, 0.06, 0.04, MAT.greyDark, -0.07, 0.72, 0.17), mm(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 14), MAT.glassCab, 0, 1.22, 0)]; }
  function fridge() { return [B(0.6, 1.5, 0.6, MAT.greyDark), B(0.58, 0.01, 0.01, MAT.black, 0, 1.0, 0.3), B(0.03, 0.4, 0.04, MAT.chrome, 0.24, 1.05, 0.32)]; }
  function acStand() { return [B(0.5, 1.8, 0.34, MAT.devWhite), B(0.42, 0.42, 0.02, MAT.devGrey, 0, 1.25, 0.175), B(0.42, 0.5, 0.02, MAT.white, 0, 0.6, 0.175)]; }
  function extinguisherParts() { return [C(0.08, 0.55, MAT.red, 0, 0, 0, 12), C(0.03, 0.08, MAT.black, 0, 0.55, 0, 8), B(0.12, 0.03, 0.03, MAT.black, 0.04, 0.6, 0)]; }
  function rollupParts(key) { return [B(0.85, 0.07, 0.24, MAT.steel), B(0.02, 2.05, 0.02, MAT.steel, 0, 0.07, -0.06), mm(new THREE.PlaneGeometry(0.8, 1.95), rollupMat(key), 0, 1.07, -0.04)]; }
  const ROLL = {};
  function rollupMat(key) {
    return ROLL[key] || (ROLL[key] = lam(0xffffff, { map: textTex(240, 586, (g, w, h) => {
      if (key === "welcome") { // لافتة الترحيب الصفراء الخضراء
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f7e04a"); gr.addColorStop(1, "#7fbf4a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        const a = logoImg(), b = uniImg(); if (a.complete && a.naturalWidth) g.drawImage(a, w - 100, 14, 84, 84); if (b.complete && b.naturalWidth) g.drawImage(b, 18, 12, 54, 88);
        g.fillStyle = "#123a6b"; [["كلية التربية", 34, 150], ["للعلوم الصرفة", 34, 195], ["ترحب", 40, 270], ["بالضيوف الكرام", 30, 320], ["أهلاً وسهلاً بكم", 30, 400], ["في رحاب", 30, 445], ["جامعة تكريت", 34, 495]].forEach(([t, s, yy]) => { fitFont(g, t, 900, s, w - 20); g.fillText(t, w / 2, yy); });
      } else { // لافتة شعبة الإعلام والاتصال الحكومي بحساباتها
        g.fillStyle = "#fbfaf7"; g.fillRect(0, 0, w, h); const a = logoImg(), b = uniImg(); if (a.complete && a.naturalWidth) g.drawImage(a, w - 74, 10, 60, 60); if (b.complete && b.naturalWidth) g.drawImage(b, 14, 8, 40, 64);
        g.fillStyle = "#123a6b"; g.font = `800 22px ${FONT}`; g.fillText("جامعة تكريت", w / 2, 40); fitFont(g, "كلية التربية للعلوم الصرفة", 800, 20, w - 20); g.fillText("كلية التربية للعلوم الصرفة", w / 2, 92);
        g.fillStyle = "#b3141b"; fitFont(g, "شعبة الإعلام والاتصال الحكومي", 800, 20, w - 20); g.fillText("شعبة الإعلام والاتصال الحكومي", w / 2, 120);
        ["موقع الكلية", "Facebook", "Instagram", "TikTok", "X", "youtube"].forEach((t, i) => { const yy = 160 + i * 62; g.fillStyle = "#111"; g.fillRect(28, yy, 46, 46); g.fillStyle = "#fff"; for (let k = 0; k < 9; k++) g.fillRect(32 + (k % 3) * 14, yy + 4 + Math.floor(k / 3) * 14, 7, 7); g.fillStyle = ["#1d5fa8", "#1877f2", "#c13584", "#111", "#111", "#e00"][i]; g.beginPath(); g.arc(104, yy + 23, 15, 0, 7); g.fill(); g.fillStyle = "#e8d48a"; g.fillRect(126, yy + 10, 92, 28); g.fillStyle = "#111"; g.font = `700 16px ${FONT}`; g.fillText(t, 172, yy + 25); });
        const gr = g.createLinearGradient(0, h - 70, w, h); gr.addColorStop(0, "#d9b04f"); gr.addColorStop(1, "#b3141b"); g.fillStyle = gr; g.fillRect(0, h - 40, w, 40);
      }
    }) }));
  }
  function tvParts(w = 1.2) { return [B(w, w * 0.58, 0.05, MAT.black), mm(new THREE.PlaneGeometry(w - 0.05, w * 0.58 - 0.05), MAT.screenOn, 0, w * 0.29, 0.027)]; }
  function clockParts() { return [mm(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), MAT.goldTrim, 0, 0, 0, Math.PI / 2), mm(new THREE.CircleGeometry(0.15, 24), MAT.white, 0, 0, 0.021), B(0.012, 0.1, 0.005, MAT.black, 0, -0.01, 0.024), B(0.075, 0.012, 0.005, MAT.black, 0.03, -0.006, 0.024)]; }
  function splitAC() { return [B(0.9, 0.3, 0.22, MAT.devWhite), B(0.84, 0.03, 0.02, MAT.devGrey, 0, 0.05, 0.11)]; }
  function wallItem(parts, x, y, z, face, lvl) { device(null, parts, x, y, z, FACE[face], lvl); }
  function chandelier(kind) {
    if (kind === "lantern" || kind === "lanternS") { const k = kind === "lantern" ? 1 : 0.7; return [C(0.012, 0.22, MAT.goldTrim, 0, -0.22, 0, 6), B(0.5 * k, 0.03, 0.5 * k, MAT.goldTrim, 0, -0.25, 0), B(0.42 * k, 0.3 * k, 0.42 * k, MAT.ledWarm, 0, -0.25 - 0.3 * k, 0), B(0.48 * k, 0.04, 0.48 * k, MAT.goldTrim, 0, -0.28 - 0.3 * k, 0), mm(new THREE.ConeGeometry(0.2 * k, 0.2 * k, 4), MAT.goldTrim, 0, -0.4 - 0.3 * k, 0, Math.PI, Math.PI / 4)].concat([[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => B(0.02, 0.34 * k, 0.02, MAT.goldTrim, a * 0.23 * k, -0.28 - 0.3 * k, b * 0.23 * k))); }
    if (kind === "feather") { // ثريا كريستالية بأذرع كالريش
      const p = [C(0.015, 0.12, MAT.chrome, 0, -0.12, 0, 6), mm(new THREE.SphereGeometry(0.12, 10, 8), MAT.crystal, 0, -0.35, 0)];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.push(mm(new THREE.ConeGeometry(0.035, 0.55, 5), MAT.crystal, Math.cos(a) * 0.3, -0.38, Math.sin(a) * 0.3, Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1)); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; p.push(C(0.012, 0.32, MAT.crystal, Math.cos(a) * 0.18, -0.75, Math.sin(a) * 0.18, 5)); }
      return p;
    }
    const p = [C(0.015, 0.4, MAT.goldTrim, 0, -0.4, 0, 6)];
    [[0.42, -0.62], [0.3, -0.85], [0.16, -1.02]].forEach(([r, y]) => { p.push(mm(new THREE.TorusGeometry(r, 0.018, 6, 24), MAT.goldTrim, 0, y, 0, Math.PI / 2)); for (let i = 0; i < Math.round(r * 30); i++) { const a = i / Math.round(r * 30) * Math.PI * 2; p.push(C(0.018, 0.2, MAT.crystal, Math.cos(a) * r, y - 0.2, Math.sin(a) * r, 6)); } });
    return p;
  }
  function rug(key, x0, z0, x1, z1, y) { flat(key, x0, z0, x1, z1, y + 0.01); }

  /* أبواب كل الطوابق (لتجنّب وضع الأثاث أمامها) */
  let DOORPTS = null;
  function clearOf(lvl, x, z, rad = 1.05) {
    if (!DOORPTS) { DOORPTS = []; ROOMS.forEach(r => (r.doors || []).forEach(d => { const p = doorPos(r, d); DOORPTS.push({ lvl: r.lvl, x: p.x, z: p.z, w: p.w }); })); }
    return !DOORPTS.some(d => d.lvl === lvl && Math.hypot(d.x - x, d.z - z) < rad + d.w / 2);
  }
  /* إطار محلي للغرفة: f نحو جدار الباب، s عرضي */
  function ctx(r) {
    const [x0, x1, z0, z1] = r.r, y = r.lvl * FH, s0 = r.doors[0].s;
    const [fx, fz] = { E: [1, 0], W: [-1, 0], F: [0, 1], B: [0, -1] }[s0], sx = -fz, sz = fx;
    const ix0 = x0 + (x0 === BX0 ? 0.15 : 0.07), ix1 = x1 - (x1 === BX1 ? 0.15 : 0.07), iz0 = z0 + (z0 === BZ0 ? 0.15 : 0.07), iz1 = z1 - (z1 === BZ1 ? 0.15 : 0.07);
    const cx = (ix0 + ix1) / 2, cz = (iz0 + iz1) / 2, D = fx ? ix1 - ix0 : iz1 - iz0, Wd = fx ? iz1 - iz0 : ix1 - ix0;
    const P = (u, v) => ({ x: cx + u * fx + v * sx, z: cz + u * fz + v * sz });
    const RY = { f: Math.atan2(fx, fz), "-f": Math.atan2(-fx, -fz), s: Math.atan2(sx, sz), "-s": Math.atan2(-sx, -sz) };
    const c = { r, y, lvl: r.lvl, D, Wd, cx, cz, P, RY, fx, fz, sx, sz, ix0, ix1, iz0, iz1 };
    c.dev = (key, parts, u, v, dir = "f", col) => { const p = P(u, v); return device(key, parts, p.x, y, p.z, RY[dir], r.lvl, col); };
    c.wall = (parts, u, v, h, dir) => { const p = P(u, v); device(null, parts, p.x, y + h, p.z, RY[dir], r.lvl); };
    c.free = (u, v, rad) => { const p = P(u, v); return clearOf(r.lvl, p.x, p.z, rad); };
    c.rug = (key, u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v1); rug(key, Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z), y); };
    c.lights = n => { for (let i = 0; i < n; i++) { const p = P(-D / 2 + D * (i + 0.5) / n, 0); flat("led", p.x - 0.3, p.z - 0.3, p.x + 0.3, p.z + 0.3, y + CH - 0.006, true); } };
    c.ac = () => { const v = Wd / 2 - 0.75; if (c.free(-D / 2 + 0.2, v, 0.6)) c.wall(splitAC(), -D / 2 + 0.13, v, 2.55, "f"); };
    c.clock = () => c.wall(clockParts(), D / 2 - 1.4 > 0 ? 0.2 : 0, -Wd / 2 + 0.03, 2.45, "s");
    return c;
  }
  /* صف مكاتب موظفين يواجه جهة الباب */
  function deskRow(c, u, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const v = -c.Wd / 2 + c.Wd * (i + 0.5) / n;
      if (!c.free(u, v, 0.9)) continue;
      c.dev(null, officeDesk(opts.w || 1.3, 0.7, opts.top || MAT.woodLight, opts.body || MAT.white), u, v, "f", [0.65, 0.35]);
      c.dev(null, chairExec(opts.chair || MAT.black, 0.62), u - 0.68, v, "f");
      if (opts.guest) c.dev(null, chairGuest(MAT.leatherBrown, MAT.chrome), u + 0.72, v + 0.25, "-f", [0.25, 0.25]);
    }
  }
  function sideCabinets(c, side, u0, u1, glass = true, body = MAT.white) {
    const v = side * (c.Wd / 2 - 0.22), dir = side > 0 ? "-s" : "s";
    for (let u = u0; u <= u1 - 0.95; u += 1.02) if (c.free(u + 0.5, v, 0.75)) c.dev(null, cabinet(1.0, 1.95, 0.42, body, glass), u + 0.5, v, dir, [0.5, 0.21]);
  }

  /* ---------------------------------------------------------------
     الأماكن العامة
  --------------------------------------------------------------- */
  /* لوحات بإطار ذهبي على جدران ممر الطابق الأرضي مع إنارة جدارية سوداء، تتجنّب الأبواب */
  function wallPanels(axis, c, face, a, b, lvl, sconce = true) {
    const y = lvl * FH, holes = holesOn(axis, c, lvl), off = face * (T / 2 + 0.008);
    for (let u = a + 0.9; u <= b - 0.9; u += 1.6) {
      if (holes.some(h => u + 0.75 > h.a - 0.25 && u - 0.75 < h.b + 0.25)) continue;
      const bar = (u0, u1, y0, y1) => axis === "Z" ? bx("goldTrim", c + off - 0.012, y0, u0, c + off + 0.012, y1, u1) : bx("goldTrim", u0, y0, c + off - 0.012, u1, y1, c + off + 0.012);
      bar(u - 0.42, u + 0.42, y + 0.45, y + 0.48); bar(u - 0.42, u + 0.42, y + 2.42, y + 2.45); bar(u - 0.42, u - 0.39, y + 0.45, y + 2.45); bar(u + 0.39, u + 0.42, y + 0.45, y + 2.45);
      if (axis === "Z") bx("wallMarble", c + off - 0.004, y + 0.48, u - 0.39, c + off + 0.004, y + 2.42, u + 0.39); else bx("wallMarble", u - 0.39, y + 0.48, c + off - 0.004, u + 0.39, y + 2.42, c + off + 0.004);
      if (sconce) {
        const px = axis === "Z" ? c + off : u, pz = axis === "Z" ? u : c + off, ry = axis === "Z" ? (face > 0 ? Math.PI / 2 : -Math.PI / 2) : (face > 0 ? 0 : Math.PI);
        device(null, [B(0.09, 0.26, 0.09, MAT.black, 0, 0, 0.045), B(0.07, 0.03, 0.02, MAT.ledWarm, 0, 0.26, 0.05), B(0.07, 0.03, 0.02, MAT.ledWarm, 0, -0.02, 0.05)], px, y + 1.75, pz, ry, lvl);
      }
    }
  }
  function niche(x, y, z, face, lvl) { // تجويف مضاء بنبتة (ممر الطابق الأول)
    const s = face, x0 = x, d = 0.18;
    bx("ledWarm", x0 + (s > 0 ? 0 : -d), y + 0.55, z - 0.35, x0 + (s > 0 ? d : 0), y + 0.58, z + 0.35);
    bx("white", x0 + (s > 0 ? 0 : -d), y, z - 0.38, x0 + (s > 0 ? d : 0), y + 0.55, z + 0.38);
    plant(x0 + s * 0.2, y + 0.58, z, "croton", 0.75);
    device(null, [C(0.012, 0.02, MAT.ledWarm, 0, 0, 0, 6)], x0 + s * 0.15, y + 1.55, z, 0, lvl);
  }
  function lobby() {
    LAYER = "s0";
    // لوحة الرؤية والرسالة على يسار الداخل، وتحتها جهاز البصمة وصندوقا الشكاوى
    const bp = pic(boardMat(), 2.5, 2.2, CX0 + T / 2 + 0.05, 1.78, -1.75, Math.PI / 2, "goldTrim", 0.06);
    bp.userData.device = "board"; PICK.push(bp);
    bx("goldTrim", CX0 + T / 2, 0.6, -3.08, CX0 + T / 2 + 0.03, 2.95, -3.03); bx("goldTrim", CX0 + T / 2, 0.6, -0.47, CX0 + T / 2 + 0.03, 2.95, -0.42);
    device(null, [B(0.15, 0.2, 0.07, MAT.black), B(0.1, 0.07, 0.01, MAT.screenOn, 0, 0.11, 0.036)], CX0 + T / 2, 1.25, -0.95, Math.PI / 2, 0);
    [-1.75, -2.4].forEach(z => device("board", [B(0.4, 0.46, 0.2, MAT.cream), B(0.24, 0.02, 0.01, MAT.black, 0, 0.36, 0.101), mm(new THREE.PlaneGeometry(0.32, 0.12), paperMat("صندوق الشكاوى"), 0, 0.2, 0.102)], CX0 + T / 2, 0.36, z, Math.PI / 2, 0));
    plant(1.75, 0, -0.45, "yucca", 1.25);
    device(null, flagStand("uni"), 1.55, 0, -4.35, 0, 0, [0.18, 0.18]);
    planeAt(exitMat(), 0.36, 0.14, CX0 + T / 2 + 0.01, 2.35, -3.0, Math.PI / 2);
    planeAt(exitMat(), 0.36, 0.14, WX + 1.3, 2.75, -0.08, Math.PI);
    // الاستعلامات: مكتب أبيض بكتلة خشبية بنية مخططة أفقياً، وعليه علم صغير
    const rec = [B(0.7, 1.05, 2.4, MAT.white, 0, 0, 0), B(0.8, 0.05, 2.5, MAT.white, -0.05, 1.05, 0), B(0.45, 0.06, 2.3, MAT.woodLight, 0.3, 0.74, 0), B(0.72, 1.05, 0.62, MAT.woodDark, 0, 0, 1.15)];
    for (let i = 0; i < 6; i++) rec.push(B(0.73, 0.05, 0.63, MAT.white, 0, 0.12 + i * 0.16, 1.15));
    rec.push(C(0.05, 0.02, MAT.gold, -0.2, 1.1, -0.9, 8), C(0.006, 0.38, MAT.gold, -0.2, 1.12, -0.9, 6), mm(new THREE.PlaneGeometry(0.22, 0.15), flagMat("iq"), -0.2, 1.42, -0.79, 0, Math.PI / 2, 0));
    device("reception", rec, 4.55, 0, -3.7, 0, 0, [0.4, 1.25]);
    device(null, chairExec(MAT.black, 0.7), 5.2, 0, -3.4, -Math.PI / 2, 0);
    device(null, rollupParts("welcome"), 1.75, 0, -6.5, Math.PI / 2, 0, [0.15, 0.42]);
    // ممر الطابق الأرضي: لوحات بإطار ذهبي وإنارة جدارية، مقاعد انتظار زرقاء، نباتات، تلفاز معلّق
    wallPanels("Z", CX0, 1, ZE, -4.6, 0); wallPanels("Z", CX1, -1, ZE, -6.5, 0);
    [[CX0, 1, -7.9], [CX0, 1, -12.4], [CX1, -1, -8.2], [CX1, -1, -10.8], [CX1, -1, -17.6], [CX1, -1, -19.8]].forEach(([x, s, z]) => device(null, waitingRow(3), x + s * (T / 2 + 0.3), 0, z, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0, [0.84, 0.3]));
    [[1.55, -9.4], [5.25, -12.3], [1.55, -14.6], [5.25, -15.6], [2.3, -23.55], [4.5, -23.55], [1.55, -18.4]].forEach(([x, z]) => plant(x, 0, z, "snake"));
    device(null, tvParts(1.25), CXM, 2.25, -16.0, 0, 0); bx("black", CXM - 0.02, 2.95, -16.05, CXM + 0.02, CH - 0.2, -15.97);
    device(null, rollupParts("media"), 1.75, 0, -23.4, Math.PI / 2 + 0.5, 0, [0.42, 0.15]);
    device(null, [C(0.14, 0.62, MAT.steel, 0, 0, 0, 14), C(0.15, 0.04, MAT.chrome, 0, 0.62, 0, 14)], 5.3, 0, -16.6, 0, 0, [0.15, 0.15]);
    device(null, extinguisherParts(), 1.45, 0, -18.95, 0, 0);
    // جدار نهاية الممر: لوحتان بإطار ذهبي وإنارة حول باب شعبة التسجيل
    [2.35, 4.45].forEach(u => { if (Math.abs(u - CXM) < 0.6) return; const z = ZE + T / 2 + 0.008; bx("goldTrim", u - 0.42, 0.45, z, u + 0.42, 0.48, z + 0.02); bx("goldTrim", u - 0.42, 2.42, z, u + 0.42, 2.45, z + 0.02); bx("goldTrim", u - 0.42, 0.45, z, u - 0.39, 2.45, z + 0.02); bx("goldTrim", u + 0.39, 0.45, z, u + 0.42, 2.45, z + 0.02); device(null, [B(0.09, 0.26, 0.09, MAT.black, 0, 0, 0.045), B(0.07, 0.03, 0.02, MAT.ledWarm, 0, 0.26, 0.05)], u, 1.75, z, 0, 0); });
  }
  function upperHall() {
    LAYER = "s1";
    const y = FH, gx = -1.6 + T / 2;
    // الجدار الذهبي في آخر البهو (يقابل الصاعد): «شعبة الشؤون / الإدارية والمالية» وشعار الكلية
    bx("goldMarble", gx, y, -6.52, gx + 0.04, y + CH - 0.02, -4.1);
    const gw = planeAt(goldLettersMat("شعبة الشؤون", "الادارية والمالية"), 2.3, 1.15, gx + 0.05, y + 1.85, -5.25, Math.PI / 2);
    gw.userData.device = "goldwall"; PICK.push(gw);
    pic(MAT.ph_logo_col, 0.4, 0.4, gx + 0.06, y + 2.9, -5.95, Math.PI / 2, "white", 0.02);
    device(null, sofa(3, MAT.leatherYellow, MAT.chrome, true), gx + 0.5, y, -5.3, Math.PI / 2, 1, [1.18, 0.45]);
    [0.75, 1.65].forEach(x => device(null, sofa(1, MAT.leatherYellow, MAT.chrome, true), x, y, -3.48, Math.PI, 1, [0.5, 0.43]));
    device(null, extinguisherParts(), gx + 0.14, y, -4.0, 0, 1); planeAt(fireSignMat(), 0.32, 0.22, gx + 0.01, y + 1.62, -3.95, Math.PI / 2);
    plant(2.5, y, -3.35, "snake");
    // ملصق مهام الموارد البشرية وتحته الهيكل التنظيمي، على جدار البهو الشمالي بجانب باب الشعبة
    posterOn(1.62, y, -6.6 + T / 2 + 0.02, 0, "hr");
    // لوحة الشعبة البارزة على العمود عند رأس الممر
    projPlateAt(-6.75, y, UX0, "Z", 1, "شعبة الموارد البشرية", "01G024");
    planeAt(exitMat(), 0.36, 0.14, 5.0 + T / 2 + 0.01, y + 2.3, -2.6, Math.PI / 2);
    // الصحيات: لوحتان بيضويتان
    ROOMS.filter(r => r.oval).forEach(r => { const d = r.doors[0]; planeAt(ovalPlaqueMat(r.oval[0], r.oval[1]), 0.36, 0.17, d.at, y + 2.48, r.r[2] - T / 2 - 0.012, Math.PI); });
    // الممر: لافتة الترحيب، تجاويف مضاءة بنباتات، طفايات وسلال، والملصقات
    device(null, rollupParts("welcome"), UX0 + 0.42, y, -7.55, Math.PI / 2 - 0.35, 1, [0.15, 0.42]);
    niche(UX0 + T / 2, y + 0.6, -7.0, 1, 1);
    [-12.9, -15.6, -20.0].forEach(z => niche(CX1 - T / 2, y + 0.6, z, -1, 1));
    niche(UX0 + T / 2, y + 0.6, -19.3, 1, 1);
    // إطار أبيض كبير على الجدار الغربي بين الأبواب
    [[-13.2, -15.5]].forEach(([a, b]) => { bx("white", UX0 + T / 2, y + 0.95, b, UX0 + T / 2 + 0.05, y + 1.0, a); bx("white", UX0 + T / 2, y + 2.35, b, UX0 + T / 2 + 0.05, y + 2.4, a); bx("white", UX0 + T / 2, y + 0.95, b, UX0 + T / 2 + 0.05, y + 2.4, b + 0.05); bx("white", UX0 + T / 2, y + 0.95, a - 0.05, UX0 + T / 2 + 0.05, y + 2.4, a); });
    posterOn(UX0 + T / 2 + 0.02, y, -16.35, Math.PI / 2, "acc");
    posterOn(UX0 + T / 2 + 0.02, y, -21.0, Math.PI / 2, "media");
    posterOn(CX1 - T / 2 - 0.02, y, -21.1, -Math.PI / 2, "plan");
    [[5.32, -10.45], [5.32, -18.55]].forEach(([x, z]) => device(null, [C(0.16, 0.62, MAT.red, 0, 0.12, 0, 14), C(0.035, 0.12, MAT.black, 0, 0.74, 0, 8), C(0.09, 0.1, MAT.black, 0.12, 0, 0.08, 10), C(0.09, 0.1, MAT.black, -0.12, 0, 0.08, 10)], x, y, z, 0, 1, [0.18, 0.18]));
    planeAt(fireSignMat(), 0.34, 0.24, CX1 - T / 2 - 0.03, y + 1.6, -10.5, -Math.PI / 2);
    [[5.35, -14.6], [3.48, -18.45], [5.35, -21.72]].forEach(([x, z]) => device(null, [C(0.14, 0.62, MAT.steel, 0, 0, 0, 14), C(0.15, 0.04, MAT.chrome, 0, 0.62, 0, 14)], x, y, z, 0, 1, [0.15, 0.15]));
    // «مكتب العميد» بحروف ذهبية فوق بابه على اليسار في آخر الممر، وعلم العراق بجانبه
    planeAt(lettersMat("مكتب العميد", 512, 120), 1.15, 0.28, UX0 + T / 2 + 0.035, y + 2.62, -23.7, Math.PI / 2);
    device(null, flagStand("iq"), UX0 + 0.35, y, -24.55, 0, 1, [0.18, 0.18]);
    plant(UX0 + 0.3, y, -22.95, "croton", 0.9);
    // نهاية الممر: باب قاعة المجلس الأبيض المزدوج تحت لوحة «امانة المجلس» وشعار الكلية، بين رفّين ذهبيين مرآتيين
    const zz = ZE1 + T / 2;
    bx("white", UX0 + 0.05, y + 2.45, zz, CX1 - 0.05, y + CH - 0.05, zz + 0.06);
    planeAt(councilHeaderMat(), 1.75, 0.82, UXM, y + 2.92, zz + 0.065, 0);
    [[UX0 + 0.27, 0.42], [CX1 - 0.27, 0.42]].forEach(([x, w]) => {
      const p = [B(w, 2.45, 0.3, MAT.white)];
      for (let i = 0; i < 3; i++) p.push(B(w - 0.08, 0.62, 0.02, MAT.goldMirror, 0, 0.2 + i * 0.75, 0.14), B(w - 0.06, 0.03, 0.26, MAT.white, 0, 0.16 + i * 0.75, 0.01));
      for (let k = 0; k < 2; k++) for (let j = 0; j < 3; j++) p.push(mm(new THREE.BoxGeometry(w * 0.55, 0.02, 0.01), MAT.goldTrim, 0, 0.5 + j * 0.75, 0.155, 0, 0, k ? 0.78 : -0.78));
      device("council", p, x, y, zz + 0.16, 0, 1, [w / 2, 0.16]);
    });
    [UX0 + 0.27, CX1 - 0.27].forEach(x => device(null, extinguisherParts(), x, y, zz + 0.45, 0, 1));
    // على اليمين: باب أمين المجلس المعيّني، فوقه «امانة المجلس» بحروف ذهبية، ولوحته البارزة
    bx("white", CX1 - T / 2 - 0.06, y + 2.42, -24.75, CX1 - T / 2, y + CH - 0.05, -23.45);
    planeAt(lettersMat("امانة المجلس", 640, 150, "#d9b04f"), 1.15, 0.3, CX1 - T / 2 - 0.065, y + 2.9, -24.1, -Math.PI / 2);
    projPlateAt(-23.42, y, CX1, "Z", -1, "أمين المجلس", "01G017");
    plant(CX1 - 0.3, y, -23.05, "croton", 0.9);
  }
  /* ملصق «مهام الشعبة» وتحته الهيكل التنظيمي المؤطّر وأزرار الكهرباء. (x,z) على وجه الجدار، ry اتجاه الوجه */
  function posterOn(x, y, z, ry, key) {
    const P = POSTERS[key], pm = posterMat(key), sx = Math.sin(ry), sz = Math.cos(ry), cy = y + 1.25 + pm.h / 2;
    const m = pic(pm.mat, pm.w, pm.h, x + sx * 0.012, cy, z + sz * 0.012, ry, null);
    m.userData.device = "poster_" + key; PICK.push(m);
    if (P.chart) { const ch = pic(chartMat(P.chart), 0.6, 0.43, x + sx * 0.03, y + 1.25 - 0.3, z + sz * 0.03, ry, P.frame || "woodDark", 0.03); ch.userData.device = "poster_" + key; PICK.push(ch); }
    const ox = Math.cos(ry), oz = -Math.sin(ry);
    device(null, [B(0.26, 0.09, 0.02, MAT.goldTrim), B(0.06, 0.05, 0.01, MAT.woodDark, -0.07, 0.02, 0.01), B(0.06, 0.05, 0.01, MAT.woodDark, 0.02, 0.02, 0.01)], x + ox * (pm.w / 2 + 0.2) + sx * 0.01, y + 1.05, z + oz * (pm.w / 2 + 0.2) + sz * 0.01, ry, 1);
  }

  /* ---------------------------------------------------------------
     الغرف حسب نوعها (كما ظهرت في الفيديو)
  --------------------------------------------------------------- */
  function greekDesk(w = 1.4, d = 0.7, pc = true) {
    const p = [B(w, 0.05, d, MAT.woodLight, 0, 0.74, 0), B(w - 0.04, 0.7, 0.04, MAT.greek, 0, 0.04, d / 2 - 0.02), B(0.05, 0.74, d - 0.04, MAT.woodLight, -w / 2 + 0.03, 0, 0), B(0.05, 0.74, d - 0.04, MAT.woodLight, w / 2 - 0.03, 0, 0), B(0.42, 0.6, d - 0.1, MAT.woodLight, w / 2 - 0.26, 0.1, -0.02)];
    if (pc) p.push(B(0.5, 0.3, 0.03, MAT.screen, -0.1, 0.95, d / 2 - 0.2), B(0.08, 0.16, 0.06, MAT.black, -0.1, 0.79, d / 2 - 0.2), B(0.42, 0.02, 0.14, MAT.black, -0.1, 0.79, -d / 2 + 0.18));
    return p;
  }
  function slatDesk(w = 1.6, d = 0.75) { // مكتب بسطح خشبي فاتح وواجهة شرائح داكنة (غرف الموارد البشرية والتخطيط)
    const p = [B(w, 0.05, d, MAT.woodLight, 0, 0.74, 0), B(0.06, 0.74, d - 0.04, MAT.woodDark, -w / 2 + 0.03, 0, 0), B(0.06, 0.74, d - 0.04, MAT.woodDark, w / 2 - 0.03, 0, 0)];
    for (let i = 0; i < 6; i++) p.push(B(w - 0.08, 0.07, 0.04, i % 2 ? MAT.woodLight : MAT.woodDark, 0, 0.06 + i * 0.11, d / 2 - 0.02));
    p.push(B(0.3, 0.04, 0.22, MAT.paper, 0.4, 0.79, -0.05), B(0.12, 0.08, 0.08, MAT.black, -0.5, 0.79, 0.1));
    return p;
  }
  function deskSet(c, kind, u, v, dir = "f", guest = false) {
    const parts = kind === "greek" ? greekDesk() : kind === "slat" ? slatDesk() : kind === "exec" ? execDesk(1.8, 0.85) : officeDesk(1.3, 0.7);
    c.dev(null, parts, u, v, dir, [0.8, 0.4]);
    const back = dir === "f" ? -0.7 : 0.7;
    c.dev(null, chairExec(kind === "exec" ? MAT.leatherDark : MAT.leatherBeige, 0.75), u + back, v, dir);
    if (guest) c.dev(null, chairGuest(MAT.leatherBeige, MAT.chrome), u - back, v + 0.3, dir === "f" ? "-f" : "f", [0.25, 0.25]);
  }
  function furnish(r) {
    if (r.sub === "stair") return;
    LAYER = r.lvl ? "s1" : "s0";
    const c = ctx(r), D = c.D, W = c.Wd, y = c.y, sub = r.sub;
    const F = { ac: true, clock: false, lights: Math.max(1, Math.round(D / 2.8)) };
    if (sub === "deputy" || sub === "regmgr" || sub === "mgr") {
      const u = -D / 2 + 1.5;
      c.dev(null, slatDesk(1.7, 0.8), u, 0, "f", [0.85, 0.4]);
      c.dev(null, chairExec(MAT.leatherWhite, 0.85), u - 0.72, 0, "f");
      c.dev(null, chairGuest(MAT.leatherBeige, MAT.chrome), u + 0.95, -0.42, "-f", [0.25, 0.25]); c.dev(null, chairGuest(MAT.leatherBeige, MAT.chrome), u + 0.95, 0.42, "-f", [0.25, 0.25]);
      c.dev(null, flagStand("iq"), -D / 2 + 0.45, W / 2 - 0.45, "f", [0.18, 0.18]);
      const sv = -(W / 2 - 0.5);
      if (c.free(D / 2 - 2.2, sv, 1.3)) c.dev(null, sofa(3, MAT.leatherBeige, null, true), D / 2 - 2.4, sv, "s", [1.18, 0.45]);
      if (c.free(0.6, W / 2 - 0.22, 0.8)) c.dev(null, cabinet(1.0, 1.95, 0.42, MAT.cream, true), 0.6, W / 2 - 0.22, "-s", [0.5, 0.21]);
      c.dev(null, plantParts("snake"), D / 2 - 0.5, W / 2 - 0.4, "f");
    } else if (sub === "staff" || sub === "small" || sub === "legal") {
      deskSet(c, "office", -D / 2 + 1.15, -W / 4, "f", true); if (W > 3.4) deskSet(c, "office", -D / 2 + 1.15, W / 4, "f");
      if (D > 4.5) deskSet(c, "office", -D / 2 + 3.4, 0, "f");
      sideCabinets(c, 1, D > 5.5 ? 0.6 : -0.2, D / 2 - 0.4, true, MAT.cream);
    } else if (sub === "grad") { // شعبة الدراسات العليا: مكاتب بنقشة المفتاح اليوناني وجدران رخامية وشبّاكا مراجعين
      (r.wins || []).forEach(wn => {
        const xw = r.r[1], wm = (wn.a + wn.b) / 2, ww = wn.b - wn.a;
        planeAt(MAT.glassDiamond, ww, 1.0, xw, y + 1.5, wm, Math.PI / 2);
        bx("white", xw - 0.3, y + 0.96, wn.a, xw + 0.3, y + 1.0, wn.b);
        frameZ("frameBlack", xw, wn.a, wn.b, y + 1.0, y + 2.0, 0.04, T / 2 + 0.02);
      });
      deskSet(c, "greek", D / 2 - 0.75, -0.95, "f"); deskSet(c, "greek", D / 2 - 0.75, 1.55, "f"); deskSet(c, "greek", -D / 2 + 1.6, 0, "f");
      sideCabinets(c, -1, -D / 2 + 0.4, 0.8, true, MAT.cream);
      c.dev(null, waterCooler(), -D / 2 + 0.3, W / 2 - 0.3, "f", [0.17, 0.17]);
      c.wall([B(0.35, 2.6, 0.03, MAT.black)], -D / 2 + 0.02, -0.4, 0.4, "f");
      c.dev(null, plantParts("snake"), D / 2 - 0.4, -(W / 2 - 0.35), "f");
    } else if (sub === "cash") {
      deskSet(c, "office", D / 2 - 1.3, 0, "-f", false);
      c.dev(null, [B(0.6, 0.9, 0.55, MAT.greyDark), B(0.04, 0.12, 0.02, MAT.chrome, 0.2, 0.5, 0.28)], -D / 2 + 0.4, W / 2 - 0.4, "f", [0.3, 0.28]);
      deskSet(c, "office", -D / 2 + 1.2, -W / 4, "f");
      sideCabinets(c, -1, -0.5, D / 2 - 0.4, true, MAT.cream);
    } else if (sub === "archive" || sub === "store") {
      const sv = W / 2 - 0.25;
      for (let u = -D / 2 + 0.3; u < D / 2 - 1.4; u += 1.9) [sv, -sv].forEach(v => { if (c.free(u + 0.95, v, 0.8)) c.dev(null, sub === "store" ? storeShelf() : shelves(1.8, 2.1, 0.4, MAT.steel, 5), u + 0.95, v, v > 0 ? "-s" : "s", [0.9, 0.2]); });
      if (sub === "archive") deskSet(c, "office", D / 2 - 1.6, 0, "f");
      F.ac = false;
    } else if (sub === "reg") {
      // شعبة التسجيل: سقف مزخرف وثريا ذهبية، مكاتب خشبية فاتحة بأرجل بيضاء مقوّسة، كراسٍ جلدية بيج، خزانات كريمية بأبواب زجاجية، وغرفة زجاجية
      [[1.6, -26.6], [5.6, -26.6], [1.6, -29.4], [5.6, -29.4]].forEach(([x, z], i) => {
        device(null, [B(1.6, 0.05, 0.75, MAT.woodLight, 0, 0.74, 0), B(1.5, 0.5, 0.03, MAT.white, 0, 0.22, 0.34), mm(new THREE.TorusGeometry(0.33, 0.035, 6, 16, Math.PI), MAT.white, -0.72, 0.38, 0, 0, Math.PI / 2, Math.PI / 2), mm(new THREE.TorusGeometry(0.33, 0.035, 6, 16, Math.PI), MAT.white, 0.72, 0.38, 0, 0, Math.PI / 2, Math.PI / 2), B(0.5, 0.3, 0.03, MAT.screen, -0.2, 0.95, 0.22), B(0.36, 0.2, 0.3, MAT.devGrey, 0.4, 0.79, 0.1)], x, y, z, 0, 0, [0.8, 0.38]);
        device(null, chairExec(i === 0 ? MAT.leatherWhite : MAT.leatherBeige, i === 0 ? 0.9 : 0.6), x, y, z - 0.72, 0, 0);
        device(null, chairGuest(MAT.leatherBeige, MAT.chrome), x - 0.35, y, z + 0.75, Math.PI, 0, [0.25, 0.25]);
      });
      [0.2, 1.25].forEach(x => device(null, cabinet(1.0, 1.95, 0.42, MAT.cream, true), x, y, BZ0 + 0.36, 0, 0, [0.5, 0.21]));
      device(null, acStand(), 9.6, y, -24.6, -Math.PI / 2, 0, [0.25, 0.18]);
      bx("woodDark", -1 + T / 2, y, -26.6, -1 + T / 2 + 0.04, y + CH, -25.6);
      // غرفة زجاجية بإطار ألمنيوم وأشرطة مثلّجة في الركن الخلفي
      const gx0 = 6.8, gz1 = -30.6;
      [[gx0, -33.85, gx0, gz1], [gx0, gz1, BX1 - 0.15, gz1]].forEach(([a, b, cc, d]) => {
        const along = a === cc ? "z" : "x", len = along === "z" ? d - b : cc - a;
        planeAt(MAT.glassFrost, len, 2.4, along === "z" ? a : (a + cc) / 2, y + 1.2, along === "z" ? (b + d) / 2 : b, along === "z" ? Math.PI / 2 : 0);
        if (along === "z") { bx("alu", a - 0.03, y + 2.4, b, a + 0.03, y + 2.46, d); solid(0, a - 0.05, b, a + 0.05, d - 1.0); } else { bx("alu", a, y + 2.4, b - 0.03, cc, y + 2.46, b + 0.03); solid(0, a + 1.0, b - 0.05, cc, b + 0.05); }
      });
      device(null, officeDesk(1.3, 0.65), 8.5, y, -32.6, 0, 0, [0.65, 0.33]); device(null, chairExec(MAT.leatherBeige, 0.6), 8.5, y, -33.2, 0, 0);
      [[2.2, -27.9], [5.2, -27.9]].forEach(([x, z], i) => device(null, chandelier(i ? "lanternS" : "lantern"), x, y + CH, z, 0, 0));
      [[1.6, -25.0], [5.6, -25.0], [1.6, -31.2], [4.0, -31.2]].forEach(([x, z]) => flat("led", x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + CH - 0.006, true));
      F.lights = 0;
      plant(-0.6, y, -24.5, "snake");
      device(null, waterCooler(), -0.7, y, -29.4, Math.PI / 2, 0, [0.17, 0.17]);
      const hp = planeAt(new THREE.MeshBasicMaterial({ visible: false }), 2.0, 1.4, CXM, y + 1.3, -25.4, 0); hp.userData.device = "reghall"; PICK.push(hp);
    } else if (sub === "hrMgr") {
      // شعبة الموارد البشرية (كما في الفيديو): جدران خشبية، كنبة جلدية بنية طويلة على اليسار وطاولة زجاجية بأرجل ذهبية،
      // مكتب المدير على اليمين تحت شعار الكلية، باب أسود بنافذة علوية وعلم في الجدار المقابل، كرسيان جلديان، رفّ رسائل أبيض
      rug("rugBeige", -1.3, -10.5, 1.5, -7.0, y);
      device(null, sofa(3, MAT.leatherBrown, null, false), -1.15, y, -8.35, Math.PI / 2, 1, [1.18, 0.45]);
      device(null, [B(1.0, 0.03, 0.55, MAT.glassCab, 0, 0.42, 0), B(0.9, 0.03, 0.45, MAT.glassCab, 0, 0.12, 0), C(0.025, 0.42, MAT.gold, -0.45, 0, -0.22, 6), C(0.025, 0.42, MAT.gold, 0.45, 0, -0.22, 6), C(0.025, 0.42, MAT.gold, -0.45, 0, 0.22, 6), C(0.025, 0.42, MAT.gold, 0.45, 0, 0.22, 6)], -0.15, y, -8.35, Math.PI / 2, 1, [0.5, 0.28]);
      device(null, slatDesk(1.7, 0.8), 2.25, y, -8.7, -Math.PI / 2, 1, [0.85, 0.4]); device(null, chairExec(MAT.leatherDark, 0.85), 2.9, y, -8.7, -Math.PI / 2, 1);
      device(null, chairGuest(MAT.leatherBrown, MAT.woodDark), 1.3, y, -9.2, Math.PI / 2, 1, [0.25, 0.25]);
      pic(MAT.ph_logo_col, 0.42, 0.42, UX0 - T / 2 - 0.045, y + 2.05, -8.7, -Math.PI / 2, "white", 0.02);
      device(null, flagStand("iq"), 0.12, y, -10.92, 0, 1, [0.18, 0.18]);
      [0.85, 1.83].forEach(x => device(null, sofa(1, MAT.leatherBrown, null, false), x, y, -10.62, 0, 1, [0.49, 0.43]));
      device(null, [B(0.84, 1.7, 0.36, MAT.white), B(0.76, 1.55, 0.01, MAT.pigeon, 0, 0.08, 0.18)], 2.77, y, -10.9, 0, 1, [0.42, 0.18]);
      wallItem(splitAC(), 1.3, y + 2.75, -11.2 + T / 2 + 0.12, "F", 1);
      wallItem([mm(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), MAT.white, 0, 0, 0, Math.PI / 2), mm(new THREE.TorusGeometry(0.22, 0.03, 6, 20), MAT.gold, 0, 0, 0.03), B(0.015, 0.14, 0.005, MAT.black, 0, 0, 0.03)], -1.6 + T / 2 + 0.05, y + 2.35, -8.35, "E", 1);
      F.ac = false; F.lights = 2;
    } else if (sub === "hrStaff") {
      // غرفة موظفي الموارد البشرية: مكاتب بواجهات شرائح، شبابيك بستائر مخططة على الواجهة الغربية
      [[-4.9, -8.2], [-3.3, -8.2], [-4.9, -12.7], [-3.3, -12.7]].forEach(([x, z]) => { device(null, slatDesk(1.4, 0.7), x, y, z, Math.PI / 2, 1, [0.7, 0.35]); device(null, chairExec(MAT.leatherBeige, 0.7), x - 0.66, y, z, Math.PI / 2, 1); });
      [-4.9, -3.85].forEach(x => device(null, cabinet(1.0, 1.95, 0.42, MAT.cream, true), x, y, -14.38, Math.PI, 1, [0.5, 0.21]));
      wallItem(splitAC(), -3.8, y + 2.7, -6.6 - T / 2 - 0.12, "B", 1);
    } else if (sub === "qa") {
      // ضمان الجودة: حاجز خشبي بثلاثة شبابيك زجاجية ورفوف تسليم يقابل الداخل، وخلفه مكاتب الموظفين
      const px = 7.15, za = -10.47, zb = -14.0;
      bx("woodPanelD", px - 0.05, y, zb, px + 0.05, y + 1.0, za); bx("woodDark", px - 0.3, y + 1.0, zb, px + 0.3, y + 1.04, za);
      planeAt(MAT.glass2s, za - zb, 1.1, px, y + 1.6, (za + zb) / 2, -Math.PI / 2);
      bx("woodPanelD", px - 0.05, y + 2.15, zb, px + 0.05, y + CH, za); for (let z = zb; z <= za + 0.01; z += (za - zb) / 3) bx("woodDark", px - 0.04, y + 1.0, z - 0.03, px + 0.04, y + 2.15, z + 0.03);
      bx("woodPanelD", px - 0.05, y + 2.15, -14.73, px + 0.05, y + CH, zb);
      solid(1, px - 0.06, zb, px + 0.06, za);
      const cp = planeAt(new THREE.MeshBasicMaterial({ visible: false }), za - zb, 1.2, px - 0.06, y + 1.5, (za + zb) / 2, -Math.PI / 2); cp.userData.device = "counter"; PICK.push(cp);
      [-11.2, -12.4, -13.5].forEach(z => { device(null, officeDesk(0.95, 0.6, MAT.woodLight, MAT.white), px + 0.45, y, z, -Math.PI / 2, 1, [0.47, 0.3]); device(null, chairExec(MAT.leatherBeige, 0.6), px + 1.08, y, z, -Math.PI / 2, 1); });
      [-11.0, -12.05, -13.1].forEach(z => device(null, cabinet(1.0, 1.95, 0.42, MAT.cream, true), BX1 - 0.37, y, z, -Math.PI / 2, 1, [0.5, 0.21]));
      F.ac = false; wallItem(splitAC(), BX1 - 0.27, y + 2.7, -14.0, "W", 1);
    } else if (sub === "aud") {
      deskSet(c, "office", 0.2, 0, "f", true);
      c.dev(null, cabinet(1.0, 2.0, 0.42, MAT.white, true), -D / 2 + 0.25, W / 2 - 0.7, "f", [0.5, 0.21]);
    } else if (sub === "acc") {
      // شعبة الحسابات: أرضية تيرازو، رفوف خشبية فاتحة من الأرض إلى السقف مليئة بالأضابير في الركن، مكاتب، وشبابيك بستائر شفافة
      const sh = (x, z, ry, w) => device("shelves", shelves(w, 2.5, 0.38, MAT.woodLight, 6).concat([B(w, 0.85, 0.4, MAT.woodLight, 0, 0, 0.01)]), x, y, z, ry, 1, [w / 2, 0.19]);
      sh(-4.75, -14.88, Math.PI, 2.3); sh(-2.35, -14.88, Math.PI, 2.3); sh(-5.68, -16.25, Math.PI / 2, 1.9);
      [[-3.4, -16.6], [-3.4, -18.7], [-0.6, -16.6], [-0.6, -18.7]].forEach(([x, z], i) => { device(null, officeDesk(1.4, 0.7, MAT.woodLight, MAT.cream), x, y, z, Math.PI / 2, 1, [0.7, 0.35]); device(null, chairExec(i ? MAT.leatherBeige : MAT.leatherDark, i ? 0.7 : 0.85), x - 0.66, y, z, Math.PI / 2, 1); });
      device(null, [B(0.6, 0.72, 0.5, MAT.white), B(0.5, 0.3, 0.42, MAT.devGrey, 0, 0.72, 0)], -5.55, y, -19.4, Math.PI / 2, 1, [0.3, 0.25]);
      F.ac = false; wallItem(splitAC(), -4.6, y + 2.7, -20.0 + T / 2 + 0.12, "F", 1);
    } else if (sub === "plan") {
      // شعبة التخطيط والمتابعة: ورق جدران مضرّب، إطار خشبي داكن في السقف، مكتب داكن قرب الشبّاك ومكيّف شبّاك، كنبة بيج منجّدة، خزانات زجاجية، سجادة دائرية، خزنة
      LAYER = "c1"; [[CX1, BX1, -18.67, -18.6], [CX1, BX1, -23.0, -22.93]].forEach(([a, b, p, q]) => bx("woodDark", a, y + CH - 0.3, p, b, y + CH, q)); bx("woodDark", BX1 - 0.22, y + CH - 0.3, -23.0, BX1 - 0.15, y + CH, -18.6); bx("woodDark", CX1 + 0.07, y + CH - 0.3, -23.0, CX1 + 0.14, y + CH, -18.6); LAYER = "s1";
      device(null, execDesk(1.8, 0.85, MAT.mahog, MAT.mahogDark), 8.75, y, -20.7, -Math.PI / 2, 1, [0.9, 0.43]); device(null, chairExec(MAT.leatherDark, 0.85), 9.4, y, -20.7, -Math.PI / 2, 1);
      [-20.25, -21.15].forEach(z => device(null, chairGuest(MAT.leatherBeige, MAT.chrome), 7.6, y, z, Math.PI / 2, 1, [0.25, 0.25]));
      device(null, sofa(3, MAT.leatherBeige, null, true), 7.3, y, -18.98, Math.PI, 1, [1.18, 0.43]);
      [7.8, 8.75].forEach(x => device(null, cabinet(0.9, 2.0, 0.42, MAT.woodLight, true), x, y, -22.72, 0, 1, [0.45, 0.21]));
      device(null, [B(0.55, 0.75, 0.5, MAT.greyDark), B(0.04, 0.1, 0.02, MAT.chrome, 0.18, 0.45, 0.26)], 9.55, y, -22.55, 0, 1, [0.28, 0.25]);
      rug("rugRound", 6.6, -21.6, 8.2, -20.0, y);
      wallItem([B(0.7, 0.45, 0.5, MAT.devWhite), B(0.62, 0.36, 0.02, MAT.devGrey, 0, 0.04, 0.25)], BX1 - 0.16, y + 1.65, -22.2, "W", 1);
      F.ac = false;
    } else if (sub === "media1") {
      // شعبة الإعلام: سجادة بإطار أزرق، مكتبان داكنان بواجهات كريمية، خزانات زجاجية، تكييف واقف، شبّاك بستارة
      rug("rugBlue", -4.2, -22.6, 1.8, -20.4, y);
      device(null, execDesk(1.6, 0.8, MAT.mahog, MAT.cream), -4.7, y, -21.5, Math.PI / 2, 1, [0.8, 0.4]); device(null, chairExec(MAT.leatherDark, 0.9), -5.38, y, -21.5, Math.PI / 2, 1);
      device(null, execDesk(1.3, 0.75, MAT.mahog, MAT.cream), -1.2, y, -20.62, Math.PI, 1, [0.65, 0.38]); device(null, chairExec(MAT.leatherBeige, 0.75), -1.2, y, -20.25, Math.PI, 1);
      [-2.9, -1.9, -0.9].forEach(x => device(null, cabinet(1.0, 2.0, 0.42, MAT.white, true), x, y, -22.75, 0, 1, [0.5, 0.21]));
      device(null, acStand(), -5.6, y, -22.62, 0, 1, [0.25, 0.18]);
      F.ac = false;
    } else if (sub === "wc") {
      const [x0, x1] = r.r;
      device(null, [B(1.3, 0.85, 0.5, MAT.white), B(1.34, 0.04, 0.54, MAT.terr, 0, 0.85, 0), C(0.16, 0.04, MAT.devWhite, -0.3, 0.86, 0, 16), C(0.16, 0.04, MAT.devWhite, 0.3, 0.86, 0, 16), B(1.2, 0.8, 0.02, MAT.glass, 0, 1.2, -0.24)], (x0 + x1) / 2 - 0.3, y, -0.42, Math.PI, 1, [0.65, 0.25]);
      F.ac = false;
    } else if (sub === "aminE") {
      device(null, sofa(2, MAT.leatherBeige, null, true), 8.3, y, -23.45, Math.PI, 1, [0.84, 0.43]);
      F.ac = false;
    } else if (sub === "aminB") {
      [-26.0, -27.05, -28.1].forEach(z => device(null, cabinet(1.0, 1.95, 0.42, MAT.cream, true), BX1 - 0.37, y, z, -Math.PI / 2, 1, [0.5, 0.21]));
      device(null, officeDesk(1.3, 0.7), 8.7, y, -31.0, Math.PI, 1, [0.65, 0.35]); device(null, chairExec(MAT.leatherBeige, 0.7), 8.7, y, -31.68, Math.PI, 1);
      F.lights = 3;
    } else if (sub === "deanSec") { deanSecretary(c); F.lights = 0; F.ac = false; }
    else if (sub === "deanStaff") { deanStaff(c); F.ac = false; F.lights = 2; }
    else if (sub === "dean") { deanOffice(c); F.lights = 0; F.ac = false; }
    else if (sub === "council") { councilRoom(c); F.lights = 0; F.ac = false; }
    if (F.ac) c.ac();
    if (F.lights) c.lights(F.lights);
  }
  function storeShelf() {
    const p = shelves(1.8, 2.1, 0.45, MAT.steel, 4);
    p.splice(p.length - 4); const R = rng(99);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) if (R() < 0.8) p.push(B(0.5, 0.3 + R() * 0.12, 0.38, R() < 0.5 ? MAT.woodLight : MAT.paper, -0.6 + k * 0.6, 0.03 + i * 0.52, 0));
    return p;
  }
  /* استقبال مكتب العميد (يُدخل إليه من باب «مكتب العميد»): إنارة خطية في السقف، قوالب بيضاء وإنارة جدارية ذهبية،
     كنبات رمادية بإطار كريمي وتجويف رفوف بينها، مكتب أبيض مقوّس، طاولة سوداء بحافة ذهبية، باب أسود إلى مكتب العميد وباب معيّني إلى مدير مكتبه */
  function deanSecretary(c) {
    const y = c.y;
    device(null, sofa(2, MAT.sofaGrey, MAT.cream), 0.95, y, -23.5, Math.PI, 1, [0.84, 0.43]);
    device(null, sofa(1, MAT.sofaGrey, MAT.cream), -0.83, y, -23.5, Math.PI, 1, [0.5, 0.43]);
    // تجويف رفوف أبيض بين الكنبات
    const nz = -23.0 - T / 2; bx("white", -0.3, y, nz - 0.3, 0.08, y + 0.75, nz); [1.2, 1.65].forEach(h => bx("white", -0.3, y + h, nz - 0.26, 0.08, y + h + 0.03, nz));
    device(null, [B(0.12, 0.18, 0.1, MAT.goldTrim, -0.08, 0, 0), B(0.12, 0.16, 0.04, MAT.black, 0.1, 0, 0)], -0.11, y + 1.23, nz - 0.15, Math.PI, 1);
    device(null, [B(1.0, 0.04, 0.6, MAT.black, 0, 0.42, 0), B(1.0, 0.02, 0.6, MAT.gold, 0, 0.4, 0), B(0.96, 0.38, 0.56, MAT.black, 0, 0.02, 0)], 1.0, y, -25.0, 0, 1, [0.5, 0.3]);
    device(null, [B(1.7, 0.06, 0.8, MAT.white, 0, 0.74, 0), B(1.6, 0.7, 0.06, MAT.white, 0, 0.04, 0.34), C(0.4, 0.74, MAT.white, 0.85, 0, 0, 16), B(0.06, 0.74, 0.7, MAT.white, -0.8, 0, 0), mm(new THREE.PlaneGeometry(0.3, 0.08), nameplateMat("مكتب العميد"), 0.3, 0.84, 0.3, -0.35, 0, 0), C(0.005, 0.25, MAT.gold, -0.5, 0.77, 0.25, 6), mm(new THREE.PlaneGeometry(0.15, 0.1), flagMat("iq"), -0.43, 0.95, 0.25)], -0.25, y, -26.4, Math.PI / 2, 1, [0.85, 0.42]);
    device(null, chairExec(MAT.leatherCream, 0.8), -0.92, y, -26.4, Math.PI / 2, 1);
    plant(2.95, y, -27.3, "bamboo"); plant(-1.12, y, -25.6, "snake");
    for (let x = -1.0; x < 2.9; x += 1.45) { const z = -27.6 + T / 2 + 0.03; bx("panelTrim", x, y + 0.6, z, x + 1.1, y + 0.63, z + 0.02); bx("panelTrim", x, y + 2.3, z, x + 1.1, y + 2.33, z + 0.02); }
    [-0.4, 2.4].forEach(x => device(null, [B(0.1, 0.24, 0.06, MAT.gold, 0, 0, 0.03), B(0.08, 0.03, 0.02, MAT.ledWarm, 0, 0.24, 0.04)], x, y + 1.85, -27.6 + T / 2 + 0.025, 0, 1));
    wallItem(splitAC(), -1.4 + T / 2 + 0.12, y + 2.75, -24.6, "E", 1);
    LAYER = "c1"; const cy = y + CH;
    [[-0.9, -26.9, 2.7, -26.9], [-0.9, -23.6, 2.7, -23.6], [-0.9, -26.9, -0.9, -23.6], [2.7, -26.9, 2.7, -23.6], [0.9, -26.9, 0.9, -23.6]].forEach(([a, b, p, q]) => bx("led", Math.min(a, p) - 0.02, cy - 0.012, Math.min(b, q) - 0.02, Math.max(a, p) + 0.02, cy - 0.004, Math.max(b, q) + 0.02));
    LAYER = "s1";
  }
  /* مكتب مدير مكتب العميد: مكتبان بنقشة المفتاح اليوناني يواجهان الداخل، خزانات خشبية زجاجية، سجادة فارسية، خزنة حمراء، وشاشة فوق باب العميد */
  function deanStaff(c) {
    const y = c.y;
    rug("rugDean", -0.9, -31.6, 2.5, -28.4, y);
    device(null, greekDesk(1.5, 0.75), 0.6, y, -30.3, 0, 1, [0.75, 0.38]); device(null, chairExec(MAT.leatherBeige, 0.8), 0.6, y, -31.0, 0, 1);
    device(null, greekDesk(1.4, 0.7), 1.75, y, -32.7, 0, 1, [0.7, 0.35]); device(null, chairExec(MAT.black, 0.7), 1.75, y, -33.38, 0, 1);
    [-28.6, -29.55, -30.5].forEach(z => device(null, cabinet(0.9, 2.1, 0.42, MAT.woodLight, true), UX0 - 0.28, y, z, -Math.PI / 2, 1, [0.45, 0.21]));
    device(null, [B(0.5, 0.6, 0.45, MAT.red), B(0.04, 0.1, 0.02, MAT.chrome, 0.15, 0.35, 0.23)], -1.0, y, -28.15, Math.PI / 2, 1, [0.25, 0.23]);
    device(null, [B(0.55, 0.3, 0.45, MAT.black)], -1.0, y + 0.6, -28.15, Math.PI / 2, 1);
    wallItem([B(0.6, 0.36, 0.05, MAT.black), mm(new THREE.PlaneGeometry(0.56, 0.32), MAT.screenOn, 0, 0.18, 0.026)], -1.4 + T / 2 + 0.03, y + 2.5, -29.0, "E", 1);
    device(null, extinguisherParts(), -1.18, y, -29.75, 0, 1);
  }
  /* مكتب عميد الكلية: المكتب ولوحة الاسم وخلفه مكتبة الدروع، والأعلام بين البابين الخشبيين، وجلسة ضيوف بكنبات كريمية
     حول سجادة، ووحدة تلفاز بكؤوسها وساعة، وتكييف واقف، وستارة خيزران، وشبابيك بستائر مخططة، وسقف شبكي بإطار خشبي */
  function deanOffice(c) {
    const y = c.y, X0 = BX0 + 0.15, X1 = -1.4 - T / 2;
    LAYER = "c1"; const cy = y + CH;
    bx("woodDark", X0, cy - 0.25, -33.85, X1, cy, -33.6); bx("woodDark", X0, cy - 0.25, -29.4, X1, cy, -29.2);
    bx("woodDark", X0, cy - 0.25, -33.6, X0 + 0.25, cy, -29.4); bx("woodDark", X1 - 0.25, cy - 0.25, -33.6, X1, cy, -29.4);
    planeAt(MAT.latticeCeil, 2.2, 1.6, -3.7, cy - 0.02, -31.5, 0).rotation.x = Math.PI / 2;
    planeAt(MAT.latticeCeil, 2.2, 1.6, -3.7, cy - 0.02, -26.2, 0).rotation.x = Math.PI / 2;
    LAYER = "s1";
    const desk = execDesk(2.3, 1.0, MAT.mahog, MAT.mahogDark, MAT.mahog);
    desk.push(B(0.62, 0.16, 0.06, MAT.woodDark, 0, 0.77, 0.38), mm(new THREE.PlaneGeometry(0.56, 0.12), deanPlateMat(), 0, 0.85, 0.415, -0.12, 0, 0));
    desk.push(B(0.3, 0.12, 0.22, MAT.white, -0.75, 0.77, 0.25), C(0.05, 0.12, MAT.goldTrim, 0.8, 0.77, -0.2, 8));
    device("deandesk", desk, -3.7, y, -32.2, 0, 1, [1.15, 0.5]);
    device("deandesk", [C(0.32, 0.05, MAT.black, 0, 0.02, 0, 10), C(0.035, 0.4, MAT.chrome, 0, 0.05, 0, 8), B(0.7, 0.16, 0.65, MAT.leatherBrown, 0, 0.45, 0), B(0.72, 0.95, 0.18, MAT.leatherBrown, 0, 0.55, -0.3), B(0.14, 0.32, 0.6, MAT.leatherBrown, -0.37, 0.55, 0), B(0.14, 0.32, 0.6, MAT.leatherBrown, 0.37, 0.55, 0)].concat(Array.from({ length: 12 }, (_, i) => B(0.03, 0.03, 0.01, MAT.leatherDark, -0.25 + (i % 4) * 0.17, 0.75 + Math.floor(i / 4) * 0.22, -0.205))), -3.7, y, -33.0, 0, 1);
    [-4.3, -3.1].forEach(x => device(null, chairGuest(MAT.leatherCream, MAT.mahogDark), x, y, -31.05, Math.PI, 1, [0.25, 0.25]));
    device(null, bookcase(2.6, 2.25, 0.42), -3.7, y, -33.6, 0, 1, [1.3, 0.21]);
    [[-1.75, "uniW"], [-1.85, "uni"], [-1.75, "iq"]].forEach(([x, k], i) => device(null, flagStand(k), x, y, -29.85 - i * 0.22, 0, 1, i === 1 ? [0.2, 0.3] : null));
    // جلسة الضيوف
    rug("rugDean", -5.6, -29.0, -2.0, -24.4, y);
    device(null, sofa(3, MAT.leatherCream, MAT.mahog), -5.5, y, -26.7, Math.PI / 2, 1, [1.18, 0.45]);
    device(null, sofa(2, MAT.leatherCream, MAT.mahog), -4.1, y, -28.4, Math.PI, 1, [0.84, 0.45]);
    device(null, sofa(1, MAT.leatherCream, MAT.mahog), -2.05, y, -27.2, -Math.PI / 2, 1, [0.5, 0.45]);
    device(null, coffeeTable(1.2, 0.6, MAT.mahog), -3.75, y, -26.7, Math.PI / 2, 1, [0.3, 0.6]);
    device(null, [C(0.08, 0.2, MAT.crystal, 0, 0.45, 0, 10), mm(new THREE.SphereGeometry(0.14, 8, 6), MAT.plantG, 0, 0.75, 0)], -3.75, y, -26.7, 0, 1);
    // وحدة التلفاز وكؤوسها والساعة فوقها على الجدار الجنوبي، والتكييف الواقف، وستارة الخيزران قرب الباب الأسود
    const tvU = [B(2.0, 0.5, 0.45, MAT.white), B(2.0, 0.05, 0.46, MAT.mahogDark, 0, 0.5, 0), B(0.45, 1.3, 0.4, MAT.mahogDark, -0.8, 0.55, 0)]; for (let k = 0; k < 5; k++) tvU.push(C(0.05, 0.22 + (k % 2) * 0.1, MAT.goldTrim, -0.2 + k * 0.25, 0.55, 0, 10, 0.08));
    device(null, tvU, -3.7, y, -23.38, Math.PI, 1, [1.0, 0.23]);
    wallItem(tvParts(1.2), -3.6, y + 1.45, -23.0 - T / 2 - 0.03, "B", 1);
    wallItem([mm(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 24), MAT.mahogDark, 0, 0, 0, Math.PI / 2), mm(new THREE.CircleGeometry(0.2, 24), MAT.cream, 0, 0, 0.031), B(0.015, 0.15, 0.005, MAT.black, 0, 0.02, 0.034), B(0.11, 0.015, 0.005, MAT.black, 0.04, 0, 0.034)], -3.6, y + 2.7, -23.0 - T / 2 - 0.03, "B", 1);
    device(null, acStand(), -5.55, y, -23.45, Math.PI, 1, [0.25, 0.18]);
    const scr = []; for (let i = 0; i < 4; i++) scr.push(mm(new THREE.BoxGeometry(0.45, 1.75, 0.03), MAT.rattan, i * 0.43, 0.9, (i % 2) * 0.12, 0, (i % 2 ? -0.5 : 0.5), 0));
    device(null, scr, -5.75, y, -30.3, Math.PI / 2, 1);
    plant(-2.0, y, -29.6, "bamboo"); plant(-5.55, y, -33.5, "ficus"); plant(-5.6, y, -24.0, "ficus", 0.8);
    c.lights(3);
  }
  /* قاعة مجلس الكلية: يُدخل إليها من الباب الأبيض المزدوج تحت «امانة المجلس». طاولة طويلة بإطار ماهوجني وسطوح جلدية زرقاء
     وشريط زجاجي ولوحات أسماء، كراسٍ جلدية بنية منجّدة، كرسي كريمي عند المدخل، وفي آخرها باب خشبي مزدوج تحت «امانة مجلس كلية التربية للعلوم الصرفة» والأعلام */
  function councilRoom(c) {
    const y = c.y, cx = 5.3, x0 = cx - 0.75, x1 = cx + 0.75, za = -26.3, zb = -32.4;
    const tb = [B(x1 - x0, 0.06, za - zb, MAT.mahog, 0, 0.72, 0), B(x1 - x0 - 0.2, 0.68, za - zb - 0.4, MAT.mahogDark, 0, 0.04, 0), B(0.28, 0.008, za - zb - 0.5, MAT.glassTop, 0, 0.785, 0)];
    for (let i = 0; i < 7; i++) { const z = (za - zb) / 2 - 0.45 - i * 0.82; [-1, 1].forEach(s => tb.push(B(0.44, 0.006, 0.66, MAT.leatherBlue, s * 0.45, 0.78, z), B(0.24, 0.08, 0.02, MAT.black, s * 0.45, 0.79, z - 0.1), mm(new THREE.PlaneGeometry(0.2, 0.05), MAT.nameGold, s * 0.45, 0.84, z - 0.11, -0.2, 0, 0), B(0.12, 0.07, 0.12, MAT.white, s * 0.2, 0.79, z + 0.15))); }
    tb.push(C(0.09, 0.22, MAT.crystal, 0, 0.78, -0.9, 10), mm(new THREE.SphereGeometry(0.17, 10, 8), MAT.flowers, 0, 1.1, -0.9), C(0.09, 0.22, MAT.crystal, 0, 0.78, 1.3, 10), mm(new THREE.SphereGeometry(0.17, 10, 8), MAT.flowers, 0, 1.1, 1.3));
    device("council", tb, cx, y, (za + zb) / 2, 0, 1, [(x1 - x0) / 2 + 0.05, (za - zb) / 2]);
    const chest = () => [C(0.3, 0.04, MAT.black, 0, 0.02, 0, 10), C(0.035, 0.4, MAT.chrome, 0, 0.04, 0, 8), B(0.62, 0.15, 0.6, MAT.leatherBrown, 0, 0.42, 0), B(0.64, 0.82, 0.16, MAT.leatherBrown, 0, 0.5, -0.27), B(0.12, 0.3, 0.55, MAT.leatherBrown, -0.32, 0.5, 0), B(0.12, 0.3, 0.55, MAT.leatherBrown, 0.32, 0.5, 0)].concat(Array.from({ length: 9 }, (_, i) => B(0.025, 0.025, 0.01, MAT.leatherDark, -0.18 + (i % 3) * 0.18, 0.75 + Math.floor(i / 3) * 0.2, -0.19)));
    for (let i = 0; i < 7; i++) { const z = za - 0.45 - i * 0.82; device(null, chest(), x0 - 0.55, y, z, Math.PI / 2, 1, [0.3, 0.3]); device(null, chest(), x1 + 0.55, y, z, -Math.PI / 2, 1, [0.3, 0.3]); }
    device(null, chairExec(MAT.leatherCream, 0.9), cx, y, za + 0.5, Math.PI, 1);
    device(null, chest().concat([B(0.66, 0.2, 0.17, MAT.leatherBrown, 0, 1.3, -0.27)]), cx, y, zb - 0.32, 0, 1, [0.3, 0.3]);
    planeAt(lettersMat("امانة مجلس", 900, 260, "#c99a3c", 110, "كلية التربية للعلوم الصرفة"), 2.4, 0.66, cx, y + 2.95, BZ0 + 0.2, 0);
    [[cx + 1.0, "iq"], [cx + 1.3, "uniW"], [cx - 1.0, "uniW"]].forEach(([x, k]) => device(null, flagStand(k), x, y, -33.55, 0, 1, [0.17, 0.17]));
    device(null, [B(1.1, 2.2, 0.36, MAT.woodDark), B(1.0, 0.03, 0.3, MAT.wood, 0, 0.75, 0.02), B(1.0, 0.03, 0.3, MAT.wood, 0, 1.45, 0.02), B(0.2, 0.12, 0.14, MAT.goldTrim, -0.25, 1.48, 0.05), B(0.16, 0.18, 0.12, MAT.white, 0.25, 0.78, 0.05)], UX0 + 0.27, y, -33.0, Math.PI / 2, 1, [0.55, 0.18]);
    wallItem(tvParts(1.25), 7.4 - T / 2 - 0.04, y + 1.75, -29.6, "W", 1);
    wallItem(splitAC(), 7.4 - T / 2 - 0.02, y + 2.75, -31.6, "W", 1); wallItem(splitAC(), UX0 + T / 2 + 0.02, y + 2.75, -29.0, "E", 1);
    device(null, extinguisherParts(), 7.15, y, -27.95, 0, 1);
    LAYER = "c1"; const cy = y + CH;
    [[UX0 + 0.15, UX0 + 0.75], [6.65, 7.25]].forEach(([a, b]) => planeAt(MAT.latticeCeil, b - a, 8.2, (a + b) / 2, cy - 0.03, -29.5, 0).rotation.x = Math.PI / 2);
    [-27.6, -31.0].forEach(z => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 32), MAT.medallion); d.position.set(cx, cy - 0.05, z); addObj(d); device(null, chandelier("feather"), cx, cy - 0.08, z, 0, 1); });
    LAYER = "s1";
  }

  /* ---------------------------------------------------------------
     الخارج: الممر المسقّف، الحدائق والسياج المزخرف، الممران الجانبيان،
     مظلّة السيارات، والمباني المقابلة
  --------------------------------------------------------------- */
  function instances() {
    defInst("down", new THREE.CylinderGeometry(0.075, 0.075, 0.015, 12), MAT.down);
    defInst("roundL", new THREE.CylinderGeometry(0.32, 0.32, 0.04, 24), MAT.down);
  }
  function tree(x, z, k = 1, kind = "round") {
    if (kind === "cone") device(null, [C(0.09 * k, 0.6 * k, MAT.trunk, 0, 0, 0, 6), mm(new THREE.ConeGeometry(0.9 * k, 3.2 * k, 8), MAT.foliageD, 0, 2.1 * k, 0)], x, GY, z, 0, 0, [0.2, 0.2]);
    else device(null, [C(0.12 * k, 1.7 * k, MAT.trunk, 0, 0, 0, 7, 0.09 * k), mm(new THREE.IcosahedronGeometry(1.25 * k, 1), MAT.foliage, 0, 2.5 * k, 0), mm(new THREE.IcosahedronGeometry(0.85 * k, 1), MAT.foliage, 0.5 * k, 2.1 * k, 0.3 * k)], x, GY, z, x * 1.7, 0, [0.2, 0.2]);
  }
  function bush(x, z, k = 1) { device(null, [mm(new THREE.IcosahedronGeometry(0.45 * k, 1), MAT.hedge, 0, 0.32 * k, 0)], x, GY, z, x, 0); }
  function ornamentPost(h) {
    const p = [B(0.12, 0.08, 0.12, MAT.iron, 0, 0, 0), C(0.045, h, MAT.iron, 0, 0.08, 0, 8), B(0.14, 0.06, 0.14, MAT.iron, 0, h * 0.42, 0)];
    [0.65, 0.85].forEach(t => p.push(mm(new THREE.TorusGeometry(0.11, 0.012, 5, 14, Math.PI * 1.4), MAT.iron, 0.12, h * t, 0), mm(new THREE.TorusGeometry(0.11, 0.012, 5, 14, Math.PI * 1.4), MAT.iron, -0.12, h * t, 0, 0, Math.PI, 0)));
    return p;
  }
  /* سقف جملوني: الحافة العليا على امتداد z (الممر المسقّف) */
  function gableRoof(x0, x1, z0, z1, ye, rise) {
    const half = (x1 - x0) / 2, ang = Math.atan2(rise, half), L = Math.hypot(half, rise) + 0.25, cx = (x0 + x1) / 2, len = z1 - z0;
    [-1, 1].forEach(s => {
      addGeo("roofRed", new THREE.BoxGeometry(L, 0.04, len), cx + s * half / 2, ye + rise / 2 + 0.03, (z0 + z1) / 2, 0, 1, 1, 1, 0, -s * ang);
      addGeo("roofUnder", new THREE.BoxGeometry(L, 0.02, len), cx + s * half / 2, ye + rise / 2 - 0.01, (z0 + z1) / 2, 0, 1, 1, 1, 0, -s * ang);
      for (let z = z0 + 0.15; z < z1; z += 0.32) addGeo("roofRedD", new THREE.BoxGeometry(L, 0.025, 0.035), cx + s * half / 2, ye + rise / 2 + 0.06, z, 0, 1, 1, 1, 0, -s * ang);
    });
    addGeo("roofRedD", new THREE.BoxGeometry(0.14, 0.1, len + 0.1), cx, ye + rise + 0.05, (z0 + z1) / 2);
  }
  /* سقف جملوني: الحافة العليا على امتداد x (مظلّة الباب الجانبي) */
  function gableRoofZ(x0, x1, z0, z1, ye, rise) {
    const half = (z1 - z0) / 2, ang = Math.atan2(rise, half), L = Math.hypot(half, rise) + 0.2, cz = (z0 + z1) / 2, len = x1 - x0;
    [-1, 1].forEach(s => { addGeo("roofRed", new THREE.BoxGeometry(len, 0.04, L), (x0 + x1) / 2, ye + rise / 2 + 0.03, cz + s * half / 2, 0, 1, 1, 1, s * ang, 0); addGeo("roofUnder", new THREE.BoxGeometry(len, 0.02, L), (x0 + x1) / 2, ye + rise / 2 - 0.01, cz + s * half / 2, 0, 1, 1, 1, s * ang, 0); });
    addGeo("roofRedD", new THREE.BoxGeometry(len + 0.1, 0.1, 0.12), (x0 + x1) / 2, ye + rise + 0.05, cz);
  }
  function scrollRail(x, z0, z1) { // سياج حديدي بزخارف حلزونية على حافة حجرية
    bx("stoneT", x - 0.12, GY, z0, x + 0.12, GY + 0.22, z1);
    bx("iron", x - 0.015, GY + 0.92, z0, x + 0.015, GY + 0.96, z1); bx("iron", x - 0.015, GY + 0.22, z0, x + 0.015, GY + 0.26, z1);
    for (let q = z0 + 0.1; q < z1; q += 0.13) bx("iron", x - 0.008, GY + 0.26, q - 0.008, x + 0.008, GY + 0.92, q + 0.008);
    for (let q = z0 + 0.3; q < z1 - 0.2; q += 0.55) addGeo("iron", new THREE.TorusGeometry(0.12, 0.012, 5, 16), x, GY + 0.42, q, Math.PI / 2);
  }
  function outdoors() {
    LAYER = "site";
    flat("asphalt", -70, -80, 80, 70, GY - 0.004);
    // الحدائق الأمامية بحافة حجرية مموّجة وشريط حصى بجانب الممر
    const gl = [[BX0 - 0.6, WX - 2.15, 0.25, 9.0], [WX + 2.15, BX1 + 0.6, 0.25, 9.0]];
    gl.forEach(([x0, x1, z0, z1]) => { flat("grass", x0, z0, x1, z1, GY + 0.012); bx("stoneT", x0 - 0.12, GY, z1, x1 + 0.12, GY + 0.14, z1 + 0.14); });
    flat("gravel", WX - 2.15, 1.5, WX - 1.95, WZ1, GY + 0.014); flat("gravel", WX + 1.95, 1.5, WX + 2.15, WZ1, GY + 0.014);
    for (let x = -5.2; x < 0; x += 1.6) bush(x, 0.9, 0.9);
    for (let x = 6.2; x < 10; x += 1.6) bush(x, 0.9, 0.9);
    [[-4.2, 3.6, 1.0, "cone"], [-1.2, 4.8, 0.8, "round"], [7.6, 3.8, 1.0, "cone"], [9.0, 7.2, 0.8, "round"], [-5.2, 7.8, 0.75, "round"], [BX0 - 3, -10, 1.1, "round"], [BX0 - 3, -22, 1.0, "cone"], [BX1 + 3.2, -6, 0.9, "round"]].forEach(([x, z, k, kd]) => tree(x, z, k, kd));
    // الممر المسقّف: أرضية حجرية بزخارف، أعمدة حديد مزخرفة، سياج، سقف قرميد أحمر من فوق وصاج بني بجملون حديدي من تحت
    const wx0 = WX - 1.9, wx1 = WX + 1.9, wz0 = 1.5, ye = GY + 2.65;
    flat("mosaic", wx0, wz0, wx1, WZ1, GY + 0.015);
    for (let z = wz0 + 0.3; z <= WZ1 - 0.1; z += 2.6) {
      [wx0 + 0.1, wx1 - 0.1].forEach(x => { device(null, ornamentPost(2.6), x, GY, z, 0, 0); solid(0, x - 0.08, z - 0.08, x + 0.08, z + 0.08); });
      bx("truss", wx0 + 0.05, ye - 0.04, z - 0.03, wx1 - 0.05, ye + 0.02, z + 0.03);
      addGeo("truss", new THREE.BoxGeometry(0.04, 0.6, 0.04), WX, ye + 0.32, z);
      [-1, 1].forEach(s => { addGeo("truss", new THREE.BoxGeometry(2.0, 0.04, 0.04), WX + s * 0.95, ye + 0.36, z, 0, 1, 1, 1, 0, -s * 0.36); addGeo("truss", new THREE.BoxGeometry(0.03, 0.55, 0.03), WX + s * 0.95, ye + 0.17, z, 0, 1, 1, 1, 0, s * 0.6); });
    }
    for (let z = wz0; z < WZ1; z += 1.3) [-1, 1].forEach(s => addGeo("truss", new THREE.BoxGeometry(0.035, 0.035, 1.3), WX + s * 1.0, ye + 0.37, z + 0.65));
    bx("truss", wx0 + 0.05, ye - 0.06, wz0, wx0 + 0.15, ye + 0.02, WZ1); bx("truss", wx1 - 0.15, ye - 0.06, wz0, wx1 - 0.05, ye + 0.02, WZ1);
    gableRoof(wx0 - 0.3, wx1 + 0.3, wz0 - 0.3, WZ1 + 0.2, ye, 0.8);
    scrollRail(wx0 + 0.1, 2.0, WZ1 - 0.1); scrollRail(wx1 - 0.1, 2.0, WZ1 - 0.1);
    // إطار حديدي مزخرف في نهاية الممر (بلا مظلّة)
    [wx0 + 0.1, wx1 - 0.1].forEach(x => device(null, ornamentPost(2.6).concat([B(0.04, 2.0, 0.42, MAT.iron, 0, 0.3, 0)]), x, GY, WZ1 + 0.02, 0, 0));
    bx("iron", wx0, ye - 0.34, WZ1 - 0.02, wx1, ye - 0.02, WZ1 + 0.06);
    planeAt(MAT.ironScroll, wx1 - wx0 - 0.3, 0.3, WX, ye - 0.18, WZ1 + 0.07, 0);
    [[wx0 + 0.32, 1], [wx1 - 0.32, -1]].forEach(([x]) => planeAt(MAT.ironScroll, 0.4, 2.0, x, GY + 1.35, WZ1 + 0.07, 0));
    // الممر الغربي المبلّط ومظلّة السيارات خلف المبنى، والممر الشرقي ببلاط سداسي
    flat("mosaic", BX0 - 2.2, -30, BX0 - 0.17, 0.25, GY + 0.014);
    flat("concrete", BX0 - 9, -31, BX0 - 2.4, -21, GY + 0.01);
    for (let z = -30.5; z <= -21.4; z += 3.0) { device(null, [C(0.06, 2.55, MAT.steel, 0, 0, 0, 8)], BX0 - 8.5, GY, z, 0, 0); solid(0, BX0 - 8.6, z - 0.08, BX0 - 8.4, z + 0.08); }
    addGeo("roofUnder", new THREE.BoxGeometry(6.8, 0.05, 9.6), BX0 - 5.6, GY + 2.6, -26, 0, 1, 1, 1, 0, 0.06);
    bx("extSide", BX0 - 9.2, GY, -31.2, BX0 - 2.6, GY + 2.2, -31.0);
    flat("hexPav", BX1 + 0.17, -34, BX1 + 3.2, 0.6, GY + 0.014);
    bx("extSide", BX1 + 3.4, GY, -34, BX1 + 3.6, GY + 2.0, -8);
    // المبنى المقابل عبر الموقف: طابقان بحجر بيج ومحلات في الأسفل
    const oz = 26, ox0 = -2, ox1 = 26, oh = 7.6;
    bx("ext", ox0, GY, oz, ox1, GY + oh, oz + 10); solid(0, ox0, oz, ox1, oz + 10);
    planeAt(lam(0xffffff, { map: oppositeTex() }), ox1 - ox0, oh, (ox0 + ox1) / 2, GY + oh / 2, oz - 0.01, Math.PI);
    // مبنى أعلى إلى الشرق عليه برج اتصالات
    bx("ext", 46, GY, -14, 56, GY + 13, 4); solid(0, 46, -14, 56, 4);
    const tw = []; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; tw.push(mm(new THREE.CylinderGeometry(0.03, 0.05, 9, 5), MAT.steel, Math.cos(a) * 0.45, 4.5, Math.sin(a) * 0.45, 0, 0, Math.cos(a) * 0.04)); }
    for (let k = 1; k < 9; k++) tw.push(mm(new THREE.TorusGeometry(0.47 - k * 0.012, 0.015, 4, 4), MAT.steel, 0, k, 0, Math.PI / 2, 0, Math.PI / 4));
    device(null, tw, 49, GY + 13, -10, 0, 0);
  }
  function oppositeTex() {
    return textTex(1024, 300, (g, w, h) => {
      g.fillStyle = "#d8c7a6"; g.fillRect(0, 0, w, h); noise(g, w, h, 9000, 0.08, 121, 2);
      g.fillStyle = "rgba(120,96,66,.45)"; g.fillRect(0, h * 0.5, w, 5); g.fillRect(0, 0, w, 8);
      for (let i = 0; i < 14; i++) { const x = 20 + i * 72; g.fillStyle = "#3e4f5c"; g.fillRect(x, 30, 38, 70); g.strokeStyle = "#e9e5dc"; g.lineWidth = 4; g.strokeRect(x, 30, 38, 70); }
      for (let i = 0; i < 5; i++) { const x = 18 + i * 200; g.fillStyle = "#8a8c8e"; g.fillRect(x, h * 0.62, 170, h * 0.38); g.fillStyle = "rgba(0,0,0,.2)"; for (let y = h * 0.62; y < h; y += 7) g.fillRect(x, y, 170, 2); g.fillStyle = "#f2efe6"; g.fillRect(x - 4, h * 0.52, 178, 28); }
      g.fillStyle = "#1d5a2c"; g.font = `800 22px ${FONT}`; g.fillText("صدفة", 18 + 85, h * 0.52 + 15);
    });
  }

  /* ---------------------------------------------------------------
     المناطق (لتحديد المكان، والمشي بالضغط، والخريطة، وقائمة الغرف)
  --------------------------------------------------------------- */
  const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  const KIND = { dean: "dean", deanSec: "dean", deanStaff: "dean", council: "hall", reg: "hall", store: "service", archive: "service", wc: "service", stair: "stair" };
  const PARENT = { "g-store": "g-lobby", "g-stair": "g-lobby", "g-010": "g-reg", "g-011": "g-reg", "u-wcm": "u-stair", "u-wcw": "u-stair", "u-legal": "u-hall", "u-sw": "u-hall", "u-hrm": "u-hall", "u-hrs": "u-hrm", "u-dstaff": "u-sec", "u-dean": "u-dstaff", "u-amin2": "u-amin" };
  const OPENDEF = {
    "g-lobby": { parent: "out", portal: [[WX, 2.6], [WX, -0.9]], spot: [WX, -0.9, 0] },
    "g-cor": { parent: "g-lobby", portal: [[CXM, -4.0], [CXM, -5.4]], spot: [CXM, -5.6, 0] },
    "u-stair": { parent: "u-hall", portal: [[6.6, -2.85], [5.3, -3.3]], spot: [7.6, -2.8, Math.PI / 2] },
    "u-hall": { parent: null, spot: [3.4, -4.6, yawTo(3.4, -4.6, -1.6, -5.3)] },
    "u-cor": { parent: "u-hall", portal: [[UXM, -5.9], [UXM, -7.4]], spot: [UXM, -7.6, 0] }
  };
  function regions() {
    REG.length = 0;
    ROOMS.forEach(r => {
      const [x0, x1, z0, z1] = r.r, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, d = r.doors[0], p = doorPos(r, d);
      let portal = [{ x: p.x - p.nx * 0.7, z: p.z - p.nz * 0.7 }, { x: p.x + p.nx * 0.75, z: p.z + p.nz * 0.75 }];
      let sx = p.x + p.nx * 1.3, sz = p.z + p.nz * 1.3, syaw = yawTo(sx, sz, cx, cz);
      if (r.id === "g-stair") { sx = 6.35; sz = -1.25; syaw = 0; }
      if (r.id === "u-sw") portal = [{ x: 0.05, z: -4.3 }, { x: -0.25, z: -3.6 }, { x: -0.95, z: -3.55 }, { x: -2.35, z: -3.55 }];
      if (r.id === "u-hrs") portal = [{ x: 0.75, z: -8.3 }, { x: 0.55, z: -9.75 }, { x: -0.9, z: -10.45 }, { x: -2.35, z: -10.45 }];
      if (r.id === "g-010") portal = [{ x: -0.2, z: -25.1 }, { x: -0.3, z: -27.7 }, { x: -1.75, z: -27.7 }];
      if (r.id === "g-011") portal = [{ x: -0.2, z: -25.1 }, { x: -0.3, z: -30.2 }, { x: -1.75, z: -30.2 }];
      REG.push({ id: r.id, lvl: r.lvl, x0, z0, x1, z1, name: r.name + (r.code ? " " + r.code : ""), short: r.short || r.name, kind: KIND[r.sub] || "office", room: r, ph: r.ph, parent: PARENT[r.id] || (r.lvl ? "u-cor" : "g-cor"), portal, spot: { x: sx, z: sz, yaw: syaw } });
    });
    OPEN.forEach(o => {
      const d = OPENDEF[o.id] || {}, [x0, x1, z0, z1] = o.r;
      REG.push({ id: o.id, lvl: o.lvl, x0, z0, x1, z1, name: o.name, short: o.short, kind: o.kind, open: true, parent: d.parent === undefined ? null : d.parent, portal: d.portal ? d.portal.map(([x, z]) => ({ x, z })) : null, spot: d.spot ? { x: d.spot[0], z: d.spot[1], yaw: d.spot[2] } : null });
    });
  }
  const OUTSIDE = { id: "out", lvl: 0, kind: "outside", parent: null, spot: { x: WX, z: 7.0, yaw: 0 } };
  function regionAt(x, z, lvl) {
    for (const r of REG) if (r.lvl === lvl && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r;
    if (lvl === 0 && !(x > BX0 - 0.17 && x < BX1 + 0.17 && z > BZ0 - 0.17 && z < BZ1 + 0.17)) {
      const walk = Math.abs(x - WX) < 1.95 && z > 0.17 && z < WZ1 + 0.3, lawn = z > 0 && z < 9.2 && x > BX0 - 0.7 && x < BX1 + 0.7;
      return Object.assign({}, OUTSIDE, { name: walk ? "الممر المسقّف أمام باب العمادة" : lawn ? "حديقة العمادة" : x < BX0 && z < 0 ? "الممر الغربي ومظلّة السيارات" : x > BX1 && z < 0 ? "الممر الشرقي" : "موقف السيارات أمام العمادة" });
    }
    return null;
  }
  function groundY(x, z, lvl) {
    if (lvl) return FH;
    if (x > BX0 - 0.17 && x < BX1 + 0.17 && z > BZ0 - 0.17 && z < BZ1 + 0.17) return 0;
    if (Math.abs(x - WX) < 1.6 && z < 1.5) return z < 0.9 ? 0 : z < 1.2 ? -0.15 : -0.3;
    return GY;
  }

  /* ---------------------------------------------------------------
     الحركة والتصادم والمسارات بين الغرف
  --------------------------------------------------------------- */
  function collide() {
    const R = 0.28, list = SOLID[P.lvl];
    for (let it = 0; it < 3; it++) for (const b of list) {
      const cx = clamp(P.x, b[0], b[2]), cz = clamp(P.z, b[1], b[3]), dx = P.x - cx, dz = P.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2); P.x = cx + dx / d * R; P.z = cz + dz / d * R; }
      else { const l = P.x - b[0], r = b[2] - P.x, t = P.z - b[1], bb = b[3] - P.z, m = Math.min(l, r, t, bb); if (m === l) P.x = b[0] - R; else if (m === r) P.x = b[2] + R; else if (m === t) P.z = b[1] - R; else P.z = b[3] + R; }
    }
  }
  const regById = id => (id === "out" ? OUTSIDE : REG.find(r => r.id === id));
  function chain(r) { const out = []; let c = r; while (c) { out.push(c); c = c.parent ? regById(c.parent) : null; } return out; }
  function routeTo(tx, tz) {
    const lvl = P.lvl, a = regionAt(P.x, P.z, lvl), b = regionAt(tx, tz, lvl);
    if (!b) return null;
    const pts = [];
    if (a && a.id !== b.id) {
      const ca = chain(a), cb = chain(b), ids = cb.map(r => r.id);
      let li = ca.findIndex(r => ids.includes(r.id));
      const lca = li >= 0 ? ca[li].id : null;
      for (const r of ca) { if (r.id === lca) break; if (r.portal) pts.push(...r.portal.slice().reverse()); }
      const down = []; for (const r of cb) { if (r.id === lca) break; down.unshift(r); }
      down.forEach(r => { if (r.portal) pts.push(...r.portal); });
    }
    pts.push({ x: tx, z: tz });
    return pts.map(p => ({ x: p.x, z: p.z }));
  }
  function update(dt) {
    if (OV.on) { ovUpdate(dt); return; }
    if (anim) { stepAnim(dt); applyCam(dt); return; }
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
    const right = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x;
    P.yaw += ((keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.ArrowRight || keys.KeyE ? 1 : 0)) * 1.9 * dt;
    let mx = 0, mz = 0;
    const run = keys.ShiftLeft || keys.ShiftRight ? 1.75 : 1;
    if (Math.abs(fwd) > 0.05 || Math.abs(right) > 0.05) {
      walkPath = null; const len = Math.min(1, Math.hypot(fwd, right)), n = Math.hypot(fwd, right) || 1, f = fwd / n, r = right / n, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), sp = 2.4 * run * len;
      mx = (-sy * f + cy * r) * sp; mz = (-cy * f - sy * r) * sp;
    } else if (walkPath) {
      const t = walkPath[0], dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
      if (d < 0.12 || d < 2.4 * dt) { if (d < 0.6) { P.x = t.x; P.z = t.z; collide(); } walkPath.shift(); if (!walkPath.length) { walkPath = null; hideMarker(); } }
      else { mx = dx / d * 2.4; mz = dz / d * 2.4; P.yaw = angLerp(P.yaw, Math.atan2(-dx, -dz), Math.min(1, dt * 5)); }
    }
    if (mx || mz) {
      const ox = P.x, oz = P.z, n = Math.max(1, Math.ceil(Math.hypot(mx, mz) * dt / 0.08));
      for (let i = 0; i < n; i++) { P.x += mx * dt / n; P.z += mz * dt / n; collide(); }
      const moved = Math.hypot(P.x - ox, P.z - oz);
      if (walkPath) { if (moved < 0.25 * Math.hypot(mx, mz) * dt) { stuck += dt; if (stuck > 0.5) { walkPath = null; stuck = 0; hideMarker(); } } else stuck = 0; }
      P.bob += moved * 6.2;
    }
    triggers();
    applyCam(dt);
  }
  function applyCam(dt = 0) {
    if (P.yaw > Math.PI) P.yaw -= 2 * Math.PI; else if (P.yaw < -Math.PI) P.yaw += 2 * Math.PI;
    const gy = groundY(P.x, P.z, P.lvl); P.gy += (gy - P.gy) * (dt ? Math.min(1, dt * 10) : 1);
    cam.position.set(P.x, P.gy + EYE + (anim ? 0 : Math.sin(P.bob) * 0.02), P.z);
    if (anim && anim.camY != null) cam.position.y = anim.camY;
    cam.rotation.set(P.pitch, P.yaw, 0, "YXZ");
  }

  /* ---------------------------------------------------------------
     الحركات التلقائية: الجولة، الدرج، الانتقال
  --------------------------------------------------------------- */
  function camState() { return { x: P.x, y: cam.position.y, z: P.z, yaw: P.yaw, pitch: P.pitch }; }
  function look(f, t) { const dx = t[0] - f[0], dy = t[1] - f[1], dz = t[2] - f[2]; return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; }
  function play(frames, onEnd, isTour) {
    walkPath = null; hideMarker();
    anim = { frames: frames.map(f => Object.assign({ move: 1.5, hold: 0 }, f, look(f.p, f.look))), i: 0, t: 0, from: camState(), onEnd, isTour };
    tour = !!isTour; U.$("#dn-play").classList.toggle("on", tour);
    caption(anim.frames[0].cap || "");
  }
  function stopAnim() { anim = null; tour = false; caption(""); U.$("#dn-play").classList.remove("on"); }
  function stepAnim(dt) {
    const a = anim, f = a.frames[a.i]; a.t += dt;
    const k = f.move > 0 ? ease(Math.min(1, a.t / f.move)) : 1;
    P.x = a.from.x + (f.p[0] - a.from.x) * k; P.z = a.from.z + (f.p[2] - a.from.z) * k;
    a.camY = a.from.y + (f.p[1] - a.from.y) * k;
    P.yaw = a.from.yaw + (angLerp(a.from.yaw, f.yaw, 1) - a.from.yaw) * k; P.pitch = a.from.pitch + (f.pitch - a.from.pitch) * k;
    if (a.t >= f.move + f.hold) {
      a.i++; a.t = 0; a.from = { x: P.x, y: a.camY, z: P.z, yaw: P.yaw, pitch: P.pitch };
      if (a.i >= a.frames.length) {
        const last = a.frames[a.frames.length - 1]; P.lvl = last.p[1] > FH + 0.8 ? 1 : 0; P.gy = last.p[1] - EYE; P.pitch = clamp(P.pitch, -0.5, 0.5);
        const cb = a.onEnd; stopAnim(); if (typeof cb === "function") cb(); where(true); return;
      }
      if (a.frames[a.i].cap != null) caption(a.frames[a.i].cap);
    }
    P.lvl = (a.camY || 0) > FH + 0.8 ? 1 : 0;
  }
  const E0 = EYE, E1 = FH + EYE, EL = LY + EYE, EG = GY + EYE, EA = LY1 + EYE, EB = LY2 + EYE;
  /* الصعود كما صُوِّر: القلبة الأولى شمالاً، ثم يميناً إلى البسطة تحت الشبّاك، ثم يميناً جنوباً إلى الطابق الأول، ثم يميناً إلى البهو */
  const climbFrames = () => [
    { p: [6.35, E0, -2.15], look: [6.35, E0 + 0.7, -6], move: 0.8, cap: "تصعد الدرج: القلبة الأولى شمالاً بمحاذاة الجدار والدرابزين الذهبي على يمينك…" },
    { p: [6.35, EA, -5.75], look: [10, EA + 0.6, -5.85], move: 2.8 },
    { p: [7.9, (EA + EB) / 2, -5.85], look: [11, EB + 0.5, -5.85], move: 1.0 },
    { p: [9.2, EB, -5.85], look: [9.25, EB + 0.9, -1], move: 0.9, cap: "البسطة تحت الشبّاك، ثم يميناً" },
    { p: [9.25, E1, -2.8], look: [9.25, E1 - 0.1, 2], move: 2.4, hold: 0.7, cap: "الطابق الأول: أمامك باب الصحيات وعلى يسارك الشبّاك" },
    { p: [8.2, E1, -2.8], look: [-1.6, FH + 1.7, -4.6], move: 1.0, cap: "" },
    { p: [4.6, E1, -4.4], look: [-1.6, FH + 1.8, -5.3], move: 1.8 }
  ];
  function climb() { play(climbFrames()); }
  function descend() {
    play([
      { p: [8.4, E1, -2.8], look: [9.3, E1 - 0.3, -2.8], move: 0.6, cap: "تنزل إلى الطابق الأرضي…" },
      { p: [9.25, E1, -3.0], look: [9.25, E1 - 1.2, -6], move: 0.7 },
      { p: [9.25, EB, -5.6], look: [6, EB - 0.4, -5.85], move: 2.4 },
      { p: [7.6, (EA + EB) / 2, -5.85], look: [5, EA - 0.3, -5.85], move: 1.0 },
      { p: [6.35, EA, -5.85], look: [6.35, EA - 1.2, 0], move: 0.8 },
      { p: [6.35, E0, -2.5], look: [6.35, E0, 2], move: 2.6, cap: "" },
      { p: [6.35, E0, -1.3], look: [2, E0, -1.1], move: 0.9 },
      { p: [4.7, E0, -1.1], look: [1, E0, -1.6], move: 1.2 }
    ]);
  }
  function teleport(lvl, x, z, yaw) {
    if (OV.on) ovExit(true);
    const f = U.$("#dn-fade"); f.classList.add("on"); walkPath = null; anim = null; hideMarker();
    setTimeout(() => { P.lvl = lvl; P.x = x; P.z = z; P.yaw = yaw; P.pitch = -0.05; collide(); P.gy = groundY(x, z, lvl); applyCam(); where(true); f.classList.remove("on"); }, 260);
  }
  function startTour() {
    U.$("#dn-intro").hidden = true; closeInfo(); if (OV.on) ovExit(true);
    P.lvl = 0; P.x = WX; P.z = 27; P.yaw = 0; P.pitch = 0.05; P.gy = GY;
    play([
      { p: [WX, EG, 24], look: [WX, 4.0, 0], move: 1.2, hold: 3.8, cap: "عمادة كلية التربية للعلوم الصرفة – جامعة تكريت" },
      { p: [WX, EG, 14.5], look: [WX, 1.8, 6], move: 2.6, hold: 1.2, cap: "الممر المسقّف من الموقف إلى باب العمادة" },
      { p: [WX, EG, 4.2], look: [WX, 4.3, 0], move: 3.6, hold: 3.2, cap: "لوحة العمادة فوق المدخل: جامعة تكريت – عمادة كلية التربية للعلوم الصرفة – تأسست ١٩٩٢" },
      { p: [WX, E0, -0.8], look: [WX, 1.6, -6], move: 2.2, cap: "" },
      { p: [3.6, E0, -1.75], look: [CX0, 1.75, -1.75], move: 1.2, hold: 3.6, cap: "على يسار الداخل: لوحة رؤية الجامعة والكلية ورسالتهما وأهدافهما، وتحتها جهاز البصمة وصندوقا الشكاوى" },
      { p: [3.0, E0, -2.2], look: [5.6, 1.3, -2.4], move: 1.2, hold: 2.8, cap: "على اليمين: الحاجز الزجاجي وبابه إلى الدرج، ثم الاستعلامات" },
      { p: [CXM, E0, -5.0], look: [CXM, 1.6, -24], move: 1.6, hold: 3.0, cap: "ممر الطابق الأرضي: المعاونان وأضابير الدراسات العليا يساراً، وصندوق الحسابات والشؤون العلمية يميناً" },
      { p: [CXM, E0, -21.0], look: [1.2, 1.5, -21.5], move: 4.4, hold: 2.6, cap: "شعبة الدراسات العليا بشبّاكي المراجعين" },
      { p: [CXM, E0, -23.0], look: [CXM, 1.5, -24], move: 1.0, cap: "" },
      { p: [CXM, E0, -25.6], look: [3.0, 1.3, -32], move: 1.6, hold: 3.2, cap: "شعبة التسجيل وشؤون الطلبة بسقفها المزخرف وثرياها الذهبية" },
      { p: [CXM, E0, -22.5], look: [CXM, 1.6, -4], move: 1.8, cap: "" },
      { p: [CXM, E0, -1.4], look: [5.6, 1.4, -1.1], move: 4.4, cap: "إلى الدرج: الباب الزجاجي الداكن على يمين الداخل" },
      { p: [5.0, E0, -1.1], look: [9, 1.5, -1.1], move: 1.0 },
      { p: [6.35, E0, -1.2], look: [6.35, E0 + 0.4, -6], move: 1.0, hold: 1.8, cap: "الباب الزجاجي الأسود بشعار الكلية، وخلفه أول الدرج" },
      ...climbFrames(),
      { p: [1.4, E1, -4.6], look: [-1.6, FH + 1.9, -5.3], move: 1.4, hold: 3.4, cap: "بهو شعبة الشؤون الإدارية والمالية: الجدار الذهبي ومقاعد الانتظار، وعلى اليسار الشعبة القانونية بواجهتها الزجاجية" },
      { p: [1.6, E1, -5.0], look: [1.62, FH + 1.6, -6.6], move: 1.2, hold: 3.6, cap: "ملصق «مهام شعبة الموارد البشرية» وتحته الهيكل التنظيمي، وعلى يساره باب الشعبة" },
      { p: [UXM, E1, -6.4], look: [UXM, FH + 1.5, -25], move: 1.6, hold: 2.6, cap: "ممر الطابق الأول: يميناً الترقيات وضمان الجودة والتدقيق والتخطيط، ويساراً الحسابات والإعلام ومكتب العميد" },
      { p: [UXM, E1, -11.2], look: [8.5, FH + 1.3, -11.6], move: 2.2, hold: 2.6, cap: "شعبة ضمان الجودة بحاجزها الخشبي وشبابيك المراجعين" },
      { p: [UXM, E1, -16.3], look: [UX0, FH + 1.85, -16.35], move: 1.8, hold: 3.4, cap: "ملصق «مهام شعبة الحسابات»" },
      { p: [UXM, E1, -17.6], look: [-2, FH + 1.3, -17.8], move: 0.8, hold: 2.4, cap: "شعبة الحسابات ورفوف أضابيرها" },
      { p: [UXM, E1, -21.0], look: [CX1, FH + 1.85, -21.1], move: 1.6, hold: 3.0, cap: "ملصق «مهام شعبة التخطيط والمتابعة»، ويقابله ملصق «مهام شعبة الاعلام»" },
      { p: [UXM, E1, -21.05], look: [UX0, FH + 1.85, -21.0], move: 1.2, hold: 2.6, cap: "مهام شعبة الإعلام" },
      { p: [UXM, E1, -23.0], look: [UXM, FH + 2.0, -25], move: 1.2, hold: 3.4, cap: "آخر الممر: باب قاعة المجلس تحت «امانة المجلس»، وعلى اليسار «مكتب العميد»، وعلى اليمين باب أمين المجلس" },
      { p: [UXM, E1, -25.6], look: [5.3, FH + 1.1, -33], move: 1.4, hold: 3.6, cap: "قاعة مجلس الكلية" },
      { p: [UXM, E1, -23.7], look: [1, E1, -23.7], move: 1.4, cap: "" },
      { p: [2.1, E1, -24.0], look: [-1.0, FH + 1.2, -26.2], move: 1.2, hold: 2.6, cap: "مكتب العميد – الاستقبال" },
      { p: [1.6, E1, -26.9], look: [1.6, FH + 1.2, -30], move: 1.4, cap: "" },
      { p: [1.6, E1, -28.6], look: [0.4, FH + 1.0, -31.5], move: 1.0, hold: 2.4, cap: "مكتب مدير مكتب العميد" },
      { p: [-0.6, E1, -29.0], look: [-3, E1, -29.0], move: 1.4, cap: "" },
      { p: [-2.4, E1, -29.6], look: [-3.7, FH + 1.0, -32.6], move: 1.4, hold: 4.4, cap: "مكتب عميد الكلية الأستاذ الدكتور " + DEAN_NAME }
    ], null, true);
  }

  /* ---------------------------------------------------------------
     العرض من الأعلى: يُخفى السقف والطابق الأعلى فتظهر الغرف بأثاثها
  --------------------------------------------------------------- */
  const LBL = [];
  function ovLayers(floor) {
    const hide = floor === 0 ? ["c0", "s1", "c1", "roof"] : floor === 1 ? ["c1", "roof"] : [];
    for (const k in LAYERS) LAYERS[k].visible = !hide.includes(k);
  }
  function ovEnter(floor) {
    if (anim) stopAnim(); walkPath = null; hideMarker(); closeInfo();
    OV.on = true; OV.floor = floor == null ? P.lvl : floor; mapFloor = OV.floor;
    const asp = stageEl.clientWidth / Math.max(1, stageEl.clientHeight); OV.tdist = OV.dist = clamp(36 / Math.min(1, asp * 0.95), 30, 78);
    U.$$("#dn-floors button").forEach(x => x.classList.toggle("on", +x.dataset.f === mapFloor));
    ovLayers(OV.floor); stageEl.classList.add("ov"); U.$("#dn-ov").classList.add("on"); U.$("#dn-intro").hidden = true;
    renderLabels(); where(true);
  }
  function ovExit(silent) {
    OV.on = false; ovLayers(null); stageEl.classList.remove("ov"); U.$("#dn-ov").classList.remove("on");
    LBL.forEach(l => (l.el.hidden = true)); applyCam(); if (!silent) where(true);
  }
  function ovUpdate(dt) {
    OV.dist += (OV.tdist - OV.dist) * Math.min(1, dt * 6);
    const ty = OV.floor * FH + 0.5, tx = 2, tz = -17, cp = Math.cos(OV.pitch);
    cam.position.set(tx + OV.dist * Math.sin(OV.yaw) * cp, ty + OV.dist * Math.sin(OV.pitch), tz + OV.dist * Math.cos(OV.yaw) * cp);
    cam.lookAt(tx, ty, tz);
    const rc = stageEl.getBoundingClientRect(), v = new THREE.Vector3();
    LBL.forEach(l => {
      if (l.r.lvl !== OV.floor) { l.el.hidden = true; return; }
      v.set((l.r.x0 + l.r.x1) / 2, OV.floor * FH + 1.3, (l.r.z0 + l.r.z1) / 2).project(cam);
      if (v.z > 1) { l.el.hidden = true; return; }
      l.el.hidden = false; l.el.style.transform = `translate(${((v.x + 1) / 2 * rc.width).toFixed(1)}px,${((1 - v.y) / 2 * rc.height).toFixed(1)}px) translate(-50%,-50%)`;
    });
  }
  function renderLabels() {
    const box = U.$("#dn-labels");
    if (!LBL.length) {
      REG.filter(r => r.spot && r.kind !== "stair" && r.kind !== "corridor" && !(r.room && r.room.hidden)).forEach(r => {
        const b = document.createElement("button"); b.type = "button"; b.className = "dn-lbl k-" + r.kind + (r.ph === 0 ? " approx" : ""); b.textContent = r.short || r.name; b.title = r.name;
        b.onclick = () => teleport(r.lvl, r.spot.x, r.spot.z, r.spot.yaw);
        box.appendChild(b); LBL.push({ el: b, r });
      });
    }
  }

  /* ---------------------------------------------------------------
     الواجهة: المكان الحالي، الخريطة، بطاقة المعلومات
  --------------------------------------------------------------- */
  function caption(t) { const c = U.$("#dn-cap"); c.textContent = t || ""; c.hidden = !t; }
  function where(force) {
    let label;
    if (OV.on) label = "عرض من الأعلى · " + (OV.floor ? "الطابق الأول" : "الطابق الأرضي") + " · اضغط على غرفة لتدخلها";
    else { const r = regionAt(P.x, P.z, P.lvl), name = r ? r.name : ""; label = (P.lvl ? "الطابق الأول · " : (r && r.kind === "outside" ? "" : "الطابق الأرضي · ")) + name; }
    if (force || label !== lastWhere) { U.$("#dn-where").textContent = label; lastWhere = label; }
    if (!OV.on && P.lvl !== where.lvl) { where.lvl = P.lvl; mapFloor = P.lvl; U.$$("#dn-floors button").forEach(x => x.classList.toggle("on", +x.dataset.f === mapFloor)); }
    const sb = U.$("#dn-stairs"), r = OV.on ? null : regionAt(P.x, P.z, P.lvl);
    if (!anim && r && r.kind === "stair") { sb.hidden = false; sb.textContent = P.lvl ? "انزل إلى الطابق الأرضي" : "اصعد إلى الطابق الأول"; } else sb.hidden = true;
    drawMap();
  }
  function triggers() {
    if (anim) return;
    if (P.lvl === 0 && P.x > 5.8 && P.x < 6.9 && P.z < -2.28 && P.z > -2.76) climb();
    else if (P.lvl === 1 && P.x > 8.75 && P.x < 9.75 && P.z < -3.15 && P.z > -3.49) descend();
  }
  const MAPB = { x0: -7.0, x1: 11.0, z0: -35.0, z1: 2.0 };
  function mapXY(cv, x, z) { return [(x - MAPB.x0) * cv.width / (MAPB.x1 - MAPB.x0), (z - MAPB.z0) * cv.height / (MAPB.z1 - MAPB.z0)]; }
  const MAPCOL = { corridor: "#25424a", lobby: "#3b5560", office: "#2b4767", hall: "#2c5d43", dean: "#6b5526", service: "#3a3f44", stair: "#555", outside: "#2c4a2a" };
  function drawMap() {
    const cv = U.$("#dn-map-c"); if (!cv || cv.offsetParent === null) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = "rgba(3,12,16,.82)"; g.fillRect(0, 0, cv.width, cv.height);
    const [bx0, by0] = mapXY(cv, BX0, BZ0), [bx1, by1] = mapXY(cv, BX1, BZ1); g.fillStyle = "#1b2326"; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    REG.filter(r => r.lvl === mapFloor && !(r.id === "u-hall")).concat(mapFloor ? REG.filter(r => r.id === "u-hall") : []).reverse().forEach(r => {
      const [a, b] = mapXY(cv, r.x0, r.z0), [c, d] = mapXY(cv, r.x1, r.z1);
      g.fillStyle = MAPCOL[r.kind] || "#2d3a40"; g.fillRect(a + 0.5, b + 0.5, c - a - 1, d - b - 1);
    });
    if (mapFloor === 0) { const [ex, ey] = mapXY(cv, WX, BZ1); g.fillStyle = "#e6ae4f"; g.fillRect(ex - 5 * dpr, ey - 2 * dpr, 10 * dpr, 4 * dpr); }
    if (P.lvl === mapFloor && !OV.on) {
      const [px, pz] = mapXY(cv, clamp(P.x, MAPB.x0, MAPB.x1), clamp(P.z, MAPB.z0, MAPB.z1));
      g.save(); g.translate(px, pz); g.rotate(-P.yaw); g.fillStyle = "#93dd8a"; g.beginPath(); g.moveTo(0, -7 * dpr); g.lineTo(4.5 * dpr, 4.5 * dpr); g.lineTo(0, 2.2 * dpr); g.lineTo(-4.5 * dpr, 4.5 * dpr); g.closePath(); g.fill(); g.restore();
    }
  }
  function mapClick(e) {
    const cv = U.$("#dn-map-c"), rc = cv.getBoundingClientRect();
    const x = MAPB.x0 + (e.clientX - rc.left) / rc.width * (MAPB.x1 - MAPB.x0), z = MAPB.z0 + (e.clientY - rc.top) / rc.height * (MAPB.z1 - MAPB.z0);
    const r = REG.find(q => q.lvl === mapFloor && q.spot && x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
    if (r) teleport(r.lvl, r.spot.x, r.spot.z, r.spot.yaw);
    else if (mapFloor === 0 && z > BZ1) teleport(0, WX, 7.0, 0);
  }
  function openInfo(key) {
    const d = DEV[key]; if (!d) return;
    const box = U.$("#dn-info");
    box.innerHTML = `<button class="btn icon-btn btn-ghost tour-info-x" type="button" aria-label="إغلاق"><svg><use href="#i-close"/></svg></button>
      <span class="ti-tag">عمادة كلية التربية للعلوم الصرفة</span><h4>${U.esc(d.name)}</h4><p>${U.esc(d.what)}</p>${d.list ? "<ol>" + d.list.map(t => "<li>" + U.esc(t) + "</li>").join("") + "</ol>" : ""}`;
    box.hidden = false; box.querySelector(".tour-info-x").onclick = closeInfo;
  }
  function closeInfo() { const b = U.$("#dn-info"); if (b) b.hidden = true; }
  let marker = null;
  function showMarker(x, y, z) { if (!marker) { marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 28).rotateX(-Math.PI / 2), basic(0x93dd8a, { transparent: true, opacity: 0.85, depthWrite: false })); scene.add(marker); } marker.position.set(x, y + 0.02, z); marker.visible = true; }
  function hideMarker() { if (marker) marker.visible = false; }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(cx, cy) {
    const rc = canvas.getBoundingClientRect(); ndc.set((cx - rc.left) / rc.width * 2 - 1, -(cy - rc.top) / rc.height * 2 + 1);
    ray.setFromCamera(ndc, cam); ray.far = OV.on ? 200 : 18;
    const hits = ray.intersectObjects(PICK.concat(FLOORS, BLOCK).filter(o => { let p = o; while (p) { if (p.visible === false) return false; p = p.parent; } return true; }), true);
    for (const h of hits) {
      if (h.object.isSprite) continue;
      let o = h.object; while (o && !o.userData.device && o.parent) o = o.parent;
      if (o && o.userData.device) return { device: o.userData.device, point: h.point };
      if (FLOORS.includes(h.object)) return { floor: true, point: h.point };
      return null;
    }
    return null;
  }
  function bindInput() {
    let down = null; const pts = new Map();
    canvas.addEventListener("pointerdown", e => {
      focused = true; canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; down.pinch = Math.hypot(a.x - b.x, a.y - b.y); down.d0 = OV.tdist; }
      if (anim && anim.isTour) stopAnim();
      U.$("#dn-intro").hidden = true;
    });
    canvas.addEventListener("pointermove", e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (down) {
        if (down.pinch && pts.size === 2) { const [a, b] = [...pts.values()]; OV.tdist = clamp(down.d0 * down.pinch / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 14, 90); down.moved = 99; return; }
        const dx = e.clientX - down.x - (down.lx || 0), dy = e.clientY - down.y - (down.ly || 0);
        down.lx = e.clientX - down.x; down.ly = e.clientY - down.y; down.moved = Math.max(down.moved, Math.hypot(down.lx, down.ly));
        const k = e.pointerType === "touch" ? 0.0058 : 0.0042;
        if (OV.on) { OV.yaw -= dx * k; OV.pitch = clamp(OV.pitch + dy * k * 0.8, 0.35, 1.45); }
        else if (!anim) { P.yaw += dx * k; P.pitch = clamp(P.pitch + dy * k * 0.8, -1.1, 1.1); }
      } else if (e.pointerType === "mouse" && !anim) hover(e);
    });
    const end = e => {
      pts.delete(e.pointerId);
      if (!down) return; const d = down; if (pts.size) return; down = null;
      if (d.moved < 7 && performance.now() - d.t < 450 && !anim) {
        const h = pick(e.clientX, e.clientY);
        if (OV.on) { if (h && h.point) { const lvl = OV.floor, r = regionAt(h.point.x, h.point.z, lvl); if (r && r.spot) teleport(lvl, r.spot.x, r.spot.z, r.spot.yaw); else if (r && lvl === 0) teleport(0, h.point.x, h.point.z, 0); } return; }
        if (h && h.device) openInfo(h.device);
        else if (h && h.floor && Math.abs(h.point.y - groundY(h.point.x, h.point.z, P.lvl)) < 0.45) { const path = routeTo(h.point.x, h.point.z); if (path) { walkPath = path; stuck = 0; showMarker(h.point.x, h.point.y, h.point.z); closeInfo(); } }
      }
    };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", e => { pts.delete(e.pointerId); down = null; });
    canvas.addEventListener("pointerleave", () => { U.$("#dn-tip").hidden = true; });
    canvas.addEventListener("wheel", e => { if (!OV.on) return; e.preventDefault(); OV.tdist = clamp(OV.tdist * (e.deltaY > 0 ? 1.1 : 0.9), 14, 90); }, { passive: false });
    window.addEventListener("keydown", e => {
      if (!active || !focused || /input|textarea|select/i.test(e.target.tagName)) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"].includes(e.code)) { keys[e.code] = true; if (e.code.startsWith("Arrow")) e.preventDefault(); if (anim && anim.isTour) stopAnim(); if (OV.on) ovExit(); U.$("#dn-intro").hidden = true; }
      if (e.code === "Escape") { closeInfo(); exitFull(); }
    });
    window.addEventListener("keyup", e => { keys[e.code] = false; });
    window.addEventListener("blur", () => Object.keys(keys).forEach(k => (keys[k] = false)));
    document.addEventListener("pointerdown", e => { if (!stageEl.contains(e.target)) focused = false; });
    const jz = U.$("#dn-joy"), knob = jz.querySelector("span"); let jid = null, jc = null;
    jz.addEventListener("pointerdown", e => { e.stopPropagation(); jid = e.pointerId; jz.setPointerCapture(jid); const r = jz.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; moveJoy(e); U.$("#dn-intro").hidden = true; if (anim && anim.isTour) stopAnim(); if (OV.on) ovExit(); });
    const moveJoy = e => { if (jid !== e.pointerId) return; let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const d = Math.hypot(dx, dy), m = jc.R * 0.85; if (d > m) { dx *= m / d; dy *= m / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = dy / m; };
    jz.addEventListener("pointermove", moveJoy);
    const jend = () => { jid = null; joy.x = 0; joy.y = 0; knob.style.transform = ""; };
    jz.addEventListener("pointerup", jend); jz.addEventListener("pointercancel", jend);
    U.$("#dn-play").onclick = () => { if (anim && anim.isTour) stopAnim(); else startTour(); };
    const fit = () => { if (window.innerWidth <= 900 && !stageEl.classList.contains("full")) { const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64; window.scrollTo({ top: stageEl.getBoundingClientRect().top + window.scrollY - hh - 8, behavior: "smooth" }); } };
    U.$("#dn-self").onclick = () => { U.$("#dn-intro").hidden = true; focused = true; fit(); };
    U.$("#dn-start").onclick = () => { fit(); startTour(); };
    U.$("#dn-ovb").onclick = () => { U.$("#dn-intro").hidden = true; fit(); ovEnter(0); };
    U.$("#dn-ov").onclick = () => { if (OV.on) ovExit(); else ovEnter(); };
    U.$("#dn-map-t").onclick = () => { const m = U.$("#dn-map"); m.hidden = !m.hidden; U.$("#dn-map-t").classList.toggle("on", !m.hidden); drawMap(); };
    U.$("#dn-map-c").addEventListener("click", mapClick);
    U.$("#dn-floors").onclick = e => { const b = e.target.closest("button"); if (!b) return; mapFloor = +b.dataset.f; U.$$("#dn-floors button").forEach(x => x.classList.toggle("on", x === b)); if (OV.on) { OV.floor = mapFloor; ovLayers(mapFloor); where(true); } drawMap(); };
    U.$("#dn-full").onclick = () => toggleFull();
    U.$("#dn-stairs").onclick = () => { if (P.lvl === 0) climb(); else descend(); };
    U.$("#dn-rooms").onclick = e => {
      const b = e.target.closest("[data-r]"); if (!b) return; stageEl.scrollIntoView({ behavior: "smooth", block: "center" });
      if (b.dataset.r === "out") { teleport(0, WX, 9.0, 0); return; }
      if (b.dataset.r === "ov") { ovEnter(0); return; }
      const r = REG.find(q => q.id === b.dataset.r); if (r && r.spot) teleport(r.lvl, r.spot.x, r.spot.z, r.spot.yaw);
    };
    document.addEventListener("fullscreenchange", () => { stageEl.classList.toggle("full", !!document.fullscreenElement); setTimeout(() => st && st.resize(), 60); });
  }
  let hoverT = 0;
  function hover(e) {
    const now = performance.now(); if (now - hoverT < 70) return; hoverT = now;
    const h = pick(e.clientX, e.clientY), tip = U.$("#dn-tip");
    if (h && h.device && DEV[h.device]) { const rc = stageEl.getBoundingClientRect(); tip.textContent = DEV[h.device].name; tip.style.left = (e.clientX - rc.left + 14) + "px"; tip.style.top = (e.clientY - rc.top + 14) + "px"; tip.hidden = false; canvas.style.cursor = "pointer"; }
    else { tip.hidden = true; canvas.style.cursor = OV.on ? "pointer" : h && h.floor ? "crosshair" : "grab"; }
  }
  function toggleFull() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (stageEl.requestFullscreen && !/iPhone|iPad/i.test(navigator.userAgent)) stageEl.requestFullscreen().catch(() => { stageEl.classList.toggle("full"); setTimeout(() => st.resize(), 60); });
    else { stageEl.classList.toggle("full"); document.body.classList.toggle("tour-lock", stageEl.classList.contains("full")); setTimeout(() => st.resize(), 60); }
  }
  function exitFull() { if (document.fullscreenElement) document.exitFullscreen(); stageEl.classList.remove("full"); document.body.classList.remove("tour-lock"); }

  /* ---------------------------------------------------------------
     البناء والتشغيل
  --------------------------------------------------------------- */
  function build() {
    stageEl = U.$("#dn-stage"); canvas = U.$("#dn-canvas");
    st = ECO.makeStage(canvas, { fov: 68, near: 0.06, far: 320, clear: 0xbfd8e6 });
    if (!st) return;
    const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    st.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    scene = st.scene; cam = st.camera;
    scene.fog = new THREE.Fog(0xd3e3ec, 70, 230);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x958b7a, 0.92));
    const sun = new THREE.DirectionalLight(0xfff0d6, 0.6); sun.position.set(-30, 60, 45); scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(280, 24, 14), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3f8bd0"); gr.addColorStop(0.45, "#9cc6e8"); gr.addColorStop(0.55, "#dde9ee"); gr.addColorStop(1, "#e8e1d0"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })));
    ["site", "s0", "c0", "s1", "c1", "roof"].forEach(k => { LAYERS[k] = new THREE.Group(); LAYERS[k].name = k; scene.add(LAYERS[k]); });
    const t0 = performance.now();
    materials(); materials2(); instances();
    shell(); roomWindows(); doors(); lobby(); upperHall(); ROOMS.forEach(furnish); outdoors();
    flushBatches(); flushInst(); regions();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => TEXJOBS.forEach(j => j()));
    ECO._deaneryBuildMs = Math.round(performance.now() - t0);
    U.$("#dn-joy").hidden = !coarse;
    renderRoomList();
    bindInput();
    st.tick = dt => { update(dt * (ECO.deanery.speed || 1)); const now = performance.now(); if (now - whereT > 200) { whereT = now; if (!OV.on) where(); } };
    applyCam(); where(true);
    built = true;
  }
  function renderRoomList() {
    const order = { lobby: 0, corridor: 1, office: 2, dean: 3, hall: 4, service: 5, stair: 6 };
    const grp = l => REG.filter(r => r.lvl === l && r.spot && !(r.room && r.room.hidden)).sort((a, b) => (order[a.kind] - order[b.kind]) || (a.z1 - b.z1 ? b.z1 - a.z1 : a.x0 - b.x0));
    const btn = r => `<button type="button" class="tile3d" data-r="${r.id}"><i class="k-${r.kind}"></i><span>${U.esc(r.name)}</span>${r.ph === 0 ? '<em class="dn-approx">تقريبية</em>' : ""}</button>`;
    U.$("#dn-rooms").innerHTML = [0, 1].map(l => `<div class="panel"><div class="panel-h"><h3>${l ? "الطابق الأول" : "الطابق الأرضي"}</h3></div><div class="tour-list">${l ? "" : `<button type="button" class="tile3d" data-r="out"><i class="k-outside"></i><span>الممر المسقّف أمام باب العمادة</span></button>`}${grp(l).map(btn).join("")}</div></div>`).join("") +
      `<div class="panel"><div class="panel-h"><h3>كيف تتجول</h3></div><ul class="tour-how"><li><b>للالتفات:</b> اسحب بالماوس أو بإصبعك.</li><li><b>للمشي:</b> اضغط على الأرض فتمشي إليها، أو استخدم W A S D والأسهم، أو عصا التحكم على الهاتف.</li><li><b>الدرج:</b> على يمين الداخل خلف الحاجز الزجاجي الأسود؛ ادخل من بابه الزجاجي ثم امشِ إلى الباب الأسود بشعار الكلية فتصعد تلقائياً. وللنزول امشِ من رأس الدرج نحو القلبة.</li><li><b>من الأعلى:</b> زر الطبقات يرفع السقف فترى كل غرف الطابق بأثاثها، واضغط على أي غرفة لتدخلها.</li></ul>
      <button type="button" class="btn btn-sm u-mt8" data-r="ov"><svg aria-hidden="true"><use href="#i-layers"/></svg>اعرض الطابق من الأعلى</button>
      <p class="faint" style="font-size:.74rem;margin-top:10px">المجسّم مبني لقطةً لقطة على فيديوهات العمادة وصورها، وكل الأسماء واللوحات مكتوبة نصّاً كما تظهر فيها، ولا يظهر أي شخص. لا يوجد مخطط هندسي، لذا الأبعاد تقديرية. الغرف المعلّمة «تقريبية» صُوِّر بابها واسمها فقط، فبُنيت من الداخل على طراز الغرف المصوّرة.</p></div>`;
  }

  ECO.views.deanery = {
    init() { build(); },
    show() { active = true; if (st) { st.start(); setTimeout(() => { st.resize(); drawMap(); }, 50); } },
    hide() { active = false; Object.keys(keys).forEach(k => (keys[k] = false)); if (st) st.stop(); exitFull(); }
  };
  ECO.deanery = {
    state: () => ({ x: P.x, z: P.z, lvl: P.lvl, yaw: P.yaw, where: lastWhere, anim: !!anim, ov: OV.on }), teleport, startTour, openInfo, regions: () => REG, rooms: ROOMS,
    set: o => { walkPath = null; anim = null; hideMarker(); if (OV.on) ovExit(true); Object.assign(P, o); P.gy = groundY(P.x, P.z, P.lvl); applyCam(); where(true); },
    climb, descend, keys, info: () => st && st.renderer.info.render, speed: 1, solids: () => SOLID, overview: f => (f === false ? ovExit() : ovEnter(f)), ov: OV,
    walkTo: (x, z) => { const p = routeTo(x, z); if (p) { walkPath = p; stuck = 0; } return p; }, walking: () => !!walkPath, built: () => built
  };
})();
