/* =====================================================================
   خريطة الفجوات البحثية — ماذا دُرس، وأين، ومتى؟
   ---------------------------------------------------------------------
   تجمع البحوث المنشورة في المنصة (بحوث جامعة تكريت) ومواقع البحوث التي
   يضيفها الأساتذة (المعتمدة من المشرفة)، وتوزعها على مناطق صلاح الدين
   ومحاور التخصص، فتظهر المحاور التي لم يُسجَّل فيها بحث أو مضى عليها وقت.
   ثم يقترح المساعد عناوين رسائل للفجوة بالأجهزة المتوفرة في القسم.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const NOW_Y = new Date().getFullYear(), RECENT = 5;

  const ZONES = [
    { id: "shirqat", name: "الشرقاط", lat: 35.51, lon: 43.23, river: true },
    { id: "baiji", name: "بيجي", lat: 34.93, lon: 43.49, river: true },
    { id: "tikrit", name: "تكريت والعلم", lat: 34.61, lon: 43.68, river: true },
    { id: "dour", name: "الدور", lat: 34.46, lon: 43.79, river: true },
    { id: "samarra", name: "سامراء", lat: 34.196, lon: 43.886, river: true },
    { id: "balad", name: "بلد والدجيل", lat: 34.016, lon: 44.145, river: true },
    { id: "tuz", name: "طوز خورماتو", lat: 34.888, lon: 44.633, river: false },
    { id: "all", name: "عموم المحافظة", lat: null, lon: null }
  ];
  const TOPICS = [
    { id: "phys", name: "الخصائص الفيزيائية والكيميائية", short: "فيزيوكيميائية", kw: /physic|chemical|فيزيائي|كيميائي|عسرة|توصيلية|pH|TDS/i },
    { id: "nutr", name: "المغذيات (النترات والفوسفات)", short: "المغذيات", kw: /nitrat|nitrit|phosphat|ammon|نترات|نتريت|فوسفات|أمونيا/i },
    { id: "org", name: "الحمل العضوي (BOD وCOD والأكسجين)", short: "الحمل العضوي", kw: /\bBOD|\bCOD|dissolved oxygen|أكسجين|أوكسجين/i },
    { id: "metal", name: "العناصر الثقيلة", short: "عناصر ثقيلة", kw: /heavy metal|trace metal|عناصر ثقيلة|معادن ثقيلة|العناصر النزرة|\bPb\b|\bCd\b|lead|cadmium|nickel|chromium/i },
    { id: "micro", name: "البكتيريا والأحياء المجهرية", short: "بكتيريا", kw: /bacteri|coliform|E\.\s?coli|microb|بكتيري|قولوني|الأحياء المجهرية|فطري/i },
    { id: "algae", name: "الطحالب والهائمات", short: "طحالب", kw: /alga|diatom|phytoplankton|zooplankton|طحال|دايتوم|هائمات|بلانكتون/i },
    { id: "oil", name: "الملوثات النفطية والهيدروكربونات", short: "نفطية", kw: /oil|petrol|hydrocarbon|TPH|PAH|refiner|نفط|هيدروكربون|مصفى|مصافي/i },
    { id: "bio", name: "المعالجة الحيوية والنباتية", short: "معالجة حيوية", kw: /bioremed|phytoremed|biosorption|bio-?treat|wetland|معالجة حيوية|معالجة نباتية|امتزاز حيوي|أراضٍ رطبة|Phragmites|قصب/i },
    { id: "wqi", name: "مؤشرات جودة المياه (WQI)", short: "WQI", kw: /WQI|water quality index|دليل نوعية|مؤشر جودة المياه|دليل جودة/i },
    { id: "air", name: "تلوث الهواء والغبار", short: "الهواء", kw: /\bair\b|dust|PM2|PM10|aerosol|هواء|غبار|عوالق/i },
    { id: "mplast", name: "اللدائن الدقيقة", short: "لدائن دقيقة", kw: /microplastic|لدائن|بلاستيك/i },
    { id: "pest", name: "المبيدات والأسمدة", short: "مبيدات", kw: /pesticid|herbicid|insecticid|fertili|مبيد|أسمدة/i }
  ];
  const MEDIA = [
    { id: "all", name: "الكل" }, { id: "river", name: "مياه النهر", re: /نهر/ }, { id: "ground", name: "المياه الجوفية", re: /بئر|آبار|جوفي/ },
    { id: "waste", name: "مياه الصرف", re: /صرف/ }, { id: "soil", name: "التربة والرواسب", re: /تربة|رواسب/ }, { id: "plant", name: "النبات", re: /نبات/ }, { id: "air", name: "الهواء", re: /هواء/ }
  ];
  // المحاور المؤكدة يدوياً للبحوث المنشورة في المنصة (من جداولها ومتغيراتها)
  const KNOWN = {
    "tikrit-2023": ["phys", "nutr", "org", "micro"],
    "baiji-2025": ["phys", "org", "oil", "metal", "bio"],
    "salahuddin-wqi-2023": ["wqi", "phys", "org", "nutr"],
    "balad-2022": ["phys", "metal"],
    "alalam-2018": ["phys", "nutr"]
  };
  const KEY_TOPIC = { temp: "phys", wtemp: "phys", ph: "phys", ec: "phys", tds: "phys", turb: "phys", alk: "phys", cl: "phys", so4: "phys", th: "phys", ca: "phys", mg: "phys", na: "phys", k: "phys", cah: "phys", mgh: "phys", no3: "nutr", po4: "nutr", nh3: "nutr", no2: "nutr", bod: "org", cod: "org", do: "org", pb: "metal", cd: "metal", cr: "metal", ni: "metal", cu: "metal", zn: "metal", fe: "metal", mn: "metal", hg: "metal", as: "metal", wqi: "wqi" };
  const DEVICES = ["مطياف UV-Vis", "حاضنة BOD", "جهاز كلدال", "قارئ ELISA", "VITEK 2 لتشخيص البكتيريا", "جهاز اختبار الجرة (Jar Test)", "جهاز قياس العكورة", "جهاز pH والتوصيلية", "مجهر ضوئي مركب", "حاضنة بكتيرية", "فرن تجفيف", "أوتوكلاف", "خزانة أبخرة", "حمام مائي", "خلاطات مغناطيسية"];

  const S = { media: "all", topic: null, sel: null, studies: [], map: null, circles: {} };
  const R = d => Math.PI / 180 * d;
  const km = (a, b) => 12742 * Math.asin(Math.sqrt(Math.sin(R(b.lat - a.lat) / 2) ** 2 + Math.cos(R(a.lat)) * Math.cos(R(b.lat)) * Math.sin(R(b.lon - a.lon) / 2) ** 2));
  function zoneOf(lat, lon) {
    if (!U.isNum(lat) || !U.isNum(lon)) return "all";
    let best = null, bd = 1e9;
    ZONES.filter(z => z.lat != null).forEach(z => { const d = km({ lat, lon }, z); if (d < bd) { bd = d; best = z.id; } });
    return bd <= 35 ? best : "other";
  }
  const mediaOf = txt => MEDIA.filter(m => m.re && m.re.test(txt || "")).map(m => m.id);

  /* ---------- جمع الدراسات ---------- */
  function collect() {
    const out = [];
    (ECO.RESEARCH || []).forEach(r => {
      const text = [r.title, r.summary, r.medium, (r.tables || []).map(t => t.title).join(" "), (r.params || []).join(" ")].join(" ");
      let topics = KNOWN[r.id];
      if (!topics) {
        const t = new Set();
        (r.ranges || []).forEach(x => KEY_TOPIC[x.k] && t.add(KEY_TOPIC[x.k]));
        TOPICS.forEach(tp => tp.kw.test(text) && t.add(tp.id));
        topics = [...t];
      }
      out.push({ src: "rs", id: r.id, title: r.title, who: r.authors, year: r.year, place: r.place, zone: zoneOf(r.lat, r.lon), media: mediaOf(r.medium), topics, link: "#research", rs: r.id, approx: !!r.coordNote });
    });
    (ECO.contrib ? ECO.contrib.list() : []).forEach(s => {
      const t = new Set();
      Object.keys(s.params || {}).forEach(k => KEY_TOPIC[k] && t.add(KEY_TOPIC[k]));
      const text = [s.research, s.notes, s.type, s.sampled].join(" ");
      TOPICS.forEach(tp => tp.kw.test(text) && t.add(tp.id));
      if (/هواء/.test(s.type || "")) t.add("air");
      if (!t.size) t.add("phys");
      out.push({ src: "ct", id: s.id, title: s.research, who: (s.title ? s.title + " " : "") + s.researcher, year: +s.year || null, place: s.place, zone: zoneOf(+s.lat, +s.lon), media: mediaOf(s.type), topics: [...t], link: s.link || "", lat: +s.lat, lon: +s.lon });
    });
    S.studies = out;
    return out;
  }
  const visible = () => S.studies.filter(s => S.media === "all" || s.media.includes(S.media));
  function cell(zone, topic) {
    const list = visible().filter(s => s.zone === zone && s.topics.includes(topic));
    const last = list.reduce((m, s) => Math.max(m, s.year || 0), 0);
    return { list, last, state: !list.length ? "gap" : last >= NOW_Y - RECENT ? "ok" : "old" };
  }

  /* ---------- العرض ---------- */
  function render() {
    collect();
    const zones = ZONES.filter(z => z.id !== "other").concat(S.studies.some(s => s.zone === "other") ? [{ id: "other", name: "خارج صلاح الدين" }] : []);
    let gaps = 0, total = 0, ok = 0, old = 0;
    const rows = zones.map(z => `<tr><th scope="row"><span>${z.name}</span></th>${TOPICS.map(t => {
      const c = cell(z.id, t.id); total++; if (c.state === "gap") gaps++; else if (c.state === "ok") ok++; else old++;
      const on = S.sel && S.sel.z === z.id && S.sel.t === t.id;
      return `<td><button type="button" class="gp-c gp-${c.state}${on ? " on" : ""}${S.topic === t.id ? " col" : ""}" data-z="${z.id}" data-t="${t.id}" aria-label="${z.name} – ${t.name}: ${c.list.length ? c.list.length + " بحث، آخرها " + c.last : "لا يوجد بحث"}">${c.list.length ? `<b>${c.list.length}</b><small>${c.last || ""}</small>` : ""}</button></td>`;
    }).join("")}</tr>`).join("");
    U.$("#gp-matrix").innerHTML = `<table class="gp-tbl"><thead><tr><th class="gp-corner">المنطقة \\ المحور</th>${TOPICS.map(t => `<th><button type="button" class="gp-th${S.topic === t.id ? " on" : ""}" data-col="${t.id}" title="${t.name}">${t.short}</button></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
    const nS = visible().length;
    U.$("#gp-stats").innerHTML = `
      <div class="gp-stat"><b>${nS}</b><span>بحث وموقع مسجل</span></div>
      <div class="gp-stat ok"><b>${ok}</b><span>محور مدروس حديثاً</span></div>
      <div class="gp-stat old"><b>${old}</b><span>مدروس قبل ${NOW_Y - RECENT}</span></div>
      <div class="gp-stat gap"><b>${gaps}</b><span>فجوة بلا بحث</span></div>`;
    renderMap();
    renderDetail();
  }

  function renderMap() {
    if (!S.map) return;
    ZONES.filter(z => z.lat != null).forEach(z => {
      let n, state;
      if (S.topic) { const c = cell(z.id, S.topic); n = c.list.length; state = c.state; }
      else { const set = new Set(visible().filter(s => s.zone === z.id).map(s => s.id)); n = set.size; state = n ? "ok" : "gap"; }
      const col = state === "ok" ? ECO.TONES.good : state === "old" ? ECO.TONES.warn : ECO.TONES.severe;
      const c = S.circles[z.id];
      const tip = `${z.name}: ${n ? n + (S.topic ? " بحث في هذا المحور" : " بحث وموقع") : "لا يوجد بحث مسجل"}`;
      if (c) { c.setStyle({ color: col, fillColor: col }); c.setRadius(7 + Math.min(10, n * 3)); c.setTooltipContent(tip); }
      else {
        S.circles[z.id] = L.circleMarker([z.lat, z.lon], { radius: 7 + Math.min(10, n * 3), color: col, fillColor: col, fillOpacity: 0.45, weight: 2 }).addTo(S.map).bindTooltip(tip, { className: "eco-tip" })
          .on("click", () => { if (S.topic) select(z.id, S.topic); });
      }
    });
    U.$("#gp-maplbl").textContent = S.topic ? "المحور: " + TOPICS.find(t => t.id === S.topic).name : "كل المحاور — اضغط على عنوان عمود لتلوين الخريطة حسبه";
  }

  function select(z, t) { S.sel = { z, t }; S.topic = t; render(); const d = U.$("#gp-detail"); if (d && window.matchMedia("(max-width: 900px)").matches) d.scrollIntoView({ behavior: "smooth", block: "start" }); }

  function renderDetail() {
    const box = U.$("#gp-detail");
    if (!S.sel) {
      box.innerHTML = `<div class="gp-empty"><svg><use href="#i-map"/></svg><p>اضغط على أي خانة في الجدول لترى البحوث المسجلة فيها، أو على خانة فارغة لتحصل على مقترحات عناوين رسائل لتلك الفجوة.</p></div>`;
      return;
    }
    const z = ZONES.find(x => x.id === S.sel.z) || { id: "other", name: "خارج صلاح الدين" }, t = TOPICS.find(x => x.id === S.sel.t), c = cell(z.id, t.id);
    const items = c.list.map(s => `<div class="gp-item"><div class="gp-it-h"><span class="chip ${s.src === "rs" ? "tone-info" : "tone-warn"}">${s.src === "rs" ? "بحث منشور" : "موقع باحث"}</span><span class="chip tone-none">${s.year || "—"}</span></div>
      <b>${U.esc(s.title || "")}</b><small>${U.esc(s.who || "")} · ${U.esc(s.place || "")}</small>
      ${s.src === "rs" ? `<a class="btn btn-sm" href="#research" data-rs="${U.esc(s.rs)}">عرض البحث ونتائجه</a>` : s.link ? `<a class="btn btn-sm" href="${U.esc(s.link)}" target="_blank" rel="noopener">رابط البحث</a>` : ""}</div>`).join("");
    const status = c.state === "gap" ? `<div class="notice warn"><span>لا يوجد بحث مسجل في المنصة عن <b>${t.name}</b> في <b>${z.name}</b>${S.media !== "all" ? ` (${MEDIA.find(m => m.id === S.media).name})` : ""}.</span></div>`
      : c.state === "old" ? `<div class="notice info"><span>آخر بحث مسجل هنا عام ${c.last}، أي قبل أكثر من ${RECENT} سنوات؛ إعادة الدراسة تُظهر التغير عبر الزمن.</span></div>` : "";
    box.innerHTML = `<div class="panel-h"><h3>${z.name} · ${t.short}</h3><span class="sub">${c.list.length} بحث</span></div>
      ${status}${items}
      <div class="gp-acts">
        <button class="btn btn-primary" type="button" id="gp-ai"><svg><use href="#i-spark"/></svg>اقترح عناوين رسائل لهذه الخانة</button>
        ${z.river ? `<a class="btn" href="#space" data-gp-space="${z.id}"><svg><use href="#i-sat"/></svg>شاهد النهر هنا من الفضاء</a>` : ""}
      </div>
      <div id="gp-ai-out" class="gp-ai"></div>`;
    U.$("#gp-ai").onclick = () => suggest(z, t, c);
  }

  function suggest(z, t, c) {
    const out = U.$("#gp-ai-out");
    if (!ECO.gemini.ready()) { ECO.gemini.renderInto(out, ""); return; }
    const near = S.studies.filter(s => s.zone === z.id || s.topics.includes(t.id)).slice(0, 12)
      .map(s => `- (${s.year || "؟"}) ${s.title} — ${s.who} — ${s.place} — المحاور: ${s.topics.map(x => TOPICS.find(y => y.id === x).short).join("، ")}`).join("\n") || "لا يوجد";
    const media = S.media === "all" ? "أي وسط مناسب (ماء نهر، مياه جوفية، رواسب، نبات...)" : MEDIA.find(m => m.id === S.media).name;
    const prompt = `أنا طالب دراسات عليا في قسم علوم الحياة – كلية التربية للعلوم الصرفة – جامعة تكريت، تخصص التلوث والمعالجة.
الخانة المختارة في خريطة الفجوات البحثية: المنطقة «${z.name}» في محافظة صلاح الدين، المحور «${t.name}»، الوسط: ${media}.
حالة الخانة حسب البحوث المسجلة في المنصة: ${c.state === "gap" ? "لا يوجد بحث مسجل" : c.state === "old" ? "آخر بحث عام " + c.last : "مدروسة حديثاً (" + c.list.length + " بحث)"}.
البحوث المسجلة في المنصة القريبة من الموضوع (لا تذكر غيرها كأنها موجودة):
${near}
الأجهزة المتوفرة في القسم: ${DEVICES.join("، ")}.

اقترح 3 عناوين رسائل ماجستير واقعية قابلة للتنفيذ خلال سنة دراسية لهذه الخانة. لكل عنوان اكتب:
1. العنوان بالعربية والإنكليزية.
2. لماذا هو مهم في هذه المنطقة تحديداً (مصادر التلوث المعروفة فيها) وما الجديد مقارنة بالبحوث المذكورة أعلاه.
3. تصميم أخذ العينات: عدد المحطات والفصول ونوع العينات.
4. المتغيرات وطرق القياس بالأجهزة المتوفرة، واذكر بوضوح أي فحص يحتاج جهازاً غير متوفر (مثل الامتصاص الذري) ليُرسل إلى مختبر خارجي.
5. التحليل الإحصائي المقترح.
لا تخترع نتائج أو أرقاماً أو بحوثاً سابقة غير مذكورة. اكتب بإيجاز منظم.`;
    out.innerHTML = `<p class="typing"><i></i><i></i><i></i></p>`;
    ECO.gemini.generate({ temperature: 0.5, contents: [{ role: "user", parts: [{ text: prompt }] }], onText: txt => { out.innerHTML = U.md(txt); } })
      .then(() => { out.insertAdjacentHTML("beforeend", `<p class="faint gp-note">اقتراحات أولية من الذكاء الاصطناعي؛ راجعها مع المشرف وابحث في Google Scholar ومجلة جامعة تكريت للعلوم الصرفة قبل اعتماد أي عنوان.</p>`); })
      .catch(e => { out.innerHTML = `<div class="notice warn">${U.esc(e.message)}</div>`; });
  }

  function buildMap() {
    if (!window.L) return;
    S.map = L.map("gp-map", { center: [34.75, 43.85], zoom: 7.5, zoomSnap: 0.5, scrollWheelZoom: false });
    S.map.attributionControl.setPrefix(false);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Esri" }).addTo(S.map);
    U.labelLayers().addTo(S.map);
    L.polyline(ECO.TIGRIS, { color: "#4fc8dc", weight: 2, opacity: 0.7 }).addTo(S.map);
    const lg = L.control({ position: "bottomright" });
    lg.onAdd = () => { const d = L.DomUtil.create("div", "map-legend"); d.innerHTML = `<b>حالة البحث في المنطقة</b>` + [[ECO.TONES.good, "مدروسة"], [ECO.TONES.warn, "دراسة قديمة"], [ECO.TONES.severe, "فجوة — لا بحث"]].map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join("") + `<span class="faint" style="margin-top:3px">حجم الدائرة = عدد البحوث</span>`; return d; };
    lg.addTo(S.map);
  }

  function init() {
    U.$("#gp-media").innerHTML = MEDIA.map(m => `<button type="button" data-m="${m.id}" class="${m.id === S.media ? "on" : ""}">${m.name}</button>`).join("");
    U.$("#gp-media").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.media = b.dataset.m; U.$$("#gp-media button").forEach(x => x.classList.toggle("on", x === b)); render(); };
    U.$("#gp-matrix").onclick = e => {
      const c = e.target.closest(".gp-c"); if (c) { select(c.dataset.z, c.dataset.t); return; }
      const h = e.target.closest(".gp-th"); if (h) { S.topic = S.topic === h.dataset.col ? null : h.dataset.col; render(); }
    };
    U.$("#view-gaps").addEventListener("click", e => {
      const a = e.target.closest("[data-gp-space]"); if (!a) return;
      const z = ZONES.find(x => x.id === a.dataset.gpSpace);
      ECO._spaceGoto = { lat: z.lat, lon: z.lon };
    });
    buildMap(); render();
    ECO.bus.on("contrib", () => render());
    if (ECO.contrib && ECO.contrib.reload) ECO.contrib.reload();
  }

  ECO.gaps = { collect, cell, ZONES, TOPICS, zoneOf };
  ECO.views.gaps = {
    init,
    show() { if (S.map) setTimeout(() => S.map.invalidateSize(), 60); if (ECO.views.gaps._inited) render(); }
  };
})();
