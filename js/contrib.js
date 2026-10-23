/* =====================================================================
   EcoBio AI — مواقع بحوث الأساتذة المشتركة
   يضيف الباحث موقع عمله ← يُحفظ في الخادم المشترك بانتظار المراجعة ←
   توافق المشرفة من صفحة المراجعة ← يظهر لكل زوار المنصة على الخريطة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const TITLES = ["أ.د.", "أ.م.د.", "م.د.", "م.م.", "د.", "باحث", "طالب دراسات عليا"];
  const IRAQ = { s: 29.0, n: 37.6, w: 38.7, e: 48.8 };
  const FIELD_NAMES = { coords: "الإحداثيات (يجب أن تكون داخل العراق)", researcher: "اسم الباحث", institution: "الجامعة أو الكلية", research: "عنوان البحث", place: "اسم الموقع", year: "سنة النشر", link: "رابط البحث (يجب أن يبدأ بـ https://)" };
  const C = { list: U.store.get("ct_cache", []), layer: null, markers: {}, picking: false, state: "loading", err: "" };
  const PARAMS = () => (ECO.samples && ECO.samples.params ? ECO.samples.params() : [...ECO.WATER_PARAMS, ...ECO.METALS.map(m => ({ ...m, unit: "mg/L" }))]);
  const gmaps = U.gmaps;
  const isWater = t => /مياه|ماء/.test(t || "");
  const safeLink = u => (/^https?:\/\//i.test(u || "") ? u : "");

  /* ---------------- الاتصال بالخادم المشترك ---------------- */
  function errText(status, j) {
    const code = j && j.error && j.error.status;
    if (code === "SITES_NOT_CONFIGURED") return "قاعدة بيانات المواقع لم تُربط بالخادم بعد. (لصاحب الموقع: أضف ربط KV باسم SITES في إعدادات الـ Worker)";
    if (code === "ADMIN_NOT_CONFIGURED") return "كلمة سر المراجعة لم تُضبط في الخادم بعد. (لصاحب الموقع: أضف ADMIN_KEY في إعدادات الـ Worker)";
    if (code === "BAD_ADMIN_KEY") return "كلمة السر غير صحيحة.";
    if (code === "TOO_MANY_ATTEMPTS") return "محاولات خاطئة كثيرة. انتظر 15 دقيقة ثم أعد المحاولة.";
    if (code === "TOO_MANY_SUBMISSIONS") return "أرسلت مساهمات كثيرة خلال ساعة. حاول لاحقاً.";
    if (code === "INVALID_FIELDS") return "تحقق من: " + (j.error.fields || []).map(f => FIELD_NAMES[f] || f).join("، ");
    if (code === "ORIGIN_NOT_ALLOWED") return "الخادم لا يقبل الطلبات من هذا الرابط: " + location.origin;
    if (code === "NOT_FOUND") return "هذه المساهمة لم تعد موجودة (ربما رُوجعت من جهاز آخر).";
    if (code === "TOO_LARGE") return "البيانات أطول من المسموح.";
    if (code === "QUEUE_FULL") return "قائمة المساهمات التي تنتظر المراجعة ممتلئة الآن. أعد الإرسال بعد أيام قليلة.";
    if (status === 404 && code === "NOT_ALLOWED") return "الخادم المشترك يعمل بنسخة قديمة لا تدعم مواقع الباحثين. (لصاحب الموقع: الصق كود الخادم الجديد في Cloudflare)";
    return `تعذّر إكمال الطلب (${status}).`;
  }
  async function api(path, body) {
    const base = ECO.gemini && ECO.gemini.proxy && ECO.gemini.proxy();
    if (!base) { const e = new Error("NO_SERVER"); e.code = "NO_SERVER"; throw e; }
    let r;
    try { r = await fetch(base + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined); }
    catch (e) { throw new Error("تعذّر الوصول إلى الخادم المشترك. تأكد من اتصال الإنترنت."); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(errText(r.status, j)); e.code = j.error && j.error.status; throw e; }
    return j;
  }

  /* ---------------- العرض على الخريطة ---------------- */
  const pinIcon = () => L.divIcon({ className: "ct-pin", html: `<span><svg><use href="#i-book"/></svg></span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
  function paramRows(p, max = 8) {
    return PARAMS().filter(x => p && U.isNum(p[x.key])).slice(0, max).map(x => `<tr><td>${x.sym}</td><td dir="ltr">${U.fmt(p[x.key], "auto")} ${x.unit || ""}</td></tr>`).join("");
  }
  function popupHTML(s) {
    const link = safeLink(s.link), rows = paramRows(s.params);
    return `<div class="pop">
      <span class="chip tone-warn">موقع باحث · ${U.esc(String(s.year || ""))}</span>
      <b>${U.esc(s.place)}</b>
      <p>${U.esc(s.research)}</p>
      <small>${U.esc((s.title ? s.title + " " : "") + s.researcher)} — ${U.esc(s.institution)}</small>
      <small>${U.esc(s.type || "")}${s.sampled ? " · العينات: " + U.esc(s.sampled) : ""}</small>
      ${rows ? `<table>${rows}</table>` : ""}
      ${s.notes ? `<small>${U.esc(s.notes)}</small>` : ""}
      <div class="pop-act">
        <a class="btn btn-sm" href="${gmaps(s.lat, s.lon)}" target="_blank" rel="noopener">Google Maps</a>
        <a class="btn btn-sm" href="${U.gdir(s.lat, s.lon)}" target="_blank" rel="noopener">الطريق إليه</a>
        ${link ? `<a class="btn btn-sm" href="${U.esc(link)}" target="_blank" rel="noopener">البحث</a>` : ""}
        ${isWater(s.type) && rows ? `<button class="btn btn-sm" type="button" data-ctlab="${U.esc(s.id)}">المختبر</button>` : ""}
      </div></div>`;
  }
  function draw() {
    const map = ECO.samples && ECO.samples.map && ECO.samples.map();
    if (!map || !window.L) return;
    if (!C.layer) {
      C.layer = L.layerGroup();
      if (U.$("#smp-show-sh").checked) C.layer.addTo(map);
      U.$("#smp-show-sh").onchange = e => (e.target.checked ? C.layer.addTo(map) : map.removeLayer(C.layer));
    }
    C.layer.clearLayers(); C.markers = {};
    C.list.forEach(s => { if (U.isNum(s.lat) && U.isNum(s.lon)) C.markers[s.id] = L.marker([s.lat, s.lon], { icon: pinIcon() }).addTo(C.layer).bindPopup(popupHTML(s), { className: "eco-pop", maxWidth: 300 }); });
  }
  function renderPanel() {
    const note = U.$("#ct-note"), cnt = U.$("#ct-count");
    if (!note) return;
    cnt.textContent = C.list.length + " موقع";
    cnt.className = "chip " + (C.list.length ? "tone-warn" : "tone-none");
    note.innerHTML = C.state === "noserver"
      ? `<div class="notice info" style="margin-bottom:12px">هذه الميزة تحتاج الخادم المشترك. (لصاحب الموقع: ضع رابط الـ Worker في js/server.js)</div>`
      : C.state === "error" ? `<div class="notice warn" style="margin-bottom:12px">${U.esc(C.err)}${C.list.length ? " تُعرض آخر نسخة محفوظة." : ""}</div>` : "";
    U.$("#ct-list").innerHTML = C.list.length
      ? C.list.slice().sort((a, b) => String(b.approved || "").localeCompare(String(a.approved || ""))).map(s => `<button type="button" class="ct-item tile3d" data-id="${U.esc(s.id)}"><b><i></i>${U.esc(s.place)}</b><span>${U.esc(s.research)}</span><small>${U.esc((s.title ? s.title + " " : "") + s.researcher)} · ${U.esc(String(s.year))}</small></button>`).join("")
      : C.state === "loading" ? `<div class="empty">جارٍ التحميل…</div>` : `<div class="empty">لا توجد مواقع معتمدة بعد. كن أول باحث يضيف موقع عمله.</div>`;
  }
  async function load() {
    try {
      const j = await api("/v1/sites");
      C.list = Array.isArray(j.sites) ? j.sites : []; C.state = "ok";
      try { U.store.set("ct_cache", C.list); } catch (e) { /* ممتلئ */ }
    } catch (e) { C.state = e.code === "NO_SERVER" ? "noserver" : "error"; C.err = e.message; }
    draw(); renderPanel(); ECO.bus.emit("contrib", C.list);
  }

  /* ---------------- نموذج الإضافة ---------------- */
  function openForm() {
    const prof = U.store.get("ct_profile", {});
    ["researcher", "title", "inst"].forEach(k => { if (prof[k] && !U.$("#ct-" + k).value) U.$("#ct-" + k).value = prof[k]; });
    if (!U.$("#ct-year").value) U.$("#ct-year").value = new Date().getFullYear();
    U.$("#ct-status").textContent = "";
    U.$("#ct-sheet").hidden = false;
  }
  const closeForm = () => { U.$("#ct-sheet").hidden = true; };
  function setPicking(on) {
    C.picking = on;
    const hint = U.$("#smp-hint");
    hint.textContent = on ? "اضغط على الخريطة في موقع عملك البحثي" : "اضغط على الخريطة في موقع العينة";
    hint.hidden = !on; U.$("#smp-map").classList.toggle("adding", on);
  }
  function setCoords(lat, lon) {
    U.$("#ct-lat").value = lat.toFixed(6); U.$("#ct-lon").value = lon.toFixed(6);
    const map = ECO.samples.map(); if (map) map.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 0.5 });
  }
  function readForm() {
    const params = {};
    PARAMS().forEach(p => { const x = parseFloat(U.$("#ctp-" + p.key).value); if (U.isNum(x)) params[p.key] = x; });
    return {
      researcher: U.$("#ct-researcher").value.trim(), title: U.$("#ct-title").value, institution: U.$("#ct-inst").value.trim(),
      research: U.$("#ct-research").value.trim(), year: parseInt(U.$("#ct-year").value, 10), link: U.$("#ct-link").value.trim(),
      place: U.$("#ct-place").value.trim(), type: U.$("#ct-type").value, sampled: U.$("#ct-sampled").value,
      lat: parseFloat(U.$("#ct-lat").value), lon: parseFloat(U.$("#ct-lon").value), notes: U.$("#ct-notes").value.trim(),
      params, website: U.$("#ct-website").value
    };
  }
  function check(d) {
    const bad = [];
    if (d.researcher.length < 3) bad.push("researcher");
    if (d.institution.length < 3) bad.push("institution");
    if (d.research.length < 5) bad.push("research");
    if (d.place.length < 2) bad.push("place");
    if (!(d.year >= 1950 && d.year <= new Date().getFullYear() + 1)) bad.push("year");
    if (d.link && !/^https?:\/\/\S+$/i.test(d.link)) bad.push("link");
    if (!U.isNum(d.lat) || !U.isNum(d.lon) || d.lat < IRAQ.s || d.lat > IRAQ.n || d.lon < IRAQ.w || d.lon > IRAQ.e) bad.push("coords");
    return bad;
  }
  async function submit(e) {
    e.preventDefault();
    const st = U.$("#ct-status"), d = readForm(), bad = check(d);
    if (bad.length) { st.innerHTML = `<span class="bad">أكمل أو صحّح: ${bad.map(f => FIELD_NAMES[f]).join("، ")}</span>`; return; }
    if (!U.$("#ct-ok").checked) { st.innerHTML = `<span class="bad">ضع علامة على التأكيد قبل الإرسال.</span>`; return; }
    const btn = U.$("#ct-send"); btn.disabled = true; st.textContent = "جارٍ الإرسال…";
    try {
      await api("/v1/sites", d);
      U.store.set("ct_profile", { researcher: d.researcher, title: d.title, inst: d.institution });
      st.innerHTML = `<span class="ok">وصلت مساهمتك. ستظهر على الخريطة لكل الزوار بعد موافقة المشرفة.</span>`;
      ["research", "link", "place", "sampled", "lat", "lon", "notes"].forEach(k => { U.$("#ct-" + k).value = ""; });
      PARAMS().forEach(p => { U.$("#ctp-" + p.key).value = ""; });
      U.$("#ct-ok").checked = false;
      U.toast("أُرسلت للمراجعة");
    } catch (er) { st.innerHTML = `<span class="bad">${U.esc(er.code === "NO_SERVER" ? "الخادم المشترك غير مضبوط في هذا الموقع." : er.message)}</span>`; }
    btn.disabled = false;
  }

  function bindSamples() {
    if (C.bound) return; C.bound = true;
    U.$("#ct-title").innerHTML = `<option value="">—</option>` + TITLES.map(t => `<option>${t}</option>`).join("");
    U.$("#ct-type").innerHTML = ECO.SAMPLE_TYPES.map(t => `<option>${t}</option>`).join("");
    U.$("#ct-params").innerHTML = PARAMS().map(p => `<div class="field"><label for="ctp-${p.key}"><span>${p.name} (${p.sym})</span><span class="u">${p.unit || ""}</span></label><input type="number" step="any" id="ctp-${p.key}" inputmode="decimal"></div>`).join("");
    U.$("#ct-open").onclick = openForm; U.$("#ct-open2").onclick = openForm;
    U.$("#ct-close").onclick = closeForm;
    U.$("#ct-sheet").addEventListener("click", e => { if (e.target.id === "ct-sheet") closeForm(); });
    U.$("#ct-form").onsubmit = submit;
    // لصق «34.6, 43.68» في خانة خط العرض يملأ الخانتين
    U.$("#ct-lat").addEventListener("input", e => { const m = e.target.value.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,،\s]\s*(-?\d+(?:\.\d+)?)\s*$/); if (m) { e.target.value = m[1]; U.$("#ct-lon").value = m[2]; } });
    U.$("#ct-pick").onclick = () => { closeForm(); setPicking(true); U.$("#smp-map").scrollIntoView({ behavior: "smooth", block: "center" }); };
    U.$("#ct-gps").onclick = () => {
      if (!navigator.geolocation) { U.toast("الجهاز لا يدعم تحديد الموقع"); return; }
      U.toast("جارٍ تحديد موقعك…");
      navigator.geolocation.getCurrentPosition(p => setCoords(p.coords.latitude, p.coords.longitude), err => U.toast("تعذّر تحديد الموقع: " + (err.code === 1 ? "لم يُسمح بالوصول للموقع" : err.message)), { enableHighAccuracy: true, timeout: 15000 });
    };
    U.$("#ct-list").onclick = e => {
      const b = e.target.closest(".ct-item"); if (!b) return;
      const s = C.list.find(x => x.id === b.dataset.id), map = ECO.samples.map(); if (!s || !map) return;
      if (C.layer && !map.hasLayer(C.layer)) { C.layer.addTo(map); U.$("#smp-show-sh").checked = true; }
      map.flyTo([s.lat, s.lon], 15, { duration: 0.6 });
      setTimeout(() => C.markers[s.id] && C.markers[s.id].openPopup(), 650);
      U.$("#smp-map").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    U.$("#smp-map").addEventListener("click", e => {
      const a = e.target.closest("[data-ctlab]"); if (!a) return;
      const s = C.list.find(x => x.id === a.dataset.ctlab); if (!s) return;
      ECO.water.fill(s.params || {}, { name: s.place, site: s.place, date: s.sampled || String(s.year), source: `${(s.title ? s.title + " " : "") + s.researcher} (${s.year}) – ${s.research}` });
    });
  }

  ECO.bus.on("samples-map", map => {
    bindSamples();
    map.on("click", e => { if (!C.picking) return; setPicking(false); setCoords(e.latlng.lat, e.latlng.lng); openForm(); });
    draw(); renderPanel(); load();
  });

  /* ---------------- صفحة المراجعة (للمشرف) ---------------- */
  const R = { key: "" };
  try { R.key = sessionStorage.getItem("ecobio_rv") || ""; } catch (e) { /* غير متاح */ }
  function rvCard(s) {
    const link = safeLink(s.link), rows = paramRows(s.params, 40);
    return `<div class="rv-card" data-id="${U.esc(s.id)}">
      <h4>${U.esc(s.place)} <span class="chip tone-info">${U.esc(s.type || "")}</span></h4>
      <p>${U.esc(s.research)} (${U.esc(String(s.year))})</p>
      <div class="rv-meta">
        <span>${U.esc((s.title ? s.title + " " : "") + s.researcher)}</span><span>${U.esc(s.institution)}</span>
        <a href="${gmaps(s.lat, s.lon)}" target="_blank" rel="noopener" dir="ltr">${s.lat}, ${s.lon}</a>
        ${link ? `<a href="${U.esc(link)}" target="_blank" rel="noopener">رابط البحث</a>` : `<span>بلا رابط</span>`}
        ${s.sampled ? `<span>العينات: ${U.esc(s.sampled)}</span>` : ""}
        <span>أُرسل: ${U.esc(String(s.submitted || "").slice(0, 16).replace("T", " "))}</span>
      </div>
      ${rows ? `<table>${rows}</table>` : ""}
      ${s.notes ? `<p>${U.esc(s.notes)}</p>` : ""}
      <div class="row"><button class="btn btn-sm btn-primary" type="button" data-rv="approve"><svg><use href="#i-check"/></svg>موافقة ونشر</button><button class="btn btn-sm btn-danger" type="button" data-rv="reject"><svg><use href="#i-close"/></svg>رفض</button></div>
    </div>`;
  }
  async function rvLoad() {
    const st = U.$("#rv-status");
    st.textContent = "جارٍ التحميل…";
    try {
      const j = await api("/v1/sites/admin", { key: R.key, action: "list" });
      try { sessionStorage.setItem("ecobio_rv", R.key); } catch (e) { /* غير متاح */ }
      st.textContent = ""; U.$("#rv-login").hidden = true; U.$("#rv-body").hidden = false;
      U.$("#rv-pcount").textContent = j.pending.length; U.$("#rv-acount").textContent = j.approved.length;
      U.$("#rv-pending").innerHTML = j.pending.length ? j.pending.map(rvCard).join("") : `<div class="empty">لا توجد مساهمات جديدة.</div>`;
      U.$("#rv-approved").innerHTML = j.approved.length ? j.approved.slice().reverse().map(s => `<div class="rv-row" data-id="${U.esc(s.id)}"><span>${U.esc(s.place)} — ${U.esc((s.title ? s.title + " " : "") + s.researcher)} (${U.esc(String(s.year))})</span><a class="btn btn-sm btn-ghost" href="${gmaps(s.lat, s.lon)}" target="_blank" rel="noopener">الموقع</a><button class="btn btn-sm btn-ghost" type="button" data-rv="delete">حذف</button></div>`).join("") : `<div class="empty">لا توجد مواقع معتمدة بعد.</div>`;
    } catch (e) {
      U.$("#rv-login").hidden = false; U.$("#rv-body").hidden = true;
      if (e.code === "BAD_ADMIN_KEY") { R.key = ""; try { sessionStorage.removeItem("ecobio_rv"); } catch (er) { /* */ } }
      st.innerHTML = `<span class="bad">${U.esc(e.code === "NO_SERVER" ? "الخادم المشترك غير مضبوط في هذا الموقع." : e.message)}</span>`;
    }
  }
  async function rvAct(action, id, btn) {
    if (action === "delete" && !window.confirm("حذف هذا الموقع من الخريطة العامة؟")) return;
    if (btn) btn.disabled = true;
    try {
      await api("/v1/sites/admin", { key: R.key, action, id });
      U.toast(action === "approve" ? "نُشر الموقع للجميع" : action === "reject" ? "رُفضت المساهمة" : "حُذف الموقع");
      await rvLoad(); load();
    } catch (e) { U.toast(e.message); if (btn) btn.disabled = false; }
  }
  ECO.views.review = {
    init() {
      U.$("#rv-enter").onclick = () => { R.key = U.$("#rv-key").value; if (R.key) rvLoad(); };
      U.$("#rv-key").addEventListener("keydown", e => { if (e.key === "Enter") U.$("#rv-enter").click(); });
      U.$("#rv-refresh").onclick = rvLoad;
      U.$("#rv-out").onclick = () => { R.key = ""; try { sessionStorage.removeItem("ecobio_rv"); } catch (e) { /* */ } U.$("#rv-key").value = ""; U.$("#rv-body").hidden = true; U.$("#rv-login").hidden = false; };
      U.$("#view-review").addEventListener("click", e => { const b = e.target.closest("[data-rv]"); if (!b) return; rvAct(b.dataset.rv, b.closest("[data-id]").dataset.id, b); });
    },
    show() { if (R.key) rvLoad(); }
  };

  ECO.contrib = { list: () => C.list, reload: load };
})();
