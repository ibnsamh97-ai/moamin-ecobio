/* =====================================================================
   EcoBio AI — مكتبة الملوثات: نماذج الكرة والعصا ثلاثية الأبعاد
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const EL = { H: { c: 0xf2f2f2, r: 0.26, cov: 0.31 }, C: { c: 0x3b3f45, r: 0.38, cov: 0.76 }, N: { c: 0x4f7cff, r: 0.36, cov: 0.71 }, O: { c: 0xef4b4b, r: 0.36, cov: 0.66 }, S: { c: 0xf2d23c, r: 0.5, cov: 1.05 }, P: { c: 0xff9a3c, r: 0.5, cov: 1.07 } };
  const D2R = Math.PI / 180;
  let st, orbit, group, cur = null;

  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const TET = [v3(1, 1, 1), v3(1, -1, -1), v3(-1, 1, -1), v3(-1, -1, 1)].map(v => v.normalize());
  function ring(r, n = 6, a0 = 0) { return Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return v3(Math.cos(a) * r, Math.sin(a) * r, 0); }); }
  function methyl(C, u) { // ثلاث ذرات هيدروجين بزاوية رباعية الأوجه حول ذرة كربون
    const v = v3(0, 0, 1), w = new THREE.Vector3().crossVectors(u, v).normalize();
    return [0, 120, 240].map(a => { const p = v.clone().multiplyScalar(Math.cos(a * D2R)).add(w.clone().multiplyScalar(Math.sin(a * D2R))); return C.clone().add(u.clone().multiplyScalar(0.334).add(p.multiplyScalar(0.943)).multiplyScalar(1.09)); });
  }
  const bent = (center, el, d, ang) => [{ e: el, p: v3(Math.sin(ang / 2 * D2R) * d, -Math.cos(ang / 2 * D2R) * d, 0) }, { e: el, p: v3(-Math.sin(ang / 2 * D2R) * d, -Math.cos(ang / 2 * D2R) * d, 0) }, { e: center, p: v3(0, 0, 0) }];

  const BUILD = {
    benzene() { const C = ring(1.39), H = ring(2.47); return [...C.map(p => ({ e: "C", p })), ...H.map(p => ({ e: "H", p }))]; },
    toluene() {
      const C = ring(1.39), H = ring(2.47), u = C[0].clone().normalize(), Cm = u.clone().multiplyScalar(2.9);
      return [...C.map(p => ({ e: "C", p })), ...H.slice(1).map(p => ({ e: "H", p })), { e: "C", p: Cm }, ...methyl(Cm, u).map(p => ({ e: "H", p }))];
    },
    phenol() {
      const C = ring(1.39), H = ring(2.47), u = C[0].clone().normalize(), O = u.clone().multiplyScalar(2.75), t = v3(-u.y, u.x, 0);
      return [...C.map(p => ({ e: "C", p })), ...H.slice(1).map(p => ({ e: "H", p })), { e: "O", p: O }, { e: "H", p: O.clone().add(u.clone().multiplyScalar(Math.cos(71 * D2R)).add(t.multiplyScalar(Math.sin(71 * D2R))).multiplyScalar(0.96)) }];
    },
    naphthalene() {
      const atoms = [], seen = [];
      [-1.21, 1.21].forEach(cx => ring(1.4, 6, 30 * D2R).forEach(p => {
        const q = p.clone().add(v3(cx, 0, 0));
        if (seen.some(s => s.distanceTo(q) < 0.1)) return; seen.push(q); atoms.push({ e: "C", p: q });
        if (Math.abs(q.x) > 0.1) atoms.push({ e: "H", p: q.clone().add(p.clone().normalize().multiplyScalar(1.08)) });
      }));
      return atoms;
    },
    nitrate() { return [{ e: "N", p: v3(0, 0, 0) }, ...ring(1.25, 3, 90 * D2R).map(p => ({ e: "O", p }))]; },
    phosphate() { return [{ e: "P", p: v3(0, 0, 0) }, ...TET.map(d => ({ e: "O", p: d.clone().multiplyScalar(1.54) }))]; },
    so2() { return bent("S", "O", 1.43, 119.5); },
    no2() { return bent("N", "O", 1.2, 134); },
    methane() { return [{ e: "C", p: v3(0, 0, 0) }, ...TET.map(d => ({ e: "H", p: d.clone().multiplyScalar(1.09) }))]; },
    h2s() { return bent("S", "H", 1.34, 92.1); }
  };

  function build() {
    const canvas = U.$("#mol-canvas");
    st = ECO.makeStage(canvas, { fov: 40, clear: 0x03090c });
    if (!st) return;
    st.scene.add(new THREE.HemisphereLight(0xdff6ff, 0x1a2a30, 0.8));
    const d = new THREE.DirectionalLight(0xffffff, 1); d.position.set(5, 8, 6); st.scene.add(d);
    const d2 = new THREE.DirectionalLight(0x4fc8dc, 0.5); d2.position.set(-6, -3, -5); st.scene.add(d2);
    // شبكة أرضية خافتة
    const grid = new THREE.PolarGridHelper(7, 12, 6, 64, 0x173a44, 0x102a32); grid.position.y = -3.2; st.scene.add(grid);
    orbit = new ECO.Orbit(st.camera, canvas, { radius: 10, theta: 0.6, phi: 1.15, minR: 4, maxR: 22, auto: 0.22 });
    st.tick = (dt, t) => { orbit.update(dt); if (group) group.position.y = Math.sin(t * 1.2) * 0.12; };
  }

  function show(id) {
    const m = ECO.MOLECULES.find(x => x.id === id); if (!m) return;
    cur = id;
    U.$$(".mol-item").forEach(b => b.classList.toggle("on", b.dataset.m === id));
    if (st) {
      if (group) st.scene.remove(group);
      group = new THREE.Group();
      const atoms = BUILD[id](), c = new THREE.Vector3();
      atoms.forEach(a => c.add(a.p)); c.divideScalar(atoms.length); atoms.forEach(a => a.p.sub(c));
      const sg = new THREE.SphereGeometry(1, 28, 20);
      atoms.forEach(a => { const e = EL[a.e]; const s = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: e.c, roughness: 0.3, metalness: 0.1 })); s.position.copy(a.p); s.scale.setScalar(e.r); group.add(s); });
      const cg = new THREE.CylinderGeometry(0.1, 0.1, 1, 12), up = v3(0, 1, 0);
      for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
        const A = atoms[i], B = atoms[j], dist = A.p.distanceTo(B.p);
        if (dist > 1.25 * (EL[A.e].cov + EL[B.e].cov) || (A.e === "H" && B.e === "H")) continue;
        const mid = A.p.clone().add(B.p).multiplyScalar(0.5), dir = B.p.clone().sub(A.p).normalize();
        [[A, A.p, mid], [B, mid, B.p]].forEach(([at, p1, p2]) => {
          const cyl = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: EL[at.e].c, roughness: 0.45 }));
          cyl.position.copy(p1).add(p2).multiplyScalar(0.5); cyl.scale.set(1, p1.distanceTo(p2), 1); cyl.quaternion.setFromUnitVectors(up, dir); group.add(cyl);
        });
      }
      const rad = Math.max(...atoms.map(a => a.p.length())) + 0.6;
      orbit.tr = U.clamp(rad * 3.2 + 2, 5, 20);
      st.scene.add(group);
    }
    U.$("#mol-facts").innerHTML = `
      <div class="panel-h"><h3>${m.name} <span class="mono" style="color:var(--river);direction:ltr;display:inline-block">${m.formula}</span></h3><span class="chip tone-warn">${m.group}</span></div>
      <dl class="facts">
        <div><dt>المصادر</dt><dd>${m.source}</dd></div>
        <div><dt>الأثر الصحي والبيئي</dt><dd>${m.effect}</dd></div>
        <div><dt>الحد المسموح / المرجعي</dt><dd class="mono" style="font-family:var(--f-body)">${m.limit}</dd></div>
        <div><dt>طرق المعالجة</dt><dd>${m.treat}</dd></div>
      </dl>
      <div class="row" style="margin-top:14px"><a class="btn btn-sm btn-bio" href="#assistant" id="mol-ask"><svg><use href="#i-chat"/></svg>اسأل المساعد عن ${m.name}</a></div>`;
    U.$("#mol-ask").onclick = () => { ECO.prefillChat && ECO.prefillChat(`حدثني بالتفصيل عن ${m.name} (${m.formula}) كملوث في البيئة العراقية: مصادره، سلوكه في الماء والتربة والهواء، وأفضل طرق المعالجة الحيوية له مع أسماء الكائنات الدقيقة.`); };
  }

  ECO.views.molecules = {
    init() {
      U.$("#mol-list").innerHTML = ECO.MOLECULES.map(m => `<button type="button" class="mol-item" data-m="${m.id}"><span>${m.name}<span class="faint" style="display:block;font-size:.7rem">${m.group}</span></span><span class="f">${m.formula}</span></button>`).join("");
      U.$("#mol-list").onclick = e => { const b = e.target.closest(".mol-item"); if (b) show(b.dataset.m); };
      build(); show(ECO.MOLECULES[0].id);
    },
    show() { if (st) st.start(); },
    hide() { if (st) st.stop(); }
  };
})();
