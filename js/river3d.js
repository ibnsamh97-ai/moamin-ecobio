/* =====================================================================
   EcoBio AI — محاكاة نهر دجلة ثلاثية الأبعاد: مصادر التلوث والمعالجات الحيوية
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const WL = -0.35; // منسوب سطح الماء
  const riverZ = x => 3.2 * Math.sin(x * 0.09) + 1.2 * Math.sin(x * 0.23 + 1);
  const halfW = x => 3.2 + 0.4 * Math.sin(x * 0.15);
  const ss = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function ground(x, z) {
    const d = Math.abs(z - riverZ(x)), hw = halfW(x);
    const land = 0.35 + 0.55 * Math.sin(x * 0.15) * Math.cos(z * 0.13) + 0.3 * Math.sin(x * 0.31 + z * 0.2) + Math.max(0, d - 12) * 0.07;
    const s = ss(hw - 1.0, hw + 1.2, d);
    return U.lerp(-1.6, land, s);
  }

  const SRC = {
    refinery: { name: "مصفى نفط (بيجي)", on: true, color: "#e6ae4f", info: "يصرّف هيدروكربونات نفطية وفينولات وعناصر ثقيلة. الطبقة النفطية تمنع تبادل الأكسجين بين الماء والهواء." },
    sewage: { name: "مصب صرف صحي", on: true, color: "#ee7a4f", info: "حمل عضوي مرتفع (BOD) ومغذيات وبكتيريا مرضية؛ تحلل المادة العضوية يستهلك الأكسجين المذاب." },
    farm: { name: "أراضٍ زراعية", on: true, color: "#e8d35a", info: "جريان الأسمدة (نترات وفوسفات) والمبيدات؛ المغذيات تسبب ازدهار الطحالب ثم نقص الأكسجين ليلاً." }
  };
  const TRT = {
    reeds: { name: "معالجة نباتية: حزام القصب", on: false, color: "#93dd8a", info: "القصب Phragmites australis والبردي Typha يمتصان النترات والفوسفات، وجذورهما تحتجز العناصر الثقيلة (الترشيح الجذري) وتوفر سطحاً للبكتيريا." },
    bio: { name: "معالجة حيوية بالبكتيريا", on: false, color: "#4fc8dc", info: "إضافة سلالات محللة للنفط مثل Pseudomonas putida و Alcanivorax borkumensis مع تحفيز بالنيتروجين والفوسفور تفكك الهيدروكربونات إلى CO₂ وماء." },
    wetland: { name: "أرض رطبة مصطنعة", on: false, color: "#93dd8a", info: "تمرير مياه الصرف عبر حوض مزروع بجريان تحت سطحي يزيل 70–90% من BOD وجزءاً كبيراً من النيتروجين قبل وصولها للنهر." },
    aeration: { name: "التهوية", on: false, color: "#4fc8dc", info: "نوافير وتهوية ميكانيكية ترفع الأكسجين المذاب وتسرّع التحلل الهوائي للمادة العضوية." }
  };
  const L = { oil: 0, bod: 0, nutr: 0, metal: 0, algae: 0, DO: 8.5, health: 90, fish: 18, t: {} };
  let st, orbit, water, parts = {}, smoke, bact, bubbles, flame, reeds, wetland, fish = [], labels = [], built = false, lblLayer, uiT = 0;

  function targets() {
    const r = SRC.refinery.on ? 1 : 0, w = SRC.sewage.on ? 1 : 0, f = SRC.farm.on ? 1 : 0;
    const R = TRT.reeds.on ? 1 : 0, B = TRT.bio.on ? 1 : 0, W = TRT.wetland.on ? 1 : 0, A = TRT.aeration.on ? 1 : 0;
    const oil = r * (1 - 0.75 * B);
    const bod = (0.25 * r + 1.0 * w * (1 - 0.8 * W) + 0.15 * f) * (1 - 0.15 * R) * (1 - 0.25 * A);
    const nutr = (0.5 * w * (1 - 0.55 * W) + 1.0 * f) * (1 - 0.6 * R);
    const metal = 0.6 * r * (1 - 0.45 * R);
    const algae = 0.9 * Math.pow(nutr, 1.2);
    const DO = U.clamp(8.5 - 2.6 * bod - 1.2 * oil - 1.3 * algae + 2.2 * A, 0.4, 9.5);
    return { oil, bod, nutr, metal, algae, DO };
  }

  /* ---------- بناء المشهد ---------- */
  function build() {
    const canvas = U.$("#river-canvas");
    st = ECO.makeStage(canvas, { fov: 42, clear: 0x071419 });
    if (!st) return;
    const { scene, camera } = st;
    scene.fog = new THREE.Fog(0x071419, 60, 120);
    scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x3a2f1a, 0.75));
    const sun = new THREE.DirectionalLight(0xfff1d6, 0.95); sun.position.set(-20, 30, 18); scene.add(sun);

    // التضاريس
    const tg = new THREE.PlaneGeometry(74, 50, 148, 100); tg.rotateX(-Math.PI / 2);
    const pa = tg.attributes.position, cols = [];
    const cBed = new THREE.Color(0x3b3524), cSand = new THREE.Color(0xa08d5d), cDry = new THREE.Color(0x76694a), cGreen = new THREE.Color(0x56733a), cF1 = new THREE.Color(0x6f9a3d), cF2 = new THREE.Color(0xb7a24a);
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i), y = ground(x, z); pa.setY(i, y);
      const d = Math.abs(z - riverZ(x)), hw = halfW(x), c = new THREE.Color();
      const farm = x > 5 && x < 18 && z < riverZ(x) - hw - 3 && z > riverZ(x) - hw - 15;
      if (y < WL - 0.05) c.copy(cBed);
      else if (d < hw + 2) c.copy(cSand);
      else if (farm) c.copy(Math.floor(x * 1.2) % 2 ? cF1 : cF2);
      else c.copy(cDry).lerp(cGreen, U.clamp(1 - (d - hw) / 9, 0, 1) * 0.8);
      const n = 0.92 + Math.random() * 0.12; cols.push(c.r * n, c.g * n, c.b * n);
    }
    tg.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); tg.computeVertexNormals();
    scene.add(new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

    // الماء
    const wv = [], wu = [], wi = [], NX = 150, NZ = 8;
    for (let i = 0; i <= NX; i++) {
      const x = -36 + i * 72 / NX, zc = riverZ(x), hw = halfW(x) + 0.9;
      for (let j = 0; j <= NZ; j++) { const v = j / NZ; wv.push(x, WL, zc - hw + v * 2 * hw); wu.push(i / NX, v); }
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + NZ + 1; wi.push(a, b, a + 1, b, b + 1, a + 1); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wv, 3)); wg.setAttribute("uv", new THREE.Float32BufferAttribute(wu, 2)); wg.setIndex(wi);
    water = new THREE.Mesh(wg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uOil: { value: 0 }, uTurb: { value: 0 }, uAlgae: { value: 0 } },
      vertexShader: `uniform float uTime; varying vec2 vUv; varying vec3 vPos;
        void main(){ vUv = uv; vec3 p = position; p.y += sin(p.x*1.3 + uTime*2.0)*0.03 + cos(p.z*2.1 + uTime*1.7)*0.02; vPos = p; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
      fragmentShader: `uniform float uTime, uOil, uTurb, uAlgae; varying vec2 vUv; varying vec3 vPos;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y); }
        void main(){
          float x = vPos.x; vec2 flow = vec2(x - uTime*1.6, vPos.z*1.4);
          float rip = noise(flow*1.4)*0.6 + noise(flow*3.1+3.0)*0.4;
          vec3 col = mix(vec3(0.04,0.2,0.27), vec3(0.14,0.56,0.66), 0.5 + 0.5*rip);
          float tz = clamp(uTurb * smoothstep(-7.0, -2.0, x), 0.0, 1.0);
          col = mix(col, vec3(0.45,0.36,0.19), tz*0.88);
          float az = clamp(uAlgae * smoothstep(5.0, 11.0, x) * smoothstep(0.3, 0.7, noise(flow*0.55)), 0.0, 1.0);
          col = mix(col, vec3(0.22,0.52,0.13), az*0.85);
          float oz = uOil * smoothstep(-20.0, -17.0, x) * exp(-max(0.0, x+17.0)*0.035);
          float pO = smoothstep(0.42, 0.75, noise(flow*0.8 + 7.0));
          vec3 sheen = 0.5 + 0.5*cos(6.283*(rip*1.6 + vec3(0.0,0.33,0.67)));
          col = mix(col, mix(vec3(0.05,0.04,0.06), sheen*0.65, 0.35), clamp(oz*pO, 0.0, 1.0)*0.92);
          col += pow(rip, 6.0)*0.55*vec3(0.6,0.85,0.9)*(1.0 - tz*0.7);
          float edge = smoothstep(0.1, 0.0, vUv.y) + smoothstep(0.9, 1.0, vUv.y);
          col = mix(col, vec3(0.75,0.82,0.76), edge*0.22);
          gl_FragColor = vec4(col, 0.84);
        }`
    }));
    water.renderOrder = 10; scene.add(water);

    buildRefinery(scene); buildSewage(scene); buildReeds(scene); buildWetland(scene);
    buildParticles(scene); buildFish(scene);

    lblLayer = U.el("div", { class: "lbl-layer" }); U.$("#river-stage").appendChild(lblLayer);
    addLabel("مصفى النفط", () => new THREE.Vector3(-21, 8.5, riverZ(-21) - halfW(-21) - 7), SRC.refinery.color, () => true);
    addLabel("مصب الصرف الصحي", () => new THREE.Vector3(-4, 3.2, riverZ(-4) + halfW(-4) + 9), SRC.sewage.color, () => true);
    addLabel("أراضٍ زراعية", () => new THREE.Vector3(11, 1.8, riverZ(11) - halfW(11) - 9), SRC.farm.color, () => true);
    addLabel("أرض رطبة مصطنعة", () => new THREE.Vector3(-6, 1.6, riverZ(-6) + halfW(-6) + 3.5), TRT.wetland.color, () => TRT.wetland.on);
    addLabel("حزام القصب", () => new THREE.Vector3(20, 2.4, riverZ(20) - halfW(20)), TRT.reeds.color, () => TRT.reeds.on);
    addLabel("نوافير التهوية", () => new THREE.Vector3(5, 2.2, riverZ(5)), TRT.aeration.color, () => TRT.aeration.on);

    Object.assign(L, targets()); L.health = U.clamp(100 * (L.DO / 9) - 20 * L.oil - 15 * L.metal - 10 * L.algae, 0, 100);
    const narrow = canvas.clientWidth < 600;
    orbit = new ECO.Orbit(camera, canvas, { radius: narrow ? 68 : 50, theta: 0.42, phi: narrow ? 0.85 : 0.98, minR: 14, maxR: 85, maxPhi: 1.42, auto: 0.03 });
    st.tick = tick;
  }

  function mat(c, o = {}) { return new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o }); }

  function buildRefinery(scene) {
    const cx = -21, cz = riverZ(cx) - halfW(cx) - 7, g = new THREE.Group(), y0 = ground(cx, cz);
    g.position.set(cx, y0, cz); scene.add(g);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 8), mat(0x4b4b47)); pad.position.y = 0.1; g.add(pad);
    [[-3.6, -1.8], [-3.6, 1.8], [-0.6, 2.4]].forEach(([x, z]) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.6, 24), mat(0xcfc7b4)); t.position.set(x, 1.05, z); g.add(t); const top = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.05, 24), mat(0x9b937f)); top.position.set(x, 1.88, z); g.add(top); });
    [[1.6, -1.2, 6], [2.9, -0.4, 4.6]].forEach(([x, z, h]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, h, 16), mat(0x9aa3a8)); t.position.set(x, h / 2 + 0.25, z); g.add(t);
      for (let k = 1; k < 4; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 20), mat(0x5d666b)); ring.rotation.x = Math.PI / 2; ring.position.set(x, k * h / 4, z); g.add(ring); }
    });
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 7.5, 10), mat(0xb24a2e)); stack.position.set(4.6, 3.9, -2.2); g.add(stack);
    flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 12), new THREE.MeshBasicMaterial({ color: 0xffa33a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })); flame.position.set(4.6, 8.3, -2.2); g.add(flame);
    const light = new THREE.PointLight(0xff9a40, 1.2, 14); light.position.set(4.6, 8.5, -2.2); g.add(light);
    // أنبوب التصريف إلى النهر
    const ox = -18, oz = riverZ(ox) - halfW(ox) + 0.4;
    pipe(scene, new THREE.Vector3(cx + 4, y0 + 0.45, cz + 3.5), new THREE.Vector3(ox, WL + 0.15, oz), 0.22, 0x6b6f72);
    // الدخان
    const n = 220, p = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push({ t: Math.random() * 6, a: Math.random() * 6.28 });
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(p, 3));
    smoke = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x55585c, size: 1.1, transparent: true, opacity: 0.45, depthWrite: false, map: dotTex() }));
    smoke.userData = { seeds, origin: new THREE.Vector3(cx + 4.6, y0 + 8.8, cz - 2.2) }; scene.add(smoke);
  }

  function buildSewage(scene) {
    const cx = -4, cz = riverZ(cx) + halfW(cx) + 9.5, y0 = ground(cx, cz), g = new THREE.Group();
    g.position.set(cx, y0, cz); scene.add(g);
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 2.4), mat(0x8c9094)); b.position.y = 0.8; g.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 2.6), mat(0x55595c)); roof.position.y = 1.65; g.add(roof);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.7, 28), mat(0x6c7072)); tank.position.set(3.4, 0.35, 0); g.add(tank);
    const sludge = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.05, 28), mat(0x5a4a2a)); sludge.position.set(3.4, 0.72, 0); g.add(sludge);
    const ox = -4, oz = riverZ(ox) + halfW(ox) - 0.4;
    pipe(scene, new THREE.Vector3(cx, y0 + 0.4, cz - 1.3), new THREE.Vector3(ox, WL + 0.12, oz), 0.26, 0x5c5f61);
  }

  function pipe(scene, a, b, r, c) {
    const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat(c));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    scene.add(m);
  }

  function swayMaterial(color) {
    const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = { value: 0 }; m.userData.shader = sh;
      sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;
        #else
          float ph = 0.0;
        #endif
        transformed.x += sin(uTime*1.8 + ph) * position.y * 0.09;
        transformed.z += cos(uTime*1.3 + ph) * position.y * 0.05;`);
    };
    return m;
  }

  function buildReeds(scene) {
    const geo = new THREE.ConeGeometry(0.07, 2.2, 4); geo.translate(0, 1.1, 0);
    const N = 760; reeds = new THREE.InstancedMesh(geo, swayMaterial(0x6e9a3a), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    reeds.userData.base = [];
    for (let i = 0; i < N; i++) {
      const x = 11 + Math.random() * 18, side = i % 2 ? 1 : -1, d = halfW(x) - 0.2 + Math.random() * 1.4, z = riverZ(x) + side * d;
      const y = Math.max(ground(x, z), WL - 0.4), h = 0.6 + Math.random() * 0.8;
      reeds.userData.base.push({ x, y, z, h, ry: Math.random() * 6.28 });
      p.set(x, y, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28); s.set(1, 0.001, 1); m.compose(p, q, s); reeds.setMatrixAt(i, m);
    }
    reeds.userData.grow = 0; scene.add(reeds);
  }

  function buildWetland(scene) {
    const cx = -6, cz = riverZ(cx) + halfW(cx) + 3.6, g = new THREE.Group(), y0 = Math.max(ground(cx, cz), WL) + 0.05;
    g.position.set(cx, y0, cz);
    const basin = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.35, 3.2), mat(0x5b4a2e)); basin.position.y = 0.05; g.add(basin);
    const wat = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.06, 2.8), new THREE.MeshLambertMaterial({ color: 0x2c7f74, transparent: true, opacity: 0.85 })); wat.position.y = 0.24; g.add(wat);
    const geo = new THREE.ConeGeometry(0.06, 1.4, 4); geo.translate(0, 0.7, 0);
    const N = 220, im = new THREE.InstancedMesh(geo, swayMaterial(0x7fb04a), N), m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { m.makeScale(1, 0.6 + Math.random() * 0.8, 1); m.setPosition(-3.4 + Math.random() * 6.8, 0.25, -1.3 + Math.random() * 2.6); im.setMatrixAt(i, m); }
    g.add(im); g.userData.plants = im;
    wetland = g; g.scale.setScalar(0.001); g.visible = false; scene.add(g);
  }

  function dotTex() {
    if (dotTex.t) return dotTex.t;
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return (dotTex.t = new THREE.CanvasTexture(c));
  }

  /* الجسيمات: لكل نوع ملوث مجموعة مستقلة */
  const PT = {
    oil: { n: 700, color: 0x2a2236, size: 0.55, y: [WL + 0.04, WL + 0.06], order: 11, blend: THREE.NormalBlending },
    organic: { n: 700, color: 0x8a6430, size: 0.4, y: [-1.1, -0.45], order: 5, blend: THREE.NormalBlending },
    nutrient: { n: 800, color: 0x9be05a, size: 0.32, y: [-0.9, -0.4], order: 5, blend: THREE.AdditiveBlending },
    metal: { n: 400, color: 0xaab6c8, size: 0.28, y: [-1.4, -0.8], order: 5, blend: THREE.AdditiveBlending }
  };
  function buildParticles(scene) {
    Object.entries(PT).forEach(([k, d]) => {
      const pos = new Float32Array(d.n * 3).fill(-100);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: d.color, size: d.size, map: dotTex(), transparent: true, opacity: k === "oil" ? 0.95 : 0.85, depthWrite: false, blending: d.blend }));
      pts.renderOrder = d.order; pts.frustumCulled = false; scene.add(pts);
      parts[k] = { pts, pool: Array.from({ length: d.n }, () => ({ alive: false })), acc: 0, d };
    });
    // البكتيريا
    const nb = 320, bp = new Float32Array(nb * 3), bs = [];
    for (let i = 0; i < nb; i++) { const x = -20 + Math.random() * 24, off = (Math.random() * 2 - 1) * (halfW(x) - 0.4); bs.push({ x, off, ph: Math.random() * 6.28 }); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.BufferAttribute(bp, 3));
    bact = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0x5fe0c8, size: 0.32, map: dotTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    bact.userData.seeds = bs; bact.renderOrder = 12; bact.frustumCulled = false; scene.add(bact);
    // فقاعات التهوية
    const nf = 360, fp = new Float32Array(nf * 3), fs = [];
    for (let i = 0; i < nf; i++) fs.push({ src: i % 3, t: Math.random(), a: Math.random() * 6.28, r: Math.random() });
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
    bubbles = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xd8f6ff, size: 0.22, map: dotTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    bubbles.userData.seeds = fs; bubbles.renderOrder = 12; bubbles.frustumCulled = false; scene.add(bubbles);
  }

  function spawn(k, x, off) {
    const P = parts[k], p = P.pool.find(q => !q.alive); if (!p) return;
    p.alive = true; p.x = x; p.off = off; p.y = U.lerp(P.d.y[0], P.d.y[1], Math.random()); p.v = 1.8 + Math.random() * 0.9; p.age = 0;
  }

  function buildFish(scene) {
    const body = new THREE.SphereGeometry(0.5, 10, 8); body.scale(1, 0.36, 0.26);
    const tail = new THREE.ConeGeometry(0.2, 0.4, 4); tail.rotateZ(Math.PI / 2); tail.translate(-0.62, 0, 0);
    const mBody = new THREE.MeshLambertMaterial({ color: 0x9fc4cf, emissive: 0x0d2a30 }), mTail = new THREE.MeshLambertMaterial({ color: 0x7aa3ad });
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group(); g.add(new THREE.Mesh(body, mBody)); const t = new THREE.Mesh(tail, mTail); g.add(t);
      const x = -30 + Math.random() * 60;
      g.userData = { x, off: (Math.random() * 2 - 1) * 1.8, dir: Math.random() < 0.5 ? 1 : -1, sp: 0.6 + Math.random() * 0.9, ph: Math.random() * 6.28, tail: t, vis: 1 };
      g.renderOrder = 4; scene.add(g); fish.push(g);
    }
  }

  function addLabel(text, posFn, color, visFn) {
    const e = U.el("div", { class: "lbl3d" }, `<i style="background:${color}"></i>${text}`);
    lblLayer.appendChild(e); labels.push({ e, posFn, visFn });
  }

  /* ---------- حلقة المحاكاة ---------- */
  const tmp = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), SC = new THREE.Vector3(), PS = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  function tick(dt, t) {
    orbit.update(dt);
    const T = targets(), k = Math.min(1, dt * 0.6);
    ["oil", "bod", "nutr", "metal", "algae", "DO"].forEach(n => { L[n] += (T[n] - L[n]) * k; });
    L.health = U.clamp(100 * (L.DO / 9) - 20 * L.oil - 15 * L.metal - 10 * L.algae, 0, 100);
    const fishTarget = Math.round(U.clamp((L.DO - 3) / 5, 0, 1) * 18 * (1 - L.oil * 0.6));

    water.material.uniforms.uTime.value = t;
    water.material.uniforms.uOil.value = L.oil; water.material.uniforms.uTurb.value = U.clamp(L.bod * 0.85, 0, 1); water.material.uniforms.uAlgae.value = U.clamp(L.algae * 0.8, 0, 1);

    // اللهب والدخان
    flame.visible = SRC.refinery.on; flame.scale.set(1 + 0.15 * Math.sin(t * 17), 1 + 0.3 * Math.sin(t * 11), 1);
    const sm = smoke.geometry.attributes.position, so = smoke.userData.origin;
    smoke.material.opacity = U.lerp(smoke.material.opacity, SRC.refinery.on ? 0.45 : 0, k * 2);
    smoke.userData.seeds.forEach((s, i) => { s.t = (s.t + dt) % 6; const h = s.t * 1.4; sm.setXYZ(i, so.x + h * 0.9 + Math.sin(s.a + t) * 0.3 * s.t, so.y + h, so.z + Math.cos(s.a) * 0.4 * s.t); });
    sm.needsUpdate = true;

    // إطلاق الملوثات
    const emit = (key, rate, xFn, offFn) => { const P = parts[key]; P.acc += rate * dt; while (P.acc >= 1) { P.acc -= 1; spawn(key, xFn(), offFn()); } };
    if (SRC.refinery.on) {
      emit("oil", 38, () => -18 + Math.random() * 0.6, () => -halfW(-18) + 0.6 + Math.random() * 0.6);
      emit("metal", 12, () => -18, () => -halfW(-18) + 0.8 + Math.random());
    }
    if (SRC.sewage.on) {
      emit("organic", 46 * (TRT.wetland.on ? 0.2 : 1), () => -4 + Math.random() * 0.5, () => halfW(-4) - 0.6 - Math.random() * 0.6);
      emit("nutrient", 16 * (TRT.wetland.on ? 0.45 : 1), () => -4, () => halfW(-4) - 0.8 - Math.random());
    }
    if (SRC.farm.on) emit("nutrient", 36, () => 6 + Math.random() * 11, () => -halfW(10) + 0.4 + Math.random() * 0.8);

    // تحريك الجسيمات وتطبيق الإزالة
    Object.entries(parts).forEach(([key, P]) => {
      const arr = P.pts.geometry.attributes.position;
      P.pool.forEach((p, i) => {
        if (!p.alive) { arr.setXYZ(i, 0, -100, 0); return; }
        const hw = halfW(p.x), cv = 1 - Math.pow(p.off / hw, 2);
        p.x += p.v * (0.55 + 0.6 * cv) * dt; p.off += ((Math.random() - 0.5) * 1.2 - p.off * 0.12) * dt; p.age += dt;
        let kill = 0.01;
        if (key === "oil" && TRT.bio.on && p.x < 6) kill = 0.45;
        if (key === "nutrient" && TRT.reeds.on && p.x > 11 && p.x < 29) kill = 0.55;
        if (key === "metal" && TRT.reeds.on && p.x > 11 && p.x < 29) kill = 0.3;
        if (key === "organic" && TRT.aeration.on && p.x > 1 && p.x < 10) kill = 0.3;
        if (key === "organic" && TRT.reeds.on && p.x > 11 && p.x < 29) kill = Math.max(kill, 0.12);
        if (p.x > 36 || Math.random() < kill * dt) { p.alive = false; arr.setXYZ(i, 0, -100, 0); return; }
        const bob = key === "oil" ? Math.sin(t * 2 + i) * 0.02 : Math.sin(t + i) * 0.05;
        arr.setXYZ(i, p.x, p.y + bob, riverZ(p.x) + p.off);
      });
      arr.needsUpdate = true;
    });

    // البكتيريا
    bact.material.opacity = U.lerp(bact.material.opacity, TRT.bio.on ? 0.95 : 0, k * 3);
    if (bact.material.opacity > 0.01) {
      const bp = bact.geometry.attributes.position;
      bact.userData.seeds.forEach((s, i) => { const x = s.x + Math.sin(t * 0.7 + s.ph) * 0.6; bp.setXYZ(i, x, WL + 0.05 + Math.sin(t * 3 + s.ph) * 0.05, riverZ(x) + s.off + Math.cos(t * 0.9 + s.ph) * 0.4); });
      bp.needsUpdate = true;
    }
    // الفقاعات
    bubbles.material.opacity = U.lerp(bubbles.material.opacity, TRT.aeration.on ? 0.9 : 0, k * 3);
    if (bubbles.material.opacity > 0.01) {
      const fp = bubbles.geometry.attributes.position, fx = [2, 5, 8];
      bubbles.userData.seeds.forEach((s, i) => { s.t = (s.t + dt * 0.9) % 1; const x0 = fx[s.src], r = s.r * 0.7 * s.t, h = Math.sin(s.t * Math.PI) * 1.9; fp.setXYZ(i, x0 + Math.cos(s.a) * r, WL + h, riverZ(x0) + Math.sin(s.a) * r); });
      fp.needsUpdate = true;
    }

    // نمو القصب والأرض الرطبة
    const rg = reeds.userData.grow = U.lerp(reeds.userData.grow, TRT.reeds.on ? 1 : 0, k * 2);
    if (Math.abs(rg - (reeds.userData.lastG || 0)) > 0.002) {
      reeds.userData.base.forEach((b, i) => { PS.set(b.x, b.y, b.z); Q.setFromAxisAngle(UPV, b.ry); SC.set(1, Math.max(0.001, rg * b.h), 1); M4.compose(PS, Q, SC); reeds.setMatrixAt(i, M4); });
      reeds.instanceMatrix.needsUpdate = true; reeds.userData.lastG = rg;
    }
    reeds.visible = rg > 0.01;
    const sw = reeds.material.userData.shader; if (sw) sw.uniforms.uTime.value = t;
    const wg = U.lerp(wetland.scale.x, TRT.wetland.on ? 1 : 0.001, k * 2); wetland.scale.setScalar(wg); wetland.visible = wg > 0.01;
    const ws = wetland.userData.plants.material.userData.shader; if (ws) ws.uniforms.uTime.value = t;

    // الأسماك
    L.fish = fishTarget;
    fish.forEach((f, i) => {
      const u = f.userData, show = i < fishTarget;
      u.vis = U.lerp(u.vis, show ? 1 : 0, k * 2); f.visible = u.vis > 0.02; if (!f.visible) return;
      u.x += u.dir * u.sp * dt; if (u.x > 33) u.dir = -1; if (u.x < -33) u.dir = 1;
      const z = riverZ(u.x) + u.off + Math.sin(t * 0.8 + u.ph) * 0.3;
      f.position.set(u.x, -0.85 + Math.sin(t * 1.5 + u.ph) * 0.08, z);
      const hx = 0.1 * u.dir, hz = riverZ(u.x + hx) - riverZ(u.x);
      f.rotation.y = -Math.atan2(hz, hx);
      u.tail.rotation.y = Math.sin(t * 10 + u.ph) * 0.4; f.scale.setScalar(u.vis * 0.9);
    });

    // الملصقات
    const w = st.renderer.domElement.clientWidth, h = st.renderer.domElement.clientHeight;
    labels.forEach(l => {
      if (!l.visFn()) { l.e.style.display = "none"; return; }
      tmp.copy(l.posFn()).project(st.camera);
      if (tmp.z > 1) { l.e.style.display = "none"; return; }
      l.e.style.display = ""; l.e.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    });

    uiT += dt; if (uiT > 0.25) { uiT = 0; renderHUD(); }
  }

  /* ---------- الواجهة ---------- */
  function renderHUD() {
    const hv = Math.round(L.health), tone = hv >= 70 ? "good" : hv >= 45 ? "fair" : hv >= 25 ? "bad" : "severe";
    U.$("#river-health").textContent = hv; U.$("#river-health").style.color = ECO.TONES[tone];
    const st2 = U.$("#river-status"); st2.className = `chip tone-${tone}`; st2.textContent = { good: "سليم", fair: "متوسط", bad: "متدهور", severe: "حرج" }[tone];
    const m = [
      { n: "الأكسجين المذاب DO", v: L.DO, u: "mg/L", pct: L.DO / 9.5, tone: L.DO >= 5 ? "good" : L.DO >= 3 ? "warn" : "severe", d: 1 },
      { n: "المتطلب الحيوي BOD₅", v: 1.5 + L.bod * 16, u: "mg/L", pct: L.bod / 1.6, tone: L.bod < 0.25 ? "good" : L.bod < 0.7 ? "warn" : "severe", d: 1 },
      { n: "هيدروكربونات نفطية", v: L.oil * 4.2, u: "mg/L", pct: L.oil, tone: L.oil < 0.15 ? "good" : L.oil < 0.5 ? "warn" : "severe", d: 2 },
      { n: "النترات NO₃⁻", v: 3 + L.nutr * 30, u: "mg/L", pct: L.nutr / 1.6, tone: 3 + L.nutr * 30 < 25 ? "good" : 3 + L.nutr * 30 < 50 ? "warn" : "severe", d: 1 },
      { n: "الرصاص Pb", v: 2 + L.metal * 45, u: "µg/L", pct: L.metal / 0.6, tone: 2 + L.metal * 45 <= 10 ? "good" : 2 + L.metal * 45 < 25 ? "warn" : "severe", d: 0 },
      { n: "الأسماك الحية", v: L.fish, u: "/ 18", pct: L.fish / 18, tone: L.fish > 12 ? "good" : L.fish > 5 ? "warn" : "severe", d: 0 }
    ];
    U.$("#river-meters").innerHTML = m.map(x => `<div class="meter"><div class="row"><span>${x.n}</span><b>${U.fmt(x.v, x.d)} <span class="faint" style="font-size:.65rem">${x.u}</span></b></div><div class="track"><i style="width:${U.clamp(x.pct, 0, 1) * 100}%;background:${ECO.TONES[x.tone]}"></i></div></div>`).join("");
  }

  function renderControls() {
    const t = (id, o, cls) => `<label class="toggle ${cls}" for="rv-${id}"><input type="checkbox" id="rv-${id}" ${o.on ? "checked" : ""}><span class="sw"></span>${o.name}</label>`;
    U.$("#river-sources").innerHTML = Object.entries(SRC).map(([id, o]) => t(id, o, "pollute")).join("");
    U.$("#river-treats").innerHTML = Object.entries(TRT).map(([id, o]) => t(id, o, "")).join("");
    Object.entries({ ...SRC, ...TRT }).forEach(([id, o]) => { U.$("#rv-" + id).onchange = e => { o.on = e.target.checked; renderInfo(); }; });
  }
  function renderInfo() {
    const on = [...Object.values(TRT).filter(o => o.on), ...Object.values(SRC).filter(o => o.on)].slice(0, 3);
    const list = on.length ? on : Object.values(TRT).slice(0, 3);
    U.$("#river-info").innerHTML = list.map(o => `<div class="treat-card"><h4><i style="width:9px;height:9px;border-radius:50%;background:${o.color};display:inline-block"></i>${o.name}</h4><p class="muted" style="font-size:.85rem">${o.info}</p></div>`).join("");
  }

  ECO.views.river = {
    init() {
      renderControls(); renderInfo(); build(); built = !!st;
      U.$("#river-reset").onclick = () => {
        Object.values(SRC).forEach(o => (o.on = true)); Object.values(TRT).forEach(o => (o.on = false));
        renderControls(); renderInfo();
      };
    },
    show() { if (st) st.start(); },
    hide() { if (st) st.stop(); }
  };
})();
