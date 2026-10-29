/* =====================================================================
   EcoBio AI — الحاسبات العلمية للتلوث والمعالجة (معادلات منشورة مع مراجعها)
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const n = x => { const v = parseFloat(String(x ?? "").replace(",", ".")); return U.isNum(v) ? v : NaN; };
  const f2 = (v, d = 2) => (U.isNum(v) ? U.fmt(v, d) : "—");
  const sci = v => (!U.isNum(v) ? "—" : v === 0 ? "0" : Math.abs(v) < 0.001 || Math.abs(v) >= 1e5 ? v.toExponential(2) : U.fmt(v, 4));
  const band = (v, bands) => { for (const [max, label, tone] of bands) if (v <= max) return { label, tone }; const l = bands[bands.length - 1]; return { label: l[1], tone: l[2] }; };
  function linreg(xs, ys) {
    const N = xs.length, mx = U.mean(xs), my = U.mean(ys); let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    const b = sxy / sxx, a = my - b * mx; return { slope: b, intercept: a, r2: (sxy * sxy) / (sxx * syy), r: sxy / Math.sqrt(sxx * syy), n: N };
  }
  /* توزيع t لحساب p-value (دالة بيتا غير التامة) */
  function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
  function lgamma(z) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const tTwoTail = (t, df) => ibeta(df / 2, 0.5, df / (df + t * t));

  const REF = {
    tw: "Turekian, K.K., Wedepohl, K.H. (1961). Distribution of the elements in some major units of the Earth's crust. GSA Bulletin 72: 175–192.",
    hak: "Håkanson, L. (1980). An ecological risk index for aquatic pollution control: a sedimentological approach. Water Research 14: 975–1001.",
    mul: "Müller, G. (1969). Index of geoaccumulation in sediments of the Rhine River. GeoJournal 2: 108–118.",
    tom: "Tomlinson, D.L., et al. (1980). Problems in the assessment of heavy-metal levels in estuaries and the formation of a pollution index. Helgoländer Meeresuntersuchungen 33: 566–575.",
    epa89: "US EPA (1989). Risk Assessment Guidance for Superfund, Vol. I: Human Health Evaluation Manual (Part A). EPA/540/1-89/002.",
    apha: "APHA (2017). Standard Methods for the Examination of Water and Wastewater, 23rd ed.",
    ccme: "CCME (2001). Canadian Water Quality Guidelines for the Protection of Aquatic Life: CCME Water Quality Index 1.0, Technical Report.",
    mohan: "Mohan, S.V., Nithila, P., Reddy, S.J. (1996). Estimation of heavy metals in drinking water and development of heavy metal pollution index. J. Environ. Sci. Health A31(2): 283–289.",
    richards: "Richards, L.A. (1954). Diagnosis and Improvement of Saline and Alkali Soils. USDA Agriculture Handbook No. 60.",
    wilcox: "Wilcox, L.V. (1955). Classification and Use of Irrigation Waters. USDA Circular 969.",
    baiji: "الحمداني، ن.ص.، سعيد، إ.ع.، علوش، ر.ه. (2025). مجلة تكريت للعلوم الصرفة 30(6): 18–24 – بيانات قناة مصافي صلاح الدين.",
    balad: "Dalas, M.S., Farhan, M.G., Altae, M. (2022). Tikrit Journal of Pure Science 27(4): 23–30.",
    langmuir: "Langmuir, I. (1918). J. Am. Chem. Soc. 40: 1361–1403؛ Freundlich, H. (1906). Z. Phys. Chem. 57: 385–470.",
    emerson: "Emerson, K., et al. (1975). Aqueous ammonia equilibrium calculations: effect of pH and temperature. J. Fish. Res. Board Can. 32: 2379–2383.",
    bk: "Benson, B.B., Krause, D. (1984). Limnology & Oceanography 29(3): 620–632؛ المعادلة كما في APHA 4500-O.",
    baker: "Baker, A.J.M. (1981). Accumulators and excluders – strategies in the response of plants to heavy metals. J. Plant Nutr. 3: 643–654.",
    aqi: "US EPA (2024). Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI)."
  };

  /* ===================== تعريف الحاسبات ===================== */
  const C = [];

  C.push({
    id: "wqi-link", cat: "water", title: "مؤشر جودة المياه WQI", en: "Weighted Arithmetic WQI", desc: "حساب WQI وHPI لعيّنة واحدة مع خطة المعالجة في مختبر المياه.", link: "water"
  });

  C.push({
    id: "ccme", cat: "water", title: "مؤشر جودة المياه الكندي CCME WQI", en: "CCME Water Quality Index",
    desc: "يقيّم مجموعة عينات معاً من ثلاثة عوامل: نطاق المتغيرات المخالفة، وتكرار المخالفة، ومقدارها.",
    table: { cols: [{ id: "p", label: "المتغير", type: "text" }, { id: "obj", label: "الحد (أو مدى 6.5-8.5)", type: "text" }, { id: "dir", label: "نوع الحد", type: "select", opts: [["max", "أعلى حد ≤"], ["min", "أدنى حد ≥"], ["range", "مدى"]] }, { id: "vals", label: "القيم مفصولة بفاصلة", type: "text", wide: true }], rows: [["", "", "max", ""], ["", "", "max", ""], ["", "", "max", ""]] },
    presets: [{ id: "baiji", label: "قناة مصافي بيجي (5 محطات)", rows: [["pH", "6.5-8.5", "range", "6.8,6.7,7.2,7.2,7.3"], ["TDS", "1000", "max", "764,532,518,466,454"], ["SO₄", "400", "max", "258,212,188,162,144"], ["PO₄", "0.4", "max", "1.56,1.42,0.86,0.48,0.42"], ["BOD", "5", "max", "684,512,526,432,486"], ["Pb", "0.01", "max", "0.68,0.52,0.44,0.48,0.40"], ["Cu", "2", "max", "0.18,0.14,0.08,0.08,0.08"], ["Cd", "0.003", "max", "0.05,0.04,0.02,0.02,0.02"], ["Ni", "0.07", "max", "0.16,0.12,0.14,0.12,0.08"]], src: REF.baiji }],
    run(f, rows) {
      let nv = 0, fv = 0, nt = 0, ft = 0, exc = 0; const det = [];
      rows.forEach(r => {
        const vals = String(r.vals || "").split(/[,،\s]+/).map(n).filter(U.isNum); if (!vals.length || !r.obj) return;
        let lo = -Infinity, hi = Infinity; const o = String(r.obj).split("-").map(n);
        if (r.dir === "range" && o.length === 2) { lo = o[0]; hi = o[1]; } else if (r.dir === "min") lo = o[0]; else hi = o[0];
        nv++; let fails = 0;
        vals.forEach(v => { nt++; if (v > hi) { fails++; exc += v / hi - 1; } else if (v < lo) { fails++; exc += lo / v - 1; } });
        if (fails) fv++; ft += fails; det.push([r.p || "—", vals.length, fails, Math.round(fails / vals.length * 100) + "%"]);
      });
      if (!nv) return null;
      const F1 = fv / nv * 100, F2 = ft / nt * 100, nse = exc / nt, F3 = nse / (0.01 * nse + 0.01);
      const wqi = 100 - Math.sqrt(F1 * F1 + F2 * F2 + F3 * F3) / 1.732;
      const b = band(wqi < 0 ? 0 : wqi, [[44.999, "رديئة (Poor)", "severe"], [64.999, "هامشية (Marginal)", "bad"], [79.999, "مقبولة (Fair)", "warn"], [94.999, "جيدة (Good)", "fair"], [100, "ممتازة (Excellent)", "good"]]);
      return {
        cards: [{ label: "CCME WQI", value: f2(Math.max(0, wqi), 1), sub: b.label, tone: b.tone }, { label: "F1 النطاق", value: f2(F1, 1), unit: "%" }, { label: "F2 التكرار", value: f2(F2, 1), unit: "%" }, { label: "F3 المقدار", value: f2(F3, 1) }],
        table: { head: ["المتغير", "عدد القياسات", "المخالفة", "نسبة المخالفة"], rows: det },
        chart: { type: "bar", data: { labels: ["F1", "F2", "F3"], datasets: [{ data: [F1, F2, F3], backgroundColor: [ECO.COL.river, ECO.COL.silt, ECO.COL.crimson], borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } } },
        interp: `جودة المياه وفق المؤشر الكندي <b>${b.label}</b>. ${F1 > 50 ? "أكثر من نصف المتغيرات تخالف الحدود. " : ""}${F3 > 80 ? "مقدار المخالفات كبير جداً، أي أن بعض القيم أعلى من الحد بأضعاف." : ""}`
      };
    },
    formula: "F1 = (Failed variables / Total variables) × 100\nF2 = (Failed tests / Total tests) × 100\nexcursion = (Failed value / Objective) − 1   |   nse = Σ excursion / Total tests\nF3 = nse / (0.01·nse + 0.01)\nCCME WQI = 100 − √(F1² + F2² + F3²) / 1.732",
    refs: [REF.ccme]
  });

  C.push({
    id: "metals", cat: "water", title: "مؤشرات العناصر الثقيلة في المياه", en: "HPI · HEI · Contamination degree",
    desc: "مؤشر تلوث العناصر الثقيلة HPI، ومؤشر تقييم العناصر الثقيلة HEI، ودرجة التلوث Cd.",
    table: { cols: [{ id: "m", label: "العنصر", type: "text" }, { id: "M", label: "التركيز mg/L" }, { id: "S", label: "الحد القياسي mg/L" }, { id: "I", label: "القيمة المثالية" }], rows: [["Pb", "", "0.01", "0"], ["Cd", "", "0.003", "0"], ["Cr", "", "0.05", "0"], ["Ni", "", "0.07", "0"], ["Fe", "", "0.3", "0"], ["Zn", "", "3", "0"], ["Cu", "", "2", "0"]] },
    presets: [
      { id: "baiji", label: "مياه قناة بيجي – م1", rows: [["Pb", "0.68", "0.01", "0"], ["Cu", "0.18", "2", "0"], ["Cd", "0.05", "0.003", "0"], ["Ni", "0.16", "0.07", "0"]], src: REF.baiji },
      { id: "balad", label: "آبار بلد – أعلى القيم", rows: [["Pb", "0.509", "0.01", "0"], ["Zn", "3.841", "3", "0"]], src: REF.balad }
    ],
    run(f, rows) {
      const R = rows.map(r => ({ m: r.m, M: n(r.M), S: n(r.S), I: n(r.I) || 0 })).filter(r => U.isNum(r.M) && U.isNum(r.S) && r.S > 0);
      if (!R.length) return null;
      let sw = 0, swq = 0, hei = 0, cd = 0;
      const t = R.map(r => { const W = 1 / r.S, Q = 100 * Math.abs(r.M - r.I) / (r.S - r.I); sw += W; swq += W * Q; hei += r.M / r.S; cd += r.M / r.S - 1; return [r.m, f2(r.M, 4), r.S, f2(Q, 1), f2(r.M / r.S, 2), { html: r.M > r.S ? '<span class="bad">تجاوز</span>' : '<span class="ok">ضمن الحد</span>' }]; });
      const hpi = swq / sw, bh = hei < 10 ? ["منخفض", "good"] : hei <= 20 ? ["متوسط", "warn"] : ["مرتفع", "severe"], bc = cd < 1 ? ["منخفضة", "good"] : cd <= 3 ? ["متوسطة", "warn"] : ["مرتفعة", "severe"];
      return {
        cards: [{ label: "HPI", value: f2(hpi, 1), sub: hpi >= 100 ? "فوق الحد الحرج 100" : "دون الحد الحرج 100", tone: hpi >= 100 ? "severe" : "good" }, { label: "HEI", value: f2(hei, 2), sub: "تلوث " + bh[0], tone: bh[1] }, { label: "درجة التلوث Cd", value: f2(cd, 2), sub: bc[0], tone: bc[1] }],
        table: { head: ["العنصر", "التركيز", "الحد", "Qi", "Mi/Si", "الحالة"], rows: t },
        chart: { type: "bar", data: { labels: R.map(r => r.m), datasets: [{ label: "التركيز ÷ الحد", data: R.map(r => r.M / r.S), backgroundColor: R.map(r => (r.M > r.S ? ECO.COL.crimson : ECO.COL.chloro) + "cc"), borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: "مرات الحد" } } } } },
        interp: `HPI = ${f2(hpi, 1)}؛ ${hpi >= 100 ? "المياه ملوثة بالعناصر الثقيلة وغير صالحة للشرب من هذه الناحية." : "التلوث بالعناصر الثقيلة دون الحد الحرج."} أعلى عنصر نسبةً إلى حده: <b>${R.slice().sort((a, b) => b.M / b.S - a.M / a.S)[0].m}</b>.`
      };
    },
    formula: "HPI = Σ(Wi·Qi) / ΣWi ,  Wi = 1/Si ,  Qi = 100·|Mi − Ii| / (Si − Ii)\nHEI = Σ (Mi / Si)\nCd = Σ (Mi / Si − 1)",
    refs: [REF.mohan, "Edet, A.E., Offiong, O.E. (2002). GeoJournal 57: 295–304 (HEI).", "Backman, B., et al. (1998). Environmental Geology 36: 55–64 (Cd)."]
  });

  C.push({
    id: "hardness", cat: "water", title: "العسرة الكلية من الكالسيوم والمغنيسيوم", en: "Total hardness",
    desc: "حساب العسرة كمكافئ كربونات الكالسيوم وتصنيفها.",
    fields: [{ id: "ca", label: "الكالسيوم Ca²⁺", unit: "mg/L" }, { id: "mg", label: "المغنيسيوم Mg²⁺", unit: "mg/L" }],
    run(f) {
      const ca = n(f.ca), mg = n(f.mg); if (!U.isNum(ca) || !U.isNum(mg)) return null;
      const th = 2.497 * ca + 4.118 * mg, b = band(th, [[75, "يسرة", "good"], [150, "متوسطة العسرة", "fair"], [300, "عسرة", "warn"], [1e9, "عسرة جداً", "bad"]]);
      return { cards: [{ label: "العسرة الكلية", value: f2(th, 1), unit: "mg/L CaCO₃", sub: b.label, tone: b.tone }, { label: "عسرة الكالسيوم", value: f2(2.497 * ca, 1), unit: "mg/L" }, { label: "عسرة المغنيسيوم", value: f2(4.118 * mg, 1), unit: "mg/L" }], interp: `المياه <b>${b.label}</b>. حد المواصفة العراقية 417 للعسرة الكلية 500 mg/L ${th > 500 ? "<span class='bad'>(متجاوز)</span>" : "<span class='ok'>(غير متجاوز)</span>"}.` };
    },
    formula: "TH (mg/L as CaCO₃) = 2.497·Ca + 4.118·Mg", refs: [REF.apha, "Sawyer, C.N., McCarty, P.L. (1967). Chemistry for Sanitary Engineers."]
  });

  C.push({
    id: "irrigation", cat: "irr", title: "صلاحية المياه للري", en: "SAR · %Na · KR · MH · PI · RSC",
    desc: "أهم مؤشرات صلاحية المياه للري من تراكيز الأيونات (تُحوَّل تلقائياً إلى meq/L).",
    fields: [{ id: "na", label: "الصوديوم Na⁺", unit: "mg/L" }, { id: "k", label: "البوتاسيوم K⁺", unit: "mg/L" }, { id: "ca", label: "الكالسيوم Ca²⁺", unit: "mg/L" }, { id: "mg", label: "المغنيسيوم Mg²⁺", unit: "mg/L" }, { id: "hco3", label: "البيكاربونات HCO₃⁻", unit: "mg/L" }, { id: "co3", label: "الكربونات CO₃²⁻", unit: "mg/L" }, { id: "ec", label: "التوصيلية EC", unit: "µS/cm" }],
    run(f) {
      const Na = n(f.na) / 22.99, K = (n(f.k) || 0) / 39.098, Ca = n(f.ca) / 20.04, Mg = n(f.mg) / 12.153, HCO3 = (n(f.hco3) || 0) / 61.017, CO3 = (n(f.co3) || 0) / 30.004, EC = n(f.ec);
      if (![Na, Ca, Mg].every(U.isNum)) return null;
      const SAR = Na / Math.sqrt((Ca + Mg) / 2), pNa = (Na + K) * 100 / (Ca + Mg + Na + K), KR = Na / (Ca + Mg), MH = Mg * 100 / (Ca + Mg), PI = (Na + Math.sqrt(HCO3)) * 100 / (Ca + Mg + Na), RSC = CO3 + HCO3 - (Ca + Mg);
      const bS = band(SAR, [[10, "ممتازة S1", "good"], [18, "جيدة S2", "fair"], [26, "مشكوك فيها S3", "warn"], [1e9, "غير صالحة S4", "severe"]]);
      const bN = band(pNa, [[20, "ممتازة", "good"], [40, "جيدة", "fair"], [60, "مسموحة", "warn"], [80, "مشكوك فيها", "bad"], [1e9, "غير صالحة", "severe"]]);
      const bE = U.isNum(EC) ? band(EC, [[250, "C1 ملوحة منخفضة", "good"], [750, "C2 ملوحة متوسطة", "fair"], [2250, "C3 ملوحة عالية", "warn"], [1e9, "C4 ملوحة عالية جداً", "severe"]]) : null;
      return {
        cards: [{ label: "SAR", value: f2(SAR, 2), sub: bS.label, tone: bS.tone }, { label: "%Na", value: f2(pNa, 1), unit: "%", sub: bN.label, tone: bN.tone }, { label: "نسبة كيلي KR", value: f2(KR, 2), sub: KR < 1 ? "صالحة" : "غير صالحة", tone: KR < 1 ? "good" : "bad" }, { label: "خطورة المغنيسيوم MH", value: f2(MH, 1), unit: "%", sub: MH < 50 ? "صالحة" : "ضارة", tone: MH < 50 ? "good" : "bad" }, { label: "مؤشر النفاذية PI", value: f2(PI, 1), unit: "%", sub: PI > 75 ? "الصنف I" : PI >= 25 ? "الصنف II" : "الصنف III", tone: PI >= 25 ? "good" : "warn" }, { label: "RSC", value: f2(RSC, 2), unit: "meq/L", sub: RSC < 1.25 ? "آمنة" : RSC <= 2.5 ? "حدّية" : "غير صالحة", tone: RSC < 1.25 ? "good" : RSC <= 2.5 ? "warn" : "severe" }].concat(bE ? [{ label: "صنف الملوحة", value: f2(EC, 0), unit: "µS/cm", sub: bE.label, tone: bE.tone }] : []),
        table: { head: ["الأيون", "mg/L", "meq/L"], rows: [["Na⁺", f.na, f2(Na, 3)], ["K⁺", f.k || 0, f2(K, 3)], ["Ca²⁺", f.ca, f2(Ca, 3)], ["Mg²⁺", f.mg, f2(Mg, 3)], ["HCO₃⁻", f.hco3 || 0, f2(HCO3, 3)], ["CO₃²⁻", f.co3 || 0, f2(CO3, 3)]] },
        interp: `صنف الصوديوم <b>${bS.label}</b>${bE ? ` وصنف الملوحة <b>${bE.label}</b> (تصنيف مختبر الملوحة الأمريكي USSL: ${bE.label.slice(0, 2)}-${bS.label.slice(-2)})` : ""}.`
      };
    },
    formula: "meq/L = (mg/L) / equivalent weight   [Na 22.99, K 39.10, Ca 20.04, Mg 12.15, HCO₃ 61.02, CO₃ 30.00]\nSAR = Na / √((Ca + Mg)/2)\n%Na = (Na + K)·100 / (Ca + Mg + Na + K)\nKR = Na / (Ca + Mg)      MH = Mg·100 / (Ca + Mg)\nPI = (Na + √HCO₃)·100 / (Ca + Mg + Na)\nRSC = (CO₃ + HCO₃) − (Ca + Mg)",
    refs: [REF.richards, REF.wilcox, "Kelly, W.P. (1963). Use of saline irrigation water. Soil Science 95: 385–391.", "Doneen, L.D. (1964). Notes on Water Quality in Agriculture. UC Davis."]
  });

  const SEDBG = { Pb: [20, 5], Cu: [45, 5], Cd: [0.3, 30], Ni: [68, 5], Zn: [95, 1], Cr: [90, 2], Co: [19, 5], As: [13, 10], Hg: [0.4, 40], Mn: [850, 1] };
  ECO.SEDBG = SEDBG; ECO.SEDBG_REF = REF.tw;
  const sedRows = st => { const t = ECO.RESEARCH.find(r => r.id === "baiji-2025").tables.find(x => x.id === "sed"); return ["Pb", "Cu", "Cd", "Ni"].map(m => { const row = t.rows.find(r => r[0].startsWith(m)); return [m, String(row[st]), String(SEDBG[m][0]), String(SEDBG[m][1])]; }); };
  C.push({
    id: "sediment", cat: "sed", title: "مؤشرات تلوث الرواسب والتربة", en: "CF · Igeo · EF · PLI · Er · RI",
    desc: "معامل التلوث ومؤشر التراكم الجيولوجي ومعامل الإثراء ومؤشر حمل التلوث ومؤشر الخطر البيئي.",
    fields: [{ id: "fes", label: "الحديد في العينة (لحساب EF، اختياري)", unit: "mg/kg" }, { id: "feb", label: "الحديد الخلفي", unit: "mg/kg", def: "47200" }],
    table: { cols: [{ id: "m", label: "العنصر", type: "text" }, { id: "cs", label: "التركيز mg/kg" }, { id: "bn", label: "القيمة الخلفية Bn" }, { id: "tr", label: "معامل السمية Tr" }], rows: Object.entries(SEDBG).slice(0, 6).map(([m, [b, t]]) => [m, "", String(b), String(t)]) },
    presets: [{ id: "baiji1", label: "رواسب قناة بيجي – م1", rows: () => sedRows(1), src: REF.baiji }, { id: "baiji5", label: "رواسب قناة بيجي – م5", rows: () => sedRows(5), src: REF.baiji }],
    run(f, rows) {
      const R = rows.map(r => ({ m: r.m, cs: n(r.cs), bn: n(r.bn), tr: n(r.tr) })).filter(r => U.isNum(r.cs) && U.isNum(r.bn) && r.bn > 0);
      if (!R.length) return null;
      const fes = n(f.fes), feb = n(f.feb) || 47200;
      const igeoB = v => band(v, [[0, "غير ملوث", "good"], [1, "غير ملوث–متوسط", "fair"], [2, "متوسط", "warn"], [3, "متوسط–شديد", "bad"], [4, "شديد", "severe"], [5, "شديد–شديد جداً", "severe"], [1e9, "شديد جداً", "hazard"]]);
      const cfB = v => band(v, [[0.999, "منخفض", "good"], [2.999, "متوسط", "fair"], [5.999, "كبير", "warn"], [1e9, "كبير جداً", "severe"]]);
      const erB = v => band(v, [[40, "منخفض", "good"], [80, "متوسط", "fair"], [160, "كبير", "warn"], [320, "عالٍ", "bad"], [1e9, "عالٍ جداً", "severe"]]);
      let cdeg = 0, prod = 1, ri = 0;
      const t = R.map(r => { const cf = r.cs / r.bn, ig = Math.log2(r.cs / (1.5 * r.bn)), er = (U.isNum(r.tr) ? r.tr : 0) * cf, ef = U.isNum(fes) && fes > 0 ? (r.cs / fes) / (r.bn / feb) : NaN; cdeg += cf; prod *= cf; ri += er; return [r.m, r.cs, r.bn, f2(cf, 3) + " – " + cfB(cf).label, f2(ig, 2) + " – " + igeoB(ig).label, U.isNum(ef) ? f2(ef, 2) : "—", f2(er, 2) + " – " + erB(er).label]; });
      const pli = Math.pow(prod, 1 / R.length), riB = band(ri, [[150, "منخفض", "good"], [300, "متوسط", "warn"], [600, "كبير", "bad"], [1e9, "عالٍ جداً", "severe"]]);
      return {
        cards: [{ label: "درجة التلوث Cdeg", value: f2(cdeg, 2), sub: band(cdeg, [[R.length, "منخفضة", "good"], [2 * R.length, "متوسطة", "fair"], [4 * R.length, "كبيرة", "warn"], [1e9, "كبيرة جداً", "severe"]]).label }, { label: "مؤشر حمل التلوث PLI", value: f2(pli, 3), sub: pli > 1 ? "ملوث" : "غير ملوث (PLI ≤ 1)", tone: pli > 1 ? "bad" : "good" }, { label: "مؤشر الخطر البيئي RI", value: f2(ri, 1), sub: "خطر " + riB.label, tone: riB.tone }],
        table: { head: ["العنصر", "Cs", "Bn", "CF", "Igeo", "EF", "Er"], rows: t },
        chart: { type: "bar", data: { labels: R.map(r => r.m), datasets: [{ label: "Igeo", data: R.map(r => Math.log2(r.cs / (1.5 * r.bn))), backgroundColor: ECO.COL.silt + "cc", borderRadius: 4 }, { label: "CF", data: R.map(r => r.cs / r.bn), backgroundColor: ECO.COL.river + "cc", borderRadius: 4 }] }, options: { plugins: { legend: { position: "bottom" } } } },
        interp: `PLI = ${f2(pli, 3)} و RI = ${f2(ri, 1)} (خطر بيئي ${riB.label}). القيم الخلفية الافتراضية لمعدل الطَّفل العالمي (Turekian & Wedepohl 1961)؛ استبدلها بقيم خلفية محلية إن توفرت لنتيجة أدق.`
      };
    },
    formula: "CF = Cs / Bn          Igeo = log₂( Cs / (1.5·Bn) )\nEF = (Cx/Fe)sample / (Cx/Fe)background\nCdeg = Σ CF          PLI = (CF₁·CF₂·…·CFₙ)^(1/n)\nEr = Tr · CF          RI = Σ Er      [Tr: Hg 40, Cd 30, As 10, Pb 5, Cu 5, Ni 5, Co 5, Cr 2, Zn 1]",
    refs: [REF.mul, REF.hak, REF.tom, REF.tw, "Sutherland, R.A. (2000). Environmental Geology 39: 611–627 (EF classes)."]
  });

  /* أدلة جودة الرواسب للمياه العذبة (MacDonald et al. 2000) ومؤشر Nemerow */
  const SQG = { As: [9.79, 33.0], Cd: [0.99, 4.98], Cr: [43.4, 111], Cu: [31.6, 149], Pb: [35.8, 128], Hg: [0.18, 1.06], Ni: [22.7, 48.6], Zn: [121, 459] };
  const sqgRows = st => { const t = ECO.RESEARCH.find(r => r.id === "baiji-2025").tables.find(x => x.id === "sed"); return ["Pb", "Cu", "Cd", "Ni"].map(m => { const row = t.rows.find(r => r[0].startsWith(m)); return [m, String(row[st]), String(SEDBG[m][0])]; }); };
  C.push({
    id: "sqg", cat: "sed", title: "أدلة جودة الرواسب TEC وPEC ومؤشر Nemerow", en: "TEC · PEC · mean PEC-Q · Nemerow PN",
    desc: "يقارن تراكيز العناصر في رواسب الأنهار بالحدين المتفق عليهما للأثر على الأحياء القاعية، ويحسب متوسط نسبة PEC واحتمال السمية، ومؤشر Nemerow الشامل.",
    table: { cols: [{ id: "m", label: "العنصر", type: "text" }, { id: "cs", label: "التركيز mg/kg جاف" }, { id: "bn", label: "الخلفية Bn" }],
      rows: Object.keys(SQG).map(m => [m, "", String((SEDBG[m] || [""])[0])]) },
    presets: [{ id: "baiji1", label: "رواسب قناة بيجي – م1", rows: () => sqgRows(1), src: REF.baiji }, { id: "baiji5", label: "رواسب قناة بيجي – م5", rows: () => sqgRows(5), src: REF.baiji }],
    run(f, rows) {
      const R = rows.map(r => ({ m: String(r.m || "").trim(), cs: n(r.cs), bn: n(r.bn) })).filter(r => U.isNum(r.cs) && r.cs >= 0);
      if (!R.length) return null;
      const known = R.filter(r => SQG[r.m]);
      const cls = r => { const [tec, pec] = SQG[r.m]; return r.cs < tec ? ["أقل من TEC: الأثر غير مرجّح", "good"] : r.cs < pec ? ["بين TEC وPEC: أثر ممكن", "warn"] : ["فوق PEC: أثر مرجّح", "severe"]; };
      const pq = known.map(r => r.cs / SQG[r.m][1]);
      const mpq = pq.length ? pq.reduce((a, b) => a + b, 0) / pq.length : NaN;
      /* نسبة العيّنات السامة في بيانات التحقق لدى MacDonald et al. (2000)، 347 عيّنة:
         أقل من 0.1: 6 من 61 · أقل من 0.5: 30 من 174 · أكثر من 0.5: 147 من 173 · أكثر من 1.0: 132 من 143.
         الفئتان الوسطيان بالطرح: 0.1–0.5 = 24 من 113، و0.5–1.0 = 15 من 30 */
      const mpqB = !U.isNum(mpq) ? null : mpq < 0.1 ? ["سمية غير مرجّحة: 6 من 61 عيّنة بهذه الفئة كانت سامة (10%)", "good"] : mpq < 0.5 ? ["احتمال سمية منخفض: 24 من 113 عيّنة كانت سامة (21%)", "fair"] : mpq <= 1 ? ["سمية محتملة: 15 من 30 عيّنة كانت سامة (50%)", "bad"] : ["سمية مرجّحة جداً: 132 من 143 عيّنة كانت سامة (92%)", "severe"];
      const withBn = R.filter(r => U.isNum(r.bn) && r.bn > 0), pi = withBn.map(r => r.cs / r.bn);
      const pmean = pi.length ? pi.reduce((a, b) => a + b, 0) / pi.length : NaN, pmax = pi.length ? Math.max(...pi) : NaN;
      const pn = pi.length ? Math.sqrt((pmean * pmean + pmax * pmax) / 2) : NaN;
      const pnB = band(pn, [[0.7, "نظيف", "good"], [1, "حدّ الإنذار", "fair"], [2, "تلوث خفيف", "warn"], [3, "تلوث متوسط", "bad"], [1e9, "تلوث شديد", "severe"]]);
      return {
        cards: [
          { label: "متوسط نسبة PEC", value: f2(mpq, 3), sub: mpqB ? mpqB[0] : "أدخل عنصراً من القائمة", tone: mpqB ? mpqB[1] : "info" },
          { label: "مؤشر Nemerow الشامل", value: f2(pn, 2), sub: pi.length ? pnB.label : "يحتاج القيم الخلفية", tone: pi.length ? pnB.tone : "info" },
          { label: "عناصر فوق PEC", value: String(known.filter(r => r.cs >= SQG[r.m][1]).length), sub: `من أصل ${known.length} لها حدود منشورة`, tone: known.some(r => r.cs >= SQG[r.m][1]) ? "severe" : "good" }
        ],
        table: { head: ["العنصر", "Cs", "TEC", "PEC", "Cs/PEC", "التصنيف", "Pi (Cs/Bn)"], rows: R.map(r => { const g = SQG[r.m]; const c = g ? cls(r) : null; return [r.m, f2(r.cs, 3), g ? String(g[0]) : "—", g ? String(g[1]) : "—", g ? f2(r.cs / g[1], 3) : "—", c ? c[0] : "لا يوجد دليل لهذا العنصر", U.isNum(r.bn) && r.bn > 0 ? f2(r.cs / r.bn, 2) : "—"]; }) },
        chart: known.length ? { type: "bar", data: { labels: known.map(r => r.m), datasets: [{ label: "Cs/TEC", data: known.map(r => r.cs / SQG[r.m][0]), backgroundColor: ECO.COL.silt + "cc", borderRadius: 4 }, { label: "Cs/PEC", data: known.map(r => r.cs / SQG[r.m][1]), backgroundColor: ECO.COL.rust + "cc", borderRadius: 4 }] } } : null,
        interp: `${known.length ? `متوسط نسبة PEC = ${f2(mpq, 3)}${mpqB ? ` (${mpqB[0]})` : ""}. ` : ""}${pi.length ? `مؤشر Nemerow = ${f2(pn, 2)} (${pnB.label})، وأعلى Pi = ${f2(pmax, 2)}. ` : ""}الحدّان TEC وPEC لرواسب المياه العذبة بوزن جاف؛ تحتهما TEC لا يُتوقع أثر على الأحياء القاعية، وفوق PEC يُتوقع الأثر غالباً.`
      };
    },
    formula: "Cs/PEC لكل عنصر          mean PEC-Q = Σ(Cs/PEC) / n\nPi = Cs / Bn          PN = √[(P̄² + Pmax²) / 2]\nالتصنيف: Cs < TEC أثر غير مرجّح · TEC–PEC أثر ممكن · > PEC أثر مرجّح",
    refs: ["MacDonald, D.D., Ingersoll, C.G., Berger, T.A. (2000). Development and evaluation of consensus-based sediment quality guidelines for freshwater ecosystems. Archives of Environmental Contamination and Toxicology 39: 20–31.",
      "Nemerow, N.L. (1974). Scientific Stream Pollution Analysis. McGraw-Hill, New York.", REF.tw]
  });

  const RISKDEF = { Pb: [0.0035, 0.0085], Cd: [0.0005, 0.38], Cr: [0.003, 0.5], Ni: [0.02, ""], Cu: [0.04, ""], Zn: [0.3, ""], Fe: [0.7, ""], As: [0.0003, 1.5] };
  C.push({
    id: "health", cat: "risk", title: "تقييم المخاطر الصحية لمياه الشرب", en: "CDI · HQ · HI · Cancer Risk",
    desc: "الجرعة اليومية المزمنة ومعامل الخطورة ومؤشر الخطورة وخطر السرطان عند شرب المياه (نموذج US EPA).",
    fields: [{ id: "grp", label: "الفئة", type: "select", opts: [["adult", "بالغون"], ["child", "أطفال"]], def: "adult" }, { id: "ir", label: "معدل الشرب IR", unit: "L/day", def: "2" }, { id: "bw", label: "وزن الجسم BW", unit: "kg", def: "70" }, { id: "ef", label: "تكرار التعرض EF", unit: "يوم/سنة", def: "365" }, { id: "ed", label: "مدة التعرض ED", unit: "سنة", def: "30" }],
    table: { cols: [{ id: "m", label: "العنصر", type: "text" }, { id: "c", label: "التركيز mg/L" }, { id: "rfd", label: "RfD mg/kg/day" }, { id: "csf", label: "CSF (mg/kg/day)⁻¹" }], rows: Object.entries(RISKDEF).map(([m, [r, c]]) => [m, "", String(r), String(c)]) },
    presets: [{ id: "balad", label: "آبار بلد – أعلى القيم", rows: [["Pb", "0.509", "0.0035", "0.0085"], ["Zn", "3.841", "0.3", ""]], src: REF.balad }],
    onField(id, val, setF) { if (id === "grp") { if (val === "child") setF({ ir: "1", bw: "15", ed: "6" }); else setF({ ir: "2", bw: "70", ed: "30" }); } },
    run(f, rows) {
      const IR = n(f.ir), BW = n(f.bw), EF = n(f.ef), ED = n(f.ed);
      const R = rows.map(r => ({ m: r.m, c: n(r.c), rfd: n(r.rfd), csf: n(r.csf) })).filter(r => U.isNum(r.c));
      if (!R.length || ![IR, BW, EF, ED].every(U.isNum)) return null;
      let HI = 0, CRt = 0;
      const t = R.map(r => { const cdi = r.c * IR * EF * ED / (BW * ED * 365), cdic = r.c * IR * EF * ED / (BW * 70 * 365), hq = U.isNum(r.rfd) ? cdi / r.rfd : NaN, cr = U.isNum(r.csf) ? cdic * r.csf : NaN; if (U.isNum(hq)) HI += hq; if (U.isNum(cr)) CRt += cr; return [r.m, r.c, sci(cdi), U.isNum(hq) ? { html: `<b class="${hq >= 1 ? "bad" : "ok"}">${f2(hq, 3)}</b>` } : "—", U.isNum(cr) ? { html: `<span class="${cr > 1e-4 ? "bad" : cr > 1e-6 ? "warnc" : "ok"}">${sci(cr)}</span>` } : "—"]; });
      const crB = CRt > 1e-4 ? ["غير مقبول (> 10⁻⁴)", "severe"] : CRt > 1e-6 ? ["ضمن المدى المقبول (10⁻⁶–10⁻⁴)", "warn"] : ["مهمل (< 10⁻⁶)", "good"];
      return {
        cards: [{ label: "مؤشر الخطورة HI", value: f2(HI, 3), sub: HI >= 1 ? "خطر صحي غير مسرطن محتمل" : "لا خطر غير مسرطن معنوي", tone: HI >= 1 ? "severe" : "good" }, { label: "خطر السرطان الكلي", value: sci(CRt), sub: crB[0], tone: crB[1] }],
        table: { head: ["العنصر", "C mg/L", "CDI mg/kg/day", "HQ", "CR"], rows: t },
        chart: { type: "bar", data: { labels: R.map(r => r.m), datasets: [{ label: "HQ", data: R.map(r => (U.isNum(r.rfd) ? r.c * IR / (BW * r.rfd) * EF / 365 : 0)), backgroundColor: R.map(r => (r.c * IR / (BW * r.rfd) * EF / 365 >= 1 ? ECO.COL.crimson : ECO.COL.chloro) + "cc"), borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } },
        interp: `HI = ${f2(HI, 3)} ${HI >= 1 ? "(> 1): يُتوقع أثر صحي مزمن عند الشرب المستمر." : "(< 1)."} قيم RfD وCSF الافتراضية شائعة الاستخدام في الأدبيات المعتمدة على US EPA IRIS، ويمكن تعديلها حسب مرجعك.`
      };
    },
    formula: "CDI = (C × IR × EF × ED) / (BW × AT)   [AT = ED×365 لغير المسرطن، 70×365 للمسرطن]\nHQ = CDI / RfD          HI = Σ HQ\nCR = CDI × CSF          (المقبول 10⁻⁶ – 10⁻⁴)",
    refs: [REF.epa89, "US EPA Integrated Risk Information System (IRIS)."]
  });

  C.push({
    id: "bod", cat: "lab", title: "المتطلب الحيوي للأكسجين BOD₅", en: "BOD₅ dilution method",
    desc: "حساب BOD₅ بطريقة التخفيف مع تصحيح البذرة (اختياري) والتحقق من شروط صلاحية النتيجة.",
    fields: [{ id: "d1", label: "DO الابتدائي D1", unit: "mg/L" }, { id: "d2", label: "DO بعد 5 أيام D2", unit: "mg/L" }, { id: "vs", label: "حجم العينة", unit: "mL" }, { id: "vb", label: "حجم قنينة BOD", unit: "mL", def: "300" }, { id: "b1", label: "DO البذرة الابتدائي B1 (اختياري)", unit: "mg/L" }, { id: "b2", label: "DO البذرة بعد 5 أيام B2", unit: "mg/L" }, { id: "fs", label: "نسبة البذرة f", unit: "" }],
    run(f) {
      const D1 = n(f.d1), D2 = n(f.d2), P = n(f.vs) / n(f.vb); if (![D1, D2, P].every(U.isNum) || P <= 0) return null;
      const seed = [n(f.b1), n(f.b2), n(f.fs)].every(U.isNum) ? (n(f.b1) - n(f.b2)) * n(f.fs) : 0;
      const bod = ((D1 - D2) - seed) / P, dep = D1 - D2;
      const ok = dep >= 2 && D2 >= 1;
      return { cards: [{ label: "BOD₅", value: f2(bod, 2), unit: "mg/L", tone: bod > 5 ? "warn" : "good", sub: bod > 5 ? "أعلى من 5 mg/L" : "" }, { label: "معامل التخفيف P", value: f2(P, 4) }, { label: "استنزاف الأكسجين", value: f2(dep, 2), unit: "mg/L", tone: ok ? "good" : "bad", sub: ok ? "النتيجة صالحة" : "خارج شروط الصلاحية" }], interp: ok ? "شروط APHA متحققة: الاستنزاف ≥ 2 mg/L وDO المتبقي ≥ 1 mg/L." : "<span class='bad'>النتيجة غير موثوقة:</span> يجب أن يكون الاستنزاف 2 mg/L على الأقل وأن يبقى 1 mg/L على الأقل بعد 5 أيام؛ غيّر نسبة التخفيف وأعد الاختبار." };
    },
    formula: "P = Vsample / Vbottle\nBOD₅ = [ (D1 − D2) − (B1 − B2)·f ] / P", refs: [REF.apha + " Method 5210 B."]
  });

  C.push({
    id: "cod", cat: "lab", title: "المتطلب الكيميائي للأكسجين COD", en: "COD dichromate titration",
    desc: "حساب COD بطريقة الارتداد بثنائي الكرومات والتسحيح بكبريتات الحديدوز الأمونيومية (FAS).",
    fields: [{ id: "a", label: "حجم FAS للبلانك A", unit: "mL" }, { id: "b", label: "حجم FAS للعينة B", unit: "mL" }, { id: "m", label: "مولارية FAS", unit: "M" }, { id: "v", label: "حجم العينة", unit: "mL" }, { id: "bod", label: "BOD₅ (اختياري للنسبة)", unit: "mg/L" }],
    run(f) {
      const A = n(f.a), B = n(f.b), M = n(f.m), V = n(f.v); if (![A, B, M, V].every(U.isNum) || V <= 0) return null;
      const cod = (A - B) * M * 8000 / V, bod = n(f.bod), r = U.isNum(bod) && cod > 0 ? bod / cod : NaN;
      const rb = U.isNum(r) ? (r > 0.5 ? ["قابلة للتحلل الحيوي بسهولة", "good"] : r >= 0.3 ? ["قابلة للتحلل الحيوي بدرجة متوسطة", "warn"] : ["صعبة التحلل الحيوي", "bad"]) : null;
      return { cards: [{ label: "COD", value: f2(cod, 1), unit: "mg/L" }].concat(rb ? [{ label: "BOD/COD", value: f2(r, 2), sub: rb[0], tone: rb[1] }] : []), interp: rb ? `نسبة BOD/COD = ${f2(r, 2)}: المياه ${rb[0]}؛ ${r >= 0.3 ? "المعالجة البيولوجية مناسبة." : "يُنصح بمعالجة أولية كيميائية أو فيزيائية قبل المعالجة البيولوجية."}` : "أدخل BOD₅ لمعرفة قابلية التحلل الحيوي." };
    },
    formula: "COD (mg O₂/L) = (A − B) × M × 8000 / Vsample", refs: [REF.apha + " Method 5220 C."]
  });

  C.push({
    id: "dosat", cat: "lab", title: "تشبع الأكسجين المذاب", en: "DO saturation",
    desc: "تركيز DO عند التشبع حسب الحرارة والارتفاع، ونسبة التشبع لقراءتك.",
    fields: [{ id: "t", label: "حرارة الماء", unit: "°C" }, { id: "alt", label: "الارتفاع عن سطح البحر", unit: "m", def: "110" }, { id: "do", label: "DO المقاس (اختياري)", unit: "mg/L" }],
    run(f) {
      const T = n(f.t); if (!U.isNum(T)) return null;
      const Tk = T + 273.15, lnC = -139.34411 + 1.575701e5 / Tk - 6.642308e7 / Tk ** 2 + 1.2438e10 / Tk ** 3 - 8.621949e11 / Tk ** 4;
      const P = Math.pow(1 - 2.25577e-5 * (n(f.alt) || 0), 5.25588), Cs = Math.exp(lnC) * P, DO = n(f.do), pct = DO / Cs * 100;
      return { cards: [{ label: "DO عند التشبع", value: f2(Cs, 2), unit: "mg/L" }, { label: "ضغط نسبي", value: f2(P, 3), unit: "atm" }].concat(U.isNum(DO) ? [{ label: "نسبة التشبع", value: f2(pct, 1), unit: "%", tone: pct < 60 ? "bad" : pct > 120 ? "warn" : "good", sub: pct < 60 ? "نقص أكسجين" : pct > 120 ? "فوق التشبع (نشاط طحلبي؟)" : "طبيعي" }] : []), interp: U.isNum(DO) ? `الماء مشبع بنسبة ${f2(pct, 0)}%. ${pct > 120 ? "فرط التشبع نهاراً قد يدل على تمثيل ضوئي كثيف للطحالب." : ""}` : "" };
    },
    formula: "ln C* = −139.34411 + 1.575701×10⁵/T − 6.642308×10⁷/T² + 1.2438×10¹⁰/T³ − 8.621949×10¹¹/T⁴   (T بالكلفن)\nP = (1 − 2.25577×10⁻⁵·h)^5.25588          C*p = C*·P", refs: [REF.bk]
  });

  C.push({
    id: "winkler", cat: "lab", title: "الأكسجين المذاب بطريقة ونكلر", en: "Winkler titration",
    fields: [{ id: "v", label: "حجم الثايوسلفات المستهلك", unit: "mL" }, { id: "nn", label: "عيارية الثايوسلفات", unit: "N", def: "0.025" }, { id: "vs", label: "حجم العينة المسحَّحة", unit: "mL", def: "200" }],
    desc: "تحويل حجم الثايوسلفات المستهلك إلى تركيز الأكسجين المذاب.",
    run(f) { const V = n(f.v), N = n(f.nn), Vs = n(f.vs); if (![V, N, Vs].every(U.isNum) || Vs <= 0) return null; const DO = V * N * 8000 / Vs; return { cards: [{ label: "DO", value: f2(DO, 2), unit: "mg/L", tone: DO < 5 ? "bad" : "good", sub: DO < 5 ? "أقل من 5 mg/L" : "مناسب للحياة المائية" }] }; },
    formula: "DO (mg/L) = V × N × 8000 / Vsample", refs: [REF.apha + " Method 4500-O C."]
  });

  C.push({
    id: "solids", cat: "lab", title: "المواد الصلبة الوزنية TSS / TDS", en: "Gravimetric solids",
    fields: [{ id: "a", label: "وزن المرشح أو الجفنة مع المتبقي A", unit: "mg" }, { id: "b", label: "وزن المرشح أو الجفنة فارغاً B", unit: "mg" }, { id: "v", label: "حجم العينة", unit: "mL" }],
    desc: "حساب المواد الصلبة العالقة أو الذائبة من الوزن.",
    run(f) { const A = n(f.a), B = n(f.b), V = n(f.v); if (![A, B, V].every(U.isNum) || V <= 0) return null; const s = (A - B) * 1000 / V; return { cards: [{ label: "التركيز", value: f2(s, 1), unit: "mg/L" }], interp: "TSS: ترشيح على مرشح زجاجي وتجفيف عند 103–105°م. TDS: تبخير الراشح وتجفيف عند 180°م." }; },
    formula: "Solids (mg/L) = (A − B) × 1000 / Vsample", refs: [REF.apha + " Methods 2540 C, D."]
  });

  C.push({
    id: "dilution", cat: "lab", title: "التخفيف C₁V₁ = C₂V₂", en: "Dilution",
    desc: "اترك حقلاً واحداً فارغاً ليُحسب من الثلاثة الأخرى.",
    fields: [{ id: "c1", label: "C₁ تركيز المحلول الأصلي" }, { id: "v1", label: "V₁ الحجم المأخوذ" }, { id: "c2", label: "C₂ التركيز المطلوب" }, { id: "v2", label: "V₂ الحجم النهائي" }],
    run(f) {
      const v = { c1: n(f.c1), v1: n(f.v1), c2: n(f.c2), v2: n(f.v2) }, miss = Object.keys(v).filter(k => !U.isNum(v[k]));
      if (miss.length !== 1) return null;
      const k = miss[0], r = k === "c1" ? v.c2 * v.v2 / v.v1 : k === "v1" ? v.c2 * v.v2 / v.c1 : k === "c2" ? v.c1 * v.v1 / v.v2 : v.c1 * v.v1 / v.c2;
      const lbl = { c1: "C₁", v1: "V₁", c2: "C₂", v2: "V₂" }[k];
      return { cards: [{ label: lbl, value: f2(r, 4) }], interp: k === "v1" ? `خذ ${f2(r, 3)} من المحلول الأصلي وأكمل الحجم إلى ${v.v2} بالماء المقطر.` : "" };
    },
    formula: "C₁ × V₁ = C₂ × V₂", refs: [REF.apha]
  });

  C.push({
    id: "molar", cat: "lab", title: "تحضير المحاليل القياسية", en: "Solution preparation",
    desc: "الكتلة اللازمة لتحضير محلول بمولارية معينة، أو محلول قياسي بتركيز ppm من ملح.",
    fields: [{ id: "mode", label: "النوع", type: "select", opts: [["M", "مولارية (mol/L)"], ["ppm", "تركيز العنصر mg/L من ملح"]], def: "M" }, { id: "c", label: "التركيز المطلوب (M أو mg/L)" }, { id: "v", label: "الحجم", unit: "mL" }, { id: "mw", label: "الكتلة المولية للملح", unit: "g/mol" }, { id: "aw", label: "الكتلة الذرية للعنصر (لوضع ppm)", unit: "g/mol" }, { id: "nel", label: "عدد ذرات العنصر في الصيغة", def: "1" }, { id: "pur", label: "نقاوة الملح", unit: "%", def: "100" }],
    run(f) {
      const c = n(f.c), V = n(f.v) / 1000, MW = n(f.mw), pur = (n(f.pur) || 100) / 100; if (![c, V, MW].every(U.isNum)) return null;
      let g;
      if (f.mode === "ppm") { const AW = n(f.aw), k = n(f.nel) || 1; if (!U.isNum(AW)) return null; g = c * V / 1000 * MW / (AW * k) / pur; }
      else g = c * V * MW / pur;
      return { cards: [{ label: "الكتلة اللازمة", value: f2(g, 4), unit: "g" }, { label: "بالمليغرام", value: f2(g * 1000, 2), unit: "mg" }], interp: `أذب ${f2(g, 4)} غ في ماء مقطر وأكمل الحجم إلى ${n(f.v)} مل في قنينة حجمية.` };
    },
    formula: "m (g) = M × V(L) × MW / purity\nm (g) = C(mg/L) × V(L) / 1000 × MW / (n × AW) / purity", refs: [REF.apha]
  });

  C.push({
    id: "stdcurve", cat: "lab", title: "منحنى المعايرة (المطياف الضوئي)", en: "Calibration curve – Beer–Lambert",
    desc: "أدخل تراكيز المحاليل القياسية وامتصاصيتها لتحصل على معادلة الخط وتركيز العينة المجهولة.",
    fields: [{ id: "abs", label: "امتصاصية العينة المجهولة" }, { id: "df", label: "معامل التخفيف", def: "1" }],
    table: { cols: [{ id: "c", label: "التركيز القياسي" }, { id: "a", label: "الامتصاصية" }], rows: [["", ""], ["", ""], ["", ""], ["", ""], ["", ""]] },
    run(f, rows) {
      const P = rows.map(r => [n(r.c), n(r.a)]).filter(p => p.every(U.isNum)); if (P.length < 2) return null;
      const L = linreg(P.map(p => p[0]), P.map(p => p[1])), A = n(f.abs), df = n(f.df) || 1, x = U.isNum(A) ? (A - L.intercept) / L.slope * df : NaN;
      const xs = P.map(p => p[0]), mn = Math.min(...xs), mx = Math.max(...xs);
      return {
        cards: [{ label: "الميل", value: sci(L.slope) }, { label: "المقطع", value: sci(L.intercept) }, { label: "R²", value: f2(L.r2, 4), tone: L.r2 >= 0.995 ? "good" : L.r2 >= 0.98 ? "warn" : "bad", sub: L.r2 >= 0.995 ? "خطية ممتازة" : "راجع المحاليل القياسية" }].concat(U.isNum(x) ? [{ label: "تركيز العينة", value: f2(x, 4), tone: "info", sub: (x / df < mn || x / df > mx) ? "خارج مدى المعايرة!" : "ضمن مدى المعايرة" }] : []),
        chart: { type: "scatter", data: { datasets: [{ label: "المحاليل القياسية", data: P.map(p => ({ x: p[0], y: p[1] })), backgroundColor: ECO.COL.river, pointRadius: 5 }, { type: "line", label: "خط الانحدار", data: [{ x: mn, y: L.intercept + L.slope * mn }, { x: mx, y: L.intercept + L.slope * mx }], borderColor: ECO.COL.chloro, borderWidth: 2, pointRadius: 0 }].concat(U.isNum(x) ? [{ label: "العينة", data: [{ x: x / df, y: A }], backgroundColor: ECO.COL.silt, pointRadius: 7, pointStyle: "rectRot" }] : []) }, options: { plugins: { legend: { position: "bottom" } }, scales: { x: { type: "linear", title: { display: true, text: "التركيز" } }, y: { title: { display: true, text: "الامتصاصية" } } } } },
        interp: `y = ${sci(L.slope)}·x ${L.intercept >= 0 ? "+" : "−"} ${sci(Math.abs(L.intercept))}`
      };
    },
    formula: "A = ε·b·C  →  A = m·C + c\nC = (A − c) / m × DF", refs: [REF.apha]
  });

  C.push({
    id: "ammonia", cat: "lab", title: "الأمونيا غير المتأينة السامة", en: "Un-ionized ammonia (NH₃)",
    desc: "نسبة NH₃ السامة للأسماك من الأمونيا الكلية حسب pH والحرارة.",
    fields: [{ id: "tan", label: "الأمونيا الكلية (TAN) كنيتروجين", unit: "mg N/L" }, { id: "ph", label: "pH" }, { id: "t", label: "الحرارة", unit: "°C" }],
    run(f) { const TAN = n(f.tan), pH = n(f.ph), T = n(f.t); if (![TAN, pH, T].every(U.isNum)) return null; const pKa = 0.09018 + 2729.92 / (T + 273.15), fr = 1 / (Math.pow(10, pKa - pH) + 1), nh3 = TAN * fr * 17 / 14; return { cards: [{ label: "النسبة غير المتأينة", value: f2(fr * 100, 2), unit: "%" }, { label: "NH₃", value: f2(nh3, 4), unit: "mg/L", tone: nh3 > 0.02 ? "bad" : "good", sub: nh3 > 0.02 ? "أعلى من 0.02 mg/L الحد الشائع لحماية الأسماك" : "دون 0.02 mg/L" }, { label: "pKa", value: f2(pKa, 3) }] }; },
    formula: "pKa = 0.09018 + 2729.92 / T(K)\nf = 1 / (10^(pKa − pH) + 1)\nNH₃ (mg/L) = TAN × f × 17/14", refs: [REF.emerson]
  });

  C.push({
    id: "kinetics", cat: "bio", title: "حركية المعالجة الحيوية (رتبة أولى)", en: "First-order biodegradation",
    desc: "نسبة الإزالة وثابت معدل التحلل وعمر النصف، أو ملاءمة سلسلة زمنية من القياسات.",
    fields: [{ id: "c0", label: "التركيز الابتدائي C₀" }, { id: "ct", label: "التركيز بعد زمن t" }, { id: "t", label: "الزمن t", unit: "يوم" }, { id: "ctar", label: "التركيز المستهدف (اختياري)" }],
    table: { cols: [{ id: "t", label: "الزمن (يوم)" }, { id: "c", label: "التركيز" }], rows: [["", ""], ["", ""], ["", ""], ["", ""]] },
    run(f, rows) {
      const P = rows.map(r => [n(r.t), n(r.c)]).filter(p => p.every(U.isNum) && p[1] > 0);
      let k, c0 = n(f.c0), ct = n(f.ct), t = n(f.t), fit = null;
      if (P.length >= 3) { fit = linreg(P.map(p => p[0]), P.map(p => Math.log(p[1]))); k = -fit.slope; c0 = Math.exp(fit.intercept); }
      else { if (![c0, ct, t].every(U.isNum) || t <= 0 || ct <= 0) return null; k = Math.log(c0 / ct) / t; }
      const half = Math.log(2) / k, tar = n(f.ctar), tt = U.isNum(tar) && tar > 0 ? Math.log(c0 / tar) / k : NaN;
      const rem = U.isNum(ct) && U.isNum(n(f.c0)) ? (n(f.c0) - ct) / n(f.c0) * 100 : P.length >= 2 ? (P[0][1] - P[P.length - 1][1]) / P[0][1] * 100 : NaN;
      const tmax = P.length ? Math.max(...P.map(p => p[0])) : t * 1.5;
      const curve = Array.from({ length: 30 }, (_, i) => { const x = tmax * i / 29; return { x, y: c0 * Math.exp(-k * x) }; });
      return {
        cards: [{ label: "ثابت المعدل k", value: f2(k, 4), unit: "يوم⁻¹" }, { label: "عمر النصف t½", value: f2(half, 2), unit: "يوم" }, { label: "نسبة الإزالة", value: f2(rem, 1), unit: "%", tone: rem >= 80 ? "good" : rem >= 50 ? "warn" : "bad" }].concat(U.isNum(tt) ? [{ label: "زمن الوصول للهدف", value: f2(tt, 1), unit: "يوم", tone: "info" }] : []).concat(fit ? [{ label: "R² للملاءمة", value: f2(fit.r2, 4) }] : []),
        chart: { type: "scatter", data: { datasets: [{ type: "line", label: "نموذج الرتبة الأولى", data: curve, borderColor: ECO.COL.chloro, borderWidth: 2, pointRadius: 0 }].concat(P.length ? [{ label: "القياسات", data: P.map(p => ({ x: p[0], y: p[1] })), backgroundColor: ECO.COL.silt, pointRadius: 5 }] : []) }, options: { plugins: { legend: { position: "bottom" } }, scales: { x: { type: "linear", title: { display: true, text: "الزمن (يوم)" } }, y: { beginAtZero: true, title: { display: true, text: "التركيز" } } } } },
        interp: `ينخفض التركيز إلى النصف كل ${f2(half, 1)} يوم تقريباً.`
      };
    },
    formula: "C = C₀·e^(−k·t)      k = ln(C₀/C) / t      t½ = ln2 / k\nRemoval % = (C₀ − C) / C₀ × 100", refs: ["Alexander, M. (1999). Biodegradation and Bioremediation, 2nd ed. Academic Press."]
  });

  C.push({
    id: "growth", cat: "bio", title: "النمو الميكروبي", en: "Microbial growth kinetics",
    desc: "عدد الأجيال وزمن الجيل ومعدل النمو النوعي من أعداد الخلايا (CFU).",
    fields: [{ id: "n0", label: "العدد الابتدائي N₀", unit: "CFU/mL" }, { id: "nt", label: "العدد بعد زمن t", unit: "CFU/mL" }, { id: "t", label: "الزمن", unit: "ساعة" }],
    run(f) { const N0 = n(f.n0), Nt = n(f.nt), t = n(f.t); if (![N0, Nt, t].every(U.isNum) || N0 <= 0 || Nt <= 0 || t <= 0) return null; const g = (Math.log10(Nt) - Math.log10(N0)) / Math.log10(2); return { cards: [{ label: "عدد الأجيال n", value: f2(g, 2) }, { label: "زمن الجيل g", value: f2(t / g, 2), unit: "ساعة" }, { label: "معدل النمو النوعي µ", value: f2(Math.log(Nt / N0) / t, 4), unit: "ساعة⁻¹" }] }; },
    formula: "n = (log Nt − log N₀) / log 2      g = t / n      µ = ln(Nt/N₀) / t", refs: ["Madigan, M.T., et al. (2018). Brock Biology of Microorganisms, 15th ed."]
  });

  C.push({
    id: "biosorption", cat: "bio", title: "الامتصاص الحيوي ونماذج الأيزوثيرم", en: "Biosorption – Langmuir & Freundlich",
    desc: "سعة الامتصاص ونسبة الإزالة، وملاءمة نموذجي لانكماير وفرندلش من بيانات التوازن.",
    fields: [{ id: "c0", label: "التركيز الابتدائي C₀", unit: "mg/L" }, { id: "ce", label: "تركيز التوازن Ce", unit: "mg/L" }, { id: "v", label: "حجم المحلول", unit: "L" }, { id: "m", label: "كتلة المادة الماصة", unit: "g" }],
    table: { cols: [{ id: "ce", label: "Ce (mg/L)" }, { id: "qe", label: "qe (mg/g)" }], rows: [["", ""], ["", ""], ["", ""], ["", ""], ["", ""]] },
    run(f, rows) {
      const C0 = n(f.c0), Ce = n(f.ce), V = n(f.v), m = n(f.m), out = { cards: [] };
      if ([C0, Ce, V, m].every(U.isNum) && m > 0) { out.cards.push({ label: "سعة الامتصاص qe", value: f2((C0 - Ce) * V / m, 3), unit: "mg/g" }, { label: "نسبة الإزالة", value: f2((C0 - Ce) / C0 * 100, 1), unit: "%" }); }
      const P = rows.map(r => [n(r.ce), n(r.qe)]).filter(p => p.every(U.isNum) && p[0] > 0 && p[1] > 0);
      if (P.length >= 3) {
        const Lg = linreg(P.map(p => p[0]), P.map(p => p[0] / p[1])), qmax = 1 / Lg.slope, KL = Lg.slope / Lg.intercept;
        const Fr = linreg(P.map(p => Math.log10(p[0])), P.map(p => Math.log10(p[1]))), KF = Math.pow(10, Fr.intercept), nF = 1 / Fr.slope, RL = U.isNum(C0) ? 1 / (1 + KL * C0) : NaN;
        out.cards.push({ label: "لانكماير qmax", value: f2(qmax, 3), unit: "mg/g" }, { label: "KL", value: f2(KL, 4), unit: "L/mg" }, { label: "R² لانكماير", value: f2(Lg.r2, 4), tone: Lg.r2 >= Fr.r2 ? "good" : "none" }, { label: "فرندلش KF", value: f2(KF, 3) }, { label: "n", value: f2(nF, 3), sub: nF > 1 ? "امتصاص ملائم" : "غير ملائم" }, { label: "R² فرندلش", value: f2(Fr.r2, 4), tone: Fr.r2 > Lg.r2 ? "good" : "none" });
        if (U.isNum(RL)) out.cards.push({ label: "معامل الفصل RL", value: f2(RL, 4), sub: RL > 0 && RL < 1 ? "امتصاص ملائم (0<RL<1)" : "غير ملائم" });
        const xs = P.map(p => p[0]), mx = Math.max(...xs), cv = Array.from({ length: 30 }, (_, i) => (mx * (i + 1)) / 30);
        out.chart = { type: "scatter", data: { datasets: [{ label: "بيانات التوازن", data: P.map(p => ({ x: p[0], y: p[1] })), backgroundColor: ECO.COL.silt, pointRadius: 5 }, { type: "line", label: "لانكماير", data: cv.map(x => ({ x, y: qmax * KL * x / (1 + KL * x) })), borderColor: ECO.COL.river, pointRadius: 0, borderWidth: 2 }, { type: "line", label: "فرندلش", data: cv.map(x => ({ x, y: KF * Math.pow(x, 1 / nF) })), borderColor: ECO.COL.chloro, borderDash: [5, 4], pointRadius: 0, borderWidth: 2 }] }, options: { plugins: { legend: { position: "bottom" } }, scales: { x: { type: "linear", title: { display: true, text: "Ce (mg/L)" } }, y: { title: { display: true, text: "qe (mg/g)" } } } } };
        const Tk = linreg(P.map(p => Math.log(p[0])), P.map(p => p[1])), BT = Tk.slope, KT = Math.exp(Tk.intercept / Tk.slope), bT = 8.314 * 298.15 / BT;
        out.cards.push({ label: "تمكن KT", value: f2(KT, 4), unit: "L/mg" }, { label: "تمكن bT", value: f2(bT, 1), unit: "J/mol", sub: "حرارة الامتصاص عند 25°م" }, { label: "R² تمكن", value: f2(Tk.r2, 4), tone: Tk.r2 > Math.max(Lg.r2, Fr.r2) ? "good" : "none" });
        out.chart.data.datasets.push({ type: "line", label: "تمكن", data: cv.map(x => ({ x, y: BT * Math.log(KT * x) })), borderColor: ECO.COL.violet, borderDash: [2, 3], pointRadius: 0, borderWidth: 2 });
        const best = [["لانكماير (امتصاص بطبقة أحادية على مواقع متجانسة)", Lg.r2], ["فرندلش (سطح غير متجانس متعدد الطبقات)", Fr.r2], ["تمكن (تتناقص حرارة الامتصاص خطياً مع التغطية)", Tk.r2]].sort((x, y) => y[1] - x[1])[0];
        out.interp = `النموذج الأنسب بحسب R²: <b>${best[0]}</b>. قارن أيضاً بالمعنى الفيزيائي، ولا تعتمد على R² وحده عند تقارب القيم.`;
      }
      return out.cards.length ? out : null;
    },
    formula: "qe = (C₀ − Ce)·V / m          R% = (C₀ − Ce)/C₀ × 100\nLangmuir: Ce/qe = 1/(qmax·KL) + Ce/qmax          RL = 1/(1 + KL·C₀)\nFreundlich: log qe = log KF + (1/n)·log Ce\nTemkin: qe = BT·ln KT + BT·ln Ce      bT = RT / BT", refs: [REF.langmuir, "Temkin, M.J., Pyzhev, V. (1940). Acta Physicochim. URSS 12: 217–222."]
  });

  /* ملاءمة غير خطية بطريقة ليفنبرغ–ماركوارت لنموذج بمعاملين */
  function lm2(f, xs, ys, p0) {
    let p = p0.slice(), lam = 1e-3;
    const sse = q => xs.reduce((s, x, i) => s + (ys[i] - f(x, q)) ** 2, 0);
    let cur = sse(p);
    for (let it = 0; it < 200; it++) {
      const J = xs.map(x => p.map((v, k) => { const h = Math.max(1e-8, Math.abs(v) * 1e-6), q = p.slice(); q[k] += h; return (f(x, q) - f(x, p)) / h; }));
      const r = xs.map((x, i) => ys[i] - f(x, p));
      const A = [[0, 0], [0, 0]], g = [0, 0];
      J.forEach((j, i) => { for (let a = 0; a < 2; a++) { g[a] += j[a] * r[i]; for (let b = 0; b < 2; b++) A[a][b] += j[a] * j[b]; } });
      let improved = false;
      for (let t = 0; t < 10; t++) {
        const M = [[A[0][0] * (1 + lam), A[0][1]], [A[1][0], A[1][1] * (1 + lam)]], det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
        if (Math.abs(det) < 1e-300) { lam *= 10; continue; }
        const d = [(g[0] * M[1][1] - g[1] * M[0][1]) / det, (M[0][0] * g[1] - M[1][0] * g[0]) / det], q = [p[0] + d[0], p[1] + d[1]], s2 = sse(q);
        if (isFinite(s2) && s2 < cur) { p = q; cur = s2; lam = Math.max(1e-12, lam / 10); improved = true; break; } else lam *= 10;
      }
      if (!improved || cur < 1e-18) break;
    }
    const my = U.mean(ys), sst = ys.reduce((s, y) => s + (y - my) ** 2, 0), n = xs.length;
    return { p, sse: cur, r2: 1 - cur / sst, rmse: Math.sqrt(cur / n), aic: n * Math.log(cur / n) + 4 };
  }

  C.push({
    id: "adskin", cat: "bio", title: "حركية الامتصاص (الرتبة الأولى والثانية الكاذبة)", en: "Adsorption kinetics – PFO · PSO · Elovich · IPD",
    desc: "ملاءمة غير خطية لنموذجي الرتبة الأولى والثانية الكاذبة، ونموذجي إيلوفيتش والانتشار داخل الجسيمات، من قياسات qt عبر الزمن.",
    fields: [{ id: "qe", label: "qe التجريبية عند التوازن (اختياري)", unit: "mg/g" }],
    table: { cols: [{ id: "t", label: "الزمن t (دقيقة)" }, { id: "q", label: "qt (mg/g)" }], rows: [["", ""], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""]] },
    run(f, rows) {
      const P = rows.map(r => [n(r.t), n(r.q)]).filter(p => p.every(U.isNum) && p[0] > 0 && p[1] >= 0).sort((a, b) => a[0] - b[0]);
      if (P.length < 4) return null;
      const t = P.map(p => p[0]), q = P.map(p => p[1]), qmax = Math.max(...q), qeExp = n(f.qe);
      const pfo = lm2((x, p) => p[0] * (1 - Math.exp(-p[1] * x)), t, q, [qmax, 1 / U.mean(t)]);
      const pso = lm2((x, p) => p[1] * p[0] * p[0] * x / (1 + p[1] * p[0] * x), t, q, [qmax * 1.1, 1 / (qmax * U.mean(t))]);
      const el = linreg(t.map(Math.log), q), beta = 1 / el.slope, alpha = Math.exp(el.intercept / el.slope) / beta;
      const ipd = linreg(t.map(Math.sqrt), q);
      const M = [["الرتبة الأولى الكاذبة (PFO)", pfo.r2, pfo.aic], ["الرتبة الثانية الكاذبة (PSO)", pso.r2, pso.aic]].sort((a, b) => a[2] - b[2]);
      const tm = Math.max(...t), cv = Array.from({ length: 40 }, (_, i) => tm * (i + 1) / 40);
      return {
        cards: [
          { label: "PFO: qe", value: f2(pfo.p[0], 3), unit: "mg/g" }, { label: "PFO: k₁", value: sci(pfo.p[1]), unit: "min⁻¹" }, { label: "PFO: R²", value: f2(pfo.r2, 4), tone: pfo.aic <= pso.aic ? "good" : "none" },
          { label: "PSO: qe", value: f2(pso.p[0], 3), unit: "mg/g" }, { label: "PSO: k₂", value: sci(pso.p[1]), unit: "g/mg·min" }, { label: "PSO: R²", value: f2(pso.r2, 4), tone: pso.aic < pfo.aic ? "good" : "none" },
          { label: "إيلوفيتش β", value: f2(beta, 4), unit: "g/mg", sub: `R² ${f2(el.r2, 3)}` }, { label: "الانتشار kid", value: f2(ipd.slope, 4), unit: "mg/g·min^0.5", sub: `C = ${f2(ipd.intercept, 3)} · R² ${f2(ipd.r2, 3)}` }
        ].concat(U.isNum(qeExp) ? [{ label: "qe التجريبية مقابل المحسوبة", value: `${f2(qeExp, 2)} / ${f2(pso.aic < pfo.aic ? pso.p[0] : pfo.p[0], 2)}`, unit: "mg/g" }] : []),
        table: { head: ["النموذج", "المعاملات", "R²", "RMSE", "AIC"], rows: [
          ["PFO", `qe = ${f2(pfo.p[0], 3)}، k₁ = ${sci(pfo.p[1])}`, f2(pfo.r2, 4), f2(pfo.rmse, 4), f2(pfo.aic, 2)],
          ["PSO", `qe = ${f2(pso.p[0], 3)}، k₂ = ${sci(pso.p[1])}`, f2(pso.r2, 4), f2(pso.rmse, 4), f2(pso.aic, 2)],
          ["Elovich", `α = ${sci(alpha)}، β = ${f2(beta, 4)}`, f2(el.r2, 4), "—", "—"],
          ["IPD", `kid = ${f2(ipd.slope, 4)}، C = ${f2(ipd.intercept, 3)}`, f2(ipd.r2, 4), "—", "—"]] },
        chart: { type: "scatter", data: { datasets: [{ label: "القياسات", data: P.map(p => ({ x: p[0], y: p[1] })), backgroundColor: ECO.COL.silt, pointRadius: 5 },
          { type: "line", label: "PFO", data: cv.map(x => ({ x, y: pfo.p[0] * (1 - Math.exp(-pfo.p[1] * x)) })), borderColor: ECO.COL.river, pointRadius: 0, borderWidth: 2 },
          { type: "line", label: "PSO", data: cv.map(x => ({ x, y: pso.p[1] * pso.p[0] ** 2 * x / (1 + pso.p[1] * pso.p[0] * x) })), borderColor: ECO.COL.chloro, borderDash: [5, 4], pointRadius: 0, borderWidth: 2 }] },
          options: { plugins: { legend: { position: "bottom" } }, scales: { x: { type: "linear", title: { display: true, text: "t (min)" } }, y: { beginAtZero: true, title: { display: true, text: "qt (mg/g)" } } } } },
        interp: `الأنسب بمعيار AIC (يعاقب التعقيد): <b>${M[0][0]}</b>. الملاءمة غير خطية مباشرة على qt، وهي أصح من الصيغ الخطية التي تشوّه الأخطاء. ${ipd.intercept > 0.05 * qmax ? "تقاطع الانتشار داخل الجسيمات لا يساوي صفراً، فالانتشار ليس الخطوة الوحيدة المحددة للسرعة." : "خط الانتشار يمر قرب الأصل، فقد يكون الانتشار داخل الجسيمات هو المحدد للسرعة."}`
      };
    },
    formula: "PFO: qt = qe·(1 − e^(−k₁t))\nPSO: qt = k₂·qe²·t / (1 + k₂·qe·t)\nElovich: qt = (1/β)·ln(αβ) + (1/β)·ln t\nIPD: qt = kid·t^0.5 + C",
    refs: ["Lagergren, S. (1898). K. Sven. Vetenskapsakad. Handl. 24: 1–39.", "Ho, Y.S., McKay, G. (1999). Process Biochem. 34: 451–465.", "Weber, W.J., Morris, J.C. (1963). J. Sanit. Eng. Div. ASCE 89: 31–60.", "Tran, H.N., et al. (2017). Water Res. 120: 88–116 (أخطاء الملاءمة الخطية)."]
  });

  C.push({
    id: "wetland", cat: "bio", title: "تصميم أرض رطبة مصنَّعة لمعالجة مياه قرية", en: "Constructed wetland sizing (SSF / FWS)",
    desc: "مساحة الحوض اللازمة لخفض BOD إلى الهدف بنموذج الرتبة الأولى المصحَّح بالحرارة، مع فحص الجريان الهيدروليكي وعدد المستفيدين.",
    fields: [{ id: "type", label: "النوع", type: "select", opts: [["ssf", "جريان تحت السطح أفقي (حصى + قصب)"], ["fws", "جريان سطحي حر"]], def: "ssf" },
      { id: "pop", label: "عدد السكان (اختياري)", unit: "نسمة" }, { id: "lpcd", label: "استهلاك الفرد", unit: "لتر/يوم", def: "150" },
      { id: "q", label: "أو التصريف مباشرة Q", unit: "m³/يوم" }, { id: "c0", label: "BOD الداخل C₀", unit: "mg/L", def: "200" }, { id: "ce", label: "BOD المستهدف Ce", unit: "mg/L", def: "40" },
      { id: "t", label: "حرارة الماء في أبرد شهر", unit: "°C", def: "12" }, { id: "d", label: "عمق الماء d", unit: "m", def: "0.6" }, { id: "nn", label: "المسامية n", def: "0.35" },
      { id: "k20", label: "K₂₀ (اختياري)", unit: "يوم⁻¹" }],
    run(f) {
      const ssf = f.type !== "fws", pop = n(f.pop), lp = n(f.lpcd);
      const Q = U.isNum(n(f.q)) ? n(f.q) : U.isNum(pop) && U.isNum(lp) ? pop * lp * 0.8 / 1000 : NaN;   // 80% من الماء المستهلك يصبح صرفاً
      const C0 = n(f.c0), Ce = n(f.ce), T = n(f.t), d = n(f.d), por = ssf ? n(f.nn) : 0.75;
      if (![Q, C0, Ce, T, d, por].every(U.isNum) || Q <= 0 || Ce <= 0 || Ce >= C0) return null;
      const K20 = U.isNum(n(f.k20)) ? n(f.k20) : ssf ? 1.104 : 0.678, KT = K20 * Math.pow(1.06, T - 20);
      const t = Math.log(C0 / Ce) / KT, A = Q * t / (d * por), L2W = 3;
      const W = Math.sqrt(A / L2W), Lg = A / W;
      // فحص هيدروليكي (دارسي) للجريان تحت السطح: ks حصى 20 مم ≈ 10000 م/يوم، ميل 1%، نستعمل ثلث ks احتياطاً للانسداد
      const ks = 10000 / 3, S = 0.01, Ac = ssf ? Q / (ks * S) : NaN, Wmin = ssf ? Ac / d : NaN;
      const people = U.isNum(pop) ? pop : U.isNum(lp) ? Q * 1000 / (lp * 0.8) : NaN;
      return {
        cards: [{ label: "المساحة المطلوبة A", value: f2(A, 0), unit: "m²", tone: "info" }, { label: "زمن البقاء الهيدروليكي", value: f2(t, 2), unit: "يوم" },
          { label: "K عند الحرارة T", value: f2(KT, 3), unit: "يوم⁻¹" }, { label: "الأبعاد المقترحة (طول:عرض 3:1)", value: `${f2(Lg, 0)} × ${f2(W, 0)}`, unit: "m" },
          { label: "التصريف Q", value: f2(Q, 1), unit: "m³/يوم" }].concat(U.isNum(people) ? [{ label: "المساحة لكل شخص", value: f2(A / people, 2), unit: "m²/نسمة", sub: (A / people) > 10 ? "كبيرة: فكّر بمعالجة أولية أقوى" : (A / people) < 2 ? "أقل من المعتاد (2–10): معادلة الرتبة الأولى متفائلة، فخذ هامش أمان ×1.5–2" : "ضمن المدى المعتاد 2–10" }] : [])
          .concat(ssf ? [{ label: "أقل عرض لتمرير الجريان", value: f2(Wmin, 1), unit: "m", tone: Wmin > W ? "bad" : "good", sub: Wmin > W ? "العرض المقترح أقل من اللازم: وسّع الحوض" : "العرض المقترح كافٍ" }] : []),
        interp: `يخفض حوض ${ssf ? "الجريان تحت السطح" : "الجريان السطحي"} بمساحة ${f2(A, 0)} م² تركيز BOD من ${C0} إلى ${Ce} ملغم/لتر عند ${T}°م. صُمم على أبرد شهر لأن التحلل الحيوي أبطأ في البرد، فيعمل الحوض صيفاً بكفاءة أعلى. يُسبق دائماً بخزان ترسيب (سبتك) لإزالة المواد الصلبة. القصب Phragmites australis نبات محلي مناسب.`
      };
    },
    formula: "Q = السكان × استهلاك الفرد × 0.8\nK_T = K₂₀ · 1.06^(T − 20)      (SSF: K₂₀ = 1.104، FWS: K₂₀ = 0.678 يوم⁻¹)\nt = ln(C₀ / Ce) / K_T\nA = Q · t / (d · n)\nفحص دارسي: Ac = Q / (ks · S)",
    refs: ["Reed, S.C., Crites, R.W., Middlebrooks, E.J. (1995). Natural Systems for Waste Management and Treatment, 2nd ed. McGraw-Hill.", "US EPA (2000). Constructed Wetlands Treatment of Municipal Wastewaters. EPA/625/R-99/010.", "Kadlec, R.H., Wallace, S.D. (2009). Treatment Wetlands, 2nd ed. CRC Press."]
  });

  const phytoRows = st => { const r = ECO.RESEARCH.find(x => x.id === "baiji-2025"), sed = r.tables.find(t => t.id === "sed"), pl = r.tables.find(t => t.id === "plant"); return ["Pb", "Cu", "Cd", "Ni"].map(m => { const g = p => pl.rows.find(x => x[0] === `${m} – ${p}`)[st]; const s = sed.rows.find(x => x[0].startsWith(m))[st]; return [m, String(s), String(g("جذور")), String(+((g("سيقان") + g("أوراق")) / 2).toFixed(4))]; }); };
  C.push({
    id: "phyto", cat: "bio", title: "عوامل المعالجة النباتية", en: "BCF · BAC · TF",
    desc: "معامل التركيز الحيوي ومعامل التراكم الحيوي ومعامل الانتقال لتحديد صلاحية النبات للاستخلاص أو التثبيت.",
    table: { cols: [{ id: "m", label: "العنصر", type: "text" }, { id: "s", label: "التربة/الرواسب" }, { id: "r", label: "الجذور" }, { id: "sh", label: "المجموع الخضري" }], rows: [["Pb", "", "", ""], ["Cd", "", "", ""], ["Cu", "", "", ""], ["Ni", "", "", ""]] },
    presets: [1, 2, 3, 4, 5].map(st => ({ id: "baiji" + st, label: "القصب – قناة بيجي م" + st, rows: () => phytoRows(st), src: REF.baiji + " (المجموع الخضري = متوسط السيقان والأوراق)" })),
    run(f, rows) {
      const R = rows.map(r => ({ m: r.m, s: n(r.s), r: n(r.r), sh: n(r.sh) })).filter(r => [r.s, r.r, r.sh].every(U.isNum) && r.s > 0 && r.r > 0);
      if (!R.length) return null;
      const t = R.map(r => { const bcf = r.r / r.s, bac = r.sh / r.s, tf = r.sh / r.r; const st = tf > 1 && bac > 1 ? ["مرشح للاستخلاص النباتي", "good"] : bcf > 1 && tf < 1 ? ["مرشح للتثبيت النباتي", "info"] : tf > 1 ? ["ينقل العنصر للأجزاء الهوائية", "fair"] : ["تراكم منخفض (Excluder)", "none"]; return { m: r.m, bcf, bac, tf, st }; });
      return {
        cards: t.map(x => ({ label: x.m + " – TF", value: f2(x.tf, 3), sub: x.st[0], tone: x.st[1] })),
        table: { head: ["العنصر", "BCF (جذر/تربة)", "BAC (خضري/تربة)", "TF (خضري/جذر)", "التفسير"], rows: t.map(x => [x.m, f2(x.bcf, 3), f2(x.bac, 3), f2(x.tf, 3), x.st[0]]) },
        chart: { type: "bar", data: { labels: t.map(x => x.m), datasets: [{ label: "BCF", data: t.map(x => x.bcf), backgroundColor: ECO.COL.silt + "cc", borderRadius: 4 }, { label: "BAC", data: t.map(x => x.bac), backgroundColor: ECO.COL.river + "cc", borderRadius: 4 }, { label: "TF", data: t.map(x => x.tf), backgroundColor: ECO.COL.chloro + "cc", borderRadius: 4 }] }, options: { plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true } } } },
        interp: "TF > 1 يعني أن النبات ينقل العنصر من الجذور إلى السيقان والأوراق (مفيد للاستخلاص النباتي بالحصاد)، وBCF > 1 مع TF < 1 يعني احتجاز العنصر في الجذور (تثبيت نباتي)."
      };
    },
    formula: "BCF = C(root) / C(soil)      BAC = C(shoot) / C(soil)      TF = C(shoot) / C(root)", refs: [REF.baker, "Yoon, J., et al. (2006). Sci. Total Environ. 368: 456–464."]
  });

  const removalRows = () => { const t = ECO.RESEARCH.find(x => x.id === "baiji-2025").tables.find(x => x.id === "water"); return t.rows.filter(r => !/pH/.test(r[0])).map(r => [r[0], String(r[1]), String(r[5])]); };
  C.push({
    id: "removal", cat: "bio", title: "كفاءة المعالجة ونسبة الإزالة", en: "Treatment efficiency",
    desc: "نسبة إزالة كل ملوث بين نقطتين (قبل/بعد المعالجة، أو بداية القناة/نهايتها).",
    table: { cols: [{ id: "p", label: "المتغير", type: "text" }, { id: "a", label: "قبل" }, { id: "b", label: "بعد" }], rows: [["", "", ""], ["", "", ""], ["", "", ""]] },
    presets: [{ id: "baiji", label: "قناة بيجي: م1 ← م5", rows: removalRows, src: REF.baiji }],
    run(f, rows) {
      const R = rows.map(r => ({ p: r.p, a: n(r.a), b: n(r.b) })).filter(r => U.isNum(r.a) && U.isNum(r.b) && r.a > 0); if (!R.length) return null;
      const t = R.map(r => ({ ...r, e: (r.a - r.b) / r.a * 100 })), avg = U.mean(t.map(x => x.e));
      return {
        cards: [{ label: "متوسط نسبة الإزالة", value: f2(avg, 1), unit: "%", tone: avg >= 70 ? "good" : avg >= 40 ? "warn" : "bad" }, { label: "الأعلى", value: t.slice().sort((a, b) => b.e - a.e)[0].p }, { label: "الأدنى", value: t.slice().sort((a, b) => a.e - b.e)[0].p }],
        table: { head: ["المتغير", "قبل", "بعد", "الإزالة %"], rows: t.map(x => [x.p, x.a, x.b, f2(x.e, 1)]) },
        chart: { type: "bar", data: { labels: t.map(x => x.p), datasets: [{ data: t.map(x => x.e), backgroundColor: t.map(x => (x.e >= 50 ? ECO.COL.chloro : ECO.COL.silt) + "cc"), borderRadius: 5 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100, title: { display: true, text: "% الإزالة" } }, y: { position: "right", grid: { display: false } } } } },
        interp: "في قناة بيجي يعكس الانخفاض على طول القناة أثر التخفيف والترسيب والتحلل الحيوي والامتصاص بجذور القصب معاً، وليس معالجة هندسية."
      };
    },
    formula: "Removal efficiency (%) = (C_before − C_after) / C_before × 100", refs: [REF.apha]
  });

  const GASES = [["NO2", "ثاني أكسيد النيتروجين NO₂", 46.0055], ["SO2", "ثاني أكسيد الكبريت SO₂", 64.066], ["O3", "الأوزون O₃", 47.997], ["CO", "أول أكسيد الكربون CO", 28.01], ["CH4", "الميثان CH₄", 16.04], ["H2S", "كبريتيد الهيدروجين H₂S", 34.08], ["NH3", "الأمونيا NH₃", 17.031], ["C6H6", "البنزين C₆H₆", 78.11]];
  C.push({
    id: "gasconv", cat: "air", title: "تحويل وحدات الغازات", en: "ppb ↔ µg/m³",
    desc: "تحويل تراكيز ملوثات الهواء بين ppb وµg/m³ حسب الحرارة والضغط.",
    fields: [{ id: "g", label: "الغاز", type: "select", opts: GASES.map(g => [g[0], g[1]]), def: "NO2" }, { id: "dir", label: "الاتجاه", type: "select", opts: [["p2u", "ppb ← إلى µg/m³"], ["u2p", "µg/m³ ← إلى ppb"]], def: "p2u" }, { id: "v", label: "القيمة" }, { id: "t", label: "الحرارة", unit: "°C", def: "25" }, { id: "p", label: "الضغط", unit: "kPa", def: "101.325" }],
    run(f) { const g = GASES.find(x => x[0] === f.g), v = n(f.v), T = n(f.t) + 273.15, P = n(f.p); if (!g || ![v, T, P].every(U.isNum)) return null; const Vm = 8.314462 * T / P; const r = f.dir === "p2u" ? v * g[2] / Vm : v * Vm / g[2]; return { cards: [{ label: f.dir === "p2u" ? "µg/m³" : "ppb", value: f2(r, 3) }, { label: "الحجم المولي", value: f2(Vm, 3), unit: "L/mol" }, { label: "الكتلة المولية", value: g[2], unit: "g/mol" }] }; },
    formula: "µg/m³ = ppb × MW / Vm          Vm = R·T / P   (= 24.45 L/mol عند 25°م و1 atm)", refs: ["Seinfeld, J.H., Pandis, S.N. (2016). Atmospheric Chemistry and Physics, 3rd ed."]
  });

  C.push({
    id: "aqi", cat: "air", title: "مؤشر جودة الهواء من تراكيز الجسيمات", en: "US AQI from PM",
    desc: "حساب US AQI من متوسط 24 ساعة للجسيمات ومقارنته بإرشادات WHO 2021.",
    fields: [{ id: "pm25", label: "PM2.5 متوسط 24 ساعة", unit: "µg/m³" }, { id: "pm10", label: "PM10 متوسط 24 ساعة", unit: "µg/m³" }],
    run(f) {
      const a = n(f.pm25), b = n(f.pm10); if (!U.isNum(a) && !U.isNum(b)) return null;
      const i1 = U.aqiFrom("pm2_5", a), i2 = U.aqiFrom("pm10", b), mx = Math.max(U.isNum(i1) ? i1 : 0, U.isNum(i2) ? i2 : 0), bd = U.aqiBand(mx);
      return { cards: [{ label: "US AQI", value: mx, sub: bd.label, tone: bd.tone }].concat(U.isNum(i1) ? [{ label: "AQI من PM2.5", value: i1, sub: `${f2(a / 15, 1)}× حد WHO` }] : []).concat(U.isNum(i2) ? [{ label: "AQI من PM10", value: i2, sub: `${f2(b / 45, 1)}× حد WHO` }] : []) };
    },
    formula: "Ip = (IHi − ILo)/(BPHi − BPLo) × (Cp − BPLo) + ILo\nحدود WHO 2021 (24 ساعة): PM2.5 = 15، PM10 = 45 µg/m³", refs: [REF.aqi, "WHO (2021). WHO global air quality guidelines."]
  });

  C.push({
    id: "stats", cat: "stat", title: "الإحصاء الوصفي والارتباط", en: "Descriptive statistics & Pearson r",
    desc: "المتوسط والانحراف المعياري ومعامل الاختلاف لمتغير أو اثنين، مع معامل ارتباط بيرسون ودلالته.",
    table: { cols: [{ id: "x", label: "المتغير X" }, { id: "y", label: "المتغير Y (اختياري)" }], rows: [["", ""], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""]] },
    run(f, rows) {
      const X = rows.map(r => n(r.x)).filter(U.isNum); if (X.length < 2) return null;
      const d = a => { const m = U.mean(a), s = U.std(a); return [a.length, f2(m, 3), f2(s, 3), f2(s / Math.sqrt(a.length), 3), f2(s / m * 100, 1) + "%", f2(Math.min(...a), 3), f2(U.median(a), 3), f2(Math.max(...a), 3)]; };
      const P = rows.map(r => [n(r.x), n(r.y)]).filter(p => p.every(U.isNum)), out = { table: { head: ["", "n", "المتوسط", "SD", "SE", "CV", "الأدنى", "الوسيط", "الأعلى"], rows: [["X", ...d(X)]] }, cards: [{ label: "متوسط X", value: f2(U.mean(X), 3), sub: "± " + f2(U.std(X), 3) + " SD" }] };
      if (P.length >= 3) {
        const Y = P.map(p => p[1]); out.table.rows.push(["Y", ...d(Y)]);
        const L = linreg(P.map(p => p[0]), Y), df = P.length - 2, tt = L.r * Math.sqrt(df / (1 - L.r * L.r)), p = tTwoTail(Math.abs(tt), df);
        out.cards.push({ label: "معامل بيرسون r", value: f2(L.r, 3), sub: Math.abs(L.r) >= 0.7 ? "ارتباط قوي" : Math.abs(L.r) >= 0.4 ? "ارتباط متوسط" : "ارتباط ضعيف" }, { label: "p-value", value: p < 0.001 ? "< 0.001" : f2(p, 4), sub: p < 0.05 ? "معنوي عند 0.05" : "غير معنوي", tone: p < 0.05 ? "good" : "none" }, { label: "R²", value: f2(L.r2, 3) });
        out.chart = { type: "scatter", data: { datasets: [{ label: "البيانات", data: P.map(q => ({ x: q[0], y: q[1] })), backgroundColor: ECO.COL.river, pointRadius: 5 }, { type: "line", label: "خط الانحدار", data: [Math.min(...P.map(q => q[0])), Math.max(...P.map(q => q[0]))].map(x => ({ x, y: L.intercept + L.slope * x })), borderColor: ECO.COL.chloro, pointRadius: 0 }] }, options: { plugins: { legend: { position: "bottom" } }, scales: { x: { type: "linear" } } } };
      }
      return out;
    },
    formula: "SD = √(Σ(x − x̄)² / (n − 1))      CV = SD / x̄ × 100\nr = Σ(x − x̄)(y − ȳ) / √(Σ(x − x̄)²·Σ(y − ȳ)²)      t = r·√((n − 2)/(1 − r²))", refs: ["Zar, J.H. (2010). Biostatistical Analysis, 5th ed. Pearson."]
  });

  ECO.CALCS = C;

  /* ===================== الواجهة ===================== */
  const CATS = [["all", "الكل"], ["water", "مؤشرات المياه"], ["irr", "الري"], ["sed", "الرواسب والتربة"], ["risk", "المخاطر الصحية"], ["lab", "حسابات المختبر"], ["bio", "المعالجة الحيوية"], ["air", "الهواء"], ["stat", "الإحصاء"]];
  const ICON = { water: "i-drop", irr: "i-leaf", sed: "i-layers", risk: "i-info", lab: "i-flask", bio: "i-microbe", air: "i-sat", stat: "i-brain" };
  const S = { cat: "all", cur: null, q: "", last: null, preset: null };

  function renderGrid() {
    const q = S.q.trim().toLowerCase();
    const list = C.filter(c => (S.cat === "all" || c.cat === S.cat) && (!q || (c.title + " " + c.en + " " + (c.desc || "")).toLowerCase().includes(q)));
    U.$("#calc-grid").innerHTML = list.map(c => `<button type="button" class="calc-card ${S.cur && S.cur.id === c.id ? "on" : ""}" data-id="${c.id}"><span class="cc-ic"><svg><use href="#${ICON[c.cat]}"/></svg></span><b>${c.title}</b><small dir="ltr">${c.en}</small></button>`).join("") || `<div class="empty">لا توجد حاسبة بهذا الاسم.</div>`;
  }

  function fieldHTML(fd) {
    if (fd.type === "select") return `<div class="field"><label for="cf-${fd.id}">${fd.label}</label><select id="cf-${fd.id}" class="input" data-f="${fd.id}">${fd.opts.map(([v, l]) => `<option value="${v}" ${v === fd.def ? "selected" : ""}>${l}</option>`).join("")}</select></div>`;
    return `<div class="field"><label for="cf-${fd.id}"><span>${fd.label}</span>${fd.unit ? `<span class="u">${fd.unit}</span>` : ""}</label><input id="cf-${fd.id}" type="number" step="any" inputmode="decimal" class="input" data-f="${fd.id}" value="${fd.def ?? ""}"></div>`;
  }
  function tableHTML(t, rows) {
    return `<div class="tbl-wrap"><table class="ctable"><thead><tr>${t.cols.map(c => `<th>${c.label}</th>`).join("")}<th></th></tr></thead><tbody>${rows.map((r, ri) => `<tr>${t.cols.map((c, ci) => {
      const v = r[ci] ?? "";
      if (c.type === "select") return `<td><select class="input" data-r="${ri}" data-c="${c.id}">${c.opts.map(([o, l]) => `<option value="${o}" ${o === v ? "selected" : ""}>${l}</option>`).join("")}</select></td>`;
      return `<td><input class="input ${c.type === "text" ? "" : "mono"} ${c.wide ? "wide" : ""}" ${c.type === "text" ? "" : 'inputmode="decimal" dir="ltr"'} data-r="${ri}" data-c="${c.id}" value="${U.esc(v)}"></td>`;
    }).join("")}<td><button type="button" class="btn icon-btn btn-ghost btn-sm" data-del="${ri}" aria-label="حذف الصف"><svg><use href="#i-close"/></svg></button></td></tr>`).join("")}</tbody></table></div>
    <button type="button" class="btn btn-sm" id="calc-addrow" style="margin-top:8px"><svg><use href="#i-plus"/></svg>إضافة صف</button>`;
  }

  function open(id, presetId, quiet) {
    const c = C.find(x => x.id === id); if (!c) return;
    if (c.link) { ECO.go(c.link); return; }
    S.cur = c; S.preset = null; S.rows = c.table ? c.table.rows.map(r => r.slice()) : null;
    renderGrid();
    const p = U.$("#calc-panel"); p.hidden = false;
    p.innerHTML = `<div class="panel-h"><div><h3 style="font-size:1.15rem">${c.title}</h3><span class="sub" dir="ltr">${c.en}</span></div><button class="btn icon-btn btn-ghost" type="button" id="calc-close" aria-label="إغلاق"><svg><use href="#i-close"/></svg></button></div>
      <p class="muted" style="font-size:.88rem;margin-bottom:12px">${c.desc || ""}</p>
      ${c.presets ? `<div class="row calc-presets" style="margin-bottom:12px"><span class="faint" style="font-size:.75rem">بيانات حقيقية من بحوث جامعة تكريت:</span>${c.presets.map(pr => `<button type="button" class="btn btn-sm btn-bio" data-preset="${pr.id}"><svg><use href="#i-book"/></svg>${pr.label}</button>`).join("")}</div>` : ""}
      <div class="calc-body">
        <div class="calc-in">${c.fields ? `<div class="param-grid">${c.fields.map(fieldHTML).join("")}</div>` : ""}${c.table ? `<div id="calc-table" style="margin-top:${c.fields ? 14 : 0}px"></div>` : ""}<p class="faint calc-src" id="calc-src" style="font-size:.75rem;margin-top:8px"></p></div>
        <div class="calc-out" id="calc-out"></div>
      </div>
      <div class="formula" style="margin-top:14px;white-space:pre-wrap">${U.esc(c.formula || "")}</div>
      <div class="calc-refs"><b>المراجع</b><ol>${(c.refs || []).map(r => `<li>${U.esc(r)}</li>`).join("")}</ol></div>
      <div class="row" style="margin-top:12px"><button class="btn btn-primary" type="button" id="calc-pdf"><svg><use href="#i-file"/></svg>تقرير PDF</button><button class="btn" type="button" id="calc-copy">نسخ النتائج</button><button class="btn btn-ghost" type="button" id="calc-clear">مسح المدخلات</button></div>`;
    if (c.table) drawTable();
    p.oninput = onInput; p.onchange = onInput;
    p.onclick = e => {
      if (e.target.closest("#calc-close")) { p.hidden = true; S.cur = null; renderGrid(); return; }
      const pr = e.target.closest("[data-preset]"); if (pr) applyPreset(pr.dataset.preset);
      const del = e.target.closest("[data-del]"); if (del) { readTable(); S.rows.splice(+del.dataset.del, 1); drawTable(); compute(); }
      if (e.target.closest("#calc-addrow")) { readTable(); S.rows.push(c.table.cols.map(col => (col.type === "select" ? col.opts[0][0] : ""))); drawTable(); }
      if (e.target.closest("#calc-pdf")) report();
      if (e.target.closest("#calc-copy")) copy();
      if (e.target.closest("#calc-clear")) { U.$$("[data-f]", p).forEach(i => { if (i.tagName === "INPUT") i.value = ""; }); if (c.table) { S.rows = c.table.rows.map(r => r.map((x, i) => (c.table.cols[i].type === "text" || c.table.cols[i].type === "select" ? x : ""))); drawTable(); } U.$("#calc-src").textContent = ""; compute(); }
    };
    if (presetId) applyPreset(presetId); else compute();
    if (!quiet && (window.innerWidth < 1100 || !presetId)) setTimeout(() => p.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  function drawTable() { U.$("#calc-table").innerHTML = tableHTML(S.cur.table, S.rows); }
  function readTable() { if (!S.cur.table) return; U.$$("#calc-table [data-r]").forEach(i => { const ci = S.cur.table.cols.findIndex(c => c.id === i.dataset.c); S.rows[+i.dataset.r][ci] = i.value; }); }
  function readFields() { const f = {}; U.$$("#calc-panel [data-f]").forEach(i => { f[i.dataset.f] = i.value; }); return f; }
  function applyPreset(id) {
    const pr = (S.cur.presets || []).find(x => x.id === id); if (!pr) return;
    if (pr.rows) { S.rows = (typeof pr.rows === "function" ? pr.rows() : pr.rows).map(r => r.slice()); drawTable(); }
    if (pr.f) Object.entries(pr.f).forEach(([k, v]) => { const i = U.$("#cf-" + k); if (i) i.value = v; });
    S.preset = pr; U.$("#calc-src").textContent = "المصدر: " + (pr.src || "");
    U.$$("[data-preset]").forEach(b => b.classList.toggle("on", b.dataset.preset === id));
    compute();
  }
  function onInput(e) {
    const t = e.target;
    if (t.dataset.f && S.cur.onField && e.type === "change") S.cur.onField(t.dataset.f, t.value, vals => Object.entries(vals).forEach(([k, v]) => { const i = U.$("#cf-" + k); if (i) i.value = v; }));
    compute();
  }
  function compute() {
    const c = S.cur; if (!c) return;
    if (c.table) readTable();
    const rows = c.table ? S.rows.map(r => Object.fromEntries(c.table.cols.map((col, i) => [col.id, r[i]]))) : [];
    let res = null;
    try { res = c.run(readFields(), rows); } catch (e) { console.error(e); }
    S.last = res;
    const out = U.$("#calc-out");
    if (!res) { out.innerHTML = `<div class="empty">أدخل القيم المطلوبة لتظهر النتائج${c.presets ? "، أو اختر بيانات بحث من الأعلى" : ""}.</div>`; return; }
    out.innerHTML = `${res.cards ? `<div class="rcards">${res.cards.map(k => `<div class="rcard tile3d tone-b-${k.tone || "none"}"><span>${k.label}</span><b dir="ltr">${k.value}${k.unit ? ` <small>${k.unit}</small>` : ""}</b>${k.sub ? `<em>${k.sub}</em>` : ""}</div>`).join("")}</div>` : ""}
      ${res.interp ? `<div class="notice info" style="margin-top:12px"><span>${res.interp}</span></div>` : ""}
      ${res.table ? `<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr>${res.table.head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${res.table.rows.map(r => `<tr>${r.map(x => `<td>${x && x.html ? x.html : U.esc(String(x ?? "—"))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
      ${res.chart ? `<div class="chart-box sm" style="margin-top:12px"><canvas id="calc-chart"></canvas></div>` : ""}`;
    if (res.chart) U.chart(U.$("#calc-chart"), res.chart);
  }
  function copy() {
    const r = S.last; if (!r) return;
    const txt = [S.cur.title, ...(r.cards || []).map(k => `${k.label}: ${k.value}${k.unit ? " " + k.unit : ""}${k.sub ? " (" + k.sub + ")" : ""}`)].join("\n");
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => U.toast("نُسخت النتائج"), () => window.prompt("انسخ النتائج", txt));
  }
  function report(mode) {
    const c = S.cur, r = S.last; if (!r) { U.toast("أدخل القيم أولاً"); return; }
    const f = readFields(), blocks = [];
    if (c.fields) blocks.push({ type: "kv", items: c.fields.map(fd => [fd.label + (fd.unit ? ` (${fd.unit})` : ""), fd.type === "select" ? (fd.opts.find(o => o[0] === f[fd.id]) || [, ""])[1] : f[fd.id]]).filter(x => x[1] !== "" && x[1] != null) });
    if (c.table) blocks.push({ type: "h", text: "بيانات الإدخال" }, { type: "table", head: c.table.cols.map(x => x.label), rows: S.rows.filter(row => { const REQ = { ccme: "vals", metals: "M", sediment: "cs", health: "c", stdcurve: "c", kinetics: "t", biosorption: "ce", phyto: "s", removal: "a", stats: "x" }, k = c.table.cols.findIndex(x => x.id === REQ[c.id]); return k >= 0 ? String(row[k] ?? "").trim() !== "" : row.some(v => String(v ?? "").trim() !== ""); }).map(row => row.map((v, i) => (c.table.cols[i].type === "select" ? (c.table.cols[i].opts.find(o => o[0] === v) || [, v])[1] : v))) });
    if (S.preset) blocks.push({ type: "note", text: "مصدر البيانات: " + S.preset.src });
    blocks.push({ type: "h", text: "النتائج" });
    if (r.cards) blocks.push({ type: "cards", items: r.cards.map(k => ({ label: k.label, value: k.value, unit: k.unit, sub: k.sub ? String(k.sub).replace(/<[^>]+>/g, "") : "", tone: k.tone })) });
    if (r.table) blocks.push({ type: "table", head: r.table.head, rows: r.table.rows.map(row => row.map(x => (x && x.html ? x.html.replace(/<[^>]+>/g, "") : x))) });
    if (r.chart) blocks.push({ type: "chart", src: ECO.report.chartFrom(U.$("#calc-chart"), 640, 280) });
    if (r.interp) blocks.push({ type: "text", html: r.interp });
    blocks.push({ type: "h", text: "المعادلات" }, { type: "note", html: `<pre dir="ltr" style="white-space:pre-wrap;margin:0;font-family:inherit">${U.esc(c.formula || "")}</pre>` }, { type: "refs", items: c.refs || [] }, { type: "sign" });
    ECO.report.run({ title: c.title, subtitle: c.en, file: "حاسبة-" + c.id, blocks }, mode);
  }

  ECO.calcOpen = (id, preset) => { ECO.go("calc"); setTimeout(() => open(id, preset), ECO.views.calc._inited ? 30 : 120); };
  ECO.views.calc = {
    init() {
      U.$("#calc-cats").innerHTML = CATS.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === "all" ? "on" : ""}">${l}</button>`).join("");
      U.$("#calc-cats").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.cat = b.dataset.k; U.$$("#calc-cats button").forEach(x => x.classList.toggle("on", x === b)); renderGrid(); };
      U.$("#calc-search").oninput = e => { S.q = e.target.value; renderGrid(); };
      U.$("#calc-grid").onclick = e => { const b = e.target.closest(".calc-card"); if (b) open(b.dataset.id); };
      renderGrid();
      if (!S.cur) open("ccme", "baiji", true);
    }
  };
})();
