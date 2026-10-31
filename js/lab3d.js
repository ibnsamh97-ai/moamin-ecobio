/* =====================================================================
   EcoBio AI — المختبر الافتراضي ثلاثي الأبعاد: المحرك
   مختبر واحد ثلاثي الأبعاد، ومكتبة زجاجيات وأجهزة، ومحرك خطوات بأسلوب
   «اختر الأداة من الصينية ثم شاهد تنفيذها»، مع دفتر مختبر ورسم ونتائج.
   التجارب في js/labexp.js، ونتائجها الحقيقية ومصادرها في js/data-lab.js.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const LAB = ECO.LAB = { EXPS: [] };
  LAB.reg = e => LAB.EXPS.push(e);

  const ICONS = {
    pipette: "<path d=\"m2 22 1-1h3l9-9\"></path><path d=\"M3 21v-3l9-9\"></path><path d=\"m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z\"></path>",
    tube: "<path d=\"M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5c-1.4 0-2.5-1.1-2.5-2.5V2\"></path><path d=\"M8.5 2h7\"></path><path d=\"M14.5 16h-5\"></path>",
    flask: "<path d=\"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2\"></path><path d=\"M8.5 2h7\"></path><path d=\"M7 16h10\"></path>",
    rflask: "<path d=\"M10 2v7.31\"></path><path d=\"M14 9.3V1.99\"></path><path d=\"M8.5 2h7\"></path><path d=\"M14 9.3a6.5 6.5 0 1 1-4 0\"></path><path d=\"M5.52 16h12.96\"></path>",
    beaker: "<path d=\"M4.5 3h15\"></path><path d=\"M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3\"></path><path d=\"M6 14h12\"></path>",
    thermo: "<path d=\"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z\"></path>",
    scale: "<path d=\"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"></path><path d=\"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"></path><path d=\"M7 21h10\"></path><path d=\"M12 3v18\"></path><path d=\"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\"></path>",
    scissors: "<circle cx=\"6\" cy=\"6\" r=\"3\"></circle><path d=\"M8.12 8.12 12 12\"></path><path d=\"M20 4 8.12 15.88\"></path><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><path d=\"M14.8 14.8 20 20\"></path>",
    timer: "<line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\"></line><line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\"></line><circle cx=\"12\" cy=\"14\" r=\"8\"></circle>",
    drop: "<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\"></path>",
    drops: "<path d=\"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z\"></path><path d=\"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97\"></path>",
    flame: "<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\"></path>",
    filter: "<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\"></polygon>",
    wind: "<path d=\"M12.8 19.6A2 2 0 1 0 14 16H2\"></path><path d=\"M17.5 8a2.5 2.5 0 1 1 2 4H2\"></path><path d=\"M9.8 4.4A2 2 0 1 1 11 8H2\"></path>",
    gauge: "<path d=\"m12 14 4-4\"></path><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"></path>",
    monitor: "<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"></rect><line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"></line><line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\"></line>",
    fan: "<path d=\"M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z\"></path><path d=\"M12 12v.01\"></path>",
    oven: "<rect width=\"20\" height=\"15\" x=\"2\" y=\"4\" rx=\"2\"></rect><rect width=\"8\" height=\"7\" x=\"6\" y=\"8\" rx=\"1\"></rect><path d=\"M18 8v7\"></path><path d=\"M6 19v2\"></path><path d=\"M18 19v2\"></path>",
    leaf: "<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\"></path><path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\"></path>",
    waves: "<path d=\"M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\"></path><path d=\"M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\"></path><path d=\"M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\"></path>",
    disc: "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M6 12c0-1.7.7-3.2 1.8-4.2\"></path><circle cx=\"12\" cy=\"12\" r=\"2\"></circle><path d=\"M18 12c0 1.7-.7 3.2-1.8 4.2\"></path>",
    box: "<path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\"></path><path d=\"m3.3 7 8.7 5 8.7-5\"></path><path d=\"M12 22V12\"></path>",
    sprout: "<path d=\"M7 20h10\"></path><path d=\"M10 20c5.5-2.5.8-6.4 3-10\"></path><path d=\"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z\"></path><path d=\"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z\"></path>",
    milk: "<path d=\"M8 2h8\"></path><path d=\"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2\"></path><path d=\"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0\"></path>",
    syringe: "<path d=\"m18 2 4 4\"></path><path d=\"m17 7 3-3\"></path><path d=\"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5\"></path><path d=\"m9 11 4 4\"></path><path d=\"m5 19-3 3\"></path><path d=\"m14 4 6 6\"></path>",
    atom: "<circle cx=\"12\" cy=\"12\" r=\"1\"></circle><path d=\"M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z\"></path><path d=\"M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z\"></path>",
    zap: "<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"></path>",
    rotate: "<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\"></path><path d=\"M21 3v5h-5\"></path>",
    fridge: "<path d=\"M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z\"></path><path d=\"M5 10h14\"></path><path d=\"M15 7v6\"></path>",
    pot: "<path d=\"M2 12h20\"></path><path d=\"M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8\"></path><path d=\"m4 8 16-4\"></path><path d=\"m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8\"></path>",
    clock: "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline>",
    play: "<polygon points=\"6 3 20 12 6 21 6 3\"></polygon>",
    reset: "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"></path><path d=\"M3 3v5h5\"></path>",
    note: "<path d=\"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4\"></path><path d=\"M2 6h4\"></path><path d=\"M2 10h4\"></path><path d=\"M2 14h4\"></path><path d=\"M2 18h4\"></path><path d=\"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\"></path>",
    chart: "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"></path><path d=\"m19 9-5 5-4-4-3 3\"></path>",
    lamp: "<path d=\"M8 2h8l4 10H4L8 2Z\"></path><path d=\"M12 12v6\"></path><path d=\"M8 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H8Z\"></path>",
    cyl: "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"></ellipse><path d=\"M3 5v14a9 3 0 0 0 18 0V5\"></path>",
    palm: "<path d=\"M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4\"></path><path d=\"M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3\"></path><path d=\"M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35\"></path><path d=\"M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14\"></path>",
    sliders: "<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\"></line><line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\"></line><line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\"></line><line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\"></line><line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\"></line><line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\"></line><line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\"></line><line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\"></line><line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\"></line>",
    check: "<path d=\"M20 6 9 17l-5-5\"></path>",
    x: "<path d=\"M18 6 6 18\"></path><path d=\"m6 6 12 12\"></path>",
    info: "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M12 16v-4\"></path><path d=\"M12 8h.01\"></path>",
    left: "<path d=\"m12 19-7-7 7-7\"></path><path d=\"M19 12H5\"></path>",
    book: "<path d=\"M12 7v14\"></path><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"></path>",
    file: "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"></path><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"></path><path d=\"M10 9H8\"></path><path d=\"M16 13H8\"></path><path d=\"M16 17H8\"></path>",
    spark: "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\"></path><path d=\"M20 3v4\"></path><path d=\"M22 5h-4\"></path><path d=\"M4 17v2\"></path><path d=\"M5 18H3\"></path>",
    hour: "<path d=\"M5 22h14\"></path><path d=\"M5 2h14\"></path><path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\"></path><path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"></path>",
    target: "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><circle cx=\"12\" cy=\"12\" r=\"6\"></circle><circle cx=\"12\" cy=\"12\" r=\"2\"></circle>",
    eye: "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle>",
    factory: "<path d=\"M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z\"></path><path d=\"M17 18h1\"></path><path d=\"M12 18h1\"></path><path d=\"M7 18h1\"></path>",
    hand: "<path d=\"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2\"></path><path d=\"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2\"></path><path d=\"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8\"></path><path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\"></path>"
  };
  const ic = (n, cls = "") => `<svg class="lb-i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.flask}</svg>`;
  LAB.ic = ic;
  /* رقم مع وحدته داخل نص عربي دون أن تنقلب الأرقام */
  const num = (v, unit = "", d) => {
    const t = typeof v === "number" ? U.fmt(v, d ?? "auto") : v;
    if (unit && /[\u0600-\u06FF]/.test(unit) && unit[0] !== "°") return `<bdi class="num" dir="ltr">${t}</bdi> ${unit}`;
    return `<bdi class="num" dir="ltr">${t}${unit ? (unit[0] === "°" || unit === "%" ? "" : " ") + unit : ""}</bdi>`;
  };
  LAB.num = num;

  /* ------------------------------------------------------------------
     الحركة: كل حركة وعدٌ ينتهي بانتهائها، ويتأثر بسرعة الوقت ×1 ×2 ×4
  ------------------------------------------------------------------ */
  class Cancel extends Error { constructor() { super("cancelled"); this.cancel = true; } }
  const RF = U.reduced ? 0.15 : 1;
  const EASE = {
    io: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    lin: t => t, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t,
    back: t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  };
  const anims = new Set(), loops = new Set();
  let speed = 1;
  function anim(dur, fn, ease = EASE.io) {
    const p = new Promise((res, rej) => anims.add({ t: 0, d: Math.max(1e-3, dur * RF * (IA.autoAll ? 0.45 : 1)), fn, ease, res, rej }));
    p.catch(() => {});
    return p;
  }
  const sleep = s => anim(s, () => {});
  function tickAnims(dt) {
    const sdt = dt * speed;
    for (const f of loops) { try { f(sdt, dt); } catch (e) { console.error(e); } }
    if (!anims.size) return;
    for (const a of [...anims]) {
      if (!anims.has(a)) continue;
      a.t += sdt; const k = Math.min(1, a.t / a.d);
      try { a.fn(a.ease(k), k); } catch (e) { console.error(e); }
      if (k >= 1) { anims.delete(a); a.res(); }
    }
  }
  function cancelAll() { const l = [...anims]; anims.clear(); loops.clear(); l.forEach(a => a.rej(new Cancel())); }

  /* ------------------------------------------------------------------
     المواد والقوام
  ------------------------------------------------------------------ */
  const MAT = {};
  const FONT = '"IBM Plex Sans Arabic", "Readex Pro", Tahoma, sans-serif';
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); if (g) draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.userData.canvas = c; return t;
  }
  function mats() {
    const std = (color, roughness = 0.5, metalness = 0.02, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness }, o));
    MAT.glass = new THREE.MeshStandardMaterial({ color: 0xe2f5f8, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.8 });
    MAT.rim = new THREE.MeshStandardMaterial({ color: 0xeefbfd, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 1.6 });
    MAT.amber = new THREE.MeshStandardMaterial({ color: 0x6a3d12, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.5 });
    MAT.hdpe = std(0xeef2f0, 0.55, 0, { transparent: true, opacity: 0.86 });
    MAT.white = std(0xe7ecee, 0.42);
    MAT.off = std(0xcfd8db, 0.5);
    MAT.grey = std(0x8b979d, 0.5, 0.1);
    MAT.dark = std(0x222c31, 0.55, 0.1);
    MAT.black = std(0x0d1215, 0.4, 0.1);
    MAT.steel = std(0xc9d1d6, 0.26, 0.88);
    MAT.rubber = std(0x2b3135, 0.85);
    MAT.redRub = std(0xb8392f, 0.6);
    MAT.paper = std(0xf2eee4, 0.9);
    MAT.porc = std(0xf4f3ef, 0.3, 0.02);
    MAT.bench = std(0x182025, 0.3, 0.12);
    MAT.benchEdge = std(0x10171a, 0.4, 0.1);
    MAT.cab = std(0x2a3a40, 0.55, 0.05);
    MAT.teal = std(0x2c8d9c, 0.4, 0.1);
    MAT.blue = std(0x2f5fb3, 0.45, 0.05);
    MAT.glowTeal = new THREE.MeshBasicMaterial({ color: 0x8fe9f5 });
    MAT.glowWarm = new THREE.MeshBasicMaterial({ color: 0xfff1d9 });
    MAT.panelDark = new THREE.MeshStandardMaterial({ color: 0x0b1418, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.78, envMapIntensity: 1.2 });
    MAT._caps = {};
    MAT.cap = c => MAT._caps[c] || (MAT._caps[c] = std(c, 0.5, 0.02));
    const blob = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(0,0,0,0.55)"); r.addColorStop(0.55, "rgba(0,0,0,0.25)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    MAT.shadow = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false });
    const soft = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    MAT.softTex = soft;
  }

  /* ------------------------------------------------------------------
     أدوات بناء الأشكال
  ------------------------------------------------------------------ */
  const V2 = (x, y) => new THREE.Vector2(x, y), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
  function rbox(w, h, d, r = 0.05) {
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
    const s = new THREE.Shape(), x = -w / 2 + r * 0.5, y = -h / 2 + r * 0.5, W = w - r, H = h - r, q = r * 0.5;
    s.moveTo(x + q, y); s.lineTo(x + W - q, y); s.quadraticCurveTo(x + W, y, x + W, y + q); s.lineTo(x + W, y + H - q);
    s.quadraticCurveTo(x + W, y + H, x + W - q, y + H); s.lineTo(x + q, y + H); s.quadraticCurveTo(x, y + H, x, y + H - q); s.lineTo(x, y + q); s.quadraticCurveTo(x, y, x + q, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - r), bevelEnabled: true, bevelThickness: r * 0.5, bevelSize: r * 0.5, bevelSegments: 2, curveSegments: 5 });
    g.center(); return g;
  }
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(p => V2(p[0], p[1])), seg);
  function profilePts(rOf, h, n = 24) { const p = []; for (let i = 0; i <= n; i++) { const y = h * i / n; p.push([rOf(y), y]); } return p; }
  function shadow(w, d, parent, y = 0.004) { const m = mesh(new THREE.PlaneGeometry(w, d), MAT.shadow, 0, y, 0, parent); m.rotation.x = -Math.PI / 2; m.renderOrder = 0; return m; }

  /* شاشة جهاز رقمية (تُحدَّث بالنص) */
  function screen(w, h, o = {}) {
    const cw = 320, ch = Math.round(320 * h / w);
    const tex = canvasTex(cw, ch, () => {});
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.set = (lines, opt = {}) => {
      const c = tex.userData.canvas, g = c.getContext("2d"); if (!g) return;
      const bg = opt.bg || o.bg || "#0a2420", fg = opt.fg || o.fg || "#9ff5d3";
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = "rgba(159,245,211,.12)"; g.lineWidth = 2; g.strokeRect(4, 4, cw - 8, ch - 8);
      const L = [].concat(lines || []); const n = L.length || 1;
      L.forEach((ln, i) => {
        const big = i === 0 && n > 1 ? 1 : 0;
        const fs = Math.min(ch / (n + 0.6) * (big ? 1.25 : 0.82), big ? 74 : 40);
        const isAr = /[؀-ۿ]/.test(ln);
        g.font = `${big ? 600 : 500} ${fs}px ${isAr ? FONT : MONO}`;
        g.fillStyle = i === 0 ? fg : "rgba(159,245,211,.72)";
        g.textAlign = "center"; g.textBaseline = "middle"; g.direction = isAr ? "rtl" : "ltr";
        const y = ch * (i + 0.5 + (n === 1 ? 0 : 0.05)) / n;
        g.fillText(ln, cw / 2, y, cw - 16);
      });
      tex.needsUpdate = true;
    };
    m.set(o.text || "");
    return m;
  }
  /* لاصقة ورقية على قنينة أو جهاز */
  function labelTex(lines, o = {}) {
    return canvasTex(o.w || 256, o.h || 128, (g, w, h) => {
      g.fillStyle = o.bg || "#f4f1e8"; g.fillRect(0, 0, w, h);
      if (o.band) { g.fillStyle = o.band; g.fillRect(0, 0, w, h * 0.2); }
      const L = [].concat(lines); g.textAlign = "center"; g.textBaseline = "middle";
      L.forEach((t, i) => {
        const isAr = /[؀-ۿ]/.test(t); g.direction = isAr ? "rtl" : "ltr";
        const fs = i === 0 ? (o.fs || 38) : (o.fs2 || 26);
        g.font = `${i === 0 ? 700 : 500} ${fs}px ${isAr ? FONT : MONO}`;
        g.fillStyle = i === 0 ? (o.fg || "#14262b") : "#3c5056";
        const top = o.band ? h * 0.2 : 0, y = top + (h - top) * (i + 0.5) / L.length;
        g.fillText(t, w / 2, y, w - 14);
      });
    });
  }
  function wrapLabel(r, y0, y1, tex, arc = 1.7) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, 24, 1, true, -arc / 2, arc);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, transparent: true }));
    m.position.y = (y0 + y1) / 2; return m;
  }

  /* ------------------------------------------------------------------
     السائل داخل وعاء دائري: يُعاد بناؤه حسب المنسوب ليطابق شكل الوعاء
  ------------------------------------------------------------------ */
  class Liquid {
    constructor(rOf, maxH, o = {}) {
      this.rOf = rOf; this.maxH = maxH; this.h = -1; this.seg = o.seg || 24; this.y0 = o.y0 ?? 0.012;
      this.mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color ?? 0xcfe8ee), transparent: true, opacity: o.opacity ?? 0.35, roughness: 0.12, metalness: 0, depthWrite: false, envMapIntensity: 0.9, side: THREE.DoubleSide });
      this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); this.mesh.renderOrder = 2;
      this.set(o.level || 0);
    }
    set(h) {
      h = U.clamp(h, 0, this.maxH);
      if (Math.abs(h - this.h) < 2e-4) return; this.h = h;
      this.mesh.visible = h > this.y0 + 0.004; if (!this.mesh.visible) return;
      const pts = [V2(0, this.y0)], n = 10;
      for (let i = 0; i <= n; i++) { const y = this.y0 + (h - this.y0) * i / n; pts.push(V2(Math.max(0.002, this.rOf(y) * 0.955), y)); }
      pts.push(V2(0, h));
      this.mesh.geometry.dispose(); this.mesh.geometry = new THREE.LatheGeometry(pts, this.seg);
    }
    to(h, dur = 1) { const h0 = Math.max(0, this.h); return anim(dur, k => this.set(U.lerp(h0, h, k))); }
    color(hex, op, dur = 0.8) {
      const c0 = this.mat.color.clone(), c1 = new THREE.Color(hex), o0 = this.mat.opacity, o1 = op ?? o0;
      if (!dur) { this.mat.color.copy(c1); this.mat.opacity = o1; return Promise.resolve(); }
      return anim(dur, k => { this.mat.color.copy(c0).lerp(c1, k); this.mat.opacity = U.lerp(o0, o1, k); });
    }
  }
  /* سائل في وعاء مربع (جرار اختبار الجرة) */
  class BoxLiquid {
    constructor(w, d, maxH, o = {}) {
      this.maxH = maxH; this.h = 0;
      this.mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color ?? 0xcfe8ee), transparent: true, opacity: o.opacity ?? 0.35, roughness: 0.12, depthWrite: false, envMapIntensity: 0.9 });
      const g = new THREE.BoxGeometry(w, 1, d); g.translate(0, 0.5, 0);
      this.mesh = new THREE.Mesh(g, this.mat); this.mesh.renderOrder = 2; this.mesh.position.y = 0.015; this.set(o.level || 0);
    }
    set(h) { this.h = U.clamp(h, 0, this.maxH); this.mesh.visible = this.h > 0.004; this.mesh.scale.y = Math.max(0.001, this.h); }
    to(h, dur = 1) { const h0 = this.h; return anim(dur, k => this.set(U.lerp(h0, h, k))); }
    color(hex, op, dur = 0.8) { return Liquid.prototype.color.call(this, hex, op, dur); }
  }

  /* ------------------------------------------------------------------
     مكتبة الزجاجيات والأجهزة (الوحدة = 10 سم، وسطح المنضدة y = 0)
  ------------------------------------------------------------------ */
  function glassBody(pts, parent, mat = MAT.glass) {
    const m = mesh(lathe(pts, 32), mat, 0, 0, 0, parent); m.renderOrder = 3;
    const top = pts[pts.length - 1];
    const rim = mesh(new THREE.TorusGeometry(top[0], 0.011, 6, 32), MAT.rim, 0, top[1], 0, parent); rim.rotation.x = Math.PI / 2; rim.renderOrder = 3;
    return m;
  }
  function gradDecal(r, y0, y1, marks, arc = 0.7) {
    const tex = canvasTex(128, 256, (g, w, h) => {
      g.strokeStyle = "rgba(255,255,255,.85)"; g.fillStyle = "rgba(255,255,255,.85)"; g.lineWidth = 3; g.font = `500 20px ${MONO}`; g.textAlign = "left"; g.textBaseline = "middle";
      marks.forEach(([f, txt]) => { const y = h - f * h; g.beginPath(); g.moveTo(8, y); g.lineTo(txt ? 52 : 34, y); g.stroke(); if (txt) g.fillText(txt, 58, y); });
    });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.004, r * 1.004, y1 - y0, 16, 1, true, -arc / 2, arc), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.y = (y0 + y1) / 2; m.renderOrder = 4; return m;
  }
  const MK = {};
  MK.beaker = (o = {}) => {
    const r = o.r || 0.5, h = o.h || 1.3, g = new THREE.Group();
    glassBody([[0, 0], [r - 0.02, 0], [r, 0.02], [r, h], [r * 1.05, h + 0.025]], g);
    mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.025, 40), MAT.rim, 0, 0.012, 0, g).renderOrder = 3;
    if (o.grad !== false) g.add(gradDecal(r, 0.1, h * 0.86, [0.2, 0.4, 0.6, 0.8, 1].map((f, i) => [f, o.gradTxt ? o.gradTxt[i] : ""])));
    const liq = new Liquid(() => r - 0.012, h - 0.04, o); g.add(liq.mesh);
    shadow(r * 3, r * 3, g);
    return { g, liq, r, h, mouth: V3(0, h, 0) };
  };
  MK.erlen = (o = {}) => {
    const rb = o.rb || 0.42, h = o.h || 1.05, rn = o.rn || 0.12, ny = o.ny || h * 0.68;
    const rOf = y => y < 0.05 ? rb - 0.05 + y : y < ny ? U.lerp(rb, rn, Math.pow((y - 0.05) / (ny - 0.05), 0.9)) : rn;
    const g = new THREE.Group();
    const pts = [[0, 0]].concat(profilePts(rOf, h, 26)); pts.push([rn * 1.12, h + 0.02]);
    glassBody(pts, g);
    const liq = new Liquid(rOf, ny + (h - ny) * 0.5, o); g.add(liq.mesh);
    shadow(rb * 3, rb * 3, g);
    return { g, liq, r: rb, h, mouth: V3(0, h, 0), rOf };
  };
  MK.volflask = (o = {}) => {
    const rb = o.rb || 0.34, rn = o.rn || 0.06, h = o.h || 1.6;
    const rOf = y => { if (y < 0.04) return rb * 0.7 + y * 2; if (y < rb * 1.75) { const s = Math.sqrt(Math.max(0, rb * rb - (y - rb) * (y - rb))); return Math.max(s, rn); } return rn; };
    const g = new THREE.Group();
    const pts = [[0, 0]].concat(profilePts(rOf, h, 34)); pts.push([rn * 1.25, h + 0.02]);
    glassBody(pts, g);
    const mark = mesh(new THREE.TorusGeometry(rn * 1.02, 0.006, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), 0, h * 0.78, 0, g); mark.rotation.x = Math.PI / 2;
    const liq = new Liquid(rOf, h * 0.78, o); g.add(liq.mesh);
    shadow(rb * 3, rb * 3, g);
    return { g, liq, r: rb, h, mouth: V3(0, h, 0), markH: h * 0.78 };
  };
  MK.winkler = (o = {}) => {
    const r = o.r || 0.34, h = o.h || 0.95, rn = 0.11;
    const rOf = y => y < 0.04 ? r - 0.04 + y : y < 0.6 ? r : y < 0.76 ? U.lerp(r, rn, EASE.io((y - 0.6) / 0.16)) : rn;
    const g = new THREE.Group();
    const pts = [[0, 0]].concat(profilePts(rOf, h, 28)); pts.push([rn * 1.15, h + 0.02]);
    glassBody(pts, g, o.amber ? MAT.amber : MAT.glass);
    const stop = new THREE.Group(); stop.position.y = h; g.add(stop);
    mesh(lathe([[0, -0.16], [rn * 0.85, -0.16], [rn * 1.02, 0], [rn * 1.6, 0.02], [rn * 1.6, 0.08], [0, 0.09]], 28), o.amber ? MAT.amber : MAT.rim, 0, 0, 0, stop).renderOrder = 3;
    const liq = new Liquid(rOf, h - 0.02, o); g.add(liq.mesh);
    shadow(r * 3, r * 3, g);
    return { g, liq, r, h, stop, mouth: V3(0, h, 0) };
  };
  MK.gradcyl = (o = {}) => {
    const r = o.r || 0.17, h = o.h || 1.9, g = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.06, 6), MAT.teal, 0, 0.03, 0, g);
    const body = new THREE.Group(); body.position.y = 0.06; g.add(body);
    glassBody([[0, 0], [r, 0], [r, h], [r * 1.12, h + 0.03]], body);
    body.add(gradDecal(r, 0.15, h * 0.92, [0.2, 0.4, 0.6, 0.8, 1].map(f => [f, ""])));
    const liq = new Liquid(() => r - 0.01, h - 0.04, o); body.add(liq.mesh);
    shadow(1, 1, g);
    return { g, liq, r, h: h + 0.06, mouth: V3(0, h + 0.06, 0), body };
  };
  MK.bottle = (o = {}) => {
    const r = o.r || 0.2, h = o.h || 0.5, rn = 0.075;
    const rOf = y => y < 0.03 ? r - 0.03 + y : y < h * 0.76 ? r : y < h * 0.95 ? U.lerp(r, rn, EASE.io((y - h * 0.76) / (h * 0.19))) : rn;
    const g = new THREE.Group(), H = h * 1.12;
    const pts = [[0, 0]].concat(profilePts(rOf, H, 26));
    glassBody(pts, g, o.amber ? MAT.amber : MAT.glass);
    const cap = mesh(new THREE.CylinderGeometry(rn * 1.3, rn * 1.3, 0.11, 24), MAT.cap(o.cap || 0x2f5fb3), 0, H + 0.05, 0, g);
    if (o.label) g.add(wrapLabel(r * 1.01, h * 0.16, h * 0.66, labelTex(o.label, { band: o.band || "#" + new THREE.Color(o.cap || 0x2f5fb3).getHexString() })));
    const liq = new Liquid(rOf, h * 0.7, Object.assign({ level: h * 0.62 }, o)); g.add(liq.mesh);
    shadow(r * 3.2, r * 3.2, g);
    return { g, liq, r, h: H + 0.1, cap, mouth: V3(0, H, 0) };
  };
  MK.jug = (o = {}) => {
    const r = o.r || 0.42, h = o.h || 1.25, g = new THREE.Group();
    const rOf = y => y < 0.04 ? r - 0.04 + y : y < h * 0.82 ? r : y < h ? U.lerp(r, 0.13, EASE.io((y - h * 0.82) / (h * 0.18))) : 0.13;
    const body = mesh(lathe([[0, 0]].concat(profilePts(rOf, h + 0.08, 26)), 36), MAT.hdpe, 0, 0, 0, g); body.renderOrder = 3;
    mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 24), MAT.cap(o.cap || 0x2f5fb3), 0, h + 0.13, 0, g);
    const hd = mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 20, Math.PI), MAT.hdpe, 0, h * 0.62, -r + 0.05, g); hd.rotation.set(0, Math.PI / 2, Math.PI / 2);
    if (o.label) g.add(wrapLabel(r * 1.01, h * 0.25, h * 0.62, labelTex(o.label, { band: o.band || "#2c8d9c", fs: 32, fs2: 24, w: 320, h: 160 }), 1.6));
    const liq = new Liquid(rOf, h * 0.95, Object.assign({ level: h * 0.8 }, o)); g.add(liq.mesh);
    shadow(r * 3, r * 3, g);
    return { g, liq, r, h: h + 0.2, mouth: V3(0, h + 0.08, 0) };
  };
  MK.pipette = (o = {}) => {
    const g = new THREE.Group(), len = o.len || 1.7;
    const tube = mesh(new THREE.CylinderGeometry(0.022, 0.012, len, 14), MAT.rim, 0, len / 2, 0, g); tube.renderOrder = 3;
    if (o.bulb !== false) { const b = mesh(new THREE.SphereGeometry(0.075, 18, 14), MAT.rim, 0, len * 0.45, 0, g); b.scale.y = 2.1; b.renderOrder = 3; }
    mesh(new THREE.SphereGeometry(0.1, 18, 14), MAT.redRub, 0, len + 0.08, 0, g).scale.y = 1.25;
    const fill = mesh(new THREE.CylinderGeometry(0.016, 0.009, 1, 10), new THREE.MeshBasicMaterial({ color: o.color || 0xd9eef2, transparent: true, opacity: 0.85 }), 0, 0, 0, g);
    fill.geometry.translate(0, 0.5, 0); fill.scale.y = 0.001; fill.visible = false; fill.renderOrder = 2;
    const p = { g, len, tip: V3(0, 0, 0), fillMesh: fill };
    p.fill = (frac, color, dur = 0.6) => { if (color) fill.material.color.set(color); fill.visible = true; const s0 = fill.scale.y, s1 = Math.max(0.001, frac * len * 0.6); return anim(dur, k => { fill.scale.y = U.lerp(s0, s1, k); fill.visible = fill.scale.y > 0.002; }); };
    return p;
  };
  MK.dropper = (o = {}) => {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.03, 0.012, 0.6, 12), MAT.rim, 0, 0.3, 0, g).renderOrder = 3;
    const b = mesh(new THREE.SphereGeometry(0.06, 14, 12), MAT.cap(o.bulb || 0x3a3f44), 0, 0.68, 0, g); b.scale.y = 1.6;
    return { g, tip: V3(0, 0, 0) };
  };
  MK.spatula = () => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.05, 0.012, 0.9), MAT.steel, 0, 0, 0, g); mesh(new THREE.BoxGeometry(0.12, 0.012, 0.18), MAT.steel, 0, 0, -0.5, g); return { g }; };
  MK.burette = (o = {}) => {
    const g = new THREE.Group();
    mesh(rbox(1.05, 0.07, 0.65, 0.03), MAT.dark, 0, 0.035, 0, g);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.9, 14), MAT.steel, 0, 1.95, -0.22, g);
    const clamp = new THREE.Group(); clamp.position.set(0, 2.95, -0.06); g.add(clamp);
    mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), MAT.steel, 0, 0, 0, clamp);
    mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 18), MAT.steel, 0, 0, 0.19, clamp).rotation.x = Math.PI / 2;
    const yB = 1.25, L = 2.0, yT = yB + L + 0.15, r = 0.045;
    const glass = mesh(new THREE.CylinderGeometry(r, r, yT - yB, 18, 1, true), MAT.glass, 0, (yT + yB) / 2, 0.13, g); glass.renderOrder = 3;
    mesh(new THREE.TorusGeometry(r, 0.008, 6, 18), MAT.rim, 0, yT, 0.13, g).rotation.x = Math.PI / 2;
    const tip = mesh(new THREE.CylinderGeometry(0.02, 0.006, 0.3, 10), MAT.rim, 0, yB - 0.22, 0.13, g); tip.renderOrder = 3;
    const sc = new THREE.Group(); sc.position.set(0, yB - 0.05, 0.13); g.add(sc);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 12), MAT.porc, 0, 0, 0, sc).rotation.z = Math.PI / 2;
    const handle = mesh(new THREE.BoxGeometry(0.03, 0.16, 0.035), MAT.blue, 0.1, 0, 0, sc);
    const scaleTex = canvasTex(64, 512, (c, w, h) => { c.strokeStyle = "rgba(255,255,255,.9)"; c.fillStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2; c.font = `500 16px ${MONO}`; c.textBaseline = "middle"; for (let i = 0; i <= 50; i++) { const y = 6 + (h - 12) * i / 50; c.beginPath(); c.moveTo(2, y); c.lineTo(i % 5 ? 14 : 24, y); c.stroke(); if (i % 10 === 0) c.fillText(String(i), 28, y); } });
    const scale = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, L, 12, 1, true, -0.55, 1.1), new THREE.MeshBasicMaterial({ map: scaleTex, transparent: true, depthWrite: false }));
    scale.position.set(0, yB + L / 2, 0.13); scale.renderOrder = 4; g.add(scale);
    const liq = new Liquid(() => r - 0.006, L, Object.assign({ seg: 16, y0: 0 }, o)); liq.mesh.position.set(0, yB, 0.13); g.add(liq.mesh);
    shadow(1.3, 0.9, g);
    const b = { g, liq, L, yB, handle, tipLocal: V3(0, yB - 0.38, 0.13), flaskPos: V3(0, 0.07, 0.13), read: 0 };
    b.setRead = v => { b.read = v; liq.set(L * U.clamp((50 - v) / 50, 0, 1)); };
    b.empty = () => liq.set(0);
    return b;
  };
  MK.jarTester = (o = {}) => {
    const n = o.n || 6, sp = o.sp || 1.0, jw = o.jw || 0.74, jh = o.jh || 1.25, W = n * sp + 0.5, g = new THREE.Group();
    const by = 0.24 + jh + 0.62;
    mesh(rbox(W, 0.24, 1.15, 0.06), MAT.white, 0, 0.12, 0, g);
    mesh(new THREE.PlaneGeometry(W - 0.4, 0.07), MAT.glowWarm, 0, 0.14, 0.58, g);
    for (const s of [-1, 1]) mesh(rbox(0.22, by, 0.5, 0.05), MAT.white, s * (W / 2 - 0.13), by / 2, -0.38, g);
    mesh(rbox(W, 0.28, 0.6, 0.06), MAT.white, 0, by, -0.12, g);
    const scr = screen(0.7, 0.22, { text: "0 rpm" }); scr.position.set(W / 2 - 0.7, by, 0.185); g.add(scr);
    const knob = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), MAT.dark, W / 2 - 0.22, by, 0.2, g); knob.rotation.x = Math.PI / 2;
    const jars = [], paddles = [];
    for (let i = 0; i < n; i++) {
      const xx = ((n - 1) / 2 - i) * sp; // الجرة 1 على يمين الناظر (اتجاه القراءة العربية)
      const jg = new THREE.Group(); jg.position.set(xx, 0.24, 0.08); g.add(jg);
      const box = new THREE.BoxGeometry(jw, jh, jw); box.translate(0, jh / 2, 0);
      const inv = new THREE.MeshBasicMaterial({ visible: false });
      const glass = new THREE.Mesh(box, [MAT.glass, MAT.glass, inv, MAT.glass, MAT.glass, MAT.glass]); glass.renderOrder = 3; jg.add(glass);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xcfeef3, transparent: true, opacity: 0.45 })); edges.renderOrder = 3; jg.add(edges);
      const liq = new BoxLiquid(jw - 0.035, jw - 0.035, jh - 0.06, o); jg.add(liq.mesh);
      jars.push({ g: jg, liq, x: xx, h: jh, r: jw / 2, w: jw, mouth: V3(0, jh, 0) });
      const pad = new THREE.Group(); pad.position.set(xx, 0.24, 0.08); g.add(pad);
      const sl = by - 0.24 - 0.32;
      mesh(new THREE.CylinderGeometry(0.014, 0.014, sl, 8), MAT.steel, 0, 0.32 + sl / 2, 0, pad);
      mesh(new THREE.BoxGeometry(0.46, 0.22, 0.014), MAT.steel, 0, 0.36, 0, pad);
      paddles.push(pad);
    }
    shadow(W + 1, 1.9, g);
    const t = { g, jars, paddles, screen: scr, rpm: 0, W, jw, jh };
    t.spin = sdt => { if (!t.rpm) return; const a = sdt * t.rpm / 60 * Math.PI * 2 * 0.22; paddles.forEach(p => { p.rotation.y += a; }); };
    return t;
  };
  MK.turbidimeter = (o = {}) => {
    const g = new THREE.Group();
    mesh(rbox(0.62, 0.24, 0.8, 0.06), MAT.off, 0, 0.12, 0, g);
    const scr = screen(0.44, 0.2, { text: "---" }); scr.position.set(0, 0.245, 0.17); scr.rotation.x = -Math.PI / 2 + 0.25; g.add(scr);
    mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20), MAT.black, 0, 0.245, -0.18, g);
    const lab = wrapLabel(0.001, 0, 0.001, labelTex(["Turbidimeter"]), 0.1); lab.visible = false; g.add(lab);
    shadow(1.1, 1.3, g);
    return { g, screen: scr, well: V3(0, 0.25, -0.18) };
  };
  MK.vial = (o = {}) => {
    const g = new THREE.Group();
    glassBody([[0, 0], [0.055, 0], [0.055, 0.32]], g);
    mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.06, 18), MAT.black, 0, 0.35, 0, g);
    const liq = new Liquid(() => 0.05, 0.3, o); g.add(liq.mesh);
    return { g, liq };
  };
  MK.thermometer = (o = {}) => {
    const g = new THREE.Group(), L = 1.1;
    mesh(new THREE.CylinderGeometry(0.022, 0.022, L, 12), MAT.rim, 0, L / 2 + 0.05, 0, g).renderOrder = 3;
    mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc8322b, roughness: 0.3 }), 0, 0.05, 0, g);
    const col = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), new THREE.MeshBasicMaterial({ color: 0xd9362e }), 0, 0.05, 0, g);
    col.geometry.translate(0, 0.5, 0);
    const th = { g, col, set: T => { col.scale.y = 0.08 + L * 0.85 * U.clamp(T / 50, 0, 1); } };
    th.to = (T, dur = 1) => { const s0 = col.scale.y, s1 = 0.08 + L * 0.85 * U.clamp(T / 50, 0, 1); return anim(dur, k => { col.scale.y = U.lerp(s0, s1, k); }); };
    th.set(25); return th;
  };
  MK.phmeter = () => {
    const g = new THREE.Group();
    mesh(rbox(0.6, 0.2, 0.55, 0.05), MAT.off, 0, 0.1, 0, g);
    const scr = screen(0.42, 0.16, { text: "pH --.--" }); scr.position.set(0, 0.205, 0.04); scr.rotation.x = -Math.PI / 2 + 0.3; g.add(scr);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), MAT.steel, 0.38, 0.7, -0.18, g);
    const arm = new THREE.Group(); arm.position.set(0.38, 1.25, -0.18); g.add(arm);
    mesh(new THREE.BoxGeometry(0.6, 0.05, 0.06), MAT.dark, -0.3, 0, 0, arm);
    const probe = mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.75, 12), MAT.dark, -0.58, -0.36, 0, arm);
    shadow(1, 0.9, g);
    return { g, screen: scr, arm, probe };
  };
  MK.balance = () => {
    const g = new THREE.Group();
    mesh(rbox(0.85, 0.14, 1.0, 0.05), MAT.white, 0, 0.07, 0, g);
    const scr = screen(0.42, 0.11, { text: "0.0000 g" }); scr.position.set(0, 0.075, 0.505); g.add(scr);
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 30), MAT.steel, 0, 0.17, -0.05, g);
    const shield = new THREE.Group(); shield.position.y = 0.14; g.add(shield);
    const sb = new THREE.BoxGeometry(0.8, 0.62, 0.8); sb.translate(0, 0.31, -0.05);
    const sm = new THREE.Mesh(sb, [MAT.glass, MAT.glass, MAT.glass, new THREE.MeshBasicMaterial({ visible: false }), MAT.glass, MAT.glass]); sm.renderOrder = 3; shield.add(sm);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(sb), new THREE.LineBasicMaterial({ color: 0xbfd3d8, transparent: true, opacity: 0.6 })); shield.add(e);
    shadow(1.3, 1.4, g);
    return { g, screen: scr, pan: V3(0, 0.18, -0.05) };
  };
  MK.shaker = () => {
    const g = new THREE.Group();
    mesh(rbox(2.1, 0.3, 1.2, 0.07), MAT.white, 0, 0.15, 0, g);
    const scr = screen(0.5, 0.15, { text: "0 rpm" }); scr.position.set(0.65, 0.17, 0.605); g.add(scr);
    const plat = new THREE.Group(); plat.position.y = 0.32; g.add(plat);
    mesh(rbox(1.95, 0.05, 1.05, 0.03), MAT.grey, 0, 0, 0, plat);
    shadow(2.6, 1.7, g);
    const s = { g, plat, screen: scr, on: false, t: 0 };
    s.tick = sdt => { if (!s.on) { plat.position.x *= 0.85; return; } s.t += sdt * 9; plat.position.x = Math.sin(s.t) * 0.05; plat.position.z = Math.cos(s.t) * 0.05; };
    return s;
  };
  MK.centrifuge = () => {
    const g = new THREE.Group();
    mesh(lathe([[0, 0], [0.62, 0], [0.66, 0.06], [0.66, 0.5], [0.6, 0.56], [0.5, 0.56], [0.48, 0.5], [0.46, 0.22], [0, 0.22]], 40), new THREE.MeshStandardMaterial({ color: 0xe7ecee, roughness: 0.42, side: THREE.DoubleSide }), 0, 0, 0, g);
    const rotor = new THREE.Group(); rotor.position.y = 0.3; g.add(rotor);
    mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), MAT.dark, 0, 0, 0, rotor);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), MAT.black, Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3, rotor); }
    const lid = new THREE.Group(); lid.position.set(0, 0.56, -0.6); g.add(lid);
    mesh(lathe([[0, 0.12], [0.6, 0.04], [0.62, 0]], 40), new THREE.MeshStandardMaterial({ color: 0xcfd8db, roughness: 0.5, side: THREE.DoubleSide }), 0, 0, 0.6, lid);
    const scr = screen(0.4, 0.12, { text: "0 rpm" }); scr.position.set(0, 0.3, 0.665); g.add(scr);
    shadow(1.8, 1.8, g);
    const c = { g, rotor, lid, screen: scr, rpm: 0 };
    c.open = (on, dur = 0.7) => { const a0 = lid.rotation.x, a1 = on ? -1.25 : 0; return anim(dur, k => { lid.rotation.x = U.lerp(a0, a1, k); }); };
    c.tick = sdt => { if (c.rpm) rotor.rotation.y += sdt * c.rpm / 60 * 0.6; };
    return c;
  };
  MK.funnel = (o = {}) => {
    const g = new THREE.Group();
    glassBody([[0.012, 0], [0.018, 0.32], [0.24, 0.62], [0.26, 0.66]], g);
    const fp = mesh(new THREE.ConeGeometry(0.2, 0.3, 24, 1, true), MAT.paper, 0, 0.5, 0, g); fp.rotation.x = Math.PI;
    return { g, top: V3(0, 0.62, 0), stem: V3(0, 0, 0) };
  };
  function cabinet(o, label, display) {
    const g = new THREE.Group(), w = o.w || 1.35, h = o.h || 1.15, d = o.d || 1.0;
    mesh(rbox(w, h, d, 0.06), o.mat || MAT.white, 0, h / 2, 0, g);
    mesh(new THREE.BoxGeometry(w - 0.22, h - 0.32, 0.02), MAT.black, 0, h / 2 - 0.04, d / 2 - 0.02, g);
    const door = new THREE.Group(); door.position.set(-w / 2 + 0.08, 0, d / 2 + 0.03); g.add(door);
    mesh(rbox(w - 0.14, h - 0.26, 0.06, 0.03), o.door || MAT.off, (w - 0.14) / 2, h / 2 - 0.04, 0, door);
    mesh(new THREE.PlaneGeometry(w - 0.5, h - 0.62), MAT.panelDark, (w - 0.14) / 2, h / 2, 0.035, door);
    mesh(new THREE.BoxGeometry(0.05, 0.4, 0.06), MAT.steel, w - 0.3, h / 2 - 0.04, 0.07, door);
    const scr = screen(0.42, 0.13, { text: display || "" }); scr.position.set(w / 2 - 0.32, h - 0.09, d / 2 + 0.005); g.add(scr);
    if (label) { const lt = labelTex([label], { bg: "rgba(0,0,0,0)", fg: "#2b3a40", fs: 34 }); const lm = mesh(new THREE.PlaneGeometry(0.6, 0.12), new THREE.MeshBasicMaterial({ map: lt, transparent: true }), -w / 2 + 0.42, h - 0.09, d / 2 + 0.005, g); lm.renderOrder = 4; }
    shadow(w + 0.6, d + 0.6, g);
    const c = { g, door, screen: scr, w, h, d, inside: V3(0, 0.35, 0) };
    c.open = (on, dur = 0.8) => { const a0 = door.rotation.y, a1 = on ? -1.9 : 0; return anim(dur, k => { door.rotation.y = U.lerp(a0, a1, k); }); };
    return c;
  }
  MK.oven = o => cabinet(Object.assign({ mat: MAT.white }, o), "فرن تجفيف", "--°C");
  MK.incubator = o => cabinet(Object.assign({ w: 1.3, h: 1.35, mat: MAT.off, door: MAT.white }, o), "حاضنة BOD", "--°C");
  MK.hotplate = () => {
    const g = new THREE.Group();
    mesh(rbox(1.25, 0.16, 0.9, 0.05), MAT.white, 0, 0.08, 0, g);
    const topM = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.35, emissive: 0x000000 });
    const top = mesh(new THREE.BoxGeometry(1.1, 0.02, 0.75), topM, 0, 0.17, 0, g);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), MAT.dark, 0.48, 0.08, 0.46, g).rotation.x = Math.PI / 2;
    shadow(1.6, 1.3, g);
    const hp = { g, top: topM };
    hp.heat = (on, dur = 1.2) => { const c0 = topM.emissive.clone(), c1 = new THREE.Color(on ? 0x7a1e08 : 0x000000); return anim(dur, k => topM.emissive.copy(c0).lerp(c1, k)); };
    return hp;
  };
  MK.hood = (o = {}) => {
    const g = new THREE.Group(), W = o.w || 3.2, H = 2.7, D = 1.4;
    for (const s of [-1, 1]) mesh(rbox(0.12, H, D, 0.04), MAT.white, s * W / 2, H / 2, -0.1, g);
    mesh(rbox(W + 0.12, 0.5, D, 0.05), MAT.white, 0, H + 0.2, -0.1, g);
    mesh(new THREE.PlaneGeometry(W, H), MAT.cab, 0, H / 2, -0.78, g);
    mesh(new THREE.PlaneGeometry(W - 0.2, 0.06), MAT.glowWarm, 0, H - 0.08, -0.2, g).rotation.x = Math.PI / 2;
    const sash = mesh(new THREE.BoxGeometry(W - 0.1, 1.05, 0.03), MAT.glass, 0, H - 0.55, 0.58, g); sash.renderOrder = 5;
    mesh(new THREE.BoxGeometry(W - 0.1, 0.06, 0.06), MAT.steel, 0, H - 1.07, 0.58, g);
    const lt = labelTex(["خزانة الغازات"], { bg: "rgba(0,0,0,0)", fg: "#2b3a40", fs: 40 }); const lm = mesh(new THREE.PlaneGeometry(1, 0.18), new THREE.MeshBasicMaterial({ map: lt, transparent: true }), 0, H + 0.2, 0.61, g); lm.renderOrder = 4;
    return { g, W, H };
  };
  MK.aas = () => {
    const g = new THREE.Group();
    mesh(rbox(2.4, 1.05, 1.1, 0.07), MAT.off, 0, 0.525, 0, g);
    mesh(rbox(0.95, 0.75, 0.04, 0.03), MAT.panelDark, 0.62, 0.55, 0.56, g);
    const burner = new THREE.Group(); burner.position.set(0.62, 0.35, 0.3); g.add(burner);
    mesh(new THREE.BoxGeometry(0.42, 0.05, 0.06), MAT.steel, 0, 0, 0, burner);
    const fm = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    const flame = new THREE.Group(); flame.position.y = 0.03; flame.visible = false; burner.add(flame);
    const f1 = mesh(new THREE.ConeGeometry(0.2, 0.42, 20, 1, true), fm(0x4f8dff, 0.45), 0, 0.21, 0, flame); f1.scale.z = 0.18;
    const f2 = mesh(new THREE.ConeGeometry(0.12, 0.26, 16, 1, true), fm(0xffb15a, 0.5), 0, 0.13, 0, flame); f2.scale.z = 0.25;
    const turret = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 24), MAT.grey, -0.5, 1.14, -0.15, g);
    const lampGlow = mesh(new THREE.SphereGeometry(0.06, 14, 12), new THREE.MeshBasicMaterial({ color: 0x333333 }), -0.5, 1.26, 0.05, g);
    mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.6, 16), MAT.steel, 0.62, 1.35, -0.1, g);
    const scr = screen(0.78, 0.36, { text: "AAS" }); scr.position.set(-0.55, 0.62, 0.555); g.add(scr);
    const curve = new THREE.CatmullRomCurve3([V3(0.3, 0.32, 0.5), V3(0.1, 0.25, 0.85), V3(-0.15, 0.6, 1.25), V3(-0.25, 0.55, 1.45)]);
    mesh(new THREE.TubeGeometry(curve, 30, 0.012, 6), new THREE.MeshStandardMaterial({ color: 0xeaf2f2, roughness: 0.4, transparent: true, opacity: 0.8 }), 0, 0, 0, g);
    const lt = labelTex(["Atomic Absorption"], { bg: "rgba(0,0,0,0)", fg: "#2b3a40", fs: 34 }); const lm = mesh(new THREE.PlaneGeometry(0.9, 0.12), new THREE.MeshBasicMaterial({ map: lt, transparent: true }), -0.55, 0.93, 0.555, g); lm.renderOrder = 4;
    shadow(3, 1.8, g);
    const a = { g, screen: scr, flame, lampGlow, sampleAt: V3(-0.25, 0, 1.45), t: 0 };
    a.tick = sdt => { if (!flame.visible) return; a.t += sdt * 14; const s = 1 + Math.sin(a.t) * 0.05 + Math.sin(a.t * 2.3) * 0.04; flame.scale.set(1, s, 1); };
    a.lamp = c => lampGlow.material.color.set(c);
    return a;
  };
  MK.mortar = () => {
    const g = new THREE.Group();
    mesh(lathe([[0, 0], [0.22, 0], [0.3, 0.05], [0.36, 0.2], [0.38, 0.3], [0.33, 0.3], [0.3, 0.2], [0.2, 0.09], [0, 0.08]], 36), MAT.porc, 0, 0, 0, g);
    const pestle = new THREE.Group(); pestle.position.set(0.05, 0.12, 0); g.add(pestle);
    const pm = mesh(new THREE.CapsuleGeometry(0.06, 0.55, 6, 14), MAT.porc, 0, 0.33, 0, pestle); pestle.rotation.z = -0.45;
    const powder = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x8a7a4a, roughness: 0.95 }), 0, 0.1, 0, g); powder.visible = false;
    shadow(1, 1, g);
    return { g, pestle, powder };
  };
  MK.dish = (o = {}) => {
    const g = new THREE.Group();
    mesh(lathe([[0, 0], [0.24, 0], [0.27, 0.08], [0.26, 0.08], [0.23, 0.02], [0, 0.02]], 32), MAT.porc, 0, 0, 0, g);
    shadow(0.8, 0.8, g);
    return { g };
  };
  MK.reed = (o = {}) => {
    const g = new THREE.Group(), rnd = U.rng(o.seed || "reed");
    const stemM = new THREE.MeshStandardMaterial({ color: o.dry ? 0x9b8a55 : 0x8aa04f, roughness: 0.7 });
    const leafM = new THREE.MeshStandardMaterial({ color: o.dry ? 0x8e8a52 : 0x5f8f3a, roughness: 0.7, side: THREE.DoubleSide });
    const rootM = new THREE.MeshStandardMaterial({ color: 0x6b4c2e, roughness: 0.9 });
    const parts = { root: new THREE.Group(), stem: new THREE.Group(), leaf: new THREE.Group() };
    Object.values(parts).forEach(p => g.add(p));
    for (let i = 0; i < 4; i++) {
      const z = (i - 1.5) * 0.08;
      const st = mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.6, 8), stemM, 0.2, 0.03, z, parts.stem); st.rotation.z = Math.PI / 2;
      for (let j = 0; j < 3; j++) { const lf = mesh(new THREE.PlaneGeometry(0.75, 0.06), leafM, 1.2 + j * 0.12, 0.04 + j * 0.01, z + (rnd() - 0.5) * 0.25, parts.leaf); lf.rotation.set(-Math.PI / 2, 0, (rnd() - 0.5) * 0.5); }
      for (let j = 0; j < 4; j++) {
        const pts = []; let x = -0.62, y = 0.03, zz = z;
        for (let k = 0; k < 5; k++) { pts.push(V3(x, y, zz)); x -= 0.08 + rnd() * 0.06; zz += (rnd() - 0.5) * 0.12; }
        mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.008, 5), rootM, 0, 0, 0, parts.root);
      }
    }
    shadow(3, 0.9, g);
    return { g, parts };
  };
  MK.carboy = (o = {}) => {
    const r = 0.5, h = 1.35, g = new THREE.Group();
    const rOf = y => y < 0.04 ? r - 0.04 + y : y < h * 0.8 ? r : y < h ? U.lerp(r, 0.12, EASE.io((y - h * 0.8) / (h * 0.2))) : 0.12;
    glassBody([[0, 0]].concat(profilePts(rOf, h + 0.06, 26)), g);
    mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 20), MAT.cap(0x2c8d9c), 0, h + 0.1, 0, g);
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), new THREE.MeshStandardMaterial({ color: 0xe0e8e8, transparent: true, opacity: 0.7 }), 0.05, h * 0.55, 0, g);
    if (o.label) g.add(wrapLabel(r * 1.01, h * 0.18, h * 0.5, labelTex(o.label, { band: "#2c8d9c", fs: 30, fs2: 22, w: 320, h: 160 }), 1.4));
    const liq = new Liquid(rOf, h * 0.95, Object.assign({ level: h * 0.78 }, o)); g.add(liq.mesh);
    shadow(1.6, 1.6, g);
    return { g, liq, h };
  };

  /* جسيمات عامة (ندف، رواسب، أيونات، فقاعات) */
  class Swarm {
    constructor(n, geo, mat, parent) {
      this.n = n; this.mesh = new THREE.InstancedMesh(geo, mat, n); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
      this.p = Array.from({ length: n }, () => V3(0, -99, 0)); this.s = new Float32Array(n).fill(1); this.v = Array.from({ length: n }, () => V3(0, 0, 0)); this.d = new Float32Array(n);
      this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sv = V3(1, 1, 1);
      if (parent) parent.add(this.mesh); this.sync();
    }
    sync() { for (let i = 0; i < this.n; i++) { const s = this.s[i]; this.sv.set(s, s, s); this.m4.compose(this.p[i], this.q, this.sv); this.mesh.setMatrixAt(i, this.m4); } this.mesh.instanceMatrix.needsUpdate = true; }
  }

  /* ------------------------------------------------------------------
     المسرح: الغرفة والإضاءة والكاميرا والتسميات والاختيار بالنقر
  ------------------------------------------------------------------ */
  let st = null, scene, camera, canvas, lblLayer, expGroup, fallbackTimer = 0;
  const CAM = { t: V3(0, 0.9, 0), r: 10, th: 0, ph: 1.12, goal: null, vt: 0, vp: 0, ptr: new Map(), pinch: 0, moved: 0, down: null };
  const labels = new Set(), picks = new Set(), rings = new Set();
  const tmpV = V3(0, 0, 0);

  function buildRoom() {
    const room = new THREE.Group(); scene.add(room);
    mesh(rbox(15.4, 0.16, 4.3, 0.05), MAT.bench, 0, -0.08, -0.05, room);
    mesh(new THREE.BoxGeometry(15.4, 0.06, 0.08), MAT.benchEdge, 0, -0.13, 2.08, room);
    for (let i = 0; i < 8; i++) {
      const x = -6.75 + i * 1.93;
      mesh(new THREE.BoxGeometry(1.85, 2.9, 0.06), MAT.cab, x, -1.62, 1.92, room);
      mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), MAT.steel, x, -0.45, 1.97, room);
    }
    mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshStandardMaterial({ color: 0x0a1418, roughness: 0.9 }), 0, -3.1, 0, room).rotation.x = -Math.PI / 2;
    const tile = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#13282e"; g.fillRect(0, 0, w, h); g.fillStyle = "#183239"; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); g.fillStyle = "rgba(255,255,255,.025)"; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 64 + 4, y * 64 + 4, 56, 14); });
    tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(16, 7);
    mesh(new THREE.PlaneGeometry(32, 14), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.6 }), 0, 4, -2.25, room);
    for (const s of [-1, 1]) { const w = mesh(new THREE.PlaneGeometry(10, 14), new THREE.MeshStandardMaterial({ color: 0x10232a, roughness: 0.8 }), s * 7.9, 4, 2, room); w.rotation.y = -s * Math.PI / 2; }
    const win = mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshBasicMaterial({ color: 0x9fd2e4 }), -7.85, 2.6, 0.2, room); win.rotation.y = Math.PI / 2;
    mesh(new THREE.BoxGeometry(15.2, 0.06, 0.55), MAT.steel, 0, 3.05, -1.95, room);
    mesh(new THREE.BoxGeometry(15.2, 0.03, 0.04), MAT.glowTeal, 0, 3.0, -1.7, room);
    const rnd = U.rng("shelf"), caps = [0x2f5fb3, 0xb8392f, 0x2c8d9c, 0xe6ae4f, 0x3a3f44, 0x5e8f3a];
    const decoA = new THREE.MeshStandardMaterial({ color: 0x7a4a1c, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
    const decoC = new THREE.MeshStandardMaterial({ color: 0xdbe9ec, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 18; i++) {
      const r = 0.13 + rnd() * 0.08, h = 0.3 + rnd() * 0.25, x = -6.8 + i * 0.8 + rnd() * 0.2, z = -2.0 + rnd() * 0.15;
      const rOf = y => y < h * 0.76 ? r : y < h * 0.95 ? U.lerp(r, 0.07, (y - h * 0.76) / (h * 0.19)) : 0.07;
      mesh(lathe([[0, 0]].concat(profilePts(rOf, h * 1.1, 10)), 18), rnd() < 0.4 ? decoA : decoC, x, 3.08, z, room);
      mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 14), MAT.cap(caps[i % caps.length]), x, 3.08 + h * 1.1 + 0.05, z, room);
    }
    const sign = (lines, w, h, x, y, o = {}) => { const t = labelTex(lines, Object.assign({ w: 512, h: Math.round(512 * h / w), fs: 44, fs2: 30 }, o)); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), x, y, -2.23, room); return m; };
    sign(["مختبر التلوث البيئي", "قسم علوم الحياة · كلية التربية للعلوم الصرفة"], 3.6, 0.9, 0, 4.25, { bg: "#e9efe9", band: "#2c8d9c" });
    sign(["ارتدِ النظارات والقفازات", "السلامة أولاً"], 1.5, 0.75, -5, 4.2, { bg: "#fff3cf", band: "#e6ae4f", fs: 40 });
    sign(["لا تأكل ولا تشرب داخل المختبر"], 1.5, 0.5, 5, 4.25, { bg: "#ffe1db", band: "#b8392f", fs: 36 });
    scene.add(new THREE.HemisphereLight(0xe3f3ff, 0x1d150d, 0.62));
    const key = new THREE.DirectionalLight(0xfff1de, 0.95); key.position.set(4, 9, 7); scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fdcff, 0.38); fill.position.set(-7, 5, 3); scene.add(fill);
    const strip = new THREE.PointLight(0xbfeeff, 0.55, 9); strip.position.set(0, 2.8, -1.4); scene.add(strip);
    // انعكاسات للزجاج والمعدن من بيئة بسيطة
    try {
      const env = new THREE.Scene(); env.background = new THREE.Color(0x0c1c22);
      const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(3, 3, 3), side: THREE.DoubleSide });
      const p1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), pm); p1.position.set(0, 8, 0); p1.rotation.x = Math.PI / 2; env.add(p1);
      const p2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.6, 2, 2.4), side: THREE.DoubleSide })); p2.position.set(-9, 3, 0); p2.rotation.y = Math.PI / 2; env.add(p2);
      const p3 = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.2, 1.1, 1), side: THREE.DoubleSide })); p3.position.set(0, 3, 9); env.add(p3);
      const gen = new THREE.PMREMGenerator(st.renderer); scene.environment = gen.fromScene(env, 0.04).texture; gen.dispose();
    } catch (e) { /* الانعكاسات اختيارية */ }
  }

  function camApply() {
    const s = Math.sin(CAM.ph), a = camera.aspect || 1.6, r = CAM.r * (a < 1.5 ? Math.pow(1.5 / a, 0.85) : 1);
    camera.position.set(CAM.t.x + r * s * Math.sin(CAM.th), CAM.t.y + r * Math.cos(CAM.ph), CAM.t.z + r * s * Math.cos(CAM.th));
    camera.lookAt(CAM.t);
  }
  function camTick(dt) {
    if (CAM.goal) {
      const k = 1 - Math.exp(-dt * (U.reduced ? 30 : 2.6)), G = CAM.goal;
      CAM.t.lerp(G.t, k); CAM.r += (G.r - CAM.r) * k; CAM.th += (G.th - CAM.th) * k; CAM.ph += (G.ph - CAM.ph) * k;
      if (CAM.t.distanceTo(G.t) < 0.005 && Math.abs(G.r - CAM.r) < 0.01 && Math.abs(G.th - CAM.th) < 0.002) CAM.goal = null;
    }
    CAM.th += CAM.vt; CAM.ph += CAM.vp; CAM.vt *= 0.88; CAM.vp *= 0.88;
    CAM.th = U.clamp(CAM.th, -1.15, 1.15); CAM.ph = U.clamp(CAM.ph, 0.42, 1.5); CAM.r = U.clamp(CAM.r, 1.6, 16);
    camApply();
  }
  function camTo(v) { if (!v) return; CAM.goal = { t: V3(...v.t), r: v.r, th: v.th ?? 0, ph: v.ph ?? 1.12 }; }
  /* إن كان هدف المهمة أو الأداة الممسوكة خارج الصورة، نبتعد بالكاميرا حتى يظهر الجميع */
  let fitCam = null;
  function fits(t, r, th, ph, pts) {
    if (!fitCam) fitCam = new THREE.PerspectiveCamera();
    fitCam.copy(camera); fitCam.updateProjectionMatrix();
    const s = Math.sin(ph), a = camera.aspect || 1.6, rr = r * (a < 1.5 ? Math.pow(1.5 / a, 0.85) : 1);
    fitCam.position.set(t.x + rr * s * Math.sin(th), t.y + rr * Math.cos(ph), t.z + rr * s * Math.cos(th)); fitCam.lookAt(t); fitCam.updateMatrixWorld(true);
    return pts.every(p => { const q = p.clone().project(fitCam); return Math.abs(q.x) < 0.84 && q.y < 0.72 && q.y > -0.86 && q.z < 1; });
  }
  function frameFor(pts) {
    if (!camera || !pts.length) return;
    const G = CAM.goal || { t: CAM.t.clone(), r: CAM.r, th: CAM.th, ph: CAM.ph };
    if (fits(G.t, G.r, G.th, G.ph, pts)) return;
    const c = new THREE.Box3().setFromPoints(pts).getCenter(V3(0, 0, 0)), t = G.t.clone().lerp(c, 0.75);
    let r = Math.max(G.r, 3);
    for (let i = 0; i < 16 && !fits(t, r, G.th, G.ph, pts); i++) r *= 1.1;
    CAM.goal = { t, r: Math.min(r, 16), th: G.th, ph: G.ph };
  }

  function bindPointer() {
    canvas.addEventListener("pointerdown", e => {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      if (handMode()) { iaDown(e); return; }
      CAM.ptr.set(e.pointerId, [e.clientX, e.clientY]); CAM.moved = 0; CAM.down = [e.clientX, e.clientY];
    });
    canvas.addEventListener("pointermove", e => {
      if (handMode()) { iaMove(e); return; }
      if (!CAM.ptr.has(e.pointerId)) { hoverPick(e); return; }
      const [px, py] = CAM.ptr.get(e.pointerId);
      if (CAM.ptr.size === 1) {
        const dx = e.clientX - px, dy = e.clientY - py; CAM.moved += Math.abs(dx) + Math.abs(dy);
        if (CAM.moved > 4) { CAM.goal = null; CAM.vt = -dx * 0.005; CAM.vp = -dy * 0.004; }
      } else if (CAM.ptr.size === 2) {
        CAM.ptr.set(e.pointerId, [e.clientX, e.clientY]);
        const [a, b] = [...CAM.ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (CAM.pinch) { CAM.goal = null; CAM.r = U.clamp(CAM.r * CAM.pinch / d, 1.6, 16); }
        CAM.pinch = d; CAM.moved = 99; return;
      }
      CAM.ptr.set(e.pointerId, [e.clientX, e.clientY]);
    });
    const up = e => {
      if (handMode()) { CAM.ptr.delete(e.pointerId); iaUp(e); return; }
      const was = CAM.ptr.has(e.pointerId); CAM.ptr.delete(e.pointerId); if (CAM.ptr.size < 2) CAM.pinch = 0;
      if (was && CAM.moved < 6 && e.type === "pointerup") clickPick(e);
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", e => { e.preventDefault(); CAM.goal = null; CAM.r = U.clamp(CAM.r * (1 + Math.sign(e.deltaY) * 0.1), 1.6, 16); }, { passive: false });
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickAt(e) {
    if (!picks.size) return null;
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const list = [...picks];
    const hits = ray.intersectObjects(list.map(p => p.obj), true);
    for (const h of hits) { let o = h.object; while (o) { const p = list.find(q => q.obj === o); if (p) return p; o = o.parent; } }
    return null;
  }
  function hoverPick(e) { if (!picks.size) { canvas.style.cursor = ""; return; } canvas.style.cursor = pickAt(e) ? "pointer" : ""; }
  function clickPick(e) { const p = pickAt(e); if (p) p.cb(p.obj); }

  function label(target, html, o = {}) {
    const el = U.el("div", { class: "lbl3d lb-lbl " + (o.cls || "") }, html);
    lblLayer.appendChild(el);
    const l = { el, target, dy: o.dy || 0, set(h) { el.innerHTML = h; return l; }, cls(c) { el.className = "lbl3d lb-lbl " + c; return l; }, remove() { el.remove(); labels.delete(l); } };
    labels.add(l); return l;
  }
  function updateLabels() {
    if (!labels.size) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of labels) {
      if (l.target.isObject3D) l.target.getWorldPosition(tmpV); else tmpV.copy(l.target);
      tmpV.y += l.dy; tmpV.project(camera);
      const vis = tmpV.z > -1 && tmpV.z < 1 && Math.abs(tmpV.x) < 1.15 && Math.abs(tmpV.y) < 1.15;
      l.el.style.display = vis ? "" : "none";
      if (vis) l.el.style.transform = `translate(${((tmpV.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-tmpV.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
  function ring(pos, r = 0.6) {
    const m = mesh(new THREE.RingGeometry(r * 0.86, r, 48), new THREE.MeshBasicMaterial({ color: 0x4fc8dc, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }), pos.x, (pos.y || 0) + 0.01, pos.z, expGroup);
    m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.userData.t = 0; rings.add(m);
    return { remove() { rings.delete(m); expGroup.remove(m); m.geometry.dispose(); } };
  }
  function tickRings(dt) { for (const m of rings) { m.userData.t += dt; const s = 1 + 0.06 * Math.sin(m.userData.t * 4); m.scale.set(s, s, 1); m.material.opacity = 0.45 + 0.3 * Math.sin(m.userData.t * 4); } }

  /* ------------------------------------------------------------------
     اليد: تُمسك الأداة فتتبع المؤشر أو الإصبع، وتوضع على الهدف المضيء،
     أو يُضغط مطولاً فوقه للصب، أو تُسحب على خط القص، أو تُدار للطحن.
  ------------------------------------------------------------------ */
  class Skip extends Error { constructor() { super("skip"); this.skip = true; } }
  const IA = { mode: null, held: null, planeY: 1.3, lift: 0, p: V3(0, 0, 0), pressed: false, zones: [], hz: null, pz: null, tilt: 0, opt: {}, autoP: false, autoAll: false, count: 0, need: 0 };
  const hPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const handMode = () => !!(IA.mode && IA.mode !== "press" && IA.held);
  function planeAt(e, y) {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera); hPlane.constant = -y;
    return ray.ray.intersectPlane(hPlane, V3(0, 0, 0));
  }
  function zone(item, o = {}) {
    const g = item.g || item; g.updateMatrixWorld(true);
    const p = o.pos ? V3(...(o.pos.isVector3 ? o.pos.toArray() : o.pos)) : g.getWorldPosition(V3(0, 0, 0));
    const { pos, top, ...rest } = o;
    return Object.assign({ item, liq: item.liq, done: false, r: Math.max(0.3, (item.r || 0.3) * 1.2) }, rest, { pos: p, top: p.y + (top ?? item.h ?? 1) });
  }
  const zMat = () => new THREE.MeshBasicMaterial({ color: 0x4fc8dc, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
  function zoneRing(z) {
    let m;
    if (z.halo) { m = mesh(new THREE.SphereGeometry(z.r, 20, 14), zMat(), z.pos.x, z.pos.y, z.pos.z, expGroup); m.material.opacity = 0.25; }
    else { m = mesh(new THREE.RingGeometry(z.r * 0.8, z.r, 44), zMat(), z.pos.x, z.pos.y + 0.012, z.pos.z, expGroup); m.rotation.x = -Math.PI / 2; }
    m.renderOrder = 6; m.userData.t = Math.random() * 6; z.ring = m;
    if (z.label) z.lbl = label(V3(z.pos.x, z.halo ? z.pos.y + z.r : z.top + 0.25, z.pos.z), z.label, { cls: "dose tgt" });
  }
  function ringsTick(dt) {
    for (const z of IA.zones) {
      const m = z.ring; if (!m) continue;
      m.visible = !z.done; if (z.lbl) z.lbl.el.hidden = !!z.done;
      m.userData.t += dt;
      const hov = z === IA.hz && !z.done, s = hov ? 1.14 : 1 + 0.06 * Math.sin(m.userData.t * 4);
      m.scale.set(s, s, z.halo ? s : 1); m.material.color.set(hov ? 0x93dd8a : 0x4fc8dc);
      m.material.opacity = z.halo ? (hov ? 0.4 : 0.16 + 0.1 * Math.sin(m.userData.t * 4)) : (hov ? 0.95 : 0.5 + 0.28 * Math.sin(m.userData.t * 4));
    }
  }
  function clearZones() {
    IA.zones.forEach(z => { if (z.ring) { expGroup.remove(z.ring); z.ring.geometry.dispose(); z.ring.material.dispose(); z.ring = null; } if (z.lbl) { z.lbl.remove(); z.lbl = null; } });
    IA.zones = []; IA.hz = null;
  }
  function zoneAt(p) {
    let best = null, bd = 1e9;
    for (const z of IA.zones) { if (z.done) continue; const d = Math.hypot(p.x - z.pos.x, p.z - z.pos.z); if (d < z.r * 1.3 && d < bd) { best = z; bd = d; } }
    return best;
  }
  /* سطر المهمة الحالية داخل البطاقة مع زر «نفّذها عني» */
  function taskBox() {
    const a = $("lb-act"); if (!a) return null;
    let t = a.querySelector(".lb-task");
    if (!t) { t = U.el("div", { class: "lb-task" }, `${ic("hand")}<span class="lb-task-t"></span><div class="lb-helps"></div><div class="lb-prog" hidden><i></i></div>`); a.prepend(t); }
    return t;
  }
  function setTask(hint) { const t = taskBox(); if (t) { t.hidden = false; t.querySelector(".lb-task-t").innerHTML = hint || ""; } const c = U.$("#lb-chip span"); if (c) c.textContent = (hint || "").replace(/<[^>]+>/g, ""); }
  function addHelp(lbl, fn, cls = "") {
    const t = taskBox(); if (!t) return { remove() {} };
    const b = U.el("button", { type: "button", class: "lb-help " + cls }, lbl); b.onclick = fn; t.querySelector(".lb-helps").appendChild(b);
    t.hidden = false;
    return { remove() { b.remove(); tidyTask(); } };
  }
  function tidyTask() { const t = U.$("#lb-act .lb-task"); if (!t) return; t.hidden = !t.querySelector(".lb-task-t").textContent.trim() && !t.querySelector(".lb-help"); }
  function setProg(f) { const t = taskBox(); if (!t) return; const pr = t.querySelector(".lb-prog"); pr.hidden = f == null; if (f != null) pr.firstChild.style.width = Math.round(U.clamp(f, 0, 1) * 100) + "%"; }
  function waitMode(mode, o, setup) {
    return new Promise((res, rej) => {
      const tok = S.tok;
      IA.mode = mode; IA.opt = o; IA.res = res; IA.rej = rej; IA.count = 0; IA.autoP = false;
      setup();
      const pts = [];
      IA.zones.forEach(z => { pts.push(z.pos.clone()); if (z.top != null) pts.push(V3(z.pos.x, z.top, z.pos.z)); });
      (IA.pts || []).forEach(q => pts.push(q.p));
      frameFor(pts);
      setTask(o.hint);
      IA.help = o.help === false ? null : addHelp(o.helpLabel || "نفّذها عني", () => skipNow());
      $("lb-stage").classList.toggle("holding", handMode());
      IA.chk = setInterval(() => { if (tok !== S.tok) { endMode(); rej(new Cancel()); } }, 300);
      if (IA.autoAll) setTimeout(() => skipNow(), 40);
    });
  }
  function endMode() {
    clearInterval(IA.chk); IA.mode = null; IA.pressed = false; IA.autoP = false; IA.pz = null;
    clearZones(); picks.clear();
    if (IA.help) { IA.help.remove(); IA.help = null; }
    if (IA.stream) IA.stream.visible = false;
    if (IA.guide) { expGroup.remove(IA.guide); const c = IA.guide.children[0]; if (c) { c.geometry.dispose(); c.material.dispose(); } IA.guide = null; }
    (IA.marks || []).forEach(m => { expGroup.remove(m); m.geometry.dispose(); }); IA.marks = []; IA.pts = null;
    setProg(null); const t = U.$("#lb-act .lb-task .lb-task-t"); if (t) t.textContent = ""; tidyTask();
    $("lb-stage").classList.remove("holding");
    canvas.style.cursor = "";
  }
  function finishMode(v) { const r = IA.res; IA.res = null; endMode(); if (r) r(v); }
  function skipNow() { if (!IA.mode || IA.autoP) return; IA.autoP = true; if (IA.help) { IA.help.remove(); IA.help = null; } Promise.resolve(IA.onSkip && IA.onSkip()).catch(() => {}); }
  /* المسك والإرجاع */
  async function grab(item, o = {}) {
    if (IA.held && IA.held !== item) await letGo();
    const g = item.g;
    IA.par0 = g.parent; expGroup.attach(g);
    IA.held = item; IA.home = g.position.clone(); IA.rot0 = g.rotation.clone();
    IA.planeY = o.y ?? (g.position.y + 1.2); IA.lift = 0; IA.tilt = 0; IA.wob = 0;
    IA.p.set(g.position.x, IA.planeY, g.position.z);
    await anim(0.35, k => { g.position.y = U.lerp(IA.home.y, IA.planeY, EASE.out(k)); g.rotation.x = U.lerp(IA.rot0.x, o.rx ?? 0, k); g.rotation.z = U.lerp(IA.rot0.z, 0, k); });
    IA.rotZ0 = 0;
  }
  async function letGo(o = {}) {
    const it = IA.held; if (!it) return;
    IA.held = null; IA.tilt = 0;
    const to = o.to || IA.home, par = o.parent || IA.par0;
    await arcTo(it.g, Array.isArray(to) ? to : [to.x, to.y, to.z], 0.3, 0.55);
    it.g.rotation.copy(o.to ? new THREE.Euler(0, IA.rot0.y, 0) : IA.rot0);
    if (par && par !== expGroup && !o.to) par.attach(it.g);
  }
  function handTick(dt) {
    ringsTick(dt);
    const it = IA.held; if (!it || !IA.mode || IA.mode === "press") return;
    const g = it.g, H = it.mouth ? it.mouth.y : (it.h || 1);
    const pouring = IA.mode === "pour" && IA.pressed && IA.hz && !IA.hz.done;
    if (pouring) IA.pz = IA.hz;
    IA.tilt += ((pouring ? 1 : 0) - IA.tilt) * Math.min(1, dt * (pouring ? 5 : 7));
    const th = IA.tilt * (it.tiltMax || 1.7);
    let tx = IA.p.x, ty = IA.planeY + IA.lift, tz = IA.p.z;
    if (IA.tilt > 0.002 && IA.pz) {
      const z = IA.pz, mx = z.pos.x + 0.05, my = z.top + 0.1, s = EASE.io(Math.min(1, IA.tilt * 1.15));
      tx = U.lerp(tx, mx + Math.sin(th) * H, s); ty = U.lerp(ty, my - Math.cos(th) * H, s); tz = U.lerp(tz, z.pos.z, s);
    }
    if (IA.mode === "grind" && IA.gc) { const dx = tx - IA.gc.x, dz = tz - IA.gc.z, d = Math.hypot(dx, dz), m = IA.opt.r || 0.2; if (d > m) { tx = IA.gc.x + dx / d * m; tz = IA.gc.z + dz / d * m; } }
    const k = 1 - Math.exp(-dt * 18);
    g.position.x += (tx - g.position.x) * k; g.position.y += (ty - g.position.y) * k; g.position.z += (tz - g.position.z) * k;
    if (IA.mode === "scrub" && IA.pressed) IA.wob = Math.sin(performance.now() / 70) * 0.25; else IA.wob *= 0.8;
    g.rotation.z = th + (it.restZ || 0);
    if (it.blades) it.blades(IA.mode === "scrub" && IA.pressed ? 0.5 + 0.5 * Math.sin(performance.now() / 90) : 0.6);
    if (IA.mode === "pour") pourTick(dt);
  }
  function pourTick(dt) {
    const z = IA.pz, o = IA.opt, it = IA.held;
    if (!IA.stream) {
      const sg = new THREE.CylinderGeometry(0.018, 0.026, 1, 10); sg.translate(0, -0.5, 0);
      IA.stream = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xd9eef2, transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false }));
      IA.stream.renderOrder = 2; scene.add(IA.stream);
    }
    const active = IA.pressed && z && IA.hz === z && !z.done && IA.tilt > 0.72;
    IA.stream.visible = active; if (!active) return;
    IA.stream.material.color.set(o.color ?? 0xd9eef2);
    it.g.updateMatrixWorld(true);
    const H = it.mouth ? it.mouth.y : (it.h || 1), mouth = it.g.localToWorld(V3(0, H, 0));
    const lv = Math.min(z.to, z.liq.h + (z.rate || o.rate || 0.45) * dt * speed);
    if (o.dstColor != null || z.dstColor != null) {
      if (!z.c0) { z.c0 = z.liq.mat.color.clone(); z.o0 = z.liq.h > 0.02 ? z.liq.mat.opacity : (z.dstOpacity ?? o.dstOpacity ?? z.liq.mat.opacity); z.h0 = z.liq.h; }
      const f = U.clamp((lv - z.h0) / Math.max(1e-3, z.to - z.h0), 0, 1), c1 = new THREE.Color(z.dstColor ?? o.dstColor);
      z.liq.mat.color.copy(z.c0).lerp(c1, z.h0 < 0.02 ? 1 : f); z.liq.mat.opacity = U.lerp(z.o0, z.dstOpacity ?? o.dstOpacity ?? z.o0, z.h0 < 0.02 ? 1 : f);
    }
    z.liq.set(lv);
    const surf = z.pos.y + (z.liqY || 0) + lv;
    IA.stream.position.set(mouth.x - 0.04, mouth.y, mouth.z); IA.stream.scale.y = Math.max(0.02, mouth.y - surf);
    if (it.liq && o.srcRate) it.liq.set(Math.max(o.srcMin ?? 0.04, it.liq.h - o.srcRate * dt * speed));
    if (lv >= z.to - 1e-4) {
      z.done = true; IA.stream.visible = false; IA.count++;
      o.onDone && o.onDone(z);
      if (z._r) z._r();
      if (IA.count >= IA.need) setTimeout(() => finishMode(z), 250);
    }
  }
  function iaDown(e) {
    if (e.cancelable) e.preventDefault();
    if (IA.autoP) return;
    IA.pressed = true;
    const p = planeAt(e, IA.planeY); if (p) { IA.prev = IA.p.clone(); IA.p.copy(p); }
    IA.hz = zoneAt(IA.p);
    if (IA.mode === "scrub") scrubAt(IA.p);
  }
  function iaMove(e) {
    if (IA.autoP) return;
    if (e.pointerType !== "mouse" && !IA.pressed) return;
    const p = planeAt(e, IA.planeY); if (!p) return;
    const prev = IA.p.clone(); IA.p.copy(p);
    IA.hz = zoneAt(p);
    canvas.style.cursor = IA.pressed ? "grabbing" : "grab";
    if (IA.mode === "scrub" && IA.pressed) scrubAt(p, prev);
    if (IA.mode === "grind" && IA.pressed) grindAt(prev, p);
  }
  function iaUp(e) {
    if (IA.autoP) return;
    const was = IA.pressed; IA.pressed = false;
    if (IA.mode === "drop" && was) {
      const p = planeAt(e, IA.planeY); if (p) IA.p.copy(p);
      const z = zoneAt(IA.p);
      if (z) finishMode(z); else toast(IA.opt.miss || "ضع الأداة على الهدف المضيء");
    }
    if (IA.mode === "pour" && was && !IA.count && !IA.hz) toast("حرّك الأداة فوق الهدف المضيء ثم اضغط مطولاً");
  }
  /* أنواع المهام */
  function dropOn(zs, o = {}) {
    const list = [].concat(zs);
    return waitMode("drop", o, () => {
      IA.zones = list; list.forEach(z => { z.done = false; zoneRing(z); });
      IA.planeY = o.y ?? Math.max(...list.map(z => z.top)) + (o.above ?? 0.3);
      IA.onSkip = async () => { const z = list[0]; IA.p.set(z.pos.x, IA.planeY, z.pos.z); IA.hz = z; await sleep(0.45); finishMode(z); };
    });
  }
  function pourInto(zs, o = {}) {
    const list = [].concat(zs);
    return waitMode("pour", o, () => {
      IA.zones = list; list.forEach(z => { z.done = z.liq.h >= z.to - 1e-3; zoneRing(z); });
      IA.need = list.filter(z => !z.done).length;
      IA.planeY = o.y ?? Math.max(...list.map(z => z.top)) + (o.above ?? 0.4);
      if (!IA.need) setTimeout(() => finishMode(null), 30);
      IA.onSkip = async () => {
        for (const z of list) {
          if (z.done) continue;
          IA.p.set(z.pos.x, IA.planeY, z.pos.z); IA.hz = z; IA.pressed = true;
          await new Promise(r => { z._r = r; });
          IA.pressed = false; IA.hz = null; await sleep(0.2);
        }
      };
    });
  }
  function scrub(pts, o = {}) {
    return waitMode("scrub", o, () => {
      IA.planeY = o.y ?? 0.3;
      IA.pts = pts.map(q => ({ p: V3(...q), hit: false })); IA.marks = [];
      /* خط القص: نقاط بيضاء فوق كل شيء، تصير بنية حين يمر عليها المقص */
      IA.guide = new THREE.Group(); IA.guide.renderOrder = 7; expGroup.add(IA.guide);
      const dg = new THREE.SphereGeometry(0.016, 8, 6), dm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false });
      IA.pts.forEach(q => { const m = new THREE.Mesh(dg, dm); m.position.copy(q.p); m.renderOrder = 7; IA.guide.add(m); q.dot = m; });
      const a = IA.pts[0].p; IA.zones = [Object.assign({ pos: V3(a.x, a.y - 0.02, a.z), r: 0.07, top: a.y }, {})]; zoneRing(IA.zones[0]);
      setProg(0);
      IA.onSkip = async () => { for (const q of IA.pts) { IA.p.set(q.p.x, IA.planeY, q.p.z); IA.pressed = true; scrubHit(q); await sleep(0.03); } IA.pressed = false; scrubCheck(true); };
    });
  }
  const cutMat = new THREE.MeshBasicMaterial({ color: 0x3b2614 });
  function scrubHit(q) { if (q.hit) return; q.hit = true; if (q.dot) q.dot.visible = false; const m = mesh(new THREE.SphereGeometry(0.014, 6, 4), cutMat, q.p.x, q.p.y, q.p.z, expGroup); IA.marks.push(m); }
  function scrubAt(p) { for (const q of IA.pts || []) if (!q.hit && Math.hypot(p.x - q.p.x, p.z - q.p.z) < (IA.opt.tol || 0.11)) scrubHit(q); scrubCheck(); }
  function scrubCheck(force) { if (!IA.pts) return; const f = IA.pts.filter(q => q.hit).length / IA.pts.length; setProg(f); IA.opt.onProgress && IA.opt.onProgress(f); if ((f >= 0.85 || force) && IA.mode === "scrub") finishMode(true); }
  function grind(center, o = {}) {
    return waitMode("grind", o, () => {
      IA.planeY = o.y ?? 0.4; IA.gc = V3(...center); IA.acc = 0; IA.need = (o.turns || 3) * Math.PI * 2;
      IA.zones = [{ pos: V3(center[0], center[1] - 0.3, center[2]), r: o.ring || 0.42, top: center[1] }]; zoneRing(IA.zones[0]);
      setProg(0);
      IA.onSkip = async () => { await anim(1.6, k => { const a = k * Math.PI * 6; IA.p.set(IA.gc.x + Math.cos(a) * 0.15, IA.planeY, IA.gc.z + Math.sin(a) * 0.15); setProg(k); o.onProgress && o.onProgress(k); }, EASE.lin); finishMode(true); };
    });
  }
  function grindAt(prev, p) {
    const c = IA.gc; if (Math.hypot(p.x - c.x, p.z - c.z) > (IA.opt.reach || 0.7)) return;
    let d = Math.atan2(p.z - c.z, p.x - c.x) - Math.atan2(prev.z - c.z, prev.x - c.x);
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    IA.acc += Math.min(Math.abs(d), 0.8); const f = IA.acc / IA.need; setProg(f); IA.opt.onProgress && IA.opt.onProgress(Math.min(1, f));
    if (f >= 1) finishMode(true);
  }
  /* ضغط على جزء من جهاز (زر، باب، مقبض) أو على جسم لالتقاطه */
  function press(items, o = {}) {
    return waitMode("press", Object.assign({ helpLabel: o.label || "نفّذها عني" }, o), () => {
      items.forEach(it => {
        const obj = it.obj, val = it.value ?? obj;
        picks.add({ obj, cb: () => finishMode(val) });
        obj.updateMatrixWorld(true);
        const wp = obj.getWorldPosition(V3(0, 0, 0));
        const z = it.halo ? { pos: wp, r: it.r || 0.22, halo: true, label: it.label } : { pos: V3(wp.x, it.y0 ?? wp.y, wp.z), r: it.r || 0.4, top: wp.y + (it.h || 1), label: it.label };
        zoneRing(z); IA.zones.push(z);
      });
      IA.onSkip = async () => { await sleep(0.2); finishMode(items[0].value ?? items[0].obj); };
    });
  }
  async function takeFrom(items, o = {}) {
    const it = await press(items.map(x => ({ obj: x.g, value: x, r: o.r || Math.max(0.3, (x.r || 0.3) * 1.25), h: x.h })), Object.assign({ hint: "اضغط على الوعاء المضيء لتمسكه" }, o));
    await grab(it, o);
    return it;
  }
  /* تكرار مهمة على عدة أوعية، مع زر «أكمل الباقي تلقائياً» بعد أول مرات */
  async function repeat(list, fn, o = {}) {
    const after = o.autoAfter ?? 1; let btn = null;
    try {
      for (let i = 0; i < list.length; i++) {
        if (i >= after && !btn && !IA.autoAll) btn = addHelp(o.autoLabel || "أكمل الباقي تلقائياً", () => { IA.autoAll = true; if (btn) { btn.remove(); } skipNow(); }, "all");
        await fn(list[i], i);
      }
    } finally { if (btn) btn.remove(); IA.autoAll = false; }
  }
  function hitbox(parent, x, y, z, r = 0.14) { return mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ visible: false }), x, y, z, parent); }

  function frame(dt) { tickAnims(dt); camTick(dt); tickRings(dt); handTick(dt); updateLabels(); }

  /* ------------------------------------------------------------------
     واجهة التجربة: البطاقة والصينية والدفتر والرسم والنتائج
  ------------------------------------------------------------------ */
  const S = { exp: null, i: 0, busy: false, done: new Set(), phase: "", hintT: 0, chart: null, finished: false };
  const $ = id => U.$("#" + id);

  function toast(msg) { const t = $("lb-toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 3400); }

  function renderPicker() {
    const box = $("lb-picker");
    box.innerHTML = LAB.EXPS.map(e => `<button type="button" class="lb-pick${S.exp && S.exp.id === e.id ? " on" : ""}" data-x="${e.id}" style="--hue:${e.hue}" aria-pressed="${S.exp && S.exp.id === e.id}">
      <span class="lb-pick-ic">${ic(e.icon)}</span>
      <span class="lb-pick-t"><small>${U.esc(e.cat)}</small><b>${U.esc(e.title)}</b><span>${U.esc(e.blurb)}</span></span></button>`).join("");
  }
  function renderTray() {
    const E = S.exp, st = E.steps[S.i];
    $("lb-tray").innerHTML = E.tools.map(t => `<button type="button" class="lb-tool${st && st.tool === t.id && S.phase === "tool" && S.hint ? " hint" : ""}${S.usedTools.has(t.id) ? " used" : ""}" data-tool="${t.id}" title="${U.esc(t.name)}"><span class="lb-tool-ic">${ic(t.icon)}</span><span>${U.esc(t.name)}</span></button>`).join("");
  }
  function renderProgress() {
    const E = S.exp, n = E.steps.length;
    $("lb-segs").innerHTML = E.steps.map((s, i) => `<i class="${S.done.has(i) ? "done" : i === S.i ? "cur" : ""}" title="${U.esc(s.t)}"></i>`).join("");
    $("lb-steplbl").textContent = `${S.i + 1} من ${n} · ${E.steps[S.i].t}`;
    const hint = IA.mode && IA.opt && IA.opt.hint ? String(IA.opt.hint).replace(/<[^>]+>/g, "") : "";
    $("lb-chip").innerHTML = `<b>${S.i + 1} من ${n} · ${U.esc(E.steps[S.i].t)}</b><span>${S.done.has(S.i) ? "اكتملت الخطوة" : hint ? U.esc(hint) : S.busy ? "جارٍ التنفيذ…" : S.phase === "tool" ? "اختر الأداة من الصينية" : ""}</span>`;
  }
  const textOf = (v, L) => typeof v === "function" ? v(L) : (v || "");
  function renderCard() {
    const E = S.exp, st = E.steps[S.i], n = E.steps.length;
    const toolName = st.tool ? (E.tools.find(t => t.id === st.tool) || {}).name : "";
    $("lb-card").innerHTML = `
      <div class="lb-k">الخطوة ${S.i + 1} من ${n}</div>
      <h3>${U.esc(st.t)}</h3>
      <div class="lb-say">${textOf(st.say, API)}</div>
      <div class="lb-act" id="lb-act">${st.tool && !S.done.has(S.i) ? `<div class="lb-need">${ic("hand")}<span>اختر الأداة المناسبة من صينية الأدوات تحت المختبر</span><button type="button" class="lb-hint-btn" id="lb-hint">تلميح</button></div>` : ""}</div>
      <div class="lb-next-row" id="lb-next-row"></div>
      ${st.info ? `<div class="lb-info">${ic("info")}<div><b>معلومة</b> ${textOf(st.info, API)}</div></div>` : ""}`;
    const hb = $("lb-hint"); if (hb) hb.onclick = () => { S.hint = true; renderTray(); toast(`الأداة المطلوبة: ${toolName}`); };
    if (!st.tool && !S.done.has(S.i)) {
      if (st.auto) runStep();
      else $("lb-next-row").innerHTML = `<button type="button" class="btn btn-primary" id="lb-do">${st.act ? ic(st.actIcon || "play") : ""}${U.esc(st.act || "فهمت، التالي")}${st.act ? "" : " " + ic("left")}</button>`;
      const b = $("lb-do"); if (b) b.onclick = () => { if (!st.run && !st.act) { S.done.add(S.i); goNext(); } else runStep(); };
    }
    if (S.done.has(S.i)) showNext();
  }
  function showNext() {
    const last = S.i >= S.exp.steps.length - 1;
    const lbl = last ? "اعرض النتائج والاستنتاج" : "الخطوة التالية";
    const row = $("lb-next-row"); if (row) row.innerHTML = `<button type="button" class="btn btn-primary" id="lb-next">${U.esc(lbl)} ${ic("left")}</button>`;
    const b = $("lb-next"); if (b) { b.onclick = goNext; if (!U.reduced && document.activeElement && document.activeElement.closest && document.activeElement.closest("#lb-card")) b.focus({ preventScroll: true }); }
    const sn = $("lb-stage-next"); sn.hidden = false; sn.innerHTML = `${U.esc(lbl)} ${ic("left")}`;
    renderProgress();
  }
  function goNext() {
    if (S.busy) return;
    $("lb-stage-next").hidden = true;
    if (S.i >= S.exp.steps.length - 1) { showResults(); return; }
    enterStep(S.i + 1);
  }
  function enterStep(i) {
    S.i = i; S.hint = false; clearTimeout(S.hintT);
    const st = S.exp.steps[i];
    S.phase = S.done.has(i) ? "done" : st.tool ? "tool" : st.act ? "act" : "auto";
    $("lb-stage-next").hidden = true;
    if (st.cam) camTo(S.exp.views[st.cam]);
    renderCard(); renderTray(); renderProgress();
    if (S.phase === "tool") S.hintT = setTimeout(() => { if (S.i === i && S.phase === "tool") { S.hint = true; renderTray(); } }, 9000);
    if (st.ring) { const r = st.ring(API); if (r) S.ringH = ring(r.pos, r.r); }
  }
  async function runStep() {
    if (S.busy) return;
    const i = S.i, st = S.exp.steps[i], tok = S.tok;
    S.busy = true; S.phase = "run"; clearTimeout(S.hintT);
    if (st.tool) S.usedTools.add(st.tool);
    if (S.ringH) { S.ringH.remove(); S.ringH = null; }
    const nr = $("lb-next-row"); if (nr) nr.innerHTML = "";
    const need = U.$("#lb-act .lb-need"); if (need) need.remove();
    renderTray(); renderProgress(); $("lb-stage").classList.add("busy");
    try {
      if (st.run) await st.run(API);
      if (tok !== S.tok) return;
      S.done.add(i); S.phase = "done";
      if (st.done) { const d = U.el("div", { class: "lb-done" }, `${ic("check")}<span>${textOf(st.done, API)}</span>`); const a = $("lb-act"); if (a) a.appendChild(d); }
      showNext();
    } catch (e) {
      if (!(e && e.cancel)) { console.error(e); toast("حدث خطأ في هذه الخطوة. اضغط «ابدأ من جديد»."); }
    } finally {
      if (tok === S.tok) { S.busy = false; $("lb-stage").classList.remove("busy"); renderProgress(); }
    }
  }
  function onTool(id) {
    const E = S.exp, st = E.steps[S.i], t = E.tools.find(x => x.id === id);
    if (S.busy) { toast(IA.held ? "الأداة في يدك الآن: استعملها على الهدف المضيء في المختبر." : "انتظر حتى تنتهي الخطوة الحالية."); return; }
    if (S.phase !== "tool") { toast(S.done.has(S.i) ? "اكتملت هذه الخطوة. اضغط «الخطوة التالية»." : "هذه الخطوة لا تحتاج أداة من الصينية."); return; }
    if (id === st.tool) { runStep(); return; }
    toast(t && t.why ? `«${t.name}»: ${t.why}` : `ليست «${t ? t.name : ""}» الأداة المطلوبة الآن. فكّر بما تقوله الخطوة.`);
  }

  /* الدفتر */
  const NB = {
    cols(c) { NB.c = c; NB.rows = new Map(); $("lb-nb").innerHTML = `<thead><tr>${c.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody></tbody>`; $("lb-nb-empty").hidden = false; },
    row(key, cells, o = {}) {
      const tb = U.$("#lb-nb tbody"); let tr = NB.rows.get(key);
      if (!tr) { tr = document.createElement("tr"); tb.appendChild(tr); NB.rows.set(key, tr); }
      tr.innerHTML = cells.map(x => `<td>${x}</td>`).join("");
      $("lb-nb-empty").hidden = true;
      if (o.hl !== false && !U.reduced) { tr.classList.remove("flash"); void tr.offsetWidth; tr.classList.add("flash"); }
      return tr;
    },
    clear() { NB.cols(NB.c || []); }
  };
  /* الرسم */
  function chart(cfg, title, sub) {
    if (S.chart) { S.chart.destroy(); S.chart = null; }
    if (title != null) $("lb-chart-t").textContent = title;
    $("lb-chart-s").textContent = sub || "";
    const cv = $("lb-chart");
    if (!window.Chart || !cfg) { cv.hidden = true; return null; }
    cv.hidden = false;
    try { S.chart = new Chart(cv, cfg); } catch (e) { console.error(e); S.chart = null; }
    return S.chart;
  }
  /* الساعة: تمثيل مدة حقيقية بثوانٍ قليلة */
  function fmtDur(m) { if (m >= 1440) return [m / 1440, "أيام"]; if (m >= 60) return [m / 60, "ساعة"]; return [m, "دقيقة"]; }
  async function wait({ mins, sec = 5, label: lbl = "الانتظار", text }) {
    const box = $("lb-clock"), [tot, unit] = mins ? fmtDur(mins) : [0, ""], d = mins >= 1440 ? 1 : mins >= 60 && mins < 600 ? 1 : 0;
    box.hidden = false;
    const draw = k => { box.innerHTML = `${ic("clock")}<div><b>${U.esc(lbl)}</b><span>${mins ? `<bdi class="num" dir="ltr">${U.fmt(tot * k, d)}</bdi> من <bdi class="num" dir="ltr">${U.fmt(tot, d)}</bdi> ${unit}` : U.esc(text || "")}</span><i style="--k:${k.toFixed(3)}"></i></div>`; };
    draw(0);
    try { await anim(sec, (e, k) => draw(k), EASE.lin); } finally { box.hidden = true; }
  }
  /* أزرار داخل البطاقة تنتظر اختيار المستخدم */
  function ask(opts, o = {}) {
    return new Promise((res, rej) => {
      const a = $("lb-act"); if (!a) return rej(new Cancel());
      const box = U.el("div", { class: "lb-ask" + (o.grid ? " grid" : "") });
      if (o.q) box.appendChild(U.el("p", { class: "lb-q" }, o.q));
      const row = U.el("div", { class: "lb-ask-row" }); box.appendChild(row);
      opts.forEach(op => {
        const b = U.el("button", { type: "button", class: "btn " + (op.primary ? "btn-primary" : "btn-ghost") + " btn-sm" }, `${op.icon ? ic(op.icon) : ""}${op.label}`);
        b.onclick = () => { if (o.keep) { res(op.value ?? op.label); return; } box.remove(); res(op.value ?? op.label); };
        row.appendChild(b);
      });
      a.appendChild(box); S.askBox = box;
      const tok = S.tok; const chk = setInterval(() => { if (tok !== S.tok) { clearInterval(chk); rej(new Cancel()); } }, 300);
    });
  }
  function pick(objs, o = {}) {
    return new Promise((res, rej) => {
      const tok = S.tok;
      objs.forEach(ob => picks.add({ obj: ob.obj, cb: () => { picks.clear(); res(ob.value); } }));
      const chk = setInterval(() => { if (tok !== S.tok) { clearInterval(chk); picks.clear(); rej(new Cancel()); } if (!picks.size) clearInterval(chk); }, 300);
    });
  }

  /* اختيار بالأزرار أو بالنقر على جسم في المشهد، أيهما أولاً */
  function choose(opts, objs = [], o = {}) {
    return new Promise((res, rej) => {
      const a = $("lb-act"); if (!a) return rej(new Cancel());
      const tok = S.tok, box = U.el("div", { class: "lb-ask grid" });
      if (o.q) box.appendChild(U.el("p", { class: "lb-q" }, o.q));
      const row = U.el("div", { class: "lb-ask-row" }); box.appendChild(row);
      let doneF = false;
      const finish = v => { if (doneF) return; doneF = true; picks.clear(); box.remove(); clearInterval(chk); res(v); };
      opts.forEach(op => { const b = U.el("button", { type: "button", class: "btn btn-ghost btn-sm" }, op.label); b.onclick = () => finish(op.value); row.appendChild(b); });
      a.appendChild(box);
      objs.forEach(ob => picks.add({ obj: ob.obj, cb: () => finish(ob.value) }));
      const chk = setInterval(() => { if (tok !== S.tok) { clearInterval(chk); picks.clear(); rej(new Cancel()); } }, 300);
    });
  }
  /* عرض جدول أو نص داخل البطاقة أثناء الخطوة */
  function show(html) { const a = $("lb-act"); if (!a) return null; const d = U.el("div", { class: "lb-show" }, html); a.appendChild(d); return d; }

  /* التسحيح التفاعلي: اضغط مع الاستمرار لفتح الصنبور، والتدفق يبطؤ قرب نقطة النهاية */
  function titrate(o) {
    const { bur, flask, end, colors, from = 0 } = o;
    bur.g.updateMatrixWorld(true); flask.g.updateMatrixWorld(true);
    return new Promise((res, rej) => {
      const tok = S.tok, act = $("lb-act");
      const box = U.el("div", { class: "lb-titr" }, `
        <div class="lb-titr-read"><span>قراءة السحاحة</span><b class="num" id="lb-tread">${U.fmt(from, 2)}</b><small>مل</small></div>
        <button type="button" class="btn btn-primary lb-hold" id="lb-hold">${ic("drop")}<span>اضغط مع الاستمرار لفتح الصنبور</span></button>
        <label class="lb-auto"><input type="checkbox" id="lb-tauto"> سحّح تلقائياً</label>
        <p class="muted lb-titr-tip" id="lb-ttip">${U.esc(o.tip || "راقب لون المحلول وأغلق الصنبور عند تغيّره")}</p>`);
      act.appendChild(box);
      let v = from, flowing = false, auto = false, near = false, dropT = 0;
      const sw = flask.g.rotation.y;
      const btn = $("lb-hold"), rd = $("lb-tread"), tip = $("lb-ttip");
      const on = e => { e && e.preventDefault(); flowing = true; btn.classList.add("on"); };
      const off = () => { flowing = false; btn.classList.remove("on"); };
      btn.addEventListener("pointerdown", on); btn.addEventListener("pointerup", off); btn.addEventListener("pointerleave", off); btn.addEventListener("pointercancel", off);
      btn.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") on(e); });
      btn.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") off(); });
      $("lb-tauto").onchange = e => { auto = e.target.checked; };
      const lbl = label(bur.g.localToWorld(V3(0.25, bur.yB + 0.3, 0.13)), `<bdi class="num">${U.fmt(from, 2)} مل</bdi>`, { cls: "read" });
      const colorAt = f => { let a = colors[0], b = colors[colors.length - 1]; for (let i = 0; i < colors.length - 1; i++) if (f >= colors[i][0] && f <= colors[i + 1][0]) { a = colors[i]; b = colors[i + 1]; break; } const t = b[0] > a[0] ? (f - a[0]) / (b[0] - a[0]) : 1; return [new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), U.clamp(t, 0, 1)), U.lerp(a[2], b[2], U.clamp(t, 0, 1))]; };
      bur.g.updateMatrixWorld(true); flask.g.updateMatrixWorld(true);
      const tipW = bur.g.localToWorld(bur.tipLocal.clone());
      const drops = [];
      const dm = new THREE.MeshBasicMaterial({ color: o.dropColor || 0xdff3f6, transparent: true, opacity: 0.8 });
      const loop = (sdt, dt) => {
        if (tok !== S.tok) return;
        const goingOn = flowing || auto;
        if (goingOn && v < end) {
          const rem = end - v; near = rem < 0.6;
          const rate = U.clamp(rem * 0.9, 0.05, 1.3) * (auto ? 1.4 : 1);
          v = Math.min(end, v + rate * dt * speed * (U.reduced ? 4 : 1));
          bur.setRead(v); rd.textContent = U.fmt(v, 2); lbl.set(`<bdi class="num">${U.fmt(v, 2)} مل</bdi>`);
          const [c, op] = colorAt(v / end); flask.liq.mat.color.copy(c); flask.liq.mat.opacity = op;
          flask.g.rotation.y = sw + Math.sin(performance.now() / 160) * 0.06;
          dropT -= dt * speed; if (dropT <= 0) { dropT = near ? 0.35 : 0.12; const dmesh = mesh(new THREE.SphereGeometry(0.018, 8, 6), dm, tipW.x, tipW.y, tipW.z, expGroup); drops.push(dmesh); }
          if (near) tip.textContent = "اقتربت من نقطة النهاية: الصنبور يقطّر الآن قطرة قطرة";
          if (v >= end - 1e-6) finish();
        }
        for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.position.y -= dt * 3.2; if (d.position.y < flask.g.position.y + flask.liq.h + 0.02) { expGroup.remove(d); d.geometry.dispose(); drops.splice(i, 1); } }
      };
      loops.add(loop);
      const chk = setInterval(() => { if (tok !== S.tok) { clearInterval(chk); loops.delete(loop); lbl.remove(); rej(new Cancel()); } }, 300);
      function finish() {
        off(); auto = false; clearInterval(chk);
        const [c, op] = colorAt(1); flask.liq.mat.color.copy(c); flask.liq.mat.opacity = op; flask.g.rotation.y = sw;
        setTimeout(() => { loops.delete(loop); drops.forEach(d => expGroup.remove(d)); lbl.remove(); }, 600);
        box.innerHTML = `<div class="lb-titr-read done"><span>${U.esc(o.doneText || "نقطة النهاية")}</span><b class="num">${U.fmt(end, 2)}</b><small>مل</small></div>`;
        res(end);
      }
    });
  }

  /* حركات شائعة */
  const moveTo = (obj, to, dur = 1, ease = EASE.io) => { const a = obj.position.clone(), b = V3(...to); return anim(dur, k => obj.position.lerpVectors(a, b, k), ease); };
  const arcTo = (obj, to, lift = 0.8, dur = 1.2) => { const a = obj.position.clone(), b = V3(...to); return anim(dur, k => { obj.position.lerpVectors(a, b, k); obj.position.y += Math.sin(Math.PI * k) * lift; }); };
  const rotTo = (obj, r, dur = 0.6) => { const a = obj.rotation.clone(); return anim(dur, k => { obj.rotation.set(U.lerp(a.x, r[0] ?? a.x, k), U.lerp(a.y, r[1] ?? a.y, k), U.lerp(a.z, r[2] ?? a.z, k)); }); };
  /* صبّ من وعاء إلى آخر: يرتفع ويميل ويظهر خيط السائل */
  async function pourRow(src, dsts, o = {}) {
    const g = src.g, home = g.position.clone(), rot = g.rotation.clone();
    dsts.forEach(d => d.g.updateMatrixWorld(true));
    const first = dsts[0], fW = first.g.getWorldPosition(V3(0, 0, 0));
    const side = o.side ?? (home.x > fW.x ? 1 : -1);
    const H = src.mouth ? src.mouth.y : (src.h || 1), th1 = side * (o.tilt || 1.75);
    const lipOf = d => { const w = d.g.getWorldPosition(V3(0, 0, 0)); return V3(w.x + side * 0.08, w.y + (d.h || 1) + (o.above ?? 0.14), w.z); };
    const pre = V3(fW.x + side * ((src.r || 0.3) + (first.r || 0.3) + 0.3), fW.y + (first.h || 1) + 0.15, fW.z);
    const mv = o.move ?? 0.85;
    const place = (mp, th) => { g.rotation.z = rot.z + th; g.position.set(mp.x + Math.sin(th) * H, mp.y - Math.cos(th) * H, mp.z); };
    await arcTo(g, [pre.x, pre.y, pre.z], 0.3, mv);
    const m0 = pre.clone().add(V3(0, H, 0));
    let lip = lipOf(first);
    await anim(o.tiltDur ?? 0.55, k => place(m0.clone().lerp(lip, k), th1 * k));
    const sl0 = src.liq ? src.liq.h : 0, n = dsts.length;
    const slEnd = o.srcTo ?? Math.max(0, sl0 - (o.srcDrop ?? 0.22) * n);
    for (let i = 0; i < n; i++) {
      const d = dsts[i];
      if (i) { const nl = lipOf(d), pl = lip.clone(); await anim(o.glide ?? 0.45, k => place(pl.clone().lerp(nl, k), th1)); lip = nl; }
      const to = Array.isArray(o.to) ? o.to[i] : o.to, dc = Array.isArray(o.dstColor) ? o.dstColor[i] : o.dstColor;
      const dW = d.g.getWorldPosition(V3(0, 0, 0));
      const sm = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color ?? 0xd9eef2), transparent: true, opacity: o.streamOpacity ?? 0.6, roughness: 0.1, depthWrite: false });
      const sg = new THREE.CylinderGeometry(0.018, 0.026, 1, 10); sg.translate(0, -0.5, 0);
      const stream = mesh(sg, sm, lip.x, lip.y, lip.z, expGroup); stream.renderOrder = 2;
      const d0 = d.liq.h, a0 = U.lerp(sl0, slEnd, i / n), a1 = U.lerp(sl0, slEnd, (i + 1) / n), dur = o.dur || 1.2;
      if (dc != null) d.liq.color(dc, Array.isArray(o.dstOpacity) ? o.dstOpacity[i] : o.dstOpacity, dur);
      await anim(dur, k => {
        const lv = U.lerp(d0, to, k), surf = dW.y + (d.liqY || 0) + lv;
        stream.scale.y = Math.max(0.02, lip.y - surf); d.liq.set(lv); if (src.liq) src.liq.set(U.lerp(a0, a1, k));
      }, EASE.lin);
      expGroup.remove(stream); sg.dispose(); sm.dispose();
    }
    await anim(o.tiltDur ?? 0.5, k => place(lip.clone().lerp(m0, k), th1 * (1 - k)));
    if (o.stay !== true) await arcTo(g, [home.x, home.y, home.z], 0.3, mv);
    g.rotation.copy(rot);
  }
  const pour = (src, dst, o = {}) => pourRow(src, [dst], o);
  /* تسحيح تلقائي سريع (للعيّنة الثانية) */
  async function autoTitrate(bur, flask, from, end, colors, dur = 3) {
    bur.g.updateMatrixWorld(true);
    const lbl = label(bur.g.localToWorld(V3(0.25, bur.yB + 0.3, 0.13)), "", { cls: "read" });
    const colorAt = f => { let a = colors[0], b = colors[colors.length - 1]; for (let i = 0; i < colors.length - 1; i++) if (f >= colors[i][0] && f <= colors[i + 1][0]) { a = colors[i]; b = colors[i + 1]; break; } const t = b[0] > a[0] ? (f - a[0]) / (b[0] - a[0]) : 1; return [new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), U.clamp(t, 0, 1)), U.lerp(a[2], b[2], U.clamp(t, 0, 1))]; };
    try {
      await anim(dur, k => { const v = U.lerp(from, end, k); bur.setRead(v); lbl.set(`<bdi class="num">${U.fmt(v, 2)} مل</bdi>`); const [c, op] = colorAt(v / end); flask.liq.mat.color.copy(c); flask.liq.mat.opacity = op; }, EASE.out);
    } finally { setTimeout(() => lbl.remove(), 700); }
    return end;
  }
  /* أبخرة صاعدة (مثل NO₂ البني أثناء الهضم) */
  function fumes(origin, o = {}) {
    const n = o.n || 18, sp = [], mat = new THREE.SpriteMaterial({ map: MAT.softTex, color: o.color || 0x9a6a3a, transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat.clone()); s.userData.t = i / n; s.position.copy(origin); expGroup.add(s); sp.push(s); }
    let on = true;
    const f = sdt => { for (const s of sp) { s.userData.t += sdt * (o.rate || 0.35); if (s.userData.t > 1) { s.userData.t -= 1; s.userData.x = (Math.random() - 0.5) * (o.spread || 0.6); s.userData.z = (Math.random() - 0.5) * (o.spread || 0.6) * 0.5; } const t = s.userData.t; s.position.set(origin.x + (s.userData.x || 0) * (0.4 + t), origin.y + t * (o.height || 1.6), origin.z + (s.userData.z || 0)); const sc = 0.15 + t * (o.size || 0.6); s.scale.set(sc, sc, 1); s.material.opacity = on ? Math.sin(Math.PI * t) * (o.opacity || 0.45) : Math.max(0, s.material.opacity - sdt); } };
    loops.add(f);
    return { stop() { on = false; setTimeout(() => { loops.delete(f); sp.forEach(s => { expGroup.remove(s); s.material.dispose(); }); }, 1500); } };
  }
  /* قطرات من نقطة إلى سطح سائل */
  async function drops(from, dst, n = 4, color = 0xe8f0f0, gap = 0.18) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const dW = dst.g.getWorldPosition(V3(0, 0, 0));
    for (let i = 0; i < n; i++) {
      const d = mesh(new THREE.SphereGeometry(0.025, 8, 6), m, from.x, from.y, from.z, expGroup);
      const y1 = dW.y + (dst.liqY || 0) + dst.liq.h;
      anim(0.35, k => { d.position.y = U.lerp(from.y, y1, k); }, EASE.in).then(() => { expGroup.remove(d); d.geometry.dispose(); });
      await sleep(gap);
    }
    await sleep(0.35);
  }
  /* نقل بالماصة: تنزل في المصدر، تمتلئ، تنتقل، وتفرغ */
  async function pipetteTo(pip, src, dst, o = {}) {
    const g = pip.g, home = g.position.clone();
    const sW = src.g.getWorldPosition(V3(0, 0, 0)), dW = dst.g.getWorldPosition(V3(0, 0, 0));
    await arcTo(g, [sW.x, sW.y + (src.h || 1) + 0.2, sW.z], 0.5, 0.8);
    await moveTo(g, [sW.x, sW.y + Math.max(0.08, (src.liq ? src.liq.h * 0.3 : 0.1)), sW.z], 0.5);
    await pip.fill(o.frac ?? 0.6, o.color, 0.5);
    if (src.liq && o.srcDrop) src.liq.set(Math.max(0, src.liq.h - o.srcDrop));
    await moveTo(g, [sW.x, sW.y + (src.h || 1) + 0.25, sW.z], 0.45);
    await arcTo(g, [dW.x, dW.y + (dst.h || 1) + 0.25, dW.z], 0.4, 0.8);
    await moveTo(g, [dW.x, dW.y + (dst.h || 1) * 0.55, dW.z], 0.4);
    const d0 = dst.liq.h;
    const pc = o.dstColor ? dst.liq.color(o.dstColor, o.dstOpacity, 0.6) : null;
    await Promise.all([pip.fill(0, null, 0.6), o.to != null ? anim(0.6, k => dst.liq.set(U.lerp(d0, o.to, k))) : sleep(0.6), pc]);
    await moveTo(g, [dW.x, dW.y + (dst.h || 1) + 0.25, dW.z], 0.35);
    if (o.stay !== true) await arcTo(g, [home.x, home.y, home.z], 0.4, 0.8);
  }

  /* ------------------------------------------------------------------
     الواجهة البرمجية التي تستخدمها التجارب
  ------------------------------------------------------------------ */
  const API = {
    THREE: null, MK, MAT, EASE, V3, mesh, Swarm, screen, labelTex, canvasTex,
    anim, sleep, moveTo, arcTo, rotTo, pour, pourRow, drops, pipetteTo, wait, titrate, autoTitrate, fumes, ask, pick, choose, show, label, grab, letGo, dropOn, pourInto, scrub, grind, press, takeFrom, repeat, zone, hitbox, toast, num, ic, Liquid, BoxLiquid, rbox, shadow, lathe, glassBody, profilePts, wrapLabel,
    add: o => { expGroup.add(o.g || o); return o; },
    put: (o, x, y, z, ry = 0) => { const g = o.g || o; g.position.set(x, y, z); g.rotation.y = ry; expGroup.add(g); return o; },
    attach: (parent, o) => { (parent.g || parent).attach(o.g || o); return o; },
    detach: o => { expGroup.attach(o.g || o); return o; },
    get group() { return expGroup; },
    loop: f => { loops.add(f); return () => loops.delete(f); },
    cam: name => camTo(S.exp.views[name] || name),
    get held() { return IA.held; },
    get auto() { return IA.autoAll; },
    nb: NB, chart,
    get data() { return ECO.LAB_DATA; },
    get speed() { return speed; },
    S: {}
  };

  /* النتائج */
  function showResults() {
    const E = S.exp, box = $("lb-results");
    box.hidden = false;
    let body = "";
    try { body = E.results(API); } catch (e) { console.error(e); body = "<p>تعذّر عرض النتائج.</p>"; }
    const s = E.src || {};
    box.innerHTML = `
      <div class="lb-res-h"><span class="lb-res-ic" style="--hue:${E.hue}">${ic("note")}</span><div><small>النتائج والاستنتاج</small><h3>${U.esc(E.title)}</h3></div></div>
      <div class="lb-res-body">${body}</div>
      <div class="lb-src">${ic("book")}<div><b>مصدر النتائج</b><p dir="auto">${U.esc(s.cite || "")}</p>${s.where ? `<p class="muted">${U.esc(s.where)}${s.table ? " · " + U.esc(s.table) : ""}</p>` : ""}
        ${s.url ? `<a href="${U.esc(s.url)}" target="_blank" rel="noopener">${s.doi ? "DOI: " + U.esc(s.doi) : "افتح البحث"} ${ic("left")}</a>` : ""}</div></div>
      <div class="lb-res-actions"><button type="button" class="btn btn-primary" id="lb-again">${ic("reset")}أعد التجربة</button><button type="button" class="btn" id="lb-other">${ic("flask")}اختر تجربة أخرى</button></div>`;
    $("lb-again").onclick = () => { load(E.id, true); $("lb-main").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" }); };
    $("lb-other").onclick = () => $("lb-picker").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
    S.finished = true;
    $("lb-card").innerHTML = `<div class="lb-k">اكتملت التجربة</div><h3>أحسنت، أنهيت كل الخطوات</h3><p class="lb-say">النتائج والاستنتاج ومصدر الأرقام تحت المختبر.</p><div class="lb-next-row"><button type="button" class="btn btn-primary" id="lb-tores">${ic("note")}اذهب إلى النتائج</button></div>`;
    $("lb-tores").onclick = () => box.scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
    S.done.add(S.i); renderProgress(); $("lb-chip").innerHTML = `<b>اكتملت التجربة</b><span>النتائج تحت المختبر</span>`;
    box.scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
  }

  /* تحميل تجربة */
  function clearExp() {
    S.tok = (S.tok || 0) + 1; cancelAll(); picks.clear();
    if (IA.mode) { const rj = IA.rej; endMode(); rj && rj(new Cancel()); }
    IA.held = null; IA.autoAll = false; IA.tilt = 0; if (IA.stream) IA.stream.visible = false;
    for (const l of [...labels]) l.remove();
    for (const r of [...rings]) { expGroup.remove(r); r.geometry.dispose(); } rings.clear();
    if (expGroup) {
      expGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; ms.forEach(m => { if (m && !Object.values(MAT).includes(m) && !Object.values(MAT._caps || {}).includes(m)) { if (m.map && m.map !== MAT.softTex) m.map.dispose(); m.dispose(); } }); });
      scene.remove(expGroup);
    }
    expGroup = new THREE.Group(); scene.add(expGroup);
    $("lb-clock").hidden = true; $("lb-results").hidden = true;
  }
  function load(id, keepView) {
    const E = LAB.EXPS.find(x => x.id === id) || LAB.EXPS[0];
    clearExp();
    S.exp = E; S.i = 0; S.done = new Set(); S.usedTools = new Set(); S.busy = false; S.finished = false; API.S = {};
    $("lb-stage").classList.remove("busy");
    renderPicker();
    $("lb-mats").innerHTML = `<summary>${ic("box")}المواد والأدوات</summary><ul>${E.materials.map(m => `<li>${m}</li>`).join("")}</ul>`;
    $("lb-aim").innerHTML = `<b>${ic("target")}الهدف</b> ${E.aim}`;
    NB.cols(E.nb);
    chart(E.chart ? E.chart(API) : null, E.chartTitle || "الرسم البياني", E.chartSub || "");
    try { E.setup(API); } catch (e) { console.error(e); }
    if (!keepView) { CAM.t.set(...E.views.intro.t); CAM.r = E.views.intro.r + 4; CAM.th = (E.views.intro.th || 0) + 0.5; CAM.ph = 1.0; }
    camTo(E.views.intro);
    try { if (history.replaceState) history.replaceState(null, "", "#lab=" + E.id); } catch (e) { /* */ }
    enterStep(0);
  }

  function buildUI() {
    $("lb-picker").addEventListener("click", e => { const b = e.target.closest("[data-x]"); if (!b) return; if (S.exp && S.exp.id === b.dataset.x && !S.finished) return; load(b.dataset.x); });
    $("lb-tray").addEventListener("click", e => { const b = e.target.closest("[data-tool]"); if (b) onTool(b.dataset.tool); });
    $("lb-reset").onclick = () => load(S.exp.id, true);
    $("lb-stage-next").onclick = goNext;
    U.$$("#lb-speed button").forEach(b => b.onclick = () => { speed = +b.dataset.s; U.$$("#lb-speed button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    $("lb-view").onclick = () => { if (S.exp) { const st = S.exp.steps[S.i]; camTo(S.exp.views[(st && st.cam) || "intro"]); } };
  }

  function init() {
    canvas = $("lb-canvas"); lblLayer = $("lb-lbls");
    API.THREE = THREE;
    st = ECO.makeStage(canvas, { fov: 38, near: 0.05, far: 200, clear: 0x081419 });
    scene = st ? st.scene : new THREE.Scene();
    camera = st ? st.camera : new THREE.PerspectiveCamera(38, 1.6, 0.05, 200);
    mats();
    if (st) { st.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); buildRoom(); bindPointer(); st.tick = dt => frame(dt); }
    else fallbackTimer = setInterval(() => tickAnims(0.05), 50);
    expGroup = new THREE.Group(); scene.add(expGroup);
    buildUI();
    const m = /lab=([a-z]+)/.exec(location.hash || "");
    load(m ? m[1] : LAB.EXPS[0].id);
  }

  LAB._state = () => ({ id: S.exp && S.exp.id, i: S.i, n: S.exp ? S.exp.steps.length : 0, phase: S.phase, busy: S.busy, tool: S.exp && S.exp.steps[S.i] ? S.exp.steps[S.i].tool : null, done: S.done.has(S.i), finished: S.finished, mode: IA.mode, held: !!IA.held, cam: !!CAM.goal });
  /* للاختبار الآلي: موضع الهدف الأول على الشاشة */
  LAB._ia = () => ({ mode: IA.mode, held: IA.held ? IA.held.g.position.toArray().map(v => +v.toFixed(2)) : null, p: IA.p.toArray().map(v => +v.toFixed(2)), pressed: IA.pressed, planeY: IA.planeY, hit: IA.pts ? IA.pts.filter(q => q.hit).length : null, autoP: IA.autoP, hand: handMode() });
  LAB._scrub = () => { if (!IA.pts || !camera) return null; const r = canvas.getBoundingClientRect(); return IA.pts.map(q => { const p = V3(q.p.x, IA.planeY, q.p.z).project(camera); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height }; }); };
  LAB._target = () => {
    const z = IA.zones.find(q => !q.done); if (!z || !camera) return null;
    const r = canvas.getBoundingClientRect(), p = (z.halo ? z.pos.clone() : V3(z.pos.x, IA.mode === "press" ? (z.pos.y + (z.top ?? z.pos.y)) / 2 : IA.planeY, z.pos.z)).project(camera);
    return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height, mode: IA.mode };
  };
  LAB._load = id => load(id);
  LAB._speed = v => { speed = v; };
  /* للاختبار الآلي على معالج رسوم برمجي: ارسم إطاراً واحداً من كل n */
  LAB._thin = k => { if (!st) return; st._thinK = k; if (st._thin) return; const r = st.renderer, orig = r.render.bind(r); let c = 0; st._thin = true; r.render = (a, b) => { if (++c % st._thinK === 0) orig(a, b); }; };

  ECO.views.lab = {
    init,
    show() { if (st) { st.start(); setTimeout(() => st.resize(), 50); } const m = /lab=([a-z]+)/.exec(location.hash || ""); if (m && S.exp && m[1] !== S.exp.id) load(m[1]); },
    hide() { if (st) st.stop(); }
  };
})();
