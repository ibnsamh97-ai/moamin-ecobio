/* =====================================================================
   EcoBio AI — جولة ثلاثية الأبعاد في قسم علوم الحياة
   كلية التربية للعلوم الصرفة – جامعة تكريت
   المخطط مبني من وصف الطالب وصور مرجعية للقسم؛ لا تُعرض أي صورة أو شخص.
   لتعديل أسماء القاعات والمختبرات: عدّل مصفوفة ROOMS أدناه.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const FH = 3.7, CH = 3.3, EYE = 1.62, BW = 10.5, CW = 1.5, ZF = 20, ZB = -24;
  const FONT = '"Readex Pro","IBM Plex Sans Arabic","Noto Sans Arabic","Noto Naskh Arabic",Tahoma,Arial,sans-serif';

  /* side: 1 = يمين الداخل من الباب الرئيسي، -1 = يساره. z1 هو طرف الغرفة القريب من المدخل */
  const ROOMS = [
    { id: "g-r1", lvl: 0, side: 1, z0: 8, z1: 16, type: "micro", name: "مختبر الأحياء المجهرية", short: "مختبر ١" },
    { id: "g-r2", lvl: 0, side: 1, z0: 0, z1: 8, type: "class", name: "القاعة الدراسية الأولى", short: "قاعة ١", n: 0 },
    { id: "g-r3", lvl: 0, side: 1, z0: -8, z1: 0, type: "botany", name: "مختبر علم النبات", short: "مختبر ٢" },
    { id: "g-r4", lvl: 0, side: 1, z0: -16, z1: -8, type: "class", name: "القاعة الدراسية الثانية", short: "قاعة ٢", n: 1 },
    { id: "g-l1", lvl: 0, side: -1, z0: 8, z1: 16, type: "zoo", name: "مختبر علم الحيوان", short: "مختبر ٣" },
    { id: "g-l2", lvl: 0, side: -1, z0: 0, z1: 8, type: "class", name: "القاعة الدراسية الثالثة", short: "قاعة ٣", n: 2 },
    { id: "g-l3", lvl: 0, side: -1, z0: -8, z1: 0, type: "general", name: "مختبر الأحياء العامة", short: "مختبر ٤" },
    { id: "g-l4", lvl: 0, side: -1, z0: -16, z1: -8, type: "class", name: "القاعة الدراسية الرابعة", short: "قاعة ٤", n: 3 },
    { id: "u-r1", lvl: 1, side: 1, z0: 8, z1: 16, type: "head", name: "غرفة رئيس القسم", short: "رئيس القسم" },
    { id: "u-r2", lvl: 1, side: 1, z0: 0, z1: 8, type: "rapp", name: "المقررية", short: "المقررية" },
    { id: "u-r3", lvl: 1, side: 1, z0: -4, z1: 0, type: "staff", name: "غرفة التدريسيين", short: "تدريسيون" },
    { id: "u-r4", lvl: 1, side: 1, z0: -8, z1: -4, type: "staff", name: "غرفة التدريسيين", short: "تدريسيون" },
    { id: "u-r5", lvl: 1, side: 1, z0: -16, z1: -8, type: "staff", name: "غرفة التدريسيين", short: "تدريسيون" },
    { id: "u-l1", lvl: 1, side: -1, z0: 0, z1: 16, type: "env", name: "مختبر البيئة والتلوث", short: "البيئة والتلوث" },
    { id: "u-l2", lvl: 1, side: -1, z0: -8, z1: 0, type: "staff", name: "غرفة التدريسيين", short: "تدريسيون" },
    { id: "u-l3", lvl: 1, side: -1, z0: -16, z1: -8, type: "staff", name: "غرفة التدريسيين", short: "تدريسيون" }
  ];

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
    microscope: { name: "المجهر الضوئي المركب", what: "يكبّر العينات حتى 1000 مرة لفحص البكتيريا والطحالب والأحياء الدقيقة والمقاطع النسيجية.", tool: { view: "micro", label: "العالم المجهري 3D" } },
    autoclave: { name: "جهاز التعقيم (الأوتوكلاف)", what: "يعقّم الأوساط الزرعية والأدوات بالبخار المضغوط عند 121 °م و15 psi لمدة 15–20 دقيقة." },
    hood: { name: "خزانة الأبخرة", what: "تسحب الأبخرة السامة والحوامض المتطايرة بعيداً عن المستخدم أثناء الهضم وتحضير الكواشف. اعمل والزجاج منخفض." },
    incubator: { name: "الحاضنة البكتيرية", what: "تحفظ الأطباق عند 37 °م، أو 44.5 °م للقولونيات البرازية، لنمو البكتيريا وعدّها.", tool: { calc: "growth", label: "حاسبة النمو الميكروبي" } },
    oven: { name: "فرن التجفيف", what: "يجفف العينات عند 103–105 °م لتقدير المواد الصلبة الكلية والعالقة، وعند 180 °م للذائبة.", tool: { calc: "solids", label: "حاسبة المواد الصلبة" } },
    bunsen: { name: "موقد بنزن", what: "لهب لتعقيم إبرة النقل البكتيري والتسخين البسيط. أبعده عن المذيبات القابلة للاشتعال." },
    tissue: { name: "جهاز تحضير الأنسجة", what: "يمرّر العينات النسيجية آلياً عبر محاليل التثبيت والإنكاز والشمع، لتحضير مقاطع مجهرية لأنسجة الكائنات المعرّضة للتلوث." },
    embed: { name: "جهاز طمر الأنسجة بالشمع", what: "يطمر العينات النسيجية في قوالب شمعية لتقطيعها بالمشراح وفحصها مجهرياً." },
    fireball: { name: "مطفأة الحريق الكروية التلقائية", what: "معلّقة في سقف المختبرات، وتنفجر تلقائياً عند ارتفاع الحرارة فتنشر مسحوق الإطفاء." }
  };

  let st = null, scene, cam, stageEl, canvas, built = false, active = false, focused = false;
  const MAT = {}, BATCH = {}, INST = {}, SOLID = [[], []], PICK = [], FLOORS = [], BLOCK = [], TEXJOBS = [], REG = [];
  const P = { x: 0, z: 31, lvl: 0, yaw: 0, pitch: -0.04, bob: 0 };
  const keys = {}, joy = { x: 0, y: 0 };
  let walkPath = null, stuck = 0, anim = null, tour = false, whereT = 0, ledTex = null, mapFloor = 0, lastWhere = "";

  /* ---------------------------------------------------------------
     أدوات مساعدة
  --------------------------------------------------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  /* نص عربي على لوحة؛ يُعاد رسمه بعد تحميل الخطوط */
  function textTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    const job = () => { const g = c.getContext("2d"); g.clearRect(0, 0, w, h); g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "middle"; draw(g, w, h); t.needsUpdate = true; };
    job(); TEXJOBS.push(job); return t;
  }
  function signTex(lines, { w = 512, h = 128, bg = "#f1c232", fg = "#1b1b1b", border = null } = {}) {
    return textTex(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      if (border) { g.strokeStyle = border; g.lineWidth = Math.max(4, h * 0.05); g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2); }
      const total = lines.reduce((a, l) => a + l.s * 1.25, 0); let y = (h - total) / 2;
      lines.forEach(l => { g.fillStyle = l.c || fg; g.font = `${l.b || 600} ${l.s}px ${FONT}`; y += l.s * 0.625; g.fillText(l.t, w / 2, y); y += l.s * 0.625; });
    });
  }
  const lam = (color, o) => new THREE.MeshLambertMaterial(Object.assign({ color }, o || {}));
  const basic = (color, o) => new THREE.MeshBasicMaterial(Object.assign({ color }, o || {}));

  /* تجميع الهندسة الثابتة حسب المادة لتقليل أوامر الرسم */
  const BOXG = new THREE.BoxGeometry(1, 1, 1);
  function addGeo(key, geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)));
    (BATCH[key] = BATCH[key] || []).push(g);
  }
  function bx(key, x0, y0, z0, x1, y1, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    addGeo(key, BOXG, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, x1 - x0, y1 - y0, z1 - z0);
  }
  function flat(key, x0, z0, x1, z1, y, tile = 1, down = false) {
    const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0); if (w < 1e-3 || d < 1e-3) return;
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
    const uv = g.attributes.uv, mx = Math.min(x0, x1), mz = Math.min(z0, z1);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w + mx) / tile, (uv.getY(i) * d + mz) / tile);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
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
  function flushBatches() {
    for (const key in BATCH) {
      const mesh = new THREE.Mesh(mergeGeos(BATCH[key]), MAT[key]);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); scene.add(mesh);
      if (/^floor/.test(key)) FLOORS.push(mesh);
      else if (/^(wall|cream|cab|cabW|top|maroon|white|woodDark)$/.test(key)) BLOCK.push(mesh);
    }
  }
  /* عناصر متكررة كثيرة (كراسي، إضاءة، نباتات...) */
  function defInst(key, geo, mat, device) { INST[key] = { geo, mat, list: [], device }; }
  function addInst(key, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    INST[key].list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)));
  }
  function flushInst() {
    for (const k in INST) {
      const o = INST[k]; if (!o.list.length) continue;
      const im = new THREE.InstancedMesh(o.geo, o.mat, o.list.length);
      o.list.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;
      scene.add(im); if (o.device) { im.userData.device = o.device; PICK.push(im); }
    }
  }
  function solid(lvl, x0, z0, x1, z1, pad = 0) { SOLID[lvl].push([Math.min(x0, x1) - pad, Math.min(z0, z1) - pad, Math.max(x0, x1) + pad, Math.max(z0, z1) + pad]); }

  /* جدار ثابت x ممتد على z، مع فتحات أبواب ونوافذ */
  function wallZ(key, x, za, zb, lvl, t, holes = [], collide = true, y0o = 0, y1o = FH) {
    const y0 = lvl * FH + y0o, y1 = lvl * FH + y1o, z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    let cur = z0;
    const piece = (a, b, ya, yb, col) => { bx(key, x - t / 2, ya, a, x + t / 2, yb, b); if (col && collide) solid(lvl, x - t / 2, a, x + t / 2, b); };
    holes.slice().sort((p, q) => p.a - q.a).forEach(h => {
      if (h.a > cur) piece(cur, h.a, y0, y1, true);
      const yb = lvl * FH + (h.bottom || 0), yt = lvl * FH + (h.top || 2.15);
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
      const yb = lvl * FH + (h.bottom || 0), yt = lvl * FH + (h.top || 2.15);
      if (yb > y0 + 1e-3) piece(h.a, h.b, y0, yb, yb - y0 > 0.4);
      if (yt < y1 - 1e-3) piece(h.a, h.b, yt, y1, false);
      cur = Math.max(cur, h.b);
    });
    if (cur < x1) piece(cur, x1, y0, y1, true);
  }

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
  function device(key, parts, x, y, z, ry, lvl) {
    const g = new THREE.Group(); parts.forEach(p => g.add(p));
    g.position.set(x, y, z); g.rotation.y = ry;
    const c = compact(g); c.userData.device = key; scene.add(c); if (key) PICK.push(c); return c;
  }

  /* ---------------------------------------------------------------
     المواد والخامات
  --------------------------------------------------------------- */
  function materials() {
    const terr = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#d8cebb"; g.fillRect(0, 0, w, h); const R = rng(7);
      const cols = ["#8d8475", "#b9ae99", "#f0eadc", "#6f675a", "#a39780", "#c9bfa9", "#4e483f"];
      for (let i = 0; i < 2600; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; const s = 0.6 + R() * 2.2; g.beginPath(); g.ellipse(R() * w, R() * h, s, s * (0.6 + R() * 0.6), R() * 3, 0, 7); g.fill(); }
    }, true);
    const tile = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#e9e6df"; g.fillRect(0, 0, w, h); const R = rng(4);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(160,150,135,${R() * 0.12})`; g.fillRect(R() * w, R() * h, 2, 2); }
      g.strokeStyle = "#cfc9bd"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    }, true);
    const ceil = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#f2f1ed"; g.fillRect(0, 0, w, h); const R = rng(3);
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(140,140,130,${R() * 0.2})`; g.fillRect(R() * w, R() * h, 1.5, 1.5); }
      g.strokeStyle = "#c2c1b9"; g.lineWidth = 3;
      for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(k * 128, 0); g.lineTo(k * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, k * 128); g.lineTo(w, k * 128); g.stroke(); }
    }, true);
    const dado = canvasTex(16, 256, (g, w, h) => { g.fillStyle = "#f3f0e9"; g.fillRect(0, 0, w, h); g.fillStyle = "#e3d8c2"; g.fillRect(0, h * 0.68, w, h * 0.32); g.fillStyle = "#cbbd9e"; g.fillRect(0, h * 0.68 - 2, w, 3); });
    const mosaic = canvasTex(256, 256, (g, w, h) => {
      const R = rng(11), n = 44, pts = [], pal = ["#d9c49c", "#e6d6b4", "#cdb78d", "#ece0c4", "#c2a77a", "#dccaa6"].map(hex);
      for (let i = 0; i < n; i++) pts.push([R() * w, R() * h, pal[(R() * pal.length) | 0]]);
      const img = g.createImageData(w, h), grout = hex("#f4efe5");
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let d1 = 1e9, d2 = 1e9, ci = 0;
        for (let i = 0; i < n; i++) { let dx = Math.abs(x - pts[i][0]), dy = Math.abs(y - pts[i][1]); dx = Math.min(dx, w - dx); dy = Math.min(dy, h - dy); const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; ci = i; } else if (d < d2) d2 = d; }
        const c = Math.sqrt(d2) - Math.sqrt(d1) < 2.2 ? grout : pts[ci][2], k = (y * w + x) * 4;
        img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, true);
    const pavers = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#8e8d88"; g.fillRect(0, 0, w, h); const R = rng(5), bw = 64, bh = 32;
      for (let r = 0; r < h / bh; r++) { const off = (r % 2) * bw / 2; for (let c = -1; c < w / bw + 1; c++) { const v = (150 + R() * 45) | 0; g.fillStyle = `rgb(${v},${v - 3},${v - 9})`; g.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4); } }
    }, true);
    const grass = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6c8c3a"; g.fillRect(0, 0, w, h); const R = rng(9); for (let i = 0; i < 6000; i++) { g.fillStyle = R() < 0.5 ? "rgba(84,118,40,.55)" : "rgba(146,170,82,.45)"; g.fillRect(R() * w, R() * h, 2, 3); } }, true);
    const woodPanel = canvasTex(256, 256, (g, w, h) => {
      const R = rng(13); for (let x = 0; x < w; x += 32) { const v = 70 + R() * 20 | 0; g.fillStyle = `rgb(${v + 20},${v - 5},${v - 30})`; g.fillRect(x, 0, 32, h); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, 0, 2, h); }
      for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(40,22,8,${0.12 + R() * 0.15})`; g.beginPath(); const x = R() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.6, x + 2, h); g.stroke(); }
    }, true);
    const blinds = canvasTex(32, 128, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = "rgba(118,98,74,.96)"; g.fillRect(0, y, w, 9); g.fillStyle = "rgba(238,232,220,.38)"; g.fillRect(0, y + 9, w, 7); } }, true);
    const lattice = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = "#4b2e1b"; g.fillRect(0, 0, w, h); g.strokeStyle = "#7a5233"; g.lineWidth = 5;
      g.strokeRect(14, 14, w - 28, h - 28); g.strokeRect(30, 40, w - 60, h * 0.42); g.strokeRect(30, h * 0.52, w - 60, h * 0.42);
      g.save(); g.beginPath(); g.rect(34, 44, w - 68, h * 0.42 - 8); g.rect(34, h * 0.52 + 4, w - 68, h * 0.42 - 8); g.clip();
      g.lineWidth = 3; g.strokeStyle = "#8a6240"; for (let k = -h; k < w + h; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
      g.restore();
    });
    const pedGlass = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#7fa9b8"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, 0, w, h * 0.4); g.fillStyle = "#f1eee6"; for (let x = 0; x <= w; x += w / 4) g.fillRect(x - 5, 0, 10, h); for (let y = 0; y <= h; y += h / 3) g.fillRect(0, y - 5, w, 10); });
    const campusWin = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e5d9bd"; g.fillRect(0, 0, w, h); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { g.fillStyle = "#4d6570"; g.fillRect(14 + c * 62, 30 + r * 128, 40, 64); g.fillStyle = "#f3eee2"; g.fillRect(12 + c * 62, 94 + r * 128, 44, 5); } g.fillStyle = "#7b2633"; g.fillRect(0, 118, w, 6); }, true);

    Object.assign(MAT, {
      floorTerr: lam(0xffffff, { map: terr }), floorTile: lam(0xffffff, { map: tile }), floorMosaic: lam(0xffffff, { map: mosaic }),
      floorPav: lam(0xffffff, { map: pavers }), floorGrass: lam(0xffffff, { map: grass }), floorStair: lam(0xd9d2c3),
      ceil: lam(0xffffff, { map: ceil, emissive: 0x2a2a28 }), wall: lam(0xffffff, { map: dado }), wallPlain: lam(0xf1eee7),
      cream: lam(0xe7dbbf), maroon: lam(0x7a2733), roof: lam(0x9c968a), slab: lam(0xd8d2c4), woodPanel: lam(0xffffff, { map: woodPanel }),
      cab: lam(0xe6decb), cabW: lam(0xfdfdfb), seam: lam(0x8f8a80), top: lam(0xfbfbf9), handle: lam(0x2b2b2b), gold: lam(0xc9a54a),
      wood: lam(0x8a5a33), woodDark: lam(0x553521), door: lam(0x7a4b2a), frame: lam(0x5b3a24), metal: lam(0x9ea6ab), steel: lam(0xc9ced3),
      black: lam(0x2a2c30), grey: lam(0x8c9196), greyMetal: lam(0x7f868b), white: lam(0xf6f6f3), red: lam(0xc8342f), yellow: lam(0xe6c02e), green: lam(0x2f5a3a),
      blueChair: lam(0x2f4f7a), sofa: lam(0x6e4630), carpet: lam(0x7d2b2b), leaf: lam(0x4f8a3a), leaf2: lam(0x3d7330), trunk: lam(0x6b4a2f), pot: lam(0xe9e4da),
      glass: basic(0xa6cad6, { transparent: true, opacity: 0.32, depthWrite: false }), pedGlass: lam(0xffffff, { map: pedGlass }),
      blinds: basic(0xffffff, { map: blinds, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      grille: lam(0x3a3d40), whiteDS: lam(0xf6f6f3, { side: THREE.DoubleSide }), light: basic(0xffffff), lightWarm: basic(0xfff7e6), screen: basic(0x1e2a33), lattice: lam(0xffffff, { map: lattice }),
      devWhite: lam(0xf1f1ee), devGrey: lam(0xb8bec3), devDark: lam(0x3a4048), devBlue: lam(0x56679c), devScreen: basic(0x2b7a8e), devGlass: basic(0xbfe3ee, { transparent: true, opacity: 0.35, depthWrite: false }),
      water: basic(0xa98a52, { transparent: true, opacity: 0.6, depthWrite: false }), campus: lam(0xffffff, { map: campusWin }), board: lam(0xffffff)
    });
    campusWin.repeat.set(1, 1);
  }

  /* ---------------------------------------------------------------
     المبنى: الجدران والأرضيات والأسقف
  --------------------------------------------------------------- */
  const doorZ = r => r.z1 - 1.4;            // مركز باب الغرفة على الممر
  const rx = (r, u) => r.side * (CW + u);   // من إحداثي الغرفة إلى العالم
  function shell() {
    const T = 0.15;
    for (let lvl = 0; lvl < 2; lvl++) {
      const y = lvl * FH;
      // أرضيات
      if (lvl === 0) flat("floorTerr", -BW, ZB, BW, ZF, 0.004, 1.2);
      else {
        flat("floorTerr", -CW, -20, CW, ZF, y + 0.004, 1.2);
        ROOMS.filter(r => r.lvl === 1).forEach(r => flat(r.type === "env" ? "floorMosaic" : "floorTile", r.side * CW, r.z0, r.side * BW, r.z1, y + 0.004, r.type === "env" ? 2.4 : 0.6));
        flat("floorTerr", CW, -21.3, BW, -16, y + 0.004, 1.2); flat("floorTerr", 9.5, ZB, BW, -21.3, y + 0.004, 1.2); flat("floorTerr", CW, ZB, 2.8, -21.3, y + 0.004, 1.2);
        flat("floorTile", -BW, ZB, -CW, -16, y + 0.004, 0.6); flat("floorTile", -BW, 16, -CW, ZF, y + 0.004, 0.6); flat("floorTile", CW, 16, BW, ZF, y + 0.004, 0.6);
        // البلاطة بين الطابقين (تُرى من فتحة السلّم)
        bx("slab", CW, CH, -21.3, 2.8, FH, ZB); bx("slab", 2.8, CH, -21.3, 9.5, FH, -21.25); bx("slab", 2.75, CH, -21.3, 2.8, FH, ZB);
      }
      // أسقف مستعارة
      const cy = y + CH;
      if (lvl === 0) { flat("ceil", -BW, -21.3, BW, ZF, cy, 1.2, true); flat("ceil", -BW, ZB, CW, -21.3, cy, 1.2, true); flat("ceil", CW, ZB, 2.8, -21.3, cy, 1.2, true); flat("ceil", 9.5, ZB, BW, -21.3, cy, 1.2, true); }
      else flat("ceil", -BW, ZB, BW, ZF, cy, 1.2, true);

      // جدارا الممر مع الأبواب
      [1, -1].forEach(s => {
        const holes = ROOMS.filter(r => r.lvl === lvl && r.side === s).map(r => ({ a: doorZ(r) - 0.6, b: doorZ(r) + 0.6, top: 2.15 }));
        if (s === 1) holes.push({ a: -19.3, b: -17.3, top: 2.4 }); // بوابة السلّم
        wallZ("wall", s * CW, -20, ZF, lvl, T, holes);
        if (s === 1) { wallZ("wall", CW, ZB, -20, lvl, T); }
      });
      // جدار نهاية الممر (باب زجاجي يطل على الخلف)
      wallX("wall", -20, -CW, CW, lvl, T, [{ a: -0.95, b: 0.95, bottom: lvl ? 0.9 : 0.02, top: 2.6 }]);
      bx("glass", -0.95, y + (lvl ? 0.9 : 0.02), -20.01, 0.95, y + 2.6, -19.99); solid(lvl, -0.95, -20.08, 0.95, -19.92);
      frameRect("frame", "x", -20, -0.95, 0.95, y + (lvl ? 0.9 : 0.02), y + 2.6, 0.06);
      // الجدران الفاصلة بين الغرف
      const cuts = { "0,1": [16, 8, 0, -8, -16], "0,-1": [16, 8, 0, -8, -16], "1,1": [16, 8, 0, -4, -8, -16], "1,-1": [16, 0, -8, -16] };
      [1, -1].forEach(s => (cuts[lvl + "," + s]).forEach(z => wallX("wall", z, s * CW, s * BW, lvl, T)));
    }
    // خلف الممر: فراغ خارجي (رواق خلفي)
    bx("cream", -CW - 0.08, 0, ZB, -CW + 0.08, 2 * FH, -20); bx("cream", CW - 0.08, 0, ZB, CW + 0.08, 2 * FH, -20); solid(0, -CW - 0.08, ZB, -CW + 0.08, -20);
    flat("floorPav", -CW, ZB, CW, -20, 0.006, 2);

    exteriorWalls();
    stairs();
    for (let lvl = 0; lvl < 2; lvl++) corridorDetails(lvl);
  }

  function frameRect(key, axis, at, a, b, y0, y1, t) {
    if (axis === "x") { bx(key, a - t, y0, at - t, a, y1, at + t); bx(key, b, y0, at - t, b + t, y1, at + t); bx(key, a - t, y1, at - t, b + t, y1 + t, at + t); if (y0 > 0.1) bx(key, a - t, y0 - t, at - t, b + t, y0, at + t); }
    else { bx(key, at - t, y0, a - t, at + t, y1, a); bx(key, at - t, y0, b, at + t, y1, b + t); bx(key, at - t, y1, a - t, at + t, y1 + t, b + t); if (y0 > 0.1) bx(key, at - t, y0 - t, a - t, at + t, y0, b + t); }
  }
  /* نافذة خارجية: زجاج + إطار + شبك حماية + ستارة زيبرا */
  function windowZ(s, lvl, za, zb, bottom = 1.0, top = 2.4, blind = true) {
    const y = lvl * FH, x = s * BW;
    bx("glass", x - 0.01, y + bottom, za, x + 0.01, y + top, zb);
    frameRect("white", "z", x, za, zb, y + bottom, y + top, 0.05);
    bx("white", x - 0.03, y + (bottom + top) / 2 - 0.03, za, x + 0.03, y + (bottom + top) / 2 + 0.03, zb);
    for (let z = za + 0.18; z < zb - 0.05; z += 0.2) bx("grille", x + s * 0.16 - 0.012, y + bottom, z - 0.012, x + s * 0.16 + 0.012, y + top, z + 0.012);
    bx("cream", x + s * 0.02, y + bottom - 0.08, za - 0.05, x + s * 0.24, y + bottom, zb + 0.05);
    if (blind) bx("blinds", x - s * 0.2 - 0.005, y + bottom + (top - bottom) * 0.35, za, x - s * 0.2 + 0.005, y + top + 0.1, zb);
  }
  function windowX(z, lvl, xa, xb, bottom = 1.0, top = 2.4, out = 1) {
    const y = lvl * FH;
    bx("glass", xa, y + bottom, z - 0.01, xb, y + top, z + 0.01);
    frameRect("white", "x", z, xa, xb, y + bottom, y + top, 0.05);
    for (let x = xa + 0.18; x < xb - 0.05; x += 0.2) bx("grille", x - 0.012, y + bottom, z + out * 0.16 - 0.012, x + 0.012, y + top, z + out * 0.16 + 0.012);
  }

  function exteriorWalls() {
    const TO = 0.12, TI = 0.13;
    [1, -1].forEach(s => {
      for (let lvl = 0; lvl < 2; lvl++) {
        const wins = [];
        ROOMS.filter(r => r.lvl === lvl && r.side === s).forEach(r => {
          const L = r.z1 - r.z0;
          if (L >= 8) for (let k = 0; k < Math.floor(L / 4); k++) wins.push({ a: r.z0 + k * 4 + 1.0, b: r.z0 + k * 4 + 3.0, bottom: 1.0, top: 2.4 });
          else wins.push({ a: r.z0 + 1.0, b: r.z0 + 3.0, bottom: 1.0, top: 2.4 });
        });
        wins.push({ a: 17, b: 19, bottom: 1.0, top: 2.4 });
        wins.push({ a: -22.5, b: -20.5, bottom: 1.0, top: 2.4 });
        wallZ("cream", s * (BW + TI / 2 + TO / 2), ZB, ZF, lvl, TO, wins, false);
        wallZ("wall", s * BW, ZB, ZF, lvl, TI, wins);
        wins.forEach(w => windowZ(s, lvl, w.a, w.b, w.bottom, w.top, w.a > -16 && w.a < 16));
      }
    });
    // الواجهة الأمامية
    for (let lvl = 0; lvl < 2; lvl++) {
      const holes = [{ a: 4.5, b: 7.5, bottom: 1.0, top: 2.4 }, { a: -7.5, b: -4.5, bottom: 1.0, top: 2.4 }];
      holes.push(lvl === 0 ? { a: -1.2, b: 1.2, bottom: 0, top: 2.8 } : { a: -1.2, b: 1.2, bottom: 0.5, top: 3.1 });
      wallX("cream", ZF + 0.125, -BW - 0.25, BW + 0.25, lvl, TO, holes, false);
      wallX("wall", ZF, -BW, BW, lvl, TI, holes);
      [[4.5, 7.5], [-7.5, -4.5]].forEach(([a, b]) => windowX(ZF + 0.06, lvl, a, b, 1.0, 2.4, 1));
      if (lvl) bx("glass", -1.2, FH + 0.5, ZF - 0.01, 1.2, FH + 3.1, ZF + 0.01);
    }
    // الواجهة الخلفية
    for (let lvl = 0; lvl < 2; lvl++) {
      const holes = [{ a: 5, b: 8, bottom: 1.0, top: 2.4 }, { a: -8, b: -5, bottom: 1.3, top: 2.2 }];
      [[CW, BW], [-BW, -CW]].forEach(([a, b]) => {
        const hs = holes.filter(h => h.a >= a && h.b <= b);
        wallX("cream", ZB - 0.125, a < 0 ? a - 0.25 : a, b > 0 ? b + 0.25 : b, lvl, TO, hs, false);
        wallX("wall", ZB, a, b, lvl, TI, hs);
        hs.forEach(h => windowX(ZB - 0.06, lvl, h.a, h.b, h.bottom, h.top, -1));
      });
    }
    // السطح والستارة
    flat("roof", -BW - 0.25, ZB - 0.2, BW + 0.25, ZF + 0.2, 2 * FH + 0.02, 3);
    bx("slab", -BW - 0.25, 2 * FH - 0.3, ZB - 0.2, BW + 0.25, 2 * FH, ZF + 0.2);
    [[-BW - 0.25, ZB - 0.2, BW + 0.25, ZB + 0.05], [-BW - 0.25, ZF - 0.05, BW + 0.25, ZF + 0.2], [-BW - 0.25, ZB - 0.2, -BW, ZF + 0.2], [BW, ZB - 0.2, BW + 0.25, ZF + 0.2]]
      .forEach(([x0, z0, x1, z1]) => { bx("cream", x0, 2 * FH, z0, x1, 2 * FH + 0.55, z1); bx("maroon", x0 - 0.03, 2 * FH + 0.55, z0 - 0.03, x1 + 0.03, 2 * FH + 0.68, z1 + 0.03); });
    // أعمدة عنابية على الزوايا وحزام بين الطابقين
    [[-BW - 0.45, -BW + 0.35], [BW - 0.35, BW + 0.45]].forEach(([a, b]) => { bx("maroon", a, 0, ZF - 0.2, b, 2 * FH + 0.7, ZF + 0.32); bx("maroon", a, 0, ZB - 0.32, b, 2 * FH + 0.7, ZB + 0.2); });
    bx("maroon", -BW - 0.3, 0, ZF + 0.18, BW + 0.3, 0.45, ZF + 0.3);
    bx("cream", -BW - 0.3, FH - 0.08, ZF + 0.18, BW + 0.3, FH + 0.08, ZF + 0.32);
    // المدخل: إطار عنابي وجملون ونافذة علوية
    bx("maroon", -2.6, 0, ZF, -1.25, 2 * FH + 0.4, ZF + 0.75); bx("maroon", 1.25, 0, ZF, 2.6, 2 * FH + 0.4, ZF + 0.75);
    bx("maroon", -2.6, 2.8, ZF, 2.6, 4.15, ZF + 0.75); solid(0, -2.6, ZF, -1.25, ZF + 0.75); solid(0, 1.25, ZF, 2.6, ZF + 0.75);
    bx("maroon", -2.6, 2 * FH - 0.15, ZF, 2.6, 2 * FH + 0.4, ZF + 0.75);
    const tri = new THREE.Shape(); tri.moveTo(-2.9, 0); tri.lineTo(2.9, 0); tri.lineTo(0, 1.9); tri.lineTo(-2.9, 0);
    const triG = new THREE.ExtrudeGeometry(tri, { depth: 0.75, bevelEnabled: false }); addGeo("maroon", triG, 0, 2 * FH + 0.4, ZF, 0);
    bx("pedGlass", -1.25, 4.15, ZF + 0.5, 1.25, 2 * FH - 0.15, ZF + 0.52);
    bx("slab", -2.6, 0, ZF, 2.6, 0.12, ZF + 2.0);
    // باب خشبي مزخرف مفتوح للداخل
    [-1, 1].forEach(k => { bx("lattice", k * 1.2, 0.02, ZF - 0.05, k * 1.2 - k * 0.06, 2.75, ZF - 1.2); });
    frameRect("frame", "x", ZF + 0.05, -1.2, 1.2, 0.0, 2.8, 0.07);
    // لوحة القسم
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.05), basic(0xffffff, { map: signTex([{ t: "كلية التربية للعلوم الصرفة", s: 58, c: "#e2c26b" }, { t: "قسم علوم الحياة", s: 98, b: 700, c: "#e9cd7a" }, { t: "أُسس عام ١٩٩٢", s: 36, c: "#cdb06a" }], { w: 1024, h: 300, bg: "#141414", border: "#b9974a" }) }));
    sign.position.set(0, 3.45, ZF + 0.77); scene.add(sign);
    // وحدات تكييف خارجية
    [[-4.2, 2.6], [6.2, 2.4], [-8.4, FH + 2.5], [8.6, FH + 2.5]].forEach(([x, y]) => { bx("white", x - 0.42, y, ZF + 0.19, x + 0.42, y + 0.55, ZF + 0.5); bx("grille", x - 0.3, y + 0.1, ZF + 0.5, x + 0.1, y + 0.45, ZF + 0.52); });
  }

  function stairs() {
    const n = 22, run = 0.295, rise = FH / n;
    for (let i = 0; i < n; i++) { const x0 = 3.0 + i * run; bx("floorStair", x0, 0, -23.6, x0 + run, (i + 1) * rise, -21.4); }
    bx("floorStair", 9.49, FH - 0.3, ZB, BW, FH, -21.3); // بسطة علوية
    // درابزين
    for (let i = 0; i <= n; i += 3) { const x = 3.05 + i * run, yb = i * rise; bx("metal", x - 0.02, yb, -21.47, x + 0.02, yb + 0.95, -21.43); }
    const len = Math.hypot(n * run, FH), ang = Math.atan2(FH, n * run);
    const rail = new THREE.BoxGeometry(len, 0.05, 0.05); rail.rotateZ(ang);
    addGeo("metal", rail, 3.0 + n * run / 2, 0.95 + FH / 2, -21.45);
    bx("metal", 2.8, FH + 0.95, -21.33, 9.5, FH + 1.0, -21.28); bx("metal", 2.78, FH + 0.95, ZB, 2.83, FH + 1.0, -21.3);
    for (let x = 2.85; x < 9.5; x += 0.9) bx("metal", x - 0.02, FH, -21.32, x + 0.02, FH + 0.97, -21.28);
    solid(0, 3.75, -23.65, 9.6, -21.35); // الدرج نفسه (يُصعد بالحركة التلقائية)
    solid(1, 2.8, ZB, 9.5, -21.3);       // فتحة السلّم في الطابق الأول
    // البوابة الحديدية البيضاء
    for (let lvl = 0; lvl < 2; lvl++) {
      const y = lvl * FH;
      for (let x = CW + 0.12; x <= CW + 0.96; x += 0.12) bx("white", x - 0.012, y + 0.05, -19.3, x + 0.012, y + 2.3, -19.27);
      bx("white", CW + 0.08, y + 2.25, -19.31, CW + 1.0, y + 2.32, -19.26); bx("white", CW + 0.08, y + 1.05, -19.31, CW + 1.0, y + 1.1, -19.26);
    }
  }

  function corridorDetails(lvl) {
    const y = lvl * FH;
    for (let z = 18.8; z > -19.5; z -= 2.4) { addInst((Math.round((z - 18.8) / 2.4) % 2) ? "down" : "panel", 0, y + CH - 0.012, z); }
    // نباتات
    [[1.15, 18.4], [-1.15, 18.4], [1.15, -15.6], [-1.15, -12.5], [1.15, 6.4]].forEach(([x, z], i) => { if (lvl && i === 0) return; addInst("potI", x, y, z); addInst("leafI", x, y + 0.45, z, i, 1, 1.2, 1); });
    // لوحات إعلانات
    const nb = [[CW - 0.09, 4.0, -1], [-CW + 0.09, -4.0, 1]];
    nb.forEach(([x, z, f]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95), MAT.notice); p.position.set(x, y + 1.6, z); p.rotation.y = f * Math.PI / 2; scene.add(p); });
    // مطفأة حريق جدارية
    addInst("extI", -CW + 0.12, y + 0.35, -15.2); addInst("extI", CW - 0.12, y + 0.35, 17.2);
    // لافتة مخرج
    const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), MAT.exitSign); ex.position.set(0, y + 2.75, -19.9); scene.add(ex);
    // صور مؤطرة في المدخل
    if (lvl === 0) {
      [[CW - 0.08, 17.6, -1, MAT.frame1], [-CW + 0.08, 17.6, 1, MAT.frame2]].forEach(([x, z, f, mat]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), mat); p.position.set(x, y + 1.65, z); p.rotation.y = f * Math.PI / 2; scene.add(p); });
    } else {
      // اللافتة المعلقة لمختبر البيئة والتلوث (تقرأها وأنت قادم من السلّم)
      const hs = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.55), MAT.envSign); hs.position.set(0, y + 2.7, -11); hs.rotation.y = Math.PI; scene.add(hs);
      bx("gold", -0.6, y + 2.98, -11.01, -0.58, y + CH, -10.99); bx("gold", 0.58, y + 2.98, -11.01, 0.6, y + CH, -10.99);
    }
    // لافتات الأبواب الصفراء
    ROOMS.filter(r => r.lvl === lvl).forEach(r => {
      const s = r.side, z = doorZ(r);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.24), basic(0xffffff, { map: signTex([{ t: r.name, s: r.name.length > 16 ? 40 : 48 }], { w: 512, h: 124 }) }));
      p.position.set(s * (CW - 0.085), y + 2.42, z); p.rotation.y = -s * Math.PI / 2; scene.add(p);
      // إطار الباب ودرفته المفتوحة
      frameRect("frame", "z", s * CW, z - 0.6, z + 0.6, y, y + 2.15, 0.05);
      bx("door", s * (CW + 0.08), y + 0.01, z + 0.55, s * (CW + 1.18), y + 2.1, z + 0.6);
      bx("gold", s * (CW + 1.0), y + 1.0, z + 0.5, s * (CW + 1.08), y + 1.04, z + 0.55);
    });
    // باب دورات المياه (مغلق)
    bx("door", -CW + 0.08, y, -18.9, -CW + 0.1, y + 2.1, -17.8);
    const wc = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.24), MAT.wcSign); wc.position.set(-CW + 0.085, y + 2.42, -18.35); wc.rotation.y = Math.PI / 2; scene.add(wc);
    const st2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.24), MAT.stairSign); st2.position.set(CW - 0.085, y + 2.6, -18.3); st2.rotation.y = -Math.PI / 2; scene.add(st2);
  }

  /* ---------------------------------------------------------------
     محتوى الغرف
  --------------------------------------------------------------- */
  function ctx(r) {
    const s = r.side, y = r.lvl * FH, L = r.z1 - r.z0;
    const X = u => s * (CW + u), Z = v => r.z0 + v;
    const yaw = f => f === "+u" ? Math.atan2(s, 0) : f === "-u" ? Math.atan2(-s, 0) : f === "-v" ? Math.PI : 0;
    return {
      r, s, y, L, X, Z, yaw,
      box(key, u0, h0, v0, u1, h1, v1, col) { bx(key, X(u0), y + h0, Z(v0), X(u1), y + h1, Z(v1)); if (col) solid(r.lvl, X(u0), Z(v0), X(u1), Z(v1), 0.04); },
      inst(key, u, v, h, f = "+v", sx, sy, sz) { addInst(key, X(u), y + h, Z(v), yaw(f), sx, sy, sz); },
      dev(key, parts, u, v, h, f, col) { const o = device(key, parts, X(u), y + h, Z(v), yaw(f), r.lvl); if (col) solid(r.lvl, X(u - col[0]), Z(v - col[1]), X(u + col[0]), Z(v + col[1])); return o; },
      plane(mat, w, h, u, v, hh, f) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(X(u), y + hh, Z(v)); p.rotation.y = yaw(f); scene.add(p); return p; }
    };
  }
  function ceilingLights(c, du = 2.3, dv = 2.4) {
    for (let u = 2.2; u < 9; u += du) for (let v = 1.4; v < c.L - 0.5; v += dv) c.inst("panel", u, v, CH - 0.012);
  }
  function sink(c, u, v) { c.box("steel", u - 0.28, 0.885, v - 0.2, u + 0.28, 0.9, v + 0.2); c.box("devDark", u - 0.22, 0.89, v - 0.15, u + 0.22, 0.905, v + 0.15); c.inst("tapI", u, v, 0.88); }
  function labBase(c, o = {}) {
    const L = c.L, isle1 = o.isle || [1.5, L - 2.5];
    c.box(o.cab || "cab", 3.55, 0, isle1[0], 5.25, 0.82, isle1[1], true); c.box("top", 3.5, 0.82, isle1[0] - 0.05, 5.3, 0.88, isle1[1] + 0.05);
    for (let v = isle1[0]; v <= isle1[1] + 0.01; v += 0.6) { c.inst("seamI", 3.545, v, 0.02, "+u", 1, 0.8, 1); c.inst("seamI", 5.255, v, 0.02, "+u", 1, 0.8, 1); }
    for (let v = isle1[0] + 0.4; v < isle1[1]; v += 0.85) { c.inst("seat", 3.1, v, 0.62); c.inst("leg", 3.1, v, 0); c.inst("seat", 5.7, v, 0.62); c.inst("leg", 5.7, v, 0); }
    // مصطبة الجدار الخارجي تحت النوافذ
    c.box(o.cab || "cab", 8.25, 0, 0.3, 8.9, 0.82, L - 1.9, true); c.box("top", 8.2, 0.82, 0.25, 8.92, 0.88, L - 1.85);
    // مصطبة الجدار الخلفي مع خزانات علوية
    c.box(o.cab || "cab", 0.3, 0, 0.1, 8.2, 0.82, 0.72, true); c.box("top", 0.25, 0.82, 0.08, 8.25, 0.88, 0.78);
    if (o.panel) c.box("woodPanel", 0.3, 0.88, 0.08, 8.2, 1.9, 0.1);
    c.box("cabW", 0.4, 1.9, 0.08, 8.2, 2.62, 0.45);
    c.box("seam", 0.4, 1.88, 0.1, 8.2, 1.9, 0.46); c.box("seam", 0.4, 2.62, 0.1, 8.2, 2.64, 0.46);
    for (let u = 0.4; u < 8.25; u += 0.55) { c.inst("seamI", u, 0.455, 1.9, "+v", 1, 0.72, 1); c.inst("seamI", u, 0.725, 0.02, "+v", 1, 0.8, 1); }
    for (let v = 0.3; v < L - 1.85; v += 0.55) c.inst("seamI", 8.245, v, 0.02, "+u", 1, 0.8, 1);
    for (let u = 0.67; u < 8.2; u += 0.55) { c.inst(o.panel ? "handleG" : "handleI", u, 0.47, 2.0); c.inst(o.panel ? "handleG" : "handleI", u, 0.74, 0.62); }
    sink(c, 1.0, 0.42); sink(c, 8.55, L - 2.4);
    // سبورة بيضاء على جدار الممر
    c.box("white", 0.08, 1.0, 1.0, 0.12, 2.2, 4.2); c.box("metal", 0.07, 0.98, 0.98, 0.13, 1.02, 4.22);
    // مطفأتان كرويتان في السقف
    [[3.0, L * 0.3], [6.2, L * 0.7]].forEach(([u, v]) => { c.inst("fireBall", u, v, CH - 0.62); c.inst("rod", u, v, CH - 0.45); });
    // مكيف جداري وسلال
    c.box("white", 2.0, 2.55, L - 0.35, 3.1, 2.85, L - 0.08); c.box("grille", 2.05, 2.56, L - 0.36, 3.05, 2.6, L - 0.34);
    c.inst("binR", 1.7, L - 0.45, 0); c.inst("binY", 2.15, L - 0.45, 0);
    ceilingLights(c);
  }
  function microscope(c, u, v, f) {
    const M = MAT;
    c.dev("microscope", [B(0.18, 0.04, 0.24, M.black), B(0.06, 0.3, 0.06, M.devWhite, 0, 0.04, -0.08), B(0.14, 0.02, 0.13, M.black, 0, 0.15, 0.02), C(0.03, 0.08, M.black, 0, 0.2, 0.0), B(0.08, 0.08, 0.14, M.devWhite, 0, 0.3, -0.03), mm(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10), M.black, -0.022, 0.42, 0.03, -0.6), mm(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10), M.black, 0.022, 0.42, 0.03, -0.6)], u, v, 0.88, f);
  }
  function incubator(c, key, u, v, h, f, w = 0.62, hh = 0.8) {
    const M = MAT;
    return c.dev(key, [B(w, hh, 0.6, M.devWhite), B(w * 0.7, hh * 0.45, 0.02, M.devScreen, -w * 0.05, hh * 0.3, 0.3), B(w, 0.1, 0.62, M.devGrey, 0, hh - 0.1, 0), B(0.04, hh * 0.35, 0.04, M.devGrey, w * 0.4, hh * 0.35, 0.32)], u, v, h, f, h < 0.1 ? [w / 2 + 0.05, 0.35] : null);
  }
  function poster(c, mat, u, v, f) {
    if (f === "+v" || f === "-v") c.box("white", u - 0.32, 0.88, v - 0.02, u + 0.32, 1.72, v + 0.02); else c.box("white", u - 0.02, 0.88, v - 0.32, u + 0.02, 1.72, v + 0.32);
    const du = f === "+u" ? 0.025 : f === "-u" ? -0.025 : 0, dv = f === "+v" ? 0.025 : f === "-v" ? -0.025 : 0;
    c.plane(mat, 0.6, 0.8, u + du, v + dv, 1.3, f);
  }

  function buildRoom(r) {
    const c = ctx(r), L = c.L, M = MAT;
    if (r.type === "class") {
      c.box("white", 1.0, 0.95, 0.08, 4.2, 2.2, 0.12); c.box("metal", 0.98, 0.93, 0.07, 4.22, 0.97, 0.13);
      c.plane(M.wb[r.n % M.wb.length], 3.1, 1.15, 2.6, 0.13, 1.575, "+v");
      c.box("white", 4.8, 1.1, 0.08, 8.0, 2.75, 0.11); c.plane(M.slide, 3.1, 1.55, 6.4, 0.12, 1.92, "+v");
      c.box("devWhite", 6.15, CH - 0.35, 4.35, 6.65, CH - 0.2, 4.75); c.box("metal", 6.38, CH - 0.2, 4.52, 6.42, CH, 4.58);
      c.box("wood", 3.0, 0.72, 1.2, 4.7, 0.76, 1.95, true); c.box("woodDark", 3.05, 0, 1.25, 4.65, 0.72, 1.3);
      c.inst("chairI", 3.85, 0.85, 0, "+v");
      for (let v = 2.9; v < 7.6; v += 1.0) for (let u = 2.2; u < 8.6; u += 1.0) { if (v > 5.5 && u < 2.5) continue; c.inst("chairI", u, v, 0, "-v"); }
      c.box("white", 6.0, 2.55, L - 0.35, 7.1, 2.85, L - 0.08);
      ceilingLights(c);
      return;
    }
    if (r.type === "micro" || r.type === "general" || r.type === "botany" || r.type === "zoo") {
      labBase(c);
      if (r.type === "micro" || r.type === "general") {
        [1.4, 2.7, 4.0, 5.3].forEach(v => microscope(c, 8.55, v, "-u"));
        incubator(c, "incubator", 8.5, L - 1.05, 0, "-u", 0.62, 0.95);
        c.dev("oven", [B(0.6, 0.5, 0.48, M.devWhite), B(0.4, 0.28, 0.02, M.devScreen, -0.05, 0.12, 0.24), B(0.1, 0.4, 0.02, M.devDark, 0.22, 0.05, 0.24)], 2.2, 0.42, 0.88, "+v");
        c.dev("autoclave", [C(0.24, 0.72, M.devWhite), C(0.25, 0.08, M.steel, 0, 0.72, 0, 20, 0.2), B(0.2, 0.25, 0.06, M.devDark, 0, 0.35, 0.24)], 1.0, 1.4, 0, "+u", [0.3, 0.3]);
        [2.2, 3.9].forEach(v => c.dev("bunsen", [C(0.045, 0.025, M.devBlue), C(0.01, 0.15, M.steel, 0, 0.025, 0)], 4.4, v, 0.88, "+v"));
        if (r.type === "general") c.dev("bath", [B(0.5, 0.24, 0.32, M.steel), B(0.52, 0.02, 0.34, M.steel, 0, 0.24, 0), B(0.16, 0.12, 0.02, M.devBlue, 0.15, 0.06, 0.17)], 4.6, 0.42, 0.88, "+v");
      }
      if (r.type === "botany") {
        poster(c, M.posters[0], 2.2, 0.55, "+v"); poster(c, M.posters[1], 3.2, 0.55, "+v"); poster(c, M.posters[2], 8.55, 3.0, "-u");
        [[4.0, 2.8, 0xe8466b], [4.6, 4.6, 0xf2b632]].forEach(([u, v, col]) => { const pm = lam(col); c.dev(null, [C(0.012, 0.32, M.leaf), mm(new THREE.SphereGeometry(0.06, 10, 8), pm, 0, 0.36, 0), mm(new THREE.SphereGeometry(0.04, 8, 6), pm, 0.06, 0.32, 0.02), mm(new THREE.SphereGeometry(0.04, 8, 6), pm, -0.05, 0.33, -0.03), B(0.14, 0.03, 0.14, M.woodDark)], u, v, 0.88, "+v"); });
        c.box("black", 5.0, 1.55, L - 0.1, 6.3, 2.3, L - 0.05); c.plane(M.tvBot, 1.2, 0.68, 5.65, L - 0.112, 1.925, "-v");
        [2.4, 5.3].forEach(v => microscope(c, 8.55, v, "-u"));
      }
      if (r.type === "zoo") {
        const birds = [[1.2, 0.28, 0], [2.6, 0.28, 1], [4.4, 0.28, 0], [6.4, 0.28, 1]];
        birds.forEach(([u, v, kind]) => {
          const body = lam(kind ? 0x8a6a4a : 0x6e6a62), wing = lam(kind ? 0x6b4f35 : 0x4f4b45);
          c.dev(null, [B(0.24, 0.04, 0.16, M.woodDark), C(0.012, 0.12, M.woodDark, 0, 0.04, 0), mm(new THREE.SphereGeometry(0.11, 10, 8), body, 0, 0.26, 0), mm(new THREE.SphereGeometry(0.065, 10, 8), body, 0, 0.38, 0.06), mm(new THREE.ConeGeometry(0.02, 0.07, 6), M.yellow, 0, 0.37, 0.14, Math.PI / 2), mm(new THREE.SphereGeometry(0.1, 8, 6), wing, 0.07, 0.27, -0.02), mm(new THREE.SphereGeometry(0.1, 8, 6), wing, -0.07, 0.27, -0.02)].map((o, i) => { if (i >= 6) o.scale.set(0.35, 0.8, 1.3); else if (i === 2) o.scale.set(1, 1.15, 1.25); return o; }), u, v, 2.62, "+v");
        });
        const frog = lam(0x3d8a3a);
        c.dev(null, [mm(new THREE.SphereGeometry(0.16, 12, 10), frog, 0, 0.08, 0), mm(new THREE.SphereGeometry(0.04, 8, 6), M.black, 0.07, 0.17, 0.1), mm(new THREE.SphereGeometry(0.04, 8, 6), M.black, -0.07, 0.17, 0.1)].map((o, i) => { if (!i) o.scale.set(1.2, 0.55, 1.5); return o; }), 4.4, 3.4, 0.88, "+v");
        poster(c, M.posters[3], 3.0, 0.55, "+v");
        [1.5, 3.2, 5.0].forEach(v => microscope(c, 8.55, v, "-u"));
      }
      return;
    }
    if (r.type === "env") {
      labBase(c, { isle: [2.6, 6.8], panel: true, cab: "cabW" });
      c.box("cabW", 3.55, 0, 8.8, 5.25, 0.82, 13.0, true); c.box("top", 3.5, 0.82, 8.75, 5.3, 0.88, 13.05);
      for (let v = 8.8; v <= 13.01; v += 0.6) { c.inst("seamI", 3.545, v, 0.02, "+u", 1, 0.8, 1); c.inst("seamI", 5.255, v, 0.02, "+u", 1, 0.8, 1); }
      [3.6, 5.2].forEach(u => [8.8, 13.0].forEach(v => c.box("white", u - 0.03, 0.88, v - 0.03, u + 0.03, 2.1, v + 0.03)));
      c.box("white", 3.55, 1.5, 8.8, 5.25, 1.53, 13.0); c.box("white", 3.55, 2.07, 8.8, 5.25, 2.1, 13.0);
      for (let v = 9.2; v < 13; v += 0.9) { c.inst("seat", 3.1, v, 0.62); c.inst("leg", 3.1, v, 0); c.inst("seat", 5.7, v, 0.62); c.inst("leg", 5.7, v, 0); }
      // أجهزة المصطبة الخلفية
      c.dev("spectro", [B(0.62, 0.2, 0.42, M.devWhite), B(0.32, 0.07, 0.3, M.devGrey, -0.12, 0.2, -0.02), B(0.2, 0.15, 0.02, M.devDark, 0.17, 0.03, 0.215)], 1.95, 0.43, 0.88, "+v");
      c.dev("elisa", [B(0.42, 0.16, 0.38, M.devGrey), B(0.3, 0.06, 0.24, M.black, -0.04, 0.16, 0.0), B(0.1, 0.05, 0.02, M.devScreen, 0.13, 0.07, 0.195)], 2.95, 0.43, 0.88, "+v");
      const tubes = []; for (let i = 0; i < 8; i++) tubes.push(C(0.016, 0.34, M.devGlass, -0.16 + (i % 4) * 0.105, 0.14, -0.05 + Math.floor(i / 4) * 0.1, 8));
      c.dev("kjeldahl", [B(0.44, 0.14, 0.32, M.steel), B(0.44, 0.04, 0.3, M.steel, 0, 0.42, 0), B(0.03, 0.32, 0.03, M.steel, -0.2, 0.14, 0.12), B(0.03, 0.32, 0.03, M.steel, 0.2, 0.14, 0.12), ...tubes, B(0.36, 0.78, 0.34, M.devWhite, 0.5, 0, 0), C(0.06, 0.55, M.devGlass, 0.5, 0.12, 0.18, 12), B(0.1, 0.06, 0.02, M.devScreen, 0.6, 0.62, 0.175)], 3.7, 0.43, 0.88, "+v");
      c.dev("tissue", [B(0.42, 0.24, 0.42, M.devWhite), C(0.3, 0.16, M.devDark, 0, 0.24, 0, 24), C(0.32, 0.06, M.devWhite, 0, 0.4, 0, 24, 0.26), B(0.22, 0.12, 0.02, M.devScreen, 0, 0.06, 0.215)], 5.4, 0.43, 0.88, "+v");
      c.dev("embed", [B(0.62, 0.3, 0.4, M.devWhite), B(0.5, 0.02, 0.26, M.steel, 0, 0.3, 0.02), B(0.3, 0.06, 0.02, M.devDark, 0, 0.2, 0.205)], 6.7, 0.43, 0.88, "+v");
      // أجهزة الجدار الخارجي
      c.dev("vitek", [B(0.95, 0.55, 0.5, M.devWhite), mm(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), M.devGrey, -0.18, 0.36, 0.255, Math.PI / 2), mm(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24), M.devGrey, -0.18, 0.13, 0.255, Math.PI / 2), B(0.2, 0.14, 0.02, M.devScreen, 0.25, 0.36, 0.25)], 8.5, 1.4, 0.88, "-u");
      c.dev("turb", [B(0.22, 0.12, 0.18, M.devDark), B(0.12, 0.05, 0.02, M.devScreen, 0, 0.05, 0.095), C(0.025, 0.08, M.devGlass, 0.06, 0.12, -0.03, 10)], 8.55, 2.6, 0.88, "-u");
      c.dev("ph", [B(0.2, 0.07, 0.16, M.devWhite), B(0.1, 0.04, 0.02, M.devScreen, 0, 0.02, 0.085), C(0.008, 0.36, M.steel, -0.08, 0.07, -0.05, 8), B(0.16, 0.012, 0.012, M.steel, -0.02, 0.38, -0.05), C(0.006, 0.18, M.black, 0.04, 0.22, -0.05, 8), C(0.045, 0.08, M.devGlass, 0.04, 0, 0.03, 12)], 8.55, 3.2, 0.88, "-u");
      const jar = [B(1.0, 0.1, 0.32, M.devWhite), B(0.04, 0.55, 0.04, M.steel, -0.46, 0.1, -0.1), B(0.04, 0.55, 0.04, M.steel, 0.46, 0.1, -0.1), B(1.0, 0.12, 0.18, M.devWhite, 0, 0.6, -0.04)];
      for (let i = 0; i < 6; i++) { const x = -0.375 + i * 0.15; jar.push(C(0.055, 0.15, M.devGlass, x, 0.1, 0.04, 12), C(0.05, 0.1, M.water, x, 0.1, 0.04, 12), C(0.004, 0.36, M.steel, x, 0.26, 0.04, 6)); }
      c.dev("jar", jar, 8.5, 4.5, 0.88, "-u");
      c.dev("bath", [B(0.5, 0.24, 0.32, M.steel), B(0.52, 0.02, 0.34, M.steel, 0, 0.24, 0), B(0.16, 0.12, 0.02, M.devBlue, 0.15, 0.06, 0.17)], 8.55, 6.0, 0.88, "-u");
      c.dev("microscope", [B(0.18, 0.04, 0.24, M.black), B(0.06, 0.3, 0.06, M.devWhite, 0, 0.04, -0.08), B(0.14, 0.02, 0.13, M.black, 0, 0.15, 0.02), B(0.08, 0.08, 0.14, M.devWhite, 0, 0.3, -0.03)], 8.55, 7.6, 0.88, "-u");
      c.dev("incubator", [B(0.62, 0.55, 0.5, M.devWhite), B(0.4, 0.3, 0.02, M.devScreen, -0.05, 0.12, 0.255), B(0.62, 0.06, 0.52, M.devGrey, 0, 0.55, 0)], 8.5, 9.4, 0.88, "-u");
      // أجهزة الجزيرة
      c.dev("stirrer", [B(0.22, 0.1, 0.3, M.devWhite), B(0.2, 0.02, 0.2, M.steel, 0, 0.1, -0.03), mm(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), M.devDark, -0.05, 0.05, 0.155, Math.PI / 2), mm(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), M.devDark, 0.05, 0.05, 0.155, Math.PI / 2)], 4.0, 3.4, 0.88, "+v");
      c.dev("multistir", [B(0.75, 0.05, 0.28, M.devBlue), B(0.66, 0.012, 0.22, M.steel, 0, 0.05, 0)], 4.5, 4.8, 0.88, "+u");
      c.dev("overhead", [B(0.25, 0.03, 0.18, M.devDark), C(0.012, 0.62, M.steel, -0.08, 0.03, 0), B(0.13, 0.22, 0.13, M.devWhite, 0.02, 0.48, 0), C(0.005, 0.25, M.steel, 0.02, 0.24, 0)], 4.1, 6.1, 0.88, "+v");
      // أجهزة أرضية بجانب جدار الممر
      c.dev("hood", [B(1.4, 0.85, 0.75, M.devWhite), B(0.05, 1.15, 0.75, M.devWhite, -0.675, 0.85, 0), B(0.05, 1.15, 0.75, M.devWhite, 0.675, 0.85, 0), B(1.4, 1.15, 0.05, M.devWhite, 0, 0.85, -0.35), B(1.3, 0.55, 0.02, M.devGlass, 0, 1.15, 0.36), B(1.4, 0.32, 0.75, M.devWhite, 0, 2.0, 0), B(1.3, 0.03, 0.6, M.lightWarm, 0, 1.97, 0)], 0.45, 6.2, 0, "+u", [0.42, 0.75]);
      incubator(c, "bod", 0.45, 8.3, 0, "+u", 0.66, 1.45);
      c.dev("autoclave", [C(0.24, 0.72, M.devWhite), C(0.25, 0.08, M.steel, 0, 0.72, 0, 20, 0.2), B(0.2, 0.25, 0.06, M.devDark, 0, 0.35, 0.24)], 0.45, 9.6, 0, "+u", [0.3, 0.3]);
      // مكيف عمودي وضاغط هواء
      c.box("white", 8.4, 0, L - 1.1, 8.85, 1.85, L - 0.75, true); for (let h = 1.2; h < 1.75; h += 0.08) c.box("grille", 8.38, h, L - 1.05, 8.4, h + 0.03, L - 0.8);
      c.dev(null, [mm(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 16), M.white, 0, 0.2, 0, 0, 0, Math.PI / 2), B(0.2, 0.18, 0.2, M.devGrey, 0, 0.38, 0)], 7.6, 0.95, 0, "+v", [0.3, 0.2]);
      [[3.0, 4.0], [6.0, 9.5], [3.0, 13.5]].forEach(([u, v]) => { c.inst("fireBall", u, v, CH - 0.62); c.inst("rod", u, v, CH - 0.45); });
      c.box("black", 3.5, 1.5, L - 0.1, 5.0, 2.35, L - 0.05); c.plane(M.tvEnv, 1.44, 0.8, 4.25, L - 0.112, 1.925, "-v");
      return;
    }
    // المكاتب
    c.box("carpet", 1.0, 0.006, 1.0, 8.4, 0.012, L - 1.0);
    if (r.type === "head") {
      c.box("woodDark", 3.4, 0.72, 1.3, 5.8, 0.78, 2.2, true); c.box("woodDark", 3.45, 0, 1.35, 5.75, 0.72, 1.45); c.box("woodDark", 5.7, 0, 1.3, 5.8, 0.72, 2.2); c.box("woodDark", 3.4, 0, 1.3, 3.5, 0.72, 2.2);
      c.box("black", 4.3, 0.78, 1.5, 4.9, 0.8, 1.9); c.box("black", 4.45, 0.8, 1.45, 4.75, 1.15, 1.48);
      c.inst("execI", 4.6, 0.75, 0, "+v"); c.inst("chairV", 4.0, 2.9, 0, "-v"); c.inst("chairV", 5.2, 2.9, 0, "-v");
      c.box("sofa", 8.2, 0, 3.0, 8.9, 0.45, 6.6, true); c.box("sofa", 8.7, 0.45, 3.0, 8.9, 0.9, 6.6); c.box("sofa", 8.2, 0.45, 3.0, 8.9, 0.65, 3.2); c.box("sofa", 8.2, 0.45, 6.4, 8.9, 0.65, 6.6);
      c.box("woodDark", 6.6, 0, 3.8, 7.6, 0.42, 5.8, true);
      c.box("woodDark", 5.8, 0, 0.1, 8.6, 2.2, 0.45, true); for (let h = 0.45; h < 2.2; h += 0.42) c.box("books", 5.9, h, 0.42, 8.5, h + 0.28, 0.44);
      c.inst("potI", 1.0, 1.2, 0); c.inst("leafI", 1.0, 1.65, 0);
    } else if (r.type === "rapp") {
      [[2.6, 2.0], [6.2, 2.0], [6.2, 5.0]].forEach(([u, v]) => { c.box("wood", u - 0.75, 0.72, v - 0.4, u + 0.75, 0.76, v + 0.4, true); c.box("woodDark", u - 0.7, 0, v - 0.35, u - 0.6, 0.72, v + 0.35); c.box("woodDark", u + 0.6, 0, v - 0.35, u + 0.7, 0.72, v + 0.35); c.box("black", u - 0.25, 0.76, v + 0.2, u + 0.25, 1.1, v + 0.23); c.box("black", u - 0.2, 0.76, v - 0.15, u + 0.2, 0.78, v); c.inst("chairV", u, v - 0.75, 0, "+v"); });
      for (let u = 0.6; u < 4.2; u += 0.75) c.box("greyMetal", u, 0, 0.1, u + 0.7, 1.32, 0.68, true);
      c.box("devWhite", 8.2, 0.72, 0.4, 8.8, 1.0, 0.9); c.box("wood", 8.0, 0, 0.3, 8.9, 0.72, 1.0, true);
    } else {
      const n = c.L > 5 ? 3 : 2;
      for (let i = 0; i < n; i++) { const v = 1.2 + i * 2.2; c.box("wood", 6.0, 0.72, v - 0.35, 7.4, 0.76, v + 0.35, true); c.box("woodDark", 6.05, 0, v - 0.3, 6.15, 0.72, v + 0.3); c.box("woodDark", 7.25, 0, v - 0.3, 7.35, 0.72, v + 0.3); c.inst("chairV", 5.5, v, 0, "+u"); c.box("black", 6.9, 0.76, v - 0.2, 6.93, 1.08, v + 0.2); }
      c.box("woodDark", 0.4, 0, 0.1, 2.4, 2.0, 0.42, true); for (let h = 0.4; h < 2.0; h += 0.4) c.box("books", 0.5, h, 0.39, 2.3, h + 0.26, 0.41);
    }
    c.box("white", 2.0, 2.55, L - 0.35, 3.1, 2.85, L - 0.08);
    ceilingLights(c, 3.0, 2.6);
  }

  /* ---------------------------------------------------------------
     الساحة الخارجية: الأرض والأشجار واستراحة الطلبة والمباني المجاورة
  --------------------------------------------------------------- */
  function outdoors() {
    flat("floorGrass", -80, -90, 80, 90, -0.02, 3);
    flat("floorPav", -15, ZF, 15, 37, 0.008, 1.6); flat("floorPav", -26, 23, -15, 33, 0.008, 1.6); flat("floorPav", -12.5, -40, -11, ZF, 0.008, 1.6); flat("floorPav", 11, -40, 12.5, ZF, 0.008, 1.6);
    bx("cream", -15.1, 0, ZF, -14.9, 0.18, 37); bx("cream", 14.9, 0, ZF, 15.1, 0.18, 37);
    // أشجار
    const trees = [[3.4, 23.6, 1.25], [-6.3, 24.2, 1.0], [7.6, 26.5, 1.1], [-9.5, 29.5, 1.15], [12.4, 23.0, 0.95], [-13.2, 21.5, 1.05], [13.8, 31, 1.2], [0.5, 35.5, 1.0], [-4, 41, 1.3], [9, 39, 1.1], [-13.8, 5, 1.0], [13.8, -4, 1.1], [-13.8, -15, 1.2], [13.8, 12, 0.95], [-20, 38, 1.3], [21, 26, 1.2], [-29, 19, 1.1], [25, 40, 1.3]];
    const R = rng(21);
    trees.forEach(([x, z, k]) => {
      addInst("trunkI", x, 0, z, 0, k, k, k); solid(0, x - 0.25, z - 0.25, x + 0.25, z + 0.25);
      for (let i = 0; i < 4; i++) addInst(R() < 0.5 ? "canopyI" : "canopy2I", x + (R() - 0.5) * 1.6 * k, (3.2 + R() * 1.6) * k, z + (R() - 0.5) * 1.6 * k, R() * 6, k * (0.9 + R() * 0.5), k * (0.7 + R() * 0.3), k * (0.9 + R() * 0.5));
    });
    // مصطبة جلوس قرب المدخل
    bx("black", -6.4, 0, 21.4, -6.35, 0.45, 21.9); bx("black", -4.65, 0, 21.4, -4.6, 0.45, 21.9); bx("wood", -6.5, 0.42, 21.35, -4.5, 0.47, 21.95); solid(0, -6.5, 21.35, -4.5, 21.95);
    // استراحة الطلبة
    const gx = -20.5, gz = 28, gw = 4.2, gd = 3.0;
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) { bx("white", gx + sx * gw - 0.06, 0, gz + sz * gd - 0.06, gx + sx * gw + 0.06, 2.6, gz + sz * gd + 0.06); solid(0, gx + sx * gw - 0.1, gz + sz * gd - 0.1, gx + sx * gw + 0.1, gz + sz * gd + 0.1); }
    bx("white", gx - gw - 0.1, 2.55, gz - gd - 0.1, gx + gw + 0.1, 2.7, gz + gd + 0.1);
    [-1, 1].forEach(k => { const rf = new THREE.BoxGeometry(2 * gw + 0.6, 0.06, gd + 0.5); rf.rotateX(k * 0.42); addGeo("white", rf, gx, 3.25, gz + k * (gd / 2 + 0.05)); });
    const gab = new THREE.Shape(); gab.moveTo(-gd - 0.2, 0); gab.lineTo(gd + 0.2, 0); gab.lineTo(0, 1.28); gab.lineTo(-gd - 0.2, 0);
    [-1, 1].forEach(k => { const g2 = new THREE.ShapeGeometry(gab); g2.rotateY(Math.PI / 2); addGeo("whiteDS", g2, gx + k * (gw + 0.05), 2.68, gz); });
    for (const bz of [-1.6, 1.6]) for (const bxx of [-2.4, 0.0, 2.4]) { bx("white", gx + bxx - 0.95, 0, gz + bz - 0.2, gx + bxx + 0.95, 0.42, gz + bz + 0.2); bx("wood", gx + bxx - 0.95, 0.42, gz + bz - 0.22, gx + bxx + 0.95, 0.47, gz + bz + 0.22); }
    bx("black", gx - 1.6, 2.35, gz + gd + 0.07, gx + 1.6, 2.6, gz + gd + 0.15);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.2), basic(0xffffff, { map: ledTex })); led.position.set(gx, 2.475, gz + gd + 0.16); scene.add(led);
    // لافتة زرقاء
    bx("metal", -14.55, 0, 24.45, -14.45, 2.2, 24.55);
    const blue = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), MAT.restSign); blue.position.set(-14.5, 2.4, 24.6); scene.add(blue);
    const blueB = blue.clone(); blueB.rotation.y = Math.PI; blueB.position.z = 24.4; scene.add(blueB);
    // مبانٍ مجاورة في الحرم
    [[-38, -30, -24, 12], [24, -22, 38, 14], [-16, -60, 16, -46], [-40, 30, -28, 48]].forEach(([x0, z0, x1, z1]) => { bx("campus", x0, 0, z0, x1, 7.4, z1); bx("maroon", x0 - 0.1, 7.4, z0 - 0.1, x1 + 0.1, 7.7, z1 + 0.1); solid(0, x0, z0, x1, z1); });
    // حدود المشي
    solid(0, -46, -70, -44, 60); solid(0, 44, -70, 46, 60); solid(0, -46, 58, 46, 60); solid(0, -46, -70, 46, -68);
  }

  /* ---------------------------------------------------------------
     الكائنات المتكررة والخامات النصية
  --------------------------------------------------------------- */
  function instances() {
    const M = MAT;
    defInst("panel", new THREE.PlaneGeometry(0.58, 0.58).rotateX(Math.PI / 2), M.light);
    defInst("down", new THREE.CircleGeometry(0.13, 18).rotateX(Math.PI / 2), M.lightWarm);
    defInst("seat", new THREE.CylinderGeometry(0.17, 0.17, 0.06, 16), M.black);
    defInst("leg", new THREE.CylinderGeometry(0.022, 0.03, 0.62, 8).translate(0, 0.31, 0), M.metal);
    defInst("fireBall", new THREE.SphereGeometry(0.17, 16, 12), M.red, "fireball");
    defInst("rod", new THREE.CylinderGeometry(0.01, 0.01, 0.45, 6).translate(0, 0.22, 0), M.metal);
    defInst("handleI", new THREE.BoxGeometry(0.1, 0.018, 0.02), M.handle);
    defInst("seamI", new THREE.BoxGeometry(0.01, 1, 0.012).translate(0, 0.5, 0), M.seam);
    defInst("handleG", new THREE.BoxGeometry(0.018, 0.14, 0.02), M.gold);
    defInst("binR", new THREE.CylinderGeometry(0.2, 0.17, 0.62, 14).translate(0, 0.31, 0), M.red);
    defInst("binY", new THREE.CylinderGeometry(0.2, 0.17, 0.62, 14).translate(0, 0.31, 0), M.yellow);
    defInst("potI", new THREE.CylinderGeometry(0.16, 0.12, 0.4, 12).translate(0, 0.2, 0), M.pot);
    defInst("leafI", new THREE.IcosahedronGeometry(0.3, 0).scale(0.9, 1.4, 0.9).translate(0, 0.42, 0), M.leaf);
    defInst("extI", new THREE.CylinderGeometry(0.08, 0.08, 0.55, 12).translate(0, 0.27, 0), M.red);
    defInst("trunkI", new THREE.CylinderGeometry(0.16, 0.24, 3.6, 8).translate(0, 1.8, 0), M.trunk);
    defInst("canopyI", new THREE.IcosahedronGeometry(1.5, 1), M.leaf);
    defInst("canopy2I", new THREE.IcosahedronGeometry(1.3, 1), M.leaf2);
    const tap = []; tap.push(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8).translate(0, 0.16, -0.17)); const arc = new THREE.TorusGeometry(0.09, 0.013, 6, 12, Math.PI); arc.rotateY(Math.PI / 2); arc.translate(0, 0.32, -0.08); tap.push(arc);
    defInst("tapI", mergeGeos(tap.map(g => g.toNonIndexed())), M.steel);
    // كرسي طالب بذراع كتابة
    const ch = [new THREE.BoxGeometry(0.46, 0.05, 0.44).translate(0, 0.45, 0), new THREE.BoxGeometry(0.44, 0.38, 0.04).translate(0, 0.68, -0.21), new THREE.BoxGeometry(0.3, 0.025, 0.42).translate(0.26, 0.72, 0.05), new THREE.BoxGeometry(0.03, 0.27, 0.03).translate(0.26, 0.58, -0.05)];
    for (const lx of [-0.2, 0.2]) for (const lz of [-0.19, 0.19]) ch.push(new THREE.BoxGeometry(0.025, 0.45, 0.025).translate(lx, 0.225, lz));
    defInst("chairI", mergeGeos(ch.map(g => g.toNonIndexed())), M.blueChair);
    const cv = [new THREE.BoxGeometry(0.48, 0.07, 0.46).translate(0, 0.46, 0), new THREE.BoxGeometry(0.46, 0.45, 0.06).translate(0, 0.72, -0.21)];
    for (const lx of [-0.2, 0.2]) for (const lz of [-0.19, 0.19]) cv.push(new THREE.BoxGeometry(0.03, 0.46, 0.03).translate(lx, 0.23, lz));
    defInst("chairV", mergeGeos(cv.map(g => g.toNonIndexed())), M.black);
    const ex = [new THREE.BoxGeometry(0.58, 0.1, 0.56).translate(0, 0.5, 0), new THREE.BoxGeometry(0.56, 0.75, 0.08).translate(0, 0.92, -0.25), new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8).translate(0, 0.25, 0), new THREE.CylinderGeometry(0.3, 0.3, 0.04, 5).translate(0, 0.04, 0)];
    defInst("execI", mergeGeos(ex.map(g => g.toNonIndexed())), M.black);
  }
  function drawPoster(kind) {
    return textTex(300, 400, (g, w, h) => {
      g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2f6f4f"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = "#1e4d36"; g.font = `700 28px ${FONT}`;
      if (kind === 0) {
        g.fillText("البناء الضوئي", w / 2, 36);
        g.fillStyle = "#f4c430"; g.beginPath(); g.arc(60, 95, 30, 0, 7); g.fill();
        g.fillStyle = "#4f9a3a"; g.beginPath(); g.ellipse(170, 230, 85, 130, 0.6, 0, 7); g.fill(); g.strokeStyle = "#2f6a25"; g.lineWidth = 4; g.beginPath(); g.moveTo(100, 330); g.lineTo(235, 130); g.stroke();
        g.font = `600 22px ${FONT}`; g.fillStyle = "#333"; g.fillText("CO₂ + H₂O", 80, 360); g.fillText("O₂ + C₆H₁₂O₆", 210, 390);
      } else if (kind === 1) {
        g.fillText("تشريح الفطر", w / 2, 36);
        g.fillStyle = "#c9894b"; g.beginPath(); g.ellipse(150, 140, 110, 60, 0, Math.PI, 0); g.fill(); g.fillStyle = "#e9d2ae"; g.fillRect(132, 140, 36, 170); g.strokeStyle = "#8a5a2b"; g.lineWidth = 2; for (let x = 50; x < 250; x += 10) { g.beginPath(); g.moveTo(x, 140); g.lineTo(150, 152); g.stroke(); }
        g.strokeStyle = "#8a7a5a"; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(150, 310); g.quadraticCurveTo(150 + (i - 6) * 20, 340, 150 + (i - 6) * 25, 370); g.stroke(); }
        g.font = `600 20px ${FONT}`; g.fillStyle = "#333"; g.fillText("القبعة", 245, 95); g.fillText("الساق", 225, 240); g.fillText("الغزل الفطري", 150, 390);
      } else if (kind === 2) {
        g.fillText("الخلية النباتية", w / 2, 36);
        g.fillStyle = "#cfe8b8"; g.strokeStyle = "#3f7a2c"; g.lineWidth = 8; g.beginPath(); g.rect(40, 70, 220, 290); g.fill(); g.stroke();
        g.fillStyle = "#b7d8ef"; g.beginPath(); g.ellipse(150, 210, 70, 100, 0, 0, 7); g.fill();
        g.fillStyle = "#8a5ab0"; g.beginPath(); g.arc(215, 120, 25, 0, 7); g.fill();
        g.fillStyle = "#3f9a3a"; [[80, 120], [90, 300], [220, 300], [225, 210]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 18, 10, 0.5, 0, 7); g.fill(); });
      } else {
        g.fillText("تصنيف الفقريات", w / 2, 36);
        ["الأسماك", "البرمائيات", "الزواحف", "الطيور", "اللبائن"].forEach((t, i) => { g.fillStyle = ["#4f8fb8", "#4f9a3a", "#a08a3a", "#c06a3a", "#8a4f9a"][i]; g.fillRect(40, 80 + i * 60, 220, 46); g.fillStyle = "#fff"; g.font = `600 24px ${FONT}`; g.fillText(t, w / 2, 103 + i * 60); });
      }
    });
  }
  function textures() {
    const M = MAT;
    M.notice = basic(0xffffff, { map: textTex(384, 256, (g, w, h) => { g.fillStyle = "#3d6b47"; g.fillRect(0, 0, w, h); g.strokeStyle = "#1f1f1f"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); [[30, 30, 100, 130], [150, 30, 100, 70], [270, 30, 85, 130], [150, 120, 100, 100], [30, 175, 100, 55]].forEach(([x, y, ww, hh], i) => { g.fillStyle = i === 1 ? "#f3d34a" : "#fbfbf6"; g.fillRect(x, y, ww, hh); g.fillStyle = "#9aa"; for (let k = y + 14; k < y + hh - 6; k += 10) g.fillRect(x + 8, k, ww - 16, 2); }); }) });
    M.exitSign = basic(0xffffff, { map: signTex([{ t: "مخرج ←", s: 54, c: "#fff" }], { w: 320, h: 112, bg: "#1f8a46" }) });
    M.wcSign = basic(0xffffff, { map: signTex([{ t: "دورات المياه", s: 48 }], { w: 512, h: 124 }) });
    M.stairSign = basic(0xffffff, { map: signTex([{ t: "السلّم", s: 52 }], { w: 460, h: 124 }) });
    M.envSign = basic(0xffffff, { map: textTex(760, 220, (g, w, h) => { g.fillStyle = "#2a3a62"; g.beginPath(); g.roundRect ? g.roundRect(6, 6, w - 12, h - 12, 34) : g.rect(6, 6, w - 12, h - 12); g.fill(); g.strokeStyle = "#b9974a"; g.lineWidth = 8; g.stroke(); g.fillStyle = "#dcc489"; g.font = `700 76px ${FONT}`; g.fillText("مختبر البيئة والتلوث", w / 2, 82); g.lineWidth = 9; g.strokeStyle = "#dcc489"; g.beginPath(); g.moveTo(260, 160); g.lineTo(500, 160); g.moveTo(500, 160); g.lineTo(462, 132); g.moveTo(500, 160); g.lineTo(462, 188); g.stroke(); }) });
    M.restSign = basic(0xffffff, { map: signTex([{ t: "استراحة الطلبة", s: 74, b: 700, c: "#fff" }, { t: "كلية التربية للعلوم الصرفة", s: 48, c: "#fff" }], { w: 640, h: 290, bg: "#1f4f9e", border: "#ffffff" }) });
    M.frame1 = basic(0xffffff, { map: signTex([{ t: "جامعة تكريت", s: 60, b: 700, c: "#1d3b2c" }, { t: "كلية التربية للعلوم الصرفة", s: 38, c: "#335" }], { w: 512, h: 384, bg: "#f7f3e8", border: "#7a5a2a" }) });
    M.frame2 = basic(0xffffff, { map: signTex([{ t: "قسم علوم الحياة", s: 58, b: 700, c: "#1d3b2c" }, { t: "تأسس عام ١٩٩٢", s: 40, c: "#553" }], { w: 512, h: 384, bg: "#f7f3e8", border: "#7a5a2a" }) });
    const wbt = [["BOD₅ = (D₁ − D₂) / P", "WQI = Σ qᵢwᵢ / Σ wᵢ"], ["Igeo = log₂(Cₙ / 1.5 Bₙ)", "PLI = (CF₁·CF₂…CFₙ)^(1/n)"], ["SAR = Na / √((Ca+Mg)/2)", "HQ = CDI / RfD"], ["C = C₀ e^(−kt)", "qₑ = qₘKCₑ / (1+KCₑ)"]];
    M.wb = wbt.map(([a, b2]) => basic(0xffffff, { map: textTex(620, 230, (g, w, h) => { g.fillStyle = "#fbfbf9"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f4fa3"; g.font = `600 40px ${FONT}`; g.fillText("التلوث والمعالجة الحيوية", w / 2, 44); g.direction = "ltr"; g.font = `500 40px "IBM Plex Mono",${FONT}`; g.fillStyle = "#14366e"; g.fillText(a, w / 2, 118); g.fillStyle = "#b2332b"; g.fillText(b2, w / 2, 182); }) }));
    M.slide = basic(0xffffff, { map: textTex(640, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#06303a"); gr.addColorStop(1, "#0f4a37"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#93dd8a"; g.beginPath(); g.ellipse(w / 2, 86, 26, 42, 0.5, 0, 7); g.fill(); g.direction = "ltr"; g.fillStyle = "#fff"; g.font = `700 64px ${FONT}`; g.fillText("EcoBio AI", w / 2, 168); g.direction = "rtl"; g.fillStyle = "#bfeaf2"; g.font = `500 32px ${FONT}`; g.fillText("منصة رصد التلوث ومعالجته حيوياً", w / 2, 230); g.fillStyle = "#e6ae4f"; g.font = `500 24px ${FONT}`; g.fillText("قسم علوم الحياة – جامعة تكريت", w / 2, 276); }) });
    M.tvBot = basic(0xffffff, { map: drawPoster(0) });
    M.tvEnv = M.slide;
    M.posters = [0, 1, 2, 3].map(k => basic(0xffffff, { map: drawPoster(k) }));
    M.books = lam(0xffffff, { map: canvasTex(256, 64, (g, w, h) => { const R = rng(31); let x = 0; while (x < w) { const bw = 6 + R() * 12; g.fillStyle = ["#7a2733", "#1f4f9e", "#2f6a3a", "#c9a54a", "#5a3a22", "#e9e2cf"][(R() * 6) | 0]; g.fillRect(x, h * (0.05 + R() * 0.15), bw - 1, h); x += bw; } }, true) });
    ledTex = textTex(2048, 128, (g, w, h) => { g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff3b2f"; g.shadowColor = "#ff2a1a"; g.shadowBlur = 14; g.font = `700 78px ${FONT}`; g.fillText("أهلاً بكم في كلية التربية للعلوم الصرفة – قسم علوم الحياة", w / 2, h / 2 + 4); g.shadowBlur = 0; g.fillStyle = "rgba(0,0,0,.45)"; for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, h); for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2); });
    ledTex.wrapS = THREE.RepeatWrapping; ledTex.repeat.set(0.5, 1);
  }

  /* ---------------------------------------------------------------
     المناطق: لمعرفة مكانك، وللمشي التلقائي، وللخريطة المصغّرة
  --------------------------------------------------------------- */
  function regions() {
    REG.length = 0;
    const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
    [0, 1].forEach(l => REG.push({ id: "c" + l, lvl: l, x0: -CW, z0: -20, x1: CW, z1: ZF, name: l ? "ممر الطابق الأول" : "الممر الرئيسي – الطابق الأرضي", short: "الممر", kind: "corridor", spot: { x: 0, z: l ? -14 : 17, yaw: l ? Math.PI : 0 } }));
    ROOMS.forEach(r => {
      const zd = doorZ(r), ix = rx(r, 1.1), ox = r.side * 0.45;
      REG.push({ id: r.id, lvl: r.lvl, x0: Math.min(r.side * CW, r.side * BW), z0: r.z0, x1: Math.max(r.side * CW, r.side * BW), z1: r.z1, name: r.name, short: r.short, kind: r.type, room: r, portal: [{ x: ox, z: zd }, { x: ix, z: zd }], spot: { x: rx(r, 1.6), z: zd - 0.2, yaw: yawTo(rx(r, 1.6), zd, rx(r, 5), (r.z0 + r.z1) / 2) } });
    });
    [0, 1].forEach(l => REG.push({ id: "s" + l, lvl: l, x0: CW, z0: ZB, x1: BW, z1: -16, name: l ? "السلّم – الطابق الأول" : "السلّم", short: "السلّم", kind: "stair", portal: [{ x: 0.45, z: -18.3 }, { x: 2.6, z: -18.3 }], spot: l ? { x: 3.0, z: -18.6, yaw: Math.PI / 2 } : { x: 2.6, z: -19.4, yaw: yawTo(2.6, -19.4, 6, -22.5) } }));
    REG.push({ id: "wc0", lvl: 0, x0: -BW, z0: ZB, x1: -CW, z1: -16, name: "دورات المياه", short: "", kind: "closed" });
    REG.push({ id: "wc1", lvl: 1, x0: -BW, z0: ZB, x1: -CW, z1: -16, name: "دورات المياه", short: "", kind: "closed" });
    [-1, 1].forEach(s => [0, 1].forEach(l => REG.push({ id: "f" + s + l, lvl: l, x0: Math.min(s * CW, s * BW), z0: 16, x1: Math.max(s * CW, s * BW), z1: ZF, name: "مخزن", short: "", kind: "closed" })));
  }
  const OUTSIDE = { id: "out", lvl: 0, kind: "outside", portal: [{ x: 0, z: 18.6 }, { x: 0, z: 21.6 }], spot: { x: 0, z: 31, yaw: 0 } };
  function regionAt(x, z, lvl) {
    for (const r of REG) if (r.lvl === lvl && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r;
    if (lvl === 0) {
      const gaz = x > -26 && x < -15 && z > 23 && z < 33;
      return Object.assign({}, OUTSIDE, { name: gaz ? "استراحة الطلبة" : (z > ZF && Math.abs(x) < 15 ? "الساحة الأمامية للقسم" : "حرم الكلية") });
    }
    return null;
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
    const a = regionAt(P.x, P.z, P.lvl), b = regionAt(tx, tz, P.lvl);
    if (!b || b.kind === "closed") return null;
    const pts = [];
    if (a && b && a.id !== b.id) {
      if (a.kind !== "corridor" && a.portal) pts.push(a.portal[1], a.portal[0]);
      if (b.kind !== "corridor" && b.portal) pts.push(b.portal[0], b.portal[1]);
    }
    pts.push({ x: tx, z: tz });
    return pts.map(p => ({ x: p.x, z: p.z }));
  }
  function update(dt) {
    if (ledTex) ledTex.offset.x -= dt * 0.06;
    if (anim) { stepAnim(dt); applyCam(); return; }
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
    const right = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x;
    P.yaw += ((keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.ArrowRight || keys.KeyE ? 1 : 0)) * 1.9 * dt;
    let mx = 0, mz = 0;
    const run = keys.ShiftLeft || keys.ShiftRight ? 1.75 : 1;
    if (Math.abs(fwd) > 0.05 || Math.abs(right) > 0.05) {
      walkPath = null; const len = Math.min(1, Math.hypot(fwd, right)), n = Math.hypot(fwd, right) || 1, f = fwd / n, r = right / n, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), sp = 2.5 * run * len;
      mx = (-sy * f + cy * r) * sp; mz = (-cy * f - sy * r) * sp;
    } else if (walkPath) {
      const t = walkPath[0], dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { walkPath.shift(); if (!walkPath.length) { walkPath = null; hideMarker(); } }
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
    applyCam();
  }
  function applyCam() {
    if (P.yaw > Math.PI) P.yaw -= 2 * Math.PI; else if (P.yaw < -Math.PI) P.yaw += 2 * Math.PI;
    cam.position.set(P.x, P.lvl * FH + EYE + (anim ? 0 : Math.sin(P.bob) * 0.022), P.z);
    if (anim && anim.camY != null) cam.position.y = anim.camY;
    cam.rotation.set(P.pitch, P.yaw, 0, "YXZ");
  }

  /* ---------------------------------------------------------------
     الحركات التلقائية: الجولة، صعود ونزول السلّم، الانتقال
  --------------------------------------------------------------- */
  function camState() { return { x: P.x, y: P.lvl * FH + EYE, z: P.z, yaw: P.yaw, pitch: P.pitch }; }
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
        const last = a.frames[a.frames.length - 1]; P.lvl = last.p[1] > FH ? 1 : 0; P.pitch = clamp(P.pitch, -0.5, 0.5);
        const cb = a.onEnd; anim = null; tour = false; U.$("#tour-play").classList.remove("on"); if (!cb || cb !== "keepCap") caption(""); if (typeof cb === "function") cb(); where(true); return;
      }
      if (a.frames[a.i].cap != null) caption(a.frames[a.i].cap);
    }
    P.lvl = (a.camY || 0) > FH + 0.8 ? 1 : 0;
  }
  const E0 = EYE, E1 = FH + EYE;
  function climb() {
    play([{ p: [2.8, E0, -22.5], look: [9, 2.6, -22.5], move: 0.9 }, { p: [9.6, E1, -22.5], look: [12, E1 + 0.2, -22.5], move: 3.4, cap: "تصعد إلى الطابق الأول…" }, { p: [9.9, E1, -20.4], look: [4, E1, -18.6], move: 1.2 }, { p: [3.0, E1, -18.5], look: [-2, E1, -18.4], move: 1.6, cap: "" }]);
  }
  function descend() {
    play([{ p: [9.9, E1, -22.6], look: [3, E1 - 1.6, -22.5], move: 0.8 }, { p: [3.0, E0, -22.5], look: [0, E0 - 0.2, -22.5], move: 3.4, cap: "تنزل إلى الطابق الأرضي…" }, { p: [2.6, E0, -18.4], look: [-3, E0, -18.4], move: 1.4, cap: "" }]);
  }
  function teleport(lvl, x, z, yaw) {
    const f = U.$("#tour-fade"); f.classList.add("on"); walkPath = null; anim = null; hideMarker();
    setTimeout(() => { P.lvl = lvl; P.x = x; P.z = z; P.yaw = yaw; P.pitch = -0.05; collide(); applyCam(); where(true); f.classList.remove("on"); }, 260);
  }
  function startTour() {
    U.$("#tour-intro").hidden = true; closeInfo();
    P.lvl = 0; P.x = 0; P.z = 33; P.yaw = 0; P.pitch = 0.05;
    play([
      { p: [0, E0, 31], look: [0, 4.6, 20], move: 1.2, hold: 4.2, cap: "قسم علوم الحياة – كلية التربية للعلوم الصرفة، جامعة تكريت. تأسس القسم عام ١٩٩٢." },
      { p: [0, E0, 22.6], look: [0, 1.8, 10], move: 3.4, hold: 0.8, cap: "المدخل الرئيسي للقسم" },
      { p: [0, E0, 15.4], look: [0, 1.6, 0], move: 2.6, hold: 2.4, cap: "الطابق الأرضي: مختبرات وقاعات دراسية على اليمين واليسار" },
      { p: [0.4, E0, 14.6], look: [6, 1.4, 14.6], move: 1.1, hold: 0.2, cap: "مختبر الأحياء المجهرية" },
      { p: [3.4, E0, 14.0], look: [9, 1.1, 10.8], move: 2.0, hold: 3.0, cap: "مختبر الأحياء المجهرية: مجاهر وحاضنة وأوتوكلاف للتعقيم" },
      { p: [0.4, E0, 14.6], look: [0, 1.6, 0], move: 2.0, hold: 0 },
      { p: [0.3, E0, -18.3], look: [4, 1.6, -18.3], move: 5.6, hold: 0.3, cap: "إلى الطابق الأول عبر السلّم" },
      { p: [3.0, E0, -18.8], look: [8, 2.6, -22.5], move: 1.4 },
      { p: [2.8, E0, -22.5], look: [9, 3.2, -22.5], move: 1.6 },
      { p: [9.6, E1, -22.5], look: [12, E1, -22.5], move: 3.4 },
      { p: [9.9, E1, -20.2], look: [3, E1, -18.6], move: 1.4 },
      { p: [3.0, E1, -18.4], look: [0, E1, -18.4], move: 1.4 },
      { p: [0.2, E1, -17.6], look: [0, E1, 0], move: 1.6, hold: 2.6, cap: "الطابق الأول: غرفة رئيس القسم والمقررية وغرف التدريسيين" },
      { p: [-0.4, E1, 14.6], look: [-6, E1, 14.6], move: 5.4, hold: 0.6, cap: "مختبر البيئة والتلوث" },
      { p: [-3.4, E1, 14.0], look: [-8.5, FH + 1.2, 6.5], move: 2.2, hold: 3.2, cap: "مختبر البيئة والتلوث: أجهزة تحليل المياه والتربة وتشخيص البكتيريا" },
      { p: [-4.2, E1, 3.0], look: [-3.45, FH + 1.0, 0.43], move: 3.6, hold: 3.6, cap: "اضغط على أي جهاز لتعرف ما يقيسه، ويفتح لك الحاسبة المناسبة في المنصة" }
    ], () => openInfo("spectro"), true);
  }

  /* ---------------------------------------------------------------
     الواجهة: المكان الحالي، الخريطة، بطاقة الجهاز، الإرشادات
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
    if (P.lvl === 0 && P.x > 2.45 && P.x < 3.6 && P.z > -23.6 && P.z < -21.4) climb();
    else if (P.lvl === 1 && P.x > 9.6 && P.z > -23.7 && P.z < -21.8) descend();
  }
  /* الخريطة المصغرة */
  const MAPB = { x0: -12, x1: 12, z0: -25.5, z1: 23.5 };
  function mapXY(cv, x, z) { const sx = cv.width / (MAPB.x1 - MAPB.x0), sz = cv.height / (MAPB.z1 - MAPB.z0); return [(x - MAPB.x0) * sx, (z - MAPB.z0) * sz]; }
  function drawMap() {
    const cv = U.$("#tour-map-c"); if (!cv || cv.offsetParent === null) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = "rgba(3,12,16,.82)"; g.fillRect(0, 0, cv.width, cv.height);
    const col = { corridor: "#25424a", micro: "#2c5d43", botany: "#2c5d43", zoo: "#2c5d43", general: "#2c5d43", env: "#6b5520", class: "#2b4767", head: "#5a2f3a", rapp: "#4a3a5e", staff: "#3a4556", stair: "#4d4d4d", closed: "#1d2427" };
    REG.filter(r => r.lvl === mapFloor).forEach(r => {
      const [a, b] = mapXY(cv, r.x0, r.z0), [c, d] = mapXY(cv, r.x1, r.z1);
      g.fillStyle = col[r.kind] || "#2d3a40"; g.fillRect(a + 1, b + 1, c - a - 2, d - b - 2);
      if (r.short && r.kind !== "corridor") { g.save(); g.fillStyle = "#e9f3f2"; g.font = `600 ${Math.round(9.5 * dpr)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = "rtl"; g.fillText(r.short, (a + c) / 2, (b + d) / 2); g.restore(); }
    });
    // المدخل
    if (mapFloor === 0) { const [ex, ey] = mapXY(cv, 0, ZF); g.fillStyle = "#e6ae4f"; g.fillRect(ex - 6 * dpr, ey - 2 * dpr, 12 * dpr, 4 * dpr); }
    if (P.lvl === mapFloor) {
      let [px, pz] = mapXY(cv, clamp(P.x, MAPB.x0, MAPB.x1), clamp(P.z, MAPB.z0, MAPB.z1));
      g.save(); g.translate(px, pz); g.rotate(-P.yaw); g.fillStyle = "#93dd8a"; g.beginPath(); g.moveTo(0, -9 * dpr); g.lineTo(6 * dpr, 6 * dpr); g.lineTo(0, 3 * dpr); g.lineTo(-6 * dpr, 6 * dpr); g.closePath(); g.fill(); g.restore();
    }
  }
  function mapClick(e) {
    const cv = U.$("#tour-map-c"), rc = cv.getBoundingClientRect();
    const x = MAPB.x0 + (e.clientX - rc.left) / rc.width * (MAPB.x1 - MAPB.x0), z = MAPB.z0 + (e.clientY - rc.top) / rc.height * (MAPB.z1 - MAPB.z0);
    const r = REG.find(q => q.lvl === mapFloor && x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
    if (r && r.spot) teleport(r.lvl, r.spot.x, r.spot.z, r.spot.yaw);
    else if (!r && mapFloor === 0 && z > ZF) teleport(0, OUTSIDE.spot.x, OUTSIDE.spot.z, 0);
  }

  function openInfo(key) {
    const d = DEV[key]; if (!d) return;
    const box = U.$("#tour-info");
    box.innerHTML = `<button class="btn icon-btn btn-ghost tour-info-x" type="button" aria-label="إغلاق"><svg><use href="#i-close"/></svg></button>
      <span class="ti-tag">جهاز مختبري · اضغط على أجهزة أخرى</span><h4>${U.esc(d.name)}</h4><p>${U.esc(d.what)}</p>
      ${d.uses ? `<h5>استخداماته في التلوث والمعالجة</h5><ul>${d.uses.map(x => `<li>${U.esc(x)}</li>`).join("")}</ul>` : ""}
      ${d.steps ? `<h5>طريقة العمل</h5><ol>${d.steps.map(x => `<li>${U.esc(x)}</li>`).join("")}</ol>` : ""}
      ${d.tool ? (d.tool.rs ? `<a class="btn btn-primary btn-sm" href="#research" data-rs="${d.tool.rs}"><svg><use href="#i-book"/></svg>${U.esc(d.tool.label)}</a>` : `<button class="btn btn-primary btn-sm" type="button" id="tour-tool"><svg><use href="#i-calc"/></svg>${U.esc(d.tool.label || "افتح الأداة")}</button>`) : ""}`;
    box.hidden = false;
    box.querySelector(".tour-info-x").onclick = closeInfo;
    const tb = box.querySelector("#tour-tool");
    if (tb) tb.onclick = () => { exitFull(); if (d.tool.calc) ECO.calcOpen(d.tool.calc); else if (d.tool.view) ECO.go(d.tool.view); };
  }
  function closeInfo() { const b = U.$("#tour-info"); if (b) b.hidden = true; }

  /* علامة الهدف على الأرض */
  let marker = null;
  function showMarker(x, y, z) { if (!marker) { marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 28).rotateX(-Math.PI / 2), basic(0x93dd8a, { transparent: true, opacity: 0.85, depthWrite: false })); scene.add(marker); } marker.position.set(x, y + 0.02, z); marker.visible = true; }
  function hideMarker() { if (marker) marker.visible = false; }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(cx, cy) {
    const rc = canvas.getBoundingClientRect(); ndc.set((cx - rc.left) / rc.width * 2 - 1, -(cy - rc.top) / rc.height * 2 + 1);
    ray.setFromCamera(ndc, cam); ray.far = 14;
    const hits = ray.intersectObjects(PICK.concat(FLOORS, BLOCK), true);
    for (const h of hits) {
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
        else if (h && h.floor && Math.abs(h.point.y - P.lvl * FH) < 0.5) { const path = routeTo(h.point.x, h.point.z); if (path) { walkPath = path; stuck = 0; showMarker(h.point.x, P.lvl * FH, h.point.z); closeInfo(); } }
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
    // عصا التحكم للهاتف
    const jz = U.$("#tour-joy"), knob = jz.querySelector("span"); let jid = null, jc = null;
    jz.addEventListener("pointerdown", e => { e.stopPropagation(); jid = e.pointerId; jz.setPointerCapture(jid); const r = jz.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; moveJoy(e); U.$("#tour-intro").hidden = true; if (anim && anim.isTour) { anim = null; tour = false; caption(""); } });
    const moveJoy = e => { if (jid !== e.pointerId) return; let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const d = Math.hypot(dx, dy), m = jc.R * 0.85; if (d > m) { dx *= m / d; dy *= m / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = dy / m; };
    jz.addEventListener("pointermove", moveJoy);
    const jend = () => { jid = null; joy.x = 0; joy.y = 0; knob.style.transform = ""; };
    jz.addEventListener("pointerup", jend); jz.addEventListener("pointercancel", jend);
    // الأزرار
    U.$("#tour-play").onclick = () => { if (anim && anim.isTour) { anim = null; tour = false; caption(""); U.$("#tour-play").classList.remove("on"); } else startTour(); };
    const fit = () => { if (window.innerWidth <= 900 && !stageEl.classList.contains("full")) { const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64; window.scrollTo({ top: stageEl.getBoundingClientRect().top + window.scrollY - hh - 8, behavior: "smooth" }); } };
    U.$("#tour-self").onclick = () => { U.$("#tour-intro").hidden = true; focused = true; fit(); };
    U.$("#tour-start").onclick = () => { fit(); startTour(); };
    U.$("#tour-map-t").onclick = () => { const m = U.$("#tour-map"); m.hidden = !m.hidden; U.$("#tour-map-t").classList.toggle("on", !m.hidden); drawMap(); };
    U.$("#tour-map-c").addEventListener("click", mapClick);
    U.$("#tour-floors").onclick = e => { const b = e.target.closest("button"); if (!b) return; mapFloor = +b.dataset.f; U.$$("#tour-floors button").forEach(x => x.classList.toggle("on", x === b)); drawMap(); };
    U.$("#tour-full").onclick = () => toggleFull();
    U.$("#tour-stairs").onclick = () => { if (P.lvl === 0) { P.x = Math.max(P.x, 2.0); climb(); } else descend(); };
    U.$("#tour-rooms").onclick = e => { const b = e.target.closest("[data-r]"); if (!b) return; const r = REG.find(q => q.id === b.dataset.r); if (!r) return; stageEl.scrollIntoView({ behavior: "smooth", block: "center" }); teleport(r.lvl, r.spot.x, r.spot.z, r.spot.yaw); };
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
    st = ECO.makeStage(canvas, { fov: 68, near: 0.08, far: 260, clear: 0xbfd8e6 });
    if (!st) return;
    const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    st.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    scene = st.scene; cam = st.camera;
    scene.fog = new THREE.Fog(0xcfe0ea, 55, 170);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8f8676, 0.95));
    const sun = new THREE.DirectionalLight(0xfff1d8, 0.62); sun.position.set(30, 60, 45); scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.16));
    const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 24, 14), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5f9ed1"); gr.addColorStop(0.45, "#a9cde6"); gr.addColorStop(0.55, "#dde9ee"); gr.addColorStop(1, "#e9e3d4"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
    scene.add(sky);
    const t0 = performance.now();
    materials(); textures(); instances();
    shell(); ROOMS.forEach(buildRoom); outdoors();
    flushBatches(); flushInst(); regions();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => TEXJOBS.forEach(j => j()));
    ECO._tourBuildMs = Math.round(performance.now() - t0);
    U.$("#tour-joy").hidden = !coarse;
    renderRoomList();
    bindInput();
    st.tick = dt => { update(dt * (ECO.campus.speed || 1)); const now = performance.now(); if (now - whereT > 200) { whereT = now; where(); } };
    applyCam(); where(true);
    built = true;
  }
  function renderRoomList() {
    const grp = l => REG.filter(r => r.lvl === l && r.spot && r.kind !== "closed").sort((a, b) => (a.kind === "corridor" ? -1 : 0) - (b.kind === "corridor" ? -1 : 0));
    U.$("#tour-rooms").innerHTML = [0, 1].map(l => `<div class="panel"><div class="panel-h"><h3>${l ? "الطابق الأول" : "الطابق الأرضي"}</h3></div><div class="tour-list">${grp(l).map(r => `<button type="button" class="tile3d" data-r="${r.id}"><i class="k-${r.kind}"></i><span>${U.esc(r.name)}</span></button>`).join("")}</div></div>`).join("") +
      `<div class="panel"><div class="panel-h"><h3>كيف تتجول</h3></div><ul class="tour-how"><li><b>للالتفات:</b> اسحب بالماوس أو بإصبعك.</li><li><b>للمشي:</b> اضغط على الأرض فتمشي إليها، أو استخدم W A S D والأسهم، أو عصا التحكم على الهاتف.</li><li><b>الأجهزة:</b> اضغط على أي جهاز لتعرف ما يقيسه وتفتح الحاسبة المرتبطة به.</li><li><b>السلّم:</b> امشِ إليه فتصعد تلقائياً، أو اختر الطابق من الخريطة.</li></ul><p class="faint" style="font-size:.74rem;margin-top:8px">المخطط مبني من وصف القسم وصوره المرجعية دون عرض أي صورة أو شخص؛ أسماء القاعات قابلة للتعديل في ملف js/campus3d.js.</p></div>`;
  }

  ECO.views.campus = {
    init() { build(); },
    show() { active = true; if (st) { st.start(); setTimeout(() => { st.resize(); drawMap(); }, 50); } },
    hide() { active = false; Object.keys(keys).forEach(k => (keys[k] = false)); if (st) st.stop(); exitFull(); }
  };
  ECO.campus = { state: () => ({ x: P.x, z: P.z, lvl: P.lvl, yaw: P.yaw, where: lastWhere, anim: !!anim }), teleport, startTour, openInfo, regions: () => REG, rooms: ROOMS, set: o => { walkPath = null; anim = null; hideMarker(); Object.assign(P, o); applyCam(); where(true); }, climb, keys, info: () => st && st.renderer.info.render, speed: 1 };
})();
