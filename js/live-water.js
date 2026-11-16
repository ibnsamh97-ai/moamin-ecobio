/* =====================================================================
   EcoBio AI — وين راح الماي؟
   طبقة التحوّلات من JRC Global Surface Water v1.4: لكل بكسل 30 م تقارن
   نوع الماء في 1984 بنوعه في 2021 (دائم، موسمي، ضاع، جديد…). المساحات
   محسوبة في GitHub Actions من ملف GeoTIFF الأصلي داخل حدود المحافظة
   (geoBoundaries) ومستطيل بحيرة الثرثار (etl/live/water_jrc.py).
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  if (!document.getElementById("view-waterloss")) return;
  const { ico, esc } = L;
  const TILES = "https://storage.googleapis.com/global-surface-water/tiles2021/";
  /* ألوان JRC الرسمية لطبقة التحوّلات */
  const CLS = [
    ["permanent", "#0000ff", "ماء دائم في السنتين"], ["new_permanent", "#22b14c", "ماء دائم جديد"], ["lost_permanent", "#d1102d", "ماء دائم ضاع"],
    ["seasonal", "#99d9ea", "ماء موسمي في السنتين"], ["new_seasonal", "#b5e61d", "ماء موسمي جديد"], ["lost_seasonal", "#e6a1aa", "ماء موسمي ضاع"],
    ["seasonal_to_permanent", "#ff7f27", "موسمي صار دائماً"], ["permanent_to_seasonal", "#ffc90e", "دائم صار موسمياً"],
    ["ephemeral_permanent", "#7f7f7f", "ظهر دائماً ثم اختفى"], ["ephemeral_seasonal", "#c3c3c3", "ظهر موسمياً ثم اختفى"]
  ];
  const PLACES = [["الثرثار", [33.98, 43.24], 9], ["سد العظيم", [34.66, 44.5], 11], ["سامراء", [34.2, 43.86], 11], ["تكريت", [34.61, 43.68], 11], ["المحافظة كلها", null, 0]];
  const PITCH = 105 * 68 / 1e6; // ملعب كرة قدم بقياس FIFA بالكيلومتر المربع
  const S = { data: null, map: null, reg: "province", layer: null, kind: "transitions", bnd: null };

  const km = v => `<bdi dir="ltr">${U.fmt(v, v >= 100 ? 0 : 1)} km²</bdi>`;

  function stats() {
    const D = S.data, r = D.regions.find(x => x.id === S.reg), c = r.classes;
    const tot = CLS.reduce((s, [k]) => s + c[k], 0), adh = D.regions.find(x => x.id === "adhaim");
    U.$("#wl-stats").innerHTML = `
      <div class="wl-tabs" role="tablist">${D.regions.map(x => `<button type="button" role="tab" class="chip" data-reg="${x.id}" aria-selected="${x.id === S.reg}">${esc({ province: "محافظة صلاح الدين", tharthar: "بحيرة الثرثار", adhaim: "بحيرة سد العظيم" }[x.id] || x.name)}</button>`).join("")}</div>
      <div class="wl-kpis">
        <div class="wl-k lost"><small>ماء ضاع كلياً بين 1984 و2021</small><b>${km(r.lost_km2)}</b><span>≈ ${U.fmt(r.lost_km2 / PITCH, 0)} ملعب كرة قدم</span></div>
        <div class="wl-k warn"><small>ماء كان دائماً فصار موسمياً</small><b>${km(r.perm_to_seasonal_km2)}</b><span>يجفّ جزءاً من السنة</span></div>
        <div class="wl-k new"><small>ماء جديد لم يكن سنة 1984</small><b>${km(r.new_km2)}</b><span>${S.reg === "adhaim" ? "خلف السد الذي اكتمل سنة 2000 (انظر الخريطة)" : adh && S.reg === "province" ? `ومستطيل بحيرة سد العظيم وحده فيه ${km(adh.new_km2)}` : r.new_km2 < 2 ? "تقريباً لا شيء" : ""}</span></div>
      </div>
      <div class="wl-bar" dir="ltr" role="img" aria-label="توزيع أصناف الماء">${CLS.filter(([k]) => c[k] > 0).map(([k, col, n]) => `<i style="flex:${c[k]};background:${col}" title="${esc(n)}: ${U.fmt(c[k], 1)} km²"></i>`).join("")}</div>
      <table class="wl-tbl"><tbody>${CLS.map(([k, col, n]) => `<tr><td><i style="background:${col}"></i>${esc(n)}</td><td>${km(c[k])}</td><td>${U.fmt(c[k] / tot * 100, 1)}%</td></tr>`).join("")}</tbody></table>
      <p class="faint">${S.reg === "province" ? `داخل حدود المحافظة (${km(r.classes.area_km2)} حسب geoBoundaries).` : S.reg === "tharthar" ? `داخل مستطيل يحيط بالبحيرة (${km(r.classes.area_km2)})، والبحيرة مشتركة بين صلاح الدين والأنبار.` : `داخل مستطيل شمال السد (${km(r.classes.area_km2)}) مرسوم على الخريطة.`} الماء سنة 1984 ${km(r.water_1984_km2)} وسنة 2021 ${km(r.water_2021_km2)} (دائم وموسمي).</p>`;
  }

  function layer() {
    if (S.layer) S.map.removeLayer(S.layer);
    S.layer = window.L.tileLayer(TILES + S.kind + "/{z}/{x}/{y}.png", { maxNativeZoom: 13, maxZoom: 15, opacity: 0.95, attribution: "Source: EC JRC/Google (Pekel et al. 2016)", crossOrigin: true }).addTo(S.map);
    U.$("#wl-leg").innerHTML = S.kind === "transitions"
      ? CLS.map(([, col, n]) => `<span><i style="background:${col}"></i>${esc(n)}</span>`).join("")
      : `<span class="wl-occ"><em>نادراً</em><i style="background:linear-gradient(90deg,#ffbbbb,#0000ff)"></i><em>دائماً</em></span><span class="faint">نسبة الأشهر التي ظهر فيها الماء 1984–2021</span>`;
    U.$$("[data-kind]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kind === S.kind)));
  }

  function render() {
    const D = S.data, box = U.$("#wl-root");
    box.innerHTML = `
      <div class="wl-top">
        <div class="sw-places" role="group" aria-label="اذهب إلى">${PLACES.map(([n], i) => `<button type="button" class="chip" data-go="${i}">${esc(n)}</button>`).join("")}</div>
        <div class="wl-kind" role="group" aria-label="الطبقة"><button type="button" class="chip" data-kind="transitions">ماذا تغيّر</button><button type="button" class="chip" data-kind="occurrence">كم مرة ظهر الماء</button></div>
      </div>
      <div class="sw-stage"><div id="wl-map" class="wl-map" aria-label="خريطة تغيّر الماء السطحي"></div></div>
      <div class="wl-leg" id="wl-leg"></div>
      <section class="panel" id="wl-stats"></section>
      <div class="panel wl-2025">${ico("i-warn")}<p>الطبقة تقارن 1984 بـ 2021 فقط. بعدها ساء الوضع: سجّلت ناسا في تشرين الأول 2025 أدنى منسوب لبحيرة الثرثار منذ إنشائها سنة 1958. شاهد صورة 2025 بنفسك في <a href="#swipe">قبل وبعد من الفضاء</a>، أو احسب المساحة سنة بسنة حتى اليوم في <a href="#twin">توأم دجلة الرقمي</a>.</p></div>
      <details class="panel ws-method">
        <summary>${ico("i-info")}المنهجية وحدود الدقة</summary>
        <ul>
          <li>JRC Global Surface Water v1.4: كل صور Landsat 5 و7 و8 المتاحة من آذار 1984 إلى كانون الأول 2021، صُنّف كل بكسل فيها ماءً أو يابسة بدقة 30 م.</li>
          <li>طبقة التحوّلات تقارن السنة الأولى بالأخيرة لكل بكسل: «دائم» يعني ماء طوال السنة، و«موسمي» ماء في جزء منها، و«ضاع» كان ماءً وصار يابسة، و«جديد» العكس، و«ظهر ثم اختفى» ماء في سنوات وسطى فقط.</li>
          <li>المساحات حسبناها من ملف GeoTIFF الأصلي (البلاطة 40E_40N) بجمع مساحة كل بكسل حسب خط عرضه، داخل حدود المحافظة من geoBoundaries، بتاريخ ${esc((D.generated || "").slice(0, 10))}.</li>
        </ul>
        <p class="faint ws-refs">${esc(D.citation)} · Source: EC JRC/Google · ${esc(D.boundary.source)}</p>
      </details>`;
    const map = S.map = window.L.map("wl-map", { minZoom: 6, maxZoom: 15 }).setView([34.45, 43.75], innerWidth < 640 ? 7 : 8);
    window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Esri World Imagery" }).addTo(map);
    map.createPane("wlTop").style.zIndex = 460;
    S.bnd = window.L.geoJSON(D.boundary.geometry, { pane: "wlTop", interactive: false, style: { color: "#ff8f6b", weight: 2, fill: false, dashArray: "6 4" } }).addTo(map);
    D.regions.filter(r => r.bbox).forEach(r => window.L.rectangle([[r.bbox[1], r.bbox[0]], [r.bbox[3], r.bbox[2]]], { pane: "wlTop", interactive: false, color: "#fff", weight: 1, dashArray: "3 5", fill: false }).addTo(map));
    layer(); stats();
    box.addEventListener("click", e => {
      const g = e.target.closest("[data-go]"), k = e.target.closest("[data-kind]"), r = e.target.closest("[data-reg]");
      if (g) { const P = PLACES[+g.dataset.go]; if (P[1]) map.setView(P[1], P[2]); else map.fitBounds(S.bnd.getBounds()); }
      if (k) { S.kind = k.dataset.kind; layer(); }
      if (r) { S.reg = r.dataset.reg; stats(); }
    });
  }

  let loading = false;
  async function load() {
    if (S.data || loading) return; loading = true;
    const box = U.$("#wl-root");
    box.innerHTML = `<div class="panel lv-load"><span class="spinner"></span>جارٍ تحميل خريطة الماء…</div>`;
    try { S.data = await L.get("water-change.json"); render(); }
    catch (e) { L.fail(box, "تعذّر تحميل بيانات الماء. تحقّق من الاتصال وأعد فتح الصفحة."); }
    finally { loading = false; }
  }
  ECO.views.waterloss = { init: load, show() { if (S.map) setTimeout(() => S.map.invalidateSize(), 60); } };
})();
