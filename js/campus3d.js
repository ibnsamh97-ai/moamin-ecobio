/* =====================================================================
   EcoBio AI — جولة ثلاثية الأبعاد في قسم علوم الحياة
   كلية التربية للعلوم الصرفة – جامعة تكريت
   مبنية على المخططات الحقيقية المعلّقة في القسم (الطابق الأرضي 51.11 × 15.90 م)
   وعلى صور القسم: اللوحات والأسماء مأخوذة كما هي من الصور، ولا يظهر أي شخص.
   المحاور: x شرق (+) / غرب (−)، z جنوب (+، جهة المدخل) / شمال (−).
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const FH = 3.7, CH = 3.2, EYE = 1.62, GY = -0.15, RISE = 1.85 / 11, RUN = 0.3;
  const FONT = '"Readex Pro","IBM Plex Sans Arabic","Noto Sans Arabic","Noto Naskh Arabic",Tahoma,Arial,sans-serif';
  const TEX = "assets/campus/";
  const OWNER = "مؤمن"; // الاسم الظاهر في الجولة (بطلب صاحب المنصة)
  const GREET_TEXT = "أهلاً بالزائر الكريم، مرحباً بك";
  const GZ = 25.0; // استراحة الطلبة: في الوسط أمام القسم على الممر الرئيسي

  /* الغرف حسب المخطط الهندسي للقسم. row: N شمال الممر، S جنوبه. d عمق الغرفة. door مركز الباب على الممر.
     الأسماء والرموز كما هي على لوحات الأبواب والمخططات في الصور */
  const ROOMS = [
    { id: "g-nab", lvl: 0, row: "N", x0: -21.98, x1: -12.64, d: 6.2, door: -13.75, type: "lab", sub: "botany", name: "مختبر النبات", short: "النبات" },
    { id: "g-laf", lvl: 0, row: "N", x0: -12.44, x1: -3.1, d: 5.7, door: -4.25, type: "lab", sub: "invert", name: "مختبر اللافقريات", short: "اللافقريات" },
    { id: "g-env", lvl: 0, row: "N", x0: 3.1, x1: 12.44, d: 5.7, door: 4.25, type: "lab", sub: "env", name: "مختبر البيئة والتلوث", code: "00L001", short: "البيئة والتلوث" },
    { id: "g-phy", lvl: 0, row: "N", x0: 12.64, x1: 21.98, d: 6.2, door: 13.75, type: "lab", sub: "physio", name: "مختبر فسلجة الحيوان", short: "فسلجة الحيوان" },
    { id: "g-maj", lvl: 0, row: "S", x0: -16.12, x1: -10.35, d: 6.2, door: -11.0, type: "class", name: "قاعة الماجستير", plate: "قاعة دراسية", code: "00C003", short: "الماجستير" },
    { id: "g-c3", lvl: 0, row: "S", x0: -10.15, x1: -3.1, d: 5.7, door: -3.9, type: "class", name: "قاعة المرحلة الثالثة", plate: "قاعة دراسية", code: "00C002", short: "المرحلة ٣" },
    { id: "g-c4", lvl: 0, row: "S", x0: 3.1, x1: 10.15, d: 5.7, door: 3.9, type: "class", name: "قاعة المرحلة الرابعة", plate: "قاعة دراسية", code: "00C001", short: "المرحلة ٤" },
    { id: "g-dok", lvl: 0, row: "S", x0: 10.35, x1: 16.12, d: 6.2, door: 11.0, type: "class", name: "قاعة الدكتوراه", plate: "قاعة دراسية", code: "00C004", short: "الدكتوراه" },
    { id: "u-phd", lvl: 1, row: "N", x0: -21.98, x1: -12.64, d: 6.2, door: -13.75, type: "lab", sub: "phd", name: "مختبر الدكتوراه", short: "مختبر الدكتوراه" },
    { id: "u-grad", lvl: 1, row: "N", x0: -12.44, x1: -3.1, d: 5.7, door: -4.35, type: "lab", sub: "grad", name: "مختبر الدراسات العليا", code: "01L005", short: "الدراسات العليا" },
    { id: "u-27", lvl: 1, row: "N", x0: 3.1, x1: 7.56, d: 5.7, door: 3.85, type: "office", sub: "rapp", name: "مقررية الدراسات الأولية", code: "01G034", short: "مقررية الأولية" },
    { id: "u-26", lvl: 1, row: "N", x0: 7.76, x1: 12.44, d: 5.7, door: 8.5, type: "office", sub: "staff", name: "غرفة التدريسيين", short: "تدريسيين" },
    { id: "u-25", lvl: 1, row: "N", x0: 12.64, x1: 17.11, d: 6.2, door: 13.4, type: "office", sub: "staff", name: "غرفة التدريسيين", short: "تدريسيين" },
    { id: "u-24", lvl: 1, row: "N", x0: 17.31, x1: 21.98, d: 6.2, door: 18.05, type: "office", sub: "exam", name: "اللجنة الامتحانية", short: "اللجنة الامتحانية" },
    { id: "u-31", lvl: 1, row: "S", x0: -16.12, x1: -10.35, d: 6.2, door: -11.05, type: "office", sub: "staff", name: "غرفة التدريسيين", code: "01G029", short: "تدريسيين" },
    { id: "u-30", lvl: 1, row: "S", x0: -10.15, x1: -3.1, d: 5.7, door: -9.45, type: "office", sub: "staff", name: "غرفة التدريسيات", code: "G-1-12", short: "تدريسيات" },
    { id: "u-20", lvl: 1, row: "S", x0: -2.9, x1: 2.9, d: 3.8, door: -2.1, type: "office", sub: "free", name: "مجانية التعليم", short: "مجانية التعليم", alu: true },
    { id: "u-18", lvl: 1, row: "S", x0: 3.1, x1: 5.3, d: 5.7, door: 4.2, type: "office", sub: "sec", name: "السكرتارية", short: "السكرتارية", alu: true },
    { id: "u-17", lvl: 1, row: "S", x0: 5.5, x1: 10.15, d: 5.7, door: 6.3, type: "office", sub: "head", name: "رئاسة القسم", short: "رئاسة القسم", alu: true },
    { id: "u-16", lvl: 1, row: "S", x0: 10.35, x1: 16.12, d: 6.2, door: 11.1, type: "office", sub: "pg", name: "مقررية الدراسات العليا", short: "مقررية العليا", alu: true }
  ];
  const ADMIN_X = 3.0; // الحاجز الألمنيوم «إدارة القسم» في ممر الطابق الأول

  /* معلومات الأجهزة: تظهر عند الضغط على أي جهاز */
  const DEV = {
    spectro: { name: "مطياف الأشعة فوق البنفسجية والمرئية (UV-Vis)", what: "يقيس امتصاص الضوء في المحلول عند طول موجي محدد، ومنه يُحسب تركيز المادة باستخدام منحنى المعايرة (قانون بير-لامبرت).", uses: ["تقدير النترات والفوسفات والأمونيا في المياه", "قياس الكلوروفيل-a للطحالب", "تقدير العناصر بعد تفاعلها مع كاشف ملوّن"], steps: ["شغّل الجهاز واتركه 15–30 دقيقة ليستقر المصباح", "اختر الطول الموجي واضبط الصفر بمحلول فارغ (Blank)", "قِس المحاليل القياسية ثم العينات", "ارسم منحنى المعايرة واحسب التركيز"], tool: { calc: "stdcurve", label: "حاسبة منحنى المعايرة" } },
    bod: { name: "حاضنة BOD", what: "تحفظ قناني العينات في الظلام عند 20 °م لمدة 5 أيام، لقياس الأكسجين الذي تستهلكه الأحياء المجهرية في تحليل المادة العضوية.", uses: ["قياس الحمل العضوي في مياه الصرف والأنهار", "تقييم كفاءة محطات المعالجة"], steps: ["قِس الأكسجين المذاب الابتدائي D₁", "احضن القنينة 5 أيام عند 20 °م", "قِس الأكسجين النهائي D₂", "BOD₅ = (D₁ − D₂) / P"], tool: { calc: "bod", label: "حاسبة BOD" } },
    kjeldahl: { name: "جهاز كلدال (الهضم والتقطير)", what: "يقدّر النيتروجين الكلي في المياه والتربة والنبات: تُهضم العينة بحامض الكبريتيك، ثم تُقطّر الأمونيا وتُعاير.", uses: ["النيتروجين الكلي في مياه الصرف", "نيتروجين التربة والرواسب", "تقييم التلوث بالمغذيات"], tool: { calc: "ammonia", label: "حاسبة الأمونيا السامة" } },
    elisa: { name: "قارئ الأطباق ELISA", what: "يقيس الامتصاص الضوئي في أطباق من 96 حفرة دفعة واحدة، ويُستخدم في الكشوف المناعية والإنزيمية وقياس كثافة النمو البكتيري (OD).", uses: ["منحنيات نمو البكتيريا المحللة للملوثات", "كشف السموم والمضادات"], tool: { calc: "growth", label: "حاسبة النمو الميكروبي" } },
    vitek: { name: "جهاز VITEK 2 لتشخيص البكتيريا", what: "يشخّص أنواع البكتيريا آلياً من خلال بطاقات اختبارات كيموحيوية، ويحدد حساسيتها للمضادات الحيوية.", uses: ["تشخيص بكتيريا التلوث البرازي في المياه", "عزل البكتيريا المحللة للنفط"], tool: { rs: "tikrit-2023", label: "بحث بكتيريا دجلة (المشرفة)" } },
    stirrer: { name: "الخلاط المغناطيسي مع التسخين", what: "يمزج المحاليل ويسخّنها بقضيب مغناطيسي دوّار، ويُستخدم لتحضير المحاليل والكواشف وإذابة المواد.", tool: { calc: "molar", label: "حاسبة تحضير المحاليل" } },
    multistir: { name: "خلاط مغناطيسي متعدد المواقع", what: "يمزج عدة دوارق في وقت واحد بالسرعة نفسها، مناسب لتجارب الامتزاز الحيوي والمعالجة المتوازية.", tool: { calc: "biosorption", label: "حاسبة لانكماير وفرندلش" } },
    overhead: { name: "خلاط علوي (Overhead stirrer)", what: "يمزج السوائل الكثيفة والمعلقات بمروحة من الأعلى، ويستخدم في تجارب التخثير والمعالجة.", tool: { calc: "removal", label: "حاسبة نسبة الإزالة" } },
    bath: { name: "الحمام المائي", what: "يحافظ على درجة حرارة ثابتة للعينات أثناء التفاعلات والهضم والحضن.", tool: { calc: "dilution", label: "حاسبة التخفيف" } },
    jar: { name: "جهاز اختبار الجرة (Jar Test)", what: "يحدد الجرعة المثلى من المخثرات، كالشب أو المخثرات الطبيعية، لإزالة العكورة من الماء بمقارنة ستة أوعية معاً.", steps: ["املأ الأوعية بالعينة نفسها", "أضف جرعات متزايدة من المخثر", "خلط سريع دقيقة ثم بطيء 15–20 دقيقة", "اترك للترسيب وقِس العكورة المتبقية"], tool: { calc: "removal", label: "حاسبة نسبة الإزالة" } },
    turb: { name: "جهاز قياس العكورة", what: "يقيس العكورة بوحدة NTU من الضوء المتشتت بزاوية 90° داخل قنينة العينة.", tool: { view: "vision", label: "قراءة صورة الماء" } },
    ph: { name: "جهاز pH والتوصيلية", what: "يقيس الأس الهيدروجيني والتوصيلية الكهربائية والمواد الصلبة الذائبة (TDS) بقطب زجاجي.", steps: ["عاير القطب بمحاليل منظمة pH 4 و7 و10", "اغسل القطب بالماء المقطر", "اغمره في العينة حتى تستقر القراءة"], tool: { view: "water", label: "مختبر جودة المياه" } },
    microscope: { name: "المجهر الضوئي المركب", what: "يكبّر العينات حتى 1000 مرة لفحص البكتيريا والطحالب والأحياء الدقيقة والمقاطع النسيجية. تُحفظ مجاهر القسم في الخزانات السوداء وتُغطّى بأغطية القماش الزرقاء على المصاطب.", tool: { view: "palmer", label: "المجهر الذكي (مؤشر Palmer)" } },
    cabinet: { name: "خزانات المجاهر", what: "الخزانات السوداء ذات الأبواب الزجاجية في المختبرات تُحفظ فيها المجاهر الضوئية بعد الاستخدام لحمايتها من الغبار والرطوبة.", tool: { view: "micro", label: "العالم المجهري 3D" } },
    autoclave: { name: "جهاز التعقيم (الأوتوكلاف)", what: "يعقّم الأوساط الزرعية والأدوات بالبخار المضغوط عند 121 °م و15 psi لمدة 15–20 دقيقة." },
    hood: { name: "خزانة الأبخرة", what: "تسحب الأبخرة السامة والحوامض المتطايرة بعيداً عن المستخدم أثناء الهضم وتحضير الكواشف. اعمل والزجاج منخفض." },
    incubator: { name: "الحاضنة", what: "تحفظ الأطباق عند 37 °م، أو 44.5 °م للقولونيات البرازية، لنمو البكتيريا وعدّها.", tool: { calc: "growth", label: "حاسبة النمو الميكروبي" } },
    oven: { name: "فرن التجفيف", what: "يجفف العينات عند 103–105 °م لتقدير المواد الصلبة الكلية والعالقة، وعند 180 °م للذائبة، ويجفف الزجاجيات بعد الغسل.", tool: { calc: "solids", label: "حاسبة المواد الصلبة" } },
    distiller: { name: "جهاز تقطير الماء", what: "ينتج ماءً مقطراً خالياً من الأملاح لتحضير المحاليل والكواشف وغسل الأدوات قبل التحاليل.", tool: { calc: "dilution", label: "حاسبة التخفيف" } },
    bunsen: { name: "موقد بنزن", what: "لهب لتعقيم إبرة النقل البكتيري والتسخين البسيط. أبعده عن المذيبات القابلة للاشتعال." },
    tissue: { name: "جهاز تحضير الأنسجة", what: "يمرّر العينات النسيجية آلياً عبر محاليل التثبيت والإنكاز والشمع، لتحضير مقاطع مجهرية لأنسجة الكائنات المعرّضة للتلوث." },
    embed: { name: "جهاز طمر الأنسجة بالشمع", what: "يطمر العينات النسيجية في قوالب شمعية لتقطيعها بالمشراح وفحصها مجهرياً." },
    centrifuge: { name: "جهاز الطرد المركزي", what: "يفصل مكونات العينة حسب كثافتها بالدوران السريع؛ يُستخدم لفصل الخلايا والرواسب وتحضير المصل." },
    fireball: { name: "مطفأة الحريق الكروية التلقائية", what: "معلّقة في سقف المختبرات، وتنفجر تلقائياً عند ارتفاع الحرارة فتنشر مسحوق الإطفاء." },
    alzan: { name: "صندوق خرطوم الحريق ومطفأة اليد", what: "في المدخل والممرات: صندوق خرطوم الإطفاء ومطفأة يدوية وجرس إنذار وزر إنذار يدوي، ومخطط الإخلاء يحدد أقرب مخرج ونقاط التجمّع." },
    owner: { name: OWNER, what: "صاحب منصة EcoBio AI. من قسم علوم الحياة في كلية التربية للعلوم الصرفة – جامعة تكريت، ويعمل في التلوث البيئي ومعالجته حيوياً.", uses: ["إشراف: " + ((ECO.PROJECT && ECO.PROJECT.supervisor) || "أ.م. رغد مقداد محمود")] }
  };

  let st = null, scene, cam, stageEl, canvas, built = false, active = false, focused = false;
  const MAT = {}, BATCH = {}, INST = {}, SOLID = [[], []], PICK = [], FLOORS = [], BLOCK = [], TEXJOBS = [], REG = [], ANIM = [];
  const P = { x: 0, z: 37, lvl: 0, yaw: 0, pitch: 0.03, bob: 0, gy: GY };
  const keys = {}, joy = { x: 0, y: 0 };
  let walkPath = null, stuck = 0, anim = null, tour = false, whereT = 0, ledTex = null, mapFloor = 0, lastWhere = "", avatar = null, clockT = 0;

  /* ---------------------------------------------------------------
     أدوات مساعدة
  --------------------------------------------------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  /* نص عربي على لوحة؛ يُعاد رسمه بعد تحميل الخطوط */
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
  function photo(name, o) {
    if (!PHOTO[name]) { const t = loader.load(TEX + name, () => { if (st && !st.running) st.renderer.render(scene, cam); }); t.anisotropy = 4; PHOTO[name] = t; }
    return lam(0xffffff, Object.assign({ map: PHOTO[name] }, o || {}));
  }

  /* تجميع الهندسة الثابتة حسب المادة لتقليل أوامر الرسم */
  const BOXG = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  function addGeo(key, geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
    (BATCH[key] = BATCH[key] || []).push(g);
  }
  /* صندوق محاذٍ للمحاور بإحداثيات نسيج بالمتر (v من أرضية الطابق) لتبقى الخامات بمقاسها الحقيقي */
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
    (BATCH[key] = BATCH[key] || []).push(g);
  }
  function flat(key, x0, z0, x1, z1, y, down = false) {
    const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0); if (w < 1e-3 || d < 1e-3) return;
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
    (BATCH[key] = BATCH[key] || []).push(g.toNonIndexed());
  }
  function mergeGeos(list) {
    let n = 0; list.forEach(g => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    list.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere(); return geo;
  }
  const BLOCKKEYS = /^(wall|wallW|ext|maroon|alu|cab|cabBlack|top|white|woodDark|marble|core)$/;
  function flushBatches() {
    for (const key in BATCH) {
      if (!MAT[key]) { console.warn("campus: missing material", key); continue; }
      const mesh = new THREE.Mesh(mergeGeos(BATCH[key]), MAT[key]);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); scene.add(mesh);
      if (/^floor/.test(key) || key === "marble") FLOORS.push(mesh);
      else if (BLOCKKEYS.test(key)) BLOCK.push(mesh);
    }
  }
  /* عناصر متكررة كثيرة (كراسٍ، إضاءة، نباتات...) */
  function defInst(key, geo, mat, device) { INST[key] = { geo: geo.index ? geo.toNonIndexed() : geo, mat, list: [], device }; }
  function addInst(key, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    INST[key].list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)));
  }
  function flushInst() {
    for (const k in INST) {
      const o = INST[k]; if (!o.list.length) continue;
      const im = new THREE.InstancedMesh(o.geo, o.mat, o.list.length);
      o.list.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere && im.computeBoundingSphere();
      im.frustumCulled = false; scene.add(im); if (o.device) { im.userData.device = o.device; PICK.push(im); }
    }
  }
  const mg = parts => mergeGeos(parts.map(g => (g.index ? g.toNonIndexed() : g)));
  function solid(lvl, x0, z0, x1, z1, pad = 0) { SOLID[lvl].push([Math.min(x0, x1) - pad, Math.min(z0, z1) - pad, Math.max(x0, x1) + pad, Math.max(z0, z1) + pad]); }

  /* جدار ثابت x ممتد على z مع فتحات (أبواب ونوافذ). القيم الرأسية نسبةً لأرضية الطابق */
  function wallZ(key, x, za, zb, lvl, t, holes = [], collide = true, y0o = 0, y1o = FH) {
    const y0 = lvl * FH + y0o, y1 = lvl * FH + y1o, z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    let cur = z0;
    const piece = (a, b, ya, yb, col) => { bx(key, x - t / 2, ya, a, x + t / 2, yb, b); if (col && collide) solid(lvl, x - t / 2, a, x + t / 2, b); };
    holes.slice().sort((p, q) => p.a - q.a).forEach(h => {
      if (h.a > cur) piece(cur, h.a, y0, y1, true);
      const yb = lvl * FH + (h.bottom || 0), yt = lvl * FH + (h.top == null ? 2.2 : h.top);
      if (yb > y0 + 1e-3) piece(h.a, h.b, y0, yb, yb - y0 > 0.4);
      if (yt < y1 - 1e-3) piece(h.a, h.b, yt, y1, false);
      cur = Math.max(cur, h.b);
    });
    if (cur < z1) piece(cur, z1, y0, y1, true);
  }
  function wallX(key, z, xa, xb, lvl, t, holes = [], collide = true, y0o = 0, y1o = FH) {
    const y0 = lvl * FH + y0o, y1 = lvl * FH + y1o, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
    let cur = x0;
    const piece = (a, b, ya, yb, col) => { bx(key, a, ya, z - t / 2, b, yb, z + t / 2); if (col && collide) solid(lvl, a, z - t / 2, b, z + t / 2); };
    holes.slice().sort((p, q) => p.a - q.a).forEach(h => {
      if (h.a > cur) piece(cur, h.a, y0, y1, true);
      const yb = lvl * FH + (h.bottom || 0), yt = lvl * FH + (h.top == null ? 2.2 : h.top);
      if (yb > y0 + 1e-3) piece(h.a, h.b, y0, yb, yb - y0 > 0.4);
      if (yt < y1 - 1e-3) piece(h.a, h.b, yt, y1, false);
      cur = Math.max(cur, h.b);
    });
    if (cur < x1) piece(cur, x1, y0, y1, true);
  }
  /* جدار خارجي بطبقتين: داخلية مدهونة وخارجية بلون واجهة المبنى. s: جهة الخارج (+1 / −1) */
  function extX(z, xa, xb, lvl, s, holes = [], outKey = "ext", y1o = FH) {
    wallX("wall", z - s * 0.09, xa, xb, lvl, 0.12, holes, true, 0, y1o);
    wallX(outKey, z + s * 0.06, xa - 0.15, xb + 0.15, lvl, 0.18, holes.map(h => Object.assign({}, h)), false, 0, lvl ? y1o + 0.75 : y1o);
  }
  function extZ(x, za, zb, lvl, s, holes = [], outKey = "ext", y1o = FH) {
    wallZ("wall", x - s * 0.09, za, zb, lvl, 0.12, holes, true, 0, y1o);
    wallZ(outKey, x + s * 0.06, za - 0.15, zb + 0.15, lvl, 0.18, holes, false, 0, lvl ? y1o + 0.75 : y1o);
  }
  function frameX(key, z, a, b, y0, y1, t, d = t) { bx(key, a - t, y0, z - d, a, y1, z + d); bx(key, b, y0, z - d, b + t, y1, z + d); bx(key, a - t, y1, z - d, b + t, y1 + t, z + d); }
  function frameZ(key, x, a, b, y0, y1, t, d = t) { bx(key, x - d, y0, a - t, x + d, y1, a); bx(key, x - d, y0, b, x + d, y1, b + t); bx(key, x - d, y1, a - t, x + d, y1 + t, b + t); }

  /* مجموعة جهاز قابلة للضغط؛ تُدمج أجزاؤها حسب المادة */
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
  function device(key, parts, x, y, z, ry, lvl) {
    const g = new THREE.Group(); parts.forEach(p => g.add(p));
    g.position.set(x, y, z); g.rotation.y = ry;
    const c = compact(g); c.userData.device = key;
    if (!key) {
      // قطع الأثاث الثابتة تُضاف إلى الدفعات المدمجة لتقليل أوامر الرسم
      if (!MATKEY) { MATKEY = new Map(); for (const k in MAT) if (MAT[k] && MAT[k].isMaterial && !MATKEY.has(MAT[k])) MATKEY.set(MAT[k], k); }
      c.children.slice().forEach(m => { const k = MATKEY.get(m.material); if (k) { (BATCH[k] = BATCH[k] || []).push(m.geometry); c.remove(m); } });
      if (c.children.length) scene.add(c);
      return c;
    }
    scene.add(c); PICK.push(c); return c;
  }
  /* دمج أجزاء مجموعة متحركة حسب المادة (للشخصية) */
  function mergeGroup(grp) {
    grp.updateMatrix();
    const meshes = grp.children.filter(o => o.isMesh), buckets = new Map();
    meshes.forEach(o => { o.updateMatrix(); const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); geo.applyMatrix4(o.matrix); if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(geo); grp.remove(o); });
    buckets.forEach((list, mat) => grp.add(new THREE.Mesh(mergeGeos(list), mat)));
  }
  /* لوحة مصوّرة (من صور القسم) مع إطار */
  function pic(mat, w, h, x, y, z, ry, frame = "frameBlack", fd = 0.03) {
    if (frame) {
      const g = new THREE.BoxGeometry(w + 0.06, h + 0.06, fd); const m = new THREE.Mesh(g, MAT[frame] || MAT.black);
      m.position.set(x - Math.sin(ry) * fd / 2, y, z - Math.cos(ry) * fd / 2); m.rotation.y = ry; scene.add(m);
    }
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(x + Math.sin(ry) * 0.004, y, z + Math.cos(ry) * 0.004); p.rotation.y = ry; scene.add(p); return p;
  }
  const facing = (dx, dz) => Math.atan2(dx, dz);

  /* ---------------------------------------------------------------
     الخامات: ألوانها مأخوذة من صور القسم (الأرضية الموزائيك، الطابوق، الواجهة العنابية...)
  --------------------------------------------------------------- */
  function materials() {
    const noise = (g, w, h, n, a, seed, size = 1.5) => { const R = rng(seed); for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${R() < 0.5 ? "0,0,0" : "255,255,255"},${R() * a})`; g.fillRect(R() * w, R() * h, size, size); } };
    // أرضية موزائيك (تيرازو) 40×40 سم — ألوان الحبيبات من صورة أرضية المدخل
    const terr = canvasTex(512, 512, (g, w, h) => {
      const R = rng(7), chips = ["#c0b3a0", "#aea08d", "#998b79", "#827463", "#635749", "#34291e", "#ece4d6", "#b9a98f"];
      for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) { const v = (R() - 0.5) * 10; g.fillStyle = `rgb(${214 + v},${202 + v},${184 + v})`; g.fillRect(tx * w / 3, ty * h / 3, w / 3, h / 3); }
      for (let i = 0; i < 5200; i++) { g.fillStyle = chips[(R() * R() * chips.length) | 0]; const s = 0.8 + R() * R() * 5.5; g.beginPath(); g.ellipse(R() * w, R() * h, s, s * (0.5 + R() * 0.6), R() * 3, 0, 7); g.fill(); }
      g.strokeStyle = "rgba(120,108,92,.55)"; g.lineWidth = 2; for (let k = 0; k <= 3; k++) { g.beginPath(); g.moveTo(k * w / 3, 0); g.lineTo(k * w / 3, h); g.moveTo(0, k * h / 3); g.lineTo(w, k * h / 3); g.stroke(); }
    }, [1 / 1.2, 1 / 1.2]);
    // رخام الدرج والبسطة
    const marble = canvasTex(512, 512, (g, w, h) => {
      const R = rng(17); for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) { const v = (R() - 0.5) * 18; g.fillStyle = `rgb(${172 + v},${158 + v},${140 + v})`; g.fillRect(tx * w / 2, ty * h / 2, w / 2, h / 2); }
      for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? "96,82,68" : "226,216,200"},${0.25 + R() * 0.35})`; g.lineWidth = 0.6 + R() * 2.2; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.3) * 70; y += (R() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
      noise(g, w, h, 4000, 0.12, 3); g.strokeStyle = "rgba(90,78,66,.6)"; g.lineWidth = 2; g.strokeRect(1, 1, w / 2 - 1, h / 2 - 1); g.strokeRect(w / 2, h / 2, w / 2 - 1, h / 2 - 1);
    }, [1 / 1.2, 1 / 1.2]);
    const porch = canvasTex(256, 256, (g, w, h) => { const R = rng(5); for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) { const v = (R() - 0.5) * 14; g.fillStyle = `rgb(${206 + v},${194 + v},${174 + v})`; g.fillRect(tx * w / 2, ty * h / 2, w / 2, h / 2); } noise(g, w, h, 3000, 0.1, 8); g.strokeStyle = "rgba(140,128,110,.7)"; g.lineWidth = 2; g.strokeRect(0, 0, w / 2, h / 2); g.strokeRect(w / 2, h / 2, w / 2, h / 2); }, [1 / 1.2, 1 / 1.2]);
    // مقرنص الممرات الخارجية: مستطيلات رمادية مزرقة وبيج (من صورة المدخل)
    const pavers = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#6d6a64"; g.fillRect(0, 0, w, h); const R = rng(5), bw = 64, bh = 32, pal = ["#7a7f86", "#858a90", "#6c7177", "#8e9297", "#bba98a", "#a9997d", "#73787e"];
      for (let r = 0; r < h / bh; r++) { const off = (r % 2) * bw / 2; for (let c = -1; c < w / bw + 1; c++) { const col = pal[(R() * pal.length) | 0]; g.fillStyle = col; g.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4); g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(c * bw + off + 3, r * bh + 3, bw - 6, 4); } }
      noise(g, w, h, 5000, 0.12, 6);
    }, [1 / 1.6, 1 / 1.6]);
    const grass = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6f8f3c"; g.fillRect(0, 0, w, h); const R = rng(9); for (let i = 0; i < 7000; i++) { g.fillStyle = R() < 0.5 ? "rgba(78,112,38,.55)" : "rgba(150,172,84,.45)"; g.fillRect(R() * w, R() * h, 2, 3); } }, [1 / 3, 1 / 3]);
    const soil = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#6b5843"; g.fillRect(0, 0, w, h); noise(g, w, h, 2500, 0.3, 4, 2); }, [1, 1]);
    // سقف الطابق الأرضي: بلاطات معدنية منقوشة 60×60 بإطار أسود
    const ceilG = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#ece9e1"; g.fillRect(0, 0, w, h); const R = rng(3);
      for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(120,112,100,${0.25 + R() * 0.35})`; g.lineWidth = 1 + R(); g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (R() - 0.5) * 9; y += (R() - 0.5) * 9; g.lineTo(x, y); } g.stroke(); }
      noise(g, w, h, 3000, 0.08, 2); g.fillStyle = "#26282a"; [0, w / 2].forEach(p => { g.fillRect(p, 0, 4, h); g.fillRect(0, p, w, 4); });
    }, [1 / 1.2, 1 / 1.2]);
    // سقف الطابق الأول: بلاطات بيضاء مثقبة بزخرفة الورود
    const ceilU = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#f1f1ee"; g.fillRect(0, 0, w, h); const t = w / 2, n = 5;
      for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const cx = tx * t + (i + 0.5) * t / n + ((j % 2) ? t / n / 2 : 0) - t / n / 4, cy = ty * t + (j + 0.5) * t / n;
        g.fillStyle = "#9d9c97"; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.ellipse(cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, 4.2, 2.1, a, 0, 7); g.fill(); }
        g.beginPath(); g.arc(cx, cy, 1.6, 0, 7); g.fill();
      }
      g.fillStyle = "#d6d6d2"; [0, t].forEach(p => { g.fillRect(p, 0, 4, h); g.fillRect(0, p, w, 4); });
    }, [1 / 1.2, 1 / 1.2]);
    // جدار داخلي بلونين: أسفل كريمي إلى 1.25 م وأعلى أبيض، مع وزرة موزائيك
    const dado = canvasTex(8, 512, (g, w, h) => {
      const yy = m => h - m / FH * h;
      g.fillStyle = "#f4f2ed"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#e5ddcd"; g.fillRect(0, yy(1.25), w, h - yy(1.25));
      g.fillStyle = "#cfc3ab"; g.fillRect(0, yy(1.26), w, 3);
      g.fillStyle = "#b8ad9c"; g.fillRect(0, yy(0.1), w, h - yy(0.1));
    });
    dado.wrapS = THREE.RepeatWrapping; dado.repeat.set(1, 1 / FH);
    const plaster = (base, seed, a = 0.1) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, 6000, a, seed, 2); const R = rng(seed + 1); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.035})`; g.fillRect(0, R() * h, w, 1 + R() * 3); } }, [1 / 2, 1 / 2]);
    const ext = plaster("#d9cbb0", 11), maroonT = plaster("#8b3a31", 12, 0.14);
    // ألواح الألمنيوم البيضاء في إدارة القسم
    const alu = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = "#e8e9e8"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 20) { g.fillStyle = "rgba(0,0,0,.05)"; g.fillRect(x, 0, 3, h); }
      const yy = m => h - m / FH * h; g.fillStyle = "#a9adb0"; [0.08, 1.05, 2.3].forEach(m => g.fillRect(0, yy(m) - 4, w, 8)); g.fillStyle = "#b8bbbe"; g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
    });
    alu.wrapS = THREE.RepeatWrapping; alu.repeat.set(1 / 1.0, 1 / FH);
    const woodPanel = canvasTex(256, 256, (g, w, h) => {
      const R = rng(13); for (let x = 0; x < w; x += 32) { const v = 120 + R() * 25 | 0; g.fillStyle = `rgb(${v + 18},${v - 12},${v - 48})`; g.fillRect(x, 0, 32, h); g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x, 0, 2, h); }
      for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(60,34,12,${0.08 + R() * 0.14})`; g.beginPath(); const x = R() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.6, x + 2, h); g.stroke(); }
    }, [1 / 1.2, 1 / 1.2]);
    const woodDesk = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6d4a30"; g.fillRect(0, 0, w, h); const R = rng(19); for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? "40,22,10" : "150,110,70"},${0.1 + R() * 0.2})`; g.beginPath(); const y = R() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 2); g.stroke(); } }, [1, 1]);
    // ستائر «زيبرا» بشرائط معتمة وشفافة
    const blinds = canvasTex(32, 128, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(122,106,88,.97)"; g.fillRect(0, y, w, 15); g.fillStyle = "rgba(236,230,218,.5)"; g.fillRect(0, y + 15, w, 17); } }, [1, 1 / 0.4]);
    // بوابة الحديد الكريمية أمام المختبرات
    const grilleT = canvasTex(256, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = "#e7dfc7"; g.lineWidth = 9; g.lineCap = "round";
      g.strokeRect(6, 6, w - 12, h - 12); [0.36, 0.64].forEach(f => { g.beginPath(); g.moveTo(6, h * f); g.lineTo(w - 6, h * f); g.stroke(); });
      g.lineWidth = 6; for (let i = 0; i < 6; i++) { const x = 28 + i * 40; g.beginPath(); g.moveTo(x, 8); g.lineTo(x, h * 0.4); const s = (i % 2 ? -1 : 1) * 12; g.bezierCurveTo(x + s, h * 0.45, x + s, h * 0.55, x, h * 0.6); g.lineTo(x, h - 8); g.stroke(); }
      g.fillStyle = "#cfc6ad"; g.fillRect(w - 30, h * 0.48, 14, 28);
    });
    // شباك خشبي مشبّك (غرفة تحت الدرج)
    const latWin = canvasTex(256, 192, (g, w, h) => {
      g.fillStyle = "#1b1410"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5e3d26"; g.lineWidth = 3;
      for (let k = -h; k < w + h; k += 14) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
      g.strokeStyle = "#4a2f1d"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); g.lineWidth = 8; [1, 2, 3].forEach(i => { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); });
    });
    const coverT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#c9b48a"; g.fillRect(0, 0, w, h); g.fillStyle = "#2c4aa0"; g.fillRect(0, 0, w * 0.35, h); g.fillRect(w * 0.65, 0, w * 0.35, h); g.fillRect(0, h * 0.45, w, h * 0.22); });

    Object.assign(MAT, {
      floorTerr: lam(0xffffff, { map: terr }), floorPorch: lam(0xffffff, { map: porch }), floorPav: lam(0xffffff, { map: pavers }), floorGrass: lam(0xffffff, { map: grass }), soil: lam(0xffffff, { map: soil }),
      marble: lam(0xffffff, { map: marble }), ceilG: lam(0xffffff, { map: ceilG, emissive: 0x403e3a }), ceilU: lam(0xffffff, { map: ceilU, emissive: 0x44443f }), ceilPlain: lam(0xf3f2ee, { emissive: 0x3a3a36 }),
      wall: lam(0xffffff, { map: dado }), wallW: lam(0xf4f2ed), core: lam(0xf4f2ed), ext: lam(0xffffff, { map: ext }), maroon: lam(0xffffff, { map: maroonT }), maroonDark: lam(0x6e2a25),
      alu: lam(0xffffff, { map: alu }), aluFrame: lam(0xdcdedf), woodPanel: lam(0xffffff, { map: woodPanel }), woodDesk: lam(0xffffff, { map: woodDesk }),
      slab: lam(0xd8d2c4), roof: lam(0xa9a295), stone: lam(0xcbbfa8),
      cream: lam(0xd9ceb6), creamDoor: lam(0xe3dccb), doorDark: lam(0x4a3122), frameDark: lam(0x3e2b20), doorBrown: lam(0x5b3b28),
      cab: lam(0xe6decb), cabBlack: lam(0x1b1e22, { emissive: 0x050608 }), top: lam(0xf5f3ee), shelfW: lam(0xf7f7f4), seam: lam(0x0c0d0f), handle: lam(0xbfc4c8), gold: lam(0xc9a54a),
      wood: lam(0x9a6a3e), woodDark: lam(0x56392a), stoolBlue: lam(0x2f4d8f), chrome: lam(0xc4c9cd), metal: lam(0x9ea6ab), steel: lam(0xc9ced3), steelCab: lam(0xcfcab8),
      black: lam(0x24262a), frameBlack: lam(0x18191b), grey: lam(0x8c9196), white: lam(0xf6f6f3), paper: lam(0xf6f4ee), red: lam(0xc8322b), redDark: lam(0x8e1f1c), yellow: lam(0xe6c02e), green: lam(0x2f5a3a), orange: lam(0xe0762a),
      chairSeat: lam(0xd99a34), chairFrame: lam(0x202022), chairTab: lam(0xb08355), officeChair: lam(0x232427), sofaBlue: lam(0x2b3f8e), sofaBeige: lam(0xc4a679), carpet: lam(0x7d2b2b),
      cover: lam(0xffffff, { map: coverT }),
      devWhite: lam(0xf1f1ee), devGrey: lam(0xb8bec3), devDark: lam(0x3a4048), devBlue: lam(0x56679c), devScreen: basic(0x2b7a8e), devGlass: basic(0xbfe3ee, { transparent: true, opacity: 0.35, depthWrite: false }),
      glass: basic(0x86a3ad, { transparent: true, opacity: 0.4, depthWrite: false }), glassDark: basic(0x7f949b, { transparent: true, opacity: 0.3, depthWrite: false }), glassCab: basic(0x0e1114, { transparent: true, opacity: 0.55, depthWrite: false }),
      blinds: basic(0xffffff, { map: blinds, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      grille: basic(0xffffff, { map: grilleT, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), latWin: lam(0xffffff, { map: latWin }),
      light: basic(0xffffff), lightWarm: basic(0xfff6e2), screen: basic(0x1e2a33), water: basic(0xa98a52, { transparent: true, opacity: 0.6, depthWrite: false }), jarLiquid: basic(0xd8c27a, { transparent: true, opacity: 0.55, depthWrite: false }),
      pot: lam(0xefece6), trunk: lam(0x6b5038), skin: lam(0x9b6a49), hair: lam(0x17120f), shirt: lam(0xf3f4f6), vest: lam(0x16171a), trouser: lam(0x141518), shoe: lam(0x0c0c0d), eye: basic(0x1a120d), eyeW: lam(0xf2efe8), lips: lam(0x7a4a36)
    });
    // صور حقيقية من القسم (بلا أشخاص)
    ["board_masaiya", "board_sabahiya", "board_taalimat", "board_univ", "alzan", "plan_ground_color", "plan_ground_line", "plan_upper_color", "plan_upper_line", "evac", "ppe", "safety", "cert", "notice", "lab_posters", "entrance_sign", "ent_window", "exit_door"].forEach(n => (MAT["ph_" + n] = photo(n + ".jpg")));
    MAT.ph_ent_door = photo("ent_door.jpg", { color: 0xb08a72, side: THREE.DoubleSide }); MAT.ph_ent_panel = photo("ent_panel.jpg", { color: 0xb08a72 });
    MAT.ph_exit_door.side = THREE.DoubleSide;
  }

  /* أوراق النباتات وأغصان الأشجار: بطاقات شفافة */
  function leafTex(kind) {
    return canvasTex(128, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      if (kind === "tree") {
        const R = rng(41); for (let i = 0; i < 520; i++) { const x = w / 2 + (R() - 0.5) * w * 0.95 * Math.sin(Math.PI * (i / 520)) , y = R() * h; const c = 50 + R() * 50 | 0; g.fillStyle = `rgba(${c - 10},${c + 50},${c - 25},.95)`; g.beginPath(); g.ellipse(x, y, 3 + R() * 4, 2 + R() * 2, R() * 3, 0, 7); g.fill(); }
        return;
      }
      if (kind === "palm") { g.strokeStyle = "#6c7a35"; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke(); g.strokeStyle = "#7f9a3c"; g.lineWidth = 3; for (let y = 8; y < h; y += 7) { const l = 55 * Math.sin(Math.PI * y / h); g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 - l, y + 16); g.moveTo(w / 2, y); g.lineTo(w / 2 + l, y + 16); g.stroke(); } return; }
      const col = kind === "orange" ? ["#e8742a", "#f2a23a", "#c94b1f"] : kind === "purple" ? ["#3f7d3a", "#2f6a2c", "#5b8f3f"] : ["#3f7d33", "#5f9a3a", "#c9c25a"];
      const R = rng(kind.length * 7);
      for (let i = 0; i < 9; i++) {
        const y = 20 + i * 26, side = i % 2 ? 1 : -1;
        g.save(); g.translate(w / 2, y); g.rotate(side * (0.6 + R() * 0.3));
        g.fillStyle = col[0]; g.beginPath(); g.ellipse(0, -26, 15, 30, 0, 0, 7); g.fill();
        g.fillStyle = col[2]; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(0, -26, 5, 26, 0, 0, 7); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = col[1]; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -54); g.stroke(); g.restore();
        if (kind === "purple" && i % 2) { g.fillStyle = "#c2368f"; g.beginPath(); g.arc(w / 2 + side * 26, y - 18, 7, 0, 7); g.fill(); g.fillStyle = "#f1d9e8"; g.beginPath(); g.arc(w / 2 + side * 26, y - 18, 2, 0, 7); g.fill(); }
      }
      g.strokeStyle = "#4b5a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 8); g.stroke();
    });
  }
  function signTextures() {
    const M = MAT;
    // لوحة الباب الذهبية بإطار عنابي وزخرفة في الزوايا (كما في الصور)
    M.plate = (name, code) => basic(0xffffff, { map: textTex(512, 150, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f0d27e"); gr.addColorStop(0.5, "#e2bd5f"); gr.addColorStop(1, "#c99d3f"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#7a2a1f"; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = "#7a2a1f"; [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 12, y); g.lineTo(x, y + 12); g.lineTo(x - 12, y); g.fill(); });
      g.fillStyle = "#121212"; fitFont(g, name, 800, code ? 46 : 54, w - 70); g.fillText(name, w / 2, code ? 54 : h / 2 + 2);
      if (code) { g.direction = "ltr"; g.fillStyle = "#8f1d16"; g.font = `500 44px "Times New Roman",Georgia,serif`; g.fillText(code, w / 2, 108); }
    }) });
    // اللافتات المعلقة السوداء بخط ذهبي (النص كما في صور الممر)
    const hang = (L, Rr) => basic(0xffffff, { map: textTex(900, 400, (g, w, h) => {
      g.fillStyle = "#15161a"; g.fillRect(0, 0, w, h); g.fillStyle = "#3b3326"; g.fillRect(0, h - 10, w, 10);
      const gold = "#c9a46a"; g.fillStyle = gold; g.strokeStyle = gold; g.lineWidth = 7;
      const arrow = (x0, x1, y) => { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); const d = x1 > x0 ? 1 : -1; g.beginPath(); g.moveTo(x1 + d * 6, y); g.lineTo(x1 - d * 26, y - 14); g.lineTo(x1 - d * 26, y + 14); g.fill(); };
      g.beginPath(); g.moveTo(w / 2 - 14, 60); g.lineTo(w / 2 - 14, 180); g.moveTo(w / 2 + 14, 60); g.lineTo(w / 2 + 14, 180); g.moveTo(w / 2 - 14, 220); g.lineTo(w / 2 - 14, 340); g.moveTo(w / 2 + 14, 220); g.lineTo(w / 2 + 14, 340); g.stroke();
      arrow(w / 2 + 14, w - 80, 60); arrow(w / 2 + 14, w - 80, 340); arrow(w / 2 - 14, 80, 60); arrow(w / 2 - 14, 80, 340);
      g.fillStyle = gold;
      [[Rr[0], 0.75, 130], [Rr[1], 0.75, 270], [L[0], 0.25, 130], [L[1], 0.25, 270]].forEach(([t, fx, yy]) => { fitFont(g, t, 700, 58, w * 0.42); g.fillText(t, w * fx, yy); });
    }) });
    M.hangW = hang(["قاعة الماجستير", "قاعة المرحله الثالثه"], ["مختبر النبات", "مختبر اللافقريات"]);   // تُقرأ وأنت متجه غرباً
    M.hangE = hang(["مختبر الحيوان", "مختبر البيئه والتلوث"], ["قاعه الدكتوره", "قاعة المرحله الرابعه"]); // تُقرأ وأنت متجه شرقاً
    M.hangBack = basic(0x15161a);
    M.blueZoo = basic(0xffffff, { map: textTex(512, 200, (g, w, h) => { g.fillStyle = "#4d6595"; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 28) : g.rect(4, 4, w - 8, h - 8); g.fill(); g.fillStyle = "#f2f2f2"; g.font = `700 70px ${FONT}`; g.fillText("مختبر الحيوان", w / 2, 78); g.strokeStyle = "#f2f2f2"; g.lineWidth = 7; g.beginPath(); g.moveTo(330, 150); g.lineTo(190, 150); g.stroke(); g.beginPath(); g.moveTo(178, 150); g.lineTo(210, 130); g.lineTo(210, 170); g.fill(); }) });
    M.exitSign = basic(0xffffff, { map: textTex(360, 150, (g, w, h) => {
      g.fillStyle = "#f7f7f5"; g.fillRect(0, 0, w, h); g.fillStyle = "#3d9a3a"; g.fillRect(w * 0.52, 18, w * 0.42, h - 30);
      g.fillStyle = "#fff"; g.beginPath(); g.arc(w * 0.66, 48, 10, 0, 7); g.fill(); g.lineWidth = 9; g.strokeStyle = "#fff"; g.lineCap = "round"; g.beginPath(); g.moveTo(w * 0.66, 62); g.lineTo(w * 0.63, 98); g.lineTo(w * 0.58, 124); g.moveTo(w * 0.63, 98); g.lineTo(w * 0.7, 120); g.moveTo(w * 0.65, 70); g.lineTo(w * 0.72, 88); g.moveTo(w * 0.65, 70); g.lineTo(w * 0.58, 86); g.stroke();
      g.fillStyle = "#fff"; g.fillRect(w * 0.82, 30, 4, h - 52); g.font = `700 22px Arial`; g.direction = "ltr"; g.fillStyle = "#3d9a3a"; g.fillText("EXIT", w * 0.85, 12);
      g.direction = "rtl"; g.fillStyle = "#2f8a2f"; g.font = `800 38px ${FONT}`; g.fillText("مخرج", w * 0.27, 46); g.fillText("طوارئ", w * 0.27, 92);
      g.strokeStyle = "#2f8a2f"; g.lineWidth = 8; g.beginPath(); g.moveTo(w * 0.08, 128); g.lineTo(w * 0.42, 128); g.stroke(); g.beginPath(); g.moveTo(w * 0.46, 128); g.lineTo(w * 0.38, 116); g.lineTo(w * 0.38, 140); g.fillStyle = "#2f8a2f"; g.fill();
    }) });
    M.adminPlate = basic(0xffffff, { map: textTex(360, 110, (g, w, h) => { g.fillStyle = "#e0bb5d"; g.fillRect(0, 0, w, h); g.strokeStyle = "#1a1a1a"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = "#121212"; g.font = `800 50px ${FONT}`; g.fillText("ادارة القسم", w / 2, h / 2 + 2); }) });
    M.plate05 = basic(0xffffff, { map: textTex(380, 170, (g, w, h) => { g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a7a52"; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = "#3a5a2a"; g.beginPath(); g.arc(w - 50, 52, 26, 0, 7); g.fill(); g.fillStyle = "#e9d58d"; g.beginPath(); g.arc(w - 50, 52, 12, 0, 7); g.fill(); g.fillStyle = "#161616"; g.font = `800 44px ${FONT}`; g.fillText("قسم علوم الحياة", w / 2 - 30, 60); g.direction = "ltr"; g.font = `700 46px Arial`; g.fillText("05E2", w / 2, 128); }) });
    M.blueSign = basic(0xffffff, { map: textTex(700, 330, (g, w, h) => { g.fillStyle = "#1d3f9a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 10; g.strokeRect(20, 20, w - 40, h - 40); g.fillStyle = "#fff"; g.font = `700 76px ${FONT}`; g.fillText("استراحة الطلبة", w / 2, 120); g.font = `700 62px ${FONT}`; g.fillText("كلية التربية للعلوم الصرفة", w / 2, 230); }) });
    M.whiteSign = basic(0xffffff, { map: textTex(900, 330, (g, w, h) => { g.fillStyle = "#f3f4f2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#20307a"; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = "#1c2d78"; g.font = `800 66px ${FONT}`; g.fillText("كلية التربية للعلوم الصرفة", w / 2, 62); g.fillText("قسم علوم الحياة", w / 2, 140); g.direction = "ltr"; g.font = `700 46px Arial`; g.fillText("College of Education for  Pure Sciences", w / 2, 212); g.fillText("Department of Biology", w / 2, 274); }) });
    M.fireInstr = basic(0xffffff, { map: textTex(200, 260, (g, w, h) => { g.fillStyle = "#c81e1e"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = `700 18px ${FONT}`; g.fillText("تعليمات استخدام مطفأة الحريق", w / 2, 24); for (let i = 0; i < 4; i++) { g.fillRect(16, 52 + i * 34, w * 0.5, 20); g.fillRect(w * 0.62, 50 + i * 34, 60, 24); } g.beginPath(); g.ellipse(w / 2, 220, 18, 26, 0, 0, 7); g.fill(); }) });
    M.tosot = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#c9322b"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8e2d4"; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = "#fff"; g.font = "900 46px Arial"; g.textAlign = "center"; g.fillText("TOSOT", w / 2, 64); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.2, 0); g.lineTo(w * 0.2, h); g.moveTo(w * 0.8, 0); g.lineTo(w * 0.8, h); g.stroke(); });
    M.tosotMat = lam(0xffffff, { map: M.tosot });
    M.clock = basic(0xffffff, { map: canvasTex(128, 128, (g, w) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = "#222"; g.stroke(); g.fillStyle = "#222"; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(64 + Math.cos(a) * 48 - 2, 64 + Math.sin(a) * 48 - 2, 4, 4); } g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); }), transparent: true });
    M.whiteboard = basic(0xfbfbf9);
    M.books = lam(0xffffff, { map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#3a2618"; g.fillRect(0, 0, w, h); const R = rng(31); for (let r = 0; r < 4; r++) { let x = 4; while (x < w - 6) { const bw = 6 + R() * 12, bh = 40 + R() * 18; g.fillStyle = ["#7a2733", "#1f4f9e", "#2f6a3a", "#c9a54a", "#5a3a22", "#e9e2cf", "#2b2b2b"][(R() * 7) | 0]; g.fillRect(x, r * 64 + 62 - bh, bw - 1, bh); x += bw; } g.fillStyle = "#5a3b26"; g.fillRect(0, r * 64 + 60, w, 4); } }) });
    M.leafGreen = lam(0xffffff, { map: leafTex("green"), transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
    M.leafOrange = lam(0xffffff, { map: leafTex("orange"), transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
    M.leafPurple = lam(0xffffff, { map: leafTex("purple"), transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
    M.foliage = lam(0xffffff, { map: leafTex("tree"), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    M.frond = lam(0xffffff, { map: leafTex("palm"), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    ledTex = textTex(2048, 128, (g, w, h) => { g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff3b2f"; g.shadowColor = "#ff2a1a"; g.shadowBlur = 14; g.font = `700 78px ${FONT}`; g.fillText("أهلاً بكم في كلية التربية للعلوم الصرفة – قسم علوم الحياة", w / 2, h / 2 + 4); g.shadowBlur = 0; g.fillStyle = "rgba(0,0,0,.45)"; for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, h); for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2); });
    ledTex.wrapS = THREE.RepeatWrapping; ledTex.repeat.set(0.5, 1);
  }

  /* ---------------------------------------------------------------
     المبنى حسب المخطط: الأرضيات والسقوف والجدران والنوافذ والدرج
  --------------------------------------------------------------- */
  const zr = r => (r.row === "N" ? [-1.45 - r.d, -1.45] : [1.45, 1.45 + r.d]);
  const roomsOf = (lvl, row) => ROOMS.filter(r => r.lvl === lvl && (!row || r.row === row));
  /* نافذة ألمنيوم بيضاء مع زجاج وستارة زيبرا من الداخل. s جهة الخارج */
  function winX(z, a, b, lvl, bottom, top, s, blind = true) {
    const y = lvl * FH;
    bx("glass", a, y + bottom, z - 0.01, b, y + top, z + 0.01);
    frameX("aluFrame", z, a, b, y + bottom, y + top, 0.05, 0.07); bx("aluFrame", a, y + bottom - 0.05, z - 0.07, b, y + bottom, z + 0.07);
    const m = (a + b) / 2; bx("aluFrame", m - 0.025, y + bottom, z - 0.045, m + 0.025, y + top, z + 0.045);
    bx("top", a - 0.06, y + bottom - 0.04, z - s * 0.2, b + 0.06, y + bottom, z - s * 0.04);
    if (blind) { bx("blinds", a, y + bottom + (top - bottom) * 0.32, z - s * 0.22 - 0.004, b, y + top + 0.1, z - s * 0.22 + 0.004); bx("white", a - 0.04, y + top + 0.08, z - s * 0.27, b + 0.04, y + top + 0.2, z - s * 0.16); }
  }
  function winZ(x, a, b, lvl, bottom, top, s, blind = true) {
    const y = lvl * FH;
    bx("glass", x - 0.01, y + bottom, a, x + 0.01, y + top, b);
    frameZ("aluFrame", x, a, b, y + bottom, y + top, 0.05, 0.07); bx("aluFrame", x - 0.07, y + bottom - 0.05, a, x + 0.07, y + bottom, b);
    const m = (a + b) / 2; bx("aluFrame", x - 0.045, y + bottom, m - 0.025, x + 0.045, y + top, m + 0.025);
    bx("top", x - s * 0.2, y + bottom - 0.04, a - 0.06, x - s * 0.04, y + bottom, b + 0.06);
    if (blind) { bx("blinds", x - s * 0.22 - 0.004, y + bottom + (top - bottom) * 0.32, a, x - s * 0.22 + 0.004, y + top + 0.1, b); bx("white", x - s * 0.27, y + top + 0.08, a - 0.04, x - s * 0.16, y + top + 0.2, b + 0.04); }
  }
  /* فتحات نوافذ الغرف على جدار خارجي يمتد من xa إلى xb */
  function roomWins(lvl, row, xa, xb) {
    const out = [];
    roomsOf(lvl, row).filter(r => r.x0 >= xa - 0.3 && r.x1 <= xb + 0.3 && r.id !== "u-20").forEach(r => {
      const W = r.x1 - r.x0, n = Math.max(1, Math.round(W / 3.2)), ww = r.type === "lab" ? 1.45 : 1.3;
      const cls = r.type === "class";
      for (let i = 0; i < n; i++) { const c = r.x0 + W * (i + 0.5) / n; out.push({ a: c - ww / 2, b: c + ww / 2, bottom: cls ? 1.35 : 1.1, top: 2.5 }); }
    });
    return out;
  }
  function shell() {
    for (let lvl = 0; lvl < 2; lvl++) {
      const y = lvl * FH, fy = y + 0.004, cy = y + CH;
      // أرضيات وسقوف الغرف
      roomsOf(lvl).forEach(r => { const [za, zb] = zr(r); flat("floorTerr", r.x0, za, r.x1, zb, fy); flat(lvl ? "ceilU" : "ceilG", r.x0, za, r.x1, zb, cy, true); });
      // الممر
      const cx1 = lvl ? 21.98 : 16.12;
      flat("floorTerr", -16.12, -1.45, cx1, 1.45, fy); flat(lvl ? "ceilU" : "ceilG", -16.12, -1.25, cx1, 1.25, cy, true);
      // نوافذ وجدران خارجية — الصف الشمالي
      extX(-7.8, -22.28, -12.54, lvl, -1, roomWins(lvl, "N", -22.28, -12.54));
      extX(-7.3, -12.54, -3.0, lvl, -1, roomWins(lvl, "N", -12.54, -3.0));
      extX(-7.3, 3.0, 12.54, lvl, -1, roomWins(lvl, "N", 3.0, 12.54));
      extX(-7.8, 12.54, 22.28, lvl, -1, roomWins(lvl, "N", 12.54, 22.28));
      // الصف الجنوبي
      extX(7.8, -16.42, -10.25, lvl, 1, roomWins(lvl, "S", -16.42, -10.25));
      extX(7.3, -10.25, -3.0, lvl, 1, roomWins(lvl, "S", -10.25, -3.0));
      extX(7.3, 3.0, 10.25, lvl, 1, roomWins(lvl, "S", 3.0, 10.25));
      extX(7.8, 10.25, 16.42, lvl, 1, roomWins(lvl, "S", 10.25, 16.42));
      // الجداران الجانبيان للمدخل المكشوف
      extZ(-3.0, 5.55, 7.45, lvl, 1, lvl ? [] : [{ a: 6.85, b: 7.35, bottom: 1.0, top: 2.1 }]); extZ(3.0, 5.55, 7.45, lvl, -1);
      // واجهة المدخل العنابية: الباب في الأرضي والنافذة الكبيرة لمجانية التعليم في الأول
      extX(5.4, -3.0, 3.0, lvl, 1, [lvl ? { a: -1.95, b: 1.95, bottom: 0.55, top: 2.75 } : { a: -1.9, b: 1.9, bottom: 0, top: 2.55 }], "maroon");
      // نهايتا المبنى
      extZ(-22.13, -7.95, -1.2, lvl, -1, [{ a: -5.2, b: -3.9, bottom: 1.1, top: 2.5 }]);
      extZ(-16.27, -1.25, 7.95, lvl, -1, lvl ? [{ a: -0.6, b: 0.6, bottom: 0.9, top: 2.45 }, { a: 3.9, b: 5.2, bottom: 1.1, top: 2.5 }] : [{ a: -0.68, b: 0.68, top: 2.42 }, { a: 3.9, b: 5.2, bottom: 1.35, top: 2.5 }]);
      if (lvl === 0) {
        extZ(22.13, -7.95, -1.2, 0, 1, [{ a: -5.2, b: -3.9, bottom: 1.1, top: 2.5 }]);
        extZ(16.27, -1.25, 7.95, 0, 1, [{ a: -0.68, b: 0.68, top: 2.42 }, { a: 3.9, b: 5.2, bottom: 1.35, top: 2.5 }]);
        extX(-1.35, -22.28, -16.42, 0, 1, [{ a: -20.2, b: -18.9, bottom: 1.1, top: 2.5 }]);
        extX(-1.35, 16.42, 22.28, 0, 1, [{ a: 18.9, b: 20.2, bottom: 1.1, top: 2.5 }]);
      } else {
        extZ(22.13, -7.95, 1.45, 1, 1, [{ a: -0.6, b: 0.6, bottom: 0.9, top: 2.45 }, { a: -5.2, b: -3.9, bottom: 1.1, top: 2.5 }]);
        extZ(16.27, 1.45, 7.95, 1, 1, [{ a: 3.9, b: 5.2, bottom: 1.1, top: 2.5 }]);
        extX(-1.35, -22.28, -16.42, 1, 1, [{ a: -20.2, b: -18.9, bottom: 1.1, top: 2.5 }]);
        extX(1.35, 16.42, 22.28, 1, 1, [{ a: 18.6, b: 19.9, bottom: 1.1, top: 2.5 }]);
      }
      // الجدران الفاصلة بين الغرف
      [-12.54, 12.54].forEach(x => wallZ("wall", x, -7.95, -1.45, lvl, 0.2));
      [-3.0, 3.0].forEach(x => wallZ("wall", x, -7.45, -1.45, lvl, 0.2));
      [-10.25, 10.25].forEach(x => wallZ("wall", x, 1.45, 7.95, lvl, 0.2));
      [-3.0, 3.0].forEach(x => wallZ("wall", x, 1.45, 5.55, lvl, 0.2));
      if (lvl) { wallZ("wall", 7.66, -7.45, -1.45, 1, 0.2); wallZ("wall", 17.21, -7.95, -1.45, 1, 0.2); wallZ("wall", 5.4, 1.45, 7.45, 1, 0.2); }
      // جدار الممر الشمالي مع الأبواب
      const dn = roomsOf(lvl, "N").map(r => ({ a: r.door - 0.5, b: r.door + 0.5, top: 2.2 }));
      if (lvl === 0) { dn.push({ a: -2.72, b: -1.82, top: 2.15 }, { a: -1.5, b: -0.75, bottom: 1.05, top: 2.0 }, { a: 0.6, b: 2.9, top: 2.45 }); wallX("wall", -1.35, -16.42, 16.42, 0, 0.2, dn); }
      else { dn.push({ a: -2.9, b: -0.6, top: CH }); wallX("wall", -1.35, -16.42, 21.98, 1, 0.2, dn); }
      // جدار الممر الجنوبي
      const ds = r => ({ a: r.door - 0.5, b: r.door + 0.5, top: 2.2 });
      wallX("wall", 1.35, -16.42, -3.0, lvl, 0.2, roomsOf(lvl, "S").filter(r => r.x1 < -3).map(ds));
      if (lvl === 0) wallX("wall", 1.35, 3.0, 16.42, 0, 0.2, roomsOf(0, "S").filter(r => r.x0 > 3).map(ds));
      else wallX("alu", 1.35, 3.0, 16.42, 1, 0.12, roomsOf(1, "S").filter(r => r.x0 > 3).map(ds));
    }
    // أرضية وسقف المدخل (الطابق الأرضي) وقاعة مجانية التعليم فوقه
    flat("floorTerr", -2.9, 1.45, 2.9, 5.55, 0.004); flat("ceilG", -2.9, 1.25, 2.9, 5.25, CH, true);
    // مجانية التعليم: واجهة ألمنيوم وزجاج على الممر
    aluFront(-2.9, 2.9, 1.35, 1, [{ a: -2.6, b: -1.6 }]);
    // حاجز «إدارة القسم» عبر ممر الطابق الأول
    adminPartition();
    // سقف المنطقة المغطاة أسفل امتداد ممر الطابق الأول (شرقاً)
    bx("slab", 16.42, FH - 0.32, -1.2, 22.28, FH, 1.5); flat("ceilPlain", 16.42, -1.2, 22.28, 1.5, FH - 0.325, true);
    bx("ext", 21.85, 0, 1.1, 22.25, FH - 0.32, 1.5); solid(0, 21.85, 1.1, 22.25, 1.5);
    // السطح
    flat("roof", -22.28, -7.95, 22.28, -1.25, 2 * FH + 0.01); flat("roof", -16.42, -1.25, 16.42, 7.95, 2 * FH + 0.012); flat("roof", 16.42, -1.25, 22.28, 1.5, 2 * FH + 0.014);
    stairs();
    porch();
  }
  function aluFront(xa, xb, z, lvl, doors) {
    const y = lvl * FH;
    let cur = xa;
    const seg = (a, b) => { if (b - a < 0.02) return; bx("alu", a, y, z - 0.05, b, y + 1.05, z + 0.05); bx("glassDark", a, y + 1.05, z - 0.01, b, y + 2.3, z + 0.01); bx("alu", a, y + 2.3, z - 0.05, b, y + CH, z + 0.05); for (let x = a; x <= b + 0.01; x += 1.0) bx("aluFrame", x - 0.03, y + 1.05, z - 0.04, x + 0.03, y + 2.3, z + 0.04); bx("aluFrame", a, y + 1.02, z - 0.06, b, y + 1.08, z + 0.06); solid(lvl, a, z - 0.06, b, z + 0.06); };
    doors.forEach(d => { seg(cur, d.a); bx("alu", d.a, y + 2.2, z - 0.05, d.b, y + CH, z + 0.05); frameX("aluFrame", z, d.a, d.b, y, y + 2.2, 0.04, 0.06); cur = d.b; });
    seg(cur, xb);
  }
  function adminPartition() {
    const y = FH, x = ADMIN_X, da = -1.05, db = -0.1;
    const seg = (a, b) => { bx("alu", x - 0.05, y, a, x + 0.05, y + 1.05, b); bx("glassDark", x - 0.01, y + 1.05, a, x + 0.01, y + 2.3, b); bx("alu", x - 0.05, y + 2.3, a, x + 0.05, y + CH, b); bx("aluFrame", x - 0.06, y + 1.02, a, x + 0.06, y + 1.08, b); solid(1, x - 0.06, a, x + 0.06, b); };
    seg(-1.25, da); seg(db, 1.25); bx("alu", x - 0.05, y + 2.2, da, x + 0.05, y + CH, db); frameZ("aluFrame", x, da, db, y, y + 2.2, 0.04, 0.06);
    // باب ألمنيوم مفتوح إلى الداخل
    bx("alu", x + 0.06, y + 0.01, da - 0.02, x + 0.96, y + 2.16, da + 0.02);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.16), MAT.adminPlate); pl.position.set(x - 0.065, y + 2.42, (da + db) / 2); pl.rotation.y = -Math.PI / 2; scene.add(pl);
    const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.18), MAT.exitSign); ex.position.set(x - 0.065, y + 2.62, 0.75); ex.rotation.y = -Math.PI / 2; scene.add(ex);
  }

  /* الدرج: شوط أول من الممر شمالاً إلى البسطة، ثم شوط ثانٍ جنوباً إلى الطابق الأول */
  function stairs() {
    for (let i = 1; i <= 10; i++) {
      const za = -1.6 - (i - 1) * RUN, zb = -1.6 - i * RUN, top = i * RISE;
      bx("marble", 0.6, 0, zb, 2.9, top, za);
      bx("black", 2.885, top, zb, 2.9, top + 0.11, za); bx("black", 0.6, top, zb, 0.615, top + 0.11, za);
    }
    flat("floorTerr", 0.6, -1.6, 2.9, -1.45, 0.004);
    bx("marble", -2.9, 0, -7.15, 2.9, 1.85, -4.6);
    for (let j = 1; j <= 10; j++) {
      const za = -4.6 + (j - 1) * RUN, zb = -4.6 + j * RUN, top = 1.85 + j * RISE;
      bx("marble", -2.9, top - 0.3, za, -0.6, top, zb);
      bx("black", -2.9, top, za, -2.885, top + 0.11, zb); bx("black", -0.615, top, za, -0.6, top + 0.11, zb);
    }
    flat("marble", -2.9, -1.6, -0.6, -1.45, FH + 0.004);
    // جدار الوسط بين الشوطين (يرتفع حتى السقف)
    bx("core", -0.6, 0, -4.6, 0.6, 2 * FH, -1.45); solid(0, -0.6, -4.6, 0.6, -1.45); solid(1, -0.6, -4.6, 0.6, -1.45);
    // الجدار الشمالي للدرج بارتفاع الطابقين مع نافذتي البسطة
    const sw = [{ a: -2.6, b: -1.9, bottom: 2.85, top: 4.1 }, { a: 1.9, b: 2.6, bottom: 2.85, top: 4.1 }];
    wallX("wallW", -7.21, -3.0, 3.0, 0, 0.12, sw, true, 0, 2 * FH);
    wallX("ext", -7.36, -3.15, 3.15, 0, 0.18, sw, false, 0, 2 * FH + 0.75);
    sw.forEach(h => { bx("glass", h.a, h.bottom, -7.31, h.b, h.top, -7.29); frameX("aluFrame", -7.3, h.a, h.b, h.bottom, h.top, 0.05, 0.07); bx("aluFrame", h.a, h.bottom - 0.05, -7.37, h.b, h.bottom, -7.23); bx("white", h.a - 0.05, h.top + 0.05, -7.15, h.b + 0.05, h.top + 0.18, -7.0); bx("blinds", h.a, h.top - 0.35, -7.08, h.b, h.top + 0.05, -7.07); });
    flat("ceilPlain", -2.9, -7.15, 2.9, -1.6, FH + CH, true);
    // درابزين على الجدران
    const rail = (x, z0, z1, y0, y1) => { const d = new THREE.Vector3(0, y1 - y0, z1 - z0), g = new THREE.CylinderGeometry(0.022, 0.022, d.length(), 8).toNonIndexed(); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2); (BATCH.steel = BATCH.steel || []).push(g); };
    rail(2.82, -1.6, -4.6, 0.95, 1.68 + 0.95); rail(-2.82, -4.6, -1.6, 1.85 + 0.95, FH + 0.92);
    // لوحة جامعة تكريت على جدار البسطة مع إنارة فلورسنت
    pic(MAT.ph_board_univ, 2.55, 1.72, 0, 1.85 + 1.62, -7.12, 0, "white", 0.04);
    bx("white", -0.65, 1.85 + 2.7, -7.15, 0.65, 1.85 + 2.78, -7.07); bx("light", -0.6, 1.85 + 2.69, -7.12, 0.6, 1.85 + 2.7, -7.08);
    // نبات صناعي على البسطة
    plant(-2.45, 1.85, -6.75, "green", 1.1);
    // صندوق إطفاء AL-ZAN ومطفأة على جدار الشوط الأول (كما في الصورة)
    pic(MAT.ph_alzan, 0.62, 0.86, 2.88, 1.45, -1.95, -Math.PI / 2, "white", 0.1);
    extinguisher(2.83, 1.0, -2.55, -Math.PI / 2);
    // لوحة خشبية مشبّكة على جدار الوسط
    pic(MAT.latWin, 0.7, 0.5, 0.62, 1.55, -2.4, Math.PI / 2, "doorDark", 0.05);
    // في الطابق الأول: مخطط الطابق الملوّن على الجدار الأيسر للنازل، ومخطط الخطوط مع «مخرج طوارئ» على الجدار المقابل
    pic(MAT.ph_plan_upper_color, 1.7, 0.74, -2.88, FH + 1.45, -2.6, Math.PI / 2, "frameBlack", 0.04);
    pic(MAT.ph_plan_upper_line, 1.55, 0.64, -0.62, FH + 1.6, -2.55, -Math.PI / 2, null);
    const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.15), MAT.exitSign); ex.position.set(-0.62, FH + 0.95, -2.55); ex.rotation.y = -Math.PI / 2; scene.add(ex);
  }

  /* المدخل المكشوف أمام الباب: أرضية حجر، درجة، أعمدة وجدران قصيرة */
  function porch() {
    bx("stone", -2.9, GY, 5.55, 2.9, 0, 10.0); flat("floorPorch", -2.85, 5.55, 2.85, 10.0, 0.004);
    [-1, 1].forEach(k => {
      bx("ext", k * 3.15 - 0.17, GY, 7.45, k * 3.15 + 0.17, 0.95, 9.6); solid(0, k * 3.15 - 0.2, 7.45, k * 3.15 + 0.2, 9.6);
      bx("ext", k * 3.2 - 0.27, GY, 9.6, k * 3.2 + 0.27, 3.4, 10.15); solid(0, k * 3.2 - 0.3, 9.6, k * 3.2 + 0.3, 10.15);
    });
    // الأبواب الخشبية المشبّكة الأربعة (الوسطيان مفتوحان للداخل)
    const y0 = 0, h = 2.42, lw = 0.95, z = 5.4;
    bx("doorDark", -1.9, h, z - 0.08, 1.9, 2.55, z + 0.08);
    [[-1.9, -0.95], [0.95, 1.9]].forEach(([a, b]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(b - a, h), MAT.ph_ent_panel); p.position.set((a + b) / 2, y0 + h / 2, z + 0.07); scene.add(p); const q = p.clone(); q.rotation.y = Math.PI; q.position.z = z - 0.07; scene.add(q); bx("doorDark", a, 0, z - 0.05, b, 0.02, z + 0.05); solid(0, a, z - 0.1, b, z + 0.1); });
    [-1, 1].forEach(k => { const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, lw), [MAT.ph_ent_door, MAT.ph_ent_door, MAT.doorDark, MAT.doorDark, MAT.doorDark, MAT.doorDark]); leaf.position.set(k * 0.92, y0 + h / 2, z - 0.05 - lw / 2); scene.add(leaf); });
    frameX("doorDark", z, -1.9, 1.9, 0, 2.55, 0.06, 0.1);
    // اللوحة السوداء والذهبية فوق الباب، والمصباحان، ولوحة 05E2
    pic(MAT.ph_entrance_sign, 2.7, 0.92, 0, 3.08, 5.6, 0, "gold", 0.05);
    [-1.75, 1.75].forEach(x => { bx("white", x - 0.06, 2.62, 5.56, x + 0.06, 2.84, 5.64); });
    const p05 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.27), MAT.plate05); p05.position.set(2.45, 1.98, 5.6); scene.add(p05);
    // نافذة مجانية التعليم الكبيرة فوق المدخل (من صورة الواجهة)
    const w = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 2.2), MAT.ph_ent_window); w.position.set(0, FH + 1.65, 5.555); scene.add(w);
    // الجدار الغربي للمدخل: نافذة صغيرة ولوحة إعلانات وصندوق أصفر (كما في الصورة)
    winZ(-3.0, 6.85, 7.35, 0, 1.0, 2.1, 1, false);
    bx("woodDark", -2.85, 1.05, 6.15, -2.82, 1.95, 6.7); bx("paper", -2.82, 1.1, 6.2, -2.81, 1.9, 6.65);
    bx("yellow", -2.85, 1.05, 5.7, -2.63, 1.42, 6.02);
  }

  /* ---------------------------------------------------------------
     العناصر المتكررة (تُرسم دفعة واحدة)
  --------------------------------------------------------------- */
  function cross(w, h, n = 3) { const list = []; for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.rotateY(i * Math.PI / n); list.push(g); } return mg(list); }
  function instances() {
    const M = MAT;
    defInst("panel", new THREE.PlaneGeometry(0.58, 0.58).rotateX(Math.PI / 2), M.light);
    defInst("downH", new THREE.BoxGeometry(0.36, 0.04, 0.36), M.black);
    defInst("downL", new THREE.CircleGeometry(0.115, 20).rotateX(Math.PI / 2).translate(0, -0.021, 0), M.lightWarm);
    defInst("tubeH", new THREE.BoxGeometry(1.2, 0.04, 0.32), M.white);
    defInst("tubeL", new THREE.PlaneGeometry(1.12, 0.24).rotateX(Math.PI / 2).translate(0, -0.021, 0), M.light);
    // مقعد خشبي دائري بأرجل مائلة
    const sw = [new THREE.CylinderGeometry(0.17, 0.17, 0.04, 18).translate(0, 0.66, 0)];
    for (let k = 0; k < 4; k++) { const g = new THREE.BoxGeometry(0.03, 0.68, 0.03); g.rotateZ(0.09); g.translate(0.14, 0.33, 0); g.rotateY(k * Math.PI / 2 + 0.785); sw.push(g); }
    sw.push(new THREE.TorusGeometry(0.15, 0.01, 4, 16).rotateX(Math.PI / 2).translate(0, 0.25, 0));
    defInst("stoolW", mg(sw), M.wood);
    // مقعد أزرق مبطّن بقاعدة كروم
    defInst("stoolBs", new THREE.CylinderGeometry(0.18, 0.17, 0.08, 18).translate(0, 0.62, 0), M.stoolBlue);
    const sb = [new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8).translate(0, 0.3, 0), new THREE.TorusGeometry(0.16, 0.01, 4, 16).rotateX(Math.PI / 2).translate(0, 0.28, 0)];
    for (let k = 0; k < 5; k++) { const g = new THREE.BoxGeometry(0.3, 0.025, 0.035).translate(0.15, 0.03, 0); g.rotateY(k * 1.2566); sb.push(g); }
    defInst("stoolBb", mg(sb), M.chrome);
    // كرسي قاعة بذراع كتابة: مقعد برتقالي، هيكل أسود، لوح خشبي
    defInst("chS", mg([new THREE.BoxGeometry(0.44, 0.04, 0.42).translate(0, 0.45, 0), new THREE.BoxGeometry(0.42, 0.34, 0.03).translate(0, 0.7, -0.2).rotateX(0)]), M.chairSeat);
    const cf = [new THREE.BoxGeometry(0.025, 0.36, 0.025).translate(0.25, 0.56, 0.0)];
    for (const lx of [-0.2, 0.2]) for (const lz of [-0.18, 0.18]) cf.push(new THREE.BoxGeometry(0.025, 0.45, 0.025).translate(lx, 0.225, lz));
    for (const lx of [-0.2, 0.2]) cf.push(new THREE.BoxGeometry(0.025, 0.42, 0.025).translate(lx, 0.66, -0.2));
    cf.push(new THREE.BoxGeometry(0.44, 0.02, 0.02).translate(0, 0.06, 0.18), new THREE.BoxGeometry(0.44, 0.02, 0.02).translate(0, 0.06, -0.18));
    defInst("chF", mg(cf), M.chairFrame);
    defInst("chT", new THREE.BoxGeometry(0.3, 0.025, 0.46).translate(0.26, 0.74, 0.08), M.chairTab);
    // كرسي مكتب أسود
    const oc = [new THREE.BoxGeometry(0.5, 0.08, 0.48).translate(0, 0.48, 0), new THREE.BoxGeometry(0.46, 0.55, 0.07).translate(0, 0.85, -0.22), new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8).translate(0, 0.25, 0)];
    for (let k = 0; k < 5; k++) { const g = new THREE.BoxGeometry(0.3, 0.03, 0.04).translate(0.15, 0.05, 0); g.rotateY(k * 1.2566); oc.push(g); }
    defInst("offC", mg(oc), M.officeChair);
    // نباتات صناعية (كما في الممرات والمدخل)
    defInst("pot", mg([new THREE.CylinderGeometry(0.13, 0.1, 0.32, 14).translate(0, 0.16, 0)]), M.pot || M.white);
    defInst("plantG", cross(0.62, 1.15), M.leafGreen); defInst("plantO", cross(0.5, 1.25), M.leafOrange); defInst("plantP", cross(0.6, 1.0), M.leafPurple);
    defInst("extR", mg([new THREE.CylinderGeometry(0.075, 0.075, 0.48, 14).translate(0, 0.24, 0), new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.48, 0)]), M.red);
    defInst("extB", mg([new THREE.BoxGeometry(0.05, 0.1, 0.12).translate(0, 0.58, 0.02), new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6).translate(0.07, 0.36, 0.06)]), M.black);
    defInst("bell", new THREE.CylinderGeometry(0.075, 0.075, 0.06, 18).rotateX(Math.PI / 2), M.red);
    defInst("fireBall", new THREE.SphereGeometry(0.17, 16, 12), M.red, "fireball");
    defInst("rod", new THREE.CylinderGeometry(0.01, 0.01, 0.45, 6).translate(0, 0.22, 0), M.metal);
    defInst("binR", new THREE.CylinderGeometry(0.2, 0.17, 0.62, 14).translate(0, 0.31, 0), M.red);
    defInst("binY", new THREE.CylinderGeometry(0.2, 0.17, 0.62, 14).translate(0, 0.31, 0), M.yellow);
    defInst("trunk", new THREE.CylinderGeometry(0.13, 0.22, 3.4, 8).translate(0, 1.7, 0), M.trunk);
    defInst("canopy", cross(4.2, 3.6, 4), M.foliage);
    defInst("shrub", cross(1.4, 1.0, 3), M.foliage);
    defInst("palmT", new THREE.CylinderGeometry(0.2, 0.26, 5.5, 8).translate(0, 2.75, 0), M.trunk);
    const fr = []; for (let k = 0; k < 10; k++) { const g = new THREE.PlaneGeometry(0.9, 2.8); g.translate(0, 1.4, 0); g.rotateX(-1.0 - (k % 2) * 0.35); g.rotateY(k * 0.628); g.translate(0, 5.5, 0); fr.push(g); }
    defInst("palmF", mg(fr), M.frond);
    const tap = [new THREE.CylinderGeometry(0.015, 0.015, 0.36, 8).translate(0, 0.18, -0.17)]; const arc = new THREE.TorusGeometry(0.1, 0.013, 6, 12, Math.PI); arc.rotateY(Math.PI / 2); arc.translate(0, 0.36, -0.07); tap.push(arc);
    defInst("tap", mg(tap), M.steel);
    // مجهر بغطاء قماش أزرق وبيج (كما على مصاطب المختبر)
    defInst("covered", mg([new THREE.CylinderGeometry(0.17, 0.24, 0.42, 10).translate(0, 0.21, 0), new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.42, 0)]), M.cover, "microscope");
  }
  function plant(x, y, z, kind = "green", s = 1, ry) {
    addInst("pot", x, y, z, 0, s, s, s);
    addInst(kind === "orange" ? "plantO" : kind === "purple" ? "plantP" : "plantG", x, y + 0.26 * s, z, ry == null ? x * 3.1 + z : ry, s, s, s);
  }
  function extinguisher(x, y, z, ry = 0) { addInst("extR", x, y, z, ry); addInst("extB", x, y, z, ry); }
  function planeAt(mat, w, h, x, y, z, ry) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); return p; }
  /* لوحة باب معلّقة عمودياً على الجدار (تُقرأ من الجهتين) */
  function flagPlate(mat, x, y, zWall, s) {
    const zc = zWall - s * 0.3;
    bx("gold", x - 0.012, y - 0.08, zc - 0.26, x + 0.012, y + 0.08, zc + 0.26);
    bx("black", x - 0.02, y - 0.09, zWall - s * 0.04, x + 0.02, y + 0.09, zWall);
    planeAt(mat, 0.52, 0.152, x + 0.013, y, zc, Math.PI / 2); planeAt(mat, 0.52, 0.152, x - 0.013, y, zc, -Math.PI / 2);
  }
  /* لافتة معلّقة من السقف بسلسلتين */
  function hanging(mat, x, y, w, h, ry, lvl) {
    planeAt(mat, w, h, x + Math.sin(ry) * 0.012, y, 0, ry); planeAt(MAT.hangBack, w, h, x - Math.sin(ry) * 0.012, y, 0, ry + Math.PI);
    [-w * 0.32, w * 0.32].forEach(dz => bx("metal", x - 0.006, y + h / 2, dz - 0.006, x + 0.006, lvl * FH + CH, dz + 0.006));
  }

  /* ---------------------------------------------------------------
     الأبواب ولوحاتها وبوابات الحديد
  --------------------------------------------------------------- */
  function doors() {
    ROOMS.forEach(r => {
      const lvl = r.lvl, y = lvl * FH, s = r.row === "N" ? -1 : 1, zc = s * 1.25, zi = s * 1.45, a = r.door - 0.5, b = r.door + 0.5;
      const nearEast = Math.abs(r.x1 - b) < Math.abs(a - r.x0), hx = nearEast ? b - 0.03 : a + 0.03;
      if (r.alu) {
        frameX("aluFrame", zc + s * 0.04, a, b, y, y + 2.2, 0.04, 0.07);
        bx("alu", hx - 0.025, y + 0.01, zi + s * 0.02, hx + 0.025, y + 2.15, zi + s * 0.95);
      } else {
        const up = lvl === 1, fk = up ? "frameDark" : "cream";
        frameX(fk, zc, a, b, y, y + 2.2, 0.09, 0.035); frameX(fk, zi, a, b, y, y + 2.2, 0.07, 0.03);
        const lk = up ? "doorDark" : r.type === "class" ? "creamDoor" : "doorBrown";
        bx(lk, hx - 0.022, y + 0.01, zi + s * 0.02, hx + 0.022, y + 2.15, zi + s * 0.96);
        bx("handle", hx - 0.06, y + 1.0, zi + s * 0.82, hx + 0.06, y + 1.03, zi + s * 0.9);
        if (r.type === "lab" && lvl === 0) {
          // البوابة الحديدية الكريمية مفتوحة على جدار الممر (كما في الصور)
          const gx = nearEast ? a - 0.55 : b + 0.55; planeAt(MAT.grille, 1.02, 2.3, gx, y + 1.17, zc - s * 0.07, 0);
          bx("cream", (nearEast ? a : b) - 0.03, y, zc - s * 0.1, (nearEast ? a : b) + 0.03, y + 2.3, zc - s * 0.02);
        }
      }
      const pname = r.plate || r.name;
      flagPlate(MAT.plate(pname, r.code), nearEast ? a - 0.35 : b + 0.35, y + 2.42, zc, s);
    });
  }

  /* ---------------------------------------------------------------
     الممرات والمدخل: الإنارة واللوحات والنباتات وطفايات الحريق
  --------------------------------------------------------------- */
  function corridors() {
    // إنارة الممر الأرضي: ألواح مربعة وكشافات دائرية بإطار أسود بالتناوب
    let k = 0; for (let x = -15.0; x <= 15.01; x += 2.4, k++) { if (Math.abs(x) < 3.2) continue; if (k % 2) { addInst("downH", x, CH - 0.02, 0); addInst("downL", x, CH - 0.02, 0); } else addInst("panel", x, CH - 0.012, 0); }
    [[-1.3, 2.3], [1.3, 2.3], [-1.3, 4.4], [1.3, 4.4], [0, 0]].forEach(([x, z]) => { addInst("downH", x, CH - 0.02, z); addInst("downL", x, CH - 0.02, z); });
    addInst("panel", 0, CH - 0.012, 3.3);
    // ممر الطابق الأول: ألواح مربعة وكشافات طولية
    k = 0; for (let x = -15.0; x <= 21.4; x += 2.4, k++) { if (k % 2) { addInst("tubeH", x, FH + CH - 0.02, 0, Math.PI / 2); addInst("tubeL", x, FH + CH - 0.02, 0, Math.PI / 2); } else addInst("panel", x, FH + CH - 0.012, 0); }

    // اللافتتان المعلّقتان (النص كما هو في صور الممر)
    hanging(MAT.hangW, -4.9, 2.62, 1.45, 0.64, Math.PI / 2, 0);
    hanging(MAT.hangE, 4.9, 2.62, 1.45, 0.64, -Math.PI / 2, 0);
    hanging(MAT.blueZoo, 12.0, 2.78, 0.82, 0.32, -Math.PI / 2, 0);
    // لافتات «مخرج طوارئ» فوق بابي الطوارئ وبابا الطوارئ الخشبيان المشبّكان
    [-1, 1].forEach(k2 => {
      planeAt(MAT.exitSign, 0.42, 0.18, k2 * 16.11, 2.62, 0, -k2 * Math.PI / 2);
      planeAt(MAT.ph_exit_door, 1.36, 2.42, k2 * 16.115, 1.21, 0, -k2 * Math.PI / 2);
      frameZ("doorDark", k2 * 16.12, -0.68, 0.68, 0, 2.42, 0.05, 0.04);
      solid(0, k2 * 16.12 - 0.1, -0.7, k2 * 16.12 + 0.1, 0.7);
      plant(k2 * 15.6, 0, -0.95, "green", 1.05); plant(k2 * 15.6, 0, 0.95, "orange", 1.0);
    });
    // كاميرا مراقبة قرب نهاية الممر الشرقية
    bx("white", 15.3, CH - 0.12, -1.2, 15.42, CH, -1.08); bx("black", 15.25, CH - 0.2, -1.18, 15.45, CH - 0.12, -1.1);

    // لوحات الممر الأرضي (صور حقيقية من القسم)
    const N = -1.235, S = 1.235;
    pic(MAT.ph_notice, 1.25, 0.97, -6.7, 1.6, N, 0, null);
    pic(MAT.ph_safety, 0.45, 0.64, -7.85, 1.62, N, 0, "gold", 0.03);
    pic(MAT.ph_cert, 0.4, 0.54, -8.55, 1.62, N, 0, "frameBlack", 0.03);
    pic(MAT.ph_ppe, 0.82, 0.52, 6.9, 1.62, N, 0, null);
    pic(MAT.ph_safety, 0.45, 0.64, 8.05, 1.62, N, 0, "gold", 0.03);
    pic(MAT.ph_evac, 0.62, 0.45, -6.0, 1.6, S, Math.PI, "gold", 0.03);
    pic(MAT.ph_evac, 0.62, 0.45, 6.0, 1.6, S, Math.PI, "gold", 0.03);
    pic(MAT.ph_cert, 0.4, 0.54, -13.0, 1.6, S, Math.PI, "frameBlack", 0.03);
    // طفايات حريق وتعليماتها
    [[-9.5, N, 0], [9.6, N, 0], [-14.8, S, Math.PI], [14.8, S, Math.PI]].forEach(([x, z, ry]) => { extinguisher(x, 0.35, z + (z < 0 ? 0.09 : -0.09), ry); planeAt(MAT.fireInstr, 0.2, 0.26, x + 0.32, 1.25, z + (z < 0 ? 0.004 : -0.004), ry); });
    // نباتات صناعية بجانب الأبواب
    [[-12.6, -0.95, "green"], [-5.3, -0.95, "green"], [5.3, -0.95, "orange"], [12.6, -0.95, "green"], [-10.2, 0.95, "purple"], [10.2, 0.95, "green"], [-4.8, 0.95, "orange"]].forEach(([x, z, kd]) => plant(x, 0, z, kd, 0.95));

    // المدخل: الجدار الغربي — تعليمات انضباط الطلبة، صندوق الإطفاء، كراتين التكييف
    pic(MAT.ph_board_taalimat, 0.92, 1.42, -2.885, 1.72, 3.15, Math.PI / 2, null);
    pic(MAT.ph_alzan, 0.56, 0.78, -2.84, 1.45, 4.35, Math.PI / 2, "white", 0.1);
    extinguisher(-2.8, 0.95, 3.95, Math.PI / 2); addInst("bell", -2.85, 2.05, 4.0, Math.PI / 2);
    [[3.3, 0], [4.0, 0.06]].forEach(([z, r2]) => { const bxm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.7), MAT.tosotMat); bxm.position.set(-2.55, 0.31, z); bxm.rotation.y = Math.PI / 2 + r2; scene.add(bxm); solid(0, -2.9, z - 0.38, -2.2, z + 0.38); });
    plant(-2.5, 0, 4.85, "orange", 1.15);
    // الجدار الشرقي — لوحتا الطلبة الأوائل (المسائية والصباحية) وصندوق الإطفاء والجرس
    pic(MAT.ph_board_masaiya, 0.82, 1.05, 2.885, 1.78, 2.25, -Math.PI / 2, null);
    pic(MAT.ph_alzan, 0.56, 0.78, 2.84, 1.45, 3.35, -Math.PI / 2, "white", 0.1);
    extinguisher(2.8, 0.95, 2.95, -Math.PI / 2); addInst("bell", 2.85, 2.05, 2.92, -Math.PI / 2);
    bx("red", 2.86, 1.05, 2.86, 2.9, 1.15, 2.96);
    pic(MAT.ph_board_sabahiya, 0.82, 1.05, 2.885, 1.78, 4.35, -Math.PI / 2, null);
    plant(2.5, 0, 1.7, "green", 1.15); plant(2.45, 0, 4.95, "purple", 1.0);
    // جدار الدرج المقابل للمدخل: باب الغرفة تحت الدرج والشبّاك المشبّك ومخططا الطابق الأرضي
    planeAt(MAT.creamDoor, 0.9, 2.12, -2.27, 1.07, -1.255, 0); frameX("cream", -1.25, -2.72, -1.82, 0, 2.15, 0.09, 0.03);
    bx("handle", -1.95, 1.0, -1.25, -1.88, 1.04, -1.22);
    planeAt(MAT.latWin, 0.75, 0.95, -1.125, 1.525, -1.36, 0); frameX("doorDark", -1.25, -1.5, -0.75, 1.05, 2.0, 0.05, 0.04); bx("doorDark", -1.55, 1.0, -1.29, -0.7, 1.05, -1.2);
    pic(MAT.ph_plan_ground_line, 1.0, 0.43, -2.3, 2.6, -1.235, 0, null);
    pic(MAT.ph_plan_ground_color, 1.12, 0.49, -1.1, 2.6, -1.235, 0, "frameBlack", 0.03);
    plant(-3.0, 0, -0.95, "green", 1.05); plant(-1.65, 0, -0.95, "orange", 0.85);

    // الطابق الأول: براد عند النافذة الغربية، استنساخ ونباتات عند النافذة الشرقية
    const Y = FH;
    bx("metal", -16.0, Y, -0.9, -15.35, Y + 0.55, -0.25); bx("devWhite", -16.05, Y + 0.55, -0.95, -15.3, Y + 1.4, -0.2); bx("devBlue", -15.29, Y + 1.15, -0.8, -15.28, Y + 1.3, -0.5); solid(1, -16.1, -1.0, -15.25, -0.15);
    bx("devGrey", 21.25, Y, 0.35, 21.95, Y + 0.95, 1.1); bx("devDark", 21.25, Y + 0.95, 0.35, 21.95, Y + 1.1, 1.1); bx("devWhite", 21.3, Y + 1.1, 0.4, 21.9, Y + 1.18, 1.05); solid(1, 21.2, 0.3, 22.0, 1.15);
    plant(21.55, Y, -0.85, "orange", 1.1); plant(21.0, Y, -0.95, "purple", 0.9); plant(20.4, Y, 1.0, "green", 0.9);
    // حاجز إدارة القسم: حاوية نفايات حمراء ونبتتان صغيرتان
    bx("red", 2.25, Y, 0.55, 2.8, Y + 0.95, 1.15); bx("redDark", 2.25, Y + 0.95, 0.55, 2.8, Y + 1.02, 1.15); solid(1, 2.2, 0.5, 2.85, 1.2);
    plant(3.35, Y, 0.55, "green", 0.55); plant(3.35, Y, 1.0, "green", 0.55);
    // لوحات الطابق الأول
    pic(MAT.ph_cert, 0.42, 0.56, -6.2, Y + 1.6, N, 0, "gold", 0.03);
    bx("aluFrame", -7.6, Y + 1.05, N - 0.01, -6.7, Y + 2.05, N + 0.06); bx("paper", -7.52, Y + 1.13, N + 0.06, -6.78, Y + 1.97, N + 0.065);
    pic(MAT.ph_safety, 0.42, 0.6, -14.6, Y + 1.6, S, Math.PI, "gold", 0.03);
    extinguisher(-15.0, Y + 0.35, N + 0.09, 0); planeAt(MAT.fireInstr, 0.2, 0.26, -14.7, Y + 1.25, N + 0.004, 0);
    extinguisher(15.5, Y + 0.35, N + 0.09, 0);
    plant(-15.5, Y, 0.95, "green", 1.1); plant(-3.6, Y, -0.95, "green", 0.9);
    hanging(basic(0xffffff, { map: textTex(512, 160, (g, w, h) => { g.fillStyle = "#1f2a44"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8e8e8"; g.font = `700 64px ${FONT}`; g.fillText("مختبر الدكتوراه", w / 2, h / 2 + 4); }) }), -12.9, Y + 2.72, 0.9, 0.28, Math.PI / 2, 1);
  }

  /* ---------------------------------------------------------------
     محتوى الغرف. u على طول الغرفة (من غربها)، v من جدار الممر إلى الداخل
  --------------------------------------------------------------- */
  function ctx(r) {
    const N = r.row === "N", sv = N ? -1 : 1, y = r.lvl * FH, W = r.x1 - r.x0, D = r.d;
    const X = u => r.x0 + u, Z = v => (N ? -1.45 - v : 1.45 + v);
    const yaw = f => f === "in" ? (sv > 0 ? 0 : Math.PI) : f === "out" ? (sv > 0 ? Math.PI : 0) : f === "east" ? Math.PI / 2 : -Math.PI / 2;
    const doorU = r.door - r.x0, doorEast = doorU > W / 2;
    return {
      r, y, W, D, X, Z, yaw, doorU, doorEast, sv,
      box(key, u0, h0, v0, u1, h1, v1, col) { bx(key, X(u0), y + h0, Z(v0), X(u1), y + h1, Z(v1)); if (col) solid(r.lvl, X(u0), Z(v0), X(u1), Z(v1), 0.03); },
      inst(key, u, v, h, f = "in", sx = 1, sy = 1, sz = 1) { addInst(key, X(u), y + h, Z(v), typeof f === "number" ? f : yaw(f), sx, sy, sz); },
      dev(key, parts, u, v, h, f, col) { const o = device(key, parts, X(u), y + h, Z(v), yaw(f), r.lvl); if (col) { const sw = f === "east" || f === "west", cx = sw ? col[1] : col[0], cz = sw ? col[0] : col[1]; solid(r.lvl, X(u) - cx, Z(v) - cz, X(u) + cx, Z(v) + cz); } return o; },
      plane(mat, w, h, u, v, hh, f) { return planeAt(mat, w, h, X(u), y + hh, Z(v), yaw(f)); },
      pic(mat, w, h, u, v, hh, f, frame, fd) { return pic(mat, w, h, X(u), y + hh, Z(v), yaw(f), frame, fd); },
      // u للجدار البعيد عن الباب والقريب منه
      far: doorEast ? 0 : W, near: doorEast ? W : 0, fs: doorEast ? 1 : -1, // fs: اتجاه الداخل من جدار «far»
      fu(d) { return doorEast ? d : W - d; }, nu(d) { return doorEast ? W - d : d; }
    };
  }
  function ceilingLights(c, du = 2.4, dv = 2.2) {
    const nu = Math.max(1, Math.round((c.W - 0.8) / du)), nv = Math.max(1, Math.round((c.D - 0.6) / dv));
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) c.inst("panel", (i + 0.5) * c.W / nu, (j + 0.5) * c.D / nv, CH - 0.012);
  }
  function splitAC(c, u, v, f) {
    const ry = c.yaw(f), x = c.X(u), z = c.Z(v), y = c.y + 2.62;
    const g = new THREE.Group(); g.add(B(1.0, 0.3, 0.22, MAT.white), B(0.92, 0.03, 0.02, MAT.grey, 0, 0.04, 0.115)); g.position.set(x, y, z); g.rotation.y = ry; scene.add(compact(g));
  }
  function wallClock(c, u, v, f) { c.plane(MAT.clock, 0.3, 0.3, u, v, 2.55, f); }
  function sink(c, u, v) { c.box("steel", u - 0.25, 0.885, v - 0.2, u + 0.25, 0.902, v + 0.2); c.box("devDark", u - 0.2, 0.89, v - 0.15, u + 0.2, 0.905, v + 0.15); c.inst("tap", u, v + 0.06, 0.9, "in"); }
  /* مصطبة بخزانات سوداء لامعة وسطح أبيض (كما في مختبرات القسم) */
  function bench(c, u0, v0, u1, v1, axis) {
    c.box("cabBlack", u0, 0.08, v0, u1, 0.86, v1, true); c.box("black", u0 + 0.04, 0, v0 + 0.04, u1 - 0.04, 0.08, v1 - 0.04);
    c.box("top", u0 - 0.03, 0.86, v0 - 0.03, u1 + 0.03, 0.9, v1 + 0.03);
    if (axis === "u") { for (let u = u0 + 0.55; u < u1 - 0.1; u += 0.55) { c.box("seam", u - 0.006, 0.1, v0 - 0.006, u + 0.006, 0.84, v1 + 0.006); } }
    else { for (let v = v0 + 0.55; v < v1 - 0.1; v += 0.55) { c.box("seam", u0 - 0.006, 0.1, v - 0.006, u1 + 0.006, 0.84, v + 0.006); } }
  }
  function microscopeParts() {
    const M = MAT;
    return [B(0.18, 0.04, 0.24, M.black), B(0.06, 0.3, 0.06, M.devWhite, 0, 0.04, -0.08), B(0.14, 0.02, 0.13, M.black, 0, 0.15, 0.02), C(0.03, 0.08, M.black, 0, 0.2, 0.0), B(0.08, 0.08, 0.14, M.devWhite, 0, 0.3, -0.03), mm(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10), M.black, -0.022, 0.42, 0.03, -0.6), mm(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10), M.black, 0.022, 0.42, 0.03, -0.6)];
  }
  function microscope(c, u, v, f) { c.dev("microscope", microscopeParts(), u, v, 0.9, f); }
  /* خزانة علوية سوداء بأبواب زجاجية تُحفظ فيها المجاهر */
  function scopeCabinet(c, u, v0, v1, f) {
    const M = MAT, L = Math.abs(v1 - v0), parts = [];
    const dir = f === "east" ? 1 : -1; // جهة الواجهة
    parts.push(B(0.04, 0.85, L, M.cabBlack, -dir * 0.17, 0, 0), B(0.38, 0.03, L, M.cabBlack, 0, 0, 0), B(0.38, 0.03, L, M.cabBlack, 0, 0.82, 0), B(0.38, 0.02, L, M.cabBlack, 0, 0.42, 0));
    for (let k = 0; k <= Math.round(L / 0.5); k++) parts.push(B(0.38, 0.85, 0.02, M.cabBlack, 0, 0, -L / 2 + k * L / Math.round(L / 0.5)));
    parts.push(B(0.01, 0.8, L, M.glassCab, dir * 0.19, 0.03, 0));
    for (let k = 0; k < Math.round(L / 0.5); k++) { const z = -L / 2 + (k + 0.5) * L / Math.round(L / 0.5); parts.push(B(0.012, 0.16, 0.02, M.handle, dir * 0.2, 0.3, z + 0.18)); microscopeParts().forEach(p => { const q = p.clone(); q.scale.set(0.9, 0.9, 0.9); q.position.multiplyScalar(0.9); q.position.x += -dir * 0.02; q.position.y += 0.03; q.position.z += z; q.rotation.y = dir * Math.PI / 2; parts.push(q); }); }
    const g = new THREE.Group(); parts.forEach(p => g.add(p)); g.position.set(c.X(u), c.y + 1.45, c.Z((v0 + v1) / 2));
    // الجسم يمتد على z المحلي؛ نديره ليطابق v
    const out = compact(g); out.userData.device = "cabinet"; scene.add(out); PICK.push(out);
  }
  function oven(c, key, u, v, f, steel) { const M = MAT; c.dev(key, [B(0.62, 0.56, 0.52, steel ? M.steel : M.devWhite), B(0.62, 0.1, 0.52, M.devDark, 0, 0.56, 0), B(0.42, 0.34, 0.02, steel ? M.devGrey : M.devWhite, -0.04, 0.1, 0.265), B(0.1, 0.05, 0.02, M.devScreen, 0.12, 0.58, 0.265), B(0.03, 0.3, 0.03, M.devGrey, 0.24, 0.12, 0.28)], u, v, 0.9, f); }
  function hoodDev(c, u, v, f) { const M = MAT; c.dev("hood", [B(1.2, 0.85, 0.72, M.devWhite), B(0.05, 1.05, 0.72, M.devWhite, -0.575, 0.85, 0), B(0.05, 1.05, 0.72, M.devWhite, 0.575, 0.85, 0), B(1.2, 1.05, 0.05, M.devWhite, 0, 0.85, -0.335), B(1.1, 0.6, 0.02, M.glassDark, 0, 1.1, 0.35), B(1.2, 0.35, 0.72, M.devWhite, 0, 1.9, 0), B(1.1, 0.03, 0.55, M.lightWarm, 0, 1.87, 0), B(0.6, 0.3, 0.3, M.devGrey, 0, 2.25, -0.1)], u, v, 0, f, [0.62, 0.38]); }
  function floorAC(c, u, v, f) { const M = MAT; c.dev(null, [B(0.5, 1.8, 0.34, M.devWhite), B(0.4, 0.4, 0.02, M.devGrey, 0, 1.25, 0.175), B(0.4, 0.5, 0.02, M.white, 0, 0.6, 0.175)], u, v, 0, f, [0.28, 0.2]); }
  function teacherDesk(c, u, v, f) {
    c.dev(null, [B(1.3, 0.04, 0.68, MAT.woodDesk, 0, 0.72, 0), B(0.04, 0.72, 0.64, MAT.woodDark, -0.62, 0, 0), B(0.42, 0.72, 0.64, MAT.woodDark, 0.43, 0, 0), B(1.2, 0.5, 0.02, MAT.woodDark, 0, 0.22, 0.31), B(0.3, 0.22, 0.02, MAT.gold, -0.2, 0.76, 0.05), B(0.27, 0.19, 0.01, MAT.paper, -0.2, 0.775, 0.065)], u, v, 0, f, [0.68, 0.38]);
  }
  function stoolRow(c, u0, u1, v, step = 0.75) { let i = 0; for (let u = u0; u <= u1 + 0.01; u += step, i++) { if (i % 3 === 1) { c.inst("stoolBs", u, v, 0); c.inst("stoolBb", u, v, 0); } else c.inst("stoolW", u, v, 0, u * 2.3); } }

  function labRoom(r) {
    const c = ctx(r), W = c.W, D = c.D, M = MAT, sub = r.sub;
    const far = c.far, near = c.near, fs = c.fs;
    const fu = d => c.fu(d), nuu = d => c.nu(d);
    // مصطبة الجدار الخارجي (تحت النوافذ) مع مغاسل
    bench(c, 0.7, D - 0.68, W - 0.7, D, "u");
    const wins = roomWins(r.lvl, r.row, r.x0 - 0.1, r.x1 + 0.1).map(h => h.a + 0.65 - r.x0);
    wins.forEach((u, i) => { if (i % 2 === 0) sink(c, u, D - 0.36); });
    // المصطبة الجانبية البعيدة عن الباب مع خزانات المجاهر السوداء فوقها
    const fa = Math.min(far, far + fs * 0.66), fb = Math.max(far, far + fs * 0.66);
    bench(c, fa, 0.45, fb, D - 0.68, "v");
    scopeCabinet(c, far + fs * 0.2, 0.55, D - 0.9, fs > 0 ? "east" : "west");
    c.plane(M.ph_lab_posters, Math.min(4.6, D - 1.2), 0.66, far + fs * 0.05, (D - 0.3) / 2, 2.72, fs > 0 ? "east" : "west");
    // المصطبة الجانبية القريبة من الباب: أفران وحاضنات ورف لوحات
    const na = Math.min(near, near - fs * 0.66), nb = Math.max(near, near - fs * 0.66);
    bench(c, na, 1.55, nb, D - 0.68, "v");
    bx("black", c.X(near - fs * 0.32) - 0.33, c.y + 1.92, c.Z(1.6), c.X(near - fs * 0.32) + 0.33, c.y + 1.95, c.Z(D - 0.75));
    c.plane(M.ph_lab_posters, Math.min(3.8, D - 2.4), 0.5, near - fs * 0.05, (D + 0.8) / 2, 2.22, fs > 0 ? "west" : "east");
    // الجزيرة الوسطى البيضاء مع رفوف مفتوحة
    const iu0 = 2.1, iu1 = W - 2.1, iv0 = D * 0.5 - 0.55, iv1 = D * 0.5 + 0.55;
    c.box("cabBlack", iu0, 0.08, iv0, iu1, 0.86, iv1, true); c.box("top", iu0 - 0.04, 0.86, iv0 - 0.04, iu1 + 0.04, 0.9, iv1 + 0.04);
    for (let u = iu0; u <= iu1 + 0.01; u += (iu1 - iu0) / 3) c.box("shelfW", u - 0.02, 0.9, D * 0.5 - 0.2, u + 0.02, 1.75, D * 0.5 + 0.2);
    [1.3, 1.75].forEach(h => c.box("shelfW", iu0, h - 0.02, D * 0.5 - 0.2, iu1, h, D * 0.5 + 0.2));
    stoolRow(c, iu0 + 0.3, iu1 - 0.3, iv0 - 0.45); stoolRow(c, iu0 + 0.3, iu1 - 0.3, iv1 + 0.45);
    // جدار الممر: خزانة الأبخرة ومكيف عمودي وسبورة
    hoodDev(c, fu(1.35), 0.42, "in");
    floorAC(c, fu(2.4), 0.3, "in");
    c.box("whiteboard", fu(3.0) - (fs > 0 ? 0 : 2.0), 1.0, 0.0, fu(3.0) + (fs > 0 ? 2.0 : 0), 2.1, 0.03);
    c.box("metal", fu(3.0) - (fs > 0 ? 0 : 2.0) - 0.02, 0.97, 0.0, fu(3.0) + (fs > 0 ? 2.0 : 0) + 0.02, 1.0, 0.06);
    teacherDesk(c, fu(4.2), 1.3, "in"); c.inst("offC", fu(4.2), 0.72, 0, "in");
    // مطفأتان كرويتان في السقف ومطفأة يدوية وسلال
    [[W * 0.3, D * 0.3], [W * 0.7, D * 0.7]].forEach(([u, v]) => { c.inst("fireBall", u, v, CH - 0.62); c.inst("rod", u, v, CH - 0.45); });
    extinguisher(c.X(nuu(0.35)), c.y, c.Z(0.95), c.yaw("in"));
    c.inst("binR", nuu(0.4), 1.35, 0); c.inst("binY", nuu(0.4), 1.82, 0);
    // مجاهر على المصطبة البعيدة: أغلبها بأغطية القماش الزرقاء وبعضها مكشوف
    for (let k = 0, v = 0.85; v < D - 0.95; v += 0.62, k++) { if (k % 3 === 1) microscope(c, far + fs * 0.34, v, fs > 0 ? "east" : "west"); else c.inst("covered", far + fs * 0.34, v, 0.9); }
    ceilingLights(c);
    const benchNear = (i, n) => 1.95 + i * (D - 2.8) / Math.max(1, n - 1);
    const onNear = (key, parts, i, n) => c.dev(key, parts, near - fs * 0.34, benchNear(i, n), 0.9, fs > 0 ? "west" : "east");
    if (sub === "grad" || sub === "phd") {
      oven(c, "oven", near - fs * 0.34, 2.0, fs > 0 ? "west" : "east", true); oven(c, "incubator", near - fs * 0.34, 2.75, fs > 0 ? "west" : "east", false);
      c.dev("distiller", [B(0.36, 0.48, 0.3, M.devWhite), B(0.2, 0.06, 0.02, M.devScreen, 0, 0.36, 0.155), C(0.07, 0.22, M.devGlass, 0.0, 0.0, 0.26)], wins[1] != null ? wins[1] + 0.7 : W / 2, D - 0.36, 0.9, "out");
      c.dev("stirrer", [B(0.24, 0.1, 0.3, M.devBlue), B(0.2, 0.02, 0.2, M.steel, 0, 0.1, -0.03)], far + fs * 0.34, D - 1.3, 0.9, fs > 0 ? "east" : "west");
      c.dev(null, [B(0.9, 1.9, 0.45, M.steelCab), B(0.86, 1.2, 0.01, M.glass, 0, 0.62, 0.23), B(0.02, 0.2, 0.02, M.handle, 0.05, 0.95, 0.24)], fu(5.6), 0.28, 0, "in", [0.48, 0.25]);
      if (sub === "phd") { onNear("centrifuge", [C(0.22, 0.3, M.devWhite, 0, 0, 0, 20), C(0.2, 0.03, M.devGrey, 0, 0.3, 0, 20), B(0.12, 0.06, 0.02, M.devScreen, 0, 0.14, 0.22)], 2, 4); onNear("spectro", [B(0.6, 0.2, 0.42, M.devWhite), B(0.3, 0.07, 0.3, M.devGrey, -0.12, 0.2, -0.02), B(0.2, 0.15, 0.02, M.devDark, 0.17, 0.03, 0.215)], 3, 4); }
      else { c.dev(null, [mm(new THREE.CylinderGeometry(0.15, 0.15, 0.95, 14), M.devGrey, 0, 0.47, 0)], fu(2.95), 0.3, 0, "in", [0.18, 0.18]); }
    }
    if (sub === "env") {
      onNear("spectro", [B(0.62, 0.2, 0.42, M.devWhite), B(0.32, 0.07, 0.3, M.devGrey, -0.12, 0.2, -0.02), B(0.2, 0.15, 0.02, M.devDark, 0.17, 0.03, 0.215)], 0, 4);
      onNear("elisa", [B(0.42, 0.16, 0.38, M.devGrey), B(0.3, 0.06, 0.24, M.black, -0.04, 0.16, 0.0), B(0.1, 0.05, 0.02, M.devScreen, 0.13, 0.07, 0.195)], 1, 4);
      const tubes = []; for (let i = 0; i < 8; i++) tubes.push(C(0.016, 0.34, M.devGlass, -0.16 + (i % 4) * 0.105, 0.14, -0.05 + Math.floor(i / 4) * 0.1, 8));
      onNear("kjeldahl", [B(0.44, 0.14, 0.32, M.steel), B(0.44, 0.04, 0.3, M.steel, 0, 0.42, 0), B(0.03, 0.32, 0.03, M.steel, -0.2, 0.14, 0.12), B(0.03, 0.32, 0.03, M.steel, 0.2, 0.14, 0.12), ...tubes], 2, 4);
      onNear("tissue", [B(0.42, 0.24, 0.42, M.devWhite), C(0.3, 0.16, M.devDark, 0, 0.24, 0, 24), C(0.32, 0.06, M.devWhite, 0, 0.4, 0, 24, 0.26), B(0.22, 0.12, 0.02, M.devScreen, 0, 0.06, 0.215)], 3, 4);
      const ex = d => wins[0] != null ? Math.min(W - 1.2, 1.4 + d) : W / 2;
      c.dev("vitek", [B(0.95, 0.55, 0.5, M.devWhite), mm(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), M.devGrey, -0.18, 0.36, 0.255, Math.PI / 2), B(0.2, 0.14, 0.02, M.devScreen, 0.25, 0.36, 0.25)], ex(0.4), D - 0.36, 0.9, "out");
      c.dev("turb", [B(0.22, 0.12, 0.18, M.devDark), B(0.12, 0.05, 0.02, M.devScreen, 0, 0.05, 0.095), C(0.025, 0.08, M.devGlass, 0.06, 0.12, -0.03, 10)], ex(1.6), D - 0.36, 0.9, "out");
      c.dev("ph", [B(0.2, 0.07, 0.16, M.devWhite), B(0.1, 0.04, 0.02, M.devScreen, 0, 0.02, 0.085), C(0.008, 0.36, M.steel, -0.08, 0.07, -0.05, 8), B(0.16, 0.012, 0.012, M.steel, -0.02, 0.38, -0.05), C(0.045, 0.08, M.devGlass, 0.04, 0, 0.03, 12)], ex(2.2), D - 0.36, 0.9, "out");
      const jar = [B(1.0, 0.1, 0.32, M.devWhite), B(0.04, 0.55, 0.04, M.steel, -0.46, 0.1, -0.1), B(0.04, 0.55, 0.04, M.steel, 0.46, 0.1, -0.1), B(1.0, 0.12, 0.18, M.devWhite, 0, 0.6, -0.04)];
      for (let i = 0; i < 6; i++) { const x = -0.375 + i * 0.15; jar.push(C(0.055, 0.15, M.devGlass, x, 0.1, 0.04, 12), C(0.05, 0.1, M.water, x, 0.1, 0.04, 12), C(0.004, 0.36, M.steel, x, 0.26, 0.04, 6)); }
      c.dev("jar", jar, ex(3.4), D - 0.36, 0.9, "out");
      c.dev("bath", [B(0.5, 0.24, 0.32, M.steel), B(0.52, 0.02, 0.34, M.steel, 0, 0.24, 0), B(0.16, 0.12, 0.02, M.devBlue, 0.15, 0.06, 0.17)], ex(4.6), D - 0.36, 0.9, "out");
      c.dev("stirrer", [B(0.22, 0.1, 0.3, M.devWhite), B(0.2, 0.02, 0.2, M.steel, 0, 0.1, -0.03)], iu0 + 0.6, D * 0.5 - 0.3, 0.9, "in");
      c.dev("multistir", [B(0.75, 0.05, 0.28, M.devBlue), B(0.66, 0.012, 0.22, M.steel, 0, 0.05, 0)], (iu0 + iu1) / 2, D * 0.5 + 0.3, 0.9, "in");
      c.dev("overhead", [B(0.25, 0.03, 0.18, M.devDark), C(0.012, 0.62, M.steel, -0.08, 0.03, 0), B(0.13, 0.22, 0.13, M.devWhite, 0.02, 0.48, 0), C(0.005, 0.25, M.steel, 0.02, 0.24, 0)], iu1 - 0.5, D * 0.5 - 0.3, 0.9, "in");
      oven(c, "bod", fu(5.3), 0.36, "in", false);
      c.dev("autoclave", [C(0.24, 0.72, M.devWhite), C(0.25, 0.08, M.steel, 0, 0.72, 0, 20, 0.2), B(0.2, 0.25, 0.06, M.devDark, 0, 0.35, 0.24)], fu(6.1), 0.4, 0, "in", [0.3, 0.3]);
    }
    if (sub === "botany") {
      oven(c, "oven", near - fs * 0.34, 2.1, fs > 0 ? "west" : "east", true); oven(c, "incubator", near - fs * 0.34, 2.9, fs > 0 ? "west" : "east", false);
      for (let u = 1.2; u < W - 1.2; u += 1.1) { addInst("pot", c.X(u), c.y + 0.9, c.Z(D - 0.3), 0, 0.55, 0.55, 0.55); addInst("plantG", c.X(u), c.y + 1.05, c.Z(D - 0.3), u, 0.55, 0.45, 0.55); }
    }
    if (sub === "invert") {
      oven(c, "oven", near - fs * 0.34, 2.0, fs > 0 ? "west" : "east", true);
      // رف عينات محفوظة في قناني زجاجية
      const sh = []; for (let row = 0; row < 3; row++) { sh.push(B(0.32, 0.02, 1.6, MAT.shelfW, 0, row * 0.42, 0)); for (let i = 0; i < 6; i++) { sh.push(C(0.06, 0.24, MAT.devGlass, 0, row * 0.42 + 0.02, -0.65 + i * 0.26, 10), C(0.055, 0.17, MAT.jarLiquid, 0, row * 0.42 + 0.03, -0.65 + i * 0.26, 10), C(0.062, 0.03, MAT.black, 0, row * 0.42 + 0.26, -0.65 + i * 0.26, 10)); } }
      c.dev(null, sh, near - fs * 0.3, 3.4, 0.92, fs > 0 ? "west" : "east");
    }
    if (sub === "physio") {
      onNear("centrifuge", [C(0.22, 0.3, M.devWhite, 0, 0, 0, 20), C(0.2, 0.03, M.devGrey, 0, 0.3, 0, 20), B(0.12, 0.06, 0.02, M.devScreen, 0, 0.14, 0.22)], 0, 3);
      onNear("bath", [B(0.5, 0.24, 0.32, M.steel), B(0.52, 0.02, 0.34, M.steel, 0, 0.24, 0), B(0.16, 0.12, 0.02, M.devBlue, 0.15, 0.06, 0.17)], 1, 3);
      oven(c, "incubator", near - fs * 0.34, D - 1.2, fs > 0 ? "west" : "east", false);
    }
  }

  function classRoom(r) {
    const c = ctx(r), W = c.W, D = c.D, M = MAT;
    // الجدار الأمامي (جهة الباب): تلبيس خشبي وسبورة بيضاء ومكيف وساعة
    const bu = c.near, sgn = c.doorEast ? -1 : 1, f = c.doorEast ? "west" : "east";
    c.box("woodPanel", bu - (c.doorEast ? 0.04 : 0), 0.0, 0.0, bu + (c.doorEast ? 0 : 0.04), 2.2, D);
    c.box("whiteboard", bu + sgn * 0.04 - (c.doorEast ? 0.02 : 0), 1.0, D / 2 - 1.15, bu + sgn * 0.04 + (c.doorEast ? 0 : 0.02), 2.05, D / 2 + 1.15);
    c.box("metal", bu + sgn * 0.035 - 0.015, 0.97, D / 2 - 1.17, bu + sgn * 0.035 + 0.015, 1.0, D / 2 + 1.17);
    splitAC(c, bu + sgn * 0.12, D / 2, f); wallClock(c, bu + sgn * 0.05, D / 2 + 1.6, f);
    // منصة المحاضر الخشبية والمكتب
    c.dev(null, [B(0.55, 1.1, 0.45, M.woodDark), B(0.6, 0.05, 0.5, M.woodDesk, 0, 1.1, 0), B(0.4, 0.3, 0.02, M.gold, 0, 0.65, 0.23)], bu + sgn * 0.7, D / 2 + 1.75, 0, f, [0.3, 0.3]);
    c.dev(null, [B(1.3, 0.04, 0.65, M.woodDesk, 0, 0.72, 0), B(0.04, 0.72, 0.6, M.woodDark, -0.62, 0, 0), B(0.04, 0.72, 0.6, M.woodDark, 0.62, 0, 0), B(1.2, 0.45, 0.02, M.woodDark, 0, 0.25, -0.29)], bu + sgn * 1.25, D / 2 + 0.35, 0, f, [0.68, 0.36]);
    c.inst("offC", bu + sgn * 0.75, D / 2 + 0.35, 0, f === "east" ? Math.PI / 2 : -Math.PI / 2);
    // صفوف الكراسي بذراع الكتابة تواجه السبورة
    const ry = c.doorEast ? Math.PI / 2 : -Math.PI / 2;
    for (let du = 2.1; du < W - 0.6; du += 0.88) for (let v = 0.75; v < D - 0.5; v += 0.66) {
      const u = bu + sgn * du; if (Math.abs(u - c.doorU) < 0.8 && v < 1.2) continue;
      ["chS", "chF", "chT"].forEach(k => c.inst(k, u, v, 0, ry));
    }
    // مكيفان سقفيان
    [[W * 0.33, D / 2], [W * 0.75, D / 2]].forEach(([u, v]) => { c.box("white", u - 0.42, CH - 0.06, v - 0.42, u + 0.42, CH - 0.005, v + 0.42); c.box("grey", u - 0.3, CH - 0.065, v - 0.3, u + 0.3, CH - 0.06, v + 0.3); });
    ceilingLights(c, 2.4, 2.4);
  }

  function officeRoom(r) {
    const c = ctx(r), W = c.W, D = c.D, M = MAT, sub = r.sub;
    const desk = (u, v, f, pc = true) => {
      c.dev(null, [B(1.4, 0.04, 0.7, M.woodDesk, 0, 0.74, 0), B(0.04, 0.74, 0.66, M.woodDark, -0.66, 0, 0), B(0.45, 0.74, 0.66, M.woodDark, 0.47, 0, 0), B(1.3, 0.5, 0.02, M.woodDark, 0, 0.24, -0.33)].concat(pc ? [B(0.5, 0.32, 0.03, M.black, -0.15, 0.86, -0.18), B(0.1, 0.1, 0.1, M.black, -0.15, 0.76, -0.2), B(0.45, 0.02, 0.15, M.black, -0.15, 0.78, 0.05)] : []), u, v, 0, f, [0.72, 0.38]);
      c.inst("offC", u, v + (f === "in" ? -0.75 : 0.75), 0, f === "in" ? "in" : "out");
    };
    const bookcase = (u, v, f) => c.dev(null, [B(1.0, 2.0, 0.42, M.woodDark), B(0.9, 1.6, 0.01, M.books, 0, 0.3, 0.212), B(0.92, 1.0, 0.01, M.glass, 0, 0.95, 0.222), B(0.94, 0.03, 0.02, M.woodDark, 0, 0.92, 0.222), B(0.94, 0.03, 0.02, M.woodDark, 0, 1.43, 0.222)], u, v, 0, f, [0.52, 0.24]);
    const steelCab = (u, v, f) => c.dev(null, [B(0.9, 1.85, 0.45, M.steelCab), B(0.02, 1.7, 0.01, M.grey, 0, 0.08, 0.23), B(0.03, 0.15, 0.03, M.handle, 0.06, 0.95, 0.24)], u, v, 0, f, [0.47, 0.25]);
    const sofa = (u, v, len, f, mat) => c.dev(null, [B(len, 0.42, 0.75, mat), B(len, 0.45, 0.18, mat, 0, 0.42, -0.29), B(0.16, 0.25, 0.75, mat, -len / 2 + 0.08, 0.42, 0), B(0.16, 0.25, 0.75, mat, len / 2 - 0.08, 0.42, 0), B(len - 0.3, 0.08, 0.5, M.sofaBlue, 0, 0.42, 0.05)], u, v, 0, f, [len / 2, 0.4]);
    const far = c.far, fs = c.fs;
    splitAC(c, c.far + c.fs * 0.13, D / 2, c.fs > 0 ? "east" : "west");
    plant(c.X(c.nu(0.4)), c.y, c.Z(D - 0.45), "green", 0.9);
    if (sub === "head") {
      desk(W / 2 + 0.3, D - 1.6, "out", true);
      bookcase(W / 2 - 1.0, D - 0.25, "out"); bookcase(W / 2 + 0.05, D - 0.25, "out"); bookcase(W / 2 + 1.1, D - 0.25, "out");
      sofa(far + fs * 0.45, D * 0.45, 2.0, fs > 0 ? "east" : "west", M.sofaBeige);
      c.dev(null, [B(1.0, 0.42, 0.55, M.woodDark)], far + fs * 1.5, D * 0.45, 0, "in", [0.5, 0.3]);
      c.pic(MAT.gold, 0.5, 0.5, W / 2 + 0.3, D - 0.04, 2.5, "out", null);
      c.dev(null, [B(0.6, 1.5, 0.6, M.white), B(0.02, 0.5, 0.02, M.handle, 0.24, 0.8, 0.31)], c.doorU + (c.doorEast ? -1.0 : 1.0), 0.38, 0, "in", [0.32, 0.32]);
    } else if (sub === "sec") {
      desk(W / 2, D * 0.55, "out", true);
      sofa(W / 2, D - 0.5, 1.8, "out", M.sofaBlue);
      steelCab(c.far + c.fs * 0.3, 1.2, c.fs > 0 ? "east" : "west");
      c.dev(null, [B(0.45, 1.6, 0.5, M.white)], c.nu(0.35), 1.4, 0, "in", [0.25, 0.27]);
    } else if (sub === "exam") {
      c.dev(null, [B(2.4, 0.05, 1.1, M.woodDesk, 0, 0.74, 0), B(0.08, 0.74, 0.9, M.woodDark, -1.0, 0, 0), B(0.08, 0.74, 0.9, M.woodDark, 1.0, 0, 0)], W / 2, D / 2 + 0.3, 0, "in", [1.25, 0.6]);
      [-0.8, 0, 0.8].forEach(d => { c.inst("offC", W / 2 + d, D / 2 - 0.55, 0, "in"); c.inst("offC", W / 2 + d, D / 2 + 1.15, 0, "out"); });
      steelCab(0.55, D - 0.3, "out"); steelCab(1.5, D - 0.3, "out"); steelCab(W - 0.55, D - 0.3, "out");
      c.dev(null, [B(0.6, 0.8, 0.55, M.devGrey), C(0.06, 0.02, M.black, 0.1, 0.45, 0.28)], W - 1.4, D - 0.35, 0, "out", [0.32, 0.3]);
    } else if (sub === "rapp" || sub === "pg") {
      desk(Math.min(W - 1.0, 1.5), D * 0.45, "out"); if (W > 5) desk(W - 1.6, D * 0.45, "out");
      for (let u = 0.55; u < W - 0.4; u += 0.95) steelCab(u, D - 0.3, "out");
      c.dev(null, [B(0.55, 0.45, 0.45, M.devGrey), B(0.5, 0.1, 0.35, M.devDark, 0, 0.45, 0)], c.nu(0.5), 1.4, 0.75, "in");
      c.dev(null, [B(0.6, 0.75, 0.5, M.woodDark)], c.nu(0.5), 1.4, 0, "in", [0.32, 0.28]);
    } else if (sub === "free") {
      desk(W / 2, D * 0.55, "out", true); steelCab(0.6, D - 0.3, "out"); sofa(W - 1.2, D - 0.55, 1.6, "out", M.sofaBeige);
    } else {
      const n = W > 6 ? 3 : 2;
      for (let i = 0; i < n; i++) desk(0.95 + i * (W - 1.9) / Math.max(1, n - 1), D * 0.42 + (i % 2) * 0.9, "out", i % 2 === 0);
      bookcase(far + fs * 0.6, D - 0.25, "out"); steelCab(far + fs * 1.65, D - 0.3, "out");
      sofa(c.near - c.fs * 0.45, D - 1.6, 1.8, c.fs > 0 ? "west" : "east", M.sofaBeige);
    }
    wallClock(c, W / 2, 0.02, "in");
    ceilingLights(c, 2.4, 2.4);
  }
  function buildRoom(r) { if (r.type === "lab") labRoom(r); else if (r.type === "class") classRoom(r); else officeRoom(r); }

  /* ---------------------------------------------------------------
     الساحة الخارجية: المقرنص، المساكب، الأشجار، استراحة الطلبة، مجسّم المجهر، اللافتات
  --------------------------------------------------------------- */
  function tree(x, z, k = 1, palm = false) {
    if (palm) { addInst("palmT", x, GY, z, 0, k, k, k); addInst("palmF", x, GY, z, x + z, k, k, k); solid(0, x - 0.3, z - 0.3, x + 0.3, z + 0.3); return; }
    addInst("trunk", x, GY, z, 0, k, k, k); solid(0, x - 0.25, z - 0.25, x + 0.25, z + 0.25);
    addInst("canopy", x, GY + 2.5 * k, z, x * 1.7 + z, k, k * 0.9, k); addInst("canopy", x + 0.4, GY + 3.4 * k, z - 0.3, x - z, k * 0.8, k * 0.75, k * 0.8);
  }
  function planter(x0, z0, x1, z1, trees) {
    const t = 0.25, h = 0.55, y = GY;
    bx("stone", x0, y, z0, x1, y + h, z0 + t); bx("stone", x0, y, z1 - t, x1, y + h, z1); bx("stone", x0, y, z0, x0 + t, y + h, z1); bx("stone", x1 - t, y, z0, x1, y + h, z1);
    bx("stone", x0 - 0.03, y + h, z0 - 0.03, x1 + 0.03, y + h + 0.05, z0 + t + 0.03); bx("stone", x0 - 0.03, y + h, z1 - t - 0.03, x1 + 0.03, y + h + 0.05, z1 + 0.03);
    flat("soil", x0 + t, z0 + t, x1 - t, z1 - t, y + h - 0.08); solid(0, x0, z0, x1, z1);
    for (let x = x0 + 0.9; x < x1 - 0.5; x += 1.5) addInst("shrub", x, y + h - 0.1, (z0 + z1) / 2 + Math.sin(x) * 0.6, x, 0.8, 0.7, 0.8);
    (trees || []).forEach(([tx, tz, k]) => { addInst("trunk", tx, y + h - 0.1, tz, 0, k, k, k); addInst("canopy", tx, y + h + 2.3 * k, tz, tx, k, k * 0.9, k); addInst("canopy", tx + 0.3, y + h + 3.2 * k, tz - 0.3, -tx, k * 0.8, k * 0.75, k * 0.8); });
  }
  function outdoors() {
    const M = MAT;
    M.campus = lam(0xffffff, { map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d9cbb0"; g.fillRect(0, 0, w, h); for (let c = 0; c < 4; c++) { g.fillStyle = "#4f626b"; g.fillRect(16 + c * 62, 70, 34, 110); g.fillStyle = "#f1ece0"; g.fillRect(12 + c * 62, 180, 42, 6); } g.fillStyle = "#8b3a31"; g.fillRect(0, 0, w, 14); }, [1 / 8, 1 / 3.7]) });
    M.kioskRoof = lam(0xa8432f); M.statue = lam(0xf3f1eb);
    flat("floorGrass", -95, -75, 95, 95, GY - 0.05);
    const pav = (x0, z0, x1, z1) => flat("floorPav", x0, z0, x1, z1, GY + 0.003);
    pav(-17.6, 7.95, 17.6, 15.0); pav(-48, 15.0, 48, 18.2); pav(-1.9, 18.2, 1.9, 52);
    pav(-22.4, -1.2, -16.42, 7.95); pav(16.42, -1.2, 22.4, 7.95);
    pav(-26.5, -11.5, 26.5, -7.95); pav(-26.5, -7.95, -22.28, 15.0); pav(22.28, -7.95, 26.5, 15.0);
    // حافة ممر المشاة
    [[-48, 18.2, -1.9, 18.32], [1.9, 18.2, 48, 18.32], [-1.98, 18.2, -1.9, GZ - 4.8], [1.9, 18.2, 1.98, GZ - 4.8], [-1.98, GZ + 4.8, -1.9, 52], [1.9, GZ + 4.8, 1.98, 52]].forEach(([a, b, c2, d]) => bx("stone", a, GY - 0.02, b, c2, GY + 0.08, d));
    // مساكب الحجر أمام القاعات (كما في الصور)
    planter(-15.6, 9.0, -4.4, 13.4, [[-12.5, 11.2, 0.95], [-7.4, 11.0, 0.85]]);
    planter(4.4, 9.0, 15.6, 13.4, [[7.4, 11.0, 0.85], [12.5, 11.2, 0.95]]);
    // الأشجار والنخيل حول القسم
    [[-30, 9, 1.2], [-31, -4, 1.1], [30, 8, 1.15], [31, -5, 1.2], [-12, -14, 1.1], [0, -15, 1.25], [13, -14, 1.05], [-27, 22, 1.2], [-15, 24, 1.0], [18, 23, 1.2], [-36, 30, 1.3], [24, 34, 1.2], [-8, 36, 1.1], [7, 40, 1.25], [-18, 42, 1.2], [33, 21, 1.1], [-40, 14, 1.2], [40, -2, 1.3], [-42, -12, 1.1], [16, 46, 1.2]].forEach(([x, z, k]) => tree(x, z, k));
    [[15.5, 32.0, 1.0], [7.5, 32.0, 0.9], [-7.5, 32.0, 0.95], [21, 28, 1.0]].forEach(([x, z, k]) => tree(x, z, k, true));

    // استراحة الطلبة في الوسط أمام القسم: مظلة بيضاء بهيكل حديد، الممر يمر تحتها والمقاعد على جانبيه
    const gw = 2.9, gl = 4.2;
    flat("floorPav", -3.6, GZ - 4.8, 3.6, GZ + 4.8, GY + 0.014);
    for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) { const x = sx * gw, z = GZ + sz * gl; bx("white", x - 0.06, GY, z - 0.06, x + 0.06, 2.65, z + 0.06); solid(0, x - 0.1, z - 0.1, x + 0.1, z + 0.1); }
    bx("white", -gw - 0.1, 2.58, GZ - gl - 0.1, gw + 0.1, 2.7, GZ + gl + 0.1);
    const ang = Math.atan2(1.2, gw + 0.2), sl = Math.hypot(gw + 0.2, 1.2) + 0.12;
    [-1, 1].forEach(k => { const rf = new THREE.BoxGeometry(sl, 0.05, 2 * gl + 0.6); addGeo("whiteRoof", rf, k * (gw + 0.2) / 2, 2.7 + 0.6, GZ, 0, 1, 1, 1, 0, -k * ang); });
    M.whiteRoof = lam(0xf4f4f1, { side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
    const gab = new THREE.Shape(); gab.moveTo(-gw - 0.2, 0); gab.lineTo(gw + 0.2, 0); gab.lineTo(0, 1.2); gab.lineTo(-gw - 0.2, 0);
    [-1, 1].forEach(k => addGeo("whiteRoof", new THREE.ShapeGeometry(gab), 0, 2.68, GZ + k * (gl + 0.05)));
    for (const sx of [-1, 1]) for (const dz of [-2.7, 0, 2.7]) { const x = sx * 2.15, z = GZ + dz; bx("white", x - 0.18, GY, z - 0.95, x + 0.18, 0.4, z + 0.95); bx("woodDark", x - 0.21, 0.4, z - 0.95, x + 0.21, 0.45, z + 0.95); bx("white", x + sx * 0.17, 0.45, z - 0.95, x + sx * 0.21, 0.85, z + 0.95); solid(0, x - 0.21, z - 0.95, x + 0.21, z + 0.95); }
    // مسكبتان بسياج أبيض على جانبي الاستراحة (كما في الصور)
    planter(4.9, GZ - 3.6, 10.6, GZ + 3.6, [[7.8, GZ - 1.2, 0.9]]); planter(-10.6, GZ - 3.6, -4.9, GZ + 3.6, [[-7.8, GZ + 1.2, 0.9]]);
    [-1, 1].forEach(k => { const x = k * 4.92; for (let z = GZ - 3.5; z <= GZ + 3.51; z += 0.7) bx("white", x - 0.025, 0.45, z - 0.025, x + 0.025, 1.3, z + 0.025); bx("white", x - 0.03, 1.27, GZ - 3.55, x + 0.03, 1.32, GZ + 3.55); bx("white", x - 0.02, 0.85, GZ - 3.55, x + 0.02, 0.88, GZ + 3.55); });
    // اللافتة الزرقاء «استراحة الطلبة» وعمود إنارة شمسي أسود بجانبها
    bx("metal", 3.95, GY, GZ + 5.15, 4.05, 2.15, GZ + 5.25);
    planeAt(M.blueSign, 1.6, 0.75, 4.0, 2.45, GZ + 5.27, 0); planeAt(M.blueSign, 1.6, 0.75, 4.0, 2.45, GZ + 5.13, Math.PI);
    bx("black", 3.85, 2.08, GZ + 5.18, 4.15, 2.84, GZ + 5.22);
    const solarPole = (x, z) => { bx("black", x - 0.07, GY, z - 0.07, x + 0.07, 4.6, z + 0.07); bx("black", x - 0.18, 4.6, z - 0.4, x + 0.18, 4.66, z + 0.4); bx("white", x - 0.16, 4.58, z - 0.36, x + 0.16, 4.6, z + 0.36); bx("black", x - 0.32, 3.4, z - 0.12, x + 0.32, 3.95, z - 0.1); solid(0, x - 0.12, z - 0.12, x + 0.12, z + 0.12); };
    solarPole(4.8, GZ + 5.6); solarPole(-11, 18.7); solarPole(11, 18.7); solarPole(26, 18.7); solarPole(-28, 18.7);
    // عمود الإنارة الفيروزي ذو الذراعين (أمام المساكب)
    bx("tealPole", 3.6, GY, 14.35, 3.72, 4.2, 14.47); bx("tealPole", 3.0, 4.15, 14.38, 4.3, 4.23, 14.44); [3.05, 4.25].forEach(x => bx("grey", x - 0.07, 4.0, 14.36, x + 0.07, 4.15, 14.46)); solid(0, 3.55, 14.3, 3.77, 14.52);
    M.tealPole = lam(0x5fb3c2);
    // لافتة القسم البيضاء على عمود (عربي/إنكليزي)
    bx("metal", -6.86, GY, 15.25, -6.74, 2.2, 15.37);
    planeAt(M.whiteSign, 2.1, 0.77, -6.8, 2.55, 15.38, 0); planeAt(M.whiteSign, 2.1, 0.77, -6.8, 2.55, 15.24, Math.PI); bx("metal", -7.88, 2.14, 15.29, -5.72, 2.18, 15.33);
    // مجسّم المجهر الأبيض في الحديقة
    const s = M.statue, g = new THREE.Group();
    g.add(B(1.8, 0.35, 1.8, MAT.stone), B(1.1, 0.28, 1.4, s, 0, 0.35, 0.05), C(0.16, 1.15, s, 0, 0.6, -0.42, 18));
    const arm = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 10, 26, Math.PI * 0.95), s); arm.rotation.set(0, Math.PI / 2, Math.PI * 0.5); arm.position.set(0, 1.78, -0.05); g.add(arm);
    g.add(B(0.8, 0.07, 0.75, s, 0, 1.05, 0.18));
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.0, 18), s); tube.rotation.x = 0.42; tube.position.set(0, 2.15, 0.32); g.add(tube);
    const eyep = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 16), s); eyep.rotation.x = 0.42; eyep.position.set(0, 2.72, 0.06); g.add(eyep);
    const obj = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.34, 14), s); obj.position.set(0, 1.5, 0.52); g.add(obj);
    g.position.set(14.6, GY, 24.6); g.rotation.y = -0.5; const st2 = compact(g); st2.userData.device = "sculpture"; scene.add(st2); PICK.push(st2); solid(0, 13.6, 23.6, 15.6, 25.6);
    DEV.sculpture = { name: "مجسّم المجهر", what: "مجسّم أبيض كبير لمجهر ضوئي في حديقة الكلية قرب قسم علوم الحياة؛ يرمز إلى أداة عالم الأحياء الأولى.", tool: { view: "palmer", label: "جرّب المجهر الذكي" } };
    // كشك بسقف قرميد أحمر
    bx("ext", 25, GY, 25, 29, 2.6, 28.5); solid(0, 25, 25, 29, 28.5);
    const roof = new THREE.ConeGeometry(3.3, 1.4, 4, 1); roof.rotateY(Math.PI / 4); addGeo("kioskRoof", roof, 27, 3.3, 26.75, 0, 1.05, 1, 0.92);
    bx("doorDark", 26.4, GY, 28.49, 27.4, 2.1, 28.52); bx("glass", 27.8, 1.0, 28.49, 28.6, 1.9, 28.52);
    // مصاطب جلوس خشبية على الممر
    [[-10, 18.6], [14, 18.6], [-34, 18.6], [34, 18.6]].forEach(([x, z]) => { bx("black", x - 0.85, GY, z - 0.2, x - 0.8, 0.42, z + 0.2); bx("black", x + 0.8, GY, z - 0.2, x + 0.85, 0.42, z + 0.2); bx("wood", x - 0.95, 0.42, z - 0.22, x + 0.95, 0.47, z + 0.22); solid(0, x - 0.95, z - 0.22, x + 0.95, z + 0.22); });
    // مبانٍ مجاورة في الحرم
    [[-62, -40, -46, 6], [46, -40, 64, 10], [-20, -58, 22, -42], [-62, 22, -46, 52], [40, 40, 60, 60]].forEach(([x0, z0, x1, z1]) => { bx("campus", x0, GY, z0, x1, 7.4, z1); bx("maroon", x0 - 0.1, 7.4, z0 - 0.1, x1 + 0.1, 7.75, z1 + 0.1); solid(0, x0, z0, x1, z1); });
    // حدود المشي
    solid(0, -52, -60, -50, 66); solid(0, 50, -60, 52, 66); solid(0, -52, 64, 52, 66); solid(0, -52, -60, 52, -58);
  }

  /* ---------------------------------------------------------------
     شخصية صاحب المنصة عند باب القسم: صدرية سوداء بأربعة أزرار، قميص أبيض بأكمام مطوية،
     بنطلون وحذاء أسودان، شعر داكن مرفوع من الأمام، شارب ولحية خفيفة
  --------------------------------------------------------------- */
  function buildAvatar() {
    const M = MAT, root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), armR = new THREE.Group(), armL = new THREE.Group();
    const add = (grp, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); grp.add(m); return m; };
    const S = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h), Cy = (a, b, h, s = 16) => new THREE.CylinderGeometry(a, b, h, s);
    // الحذاء والساقان
    [-1, 1].forEach(k => {
      add(root, new THREE.BoxGeometry(0.105, 0.07, 0.27), M.shoe, k * 0.095, 0.035, 0.035);
      add(root, S(0.054, 14, 8), M.shoe, k * 0.095, 0.055, 0.14, 1, 0.55, 1);
      add(root, Cy(0.068, 0.058, 0.88, 14), M.trouser, k * 0.095, 0.5, 0);
    });
    add(body, new THREE.BoxGeometry(0.33, 0.17, 0.2), M.trouser, 0, 0.97, 0);
    add(body, new THREE.BoxGeometry(0.33, 0.035, 0.205), M.shoe, 0, 1.03, 0);
    // الجذع: قميص تحت الصدرية
    add(body, Cy(0.165, 0.15, 0.5, 20), M.shirt, 0, 1.24, 0, 1, 1, 0.64);
    add(body, Cy(0.172, 0.158, 0.47, 20), M.vest, 0, 1.2, 0, 1, 1, 0.66);
    const vee = new THREE.Shape(); vee.moveTo(-0.085, 0); vee.lineTo(0.085, 0); vee.lineTo(0, -0.27); vee.lineTo(-0.085, 0);
    add(body, new THREE.ShapeGeometry(vee), M.shirt, 0, 1.435, 0.111);
    for (let i = 0; i < 4; i++) add(body, S(0.009, 8, 6), M.black, 0, 1.13 - i * 0.055, 0.115);
    [-1, 1].forEach(k => add(body, new THREE.BoxGeometry(0.075, 0.008, 0.006), M.black, k * 0.08, 1.05, 0.113, 1, 1, 1, 0, 0, k * 0.08));
    // الكتفان والرقبة والياقة
    [-1, 1].forEach(k => add(body, S(0.072), M.shirt, k * 0.175, 1.405, 0, 1, 0.85, 0.85));
    add(body, Cy(0.048, 0.052, 0.12, 14), M.skin, 0, 1.49, 0);
    add(body, new THREE.TorusGeometry(0.058, 0.02, 6, 18), M.shirt, 0, 1.455, 0.005, 1, 1, 1, Math.PI / 2 - 0.25, 0, 0);
    [-1, 1].forEach(k => add(body, new THREE.BoxGeometry(0.06, 0.05, 0.008), M.shirt, k * 0.04, 1.44, 0.085, 1, 1, 1, -0.3, 0, k * 0.5));
    // الذراعان (الأيمن يلوّح)
    const arm = (grp, k) => {
      grp.position.set(k * 0.2, 1.4, 0);
      add(grp, Cy(0.052, 0.047, 0.3, 14), M.shirt, 0, -0.15, 0);
      add(grp, Cy(0.056, 0.056, 0.075, 14), M.shirt, 0, -0.33, 0);
      add(grp, Cy(0.038, 0.032, 0.24, 12), M.skin, 0, -0.47, 0);
      add(grp, S(0.042, 12, 10), M.skin, 0, -0.62, 0.005, 0.75, 1.25, 0.55);
      body.add(grp);
    };
    arm(armR, -1); arm(armL, 1);
    // الرأس
    head.position.set(0, 1.54, 0);
    add(head, S(0.1, 24, 18), M.skin, 0, 0.12, 0, 0.9, 1.18, 1.0);
    [-1, 1].forEach(k => add(head, S(0.024, 10, 8), M.skin, k * 0.089, 0.12, -0.005, 0.5, 1, 0.8));
    add(head, S(0.101, 22, 14), M.hair, 0, 0.17, -0.018, 0.93, 0.56, 1.0);
    add(head, S(0.06, 16, 10), M.hair, 0.012, 0.228, 0.05, 1.3, 0.5, 1.0, -0.35, 0, -0.15);
    [-1, 1].forEach(k => add(head, new THREE.BoxGeometry(0.012, 0.05, 0.03), M.hair, k * 0.087, 0.135, 0.02));
    [-1, 1].forEach(k => {
      add(head, new THREE.BoxGeometry(0.036, 0.008, 0.012), M.hair, k * 0.032, 0.153, 0.094, 1, 1, 1, 0, 0, -k * 0.12);
      add(head, S(0.0125, 10, 8), M.eyeW, k * 0.032, 0.132, 0.086, 1.2, 0.8, 0.7);
      add(head, S(0.0068, 8, 6), M.eye, k * 0.032, 0.132, 0.095);
    });
    add(head, new THREE.ConeGeometry(0.017, 0.05, 8), M.skin, 0, 0.1, 0.1, 1, 1, 1, Math.PI / 2 - 0.35, 0, 0);
    add(head, new THREE.BoxGeometry(0.065, 0.011, 0.012), M.hair, 0, 0.073, 0.097, 1, 1, 1, 0, 0, 0);
    [-1, 1].forEach(k => add(head, new THREE.BoxGeometry(0.012, 0.022, 0.01), M.hair, k * 0.03, 0.062, 0.094));
    add(head, new THREE.BoxGeometry(0.038, 0.008, 0.01), M.lips, 0, 0.055, 0.096);
    add(head, S(0.022, 12, 8), M.hair, 0, 0.022, 0.083, 0.95, 1.05, 0.55);
    add(head, S(0.06, 14, 8, 0), M.hair, 0, 0.04, 0.035, 1.1, 0.42, 0.95);
    body.add(head); root.add(body);
    [armR, armL, head, body, root].forEach(mergeGroup);
    // فقاعة الترحيب
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex(720, 230, (g, w, h) => {
      g.fillStyle = "rgba(255,255,255,.96)"; g.beginPath(); g.roundRect ? g.roundRect(6, 6, w - 12, h - 52, 34) : g.rect(6, 6, w - 12, h - 52); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 22, h - 48); g.lineTo(w / 2, h - 8); g.lineTo(w / 2 + 22, h - 48); g.fill();
      g.fillStyle = "#1d5b3f"; fitFont(g, GREET_TEXT, 800, 50, w - 60); g.fillText(GREET_TEXT, w / 2, 66);
      g.fillStyle = "#555"; g.font = `600 36px ${FONT}`; g.fillText(OWNER, w / 2, 134);
    }), transparent: true, depthWrite: false }));
    bubble.scale.set(1.45, 0.46, 1); bubble.position.set(0, 2.22, 0); root.add(bubble);
    root.position.set(1.75, 0, 7.1); root.rotation.y = -0.15;
    const picked = new THREE.Group(); picked.add(root); picked.userData.device = "owner"; scene.add(picked); PICK.push(picked);
    solid(0, 1.5, 6.85, 2.0, 7.35);
    avatar = { root, body, head, armR, armL, bubble, t: 0, wave: 0 };
  }
  function animateAvatar(dt) {
    if (!avatar) return;
    const a = avatar; a.t += dt;
    const dx = P.x - a.root.position.x, dz = P.z - a.root.position.z, d = Math.hypot(dx, dz), near = P.lvl === 0 && d < 9;
    a.body.scale.y = 1 + Math.sin(a.t * 2.1) * 0.006;
    const want = near ? clamp(angLerp(0, Math.atan2(dx, dz) - a.root.rotation.y, 1), -0.9, 0.9) : 0;
    a.head.rotation.y += (want - a.head.rotation.y) * Math.min(1, dt * 4);
    a.wave += ((near ? 1 : 0) - a.wave) * Math.min(1, dt * 3);
    a.armR.rotation.z = -a.wave * (2.5 + Math.sin(a.t * 7) * 0.28); a.armR.rotation.x = -a.wave * 0.25;
    a.armL.rotation.z = 0.06; a.armR.rotation.z += -0.06 * (1 - a.wave);
    a.bubble.material.opacity = clamp(1.4 - d / 14, 0, 1); a.bubble.visible = P.lvl === 0 && a.bubble.material.opacity > 0.02;
  }

  /* ---------------------------------------------------------------
     المناطق: لمعرفة مكانك، وللمشي التلقائي، وللخريطة المصغّرة
  --------------------------------------------------------------- */
  const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  function regions() {
    REG.length = 0;
    REG.push({ id: "lobby", lvl: 0, x0: -2.9, z0: 1.25, x1: 2.9, z1: 5.3, name: "مدخل القسم", short: "المدخل", kind: "lobby", portal: [{ x: 0, z: 0.3 }, { x: 0, z: 2.3 }], spot: { x: 0, z: 4.6, yaw: 0 } });
    REG.push({ id: "c0", lvl: 0, x0: -16.12, z0: -1.25, x1: 16.12, z1: 1.25, name: "الممر الرئيسي", short: "الممر", kind: "corridor", spot: { x: -0.4, z: 0.3, yaw: Math.PI / 2 } });
    REG.push({ id: "adm", lvl: 1, x0: ADMIN_X + 0.06, z0: -1.25, x1: 21.98, z1: 1.25, name: "إدارة القسم", short: "إدارة القسم", kind: "corridor", spot: { x: 4.3, z: -0.3, yaw: -Math.PI / 2 } });
    REG.push({ id: "c1", lvl: 1, x0: -16.12, z0: -1.25, x1: ADMIN_X, z1: 1.25, name: "الممر", short: "الممر", kind: "corridor", spot: { x: -0.6, z: 0.3, yaw: Math.PI / 2 } });
    ROOMS.forEach(r => {
      const [za, zb] = zr(r), s = r.row === "N" ? -1 : 1, cx = (r.x0 + r.x1) / 2, cz = (za + zb) / 2;
      const sx = r.door, sz = s * 2.35;
      REG.push({ id: r.id, lvl: r.lvl, x0: r.x0, z0: za, x1: r.x1, z1: zb, name: r.name + (r.code ? " " + r.code : ""), short: r.short, kind: r.type, room: r, portal: [{ x: r.door, z: s * 0.5 }, { x: r.door, z: s * 2.05 }], spot: { x: sx, z: sz, yaw: yawTo(sx, sz, cx, cz) } });
    });
    REG.push({ id: "s0", lvl: 0, x0: 0.6, z0: -7.15, x1: 2.9, z1: -1.45, name: "الدرج", short: "الدرج", kind: "stair", portal: [{ x: 1.75, z: -0.4 }, { x: 1.75, z: -1.5 }], spot: { x: 1.75, z: -0.5, yaw: 0 } });
    REG.push({ id: "s1", lvl: 1, x0: -2.9, z0: -4.6, x1: -0.6, z1: -1.25, name: "الدرج – الطابق الأول", short: "الدرج", kind: "stair", portal: [{ x: -1.75, z: -0.4 }, { x: -1.75, z: -1.45 }], spot: { x: -1.75, z: -0.3, yaw: 0 } });
    REG.push({ id: "land", lvl: 0, x0: -2.9, z0: -7.15, x1: 2.9, z1: -4.6, name: "بسطة الدرج", short: "", kind: "stair" });
    REG.push({ id: "store", lvl: 0, x0: -2.9, z0: -4.6, x1: -0.6, z1: -1.45, name: "غرفة تحت الدرج", short: "", kind: "closed" });
  }
  const OUTSIDE = { id: "out", lvl: 0, kind: "outside", portal: [{ x: 0, z: 0.3 }, { x: 0, z: 4.3 }, { x: 0, z: 8.7 }], spot: { x: 0, z: 37, yaw: 0 } };
  function regionAt(x, z, lvl) {
    for (const r of REG) if (r.lvl === lvl && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r;
    if (lvl === 0) {
      const porch = Math.abs(x) < 3 && z > 5.3 && z < 10.2, gaz = Math.abs(x) < 3.5 && z > GZ - 4.7 && z < GZ + 4.7;
      return Object.assign({}, OUTSIDE, { name: porch ? "باب القسم" : gaz ? "استراحة الطلبة" : (z > 7.9 && Math.abs(x) < 18 ? "الساحة الأمامية للقسم" : "حرم الكلية") });
    }
    return null;
  }
  /* ارتفاع الأرض تحت القدم: داخل المبنى والمدخل 0، وخارجه مستوى المقرنص */
  function groundY(x, z, lvl) {
    if (lvl) return FH;
    const inB = (z >= -7.95 && z <= -1.25 && Math.abs(x) <= 22.28) || (Math.abs(x) <= 16.42 && z >= -1.45 && z <= 7.95) || (Math.abs(x) <= 3.0 && z >= 5.3 && z <= 10.05);
    return inB ? 0 : GY;
  }

  /* ---------------------------------------------------------------
     الحركة والتصادم
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
  function routeTo(tx, tz) {
    const lvl = P.lvl, a = regionAt(P.x, P.z, lvl), b = regionAt(tx, tz, lvl);
    if (!b || b.kind === "closed") return null;
    const pts = [];
    if (a && b && a.id !== b.id) {
      let out = a.portal ? a.portal.slice().reverse() : [], inn = b.portal ? b.portal.slice() : [];
      if ((a.id === "lobby" && b.id === "out") || (a.id === "out" && b.id === "lobby")) { out = out.filter(p => p.z > 1); inn = inn.filter(p => p.z > 1); }
      pts.push(...out);
      if (lvl === 1) {
        const xa = a.portal ? a.portal[0].x : P.x, xb = b.portal ? b.portal[0].x : tx;
        if ((xa - ADMIN_X) * (xb - ADMIN_X) < 0) { const w = { x: ADMIN_X - 0.6, z: -0.58 }, e = { x: ADMIN_X + 0.6, z: -0.58 }; pts.push(...(xa < ADMIN_X ? [w, e] : [e, w])); }
      }
      pts.push(...inn);
    }
    pts.push({ x: tx, z: tz });
    return pts.map(p => ({ x: p.x, z: p.z }));
  }
  function update(dt) {
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
      if (d < 0.12 || d < 2.3 * dt) { if (d < 0.6) { P.x = t.x; P.z = t.z; collide(); } walkPath.shift(); if (!walkPath.length) { walkPath = null; hideMarker(); } }
      else { mx = dx / d * 2.3; mz = dz / d * 2.3; P.yaw = angLerp(P.yaw, Math.atan2(-dx, -dz), Math.min(1, dt * 5)); }
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
     الحركات التلقائية: الجولة، صعود ونزول الدرج، الانتقال
  --------------------------------------------------------------- */
  function camState() { return { x: P.x, y: cam.position.y, z: P.z, yaw: P.yaw, pitch: P.pitch }; }
  function look(f, t) { const dx = t[0] - f[0], dy = t[1] - f[1], dz = t[2] - f[2]; return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; }
  function play(frames, onEnd, isTour) {
    walkPath = null; hideMarker();
    anim = { frames: frames.map(f => Object.assign({ move: 1.5, hold: 0 }, f, look(f.p, f.look))), i: 0, t: 0, from: camState(), onEnd, isTour };
    tour = !!isTour; U.$("#tour-play").classList.toggle("on", tour);
    caption(anim.frames[0].cap || "");
  }
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
        const cb = a.onEnd; anim = null; tour = false; U.$("#tour-play").classList.remove("on"); caption(""); if (typeof cb === "function") cb(); where(true); return;
      }
      if (a.frames[a.i].cap != null) caption(a.frames[a.i].cap);
    }
    P.lvl = (a.camY || 0) > FH + 0.8 ? 1 : 0;
  }
  const E0 = EYE, E1 = FH + EYE, EL = 1.85 + EYE, EG = GY + EYE;
  const climbFrames = () => [
    { p: [1.75, E0, -1.75], look: [1.75, E0 + 0.9, -6], move: 0.7, cap: "تصعد الدرج إلى البسطة…" },
    { p: [1.75, EL, -5.4], look: [1.3, EL + 0.15, -9], move: 2.6 },
    { p: [0.2, EL, -5.65], look: [0.1, 1.85 + 1.6, -7.2], move: 1.1, hold: 1.6, cap: "لوحة جامعة تكريت – كلية التربية للعلوم الصرفة على جدار البسطة" },
    { p: [-1.75, EL, -5.4], look: [-1.75, EL + 1.1, -1], move: 1.0, cap: "" },
    { p: [-1.75, E1, -1.45], look: [-1.75, E1, 3], move: 2.6, cap: "الطابق الأول" },
    { p: [-1.6, E1, -0.25], look: [6, E1, -0.25], move: 1.0, cap: "" }
  ];
  function climb() { play(climbFrames()); }
  function descend() {
    play([
      { p: [-1.75, E1, -1.55], look: [-1.75, E1 - 0.9, -6], move: 0.7, cap: "تنزل إلى الطابق الأرضي…" },
      { p: [-1.75, EL, -5.3], look: [-1.75, EL - 0.2, -9], move: 2.6 },
      { p: [1.75, EL, -5.6], look: [1.75, EL - 1.2, -1], move: 1.2 },
      { p: [1.75, E0, -1.6], look: [1.75, E0, 3], move: 2.6, cap: "" },
      { p: [1.5, E0, -0.15], look: [-6, E0, -0.15], move: 1.0 }
    ]);
  }
  function teleport(lvl, x, z, yaw) {
    const f = U.$("#tour-fade"); f.classList.add("on"); walkPath = null; anim = null; hideMarker();
    setTimeout(() => { P.lvl = lvl; P.x = x; P.z = z; P.yaw = yaw; P.pitch = -0.05; collide(); P.gy = groundY(x, z, lvl); applyCam(); where(true); f.classList.remove("on"); }, 260);
  }
  function startTour() {
    U.$("#tour-intro").hidden = true; closeInfo();
    P.lvl = 0; P.x = 0; P.z = 38; P.yaw = 0; P.pitch = 0.05; P.gy = GY;
    play([
      { p: [0, EG, 35.5], look: [0, 3.2, 5.4], move: 1.2, hold: 4.0, cap: "قسم علوم الحياة – كلية التربية للعلوم الصرفة، جامعة تكريت (أُسس عام ١٩٩٢)" },
      { p: [0.2, EG, 27.6], look: [0, 1.7, 21.5], move: 2.6, hold: 1.6, cap: "استراحة الطلبة أمام القسم" },
      { p: [0.4, EG, 12.6], look: [1.75, 1.75, 7.1], move: 3.4, hold: 3.4, cap: OWNER + " يرحّب بكم عند باب القسم" },
      { p: [0, E0, 8.4], look: [0, 1.6, 3.5], move: 1.8, cap: "الباب الخشبي المشبّك للمدخل الرئيسي" },
      { p: [0.3, E0, 4.3], look: [-2.9, 1.7, 3.15], move: 2.0, hold: 2.6, cap: "تعليمات انضباط الطلبة في المدخل" },
      { p: [0.1, E0, 3.7], look: [2.9, 1.75, 3.3], move: 1.2, hold: 2.8, cap: "لوحتا الطلبة الأوائل في قسم علوم الحياة: الدراسة المسائية والصباحية" },
      { p: [0, E0, 1.4], look: [-1.6, 2.35, -1.3], move: 1.4, hold: 2.4, cap: "مخططا الطابق الأرضي أمام المدخل، وبجانبهما الدرج" },
      { p: [-0.5, E0, 0.1], look: [-10, 2.3, 0], move: 1.3, hold: 2.4, cap: "الممر: المختبرات شمالاً والقاعات الدراسية جنوباً" },
      { p: [2.6, E0, 0.2], look: [8, 2.3, 0], move: 1.4, hold: 1.8 },
      { p: [4.25, E0, -0.55], look: [4.25, 1.3, -4], move: 1.2, cap: "مختبر البيئة والتلوث 00L001" },
      { p: [5.0, E0, -2.4], look: [10.8, 1.25, -5.6], move: 1.8, hold: 3.2, cap: "أجهزة تحليل المياه والتربة وتشخيص البكتيريا — اضغط على أي جهاز لتعرف عمله" },
      { p: [4.25, E0, -0.45], look: [0, 1.5, -0.45], move: 1.6, cap: "" },
      { p: [1.75, E0, -0.5], look: [1.75, 1.9, -4], move: 1.4, cap: "إلى الطابق الأول" },
      ...climbFrames().slice(0, 5),
      { p: [-4.35, E1, -0.3], look: [-4.35, E1 - 0.2, -4], move: 2.0, cap: "مختبر الدراسات العليا 01L005" },
      { p: [-5.3, E1, -2.3], look: [-12.1, FH + 1.75, -4.4], move: 1.7, hold: 3.6, cap: "الخزانات السوداء تُحفظ فيها المجاهر، وعلى المصاطب مجاهر بأغطيتها الزرقاء" },
      { p: [-4.35, E1, -0.3], look: [3, E1, -0.45], move: 1.5, cap: "" },
      { p: [2.1, E1, -0.58], look: [9, E1, -0.4], move: 1.6, hold: 1.4, cap: "إدارة القسم: السكرتارية ورئاسة القسم والمقرريات" },
      { p: [6.3, E1, 0.35], look: [6.3, E1 - 0.2, 4], move: 1.6, cap: "رئاسة القسم" },
      { p: [6.5, E1, 2.6], look: [8.0, FH + 1.0, 6.6], move: 1.4, hold: 3.0 }
    ], null, true);
  }

  /* ---------------------------------------------------------------
     الواجهة: المكان الحالي، الخريطة، بطاقة الجهاز
  --------------------------------------------------------------- */
  function caption(t) { const c = U.$("#tour-cap"); c.textContent = t || ""; c.hidden = !t; }
  function where(force) {
    const r = regionAt(P.x, P.z, P.lvl), name = r ? r.name : "";
    const label = (P.lvl ? "الطابق الأول · " : (r && r.kind === "outside" ? "" : "الطابق الأرضي · ")) + name;
    if (force || label !== lastWhere) { U.$("#tour-where").textContent = label; lastWhere = label; }
    if (P.lvl !== where.lvl) { where.lvl = P.lvl; mapFloor = P.lvl; U.$$("#tour-floors button").forEach(x => x.classList.toggle("on", +x.dataset.f === mapFloor)); }
    const sb = U.$("#tour-stairs");
    if (!anim && r && r.kind === "stair") { sb.hidden = false; sb.textContent = P.lvl ? "انزل إلى الطابق الأرضي" : "اصعد إلى الطابق الأول"; } else sb.hidden = true;
    drawMap();
  }
  function triggers() {
    if (anim) return;
    if (P.lvl === 0 && P.x > 0.75 && P.x < 2.75 && P.z < -1.62 && P.z > -2.6) climb();
    else if (P.lvl === 1 && P.x > -2.75 && P.x < -0.75 && P.z < -1.62 && P.z > -2.6) descend();
  }
  const MAPB = { x0: -23.5, x1: 23.5, z0: -8.6, z1: 10.6 };
  function mapXY(cv, x, z) { return [(x - MAPB.x0) * cv.width / (MAPB.x1 - MAPB.x0), (z - MAPB.z0) * cv.height / (MAPB.z1 - MAPB.z0)]; }
  function drawMap() {
    const cv = U.$("#tour-map-c"); if (!cv || cv.offsetParent === null) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = "rgba(3,12,16,.82)"; g.fillRect(0, 0, cv.width, cv.height);
    const col = { corridor: "#25424a", lobby: "#3b5560", lab: "#2c5d43", class: "#2b4767", office: "#4a3a5e", stair: "#555", closed: "#1d2427" };
    REG.filter(r => r.lvl === mapFloor).forEach(r => {
      const [a, b] = mapXY(cv, r.x0, r.z0), [c, d] = mapXY(cv, r.x1, r.z1);
      g.fillStyle = r.id === "adm" ? "#3a3550" : (col[r.kind] || "#2d3a40"); g.fillRect(a + 0.5, b + 0.5, c - a - 1, d - b - 1);
      if (r.short && r.kind !== "corridor" && r.kind !== "stair" && (c - a) > 22 * dpr) { g.save(); g.fillStyle = "#e9f3f2"; g.font = `600 ${Math.round(7.5 * dpr)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = "rtl"; g.fillText(r.short, (a + c) / 2, (b + d) / 2, c - a - 2); g.restore(); }
    });
    if (mapFloor === 0) { const [ex, ey] = mapXY(cv, 0, 5.4); g.fillStyle = "#e6ae4f"; g.fillRect(ex - 6 * dpr, ey - 2 * dpr, 12 * dpr, 4 * dpr); }
    else { const [ax, ay] = mapXY(cv, ADMIN_X, -1.25), [, by] = mapXY(cv, ADMIN_X, 1.25); g.fillStyle = "#c9d3d6"; g.fillRect(ax - dpr, ay, 2 * dpr, by - ay); }
    if (P.lvl === mapFloor) {
      const [px, pz] = mapXY(cv, clamp(P.x, MAPB.x0, MAPB.x1), clamp(P.z, MAPB.z0, MAPB.z1));
      g.save(); g.translate(px, pz); g.rotate(-P.yaw); g.fillStyle = "#93dd8a"; g.beginPath(); g.moveTo(0, -8 * dpr); g.lineTo(5 * dpr, 5 * dpr); g.lineTo(0, 2.5 * dpr); g.lineTo(-5 * dpr, 5 * dpr); g.closePath(); g.fill(); g.restore();
    }
  }
  function mapClick(e) {
    const cv = U.$("#tour-map-c"), rc = cv.getBoundingClientRect();
    const x = MAPB.x0 + (e.clientX - rc.left) / rc.width * (MAPB.x1 - MAPB.x0), z = MAPB.z0 + (e.clientY - rc.top) / rc.height * (MAPB.z1 - MAPB.z0);
    const r = REG.find(q => q.lvl === mapFloor && x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
    if (r && r.spot) teleport(r.lvl, r.spot.x, r.spot.z, r.spot.yaw);
    else if (!r && mapFloor === 0 && z > 5.4) teleport(0, 0, 13.5, 0);
  }
  function openInfo(key) {
    const d = DEV[key]; if (!d) return;
    const box = U.$("#tour-info"), owner = key === "owner";
    box.innerHTML = `<button class="btn icon-btn btn-ghost tour-info-x" type="button" aria-label="إغلاق"><svg><use href="#i-close"/></svg></button>
      <span class="ti-tag">${owner ? "صاحب المنصة · عند باب القسم" : "جهاز مختبري · اضغط على أجهزة أخرى"}</span><h4>${U.esc(d.name)}</h4><p>${U.esc(d.what)}</p>
      ${d.uses ? (owner ? d.uses.map(x => `<p>${U.esc(x)}</p>`).join("") : `<h5>استخداماته في التلوث والمعالجة</h5><ul>${d.uses.map(x => `<li>${U.esc(x)}</li>`).join("")}</ul>`) : ""}
      ${d.steps ? `<h5>طريقة العمل</h5><ol>${d.steps.map(x => `<li>${U.esc(x)}</li>`).join("")}</ol>` : ""}
      ${d.tool ? (d.tool.rs ? `<a class="btn btn-primary btn-sm" href="#research" data-rs="${d.tool.rs}"><svg><use href="#i-book"/></svg>${U.esc(d.tool.label)}</a>` : `<button class="btn btn-primary btn-sm" type="button" id="tour-tool"><svg><use href="#i-calc"/></svg>${U.esc(d.tool.label || "افتح الأداة")}</button>`) : ""}`;
    box.hidden = false;
    box.querySelector(".tour-info-x").onclick = closeInfo;
    const tb = box.querySelector("#tour-tool");
    if (tb) tb.onclick = () => { exitFull(); if (d.tool.calc) ECO.calcOpen(d.tool.calc); else if (d.tool.view) ECO.go(d.tool.view); };
  }
  function closeInfo() { const b = U.$("#tour-info"); if (b) b.hidden = true; }

  let marker = null;
  function showMarker(x, y, z) { if (!marker) { marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 28).rotateX(-Math.PI / 2), basic(0x93dd8a, { transparent: true, opacity: 0.85, depthWrite: false })); scene.add(marker); } marker.position.set(x, y + 0.02, z); marker.visible = true; }
  function hideMarker() { if (marker) marker.visible = false; }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(cx, cy) {
    const rc = canvas.getBoundingClientRect(); ndc.set((cx - rc.left) / rc.width * 2 - 1, -(cy - rc.top) / rc.height * 2 + 1);
    ray.setFromCamera(ndc, cam); ray.far = 16;
    const hits = ray.intersectObjects(PICK.concat(FLOORS, BLOCK), true);
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
    let down = null;
    canvas.addEventListener("pointerdown", e => {
      focused = true; canvas.setPointerCapture(e.pointerId);
      down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      if (anim && anim.isTour) { anim = null; tour = false; caption(""); U.$("#tour-play").classList.remove("on"); }
      U.$("#tour-intro").hidden = true;
    });
    canvas.addEventListener("pointermove", e => {
      if (down) {
        const dx = e.clientX - down.x - (down.lx || 0), dy = e.clientY - down.y - (down.ly || 0);
        down.lx = e.clientX - down.x; down.ly = e.clientY - down.y; down.moved = Math.max(down.moved, Math.hypot(down.lx, down.ly));
        if (!anim) { const k = e.pointerType === "touch" ? 0.0058 : 0.0042; P.yaw += dx * k; P.pitch = clamp(P.pitch + dy * k * 0.8, -1.1, 1.1); }
      } else if (e.pointerType === "mouse" && !anim) hover(e);
    });
    const end = e => {
      if (!down) return; const d = down; down = null;
      if (d.moved < 7 && performance.now() - d.t < 450 && !anim) {
        const h = pick(e.clientX, e.clientY);
        if (h && h.device) openInfo(h.device);
        else if (h && h.floor && Math.abs(h.point.y - groundY(h.point.x, h.point.z, P.lvl)) < 0.45) { const path = routeTo(h.point.x, h.point.z); if (path) { walkPath = path; stuck = 0; showMarker(h.point.x, h.point.y, h.point.z); closeInfo(); } }
      }
    };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", () => { down = null; });
    canvas.addEventListener("pointerleave", () => { U.$("#tour-tip").hidden = true; });
    window.addEventListener("keydown", e => {
      if (!active || !focused || /input|textarea|select/i.test(e.target.tagName)) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"].includes(e.code)) { keys[e.code] = true; if (e.code.startsWith("Arrow")) e.preventDefault(); if (anim && anim.isTour) { anim = null; tour = false; caption(""); } U.$("#tour-intro").hidden = true; }
      if (e.code === "Escape") { closeInfo(); exitFull(); }
    });
    window.addEventListener("keyup", e => { keys[e.code] = false; });
    window.addEventListener("blur", () => Object.keys(keys).forEach(k => (keys[k] = false)));
    document.addEventListener("pointerdown", e => { if (!stageEl.contains(e.target)) focused = false; });
    const jz = U.$("#tour-joy"), knob = jz.querySelector("span"); let jid = null, jc = null;
    jz.addEventListener("pointerdown", e => { e.stopPropagation(); jid = e.pointerId; jz.setPointerCapture(jid); const r = jz.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; moveJoy(e); U.$("#tour-intro").hidden = true; if (anim && anim.isTour) { anim = null; tour = false; caption(""); } });
    const moveJoy = e => { if (jid !== e.pointerId) return; let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const d = Math.hypot(dx, dy), m = jc.R * 0.85; if (d > m) { dx *= m / d; dy *= m / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = dy / m; };
    jz.addEventListener("pointermove", moveJoy);
    const jend = () => { jid = null; joy.x = 0; joy.y = 0; knob.style.transform = ""; };
    jz.addEventListener("pointerup", jend); jz.addEventListener("pointercancel", jend);
    U.$("#tour-play").onclick = () => { if (anim && anim.isTour) { anim = null; tour = false; caption(""); U.$("#tour-play").classList.remove("on"); } else startTour(); };
    const fit = () => { if (window.innerWidth <= 900 && !stageEl.classList.contains("full")) { const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64; window.scrollTo({ top: stageEl.getBoundingClientRect().top + window.scrollY - hh - 8, behavior: "smooth" }); } };
    U.$("#tour-self").onclick = () => { U.$("#tour-intro").hidden = true; focused = true; fit(); };
    U.$("#tour-start").onclick = () => { fit(); startTour(); };
    U.$("#tour-map-t").onclick = () => { const m = U.$("#tour-map"); m.hidden = !m.hidden; U.$("#tour-map-t").classList.toggle("on", !m.hidden); drawMap(); };
    U.$("#tour-map-c").addEventListener("click", mapClick);
    U.$("#tour-floors").onclick = e => { const b = e.target.closest("button"); if (!b) return; mapFloor = +b.dataset.f; U.$$("#tour-floors button").forEach(x => x.classList.toggle("on", x === b)); drawMap(); };
    U.$("#tour-full").onclick = () => toggleFull();
    U.$("#tour-stairs").onclick = () => { if (P.lvl === 0) climb(); else descend(); };
    U.$("#tour-rooms").onclick = e => { const b = e.target.closest("[data-r]"); if (!b) return; stageEl.scrollIntoView({ behavior: "smooth", block: "center" }); if (b.dataset.r === "out") { teleport(0, 0.6, 13.0, 0); return; } const r = REG.find(q => q.id === b.dataset.r); if (r) teleport(r.lvl, r.spot.x, r.spot.z, r.spot.yaw); };
    document.addEventListener("fullscreenchange", () => { stageEl.classList.toggle("full", !!document.fullscreenElement); setTimeout(() => st && st.resize(), 60); });
  }
  let hoverT = 0;
  function hover(e) {
    const now = performance.now(); if (now - hoverT < 70) return; hoverT = now;
    const h = pick(e.clientX, e.clientY), tip = U.$("#tour-tip");
    if (h && h.device && DEV[h.device]) { const rc = stageEl.getBoundingClientRect(); tip.textContent = DEV[h.device].name; tip.style.left = (e.clientX - rc.left + 14) + "px"; tip.style.top = (e.clientY - rc.top + 14) + "px"; tip.hidden = false; canvas.style.cursor = "pointer"; }
    else { tip.hidden = true; canvas.style.cursor = h && h.floor ? "crosshair" : "grab"; }
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
    stageEl = U.$("#tour-stage"); canvas = U.$("#tour-canvas");
    st = ECO.makeStage(canvas, { fov: 68, near: 0.06, far: 280, clear: 0xbfd8e6 });
    if (!st) return;
    const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    st.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    scene = st.scene; cam = st.camera;
    scene.fog = new THREE.Fog(0xd3e3ec, 60, 190);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x958b7a, 0.92));
    const sun = new THREE.DirectionalLight(0xfff0d6, 0.58); sun.position.set(-25, 60, 40); scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const sky = new THREE.Mesh(new THREE.SphereGeometry(240, 24, 14), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#4f93d0"); gr.addColorStop(0.45, "#a3cbe8"); gr.addColorStop(0.55, "#dde9ee"); gr.addColorStop(1, "#e8e1d0"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
    scene.add(sky);
    const t0 = performance.now();
    materials(); signTextures(); instances();
    shell(); doors(); corridors(); ROOMS.forEach(buildRoom); outdoors(); buildAvatar();
    flushBatches(); flushInst(); regions();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => TEXJOBS.forEach(j => j()));
    ECO._tourBuildMs = Math.round(performance.now() - t0);
    U.$("#tour-joy").hidden = !coarse;
    renderRoomList();
    bindInput();
    st.tick = dt => { const s = dt * (ECO.campus.speed || 1); update(s); animateAvatar(s); const now = performance.now(); if (now - whereT > 200) { whereT = now; where(); } };
    applyCam(); where(true);
    built = true;
  }
  function renderRoomList() {
    const order = { lobby: 0, corridor: 1, lab: 2, class: 3, office: 4, stair: 5 };
    const grp = l => REG.filter(r => r.lvl === l && r.spot && r.kind !== "closed").sort((a, b) => (order[a.kind] - order[b.kind]) || (a.x0 - b.x0));
    const btn = r => `<button type="button" class="tile3d" data-r="${r.id}"><i class="k-${r.kind}"></i><span>${U.esc(r.name)}</span></button>`;
    U.$("#tour-rooms").innerHTML = [0, 1].map(l => `<div class="panel"><div class="panel-h"><h3>${l ? "الطابق الأول" : "الطابق الأرضي"}</h3></div><div class="tour-list">${l ? "" : `<button type="button" class="tile3d" data-r="out"><i class="k-outside"></i><span>أمام باب القسم</span></button>`}${grp(l).map(btn).join("")}</div></div>`).join("") +
      `<div class="panel"><div class="panel-h"><h3>كيف تتجول</h3></div><ul class="tour-how"><li><b>للالتفات:</b> اسحب بالماوس أو بإصبعك.</li><li><b>للمشي:</b> اضغط على الأرض فتمشي إليها، أو استخدم W A S D والأسهم، أو عصا التحكم على الهاتف.</li><li><b>الأجهزة:</b> اضغط على أي جهاز لتعرف ما يقيسه وتفتح الحاسبة المرتبطة به.</li><li><b>الدرج:</b> امشِ إليه فتصعد تلقائياً، أو اختر الطابق من الخريطة.</li></ul><p class="faint" style="font-size:.74rem;margin-top:8px">المبنى مبني على المخططين الهندسيين المعلّقين في القسم بأبعادهما الحقيقية، والأسماء واللوحات مأخوذة من صور القسم، ولا يظهر أي شخص.</p></div>`;
  }

  ECO.views.campus = {
    init() { build(); },
    show() { active = true; if (st) { st.start(); setTimeout(() => { st.resize(); drawMap(); }, 50); } },
    hide() { active = false; Object.keys(keys).forEach(k => (keys[k] = false)); if (st) st.stop(); exitFull(); }
  };
  ECO.campus = { state: () => ({ x: P.x, z: P.z, lvl: P.lvl, yaw: P.yaw, where: lastWhere, anim: !!anim }), teleport, startTour, openInfo, regions: () => REG, rooms: ROOMS, set: o => { walkPath = null; anim = null; hideMarker(); Object.assign(P, o); P.gy = groundY(P.x, P.z, P.lvl); applyCam(); where(true); }, climb, descend, keys, info: () => st && st.renderer.info.render, speed: 1, solids: () => SOLID, walkTo: (x, z) => { const p = routeTo(x, z); if (p) { walkPath = p; stuck = 0; } return p; }, walking: () => !!walkPath };
})();
