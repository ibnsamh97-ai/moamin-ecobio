/* =====================================================================
   EcoBio AI — بحوث جامعة تكريت: بطاقات، خريطة، جداول، رسوم، إرسال للمختبر
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const S = { sel: null, filter: "all", map: null, markers: {}, row: 0 };
  const STD = { ph: 8.5, tds: 1000, turb: 5, bod: 5, no3: 50, po4: 0.4, cl: 350, so4: 400, th: 500, pb: 0.01, zn: 3, ec: 1500 };
  const FILTERS = [["all", "الكل"], ["river", "مياه نهر"], ["well", "مياه آبار"], ["oil", "صرف نفطي ورواسب"]];
  const kind = r => (/آبار/.test(r.medium) ? "well" : /نفط/.test(r.medium) ? "oil" : "river");

  // الروابط من أي مكان في الموقع تفتح بحثاً محدداً
  document.addEventListener("click", e => { const a = e.target.closest("[data-rs]"); if (a) { ECO._pendingResearch = a.dataset.rs; if (ECO.views.research._inited) setTimeout(() => select(a.dataset.rs), 30); } });

  const cite = r => `${r.authors} (${r.year}). ${r.title}. ${r.journal}, ${r.vol}.${r.doi ? " https://doi.org/" + r.doi : ""}`;

  function buildMap() {
    if (!window.L) return;
    S.map = L.map("rs-map", { center: [34.6, 43.8], zoom: 7, zoomControl: false, attributionControl: true, scrollWheelZoom: false });
    S.map.attributionControl.setPrefix(false);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Esri" }).addTo(S.map);
    L.polyline(ECO.TIGRIS, { color: "#4fc8dc", weight: 2, opacity: 0.8 }).addTo(S.map);
    ECO.RESEARCH.filter(r => r.lat != null).forEach(r => {
      const m = L.marker([r.lat, r.lon], { icon: L.divIcon({ className: "rs-pin" + (r.supervisor ? " sup" : ""), html: "<span></span>", iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(S.map);
      m.bindTooltip(r.place, { className: "eco-tip" }); m.on("click", () => select(r.id)); S.markers[r.id] = m;
    });
  }

  function renderList() {
    const list = ECO.RESEARCH.filter(r => S.filter === "all" || kind(r) === S.filter);
    U.$("#rs-list").innerHTML = list.map(r => `<button type="button" class="study-card ${r.id === S.sel ? "on" : ""}" data-id="${r.id}">
      <span class="sc-top">${r.supervisor ? `<span class="chip tone-good">بحث المشرفة</span>` : ""}<span class="chip tone-none">${r.year}</span><span class="chip tone-info">${U.esc(r.medium)}</span></span>
      <b>${U.esc(r.place)}</b><small>${U.esc(r.authors)}</small></button>`).join("");
  }

  function rangeRows(r) {
    return (r.ranges || []).map(x => {
      const std = STD[x.k], over = std != null && x.max > std;
      return [x.label, { html: `<span dir="ltr">${U.fmt(x.min, "auto")}</span>` }, x.minAt || "—", { html: `<b dir="ltr" class="${over ? "bad" : ""}">${U.fmt(x.max, "auto")}</b>` }, x.maxAt || "—", { html: `<span dir="ltr">${U.esc(x.unit || "")}</span>` }, std != null ? (over ? { html: `<span class="bad">يتجاوز ${std}</span>` } : { html: `<span class="ok">ضمن ${std}</span>` }) : "—"];
    });
  }
  const tableHTML = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c && c.html ? c.html : U.esc(String(c ?? "—"))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

  function select(id) {
    const r = ECO.RESEARCH.find(x => x.id === id) || ECO.RESEARCH[0];
    S.sel = r.id; S.row = 0; renderList();
    if (S.map && S.markers[r.id]) { S.map.flyTo([r.lat, r.lon], 10, { duration: 0.6 }); }
    const actions = [];
    if (ECO.WATER_PRESETS.some(p => p.ref === r.id)) actions.push(`<button class="btn btn-primary btn-sm" type="button" data-a="lab"><svg><use href="#i-drop"/></svg>حلّل في مختبر المياه</button>`);
    if (r.id === "baiji-2025") actions.push(`<button class="btn btn-bio btn-sm" type="button" data-a="phyto"><svg><use href="#i-leaf"/></svg>احسب BCF وTF للقصب</button>`, `<button class="btn btn-sm" type="button" data-a="sed"><svg><use href="#i-calc"/></svg>مؤشرات تلوث الرواسب</button>`, `<button class="btn btn-sm" type="button" data-a="ccme"><svg><use href="#i-calc"/></svg>CCME WQI للقناة</button>`, `<button class="btn btn-sm" type="button" data-a="removal"><svg><use href="#i-calc"/></svg>نسبة الإزالة على طول القناة</button>`);
    if (r.id === "balad-2022") actions.push(`<button class="btn btn-sm" type="button" data-a="risk"><svg><use href="#i-calc"/></svg>المخاطر الصحية للرصاص والزنك</button>`);
    actions.push(`<button class="btn btn-sm" type="button" data-a="ask"><svg><use href="#i-chat"/></svg>ناقش البحث مع المساعد</button>`, `<button class="btn btn-sm" type="button" data-a="cite">انسخ المرجع</button>`, `<button class="btn btn-sm" type="button" data-a="pdf"><svg><use href="#i-file"/></svg>ملخص PDF</button>`);

    const tables = (r.tables || []).map((t, ti) => `<div class="rs-table"><div class="panel-h"><h3>${U.esc(t.title)}</h3>${t.unit ? `<span class="sub">${U.esc(t.unit)}</span>` : ""}</div>
      ${tableHTML(["", ...t.cols], t.rows.map(row => [row[0], ...row.slice(1).map(v => ({ html: `<span dir="ltr">${U.fmt(v, "auto")}</span>` }))]))}
      <div class="seg rs-rowseg" data-t="${ti}" style="margin-top:10px">${t.id === "bact" ? "" : t.rows.map((row, i) => `<button type="button" data-i="${i}" class="${i === 0 ? "on" : ""}">${U.esc(row[0])}</button>`).join("")}</div>
      <div class="chart-box sm" style="margin-top:8px"><canvas id="rs-chart-${ti}"></canvas></div></div>`).join("");

    U.$("#rs-detail").innerHTML = `
      <div class="rs-head">
        <div class="row">${r.supervisor ? `<span class="chip tone-good">بحث المشرفة: ${U.esc(ECO.PROJECT.supervisor)}</span>` : ""}<span class="chip tone-info">${U.esc(r.journal)} · ${r.year}</span></div>
        <h3>${U.esc(r.title)}</h3>
        <p class="muted">${U.esc(r.authors)} — ${U.esc(r.affil)}</p>
        <div class="row" style="margin-top:6px"><a class="btn btn-sm" href="${r.url}" target="_blank" rel="noopener"><svg><use href="#i-ext"/></svg>المصدر</a>${r.pdf ? `<a class="btn btn-sm" href="${r.pdf}" target="_blank" rel="noopener"><svg><use href="#i-file"/></svg>PDF</a>` : ""}${r.doi ? `<span class="chip tone-none mono" dir="ltr">DOI ${U.esc(r.doi)}</span>` : ""}</div>
      </div>
      <div class="rs-facts"><div><span>الموقع</span><b>${U.esc(r.place)}</b></div><div><span>الوسط</span><b>${U.esc(r.medium)}</b></div><div><span>المحطات</span><b>${r.stations}</b></div><div><span>الفترة</span><b>${U.esc(r.period)}</b></div></div>
      <p class="rs-sum">${U.esc(r.summary)}</p>
      <div class="notice info" style="margin:10px 0"><span>${U.esc(r.coordNote)}</span></div>
      ${r.ranges ? `<div class="panel-h" style="margin-top:14px"><h3>النطاقات المسجلة ومقارنتها بالحدود القياسية</h3><span class="sub">المقارنة مع IQS 417 / WHO لمياه الشرب</span></div>${tableHTML(["المتغير", "الأدنى", "متى/أين", "الأعلى", "متى/أين", "الوحدة", "الحد"], rangeRows(r))}` : ""}
      ${tables}
      ${r.species ? `<div class="panel-h" style="margin-top:14px"><h3>الأنواع البكتيرية المعزولة</h3></div><div class="sources">${r.species.map(s => `<span class="chip tone-none"><i>${U.esc(s)}</i></span>`).join("")}</div>` : ""}
      ${r.params ? `<div class="panel-h" style="margin-top:14px"><h3>المتغيرات المقاسة</h3></div><div class="sources">${r.params.map(s => `<span class="chip tone-none">${U.esc(s)}</span>`).join("")}</div>` : ""}
      ${r.methods ? `<div class="panel-h" style="margin-top:14px"><h3>طرائق العمل</h3></div><ul class="rs-methods">${r.methods.map(m => `<li>${U.esc(m)}</li>`).join("")}</ul>` : ""}
      ${r.notes ? `<p class="faint" style="font-size:.78rem;margin-top:10px">ملاحظة على المصدر: ${U.esc(r.notes)}</p>` : ""}
      <div class="row rs-actions" style="margin-top:16px">${actions.join("")}</div>`;

    (r.tables || []).forEach((t, ti) => drawChart(r, t, ti, 0));
    U.$$(".rs-rowseg").forEach(seg => seg.onclick = e => { const b = e.target.closest("button"); if (!b) return; U.$$("button", seg).forEach(x => x.classList.toggle("on", x === b)); drawChart(r, r.tables[+seg.dataset.t], +seg.dataset.t, +b.dataset.i); });
    U.$(".rs-actions").onclick = e => { const b = e.target.closest("[data-a]"); if (b) act(r, b.dataset.a); };
  }

  function drawChart(r, t, ti, rowIdx) {
    const cv = U.$("#rs-chart-" + ti); if (!cv) return;
    if (t.id === "bact") {
      const pal = [ECO.COL.silt, ECO.COL.rust, ECO.COL.river, ECO.COL.chloro];
      U.chart(cv, { type: "bar", data: { labels: t.rows.map(x => x[0]), datasets: t.cols.map((c, ci) => ({ label: c, data: t.rows.map(x => x[ci + 1]), backgroundColor: pal[ci] + "cc", borderRadius: 4 })) }, options: { plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, title: { display: true, text: t.unit } }, x: { grid: { display: false } } } } });
      return;
    }
    const row = t.rows[rowIdx];
    U.chart(cv, { type: "line", data: { labels: t.cols, datasets: [{ label: row[0], data: row.slice(1), borderColor: ECO.COL.silt, backgroundColor: "rgba(230,174,79,0.15)", fill: true, pointRadius: 4, pointBackgroundColor: ECO.COL.silt, tension: 0.25 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false }, title: { display: true, text: "من المصفى (م1) ← إلى النهر (م5)" } } } } });
  }

  function act(r, a) {
    const t = id => (r.tables || []).find(x => x.id === id);
    if (a === "lab") { const p = ECO.WATER_PRESETS.find(x => x.ref === r.id); ECO.water.fill(p.v, { name: p.name, site: r.place, source: `بيانات منشورة: ${r.authors} (${r.year})` }); }
    if (a === "phyto") ECO.calcOpen("phyto", "baiji1");
    if (a === "sed") ECO.calcOpen("sediment", "baiji1");
    if (a === "ccme") ECO.calcOpen("ccme", "baiji");
    if (a === "removal") ECO.calcOpen("removal", "baiji");
    if (a === "risk") ECO.calcOpen("health", "balad");
    if (a === "ask") { ECO.prefillChat(`لخّص لي البحث التالي وناقش نتائجه علمياً واقترح كيف أبني عليه بحث تخرج في المعالجة الحيوية:\n${cite(r)}\nالملخص: ${r.summary}${r.ranges ? "\nالنطاقات: " + r.ranges.map(x => `${x.label} ${x.min}–${x.max} ${x.unit}`).join("، ") : ""}`); ECO.go("assistant"); }
    if (a === "cite") { const c = cite(r); (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(() => U.toast("نُسخ المرجع"), () => window.prompt("انسخ المرجع", c)); }
    if (a === "pdf") report(r);
  }

  function report(r, mode) {
    const blocks = [
      { type: "kv", items: [["العنوان", r.title], ["الباحثون", r.authors], ["الجهة", r.affil], ["المجلة", `${r.journal}، ${r.vol}`], ["السنة", r.year], ["الموقع", r.place], ["الفترة", r.period], ["الرابط", r.url]] },
      { type: "text", html: U.esc(r.summary) },
      { type: "note", text: r.coordNote }
    ];
    if (r.ranges) blocks.push({ type: "h", text: "النطاقات المسجلة" }, { type: "table", head: ["المتغير", "الأدنى", "الأعلى", "الوحدة"], rows: r.ranges.map(x => [x.label, U.fmt(x.min, "auto"), U.fmt(x.max, "auto"), x.unit]) });
    (r.tables || []).forEach((t, ti) => {
      blocks.push({ type: "h", text: t.title }, { type: "table", head: ["", ...t.cols], rows: t.rows.map(row => [row[0], ...row.slice(1).map(v => U.fmt(v, "auto"))]) });
      const img = ECO.report.chartFrom(U.$("#rs-chart-" + ti), 640, 260); if (img) blocks.push({ type: "chart", src: img });
    });
    if (r.species) blocks.push({ type: "h", text: "الأنواع المعزولة" }, { type: "text", html: r.species.map(s => `<i>${U.esc(s)}</i>`).join("، ") });
    if (r.notes) blocks.push({ type: "note", text: "ملاحظة على المصدر: " + r.notes });
    blocks.push({ type: "refs", items: [cite(r)] });
    ECO.report.run({ title: "بطاقة بحث – جامعة تكريت", subtitle: r.place, file: "بحث-" + r.id, blocks }, mode);
  }

  function homeFeature() {
    const r = ECO.RESEARCH.find(x => x.supervisor); const box = U.$("#home-study"); if (!r || !box) return;
    const bod = r.ranges.find(x => x.k === "bod"), po4 = r.ranges.find(x => x.k === "po4"), bact = r.tables[0];
    box.innerHTML = `<div class="fs-in">
      <div class="fs-copy"><span class="eyebrow">From our department</span><h2>من بحوث قسمنا: بكتيريا دجلة في تكريت</h2>
        <p>دراسة فصلية لخمس محطات على نهر دجلة داخل مدينة تكريت (2022–2023) بإشراف ${U.esc(ECO.PROJECT.supervisor)}، رصدت المتغيرات الفيزيوكيميائية وعزلت أنواعاً بكتيرية منها الإشريكية القولونية والسالمونيلا.</p>
        <a class="btn btn-primary" href="#research" data-rs="${r.id}"><svg><use href="#i-book"/></svg>اعرض البحث والجداول</a></div>
      <div class="fs-nums">
        <div class="tile3d"><span>BOD₅</span><b dir="ltr">${bod.min}–${bod.max}</b><small>mg/L · الحد 5</small></div>
        <div class="tile3d"><span>الفوسفات</span><b dir="ltr">${U.fmt(po4.min, 2)}–${U.fmt(po4.max, 2)}</b><small>mg/L</small></div>
        <div class="tile3d"><span>أعلى عدد بكتيري</span><b dir="ltr">${Math.max(...bact.rows.map(x => Math.max(...x.slice(1))))}</b><small>${bact.unit}</small></div>
        <div class="tile3d"><span>أنواع معزولة</span><b>${r.species.length}</b><small>نوعاً بكتيرياً</small></div>
      </div></div>`;
  }

  ECO.researchReport = report;
  ECO.views.research = {
    init() {
      U.$("#rs-filter").innerHTML = FILTERS.map(([k, l]) => `<button type="button" data-f="${k}" class="${k === "all" ? "on" : ""}">${l}</button>`).join("");
      U.$("#rs-filter").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.filter = b.dataset.f; U.$$("#rs-filter button").forEach(x => x.classList.toggle("on", x === b)); renderList(); };
      U.$("#rs-list").onclick = e => { const b = e.target.closest(".study-card"); if (b) { select(b.dataset.id); if (window.innerWidth < 1100) U.$("#rs-detail").scrollIntoView({ behavior: "smooth" }); } };
      buildMap(); renderList();
      select(ECO._pendingResearch || ECO.RESEARCH[0].id); ECO._pendingResearch = null;
    },
    show() { if (S.map) setTimeout(() => S.map.invalidateSize(), 80); if (ECO._pendingResearch) { select(ECO._pendingResearch); ECO._pendingResearch = null; } }
  };
  ECO.bus.on("ready", homeFeature);
  setTimeout(homeFeature, 0);
})();
