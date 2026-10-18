/* =====================================================================
   EcoBio AI — العالم المجهري: بكتيريا تفكك النفط أو تمتص العناصر الثقيلة
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const RD = 11.5; // نصف قطر القطرة
  const MAXB = 80, MAXATOMS = 900, MAXIONS = 160;
  const S = { mode: "oil", temp: 30, ph: 7, nutr: true, want: 24, total: 0, done: 0, hist: [], histT: 0, uiT: 0 };
  let st, orbit, bodies, flag, atomsIM, ionsIM, co2, bact = [], mols = [], ions = [];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const randIn = r => { const v = new THREE.Vector3().randomDirection ? new THREE.Vector3().randomDirection() : new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); return v.multiplyScalar(Math.cbrt(Math.random()) * r); };

  function activity() {
    const g = (x, m, s) => Math.exp(-Math.pow((x - m) / s, 2));
    const fT = g(S.temp, 30, 9) * (S.temp > 45 ? Math.max(0, 1 - (S.temp - 45) / 6) : 1);
    if (S.mode === "oil") return fT * g(S.ph, 7.2, 1.4) * (S.nutr ? 1 : 0.45);
    // الامتصاص الحيوي للمعادن: أفضل عند pH بين 5 و 6.5، وأقل اعتماداً على الحرارة
    return (0.55 + 0.45 * fT) * g(S.ph, 5.8, 1.6) * (S.nutr ? 1 : 0.85);
  }

  function build() {
    const canvas = U.$("#micro-canvas");
    st = ECO.makeStage(canvas, { fov: 45, clear: 0x03090c });
    if (!st) return;
    const { scene, camera } = st;
    scene.add(new THREE.AmbientLight(0xbfe8ff, 0.55));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.9); d1.position.set(8, 12, 10); scene.add(d1);
    const d2 = new THREE.PointLight(0x4fc8dc, 0.8, 40); d2.position.set(-10, -6, -8); scene.add(d2);

    // جدار القطرة
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(RD + 0.6, 64, 48), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
      fragmentShader: "varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); gl_FragColor = vec4(0.31,0.78,0.86, 1.0) * (0.04 + f*0.55); }"
    })));
    // ذرات عالقة
    const sp = []; for (let i = 0; i < 500; i++) { const v = randIn(RD); sp.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x4fc8dc, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false })));

    // البكتيريا (أجسام + أسواط)
    const cap = THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.42, 1.3, 6, 12) : new THREE.CylinderGeometry(0.42, 0.42, 2.1, 12);
    cap.rotateZ(Math.PI / 2);
    bodies = new THREE.InstancedMesh(cap, new THREE.MeshStandardMaterial({ color: 0x7fd08a, emissive: 0x1d4a26, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92 }), MAXB);
    bodies.count = 0; bodies.frustumCulled = false; scene.add(bodies);
    const fpos = new Float32Array(MAXB * 10 * 2 * 3);
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.BufferAttribute(fpos, 3)); fg.setDrawRange(0, 0);
    flag = new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: 0xa8e6b0, transparent: true, opacity: 0.7 })); flag.frustumCulled = false; scene.add(flag);

    // ذرات جزيئات النفط
    atomsIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3a3442, roughness: 0.25, metalness: 0.4, emissive: 0x120d18 }), MAXATOMS);
    atomsIM.count = 0; atomsIM.frustumCulled = false; scene.add(atomsIM);
    // أيونات العناصر الثقيلة
    ionsIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0xc9d4ff, emissive: 0x5a63c9, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.6 }), MAXIONS);
    ionsIM.count = 0; ionsIM.frustumCulled = false; scene.add(ionsIM);
    // فقاعات CO2
    const cp = new Float32Array(240 * 3).fill(999);
    const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.BufferAttribute(cp, 3));
    co2 = new THREE.Points(cg, new THREE.PointsMaterial({ color: 0xe8fbff, size: 0.28, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    co2.userData.pool = Array.from({ length: 240 }, () => ({ life: 0 })); co2.frustumCulled = false; scene.add(co2);

    orbit = new ECO.Orbit(camera, canvas, { radius: 27, theta: 0.5, phi: 1.2, minR: 8, maxR: 40, auto: 0.06 });
    reset(); st.tick = tick;
  }

  function makeMol() {
    const aromatic = Math.random() < 0.4, atoms = [];
    if (aromatic) { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; atoms.push(new THREE.Vector3(Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0)); } if (Math.random() < 0.5) atoms.push(new THREE.Vector3(1.85, 0, 0)); }
    else { const n = 6 + Math.floor(Math.random() * 6); for (let i = 0; i < n; i++) atoms.push(new THREE.Vector3((i - n / 2) * 0.62, (i % 2 ? 0.38 : -0.38), 0)); }
    return { pos: randIn(RD - 2), vel: randIn(0.15), rot: new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6)), spin: randIn(0.4), atoms, hp: 1, alive: true, kind: aromatic ? "aromatic" : "alkane" };
  }
  function makeBact(p) {
    return { pos: p ? p.clone() : randIn(RD - 2), dir: randIn(1).normalize(), target: null, energy: Math.random() * 0.5, ph: Math.random() * 6.28, bound: 0 };
  }
  function addSpill(n = 26) { for (let i = 0; i < n; i++) mols.push(makeMol()); S.total += n; }
  function addIons(n = 110) { for (let i = 0; i < n && ions.length < MAXIONS; i++) ions.push({ pos: randIn(RD - 1), vel: randIn(0.3), host: null, off: null }); S.total += n; }

  function reset() {
    mols = []; ions = []; S.total = 0; S.done = 0; S.hist = [];
    bact = Array.from({ length: S.want }, () => makeBact());
    if (S.mode === "oil") addSpill(32); else addIons(120);
    renderInfo();
  }

  const M = new THREE.Matrix4(), Qt = new THREE.Quaternion(), SC = new THREE.Vector3(), V = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  function emitCO2(p) { const pool = co2.userData.pool, b = pool.find(q => q.life <= 0); if (!b) return; b.life = 1; b.p = p.clone().add(randIn(0.6)); }

  function tick(dt, t) {
    orbit.update(dt);
    const act = activity();
    // أعداد البكتيريا وفق المنزلق
    while (bact.length < S.want) bact.push(makeBact());
    while (bact.length > S.want) bact.pop();

    // الجزيئات
    mols.forEach(m => {
      if (!m.alive) return;
      m.pos.addScaledVector(m.vel, dt); if (m.pos.length() > RD - 1.5) m.vel.addScaledVector(m.pos, -0.02);
      m.rot.x += m.spin.x * dt * 0.3; m.rot.y += m.spin.y * dt * 0.3;
    });
    // الأيونات
    ions.forEach(io => {
      if (io.host) return;
      io.vel.add(randIn(0.6 * dt)); io.vel.multiplyScalar(0.99); io.pos.addScaledVector(io.vel, dt);
      if (io.pos.length() > RD - 0.8) io.vel.addScaledVector(io.pos, -0.05);
    });

    // سلوك البكتيريا
    bact.forEach((b, bi) => {
      const speed = 0.6 + 2.4 * act;
      if (S.mode === "oil") {
        if (!b.target || !b.target.alive) {
          let best = null, bd = 1e9; mols.forEach(m => { if (!m.alive) return; const d = m.pos.distanceToSquared(b.pos); if (d < bd) { bd = d; best = m; } });
          b.target = best;
        }
        if (b.target) {
          V.copy(b.target.pos).sub(b.pos); const d = V.length();
          if (d > 1.3) { V.normalize(); b.dir.lerp(V, Math.min(1, dt * 2)).normalize(); b.pos.addScaledVector(b.dir, speed * dt); }
          else {
            b.target.hp -= 0.45 * act * dt; b.energy += 0.3 * act * dt;
            if (Math.random() < act * dt * 3) emitCO2(b.target.pos);
            if (b.target.hp <= 0) { b.target.alive = false; S.done++; }
            if (b.energy > 1.4 && bact.length < MAXB && S.nutr) { b.energy = 0.3; S.want = Math.min(MAXB, S.want + 1); const nb = makeBact(b.pos); bact.push(nb); syncSlider(); }
          }
        } else { b.dir.add(randIn(dt)).normalize(); b.pos.addScaledVector(b.dir, 0.4 * dt); }
      } else {
        b.dir.add(randIn(dt * 0.8)).normalize(); b.pos.addScaledVector(b.dir, (0.4 + 0.6 * act) * dt);
        ions.forEach(io => {
          if (io.host || b.bound > 12) return;
          const d = io.pos.distanceTo(b.pos);
          if (d < 2.4) { io.vel.addScaledVector(V.copy(b.pos).sub(io.pos).normalize(), act * 3 * dt); }
          if (d < 1.0 && Math.random() < act * 0.9) { io.host = b; io.off = randIn(1).normalize().multiply(new THREE.Vector3(1.05, 0.5, 0.5)); b.bound++; S.done++; }
        });
      }
      if (b.pos.length() > RD - 1.2) { b.dir.addScaledVector(b.pos.clone().normalize(), -0.5).normalize(); b.pos.setLength(RD - 1.25); }
      b.ph += dt * (6 + 10 * act);
    });

    // تحديث المصفوفات
    bodies.count = bact.length;
    const fp = flag.geometry.attributes.position.array; let fi = 0;
    bact.forEach((b, i) => {
      Qt.setFromUnitVectors(X, b.dir); SC.set(1, 1, 1); M.compose(b.pos, Qt, SC); bodies.setMatrixAt(i, M);
      // السوط
      let px = b.pos.x - b.dir.x * 1.05, py = b.pos.y - b.dir.y * 1.05, pz = b.pos.z - b.dir.z * 1.05;
      const side = V.set(-b.dir.z, 0, b.dir.x).normalize();
      for (let s = 1; s <= 10; s++) {
        const w = Math.sin(b.ph - s * 0.9) * 0.18 * (s / 10 + 0.4);
        const nx = b.pos.x - b.dir.x * (1.05 + s * 0.22) + side.x * w, ny = b.pos.y - b.dir.y * (1.05 + s * 0.22) + w * 0.5, nz = b.pos.z - b.dir.z * (1.05 + s * 0.22) + side.z * w;
        fp[fi++] = px; fp[fi++] = py; fp[fi++] = pz; fp[fi++] = nx; fp[fi++] = ny; fp[fi++] = nz; px = nx; py = ny; pz = nz;
      }
    });
    bodies.instanceMatrix.needsUpdate = true;
    flag.geometry.setDrawRange(0, fi / 3); flag.geometry.attributes.position.needsUpdate = true;

    let ai = 0;
    if (S.mode === "oil") mols.forEach(m => {
      if (!m.alive) return;
      const sc = 0.35 + 0.65 * Math.max(0, m.hp); Qt.setFromEuler(m.rot);
      m.atoms.forEach(a => { if (ai >= MAXATOMS) return; V.copy(a).applyQuaternion(Qt).multiplyScalar(sc).add(m.pos); SC.setScalar(sc); M.compose(V, Qt, SC); atomsIM.setMatrixAt(ai++, M); });
    });
    atomsIM.count = ai; atomsIM.instanceMatrix.needsUpdate = true;
    let ii = 0;
    if (S.mode === "metal") ions.forEach(io => {
      const p = io.host ? V.copy(io.off).applyQuaternion(Qt.setFromUnitVectors(X, io.host.dir)).add(io.host.pos) : io.pos;
      SC.setScalar(io.host ? 0.85 : 1); M.compose(p, Qt.identity(), SC); ionsIM.setMatrixAt(ii++, M);
    });
    ionsIM.count = ii; ionsIM.instanceMatrix.needsUpdate = true;
    bodies.material.color.set(S.mode === "oil" ? 0x7fd08a : 0x58c27a);

    const cp = co2.geometry.attributes.position;
    co2.userData.pool.forEach((b, i) => { if (b.life > 0) { b.life -= dt * 0.5; b.p.y += dt * 1.6; cp.setXYZ(i, b.p.x, b.p.y, b.p.z); } else cp.setXYZ(i, 999, 999, 999); });
    cp.needsUpdate = true;

    S.histT += dt; if (S.histT > 0.5) { S.histT = 0; S.hist.push(pct()); if (S.hist.length > 80) S.hist.shift(); }
    S.uiT += dt; if (S.uiT > 0.25) { S.uiT = 0; renderHUD(act); }
  }

  const pct = () => (S.total ? S.done / S.total * 100 : 0);
  function renderHUD(act) {
    const p = pct();
    U.$("#m-pct").textContent = U.fmt(p, 0) + "%"; U.$("#m-pct").style.color = p > 70 ? ECO.TONES.good : p > 30 ? ECO.TONES.fair : ECO.TONES.warn;
    U.$("#m-rate").textContent = U.fmt(act * 100, 0) + "%";
    const bar = U.$("#m-rate-bar"); bar.style.width = (act * 100).toFixed(0) + "%"; bar.style.background = act > 0.6 ? ECO.TONES.good : act > 0.3 ? ECO.TONES.warn : ECO.TONES.severe;
    const c = U.$("#m-spark"), g = c.getContext("2d"), w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(150,214,204,0.15)"; g.beginPath(); [0.25, 0.5, 0.75].forEach(f => { g.moveTo(0, h * f); g.lineTo(w, h * f); }); g.stroke();
    if (S.hist.length > 1) {
      g.beginPath(); S.hist.forEach((v, i) => { const x = i / 79 * w, y = h - v / 100 * (h - 4) - 2; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.strokeStyle = ECO.COL.chloro; g.lineWidth = 2; g.stroke();
      g.lineTo((S.hist.length - 1) / 79 * w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = "rgba(147,221,138,0.15)"; g.fill();
    }
    U.$("#m-species").textContent = S.mode === "oil"
      ? `${bact.length} خلية · ${mols.filter(m => m.alive).length} جزيء هيدروكربوني متبقٍ`
      : `${bact.length} خلية · ${ions.filter(i => !i.host).length} أيون حر متبقٍ`;
  }
  function syncSlider() { const s = U.$("#m-bact"); if (s) { s.value = S.want; U.$("#m-bact-v").textContent = S.want; } }

  function renderInfo() {
    const oil = S.mode === "oil";
    const cards = oil ? [
      ["الكائنات المستخدمة", "بكتيريا Pseudomonas putida و Alcanivorax borkumensis و Rhodococcus. تفرز إنزيمات الأوكسيجينيز (Monooxygenase و Dioxygenase) التي تُدخل الأكسجين إلى سلاسل الألكانات والحلقات الأروماتية فتفككها."],
      ["العوامل المؤثرة", "الحرارة المثلى 25–35°م، و pH بين 6.5 و 8، ونسبة مغذيات C:N:P قريبة من 100:10:1، ووفرة الأكسجين. لاحظ كيف يتوقف النشاط تقريباً تحت 10°م وفوق 45°م."],
      ["تطبيق في صلاح الدين", "معالجة التربة الملوثة بالنفط حول مصفى بيجي بطريقة الزراعة الأرضية (Landfarming): حراثة التربة وتهويتها وإضافة الأسمدة لتنشيط البكتيريا المحلية، أو إضافة سلالات معزولة من الموقع نفسه."]
    ] : [
      ["الامتصاص الحيوي", "مجموعات الكربوكسيل والهيدروكسيل والفوسفات في جدار الخلية تحمل شحنات سالبة ترتبط بأيونات Pb²⁺ و Cd²⁺ و Cr³⁺. تعمل حتى الخلايا الميتة كمادة ماصة رخيصة."],
      ["الكائنات المستخدمة", "Bacillus subtilis، الطحالب Chlorella vulgaris و Spirulina platensis، والفطر Aspergillus niger. كفاءتها عالية عند pH بين 5 و 6.5، وتقل في الوسط الحامضي جداً بسبب تنافس أيونات H⁺."],
      ["ما بعد الامتصاص", "تُفصل الكتلة الحيوية المحمّلة بالمعادن بالترشيح، ثم تُستعاد المعادن بالغسل الحامضي ويُعاد استخدام الكتلة الحيوية عدة دورات."]
    ];
    U.$("#micro-info").innerHTML = cards.map(([h, p]) => `<div class="treat-card"><h4>${h}</h4><p class="muted" style="font-size:.85rem">${p}</p></div>`).join("");
  }

  ECO.views.micro = {
    init() {
      U.$("#micro-mode").innerHTML = `<button type="button" data-m="oil" class="on">تحلل النفط</button><button type="button" data-m="metal">امتصاص العناصر الثقيلة</button>`;
      U.$("#micro-mode").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.mode = b.dataset.m; U.$$("#micro-mode button").forEach(x => x.classList.toggle("on", x === b)); if (S.mode === "metal" && S.ph > 6.8) { S.ph = 6; U.$("#m-ph").value = 6; U.$("#m-ph-v").textContent = "6.0"; } if (st) reset(); };
      const bind = (id, key, fmt) => { const el = U.$("#" + id); el.oninput = () => { S[key] = +el.value; U.$("#" + id + "-v").textContent = fmt(+el.value); }; };
      bind("m-bact", "want", v => v); bind("m-temp", "temp", v => v + "°C"); bind("m-ph", "ph", v => v.toFixed(1));
      U.$("#m-nutr").onchange = e => { S.nutr = e.target.checked; };
      U.$("#m-augment").onclick = () => { S.want = Math.min(MAXB, S.want + 10); syncSlider(); };
      U.$("#m-spill").onclick = () => { if (S.mode === "oil") addSpill(20); else addIons(60); };
      renderInfo(); build();
    },
    show() { if (st) st.start(); },
    hide() { if (st) st.stop(); }
  };
})();
