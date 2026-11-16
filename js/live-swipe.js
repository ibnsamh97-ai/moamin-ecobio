/* =====================================================================
   EcoBio AI — قبل وبعد: صلاح الدين من الفضاء
   صورتان حقيقيتان من أرشيف Landsat (1984 حتى اليوم) للمكان نفسه، والفاصل
   تسحبه بإصبعك. لكل سنة تُختار أصفى صورة في أواخر الصيف (آب–تشرين الأول)
   حين يكون الماء في أدنى مستوياته والسماء صافية، ونستبعد Landsat 7 بعد
   عطل 2003 (صوره مخططة). المصدر: USGS Landsat Collection 2 Level-2 عبر
   Microsoft Planetary Computer.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  if (!document.getElementById("view-swipe")) return;
  const { ico, esc } = L;
  const PC = "https://planetarycomputer.microsoft.com/api";
  const CF = "gamma RGB 2.7, saturation 1.5, sigmoidal RGB 15 0.55";

  const PLACES = [
    { id: "tharthar", name: "بحيرة الثرثار", c: [34.0, 43.24], z: 9, d: 0.34, a: 1988,
      note: "أكبر بحيرة في العراق، تُملأ من دجلة عبر ذراع الثرثار عند سامراء. سجّلت ناسا في تشرين الأول 2025 أدنى مستوى لها منذ إنشائها سنة 1958، بعد سنوات من ضعف تدفق دجلة." },
    { id: "adhaim", name: "سد العظيم", c: [34.66, 44.5], z: 11, d: 0.12, a: 1990,
      note: "سد على نهر العظيم في صلاح الدين اكتمل بناؤه سنة 2000، فتكوّنت خلفه بحيرة لم تكن موجودة في صور الثمانينيات." },
    { id: "tikrit", name: "تكريت ودجلة", c: [34.61, 43.68], z: 12, d: 0.06, a: 1987,
      note: "قارن مجرى دجلة والجزر الطينية فيه، وامتداد المدينة والأراضي الزراعية على الضفتين." },
    { id: "samarra", name: "سامراء وسدّتها", c: [34.205, 43.86], z: 12, d: 0.06, a: 1987,
      note: "سدة سامراء على دجلة، ومنها يتفرع ذراع الثرثار غرباً. لاحظ بحيرة السدة وتوسع المدينة." },
    { id: "baiji", name: "بيجي والمصفى", c: [34.97, 43.49], z: 12, d: 0.07, a: 1990,
      note: "مجمع مصافي بيجي شمال المدينة على ضفة دجلة، وهو من أكبر مصادر التلوث الصناعي في المحافظة." }
  ];
  const YEARS = []; for (let y = new Date().getFullYear(); y >= 1984; y--) if (y !== 2012) YEARS.push(y);
  const S = { map: null, place: PLACES[0], ya: PLACES[0].a, yb: null, la: null, lb: null, ia: null, ib: null, x: 0.5, cache: new Map(), seq: 0 };

  const plat = p => ({ "landsat-4": "Landsat 4", "landsat-5": "Landsat 5", "landsat-7": "Landsat 7", "landsat-8": "Landsat 8", "landsat-9": "Landsat 9" })[p] || p;
  const cover = (b, x) => { const w = Math.max(0, Math.min(b[2], x[2]) - Math.max(b[0], x[0])), h = Math.max(0, Math.min(b[3], x[3]) - Math.max(b[1], x[1])); return w * h / ((x[2] - x[0]) * (x[3] - x[1])); };
  const boxOf = P => [P.c[1] - P.d, P.c[0] - P.d * 0.8, P.c[1] + P.d, P.c[0] + P.d * 0.8];

  /* أصفى صورة للسنة: آب–تشرين الأول أولاً، ثم أيار–تشرين الثاني */
  async function best(P, y) {
    const key = P.id + y;
    if (S.cache.has(key)) return S.cache.get(key);
    const box = boxOf(P), cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    let pick = null;
    for (const [m0, m1] of [["08-01", "10-31"], ["05-01", "11-30"]]) {
      const p = new URLSearchParams({ collections: "landsat-c2-l2", bbox: box.map(v => v.toFixed(4)).join(","), datetime: `${y}-${m0}T00:00:00Z/${y}-${m1}T23:59:59Z`, limit: "60",
        "filter-lang": "cql2-text", filter: "eo:cloud_cover<20", fields: "id,bbox,properties.datetime,properties.eo:cloud_cover,properties.platform" });
      const j = await ECO.space.pcGet("stac", "search", p);
      const c = (j.features || []).map(f => ({ id: f.id, bbox: f.bbox, date: String(f.properties.datetime).slice(0, 10), cloud: f.properties["eo:cloud_cover"], plat: f.properties.platform }))
        .filter(it => !(it.plat === "landsat-7" && it.date >= "2003-06-01"))
        .map(it => ({ ...it, frac: it.bbox ? cover(it.bbox, box) : 0 }))
        .filter(it => it.frac >= 0.6) // المشهد يغطي 60% من المكان على الأقل، والأفضل كله
        .map(it => ({ ...it, score: it.cloud + 40 * Math.hypot((it.bbox[0] + it.bbox[2]) / 2 - cx, (it.bbox[1] + it.bbox[3]) / 2 - cy) + (1 - it.frac) * 100 }))
        .sort((a, b) => a.score - b.score);
      if (c.length) { pick = c[0]; break; }
    }
    S.cache.set(key, pick);
    return pick;
  }
  function tpl(it) {
    const q = new URLSearchParams({ collection: "landsat-c2-l2", item: it.id, tile_format: "png", color_formula: CF });
    ["red", "green", "blue"].forEach(a => q.append("assets", a));
    const proxy = ECO.gemini && ECO.gemini.proxy && ECO.gemini.proxy();
    const base = ECO.space.state.via === "proxy" && proxy ? `${proxy}/v1/pc/data/` : `${PC}/data/v1/`;
    return `${base}item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?${q}`;
  }

  /* القص: الأقدم يمين الفاصل والأحدث يساره */
  function clip() {
    const m = S.map; if (!m) return;
    const sz = m.getSize(), nw = m.containerPointToLayerPoint([0, 0]), se = m.containerPointToLayerPoint(sz), cx = m.containerPointToLayerPoint([sz.x * S.x, 0]).x;
    if (S.la) S.la.getContainer().style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${cx}px)`;
    if (S.lb) S.lb.getContainer().style.clip = `rect(${nw.y}px, ${cx}px, ${se.y}px, ${nw.x}px)`;
    const h = U.$("#sw-div"); if (h) { h.style.left = (S.x * 100) + "%"; h.setAttribute("aria-valuenow", Math.round(S.x * 100)); }
  }

  async function side(which) {
    const P = S.place, y = which === "a" ? S.ya : S.yb, seq = ++S.seq, tag = U.$(`#sw-tag-${which}`);
    tag.innerHTML = `<b>${y}</b><span><span class="spinner"></span> يبحث في الأرشيف…</span>`;
    let it = null;
    try { it = await best(P, y); } catch (e) { tag.innerHTML = `<b>${y}</b><span class="warnc">${esc(ECO.space.errText(e))}</span>`; return; }
    if (S.place !== P) return;
    const old = which === "a" ? S.la : S.lb;
    if (!it) { tag.innerHTML = `<b>${y}</b><span class="warnc">لا توجد صورة صافية تغطي المكان في هذه السنة</span>`; if (old) { S.map.removeLayer(old); if (which === "a") S.la = null; else S.lb = null; } return; }
    const lyr = window.L.tileLayer(tpl(it), { maxNativeZoom: 13, maxZoom: 15, minZoom: 7, crossOrigin: true, attribution: "Landsat (USGS) · Microsoft Planetary Computer", bounds: [[it.bbox[1], it.bbox[0]], [it.bbox[3], it.bbox[2]]], zIndex: which === "a" ? 3 : 4 });
    lyr.addTo(S.map);
    if (which === "a") { S.la = lyr; S.ia = it; } else { S.lb = lyr; S.ib = it; }
    clip();
    lyr.once("load", () => { if (old) S.map.removeLayer(old); });
    setTimeout(() => { if (old && S.map.hasLayer(old)) S.map.removeLayer(old); }, 4000);
    tag.innerHTML = `<b>${y}</b><span>${L.dayY(it.date)} · ${plat(it.plat)} · غيوم ${U.fmt(it.cloud, 0)}%</span>`;
    void seq;
  }

  function choose(P) {
    S.place = P; S.ya = P.a; S.yb = S.yb || YEARS[0];
    U.$$(".sw-place").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === P.id)));
    U.$("#sw-note").textContent = P.note;
    U.$("#sw-ya").value = S.ya; U.$("#sw-yb").value = S.yb;
    S.map.setView(P.c, Math.min(P.z, innerWidth < 640 ? P.z - 1 : P.z), { animate: false });
    side("a"); sideB();
  }
  /* السنة الأحدث: إن لم توجد صورة هذه السنة بعد، ننزل سنة */
  async function sideB() {
    await side("b");
    if (!S.ib && S.yb === YEARS[0]) { S.yb = YEARS[1]; U.$("#sw-yb").value = S.yb; await side("b"); }
  }

  function render() {
    const box = U.$("#sw-root");
    const opts = YEARS.map(y => `<option value="${y}">${y}</option>`).join("");
    box.innerHTML = `
      <div class="sw-places" role="group" aria-label="اختر المكان">${PLACES.map(P => `<button type="button" class="chip sw-place" data-p="${P.id}" aria-pressed="false">${esc(P.name)}</button>`).join("")}</div>
      <div class="sw-stage">
        <div id="sw-map" class="sw-map" aria-label="مقارنة صورتين فضائيتين للمكان نفسه"></div>
        <div class="sw-tag sw-tag-a" id="sw-tag-a" aria-live="polite"></div>
        <div class="sw-tag sw-tag-b" id="sw-tag-b" aria-live="polite"></div>
        <div class="sw-div" id="sw-div" role="slider" tabindex="0" aria-label="الفاصل بين الصورتين" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><i>${ico("i-swipe")}</i></div>
      </div>
      <div class="sw-ctl">
        <div class="field"><label for="sw-ya">الصورة القديمة (يمين)</label><select id="sw-ya" class="input">${opts}</select></div>
        <div class="field"><label for="sw-yb">الصورة الحديثة (يسار)</label><select id="sw-yb" class="input">${opts}</select></div>
        <a class="btn" href="#twin">${ico("i-cube")}احسب مساحة الماء سنة بسنة</a>
      </div>
      <p class="sw-note" id="sw-note"></p>
      <details class="panel ws-method">
        <summary>${ico("i-info")}من أين الصور؟</summary>
        <ul>
          <li>صور حقيقية بالألوان الطبيعية (الأحمر والأخضر والأزرق) من أقمار Landsat 5 و8 و9 التابعة لهيئة المسح الجيولوجي الأمريكية، المنتج Collection 2 Level-2، بدقة 30 م، عبر Microsoft Planetary Computer.</li>
          <li>لكل سنة تُختار الصورة الأقل غيوماً بين آب وتشرين الأول (وإن لم توجد فبين أيار وتشرين الثاني)، والتي يغطي مشهدها المكان كله. التاريخ واسم القمر ونسبة الغيوم مكتوبة فوق كل صورة.</li>
          <li>نستبعد Landsat 7 بعد أيار 2003 لأن عطل جهاز المسح فيه يترك خطوطاً فارغة، ولذلك لا توجد سنة 2012 (لم يعمل غيره ذلك العام).</li>
          <li>الصور للمشاهدة والمقارنة البصرية؛ لحساب مساحة الماء بالكيلومتر المربع استعمل «توأم دجلة الرقمي» أو «وين راح الماي؟».</li>
        </ul>
      </details>`;
    const map = S.map = window.L.map("sw-map", { zoomControl: true, minZoom: 7, maxZoom: 15 }).setView(S.place.c, S.place.z);
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 15, attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    map.createPane("swLabels").style.zIndex = 450; map.getPane("swLabels").style.pointerEvents = "none";
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 15, pane: "swLabels", opacity: 0.85 }).addTo(map);
    map.on("move zoom resize zoomanim", clip);
    map.on("zoomend moveend", clip);

    const div = U.$("#sw-div"), stage = U.$(".sw-stage");
    const setX = x => { S.x = U.clamp(x, 0.02, 0.98); clip(); };
    div.addEventListener("pointerdown", e => {
      e.preventDefault(); e.stopPropagation(); div.setPointerCapture(e.pointerId); map.dragging.disable();
      const mv = ev => { const r = stage.getBoundingClientRect(); setX((ev.clientX - r.left) / r.width); };
      const up = () => { div.removeEventListener("pointermove", mv); div.removeEventListener("pointerup", up); div.removeEventListener("pointercancel", up); map.dragging.enable(); };
      div.addEventListener("pointermove", mv); div.addEventListener("pointerup", up); div.addEventListener("pointercancel", up);
    });
    window.L.DomEvent.disableClickPropagation(div);
    div.addEventListener("keydown", e => {
      const k = e.key; if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(k)) return; e.preventDefault();
      setX(k === "Home" ? 0.02 : k === "End" ? 0.98 : S.x + (k === "ArrowRight" ? 0.04 : -0.04));
    });
    box.addEventListener("click", e => { const b = e.target.closest(".sw-place"); if (b) choose(PLACES.find(P => P.id === b.dataset.p)); });
    U.$("#sw-ya").onchange = e => { S.ya = +e.target.value; side("a"); };
    U.$("#sw-yb").onchange = e => { S.yb = +e.target.value; side("b"); };
    choose(S.place);
  }

  ECO.views.swipe = {
    init() { if (!window.L || !ECO.space) { L.fail(U.$("#sw-root"), "مكتبة الخرائط لم تُحمّل."); return; } render(); },
    show() { if (S.map) setTimeout(() => { S.map.invalidateSize(); clip(); }, 60); }
  };
})();
