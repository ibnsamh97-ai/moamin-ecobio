/* =====================================================================
   EcoBio AI — محاكي محطة المعالجة
   يصمّم سلسلة معالجة ويتنبأ بنوعية المياه الخارجة بمعادلات منشورة.
   مبدأ المحاكي: ما لا يوجد له نموذج موثّق لا يُحسب، ويظهر «غير محسوب»
   بدل رقم مخمَّن.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;

  /* ------------------------------------------------------------------
     المراجع
  ------------------------------------------------------------------ */
  const REF = {
    me03: "Tchobanoglous, G., Burton, F.L., Stensel, H.D. (2003). Wastewater Engineering: Treatment and Reuse (Metcalf & Eddy), 4th ed. McGraw-Hill.",
    me91: "Metcalf & Eddy, Inc. (1991). Wastewater Engineering: Treatment, Disposal, and Reuse, 3rd ed. McGraw-Hill.",
    mpca: "Minnesota Pollution Control Agency (2006). Phosphorus Treatment and Removal Technologies (wq-wwtp9-02).",
    unh: "UN-HABITAT (2008). Constructed Wetlands Manual. UN-HABITAT Water for Asian Cities Programme Nepal, Kathmandu.",
    lang: "Langmuir, I. (1918). The adsorption of gases on plane surfaces of glass, mica and platinum. J. Am. Chem. Soc. 40: 1361–1403.",
    cs: "Collins, H.F., Selleck, R.E. (1972). Process kinetics of wastewater chlorination. SERL Report 72-5, University of California, Berkeley (كما ورد في Metcalf & Eddy).",
    iq1: "Auied, et al. (2024). Iraqi Geological Journal 57(2A): 95–106 — ينقل حدود نظام صيانة الأنهار والمياه العمومية من التلوث رقم 25 لسنة 1967 (BOD₅ 40، COD 100 ملغم/لتر).",
    iq2: "AbdulRazzak, A.M. (2013). Performance Evaluation of Al-Rustamiya Wastewater Treatment Plant. Journal of Engineering (University of Baghdad) 19(4) — بيانات محطة الرستمية وحدود التصريف العراقية (TSS 60 ملغم/لتر).",
    eu: "Council Directive 91/271/EEC concerning urban waste-water treatment (Annex I, Tables 1–2).",
    who89: "WHO (1989). Health guidelines for the use of wastewater in agriculture and aquaculture. Technical Report Series 778 (≤ 1000 قولونيات برازية/100 مل للري غير المقيّد).",
    who: "WHO (2017). Guidelines for Drinking-water Quality, 4th ed. incorporating the 1st addendum (حدود المعادن الثقيلة، للمقارنة فقط)."
  };

  /* ------------------------------------------------------------------
     المعايير
  ------------------------------------------------------------------ */
  const PARAMS = [
    { k: "bod", sym: "BOD₅", name: "المتطلب الحيوي للأكسجين", unit: "mg/L", d: 1 },
    { k: "cod", sym: "COD", name: "المتطلب الكيميائي للأكسجين", unit: "mg/L", d: 1 },
    { k: "tss", sym: "TSS", name: "المواد العالقة الكلية", unit: "mg/L", d: 1 },
    { k: "nh4", sym: "NH₄⁺-N", name: "نتروجين الأمونيا", unit: "mg N/L", d: 2 },
    { k: "tp", sym: "TP", name: "الفوسفور الكلي", unit: "mg P/L", d: 2 },
    { k: "pb", sym: "Pb", name: "الرصاص", unit: "mg/L", d: 3, metal: true },
    { k: "cd", sym: "Cd", name: "الكادميوم", unit: "mg/L", d: 3, metal: true },
    { k: "ni", sym: "Ni", name: "النيكل", unit: "mg/L", d: 3, metal: true },
    { k: "cu", sym: "Cu", name: "النحاس", unit: "mg/L", d: 3, metal: true },
    { k: "fc", sym: "FC", name: "القولونيات البرازية", unit: "CFU/100mL", d: 0, log: true }
  ];
  const PK = PARAMS.map(p => p.k);
  const pOf = k => PARAMS.find(p => p.k === k);

  const SRC = {
    iq: { label: "العراق (نظام 25 لسنة 1967)", short: "العراق", ref: "iq1" },
    eu: { label: "الاتحاد الأوروبي 91/271", short: "EU", ref: "eu" },
    who: { label: "WHO لمياه الشرب (للمقارنة)", short: "WHO شرب", ref: "who" },
    who89: { label: "WHO 1989 للري غير المقيّد", short: "WHO ري", ref: "who89" }
  };
  const LIMITS = {
    bod: [["iq", 40], ["eu", 25]],
    cod: [["iq", 100], ["eu", 125]],
    tss: [["iq", 60], ["eu", 35]],
    tp: [["eu", 2]],
    pb: [["who", 0.01]], cd: [["who", 0.003]], ni: [["who", 0.07]], cu: [["who", 2]],
    fc: [["who89", 1000]]
  };

  /* ------------------------------------------------------------------
     عيّنات داخلة حقيقية (منشورة)
  ------------------------------------------------------------------ */
  const PO4_TO_P = 30.974 / 94.971;
  function presets() {
    const out = [{ id: "rustamiya", short: "الرستمية – بغداد", name: "مياه صرف محطة الرستمية – بغداد (معدل 2011)",
      v: { bod: 235.39, cod: 361.09, tss: 245.16 }, ref: "iq2",
      measured: { F0: { bod: 19.07, cod: 40.99, tss: 27.98 }, F1: { bod: 20.97, cod: 42.85, tss: 41.66 }, F2: { bod: 15.77, cod: 43.07, tss: 23.67 } } }];
    (ECO.WATER_PRESETS || []).filter(p => p.id.startsWith("baiji")).forEach(p => {
      const v = { bod: p.v.bod, pb: p.v.pb, cd: p.v.cd, ni: p.v.ni, cu: p.v.cu };
      if (U.isNum(p.v.po4)) v.tp = +(p.v.po4 * PO4_TO_P).toFixed(3);
      out.push({ id: p.id, short: p.short, name: p.name, v, research: p.ref, po4: p.v.po4 });
    });
    return out;
  }

  /* ------------------------------------------------------------------
     الحالة
  ------------------------------------------------------------------ */
  const DEF = {
    q: 1000, t: 20, alk: NaN,
    ps: { on: true, hrt: 2, sor: 40, coag: "none", tpT: 1 },
    as: { on: true, srt: 8, x: 2500, dox: 2, tssE: 20, k: 5, ks: 60, y: 0.6, kd: 0.06, th: 1.04, mun: 0.75, kn: 0.74, bn: 0.08, ko: 0.5 },
    wl: { on: false, type: "hf", area: 2000, target: 20 },
    ad: { on: false, metal: "pb", qmax: NaN, kl: NaN, target: 0.1, ebct: 15, rho: 450 },
    cl: { on: true, c: 1, t: 30 }
  };
  const S = { cfg: JSON.parse(JSON.stringify(DEF)), v: {}, preset: "rustamiya", last: null, chart: null };
  // JSON يحوّل NaN إلى null
  S.cfg.alk = NaN; S.cfg.ad.qmax = NaN; S.cfg.ad.kl = NaN;

  /* ------------------------------------------------------------------
     النماذج
  ------------------------------------------------------------------ */
  const num = v => (U.isNum(v) ? v : NaN);
  const cp = o => Object.assign({}, o);

  // 1) الترسيب الأولي — R = t/(a + b·t) (Metcalf & Eddy 2003)، مع إزالة كيميائية للفوسفور اختيارية
  function stPrimary(c, g, ctx) {
    const o = cp(c), mod = [], design = [], notes = [];
    const t = g.hrt, rB = t / (0.018 + 0.020 * t) / 100, rS = t / (0.0075 + 0.014 * t) / 100; // R بالنسبة المئوية
    if (U.isNum(c.bod)) { o.bod = c.bod * (1 - rB); mod.push("bod"); }
    if (U.isNum(c.tss)) { o.tss = c.tss * (1 - rS); mod.push("tss"); }
    const A = ctx.q / g.sor, V = ctx.q * t / 24;
    design.push(["مساحة سطح الحوض", A, "m²", 0], ["قطر حوض دائري واحد", Math.sqrt(4 * A / Math.PI), "m", 1], ["حجم الحوض", V, "m³", 0], ["العمق الفعّال", V / A, "m", 2],
      ["كفاءة إزالة BOD₅ / TSS", `${Math.round(rB * 100)}% / ${Math.round(rS * 100)}%`, "", null]);
    let sludge = U.isNum(c.tss) ? (c.tss - o.tss) * ctx.q / 1000 : NaN;
    if (g.coag !== "none") {
      if (!U.isNum(c.tp)) notes.push(["info", "أدخل الفوسفور الكلي للمياه الداخلة لحساب جرعة المخثّر."]);
      else {
        let tgt = Math.max(g.tpT, 0.3), r;
        if (g.tpT < 0.3) notes.push(["warn", "الوصول إلى أقل من 0.3 ملغم P/لتر بالترسيب الكيميائي وحده غير مضمون؛ حُسبت الجرعة للهدف 0.3."]);
        // نسب مولية Me:P (MPCA 2006): 1.0 للأهداف فوق 2 ملغم/لتر، و1.2–4.0 للأهداف 0.3–1.0 ملغم/لتر
        if (tgt >= 2) r = 1.0; else if (tgt >= 1) r = 1.0 + (2 - tgt) * 0.2; else r = 1.2 + (1 - tgt) / 0.7 * 2.8;
        if (c.tp <= tgt) { notes.push(["good", "الفوسفور الداخل أقل من الهدف؛ لا حاجة لمخثّر لإزالة الفوسفور."]); }
        else {
          const molP = c.tp / 30.974, molMe = r * molP; // mmol/L
          const isAl = g.coag === "alum";
          const dose = molMe * (isAl ? 297.2 : 162.2); // mg/L من المنتج: Al2(SO4)3·14H2O لكل Al، أو FeCl3
          const alk = molMe * 150 / 1; // 1.5 مول CaCO3 لكل مول معدن = 150 ملغم لكل مليمول
          const pRem = (c.tp - tgt) / 30.974, excess = Math.max(0, molMe - pRem);
          const chemSl = pRem * (isAl ? 121.95 : 150.82) + excess * (isAl ? 78.0 : 106.87); // AlPO4/FePO4 + هيدروكسيد
          o.tp = tgt; mod.push("tp");
          ctx.alkUse += alk;
          sludge = (U.isNum(sludge) ? sludge : 0) + chemSl * ctx.q / 1000;
          design.push([`جرعة ${isAl ? "الشب Al₂(SO₄)₃·14H₂O" : "كلوريد الحديديك FeCl₃"}`, dose, "mg/L", 0], ["كمية المخثّر يومياً", dose * ctx.q / 1000, "kg/d", 1],
            [`النسبة المولية ${isAl ? "Al:P" : "Fe:P"}`, r, "", 2], ["القلوية المستهلكة", alk, "mg/L CaCO₃", 0], ["الحمأة الكيميائية", chemSl * ctx.q / 1000, "kg/d", 1]);
          notes.push(["info", "إضافة المخثّر ترفع عادةً إزالة العالق والـBOD فوق قيم الترسيب العادي، لكن المحاكي يُبقي قيم الترسيب العادي (تقدير متحفظ) لأن الزيادة تُحدَّد بتجربة الجرة."]);
        }
      }
    }
    if (U.isNum(sludge)) design.push(["الحمأة الأولية (جافة)", sludge, "kg/d", 1]);
    return { o, mod, design, notes };
  }

  // 2) الحمأة المنشطة — خليط تام بحالة مستقرة (Monod)، مع النترجة
  function stActivated(c, g, ctx) {
    const o = cp(c), mod = [], design = [], notes = [];
    const T = ctx.t, f = th => Math.pow(th, T - 20);
    const k = g.k * f(g.th), kd = g.kd * f(g.th), Y = g.y, mu = Y * k;
    const S0 = c.bod;
    if (!U.isNum(S0)) { notes.push(["info", "أدخل BOD₅ للمياه الداخلة لحساب الحمأة المنشطة."]); return { o, mod, design, notes }; }
    const srtMin = 1 / (Y * k * S0 / (g.ks + S0) - kd);
    const den = g.srt * (mu - kd) - 1;
    if (den <= 0 || g.srt <= srtMin) {
      notes.push(["bad", `عمر الحمأة ${g.srt} يوم أقل من الحد الأدنى (${U.fmt(srtMin, 1)} يوم) فتُغسل البكتيريا من الحوض. ارفع عمر الحمأة.`]);
      return { o, mod, design, notes };
    }
    const Se = Math.min(S0, g.ks * (1 + kd * g.srt) / den);
    const Px = Y * ctx.q * (S0 - Se) / (1 + kd * g.srt); // g VSS/d
    const V = g.srt * Px / g.x; // m³
    const bodSol = 0.65 * 1.42 * 0.68 * g.tssE; // BOD₅ للمواد العالقة الخارجة (65% قابلة للتحلل)
    o.bod = Se + bodSol; o.tss = g.tssE; mod.push("bod", "tss");
    // النتروجين: امتصاص بنائي 12.4% من VSS (C₅H₇NO₂)، ثم النترجة
    let nSyn = 0, nox = 0;
    if (U.isNum(c.nh4)) {
      nSyn = Math.min(c.nh4, 0.124 * Px / ctx.q);
      const muN = g.mun * Math.pow(1.07, T - 20) * g.dox / (g.ko + g.dox), knT = g.kn * Math.pow(1.053, T - 20), bnT = g.bn * Math.pow(1.04, T - 20);
      const srtN = 1 / (muN - bnT), denN = g.srt * (muN - bnT) - 1;
      const avail = c.nh4 - nSyn;
      if (muN <= bnT || denN <= 0) {
        o.nh4 = avail;
        notes.push(["warn", `لن تحدث النترجة عند ${T}°م وعمر حمأة ${g.srt} يوم${muN > bnT ? `؛ ارفع عمر الحمأة فوق ${U.fmt(srtN, 1)} يوم تقريباً` : ""}.`]);
      } else {
        const Ne = Math.min(avail, knT * (1 + bnT * g.srt) / denN);
        o.nh4 = Ne; nox = avail - Ne;
        design.push(["أقل عمر حمأة للنترجة", srtN, "d", 1]);
      }
      mod.push("nh4");
      ctx.alkUse += 7.14 * nox;
    }
    // الفوسفور: امتصاص بنائي نحو 2% من VSS
    const pNeed = 0.02 * Px / ctx.q;
    if (U.isNum(c.tp)) { o.tp = Math.max(0, c.tp - pNeed); mod.push("tp"); }
    // فحص المغذيات: نسبة BOD:N:P المعتادة 100:5:1
    const lackN = U.isNum(c.nh4) && c.nh4 < 0.05 * S0, lackP = U.isNum(c.tp) && c.tp < 0.01 * S0;
    if (lackN || lackP) notes.push(["warn", `نقص مغذيات للبكتيريا: ${[lackN ? `النتروجين ${U.fmt(c.nh4, 2)} ملغم/لتر والمطلوب نحو ${U.fmt(0.05 * S0, 1)}` : "", lackP ? `الفوسفور ${U.fmt(c.tp, 2)} ملغم/لتر والمطلوب نحو ${U.fmt(0.01 * S0, 1)}` : ""].filter(Boolean).join("، و")} (نسبة BOD:N:P المعتادة 100:5:1). أضف ${lackP && lackN ? "مصدر نتروجين وفوسفات" : lackP ? "فوسفات" : "مصدر نتروجين"} قبل حوض التهوية وإلا ضعف النمو البكتيري.`]);
    else if (!U.isNum(c.nh4) || !U.isNum(c.tp)) notes.push(["info", "أدخل الأمونيا والفوسفور للتحقق من كفاية المغذيات (BOD:N:P = 100:5:1) وحساب النترجة."]);
    const O2 = ctx.q * (S0 - Se) / 0.68 / 1000 - 1.42 * Px / 1000 + 4.57 * ctx.q * nox / 1000;
    design.push(["حجم حوض التهوية", V, "m³", 0], ["زمن المكوث الهيدروليكي", V / ctx.q * 24, "h", 1], ["نسبة الغذاء إلى الكتلة F/M", ctx.q * S0 / (V * g.x), "d⁻¹", 2],
      ["BOD₅ الذائب الخارج", Se, "mg/L", 1], ["الحمأة المنتجة", Px / 1000 / 0.8, "kg TSS/d", 1], ["الأكسجين المطلوب", O2, "kg O₂/d", 0]);
    if (nox > 0) design.push(["الأمونيا المؤكسدة (نترجة)", nox, "mg N/L", 1], ["القلوية المستهلكة بالنترجة", 7.14 * nox, "mg/L CaCO₃", 0]);
    return { o, mod, design, notes };
  }

  // 3) الأراضي الرطبة المصطنعة بالقصب — معادلة Kickuth (UN-HABITAT 2008)
  function stWetland(c, g, ctx) {
    const o = cp(c), mod = [], design = [], notes = [];
    const K20 = g.type === "vf" ? 0.2 : 0.15, K = K20 * Math.pow(1.06, ctx.t - 20);
    const depth = g.type === "vf" ? 0.7 : 0.4, por = g.type === "vf" ? 0.3 : 0.4;
    if (!U.isNum(c.bod)) { notes.push(["info", "أدخل BOD₅ لحساب الأرض الرطبة."]); return { o, mod, design, notes }; }
    o.bod = c.bod * Math.exp(-K * g.area / ctx.q); mod.push("bod");
    const need = c.bod > g.target ? ctx.q * Math.log(c.bod / g.target) / K : null;
    design.push(["ثابت الإزالة K_BOD", K, "m/d", 3], ["المساحة المدخلة", g.area, "m²", 0], [`المساحة اللازمة للوصول إلى ${g.target} ملغم/لتر`, need == null ? "غير لازمة: BOD الداخل أقل من الهدف" : need, need == null ? "" : "m²", 0],
      ["زمن المكوث", g.area * depth * por / ctx.q, "d", 1]);
    notes.push(["info", "معادلة Kickuth تحسب BOD₅ فقط. القصب يزيل أيضاً العالق والمغذيات والمعادن، لكن لا توجد لها معادلة تصميم معتمدة في المرجع نفسه فلا تُحسب هنا."]);
    return { o, mod, design, notes };
  }

  // 4) الامتزاز في عمود — توازن لانكماير ومعدل استهلاك المادة المازة
  function stAdsorb(c, g, ctx) {
    const o = cp(c), mod = [], design = [], notes = [];
    const C0 = c[g.metal];
    if (!U.isNum(g.qmax) || !U.isNum(g.kl) || g.qmax <= 0 || g.kl <= 0) {
      notes.push(["info", `أدخل ثابتي لانكماير (qmax وKL) للمادة المازة مع ${pOf(g.metal).name} من تجربتك أو من بحث منشور. يمكنك حسابهما من بيانات التوازن في الحاسبات العلمية.`]);
      return { o, mod, design, notes, needCalc: true };
    }
    if (!U.isNum(C0)) { notes.push(["info", `أدخل تركيز ${pOf(g.metal).name} في المياه الداخلة.`]); return { o, mod, design, notes }; }
    const Ce = Math.min(C0, g.target);
    const qe0 = g.qmax * g.kl * C0 / (1 + g.kl * C0); // mg/g عند تركيز الدخول (حالة العمود عند الاختراق)
    const cur = 1000 * (C0 - Ce) / qe0; // g/m³
    const Vb = ctx.q * g.ebct / 1440, mass = Vb * g.rho, use = cur * ctx.q / 1000;
    o[g.metal] = Ce; mod.push(g.metal);
    design.push(["سعة الامتزاز عند تركيز الدخول qe", qe0, "mg/g", 2], ["استهلاك المادة المازة", cur, "g/m³", 1], ["الاستهلاك اليومي", use, "kg/d", 2],
      ["حجم طبقة العمود (EBCT)", Vb, "m³", 2], ["كتلة المادة المازة في العمود", mass, "kg", 0], ["عمر الطبقة قبل التبديل", use > 0 ? mass / use : NaN, "d", 0]);
    if (C0 <= g.target) notes.push(["good", `${pOf(g.metal).name} أقل من الهدف أصلاً.`]);
    return { o, mod, design, notes };
  }

  // 5) التعقيم بالكلور — نموذج Collins–Selleck: N/N0 = (1 + 0.23·C·t)^-3
  function stChlorine(c, g, ctx) {
    const o = cp(c), mod = [], design = [], notes = [];
    const ratio = Math.pow(1 + 0.23 * g.c * g.t, -3);
    if (U.isNum(c.fc)) { o.fc = c.fc * ratio; mod.push("fc"); }
    design.push(["حجم حوض التلامس", ctx.q * g.t / 1440, "m³", 1], ["الإزالة اللوغاريتمية للقولونيات", -Math.log10(ratio), "log", 2], ["C·t", g.c * g.t, "mg·min/L", 0]);
    if (U.isNum(c.nh4) && c.nh4 > 0.5) {
      design.push(["الكلور اللازم لنقطة الانكسار (نظرياً)", 7.6 * c.nh4, "mg/L", 0]);
      notes.push(["info", "مع وجود الأمونيا يتكوّن كلور متحد (كلورامينات)، والنموذج مبني على هذه الحالة. الجرعة الفعلية = المتبقي المطلوب + طلب الكلور المقيس بتجربة الطلب."]);
    }
    if (!U.isNum(c.fc)) notes.push(["info", "أدخل عدد القولونيات البرازية للمياه الداخلة لحساب الإزالة."]);
    return { o, mod, design, notes };
  }

  const STAGES = [
    { id: "ps", fn: stPrimary, name: "الترسيب الأولي", short: "ترسيب", icon: "i-layers", desc: "إزالة العالق والمواد العضوية المرتبطة به بالجاذبية، مع إزالة كيميائية للفوسفور اختيارية.", refs: ["me03", "mpca"] },
    { id: "as", fn: stActivated, name: "الحمأة المنشطة", short: "حمأة منشطة", icon: "i-microbe", desc: "بكتيريا هوائية تستهلك المواد العضوية وتحوّل الأمونيا إلى نترات.", refs: ["me91", "me03"] },
    { id: "wl", fn: stWetland, name: "أرض رطبة مصطنعة بالقصب", short: "أرض رطبة", icon: "i-leaf", desc: "معالجة نباتية: جريان تحت سطح حصى مزروع بالقصب Phragmites australis.", refs: ["unh"] },
    { id: "ad", fn: stAdsorb, name: "الامتزاز لإزالة المعادن", short: "امتزاز", icon: "i-atom", desc: "عمود مادة مازة (كاربون منشط أو مادة حيوية) لإزالة معدن ثقيل.", refs: ["lang"] },
    { id: "cl", fn: stChlorine, name: "التعقيم بالكلور", short: "تعقيم", icon: "i-drop", desc: "قتل البكتيريا الممرضة قبل التصريف أو إعادة الاستخدام.", refs: ["cs"] }
  ];

  function simulate(v, cfg) {
    const ctx = { q: cfg.q, t: cfg.t, alkUse: 0 };
    let c = {}; PK.forEach(k => { c[k] = num(v[k]); });
    const steps = [{ id: "in", name: "الداخل", short: "الداخل", o: cp(c), mod: [] }];
    STAGES.forEach(st => {
      if (!cfg[st.id].on) return;
      const r = st.fn(c, cfg[st.id], ctx);
      steps.push(Object.assign({ id: st.id, name: st.name, short: st.short, icon: st.icon }, r));
      c = r.o;
    });
    const modded = new Set(); steps.forEach(s => s.mod.forEach(k => modded.add(k)));
    return { steps, out: c, modded, alkUse: ctx.alkUse };
  }

  /* ------------------------------------------------------------------
     الواجهة
  ------------------------------------------------------------------ */
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const fld = (id, label, val, unit, attrs = "") => `<div class="field"><label for="${id}"><span>${label}</span>${unit ? `<span class="u">${unit}</span>` : ""}</label><input id="${id}" class="input" type="number" step="any" inputmode="decimal" value="${U.isNum(val) ? val : ""}" ${attrs}></div>`;

  function stageBody(st) {
    const g = S.cfg[st.id], p = `pl-${st.id}-`;
    switch (st.id) {
      case "ps": return `<div class="param-grid">${fld(p + "hrt", "زمن المكوث", g.hrt, "h", 'min="0.5" max="6"')}${fld(p + "sor", "معدل التحميل السطحي", g.sor, "m³/m²·d", 'min="5"')}</div>
        <div class="pl-sub"><span>إضافة مخثّر لإزالة الفوسفور</span><div class="seg" data-seg="${p}coag">${[["none", "بدون"], ["alum", "الشب"], ["ferric", "كلوريد الحديديك"]].map(([k, l]) => `<button type="button" data-v="${k}" class="${g.coag === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
        <div class="param-grid" ${g.coag === "none" ? "hidden" : ""} data-show="${p}coag">${fld(p + "tpT", "الفوسفور المستهدف", g.tpT, "mg P/L", 'min="0.1"')}</div>`;
      case "as": return `<div class="param-grid">${fld(p + "srt", "عمر الحمأة SRT", g.srt, "d", 'min="1"')}${fld(p + "x", "تركيز الكتلة الحيوية MLVSS", g.x, "mg/L", 'min="500"')}${fld(p + "dox", "الأكسجين المذاب في الحوض", g.dox, "mg/L", 'min="0.2"')}${fld(p + "tssE", "العالق الخارج من المروّق الثانوي", g.tssE, "mg/L", 'min="1"')}</div>
        <details class="adv"><summary>المعاملات الحركية عند 20°م (قابلة للتعديل)</summary>
          <p class="faint pl-mini">البكتيريا غير ذاتية التغذية: قيم نموذجية لمياه الصرف المنزلية من Metcalf & Eddy (1991). بكتيريا النترجة: Metcalf & Eddy (2003). عدّلها بنتائج معايرتك.</p>
          <div class="param-grid">${fld(p + "k", "k أقصى معدل استهلاك", g.k, "d⁻¹")}${fld(p + "ks", "Ks ثابت نصف الإشباع", g.ks, "mg BOD/L")}${fld(p + "y", "Y معامل الإنتاج", g.y, "g VSS/g BOD")}${fld(p + "kd", "kd معامل التحلل الذاتي", g.kd, "d⁻¹")}${fld(p + "th", "θ لتصحيح الحرارة", g.th, "")}${fld(p + "mun", "μmax للنترجة", g.mun, "d⁻¹")}${fld(p + "kn", "Kn للأمونيا", g.kn, "mg N/L")}${fld(p + "bn", "b للنترجة", g.bn, "d⁻¹")}${fld(p + "ko", "Ko للأكسجين", g.ko, "mg/L")}</div>
        </details>`;
      case "wl": return `<div class="pl-sub"><span>نوع الجريان</span><div class="seg" data-seg="${p}type">${[["hf", "أفقي تحت السطح"], ["vf", "عمودي"]].map(([k, l]) => `<button type="button" data-v="${k}" class="${g.type === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
        <div class="param-grid">${fld(p + "area", "مساحة الحوض", g.area, "m²", 'min="1"')}${fld(p + "target", "BOD₅ المستهدف لحساب المساحة", g.target, "mg/L", 'min="1"')}</div>`;
      case "ad": {
        const opts = PARAMS.filter(x => x.metal).map(m => `<option value="${m.k}" ${g.metal === m.k ? "selected" : ""}>${m.name} (${m.sym})</option>`).join("");
        return `<div class="param-grid"><div class="field"><label for="${p}metal">المعدن المستهدف</label><select id="${p}metal" class="input">${opts}</select></div>${fld(p + "target", "التركيز المستهدف بعد العمود", g.target, "mg/L", 'min="0"')}
          ${fld(p + "qmax", "qmax سعة لانكماير", g.qmax, "mg/g", 'min="0" placeholder="من تجربتك"')}${fld(p + "kl", "KL ثابت لانكماير", g.kl, "L/mg", 'min="0" placeholder="من تجربتك"')}${fld(p + "ebct", "زمن التلامس للطبقة الفارغة EBCT", g.ebct, "min", 'min="1"')}${fld(p + "rho", "الكثافة الظاهرية للمادة المازة", g.rho, "kg/m³", 'min="50"')}</div>
          <p class="pl-mini"><a href="#calc" data-calc="biosorption">${ico("i-calc")}احسب qmax وKL من بيانات تجربة التوازن</a></p>`;
      }
      case "cl": return `<div class="param-grid">${fld(p + "c", "الكلور المتبقي", g.c, "mg/L", 'min="0.1"')}${fld(p + "t", "زمن التلامس", g.t, "min", 'min="1"')}</div>`;
    }
    return "";
  }

  function buildStages() {
    U.$("#pl-stages").innerHTML = STAGES.map((st, i) => `<article class="st-card${S.cfg[st.id].on ? " on" : ""}" data-st="${st.id}">
      <div class="st-top">
        <span class="st-n">${i + 1}</span>
        <span class="tc-ic">${ico(st.icon)}</span>
        <div class="st-t"><b>${st.name}</b><small>${st.desc}</small></div>
        <label class="toggle" title="تفعيل المرحلة"><input type="checkbox" data-on="${st.id}" ${S.cfg[st.id].on ? "checked" : ""} aria-label="تفعيل ${st.name}"><span class="sw"></span></label>
      </div>
      <div class="st-body"${S.cfg[st.id].on ? "" : " hidden"}>${stageBody(st)}</div>
    </article>`).join("");
  }

  function buildInputs() {
    const pre = presets();
    const hasWater = !!ECO.lastWater;
    U.$("#pl-presets").innerHTML = pre.map(p => `<button type="button" data-p="${p.id}" class="${S.preset === p.id ? "on" : ""}">${p.short}</button>`).join("") +
      (hasWater ? `<button type="button" data-p="water" class="${S.preset === "water" ? "on" : ""}">من مختبر المياه</button>` : "") +
      `<button type="button" data-p="custom" class="${S.preset === "custom" ? "on" : ""}">مياهي</button>`;
    U.$("#pl-inputs").innerHTML = fld("pl-q", "التصريف اليومي Q", S.cfg.q, "m³/d", 'min="1"') + fld("pl-t", "درجة حرارة المياه", S.cfg.t, "°C", 'min="5" max="40"') +
      PARAMS.map(p => fld("pl-v-" + p.k, `${p.name} (${p.sym})`, S.v[p.k], p.unit, 'min="0"')).join("") +
      fld("pl-alk", "القلوية (اختياري)", S.cfg.alk, "mg/L CaCO₃", 'min="0"');
  }

  function loadPreset(id) {
    S.preset = id;
    const src = U.$("#pl-src");
    if (id === "custom") { S.v = {}; src.textContent = "أدخل نتائج تحليل مياهك الداخلة. المعايير غير المقيسة تُترك فارغة ولا تُحسب."; }
    else if (id === "water" && ECO.lastWater) {
      const w = ECO.lastWater.v; S.v = { bod: w.bod, pb: w.pb, cd: w.cd, ni: w.ni, cu: w.cu };
      if (U.isNum(w.po4)) S.v.tp = +(w.po4 * PO4_TO_P).toFixed(3);
      src.textContent = `من مختبر المياه: ${ECO.lastWater.name}. حُوّل الفوسفات PO₄³⁻ إلى فوسفور P بضربه في 0.326.`;
    } else {
      const p = presets().find(x => x.id === id); if (!p) return;
      S.v = Object.assign({}, p.v);
      if (p.ref) src.textContent = `بيانات منشورة: ${REF[p.ref].split(" — ")[0]}. المعايير غير المقيسة في المصدر تُترك فارغة.`;
      else {
        const r = (ECO.RESEARCH || []).find(x => x.id === p.research);
        src.innerHTML = r ? `بيانات منشورة: ${U.esc(r.authors)} (${r.year})، ${U.esc(r.journal)}. الفوسفات ${p.po4} ملغم PO₄/لتر حُوّل إلى ${S.v.tp} ملغم P/لتر. <a href="#research" data-rs="${r.id}">عرض البحث</a>` : "";
      }
    }
    U.$$("#pl-presets button").forEach(b => b.classList.toggle("on", b.dataset.p === id));
    PARAMS.forEach(p => { U.$("#pl-v-" + p.k).value = U.isNum(S.v[p.k]) ? S.v[p.k] : ""; });
    run();
  }

  function readAll() {
    const f = id => { const e = U.$("#" + id); return e ? parseFloat(e.value) : NaN; };
    S.cfg.q = f("pl-q") > 0 ? f("pl-q") : DEF.q; S.cfg.t = U.isNum(f("pl-t")) ? U.clamp(f("pl-t"), 5, 40) : DEF.t; S.cfg.alk = f("pl-alk");
    PARAMS.forEach(p => { S.v[p.k] = f("pl-v-" + p.k); });
    STAGES.forEach(st => {
      const g = S.cfg[st.id];
      Object.keys(g).forEach(key => {
        const e = U.$(`#pl-${st.id}-${key}`); if (!e) return;
        if (e.tagName === "SELECT") g[key] = e.value;
        else { const v = parseFloat(e.value); g[key] = U.isNum(v) ? v : (key === "qmax" || key === "kl" ? NaN : DEF[st.id][key]); }
      });
    });
  }

  const fmtV = (v, p) => {
    if (!U.isNum(v)) return "—";
    if (p.log) { if (v < 1e4) return U.fmt(v, 0); const e = Math.floor(Math.log10(v)); return `${U.fmt(v / Math.pow(10, e), 1)}×10${String(e).split("").map(d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]).join("")}`; }
    if (v === 0) return "≈0";
    if (v > 0 && v < 0.001) return "<0.001";
    return U.fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : p.d);
  };

  function verdictFor(k, v, modded) {
    const L = LIMITS[k]; if (!L || !U.isNum(v)) return null;
    if (!modded.has(k) && k !== "fc") return { state: "na" };
    return { state: "ok", items: L.map(([s, lim]) => ({ s, lim, pass: v <= lim })) };
  }

  function render(res) {
    const { steps, out, modded } = res;
    // مخطط التدفق
    U.$("#pl-flow").innerHTML = steps.map((s, i) => `${i ? `<span class="fl-arrow" aria-hidden="true">${ico("i-chev")}</span>` : ""}<div class="fl-node${s.id === "in" ? " in" : ""}"><span>${s.short}</span><b class="num">${fmtV(s.o.bod, pOf("bod"))}</b><small>BOD₅ mg/L</small></div>`).join("") +
      `<span class="fl-arrow" aria-hidden="true">${ico("i-chev")}</span><div class="fl-node out"><span>إلى النهر</span><b class="num">${fmtV(out.bod, pOf("bod"))}</b><small>BOD₅ mg/L</small></div>`;

    // الحكم
    const fails = [], passes = [], nas = [];
    PARAMS.forEach(p => {
      const vd = verdictFor(p.k, out[p.k], modded); if (!vd) return;
      if (vd.state === "na") { nas.push(p); return; }
      const main = vd.items[0];
      (vd.items.every(x => x.pass) ? passes : main.pass ? passes : fails).push({ p, vd });
    });
    const head = !fails.length && passes.length ? `<div class="pl-ok">${ico("i-check")}<b>المياه الخارجة مطابقة للحدود في كل المعايير المحسوبة.</b></div>`
      : fails.length ? `<div class="pl-bad"><b>غير مطابق في: ${fails.map(x => x.p.sym).join("، ")}</b><span>غيّر إعدادات المراحل أو فعّل مرحلة إضافية.</span></div>` : `<div class="pl-na">أدخل نوعية المياه الداخلة لبدء الحساب.</div>`;
    const sticky = U.$("#pl-sticky");
    if (sticky) { sticky.hidden = !U.isNum(out.bod) && !U.isNum(out.tss); sticky.className = "pl-sticky " + (fails.length ? "bad" : passes.length ? "ok" : "");
      sticky.innerHTML = `<span>BOD₅ الخارج <b class="num">${fmtV(out.bod, pOf("bod"))}</b> mg/L</span><span>${fails.length ? `غير مطابق: ${fails.map(x => x.p.sym).join("، ")}` : passes.length ? "مطابق للحدود" : "أدخل البيانات"}</span>${ico("i-chevd")}`; }
    U.$("#pl-verdict").innerHTML = head + `<div class="pl-chips">${[...fails, ...passes].map(({ p, vd }) => vd.items.map(it => `<span class="chip tone-${it.pass ? "good" : "bad"}" title="${SRC[it.s].label}">${p.sym} ${fmtV(out[p.k], p)} ${it.pass ? "≤" : ">"} ${it.lim} · ${SRC[it.s].short}</span>`).join("")).join("")}${nas.map(p => `<span class="chip tone-none" title="لا توجد مرحلة مفعّلة لها نموذج موثّق لهذا المعيار">${p.sym}: غير محسوب</span>`).join("")}</div>`;

    // الجدول
    const shown = PARAMS.filter(p => U.isNum(steps[0].o[p.k]));
    const cols = steps.slice(1);
    U.$("#pl-table").innerHTML = shown.length ? `<thead><tr><th>المعيار</th><th>الداخل</th>${cols.map(s => `<th>${s.short}</th>`).join("")}<th>الإزالة الكلية</th><th>الحد</th></tr></thead><tbody>${shown.map(p => {
      const v0 = steps[0].o[p.k], vf = out[p.k];
      const rem = p.log ? (U.isNum(vf) && vf > 0 ? `${U.fmt(Math.log10(v0 / vf), 1)} log` : "—") : (modded.has(p.k) ? `${U.fmt((1 - vf / v0) * 100, 1)}%` : "—");
      const L = LIMITS[p.k] ? LIMITS[p.k].map(([s, l]) => `${l} <small>${SRC[s].short}</small>`).join("<br>") : "—";
      return `<tr><td>${p.sym}<small class="tu">${p.unit}</small></td><td class="num">${fmtV(v0, p)}</td>${cols.map(s => `<td class="num${s.mod.includes(p.k) ? "" : " nm"}">${fmtV(s.o[p.k], p)}</td>`).join("")}<td class="num">${rem}</td><td class="num">${L}</td></tr>`;
    }).join("")}</tbody>` : "";
    U.$("#pl-table-note").hidden = !shown.length;

    // الرسم: النسبة المتبقية من كل ملوث بعد كل مرحلة
    const series = shown.filter(p => !p.log && steps.some(s => s.mod.includes(p.k)));
    const COLS = { bod: ECO.COL.silt, tss: ECO.COL.muted, nh4: ECO.COL.river, tp: ECO.COL.chloro, pb: ECO.COL.violet, cd: ECO.COL.crimson, ni: ECO.COL.rust, cu: "#e8d35a", cod: "#7fb6c4" };
    const cfg = series.length ? {
      type: "line",
      data: { labels: steps.map(s => s.short), datasets: series.map(p => ({ label: p.sym, data: steps.map(s => U.isNum(s.o[p.k]) ? s.o[p.k] / steps[0].o[p.k] * 100 : null), borderColor: COLS[p.k], backgroundColor: COLS[p.k], tension: 0.25, pointRadius: 4, borderWidth: 2 })) },
      options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${U.fmt(c.parsed.y, 1)}% من الداخل` } } }, scales: { y: { min: 0, max: 100, title: { display: true, text: "المتبقي من تركيز الدخول (%)" } }, x: { reverse: true } } }
    } : null;
    S.chartCfg = cfg;
    U.$("#pl-chart-box").hidden = !cfg;
    if (cfg) S.chart = U.chart(U.$("#pl-chart"), cfg);

    // التصميم والملاحظات
    U.$("#pl-design").innerHTML = steps.slice(1).map(s => `<div class="dz">
      <h4><span class="tc-ic">${ico(s.icon)}</span>${s.name}</h4>
      ${s.design.length ? `<dl class="dz-kv">${s.design.map(([l, v, u, d]) => `<div><dt>${l}</dt><dd><b class="num">${typeof v === "string" ? v : U.fmt(v, d == null ? 1 : d)}</b>${u ? ` <small>${u}</small>` : ""}</dd></div>`).join("")}</dl>` : ""}
      ${s.notes.map(([t, txt]) => `<p class="notice ${t === "bad" ? "warn" : t === "good" ? "info" : t === "warn" ? "warn" : "info"} dz-note">${txt}</p>`).join("")}
      ${s.needCalc ? `<button type="button" class="btn btn-sm" data-calc="biosorption">${ico("i-calc")}افتح حاسبة الأيزوثيرم</button>` : ""}
    </div>`).join("") || `<p class="empty">فعّل مرحلة واحدة على الأقل.</p>`;
    // القلوية
    const alkBox = U.$("#pl-alk");
    if (res.alkUse > 0) {
      const left = U.isNum(S.cfg.alk) ? S.cfg.alk - res.alkUse : NaN;
      alkBox.hidden = false;
      alkBox.className = "notice " + (U.isNum(left) && left < 50 ? "warn" : "info");
      alkBox.innerHTML = `<span>القلوية المستهلكة في المحطة نحو <b class="num">${U.fmt(res.alkUse, 0)}</b> ملغم CaCO₃/لتر${U.isNum(left) ? `، والمتبقي المتوقع <b class="num">${U.fmt(left, 0)}</b> ملغم/لتر${left < 50 ? ". القلوية المتبقية منخفضة وقد ينخفض pH؛ فكّر بإضافة الجير أو بيكربونات الصوديوم." : "."}` : ". أدخل قلوية المياه الداخلة لمعرفة المتبقي."}</span>`;
    } else alkBox.hidden = true;

    renderValidation(res);
  }

  /* مقارنة النموذج بمحطة حقيقية (الرستمية) */
  function renderValidation(res) {
    const box = U.$("#pl-valid"), p = presets().find(x => x.id === S.preset);
    const ok = p && p.measured && S.cfg.ps.on && S.cfg.as.on && !S.cfg.wl.on;
    box.hidden = !ok; if (!ok) return;
    const M = p.measured, keys = ["bod", "tss"];
    const rows = keys.map(k => {
      const vals = Object.values(M).map(m => m[k]), lo = Math.min(...vals), hi = Math.max(...vals), pr = res.out[k];
      const inR = pr >= lo && pr <= hi, diff = pr < lo ? lo - pr : pr - hi;
      return `<tr><td>${pOf(k).sym}</td><td class="num">${U.fmt(pr, 1)}</td><td class="num">${U.fmt(lo, 1)} – ${U.fmt(hi, 1)}</td><td>${inR ? `<span class="chip tone-good">ضمن المدى المقيس</span>` : `<span class="chip tone-warn">خارج المدى بفارق ${U.fmt(diff, 1)}</span>`}</td></tr>`;
    }).join("");
    box.innerHTML = `<div class="panel-h"><h3>هل المحاكي واقعي؟ مقارنة بمحطة حقيقية</h3><span class="sub">الرستمية – بغداد، 2011</span></div>
      <p class="pl-mini">المياه الخارجة المقيسة من خطوط محطة الرستمية الثلاثة (F0 وF1 وF2) مقابل ما يتنبأ به المحاكي للمياه الداخلة نفسها بالترسيب والحمأة المنشطة. COD غير محسوب لأن نموذجه يحتاج نسبة COD غير القابل للتحلل.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المعيار</th><th>تنبؤ المحاكي</th><th>المقيس فعلاً</th><th>النتيجة</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="faint pl-mini">${U.esc(REF.iq2)}</p>`;
  }

  const run = U.debounce(() => { readAll(); S.last = simulate(S.v, S.cfg); render(S.last); }, 120);

  /* ------------------------------------------------------------------
     التقرير
  ------------------------------------------------------------------ */
  function pdf(mode) {
    if (!S.last) return;
    const { steps, out, modded } = S.last;
    const shown = PARAMS.filter(p => U.isNum(steps[0].o[p.k]));
    const blocks = [
      { type: "kv", items: [["المياه الداخلة", (presets().find(x => x.id === S.preset) || { name: S.preset === "water" ? "عيّنة مختبر المياه" : "مدخلات المستخدم" }).name], ["التصريف", `${U.fmt(S.cfg.q, 0)} م³/يوم`], ["درجة الحرارة", `${S.cfg.t} °م`], ["المراحل", steps.slice(1).map(s => s.name).join(" ← ")]] },
      { type: "h", text: "نوعية المياه عبر المحطة" },
      { type: "table", head: ["المعيار", "الداخل", ...steps.slice(1).map(s => s.short), "الحد"], rows: shown.map(p => [`\u2066${p.sym} (${p.unit})\u2069`, fmtV(steps[0].o[p.k], p), ...steps.slice(1).map(s => fmtV(s.o[p.k], p) + (s.mod.includes(p.k) ? "" : " *")), LIMITS[p.k] ? LIMITS[p.k].map(([s, l]) => `${l} ${SRC[s].short}`).join(" / ") : "—"]) },
      { type: "note", text: "* المرحلة لا تحتوي نموذجاً موثقاً لهذا المعيار، فنُقلت قيمته كما هي (تقدير متحفظ)." },
      S.chartCfg ? { type: "chart", config: S.chartCfg, caption: "النسبة المتبقية من تركيز الدخول بعد كل مرحلة" } : null,
      { type: "h", text: "تصميم المراحل" },
      ...steps.slice(1).map(s => ({ type: "kv", items: [[s.name, ""], ...s.design.map(([l, v, u, d]) => [l, typeof v === "string" ? v : `\u2066${U.fmt(v, d == null ? 1 : d)} ${u}\u2069`])] })),
      { type: "text", html: steps.slice(1).flatMap(s => s.notes.map(n => `<p>• ${U.esc(s.name)}: ${n[1]}</p>`)).join("") || "" },
      { type: "note", text: "المحاكي أداة تصميم أولي وتنبؤ بمعادلات منشورة؛ تُثبَّت الجرعات والكفاءات النهائية بتجربة جرة أو وحدة تجريبية قبل التنفيذ." },
      { type: "refs", items: [...new Set(["me03", "me91", "mpca", "unh", "lang", "cs", "iq1", "iq2", "eu", "who89", "who"])].map(k => REF[k]) },
      { type: "sign" }
    ];
    ECO.report.run({ title: "تقرير تصميم محطة معالجة", subtitle: "محاكي محطة المعالجة – EcoBio AI", file: "تصميم-محطة-معالجة", blocks }, mode);
  }

  function methods() {
    U.$("#pl-method").innerHTML = `<summary>المعادلات والمراجع</summary><div class="prose">
      <ul>
        <li><b>الترسيب الأولي:</b> R (%) = t / (a + b·t)، حيث t زمن المكوث بالساعات؛ BOD₅: a = 0.018، b = 0.020؛ TSS: a = 0.0075، b = 0.014. ${REF.me03}</li>
        <li><b>الإزالة الكيميائية للفوسفور:</b> نسبة مولية معدن:فوسفور 1.0 للأهداف فوق 2 ملغم/لتر، و1.2–4.0 للأهداف بين 0.3 و1.0 ملغم/لتر. القلوية المستهلكة 1.5 مول CaCO₃ لكل مول معدن، والحمأة من AlPO₄/FePO₄ وهيدروكسيد المعدن الزائد. ${REF.mpca}</li>
        <li><b>الحمأة المنشطة:</b> S = Ks(1 + kd·SRT) / [SRT(Y·k − kd) − 1]، V = SRT·Q·Y(S₀ − S) / [X(1 + kd·SRT)]، الأكسجين = Q(S₀ − S)/0.68 − 1.42·Px + 4.57·Q·NOx. BOD₅ للعالق الخارج = 0.65 × 1.42 × 0.68 × TSS. ${REF.me91} ${REF.me03}</li>
        <li><b>النترجة:</b> N = Kn(1 + b·SRT) / [SRT(μ·DO/(Ko + DO) − b) − 1] مع تصحيح الحرارة θ = 1.07 وَ1.053 وَ1.04، والقلوية 7.14 ملغم CaCO₃ لكل ملغم N.</li>
        <li><b>الأرض الرطبة المصطنعة:</b> A = Q·(ln Cᵢ − ln Cₑ) / K_BOD، حيث K_BOD = 0.15 م/يوم للجريان الأفقي و0.2 للعمودي، مع تصحيح حراري 1.06^(T−20). ${REF.unh}</li>
        <li><b>الامتزاز:</b> qₑ = qmax·KL·C / (1 + KL·C)، واستهلاك المادة المازة = (C₀ − Cₑ)/qₑ(C₀)، وحجم الطبقة = Q × EBCT. ${REF.lang}</li>
        <li><b>التعقيم:</b> N/N₀ = (1 + 0.23·C·t)⁻³، ونقطة الانكسار نظرياً 7.6 ملغم Cl₂ لكل ملغم NH₄⁺-N. ${REF.cs}</li>
        <li><b>الحدود:</b> ${REF.iq1} ${REF.iq2} ${REF.eu} ${REF.who89} ${REF.who}</li>
      </ul>
      <p>ما لا يملك نموذجاً موثقاً في هذه المراجع (مثل COD في الحمأة المنشطة، أو المعادن في الترسيب) يظهر «غير محسوب» بدل رقم تقديري.</p>
    </div>`;
  }

  function init() {
    buildInputs(); buildStages(); methods();
    const root = U.$("#view-plant");
    root.addEventListener("input", e => { if (e.target.matches("input, select")) run(); });
    root.addEventListener("change", e => {
      const on = e.target.closest("[data-on]");
      if (on) { const id = on.dataset.on; S.cfg[id].on = on.checked; const card = on.closest(".st-card"); card.classList.toggle("on", on.checked); card.querySelector(".st-body").hidden = !on.checked; run(); }
    });
    root.addEventListener("click", e => {
      const pb = e.target.closest("#pl-presets button"); if (pb) { loadPreset(pb.dataset.p); return; }
      const sb = e.target.closest("[data-seg] button");
      if (sb) {
        const seg = sb.closest("[data-seg]"), key = seg.dataset.seg.replace(/^pl-(\w+)-/, ""), st = seg.dataset.seg.split("-")[1];
        S.cfg[st][key] = sb.dataset.v; U.$$("button", seg).forEach(b => b.classList.toggle("on", b === sb));
        const dep = root.querySelector(`[data-show="${seg.dataset.seg}"]`); if (dep) dep.hidden = sb.dataset.v === "none";
        run(); return;
      }
      const cb = e.target.closest("[data-calc]"); if (cb) { e.preventDefault(); if (ECO.calcOpen) ECO.calcOpen(cb.dataset.calc); return; }
      if (e.target.closest("#pl-pdf")) pdf("pdf");
      if (e.target.closest("#pl-reset")) { S.cfg = JSON.parse(JSON.stringify(DEF)); S.cfg.alk = NaN; S.cfg.ad.qmax = NaN; S.cfg.ad.kl = NaN; buildInputs(); buildStages(); loadPreset("rustamiya"); }
    });
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(es => { const st = U.$("#pl-sticky"); if (st) st.classList.toggle("gone", es.some(x => x.isIntersecting)); }, { threshold: 0.12 });
      io.observe(U.$(".pl-res"));
    }
    loadPreset(S.preset);
  }

  ECO.plant = { simulate, STAGES, PARAMS, LIMITS };
  ECO.views.plant = { init, show() { if (S.chart) S.chart.resize(); if (ECO.lastWater && !U.$('#pl-presets [data-p="water"]')) { buildInputs(); U.$$("#pl-presets button").forEach(b => b.classList.toggle("on", b.dataset.p === S.preset)); } } };
})();
