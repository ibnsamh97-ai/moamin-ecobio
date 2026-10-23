/* =====================================================================
   EcoBio AI — الكرة الأرضية ثلاثية الأبعاد في الصفحة الرئيسية
   أرض منقطة، العراق مضيء، نهر دجلة، محطات الرصد، وأقمار صناعية تمسح المنطقة
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const R = 5;
  let st = null, orbit = null, stationObjs = [], sats = [], introT = 0;
  const D2R = Math.PI / 180;

  const ll2v = (lat, lon, r = R) => new THREE.Vector3(r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R));

  function isLand(lat, lon) {
    const m = ECO.LANDMASK_BITS;
    if (!m) return false;
    const x = ((Math.floor(lon + 180) % 360) + 360) % 360, y = U.clamp(Math.floor(90 - lat), 0, 179);
    const i = y * 360 + x;
    return (m[i >> 3] >> (i & 7)) & 1;
  }
  function inPoly(lon, lat, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function distToTigris(lat, lon) {
    let best = 99; const T = ECO.TIGRIS;
    for (let i = 0; i < T.length - 1; i++) {
      const [ay, ax] = T[i], [by, bx] = T[i + 1];
      const dx = bx - ax, dy = by - ay, t = U.clamp(((lon - ax) * dx + (lat - ay) * dy) / (dx * dx + dy * dy), 0, 1);
      best = Math.min(best, Math.hypot(lon - (ax + t * dx), lat - (ay + t * dy)));
    }
    return best;
  }

  function dotTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  }

  function build() {
    const canvas = U.$("#globe-canvas");
    st = ECO.makeStage(canvas, { fov: 38, clear: 0x051116 });
    if (!st) return;
    const { scene, camera } = st;
    const small = window.innerWidth < 700;

    // فك قناع اليابسة
    const raw = atob(ECO_LANDMASK.data); const bits = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bits[i] = raw.charCodeAt(i);
    ECO.LANDMASK_BITS = bits;

    const world = new THREE.Group(); scene.add(world);
    st.world = world;

    // المحيط
    const ocean = new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 64), new THREE.ShaderMaterial({
      uniforms: { c1: { value: new THREE.Color(0x061b22) }, c2: { value: new THREE.Color(0x0e3a44) } },
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
      fragmentShader: "uniform vec3 c1; uniform vec3 c2; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.2); gl_FragColor = vec4(mix(c1, c2, f), 1.0); }"
    }));
    world.add(ocean);

    // الغلاف الجوي المتوهج
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 64), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
      fragmentShader: "varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.,0.,1.)), 3.0); gl_FragColor = vec4(0.31, 0.78, 0.86, 1.0) * i * 0.75; }"
    }));
    scene.add(atm);

    // نقاط اليابسة (توزيع فيبوناتشي)
    const N = small ? 15000 : 30000, pos = [], col = [];
    const cLand = new THREE.Color(0x3f8f80), cIraq = new THREE.Color(0x93dd8a), cRiver = new THREE.Color(0x4fc8dc);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = golden * i;
      const lat = Math.asin(y) / D2R, lon = Math.atan2(Math.sin(th) * rr, Math.cos(th) * rr) / D2R;
      if (!isLand(lat, lon)) continue;
      if (lon > 38.5 && lon < 48.8 && lat > 29 && lat < 37.5 && inPoly(lon, lat, ECO.IRAQ)) continue; // يُرسم العراق بكثافة أعلى
      const v = ll2v(lat, lon, R * 1.002); pos.push(v.x, v.y, v.z);
      const shade = 0.75 + 0.5 * Math.random(); col.push(cLand.r * shade, cLand.g * shade, cLand.b * shade);
    }
    const tex = dotTexture();
    const g1 = new THREE.BufferGeometry();
    g1.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g1.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    world.add(new THREE.Points(g1, new THREE.PointsMaterial({ size: small ? 0.1 : 0.085, map: tex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.05 })));

    // العراق بنقاط كثيفة
    const ip = [], ic = [];
    for (let lat = 29; lat <= 37.5; lat += 0.22) for (let lon = 38.6; lon <= 48.7; lon += 0.22) {
      if (!inPoly(lon, lat, ECO.IRAQ)) continue;
      const v = ll2v(lat, lon, R * 1.004); ip.push(v.x, v.y, v.z);
      const d = distToTigris(lat, lon), c = d < 0.35 ? cRiver : cIraq, k = d < 0.35 ? 1 : 0.55 + 0.25 * Math.random();
      ic.push(c.r * k, c.g * k, c.b * k);
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(ip, 3)); g2.setAttribute("color", new THREE.Float32BufferAttribute(ic, 3));
    world.add(new THREE.Points(g2, new THREE.PointsMaterial({ size: 0.05, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

    // حدود العراق
    world.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ECO.IRAQ.map(([lo, la]) => ll2v(la, lo, R * 1.006))), new THREE.LineBasicMaterial({ color: 0x93dd8a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })));

    // نهر دجلة
    const tPts = [];
    for (let i = 0; i < ECO.TIGRIS.length - 1; i++) for (let s = 0; s < 6; s++) {
      const [a1, o1] = ECO.TIGRIS[i], [a2, o2] = ECO.TIGRIS[i + 1], t = s / 6;
      tPts.push(ll2v(U.lerp(a1, a2, t), U.lerp(o1, o2, t), R * 1.008));
    }
    tPts.push(ll2v(...ECO.TIGRIS[ECO.TIGRIS.length - 1], R * 1.008));
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tPts), new THREE.LineBasicMaterial({ color: 0x7fe3f2, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })));

    // المحطات
    stationObjs = ECO.STATIONS.map(s => {
      const base = ll2v(s.lat, s.lon, R * 1.01), dir = base.clone().normalize();
      const grp = new THREE.Group(); grp.position.copy(base); grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const color = new THREE.Color(ECO.TONES.info);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.y = 0.3; beam.scale.y = 0.6;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color }));
      grp.add(beam, ring, dot); world.add(grp);
      return { s, grp, beam, ring, dot, color, phase: Math.random() * 6, pos: base };
    });

    // الأقمار الصناعية
    const satDefs = [
      { name: "SUOMI NPP", r: 7.0, inc: 98.7, raan: 30, speed: 0.16, ph: 0 },
      { name: "TERRA", r: 7.6, inc: 98.2, raan: 80, speed: 0.13, ph: 2.1 },
      { name: "AURA", r: 8.2, inc: 98.2, raan: 140, speed: 0.11, ph: 4.0 }
    ];
    const iraqDir = ll2v(33.5, 44, 1).normalize();
    sats = satDefs.map(d => {
      const plane = new THREE.Group(); plane.rotation.order = "YXZ"; plane.rotation.y = d.raan * D2R; plane.rotation.x = (d.inc - 90) * D2R;
      world.add(plane);
      const ringPts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; ringPts.push(new THREE.Vector3(d.r * Math.cos(a), d.r * Math.sin(a), 0)); }
      const orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: 0x4fc8dc, dashSize: 0.12, gapSize: 0.16, transparent: true, opacity: 0.28 }));
      orbitLine.computeLineDistances(); plane.add(orbitLine);
      const sat = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.24), new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.7, roughness: 0.35, emissive: 0x3a2a08 }));
      const panelM = new THREE.MeshStandardMaterial({ color: 0x1d4f8a, metalness: 0.4, roughness: 0.4, emissive: 0x0b2440, side: THREE.DoubleSide });
      const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), panelM); p1.position.x = 0.36;
      const p2 = p1.clone(); p2.position.x = -0.36;
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), body.material); ant.position.y = 0.14;
      sat.add(body, p1, p2, ant); world.add(sat);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x4fc8dc, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      world.add(cone);
      const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0x93dd8a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
      world.add(beam);
      return { d, plane, sat, cone, beam, iraqDir };
    });

    // النجوم
    const sp = [];
    for (let i = 0; i < 1600; i++) { const v = new THREE.Vector3().randomDirection ? new THREE.Vector3().randomDirection() : new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); v.multiplyScalar(60 + Math.random() * 40); sp.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9fc9c2, size: 0.18, map: tex, transparent: true, opacity: 0.6, depthWrite: false })));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(10, 8, 12); scene.add(sun);

    // الكاميرا: تبدأ بعيدة ثم تقترب من العراق
    const thetaIraq = 44 * D2R, phiIraq = (90 - 31) * D2R;
    orbit = new ECO.Orbit(camera, canvas, { radius: 44, theta: thetaIraq - 1.6, phi: phiIraq, minR: 11, maxR: 46, auto: 0.035, minPhi: 0.3, maxPhi: 2.8 });
    orbit.tr = small ? 21 : 22.5; orbit.idle = -3;
    const intro = { from: thetaIraq - 1.6, to: thetaIraq };

    const tmpV = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    st.tick = (dt, t) => {
      introT += dt;
      if (introT < 3) { const e = 1 - Math.pow(1 - Math.min(1, introT / 3), 3); orbit.theta = U.lerp(intro.from, intro.to, e); }
      orbit.update(dt);
      // إزاحة الكرة لليسار على الشاشات العريضة حتى لا تغطي النص
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w > 900) { camera.aspect = (w * 1.5) / h; camera.setViewOffset(w * 1.5, h, w * 0.46, 0, w, h); }
      else if (camera.view && camera.view.enabled) { camera.aspect = w / h; camera.clearViewOffset(); }

      stationObjs.forEach(o => {
        const p = (Math.sin(t * 2.2 + o.phase) + 1) / 2;
        o.ring.scale.setScalar(1 + p * 1.6); o.ring.material.opacity = 0.9 * (1 - p);
      });
      sats.forEach(s => {
        const a = s.d.ph + t * s.d.speed;
        tmpV.set(s.d.r * Math.cos(a), s.d.r * Math.sin(a), 0); s.plane.localToWorld(tmpV); world.worldToLocal(tmpV);
        s.sat.position.copy(tmpV); s.sat.lookAt(0, 0, 0);
        const dir = tmpV.clone().normalize(), h2 = tmpV.length() - R;
        s.cone.position.copy(dir.clone().multiplyScalar(R + h2 / 2)); s.cone.scale.set(1, h2, 1);
        s.cone.quaternion.setFromUnitVectors(up, dir);
        const near = dir.dot(s.iraqDir);
        const k = U.clamp((near - 0.88) / 0.1, 0, 1);
        s.cone.material.opacity = 0.05 + 0.18 * k;
        s.cone.material.color.set(k > 0.2 ? 0x93dd8a : 0x4fc8dc);
        const arr = s.beam.geometry.attributes.position.array, tgt = stationObjs[0].pos;
        arr[0] = tmpV.x; arr[1] = tmpV.y; arr[2] = tmpV.z; arr[3] = tgt.x; arr[4] = tgt.y; arr[5] = tgt.z;
        s.beam.geometry.attributes.position.needsUpdate = true;
        s.beam.material.opacity = k * (0.5 + 0.5 * Math.sin(t * 10));
      });
    };
    updateStations(ECO._lastCurrent);
  }

  function updateStations(cur) {
    if (!cur || !stationObjs.length) return;
    stationObjs.forEach(o => {
      const c = cur[o.s.id] || {}, aqi = c[ECO.AQI_HEAD];
      const col = new THREE.Color(ECO.TONES[U.toneFor(ECO.AQI_HEAD, aqi)] || ECO.TONES.info);
      [o.beam, o.ring, o.dot].forEach(m => m.material.color.copy(col));
      const hgt = U.isNum(aqi) ? 0.25 + Math.min(aqi, 300) / 300 * 1.1 : 0.5;
      o.beam.scale.y = hgt; o.beam.position.y = hgt / 2;
    });
  }

  function renderLive(cur) {
    const box = U.$("#hero-live"); if (!box) return;
    const c = (cur && cur[ECO.DEFAULT_STATION]) || {};
    const items = [
      { k: ECO.AQI_HEAD, label: "مؤشر الهواء الصحي (PM2.5) – تكريت", unit: "AQI" },
      { k: "pm2_5", label: "PM2.5", unit: "µg/m³" },
      { k: "dust", label: "الغبار", unit: "µg/m³" },
      { k: "nitrogen_dioxide", label: "NO₂", unit: "µg/m³" }
    ];
    // إذا خالفت أرصاد المطارات تقدير النموذج نضع تنبيهاً على بطاقات الغبار
    const v = ECO.ground ? ECO.ground.verdict(c) : { kind: "none" };
    const doubt = v.kind === "over";
    const head = `<div class="hl-head"><span>الهواء في تكريت الآن</span><a href="#monitor">كل المحطات<svg aria-hidden="true"><use href="#i-chev"/></svg></a></div>`;
    if (!c.time) {
      // لا نعرض أرقاماً بديلة: إما انتظار أول جلب، أو رسالة واضحة عند انقطاع الاتصال
      box.innerHTML = head + (ECO.state.mode === "offline"
        ? `<p class="hl-empty">القراءات الحية غير متاحة الآن، ولا تعرض المنصة أرقاماً تقديرية بدلها.</p><button type="button" class="btn btn-sm" data-refresh-all><svg aria-hidden="true"><use href="#i-refresh"/></svg>إعادة المحاولة</button>`
        : `<div class="hl-skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="hl-empty">جارٍ جلب القراءات من Copernicus CAMS…</p>`);
      box.classList.toggle("is-empty", true);
    } else {
      const a = items[0], av = c[a.k], at = U.toneFor(a.k, av);
      const rest = items.slice(1).map(it => {
        const val = c[it.k], tone = U.toneFor(it.k, val);
        const flag = doubt && it.k !== "nitrogen_dioxide";
        return `<div class="hl-stat${flag ? " is-doubt" : ""}"><span class="k">${it.label}</span><b class="num tone-t-${tone}">${U.fmt(val, 1)}</b><small>${it.unit}</small>${flag ? `<em>لا يؤكده الرصد الأرضي</em>` : ""}</div>`;
      }).join("");
      box.innerHTML = head + `<div class="hl-main"><b class="num">${U.aqiText(av)}</b><span><span class="chip tone-${at}">${U.isNum(av) ? U.aqiBand(av).label : U.toneLabel[at]}</span><small>مؤشر الهواء الصحي (PM2.5)</small></span></div><div class="hl-row">${rest}</div>`;
      box.classList.toggle("is-empty", false);
    }
    const up = U.$("#hero-updated");
    if (up) up.textContent = c.time ? `تقدير نموذج Copernicus CAMS لساعة ${U.fmtTime(c.time)} بتوقيت بغداد، بدقة نحو 45 كم، وليس قياس محطة أرضية في تكريت.` : "";
    if (ECO.ground) ECO.ground.render();
  }

  ECO.bus.on("current", cur => { ECO._lastCurrent = cur; updateStations(cur); renderLive(cur); });
  ECO.bus.on("ground", () => { if (ECO._lastCurrent) renderLive(ECO._lastCurrent); });
  ECO.bus.on("mode", () => renderLive(ECO._lastCurrent));

  ECO.views.home = {
    init() { build(); },
    show() { if (st) st.start(); renderLive(ECO._lastCurrent); },
    hide() { if (st) st.stop(); }
  };
})();
