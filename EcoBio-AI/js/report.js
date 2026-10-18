/* =====================================================================
   EcoBio AI — محرك تقارير PDF باسم المختبر (جداول، رسوم، صور)
   يبني صفحات A4 بتنسيق عربي ثم يحوّلها إلى PDF، أو يطبعها مباشرة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const W = 794, H = 1123; // A4 بدقة 96dpi
  const R = ECO.report = {};

  const LOGO = `<svg viewBox="0 0 132 132" width="46" height="46"><ellipse cx="66" cy="66" rx="60" ry="60" fill="none" stroke="#bff3ff" stroke-width="5" stroke-dasharray="10 12"/><path d="M66 108C42 96 34 72 42 50c8-20 26-28 46-30 4 22 2 46-10 64-4 6-8 12-12 24Z" fill="none" stroke="#c9f7c2" stroke-width="8" stroke-linejoin="round"/><path d="M66 108c2-20 6-38 18-62" fill="none" stroke="#bff3ff" stroke-width="6" stroke-linecap="round"/><circle cx="66" cy="6" r="8" fill="#ffd27a"/></svg>`;

  R.number = () => { const d = new Date(); return `ECO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`; };
  const today = () => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { dateStyle: "long", timeZone: "Asia/Baghdad" }).format(new Date());

  /* تحويل رسم Chart.js إلى صورة بألوان مناسبة للورق الأبيض */
  R.chartImage = (cfg, w = 700, h = 300) => {
    if (!window.Chart) return null;
    const c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2; c.style.width = w + "px"; c.style.height = h + "px";
    const holder = U.el("div", { style: `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px` }); holder.appendChild(c); document.body.appendChild(holder);
    const conf = JSON.parse(JSON.stringify(cfg, (k, v) => (typeof v === "function" ? undefined : v)));
    conf.options = conf.options || {};
    Object.assign(conf.options, { responsive: false, animation: false, devicePixelRatio: 2, maintainAspectRatio: false });
    conf.options.plugins = conf.options.plugins || {};
    conf.options.plugins.legend = Object.assign({ position: "bottom" }, conf.options.plugins.legend || {}, { labels: { color: "#22343b", font: { size: 12 } } });
    const sc = conf.options.scales || {};
    Object.values(sc).forEach(a => { a.ticks = Object.assign({}, a.ticks, { color: "#3c5259" }); a.grid = Object.assign({}, a.grid, { color: "#e4ecee" }); if (a.pointLabels) a.pointLabels.color = "#3c5259"; if (a.angleLines) a.angleLines.color = "#e4ecee"; if (a.title) a.title.color = "#3c5259"; });
    let url = null;
    try { const ch = new Chart(c, conf); url = c.toDataURL("image/png"); ch.destroy(); } catch (e) { console.warn(e); }
    holder.remove();
    return url;
  };

  /* تحويل جدول عناصر Chart موجود إلى صورة */
  R.chartFrom = (canvas, w, h) => { const ch = canvas && window.Chart && Chart.getChart(canvas); return ch ? R.chartImage(ch.config._config || ch.config, w, h) : null; };

  /* --- بناء الصفحات --- */
  function header(p, title, sub, meta, pageNo) {
    return `<div class="rp-head">
      <div class="rp-brand">${LOGO}<div><b>${U.esc(p.lab)}</b><span>${U.esc(p.department)} – ${U.esc(p.college)} – ${U.esc(p.university)}</span></div></div>
      <div class="rp-title"><b>${U.esc(title)}</b>${sub ? `<span>${U.esc(sub)}</span>` : ""}</div>
    </div>
    ${pageNo === 1 ? `<div class="rp-meta"><span>رقم التقرير: <b dir="ltr">${meta.no}</b></span><span>التاريخ: <b>${meta.date}</b></span><span>إعداد الطالب: <b>${U.esc(p.student)}</b></span><span>إشراف: <b>${U.esc(p.supervisor)}</b></span></div>` : ""}`;
  }
  function blockEl(b) {
    const d = document.createElement("div"); d.className = "rp-block";
    switch (b.type) {
      case "h": d.innerHTML = `<h2>${U.esc(b.text)}</h2>`; break;
      case "text": d.innerHTML = `<div class="rp-text">${b.html}</div>`; break;
      case "note": d.innerHTML = `<div class="rp-note">${b.html || U.esc(b.text)}</div>`; break;
      case "kv": d.innerHTML = `<div class="rp-kv">${b.items.map(([k, v]) => `<div><span>${U.esc(k)}</span><b>${v == null || v === "" ? "—" : U.esc(String(v))}</b></div>`).join("")}</div>`; break;
      case "cards": d.innerHTML = `<div class="rp-cards">${b.items.map(c => `<div class="rp-card ${c.tone ? "t-" + c.tone : ""}"><span>${U.esc(c.label)}</span><b dir="ltr">${U.esc(String(c.value))}${c.unit ? ` <small>${U.esc(c.unit)}</small>` : ""}</b>${c.sub ? `<em>${U.esc(c.sub)}</em>` : ""}</div>`).join("")}</div>`; break;
      case "table": d.innerHTML = `${b.caption ? `<div class="rp-cap">${U.esc(b.caption)}</div>` : ""}<table class="rp-table"><thead><tr>${b.head.map(h => `<th>${U.esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${c == null ? "—" : (typeof c === "object" && c.html ? c.html : U.esc(String(c)))}</td>`).join("")}</tr>`).join("")}</tbody></table>`; d.dataset.table = "1"; break;
      case "image": d.innerHTML = b.src ? `<figure class="rp-fig"><img src="${b.src}" style="max-height:${b.maxH || 360}px">${b.caption ? `<figcaption>${U.esc(b.caption)}</figcaption>` : ""}</figure>` : ""; break;
      case "images": d.innerHTML = `<div class="rp-gallery">${b.items.map(i => `<figure><img src="${i.src}"><figcaption>${U.esc(i.caption || "")}</figcaption></figure>`).join("")}</div>`; break;
      case "chart": { const src = b.src || R.chartImage(b.config, b.w || 700, b.h || 280); d.innerHTML = src ? `<figure class="rp-fig rp-chart"><img src="${src}">${b.caption ? `<figcaption>${U.esc(b.caption)}</figcaption>` : ""}</figure>` : ""; break; }
      case "refs": d.innerHTML = `<div class="rp-refs"><b>المراجع والمصادر</b><ol>${b.items.map(r => `<li>${U.esc(r)}</li>`).join("")}</ol></div>`; break;
      case "sign": d.innerHTML = `<div class="rp-sign"><div><span>توقيع الطالب</span><b>${U.esc(ECO.profile().student)}</b></div><div><span>توقيع المشرف</span><b>${U.esc(ECO.profile().supervisor)}</b></div></div>`; break;
    }
    return d;
  }
  function newPage(stage, opts, meta, n) {
    const p = ECO.profile();
    const pg = U.el("div", { class: "rp-page" });
    pg.innerHTML = header(p, opts.title, opts.subtitle, meta, n) + `<div class="rp-body"></div><div class="rp-foot"><span>EcoBio AI · ${U.esc(p.lab)}</span><span class="rp-pn" dir="ltr"></span></div>`;
    stage.appendChild(pg);
    return pg;
  }
  async function layout(opts) {
    const stage = U.$("#report-stage"); stage.innerHTML = ""; stage.classList.add("on");
    const meta = { no: opts.no || R.number(), date: today() };
    const pages = []; let pg = newPage(stage, opts, meta, 1); pages.push(pg);
    let body = pg.querySelector(".rp-body");
    const limit = () => body.clientHeight;
    for (const b of opts.blocks) {
      if (!b) continue;
      let el = blockEl(b); body.appendChild(el);
      if (el.querySelectorAll("img").length) await Promise.all([...el.querySelectorAll("img")].map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))));
      if (body.scrollHeight <= limit() + 1) continue;
      if (el.dataset.table && b.rows.length > 3) {
        // تقسيم الجداول الطويلة بين الصفحات مع تكرار الترويسة
        el.remove();
        let rows = b.rows.slice(), cont = false;
        while (rows.length) {
          const mk = n => blockEl({ ...b, caption: cont ? (b.caption ? b.caption + " (تابع)" : "") : b.caption, rows: rows.slice(0, n) });
          let take = rows.length, t = mk(take); body.appendChild(t);
          while (body.scrollHeight > limit() + 1 && take > 1) { take--; const nt = mk(take); t.replaceWith(nt); t = nt; }
          if (body.scrollHeight > limit() + 1 && body.children.length > 1) {
            t.remove(); pg = newPage(stage, opts, meta, pages.length + 1); pages.push(pg); body = pg.querySelector(".rp-body"); continue;
          }
          rows = rows.slice(take); cont = true;
          if (rows.length) { pg = newPage(stage, opts, meta, pages.length + 1); pages.push(pg); body = pg.querySelector(".rp-body"); }
        }
      } else if (body.children.length > 1) {
        el.remove(); pg = newPage(stage, opts, meta, pages.length + 1); pages.push(pg); body = pg.querySelector(".rp-body"); body.appendChild(blockEl(b));
      }
    }
    pages.forEach((p, i) => { p.querySelector(".rp-pn").textContent = `${i + 1} / ${pages.length}`; });
    return { stage, pages, meta };
  }

  /* تنزيل PDF مباشرة */
  R.pdf = async opts => {
    if (!window.html2canvas || !window.jspdf) { U.toast("مكتبة PDF غير محمّلة"); return; }
    U.toast("جارٍ تجهيز التقرير…");
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const { stage, pages, meta } = await layout(opts);
      const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4", compress: true });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, width: W, height: H, windowWidth: W });
        if (i) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297);
      }
      pdf.setProperties({ title: opts.title, subject: opts.subtitle || "", author: ECO.profile().student, creator: "EcoBio AI" });
      pdf.save(`${(opts.file || opts.title).replace(/[\\/:*?"<>|]/g, "-")}-${meta.no}.pdf`);
      stage.innerHTML = ""; stage.classList.remove("on");
      U.toast("تم إنشاء التقرير");
    } catch (e) {
      console.error(e); U.toast("تعذّر إنشاء PDF: " + e.message);
      const st = U.$("#report-stage"); st.innerHTML = ""; st.classList.remove("on");
    }
  };

  /* طباعة / حفظ PDF نصي عالي الجودة من المتصفح */
  R.print = async opts => {
    const { stage, pages } = await layout(opts);
    const css = [...document.querySelectorAll("style")].map(s => s.outerHTML).join("") + [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join("");
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${U.esc(opts.title)}</title>${css}<style>@page{size:A4;margin:0}body{margin:0;background:#fff}.rp-page{page-break-after:always;box-shadow:none!important;margin:0!important}</style></head><body class="rp-print">${pages.map(p => p.outerHTML).join("")}</body></html>`;
    stage.innerHTML = ""; stage.classList.remove("on");
    const f = U.el("iframe", { style: "position:fixed;width:0;height:0;border:0;left:-9999px" }); document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { U.toast("الطباعة غير متاحة في هذه الصفحة"); } setTimeout(() => f.remove(), 4000); }, 900);
  };

  /* زر موحّد: تنزيل أو طباعة */
  R.run = (opts, mode) => (mode === "print" ? R.print(opts) : R.pdf(opts));
})();

