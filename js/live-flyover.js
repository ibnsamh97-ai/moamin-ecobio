/* =====================================================================
   EcoBio AI — طيران فوق دجلة (القصة الجامعة لقسم «صلاح الدين الحية»)
   أرض حقيقية ثلاثية الأبعاد من بيجي إلى سامراء والثرثار: التضاريس من
   AWS Terrain Tiles (SRTM وغيرها) مضخّمة 4 مرات، والصورة من Esri World
   Imagery، وفوقها الشعلات التي تراها الأقمار (flares.json) وغبار يجري مع
   ريح تكريت الآن (Open-Meteo). كلما نزلتَ بالصفحة تطير الكاميرا إلى محطة،
   وكل رقم في البطاقات من ملفات المنصة نفسها لا من نص مكتوب باليد.
   بلا WebGL أو على جهاز ضعيف: خريطة مسطحة تطير إلى المحطات نفسها.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  if (!document.getElementById("view-flyover")) return;
  const { ico, esc } = L;
  const B = { w: 42.95, e: 44.10, s: 33.85, n: 35.12 };          // حدود المشهد
  const C0 = { lat: (B.s + B.n) / 2, lon: (B.w + B.e) / 2 };
  const KX = Math.cos(C0.lat * Math.PI / 180) * 111.32, KY = 110.574; // كم لكل درجة
  const EXAG = 4;
  const R = Math.PI / 180;
  const xyz = (lat, lon, h = 0) => [(lon - C0.lon) * KX, h, (C0.lat - lat) * KY];
  const lon2x = (lon, z) => (lon + 180) / 360 * 2 ** z;
  const lat2y = (lat, z) => { const r = lat * R; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z; };
  const proxy = () => (ECO.gemini && ECO.gemini.proxy && ECO.gemini.proxy()) || "";
  const imgLoad = url => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => rej(new Error("IMG")); im.src = url; });
  const VIA = { terr: "direct", esri: "direct" };
  const terrUrl = (z, x, y) => VIA.terr === "proxy" ? `${proxy()}/v1/img/terrarium/${z}/${x}/${y}.png` : `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  const esriUrl = (z, x, y) => VIA.esri === "proxy" ? `${proxy()}/v1/img/esri/World_Imagery/${z}/${y}/${x}` : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

  const S = { st: null, D: {}, steps: [], cur: -1, cam: null, tw: null, H: null, ready: false, flat: false, map: null, wind: null, parts: null, flares: [], obs: null };

  /* ---------- البيانات: كل أرقام البطاقات من ملفات المنصة ---------- */
  async function data() {
    const get = n => L.get(n).catch(() => null);
    const [cl, fl, wc, tle] = await Promise.all([get("climate-tikrit.json"), get("flares.json"), get("water-change.json"), get("tle.json")]);
    S.D = { cl, fl, wc, tle };
    try {
      const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=34.61&longitude=43.68&current=wind_speed_10m,wind_direction_10m,temperature_2m&wind_speed_unit=ms&timezone=Asia%2FBaghdad");
      if (r.ok) { const j = await r.json(); S.wind = j.current; }
    } catch (e) { /* بلا ريح حية: الغبار لا يُرسم */ }
  }

  const DIRS = ["الشمال", "الشمال الشرقي", "الشرق", "الجنوب الشرقي", "الجنوب", "الجنوب الغربي", "الغرب", "الشمال الغربي"];
  function chapters() {
    const { cl, fl, wc, tle } = S.D, K = (fl && fl.kinds) || {};
    const site = f => fl && fl.sites.filter(s => s.in_prov).find(f);
    const ref = site(s => s.kind === "refinery"), ajeel = site(s => /العجيل/.test(s.name || "")) || site(() => true);
    const ct = fl && fl.climatetrace ? fl.climatetrace.assets.find(a => /Baiji Refinery/i.test(a.name)) : null;
    const CONF = { "very low": "منخفضة جداً", low: "منخفضة", medium: "متوسطة", high: "عالية" };
    let clim = null;
    if (cl) { const Y = cl.years, b = Y.filter(r => r.y >= 1961 && r.y <= 1990), mu = U.mean(b.map(r => r.tmean)), last = Y.slice(-10); clim = { d: U.mean(last.map(r => r.tmean)) - mu, d45e: U.mean(Y.filter(r => r.y <= 1969).map(r => r.d45)), d45r: U.mean(last.map(r => r.d45)), y0: Y[0].y, y1: Y[Y.length - 1].y }; }
    const th = wc && wc.regions.find(r => r.id === "tharthar");
    const w = S.wind;
    const wTxt = w && U.isNum(w.wind_speed_10m) ? `الريح في تكريت الآن <b><bdi dir="ltr">${U.fmt(w.wind_speed_10m, 1)} m/s</bdi></b> من ${DIRS[Math.round(((w.wind_direction_10m % 360) + 360) % 360 / 45) % 8]}، والحرارة <b><bdi dir="ltr">${U.fmt(w.temperature_2m, 0)} °C</bdi></b>؛ الغبار الذي تراه في المشهد يجري معها.` : "";
    return [
      { lat: 34.52, lon: 43.6, dist: 120, head: 335, pitch: 40, tag: "صلاح الدين الحية",
        h: "رحلة فوق دجلة", p: `من بيجي إلى سامراء والثرثار: أرض حقيقية بارتفاعاتها (مضخّمة 4 مرات) وصور الأقمار، وكل رقم ستقرؤه محسوب من بيانات المنصة. انزل ببطء.`, links: [] },
      { lat: 35.01, lon: 43.5, dist: 15, head: 300, pitch: 34, tag: "المحطة 1 · بيجي",
        h: "مجمع مصافي بيجي",
        p: `${ref ? `رأت أقمار MODIS ناراً حول المصفى <b>${ref.days}</b> يوماً في السنة الأخيرة. ` : ""}${ct ? `ويقدّر Climate TRACE انبعاثه بنحو <b><bdi dir="ltr">${U.fmt(ct.co2e_t / 1000, 0)}</bdi> ألف طن</b> CO₂ مكافئ سنوياً، بثقة ${CONF[ct.conf] || "غير معروفة"} في التقدير.` : ""}`, links: [["flares", "مصادر التلوث من الفضاء"]] },
      { lat: 34.9, lon: 43.81, dist: 17, head: 25, pitch: 32, tag: "المحطة 2 · شرق دجلة",
        h: ajeel ? esc(ajeel.name || "حقل نفطي") : "حقل العجيل النفطي",
        p: ajeel ? `أكثر مكان مشتعل في المحافظة: رأت الأقمار فيه ناراً <b>${ajeel.days}</b> يوماً من 365 (آخرها ${L.dayY(ajeel.last)}). هذه شعلات حرق الغاز المصاحب للنفط، ودخانها يحمل ثاني أكسيد النتروجين والسخام.` : "", links: [["flares", "كل المواقع المشتعلة"], ["sats", "متى يمر Terra وAqua؟"]] },
      { lat: 34.61, lon: 43.68, dist: 13, head: 330, pitch: 30, tag: "المحطة 3 · تكريت",
        h: "تكريت أحرّ مما كانت",
        p: `${clim ? `آخر 10 سنوات أحرّ من معدل 1961–1990 بـ <b><bdi dir="ltr">+${U.fmt(clim.d, 1)} °C</bdi></b>، وأيام الـ 45 درجة صارت <b>${U.fmt(clim.d45r, 0)}</b> يوماً في السنة بعد أن كانت <b>${U.fmt(clim.d45e, 0)}</b> (ERA5، ${clim.y0}–${clim.y1}). ` : ""}${wTxt}`, links: [["stripes", "خطوط حرارة تكريت"], ["wind", "الريح والغبار الآن"]] },
      { lat: 34.08, lon: 43.5, dist: 70, head: 245, pitch: 30, tag: "المحطة 4 · سامراء والثرثار",
        h: "الماء يتراجع",
        p: `${th ? `في محيط بحيرة الثرثار ضاع <b><bdi dir="ltr">${U.fmt(th.lost_km2, 0)} km²</bdi></b> من الماء بين 1984 و2021، و<b><bdi dir="ltr">${U.fmt(th.perm_to_seasonal_km2, 0)} km²</bdi></b> كان ماءً دائماً فصار يجفّ جزءاً من السنة (JRC). ` : ""}وسجّلت ناسا في تشرين الأول 2025 أدنى منسوب للبحيرة منذ إنشائها سنة 1958.`, links: [["swipe", "شاهد الفرق بعينك"], ["waterloss", "وين راح الماي؟"]] },
      { lat: 34.5, lon: 43.55, dist: 190, head: 0, pitch: 70, tag: "المحطة الأخيرة · من الفضاء",
        h: "الأقمار تراقب الآن",
        p: `${tle ? `<b>${tle.sats.length}</b> أقمار لرصد الأرض تأخذ منها المنصة بياناتها تدور الآن فوق هذه الأرض. ` : ""}تابعها في مواقعها الحقيقية، واعرف متى يصوّر كل منها تكريت في المرة القادمة.`, links: [["sats", "الأقمار فوق راسك"], ["live", "كل أدوات صلاح الدين الحية"]] }
    ];
  }

  /* ---------- الأرض ثلاثية الأبعاد ---------- */
  async function terrain(prog) {
    const z = 10, x0 = Math.floor(lon2x(B.w, z)), x1 = Math.floor(lon2x(B.e, z)), y0 = Math.floor(lat2y(B.n, z)), y1 = Math.floor(lat2y(B.s, z));
    const tile = async (x, y) => {
      const im = await imgLoad(terrUrl(z, x, y)).catch(async () => { if (VIA.terr === "direct" && proxy()) { VIA.terr = "proxy"; return imgLoad(terrUrl(z, x, y)); } throw new Error("terr"); });
      const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, 256, 256).data, h = new Float32Array(65536);
      for (let i = 0; i < 65536; i++) h[i] = Math.max(0, d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768);
      return h;
    };
    const T = {}; let n = 0; const tot = (x1 - x0 + 1) * (y1 - y0 + 1);
    await Promise.all([].concat(...Array.from({ length: x1 - x0 + 1 }, (_, i) => Array.from({ length: y1 - y0 + 1 }, (_, j) => tile(x0 + i, y0 + j).then(h => { T[(x0 + i) + "," + (y0 + j)] = h; prog(++n / tot * 0.4); }).catch(() => { prog(++n / tot * 0.4); })))));
    return (lat, lon) => {
      const fx = lon2x(lon, z), fy = lat2y(lat, z), tx = Math.floor(fx), ty = Math.floor(fy), h = T[tx + "," + ty];
      if (!h) return 0;
      const px = U.clamp((fx - tx) * 256 - 0.5, 0, 254.999), py = U.clamp((fy - ty) * 256 - 0.5, 0, 254.999), ix = Math.floor(px), iy = Math.floor(py), dx = px - ix, dy = py - iy;
      const a = h[iy * 256 + ix], b = h[iy * 256 + ix + 1], c = h[(iy + 1) * 256 + ix], d = h[(iy + 1) * 256 + ix + 1];
      return (a * (1 - dx) + b * dx) * (1 - dy) + (c * (1 - dx) + d * dx) * dy;
    };
  }
  async function imagery(z, prog) {
    const x0 = Math.floor(lon2x(B.w, z)), x1 = Math.floor(lon2x(B.e, z)), y0 = Math.floor(lat2y(B.n, z)), y1 = Math.floor(lat2y(B.s, z));
    const c = document.createElement("canvas"); c.width = (x1 - x0 + 1) * 256; c.height = (y1 - y0 + 1) * 256;
    const g = c.getContext("2d"); g.fillStyle = "#6b6250"; g.fillRect(0, 0, c.width, c.height);
    let n = 0; const tot = (x1 - x0 + 1) * (y1 - y0 + 1);
    const one = (x, y) => imgLoad(esriUrl(z, x, y)).catch(async () => { if (VIA.esri === "direct" && proxy()) { VIA.esri = "proxy"; return imgLoad(esriUrl(z, x, y)); } return null; })
      .then(im => { if (im) g.drawImage(im, (x - x0) * 256, (y - y0) * 256); prog(0.4 + ++n / tot * 0.55); });
    const jobs = []; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push([x, y]);
    for (let i = 0; i < jobs.length; i += 12) await Promise.all(jobs.slice(i, i + 12).map(([x, y]) => one(x, y)));
    return { canvas: c, z, x0, y0, nx: x1 - x0 + 1, ny: y1 - y0 + 1 };
  }

  /* نقطة دائرية ناعمة للجسيمات */
  let DOT = null;
  function dot() {
    if (DOT) return DOT;
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.85)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return (DOT = new THREE.CanvasTexture(c));
  }
  function label(text, size = 1) {
    const c = document.createElement("canvas"), g = c.getContext("2d"), f = 44;
    g.font = `600 ${f}px "Readex Pro", "IBM Plex Sans Arabic", Tahoma, sans-serif`;
    const w = Math.ceil(g.measureText(text).width) + 40; c.width = w; c.height = 72;
    g.font = `600 ${f}px "Readex Pro", "IBM Plex Sans Arabic", Tahoma, sans-serif`; g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(5,17,22,.72)"; g.beginPath(); if (g.roundRect) g.roundRect(0, 6, w, 60, 30); else g.rect(0, 6, w, 60); g.fill();
    g.fillStyle = "#fff"; g.fillText(text, w / 2, 37);
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
    // حجم ثابت على الشاشة مهما اقتربت الكاميرا
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false }));
    const k = (innerWidth < 760 ? 0.05 : 0.04) * size; sp.scale.set(w / 72 * k, k, 1); sp.renderOrder = 10;
    return sp;
  }

  async function build3D() {
    const cv = U.$("#fo-cv");
    const st = S.st = ECO.makeStage(cv, { fov: 45, near: 0.5, far: 2000, clear: 0x0b1a22 });
    if (!st) throw new Error("webgl");
    const prog = f => { const b = U.$("#fo-prog"); if (b) b.style.transform = `scaleX(${U.clamp(f, 0, 1)})`; };
    const small = innerWidth < 760 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const H = S.H = await terrain(prog);
    const img = await imagery(small ? 10 : 11, prog);
    const scene = st.scene;
    scene.fog = new THREE.Fog(0x0b1a22, 160, 420);
    scene.add(new THREE.HemisphereLight(0xdfefff, 0x2a2018, 0.9));
    const sun = new THREE.DirectionalLight(0xfff1dc, 0.9); sun.position.set(-60, 80, 40); scene.add(sun);
    // الشبكة
    const NX = small ? 150 : 230, NY = small ? 170 : 270;
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(NX * NY * 3), uv = new Float32Array(NX * NY * 2), idx = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const lat = B.n - (B.n - B.s) * j / (NY - 1), lon = B.w + (B.e - B.w) * i / (NX - 1), k = j * NX + i;
      const [x, , z] = xyz(lat, lon); pos[k * 3] = x; pos[k * 3 + 1] = H(lat, lon) / 1000 * EXAG; pos[k * 3 + 2] = z;
      uv[k * 2] = (lon2x(lon, img.z) - img.x0) / img.nx; uv[k * 2 + 1] = (lat2y(lat, img.z) - img.y0) / img.ny;
    }
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.push(a, c, b, b, c, d); }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(img.canvas); tex.flipY = false; tex.anisotropy = Math.min(8, st.renderer.capabilities.getMaxAnisotropy());
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex })));
    // الأسماء
    const at = (lat, lon, up) => { const [x, , z] = xyz(lat, lon); return new THREE.Vector3(x, H(lat, lon) / 1000 * EXAG + up, z); };
    [["بيجي", 34.931, 43.487], ["تكريت", 34.607, 43.678], ["الدور", 34.458, 43.798], ["سامراء", 34.196, 43.886], ["بحيرة الثرثار", 33.98, 43.2, 1.3], ["مصفى بيجي", 35.009, 43.502, 0.8]]
      .forEach(([n, a, o, s]) => { const sp = label(n, s || 1); sp.position.copy(at(a, o, 2.6)); scene.add(sp); });
    // الشعلات: جسيمات نار ترتفع، عددها وارتفاعها بعدد أيام الاشتعال
    const fl = S.D.fl ? S.D.fl.sites.filter(s => s.lat > B.s && s.lat < B.n && s.lon > B.w && s.lon < B.e) : [];
    if (fl.length) {
      const P = [], seed = [];
      fl.forEach(s => { const base = at(s.lat, s.lon, 0), n = Math.round(30 + 90 * s.days / 365), hgt = 1 + 4 * s.days / 365; for (let i = 0; i < n; i++) { P.push(base.x, base.y, base.z); seed.push(Math.random(), hgt, base.x, base.y, base.z); } if (s.days > 100 && s.name && s.kind !== "refinery") { const sp = label(s.name, 0.75); sp.position.copy(at(s.lat, s.lon, hgt + 2.2)); scene.add(sp); } });
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P), 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xff5a1f, size: 0.7, map: dot(), transparent: true, opacity: 0.95, depthWrite: false }));
      scene.add(pts); S.flares = { pts, seed };
    }
    // الغبار مع الريح الحالية
    if (S.wind && U.isNum(S.wind.wind_speed_10m)) {
      const n = small ? 900 : 2200, P = new Float32Array(n * 3), W = (B.e - B.w) * KX, Dd = (B.n - B.s) * KY;
      for (let i = 0; i < n; i++) { P[i * 3] = (Math.random() - 0.5) * W; P[i * 3 + 1] = 0.6 + Math.random() * 5; P[i * 3 + 2] = (Math.random() - 0.5) * Dd; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3));
      const r = S.wind.wind_direction_10m * R, s = S.wind.wind_speed_10m;
      S.parts = { pts: new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8d2a6, size: 0.45, map: dot(), transparent: true, opacity: 0.5, depthWrite: false })), u: -s * Math.sin(r), v: -s * Math.cos(r), W, D: Dd };
      scene.add(S.parts.pts);
    }
    S.cam = { tgt: new THREE.Vector3(), dist: 120, head: 335, pitch: 40, drift: 0 };
    st.tick = tick;
    S.ready = true;
  }

  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function pose(c) { const [x, , z] = xyz(c.lat, c.lon); return { tgt: new THREE.Vector3(x, S.H(c.lat, c.lon) / 1000 * EXAG, z), dist: c.dist, head: c.head, pitch: c.pitch }; }
  function flyTo(i) {
    if (S.cur === i) return; S.cur = i;
    U.$$(".fo-step").forEach(s => s.classList.toggle("on", +s.dataset.i === i));
    const c = S.steps[i];
    if (S.flat) { if (S.map) S.map.flyTo([c.lat, c.lon], Math.round(U.clamp(13.6 - Math.log2(c.dist / 6), 7, 13)), { duration: U.reduced ? 0 : 2.2 }); return; }
    if (!S.ready) return;
    const to = pose(c), from = { tgt: S.cam.tgt.clone(), dist: S.cam.dist, head: S.cam.head + S.cam.drift, pitch: S.cam.pitch };
    S.cam.drift = 0;
    let dh = ((to.head - from.head) % 360 + 540) % 360 - 180;
    S.tw = { from, to, dh, t: 0, t0: performance.now(), dur: U.reduced ? 0.001 : 2.8 };
  }
  function tick(dt, t) {
    const c = S.cam;
    if (S.tw) {
      const w = S.tw; w.t = Math.max(w.t, Math.min(1, (performance.now() - w.t0) / 1000 / w.dur)); const e = ease(w.t); // بالوقت الفعلي لا بعدد الإطارات
      c.tgt.lerpVectors(w.from.tgt, w.to.tgt, e); c.dist = w.from.dist + (w.to.dist - w.from.dist) * e; c.pitch = w.from.pitch + (w.to.pitch - w.from.pitch) * e; c.head = w.from.head + w.dh * e;
      // قفزة قوس: ترتفع الكاميرا في منتصف الطريق بين محطتين بعيدتين
      c.arc = Math.sin(Math.PI * e) * Math.min(60, w.from.tgt.distanceTo(w.to.tgt) * 0.5);
      if (w.t >= 1) S.tw = null;
    } else { c.arc = 0; if (!U.reduced) c.drift += dt * 1.6; }
    const h = (c.head + c.drift) * R, p = c.pitch * R, d = c.dist + (c.arc || 0);
    const cam = S.st.camera;
    cam.position.set(c.tgt.x - Math.sin(h) * Math.cos(p) * d, c.tgt.y + Math.sin(p) * d, c.tgt.z + Math.cos(h) * Math.cos(p) * d);
    cam.lookAt(c.tgt);
    if (S.flares && S.flares.pts && !U.reduced) {
      const a = S.flares.pts.geometry.attributes.position.array, sd = S.flares.seed;
      for (let i = 0, k = 0; i < a.length; i += 3, k += 5) {
        let ph = (sd[k] + t * (0.35 + sd[k] * 0.3)) % 1;
        a[i] = sd[k + 2] + Math.sin(t * 3 + k) * 0.12 * ph; a[i + 1] = sd[k + 3] + ph * sd[k + 1]; a[i + 2] = sd[k + 4] + Math.cos(t * 2.3 + k) * 0.12 * ph;
      }
      S.flares.pts.geometry.attributes.position.needsUpdate = true;
    }
    if (S.parts && !U.reduced) {
      const P = S.parts, a = P.pts.geometry.attributes.position.array, k = dt * 0.35; // م/ث → كم مرئية (مسرّعة للعرض)
      for (let i = 0; i < a.length; i += 3) {
        a[i] += P.u * k; a[i + 2] -= P.v * k;
        if (a[i] > P.W / 2) a[i] -= P.W; else if (a[i] < -P.W / 2) a[i] += P.W;
        if (a[i + 2] > P.D / 2) a[i + 2] -= P.D; else if (a[i + 2] < -P.D / 2) a[i + 2] += P.D;
      }
      P.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ---------- البديل المسطح ---------- */
  function build2D() {
    S.flat = true;
    U.$("#fo-cv").hidden = true; U.$("#fo-map").hidden = false;
    const m = S.map = window.L.map("fo-map", { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false, keyboard: false }).setView([34.5, 43.6], 8);
    window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Esri World Imagery" }).addTo(m);
    if (U.labelLayers) U.labelLayers().addTo(m);
    (S.D.fl ? S.D.fl.sites : []).forEach(s => window.L.circleMarker([s.lat, s.lon], { radius: 4 + 12 * Math.sqrt(s.days / 365), color: "#ffd27a", weight: 1, fillColor: "#ff5a2e", fillOpacity: 0.75, interactive: false }).addTo(m));
  }

  function render() {
    const box = U.$("#fo-root");
    S.steps = chapters();
    box.innerHTML = `
      <div class="fo-wrap">
        <div class="fo-stage">
          <canvas id="fo-cv" aria-label="مشهد ثلاثي الأبعاد لدجلة من بيجي إلى سامراء"></canvas>
          <div id="fo-map" class="fo-map" hidden></div>
          <div class="fo-load" id="fo-load"><b>جارٍ بناء الأرض ثلاثية الأبعاد…</b><div class="db-prog"><i id="fo-prog"></i></div><small>تضاريس حقيقية وصور أقمار لمساحة ${U.fmt((B.e - B.w) * KX, 0)} × ${U.fmt((B.n - B.s) * KY, 0)} كم</small></div>
          <div class="fo-dots" aria-hidden="true">${S.steps.map((_, i) => `<i data-i="${i}"></i>`).join("")}</div>
          <p class="fo-credit">التضاريس: AWS Terrain Tiles (×${EXAG}) · الصور: Esri World Imagery · الشعلات: NASA MODIS</p>
        </div>
        <div class="fo-steps">${S.steps.map((c, i) => `
          <section class="fo-step" data-i="${i}"><div class="fo-card">
            <small class="fo-tag">${esc(c.tag)}</small><h3>${c.h}</h3><p>${c.p}</p>
            ${c.links.length ? `<div class="fo-links">${c.links.map(([h, t]) => `<a class="btn btn-sm" href="#${h}">${ico("i-chev")}${esc(t)}</a>`).join("")}</div>` : ""}
            ${i === 0 ? `<span class="fo-hint">${ico("i-chevd")}انزل</span>` : ""}
          </div></section>`).join("")}
        </div>
      </div>`;
    S.obs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { flyTo(+e.target.dataset.i); U.$$(".fo-dots i").forEach(d => d.classList.toggle("on", +d.dataset.i === +e.target.dataset.i)); } }); }, { rootMargin: "-48% 0px -48% 0px" });
    U.$$(".fo-step").forEach(s => S.obs.observe(s));
  }

  let started = false;
  async function start() {
    if (started) return; started = true;
    const box = U.$("#fo-root");
    box.innerHTML = `<div class="panel lv-load"><span class="spinner"></span>جارٍ تحضير الرحلة…</div>`;
    await data();
    render();
    const gl = (() => { try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } })();
    const weak = (navigator.deviceMemory && navigator.deviceMemory < 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 3);
    try {
      if (!gl || weak || !window.THREE) throw new Error("2d");
      await build3D();
      S.st.start();
    } catch (e) { if (e && e.message !== "2d") console.warn("flyover 3D:", e); if (S.st) S.st.stop(); build2D(); }
    U.$("#fo-load").hidden = true;
    const i = S.cur < 0 ? 0 : S.cur; S.cur = -1; flyTo(i);
    if (!S.flat && S.tw) S.tw.t = 1; // أول محطة دون طيران
  }
  ECO.views.flyover = {
    init: start,
    show() { if (S.st && S.ready) S.st.start(); if (S.map) setTimeout(() => S.map.invalidateSize(), 60); },
    hide() { if (S.st) S.st.stop(); }
  };
})();
