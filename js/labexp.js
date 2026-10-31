/* =====================================================================
   EcoBio AI — تجارب المختبر الافتراضي
   خمس تجارب عملية في المعالجة والتلوث. كل نتيجة رقمية مأخوذة من بحث منشور
   (js/data-lab.js)، والحركة ثلاثية الأبعاد من محرك js/lab3d.js.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, LAB = ECO.LAB, D = ECO.LAB_DATA;
  if (!LAB || !D || !window.THREE) return;
  const n = LAB.num, C = ECO.COL;
  const f2 = v => U.fmt(v, 2), f1 = v => U.fmt(v, 1);
  const pct = (a, b) => (a - b) / a * 100;
  const axes = (x, y, o = {}) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { usePointStyle: true } }, tooltip: { rtl: true } },
    scales: { x: Object.assign({ title: { display: !!x, text: x }, grid: { color: C.grid } }, o.x || {}), y: Object.assign({ title: { display: !!y, text: y }, beginAtZero: true, grid: { color: C.grid } }, o.y || {}) }
  });
  const tbl = (head, rows, cls = "") => `<div class="lb-tblw"><table class="lb-rt ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const upd = () => { const ch = window.Chart && Chart.getChart && Chart.getChart(document.getElementById("lb-chart")); if (ch) ch.update(); };
  const kv = items => `<div class="lb-kv">${items.map(([k, v, t]) => `<div class="${t || ""}"><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;

  /* ==================================================================
     1) اختبار الجرة
  ================================================================== */
  const J = D.jar;
  const turbLook = ntu => { const t = U.clamp(Math.log10(1 + ntu) / Math.log10(31), 0, 1); return [new THREE.Color(0xd5edf2).lerp(new THREE.Color(0xc29f62), t).getHex(), 0.13 + 0.64 * t]; };
  const optIdx = res => res.findIndex(v => v <= J.limit);

  function jarFlocs(L, tester) {
    const N = 70, geo = new THREE.DodecahedronGeometry(0.017, 0), mat = new THREE.MeshStandardMaterial({ color: 0xe6d6ab, roughness: 0.85 });
    const F = { mode: "off", eff: [0, 0, 0, 0, 0, 0], sw: [], parts: [] };
    tester.jars.forEach((jar, j) => {
      const sw = new L.Swarm(N, geo, mat, jar.g); sw.mesh.visible = false; F.sw.push(sw);
      F.parts.push(Array.from({ length: N }, () => ({ a: Math.random() * 6.28, r: 0.04 + Math.random() * 0.27, y: 0.1 + Math.random() * (tester.jh * 0.68), s: 0.3, sink: false, floor: 0.035 + Math.random() * 0.05, j: Math.random() })));
    });
    F.set = (mode, eff) => { F.mode = mode; if (eff) F.eff = eff.slice(); F.sw.forEach((sw, j) => { sw.mesh.visible = mode !== "off"; if (mode === "slow") F.parts[j].forEach(p => { p.sink = Math.random() < F.eff[j]; }); }); };
    F.reset = () => { F.parts.forEach(ps => ps.forEach(p => { p.y = 0.1 + Math.random() * (tester.jh * 0.68); p.s = 0.3; p.sink = false; })); F.set("off"); };
    L.loop(sdt => {
      if (F.mode === "off") return;
      F.sw.forEach((sw, j) => {
        const e = F.eff[j], big = 0.55 + 2.1 * e;
        F.parts[j].forEach((p, i) => {
          if (F.mode === "rapid") { p.a += sdt * 5.5; p.s += (0.35 - p.s) * Math.min(1, sdt * 3); p.y += Math.sin(p.a * 3 + i) * sdt * 0.12; }
          else if (F.mode === "slow") { p.a += sdt * 1.3; const t = p.sink ? big : 0.45; p.s += (t - p.s) * Math.min(1, sdt * 0.5); }
          else if (F.mode === "settle") { if (p.sink) p.y = Math.max(p.floor, p.y - sdt * (0.09 + 0.12 * p.s)); else { p.a += sdt * 0.12; } }
          p.y = U.clamp(p.y, 0.035, tester.jh * 0.74);
          sw.p[i].set(Math.cos(p.a) * p.r, p.y, Math.sin(p.a) * p.r); sw.s[i] = p.s;
        });
        sw.sync();
      });
    });
    return F;
  }

  async function jarRun(L, key, fast) {
    const R = J.runs[key], S = L.S, T = S.tester, k = fast ? 0.45 : 1;
    const rawLook = turbLook(J.raw), res = R.res, eff = res.map(v => U.clamp(pct(J.raw, v) / 100, 0, 1));
    // الخلط السريع
    T.rpm = J.mix.fast[0]; T.screen.set([`${J.mix.fast[0]} rpm`, `${J.mix.fast[1]}:00`]);
    S.F.set("rapid", eff);
    await L.wait({ mins: J.mix.fast[1], sec: 4 * k, label: `الخلط السريع ${J.mix.fast[0]} دورة/دقيقة` });
    // الخلط البطيء
    T.rpm = J.mix.slow[0]; T.screen.set([`${J.mix.slow[0]} rpm`, `${J.mix.slow[1]}:00`]); S.F.set("slow");
    await L.wait({ mins: J.mix.slow[1], sec: 6 * k, label: `الخلط البطيء ${J.mix.slow[0]} دورة/دقيقة` });
    // الترسيب
    T.rpm = 0; T.screen.set(["0 rpm", "ترسيب"]); S.F.set("settle");
    T.jars.forEach((jar, i) => { const [c, o] = turbLook(res[i]); jar.liq.color(c, o, 6 * k); });
    await L.wait({ mins: J.mix.settle, sec: 6.5 * k, label: "الترسيب دون خلط" });
    return { rawLook, res };
  }
  /* عيّنة بالقنينة: تُغمر في الوعاء وتمتلئ ثم ترتفع */
  async function jarSample(L, S, z, look, depth) {
    const v = S.vial; v.liq.set(0);
    await L.moveTo(v.g, [z.pos.x, z.pos.y + depth, z.pos.z], 0.4);
    v.liq.color(look[0], look[1], 0.01); await v.liq.to(0.26, 0.35);
    await L.moveTo(v.g, [z.pos.x, z.top + 0.3, z.pos.z], 0.35);
  }
  /* قراءة جهاز العكارة لجرة وتسجيلها في اللافتة والدفتر والرسم */
  function jarRecord(L, key, i) {
    const R = J.runs[key], S = L.S, v = R.res[i], ok = v <= J.limit;
    S.turb.screen.set([`${f1(v)} NTU`, `جرة ${i + 1}`]);
    S.tags[i].set(`${n(J.doses[i], "ملغم/ل")}<br><b>${n(f1(v), "NTU")}</b>`).cls("dose " + (ok ? "good" : "bad"));
    L.nb.row(`${key}-${i}`, [`${R.label} · ${i + 1}`, n(J.doses[i]), n(f1(v)), n(Math.round(pct(J.raw, v)), "%")]);
    S.chartData[key][i] = v; upd();
  }

  LAB.reg({
    id: "jar", title: "اختبار الجرة", cat: "معالجة · التخثير والتلبيد", icon: "beaker", hue: "#4fc8dc",
    blurb: "أقل جرعة شب تُصفّي ماءً عكراً، وأثر برودة الماء فيها",
    aim: `إيجاد أقل جرعة من الشب تخفض عكارة ماء خام عكارته ${n(J.raw, "NTU")} إلى حد المواصفة العراقية ${n(J.limit, "NTU")}، ثم مقارنة الجرعة في ماء الشتاء البارد (${n(J.runs.winter.T, "°م")}) وماء الصيف (${n(J.runs.summer.T, "°م")}).`,
    src: J.src,
    materials: ["جهاز اختبار الجرة: ست جرار وخلّاط لكل جرة", `ماء خام عكارته ${n(J.raw, "NTU")}، و pH ${n(J.ph)}، وقاعدية ${n(J.alk, "ملغم/لتر")}`, "محلول شب Al₂(SO₄)₃·18H₂O تركيزه 1% (كل 1 مل = 10 ملغم)", "ماصة مدرّجة", "محرار", "جهاز قياس العكارة Turbidimeter وقنينة عيّنة"],
    tools: [
      { id: "jug", name: "إبريق الماء الخام", icon: "milk", why: "نملأ به الجرار في بداية التجربة." },
      { id: "thermo", name: "محرار", icon: "thermo", why: "نقيس به حرارة الماء الخام بعد ملء الجرار." },
      { id: "vial", name: "قنينة العيّنة", icon: "tube", why: "نأخذ بها عيّنة إلى جهاز العكارة." },
      { id: "pip", name: "الماصة", icon: "pipette", why: "نسحب بها الشب ونضيفه بعد قياس الماء الخام." }
    ],
    views: {
      intro: { t: [0, 1.15, 0], r: 10.5, th: 0, ph: 1.15 },
      jars: { t: [0, 1.0, -0.2], r: 8.2, th: 0, ph: 1.2 },
      left: { t: [-3.2, 0.8, 0.4], r: 6, th: -0.25, ph: 1.12 },
      turb: { t: [2.6, 0.7, 0.3], r: 6.2, th: 0.3, ph: 1.08 },
      close: { t: [0, 0.95, -0.4], r: 7.6, th: 0, ph: 1.22 }
    },
    nb: ["الجرة", "الشب (ملغم/لتر)", "العكارة (NTU)", "الإزالة"],
    chartTitle: "العكارة المتبقية حسب جرعة الشب", chartSub: "كل نقطة جرة",
    chart(L) {
      L.S.chartData = { winter: J.doses.map(() => null), summer: J.doses.map(() => null) };
      return {
        type: "line",
        data: { labels: J.doses.map(String), datasets: [
          { label: `الشتاء (${J.runs.winter.T}°م)`, data: L.S.chartData.winter, borderColor: C.river, backgroundColor: C.river, tension: 0.25, pointRadius: 4 },
          { label: `الصيف (${J.runs.summer.T}°م)`, data: L.S.chartData.summer, borderColor: C.silt, backgroundColor: C.silt, tension: 0.25, pointRadius: 4 },
          { label: `حد المواصفة ${J.limit} NTU`, data: J.doses.map(() => J.limit), borderColor: C.crimson, borderDash: [5, 4], pointRadius: 0, borderWidth: 1.4 }
        ] },
        options: axes("جرعة الشب (ملغم/لتر)", "العكارة المتبقية (NTU)")
      };
    },
    setup(L) {
      const S = L.S, raw = turbLook(J.raw);
      S.tester = L.put(L.MK.jarTester({ color: raw[0], opacity: raw[1] }), 0, 0, -0.75);
      S.jug = L.put(L.MK.jug({ label: ["ماء خام", `عكارة ${J.raw} NTU`], color: raw[0], opacity: 0.8 }), -5.1, 0, 0.9);
      S.thermo = L.put(L.MK.thermometer(), -4.1, 0, 1.4); S.thermo.g.rotation.z = 0.12; S.thermo.set(20);
      S.alum = L.put(L.MK.bottle({ label: ["شب 1%", "Al₂(SO₄)₃"], cap: 0xe6ae4f, color: 0xeef4f4, opacity: 0.25 }), -4.2, 0, -0.2);
      S.pip = L.put(L.MK.pipette({ color: 0xeef4f4 }), -3.6, 0, -0.25);
      S.turb = L.put(L.MK.turbidimeter(), 4.4, 0, 0.9);
      S.well = S.turb.g.localToWorld(S.turb.well.clone());
      S.vial = L.put(L.MK.vial({ color: raw[0], opacity: raw[1] }), 3.7, 0, 1.35); S.vialHome = [3.7, 0, 1.35];
      S.F = jarFlocs(L, S.tester);
      L.loop(sdt => S.tester.spin(sdt));
      S.tags = S.tester.jars.map((jar, i) => L.label(jar.g, `${n(i + 1)}`, { dy: S.tester.jh + 0.22, cls: "dose" }));
      S.fillH = S.tester.jh * 0.74;
      const lineM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
      S.tester.jars.forEach(j => L.mesh(new THREE.BoxGeometry(j.w * 0.9, 0.01, 0.004), lineM, 0, S.fillH, j.w / 2 + 0.004, j.g));
      S.knob = L.hitbox(S.tester.g, S.tester.W / 2 - 0.22, 0.24 + S.tester.jh + 0.62, 0.22, 0.2);
    },
    steps: [
      { t: "ما هو اختبار الجرة؟", cam: "intro",
        say: `<p>حبيبات الطين العالقة في ماء النهر صغيرة جداً وتحمل شحنات سالبة، فتتنافر ولا تترسب وحدها. نضيف مادة مخثّرة مثل <b>الشب</b> فتعادل الشحنات وتتجمع الحبيبات في <b>ندف</b> ثقيلة تترسب.</p><p>نضع الماء نفسه في ست جرار، ونعطي كل جرة جرعة شب مختلفة (${J.doses.join(" و")} ملغم/لتر)، ثم نختار <b>أقل جرعة</b> تُنزل العكارة إلى ${n(J.limit, "NTU")}.</p><p>في كل خطوة تأخذ الأداة من الصينية بيدك، وتحرّكها في المختبر، وتضعها على الهدف المضيء.</p>`,
        info: "الشب يتحلل في الماء إلى هيدروكسيد الألمنيوم Al(OH)₃، وهو راسب هلامي يلتقط الحبيبات العالقة أثناء تكوّنه (آلية الكنس)." },
      { t: "املأ الجرار بالماء الخام", cam: "jars", tool: "jug",
        say: `<p>خذ إبريق الماء الخام وحرّكه فوق إحدى الجرار، ثم <b>اضغط مطولاً</b> فيميل الإبريق ويصبّ. يتوقف الصب عند علامة اللتر البيضاء. املأ الجرار الست.</p><p>عكارة هذا الماء ${n(J.raw, "NTU")}، وقاعديته ${n(J.alk, "ملغم/لتر")}.</p>`,
        info: "نستعمل الماء نفسه في كل الجرار حتى يكون الفرق الوحيد بينها جرعة الشب. على الهاتف: اسحب الإبريق بإصبعك إلى الجرة وأبقِ إصبعك ضاغطاً.",
        async run(L) {
          const S = L.S, raw = turbLook(J.raw);
          await L.grab(S.jug);
          await L.pourInto(S.tester.jars.map(j => L.zone(j, { to: S.fillH, r: 0.4 })), { rate: 0.5, color: raw[0], dstColor: raw[0], dstOpacity: raw[1], srcRate: 0.01, hint: "حرّك الإبريق فوق جرة مضيئة واضغط مطولاً لتصب" });
          await L.letGo();
        },
        done: "امتلأت الجرار الست بلتر من الماء الخام." },
      { t: "قِس حرارة الماء الخام", cam: "left", tool: "thermo",
        say: "<p>خذ المحرار وضعه داخل إبريق الماء الخام، وانتظر حتى يثبت عموده الأحمر.</p><p>الحرارة مهمة: الماء البارد أكثر لزوجة، وتفاعلات الشب فيه أبطأ.</p>",
        async run(L) {
          const S = L.S;
          await L.grab(S.thermo);
          const z = await L.dropOn(L.zone(S.jug, { r: 0.5 }), { hint: "ضع المحرار فوق الإبريق المضيء وانقر لتغمره" });
          await L.moveTo(S.thermo.g, [z.pos.x, 0.45, z.pos.z], 0.5);
          await S.thermo.to(J.runs.winter.T, 1.4);
          const tl = L.label(S.thermo.g, n(J.runs.winter.T, "°م"), { dy: 1.35, cls: "read" }); await L.sleep(0.9); tl.remove();
          await L.letGo();
        },
        done: `حرارة الماء ${n(J.runs.winter.T, "°م")}: هذا ماء شتاء بارد.` },
      { t: "قِس عكارة الماء الخام", cam: "turb", tool: "vial",
        say: "<p>خذ قنينة العيّنة واغمرها في إبريق الماء الخام، ثم ضعها في فتحة جهاز قياس العكارة.</p>",
        info: "وحدة NTU تقيس كمية الضوء الذي تبعثره الحبيبات العالقة بزاوية 90°. كلما زادت الحبيبات زاد التبعثر.",
        async run(L) {
          const S = L.S;
          await L.grab(S.vial);
          const z = await L.dropOn(L.zone(S.jug, { r: 0.5 }), { hint: "اغمر القنينة في الماء الخام: ضعها فوق الإبريق وانقر" });
          await jarSample(L, S, z, turbLook(J.raw), 0.35);
          await L.dropOn(L.zone(S.turb, { pos: S.well, top: 0.3, r: 0.28 }), { hint: "ضع القنينة في فتحة جهاز العكارة" });
          await L.moveTo(S.vial.g, [S.well.x, S.well.y - 0.04, S.well.z], 0.4);
          S.turb.screen.set(["…", "قياس"]); await L.sleep(0.7);
          S.turb.screen.set([`${f1(J.raw)} NTU`, "الماء الخام"]);
          L.nb.row("raw", ["الماء الخام", "—", n(f1(J.raw)), "—"]);
          await L.sleep(0.5); await L.letGo(); S.vial.liq.set(0);
        },
        done: `عكارة الماء الخام ${n(J.raw, "NTU")}، أي ستة أضعاف حد المواصفة.` },
      { t: "أضف جرعات الشب", cam: "jars", tool: "pip",
        say: `<p>خذ الماصة واسحب الشب من قنينته، ثم ضعها فوق الجرار بالترتيب من 1 إلى 6. الجرة 1 تأخذ ${n(J.doses[0], "ملغم/لتر")}، وتزيد الجرعة ${n(5)} في كل جرة.</p><p class="lb-eq">حجم المحلول (مل) = الجرعة (ملغم/لتر) × حجم الماء (لتر) ÷ تركيز المحلول (10 ملغم/مل)</p><p>مثلاً: الجرة 1 تحتاج ${n("5 × 1 ÷ 10 = 0.5", "مل")}، والجرة 6 تحتاج ${n("3", "مل")}.</p>`,
        info: "نضيف الشب إلى كل الجرار بأسرع ما يمكن حتى يبدأ الخلط فيها معاً.",
        async run(L) {
          const S = L.S, p = S.pip;
          await L.grab(p);
          const za = await L.dropOn(L.zone(S.alum, { r: 0.35 }), { hint: "اسحب الشب: ضع الماصة فوق قنينة الشب وانقر" });
          await L.moveTo(p.g, [za.pos.x, 0.15, za.pos.z], 0.4); await p.fill(0.8, 0xeef4f4, 0.4); await L.moveTo(p.g, [za.pos.x, 1.3, za.pos.z], 0.4);
          await L.repeat(S.tester.jars, async (jar, i) => {
            const z = await L.dropOn(L.zone(jar, { r: 0.4 }), { hint: `ضع الماصة فوق الجرة ${i + 1} لتضيف ${U.fmt(J.doses[i] / 10, 1)} مل (${J.doses[i]} ملغم/لتر)` });
            const top = new THREE.Vector3(z.pos.x + 0.12, z.top + 0.05, z.pos.z + 0.18);
            await L.moveTo(p.g, [top.x, top.y, top.z], 0.3);
            await L.drops(top, jar, i + 1, 0xf2f6f6, 0.08);
            S.tags[i].set(n(J.doses[i], "ملغم/ل"));
            await p.fill(0.8 * (1 - (i + 1) / 7), null, 0.15);
          }, { autoAfter: 2 });
          await p.fill(0, null, 0.2); await L.letGo();
        },
        done: "كل جرة الآن فيها جرعة مختلفة. اللافتة فوق كل جرة تبيّن جرعتها." },
      { t: "الخلط السريع", cam: "close", auto: true,
        say: `<p>اضغط زر التشغيل المضيء على جهاز الجرة لتبدأ <b>الخلط السريع</b>: ${n(J.mix.fast[0], "دورة/دقيقة")} لمدة ${n(J.mix.fast[1], "دقيقة")}، فينتشر الشب في الماء كله خلال ثوانٍ.</p>`,
        info: "لو انتشر المخثّر ببطء لتفاعل في جزء من الماء فقط وضاع أثره في الباقي.",
        async run(L) {
          const S = L.S, T = S.tester, eff = J.runs.winter.res.map(v => U.clamp(pct(J.raw, v) / 100, 0, 1));
          await L.press([{ obj: S.knob, halo: true, r: 0.18, label: "زر التشغيل" }], { hint: "اضغط زر التشغيل المضيء على جهاز الجرة", label: "شغّل الخلّاط" });
          T.rpm = J.mix.fast[0]; T.screen.set([`${J.mix.fast[0]} rpm`, "سريع"]); S.F.set("rapid", eff);
          await L.wait({ mins: J.mix.fast[1], sec: 4, label: `الخلط السريع ${J.mix.fast[0]} دورة/دقيقة` });
        },
        done: "انتشر الشب في الجرار وبدأت الحبيبات تتجمع." },
      { t: "الخلط البطيء", cam: "close", auto: true,
        say: `<p>اضغط الزر مرة أخرى لتخفض السرعة إلى ${n(J.mix.slow[0], "دورة/دقيقة")} لمدة ${n(J.mix.slow[1], "دقائق")}، حتى تتصادم الحبيبات الصغيرة وتكبر الندف.</p>`,
        info: "لو استمر الخلط سريعاً لتكسرت الندف الكبيرة. غيّر سرعة الوقت من ×1 إلى ×4 أعلى المختبر لتسريع المشاهدة.",
        async run(L) {
          const S = L.S, T = S.tester;
          await L.press([{ obj: S.knob, halo: true, r: 0.18, label: "خفّض السرعة" }], { hint: "اضغط الزر لتخفض السرعة إلى 30 دورة/دقيقة", label: "خفّض السرعة" });
          T.rpm = J.mix.slow[0]; T.screen.set([`${J.mix.slow[0]} rpm`, "بطيء"]); S.F.set("slow");
          await L.wait({ mins: J.mix.slow[1], sec: 7, label: `الخلط البطيء ${J.mix.slow[0]} دورة/دقيقة` });
        },
        done: "تكوّنت الندف. لاحظ أنها أكبر في الجرار ذات الجرعات الأعلى." },
      { t: "الترسيب", cam: "close", auto: true,
        say: `<p>أوقف الخلّاط بالضغط على الزر، واترك الجرار ساكنة ${n(J.mix.settle, "دقيقة")}. الندف الثقيلة تهبط إلى القاع، ويصفو الماء فوقها.</p>`,
        async run(L) {
          const S = L.S, T = S.tester, res = J.runs.winter.res;
          await L.press([{ obj: S.knob, halo: true, r: 0.18, label: "إيقاف" }], { hint: "اضغط الزر لإيقاف الخلّاط", label: "أوقف الخلّاط" });
          T.rpm = 0; T.screen.set(["0 rpm", "ترسيب"]); S.F.set("settle");
          T.jars.forEach((jar, i) => { const [c, o] = turbLook(res[i]); jar.liq.color(c, o, 7); });
          await L.wait({ mins: J.mix.settle, sec: 7.5, label: "الترسيب دون خلط" });
        },
        done: "انتهى الترسيب. الآن نقيس عكارة الماء الصافي فوق الندف." },
      { t: "قِس العكارة المتبقية", cam: "intro", tool: "vial",
        say: "<p>خذ قنينة العيّنة: اسحب عيّنة من الماء الصافي في أعلى كل جرة دون أن تحرّك الراسب، ثم ضعها في جهاز العكارة. ابدأ بالجرة 1.</p>",
        info: "الأرقام التي تظهر هي النتائج المنشورة في الجدول 5 من البحث لماء عكارته 30 NTU بحرارة 9°م.",
        async run(L) {
          const S = L.S, res = J.runs.winter.res;
          await L.grab(S.vial);
          await L.repeat(S.tester.jars, async (jar, i) => {
            const z = await L.dropOn(L.zone(jar, { r: 0.4 }), { hint: `خذ عيّنة من أعلى الجرة ${i + 1}` });
            await jarSample(L, S, z, turbLook(res[i]), 0.8);
            await L.dropOn(L.zone(S.turb, { pos: S.well, top: 0.3, r: 0.28 }), { hint: "ضع القنينة في جهاز العكارة" });
            await L.moveTo(S.vial.g, [S.well.x, S.well.y - 0.04, S.well.z], 0.3);
            jarRecord(L, "winter", i); await L.sleep(0.4);
          }, { autoAfter: 2 });
          await L.letGo(); S.vial.liq.set(0);
        },
        done: "سُجّلت القراءات في دفتر المختبر وفي الرسم." },
      { t: "حدّد الجرعة المثلى", cam: "jars", auto: true,
        say: `<p>الجرعة المثلى هي <b>أقل</b> جرعة تُنزل العكارة إلى ${n(J.limit, "NTU")} أو أقل. انقر على الجرة التي تمثلها، أو اختر جرعتها:</p>`,
        async run(L) {
          const S = L.S, R = J.runs.winter.res, k = optIdx(R);
          const opts = J.doses.map((d, i) => ({ label: `${d} ملغم/لتر`, value: i }));
          const objs = S.tester.jars.map((jar, i) => ({ obj: jar.g, value: i }));
          const ch = await L.choose(opts, objs);
          let msg;
          if (ch === k) msg = `صحيح: ${n(J.doses[k], "ملغم/لتر")} أقل جرعة وصلت بالعكارة إلى ${n(f1(R[k]), "NTU")}.`;
          else if (ch < k) msg = `جرعة ${n(J.doses[ch], "ملغم/لتر")} لم تكفِ: بقيت العكارة ${n(f1(R[ch]), "NTU")}، أعلى من الحد. الجرعة المثلى ${n(J.doses[k], "ملغم/لتر")}.`;
          else msg = `جرعة ${n(J.doses[ch], "ملغم/لتر")} أعطت عكارة ${n(f1(R[ch]), "NTU")}، أعلى من جرة ${n(J.doses[k])}. الشب الزائد يعكس شحنة الحبيبات فتعود للتنافر وتبقى عالقة (إعادة التثبيت)، فضلاً عن هدر المادة. الجرعة المثلى ${n(J.doses[k], "ملغم/لتر")}.`;
          L.show(`<div class="notice ${ch === k ? "info" : "warn"}"><div>${msg}</div></div>`);
          S.tags[k].cls("dose good best");
        },
        done: `الجرعة المثلى لماء الشتاء: ${n(J.doses[optIdx(J.runs.winter.res)], "ملغم/لتر")}. ولاحظ أن جرعة 30 أسوأ منها.` },
      { t: "كرّر التجربة بماء الصيف", cam: "intro", act: "نفّذ تجربة ماء الصيف", actIcon: "play",
        say: `<p>نعيد الخطوات نفسها على ماء عكارته ${n(J.raw, "NTU")} أيضاً، لكن حرارته ${n(J.runs.summer.T, "°م")}. ستُنفَّذ تلقائياً وبسرعة لأنك نفّذتها بيدك قبل قليل.</p>`,
        async run(L) {
          const S = L.S, T = S.tester, raw = turbLook(J.raw);
          T.jars.forEach(j => j.liq.to(0, 0.8)); S.F.reset(); await L.sleep(0.9);
          S.tags.forEach((t, i) => t.set(n(i + 1)).cls("dose"));
          await L.pourRow(S.jug, T.jars, { to: S.fillH, color: raw[0], dstColor: raw[0], dstOpacity: raw[1], streamOpacity: 0.75, dur: 0.4, glide: 0.25, srcDrop: 0.0, tiltDur: 0.4, move: 0.6 });
          const jw = S.jug.g.position;
          await L.arcTo(S.thermo.g, [jw.x, 0.45, jw.z], 0.5, 0.6); await S.thermo.to(J.runs.summer.T, 0.8);
          const tl = L.label(S.thermo.g, n(J.runs.summer.T, "°م"), { dy: 1.35, cls: "read" }); await L.sleep(0.5); tl.remove();
          await L.arcTo(S.thermo.g, [-4.1, 0, 1.4], 0.5, 0.6);
          S.tags.forEach((t, i) => t.set(n(J.doses[i], "ملغم/ل")));
          await jarRun(L, "summer", true);
          for (let i = 0; i < T.jars.length; i++) { jarRecord(L, "summer", i); await L.sleep(0.25); }
        },
        done: "سُجّلت نتائج ماء الصيف بجانب نتائج الشتاء." },
      { t: "قارن الموسمين واستنتج", cam: "jars", auto: true,
        say: "<p>قارن المنحنيين في الرسم: أين يعبر كل منحنى خط الحد الأحمر؟</p>",
        async run(L) {
          const kw = optIdx(J.runs.winter.res), ks = optIdx(J.runs.summer.res);
          L.S.tags.forEach((t, i) => t.cls("dose" + (i === ks ? " good best" : "")));
          L.show(kv([["الجرعة المثلى في الشتاء", n(J.doses[kw], "ملغم/لتر"), "c-river"], ["الجرعة المثلى في الصيف", n(J.doses[ks], "ملغم/لتر"), "c-silt"]]) + `<p>الماء البارد احتاج شباً أكثر بمقدار ${n(J.doses[kw] - J.doses[ks], "ملغم/لتر")}. ${J.paperNote}</p>`);
        },
        done: "انتهت التجربة. افتح النتائج لترى الاستنتاج كاملاً." }
    ],
    results(L) {
      const W = J.runs.winter.res, Sm = J.runs.summer.res, kw = optIdx(W), ks = optIdx(Sm);
      return `
        ${kv([["عكارة الماء الخام", n(J.raw, "NTU")], ["الجرعة المثلى · شتاء " + J.runs.winter.T + "°م", n(J.doses[kw], "ملغم/لتر"), "c-river"], ["الجرعة المثلى · صيف " + J.runs.summer.T + "°م", n(J.doses[ks], "ملغم/لتر"), "c-silt"], ["حد العكارة", n(J.limit, "NTU")]])}
        ${tbl(["جرعة الشب (ملغم/لتر)", "عكارة الشتاء (NTU)", "إزالة الشتاء", "عكارة الصيف (NTU)", "إزالة الصيف"], J.doses.map((d, i) => [n(d), n(f1(W[i])), n(Math.round(pct(J.raw, W[i])), "%"), n(f1(Sm[i])), n(Math.round(pct(J.raw, Sm[i])), "%")]))}
        <h4>الاستنتاج</h4>
        <ul class="lb-concl">
          <li>أقل جرعة أوصلت ماء الشتاء إلى ${n(J.limit, "NTU")} هي ${n(J.doses[kw], "ملغم/لتر")}، وفي الصيف ${n(J.doses[ks], "ملغم/لتر")} فقط.</li>
          <li>في الشتاء أعطت جرعة ${n(J.doses[5], "ملغم/لتر")} عكارة ${n(f1(W[5]), "NTU")}، أسوأ من ${n(J.doses[4])}: الجرعة الزائدة تعيد تثبيت الحبيبات وتهدر المادة، فالأكثر ليس أفضل.</li>
          <li>برودة الماء ترفع لزوجته وتبطئ تكوّن هيدروكسيد الألمنيوم، لذلك تزيد الجرعة اللازمة. ${J.paperNote}</li>
          <li>لهذا تعيد محطات الماء اختبار الجرة كلما تغيّرت عكارة النهر أو حرارته، ولا تعتمد جرعة ثابتة طوال السنة.</li>
        </ul>
        <p class="muted lb-small">ظروف التجربة كما في البحث: خلط سريع ${J.mix.fast[0]} دورة/دقيقة لمدة ${J.mix.fast[1]} دقيقة، وخلط بطيء ${J.mix.slow[0]} دورة/دقيقة لمدة ${J.mix.slow[1]} دقائق، وترسيب ${J.mix.settle} دقيقة، و pH ${n(J.ph)}. حد ${n(J.limit, "NTU")} من ${J.limitSrc}.</p>`;
    }
  });

  /* ==================================================================
     2) الامتزاز: إزالة الرصاص بكاربون ليف النخيل
  ================================================================== */
  const A = D.ads;
  const adsCalc = () => {
    const qe = A.Co.map((c, i) => (c - A.Ce[i]) * A.V / A.m), R = A.Co.map((c, i) => pct(c, A.Ce[i]));
    const lin = (x, y) => { const k = x.length, mx = U.mean(x), my = U.mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < k; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } const b = sxy / sxx, a = my - b * mx; return { a, b, r2: sxy * sxy / (sxx * syy) }; };
    const Lg = lin(A.Ce, A.Ce.map((c, i) => c / qe[i])), Qm = 1 / Lg.b, KL = Lg.b / Lg.a;
    const Fr = lin(A.Ce.map(Math.log10), qe.map(Math.log10)), nF = 1 / Fr.b, KF = Math.pow(10, Fr.a);
    const RL = A.Co.map(c => 1 / (1 + KL * c));
    return { qe, R, Qm, KL, r2L: Lg.r2, nF, KF, r2F: Fr.r2, RL };
  };
  const PB = 0xb493ff;

  LAB.reg({
    id: "ads", title: "الامتزاز", cat: "معالجة · إزالة العناصر الثقيلة", icon: "atom", hue: "#b493ff",
    blurb: "إزالة الرصاص من الماء بكاربون منشّط من ليف النخيل",
    aim: `قياس قدرة كاربون منشّط محضّر من ليف نخيل عراقي على إزالة الرصاص Pb²⁺ من محاليل تراكيزها ${A.Co.join(" و")} ملغم/لتر، وحساب نسبة الإزالة وكمية الامتزاز qe، وتطبيق نموذجي Langmuir وFreundlich.`,
    src: A.src,
    materials: ["محلول رصاص قياسي من Pb(NO₃)₂", `أربعة دوارق مخروطية، في كل منها ${n(A.V * 1000, "مل")}`, `كاربون منشّط من ليف النخيل (نُشّط بـ 900°م، مساحته السطحية ${n(A.bet, "م²/غم")})`, "جهاز pH ومحلولا NaOH وHNO₃ مخففان", "ميزان حساس", `هزاز حاضن بدرجة ${n(A.T, "°م")}`, `جهاز طرد مركزي ${n(A.rpm, "دورة/دقيقة")}`, "ورق ترشيح Whatman رقم 42", "جهاز الامتصاص الذري AAS"],
    tools: [
      { id: "pip", name: "الماصة", icon: "pipette", why: "نحضّر بها محاليل الرصاص في البداية." },
      { id: "probe", name: "مجس pH", icon: "gauge", why: "نضبط به الحموضة بعد تحضير المحاليل." },
      { id: "spat", name: "الملعقة", icon: "scale", why: "نغرف بها الكاربون ونزنه بعد ضبط pH." },
      { id: "hand", name: "اليد", icon: "hand", why: "ننقل بها الدوارق والأنابيب بعد إضافة الكاربون." }
    ],
    views: {
      intro: { t: [-0.4, 1.0, 0.2], r: 10.5, th: 0, ph: 1.12 },
      flasks: { t: [0, 0.55, 0.4], r: 5.6, th: 0, ph: 1.12 },
      bal: { t: [1.4, 0.6, -0.1], r: 6.6, th: 0.15, ph: 1.1 },
      shk: { t: [-0.3, 0.6, -0.4], r: 6.6, th: 0, ph: 0.9 },
      tubes: { t: [1.8, 0.6, 1.0], r: 7.2, th: 0.1, ph: 1.08 },
      cen: { t: [3.8, 0.6, 1.0], r: 5.2, th: 0.3, ph: 1.0 },
      fil: { t: [1.0, 0.7, 1.4], r: 6.4, th: 0, ph: 1.12 },
      aas: { t: [-2.0, 0.8, 0.5], r: 8, th: -0.15, ph: 1.08 },
      chart: { t: [-0.4, 1.0, 0.2], r: 9, th: 0, ph: 1.15 }
    },
    nb: ["Cₒ (ملغم/لتر)", "Cₑ (ملغم/لتر)", "الإزالة", "qₑ (ملغم/غم)"],
    chartTitle: "نسبة إزالة الرصاص حسب التركيز الابتدائي", chartSub: `${A.m} غم كاربون في ${A.V * 1000} مل`,
    chart(L) {
      L.S.rem = A.Co.map(() => null);
      return { type: "bar", data: { labels: A.Co.map(c => c + " ملغم/لتر"), datasets: [{ label: "نسبة الإزالة %", data: L.S.rem, backgroundColor: "rgba(180,147,255,.55)", borderColor: C.violet, borderWidth: 1.5, borderRadius: 6 }] }, options: axes("التركيز الابتدائي Cₒ", "الإزالة %", { y: { max: 100 } }) };
    },
    setup(L) {
      const S = L.S, xs = [1.35, 0.45, -0.45, -1.35];
      S.stock = L.put(L.MK.bottle({ label: ["Pb(NO₃)₂", "محلول قياسي"], cap: 0x7a5bd1, r: 0.24, h: 0.6, color: 0xeef2f6, opacity: 0.25 }), -3.0, 0, 0.6);
      S.pip = L.put(L.MK.pipette({ color: 0xeef2f6 }), -2.5, 0, 0.55);
      S.fl = xs.map((x, i) => { const f = L.put(L.MK.erlen({ rb: 0.3, h: 0.8, rn: 0.09, color: 0xe6eef2, opacity: 0.22 }), x, 0, 0.55); f.home = [x, 0, 0.55]; f.tag = L.label(f.g, n(A.Co[i], "ملغم/ل"), { dy: 0.95, cls: "dose" }); return f; });
      S.ph = L.put(L.MK.phmeter(), -2.4, 0, -1.1);
      S.bal = L.put(L.MK.balance(), 2.6, 0, -1.0);
      S.carbon = L.put(L.MK.bottle({ label: ["كاربون منشّط", "ليف النخيل"], cap: 0x1d2328, r: 0.22, h: 0.42, color: 0x15191b, opacity: 0.95 }), 3.6, 0, -0.75);
      S.spat = L.put(L.MK.spatula(), 3.3, 0.02, -0.15); S.spat.g.rotation.y = 0.6;
      S.shk = L.put(L.MK.shaker(), -0.3, 0, -1.05); L.loop(sdt => S.shk.tick(sdt));
      S.cen = L.put(L.MK.centrifuge(), 4.3, 0, 0.75); L.loop(sdt => S.cen.tick(sdt));
      S.tubes = [0, 1, 2, 3].map(i => {
        const g = new THREE.Group(), r = 0.075, h = 0.5;
        L.glassBody([[0, 0], [0.02, 0], [r, 0.09], [r, h]], g);
        const liq = new L.Liquid(y => y < 0.09 ? 0.02 + (r - 0.02) * y / 0.09 : r, h - 0.03, { color: 0x202628, opacity: 0.9, seg: 18 }); g.add(liq.mesh);
        const pel = L.mesh(new THREE.ConeGeometry(0.06, 0.08, 14), new THREE.MeshStandardMaterial({ color: 0x111416, roughness: 0.9 }), 0, 0.045, 0, g); pel.rotation.x = Math.PI; pel.visible = false;
        const t = { g, liq, pel, r, h, home: [3.1 + i * 0.22, 0, 1.55] }; L.put(t, ...t.home); return t;
      });
      S.bk = xs.map((x, i) => { const b = L.put(L.MK.beaker({ r: 0.26, h: 0.55, grad: false, color: 0xe6eef2, opacity: 0.2 }), x, 0, 1.55); const f = L.MK.funnel(); f.g.position.set(0, 0.56, 0); b.g.add(f.g); b.fun = f; b.home = [x, 0, 1.55]; return b; });
      S.aas = L.put(L.MK.aas(), -4.4, 0, -1.25); L.loop(sdt => S.aas.tick(sdt));
      S.aas.g.updateMatrixWorld(true); S.sampleAt = S.aas.g.localToWorld(S.aas.sampleAt.clone());
      // أيونات الرصاص (تمثيل توضيحي: العدد يتناسب مع التركيز) وحبيبات الكاربون
      const ionG = new THREE.SphereGeometry(0.016, 8, 6), ionM = new THREE.MeshBasicMaterial({ color: PB });
      const cG = new THREE.DodecahedronGeometry(0.024, 0), cM = new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.9 });
      S.fl.forEach((f, i) => {
        f.ions = new L.Swarm(Math.round(A.Co[i] * 4), ionG, ionM, f.g); f.ions.mesh.visible = false;
        f.carb = new L.Swarm(34, cG, cM, f.g); f.carb.mesh.visible = false;
        f.ip = Array.from({ length: f.ions.n }, () => ({ a: Math.random() * 6.28, r: Math.random(), y: Math.random(), bound: -1 }));
        f.cp = Array.from({ length: 34 }, () => ({ a: Math.random() * 6.28, r: Math.random(), y: Math.random() }));
      });
      S.bk.forEach((b, i) => { b.ions = new L.Swarm(Math.max(1, Math.round(A.Ce[i] * 4)), ionG, ionM, b.g); b.ions.mesh.visible = false; });
      S.mode = "still";
      L.loop(sdt => {
        S.fl.forEach(f => {
          const hh = Math.max(0.05, f.liq.h * 0.85), rOf = y => f.rOf(y) * 0.78;
          const spin = S.mode === "shake" ? 2.2 : 0.15;
          f.cp.forEach((p, i) => { p.a += sdt * spin * (0.6 + p.r); const y = 0.03 + p.y * (S.mode === "shake" ? hh : 0.04); const rr = rOf(y) * p.r; f.carb.p[i].set(Math.cos(p.a) * rr, y, Math.sin(p.a) * rr); });
          f.carb.sync();
          f.ip.forEach((p, i) => {
            if (p.bound >= 0 && f.carb.mesh.visible) { const c = f.carb.p[p.bound]; f.ions.p[i].set(c.x + Math.cos(i) * 0.02, c.y + 0.02, c.z + Math.sin(i) * 0.02); return; }
            p.a += sdt * (spin + 0.3) * (0.5 + p.r); const y = 0.03 + p.y * hh, rr = rOf(y) * p.r; f.ions.p[i].set(Math.cos(p.a) * rr, y, Math.sin(p.a) * rr);
          });
          f.ions.sync();
        });
        S.bk.forEach(b => { if (!b.ions.mesh.visible) return; b.ions.p.forEach((p, i) => { const a = performance.now() / 1400 + i * 2.4, rr = 0.07 + (i % 4) * 0.035; p.set(Math.cos(a) * rr, 0.04 + ((i * 0.37) % 1) * Math.max(0.05, b.liq.h * 0.8), Math.sin(a) * rr); }); b.ions.sync(); });
      });
      L.S.C = adsCalc();
      S.dil = [1.35, 0.45, -0.45, -1.35].map((x, i) => { const v = L.put(L.MK.volflask({ rb: 0.17, rn: 0.04, h: 0.75, color: 0xeef2f6, opacity: 0.25, level: 0.55 }), x, 0, -0.2); L.label(v.g, "تخفيف " + n(A.Co[i]), { dy: 0.85, cls: "dose" }); return v; });
      S.ph.probe.visible = false;
      { const g = new THREE.Group(); L.mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.75, 12), L.MAT.dark, 0, 0.375, 0, g); L.mesh(new THREE.SphereGeometry(0.024, 10, 8), L.MAT.rim, 0, 0.0, 0, g); S.probe = L.put({ g, h: 0.8, r: 0.05 }, -1.8, 0, -1.05); }
      S.spat.g.children.forEach(c => { c.position.z += 0.5; });
      { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.95 })); tip.position.set(0, 0.03, 0); tip.visible = false; S.spat.g.add(tip); S.spat.load = v => { tip.visible = v; }; S.spat.h = 0.1; S.spat.r = 0.15; }
      S.shk.g.updateMatrixWorld(true);
      S.bk.forEach(b => { b.fun.g.visible = false; });
      S.slots = [[0.68, 0.24], [0.23, 0.24], [-0.23, 0.24], [-0.68, 0.24]].map(([x, z]) => S.shk.plat.localToWorld(new THREE.Vector3(x, 0.03, z - 0.29)));
      S.shkBtn = L.hitbox(S.shk.g, 0.65, 0.17, 0.62, 0.18);
      S.cenBtn = L.hitbox(S.cen.g, 0, 0.3, 0.68, 0.18);
      S.aasBtn = L.hitbox(S.aas.g, -0.55, 0.62, 0.57, 0.3);
    },
    steps: [
      { t: "ما هو الامتزاز؟", cam: "intro",
        say: `<p>الامتزاز التصاق أيونات الملوث على <b>سطح</b> مادة صلبة مسامية. الكاربون المنشّط مليء بمسام دقيقة تعطي مساحة هائلة: غرام واحد من كاربون ليف النخيل في هذا البحث مساحة سطحه ${n(A.bet, "م²")}.</p><p>نضع الكمية نفسها من الكاربون (${n(A.m, "غم")}) في أربعة محاليل رصاص مختلفة التركيز، ونقيس ما يبقى من الرصاص بعد التوازن.</p><p>في كل خطوة تأخذ الأداة من الصينية بيدك وتضعها على الهدف المضيء.</p>`,
        info: "ليف النخيل مخلّف زراعي متوفر بكثرة في العراق، وتحويله إلى مادة مازة يعالج مشكلتين معاً." },
      { t: "حضّر محاليل الرصاص", cam: "flasks", tool: "pip",
        say: `<p>حضّرنا من المحلول القياسي أربعة تخافيف (${A.Co.join(" و")} ملغم/لتر) في القناني الحجمية الخلفية. خذ الماصة وانقل ${n(A.V * 1000, "مل")} من كل تخفيف إلى الدورق المقابل له.</p><p class="lb-eq">C₁ × V₁ = C₂ × V₂</p>`,
        info: "النقاط البنفسجية داخل الدوارق تمثيل توضيحي لأيونات Pb²⁺: عددها يتناسب مع التركيز، فالدورق الأخير فيه أربعة أضعاف الأول.",
        async run(L) {
          const S = L.S, p = S.pip;
          await L.grab(p);
          await L.repeat(S.fl, async (f, i) => {
            const zs = await L.dropOn(L.zone(S.dil[i], { r: 0.3 }), { hint: `اسحب من تخفيف ${A.Co[i]} ملغم/لتر: ضع الماصة فوق قنينته` });
            await L.moveTo(p.g, [zs.pos.x, 0.12, zs.pos.z], 0.35); await p.fill(0.7, 0xeef2f6, 0.35); S.dil[i].liq.to(0.3, 0.35); await L.moveTo(p.g, [zs.pos.x, 1.2, zs.pos.z], 0.35);
            const z = await L.dropOn(L.zone(f, { r: 0.36 }), { hint: `انقله إلى الدورق ${i + 1}` });
            await L.moveTo(p.g, [z.pos.x, 0.55, z.pos.z], 0.35);
            await Promise.all([p.fill(0, null, 0.5), f.liq.to(0.26, 0.5)]);
            f.ions.mesh.visible = true;
            await L.moveTo(p.g, [z.pos.x, 1.2, z.pos.z], 0.3);
          }, { autoAfter: 1 });
          await L.letGo();
        },
        done: "حُضّرت المحاليل الأربعة. لاحظ تزايد الأيونات من اليمين إلى اليسار." },
      { t: `اضبط pH إلى ${A.pH}`, cam: "flasks", tool: "probe",
        say: `<p>خذ مجس جهاز pH واغمره في كل دورق، فيقرأ الجهاز الحموضة ثم نضبطها إلى ${n(A.pH)} بقطرات من NaOH أو HNO₃ المخفف.</p>`,
        info: "وجد البحث أن أفضل امتزاز بين pH 6.5 و7. فوق 7 يترسب الرصاص هيدروكسيداً فلا نعرف هل أزاله الكاربون أم الترسيب، وفي الوسط الحامضي تنافس أيونات H⁺ الرصاصَ على مواقع الامتزاز.",
        async run(L) {
          const S = L.S;
          await L.grab(S.probe);
          await L.repeat(S.fl, async (f, i) => {
            const z = await L.dropOn(L.zone(f, { r: 0.36 }), { hint: `اغمر المجس في الدورق ${i + 1}` });
            await L.moveTo(S.probe.g, [z.pos.x, 0.08, z.pos.z], 0.35);
            S.ph.screen.set([`pH ${f2(A.pH + 0.9 - i * 0.25)}`, "قبل الضبط"]); await L.sleep(0.5);
            await L.drops(new THREE.Vector3(z.pos.x + 0.15, 1.0, z.pos.z), f, 2, 0xf4f4f4, 0.12);
            S.ph.screen.set([`pH ${f2(A.pH)}`, `دورق ${i + 1}`]); await L.sleep(0.35);
            await L.moveTo(S.probe.g, [z.pos.x, 1.2, z.pos.z], 0.3);
          }, { autoAfter: 1 });
          await L.letGo();
        },
        done: `كل المحاليل الآن بـ pH ${n(A.pH)}.` },
      { t: "زن الكاربون المنشّط", cam: "bal", tool: "spat",
        say: `<p>خذ الملعقة واغرف الكاربون من قنينته، وضعه على كفة الميزان حتى يقرأ ${n(A.m.toFixed(4), "غم")}، ثم انقله إلى الدورق.</p>`,
        async run(L) {
          const S = L.S, sp = S.spat, pan = S.bal.g.localToWorld(S.bal.pan.clone());
          const pile = L.mesh(new THREE.ConeGeometry(0.09, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.95 }), pan.x, pan.y + 0.025, pan.z, L.group); pile.scale.setScalar(0.01);
          await L.grab(sp, { y: 1.0 });
          await L.repeat(S.fl, async (f, i) => {
            await L.dropOn(L.zone(S.carbon, { r: 0.32 }), { hint: "اغرف الكاربون: ضع الملعقة فوق قنينة الكاربون" });
            sp.load(true);
            await L.dropOn(L.zone(S.bal, { pos: pan, top: 0.3, r: 0.3 }), { hint: "ضع الكاربون على كفة الميزان" });
            sp.load(false);
            await L.anim(0.7, (k, kk) => { pile.scale.setScalar(Math.max(0.01, kk)); S.bal.screen.set(`${(A.m * kk).toFixed(4)} g`); });
            S.bal.screen.set(`${A.m.toFixed(4)} g`);
            const z = await L.dropOn(L.zone(f, { r: 0.36 }), { hint: `انقل الكاربون الموزون إلى الدورق ${i + 1}` });
            pile.scale.setScalar(0.01); S.bal.screen.set("0.0000 g");
            f.carb.mesh.visible = true; f.liq.color(0x9aa3a6, 0.45, 0.6);
            await L.sleep(0.25);
          }, { autoAfter: 1 });
          L.group.remove(pile); await L.letGo();
        },
        done: "في كل دورق الآن نصف غرام من الكاربون." },
      { t: `رجّ الدوارق ${A.time} دقيقة`, cam: "shk", tool: "hand",
        say: `<p>انقل الدوارق بيدك إلى منصة الهزاز الحاضن، ثم اضغط زر تشغيله ليرجّها ${n(A.time, "دقيقة")} بدرجة ${n(A.T, "°م")}، وهو زمن التوازن الذي وجده البحث لليف النخيل.</p>`,
        info: "أثناء الرج تتصادم الأيونات بحبيبات الكاربون وتلتصق بمواقعها الفعالة (مجاميع الهيدروكسيل والكاربوكسيل). راقب النقاط البنفسجية وهي تلتصق بالحبيبات السوداء.",
        async run(L) {
          const S = L.S, plat = S.shk.plat;
          await L.repeat(S.fl, async (f, i) => {
            await L.takeFrom([f], { hint: `اضغط على الدورق ${i + 1} لتمسكه`, y: 1.2 });
            const z = await L.dropOn(L.zone(S.shk, { pos: S.slots[i], top: 0.4, r: 0.24 }), { hint: "ضعه على منصة الهزاز في الموضع المضيء" });
            await L.letGo({ to: [z.pos.x, z.pos.y, z.pos.z] }); plat.attach(f.g);
          }, { autoAfter: 1 });
          await L.press([{ obj: S.shkBtn, halo: true, r: 0.16, label: "تشغيل" }], { hint: "اضغط زر تشغيل الهزاز", label: "شغّل الهزاز" });
          S.shk.on = true; S.mode = "shake"; S.shk.screen.set(["150 rpm", `${A.T}°C`]);
          S.fl.forEach((f, i) => { const free = Math.max(1, Math.round(A.Ce[i] * 4)); f.ip.forEach((p, j) => { p.boundLater = j < f.ions.n - free ? Math.floor(Math.random() * 34) : -1; p.bound = -1; }); });
          const bind = L.loop(() => { S.fl.forEach(f => f.ip.forEach(p => { if (p.boundLater >= 0 && p.bound < 0 && Math.random() < 0.012 * L.speed) p.bound = p.boundLater; })); });
          await L.wait({ mins: A.time, sec: 8, label: `الرج بدرجة ${A.T}°م` });
          bind(); S.fl.forEach(f => f.ip.forEach(p => { if (p.boundLater >= 0) p.bound = p.boundLater; }));
          S.shk.on = false; S.mode = "still"; S.shk.screen.set(["0 rpm", `${A.T}°C`]);
          for (let i = 0; i < 4; i++) { L.detach(S.fl[i]); await L.arcTo(S.fl[i].g, S.fl[i].home, 0.4, 0.45); }
        },
        done: "وصلت الدوارق إلى التوازن. أغلب الأيونات التصقت بالكاربون في الدوارق الأولى." },
      { t: "افصل الكاربون بالطرد المركزي", cam: "tubes", tool: "hand",
        say: `<p>اسكب كل مزيج في أنبوب (أمسك الدورق ثم اضغط مطولاً فوق الأنبوب)، ثم ضع الأنابيب في جهاز الطرد المركزي متقابلة حتى يتوازن، وشغّله ${n(A.rpm, "دورة/دقيقة")} لمدة ${n(A.spin, "دقائق")}.</p>`,
        async run(L) {
          const S = L.S;
          await L.repeat(S.fl, async (f, i) => {
            await L.takeFrom([f], { hint: `أمسك الدورق ${i + 1}`, y: 1.1 });
            await L.pourInto([L.zone(S.tubes[i], { to: 0.38, r: 0.2 })], { rate: 0.45, color: 0x8d969a, dstColor: 0x8d969a, dstOpacity: 0.9, srcRate: 0.4, hint: `اسكبه في الأنبوب ${i + 1}: حرّكه فوقه واضغط مطولاً` });
            f.ions.mesh.visible = false; f.carb.mesh.visible = false; f.liq.set(0);
            await L.letGo();
          }, { autoAfter: 1 });
          L.cam("cen"); await S.cen.open(true);
          S.cen.g.updateMatrixWorld(true);
          const slot = i => { const a = [0, 3, 1, 4][i] / 6 * Math.PI * 2; return S.cen.g.localToWorld(new THREE.Vector3(Math.cos(a) * 0.3, 0.26, Math.sin(a) * 0.3)); };
          await L.repeat(S.tubes, async (t, i) => {
            await L.takeFrom([t], { hint: `أمسك الأنبوب ${i + 1}`, r: 0.2, y: 1.1 });
            const w = slot(i), z = await L.dropOn(L.zone(S.cen, { pos: w, top: 0.6, r: 0.16 }), { hint: "ضعه في الفتحة المضيئة: كل أنبوبين متقابلان حتى يتوازن الجهاز" });
            await L.letGo({ to: [w.x, w.y, w.z] }); S.cen.rotor.attach(t.g);
          }, { autoAfter: 1 });
          await L.press([{ obj: S.cenBtn, halo: true, r: 0.16, label: "تشغيل" }], { hint: "اضغط زر تشغيل جهاز الطرد المركزي", label: "شغّل الجهاز" });
          await S.cen.open(false);
          S.cen.rpm = A.rpm; S.cen.screen.set([`${A.rpm} rpm`]);
          await L.wait({ mins: A.spin, sec: 4, label: `الطرد المركزي ${A.rpm} دورة/دقيقة` });
          S.cen.rpm = 0; S.cen.screen.set(["0 rpm"]);
          await S.cen.open(true);
          for (let i = 0; i < 4; i++) { const t = S.tubes[i]; L.detach(t); t.g.rotation.set(0, 0, 0); t.pel.visible = true; t.liq.color(0xe6eef2, 0.25, 0.3); await L.arcTo(t.g, t.home, 0.7, 0.5); }
          await S.cen.open(false); L.cam("tubes");
        },
        done: "ترسب الكاربون في قاع الأنابيب، والمحلول فوقه صافٍ." },
      { t: "رشّح المحلول الصافي", cam: "fil", tool: "hand",
        say: "<p>أمسك كل أنبوب واسكب المحلول الصافي على ورق الترشيح Whatman رقم 42 في القمع المقابل، فيُجمع الراشح في الدورق الصغير.</p>",
        info: "الترشيح بعد الطرد المركزي يزيل آخر الحبيبات الدقيقة، لأنها لو دخلت جهاز الامتصاص الذري لسدّت أنبوبه الشعري وأفسدت القراءة.",
        async run(L) {
          const S = L.S;
          for (const b of S.bk) { const f = b.fun.g; f.visible = true; f.position.y = 1.3; L.anim(0.45, k => { f.position.y = 1.3 - 0.74 * k; }); await L.sleep(0.12); }
          await L.sleep(0.4);
          await L.repeat(S.tubes, async (t, i) => {
            const b = S.bk[i];
            await L.takeFrom([t], { hint: `أمسك الأنبوب ${i + 1}`, r: 0.2, y: 1.5 });
            await L.pourInto([L.zone(b, { to: 0.32, top: 1.2, r: 0.3 })], { rate: 0.3, color: 0xe6eef2, dstColor: 0xe6eef2, dstOpacity: 0.2, srcRate: 0.4, srcMin: 0.05, hint: `اسكبه في القمع ${i + 1}: اضغط مطولاً فوقه` });
            b.ions.mesh.visible = true;
            await L.letGo();
          }, { autoAfter: 1 });
        },
        done: "لاحظ النقاط البنفسجية في الراشح: قليلة جداً في الأول وكثيرة في الأخير." },
      { t: "قِس الرصاص المتبقي Cₑ", cam: "aas", tool: "hand",
        say: "<p>اضغط شاشة جهاز الامتصاص الذري لتشغيله بمصباح الرصاص، ثم انقل كل راشح إلى موضع السحب أمام الجهاز ليقرأ التركيز المتبقي عند التوازن Cₑ.</p>",
        info: "يمتص بخار ذرات الرصاص في اللهب ضوءاً بطول موجي خاص به (283.3 نانومتر) يصدر من مصباح الرصاص، وكمية الضوء الممتص تتناسب مع التركيز.",
        async run(L) {
          const S = L.S, C2 = S.C;
          await L.press([{ obj: S.aasBtn, halo: true, r: 0.3, label: "تشغيل الجهاز" }], { hint: "اضغط شاشة الجهاز لتشغيله", label: "شغّل الجهاز" });
          S.aas.lamp(0xb493ff); S.aas.flame.visible = true; S.aas.screen.set(["Pb 283.3 nm", "معايرة ✓"]); await L.sleep(0.8);
          await L.repeat(S.bk, async (b, i) => {
            await L.takeFrom([b], { hint: `أمسك راشح الدورق ${i + 1}`, r: 0.3, y: 1.4 });
            const z = await L.dropOn(L.zone(S.aas, { pos: S.sampleAt, top: 0.6, r: 0.3 }), { hint: "ضعه في موضع السحب أمام الجهاز" });
            await L.letGo({ to: [S.sampleAt.x, 0, S.sampleAt.z] });
            S.aas.screen.set(["…", "سحب العيّنة"]); await L.sleep(0.6);
            S.aas.screen.set([`${f2(A.Ce[i])} mg/L`, `Pb · Co = ${A.Co[i]}`]);
            L.nb.row(i, [n(A.Co[i]), n(f2(A.Ce[i])), n(Math.round(C2.R[i]), "%"), n(U.fmt(C2.qe[i], 3))]);
            S.rem[i] = Math.round(C2.R[i]); upd();
            await L.sleep(0.4); await L.arcTo(b.g, b.home, 0.6, 0.6);
          }, { autoAfter: 1 });
          S.aas.flame.visible = false;
        },
        done: `نسبة الإزالة نزلت من ${n(Math.round(adsCalc().R[0]), "%")} إلى ${n(Math.round(adsCalc().R[3]), "%")} كلما زاد التركيز.` },
      { t: "طبّق نموذجي Langmuir وFreundlich", cam: "chart", act: "احسب النموذجين وارسمهما", actIcon: "chart",
        say: `<p>نحسب أولاً كمية الرصاص الممتزة على كل غرام من الكاربون:</p><p class="lb-eq">qₑ = (Cₒ − Cₑ) × V ÷ m</p><p>ثم نختبر أي نموذج يصف العلاقة بين qₑ وCₑ أفضل:</p><p class="lb-eq">Langmuir: Cₑ/qₑ = 1/(Qₘ·K_L) + Cₑ/Qₘ<br>Freundlich: log qₑ = log K_F + (1/n) log Cₑ</p>`,
        async run(L) {
          const S = L.S, R = S.C;
          const xs = []; for (let x = 0.1; x <= 10; x += 0.1) xs.push(x);
          L.chart({ type: "scatter", data: { datasets: [
            { label: "النتائج (البحث)", data: A.Ce.map((c, i) => ({ x: c, y: R.qe[i] })), backgroundColor: C.violet, pointRadius: 6 },
            { label: `Langmuir (R² = ${f2(R.r2L)})`, type: "line", data: xs.map(x => ({ x, y: R.Qm * R.KL * x / (1 + R.KL * x) })), borderColor: C.river, pointRadius: 0, borderWidth: 2 },
            { label: `Freundlich (R² = ${f2(R.r2F)})`, type: "line", data: xs.map(x => ({ x, y: R.KF * Math.pow(x, 1 / R.nF) })), borderColor: C.silt, borderDash: [5, 4], pointRadius: 0, borderWidth: 2 }
          ] }, options: axes("Cₑ (ملغم/لتر)", "qₑ (ملغم/غم)", { x: { type: "linear", min: 0, max: 10 } }) }, "منحنى الامتزاز (Isotherm)", "R² من الصيغة الخطية لكل نموذج");
          L.show(tbl(["النموذج", "الثوابت", "R²"], [["Langmuir", `${n("Qₘ = " + U.fmt(R.Qm, 3), "ملغم/غم")}<br>${n("K_L = " + f2(R.KL), "لتر/ملغم")}`, n(U.fmt(R.r2L, 3))], ["Freundlich", `${n("K_F = " + U.fmt(R.KF, 3))}<br>${n("n = " + f2(R.nF))}`, n(U.fmt(R.r2F, 3))]]) + `<p>معامل الانفصال R_L بين ${n(U.fmt(Math.min(...R.RL), 3))} و${n(U.fmt(Math.max(...R.RL), 3))}: أصغر من 1 وأكبر من صفر، أي أن الامتزاز ملائم.</p>`);
        },
        done: "نموذج Langmuir أنسب: الأيونات تغطي سطح الكاربون بطبقة واحدة حتى تمتلئ المواقع." }
    ],
    results(L) {
      const R = adsCalc();
      return `
        ${kv([["أعلى إزالة", n(Math.round(R.R[0]), "%") + " عند " + n(A.Co[0], "ملغم/لتر"), "c-violet"], ["أقل إزالة", n(Math.round(R.R[3]), "%") + " عند " + n(A.Co[3], "ملغم/لتر")], ["Qₘ (Langmuir)", n(U.fmt(R.Qm, 3), "ملغم/غم"), "c-river"], ["R² Langmuir / Freundlich", n(f2(R.r2L) + " / " + f2(R.r2F))]])}
        ${tbl(["Cₒ (ملغم/لتر)", "Cₑ (ملغم/لتر)", "الإزالة", "qₑ (ملغم/غم)", "R_L"], A.Co.map((c, i) => [n(c), n(f2(A.Ce[i])), n(Math.round(R.R[i]), "%"), n(U.fmt(R.qe[i], 3)), n(U.fmt(R.RL[i], 3))]))}
        <h4>الاستنتاج</h4>
        <ul class="lb-concl">
          <li>كاربون ليف النخيل أزال ${n(Math.round(R.R[0]), "%")} من الرصاص في المحلول المخفف (${n(A.Co[0], "ملغم/لتر")}).</li>
          <li>نسبة الإزالة تقل كلما زاد التركيز، لأن عدد المواقع على ${n(A.m, "غم")} من الكاربون ثابت، فتمتلئ ويبقى الفائض في الماء. أما الكمية الممتزة qₑ فتزيد حتى تقترب من السعة القصوى.</li>
          <li>نموذج Langmuir وصف النتائج أفضل من Freundlich (${n("R² = " + f2(R.r2L))} مقابل ${n(f2(R.r2F))})، وهو ما خلص إليه البحث أيضاً: امتزاز بطبقة واحدة على مواقع متجانسة.</li>
          <li>للتطبيق: عند تركيز رصاص أعلى نزيد كمية المادة المازة أو نمرر الماء على أكثر من مرحلة.</li>
        </ul>
        <p class="muted lb-small">${U.esc(A.note)}</p>`;
    }
  });

  /* ==================================================================
     3) المتطلب الحيوي للأوكسجين BOD₅ لماء دجلة في تكريت
  ================================================================== */
  const TG = D.tigris, B = TG.bod;
  const DO5 = s => +(B.DOsat - s.bod * B.P).toFixed(2);
  const WINK = {
    amber: [0xd29d38, 0.62],
    s1: [[0, 0xd29d38, 0.62], [1, 0xf1e5aa, 0.3]],
    s2: [[0, 0x26346e, 0.84], [0.95, 0x34418a, 0.8], [0.995, 0x8d97c9, 0.45], [1, 0xe6f2f4, 0.16]]
  };
  async function winklerFix(L, bot, fast) {
    const S = L.S, top = bot.g.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, bot.h + 0.15, 0));
    await L.moveTo(bot.stop, [0, bot.h + 0.35, 0], fast ? 0.2 : 0.35);
    await L.drops(top, bot, fast ? 1 : 2, 0xf1d6e0, 0.12);
    await L.drops(top, bot, fast ? 1 : 2, 0xf4f4f4, 0.12);
    await L.moveTo(bot.stop, [0, bot.h, 0], fast ? 0.2 : 0.35);
    bot.prec.mesh.visible = true; bot.precK = 1; bot.liq.color(0xa77a3f, 0.62, fast ? 0.4 : 0.9);
    await L.rotTo(bot.g, [0, 0, 0.5], 0.25); await L.rotTo(bot.g, [0, 0, -0.5], 0.3); await L.rotTo(bot.g, [0, 0, 0], 0.25);
    await L.sleep(fast ? 0.3 : 0.9);
  }
  async function winklerAcid(L, bot, fast) {
    const top = bot.g.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, bot.h + 0.15, 0));
    await L.moveTo(bot.stop, [0, bot.h + 0.35, 0], 0.25);
    await L.drops(top, bot, fast ? 1 : 2, 0xf3eeee, 0.12);
    await L.moveTo(bot.stop, [0, bot.h, 0], 0.25);
    await L.anim(fast ? 0.5 : 1.2, k => { bot.precK = 1 - k; });
    bot.prec.mesh.visible = false;
    await bot.liq.color(WINK.amber[0], WINK.amber[1], fast ? 0.3 : 0.7);
  }
  async function toFlask(L, bot, fast) {
    const S = L.S;
    if (S.flask.liq.h > 0.01) await S.flask.liq.to(0, 0.4);
    S.flask.liq.color(WINK.amber[0], WINK.amber[1], 0);
    await L.pour(bot, S.flask, { to: 0.34, color: WINK.amber[0], srcTo: 0.05, dur: fast ? 0.5 : 0.9, move: fast ? 0.5 : 0.8, tiltDur: 0.45 });
    S.bur.setRead(0);
  }
  async function doTitr(L, key, end, interactive) {
    const S = L.S, e1 = +(end * 0.86).toFixed(2);
    if (interactive) {
      await L.titrate({ bur: S.bur, flask: S.flask, end: e1, colors: WINK.s1, tip: "الثايوسلفات يستهلك اليود فيخفّ اللون. توقف عندما يصبح قشياً باهتاً", doneText: "لون قشي باهت" });
    } else await L.autoTitrate(S.bur, S.flask, 0, e1, WINK.s1, 1.8);
    await L.drops(S.flask.g.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.18, 1.35, 0)), S.flask, 2, 0xf3f3f3, 0.15);
    await S.flask.liq.color(0x26346e, 0.84, 0.6);
    if (interactive) {
      L.toast("أضفنا محلول النشا فصار اللون أزرق. أكمل التسحيح حتى يختفي الأزرق.");
      await L.titrate({ bur: S.bur, flask: S.flask, from: e1, end, colors: [[e1 / end, 0x26346e, 0.84], [0.95, 0x34418a, 0.8], [0.995, 0x8d97c9, 0.45], [1, 0xe6f2f4, 0.16]], tip: "أكمل حتى يختفي اللون الأزرق تماماً", doneText: "اختفى الأزرق" });
    } else await L.autoTitrate(S.bur, S.flask, e1, end, [[e1 / end, 0x26346e, 0.84], [0.995, 0x8d97c9, 0.45], [1, 0xe6f2f4, 0.16]], 1.6);
    return end;
  }

    /* نسخ يدوية: المستخدم يمسك الماصة أو القطارة أو القنينة بنفسه */
  const STOP_OFF = [0.42, 0.12, 0.18];
  async function shakeBottle(L, b) { await L.rotTo(b.g, [0, 0, 0.5], 0.25); await L.rotTo(b.g, [0, 0, -0.5], 0.3); await L.rotTo(b.g, [0, 0, 0], 0.25); }
  async function fixBy(L, b, nm) {
    const S = L.S;
    await L.moveTo(b.stop, STOP_OFF, 0.3);
    for (const [p, src, col, what] of [[S.pMn, S.mn, 0xf1d6e0, "كبريتات المنغنيز"], [S.pAl, S.alk, 0xf4f4f4, "القاعدي يوديد-أزيد"]]) {
      await L.grab(p);
      const zs = await L.dropOn(L.zone(src, { r: 0.3 }), { hint: `اسحب 1 مل من ${what}: ضع الماصة فوق قنينته` });
      await L.moveTo(p.g, [zs.pos.x, 0.12, zs.pos.z], 0.3); await p.fill(0.5, col, 0.3); await L.moveTo(p.g, [zs.pos.x, zs.top + 0.3, zs.pos.z], 0.3);
      const z = await L.dropOn(L.zone(b, { r: 0.4 }), { hint: `أضفه إلى قنينة ${nm} المضيئة` });
      const tip = new THREE.Vector3(z.pos.x, z.top + 0.04, z.pos.z);
      await L.moveTo(p.g, [tip.x, tip.y, tip.z], 0.3);
      await Promise.all([L.drops(tip, b, 2, col, 0.1), p.fill(0, null, 0.4)]);
      await L.letGo();
    }
    await L.moveTo(b.stop, [0, b.h, 0], 0.3);
    b.prec.mesh.visible = true; b.precK = 1; b.liq.color(0xa77a3f, 0.62, 0.9);
    await shakeBottle(L, b); await L.sleep(0.4);
  }
  async function acidBy(L, b, nm) {
    const S = L.S, d = S.dAc;
    await L.moveTo(b.stop, STOP_OFF, 0.3);
    await L.grab(d);
    const zs = await L.dropOn(L.zone(S.h2, { r: 0.3 }), { hint: "اسحب الحامض: ضع القطارة فوق قنينة H₂SO₄" });
    await L.moveTo(d.g, [zs.pos.x, 0.15, zs.pos.z], 0.3); await L.moveTo(d.g, [zs.pos.x, zs.top + 0.3, zs.pos.z], 0.3);
    const z = await L.dropOn(L.zone(b, { r: 0.4 }), { hint: `أضف 1 مل إلى قنينة ${nm}` });
    const tip = new THREE.Vector3(z.pos.x, z.top + 0.04, z.pos.z);
    await L.moveTo(d.g, [tip.x, tip.y, tip.z], 0.3);
    await L.drops(tip, b, 2, 0xf3eeee, 0.12);
    await L.letGo();
    await L.moveTo(b.stop, [0, b.h, 0], 0.3);
    await shakeBottle(L, b);
    await L.anim(1.0, k => { b.precK = 1 - k; }); b.prec.mesh.visible = false;
    await b.liq.color(WINK.amber[0], WINK.amber[1], 0.6);
  }
  async function titrBy(L, b, end, nm) {
    const S = L.S, f = S.flask, e1 = +(end * 0.86).toFixed(2);
    if (f.liq.h > 0.01) await f.liq.to(0, 0.4);
    S.bur.setRead(0);
    await L.arcTo(f.g, S.flaskOut, 0.3, 0.6);
    await L.moveTo(b.stop, STOP_OFF, 0.3);
    await L.takeFrom([b], { hint: `أمسك قنينة ${nm}`, y: 1.3 });
    await L.pourInto([L.zone(f, { to: 0.34, r: 0.45 })], { rate: 0.35, color: WINK.amber[0], dstColor: WINK.amber[0], dstOpacity: WINK.amber[1], srcRate: 0.6, srcMin: 0.1, hint: "اسكب 200 مل في الدورق: حرّك القنينة فوقه واضغط مطولاً" });
    await L.letGo();
    await L.arcTo(f.g, S.flaskHome, 0.3, 0.6);
    await L.titrate({ bur: S.bur, flask: f, end: e1, colors: WINK.s1, tip: "الثايوسلفات يستهلك اليود فيخفّ اللون. توقف عندما يصبح قشياً باهتاً", doneText: "لون قشي باهت" });
    await L.grab(S.dSt);
    const zs = await L.dropOn(L.zone(S.starch, { r: 0.3 }), { hint: "خذ قطارة النشا: ضعها فوق قنينة النشا" });
    await L.moveTo(S.dSt.g, [zs.pos.x, 0.15, zs.pos.z], 0.3); await L.moveTo(S.dSt.g, [zs.pos.x, zs.top + 0.3, zs.pos.z], 0.3);
    const z = await L.dropOn(L.zone(f, { r: 0.45 }), { hint: "أضف قطرات النشا إلى الدورق تحت السحاحة" });
    const tip = new THREE.Vector3(z.pos.x + 0.07, z.top + 0.02, z.pos.z - 0.06);
    await L.moveTo(S.dSt.g, [tip.x, tip.y, tip.z], 0.3);
    await L.drops(tip, f, 2, 0xf3f3f3, 0.15);
    await f.liq.color(0x26346e, 0.84, 0.6);
    await L.letGo();
    L.toast("صار اللون أزرق بالنشا. أكمل التسحيح حتى يختفي الأزرق.");
    await L.titrate({ bur: S.bur, flask: f, from: e1, end, colors: [[e1 / end, 0x26346e, 0.84], [0.95, 0x34418a, 0.8], [0.995, 0x8d97c9, 0.45], [1, 0xe6f2f4, 0.16]], tip: "أكمل حتى يختفي اللون الأزرق تماماً", doneText: "اختفى الأزرق" });
    return end;
  }

  LAB.reg({
    id: "bod", title: "المتطلب الحيوي للأوكسجين BOD₅", cat: "تلوث · ماء دجلة في تكريت", icon: "drops", hue: "#93dd8a",
    blurb: "كم أوكسجيناً تستهلك بكتيريا الماء في 5 أيام؟ بطريقة ونكلر",
    aim: "قياس المتطلب الحيوي للأوكسجين BOD₅ لعيّنتين من نهر دجلة داخل مدينة تكريت (شتاء المحطة 1 وصيف المحطة 5) بقياس الأوكسجين المذاب بطريقة ونكلر قبل الحضن وبعد 5 أيام.",
    src: TG.src,
    materials: ["عيّنتا ماء من دجلة في تكريت (شتاء المحطة 1، صيف المحطة 5)", `قناني ونكلر معتمة سعة ${n(B.bottle, "مل")}`, "ماء تخفيف مهوّى فيه المغذيات (منظم الفوسفات، MgSO₄، CaCl₂، FeCl₃)", "كواشف ونكلر: كبريتات المنغنيز، والقاعدي يوديد-أزيد، وحامض الكبريتيك المركز", `ثايوسلفات الصوديوم ${n(B.titrN, "عياري")}`, "محلول النشا دليلاً", "سحاحة ودورق مخروطي", `حاضنة بدرجة ${n(B.Tinc, "°م")}`],
    tools: [
      { id: "air", name: "حجر التهوية", icon: "wind", why: "نهوّي به ماء التخفيف في البداية." },
      { id: "cyl", name: "الأسطوانة المدرجة", icon: "cyl", why: "نقيس بها حجم العيّنة بعد حساب التخفيف." },
      { id: "fix", name: "ماصتا التثبيت", icon: "pipette", why: "MnSO₄ والقاعدي: نضيفهما بعد ملء القناني." },
      { id: "acid", name: "قطارة الحامض", icon: "drop", why: "نضيف بها H₂SO₄ بعد تكوّن الراسب البني." },
      { id: "hand", name: "اليد", icon: "hand", why: "ننقل بها القناني ونصب منها ونفتح الحاضنة." }
    ],
    views: {
      intro: { t: [-0.3, 1.1, 0], r: 11, th: 0, ph: 1.12 },
      carboy: { t: [-3.3, 0.9, -0.8], r: 5.4, th: -0.15, ph: 1.1 },
      bottles: { t: [1.6, 0.55, 0.2], r: 7.2, th: 0.12, ph: 1.08 },
      fill: { t: [2.4, 0.6, 0.3], r: 8.2, th: 0.1, ph: 1.08 },
      titr: { t: [-0.6, 1.1, 0.6], r: 6.6, th: -0.08, ph: 1.15 },
      incw: { t: [-2.0, 0.8, 0.0], r: 9.6, th: -0.1, ph: 1.1 },
      inc: { t: [-5.0, 0.8, -0.4], r: 5.6, th: -0.05, ph: 1.12 },
      wide: { t: [-0.3, 1.1, 0], r: 9.6, th: 0, ph: 1.15 }
    },
    nb: ["العيّنة", "DO₀ (ملغم/لتر)", "DO₅ (ملغم/لتر)", "الاستنزاف", "BOD₅ (ملغم/لتر)"],
    chartTitle: "الأوكسجين المذاب قبل الحضن وبعده", chartSub: "ملغم/لتر",
    chart(L) {
      L.S.cd = { d0: [null, null], d5: [null, null], bod: [null, null] };
      return { type: "bar", data: { labels: B.samples.map(s => s.label), datasets: [
        { label: "DO₀ قبل الحضن", data: L.S.cd.d0, backgroundColor: "rgba(79,200,220,.55)", borderColor: C.river, borderWidth: 1.5, borderRadius: 5 },
        { label: "DO₅ بعد 5 أيام", data: L.S.cd.d5, backgroundColor: "rgba(230,174,79,.5)", borderColor: C.silt, borderWidth: 1.5, borderRadius: 5 },
        { label: "BOD₅", data: L.S.cd.bod, backgroundColor: "rgba(147,221,138,.55)", borderColor: C.chloro, borderWidth: 1.5, borderRadius: 5 }
      ] }, options: axes("", "ملغم/لتر") };
    },
    setup(L) {
      const S = L.S;
      const w = B.samples[0], s = B.samples[1];
      S.jw = L.put(L.MK.jug({ label: [w.label, `${w.T}°م · تكريت`], color: 0xc9d8c0, opacity: 0.5, cap: 0x2f5fb3 }), 5.2, 0, 0.35);
      S.js = L.put(L.MK.jug({ label: [s.label, `${s.T}°م · تكريت`], color: 0xc9d8c0, opacity: 0.5, cap: 0xe6ae4f }), 4.1, 0, 0.35);
      S.carboy = L.put(L.MK.carboy({ label: ["ماء تخفيف", "مهوّى + مغذيات"], color: 0xdcecef, opacity: 0.28 }), -3.7, 0, -1.25);
      S.cyl = L.put(L.MK.gradcyl({ color: 0xc9d8c0, opacity: 0.5 }), 3.0, 0, -0.1);
      S.dil = L.put(L.MK.bottle({ label: ["ماء تخفيف"], cap: 0x2c8d9c, r: 0.26, h: 0.7, color: 0xdcecef, opacity: 0.28 }), 3.4, 0, -0.95);
      const names = ["شتاء · DO₀", "شتاء · DO₅", "صيف · DO₀", "صيف · DO₅"], xs = [2.0, 1.15, 0.3, -0.55];
      S.bot = xs.map((x, i) => {
        const b = L.put(L.MK.winkler({ amber: i % 2 === 1, color: 0xdcecef, opacity: 0.3 }), x, 0, 0.75); b.home = [x, 0, 0.75];
        b.tag = L.label(b.g, names[i], { dy: 1.25, cls: "dose" });
        b.prec = new L.Swarm(60, new THREE.DodecahedronGeometry(0.02, 0), new THREE.MeshStandardMaterial({ color: 0x6b4420, roughness: 0.9 }), b.g); b.prec.mesh.visible = false; b.precK = 0;
        b.pp = Array.from({ length: 60 }, () => ({ a: Math.random() * 6.28, r: Math.random() * 0.28, y: 0.04 + Math.random() * 0.75 }));
        return b;
      });
      L.loop(sdt => S.bot.forEach(b => { if (!b.prec.mesh.visible) return; b.pp.forEach((p, i) => { p.a += sdt * 0.4; p.y = Math.max(0.04, p.y - sdt * 0.04); b.prec.p[i].set(Math.cos(p.a) * p.r, p.y, Math.sin(p.a) * p.r); b.prec.s[i] = Math.max(0.01, b.precK); }); b.prec.sync(); }));
      const rb = (lbl, cap, x, amber) => L.put(L.MK.bottle({ label: lbl, cap, r: 0.17, h: 0.42, amber, color: 0xeef2f2, opacity: 0.3 }), x, 0, -1.55);
      S.mn = rb(["MnSO₄"], 0xd16f9a, 1.6); S.alk = rb(["NaOH·KI·NaN₃", "قاعدي يوديد-أزيد"], 0xe7ecee, 2.2); S.h2 = rb(["H₂SO₄", "مركّز"], 0xb8392f, 2.8, true); S.starch = rb(["نشا 1%"], 0x5e8f3a, 1.0);
      S.thio = rb(["Na₂S₂O₃", `${B.titrN} N`], 0x2f5fb3, 0.4);
      S.pMn = L.put(L.MK.pipette({ color: 0xf1d6e0, len: 1.2 }), 1.6, 0, -1.08);
      S.pAl = L.put(L.MK.pipette({ color: 0xf4f4f4, len: 1.2 }), 2.2, 0, -1.08);
      S.dAc = L.put(L.MK.dropper({ bulb: 0xb8392f }), 2.8, 0, -1.1);
      S.dSt = L.put(L.MK.dropper({ bulb: 0x5e8f3a }), 1.0, 0, -1.1);
      S.bur = L.put(L.MK.burette({ color: 0xeef4f5, opacity: 0.22 }), -1.6, 0, 0.35); S.bur.setRead(0);
      S.bur.g.updateMatrixWorld(true);
      const fp = S.bur.g.localToWorld(S.bur.flaskPos.clone());
      S.flaskHome = [fp.x, fp.y, fp.z]; S.flaskOut = [fp.x + 0.55, 0, fp.z + 0.95];
      S.flask = L.put(L.MK.erlen({ rb: 0.42, h: 1.05, color: WINK.amber[0], opacity: 0 }), fp.x, fp.y, fp.z);
      S.inc = L.put(L.MK.incubator(), -5.4, 0, -1.0); S.inc.screen.set([`${B.Tinc.toFixed(1)}°C`]);
      S.door = L.hitbox(S.inc.door, S.inc.w - 0.3, S.inc.h / 2 - 0.04, 0.1, 0.2);
      // حجر التهوية وأنبوبه
      { const g = new THREE.Group(); L.mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0xe0e8e8, transparent: true, opacity: 0.8 }), 0, 0.85, 0, g); L.mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0x8d99a0, roughness: 0.95 }), 0, 0.06, 0, g); S.air = L.put({ g, h: 1.7, r: 0.08 }, -2.55, 0, -0.95); g.rotation.z = 0.1; }
      // فقاعات التهوية
      const bub = new L.Swarm(40, new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }), S.carboy.g); bub.mesh.visible = false; S.bub = bub;
      const bp = Array.from({ length: 40 }, () => ({ y: Math.random(), a: Math.random() * 6.28, r: Math.random() * 0.12 }));
      L.loop(sdt => { if (!bub.mesh.visible) return; bp.forEach((p, i) => { p.y += sdt * 0.6; if (p.y > 1) p.y = 0; bub.p[i].set(Math.cos(p.a) * p.r, 0.1 + p.y * S.carboy.h * 0.7, Math.sin(p.a) * p.r); }); bub.sync(); });
    },
    steps: [
      { t: "ما هو BOD₅؟", cam: "intro",
        say: `<p>البكتيريا في الماء تتغذى على المادة العضوية وتستهلك الأوكسجين المذاب. <b>BOD₅</b> هو مقدار الأوكسجين الذي تستهلكه في <b>5 أيام</b> في الظلام بدرجة ثابتة، فكلما زاد التلوث العضوي زاد BOD₅.</p><p>نملأ قنينتين متطابقتين من كل عيّنة: نقيس الأوكسجين في الأولى الآن (DO₀)، ونحضن الثانية 5 أيام ثم نقيسه (DO₅). الفرق هو ما استهلكته البكتيريا.</p><p>في كل خطوة تأخذ الأداة من الصينية بيدك وتضعها على الهدف المضيء.</p>`,
        info: "القناني معتمة حتى لا تنتج الطحالب أوكسجيناً بالتركيب الضوئي فتخفي الاستهلاك الحقيقي." },
      { t: "هوِّ ماء التخفيف", cam: "carboy", tool: "air",
        say: "<p>ماء التخفيف ماء مقطر نضيف إليه المغذيات التي تحتاجها البكتيريا (منظم الفوسفات، وكبريتات المغنيسيوم، وكلوريد الكالسيوم، وكلوريد الحديديك، 1 مل من كل منها للتر). خذ حجر التهوية وضعه داخل قنينة ماء التخفيف الكبيرة حتى يتشبع بالأوكسجين.</p>",
        info: "بدون المغذيات قد يتوقف نمو البكتيريا لنقص النيتروجين أو الفوسفور لا لنقص المادة العضوية، فتظهر قيمة BOD أقل من الحقيقة.",
        async run(L) {
          const S = L.S;
          await L.grab(S.air);
          const z = await L.dropOn(L.zone(S.carboy, { r: 0.45 }), { hint: "ضع حجر التهوية فوق قنينة ماء التخفيف المضيئة" });
          await L.moveTo(S.air.g, [z.pos.x + 0.05, 0.1, z.pos.z], 0.6);
          S.bub.mesh.visible = true;
          await L.wait({ mins: 30, sec: 4, label: "تهوية ماء التخفيف" });
          S.bub.mesh.visible = false;
          await L.moveTo(S.air.g, [z.pos.x, z.top + 0.3, z.pos.z], 0.5);
          await L.letGo();
        },
        done: "ماء التخفيف مشبع بالأوكسجين وجاهز." },
      { t: "لماذا نخفف العيّنة؟", cam: "bottles", act: "احسب نسبة التخفيف", actIcon: "spark",
        say: `<p>أقصى أوكسجين يذوب في الماء بدرجة ${n(B.Tinc, "°م")} هو نحو ${n(f2(B.DOsat), "ملغم/لتر")} فقط. ماء دجلة في تكريت قد يستهلك أكثر من ذلك في 5 أيام، فلو حضنّاه دون تخفيف لنفد الأوكسجين قبل نهاية الحضن ولم نعرف القيمة.</p>`,
        info: "تشترط الطريقة القياسية (Standard Methods 5210 B) أن يستهلك الماء 2 ملغم/لتر على الأقل، وأن يبقى فيه 1 ملغم/لتر على الأقل بعد 5 أيام.",
        async run(L) {
          L.show(`<p class="lb-eq">P = حجم العيّنة ÷ حجم القنينة = ${B.sample} ÷ ${B.bottle} = ${B.P}</p>${kv([["حجم العيّنة", n(B.sample, "مل")], ["حجم القنينة", n(B.bottle, "مل")], ["نسبة التخفيف P", n(B.P)]])}<p>نضع ${n(B.sample, "مل")} من العيّنة ونكمل القنينة بماء التخفيف. وفي النهاية نقسم الاستهلاك على P لنعود إلى تركيز العيّنة الأصلية.</p><p class="muted lb-small">البحث نشر قيمة BOD₅ النهائية لكل عيّنة. القراءات الوسطية التي ستراها (DO₀ وDO₅ وحجم الثايوسلفات) محسوبة منها بمعادلة الطريقة، مع قيمة التشبع ${f2(B.DOsat)} ملغم/لتر بدرجة ${B.Tinc}°م (معادلة Benson وKrause المعتمدة في Standard Methods).</p>`);
        },
        done: `نسبة التخفيف P = ${n(B.P)}.` },
      { t: `ضع ${B.sample} مل من كل عيّنة`, cam: "fill", tool: "cyl",
        say: `<p>خذ الأسطوانة المدرجة وضعها عند إبريق عيّنة الشتاء لتمتلئ، ثم اسكب ${n(B.sample, "مل")} في كل من قنينتي الشتاء (أمسك الأسطوانة فوق القنينة واضغط مطولاً). كرر ذلك مع عيّنة الصيف وقنينتيها.</p>`,
        info: "نغسل الأسطوانة بقليل من العيّنة الجديدة قبل قياسها حتى لا تختلط العيّنتان.",
        async run(L) {
          const S = L.S, cyl = S.cyl, bot = S.bot;
          await Promise.all(bot.map(b => L.moveTo(b.stop, STOP_OFF, 0.45)));
          await L.grab(cyl);
          for (const [jug, pair, nm] of [[S.jw, [bot[0], bot[1]], "الشتاء"], [S.js, [bot[2], bot[3]], "الصيف"]]) {
            const z = await L.dropOn(L.zone(jug, { r: 0.5 }), { hint: `ضع الأسطوانة عند إبريق عيّنة ${nm} لتملأها` });
            await L.moveTo(cyl.g, [z.pos.x, 0, z.pos.z + 0.95], 0.45);
            await L.pour(jug, cyl, { to: cyl.h * 0.72, color: 0xc9d8c0, dur: 0.8, move: 0.5, tiltDur: 0.4, srcDrop: 0.1 });
            await L.pourInto(pair.map(b => L.zone(b, { to: 0.36, r: 0.4 })), { rate: 0.4, color: 0xc9d8c0, dstColor: 0xd3e2d0, dstOpacity: 0.4, srcRate: 0.45, srcMin: 0.02, hint: `اسكب ${B.sample} مل في كل قنينة من قنينتي ${nm}: حرّك الأسطوانة فوقها واضغط مطولاً` });
            cyl.liq.set(0);
          }
          await L.letGo();
        },
        done: `في كل قنينة الآن ${n(B.sample, "مل")} من العيّنة.` },
      { t: "أكمل القناني بماء التخفيف", cam: "fill", tool: "hand",
        say: "<p>أمسك قنينة ماء التخفيف واسكب منها في القناني الأربع حتى تمتلئ تماماً، ثم نغلقها دون فقاعات هواء.</p>",
        info: "أي فقاعة هواء محبوسة تضيف أوكسجيناً من خارج العيّنة وتفسد القياس.",
        async run(L) {
          const S = L.S, bot = S.bot;
          await L.takeFrom([S.dil], { hint: "اضغط على قنينة ماء التخفيف لتمسكها", y: 1.3 });
          await L.pourInto(bot.map(b => L.zone(b, { to: b.h - 0.05, r: 0.4 })), { rate: 0.55, color: 0xdcecef, srcRate: 0.04, srcMin: 0.1, hint: "املأ كل قنينة حتى الحافة: حرّك القنينة فوقها واضغط مطولاً" });
          await L.letGo();
          await Promise.all(bot.map(b => L.moveTo(b.stop, [0, b.h, 0], 0.4)));
        },
        done: "أربع قناني مملوءة ومغلقة: اثنتان لكل عيّنة." },
      { t: "ثبّت الأوكسجين في قنينتي DO₀", cam: "bottles", tool: "fix",
        say: "<p>بماصة لكل كاشف: أضف إلى قنينة DO₀ 1 مل من كبريتات المنغنيز، ثم 1 مل من محلول القاعدي يوديد-أزيد. نغلق القنينة ونقلبها فيظهر راسب بني. ابدأ بقنينة الشتاء ثم الصيف.</p>",
        info: "يتفاعل المنغنيز مع الأوكسجين المذاب فيكوّن راسباً بنياً من أكاسيد المنغنيز. لون الراسب البني دليل على وجود الأوكسجين، وكلما زاد الأوكسجين زاد الراسب.",
        async run(L) { const S = L.S; await L.repeat([S.bot[0], S.bot[2]], (b, i) => fixBy(L, b, i ? "DO₀ الصيفية" : "DO₀ الشتوية"), { autoAfter: 1 }); },
        done: "تكوّن الراسب البني: الأوكسجين أصبح «مثبّتاً» ولن يتغير بعد الآن." },
      { t: "أذب الراسب بالحامض", cam: "bottles", tool: "acid",
        say: "<p>خذ قطارة الحامض وأضف 1 مل من حامض الكبريتيك المركز إلى كل قنينة DO₀، ثم نقلبها حتى يذوب الراسب كله.</p>",
        info: "الحامض يحرر اليود من يوديد البوتاسيوم بكمية تكافئ الأوكسجين الأصلي تماماً، فيصبح لون المحلول أصفر بنياً. الآن نقيس اليود بدلاً من الأوكسجين.",
        async run(L) { const S = L.S; await L.repeat([S.bot[0], S.bot[2]], (b, i) => acidBy(L, b, i ? "DO₀ الصيفية" : "DO₀ الشتوية"), { autoAfter: 1 }); },
        done: "ظهر لون اليود الأصفر. القنينتان جاهزتان للتسحيح." },
      { t: "سحّح DO₀ لعيّنة الشتاء", cam: "titr", tool: "hand",
        say: `<p>أمسك قنينة الشتاء واسكب 200 مل منها في الدورق (بعد تصحيح الحجم الذي أزاحته الكواشف)، ثم سحّح بالثايوسلفات ${n(B.titrN, "عياري")} حتى يصبح اللون قشياً باهتاً. بعدها أضف النشا بالقطارة فيزرقّ، وأكمل حتى يختفي الأزرق.</p><p class="lb-eq">كل 1 مل من الثايوسلفات = 1 ملغم/لتر أوكسجين</p>`,
        info: "زر الصنبور: اضغط مع الاستمرار. يبطؤ التدفق قرب نقطة النهاية مثل التسحيح الحقيقي، أو فعّل «سحّح تلقائياً».",
        async run(L) {
          const S = L.S;
          await titrBy(L, S.bot[0], B.DOsat, "DO₀ الشتوية");
          L.nb.row("w", [B.samples[0].label, n(f2(B.DOsat)), "—", "—", "—"]);
          S.cd.d0[0] = B.DOsat; upd();
        },
        done: `DO₀ لعيّنة الشتاء = ${n(f2(B.DOsat), "ملغم/لتر")}.` },
      { t: "DO₀ لعيّنة الصيف", cam: "titr", act: "سحّح عيّنة الصيف", actIcon: "play",
        say: "<p>نكرر التسحيح نفسه لقنينة DO₀ الصيفية (يُنفَّذ تلقائياً لأنك سحّحت الأولى بيدك).</p>",
        async run(L) {
          const S = L.S;
          await toFlask(L, S.bot[2], true);
          await doTitr(L, "s0", B.DOsat, false);
          L.nb.row("s", [B.samples[1].label, n(f2(B.DOsat)), "—", "—", "—"]);
          S.cd.d0[1] = B.DOsat; upd();
        },
        done: `DO₀ لعيّنة الصيف = ${n(f2(B.DOsat), "ملغم/لتر")} أيضاً، لأن القنينتين خُففتا بماء مشبع.` },
      { t: "احضن قنينتي DO₅ خمسة أيام", cam: "incw", tool: "hand",
        say: `<p>افتح باب الحاضنة، وانقل إليها القنينتين المعتمتين (DO₅) بيدك، ثم أغلقها. تبقيان ${n(B.days, "أيام")} في الظلام بدرجة ${n(B.Tinc, "°م")}.</p>`,
        info: `البحث حضن العيّنات بدرجة ${B.Tinc}°م كما في طرائقه؛ والطريقة القياسية الدولية تستعمل 20°م. لذلك عند مقارنة النتائج مع بحوث أخرى يجب التأكد من درجة الحضن.`,
        async run(L) {
          const S = L.S, inc = S.inc, door = S.door;
          await L.press([{ obj: door, halo: true, r: 0.2, label: "مقبض الباب" }], { hint: "افتح الحاضنة: اضغط مقبض بابها", label: "افتح الباب" });
          await inc.open(true);
          inc.g.updateMatrixWorld(true);
          const spots = [[0.25, 0.12, 0], [-0.25, 0.12, 0]], front = inc.g.localToWorld(new THREE.Vector3(0.05, 0, inc.d / 2 + 0.6));
          await L.repeat([S.bot[1], S.bot[3]], async (b, i) => {
            await L.takeFrom([b], { hint: `أمسك قنينة DO₅ ${i ? "الصيفية" : "الشتوية"} (المعتمة)`, y: 1.2 });
            b.tag.el.hidden = true;
            await L.dropOn(L.zone(inc, { pos: front, top: 0.95, r: 0.5 }), { hint: "ضعها أمام باب الحاضنة المفتوح لتدخلها" });
            const w = inc.g.localToWorld(new THREE.Vector3(...spots[i]));
            await L.letGo({ to: [w.x, w.y, front.z] });
            await L.moveTo(b.g, [w.x, w.y, w.z], 0.5);
          }, { autoAfter: 1 });
          L.cam("inc");
          await L.press([{ obj: door, halo: true, r: 0.2, label: "أغلق الباب" }], { hint: "أغلق باب الحاضنة", label: "أغلق الباب" });
          await inc.open(false);
          await L.wait({ mins: B.days * 1440, sec: 8, label: `الحضن بدرجة ${B.Tinc}°م في الظلام` });
          await L.press([{ obj: door, halo: true, r: 0.2, label: "افتح الباب" }], { hint: "مرّت 5 أيام: افتح الحاضنة", label: "افتح الباب" });
          await inc.open(true);
          for (let i = 0; i < 2; i++) { const b = S.bot[i * 2 + 1]; await L.moveTo(b.g, [b.g.position.x, b.g.position.y, front.z], 0.4); await L.arcTo(b.g, b.home, 0.6, 0.8); b.tag.el.hidden = false; }
          await inc.open(false);
        },
        done: "مرت 5 أيام. القنينتان خرجتا من الحاضنة." },
      { t: "ثبّت أوكسجين DO₅ لعيّنة الشتاء", cam: "bottles", tool: "fix",
        say: "<p>كرر التثبيت على قنينة الشتاء المحضونة: MnSO₄ ثم القاعدي، ثم قطارة الحامض. لاحظ أن الراسب البني أقل هذه المرة، لأن البكتيريا استهلكت جزءاً من الأوكسجين.</p>",
        async run(L) { const S = L.S, b = S.bot[1]; await fixBy(L, b, "DO₅ الشتوية"); await acidBy(L, b, "DO₅ الشتوية"); },
        done: "القنينة جاهزة للتسحيح." },
      { t: "سحّح DO₅ لعيّنة الشتاء", cam: "titr", tool: "hand",
        say: "<p>اسكب 200 مل من قنينة الشتاء المحضونة في الدورق وسحّح كما فعلت سابقاً.</p>",
        async run(L) {
          const S = L.S, d5 = DO5(B.samples[0]);
          await titrBy(L, S.bot[1], d5, "DO₅ الشتوية");
          L.nb.row("w", [B.samples[0].label, n(f2(B.DOsat)), n(f2(d5)), "—", "—"]);
          S.cd.d5[0] = d5; upd();
        },
        done: `DO₅ لعيّنة الشتاء = ${n(f2(DO5(B.samples[0])), "ملغم/لتر")}: استُهلك أغلب الأوكسجين.` },
      { t: "DO₅ لعيّنة الصيف", cam: "titr", act: "ثبّت وسحّح عيّنة الصيف", actIcon: "play",
        say: "<p>الخطوات نفسها لقنينة الصيف المحضونة (تُنفَّذ تلقائياً).</p>",
        async run(L) {
          const S = L.S, b = S.bot[3], d5 = DO5(B.samples[1]);
          L.cam("bottles"); await winklerFix(L, b, true); await winklerAcid(L, b, true); L.cam("titr");
          await toFlask(L, b, true);
          await doTitr(L, "s5", d5, false);
          L.nb.row("s", [B.samples[1].label, n(f2(B.DOsat)), n(f2(d5)), "—", "—"]);
          S.cd.d5[1] = d5; upd();
        },
        done: `DO₅ لعيّنة الصيف = ${n(f2(DO5(B.samples[1])), "ملغم/لتر")}.` },
      { t: "احسب BOD₅", cam: "wide", act: "احسب BOD₅", actIcon: "spark",
        say: "<p class=\"lb-eq\">BOD₅ = (DO₀ − DO₅) ÷ P</p>",
        async run(L) {
          const S = L.S, rows = [];
          B.samples.forEach((s, i) => {
            const d5 = DO5(s), dep = B.DOsat - d5, bod = dep / B.P;
            L.nb.row(s.key === "w" ? "w" : "s", [s.label, n(f2(B.DOsat)), n(f2(d5)), n(f2(dep)), `<b>${n(f1(bod))}</b>`]);
            S.cd.bod[i] = +bod.toFixed(1);
            rows.push([s.label, n(`(${f2(B.DOsat)} − ${f2(d5)}) ÷ ${B.P}`), n(f1(bod), "ملغم/لتر"), dep >= 2 && d5 >= 1 ? "مقبولة" : "غير مقبولة"]);
          });
          upd();
          L.show(tbl(["العيّنة", "الحساب", "BOD₅", "شروط الطريقة"], rows));
        },
        done: `BOD₅ للشتاء ${n(B.samples[0].bod, "ملغم/لتر")}، وللصيف ${n(B.samples[1].bod, "ملغم/لتر")}، مطابقان لما نشره البحث.` }
    ],
    results(L) {
      const w = B.samples[0], s = B.samples[1], seasons = ["الصيف", "الخريف", "الشتاء", "الربيع"];
      return `
        ${kv([["BOD₅ · " + w.label, n(w.bod, "ملغم/لتر"), "c-chloro"], ["BOD₅ · " + s.label, n(s.bod, "ملغم/لتر"), "c-silt"], ["نسبة التخفيف P", n(B.P)], ["الحضن", n(B.days, "أيام") + " · " + n(B.Tinc, "°م")]])}
        ${tbl(["العيّنة", "DO₀", "DO₅", "الاستنزاف", "BOD₅"], B.samples.map(x => { const d5 = DO5(x); return [x.label, n(f2(B.DOsat)), n(f2(d5)), n(f2(B.DOsat - d5)), n(f1((B.DOsat - d5) / B.P))]; }))}
        <h4>BOD₅ في محطات البحث الخمس وفصوله (ملغم/لتر)</h4>
        ${tbl(["المحطة", ...seasons], TG.bodTable.map((r, i) => [`المحطة ${i + 1}`, ...r.map(v => n(v))]))}
        <h4>الاستنتاج</h4>
        <ul class="lb-concl">
          <li>أعلى BOD₅ في البحث كان في الشتاء عند المحطة 1 (${n(w.bod, "ملغم/لتر")})، وأقله في الصيف (${n(s.bod, "ملغم/لتر")})، وكانت الفروق بين الفصول معنوية إحصائياً.</li>
          <li>رجّح البحث أن الزيادة تعود إلى وصول ملوثات بشرية إلى الماء وأكسدة المادة العضوية فيها، وارتفاع BOD ينعكس سلباً على الأوكسجين المذاب الذي تحتاجه الأحياء المائية.</li>
          <li>التخفيف خطوة أساسية في الطريقة: من دونه يستهلك الماء أكثر من الأوكسجين المتاح خلال الحضن فلا يمكن حساب BOD₅.</li>
        </ul>
        <p class="muted lb-small">طريقة البحث: ${U.esc(B.method)}. القراءات الوسطية محسوبة من قيمة BOD₅ المنشورة بمعادلة الطريقة.</p>`;
    }
  });

  /* ==================================================================
     4) العسرة الكلية بالتسحيح مع EDTA
  ================================================================== */
  const TH = TG.th;
  const vOf = s => +(s.th * TH.Vs / 1000 / (TH.M * 100)).toFixed(2); // B = 1.00 ملغم CaCO₃ لكل مل EDTA 0.01 M
  const EBT = [[0, 0x8e1f3d, 0.8], [0.9, 0x7c2b63, 0.78], [0.985, 0x5a3f8d, 0.76], [1, 0x2a5fbf, 0.74]];
  const thClass = v => TH.classes.find(c => v <= c[0])[1];

  LAB.reg({
    id: "th", title: "العسرة الكلية", cat: "تلوث · ماء دجلة في تكريت", icon: "flask", hue: "#e6ae4f",
    blurb: "تسحيح الكالسيوم والمغنيسيوم بـ EDTA ودليل EBT",
    aim: "تقدير العسرة الكلية (أيونات الكالسيوم والمغنيسيوم معبّراً عنها بكاربونات الكالسيوم) في عيّنتين من نهر دجلة داخل تكريت (شتاء المحطة 2 وصيف المحطة 5)، ومقارنتهما بالمواصفة العراقية لمياه الشرب.",
    src: TG.src,
    materials: ["عيّنتا ماء من دجلة في تكريت", `ماصة حجمية ${n(TH.Vs, "مل")}`, "دورق مخروطي", `محلول Na₂EDTA تركيزه ${n(TH.M, "مولاري")}`, `محلول الأمونيا المنظم (pH 10)، ${n(TH.buffer, "مل")}`, `دليل إيريوكروم الأسود EBT، ${n(TH.ebt, "غم")}`, "سحاحة وحامل"],
    tools: [
      { id: "edta", name: "قنينة EDTA", icon: "milk", why: "نملأ بها السحاحة في البداية." },
      { id: "pip", name: "ماصة 50 مل", icon: "pipette", why: "نأخذ بها العيّنة بعد ملء السحاحة." },
      { id: "buf", name: "قطارة المنظم", icon: "drop", why: "نضيف بها المحلول المنظم بعد وضع العيّنة." },
      { id: "ebt", name: "ملعقة EBT", icon: "spark", why: "نضيف بها الدليل بعد المحلول المنظم." },
      { id: "bur", name: "صنبور السحاحة", icon: "pipette", why: "نفتحه بعد ظهور اللون الأحمر الخمري." }
    ],
    views: {
      intro: { t: [0.4, 1.2, 0], r: 10, th: 0, ph: 1.12 },
      fill: { t: [0.6, 2.6, 0.2], r: 7.2, th: 0.1, ph: 1.18 },
      bur: { t: [0, 2.2, 0.2], r: 6.2, th: 0.1, ph: 1.2 },
      flask: { t: [0.6, 0.9, 0.4], r: 6, th: 0.1, ph: 1.12 },
      bench: { t: [-0.8, 0.8, 0.0], r: 6, th: -0.1, ph: 1.12 },
      jugs: { t: [2.6, 0.8, 0.5], r: 5.8, th: 0.2, ph: 1.1 }
    },
    nb: ["العيّنة", "حجم EDTA (مل)", "العسرة (ملغم/لتر CaCO₃)", "التصنيف"],
    chartTitle: "العسرة الكلية مقارنة بالمواصفة", chartSub: "ملغم/لتر CaCO₃",
    chart(L) {
      L.S.cd = [null, null];
      return { type: "bar", data: { labels: TH.samples.map(s => s.label), datasets: [
        { label: "العسرة الكلية", data: L.S.cd, backgroundColor: ["rgba(79,200,220,.55)", "rgba(230,174,79,.55)"], borderColor: [C.river, C.silt], borderWidth: 1.5, borderRadius: 6 },
        { label: `حد المواصفة ${TH.limit}`, type: "line", data: [TH.limit, TH.limit], borderColor: C.crimson, borderDash: [5, 4], pointRadius: 0, borderWidth: 1.4 },
        { label: "حد «عسر جداً» 300", type: "line", data: [300, 300], borderColor: C.violet, borderDash: [2, 4], pointRadius: 0, borderWidth: 1.2 }
      ] }, options: axes("", "ملغم/لتر CaCO₃", { y: { max: 550 } }) };
    },
    setup(L) {
      const S = L.S, w = TH.samples[0], s = TH.samples[1];
      S.jw = L.put(L.MK.jug({ label: [w.label, "دجلة · تكريت"], color: 0xc9d8c0, opacity: 0.5, cap: 0x2f5fb3 }), 3.9, 0, 0.3);
      S.js = L.put(L.MK.jug({ label: [s.label, "دجلة · تكريت"], color: 0xc9d8c0, opacity: 0.5, cap: 0xe6ae4f }), 2.8, 0, 0.3);
      S.bur = L.put(L.MK.burette({ color: 0xeef4f5, opacity: 0.22 }), 0, 0, -0.1); S.bur.empty();
      S.bur.g.updateMatrixWorld(true);
      const fp = S.bur.g.localToWorld(S.bur.flaskPos.clone());
      S.flask = L.put(L.MK.erlen({ rb: 0.42, h: 1.05, color: 0xc9d8c0, opacity: 0.4 }), fp.x, fp.y, fp.z);
      S.edta = L.put(L.MK.bottle({ label: ["Na₂EDTA", `${TH.M} M`], cap: 0x2f5fb3, r: 0.24, h: 0.65, color: 0xeef4f5, opacity: 0.25 }), 1.6, 0, -1.2);
      S.buf = L.put(L.MK.bottle({ label: ["منظم pH 10", "NH₄Cl/NH₄OH"], cap: 0xe7ecee, r: 0.18, h: 0.45, color: 0xeef4f5, opacity: 0.25 }), -1.4, 0, -1.25);
      S.ebt = L.put(L.MK.bottle({ label: ["EBT", "دليل"], cap: 0x1d2328, r: 0.14, h: 0.3, amber: true, color: 0x2a1a20, opacity: 0.9 }), -2.1, 0, -1.2);
      S.pip = L.put(L.MK.pipette({ color: 0xc9d8c0 }), 2.0, 0, 1.0);
      S.drop = L.put(L.MK.dropper(), -1.1, 0, -0.75);
      S.spat = L.put(L.MK.spatula(), -1.9, 0.02, -0.55); S.spat.g.rotation.y = -0.5;
      S.funnel = L.put(L.MK.funnel(), 0.9, 0, -0.6); S.funnel.g.scale.setScalar(0.6);
      S.spat.g.children.forEach(c => { c.position.z += 0.5; });
      { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.035, 12), new THREE.MeshStandardMaterial({ color: 0x2a1a20, roughness: 0.95 })); tip.position.set(0, 0.025, 0); tip.visible = false; S.spat.g.add(tip); S.spat.load = v => { tip.visible = v; }; S.spat.h = 0.1; S.spat.r = 0.15; }
      { const b = S.bur, top = b.g.localToWorld(new THREE.Vector3(0, b.yB + b.L + 0.2, 0.13)); S.funnel.g.position.copy(top); S.funnelHome = [0.9, 0, -0.6]; }
    },
    steps: [
      { t: "ما هي العسرة؟", cam: "intro",
        say: `<p>العسرة مجموع أيونات <b>الكالسيوم Ca²⁺</b> و<b>المغنيسيوم Mg²⁺</b> الذائبة، وتُكتب بما يكافئها من كاربونات الكالسيوم. الماء العسر يكوّن قشوراً في الأنابيب والمراجل ويقلل رغوة الصابون.</p><p>نقدّرها بالتسحيح مع <b>EDTA</b> الذي يمسك الأيونين بقوة. الدليل <b>EBT</b> لونه أحمر خمري وهو مرتبط بالمغنيسيوم، وأزرق عندما يكون حراً.</p><p>في كل خطوة تأخذ الأداة من الصينية بيدك وتضعها على الهدف المضيء.</p>`,
        info: "عند نقطة النهاية يكون EDTA قد سحب كل الكالسيوم والمغنيسيوم، حتى المرتبط بالدليل، فيتحرر الدليل ويظهر لونه الأزرق." },
      { t: "املأ السحاحة بمحلول EDTA", cam: "fill", tool: "edta",
        say: `<p>خذ قنينة EDTA ${n(TH.M, "مولاري")} وحرّكها فوق القمع أعلى السحاحة، ثم <b>اضغط مطولاً</b> لتصب حتى تمتلئ السحاحة. بعدها نرفع القمع ونضبط القراءة على الصفر.</p>`,
        info: "نرفع القمع قبل التسحيح لأن قطرة متبقية فيه قد تنزل أثناء القراءة فتغيّرها. واقرأ السحاحة دائماً عند أسفل التقعر (الهلال) وعينك بمستواه.",
        async run(L) {
          const S = L.S, b = S.bur;
          await L.grab(S.edta);
          const fz = L.zone({ g: S.funnel.g, liq: b.liq, h: 0.4, r: 0.15 }, { to: b.L, liqY: -(b.L + 0.2), r: 0.35, rate: 0.8 });
          await L.pourInto([fz], { color: 0xeef4f5, srcRate: 0.03, hint: "حرّك القنينة فوق القمع المضيء واضغط مطولاً لتصب" });
          await L.letGo();
          await L.arcTo(S.funnel.g, S.funnelHome, 0.3, 0.7);
          b.setRead(0);
        },
        done: "السحاحة ممتلئة والقراءة صفر." },
      { t: `خذ ${TH.Vs} مل من عيّنة الشتاء`, cam: "flask", tool: "pip",
        say: `<p>خذ الماصة الحجمية وضعها في إبريق عيّنة الشتاء (المحطة 2) لتسحب ${n(TH.Vs, "مل")}، ثم أفرغها في الدورق المخروطي تحت السحاحة.</p>`,
        async run(L) {
          const S = L.S, p = S.pip;
          S.flask.liq.color(0xc9d8c0, 0.4, 0);
          await L.grab(p);
          const zj = await L.dropOn(L.zone(S.jw, { r: 0.5 }), { hint: `ضع الماصة فوق إبريق عيّنة الشتاء لتسحب ${TH.Vs} مل` });
          await L.moveTo(p.g, [zj.pos.x, 0.25, zj.pos.z], 0.4); await p.fill(0.6, 0xc9d8c0, 0.45); await L.moveTo(p.g, [zj.pos.x, zj.top + 0.3, zj.pos.z], 0.4);
          const z = await L.dropOn(L.zone(S.flask, { r: 0.45 }), { hint: "أفرغها في الدورق المخروطي المضيء تحت السحاحة" });
          await L.moveTo(p.g, [z.pos.x + 0.07, z.top - 0.35, z.pos.z - 0.06], 0.4);
          await Promise.all([p.fill(0, null, 0.6), S.flask.liq.to(0.22, 0.6)]);
          await L.moveTo(p.g, [z.pos.x + 0.07, z.top + 0.3, z.pos.z - 0.06], 0.35);
          await L.letGo();
        },
        done: "العيّنة في الدورق." },
      { t: "أضف المحلول المنظم", cam: "bench", tool: "buf",
        say: `<p>خذ القطارة واسحب من قنينة محلول الأمونيا المنظم، ثم أضف ${n(TH.buffer, "مل")} إلى الدورق ليصبح pH نحو 10.</p>`,
        info: "عند pH 10 يرتبط EDTA بالكالسيوم والمغنيسيوم ارتباطاً كاملاً ويعطي الدليل لونه الواضح. في الوسط الحامضي لا يكتمل التفاعل.",
        async run(L) {
          const S = L.S, d = S.drop;
          await L.grab(d);
          const zb = await L.dropOn(L.zone(S.buf, { r: 0.3 }), { hint: "ضع القطارة فوق قنينة المحلول المنظم" });
          await L.moveTo(d.g, [zb.pos.x, 0.15, zb.pos.z], 0.3); await L.moveTo(d.g, [zb.pos.x, zb.top + 0.3, zb.pos.z], 0.3);
          const z = await L.dropOn(L.zone(S.flask, { r: 0.45 }), { hint: "أضف المحلول إلى الدورق تحت السحاحة" });
          const tip = new THREE.Vector3(z.pos.x + 0.07, z.top + 0.02, z.pos.z - 0.06);
          await L.moveTo(d.g, [tip.x, tip.y, tip.z], 0.3);
          await L.drops(tip, S.flask, 4, 0xf3f3f3, 0.12);
          await L.letGo();
        },
        done: "الوسط الآن قاعدي (pH 10)." },
      { t: "أضف دليل EBT", cam: "bench", tool: "ebt",
        say: `<p>خذ الملعقة الصغيرة واغرف ${n(TH.ebt, "غم")} من مسحوق دليل EBT، وأضفه إلى الدورق.</p>`,
        async run(L) {
          const S = L.S, sp = S.spat;
          await L.grab(sp, { y: 0.9 });
          await L.dropOn(L.zone(S.ebt, { r: 0.3 }), { hint: "اغرف الدليل: ضع الملعقة فوق قنينة EBT" });
          sp.load(true);
          const z = await L.dropOn(L.zone(S.flask, { r: 0.45 }), { hint: "أضف الدليل إلى الدورق تحت السحاحة" });
          await L.moveTo(sp.g, [z.pos.x + 0.07, z.top + 0.03, z.pos.z - 0.06], 0.3);
          sp.load(false);
          await S.flask.liq.color(EBT[0][1], EBT[0][2], 1.0);
          await L.letGo();
        },
        done: "صار اللون أحمر خمرياً: الدليل مرتبط بأيونات العسرة." },
      { t: "سحّح حتى يصبح اللون أزرق", cam: "bur", tool: "bur",
        say: "<p>افتح الصنبور وسحّح مع الرج المستمر. قرب النهاية يتحول الأحمر إلى بنفسجي، ثم أزرق صافٍ دون أي أثر للأحمر. هنا تتوقف.</p>",
        info: "اضغط مع الاستمرار على زر الصنبور، ويبطؤ التدفق قرب نقطة النهاية. تريد طريقة أسرع؟ فعّل «سحّح تلقائياً».",
        async run(L) {
          const S = L.S, s = TH.samples[0], v = vOf(s);
          await L.titrate({ bur: S.bur, flask: S.flask, end: v, colors: EBT, tip: "الأحمر الخمري يعني أن أيونات العسرة ما زالت موجودة", doneText: "أزرق صافٍ" });
          L.nb.row("w", [s.label, n(f2(v)), "—", "—"]);
        },
        done: `استهلكت عيّنة الشتاء ${n(f2(vOf(TH.samples[0])), "مل")} من EDTA.` },
      { t: "كرّر لعيّنة الصيف", cam: "flask", act: "نفّذ عيّنة الصيف", actIcon: "play",
        say: "<p>نعيد ملء السحاحة ونكرر الخطوات نفسها لعيّنة الصيف (المحطة 5). ستُنفَّذ تلقائياً.</p>",
        async run(L) {
          const S = L.S, s = TH.samples[1], v = vOf(s);
          await S.flask.liq.to(0, 0.5);
          S.bur.setRead(0);
          S.flask.liq.color(0xc9d8c0, 0.4, 0);
          await L.pipetteTo(S.pip, S.js, S.flask, { to: 0.22, color: 0xc9d8c0 });
          await S.flask.liq.color(EBT[0][1], EBT[0][2], 0.6);
          L.cam("bur");
          await L.autoTitrate(S.bur, S.flask, 0, v, EBT, 3.2);
          L.nb.row("s", [s.label, n(f2(v)), "—", "—"]);
        },
        done: `استهلكت عيّنة الصيف ${n(f2(vOf(TH.samples[1])), "مل")} فقط.` },
      { t: "احسب العسرة", cam: "intro", act: "احسب العسرة", actIcon: "spark",
        say: `<p class="lb-eq">العسرة (ملغم/لتر CaCO₃) = حجم EDTA (مل) × B × 1000 ÷ حجم العيّنة (مل)</p><p>حيث B = ${n("1.00")} ملغم CaCO₃ لكل مل من EDTA ${n(TH.M, "مولاري")}.</p>`,
        async run(L) {
          const S = L.S, rows = [];
          TH.samples.forEach((s, i) => { const v = vOf(s), th = v * 1000 / TH.Vs; L.nb.row(s.key, [s.label, n(f2(v)), `<b>${n(Math.round(th))}</b>`, thClass(th)]); S.cd[i] = Math.round(th); rows.push([s.label, n(`${f2(v)} × 1 × 1000 ÷ ${TH.Vs}`), n(Math.round(th), "ملغم/لتر"), thClass(th)]); });
          upd();
          L.show(tbl(["العيّنة", "الحساب", "العسرة", "التصنيف"], rows));
        },
        done: `عسرة الشتاء ${n(TH.samples[0].th, "ملغم/لتر")} وعسرة الصيف ${n(TH.samples[1].th, "ملغم/لتر")}، مطابقتان للبحث.` }
    ],
    results(L) {
      const w = TH.samples[0], s = TH.samples[1];
      return `
        ${kv([["العسرة · " + w.label, n(w.th, "ملغم/لتر"), "c-river"], ["العسرة · " + s.label, n(s.th, "ملغم/لتر"), "c-silt"], ["حد المواصفة 417", n(TH.limit, "ملغم/لتر")], ["الفرق بين الموسمين", n(w.th - s.th, "ملغم/لتر")]])}
        ${tbl(["العيّنة", "EDTA (مل)", "العسرة (ملغم/لتر CaCO₃)", "التصنيف", "المواصفة 417"], TH.samples.map(x => [x.label, n(f2(vOf(x))), n(x.th), thClass(x.th), x.th <= TH.limit ? "ضمن الحد" : "تتجاوز الحد"]))}
        <h4>التصنيف المستعمل (${U.esc(TH.classSrc)})</h4>
        ${tbl(["العسرة (ملغم/لتر)", "التصنيف"], [["0 – 75", "يسر"], ["75 – 150", "عسرة متوسطة"], ["150 – 300", "عسر"], ["أكثر من 300", "عسر جداً"]])}
        <h4>الاستنتاج</h4>
        <ul class="lb-concl">
          <li>ماء دجلة في تكريت عسر في الموسمين، وعيّنة الشتاء (${n(w.th)}) على حافة «العسر جداً».</li>
          <li>العسرة أعلى في الشتاء منها في الصيف بنحو ${n(w.th - s.th, "ملغم/لتر")}، وكانت الفروق الفصلية والمكانية معنوية في البحث.</li>
          <li>القيمتان أقل من الحد الأعلى للمواصفة العراقية لمياه الشرب (${n(TH.limit, "ملغم/لتر")})، فالعسرة هنا مشكلة تقنية (قشور وصابون) أكثر منها صحية.</li>
        </ul>
        <p class="muted lb-small">طريقة البحث: ${U.esc(TH.method)}. حجم EDTA محسوب من قيمة العسرة المنشورة بمعادلة الطريقة القياسية (APHA 2340 C) لعيّنة ${TH.Vs} مل.</p>`;
    }
  });

  /* ==================================================================
     5) العناصر الثقيلة في القصب قرب مصفى بيجي
  ================================================================== */
  const H = D.hm;
  const metal = k => H.metals.find(m => m.key === k);
  const tf = (k, st, part) => { const r = H.plant[k].root[st]; return r ? H.plant[k][part][st] / r : null; };
  const bcf = (k, st) => H.sediment[k][st] ? H.plant[k].root[st] / H.sediment[k][st] : null;
  const ppm = v => v === 0 ? "0.000" : U.fmt(v, 3);

    const HM_NAMES = ["جذور م1", "سيقان م1", "أوراق م1", "جذور م5", "سيقان م5", "أوراق م5"];
  async function hmToDishes(L, reed, base) {
    const S = L.S, parts = ["root", "stem", "leaf"];
    for (let j = 0; j < 3; j++) {
      const d = S.dish[base + j], w = d.g.getWorldPosition(new THREE.Vector3()), g = reed.parts[parts[j]];
      L.detach(g); g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
      const piv = new THREE.Group(); piv.position.copy(c); L.group.add(piv); piv.attach(g);
      await L.anim(0.6, k => { piv.position.lerpVectors(c, new THREE.Vector3(w.x, 0.12, w.z), k); piv.position.y += Math.sin(Math.PI * k) * 0.5; piv.scale.setScalar(U.lerp(1, 0.22, k)); });
      d.part = piv;
    }
  }

  LAB.reg({
    id: "hm", title: "العناصر الثقيلة في القصب", cat: "تلوث · قناة مصفى بيجي", icon: "leaf", hue: "#ef5a64",
    blurb: "هضم النبات وقياس Pb وCu وCd وNi بالامتصاص الذري",
    aim: "تقدير الرصاص والنحاس والكادميوم والنيكل في جذور وسيقان وأوراق نبات القصب Phragmites australis النامي على قناة مياه مصافي بيجي، ومقارنة المحطة 1 (قرب المصفى) بالمحطة 5 (قرب النهر)، وحساب معامل الانتقال TF ومعامل التركيز الحيوي BCF.",
    src: H.src,
    materials: ["نبات القصب من المحطتين 1 و5", `فرن تجفيف بدرجة ${n(H.dryT, "°م")}`, "هاون خزفي", "ميزان حساس", `حامضا ${H.acid}`, "صفيحة تسخين داخل خزانة الغازات", `قناني حجمية ${n(H.V, "مل")} وماء منزوع الأيونات`, `جهاز الامتصاص الذري ${H.aas} مع مصابيح Pb وCu وCd وNi`],
    tools: [
      { id: "cut", name: "مقص", icon: "scissors", why: "نفصل به الجذور والسيقان والأوراق أولاً." },
      { id: "hand", name: "اليد", icon: "hand", why: "ننقل بها الجفنات والدوارق ونفتح الأجهزة." },
      { id: "pestle", name: "مدقة الهاون", icon: "pot", why: "نطحن بها الأجزاء بعد التجفيف." },
      { id: "acid", name: "ماصة الأحماض", icon: "pipette", why: "نهضم بها العيّنة بعد الطحن والوزن." }
    ],
    views: {
      intro: { t: [0, 1.2, -0.1], r: 11.5, th: 0, ph: 1.12 },
      reed: { t: [-4.0, 0.2, 1.05], r: 4.4, th: 0, ph: 0.78 },
      oven: { t: [-4.2, 0.7, -0.3], r: 6.2, th: -0.15, ph: 1.1 },
      mortar: { t: [-2.0, 0.5, 0.1], r: 4.8, th: 0, ph: 1.0 },
      hood: { t: [1.2, 1.1, -0.6], r: 5.6, th: 0.05, ph: 1.15 },
      fill: { t: [1.5, 0.8, 0.2], r: 6.8, th: 0.1, ph: 1.08 },
      aas: { t: [3.0, 0.8, 0.4], r: 7.2, th: 0.25, ph: 1.08 }
    },
    nb: ["العنصر", "الجزء", "المحطة 1", "المحطة 5"],
    chartTitle: "تركيز العنصر في أجزاء القصب", chartSub: "ppm وزن جاف",
    chart(L) {
      L.S.cd = { st1: [null, null, null], st5: [null, null, null] };
      return { type: "bar", data: { labels: H.parts.map(p => p.name), datasets: [
        { label: "المحطة 1 · قرب المصفى", data: L.S.cd.st1, backgroundColor: "rgba(239,90,100,.55)", borderColor: C.crimson, borderWidth: 1.5, borderRadius: 5 },
        { label: "المحطة 5 · قرب النهر", data: L.S.cd.st5, backgroundColor: "rgba(79,200,220,.5)", borderColor: C.river, borderWidth: 1.5, borderRadius: 5 }
      ] }, options: axes("", "ppm") };
    },
    setup(L) {
      const S = L.S;
      S.r1 = L.put(L.MK.reed({ seed: "st1" }), -4.6, 0.02, 1.35);
      S.r5 = L.put(L.MK.reed({ seed: "st5" }), -4.6, 0.02, 0.75);
      S.rl1 = L.label(S.r1.g, "قصب المحطة 1", { dy: 0.25, cls: "dose" }); S.rl5 = L.label(S.r5.g, "قصب المحطة 5", { dy: 0.25, cls: "dose" });
      S.dish = [0, 1, 2, 3, 4, 5].map(i => { const d = L.put(L.MK.dish(), -3.6 + (i % 3) * 0.62, 0, -0.25 + Math.floor(i / 3) * 0.6); return d; });
      S.oven = L.put(L.MK.oven(), -5.4, 0, -1.25);
      S.mortar = L.put(L.MK.mortar(), -2.3, 0, 0.75);
      S.bal = L.put(L.MK.balance(), -1.5, 0, -0.9);
      S.hood = L.put(L.MK.hood({ w: 3.2 }), 1.2, 0, -1.0);
      S.hp = L.put(L.MK.hotplate(), 1.2, 0, -1.05);
      S.acidN = L.put(L.MK.bottle({ label: ["HNO₃", "مركّز"], cap: 0xb8392f, r: 0.17, h: 0.45, amber: true, color: 0xe8d9a6, opacity: 0.4 }), 0.0, 0, -1.4);
      S.acidP = L.put(L.MK.bottle({ label: ["HClO₄", "مركّز"], cap: 0xe6ae4f, r: 0.17, h: 0.45, color: 0xf2f2ee, opacity: 0.3 }), 2.4, 0, -1.4);
      S.dg = [0, 1, 2, 3, 4, 5].map(i => L.put(L.MK.erlen({ rb: 0.17, h: 0.48, rn: 0.06, color: 0x3b2410, opacity: 0 }), 0.75 + (i % 3) * 0.45, 0.18, -1.25 + Math.floor(i / 3) * 0.38));
      S.vf = [0, 1, 2, 3, 4, 5].map(i => { const v = L.put(L.MK.volflask({ rb: 0.2, rn: 0.045, h: 0.95, color: 0xf3efd6, opacity: 0.2 }), 0.2 + i * 0.55, 0, 1.25); v.home = [0.2 + i * 0.55, 0, 1.25]; return v; });
      const names = ["جذور م1", "سيقان م1", "أوراق م1", "جذور م5", "سيقان م5", "أوراق م5"];
      S.vt = S.vf.map((v, i) => L.label(v.g, names[i], { dy: 1.1, cls: "dose" }));
      S.aas = L.put(L.MK.aas(), 5.0, 0, -0.95); L.loop(sdt => S.aas.tick(sdt));
      S.aas.g.updateMatrixWorld(true); S.sampleAt = S.aas.g.localToWorld(S.aas.sampleAt.clone());
      S.measured = new Set();
      // المقص: نصلان يدوران حول المحور، ورأسه عند نقطة القص
      {
        const g = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: 0xc8322b, roughness: 0.5 });
        const half = s => { const pv = new THREE.Group(); pv.position.set(0, 0, 0.3); g.add(pv); L.mesh(new THREE.BoxGeometry(0.03, 0.012, 0.3), L.MAT.steel, 0, 0, -0.15, pv); const h = L.mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 20), red, s * 0.04, 0, 0.13, pv); h.rotation.x = Math.PI / 2; return pv; };
        const a = half(1), b = half(-1);
        S.sc = L.put({ g, h: 0.05, r: 0.2 }, -3.1, 0.02, 1.65, 0.5);
        S.sc.blades = f => { const t = 0.04 + 0.3 * f; a.rotation.y = t; b.rotation.y = -t; };
        S.sc.blades(0.1);
      }
      S.pst = { g: S.mortar.pestle, h: 0.7, r: 0.12 };
      S.spat = L.put(L.MK.spatula(), -1.95, 0.02, 0.35, 0.4); S.spat.g.children.forEach(c => { c.position.z += 0.5; });
      { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.035, 12), new THREE.MeshStandardMaterial({ color: 0xb3a36e, roughness: 0.95 })); tip.position.set(0, 0.025, 0); tip.visible = false; S.spat.g.add(tip); S.spat.load = v => { tip.visible = v; }; S.spat.h = 0.1; S.spat.r = 0.15; }
      S.pA = L.put(L.MK.pipette({ color: 0xe8d9a6, len: 1.25 }), 0.45, 0, -1.6);
      S.wash = L.put(L.MK.bottle({ label: ["ماء منزوع", "الأيونات"], cap: 0x2c8d9c, r: 0.22, h: 0.6, color: 0xeef4f5, opacity: 0.25 }), 3.7, 0, 1.55);
      S.ovDoor = L.hitbox(S.oven.door, S.oven.w - 0.3, S.oven.h / 2 - 0.04, 0.1, 0.2);
      S.hpKnob = L.hitbox(S.hp.g, 0.48, 0.08, 0.5, 0.12);
    },
    steps: [
      { t: "لماذا القصب؟", cam: "intro",
        say: `<p>نبات القصب ينمو بكثرة على ضفاف القنوات الملوثة، وجذوره تحتجز العناصر الثقيلة من الرواسب. لذلك نستعمله <b>مؤشراً حيوياً</b> على التلوث، ووسيلة للمعالجة النباتية.</p><p>نقارن نباتاً من <b>المحطة 1</b> عند بداية قناة مصافي بيجي، ونباتاً من <b>المحطة 5</b> قرب مصبها في دجلة، على بعد نحو كيلومتر.</p><p>في كل خطوة تأخذ الأداة من الصينية بيدك وتستعملها على الهدف المضيء.</p>`,
        info: "معامل الانتقال TF = تركيز الجزء الهوائي ÷ تركيز الجذور. إذا كان أقل من 1 فالنبات يحبس العنصر في جذوره (تثبيت نباتي)." },
      { t: "افصل أجزاء النبات بالمقص", cam: "reed", tool: "cut",
        say: "<p>غسلنا النبات بماء الحنفية ثم بالماء المقطر. خذ المقص و<b>اسحبه على الخط المتقطع</b> (اضغط واسحب) لتقطع الجذور عن الساق، ثم الأوراق عن الساق. كل جزء يذهب إلى جفنة خزفية.</p>",
        info: "الغسل ضروري: ذرات الطين الملتصقة بالجذور غنية بالعناصر الثقيلة، ولو بقيت لظهرت النتيجة أعلى من الحقيقة.",
        async run(L) {
          const S = L.S;
          S.rl1.remove(); S.rl5.remove();
          await L.grab(S.sc, { y: 0.25 });
          const cuts = [[S.r1, -0.61, "الجذور عن الساق", 1], [S.r1, 1.0, "الأوراق عن الساق", 1], [S.r5, -0.61, "الجذور عن الساق", 5], [S.r5, 1.0, "الأوراق عن الساق", 5]];
          await L.repeat(cuts, async ([reed, x, what, st], i) => {
            reed.g.updateMatrixWorld(true);
            const pts = []; for (let k = 0; k <= 12; k++) { const w = reed.g.localToWorld(new THREE.Vector3(x, 0.05, -0.27 + k * 0.54 / 12)); pts.push([w.x, w.y, w.z]); }
            await L.scrub(pts, { y: 0.22, tol: 0.12, hint: `اقطع ${what} في نبات المحطة ${st}: اضغط واسحب المقص على الخط المتقطع` });
            await L.moveTo(x < 0 ? reed.parts.root : reed.parts.leaf, [x < 0 ? -0.2 : 0.2, 0, 0], 0.35);
            if (i % 2 === 1) await hmToDishes(L, reed, i < 2 ? 0 : 3);
          }, { autoAfter: 2 });
          await L.letGo();
          S.dt = S.dish.map((d, i) => L.label(d.g, HM_NAMES[i], { dy: 0.35, cls: "dose" }));
        },
        done: "ست جفنات: جذور وسيقان وأوراق لكل محطة." },
      { t: `جفّف بدرجة ${H.dryT}°م لمدة ${H.dryH} ساعة`, cam: "oven", tool: "hand",
        say: `<p>افتح باب فرن التجفيف، وانقل الجفنات الست إليه بيدك، ثم أغلقه. يبقى بدرجة ${n(H.dryT, "°م")} لمدة ${n(H.dryH, "ساعة")} حتى يثبت الوزن.</p>`,
        info: "نحسب التراكيز على أساس الوزن الجاف لأن نسبة الماء في النبات تتغير من يوم لآخر. ودرجة 70 تكفي للتجفيف دون أن تتطاير العناصر.",
        async run(L) {
          const S = L.S, ov = S.oven;
          S.dt.forEach(t => { t.el.hidden = true; });
          S.dish.forEach(d => { d.home = d.g.position.toArray(); if (d.part) d.g.attach(d.part); });
          await L.press([{ obj: S.ovDoor, halo: true, r: 0.2, label: "مقبض الباب" }], { hint: "افتح باب الفرن: اضغط مقبضه", label: "افتح الباب" });
          await ov.open(true); ov.screen.set([`${H.dryT}°C`]);
          ov.g.updateMatrixWorld(true);
          const front = ov.g.localToWorld(new THREE.Vector3(0.1, 0, ov.d / 2 + 0.6));
          await L.repeat(S.dish, async (d, i) => {
            await L.takeFrom([d], { hint: `أمسك جفنة «${HM_NAMES[i]}»`, r: 0.3, y: 0.9 });
            await L.dropOn(L.zone(ov, { pos: front, top: 0.5, r: 0.5 }), { hint: "ضعها أمام باب الفرن المفتوح لتدخله" });
            const w = ov.g.localToWorld(new THREE.Vector3(-0.38 + (i % 3) * 0.38, 0.2 + Math.floor(i / 3) * 0.42, -0.05));
            await L.letGo({ to: [w.x, w.y, front.z] });
            await L.moveTo(d.g, [w.x, w.y, w.z], 0.4);
          }, { autoAfter: 1 });
          await L.press([{ obj: S.ovDoor, halo: true, r: 0.2, label: "أغلق الباب" }], { hint: "أغلق باب الفرن", label: "أغلق الباب" });
          await ov.open(false);
          await L.wait({ mins: H.dryH * 60, sec: 6, label: `التجفيف بدرجة ${H.dryT}°م` });
          await L.press([{ obj: S.ovDoor, halo: true, r: 0.2, label: "افتح الباب" }], { hint: "انتهى التجفيف: افتح الفرن", label: "افتح الباب" });
          await ov.open(true);
          for (let i = 0; i < 6; i++) {
            const d = S.dish[i];
            d.part.traverse(o => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0x8b7a4e), 0.6); } });
            await L.moveTo(d.g, [d.g.position.x, d.g.position.y, front.z], 0.25);
            await L.arcTo(d.g, d.home, 0.4, 0.4);
          }
          await ov.open(false);
          S.dt.forEach(t => { t.el.hidden = false; });
        },
        done: "جفّت الأجزاء وتغيّر لونها." },
      { t: `اطحن وزن ${H.m} غم`, cam: "mortar", tool: "pestle",
        say: `<p>وضعنا جذور المحطة 1 الجافة في الهاون. خذ المدقة و<b>حرّكها في دوائر</b> داخل الهاون حتى يصبح الجزء مسحوقاً ناعماً، ثم اغرف بالملعقة ${n(H.m, "غم")} وضعها على الميزان.</p>`,
        info: "الطحن الناعم يزيد سطح العيّنة فيصل إليها الحامض كلها أثناء الهضم، ولا تبقى قطع غير مهضومة.",
        async run(L) {
          const S = L.S, m = S.mortar, mw = m.g.position;
          if (S.dish[0].part) S.dish[0].part.visible = false;
          const c0 = new THREE.Color(0x5f6a34), c1 = new THREE.Color(0xb3a36e);
          m.powder.visible = true; m.powder.material.color.copy(c0); m.powder.scale.set(1, 2.4, 1);
          await L.grab(S.pst, { y: 0.55 });
          await L.grind([mw.x, 0.4, mw.z], { y: 0.14, r: 0.12, turns: 3, hint: "اضغط وحرّك المدقة في دوائر داخل الهاون", onProgress: f => { m.powder.material.color.copy(c0).lerp(c1, f); m.powder.scale.y = U.lerp(2.4, 1, f); } });
          await L.letGo();
          await L.grab(S.spat, { y: 0.8 });
          await L.dropOn(L.zone(m, { r: 0.42, top: 0.35 }), { hint: "اغرف المسحوق: ضع الملعقة فوق الهاون" });
          S.spat.load(true);
          const pan = S.bal.g.localToWorld(S.bal.pan.clone());
          await L.dropOn(L.zone(S.bal, { pos: pan, top: 0.3, r: 0.3 }), { hint: `ضعه على كفة الميزان حتى يقرأ ${H.m.toFixed(4)} غم` });
          S.spat.load(false);
          await L.anim(0.9, (k, kk) => S.bal.screen.set([`${(H.m * kk).toFixed(4)} g`]));
          S.bal.screen.set([`${H.m.toFixed(4)} g`]);
          await L.letGo();
          L.toast("طحنّا ووزنّا الأجزاء الخمسة الباقية بالطريقة نفسها.");
          S.dish.forEach(d => { if (d.part) d.part.visible = false; }); (S.dt || []).forEach(t => t.remove());
        },
        done: `ست عيّنات، وزن كل منها ${n(H.m, "غم")}.` },
      { t: "الهضم الرطب بالأحماض", cam: "hood", tool: "acid",
        say: `<p>العيّنات الست في دوارق الهضم داخل <b>خزانة الغازات</b>. خذ ماصة الأحماض واسحب HNO₃ ثم HClO₄ (بنسبة 2:1)، وأضف الخليط إلى كل دورق، ثم شغّل الصفيحة الساخنة حتى يصفو المحلول.</p>`,
        info: "الأحماض المؤكسدة تحطّم المادة العضوية كلها فتبقى العناصر ذائبة في المحلول. الأبخرة البنية هي ثاني أوكسيد النيتروجين، وهي سامة، لذلك نعمل داخل خزانة الغازات دائماً.",
        async run(L) {
          const S = L.S, p = S.pA;
          await L.grab(p);
          for (const [src, what, fr] of [[S.acidN, "HNO₃ (جزءان)", 0.5], [S.acidP, "HClO₄ (جزء واحد)", 0.75]]) {
            const z = await L.dropOn(L.zone(src, { r: 0.3 }), { hint: `اسحب ${what}: ضع الماصة فوق قنينته` });
            await L.moveTo(p.g, [z.pos.x, 0.12, z.pos.z], 0.3); await p.fill(fr, 0xe8d9a6, 0.3); await L.moveTo(p.g, [z.pos.x, z.top + 0.3, z.pos.z], 0.3);
          }
          await L.repeat(S.dg, async (f, i) => {
            const z = await L.dropOn(L.zone(f, { r: 0.22 }), { hint: `أضف الخليط إلى دورق الهضم «${HM_NAMES[i]}»` });
            const tip = new THREE.Vector3(z.pos.x, z.top + 0.04, z.pos.z);
            await L.moveTo(p.g, [tip.x, tip.y, tip.z], 0.25);
            await L.drops(tip, f, 2, 0xe8d9a6, 0.08);
            f.liq.to(0.14, 0.4); f.liq.color(0x3b2410, 0.85, 0.5);
            await p.fill(0.75 * (1 - (i + 1) / 6), null, 0.15);
          }, { autoAfter: 2 });
          await L.letGo();
          await L.press([{ obj: S.hpKnob, halo: true, r: 0.14, label: "مفتاح التسخين" }], { hint: "شغّل الصفيحة الساخنة: اضغط مفتاحها", label: "شغّل التسخين" });
          await S.hp.heat(true);
          const fm = L.fumes(new THREE.Vector3(1.2, 0.75, -1.1), { color: 0x9a5f2a, spread: 1.2, height: 1.4, n: 22, opacity: 0.4 });
          S.dg.forEach(f => f.liq.color(0xe8d48a, 0.45, 7));
          await L.wait({ sec: 7.5, label: "الهضم على الصفيحة الساخنة", text: "حتى يصفو المحلول" });
          fm.stop(); await S.hp.heat(false);
        },
        done: "صفا المحلول: تحطمت المادة العضوية وبقيت العناصر ذائبة." },
      { t: `أكمل الحجم إلى ${H.V} مل`, cam: "fill", tool: "hand",
        say: `<p>بعد أن يبرد المحلول، أمسك كل دورق هضم واسكبه في القنينة الحجمية التي تحمل اسمه. بعدها أكمل كل قنينة بالماء منزوع الأيونات حتى العلامة البيضاء (${n(H.V, "مل")}).</p>`,
        async run(L) {
          const S = L.S;
          await L.repeat(S.dg, async (f, i) => {
            await L.takeFrom([f], { hint: `أمسك دورق الهضم «${HM_NAMES[i]}»`, r: 0.22, y: 1.1 });
            await L.pourInto([L.zone(S.vf[i], { to: S.vf[i].markH * 0.35, r: 0.28 })], { y: 1.2, rate: 0.3, color: 0xe8d48a, dstColor: 0xe8d48a, dstOpacity: 0.45, srcRate: 0.3, srcMin: 0, hint: `اسكبه في القنينة «${HM_NAMES[i]}»: حرّكه فوقها واضغط مطولاً` });
            f.liq.set(0);
            await L.letGo();
          }, { autoAfter: 1 });
          await L.takeFrom([S.wash], { hint: "أمسك قنينة الماء منزوع الأيونات", y: 1.3 });
          await L.pourInto(S.vf.map(v => L.zone(v, { to: v.markH, r: 0.28 })), { rate: 0.55, color: 0xeef4f5, dstColor: 0xf3efd6, dstOpacity: 0.22, srcRate: 0.015, hint: "أكمل كل قنينة حتى العلامة: حرّك القنينة فوقها واضغط مطولاً" });
          await L.letGo();
        },
        done: `ست قناني جاهزة للقياس، حجم كل منها ${n(H.V, "مل")}.` },
      { t: "اقرأ العناصر بالامتصاص الذري", cam: "aas", tool: "hand",
        say: "<p>اختر مصباح العنصر، فيُشعل الجهاز اللهب ويُعايَر بمحاليل قياسية. بعدها انقل كل قنينة بيدك إلى موضع السحب أمام الجهاز. ابدأ بالرصاص، ثم يمكنك قياس عناصر أخرى.</p>",
        info: `لكل عنصر مصباح خاص يصدر طوله الموجي (Pb ${metal("Pb").nm}، Cu ${metal("Cu").nm}، Cd ${metal("Cd").nm}، Ni ${metal("Ni").nm} نانومتر). يحسب برنامج الجهاز التركيز بالوزن الجاف من وزن العيّنة (${H.m} غم) وحجمها النهائي (${H.V} مل).`,
        async run(L) {
          const S = L.S;
          let k = await L.ask(H.metals.map(m => ({ label: `${m.name} ${m.key}`, value: m.key, primary: m.key === "Pb" })), { q: "اختر مصباح العنصر:" });
          for (;;) {
            const M = metal(k), byHand = !S.measured.size;
            S.aas.lamp(M.color); S.aas.flame.visible = true;
            S.aas.screen.set([`${M.key} ${M.nm} nm`, "معايرة…"]); await L.sleep(1.1);
            S.aas.screen.set([`${M.key} ${M.nm} nm`, "معايرة ✓"]); await L.sleep(0.5);
            S.cd.st1.fill(null); S.cd.st5.fill(null);
            const ch = Chart.getChart && Chart.getChart(document.getElementById("lb-chart"));
            if (ch) { ch.options.plugins.title = { display: true, text: `${M.name} (${M.key})`, color: C.text }; ch.update(); }
            const read = i => {
              const st = i < 3 ? 0 : 4, part = H.parts[i % 3].key, val = H.plant[k][part][st];
              S.aas.screen.set([`${ppm(val)} mg/kg`, `${M.key} · ${["جذور", "سيقان", "أوراق"][i % 3]} م${st + 1}`]);
              (i < 3 ? S.cd.st1 : S.cd.st5)[i % 3] = val; if (ch) ch.update();
              if (i >= 3) L.nb.row(`${k}-${part}`, [`${M.name} ${M.key}`, H.parts[i % 3].name, n(ppm(H.plant[k][part][0])), n(ppm(val))]);
            };
            if (byHand) {
              await L.repeat(S.vf, async (v, i) => {
                await L.takeFrom([v], { hint: `أمسك القنينة «${HM_NAMES[i]}»`, r: 0.28, y: 1.2 });
                await L.dropOn(L.zone(S.aas, { pos: S.sampleAt, top: 0.6, r: 0.32 }), { hint: "ضعها في موضع السحب المضيء أمام الجهاز" });
                await L.letGo({ to: [S.sampleAt.x - 0.05, 0, S.sampleAt.z] });
                await L.sleep(0.35); read(i); await L.sleep(0.3);
                await L.arcTo(v.g, v.home, 0.5, 0.5);
              }, { autoAfter: 1 });
            } else {
              for (let i = 0; i < 6; i++) { const v = S.vf[i]; await L.arcTo(v.g, [S.sampleAt.x - 0.05, 0, S.sampleAt.z], 0.5, 0.45); await L.sleep(0.3); read(i); await L.arcTo(v.g, v.home, 0.5, 0.45); }
            }
            S.measured.add(k); S.aas.flame.visible = false;
            const left = H.metals.filter(m => !S.measured.has(m.key));
            if (!left.length) break;
            const nx = await L.ask(left.map(m => ({ label: `قِس ${m.name} ${m.key}`, value: m.key })).concat([{ label: "يكفي، التالي", value: "", primary: true }]), { q: "هل تريد قياس عنصر آخر بالعيّنات نفسها؟ (يُقاس تلقائياً)" });
            if (!nx) break; k = nx;
          }
        },
        done: "سُجّلت القراءات في الدفتر. الجذور في المحطة 1 تحمل أعلى التراكيز." },
      { t: "احسب TF وBCF", cam: "intro", act: "احسب المعاملين", actIcon: "spark",
        say: `<p class="lb-eq">TF = تركيز الساق أو الورقة ÷ تركيز الجذر<br>BCF = تركيز الجذر ÷ تركيز الرواسب</p><p>تراكيز الرواسب من البحث نفسه.</p>`,
        async run(L) {
          const rows = H.metals.map(m => [`${m.name} ${m.key}`, ...[0, 4].map(st => { const a = tf(m.key, st, "stem"), b = tf(m.key, st, "leaf"); return a == null ? "—" : `${n(f2(a))} / ${n(f2(b))}`; }), ...[0, 4].map(st => { const v = bcf(m.key, st); return v == null ? "—" : n(f2(v)); })]);
          L.show(tbl(["العنصر", "TF ساق/ورقة · م1", "TF ساق/ورقة · م5", "BCF · م1", "BCF · م5"], rows));
          const all = H.metals.flatMap(m => [0, 4].flatMap(st => [tf(m.key, st, "stem"), tf(m.key, st, "leaf")])).filter(v => v != null);
          L.S.tfMax = Math.max(...all);
        },
        done: "كل قيم TF أقل من 1: القصب يحبس العناصر في جذوره." }
    ],
    results(L) {
      const rows = [];
      H.metals.forEach(m => H.parts.forEach(p => rows.push([`${m.name} ${m.key}`, p.name, ...H.plant[m.key][p.key].map(v => n(ppm(v)))])));
      const tfAll = H.metals.flatMap(m => [0, 4].flatMap(st => [tf(m.key, st, "stem"), tf(m.key, st, "leaf")])).filter(v => v != null);
      return `
        ${kv([["أعلى تركيز", `${n(ppm(H.plant.Cu.root[0]))} ppm نحاس · جذور م1`, "c-crimson"], ["الرصاص في الجذور", `${n(ppm(H.plant.Pb.root[0]))} ← ${n(ppm(H.plant.Pb.root[4]))} ppm`], ["أعلى TF", n(f2(Math.max(...tfAll)))], ["أقل TF", n(f2(Math.min(...tfAll)))]])}
        <h4>تراكيز العناصر في القصب على طول القناة (ppm وزن جاف)</h4>
        ${tbl(["العنصر", "الجزء", "م1", "م2", "م3", "م4", "م5"], rows)}
        <h4>الاستنتاج</h4>
        <ul class="lb-concl">
          <li>الجذور حملت أعلى التراكيز للعناصر الأربعة، تليها السيقان والأوراق، وهو ما وجده البحث.</li>
          <li>تتناقص التراكيز من المحطة 1 عند المصفى نحو المحطة 5 قرب النهر، مع تناقص المتبقيات النفطية وCOD في ماء القناة نفسها، وارتباط طردي بين تركيز الرواسب والنبات.</li>
          <li>معامل الانتقال TF أقل من 1 في كل الحالات: القصب يحبس العناصر في جذوره ولا ينقلها بكثرة إلى أجزائه الهوائية، فهو مناسب لـ<b>التثبيت النباتي</b> (Phytostabilization) على ضفاف القنوات الملوثة.</li>
          <li>معامل BCF للجذور أقل من 1 أيضاً، أي أن تركيز الجذر أقل من تركيز الرواسب حولها.</li>
        </ul>
        <p class="muted lb-small">${U.esc(H.note)} طريقة البحث: تجفيف بدرجة ${H.dryT}°م لمدة ${H.dryH} ساعة، وهضم ${H.m} غم بخليط ${H.acid}، وإكمال إلى ${H.V} مل، والقياس بجهاز ${H.aas}.</p>`;
    }
  });
})();
