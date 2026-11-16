/* =====================================================================
   EcoBio AI — مصادر التلوث من الفضاء
   المواقع التي يرى فيها جهاز MODIS (القمران Terra وAqua) ناراً في معظم
   أيام السنة: شعلات حرق الغاز المصاحب في الحقول والمصافي. الأرقام رصد
   فعلي (كم يوماً رُصدت حرارة غير طبيعية في البكسل خلال آخر 365 يوماً)
   من قاعدة الأقضية، وتُضاف تقديرات Climate TRACE للانبعاثات بوصفها تقديراً.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  if (!document.getElementById("view-flares")) return;
  const { ico, esc } = L;
  const S = { data: null, map: null, osm: null, ct: null, chart: null, marks: [] };
  const KCOL = { refinery: "#ef5a64", oil_facility: "#ff8f6b", oil_well: "#e6ae4f", oil_storage: "#e6ae4f", power_plant: "#b493ff", industrial: "#8eaea7", works: "#8eaea7", landfill: "#93dd8a", quarry: "#c4d3cf", wastewater: "#4fc8dc" };
  const SECT = { "oil-and-gas-production": "إنتاج النفط والغاز", "oil-and-gas-refining": "تكرير النفط", "oil-and-gas-transport": "نقل النفط والغاز", electricity: "توليد الكهرباء", "electricity-generation": "توليد الكهرباء", cement: "الإسمنت", "solid-waste-disposal": "النفايات الصلبة", "domestic-wastewater-treatment-and-discharge": "مياه الصرف", "road-transportation": "النقل البري", "residential-onsite-fuel-usage": "وقود المنازل", "non-residential-onsite-fuel-usage": "وقود المباني غير السكنية", "enteric-fermentation-cattle-pasture": "الماشية", "cropland-fires": "حرق المحاصيل" };
  const CONF = { "very low": "منخفضة جداً", low: "منخفضة", medium: "متوسطة", high: "عالية", "very high": "عالية جداً" };
  const isArea = a => /District$/i.test(a.name || "") || /unknown/i.test(a.name || "") || !a.name;

  const siteName = (s, K) => s.name ? esc(s.name) : s.kind ? `${esc(K[s.kind] || s.kind)} غير مسمّى في الخرائط` : "موقع حراري غير مرسوم في الخرائط";
  const fD = d => L.dayY(d);

  function render() {
    const D = S.data, K = D.kinds || {}, box = U.$("#fl-root");
    const sites = D.sites.slice().sort((a, b) => b.days - a.days), inP = sites.filter(s => s.in_prov), top = inP[0] || sites[0];
    const ct = D.climatetrace && D.climatetrace.assets ? D.climatetrace.assets.filter(a => a.co2e_t && !isArea(a)) : [];
    box.innerHTML = `
      ${top ? `<section class="panel fl-hero"><div class="fl-ring" style="--p:${top.days / 365}"><b>${top.days}</b><small>من 365 يوماً</small></div>
        <div><h3>${siteName(top, K)}</h3><p>رأت الأقمار ناراً في هذا الموقع <b>${top.days}</b> يوماً خلال السنة الأخيرة (حتى ${fD(D.last_pixel)})، بقدرة إشعاعية متوسطة <bdi dir="ltr">${U.fmt(top.frp, 0)} MW</bdi>. الاشتعال شبه اليومي في المكان نفسه بصمة شعلات حرق الغاز المصاحب، وهي مصدر رئيسي لثاني أكسيد النتروجين والسخام وغازات الاحتباس.</p></div></section>` : ""}
      <div class="fl-grid">
        <div class="sw-stage"><div id="fl-map" class="fl-map" aria-label="خريطة المصادر الحرارية الدائمة"></div></div>
        <aside class="panel fl-side">
          <div class="panel-h"><h3>${ico("i-flame")}أكثر المواقع اشتعالاً</h3><span class="sub">آخر 365 يوماً</span></div>
          <ol class="fl-list">${sites.map((s, i) => `<li><button type="button" data-site="${D.sites.indexOf(s)}" class="${s.in_prov ? "" : "out"}">
            <span class="fl-n">${i + 1}</span><span class="fl-t"><b>${siteName(s, K)}</b><small>${s.in_prov ? "داخل صلاح الدين" : "خارج المحافظة (كركوك)"} · آخر رصد ${fD(s.last)}</small>
            <i class="fl-bar"><i style="width:${s.days / 365 * 100}%"></i></i></span><em>${s.days}<small>يوماً</small></em></button></li>`).join("")}</ol>
        </aside>
      </div>
      <div class="wl-leg fl-leg"><span><i class="fl-dot"></i>موقع يحترق 20 يوماً أو أكثر في السنة (حجمه بعدد الأيام)</span><label class="toggle"><input type="checkbox" id="fl-osm"><span class="sw"></span>المنشآت المرسومة (OpenStreetMap)</label>${ct.length ? `<label class="toggle"><input type="checkbox" id="fl-ct"><span class="sw"></span>تقديرات انبعاثات Climate TRACE</label>` : ""}</div>
      <section class="panel"><div class="panel-h"><h3>${ico("i-chart")}رصدات الحرائق شهراً بشهر</h3><span class="sub">ممر دجلة في صلاح الدين وما حوله</span></div>
        <div class="ws-chart"><canvas id="fl-cv" aria-label="عدد رصدات الحرائق كل شهر"></canvas></div>
        <p class="faint">كل رصد = بكسل 1 كم رأى فيه أحد القمرين حرارة غير طبيعية في يوم. الأحمر قرب منشأة نفطية أو صناعية مرسومة (≤ 2 كم)، والأصفر غيره، وأغلبه حرق مخلفات زراعية ونفايات في الصيف. الشهران الأول والأخير ناقصان لأن النافذة آخر 365 يوماً.</p></section>
      ${ct.length ? `<section class="panel"><div class="panel-h"><h3>${ico("i-src")}تقديرات الانبعاثات داخل المحافظة</h3><span class="sub warnc">تقدير نموذج، وليس قياساً</span></div>
        <table class="wl-tbl fl-ct"><thead><tr><th>المنشأة</th><th>القطاع</th><th>طن CO₂ مكافئ/سنة</th><th>ثقة التقدير</th></tr></thead><tbody>${ct.slice(0, 10).map(a => `<tr><td>${esc(a.name)}</td><td>${esc(SECT[a.sector] || a.sector || "")}</td><td><bdi dir="ltr">${U.fmt(a.co2e_t, 0)}</bdi></td><td>${esc(CONF[a.conf] || a.conf || "—")}</td></tr>`).join("")}</tbody></table>
        <p class="faint">Climate TRACE تحالف مستقل يقدّر انبعاثات كل منشأة من صور الأقمار ونماذج الذكاء الاصطناعي وبيانات الطاقة. الرقم تقدير له هامش خطأ، ودرجة الثقة يعطيها Climate TRACE نفسه، فلا يُستشهد به قياساً للمنشأة. أُخفيت هنا تقديرات الأقضية الكاملة (النقل البري ووقود المنازل) لأنها ليست منشآت.</p></section>` : ""}
      <div class="next-tools wd-next"><a class="btn" href="#sats">${ico("i-orbit")}متى يمر Terra وAqua فوق تكريت؟</a><a class="btn" href="#districts">${ico("i-db")}NO₂ اليومي من Sentinel-5P لكل قضاء</a><a class="btn" href="#wind">${ico("i-wind")}إلى أين تحمل الريح دخانها اليوم؟</a></div>
      <details class="panel ws-method">
        <summary>${ico("i-info")}المنهجية وحدود الدقة</summary>
        <ul>
          <li>الحرائق: منتج NASA MODIS للشذوذ الحراري والحرائق اليومي (MOD14A1/MYD14A1، الإصدار 6.1) بدقة 1 كم، من القمرين Terra وAqua، عبر Microsoft Planetary Computer، تُحدَّث في قاعدة الأقضية يومياً (آخر رصد ${fD(D.last_pixel)}).</li>
          <li>الموقع «الدائم»: خلية ≈ 1 كم رُصدت فيها النار في 20 يوماً مختلفاً على الأقل خلال آخر 365 يوماً، والخلايا المتجاورة (≤ 4 كم) جُمعت في موقع واحد، وسُمّي بأقرب منشأة مرسومة في OpenStreetMap ضمن 3 كم.</li>
          <li>الغيوم والغبار الكثيف يحجبان الرصد، فعدد الأيام حدّ أدنى. والقدرة الإشعاعية (FRP) مؤشر على شدة الاحتراق لحظة المرور، لا على كمية الغاز المحروق.</li>
          <li>حدود المحافظة من geoBoundaries، ولذلك تظهر حقول كركوك القريبة مميزة بأنها خارجها؛ دخانها يصل صلاح الدين حين تهب الريح من الشمال الشرقي.</li>
        </ul>
        <p class="faint ws-refs">Giglio, L., Schroeder, W., Justice, C.O. (2016). The collection 6 MODIS active fire detection algorithm and fire products. Remote Sens. Environ. 178: 31–41. · ${esc(D.osm_source)}${D.climatetrace ? " · " + esc(D.climatetrace.source) : ""}</p>
      </details>`;

    const map = S.map = window.L.map("fl-map", { minZoom: 6, maxZoom: 15 }).setView([35.0, 43.95], innerWidth < 640 ? 7 : 8);
    window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Esri World Imagery" }).addTo(map);
    if (U.labelLayers) U.labelLayers().addTo(map);
    L.get("water-change.json").then(W => window.L.geoJSON(W.boundary.geometry, { interactive: false, style: { color: "#ff8f6b", weight: 2, fill: false, dashArray: "6 4" } }).addTo(map)).catch(() => { /* */ });
    S.marks = D.sites.map(s => {
      const r = 5 + 14 * Math.sqrt(s.days / 365);
      const m = window.L.circleMarker([s.lat, s.lon], { radius: r, color: s.in_prov ? "#ffd27a" : "#c9a36a", weight: 1.5, fillColor: s.in_prov ? "#ff5a2e" : "#a8653a", fillOpacity: s.in_prov ? 0.75 : 0.5, className: s.in_prov && !U.reduced ? "fl-glow" : "" })
        .bindPopup(`<div class="wd-pop"><b>${siteName(s, K)}</b><span>${s.days} يوماً من 365 · ${s.cells} ${s.cells === 1 ? "بكسل" : "بكسلات"} 1 كم</span><span>القدرة المتوسطة <bdi dir="ltr">${U.fmt(s.frp, 0)} MW</bdi></span><small>آخر رصد ${fD(s.last)} · ${s.in_prov ? "داخل صلاح الدين" : "خارج المحافظة"}</small></div>`).addTo(map);
      return m;
    });
    const osmK = ["refinery", "oil_facility", "power_plant", "oil_storage", "landfill", "wastewater"];
    S.osm = window.L.layerGroup(D.sources.filter(s => osmK.includes(s.kind)).map(s => window.L.circleMarker([s.lat, s.lon], { radius: 4, color: "#fff", weight: 1, fillColor: KCOL[s.kind] || "#ccc", fillOpacity: 0.9 })
      .bindTooltip(`${esc(K[s.kind] || s.kind)}${s.name ? ": " + esc(s.name) : ""}`)));
    if (ct.length) S.ct = window.L.layerGroup(ct.map(a => window.L.circleMarker([a.lat, a.lon], { radius: 4 + 10 * Math.sqrt(a.co2e_t / ct[0].co2e_t), color: "#b493ff", weight: 1.5, fillColor: "#b493ff", fillOpacity: 0.25 })
      .bindPopup(`<div class="wd-pop"><b>${esc(a.name)}</b><span>${esc(SECT[a.sector] || a.sector || "")}</span><span>≈ <bdi dir="ltr">${U.fmt(a.co2e_t, 0)}</bdi> طن CO₂ مكافئ/سنة</span><small>تقدير Climate TRACE · ثقة ${esc(CONF[a.conf] || a.conf || "غير معروفة")}</small></div>`)));
    box.addEventListener("change", e => {
      if (e.target.id === "fl-osm") e.target.checked ? S.osm.addTo(map) : map.removeLayer(S.osm);
      if (e.target.id === "fl-ct" && S.ct) e.target.checked ? S.ct.addTo(map) : map.removeLayer(S.ct);
    });
    box.addEventListener("click", e => { const b = e.target.closest("[data-site]"); if (!b) return; const s = D.sites[+b.dataset.site]; map.setView([s.lat, s.lon], 12); S.marks[+b.dataset.site].openPopup(); U.$("#fl-map").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "center" }); });
    chart();
  }

  function chart() {
    const M = S.data.months || [], cv = U.$("#fl-cv"); if (!window.Chart || !cv || !M.length) return;
    const fm = m => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(m + "-01T00:00:00Z"));
    S.chart = new Chart(cv, { type: "bar", data: { labels: M.map(r => fm(r.m)), datasets: [
      { label: "قرب منشأة نفطية أو صناعية", data: M.map(r => r.nf), backgroundColor: "rgba(239,90,100,.85)", stack: "a" },
      { label: "حرائق أخرى", data: M.map(r => r.n - r.nf), backgroundColor: "rgba(230,174,79,.7)", stack: "a" }] },
      options: { scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: "رصدات (بكسل × يوم)" } } } } });
  }

  let loading = false;
  async function load() {
    if (S.data || loading) return; loading = true;
    const box = U.$("#fl-root");
    box.innerHTML = `<div class="panel lv-load"><span class="spinner"></span>جارٍ تحميل رصد الأقمار للحرائق…</div>`;
    try { S.data = await L.get("flares.json"); if (!S.data.sites) throw new Error("no data"); render(); }
    catch (e) { L.fail(box, "تعذّر تحميل بيانات الحرائق. تحقّق من الاتصال وأعد فتح الصفحة."); }
    finally { loading = false; }
  }
  ECO.views.flares = { init: load, show() { if (S.map) setTimeout(() => S.map.invalidateSize(), 60); if (S.chart) S.chart.resize(); } };
})();
