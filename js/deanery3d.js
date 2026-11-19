/* =====================================================================
   EcoBio AI — عمادة كلية التربية للعلوم الصرفة ثلاثية الأبعاد
   مبنية لقطةً لقطة على فيديوهات العمادة وصورها (تشرين الثاني 2026):
   الواجهة والممر المسقّف والحديقة، والطابق الأرضي (المدخل والاستعلامات
   والممر والشُّعب)، والدرج على يمين الداخل، والطابق الأول (بهو الشؤون
   الإدارية والمالية، والشُّعب، ومكتب العميد، وقاعة مجلس الكلية).
   اللوحات والشعارات مأخوذة من الصور نفسها، ولا يظهر أي شخص.
   الأبعاد تقديرية من الفيديو (لا يوجد مخطط هندسي)، وكل غرفة لم تُصوَّر
   من الداخل مبنية على طراز الغرف المصوّرة ومعلَّمة «تقريبية».
   المحاور: x شرق (+) / غرب (−)، z جنوب (+، جهة المدخل والحديقة) / شمال (−).
   محرّك المشي والجولة والخريطة نفسه المستعمل في «جولة في القسم».
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  if (!document.getElementById("view-deanery")) return;
  const FH = 3.8, CH = 3.4, EYE = 1.62, GY = -0.45, RISE = FH / 20, RUN = 0.3;
  const FONT = '"Readex Pro","IBM Plex Sans Arabic","Noto Sans Arabic","Noto Naskh Arabic",Tahoma,Arial,sans-serif';
  const TEX = "assets/deanery/";
  const BX0 = -8, BX1 = 13, BZ0 = -42, BZ1 = 0;     // جسم المبنى
  const CX0 = 0.5, CX1 = 4.5, CXM = 2.5;             // الممر الرئيسي في الطابقين
  const ZE = -31.5;                                   // نهاية الممر
  const WX = 2.5, WZ1 = 15.0;                         // الممر المسقّف أمام الباب

  /* الغرف. r: [x0, x1, z0, z1] (z0 الجهة الشمالية). الأبواب: s جهة الجدار (W غرب، E شرق، F جنوب/أمام، B شمال/خلف)،
     at موضعها على الجدار، k نوعها. ph: 1 = مصوّرة من الداخل أو لوحتها، 0 = تقريبية (الاسم من لوحتها أو بلا لوحة) */
  const ROOMS = [
    // الطابق الأرضي
    { id: "g-store", short: "مخزن", lvl: 0, r: [-8, -1.5, -6, 0], name: "مخزن", code: "05S012", sub: "store", doors: [{ s: "E", at: -5.1 }], ph: 1 },
    { id: "g-001", short: "المعاون العلمي", lvl: 0, r: [-8, 0.5, -11, -6], name: "معاون العميد للشؤون العلمية", code: "00G001", sub: "deputy", doors: [{ s: "E", at: -10.1 }], ph: 1 },
    { id: "g-002", short: "المعاون الإداري", lvl: 0, r: [-8, 0.5, -16, -11], name: "معاون العميد للشؤون الإدارية", code: "00G002", sub: "deputy", doors: [{ s: "E", at: -15.1 }], ph: 1 },
    { id: "g-003", short: "الدراسات العليا", lvl: 0, r: [-8, 0.5, -22, -16], name: "شعبة الدراسات العليا", code: "00G003", sub: "counter", doors: [{ s: "E", at: -16.9 }], win: { s: "E", a: -20.7, b: -19.1 }, ph: 1 },
    { id: "g-v001", short: "أضابير الدراسات العليا", lvl: 0, r: [-8, 0.5, -26, -22], name: "أضابير الدراسات العليا", code: "00V001", sub: "archive", doors: [{ s: "E", at: -25.1 }], ph: 1 },
    { id: "g-w5", short: "غرفة إدارية", lvl: 0, r: [-8, 0.5, ZE, -26], name: "غرفة إدارية", sub: "staff", doors: [{ s: "E", at: -27.0 }], ph: 0 },
    { id: "g-010", short: "مدير التسجيل", lvl: 0, r: [-8, -1.5, -37, ZE], name: "مدير شعبة التسجيل", code: "00G010", sub: "regmgr", doors: [{ s: "E", at: -33.2 }], ph: 1 },
    { id: "g-011", short: "وحدة الأضابير", lvl: 0, r: [-8, -1.5, -42, -37], name: "وحدة الأضابير", code: "00G011", sub: "archive", doors: [{ s: "E", at: -38.2 }], ph: 1 },
    { id: "g-reg", short: "التسجيل وشؤون الطلبة", lvl: 0, r: [-1.5, 7.5, -42, ZE], name: "شعبة التسجيل وشؤون الطلبة", sub: "reg", doors: [{ s: "F", at: CXM, k: "dark" }], ph: 1 },
    { id: "g-be", short: "غرفة إدارية", lvl: 0, r: [7.5, 13, -42, ZE], name: "غرفة إدارية", sub: "staff", doors: [{ s: "W", at: -33.4 }], ph: 0 },
    { id: "g-media", short: "الإعلام والاتصال", lvl: 0, r: [4.5, 13, ZE, -25.5], name: "شعبة الإعلام والاتصال الحكومي", sub: "media", doors: [{ s: "W", at: -26.6 }], win: { s: "W", a: -30.9, b: -29.3 }, ph: 1 },
    { id: "g-e3", short: "غرفة إدارية", lvl: 0, r: [4.5, 13, -25.5, -20], name: "غرفة إدارية", sub: "staff", doors: [{ s: "W", at: -21.1 }], ph: 0 },
    { id: "g-009", short: "صندوق الحسابات", lvl: 0, r: [4.5, 13, -20, -15], name: "صندوق الحسابات", code: "00G009", sub: "cash", doors: [{ s: "W", at: -16.1 }], ph: 1 },
    { id: "g-008", short: "الشؤون العلمية", lvl: 0, r: [4.5, 13, -15, -9], name: "شعبة الشؤون العلمية", code: "00G008", sub: "staff", doors: [{ s: "W", at: -10.1 }], ph: 1 },
    { id: "g-e0", short: "خدمات", lvl: 0, r: [4.5, 8, -9, -6], name: "غرفة خدمات", sub: "pantry", doors: [{ s: "W", at: -7.5 }], ph: 0 },
    { id: "g-stair", short: "الدرج", lvl: 0, r: [8, 13, -9, 0], name: "الدرج", sub: "stair", doors: [{ s: "W", at: -2.75, w: 2.3, k: "glass2" }], ph: 1, noPlate: 1 },
    // الطابق الأول
    { id: "u-mgr", short: "مدير الشؤون الإدارية", lvl: 1, r: [-8, -1.5, -9, 0], name: "مدير شعبة الشؤون الإدارية والمالية", sub: "mgrAdmin", doors: [{ s: "E", at: -7.9 }], ph: 1 },
    { id: "u-staff", short: "الشؤون الإدارية والمالية", lvl: 1, r: [-8, 0.5, -13.5, -9], name: "موظفو الشؤون الإدارية والمالية", sub: "staffAdmin", doors: [{ s: "F", at: -4.4, k: "black" }], ph: 1, noPlate: 1 },
    { id: "u-recv", short: "استقبال", lvl: 1, r: [-8, 0.5, -16.5, -13.5], name: "غرفة الاستقبال", sub: "recv", doors: [{ s: "E", at: -15.7, k: "white" }, { s: "F", at: -6.4, k: "white" }], ph: 1, noPlate: 1 },
    { id: "u-hr", short: "الموارد البشرية", lvl: 1, r: [-8, 0.5, -20, -16.5], name: "شعبة الموارد البشرية", code: "01G024", sub: "staff", doors: [{ s: "E", at: -17.4 }], ph: 0, poster: "مهام شعبة الموارد البشرية" },
    { id: "u-qa", short: "ضمان الجودة", lvl: 1, r: [-8, 0.5, -24, -20], name: "شعبة ضمان الجودة", code: "01G022", sub: "qa", doors: [{ s: "E", at: -20.9 }], ph: 1 },
    { id: "u-aud", short: "التدقيق", lvl: 1, r: [-8, 0.5, -27, -24], name: "شعبة التدقيق", code: "01G020", sub: "staff", doors: [{ s: "E", at: -24.9 }], ph: 0 },
    { id: "u-sec", short: "استقبال العميد", lvl: 1, r: [-4, 0.5, -32, -27], name: "مكتب العميد – الاستقبال", sub: "deanSec", doors: [{ s: "E", at: -29.5, k: "black" }], ph: 1, noPlate: 1 },
    { id: "u-dstaff", short: "مدير مكتب العميد", lvl: 1, r: [-8, -4, -32, -27], name: "مدير مكتب العميد", sub: "deanStaff", doors: [{ s: "E", at: -30.6, k: "black" }], ph: 1, noPlate: 1 },
    { id: "u-dean", short: "مكتب العميد", lvl: 1, r: [-8, 1.5, -42, -32], name: "مكتب العميد", sub: "dean", doors: [{ s: "F", at: -6.5, k: "wood" }, { s: "E", at: -40.3, w: 1.5, k: "wood2" }], ph: 1, noPlate: 1 },
    { id: "u-council", short: "مجلس الكلية", lvl: 1, r: [1.5, 7, -42, ZE], name: "قاعة مجلس الكلية", sub: "council", doors: [{ s: "F", at: 4.25, w: 1.5, k: "council" }], ph: 1, noPlate: 1 },
    { id: "u-amin", short: "أمين المجلس", lvl: 1, r: [7, 13, -35, -30], name: "أمين المجلس", code: "01G017", sub: "mgr", doors: [{ s: "W", at: -30.8 }], ph: 1 },
    { id: "u-be", short: "غرفة إدارية", lvl: 1, r: [7, 13, -42, -35], name: "غرفة إدارية", sub: "staff", doors: [{ s: "F", at: 10.4 }], ph: 0 },
    { id: "u-media", short: "الإعلام", lvl: 1, r: [4.5, 13, -30, -25.5], name: "شعبة الإعلام", sub: "media1", doors: [{ s: "W", at: -26.4 }], ph: 1, poster: "مهام شعبة الإعلام" },
    { id: "u-plan", short: "التخطيط والمتابعة", lvl: 1, r: [4.5, 13, -25.5, -22], name: "شعبة التخطيط والمتابعة", code: "01G018", sub: "plan", doors: [{ s: "W", at: -22.9 }], ph: 1, poster: "مهام شعبة التخطيط والمتابعة" },
    { id: "u-acc", short: "الحسابات", lvl: 1, r: [4.5, 13, -22, -17], name: "شعبة الحسابات", code: "01G021", sub: "acc", doors: [{ s: "W", at: -17.9 }], ph: 1, poster: "مهام شعبة الحسابات" },
    { id: "u-prom", short: "لجنة الترقيات", lvl: 1, r: [4.5, 13, -17, -12.5], name: "لجنة الترقيات", code: "01G023", sub: "staff", doors: [{ s: "W", at: -13.5 }], ph: 0 },
    { id: "u-025", short: "01G025", lvl: 1, r: [4.5, 13, -12.5, -9], name: "غرفة إدارية", code: "01G025", sub: "staff", doors: [{ s: "W", at: -10.1 }], ph: 0 },
    { id: "u-wc", short: "الصحيات", lvl: 1, r: [4.5, 8, -9, -6], name: "الصحيات", sub: "wc", doors: [{ s: "F", at: 6.3, k: "lattice" }], ph: 1, noPlate: 1 },
    { id: "u-stair", short: "الدرج", lvl: 1, r: [8, 13, -9, 0], name: "الدرج", sub: "stair", doors: [{ s: "W", at: -1.0, w: 1.4, k: "open" }], ph: 1, noPlate: 1 }
  ];
  /* المناطق المفتوحة (بلا جدران خاصة بها) */
  const OPEN = [
    { id: "g-lobby", lvl: 0, r: [-1.5, 8, -6, 0], name: "المدخل والاستعلامات", short: "المدخل", kind: "lobby" },
    { id: "g-cor", lvl: 0, r: [CX0, CX1, ZE, -6], name: "الممر – الطابق الأرضي", short: "الممر", kind: "corridor" },
    { id: "u-glass", lvl: 1, r: [-1.5, 3, -4, 0], name: "مكتب الشؤون الإدارية (الزجاجي)", short: "المكتب الزجاجي", kind: "office" },
    { id: "u-hall", lvl: 1, r: [-1.5, 8, -9, 0], name: "بهو الشؤون الإدارية والمالية", short: "البهو", kind: "lobby" },
    { id: "u-cor", lvl: 1, r: [CX0, CX1, ZE, -9], name: "الممر – الطابق الأول", short: "الممر", kind: "corridor" },
    { id: "u-end", lvl: 1, r: [CX1, 7, ZE, -30], name: "أمام قاعة المجلس", short: "", kind: "corridor" }
  ];

  /* معلومات تظهر عند الضغط على بعض العناصر */
  const DEV = {
    board: { name: "لوحة رؤية الجامعة والكلية ورسالتهما وأهدافهما", what: "اللوحة المعلّقة في مدخل العمادة: رؤية جامعة تكريت ورسالتها وأهدافها، ورؤية كلية التربية للعلوم الصرفة ورسالتها وهدفها. النص في المجسّم مأخوذ من صورة اللوحة نفسها." },
    reception: { name: "الاستعلامات", what: "مكتب الاستعلامات عند مدخل العمادة على يمين الداخل، وبجانبه باب الدرج الزجاجي إلى الطابق الأول." },
    goldwall: { name: "شعبة الشؤون الإدارية والمالية", what: "الجدار الرخامي بالحروف الذهبية في بهو الطابق الأول، أمامه مقاعد الانتظار، وعلى يمينه باب مدير الشعبة." },
    council: { name: "قاعة مجلس الكلية", what: "طاولة الاجتماعات الطويلة بمقاعدها الجلدية البنية، وأمام المقاعد لوحات الأسماء، وفي صدر القاعة علم العراق وعلم الجامعة، وفوقها ثريّتان كريستاليتان. تُدخل من باب «أمانة المجلس» الأبيض، ويتصل بمكتب العميد بباب خشبي في آخرها." },
    deandesk: { name: "مكتب عميد الكلية", what: "مكتب العميد في الطابق الأول، يُدخل إليه من الاستقبال ثم مكتب مدير مكتب العميد، ويتصل بقاعة مجلس الكلية بباب خشبي مزدوج." },
    counter: { name: "شبابيك المراجعين", what: "شبابيك خشبية بزجاج يراجع منها الطلبة والموظفون الشعبة دون الدخول إلى المكتب." },
    shelves: { name: "رفوف الأضابير", what: "رفوف خشبية تملأ الجدار بأضابير الشعبة السوداء والزرقاء." },
    reghall: { name: "شعبة التسجيل وشؤون الطلبة", what: "القاعة ذات السقف المزخرف في نهاية ممر الطابق الأرضي، وفيها مكتب مدير شعبة التسجيل ووحدة الأضابير." }
  };

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
      red: lam(0xc8322b), green: lam(0x2f6b3a), plantG: lam(0x3f7d3a), pot: lam(0xe9e5dc), potDark: lam(0x3a3634), trunk: lam(0x6b5038), foliage: lam(0x5b8a3c, { flatShading: true }), hedge: lam(0x4f7a33, { flatShading: true }),
      roofRed: lam(0x8f2f28), roofRedD: lam(0x7e2620), iron: lam(0x2b2a29), ironGold: lam(0xb8923e), truss: lam(0x5d5a56),
      leaf: lam(0xffffff, { map: leaf, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), crystal: basic(0xffffff, { map: crystal }),
      rugDean: lam(0xffffff, { map: rugT("#b79c74", "#5a3a24", "#6f4a2c", 11) }), rugRed: lam(0xffffff, { map: rugT("#8a2328", "#3c1c1a", "#d0a565", 12) }), rugBlue: lam(0xffffff, { map: rugT("#2c3e66", "#1a2238", "#c4a568", 13) }),
      prayer: lam(0xffffff, { map: prayer }), skyWin: basic(0xbcd8ea),
      ph_board: photo("board.jpg"), ph_sign: photo("sign.jpg"), ph_win: photo("win.jpg"), ph_bigwin: photo("bigwin.jpg"),
      ph_grille: (() => { const t = photoTex("grille.jpg"); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return lam(0xffffff, { map: t, side: THREE.DoubleSide }); })(),
      ph_doorpanel: photo("doorpanel.jpg", { side: THREE.DoubleSide }), ph_logo_col: photo("logo_col.jpg"), ph_logo_uni: photo("logo_uni.jpg"),
      ph_council: (() => { const t = photoTex("council.jpg"); t.repeat.set(1, 0.27); t.offset.set(0, 0.73); return lam(0xffffff, { map: t }); })()
    });
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
  /* ملصق «مهام الشعبة»: العنوان فقط، والأسطر رمادية لأنها غير مقروءة في الصور */
  function posterMat(title) {
    return lam(0xffffff, { map: textTex(256, 360, (g, w, h) => {
      g.fillStyle = "#e9e2d2"; g.fillRect(0, 0, w, h); g.fillStyle = "#fbfaf6"; g.fillRect(14, 14, w - 28, h - 28);
      g.strokeStyle = "#6b5530"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = "#a11c1c"; fitFont(g, title, 800, 26, w - 40); g.fillText(title, w / 2, 44);
      g.fillStyle = "rgba(40,40,40,.55)"; for (let y = 76; y < h - 30; y += 15) g.fillRect(28 + ((y * 7) % 23), y, w - 56 - ((y * 13) % 40), 5);
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
    const top = d.k === "glass2" ? 2.5 : (d.k === "council" || d.k === "open" || d.k === "wood2") ? 2.45 : 2.25;
    if (d.s === "W" || d.s === "E") { const c = d.s === "W" ? x0 : x1; return { axis: "Z", c, w, top, x: c, z: d.at, nx: d.s === "W" ? 1 : -1, nz: 0 }; }
    const c = d.s === "F" ? z1 : z0; return { axis: "X", c, w, top, x: d.at, z: c, nx: 0, nz: d.s === "F" ? -1 : 1 };
  }
  function holesOn(axis, c, lvl) {
    const out = [];
    ROOMS.forEach(r => {
      if (r.lvl !== lvl) return;
      (r.doors || []).forEach(d => { const p = doorPos(r, d); if (p.axis === axis && Math.abs(p.c - c) < 0.02) out.push({ a: d.at - p.w / 2, b: d.at + p.w / 2, top: p.top }); });
      if (r.win) { const p = doorPos(r, { s: r.win.s, at: 0 }); if (p.axis === axis && Math.abs(p.c - c) < 0.02) out.push({ a: r.win.a, b: r.win.b, bottom: 0.95, top: 1.95 }); }
    });
    return out;
  }
  /* جدار خارجي بطبقتين: داخلية بيضاء وخارجية حجرية. s: جهة الخارج */
  function extX(z, xa, xb, lvl, s, holes = [], outKey = "ext") {
    wallX("wall", z - s * 0.09, xa, xb, lvl, 0.12, holes, true);
    wallX(outKey, z + s * 0.06, xa - 0.15, xb + 0.15, lvl, 0.18, holes.map(h => Object.assign({}, h)), false);
  }
  function extZ(x, za, zb, lvl, s, holes = [], outKey = "ext") {
    wallZ("wall", x - s * 0.09, za, zb, lvl, 0.12, holes, true);
    wallZ(outKey, x + s * 0.06, za - 0.15, zb + 0.15, lvl, 0.18, holes, false);
  }
  const WALLS = {
    0: { Z: [[0.5, -31.5, -6], [4.5, -31.5, -6], [8, -9, 0], [-1.5, -6, 0], [-1.5, -42, -31.5], [7.5, -42, -31.5]],
         X: [[-6, -8, 0.5], [-6, 4.5, 8], [-11, -8, 0.5], [-16, -8, 0.5], [-22, -8, 0.5], [-26, -8, 0.5], [-31.5, -8, 13], [-37, -8, -1.5], [-9, 4.5, 13], [-15, 4.5, 13], [-20, 4.5, 13], [-25.5, 4.5, 13], [-7.1, 8, 13]] },
    1: { Z: [[0.5, -32, -9], [-1.5, -9, 0], [-4, -32, -27], [1.5, -42, -32], [4.5, -30, -6], [7, -42, -30], [8, -9, -6]],
         X: [[-9, -8, 0.5], [-13.5, -8, 0.5], [-16.5, -8, 0.5], [-20, -8, 0.5], [-24, -8, 0.5], [-27, -8, 0.5], [-32, -8, 1.5], [-31.5, 1.5, 7], [-30, 4.5, 13], [-35, 7, 13], [-25.5, 4.5, 13], [-22, 4.5, 13], [-17, 4.5, 13], [-12.5, 4.5, 13], [-9, 4.5, 13], [-7.1, 8, 13], [-6, 4.5, 8]] }
  };
  /* الأرضيات والسقوف للمناطق المفتوحة (القطع لا تتداخل) */
  const OPENFLOOR = {
    0: [{ r: [-1.5, 8, -6, 0], f: "carpetG", c: "cove" }, { r: [CX0, CX1, ZE, -6], f: "carpetG", c: "cove" }, { r: [8, 13, -7.1, 0], f: "marbleF", c: "stairwell" }],
    1: [{ r: [-1.5, 3, -9, -4], f: "carpetG", c: "ceil" }, { r: [3, 8, -6, 0], f: "carpetG", c: "ceil" }, { r: [3, CX1, -9, -6], f: "carpetG", c: "ceil" }, { r: [-1.5, 3, -4, 0], f: "carpetB", c: "ceil" },
        { r: [CX0, CX1, ZE, -9], f: "carpetG", c: "cove" }, { r: [CX1, 7, ZE, -30], f: "carpetG", c: "ceil" }, { r: [8, 13, -1.6, 0], f: "stairT", c: "stairtop" }]
  };
  const FLOORKEY = { store: "terr", archive: "terr", pantry: "terr", wc: "terr", acc: "terr", reg: "carpetS", council: "carpetS" };
  function shell() {
    [0, 1].forEach(lvl => {
      const y = lvl * FH;
      LAYER = lvl ? "s1" : "s0";
      // الجدران الخارجية
      extX(BZ1, BX0, BX1, lvl, 1, lvl ? [] : [{ a: 0.9, b: 4.1, top: 3.45 }, { a: 8.6, b: 9.6, top: 2.3 }]);
      extX(BZ0, BX0, BX1, lvl, -1);
      extZ(BX0, BZ0, BZ1, lvl, -1);
      extZ(BX1, BZ0, BZ1, lvl, 1, [], "extSide");
      // الجدران الداخلية مع فتحات الأبواب
      WALLS[lvl].Z.forEach(([x, a, b]) => wallZ("wall", x, a, b, lvl, T, holesOn("Z", x, lvl)));
      WALLS[lvl].X.forEach(([z, a, b]) => wallX("wall", z, a, b, lvl, T, holesOn("X", z, lvl)));
      // الأرضيات
      ROOMS.filter(r => r.lvl === lvl && r.sub !== "stair").forEach(r => flat(FLOORKEY[r.sub] || "carpetB", r.r[0], r.r[2], r.r[1], r.r[3], y + 0.004));
      OPENFLOOR[lvl].forEach(o => flat(o.f, o.r[0], o.r[2], o.r[1], o.r[3], y + (o.f === "stairT" ? 0.004 : 0.004)));
      // السقوف
      LAYER = lvl ? "c1" : "c0";
      const cy = y + CH;
      ROOMS.filter(r => r.lvl === lvl && r.sub !== "stair").forEach(r => {
        const k = r.sub === "reg" ? "ceilReg" : (r.sub === "council" || r.sub === "dean" || r.sub === "deanSec") ? "ceilW" : "ceil";
        flat(k, r.r[0], r.r[2], r.r[1], r.r[3], cy, true);
      });
      OPENFLOOR[lvl].forEach(o => {
        const [x0, x1, z0, z1] = o.r;
        if (o.c === "cove") coveCeiling(x0, x1, z0, z1, cy, z1 - z0 > x1 - x0 ? "z" : "x");
        else if (o.c === "ceil") flat("ceil", x0, z0, x1, z1, cy, true);
        else if (o.c === "stairwell") flat("ceilW", x0, -1.6, x1, z1, cy, true);
        else if (o.c === "stairtop") flat("ceilW", 8, -7.1, 13, 0, cy, true);
      });
    });
    // البلاطة بين الطابقين (تُخفى مع الطابق الأول في العرض العلوي) مع فتحة الدرج
    LAYER = "s1";
    [[BX0, BX1, BZ0, -7.1], [BX0, 8, -7.1, BZ1], [8, BX1, -1.6, BZ1]].forEach(([x0, x1, z0, z1]) => bx("slab", x0, CH + 0.012, z0, x1, FH - 0.002, z1));
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
    // درج الصعود إلى السطح غير مصوّر، فالسطح مغلق
    stairsCore();
    facade();
    glassOffice();
    partition8();
    // الركن الميت بين ممر الطابق الأول وقاعة المجلس
    LAYER = "s1"; bx("wall", CX0 - 0.07, FH, -32.07, 1.57, 2 * FH, ZE + 0.07); solid(1, CX0, -32.07, 1.57, ZE + 0.07);
  }
  /* سقف بإنارة مخفية صفراء على جانبي تجويف وسطي (كما في الممر والمدخل) */
  function coveCeiling(x0, x1, z0, z1, cy, along) {
    const m = 0.75, d = 0.2;
    if (along === "z") {
      flat("ceilW", x0, z0, x0 + m, z1, cy - d, true); flat("ceilW", x1 - m, z0, x1, z1, cy - d, true); flat("ceilW", x0 + m, z0, x1 - m, z1, cy, true);
      bx("cove", x0 + m - 0.02, cy - d, z0, x0 + m, cy, z1); bx("cove", x1 - m, cy - d, z0, x1 - m + 0.02, cy, z1);
      for (let z = z1 - 1.2; z > z0 + 0.5; z -= 2.2) { addInst("down", x0 + m / 2, cy - d - 0.005, z); addInst("down", x1 - m / 2, cy - d - 0.005, z); }
    } else {
      flat("ceilW", x0, z0, x1, z0 + m, cy - d, true); flat("ceilW", x0, z1 - m, x1, z1, cy - d, true); flat("ceilW", x0, z0 + m, x1, z1 - m, cy, true);
      bx("cove", x0, cy - d, z0 + m - 0.02, x1, cy, z0 + m); bx("cove", x0, cy - d, z1 - m, x1, cy, z1 - m + 0.02);
      for (let x = x0 + 1.0; x < x1 - 0.5; x += 2.2) { addInst("down", x, cy - d - 0.005, z0 + m / 2); addInst("down", x, cy - d - 0.005, z1 - m / 2); }
    }
  }
  /* شبّاك داخلي (زجاج وإطار) على الوجه الداخلي لجدار خارجي، وصورة الشبّاك الحقيقية على الوجه الخارجي */
  function windowAt(side, u, lvl, w = 1.2, h = 1.3, y0 = 1.0, outMat = "ph_win", ow = 1.4, oh = 1.4, oy) {
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
    // عتبة
    if (isZ) bx("stoneT", ix - 0.12, y - 0.08, u - w / 2 - 0.1, ix + 0.12, y - 0.04, u + w / 2 + 0.1); else bx("stoneT", u - w / 2 - 0.1, y - 0.08, iz - 0.12, u + w / 2 + 0.1, y - 0.04, iz + 0.12);
    if (outMat) planeAt(MAT[outMat], ow, oh, ox, oy != null ? lvl * FH + oy : cyy, oz, P.ry + Math.PI);
  }
  /* نوافذ الغرف المطلّة على الخارج (الجهة الخلفية والجانبية)، والواجهة الأمامية مرسومة يدوياً */
  function roomWindows() {
    ROOMS.forEach(r => {
      if (r.sub === "stair") return;
      LAYER = r.lvl ? "s1" : "s0";
      const [x0, x1, z0, z1] = r.r;
      if (x0 === BX0 && z1 - z0 >= 2.8) windowAt("W", (z0 + z1) / 2, r.lvl);
      if (x1 === BX1 && z1 - z0 >= 2.8) windowAt("E", (z0 + z1) / 2, r.lvl);
      if (z0 === BZ0) { const n = x1 - x0 > 7 ? 2 : 1; for (let i = 0; i < n; i++) windowAt("B", x0 + (x1 - x0) * (i + 0.5) / n, r.lvl); }
    });
  }
  /* الواجهة الأمامية: الأكتاف المضلّعة، الأحزمة الحجرية، الشبابيك، المدخل ولوحته */
  function facade() {
    LAYER = "s0";
    const zf = BZ1 + 0.15;
    // القاعدة الحجرية
    bx("plinth", BX0 - 0.17, GY, BZ0 - 0.17, BX1 + 0.17, 0.0, BZ1 + 0.17);
    // حزام حجري عند مستوى البلاطة وأسفل الستارة
    [[FH - 0.12, FH + 0.12]].forEach(([a, b]) => {
      bx("stoneT", BX0 - 0.2, a, zf - 0.02, 0.8, b, zf + 0.08); bx("stoneT", 4.2, a, zf - 0.02, BX1 + 0.2, b, zf + 0.08);
      bx("stoneT", BX0 - 0.2, a, BZ0 - 0.25, BX1 + 0.2, b, BZ0 - 0.15);
      bx("stoneT", BX0 - 0.25, a, BZ0 - 0.2, BX0 - 0.15, b, BZ1 + 0.2);
    });
    // أكتاف مضلّعة
    [BX0 + 0.3, 0.55, 4.45, 8.2, BX1 - 0.3].forEach(x => bx("flute", x - 0.3, 0, zf - 0.02, x + 0.3, 2 * FH - 0.6, zf + 0.12));
    // شبابيك الطابق الأرضي الأمامية ولوحات نصف الدائرة
    windowAt("F", -6.1, 0, 1.1, 1.2, 1.0, "ph_win", 1.35, 1.35); windowAt("F", -3.3, 0, 1.1, 1.2, 1.0, "ph_win", 1.35, 1.35);
    planeAt(MAT.relief, 1.25, 0.95, -4.7, 1.55, zf + 0.012, 0);
    windowAt("F", -0.45, 0, 0.8, 1.2, 1.0, "ph_win", 1.0, 1.25); windowAt("F", 6.1, 0, 1.1, 1.2, 1.0, "ph_win", 1.35, 1.35); windowAt("F", 11.6, 0, 1.1, 1.2, 1.0, "ph_win", 1.35, 1.35);
    // الطابق الأول: شبّاكان كبيران بمشبّك حديدي أسود (يسار الواجهة) وشبابيك صغيرة
    LAYER = "s1";
    windowAt("F", -6.2, 1, 2.0, 1.9, 0.95, "ph_bigwin", 2.3, 2.3, 1.9);
    windowAt("F", -3.3, 1, 2.0, 1.9, 0.95, "ph_bigwin", 2.3, 2.3, 1.9);
    windowAt("F", -0.6, 1, 0.8, 1.2, 1.0, "ph_win", 1.0, 1.25);
    windowAt("F", 2.5, 1, 0.9, 0.95, 1.6, "ph_win", 1.05, 1.1, 2.1);
    windowAt("F", 6.1, 1, 1.1, 1.2, 1.0, "ph_win", 1.35, 1.35); windowAt("F", 10.9, 1, 1.1, 1.2, 1.0, "ph_win", 1.35, 1.35);
    // المدخل: أبواب زجاجية بإطار أسود، لوحتان مشبّكتان على الجانبين، ومشبّك أسود وذهبي فوقها
    LAYER = "s0";
    frameX("frameBlack", 0, 0.9, 4.1, 0, 3.45, 0.08, 0.16);
    bx("frameBlack", 0.9, 2.42, -0.1, 4.1, 2.5, 0.1); bx("frameBlack", 1.56, 0, -0.08, 1.64, 2.45, 0.08); bx("frameBlack", 3.36, 0, -0.08, 3.44, 2.45, 0.08);
    planeAt(MAT.ph_doorpanel, 0.66, 2.42, 1.25, 1.21, 0.0, 0); planeAt(MAT.ph_doorpanel, 0.66, 2.42, 3.75, 1.21, 0.0, 0);
    planeAt(MAT.ph_grille, 3.2, 0.95, 2.5, 2.96, 0.0, 0);
    solid(0, 0.9, -0.1, 1.6, 0.1); solid(0, 3.4, -0.1, 4.1, 0.1);
    // ضلفتا الباب الزجاجي مفتوحتان إلى الداخل
    [[1.6, 1], [3.4, -1]].forEach(([hx, s]) => { addObj(compactDoor([B(0.04, 2.3, 0.78, MAT.glassDoor, 0, 0.06, -0.43), B(0.06, 0.08, 0.86, MAT.frameBlack, 0, 0.02, -0.43), B(0.06, 0.08, 0.86, MAT.frameBlack, 0, 2.32, -0.43), B(0.06, 2.38, 0.05, MAT.frameBlack, 0, 0.02, -0.84), B(0.03, 0.5, 0.03, MAT.chrome, s * 0.05, 0.85, -0.75)], hx + s * 0.03, 0, -0.1, s * 0.12)); });
    // لوحة العمادة المضيئة فوق المدخل
    LAYER = "s1";
    bx("frameBlack", 0.8, 3.48, zf + 0.06, 4.2, 5.3, zf + 0.2);
    planeAt(MAT.ph_sign, 3.3, 1.73, 2.5, 4.39, zf + 0.205, 0);
    [1.3, 2.5, 3.7].forEach(x => device(null, [B(0.08, 0.06, 0.32, MAT.black, 0, 0, 0.16), B(0.18, 0.05, 0.1, MAT.led, 0, -0.03, 0.34)], x, 5.36, zf + 0.06, 0, 1));
    // درجات المدخل
    LAYER = "site";
    bx("stoneT", 0.4, -0.15, zf, 4.6, 0.0, 0.9); bx("stoneT", 0.4, -0.3, 0.9, 4.6, -0.15, 1.2); bx("stoneT", 0.4, GY, 1.2, 4.6, -0.3, 1.5);
    flat("marbleF", 0.4, zf, 4.6, 0.9, 0.003);
    // الباب الثاني في الواجهة (يفتح على بيت الدرج) ولافتته
    LAYER = "s0";
    frameX("frameBlack", 0, 8.6, 9.6, 0, 2.3, 0.07, 0.14);
    addObj(compactDoor([B(0.88, 2.24, 0.05, MAT.glassDoor, 0.44, 0, 0), B(0.92, 0.08, 0.07, MAT.frameBlack, 0.44, 0, 0), B(0.92, 0.1, 0.07, MAT.frameBlack, 0.44, 2.18, 0), B(0.06, 2.28, 0.07, MAT.frameBlack, 0.88, 0, 0)], 8.62, 0, -0.08, 1.45));
    pic(bannerMat("عام الجودة", "جامعة تكريت – كلية التربية للعلوم الصرفة"), 1.6, 0.5, 9.6, 2.7, zf + 0.03, 0, "white", 0.02);
    // الجانب الشرقي: أكتاف حجرية ووحدات تبريد خارجية كثيرة
    for (let z = -1.5; z > BZ0; z -= 6) bx("stoneT", BX1 + 0.15, 0, z - 0.3, BX1 + 0.27, 2 * FH - 0.6, z + 0.3);
    const R = rng(55);
    for (let z = -3.5; z > BZ0 + 1; z -= 3.0) [0, 1].forEach(l => { if (R() < 0.75) acOut(BX1 + 0.17, l * FH + 0.6 + R() * 1.6, z + (R() - 0.5) * 1.2); });
    // علم العراق على السطح وكشّافات الإنارة
    LAYER = "roof";
    const fx = -2.2, fz = -1.2, fy = 2 * FH;
    device(null, [C(0.12, 0.3, MAT.stoneT, 0, 0, 0), C(0.035, 5.2, MAT.steel, 0, 0.3, 0, 8), mm(new THREE.SphereGeometry(0.07, 8, 6), MAT.gold, 0, 5.52, 0)], fx, fy, fz, 0, 1);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.1, 8, 1), flagMat("iq"));
    const pa = fl.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const u = (pa.getX(i) + 0.825) / 1.65; pa.setZ(i, Math.sin(u * 5.2) * 0.07 * u); }
    fl.geometry.computeVertexNormals(); fl.position.set(fx + 0.86, fy + 4.85, fz); addObj(fl);
    [[BX0 + 0.4, BZ1 - 0.3], [-2.0, BZ1 - 0.3], [6.5, BZ1 - 0.3], [BX1 - 0.4, BZ1 - 0.3]].forEach(([x, z]) => device(null, [B(0.06, 0.4, 0.06, MAT.greyDark, 0, 0, 0), B(0.5, 0.36, 0.14, MAT.greyDark, 0, 0.4, 0.05), B(0.42, 0.28, 0.02, MAT.led, 0, 0.44, 0.13)], x, PY_TOP(), z, 0, 1));
  }
  const PY_TOP = () => 2 * FH + 1.08;
  /* باب مفتوح: يُدار حول مفصله */
  function compactDoor(parts, x, y, z, ry) { const g = new THREE.Group(); parts.forEach(p => g.add(p)); g.position.set(x, y, z); g.rotation.y = ry; const c = compact(g); return c; }
  function acOut(x, y, z) {
    device(null, [B(0.3, 0.55, 0.78, MAT.devWhite, 0.15, 0, 0), mm(new THREE.CircleGeometry(0.2, 18), MAT.greyDark, 0.305, 0.28, 0.08, 0, Math.PI / 2, 0), B(0.32, 0.03, 0.03, MAT.steel, 0.16, -0.03, -0.3), B(0.32, 0.03, 0.03, MAT.steel, 0.16, -0.03, 0.3)], x, y, z, 0, 0);
  }
  /* مكتب الشؤون الإدارية الزجاجي في بهو الطابق الأول */
  function glassOffice() {
    LAYER = "s1";
    const y = FH, x0 = -1.5, x1 = 3, zb = -4, dx = 1.3;
    const pane = (a0, a1, axis) => {
      if (axis === "z") { bx("alu", x1 - 0.04, y, a0, x1 + 0.04, y + 0.1, a1); bx("alu", x1 - 0.04, y + 2.55, a0, x1 + 0.04, y + CH, a1); planeAt(MAT.glassDark, a1 - a0, 2.45, x1, y + 1.325, (a0 + a1) / 2, Math.PI / 2); solid(1, x1 - 0.05, a0, x1 + 0.05, a1); }
      else { bx("alu", a0, y, zb - 0.04, a1, y + 0.1, zb + 0.04); bx("alu", a0, y + 2.55, zb - 0.04, a1, y + CH, zb + 0.04); planeAt(MAT.glassDark, a1 - a0, 2.45, (a0 + a1) / 2, y + 1.325, zb, 0); solid(1, a0, zb - 0.05, a1, zb + 0.05); }
    };
    pane(zb, -0.15, "z"); for (let z = zb; z < -0.15; z += 1.3) bx("alu", x1 - 0.04, y, z - 0.03, x1 + 0.04, y + CH, z + 0.03);
    pane(x0 + 0.07, dx - 0.5, "x"); pane(dx + 0.5, x1, "x");
    [x0 + 0.07, dx - 0.5, dx + 0.5, x1].forEach(x => bx("alu", x - 0.03, y, zb - 0.04, x + 0.03, y + CH, zb + 0.04));
    bx("alu", dx - 0.5, y + 2.3, zb - 0.04, dx + 0.5, y + 2.55, zb + 0.04);
    addObj(compactDoor([B(0.94, 2.26, 0.04, MAT.glassDoor, 0.47, 0.02, 0), B(0.98, 0.06, 0.06, MAT.alu, 0.47, 0, 0), B(0.98, 0.06, 0.06, MAT.alu, 0.47, 2.24, 0), B(0.05, 2.3, 0.06, MAT.alu, 0.95, 0, 0)], dx - 0.48, y, zb + 0.03, -1.4));
  }
  /* الطابق الأول عند بيت الدرج: حاجز زجاجي داكن فوق جدار منخفض ودرابزين ذهبي */
  function partition8() {
    LAYER = "s1";
    const y = FH, x = 8;
    wallZ("wall", x, -6, -1.75, 1, T, [], true, 0, 1.0);
    wallZ("wall", x, -6, -1.75, 1, T, [], false, 2.7, FH);
    planeAt(MAT.glassDark, 4.25, 1.7, x, y + 1.85, -3.875, Math.PI / 2);
    for (let z = -6; z <= -1.74; z += 1.06) bx("alu", x - 0.03, y + 1.0, z - 0.025, x + 0.03, y + 2.7, z + 0.025);
    bx("goldTrim", x - 0.1, y + 1.0, -6, x + 0.1, y + 1.06, -1.75);
    wallZ("wall", x, -0.3, 0, 1, T, [], true);
    bx("wall", x - T / 2, y + 2.45, -1.75, x + T / 2, y + FH, -0.3);
  }

  /* ---------------------------------------------------------------
     الدرج: على يمين الداخل خلف الباب الزجاجي، بقلبتين وبسطة وسطية،
     مكسو بموكيت رمادي ودرابزين ذهبي
  --------------------------------------------------------------- */
  const SA = { x0: 10.85, x1: 12.75, z0: -1.6 }, SB = { x0: 8.15, x1: 10.65 }, LZ0 = -7.0, LZ1 = -4.6, LY = FH / 2, NST = 10;
  function stairsCore() {
    LAYER = "s0";
    const rise = LY / NST;
    for (let i = 0; i < NST; i++) {
      // القلبة الأولى: تصعد نحو الشمال
      const za = SA.z0 - i * RUN, zb = za - RUN, ya = (i + 1) * rise;
      bx("stairT", SA.x0, 0, zb, SA.x1, ya, za);
      bx("stairNose", SA.x0, ya - 0.025, za - 0.03, SA.x1, ya + 0.004, za + 0.004);
      // القلبة الثانية: تصعد نحو الجنوب حتى الطابق الأول
      const zc = LZ1 + i * RUN, zd = zc + RUN, yc = LY + (i + 1) * rise;
      bx("wallM", SB.x0, yc - 0.45, zc, SB.x1, yc - 0.2, zd); bx("stairT", SB.x0, yc - 0.2, zc, SB.x1, yc, zd);
      bx("stairNose", SB.x0, yc - 0.025, zc - 0.004, SB.x1, yc + 0.004, zc + 0.03);
    }
    // البسطة الوسطية
    bx("wallM", SB.x0, 0, LZ0, SA.x1, LY - 0.02, LZ1); flat("stairT", SB.x0, LZ0, SA.x1, LZ1, LY);
    // درابزين ذهبي مائل بين القلبتين
    const ang = Math.atan2(LY, NST * RUN), L = Math.hypot(LY, NST * RUN);
    const rail = (x, z0, z1, y0, y1, up) => {
      addGeo("gold", new THREE.BoxGeometry(0.05, 0.05, L), x, (y0 + y1) / 2 + 0.92, (z0 + z1) / 2, 0, 1, 1, 1, up ? ang : -ang);
      for (let i = 0; i <= NST; i++) { const t = i / NST, z = z0 + (z1 - z0) * t, yy = y0 + (y1 - y0) * t; bx("gold", x - 0.012, yy, z - 0.012, x + 0.012, yy + 0.92, z + 0.012); }
    };
    rail(10.75, SA.z0, LZ1, 0, LY, true);
    rail(10.75, LZ1, SA.z0, LY, FH, false);
    // درابزين البسطة العلوية حول فتحة الدرج في الطابق الأول
    LAYER = "s1";
    bx("gold", SA.x0 - 0.2, FH + 0.92, SA.z0 - 0.03, SA.x1, FH + 0.97, SA.z0 + 0.03);
    for (let x = SA.x0 - 0.2; x <= SA.x1; x += 0.15) bx("gold", x - 0.012, FH, SA.z0 - 0.012, x + 0.012, FH + 0.92, SA.z0 + 0.012);
    // التصادم: لا يُمشى تحت القلبة الثانية المنخفضة ولا فوق فتحة الدرج
    solid(0, SB.x0, LZ0, SA.x1, LZ1 + 1.0); solid(0, SB.x1, LZ1, SA.x0, SA.z0); solid(0, SA.x0, LZ1, SA.x1, SA.z0 - 1.0);
    solid(1, SA.x0 - 0.2, LZ0, SA.x1, SA.z0 - 0.02); solid(1, SB.x0, LZ0, SB.x1, SA.z0 - 1.0);
    // سجاد الصلاة وخزانة الأحذية عند قاعدة الدرج، وشبّاك البسطة
    LAYER = "s0";
    [[8.55, 9.3], [9.5, 10.25]].forEach(([a, b]) => flat("prayer", a, -3.35, b, -2.0, 0.012));
    device(null, [B(1.0, 0.95, 0.36, MAT.woodDark), B(0.96, 0.02, 0.01, MAT.black, 0, 0.32, 0.18), B(0.96, 0.02, 0.01, MAT.black, 0, 0.64, 0.18)], 12.62, 0, -0.75, -Math.PI / 2, 0, [0.5, 0.18]);
    windowAt("E", -5.8, 0, 1.2, 1.3, LY + 0.95, "ph_win", 1.4, 1.4);
    plant(10.3, 0, -0.45, "snake");
  }

  /* ---------------------------------------------------------------
     الأبواب: إطار خشبي داكن، الضلفة مفتوحة إلى الداخل، ولوحة نحاسية
     فوق كل باب بالاسم والرقم كما في الصور
  --------------------------------------------------------------- */
  const LEAF = { wood: "doorWood", dark: "doorDark", black: "doorBlack", white: "doorWhite", lattice: "lattice", wood2: "doorWood", council: "doorWhite", glass2: "glassDoor" };
  const FRAME = { white: "white", council: "white", black: "frameBlack", glass2: "frameBlack" };
  function doors() {
    ROOMS.forEach(r => (r.doors || []).forEach((d, di) => {
      const k = d.k || "wood"; if (k === "open") return;
      LAYER = r.lvl ? "s1" : "s0";
      const p = doorPos(r, d), y = r.lvl * FH, a = d.at - p.w / 2, b = d.at + p.w / 2, fk = FRAME[k] || "woodDark";
      if (p.axis === "Z") frameZ(fk, p.c, a, b, y, y + p.top, 0.08, T / 2 + 0.025); else frameX(fk, p.c, a, b, y, y + p.top, 0.08, T / 2 + 0.025);
      const double = k === "wood2" || k === "council" || k === "glass2", lw = double ? p.w / 2 - 0.02 : p.w - 0.04, lh = p.top - 0.03, lm = MAT[LEAF[k]];
      const leaves = double ? [[a + 0.02, 1], [b - 0.02, -1]] : [[a + 0.02, 1]];
      leaves.forEach(([u, s]) => {
        const hx = p.axis === "Z" ? p.c + p.nx * (T / 2) : u, hz = p.axis === "Z" ? u : p.c + p.nz * (T / 2);
        // الضلفة على امتداد اتجاه الدخول، بسماكتها على امتداد الجدار
        const ry = Math.atan2(-p.nz, p.nx), parts = [B(lw, lh, 0.045, lm, lw / 2, 0, s * 0.03)];
        parts.push(B(0.03, 0.03, 0.14, MAT.brass, lw - 0.08, 1.02, s * 0.03));
        if (k === "glass2") parts.push(mm(new THREE.PlaneGeometry(0.34, 0.34), MAT.ph_logo_col, lw / 2, 1.45, s * 0.03 + 0.026));
        addObj(compactDoor(parts, hx, y, hz, ry));
      });
      if (!r.noPlate) {
        const ox = -p.nx * (T / 2 + 0.013), oz = -p.nz * (T / 2 + 0.013);
        planeAt(plaqueMat(r.name, r.code), 0.5, 0.146, p.x + ox, y + p.top + 0.27, p.z + oz, Math.atan2(-p.nx, -p.nz));
      }
    }));
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
      } else { g.fillStyle = "#f2c230"; g.fillRect(0, 0, w, h); const im = logoImg(); if (im.complete && im.naturalWidth) g.drawImage(im, w / 2 - 50, h * 0.3, 100, 130); }
    }) }));
  }
  function plantParts(kind = "snake", s = 1) {
    const p = [C(0.16 * s, 0.32 * s, kind === "yucca" ? MAT.potDark : MAT.pot, 0, 0, 0, 14, 0.19 * s)];
    if (kind === "snake") { const R = rng(3); for (let i = 0; i < 9; i++) { const h = (0.55 + R() * 0.45) * s, a = R() * 6.28, r = R() * 0.09 * s; p.push(mm(new THREE.BoxGeometry(0.055 * s, h, 0.012), MAT.plantG, Math.cos(a) * r, 0.3 * s + h / 2, Math.sin(a) * r, (R() - 0.5) * 0.25, a, (R() - 0.5) * 0.25)); } }
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
  function rollupParts(title) { return [B(0.85, 0.07, 0.24, MAT.steel), B(0.02, 2.05, 0.02, MAT.steel, 0, 0.07, -0.06), mm(new THREE.PlaneGeometry(0.8, 1.95), rollupMat(title), 0, 1.07, -0.04)]; }
  const ROLL = {};
  function rollupMat(title) {
    return ROLL[title] || (ROLL[title] = lam(0xffffff, { map: textTex(200, 488, (g, w, h) => {
      g.fillStyle = "#f8f8f6"; g.fillRect(0, 0, w, h); g.fillStyle = "#123a6b"; g.fillRect(0, 0, w, 64);
      const im = logoImg(); if (im.complete && im.naturalWidth) g.drawImage(im, w / 2 - 40, 74, 80, 104);
      g.fillStyle = "#123a6b"; fitFont(g, title, 800, 22, w - 20); g.fillText(title, w / 2, 200);
      const pal = ["#d4dbe6", "#e8dcc2", "#d9e6d4"]; for (let i = 0; i < 8; i++) { g.fillStyle = pal[i % 3]; g.fillRect(14 + (i % 2) * 90, 226 + Math.floor(i / 2) * 58, 82, 48); }
      g.fillStyle = "#123a6b"; g.fillRect(0, h - 30, w, 30);
    }) }));
  }
  function tvParts(w = 1.2) { return [B(w, w * 0.58, 0.05, MAT.black), mm(new THREE.PlaneGeometry(w - 0.05, w * 0.58 - 0.05), MAT.screenOn, 0, w * 0.29, 0.027)]; }
  function clockParts() { return [mm(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), MAT.goldTrim, 0, 0, 0, Math.PI / 2), mm(new THREE.CircleGeometry(0.15, 24), MAT.white, 0, 0, 0.021), B(0.012, 0.1, 0.005, MAT.black, 0, -0.01, 0.024), B(0.075, 0.012, 0.005, MAT.black, 0.03, -0.006, 0.024)]; }
  function splitAC() { return [B(0.9, 0.3, 0.22, MAT.devWhite), B(0.84, 0.03, 0.02, MAT.devGrey, 0, 0.05, 0.11)]; }
  function wallItem(parts, x, y, z, face, lvl) { device(null, parts, x, y, z, FACE[face], lvl); }
  function chandelier(kind) {
    if (kind === "lantern") return [C(0.012, 0.22, MAT.goldTrim, 0, -0.22, 0, 6), B(0.5, 0.03, 0.5, MAT.goldTrim, 0, -0.25, 0), B(0.42, 0.26, 0.42, MAT.ledWarm, 0, -0.52, 0), B(0.48, 0.04, 0.48, MAT.goldTrim, 0, -0.56, 0), B(0.02, 0.3, 0.02, MAT.goldTrim, 0.23, -0.56, 0.23), B(0.02, 0.3, 0.02, MAT.goldTrim, -0.23, -0.56, 0.23), B(0.02, 0.3, 0.02, MAT.goldTrim, 0.23, -0.56, -0.23), B(0.02, 0.3, 0.02, MAT.goldTrim, -0.23, -0.56, -0.23), mm(new THREE.ConeGeometry(0.2, 0.2, 4), MAT.goldTrim, 0, -0.66, 0, Math.PI, Math.PI / 4)];
    const p = [C(0.015, 0.4, MAT.goldTrim, 0, -0.4, 0, 6)];
    [[0.42, -0.62], [0.3, -0.85], [0.16, -1.02]].forEach(([r, y]) => { p.push(mm(new THREE.TorusGeometry(r, 0.018, 6, 24), MAT.goldTrim, 0, y, 0, Math.PI / 2)); for (let i = 0; i < Math.round(r * 30); i++) { const a = i / Math.round(r * 30) * Math.PI * 2; p.push(C(0.018, 0.2, MAT.crystal, Math.cos(a) * r, y - 0.2, Math.sin(a) * r, 6)); } });
    p.push(mm(new THREE.SphereGeometry(0.1, 10, 8), MAT.ledWarm, 0, -0.75, 0));
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
     الأماكن العامة: المدخل، الممران، بهو الطابق الأول، أمام قاعة المجلس
  --------------------------------------------------------------- */
  /* لوحات بإطار ذهبي على جدران الممر مع إنارة جدارية، تتجنّب الأبواب */
  function wallPanels(axis, c, face, a, b, lvl, sconce = true) {
    const y = lvl * FH, holes = holesOn(axis, c, lvl), off = face * (T / 2 + 0.008);
    for (let u = a + 0.9; u <= b - 0.9; u += 1.6) {
      if (holes.some(h => u + 0.75 > h.a - 0.25 && u - 0.75 < h.b + 0.25)) continue;
      const bar = (u0, u1, y0, y1) => axis === "Z" ? bx("molding", c + off - 0.012, y0, u0, c + off + 0.012, y1, u1) : bx("molding", u0, y0, c + off - 0.012, u1, y1, c + off + 0.012);
      bar(u - 0.45, u + 0.45, y + 0.5, y + 0.535); bar(u - 0.45, u + 0.45, y + 2.115, y + 2.15); bar(u - 0.45, u - 0.415, y + 0.5, y + 2.15); bar(u + 0.415, u + 0.45, y + 0.5, y + 2.15);
      if (sconce) {
        const px = axis === "Z" ? c + off : u, pz = axis === "Z" ? u : c + off, ry = axis === "Z" ? (face > 0 ? Math.PI / 2 : -Math.PI / 2) : (face > 0 ? 0 : Math.PI);
        device(null, [B(0.1, 0.24, 0.08, MAT.black, 0, 0, 0.04), B(0.08, 0.04, 0.02, MAT.ledWarm, 0, 0.24, 0.05)], px, y + 2.3, pz, ry, lvl);
      }
    }
  }
  function lobby() {
    LAYER = "s0";
    // لوحة الرؤية والرسالة على الجدار الأيسر للداخل، وصندوقا الشكاوى وجهاز البصمة
    const bp = pic(MAT.ph_board, 2.4, 2.12, -1.5 + T / 2 + 0.03, 1.72, -2.45, Math.PI / 2, "frameBlack", 0.04);
    bp.userData.device = "board"; PICK.push(bp);
    device(null, [B(0.34, 0.42, 0.18, MAT.white), B(0.2, 0.02, 0.01, MAT.black, 0, 0.32, 0.091), B(0.3, 0.08, 0.01, MAT.seatBlue, 0, 0.1, 0.091)], -1.5 + T / 2, 1.15, -0.62, Math.PI / 2, 0);
    device(null, [B(0.3, 0.38, 0.16, MAT.devWhite), B(0.24, 0.06, 0.01, MAT.red, 0, 0.28, 0.081)], -1.5 + T / 2, 1.15, -4.15, Math.PI / 2, 0);
    device(null, [B(0.14, 0.2, 0.06, MAT.black), B(0.09, 0.07, 0.01, MAT.screenOn, 0, 0.11, 0.031)], -0.7, 1.3, -6 + T / 2, 0, 0);
    plant(-1.0, 0, -0.55, "yucca", 1.1);
    // الاستعلامات: مكتب أبيض بشرائح خشبية بنية، وعليه علم صغير
    const rec = [B(2.3, 1.05, 0.62, MAT.white), B(2.4, 0.05, 0.72, MAT.white, 0, 1.05, 0.04), B(2.1, 0.06, 0.4, MAT.woodLight, 0, 0.74, -0.45)];
    for (let i = 0; i < 9; i++) rec.push(B(0.09, 0.9, 0.03, MAT.wood, -1.0 + i * 0.25, 0.08, 0.325));
    rec.push(C(0.05, 0.02, MAT.gold, 0.85, 1.1, 0.05, 8), C(0.006, 0.38, MAT.gold, 0.85, 1.12, 0.05, 6), mm(new THREE.PlaneGeometry(0.22, 0.15), flagMat("iq"), 0.96, 1.42, 0.05));
    device("reception", rec, 6.1, 0, -4.8, 0, 0, [1.2, 0.36]);
    device(null, chairExec(MAT.black, 0.7), 6.1, 0, -5.55, 0, 0);
    plant(7.6, 0, -0.5, "snake"); plant(4.6, 0, -0.5, "snake");
    // ممر الطابق الأرضي
    wallPanels("Z", CX0, 1, ZE, -6, 0); wallPanels("Z", CX1, -1, ZE, -6, 0);
    [[CX0, 1, -12.8], [CX0, 1, -22.8], [CX1, -1, -12.8], [CX1, -1, -24.0], [CX1, -1, -18.9]].forEach(([x, s, z]) => device(null, waitingRow(3), x + s * (T / 2 + 0.3), 0, z, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0, [0.84, 0.3]));
    [[0.95, -6.6], [4.05, -9.0], [0.95, -18.0], [4.05, -27.8]].forEach(([x, z]) => plant(x, 0, z, "snake"));
    device(null, rollupParts("جامعة تكريت"), 1.05, 0, -7.4, Math.PI / 2, 0, [0.15, 0.42]);
    device(null, rollupParts("كلية التربية للعلوم الصرفة"), 3.95, 0, -14.0, -Math.PI / 2, 0, [0.15, 0.42]);
    device(null, extinguisherParts(), 0.72, 0, -17.6, 0, 0);
    device(null, tvParts(1.1), CXM, 2.35, ZE + 0.6, 0, 0); bx("black", CXM - 0.02, 2.95, ZE + 0.58, CXM + 0.02, CH, ZE + 0.62);
    pic(bannerMat("شعبة الإعلام والاتصال الحكومي"), 1.5, 0.46, CX1 - T / 2 - 0.02, 2.32, -30.1, -Math.PI / 2, "white", 0.02);
  }
  function upperHall() {
    LAYER = "s1";
    const y = FH;
    // الجدار الرخامي الذهبي بحروف «شعبة الشؤون الإدارية والمالية» وشعار الكلية
    const gx = -1.5 + T / 2;
    bx("goldMarble", gx, y, -7.1, gx + 0.04, y + 3.0, -4.4);
    bx("goldTrim", gx, y + 3.0, -7.15, gx + 0.07, y + 3.06, -4.35);
    const gw = planeAt(lettersMat("شعبة الشؤون الإدارية والمالية", 1024, 140), 2.5, 0.34, gx + 0.05, y + 2.1, -5.75, Math.PI / 2);
    gw.userData.device = "goldwall"; PICK.push(gw);
    planeAt(MAT.ph_logo_col, 0.5, 0.5, gx + 0.05, y + 2.62, -5.75, Math.PI / 2);
    device("goldwall", [B(2.7, 0.08, 0.06, MAT.goldTrim, 0, 0, 0)], gx + 0.03, y + 0.12, -5.75, Math.PI / 2, 1);
    // مقاعد انتظار جلدية صفراء بأرجل كروم
    device(null, sofa(2, MAT.leatherYellow, MAT.chrome), -0.4, y, -4.5, Math.PI, 1, [0.85, 0.45]);
    device(null, sofa(2, MAT.leatherYellow, MAT.chrome), -0.5, y, -8.5, 0, 1, [0.85, 0.45]);
    device(null, coffeeTable(0.9, 0.5, MAT.glassCab), -0.4, y, -6.5, 0, 1, [0.45, 0.25]);
    device(null, extinguisherParts(), -1.3, y, -4.2, 0, 1);
    plant(4.15, y, -6.4, "snake"); plant(6.0, y, -0.5, "yucca", 1.0);
    // المكتب الزجاجي من الداخل
    device(null, officeDesk(1.4, 0.7, MAT.woodLight, MAT.white), 0.0, y, -1.2, Math.PI, 1, [0.7, 0.35]);
    device(null, chairExec(MAT.black, 0.62), 0.0, y, -0.55, Math.PI, 1);
    device(null, cabinet(1.0, 1.95, 0.42, MAT.white, true), -1.15, y, -2.2, Math.PI / 2, 1, [0.5, 0.21]);
    // ممر الطابق الأول
    wallPanels("Z", CX0, 1, ZE, -9, 1, false); wallPanels("Z", CX1, -1, -30, -9, 1, false);
    [["u-hr", -16.6], ["u-media", -27.2], ["u-plan", -23.7], ["u-acc", -18.7]].forEach(([id, z]) => { const r = roomById(id), x = r.r[0] === CX1 ? CX1 - T / 2 - 0.012 : CX0 + T / 2 + 0.012; pic(posterMat(r.poster), 0.5, 0.7, x, y + 1.55, z, x > CXM ? -Math.PI / 2 : Math.PI / 2, "frameBlack", 0.02); });
    [[0.95, -11.4], [4.05, -15.3], [0.95, -26.0]].forEach(([x, z]) => plant(x, y, z, "snake"));
    device(null, waitingRow(3), CX0 + T / 2 + 0.3, y, -13.0, Math.PI / 2, 1, [0.84, 0.3]);
    // أمام قاعة المجلس: باب «أمانة المجلس» الأبيض، رفّان ذهبيان مرآتيان، العلم، وحروف «مكتب العميد»
    const zc = ZE - T / 2 - 0.0;
    planeAt(MAT.ph_council, 1.9, 0.84, 4.25, y + 2.95, ZE + T / 2 + 0.012, 0);
    [2.75, 5.75].forEach(x => {
      const p = [B(0.9, 2.5, 0.3, MAT.white)];
      for (let i = 0; i < 5; i++) p.push(B(0.82, 0.02, 0.26, MAT.goldTrim, 0, 0.1 + i * 0.58, 0.01));
      for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) p.push(mm(new THREE.BoxGeometry(0.17, 0.02, 0.02), MAT.goldTrim, -0.3 + k * 0.2, 0.4 + j * 0.58, 0.14, 0, 0, (k + j) % 2 ? 0.78 : -0.78));
      p.push(B(0.86, 2.4, 0.01, MAT.goldMarble, 0, 0.05, -0.13));
      device("council", p, x, y, ZE + T / 2 + 0.16, 0, 1, [0.45, 0.16]);
    });
    device(null, flagStand("iq"), 1.95, y, -30.95, 0, 1, [0.18, 0.18]);
    planeAt(lettersMat("مكتب العميد", 512, 120), 1.4, 0.33, CX0 + T / 2 + 0.012, y + 2.72, -29.5, Math.PI / 2);
    device(null, extinguisherParts(), 4.3, y, -30.2, 0, 1);
    void zc;
  }

  /* ---------------------------------------------------------------
     الغرف حسب نوعها
  --------------------------------------------------------------- */
  function furnish(r) {
    if (r.sub === "stair") return;
    LAYER = r.lvl ? "s1" : "s0";
    const c = ctx(r), D = c.D, W = c.Wd, y = c.y, sub = r.sub;
    const F = { ac: true, clock: true, lights: Math.max(1, Math.round(D / 2.6)) };
    if (sub === "deputy" || sub === "regmgr" || sub === "mgr" || sub === "plan") {
      const u = -D / 2 + 1.5;
      c.dev(null, execDesk(1.8, 0.85, MAT.mahog, MAT.mahogDark), u, 0, "f", [0.9, 0.43]);
      c.dev(null, chairExec(MAT.leatherDark, 0.85), u - 0.75, 0, "f");
      c.dev(null, chairGuest(), u + 0.95, -0.42, "-f", [0.25, 0.25]); c.dev(null, chairGuest(), u + 0.95, 0.42, "-f", [0.25, 0.25]);
      c.dev(null, flagStand("iq"), -D / 2 + 0.45, W / 2 - 0.45, "f", [0.18, 0.18]);
      const sv = -(W / 2 - 0.5);
      if (c.free(D / 2 - 2.2, sv, 1.3)) { c.dev(null, sofa(3, sub === "plan" || sub === "regmgr" ? MAT.leatherBeige : MAT.leatherBrown, null, true), D / 2 - 2.4, sv, "s", [1.18, 0.45]); c.dev(null, coffeeTable(1.0, 0.5), D / 2 - 2.4, sv + 0.95, "f", [0.5, 0.25]); }
      if (c.free(0.6, W / 2 - 0.22, 0.8)) c.dev(null, cabinet(1.0, 2.0, 0.42, sub === "plan" ? MAT.mahogDark : MAT.white, true), 0.6, W / 2 - 0.22, "-s", [0.5, 0.21]);
      c.rug("rugRed", u - 0.2, -1.4, u + 1.9, 1.4);
      c.dev(null, plantParts("snake"), D / 2 - 0.5, W / 2 - 0.4, "f");
    } else if (sub === "staff" || sub === "media1" || sub === "staffAdmin") {
      deskRow(c, -D / 2 + 1.15, W > 4.6 ? 3 : 2, { guest: true });
      if (D > 5.5) deskRow(c, -D / 2 + 3.6, W > 4.6 ? 3 : 2);
      sideCabinets(c, 1, D > 5.5 ? 0.6 : -0.2, D / 2 - 0.4, true);
      if (sub === "media1") c.dev(null, rollupParts("شعبة الإعلام"), D / 2 - 0.8, -(W / 2 - 0.5), "f", [0.42, 0.15]);
    } else if (sub === "counter" || sub === "media" || sub === "cash") {
      // شبّاك المراجعين وخلفه مكتب الاستقبال
      const p = doorPos(r, { s: r.win ? r.win.s : r.doors[0].s, at: 0 });
      if (r.win) {
        const wm = (r.win.a + r.win.b) / 2, ww = r.win.b - r.win.a;
        planeAt(MAT.glass2s, ww, 0.9, p.c, y + 1.5, wm, Math.PI / 2);
        bx("woodDark", p.c - 0.25, y + 0.92, r.win.a, p.c + 0.25, y + 0.97, r.win.b);
        frameZ("woodDark", p.c, r.win.a, r.win.b, y + 0.95, y + 1.95, 0.06, T / 2 + 0.02);
        const q = c.P(D / 2 - 0.45, 0), vw = (wm - c.cz) * c.sz + (p.c - c.cx) * c.sx;
        c.dev("counter", officeDesk(1.4, 0.65, MAT.woodLight, MAT.white), D / 2 - 0.55, vw, "f", [0.7, 0.33]);
        c.dev(null, chairExec(MAT.black, 0.62), D / 2 - 1.2, vw, "f");
        void q;
      }
      deskRow(c, -D / 2 + 1.15, 2);
      sideCabinets(c, -1, -D / 2 + 2.2, D / 2 - 1.2, true);
      if (sub === "cash") c.dev(null, [B(0.6, 0.9, 0.55, MAT.greyDark), B(0.04, 0.12, 0.02, MAT.chrome, 0.2, 0.5, 0.28)], -D / 2 + 0.4, W / 2 - 0.4, "f", [0.3, 0.28]);
      if (sub === "media") c.dev(null, rollupParts("شعبة الإعلام والاتصال الحكومي"), 0.3, W / 2 - 0.4, "-s", [0.42, 0.15]);
    } else if (sub === "archive" || sub === "store") {
      const sv = W / 2 - 0.25;
      for (let u = -D / 2 + 0.3; u < D / 2 - 1.4; u += 1.9) {
        [sv, -sv].forEach(v => { if (c.free(u + 0.95, v, 0.8)) c.dev(null, sub === "store" ? storeShelf() : shelves(1.8, 2.1, 0.4, MAT.steel, 5), u + 0.95, v, v > 0 ? "-s" : "s", [0.9, 0.2]); });
      }
      if (sub === "archive") { c.dev(null, officeDesk(1.2, 0.65), D / 2 - 1.6, 0, "f", [0.6, 0.33]); c.dev(null, chairExec(MAT.black, 0.6), D / 2 - 2.25, 0, "f"); }
      else for (let i = 0; i < 6; i++) c.dev(null, [B(0.5, 0.4, 0.4, MAT.woodLight)], -D / 2 + 1.2 + (i % 3) * 0.55, (i < 3 ? -0.3 : 0.25), "f");
      F.clock = false;
    } else if (sub === "reg") {
      // شعبة التسجيل: مكاتب بيضاء بأسطح خشبية وكراسٍ جلدية بيضاء، وثريتان ذهبيتان
      [[3.0, -35.0], [5.6, -35.0], [3.0, -37.8], [5.6, -37.8]].forEach(([x, z]) => {
        device(null, officeDesk(1.6, 0.75, MAT.woodLight, MAT.white), x, y, z, 0, 0, [0.8, 0.38]);
        device(null, chairExec(MAT.leatherWhite, 0.85), x, y, z - 0.72, 0, 0);
        device(null, chairGuest(MAT.leatherWhite, MAT.chrome), x - 0.35, y, z + 0.75, Math.PI, 0, [0.25, 0.25]);
      });
      [-0.6, 0.45, 1.5, 2.55, 3.6, 4.65].forEach(x => device(null, cabinet(1.0, 1.95, 0.42, MAT.white, true), x, y, BZ0 + 0.36, 0, 0, [0.5, 0.21]));
      device(null, waterCooler(), -1.15, y, -35.3, Math.PI / 2, 0, [0.17, 0.17]); device(null, fridge(), -1.1, y, -36.2, Math.PI / 2, 0, [0.3, 0.3]);
      device(null, acStand(), 7.1, y, -41.5, -Math.PI / 2, 0, [0.25, 0.18]);
      bx("woodPanel", 7.5 - T / 2 - 0.03, y, -40.5, 7.5 - T / 2, y + 2.6, -35.0);
      [[1.6, -36.4], [4.3, -36.4]].forEach(([x, z]) => device(null, chandelier("lantern"), x, y + CH, z, 0, 0));
      [[1.6, -33.2], [4.3, -33.2], [1.6, -39.8], [4.3, -39.8]].forEach(([x, z]) => flat("led", x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + CH - 0.006, true));
      F.lights = 0;
      plant(6.9, y, -32.2, "snake");
      const hp = planeAt(new THREE.MeshBasicMaterial({ visible: false }), 2.0, 1.4, 2.5, y + 1.3, -35.6, 0); hp.userData.device = "reghall"; PICK.push(hp);
    } else if (sub === "pantry") {
      device(null, [B(1.8, 0.88, 0.6, MAT.white), B(1.84, 0.04, 0.64, MAT.greyDark, 0, 0.88, 0), B(0.5, 0.02, 0.4, MAT.steel, -0.4, 0.92, 0)], 6.4, y, -8.6, 0, 0, [0.9, 0.3]);
      device(null, fridge(), 7.55, y, -6.6, -Math.PI / 2, 0, [0.3, 0.3]); device(null, waterCooler(), 5.0, y, -8.5, Math.PI / 2, 0, [0.17, 0.17]);
      F.ac = false; F.clock = false;
    } else if (sub === "mgrAdmin") {
      // مكتب مدير الشؤون الإدارية والمالية: جدران خشبية، كنبات جلدية بنية، علم العراق
      bx("woodPanel", -7.85, y, -8.93, -7.82, y + 2.5, -0.15); bx("woodPanel", -1.6, y, -7.3, -1.57, y + 2.5, -0.15);
      bx("woodPanel", -7.85, y, -8.96, -4.95, y + 2.5, -8.93); bx("woodPanel", -3.85, y, -8.96, -1.57, y + 2.5, -8.93);
      device(null, execDesk(1.9, 0.9, MAT.mahog, MAT.mahogDark, MAT.leatherDark), -6.4, y, -4.4, Math.PI / 2, 1, [0.95, 0.45]);
      device(null, chairExec(MAT.leatherDark, 0.9), -7.2, y, -4.4, Math.PI / 2, 1);
      device(null, chairGuest(), -5.4, y, -4.85, -Math.PI / 2, 1, [0.25, 0.25]); device(null, chairGuest(), -5.4, y, -3.95, -Math.PI / 2, 1, [0.25, 0.25]);
      device(null, flagStand("iq"), -7.5, y, -2.7, 0, 1, [0.18, 0.18]);
      device(null, sofa(3, MAT.leatherBrown, null, true), -3.4, y, -0.62, Math.PI, 1, [1.18, 0.45]);
      device(null, sofa(2, MAT.leatherBrown, null, true), -6.8, y, -8.45, 0, 1, [0.85, 0.45]);
      device(null, coffeeTable(1.0, 0.55), -3.4, y, -1.7, 0, 1, [0.5, 0.28]);
      rug("rugRed", -6.0, -7.0, -2.6, -2.2, y);
      device(null, cabinet(1.0, 2.0, 0.42, MAT.mahogDark, true), -2.2, y, -8.68, 0, 1, [0.5, 0.21]);
      wallItem(splitAC(), -7.8, y + 2.55, -6.5, "E", 1);
      F.ac = false;
    } else if (sub === "recv") {
      device(null, [B(1.6, 1.9, 0.4, MAT.white), B(1.5, 1.6, 0.02, MAT.pigeon, 0, 0.2, 0.2)], BX0 + 0.36, y, -15.0, Math.PI / 2, 1, [0.8, 0.2]);
      device(null, sofa(3, MAT.leatherBrown, null, true), -3.2, y, -15.98, 0, 1, [1.18, 0.45]);
      device(null, sofa(2, MAT.leatherBrown, null, true), -3.0, y, -14.02, Math.PI, 1, [0.85, 0.45]);
      device(null, coffeeTable(1.0, 0.5), -3.1, y, -15.0, 0, 1, [0.5, 0.25]);
    } else if (sub === "qa") {
      // حاجز خشبي بشبابيك مراجعين يفصل الموظفين عن المراجعين
      const px = -1.3, y0 = y;
      bx("woodDark", px - 0.05, y0, -23.93, px + 0.05, y0 + 1.0, -22.9); bx("woodDark", px - 0.05, y0, -22.1, px + 0.05, y0 + 1.0, -20.07);
      bx("woodDark", px - 0.25, y0 + 1.0, -22.1, px + 0.25, y0 + 1.04, -20.07);
      planeAt(MAT.glass2s, 2.03, 1.1, px, y0 + 1.6, -21.085, Math.PI / 2);
      bx("woodDark", px - 0.05, y0 + 2.15, -23.93, px + 0.05, y0 + 2.3, -20.07); [-22.1, -21.08, -20.07].forEach(z => bx("woodDark", px - 0.04, y0 + 1.0, z - 0.03, px + 0.04, y0 + 2.15, z + 0.03));
      bx("woodDark", px - 0.04, y0 + 1.0, -23.93, px + 0.04, y0 + 2.15, -22.9);
      solid(1, px - 0.06, -23.93, px + 0.06, -22.9); solid(1, px - 0.06, -22.1, px + 0.06, -20.07);
      const cp = planeAt(new THREE.MeshBasicMaterial({ visible: false }), 2.0, 1.2, px + 0.06, y0 + 1.5, -21.1, Math.PI / 2); cp.userData.device = "counter"; PICK.push(cp);
      [-21.6, -20.6].forEach(z => { device(null, officeDesk(0.95, 0.6, MAT.woodLight, MAT.white), px - 0.42, y, z, Math.PI / 2, 1, [0.47, 0.3]); device(null, chairExec(MAT.black, 0.6), px - 1.05, y, z, Math.PI / 2, 1); });
      device(null, officeDesk(1.4, 0.7), -6.4, y, -22.0, Math.PI / 2, 1, [0.7, 0.35]); device(null, chairExec(MAT.black, 0.62), -7.05, y, -22.0, Math.PI / 2, 1);
      device(null, cabinet(1.0, 1.95, 0.42, MAT.white, true), -4.3, y, -23.68, 0, 1, [0.5, 0.21]); device(null, cabinet(1.0, 1.95, 0.42, MAT.white, true), -3.25, y, -23.68, 0, 1, [0.5, 0.21]);
    } else if (sub === "acc") {
      // شعبة الحسابات: رفوف جدارية مليئة بالأضابير
      for (let x = 5.6; x < 12.4; x += 1.85) { const p = c; void p; if (clearOf(1, x, -21.7, 0.8)) device("shelves", shelves(1.8, 2.3, 0.36, MAT.wood, 6), x, y, -21.75, 0, 1, [0.9, 0.18]); if (clearOf(1, x, -17.25, 0.9)) device("shelves", shelves(1.8, 2.3, 0.36, MAT.wood, 6), x, y, -17.25, Math.PI, 1, [0.9, 0.18]); }
      device("shelves", shelves(3.2, 2.3, 0.36, MAT.wood, 6), 12.65, y, -19.5, -Math.PI / 2, 1, [1.6, 0.18]);
      [[7.6, -19.0], [10.2, -19.0]].forEach(([x, z]) => { device(null, officeDesk(1.4, 0.7), x, y, z, -Math.PI / 2, 1, [0.7, 0.35]); device(null, chairExec(MAT.black, 0.62), x + 0.68, y, z, -Math.PI / 2, 1); });
    } else if (sub === "wc") {
      device(null, [B(1.5, 0.85, 0.5, MAT.white), B(1.54, 0.04, 0.54, MAT.terr, 0, 0.85, 0), C(0.18, 0.04, MAT.devWhite, -0.35, 0.86, 0, 16), C(0.18, 0.04, MAT.devWhite, 0.35, 0.86, 0, 16)], 4.88, y, -7.6, Math.PI / 2, 1, [0.75, 0.25]);
      planeAt(MAT.glassCab, 1.4, 0.9, 4.58, y + 1.6, -7.6, Math.PI / 2);
      [6.4, 7.35].forEach(x => { bx("lattice", x - 0.47, y, -8.0, x + 0.47, y + 2.1, -7.96); bx("woodDark", x + 0.45, y, -8.93, x + 0.48, y + 2.1, -7.96); solid(1, x - 0.47, -8.93, x + 0.48, -7.95); });
      F.ac = F.clock = false;
    } else if (sub === "deanSec") { deanSecretary(c); F.lights = 0; F.clock = false; }
    else if (sub === "deanStaff") { deanStaff(c); F.ac = false; }
    else if (sub === "dean") { deanOffice(c); F.lights = 0; F.clock = false; }
    else if (sub === "council") { councilRoom(c); F.lights = 0; F.clock = false; }
    if (F.ac) c.ac();
    if (F.clock) c.clock();
    if (F.lights) c.lights(F.lights);
  }
  function storeShelf() {
    const p = shelves(1.8, 2.1, 0.45, MAT.steel, 4);
    p.splice(p.length - 4); const R = rng(99);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) if (R() < 0.8) p.push(B(0.5, 0.3 + R() * 0.12, 0.38, R() < 0.5 ? MAT.woodLight : MAT.paper, -0.6 + k * 0.6, 0.03 + i * 0.52, 0));
    return p;
  }
  /* استقبال مكتب العميد: كنبات رمادية بإطار كريمي، مكتب أبيض بنقشة المفتاح اليوناني، قوالب بيضاء وإنارة خطية */
  function deanSecretary(c) {
    const y = c.y;
    device(null, [B(1.6, 0.05, 0.75, MAT.white, 0, 0.74, 0), B(1.56, 0.7, 0.04, MAT.greek, 0, 0.04, 0.35), B(0.06, 0.74, 0.7, MAT.white, -0.77, 0, 0), B(0.06, 0.74, 0.7, MAT.white, 0.77, 0, 0), B(0.5, 0.3, 0.03, MAT.screen, -0.2, 0.95, -0.2), B(0.08, 0.16, 0.06, MAT.black, -0.2, 0.78, -0.2), B(0.42, 0.02, 0.14, MAT.black, -0.2, 0.78, 0.05)], -2.6, y, -28.3, Math.PI, 1, [0.8, 0.38]);
    device(null, chairExec(MAT.leatherWhite, 0.8), -2.6, y, -27.6, Math.PI, 1);
    device(null, sofa(3, MAT.sofaGrey, MAT.cream), -2.0, y, -31.45, 0, 1, [1.18, 0.45]);
    device(null, [B(0.5, 0.55, 0.5, MAT.cream), B(0.52, 0.03, 0.52, MAT.goldTrim, 0, 0.55, 0)], -3.6, y, -31.5, 0, 1, [0.25, 0.25]);
    device(null, plantParts("snake"), 0.05, y, -31.55, 0, 1);
    for (let x = -3.5; x < 0.2; x += 1.25) { bx("molding", x, y + 0.5, -27.08 + 0.0, x + 0.9, y + 0.53, -27.06); bx("molding", x, y + 2.2, -27.08, x + 0.9, y + 2.23, -27.06); }
    [-3.0, -1.6, -0.2].forEach(x => bx("led", x - 0.02, y + CH - 0.01, -31.6, x + 0.02, y + CH - 0.004, -27.4));
    wallItem(clockParts(), -2.0, y + 2.6, -31.93, "F", 1);
  }
  function deanStaff(c) {
    const y = c.y;
    const gdesk = () => [B(1.4, 0.05, 0.7, MAT.white, 0, 0.74, 0), B(1.36, 0.7, 0.04, MAT.greek, 0, 0.04, 0.33), B(0.06, 0.74, 0.66, MAT.white, -0.67, 0, 0), B(0.06, 0.74, 0.66, MAT.white, 0.67, 0, 0), B(0.5, 0.3, 0.03, MAT.screen, -0.15, 0.95, -0.18), B(0.08, 0.16, 0.06, MAT.black, -0.15, 0.78, -0.18)];
    device(null, gdesk(), -6.85, y, -27.95, Math.PI, 1, [0.7, 0.35]); device(null, chairExec(MAT.black, 0.7), -6.85, y, -27.35, Math.PI, 1);
    device(null, gdesk(), -5.1, y, -27.95, Math.PI, 1, [0.7, 0.35]); device(null, chairExec(MAT.black, 0.7), -5.1, y, -27.35, Math.PI, 1);
    device(null, gdesk(), -6.85, y, -30.0, Math.PI / 2, 1, [0.7, 0.35]); device(null, chairExec(MAT.black, 0.7), -7.45, y, -30.0, Math.PI / 2, 1);
    device(null, cabinet(0.8, 2.0, 0.4, MAT.white, true), -7.62, y, -31.4, Math.PI / 2, 1, [0.4, 0.2]);
    device(null, cabinet(0.8, 2.0, 0.4, MAT.white, true), -4.5, y, -31.7, 0, 1, [0.4, 0.2]);
    rug("rugBlue", -6.6, -31.0, -4.6, -28.8, y);
    wallItem(splitAC(), -6.0, y + 2.6, -27.08, "B", 1);
  }
  /* مكتب عميد الكلية */
  function deanOffice(c) {
    const y = c.y;
    bx("woodPanel", -7.85, y, -41.85, 1.43, y + 2.7, -41.82);
    const desk = execDesk(2.3, 1.0, MAT.mahog, MAT.mahogDark, MAT.leatherDark);
    desk.push(mm(new THREE.PlaneGeometry(0.42, 0.1), nameplateMat("عميد الكلية"), 0, 0.84, 0.36, -0.35, 0, 0), B(0.44, 0.02, 0.08, MAT.goldTrim, 0, 0.775, 0.37));
    desk.push(B(0.3, 0.04, 0.22, MAT.paper, 0.6, 0.77, 0.05), C(0.04, 0.12, MAT.goldTrim, -0.8, 0.77, -0.25, 8));
    device("deandesk", desk, -3.3, y, -39.4, 0, 1, [1.15, 0.5]);
    device("deandesk", chairExec(MAT.leatherDark, 1.0).concat([B(0.62, 0.06, 0.08, MAT.goldTrim, 0, 1.52, -0.26)]), -3.3, y, -40.4, 0, 1);
    device(null, chairGuest(MAT.leatherCream, MAT.mahogDark), -3.9, y, -38.25, Math.PI, 1, [0.25, 0.25]); device(null, chairGuest(MAT.leatherCream, MAT.mahogDark), -2.7, y, -38.25, Math.PI, 1, [0.25, 0.25]);
    device(null, bookcase(2.8, 2.25, 0.42), -3.3, y, -41.6, 0, 1, [1.4, 0.21]);
    device(null, flagStand("iq"), -5.25, y, -41.2, 0, 1, [0.18, 0.18]); device(null, flagStand("uni"), -1.35, y, -41.2, 0, 1, [0.18, 0.18]);
    rug("rugDean", -7.4, -37.6, -1.6, -32.9, y);
    device(null, sofa(3, MAT.leatherCream, MAT.mahog), -7.35, y, -35.25, Math.PI / 2, 1, [1.18, 0.45]);
    device(null, sofa(1, MAT.leatherCream, MAT.mahog), -3.05, y, -34.4, -Math.PI / 2, 1, [0.5, 0.45]);
    device(null, sofa(1, MAT.leatherCream, MAT.mahog), -3.05, y, -36.1, -Math.PI / 2, 1, [0.5, 0.45]);
    device(null, coffeeTable(1.4, 0.7), -5.3, y, -35.25, Math.PI / 2, 1, [0.7, 0.35]);
    device(null, [C(0.08, 0.2, MAT.crystal, 0, 0.45, 0, 10), mm(new THREE.SphereGeometry(0.11, 8, 6), MAT.red, 0, 0.72, 0)], -5.3, y, -35.25, 0, 1);
    // وحدة التلفاز والكؤوس على الجدار الشرقي، الساعة، التكييف الواقف والستارة القابلة للطي
    const tvU = [B(2.2, 0.55, 0.45, MAT.mahogDark)]; for (let k = 0; k < 5; k++) tvU.push(C(0.05, 0.22 + (k % 2) * 0.08, MAT.goldTrim, -0.9 + k * 0.45, 0.55, 0, 10, 0.08));
    device(null, tvU, 1.2, y, -36.0, -Math.PI / 2, 1, [1.1, 0.23]);
    wallItem(tvParts(1.4), 1.43, y + 1.55, -36.0, "W", 1);
    wallItem(clockParts(), -3.3, y + 2.85, -32.07, "B", 1);
    device(null, acStand(), -0.7, y, -32.4, Math.PI, 1, [0.25, 0.18]);
    const scr = []; for (let i = 0; i < 4; i++) scr.push(mm(new THREE.BoxGeometry(0.45, 1.75, 0.03), MAT.mahog, i * 0.43, 0.9, (i % 2) * 0.12, 0, (i % 2 ? -0.5 : 0.5), 0));
    device(null, scr, 0.1, y, -33.6, -Math.PI / 2, 1);
    c.lights(3);
  }
  /* قاعة مجلس الكلية */
  function councilRoom(c) {
    const y = c.y, x0 = 3.55, x1 = 4.95, za = -33.4, zb = -40.2;
    const tb = [B(x1 - x0, 0.06, za - zb, MAT.mahog, 0, 0.72, 0), B(x1 - x0 - 0.2, 0.68, za - zb - 0.4, MAT.mahogDark, 0, 0.04, 0)];
    for (let i = 0; i < 8; i++) { const z = (za - zb) / 2 - 0.5 - i * 0.85; [-1, 1].forEach(s => tb.push(B(0.42, 0.006, 0.5, MAT.leatherBlue, s * 0.42, 0.78, z), B(0.2, 0.06, 0.02, MAT.brass, s * 0.42, 0.79, z - 0.05))); }
    tb.push(C(0.09, 0.22, MAT.crystal, 0, 0.78, -1.0, 10), mm(new THREE.SphereGeometry(0.13, 8, 6), MAT.red, 0, 1.08, -1.0), C(0.09, 0.22, MAT.crystal, 0, 0.78, 1.6, 10), mm(new THREE.SphereGeometry(0.13, 8, 6), MAT.red, 0, 1.08, 1.6));
    tb.push(mm(new THREE.PlaneGeometry(0.36, 0.09), nameplateMat("عميد الكلية"), 0, 0.84, -(za - zb) / 2 + 0.2, -0.35, 0, 0));
    device("council", tb, (x0 + x1) / 2, y, (za + zb) / 2, 0, 1, [(x1 - x0) / 2 + 0.05, (za - zb) / 2]);
    const chest = () => [C(0.04, 0.42, MAT.mahogDark, 0, 0, 0, 6), B(0.62, 0.14, 0.6, MAT.leatherBrown, 0, 0.42, 0), B(0.64, 0.75, 0.16, MAT.leatherBrown, 0, 0.5, -0.27), B(0.12, 0.3, 0.55, MAT.leatherBrown, -0.32, 0.5, 0), B(0.12, 0.3, 0.55, MAT.leatherBrown, 0.32, 0.5, 0)];
    for (let i = 0; i < 8; i++) { const z = za - 0.5 - i * 0.85; device(null, chest(), x0 - 0.62, y, z, Math.PI / 2, 1, [0.32, 0.32]); device(null, chest(), x1 + 0.62, y, z, -Math.PI / 2, 1, [0.32, 0.32]); }
    device(null, chest().concat([B(0.66, 0.2, 0.17, MAT.leatherBrown, 0, 1.2, -0.27)]), 4.25, y, -40.85, 0, 1, [0.32, 0.32]);
    device(null, flagStand("iq"), 3.25, y, -41.45, 0, 1, [0.18, 0.18]); device(null, flagStand("uni"), 5.25, y, -41.45, 0, 1, [0.18, 0.18]);
    [-35.6, -38.4].forEach(z => device(null, bookcase(2.4, 2.2, 0.36), 6.74, y, z, -Math.PI / 2, 1, [1.2, 0.18]));
    wallItem(tvParts(1.3), 6.92, y + 1.6, -33.1, "W", 1);
    [-35.0, -38.6].forEach(z => device(null, chandelier("crystal"), 4.25, y + CH, z, 0, 1));
    // إطار السقف الشبكي
    LAYER = "c1";
    const cy = y + CH - 0.01;
    bx("goldTrim", 1.6, cy - 0.12, -41.9, 6.9, cy, -41.6); bx("goldTrim", 1.6, cy - 0.12, -31.9, 6.9, cy, -31.6);
    bx("goldTrim", 1.6, cy - 0.12, -41.9, 1.9, cy, -31.6); bx("goldTrim", 6.6, cy - 0.12, -41.9, 6.9, cy, -31.6);
    bx("goldTrim", 2.4, cy - 0.06, -41.0, 6.1, cy, -40.94); bx("goldTrim", 2.4, cy - 0.06, -32.56, 6.1, cy, -32.5); bx("goldTrim", 2.4, cy - 0.06, -41.0, 2.46, cy, -32.5); bx("goldTrim", 6.04, cy - 0.06, -41.0, 6.1, cy, -32.5);
    for (let z = -41.6; z < -32.0; z += 0.42) { [[1.9, 2.4], [6.1, 6.6]].forEach(([a, b]) => addGeo("goldTrim", new THREE.BoxGeometry(0.7, 0.03, 0.03), (a + b) / 2, cy - 0.03, z + 0.2, (z * 7) % 2 > 1 ? 0.7 : -0.7)); }
    for (let x = 2.4; x < 6.1; x += 0.42) [[-41.6, -41.0], [-32.5, -31.9]].forEach(([a, b]) => addGeo("goldTrim", new THREE.BoxGeometry(0.03, 0.03, 0.7), x + 0.2, cy - 0.03, (a + b) / 2, (x * 7) % 2 > 1 ? 0.7 : -0.7));
    LAYER = "s1";
    c.lights(0);
  }



  /* ---------------------------------------------------------------
     الخارج: الممر المسقّف بقرميد أحمر وأعمدة حديدية مزخرفة، المظلّة،
     الحدائق، ممر البلاط السداسي شرقاً، مظلّة السيارات، والمبنى المقابل
  --------------------------------------------------------------- */
  function instances() {
    defInst("down", new THREE.CylinderGeometry(0.075, 0.075, 0.015, 12), MAT.down);
  }
  function tree(x, z, k = 1) {
    device(null, [C(0.12 * k, 1.7 * k, MAT.trunk, 0, 0, 0, 7, 0.09 * k), mm(new THREE.IcosahedronGeometry(1.25 * k, 1), MAT.foliage, 0, 2.5 * k, 0), mm(new THREE.IcosahedronGeometry(0.85 * k, 1), MAT.foliage, 0.5 * k, 2.1 * k, 0.3 * k)], x, GY, z, x * 1.7, 0, [0.2, 0.2]);
  }
  function bush(x, z, k = 1) { device(null, [mm(new THREE.IcosahedronGeometry(0.45 * k, 1), MAT.hedge, 0, 0.32 * k, 0)], x, GY, z, x, 0); }
  function ornamentPost(h) {
    const p = [B(0.12, 0.08, 0.12, MAT.iron, 0, 0, 0), C(0.045, h, MAT.iron, 0, 0.08, 0, 8), B(0.14, 0.06, 0.14, MAT.iron, 0, h * 0.42, 0)];
    [0.6, 0.8].forEach(t => p.push(mm(new THREE.TorusGeometry(0.11, 0.012, 5, 14, Math.PI * 1.4), MAT.ironGold, 0.12, h * t, 0), mm(new THREE.TorusGeometry(0.11, 0.012, 5, 14, Math.PI * 1.4), MAT.ironGold, -0.12, h * t, 0, 0, Math.PI, 0)));
    return p;
  }
  function gableRoof(x0, x1, z0, z1, ye, rise, key = "roofRed") {
    const half = (x1 - x0) / 2, ang = Math.atan2(rise, half), L = Math.hypot(half, rise) + 0.25, cx = (x0 + x1) / 2, len = z1 - z0;
    addGeo(key, new THREE.BoxGeometry(L, 0.05, len), cx - half / 2, ye + rise / 2, (z0 + z1) / 2, 0, 1, 1, 1, 0, ang);
    addGeo(key, new THREE.BoxGeometry(L, 0.05, len), cx + half / 2, ye + rise / 2, (z0 + z1) / 2, 0, 1, 1, 1, 0, -ang);
    addGeo("roofRedD", new THREE.BoxGeometry(0.12, 0.1, len + 0.1), cx, ye + rise + 0.03, (z0 + z1) / 2);
    // تموّج القرميد
    for (let z = z0 + 0.15; z < z1; z += 0.3) [-1, 1].forEach(s => addGeo("roofRedD", new THREE.BoxGeometry(L, 0.02, 0.03), cx + s * half / 2, ye + rise / 2 + 0.03, z, 0, 1, 1, 1, 0, -s * ang));
    return ang;
  }
  function oppositeTex() {
    return canvasTex(1024, 512, (g, w, h) => {
      g.fillStyle = "#d8c7a6"; g.fillRect(0, 0, w, h); noise(g, w, h, 9000, 0.08, 121, 2);
      const fl = h / 3;
      for (let f = 0; f < 3; f++) {
        g.fillStyle = "rgba(120,96,66,.45)"; g.fillRect(0, f * fl, w, 6);
        if (f < 2) for (let i = 0; i < 11; i++) { const x = 30 + i * 90; g.fillStyle = "#3e4f5c"; g.fillRect(x, f * fl + 40, 52, 82); g.strokeStyle = "#e9e5dc"; g.lineWidth = 5; g.strokeRect(x, f * fl + 40, 52, 82); }
      }
      for (let i = 0; i < 6; i++) { const x = 20 + i * 168; g.fillStyle = "#9a9c9e"; g.fillRect(x, 2 * fl + 50, 140, fl - 50); g.fillStyle = "rgba(0,0,0,.18)"; for (let y = 2 * fl + 54; y < h; y += 7) g.fillRect(x, y, 140, 2); g.fillStyle = "#e7e3da"; g.fillRect(x - 4, 2 * fl + 24, 148, 22); }
    });
  }
  function outdoors() {
    LAYER = "site";
    flat("asphalt", -70, -80, 80, 70, GY - 0.004);
    // الحدائق الأمامية والجانبية بإطار حجري
    [[BX0 - 0.6, 0.6, 0.25, 12.5], [4.4, BX1 + 0.6, 0.25, 12.5], [-13, BX0 - 0.6, -42.5, 12.5]].forEach(([x0, x1, z0, z1]) => {
      flat("grass", x0, z0, x1, z1, GY + 0.012);
      bx("stoneT", x0 - 0.12, GY, z1, x1 + 0.12, GY + 0.12, z1 + 0.12); bx("stoneT", x0 - 0.12, GY, z0 - 0.12, x0, GY + 0.12, z1);
    });
    for (let x = -7.2; x < 0; x += 1.6) bush(x, 0.9, 0.9);
    for (let x = 5.4; x < 13; x += 1.6) bush(x, 0.9, 0.9);
    [[-5.6, 6.2, 1.0], [-1.6, 9.8, 0.8], [8.2, 5.4, 1.05], [11.6, 9.6, 0.85], [-7.0, 11.2, 0.75], [-10.5, -8, 1.1], [-10.5, -24, 1.0], [-10.8, -36, 1.1]].forEach(([x, z, k]) => tree(x, z, k));
    // الممر المسقّف: أرضية حجرية مزخرفة، أعمدة حديد، سياج، سقف قرميد على جملون حديدي
    const wx0 = 0.6, wx1 = 4.4, wz0 = 1.5, wz1 = 15.0, ye = GY + 2.65;
    flat("mosaic", wx0, wz0, wx1, wz1 + 3.5, GY + 0.015);
    for (let z = wz0 + 0.3; z <= wz1 + 0.01; z += 2.7) {
      [wx0 + 0.1, wx1 - 0.1].forEach(x => { device(null, ornamentPost(2.6), x, GY, z, 0, 0); solid(0, x - 0.08, z - 0.08, x + 0.08, z + 0.08); });
      bx("truss", wx0 + 0.05, ye - 0.04, z - 0.03, wx1 - 0.05, ye + 0.02, z + 0.03);
      addGeo("truss", new THREE.BoxGeometry(0.04, 0.04, 0.04), WX, ye + 0.3, z, 0, 1, 15, 1);
      [-1, 1].forEach(s => addGeo("truss", new THREE.BoxGeometry(1.0, 0.04, 0.04), WX + s * 0.95, ye + 0.33, z, 0, 1, 1, 1, 0, -s * 0.34));
    }
    bx("truss", wx0 + 0.05, ye - 0.06, wz0, wx0 + 0.15, ye + 0.02, wz1 + 0.3); bx("truss", wx1 - 0.15, ye - 0.06, wz0, wx1 - 0.05, ye + 0.02, wz1 + 0.3);
    gableRoof(wx0 - 0.25, wx1 + 0.25, wz0 - 0.3, wz1 + 0.45, ye, 0.75);
    [wx0 + 0.1, wx1 - 0.1].forEach(x => {
      for (let z = 2.4; z < wz1; z += 2.7) {
        const za = z - 0.55, zb = Math.min(z + 2.15, wz1 - 0.1);
        bx("iron", x - 0.015, GY + 0.86, za, x + 0.015, GY + 0.9, zb); bx("iron", x - 0.015, GY + 0.1, za, x + 0.015, GY + 0.13, zb);
        for (let q = za + 0.12; q < zb; q += 0.14) bx("iron", x - 0.01, GY + 0.13, q - 0.01, x + 0.01, GY + 0.86, q + 0.01);
        for (let q = za + 0.35; q < zb - 0.2; q += 0.7) addGeo("ironGold", new THREE.TorusGeometry(0.11, 0.012, 5, 16), x, GY + 0.5, q, Math.PI / 2);
      }
    });
    // المظلّة في نهاية الممر
    const gz0 = 15.1, gz1 = 18.6, gx0 = 0.2, gx1 = 4.8;
    [[gx0, gz0], [gx1, gz0], [gx0, gz1], [gx1, gz1]].forEach(([x, z]) => { device(null, ornamentPost(2.7), x, GY, z, 0, 0); solid(0, x - 0.09, z - 0.09, x + 0.09, z + 0.09); });
    bx("truss", gx0, GY + 2.7, gz0 - 0.04, gx1, GY + 2.78, gz0 + 0.04); bx("truss", gx0, GY + 2.7, gz1 - 0.04, gx1, GY + 2.78, gz1 + 0.04);
    bx("truss", gx0 - 0.04, GY + 2.7, gz0, gx0 + 0.04, GY + 2.78, gz1); bx("truss", gx1 - 0.04, GY + 2.7, gz0, gx1 + 0.04, GY + 2.78, gz1);
    addGeo("roofRed", new THREE.ConeGeometry(2.9, 1.05, 4, 1, true), (gx0 + gx1) / 2, GY + 3.3, (gz0 + gz1) / 2, Math.PI / 4, 1, 1, 0.78);
    addGeo("roofRedD", new THREE.SphereGeometry(0.12, 8, 6), (gx0 + gx1) / 2, GY + 3.84, (gz0 + gz1) / 2);
    [[gx0 + 0.7, gz0 + 0.5], [gx1 - 0.7, gz1 - 0.5]].forEach(([x, z]) => device(null, [B(1.3, 0.06, 0.4, MAT.woodDark, 0, 0.42, 0), B(0.06, 0.42, 0.36, MAT.iron, -0.55, 0, 0), B(0.06, 0.42, 0.36, MAT.iron, 0.55, 0, 0), B(1.3, 0.4, 0.05, MAT.woodDark, 0, 0.5, -0.18)], x, GY, z, z > 17 ? Math.PI : 0, 0));
    // ممر البلاط السداسي شرق المبنى ومظلّة السيارات خلفه
    flat("hexPav", BX1 + 0.17, -15, 16.2, 0.6, GY + 0.014);
    flat("concrete", 15.6, -15.2, 23.6, -5.6, GY + 0.01);
    for (let x = 16; x <= 23.01; x += 3.5) [-14.6, -6.2].forEach(z => { device(null, [C(0.06, 2.55, MAT.steel, 0, 0, 0, 8)], x, GY, z, 0, 0); solid(0, x - 0.08, z - 0.08, x + 0.08, z + 0.08); });
    addGeo("alu", new THREE.BoxGeometry(7.8, 0.05, 9.2), 19.5, GY + 2.62, -10.4, 0, 1, 1, 1, 0.04, 0);
    // المبنى المقابل بطوابقه الثلاثة ومحلاته، وفوقه برج اتصالات
    const ox0 = 24, ox1 = 31, oz0 = 2, oz1 = 26, oh = 10.5;
    bx("ext", ox0, GY, oz0, ox1, GY + oh, oz1); solid(0, ox0, oz0, ox1, oz1);
    planeAt(lam(0xffffff, { map: oppositeTex() }), oz1 - oz0, oh, ox0 - 0.01, GY + oh / 2, (oz0 + oz1) / 2, -Math.PI / 2);
    const tw = []; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; tw.push(mm(new THREE.CylinderGeometry(0.03, 0.05, 9, 5), MAT.steel, Math.cos(a) * 0.45, 4.5, Math.sin(a) * 0.45, 0, 0, Math.cos(a) * 0.04)); }
    for (let k = 1; k < 9; k++) tw.push(mm(new THREE.TorusGeometry(0.47 - k * 0.012, 0.015, 4, 4), MAT.steel, 0, k, 0, Math.PI / 2, 0, Math.PI / 4));
    tw.push(B(0.3, 0.6, 0.12, MAT.devWhite, 0.4, 7.6, 0), B(0.3, 0.6, 0.12, MAT.devWhite, -0.4, 7.8, 0), C(0.25, 0.08, MAT.devWhite, 0, 8.6, 0.3, 12));
    device(null, tw, 28.5, GY + oh, 20, 0, 0);
  }

  /* ---------------------------------------------------------------
     المناطق (لتحديد المكان، والمشي بالضغط، والخريطة، وقائمة الغرف)
  --------------------------------------------------------------- */
  const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  const KIND = { dean: "dean", deanSec: "dean", deanStaff: "dean", council: "hall", reg: "hall", store: "service", archive: "service", pantry: "service", wc: "service", stair: "stair" };
  const PARENT = { "g-store": "g-lobby", "g-stair": "g-lobby", "g-010": "g-reg", "g-011": "g-reg", "g-be": "g-reg", "u-mgr": "u-hall", "u-staff": "u-mgr", "u-dstaff": "u-sec", "u-dean": "u-dstaff", "u-amin": "u-end", "u-be": "u-amin", "u-wc": "u-hall", "u-stair": "u-hall" };
  const OPENDEF = {
    "g-lobby": { parent: "out", portal: [[WX, 2.6], [WX, -0.9]], spot: [WX, -0.9, 0] },
    "g-cor": { parent: "g-lobby", portal: [[CXM, -5.2], [CXM, -6.9]], spot: [CXM, -7.0, 0] },
    "u-glass": { parent: "u-hall", portal: [[1.3, -4.7], [1.3, -3.3]], spot: [1.3, -3.1, yawTo(1.3, -3.1, 0, -1.2)] },
    "u-hall": { parent: null, spot: [5.6, -2.2, yawTo(5.6, -2.2, -1.5, -5.75)] },
    "u-cor": { parent: "u-hall", portal: [[CXM, -8.3], [CXM, -9.7]], spot: [CXM, -10.0, 0] },
    "u-end": { parent: "u-cor", portal: [[3.9, -30.75], [5.2, -30.75]], spot: [3.9, -29.4, yawTo(3.9, -29.4, 4.25, -31.5)] }
  };
  function regions() {
    REG.length = 0;
    ROOMS.forEach(r => {
      const [x0, x1, z0, z1] = r.r, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, d = r.doors[0], p = doorPos(r, d);
      let portal = [{ x: p.x - p.nx * 0.7, z: p.z - p.nz * 0.7 }, { x: p.x + p.nx * 0.75, z: p.z + p.nz * 0.75 }];
      let sx = p.x + p.nx * 1.3, sz = p.z + p.nz * 1.3, syaw = yawTo(sx, sz, cx, cz);
      if (r.id === "u-stair") { portal = [{ x: 7.3, z: -1.0 }, { x: 8.7, z: -1.0 }]; sx = 9.4; sz = -0.8; syaw = 0; }
      if (r.id === "g-stair") { sx = 9.2; sz = -2.75; syaw = yawTo(9.2, -2.75, 12, -1.6); }
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
      const walk = x > 0.4 && x < 4.6 && z > 0.17 && z < 15.0, gaz = x > 0 && x < 5 && z >= 15.0 && z < 18.8;
      const lawn = z > 0 && z < 12.6 && x > BX0 - 0.7 && x < BX1 + 0.7;
      return Object.assign({}, OUTSIDE, { name: walk ? "الممر المسقّف أمام باب العمادة" : gaz ? "المظلّة في نهاية الممر" : lawn ? "حديقة العمادة" : x > BX1 && z < 0 ? "الممر الشرقي ومظلّة السيارات" : "ساحة العمادة" });
    }
    return null;
  }
  function groundY(x, z, lvl) {
    if (lvl) return FH;
    if (x > BX0 - 0.17 && x < BX1 + 0.17 && z > BZ0 - 0.17 && z < BZ1 + 0.17) return 0;
    if (x > 0.4 && x < 4.6 && z < 1.5) return z < 0.9 ? 0 : z < 1.2 ? -0.15 : -0.3;
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
  const E0 = EYE, E1 = FH + EYE, EL = LY + EYE, EG = GY + EYE;
  const climbFrames = () => [
    { p: [11.8, E0, -1.75], look: [11.8, E0 + 0.9, -6], move: 0.7, cap: "تصعد الدرج إلى الطابق الأول…" },
    { p: [11.8, EL, -5.5], look: [11.6, EL + 0.2, -9], move: 2.6 },
    { p: [9.4, EL, -5.8], look: [9.4, EL + 1.0, -1], move: 1.2 },
    { p: [9.4, E1, -1.0], look: [9.4, E1, 2], move: 2.6, cap: "الطابق الأول" },
    { p: [7.0, E1, -1.0], look: [0, E1, -4.2], move: 1.2, cap: "" }
  ];
  function climb() { play(climbFrames()); }
  function descend() {
    play([
      { p: [9.4, E1, -1.7], look: [9.4, E1 - 0.9, -6], move: 0.7, cap: "تنزل إلى الطابق الأرضي…" },
      { p: [9.4, EL, -5.4], look: [9.4, EL - 0.2, -9], move: 2.6 },
      { p: [11.8, EL, -5.7], look: [11.8, EL - 1.2, -1], move: 1.2 },
      { p: [11.8, E0, -1.4], look: [11.8, E0, 2], move: 2.6, cap: "" },
      { p: [9.2, E0, -2.75], look: [4, E0, -2.75], move: 1.4 }
    ]);
  }
  function teleport(lvl, x, z, yaw) {
    if (OV.on) ovExit(true);
    const f = U.$("#dn-fade"); f.classList.add("on"); walkPath = null; anim = null; hideMarker();
    setTimeout(() => { P.lvl = lvl; P.x = x; P.z = z; P.yaw = yaw; P.pitch = -0.05; collide(); P.gy = groundY(x, z, lvl); applyCam(); where(true); f.classList.remove("on"); }, 260);
  }
  function startTour() {
    U.$("#dn-intro").hidden = true; closeInfo(); if (OV.on) ovExit(true);
    P.lvl = 0; P.x = WX; P.z = 31; P.yaw = 0; P.pitch = 0.05; P.gy = GY;
    play([
      { p: [WX, EG, 27.5], look: [WX, 4.2, 0], move: 1.2, hold: 3.8, cap: "عمادة كلية التربية للعلوم الصرفة – جامعة تكريت" },
      { p: [WX, EG, 20.0], look: [WX, 1.6, 10], move: 2.6, hold: 1.2, cap: "الممر المسقّف من المظلّة إلى باب العمادة" },
      { p: [WX, EG, 5.6], look: [WX, 4.4, 0], move: 4.2, hold: 3.0, cap: "لوحة العمادة فوق المدخل: جامعة تكريت – عمادة كلية التربية للعلوم الصرفة، تأسست 1992" },
      { p: [WX, E0, -0.9], look: [WX, 1.6, -6], move: 2.4, cap: "" },
      { p: [0.4, E0, -2.4], look: [-1.5, 1.75, -2.45], move: 1.4, hold: 3.4, cap: "لوحة رؤية جامعة تكريت والكلية ورسالتهما وأهدافهما" },
      { p: [3.6, E0, -2.4], look: [7.6, 1.2, -4.2], move: 1.4, hold: 2.8, cap: "الاستعلامات، وعلى يمين الداخل الباب الزجاجي إلى الدرج" },
      { p: [CXM, E0, -6.6], look: [CXM, 1.6, -31], move: 1.8, hold: 2.8, cap: "ممر الطابق الأرضي: معاونا العميد والدراسات العليا يساراً، والشؤون العلمية وصندوق الحسابات يميناً" },
      { p: [CXM, E0, -29.6], look: [CXM, 1.4, -33], move: 4.6, cap: "" },
      { p: [CXM, E0, -33.0], look: [2.0, 1.2, -40], move: 1.6, hold: 3.4, cap: "شعبة التسجيل وشؤون الطلبة بسقفها المزخرف" },
      { p: [CXM, E0, -29.5], look: [CXM, 1.6, -6], move: 1.8, cap: "" },
      { p: [2.6, E0, -4.2], look: [8, 1.6, -2.75], move: 4.4, cap: "إلى الطابق الأول" },
      { p: [9.0, E0, -2.75], look: [12, 1.6, -2.0], move: 1.8 },
      { p: [11.8, E0, -1.2], look: [11.8, E0 + 0.9, -6], move: 1.3 },
      ...climbFrames(),
      { p: [3.4, E1, -5.8], look: [-1.5, FH + 1.9, -5.75], move: 2.2, hold: 3.2, cap: "بهو شعبة الشؤون الإدارية والمالية" },
      { p: [-0.9, E1, -7.9], look: [-5, FH + 1.3, -7.9], move: 1.8, cap: "" },
      { p: [-3.0, E1, -6.4], look: [-6.6, FH + 1.0, -3.6], move: 1.4, hold: 2.8, cap: "مكتب مدير شعبة الشؤون الإدارية والمالية" },
      { p: [-0.9, E1, -7.9], look: [3, E1, -8.5], move: 1.6, cap: "" },
      { p: [CXM, E1, -10.0], look: [CXM, FH + 1.6, -30], move: 1.4, hold: 1.6, cap: "ممر الطابق الأول" },
      { p: [3.7, E1, -17.9], look: [9, FH + 1.3, -20], move: 2.6, hold: 2.6, cap: "شعبة الحسابات ورفوف أضابيرها" },
      { p: [1.3, E1, -20.9], look: [-2.5, FH + 1.4, -21.5], move: 1.6, hold: 2.6, cap: "شعبة ضمان الجودة وشبابيك المراجعين" },
      { p: [2.8, E1, -28.4], look: [4.25, FH + 2.0, -31.5], move: 2.6, hold: 3.4, cap: "باب «أمانة المجلس»، وعلى اليسار «مكتب العميد»" },
      { p: [4.25, E1, -32.4], look: [4.25, FH + 1.0, -41], move: 1.8, hold: 3.6, cap: "قاعة مجلس الكلية" },
      { p: [2.2, E1, -29.6], look: [-2, E1, -29.5], move: 2.0, cap: "" },
      { p: [-0.5, E1, -29.5], look: [-3.6, FH + 1.2, -30.6], move: 1.4, hold: 2.2, cap: "استقبال مكتب العميد" },
      { p: [-4.7, E1, -30.6], look: [-6.8, FH + 1.2, -29], move: 1.8, hold: 2.0, cap: "مكتب مدير مكتب العميد" },
      { p: [-6.5, E1, -31.3], look: [-6.5, FH + 1.5, -34], move: 1.4, cap: "" },
      { p: [-6.2, E1, -33.4], look: [-3.3, FH + 1.1, -39.5], move: 1.6, hold: 4.0, cap: "مكتب عميد الكلية" }
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
    const ty = OV.floor * FH + 0.5, tx = 2.5, tz = -19, cp = Math.cos(OV.pitch);
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
      REG.filter(r => r.spot && r.kind !== "stair" && r.kind !== "corridor").forEach(r => {
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
    if (P.lvl === 0 && P.x > SA.x0 + 0.05 && P.x < SA.x1 - 0.05 && P.z < SA.z0 - 0.02 && P.z > SA.z0 - 1.0) climb();
    else if (P.lvl === 1 && P.x > SB.x0 + 0.05 && P.x < SB.x1 - 0.05 && P.z < SA.z0 - 0.02 && P.z > SA.z0 - 1.0) descend();
  }
  const MAPB = { x0: -9.4, x1: 14.4, z0: -43.0, z1: 3.0 };
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
      <span class="ti-tag">عمادة كلية التربية للعلوم الصرفة</span><h4>${U.esc(d.name)}</h4><p>${U.esc(d.what)}</p>`;
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
    materials(); instances();
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
    const grp = l => REG.filter(r => r.lvl === l && r.spot && !(r.id === "u-end")).sort((a, b) => (order[a.kind] - order[b.kind]) || (a.z1 - b.z1 ? b.z1 - a.z1 : a.x0 - b.x0));
    const btn = r => `<button type="button" class="tile3d" data-r="${r.id}"><i class="k-${r.kind}"></i><span>${U.esc(r.name)}</span>${r.ph === 0 ? '<em class="dn-approx">تقريبية</em>' : ""}</button>`;
    U.$("#dn-rooms").innerHTML = [0, 1].map(l => `<div class="panel"><div class="panel-h"><h3>${l ? "الطابق الأول" : "الطابق الأرضي"}</h3></div><div class="tour-list">${l ? "" : `<button type="button" class="tile3d" data-r="out"><i class="k-outside"></i><span>الممر المسقّف أمام باب العمادة</span></button>`}${grp(l).map(btn).join("")}</div></div>`).join("") +
      `<div class="panel"><div class="panel-h"><h3>كيف تتجول</h3></div><ul class="tour-how"><li><b>للالتفات:</b> اسحب بالماوس أو بإصبعك.</li><li><b>للمشي:</b> اضغط على الأرض فتمشي إليها، أو استخدم W A S D والأسهم، أو عصا التحكم على الهاتف.</li><li><b>الدرج:</b> على يمين الداخل خلف الباب الزجاجي؛ امشِ إليه فتصعد تلقائياً.</li><li><b>من الأعلى:</b> زر الطبقات يرفع السقف فترى كل غرف الطابق بأثاثها، واضغط على أي غرفة لتدخلها.</li></ul>
      <button type="button" class="btn btn-sm u-mt8" data-r="ov"><svg aria-hidden="true"><use href="#i-layers"/></svg>اعرض الطابق من الأعلى</button>
      <p class="faint" style="font-size:.74rem;margin-top:10px">المجسّم مبني لقطةً لقطة على فيديوهات العمادة وصورها، واللوحات والشعارات مأخوذة من الصور نفسها، ولا يظهر أي شخص. لا يوجد مخطط هندسي، لذا الأبعاد تقديرية. الغرف المعلّمة «تقريبية» لم تُصوَّر من الداخل، فبُنيت على طراز الغرف المصوّرة.</p></div>`;
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