/* =====================================================================
   مركز التقارير
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const PROFILE_FIELDS = [["lab", "اسم المختبر في الترويسة"], ["student", "اسم الطالب"], ["supervisor", "المشرف"], ["university", "الجامعة"], ["college", "الكلية"], ["department", "القسم"], ["year", "العام الدراسي"]];

  function airReport(mode) {
    const cur = ECO._lastCurrent;
    if (!cur || !Object.keys(cur).length) { U.toast("لا توجد قراءات حية الآن؛ تأكد من الاتصال"); return; }
    const keys = ["us_aqi", "pm2_5", "pm10", "dust", "nitrogen_dioxide", "sulphur_dioxide", "ozone", "carbon_monoxide"];
    const head = ["المحطة", "AQI", "PM2.5", "PM10", "الغبار", "NO₂", "SO₂", "O₃", "CO"];
    const rows = ECO.STATIONS.map(s => { const c = cur[s.id] || {}; return [s.name, ...keys.map(k => U.fmt(c[k], k === "us_aqi" || k === "carbon_monoxide" ? 0 : 1))]; });
    const t = (cur[ECO.DEFAULT_STATION] || {}).time;
    const over = ECO.STATIONS.map(s => { const c = cur[s.id] || {}; return [s.name, ...["pm2_5", "pm10", "nitrogen_dioxide", "sulphur_dioxide"].map(k => { const m = ECO.AIR.find(a => a.key === k); return U.isNum(c[k]) ? U.fmt(c[k] / m.who, 2) + "×" : "—"; })]; });
    ECO.report.run({
      title: "تقرير جودة الهواء فوق نهر دجلة", subtitle: t ? "قراءة " + U.fmtTime(t) + " بتوقيت بغداد" : "", file: "تقرير-جودة-الهواء",
      blocks: [
        { type: "text", html: "قراءات ساعية من نموذج Copernicus Atmosphere Monitoring Service (CAMS) العالمي الذي يدمج أرصاد الأقمار الصناعية، بدقة مكانية نحو 45 كم، عبر خدمة Open-Meteo. الوحدات µg/m³ ما عدا AQI." },
        { type: "table", caption: "القراءات الحالية لمحطات الرصد", head, rows },
        { type: "table", caption: "النسبة إلى حدود منظمة الصحة العالمية 2021 (24 ساعة)", head: ["المحطة", "PM2.5", "PM10", "NO₂", "SO₂"], rows: over },
        ECO.report.chartFrom(U.$("#chart-cmp")) ? { type: "chart", src: ECO.report.chartFrom(U.$("#chart-cmp"), 640, 280), caption: "مقارنة المحطات" } : null,
        ECO.report.chartFrom(U.$("#chart-ts")) ? { type: "chart", src: ECO.report.chartFrom(U.$("#chart-ts"), 680, 280), caption: "السلسلة الزمنية للمحطة المختارة" } : null,
        { type: "refs", items: ["Copernicus Atmosphere Monitoring Service (CAMS) global atmospheric composition forecasts.", "Open-Meteo Air Quality API.", "WHO (2021). WHO global air quality guidelines."] },
        { type: "sign" }
      ]
    }, mode);
  }
  function analysisReport(mode) {
    const a = ECO.analysisSummary && ECO.analysisSummary();
    if (!a) { U.toast("شغّل التحليل الذكي أولاً"); ECO.go("analysis"); return; }
    const img = id => ECO.report.chartFrom(U.$(id), 660, 260);
    ECO.report.run({
      title: "تقرير التحليل الذكي لجودة الهواء", subtitle: a["المحطة"] + " – " + a["الفترة"], file: "تقرير-التحليل-الذكي",
      blocks: [
        { type: "kv", items: [["المحطة", a["المحطة"]], ["الفترة", a["الفترة"]], ["مصدر البيانات", a["مصدر_البيانات"]], ["متوسط PM2.5", a["متوسط_PM25"] + " µg/m³"], ["أعلى PM10", a["أعلى_PM10"] + " µg/m³"], ["أيام تجاوز PM2.5", a["أيام_تجاوز_PM25"]], ["اتجاه PM10 الأسبوعي", a["اتجاه_PM10_أسبوعياً"]], ["مؤشر المخاطر (24 ساعة)", a["مؤشر_المخاطر_24س"]]] },
        a["نموذج_التعلم_الآلي"] ? { type: "cards", items: [{ label: "R² للنموذج", value: a["نموذج_التعلم_الآلي"].R2 }, { label: "RMSE", value: a["نموذج_التعلم_الآلي"].RMSE, unit: "µg/m³" }, { label: "RMSE الاستمرارية", value: a["نموذج_التعلم_الآلي"]["RMSE_الاستمرارية"], unit: "µg/m³" }] } : null,
        img("#chart-anom") ? { type: "chart", src: img("#chart-anom"), caption: "المتوسطات اليومية والأيام الشاذة" } : null,
        img("#chart-ml") ? { type: "chart", src: img("#chart-ml"), caption: "أداء نموذج التعلم الآلي على بيانات الاختبار" } : null,
        a["الحالات_الشاذة"].length ? { type: "table", caption: "الأيام الشاذة (|z| ≥ 2.5)", head: ["الملوث", "اليوم", "المتوسط", "z"], rows: a["الحالات_الشاذة"].map(x => [x["ملوث"], x["يوم"], x["متوسط"], x.z]) } : null,
        U.$("#an-report-out") && U.$("#an-report-out").textContent.trim().length > 80 ? { type: "h", text: "التقرير العلمي (Gemini)" } : null,
        U.$("#an-report-out") && U.$("#an-report-out").textContent.trim().length > 80 ? { type: "text", html: U.$("#an-report-out").innerHTML } : null,
        { type: "sign" }
      ]
    }, mode);
  }
  function researchSummary(mode) {
    ECO.report.run({
      title: "ملخص بحوث جامعة تكريت في التلوث", subtitle: "بيانات منشورة مستخدمة في المنصة", file: "ملخص-بحوث-تكريت",
      blocks: [
        { type: "table", head: ["البحث", "الباحثون", "السنة", "الموقع", "الوسط"], rows: ECO.RESEARCH.map(r => [r.title, r.authors, r.year, r.place, r.medium]) },
        ...ECO.RESEARCH.flatMap(r => [{ type: "h", text: r.place + " (" + r.year + ")" + (r.supervisor ? " – بحث المشرفة" : "") }, { type: "text", html: U.esc(r.summary) }]),
        { type: "refs", items: ECO.RESEARCH.map(r => `${r.authors} (${r.year}). ${r.title}. ${r.journal}, ${r.vol}.`) }
      ]
    }, mode);
  }
  const CARDS = [
    ["water", "تقرير عينة مياه", "WQI وHPI وجدول المطابقة ومخطط Qn وخطة المعالجة للعينة الحالية في مختبر المياه.", "i-drop", m => (ECO.water && ECO.water.last() ? ECO.water.report(m) : (U.toast("افتح مختبر المياه واحسب عينة أولاً"), ECO.go("water")))],
    ["samples", "تقرير حملة العينات", "خريطة المواقع وسجل العينات ونتائجها وصورها.", "i-pin", m => { if (!ECO.views.samples._inited) { ECO.go("samples"); setTimeout(() => ECO.samplesReport(m), 1200); } else ECO.samplesReport(m); }],
    ["air", "تقرير جودة الهواء", "قراءات المحطات السبع الحالية ومقارنتها بحدود WHO.", "i-sat", airReport],
    ["analysis", "تقرير التحليل الذكي", "نتائج التعلم الآلي والأيام الشاذة وتقرير Gemini.", "i-brain", analysisReport],
    ["vision", "تقرير قراءة صورة", "مؤشر Forel-Ule والمؤشرات المرئية للصورة الحالية.", "i-camera", () => ECO.go("vision")],
    ["research", "ملخص بحوث جامعة تكريت", "جدول البحوث المنشورة وملخصاتها ومراجعها.", "i-book", researchSummary]
  ];
  ECO.views.reports = {
    init() {
      U.$("#rep-grid").innerHTML = CARDS.map(([id, t, d, ic]) => `<div class="panel rep-card tile3d"><span class="cc-ic"><svg><use href="#${ic}"/></svg></span><h3>${t}</h3><p class="muted">${d}</p><div class="row"><button class="btn btn-primary btn-sm" type="button" data-rep="${id}"><svg><use href="#i-down"/></svg>تنزيل PDF</button><button class="btn btn-sm" type="button" data-rep="${id}" data-mode="print">طباعة</button></div></div>`).join("");
      U.$("#rep-grid").onclick = e => { const b = e.target.closest("[data-rep]"); if (!b) return; const c = CARDS.find(x => x[0] === b.dataset.rep); c[4](b.dataset.mode); };
      const p = ECO.profile();
      U.$("#rep-profile").innerHTML = PROFILE_FIELDS.map(([k, l]) => `<div class="field"><label for="rp-${k}">${l}</label><input id="rp-${k}" class="input" value="${U.esc(p[k] || "")}"></div>`).join("");
      U.$("#rep-save").onclick = () => { const o = {}; PROFILE_FIELDS.forEach(([k]) => { o[k] = U.$("#rp-" + k).value.trim(); }); U.store.set("profile", o); U.$("#rep-status").textContent = "حُفظت الترويسة."; ECO.bus.emit("profile"); };
    }
  };
})();
