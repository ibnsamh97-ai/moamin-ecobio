/* =====================================================================
   EcoBio AI — مختبر جودة المياه: WQI + HPI + نظام خبير للمعالجة
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const S = { std: Object.assign({}, U.store.get("water_std", {})), last: null };
  const LAB = {
    ph: "جهاز pH meter بعد المعايرة بمحاليل منظمة 4 و7 و10",
    tds: "جهاز TDS/EC meter أو الطريقة الوزنية بالتجفيف عند 180°م",
    turb: "جهاز قياس العكورة Turbidimeter (NTU)",
    do: "طريقة ونكلر (Winkler) أو مجس الأكسجين المذاب",
    bod: "حضن العينة 5 أيام عند 20°م في الظلام وقياس الفرق في DO",
    no3: "المطياف الضوئي UV عند 220 و275 نانومتر",
    po4: "طريقة حامض الأسكوربيك وقياس الامتصاص عند 880 نانومتر",
    cl: "التسحيح بنترات الفضة (طريقة Mohr)",
    so4: "الطريقة العكورية بكلوريد الباريوم",
    th: "التسحيح بمحلول EDTA بوجود دليل Eriochrome Black T",
    metals: "مطياف الامتصاص الذري AAS أو ICP-OES بعد الهضم الحامضي"
  };

  const stdOf = p => (U.isNum(S.std[p.key]) ? S.std[p.key] : p.std);

  function buildInputs() {
    U.$("#w-params").innerHTML = ECO.WATER_PARAMS.map(p => `<div class="field"><label for="wp-${p.key}"><span>${p.name} (${p.sym})</span><span class="u">${p.unit}</span></label><input type="number" step="any" min="0" id="wp-${p.key}" inputmode="decimal"></div>`).join("");
    U.$("#w-metals").innerHTML = ECO.METALS.map(m => `<div class="field"><label for="wm-${m.key}"><span>${m.name} (${m.sym})</span><span class="u">≤ ${m.std}</span></label><input type="number" step="any" min="0" id="wm-${m.key}" inputmode="decimal"></div>`).join("");
    U.$("#w-stds").innerHTML = ECO.WATER_PARAMS.map(p => `<div class="field"><label for="ws-${p.key}"><span>حد ${p.sym}</span><span class="u">${p.src}</span></label><input type="number" step="any" id="ws-${p.key}" value="${stdOf(p)}"></div>`).join("") +
      `<div class="field" style="align-self:end"><button type="button" class="btn btn-sm" id="ws-reset">استعادة الحدود الافتراضية</button></div>`;
    ECO.WATER_PARAMS.forEach(p => {
      U.$("#ws-" + p.key).onchange = e => { const v = parseFloat(e.target.value); if (U.isNum(v) && v > 0) S.std[p.key] = v; else delete S.std[p.key]; U.store.set("water_std", S.std); calc(); };
    });
    U.$("#ws-reset").onclick = () => { S.std = {}; U.store.del("water_std"); ECO.WATER_PARAMS.forEach(p => { U.$("#ws-" + p.key).value = p.std; }); calc(); };
    U.$("#w-presets").innerHTML = ECO.WATER_PRESETS.map(p => `<button type="button" data-p="${p.id}">${p.short}</button>`).join("") + `<button type="button" data-p="clear">عيّنتي</button>`;
    U.$("#w-presets").insertAdjacentHTML("afterend", `<p class="faint w-src" id="w-src" style="font-size:.72rem;flex-basis:100%"></p>`);
    U.$("#w-presets").onclick = e => { const b = e.target.closest("button"); if (!b) return; U.$$("#w-presets button").forEach(x => x.classList.toggle("on", x === b && b.dataset.p !== "clear")); loadPreset(b.dataset.p); };
    U.$("#w-date").value = U.isoDate(new Date());
  }

  function loadPreset(id) {
    const src = U.$("#w-src");
    if (id === "clear") { [...ECO.WATER_PARAMS, ...ECO.METALS].forEach(p => { const e = U.$("#wp-" + p.key) || U.$("#wm-" + p.key); e.value = ""; }); U.$("#w-name").value = "عيّنة جديدة"; if (src) src.textContent = "أدخل نتائج تحليل عيّنتك. اترك المعايير غير المقاسة فارغة."; calc(); return; }
    const p = ECO.WATER_PRESETS.find(x => x.id === id); if (!p) return;
    ECO.WATER_PARAMS.forEach(x => { U.$("#wp-" + x.key).value = p.v[x.key] ?? ""; });
    ECO.METALS.forEach(x => { U.$("#wm-" + x.key).value = p.v[x.key] ?? ""; });
    U.$("#w-name").value = p.name;
    const r = (ECO.RESEARCH || []).find(x => x.id === p.ref);
    if (src && r) src.innerHTML = `بيانات منشورة: ${U.esc(r.authors)} (${r.year})، ${U.esc(r.journal)}. <a href="#research" data-rs="${r.id}">عرض البحث</a>`;
    calc();
  }

  function read() {
    const v = {};
    ECO.WATER_PARAMS.forEach(p => { v[p.key] = parseFloat(U.$("#wp-" + p.key).value); });
    ECO.METALS.forEach(m => { v[m.key] = parseFloat(U.$("#wm-" + m.key).value); });
    return v;
  }

  /* مؤشر جودة المياه بالمتوسط الحسابي الموزون (Brown et al., 1972) */
  function computeWQI(v) {
    const rows = ECO.WATER_PARAMS.filter(p => U.isNum(v[p.key])).map(p => {
      const Sn = stdOf(p), V = v[p.key];
      let Q;
      if (p.key === "ph") Q = 100 * Math.abs(V - p.ideal) / (Sn - p.ideal);
      else if (p.key === "do") Q = Math.max(0, 100 * (V - p.ideal) / (Sn - p.ideal));
      else Q = 100 * V / Sn;
      const pass = p.key === "ph" ? V >= (p.min || 6.5) && V <= Sn : p.key === "do" ? V >= Sn : V <= Sn;
      const ratio = p.key === "ph" ? Math.abs(V - 7) / 1.5 : p.key === "do" ? Sn / Math.max(V, 0.1) : V / Sn;
      return { p, V, Sn, Q, pass, ratio };
    });
    if (!rows.length) return null;
    const K = 1 / rows.reduce((s, r) => s + 1 / r.Sn, 0);
    rows.forEach(r => { r.W = K / r.Sn; });
    const wqi = rows.reduce((s, r) => s + r.Q * r.W, 0) / rows.reduce((s, r) => s + r.W, 0);
    return { wqi, rows };
  }
  /* مؤشر تلوث العناصر الثقيلة (Mohan et al., 1996) */
  function computeHPI(v) {
    const rows = ECO.METALS.filter(m => U.isNum(v[m.key])).map(m => ({ m, V: v[m.key], Q: 100 * v[m.key] / m.std, W: 1 / m.std, pass: v[m.key] <= m.std }));
    if (!rows.length) return null;
    return { hpi: rows.reduce((s, r) => s + r.W * r.Q, 0) / rows.reduce((s, r) => s + r.W, 0), rows };
  }
  ECO.waterIndex = { wqi: v => computeWQI(v), hpi: v => computeHPI(v), wqiClass: w => wqiClass(w) };
  const wqiClass = w => w <= 25 ? ["ممتازة", "good"] : w <= 50 ? ["جيدة", "good"] : w <= 75 ? ["رديئة", "warn"] : w <= 100 ? ["رديئة جداً", "bad"] : ["غير صالحة للشرب", "severe"];

  function calc() {
    const v = read(), W = computeWQI(v), H = computeHPI(v);
    U.$("#w-res-name").textContent = U.$("#w-name").value;
    if (!W) {
      U.$("#w-wqi").textContent = "—"; U.$("#w-class").className = "chip tone-none"; U.$("#w-class").textContent = "أدخل القيم"; U.$("#w-hpi").textContent = "HPI —";
      U.$("#w-table").innerHTML = ""; U.$("#w-treat").innerHTML = `<div class="empty">أدخل نتائج العيّنة أو اختر عيّنة توضيحية من الأعلى.</div>`;
      const c = Chart.getChart && Chart.getChart(U.$("#chart-wqi")); if (c) c.destroy();
      S.last = null; return;
    }
    const [cl, tone] = wqiClass(W.wqi);
    U.$("#w-wqi").textContent = U.fmt(W.wqi, 1); U.$("#w-wqi").style.color = ECO.TONES[tone];
    U.$("#w-class").className = `chip tone-${tone}`; U.$("#w-class").textContent = `جودة ${cl}`;
    U.$("#w-hpi").innerHTML = H ? `مؤشر العناصر الثقيلة HPI = <b class="${H.hpi >= 100 ? "bad" : "ok"}">${U.fmt(H.hpi, 1)}</b> (${H.hpi >= 100 ? "فوق الحد الحرج 100" : "دون الحد الحرج 100"})` : "HPI — (لم تُدخل عناصر ثقيلة)";

    U.$("#w-table").innerHTML = `<thead><tr><th>المعيار</th><th>القيمة</th><th>الحد</th><th>Qn</th><th>Wn</th><th>الحالة</th></tr></thead><tbody>` +
      W.rows.map(r => `<tr><td>${r.p.sym}</td><td class="num">${U.fmt(r.V, "auto")}</td><td class="num">${r.p.key === "do" ? "≥ " : r.p.key === "ph" ? "6.5–" : "≤ "}${r.Sn}</td><td class="num">${U.fmt(r.Q, 1)}</td><td class="num">${U.fmt(r.W, 4)}</td><td>${r.pass ? `<span class="ok">ضمن الحد</span>` : `<span class="bad">تجاوز</span>`}</td></tr>`).join("") +
      (H ? H.rows.map(r => `<tr><td>${r.m.sym}</td><td class="num">${U.fmt(r.V, "auto")}</td><td class="num">≤ ${r.m.std}</td><td class="num">${U.fmt(r.Q, 1)}</td><td class="num">${U.fmt(r.W, 1)}</td><td>${r.pass ? `<span class="ok">ضمن الحد</span>` : `<span class="bad">تجاوز</span>`}</td></tr>`).join("") : "") + `</tbody>`;

    const labels = W.rows.map(r => r.p.sym).concat(H ? H.rows.map(r => r.m.sym) : []);
    const q = W.rows.map(r => Math.min(r.Q, 300)).concat(H ? H.rows.map(r => Math.min(r.Q, 300)) : []);
    U.chart(U.$("#chart-wqi"), {
      type: "radar",
      data: { labels, datasets: [
        { label: "تصنيف الجودة Qn", data: q, borderColor: ECO.COL.river, backgroundColor: "rgba(79,200,220,0.2)", pointRadius: 2 },
        { label: "حد 100", data: labels.map(() => 100), borderColor: ECO.COL.crimson, borderDash: [4, 3], borderWidth: 1, fill: false, pointRadius: 0 }
      ] },
      options: { plugins: { legend: { position: "bottom" } }, scales: { r: { beginAtZero: true, suggestedMax: 150, angleLines: { color: ECO.COL.grid }, grid: { color: ECO.COL.grid }, pointLabels: { color: ECO.COL.muted, font: { size: 10, family: "IBM Plex Mono" } }, ticks: { display: false } } } }
    });

    renderTreat(W, H);
    S.last = { name: U.$("#w-name").value, site: U.$("#w-site").value, date: U.$("#w-date").value, v, wqi: W.wqi, cls: cl, hpi: H ? H.hpi : null,
      exceed: W.rows.filter(r => !r.pass).map(r => `${r.p.sym}=${r.V} (الحد ${r.Sn})`).concat(H ? H.rows.filter(r => !r.pass).map(r => `${r.m.sym}=${r.V} (الحد ${r.m.std})`) : []) };
    ECO.lastWater = S.last;
  }

  function renderTreat(W, H) {
    const bad = W.rows.filter(r => !r.pass).sort((a, b) => b.ratio - a.ratio);
    const metalsBad = H ? H.rows.filter(r => !r.pass) : [];
    const cards = bad.map(r => {
      const t = ECO.TREATMENTS[r.p.key]; if (!t) return "";
      const sev = r.ratio > 3 ? "severe" : r.ratio > 1.5 ? "bad" : "warn";
      return card(t, `${r.p.sym}: ${U.fmt(r.V, "auto")} ${r.p.unit} (الحد ${r.p.key === "do" ? "≥ " : ""}${r.Sn})`, sev, LAB[r.p.key]);
    });
    if (metalsBad.length) {
      const worst = Math.max(...metalsBad.map(r => r.V / r.m.std));
      cards.push(card(ECO.TREATMENTS.metals, metalsBad.map(r => `${r.m.sym} ×${U.fmt(r.V / r.m.std, 1)}`).join(" · "), worst > 3 ? "severe" : "bad", LAB.metals));
    }
    U.$("#w-treat").innerHTML = cards.length ? cards.join("") :
      `<div class="treat-card"><h4><span class="chip tone-good">مطابقة</span>جميع المعايير ضمن الحدود</h4><p class="muted" style="font-size:.85rem">لا تحتاج العيّنة معالجة إضافية سوى التعقيم الروتيني (الكلور أو الأشعة فوق البنفسجية) والمراقبة الدورية.</p></div>`;
  }
  function card(t, measure, sev, lab) {
    return `<div class="treat-card"><h4><span class="chip tone-${sev}">${sev === "severe" ? "أولوية قصوى" : sev === "bad" ? "أولوية عالية" : "متوسطة"}</span>${t.title}</h4>
      <p class="mono faint" style="font-size:.75rem;margin-bottom:8px;direction:ltr;text-align:right">${U.esc(measure)}</p>
      <ul>${t.bio.map(x => `<li><span class="ok">حيوي:</span> ${x}</li>`).join("")}${t.phys.map(x => `<li><span class="warnc">فيزيوكيميائي:</span> ${x}</li>`).join("")}</ul>
      ${lab ? `<span class="lab">طريقة التأكيد المختبري: ${lab}</span>` : ""}</div>`;
  }

  /* السجل */
  const hist = () => U.store.get("water_history", []);
  function renderHist() {
    const h = hist();
    U.$("#w-history").innerHTML = h.length ? `<thead><tr><th>العيّنة</th><th>الموقع</th><th>التاريخ</th><th>WQI</th><th>الصنف</th><th>HPI</th><th></th></tr></thead><tbody>` +
      h.map((r, i) => `<tr><td>${U.esc(r.name)}</td><td>${U.esc(r.site)}</td><td class="num">${U.esc(r.date)}</td><td class="num">${U.fmt(r.wqi, 1)}</td><td>${U.esc(r.cls)}</td><td class="num">${r.hpi == null ? "—" : U.fmt(r.hpi, 1)}</td><td><button type="button" class="btn btn-sm btn-ghost" data-load="${i}">فتح</button></td></tr>`).join("") + `</tbody>`
      : `<tbody><tr><td class="faint" style="white-space:normal">لا توجد عيّنات محفوظة بعد. احسب عيّنة ثم اضغط «حفظ في السجل». يُحفظ السجل في هذا المتصفح.</td></tr></tbody>`;
  }
  function save() {
    if (!S.last) { U.toast("احسب المؤشرات أولاً"); return; }
    const h = hist(); h.unshift(S.last); U.store.set("water_history", h.slice(0, 100)); renderHist(); U.toast("حُفظت العيّنة في السجل");
  }
  function exportCSV() {
    const h = hist(); if (!h.length) { U.toast("السجل فارغ"); return; }
    const keys = [...ECO.WATER_PARAMS.map(p => p.key), ...ECO.METALS.map(m => m.key)];
    const lines = [["name", "site", "date", "WQI", "class", "HPI", ...keys].join(",")].concat(h.map(r => [r.name, r.site, r.date, r.wqi.toFixed(2), r.cls, r.hpi == null ? "" : r.hpi.toFixed(2), ...keys.map(k => (U.isNum(r.v[k]) ? r.v[k] : ""))].map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")));
    const csv = "﻿" + lines.join("\n");
    try {
      const a = U.el("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: "ecobio-water-samples.csv" });
      document.body.appendChild(a); a.click(); a.remove();
      U.toast("جارٍ تنزيل ملف CSV");
    } catch (e) { U.toast("تعذّر التنزيل من هذه الصفحة"); }
  }

  function askGemini() {
    if (!S.last) { U.toast("احسب المؤشرات أولاً"); return; }
    const L = S.last;
    const vals = ECO.WATER_PARAMS.map(p => `${p.name} (${p.sym}) = ${U.isNum(L.v[p.key]) ? L.v[p.key] : "غير مقاس"} ${p.unit} [الحد ${stdOf(p)}]`).concat(ECO.METALS.map(m => `${m.name} (${m.sym}) = ${U.isNum(L.v[m.key]) ? L.v[m.key] : "غير مقاس"} mg/L [الحد ${m.std}]`)).join("\n");
    const prompt = `هذه نتائج تحليل عيّنة مياه "${L.name}" من موقع "${L.site}" بتاريخ ${L.date}:
${vals}

مؤشر جودة المياه WQI (المتوسط الحسابي الموزون) = ${L.wqi.toFixed(1)} → جودة ${L.cls}.
مؤشر العناصر الثقيلة HPI = ${L.hpi == null ? "غير محسوب" : L.hpi.toFixed(1)}.
المعايير المتجاوزة: ${L.exceed.length ? L.exceed.join("، ") : "لا يوجد"}.

المطلوب بالعربية وبعناوين واضحة:
1. تفسير علمي للنتيجة وما تدل عليه عن مصدر التلوث المحتمل (صرف صحي، زراعي، صناعي/نفطي، طبيعي).
2. خطة معالجة مرتبة حسب الأولوية مع تفضيل الحلول الحيوية (أسماء الكائنات العلمية، الظروف المثلى، الكفاءة المتوقعة إن كانت معروفة).
3. هل المياه صالحة للشرب أو الري أو للحياة المائية؟
4. تجارب مختبرية مقترحة لتأكيد النتائج أو لبحث تخرج.`;
    ECO.gemini.renderInto(U.$("#w-ai"), prompt);
  }

  /* واجهة عامة تستخدمها الخريطة وقراءة الصور والتقارير */
  ECO.water = {
    compute(v) { const W = computeWQI(v), Hh = computeHPI(v); if (!W && !Hh) return null; const c = W ? wqiClass(W.wqi) : null; return { wqi: W ? W.wqi : null, cls: c ? c[0] : null, tone: c ? c[1] : "none", hpi: Hh ? Hh.hpi : null, W, H: Hh }; },
    fill(vals, meta = {}) {
      const go = () => {
        [...ECO.WATER_PARAMS].forEach(p => { U.$("#wp-" + p.key).value = U.isNum(vals[p.key]) ? vals[p.key] : ""; });
        ECO.METALS.forEach(m => { U.$("#wm-" + m.key).value = U.isNum(vals[m.key]) ? vals[m.key] : ""; });
        if (meta.name) U.$("#w-name").value = meta.name; if (meta.site) U.$("#w-site").value = meta.site; if (meta.date) U.$("#w-date").value = meta.date;
        U.$$("#w-presets button").forEach(x => x.classList.toggle("on", x.dataset.p === "clear"));
        const src = U.$("#w-src"); if (src) src.textContent = meta.source || "قيم منقولة من " + (meta.from || "مصدر خارجي");
        calc();
      };
      if (ECO.views.water._inited) go(); else { ECO._pendingWater = go; }
      ECO.go("water");
    },
    last: () => S.last,
    report(mode) {
      const L = S.last; if (!L) { U.toast("احسب المؤشرات أولاً"); return; }
      const W = computeWQI(L.v), Hh = computeHPI(L.v);
      const rows = W ? W.rows.map(r => [r.p.name + " (" + r.p.sym + ")", U.fmt(r.V, "auto") + " " + r.p.unit, (r.p.key === "do" ? "≥ " : r.p.key === "ph" ? "6.5 – " : "≤ ") + r.Sn, U.fmt(r.Q, 1), { html: r.pass ? '<span class="ok">ضمن الحد</span>' : '<span class="bad">تجاوز</span>' }]) : [];
      const mrows = Hh ? Hh.rows.map(r => [r.m.name + " (" + r.m.sym + ")", U.fmt(r.V, "auto") + " mg/L", "≤ " + r.m.std, U.fmt(r.Q, 1), { html: r.pass ? '<span class="ok">ضمن الحد</span>' : '<span class="bad">تجاوز</span>' }]) : [];
      const treat = [...U.$$("#w-treat .treat-card")].map(c => c.innerText.trim()).join("\n\n");
      ECO.report.run({
        title: "تقرير تحليل عيّنة مياه", subtitle: L.name, file: "تقرير-عينة-مياه",
        blocks: [
          { type: "kv", items: [["اسم العيّنة", L.name], ["موقع الجمع", L.site], ["تاريخ الجمع", L.date], ["طريقة المؤشر", "WQI – المتوسط الحسابي الموزون (Brown et al., 1972)"]] },
          { type: "cards", items: [{ label: "مؤشر جودة المياه WQI", value: U.fmt(L.wqi, 1), sub: "جودة " + L.cls, tone: wqiClass(L.wqi)[1] }, { label: "مؤشر العناصر الثقيلة HPI", value: L.hpi == null ? "—" : U.fmt(L.hpi, 1), sub: L.hpi == null ? "غير محسوب" : L.hpi >= 100 ? "فوق الحد الحرج 100" : "دون الحد الحرج 100", tone: L.hpi >= 100 ? "bad" : "good" }, { label: "المعايير المتجاوزة", value: String(L.exceed.length), sub: L.exceed.length ? "تحتاج معالجة" : "مطابقة" }] },
          { type: "h", text: "نتائج التحليل والمطابقة" },
          { type: "table", head: ["المعيار", "القيمة", "الحد", "Qn", "الحالة"], rows: rows.concat(mrows) },
          { type: "chart", src: ECO.report.chartFrom(U.$("#chart-wqi"), 520, 320), caption: "مخطط تصنيف الجودة Qn لكل معيار (الخط المتقطع = 100)" },
          { type: "h", text: "التشخيص وخطة المعالجة المقترحة" },
          { type: "text", html: U.esc(treat || "جميع المعايير ضمن الحدود.").replace(/\n/g, "<br>") },
          U.$("#w-ai").textContent.trim() ? { type: "h", text: "تفسير الذكاء الاصطناعي (Gemini)" } : null,
          U.$("#w-ai").textContent.trim() ? { type: "text", html: U.$("#w-ai").innerHTML } : null,
          { type: "refs", items: ["Brown, R.M., et al. (1972). A water quality index – crashing the psychological barrier. Indicators of Environmental Quality.", "Mohan, S.V., Nithila, P., Reddy, S.J. (1996). Estimation of heavy metals in drinking water and development of heavy metal pollution index. J. Environ. Sci. Health A31(2).", "المواصفة القياسية العراقية لمياه الشرب رقم 417.", "WHO (2022). Guidelines for drinking-water quality, 4th ed."] },
          { type: "sign" }
        ]
      }, mode);
    }
  };

  ECO.views.water = {
    init() {
      buildInputs();
      U.$("#w-calc").onclick = () => { calc(); U.$("#w-result").scrollIntoView({ behavior: "smooth", block: "start" }); };
      U.$("#w-save").onclick = save;
      U.$("#w-export").onclick = exportCSV;
      U.$("#w-clear").onclick = () => { U.store.del("water_history"); renderHist(); U.toast("مُسح السجل"); };
      U.$("#w-ask").onclick = askGemini;
      U.$("#w-pdf").onclick = () => ECO.water.report();
      U.$("#w-pin").onclick = () => { if (!S.last) { U.toast("احسب المؤشرات أولاً"); return; } ECO.samples && ECO.samples.startAdd({ site: S.last.site, date: S.last.date, v: S.last.v, type: "مياه نهر" }); };
      document.addEventListener("click", e => { const a = e.target.closest("[data-rs]"); if (a) { ECO._pendingResearch = a.dataset.rs; } });
      U.$("#w-history").onclick = e => {
        const b = e.target.closest("[data-load]"); if (!b) return;
        const r = hist()[+b.dataset.load]; if (!r) return;
        [...ECO.WATER_PARAMS].forEach(p => { U.$("#wp-" + p.key).value = U.isNum(r.v[p.key]) ? r.v[p.key] : ""; });
        ECO.METALS.forEach(m => { U.$("#wm-" + m.key).value = U.isNum(r.v[m.key]) ? r.v[m.key] : ""; });
        U.$("#w-name").value = r.name; U.$("#w-site").value = r.site; U.$("#w-date").value = r.date; calc();
      };
      U.$$("#w-params input, #w-metals input").forEach(i => i.addEventListener("input", U.debounce(calc, 350)));
      U.$("#w-presets button").classList.add("on");
      loadPreset(ECO.WATER_PRESETS[0].id);
      if (ECO._pendingWater) { const f = ECO._pendingWater; ECO._pendingWater = null; setTimeout(f, 0); }
      renderHist();
    }
  };
})();
