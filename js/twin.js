/* =====================================================================
   توأم دجلة الرقمي — نهر دجلة الحقيقي في صلاح الدين ثلاثي الأبعاد
   ---------------------------------------------------------------------
   الأرض:   تضاريس حقيقية (AWS Terrain Tiles – SRTM) وصور Esri وصور
            Sentinel-2 وLandsat الحقيقية على كرة أرضية (CesiumJS).
   الزمن:   أصفى صورة Landsat لكل سنة 1984–2026 من المسار 169/036 الذي
            يغطي المحافظة كلها، ومساحة الماء محسوبة من القمر بمؤشر MNDWI
            (Xu, 2006)، مع متوسط تصريف النهر السنوي من GloFAS v4.
   التسرب:  تصريف حقيقي (GloFAS v4 عبر Open-Meteo)، انحدار من التضاريس،
            سرعة بمعادلة Manning، تشتت طولي بمعادلة Fischer وآخرين (1979)،
            وتحلل من الرتبة الأولى، وانجراف البقعة النفطية بـ 3% من الريح.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const CES_VER = "1.145.0";
  const CES_BASE = `https://cdn.jsdelivr.net/npm/cesium@${CES_VER}/Build/Cesium/`;
  const PC = "https://planetarycomputer.microsoft.com/api";
  const FLOOD = "https://flood-api.open-meteo.com/v1/flood";
  const WXAPI = "https://api.open-meteo.com/v1/forecast";
  const REGION = { w: 41.5, s: 32.8, e: 46.2, n: 37.2 };
  const TIKRIT = { lat: 34.605, lon: 43.695 };
  const LS_SCENE = { path: "169", row: "036" };
  const LANDSAT_CF = "gamma RGB 2.7, saturation 1.5, sigmoidal RGB 15 0.55";
  const MNDWI = "(green-swir16)/(green+swir16-14545)"; // انعكاسية Landsat C2 L2 = DN×0.0000275 − 0.2
  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

  const TOWNS = [
    { id: "shirqat", name: "الشرقاط", lat: 35.51, lon: 43.23 },
    { id: "baiji", name: "بيجي", lat: 34.9311, lon: 43.487 },
    { id: "tikrit", name: "تكريت", lat: 34.6071, lon: 43.6782 },
    { id: "dour", name: "الدور", lat: 34.46, lon: 43.79 },
    { id: "samarra", name: "سامراء", lat: 34.1959, lon: 43.8857 },
    { id: "balad", name: "بلد", lat: 34.0164, lon: 44.1453 }
  ];
  const AOIS = {
    tharthar: { name: "بحيرة الثرثار", rect: [43.0, 33.65, 43.58, 34.40], max: 1024 },
    tigris: { name: "مجرى دجلة بين بيجي وسامراء", corridor: [34.2, 34.97], buf: 2500, max: 2048 }
  };
  const POLL = {
    oil: { name: "نفط خام (بقعة سطحية)", unit: "م³", def: 50, k: 0, oil: true },
    bod: { name: "مخلفات عضوية (BOD)", unit: "كغم", def: 5000, k: 0.23 },
    cons: { name: "مادة ذائبة ثابتة (أملاح أو معادن ذائبة)", unit: "كغم", def: 1000, k: 0 }
  };

  const T = {
    C: null, v: null, mode: "explore", started: false, river: null, riverSrc: "", exag: 3,
    via: { esri: "direct", terr: "direct", pc: "direct" }, layers: {}, ents: {},
    tm: { items: null, years: [], year: null, aoi: "tharthar", season: "low", layer: null, layerB: null, cmp: false, yearB: null, area: {}, flow: null, playing: false },
    sim: null, play: null, follow: false
  };
  const proxy = () => (ECO.gemini && ECO.gemini.proxy && ECO.gemini.proxy()) || "";

  /* =================== أدوات جغرافية =================== */
  const R = Math.PI / 180, KX = Math.cos(34.6 * R) * 111320, KY = 110574;
  const dxy = (a, b) => Math.hypot((b[0] - a[0]) * KX, (b[1] - a[1]) * KY); // [lon,lat] بالمتر (تقريب محلي دقيق للمنطقة)
  function cumul(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + dxy(pts[i - 1], pts[i])); return c; }
  function densify(pts, step) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = dxy(a, b), n = Math.max(1, Math.ceil(d / step));
      for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  }
  // أقرب نقطة على خط مكثّف: يعيد {i, s, d}
  function nearest(line, cum, p, grid) {
    let best = { i: 0, d: 1e18 };
    const cand = grid ? (grid.get(gkey(p[0], p[1])) || []) : null;
    const list = cand && cand.length ? cand : line.map((_, i) => i);
    for (const i of list) { const d = dxy(line[i], p); if (d < best.d) best = { i, d }; }
    return { i: best.i, s: cum[best.i], d: best.d };
  }
  const gkey = (lon, lat) => Math.floor(lon / 0.04) + ":" + Math.floor(lat / 0.04);
  function gridOf(line) {
    const g = new Map();
    line.forEach((p, i) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = (Math.floor(p[0] / 0.04) + dx) + ":" + (Math.floor(p[1] / 0.04) + dy); if (!g.has(k)) g.set(k, []); g.get(k).push(i); } });
    return g;
  }
  const bearing = (a, b) => Math.atan2((b[0] - a[0]) * KX, (b[1] - a[1]) * KY); // راديان من الشمال باتجاه عقرب الساعة

  /* =================== مسار النهر =================== */
  function riverFromOSM(ways, skel) {
    const sk = densify(skel, 120), cum = cumul(sk), grid = gridOf(sk);
    const proj = [];
    ways.forEach(w => { if (w.t && w.t.side) return; (w.g || []).forEach(p => { const r = nearest(sk, cum, p, grid); if (r.d < 3000) proj.push({ p, s: r.s }); }); });
    if (proj.length < 200) return null;
    proj.sort((a, b) => a.s - b.s);
    // نمشي على الخط الهيكلي كل 150 م ونأخذ أقرب عقدة للنقطة السابقة؛ القفزات البعيدة
    // (منعطفات حادة أو قنوات جانبية) تُرفض، ويتسع السماح تدريجياً حتى لا يتوقف المسار
    const out = []; let last = null, i = 0, skipped = 0;
    while (i < proj.length) {
      const b0 = Math.floor(proj[i].s / 150), bin = [];
      while (i < proj.length && Math.floor(proj[i].s / 150) === b0) bin.push(proj[i++]);
      const pick = last ? bin.reduce((m, q) => (dxy(q.p, last) < dxy(m.p, last) ? q : m)) : bin[0];
      if (!last || dxy(pick.p, last) < 1200 + 450 * skipped) { out.push(pick.p); last = pick.p; skipped = 0; } else skipped++;
    }
    // تنعيم خفيف
    const sm = out.map((p, k) => { if (k === 0 || k === out.length - 1) return p; const a = out[k - 1], c = out[k + 1]; return [(a[0] + 2 * p[0] + c[0]) / 4, (a[1] + 2 * p[1] + c[1]) / 4]; });
    return sm.length > 300 ? sm : null;
  }
  async function loadRiver() {
    const skel = ECO.TWIN_GEO.tigrisNE;
    const c = U.store.get("tw_river", null);
    if (c && c.v === 2 && Array.isArray(c.pts) && c.pts.length > 300) return setRiver(c.pts, "osm");
    let ways = null;
    const px = proxy();
    if (px) { try { const r = await fetch(px + "/v1/river"); if (r.ok) ways = (await r.json()).ways; } catch (e) { /* */ } }
    if (!ways) {
      try {
        const q = '[out:json][timeout:60];(way["waterway"="river"]["name:en"="Tigris"](33.9,43.0,35.8,44.6);way["waterway"="river"]["name"~"دجلة|Tigris"](33.9,43.0,35.8,44.6););out geom;';
        const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q) });
        if (r.ok) ways = ((await r.json()).elements || []).filter(e => e.type === "way" && e.geometry).map(e => ({ t: { side: e.tags && e.tags.side_channel }, g: e.geometry.map(p => [p.lon, p.lat]) }));
      } catch (e) { /* */ }
    }
    const pts = ways ? riverFromOSM(ways, skel) : null;
    if (pts) { try { U.store.set("tw_river", { v: 2, pts: pts.map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]) }); } catch (e) { /* */ } return setRiver(pts, "osm"); }
    return setRiver(densify(skel, 150), "ne");
  }
  function setRiver(pts, src) {
    const line = densify(pts, 120);
    T.river = { line, cum: cumul(line), grid: gridOf(line) };
    T.riverSrc = src;
    T.river.len = T.river.cum[T.river.cum.length - 1];
    TOWNS.forEach(t => { const r = nearest(line, T.river.cum, [t.lon, t.lat], T.river.grid); t.s = r.s; t.dRiver = r.d; });
    return T.river;
  }
  // جزء من النهر بين مسافتين (متر)
  function riverSlice(s0, s1) {
    const { line, cum } = T.river, out = [];
    s0 = Math.max(0, s0); s1 = Math.min(T.river.len, s1);
    if (s1 <= s0) return out;
    const at = s => { let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]); return [line[lo][0] + (line[hi][0] - line[lo][0]) * t, line[lo][1] + (line[hi][1] - line[lo][1]) * t, lo]; };
    const a = at(s0), b = at(s1);
    out.push([a[0], a[1]]);
    for (let i = a[2] + 1; i <= b[2]; i++) out.push(line[i]);
    out.push([b[0], b[1]]);
    return out;
  }
  const pointAt = s => riverSlice(Math.max(0, s - 1), s + 1)[0] || T.river.line[0];

  /* =================== التضاريس =================== */
  const tiles = new Map();
  const imgLoad = url => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => rej(new Error("IMG")); im.src = url; });
  const terrUrl = (z, x, y) => T.via.terr === "proxy" ? `${proxy()}/v1/img/terrarium/${z}/${x}/${y}.png` : `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  function terrTile(z, x, y) {
    const k = z + "/" + x + "/" + y;
    if (tiles.has(k)) return tiles.get(k);
    const p = imgLoad(terrUrl(z, x, y)).then(im => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0, 256, 256);
      const d = g.getImageData(0, 0, 256, 256).data, h = new Float32Array(65536);
      for (let i = 0; i < 65536; i++) h[i] = Math.max(0, d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768);
      return h;
    }).catch(() => null);
    tiles.set(k, p);
    if (tiles.size > 400) tiles.delete(tiles.keys().next().value);
    return p;
  }
  const lon2x = (lon, z) => (lon + 180) / 360 * 2 ** z;
  const lat2y = (lat, z) => { const r = lat * R; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z; };
  function sampleH(map, fx, fy) {
    const tx = Math.floor(fx), ty = Math.floor(fy), h = map[tx + "," + ty];
    if (!h) return 0;
    const px = U.clamp((fx - tx) * 256 - 0.5, 0, 254.999), py = U.clamp((fy - ty) * 256 - 0.5, 0, 254.999);
    const x0 = Math.floor(px), y0 = Math.floor(py), ax = px - x0, ay = py - y0, v = (x, y) => h[y * 256 + x];
    return (v(x0, y0) * (1 - ax) + v(x0 + 1, y0) * ax) * (1 - ay) + (v(x0, y0 + 1) * (1 - ax) + v(x0 + 1, y0 + 1) * ax) * ay;
  }
  async function heights(w, s, e, n, z, N) {
    const x0 = Math.floor(lon2x(w, z)), x1 = Math.floor(lon2x(e - 1e-9, z)), y0 = Math.floor(lat2y(n, z)), y1 = Math.floor(lat2y(s + 1e-9, z));
    const map = {}, jobs = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push(terrTile(z, x, y).then(h => { map[x + "," + y] = h; }));
    await Promise.all(jobs);
    const out = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      const fy = lat2y(n - (n - s) * j / (N - 1), z);
      for (let i = 0; i < N; i++) out[j * N + i] = sampleH(map, lon2x(w + (e - w) * i / (N - 1), z), fy);
    }
    return out;
  }
  // ارتفاع نقاط بعينها (متر فوق سطح البحر) من بلاطات z12
  async function elevations(pts, z = 12) {
    const need = new Set(); pts.forEach(p => need.add(Math.floor(lon2x(p[0], z)) + "," + Math.floor(lat2y(p[1], z))));
    const map = {}; await Promise.all([...need].map(k => { const [x, y] = k.split(",").map(Number); return terrTile(z, x, y).then(h => { map[k] = h; }); }));
    return pts.map(p => sampleH(map, lon2x(p[0], z), lat2y(p[1], z)));
  }
  function terrainProvider(C) {
    const N = 33, ts = new C.GeographicTilingScheme();
    return new C.CustomHeightmapTerrainProvider({
      width: N, height: N, tilingScheme: ts, credit: new C.Credit("Terrain: AWS Terrain Tiles (SRTM)"),
      callback(x, y, level) {
        if (level < 4) return new Float32Array(N * N);
        const r = ts.tileXYToRectangle(x, y, level);
        const w = r.west / R, e = r.east / R, s = r.south / R, n = r.north / R;
        const inR = e > REGION.w && w < REGION.e && n > REGION.s && s < REGION.n;
        return heights(w, s, e, n, Math.min(inR ? 12 : 7, level + 1), N);
      }
    });
  }

  /* =================== الصور =================== */
  const esriUrl = layer => T.via.esri === "proxy" ? `${proxy()}/v1/img/esri/${layer}/{z}/{y}/{x}` : `https://server.arcgisonline.com/ArcGIS/rest/services/${layer}/MapServer/tile/{z}/{y}/{x}`;
  function esri(layer, credit) { const C = T.C; return new C.UrlTemplateImageryProvider({ url: esriUrl(layer), maximumLevel: 19, credit: credit ? new C.Credit(credit) : undefined }); }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms))]);
  async function probe() {
    // هل تسمح الخوادم بتحميل الصور داخل WebGL؟ وإلا نمرّرها عبر الخادم المشترك
    const tryUrl = u => withTimeout(fetch(u, { mode: "cors" }).then(r => { if (!r.ok) throw new Error("HTTP"); return true; }), 7000);
    const px = proxy();
    await Promise.all([
      tryUrl("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/25/40").catch(() => { if (px) T.via.esri = "proxy"; }),
      tryUrl("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/6/39/25.png").catch(() => { if (px) T.via.terr = "proxy"; })
    ]);
  }
  async function pcTileTemplate(collection, item, params) {
    const q = new URLSearchParams({ collection, item, tile_format: "png", ...params });
    (params.assets_list || []).forEach(a => q.append("assets", a)); q.delete("assets_list");
    let tpl = null;
    try { const j = await ECO.space.pcGet("data", "item/tilejson.json", q); tpl = j.tiles && j.tiles[0]; } catch (e) { tpl = null; }
    if (!tpl) tpl = `${PC}/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?${q}`;
    if (T.via.pc === "proxy" && proxy()) tpl = tpl.replace(`${PC}/data/v1/`, `${proxy()}/v1/pc/data/`);
    return tpl;
  }
  function pcLayer(tpl, bbox, alpha = 1, maxLevel = 15) {
    const C = T.C;
    const prov = new C.UrlTemplateImageryProvider({ url: tpl, rectangle: bbox ? C.Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]) : undefined, minimumLevel: 6, maximumLevel: maxLevel, credit: new C.Credit("Microsoft Planetary Computer") });
    let errs = 0;
    prov.errorEvent.addEventListener(err => {
      errs++;
      // أول فشل متكرر: نجرب المرور عبر الخادم المشترك (CORS)
      if (errs === 4 && T.via.pc === "direct" && proxy() && tpl.startsWith(PC)) {
        T.via.pc = "proxy"; ECO.bus.emit("twin-pc-proxy");
      }
      if (err) err.retry = errs < 3;
    });
    const layer = T.v.imageryLayers.addImageryProvider(prov);
    layer.alpha = alpha;
    return layer;
  }
  const rq = () => { if (T.v) T.v.scene.requestRender(); };
  const playIcon = (b, on) => { if (!b) return; b.classList.toggle("on", on); const u = b.querySelector("use"); if (u) u.setAttribute("href", on ? "#i-pause" : "#i-play"); };

  /* =================== لافتات عربية =================== */
  // Cesium يرسم الحروف منفصلة، فنرسم النص العربي كاملاً في صورة
  function tag(text, opt = {}) {
    const f = opt.size || 15, pad = 7, dpr = 2;
    const c = document.createElement("canvas"), g = c.getContext("2d");
    const font = `${opt.bold ? 700 : 600} ${f * dpr}px "IBM Plex Sans Arabic", "Readex Pro", Tahoma, sans-serif`;
    g.font = font; const w = Math.ceil(g.measureText(text).width) + pad * 2 * dpr, h = Math.ceil(f * 1.9 * dpr);
    c.width = w; c.height = h + (opt.pin ? 10 * dpr : 0);
    g.font = font; g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "middle";
    const r = 8 * dpr;
    g.fillStyle = opt.bg || "rgba(5,17,22,0.82)"; g.strokeStyle = opt.color || "rgba(79,200,220,0.9)"; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.quadraticCurveTo(w, 0, w, r); g.lineTo(w, h - r); g.quadraticCurveTo(w, h, w - r, h); g.lineTo(r, h); g.quadraticCurveTo(0, h, 0, h - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.closePath(); g.fill(); g.stroke();
    if (opt.pin) { g.beginPath(); g.moveTo(w / 2 - 6 * dpr, h); g.lineTo(w / 2, h + 10 * dpr); g.lineTo(w / 2 + 6 * dpr, h); g.closePath(); g.fillStyle = opt.color || "rgba(79,200,220,0.9)"; g.fill(); }
    g.fillStyle = opt.fg || "#e4f1ed"; g.fillText(text, w / 2, h / 2 + dpr);
    return { image: c, width: w / dpr, height: c.height / dpr };
  }
  function addTag(id, lon, lat, text, opt = {}) {
    const C = T.C, t = tag(text, opt);
    const e = T.v.entities.add({
      id, position: C.Cartesian3.fromDegrees(lon, lat),
      billboard: { image: t.image, width: t.width, height: t.height, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: C.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY, scaleByDistance: new C.NearFarScalar(15000, 1.05, 600000, 0.55), pixelOffset: opt.up ? new C.Cartesian2(0, -opt.up) : undefined, translucencyByDistance: opt.far ? new C.NearFarScalar(opt.far * 0.5, 1, opt.far, 0) : undefined }
    });
    return e;
  }

  /* =================== المشهد =================== */
  function loadCesium() {
    if (window.Cesium) return Promise.resolve(window.Cesium);
    if (T.loading) return T.loading;
    window.CESIUM_BASE_URL = CES_BASE;
    T.loading = new Promise((res, rej) => {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = CES_BASE + "Widgets/widgets.css"; document.head.appendChild(css);
      const s = document.createElement("script"); s.src = CES_BASE + "Cesium.js"; s.async = true;
      s.onload = () => (window.Cesium ? res(window.Cesium) : rej(new Error("NO_CESIUM")));
      s.onerror = () => { T.loading = null; rej(new Error("CESIUM_LOAD")); };
      document.head.appendChild(s);
    });
    return T.loading;
  }
  function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }

  async function build() {
    const st = U.$("#tw-load"); st.hidden = false; st.textContent = "جارٍ تحميل محرك الأرض ثلاثي الأبعاد…";
    if (!webglOK()) { st.textContent = "متصفحك لا يدعم WebGL اللازم للعرض ثلاثي الأبعاد. جرّب Chrome أو Safari حديثاً."; return false; }
    let C;
    try { C = await loadCesium(); } catch (e) { st.innerHTML = `تعذّر تحميل محرك العرض ثلاثي الأبعاد (CesiumJS). تأكد من الإنترنت ثم <button type="button" class="linkbtn" id="tw-retry">أعد المحاولة</button>.`; U.$("#tw-retry").onclick = () => start(); return false; }
    T.C = C;
    try { C.Ion.defaultAccessToken = ""; } catch (e) { /* */ }
    st.textContent = "جارٍ تجهيز صور الأقمار والتضاريس…";
    await probe();
    const v = T.v = new C.Viewer("tw-globe", {
      baseLayer: new C.ImageryLayer(esri("World_Imagery", "Imagery © Esri, Maxar, Earthstar Geographics")),
      terrainProvider: terrainProvider(C),
      animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false, creditContainer: "tw-credits",
      requestRenderMode: true, maximumRenderTimeChange: Infinity, msaaSamples: isMobile() ? 1 : 4
    });
    const sc = v.scene;
    sc.verticalExaggeration = T.exag;
    sc.globe.baseColor = C.Color.fromCssColorString("#0b1d22");
    sc.globe.maximumScreenSpaceError = isMobile() ? 3 : 2;
    sc.globe.depthTestAgainstTerrain = false;
    sc.screenSpaceCameraController.minimumZoomDistance = 600;
    sc.screenSpaceCameraController.maximumZoomDistance = 2.5e7;
    if (isMobile()) v.resolutionScale = Math.min(1, 1.6 / (window.devicePixelRatio || 1));
    T.layers.labels = [v.imageryLayers.addImageryProvider(esri("Reference/World_Transportation")), v.imageryLayers.addImageryProvider(esri("Reference/World_Boundaries_and_Places", "Labels © Esri"))];
    T.layers.labels.forEach(l => { l.alpha = 0.9; });
    v.camera.setView({ destination: C.Cartesian3.fromDegrees(44.2, 30.5, 1.9e7) });
    st.textContent = "جارٍ رسم مسار نهر دجلة…";
    await loadRiver();
    await drawStatic();
    const h = new C.ScreenSpaceEventHandler(sc.canvas);
    h.setInputAction(ev => onClick(ev.position), C.ScreenSpaceEventType.LEFT_CLICK);
    st.hidden = true;
    return true;
  }

  async function drawStatic() {
    const C = T.C, v = T.v;
    // مسار النهر بارتفاعاته الحقيقية
    const step = Math.max(1, Math.floor(T.river.line.length / 1500));
    const pts = T.river.line.filter((_, i) => i % step === 0);
    const hs = await elevations(pts, 11);
    T.riverH = { pts, hs };
    T.lineH = new Float32Array(T.river.line.length).map((_, i) => hs[Math.min(hs.length - 1, Math.round(i / step))]);
    T.ents.river = v.entities.add({ id: "tw-river", polyline: { positions: new C.CallbackProperty(() => riverPositions(), false), width: 3, arcType: C.ArcType.NONE, material: new C.PolylineGlowMaterialProperty({ glowPower: 0.18, color: C.Color.fromCssColorString("#4fc8dc").withAlpha(0.9) }) } });
    TOWNS.forEach(t => addTag("tw-town-" + t.id, t.lon, t.lat, t.name, { pin: true, bold: true, size: 15 }));
    addTag("tw-tharthar", 43.27, 33.98, "بحيرة الثرثار", { color: "rgba(147,221,138,0.9)", size: 14 });
    (ECO.RESEARCH || []).filter(r => r.lat != null).forEach(r => addTag("tw-rs-" + r.id, r.lon, r.lat, (r.supervisor ? "بحث المشرفة: " : "بحث: ") + r.place.split("–")[0].trim(), { color: "rgba(230,174,79,0.95)", size: 12, pin: true, far: 160000, up: 30 }));
    rq();
  }
  function riverPositions() {
    if (!T.riverH) return [];
    const C = T.C, { pts, hs } = T.riverH, ex = T.exag;
    if (T._rpEx === ex && T._rp) return T._rp;
    T._rpEx = ex; T._rp = C.Cartesian3.fromDegreesArrayHeights(pts.flatMap((p, i) => [p[0], p[1], hs[i] * ex + 25 * ex]));
    return T._rp;
  }

  /* =================== التنقل والجولة =================== */
  function fly(lon, lat, alt, heading = 0, pitch = -35, dur = 2.5) {
    const C = T.C;
    return new Promise(res => T.v.camera.flyTo({ destination: C.Cartesian3.fromDegrees(lon, lat, alt), orientation: { heading: C.Math.toRadians(heading), pitch: C.Math.toRadians(pitch), roll: 0 }, duration: dur, complete: res, cancel: res }));
  }
  // كاميرا تنظر إلى نقطة من الجنوب بزاوية مائلة
  function lookOblique(lon, lat, dist, heading = 0, pitch = -32) {
    const back = dist * Math.cos(-pitch * R), up = dist * Math.sin(-pitch * R);
    const hd = heading * R, lon2 = lon - Math.sin(hd) * back / KX, lat2 = lat - Math.cos(hd) * back / KY;
    return fly(lon2, lat2, up + 150 * T.exag, heading, pitch);
  }
  async function intro() {
    U.$("#tw-intro").hidden = true; U.$("#tw-ui").hidden = false;
    window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 300);
    await fly(43.9, 33.4, 2.2e6, 0, -90, 3);
    await lookOblique(43.62, 34.62, 95000, 335, -30);
    rq();
  }
  async function riverTour() {
    if (T.touring) { T.touring = false; return; }
    T.touring = true; const b = U.$("#tw-tour"); b.classList.add("on"); b.querySelector("span").textContent = "إيقاف الجولة";
    const L = T.river.len, n = 9;
    const s0 = TOWNS[0].s, s1 = TOWNS[TOWNS.length - 1].s;
    for (let k = 0; k <= n && T.touring; k++) {
      const s = s0 + (s1 - s0) * k / n, p = pointAt(s), q = pointAt(Math.min(L, s + 6000));
      const hd = bearing(p, q) / R;
      const near = TOWNS.find(t => Math.abs(t.s - s) < (s1 - s0) / n / 2);
      setCaption(near ? `نمرّ فوق ${near.name}` : `على مجرى دجلة · ${Math.round((s - s0) / 1000)} كم من الشرقاط`);
      await lookOblique(p[0], p[1], 14000, hd, -24);
      await new Promise(r => setTimeout(r, 900));
    }
    setCaption(""); T.touring = false; b.classList.remove("on"); b.querySelector("span").textContent = "جولة على النهر";
  }
  function setCaption(t) { const c = U.$("#tw-cap"); c.textContent = t; c.hidden = !t; }

  /* =================== الضغط على الأرض =================== */
  async function onClick(pos) {
    const C = T.C, ray = T.v.camera.getPickRay(pos), cart = ray && T.v.scene.globe.pick(ray, T.v.scene);
    if (!cart) return;
    const cg = C.Cartographic.fromCartesian(cart), lon = cg.longitude / R, lat = cg.latitude / R;
    if (T.mode === "spill" && T.pickingSource) { setSource(lon, lat); return; }
    const [h] = await elevations([[lon, lat]], 12);
    const r = nearest(T.river.line, T.river.cum, [lon, lat], T.river.grid);
    const box = U.$("#tw-probe");
    box.hidden = false;
    box.innerHTML = `<b dir="ltr">${lat.toFixed(5)}, ${lon.toFixed(5)}</b><span>الارتفاع ${Math.round(h)} م فوق سطح البحر</span><span>${r.d < 400 ? "على مجرى دجلة" : "تبعد " + U.fmt(r.d / 1000, r.d < 10000 ? 1 : 0) + " كم عن دجلة"}</span>
      <div class="tw-pa"><a href="#space" data-tw-space="${lat.toFixed(5)},${lon.toFixed(5)}">اقرأ جودة الماء هنا من Sentinel-2</a><a href="${U.gdir(lat.toFixed(5), lon.toFixed(5))}" target="_blank" rel="noopener">الطريق إليه</a></div>`;
  }

  /* =================== وضع الاستكشاف =================== */
  async function setOverlay(kind) {
    const C = T.C;
    ["s2", "ndti"].forEach(k => { dropLayers(T.layers[k]); T.layers[k] = null; });
    U.$$("#tw-ov button").forEach(b => b.classList.toggle("on", b.dataset.ov === kind));
    const note = U.$("#tw-ovnote");
    if (kind === "none") { note.textContent = "صور Esri عالية الدقة (مركّبة من سنوات حديثة)."; rq(); return; }
    note.textContent = "جارٍ البحث عن أحدث صورة صافية من Sentinel-2…";
    try {
      const end = new Date(), start = new Date(Date.now() - 60 * 86400000), iso = d => d.toISOString().slice(0, 10);
      const items = await ECO.space.search({ bbox: [TIKRIT.lon - 0.01, TIKRIT.lat - 0.01, TIKRIT.lon + 0.01, TIKRIT.lat + 0.01], datetime: `${iso(start)}/${iso(end)}T23:59:59Z`, cloud: 15, limit: 20 });
      if (!items.length) { note.textContent = "لا توجد صورة صافية حديثة."; return; }
      const it = items[0];
      const day = await ECO.space.search({ bbox: [43.0, 34.0, 44.3, 35.6], datetime: `${it.date}T00:00:00Z/${it.date}T23:59:59Z`, limit: 6 });
      T.layers[kind] = [];
      for (const d of day.length ? day : [it]) {
        const q = ECO.space.tileQuery(d, kind === "s2" ? "rgb" : "ndti");
        const params = Object.fromEntries(q.entries()); delete params.collection; delete params.item; delete params.tile_format;
        const tpl = await pcTileTemplate("sentinel-2-l2a", d.id, params);
        T.layers[kind].push(pcLayer(tpl, d.bbox, kind === "ndti" ? 0.95 : 1, 16));
      }
      const lab = T.layers.labels; lab.forEach(l => T.v.imageryLayers.raiseToTop(l));
      note.innerHTML = `${kind === "s2" ? "صورة Sentinel-2 حقيقية" : "مؤشر العكورة NDTI على بكسلات الماء (أزرق أصفى ← بني أعكر)"} بتاريخ <b>${it.date}</b> · غيوم ${U.fmt(it.cloud, 0)}% · دقة 10 م.`;
    } catch (e) { note.textContent = "تعذّر جلب صورة Sentinel-2 الآن."; }
    rq();
  }
  // إزالة طبقات بقائمة
  const dropLayers = arr => { (Array.isArray(arr) ? arr : arr ? [arr] : []).forEach(l => T.v.imageryLayers.remove(l, true)); };

  /* =================== آلة الزمن =================== */
  const yearOf = it => +it.date.slice(0, 4), monthOf = it => +it.date.slice(5, 7);
  const SEASONS = { low: { name: "أواخر الصيف والخريف (آب–تشرين الأول)", m: [8, 9, 10] }, high: { name: "الربيع (آذار–أيار)", m: [3, 4, 5] } };
  async function landsatItems() {
    if (T.tm.items) return T.tm.items;
    const c = U.store.get("tw_ls", null);
    if (c && Date.now() - c.at < 7 * 86400000 && c.items && c.items.length > 50) return (T.tm.items = c.items);
    const p = new URLSearchParams({ collections: "landsat-c2-l2", bbox: [TIKRIT.lon - 0.01, TIKRIT.lat - 0.01, TIKRIT.lon + 0.01, TIKRIT.lat + 0.01].join(","), datetime: `1984-01-01/${new Date().toISOString().slice(0, 10)}T23:59:59Z`, limit: "250", sortby: "datetime", "filter-lang": "cql2-text", filter: "eo:cloud_cover<12", fields: "id,bbox,properties.datetime,properties.eo:cloud_cover,properties.platform,properties.landsat:wrs_path,properties.landsat:wrs_row" });
    let out = [], params = p;
    for (let page = 0; page < 12; page++) {
      const j = await ECO.space.pcGet("stac", "search", params);
      (j.features || []).forEach(f => { const pr = f.properties || {}; out.push({ id: f.id, bbox: f.bbox, date: String(pr.datetime || "").slice(0, 10), cloud: pr["eo:cloud_cover"], plat: pr.platform || "", path: String(pr["landsat:wrs_path"] || ""), row: String(pr["landsat:wrs_row"] || "") }); });
      prog(`أرشيف Landsat: ${out.length} صورة…`);
      const next = (j.links || []).find(l => l.rel === "next");
      if (!next) break;
      try { params = new URL(next.href).searchParams; } catch (e) { break; }
    }
    out = out.filter(it => (!it.path || it.path.replace(/^0+/, "") === LS_SCENE.path) && (!it.row || it.row.padStart(3, "0") === LS_SCENE.row));
    T.tm.items = out;
    try { U.store.set("tw_ls", { at: Date.now(), items: out }); } catch (e) { /* */ }
    return out;
  }
  const prog = t => { const p = U.$("#tw-tmprog"); if (p) p.textContent = t; };
  function bestPerYear() {
    const months = SEASONS[T.tm.season].m, by = new Map();
    (T.tm.items || []).filter(it => months.includes(monthOf(it))).forEach(it => {
      const y = yearOf(it), striped = /landsat-7/.test(it.plat) && it.date >= "2003-06-01";
      const score = (it.cloud || 0) + (striped ? 40 : 0) + (/landsat-[45]/.test(it.plat) && y >= 2013 ? 5 : 0);
      const o = by.get(y); if (!o || score < o.score) by.set(y, { ...it, score, striped });
    });
    T.tm.best = by; T.tm.years = [...by.keys()].sort((a, b) => a - b);
    return T.tm.years;
  }
  const satName = p => ({ "landsat-4": "Landsat 4", "landsat-5": "Landsat 5", "landsat-7": "Landsat 7", "landsat-8": "Landsat 8", "landsat-9": "Landsat 9" })[p] || p;
  async function showYear(y, which = "A") {
    const it = T.tm.best.get(y); if (!it) return;
    const tpl = await pcTileTemplate("landsat-c2-l2", it.id, { assets_list: ["red", "green", "blue"], color_formula: LANDSAT_CF });
    const old = which === "A" ? T.tm.layer : T.tm.layerB;
    const l = pcLayer(tpl, it.bbox, 1, 14);
    if (T.tm.cmp) l.splitDirection = which === "A" ? T.C.SplitDirection.LEFT : T.C.SplitDirection.RIGHT;
    T.layers.labels.forEach(x => T.v.imageryLayers.raiseToTop(x));
    if (which === "A") { T.tm.layer = l; T.tm.year = y; } else { T.tm.layerB = l; T.tm.yearB = y; }
    setTimeout(() => { if (old) T.v.imageryLayers.remove(old, true); rq(); }, 900);
    renderYearInfo(); rq();
    areaFor(y).then(renderYearInfo).catch(() => { /* */ });
  }

  // مساحة الماء من القمر: نسبة بكسلات MNDWI ≥ 0 داخل المنطقة × مساحتها
  function aoiFeature(key) {
    const a = AOIS[key];
    if (a.rect) { const [w, s, e, n] = a.rect; return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } }; }
    if (!a.poly) {
      // شريط حول خط Natural Earth الثابت حتى تبقى المنطقة نفسها كل سنة
      const ne = densify(ECO.TWIN_GEO.tigrisNE.filter(p => p[1] >= a.corridor[0] - 0.05 && p[1] <= a.corridor[1] + 0.05), 1500).filter(p => p[1] >= a.corridor[0] && p[1] <= a.corridor[1]);
      const L = [], Rt = [];
      ne.forEach((p, i) => {
        const q = ne[Math.min(ne.length - 1, i + 1)], o = ne[Math.max(0, i - 1)], b = bearing(o, q);
        const ox = Math.cos(b) * a.buf / KX, oy = -Math.sin(b) * a.buf / KY;
        L.push([+(p[0] - ox).toFixed(5), +(p[1] - oy).toFixed(5)]); Rt.push([+(p[0] + ox).toFixed(5), +(p[1] + oy).toFixed(5)]);
      });
      const ring = L.concat(Rt.reverse()); ring.push(ring[0]);
      a.poly = ring;
    }
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [a.poly] } };
  }
  function ringArea(ring) { let s = 0; for (let i = 0; i < ring.length - 1; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[i + 1]; s += (x1 * KX) * (y2 * KY) - (x2 * KX) * (y1 * KY); } return Math.abs(s) / 2; }
  function aoiStats(key) {
    const f = aoiFeature(key), ring = f.geometry.coordinates[0];
    const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
    const bboxArea = (Math.max(...xs) - Math.min(...xs)) * KX * (Math.max(...ys) - Math.min(...ys)) * KY;
    return { f, polyArea: ringArea(ring), bboxArea };
  }
  async function pcPost(path, params, body) {
    const qs = params.toString(), px = proxy();
    const go = async (url) => { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r; };
    let r = null;
    if (T.via.pc === "direct") { try { r = await go(`${PC}/data/v1/${path}?${qs}`); } catch (e) { if (!px) throw e; T.via.pc = "proxy"; } }
    if (T.via.pc === "proxy") { r = await go(`${px}/v1/pc/data/${path}?${qs}`); if (r.status === 404) throw Object.assign(new Error("OLD_WORKER"), { old: true }); }
    if (r.status === 422 && !body.geojson) return pcPost(path, params, { geojson: body });
    if (!r.ok) throw Object.assign(new Error("HTTP " + r.status), { status: r.status });
    return r.json();
  }
  const areaKey = (it, aoi) => `${it.id}|${aoi}`;
  async function areaFor(y, aoi = T.tm.aoi) {
    const it = T.tm.best.get(y); if (!it) return null;
    const key = areaKey(it, aoi), cache = U.store.get("tw_area", {});
    if (cache[key]) { T.tm.area[key] = cache[key]; return cache[key]; }
    if (T.tm.area[key]) return T.tm.area[key];
    const A = AOIS[aoi], st = aoiStats(aoi);
    const p = new URLSearchParams({ collection: "landsat-c2-l2", item: it.id, expression: MNDWI, asset_as_band: "true", histogram_bins: "2", histogram_range: "-1,1", max_size: String(A.max) });
    let j;
    try { j = await pcPost("item/statistics", p, st.f); }
    catch (e) { if (e.status >= 500 && A.max > 1024) { p.set("max_size", "1024"); j = await pcPost("item/statistics", p, st.f); } else throw e; }
    const stats = (j.properties && j.properties.statistics) || (j.features && j.features[0] && j.features[0].properties.statistics) || j;
    const b = stats[Object.keys(stats)[0]];
    if (!b || !b.histogram) throw new Error("NO_STATS");
    const water = b.histogram[0][1], valid = b.valid_pixels != null ? b.valid_pixels : b.count, total = valid + (b.masked_pixels || 0);
    const pxArea = st.bboxArea / total, inside = total * st.polyArea / st.bboxArea;
    const res = { y, date: it.date, km2: +(water * pxArea / 1e6).toFixed(1), cover: Math.min(1, valid / inside), plat: it.plat };
    T.tm.area[key] = res;
    try { const c2 = U.store.get("tw_area", {}); c2[key] = res; U.store.set("tw_area", c2); } catch (e) { /* */ }
    return res;
  }
  async function allYears() {
    const btn = U.$("#tw-all"); btn.disabled = true;
    const ys = T.tm.years.slice(); let done = 0;
    const q = ys.slice();
    const w = async () => { while (q.length) { const y = q.shift(); try { await areaFor(y); } catch (e) { if (e.old) { q.length = 0; prog("الخادم المشترك يحتاج تحديث الكود لحساب المساحات."); } } done++; prog(`حساب مساحة الماء من الأقمار: ${done} من ${ys.length} سنة`); renderChart(); } };
    await Promise.all([w(), w(), w()]);
    btn.disabled = false; prog(""); renderChart(); renderYearInfo();
  }
  async function loadFlow() {
    if (T.tm.flow) return T.tm.flow;
    const c = U.store.get("tw_flow", null);
    if (c && Date.now() - c.at < 7 * 86400000) return (T.tm.flow = c.data);
    const end = new Date().toISOString().slice(0, 10);
    const r = await fetch(`${FLOOD}?latitude=${TIKRIT.lat}&longitude=${TIKRIT.lon}&daily=river_discharge&start_date=1984-01-01&end_date=${end}`);
    if (!r.ok) throw new Error("FLOOD");
    const j = await r.json(), t = j.daily.time, q = j.daily.river_discharge, by = {};
    t.forEach((d, i) => { const y = +d.slice(0, 4); if (U.isNum(q[i])) { (by[y] = by[y] || []).push(q[i]); } });
    const data = Object.fromEntries(Object.entries(by).filter(([, a]) => a.length > 200).map(([y, a]) => [y, +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(0)]));
    T.tm.flow = data; try { U.store.set("tw_flow", { at: Date.now(), data }); } catch (e) { /* */ }
    return data;
  }
  function areaSeries() {
    const cache = U.store.get("tw_area", {});
    return T.tm.years.map(y => { const it = T.tm.best.get(y), a = it && (T.tm.area[areaKey(it, T.tm.aoi)] || cache[areaKey(it, T.tm.aoi)]); return a && a.cover > 0.85 ? a : null; });
  }
  function renderChart() {
    const cv = U.$("#tw-chart"); if (!cv || !T.tm.years.length) return;
    const ser = areaSeries(), flow = T.tm.flow || {};
    U.chart(cv, {
      type: "bar",
      data: { labels: T.tm.years, datasets: [
        { type: "bar", label: "مساحة الماء (كم²) – " + AOIS[T.tm.aoi].name, data: ser.map(a => a ? a.km2 : null), backgroundColor: T.tm.years.map(y => (y === T.tm.year ? "#4fc8dc" : "rgba(79,200,220,0.45)")), yAxisID: "y", borderRadius: 3 },
        { type: "line", label: "متوسط التصريف عند تكريت (م³/ث) – GloFAS", data: T.tm.years.map(y => flow[y] != null ? flow[y] : null), borderColor: "#e6ae4f", backgroundColor: "#e6ae4f", pointRadius: 2, borderWidth: 1.6, yAxisID: "y2", spanGaps: true, tension: 0.25 }
      ] },
      options: {
        animation: false, interaction: { mode: "index", intersect: false },
        scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false } }, y: { position: "left", title: { display: true, text: "كم²" }, beginAtZero: true }, y2: { position: "right", title: { display: true, text: "م³/ث" }, grid: { display: false }, beginAtZero: true } },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
        onClick: (e, el) => { if (el && el.length) setYear(T.tm.years[el[0].index]); }
      }
    });
  }
  function renderYearInfo() {
    const box = U.$("#tw-yinfo"); if (!box) return;
    const y = T.tm.year, it = y && T.tm.best.get(y);
    if (!it) { box.innerHTML = ""; return; }
    const a = T.tm.area[areaKey(it, T.tm.aoi)] || U.store.get("tw_area", {})[areaKey(it, T.tm.aoi)];
    const ser = areaSeries().filter(Boolean);
    let cmp = "";
    if (ser.length >= 2) {
      const f = ser[0], l = ser[ser.length - 1], ch = (l.km2 - f.km2) / f.km2 * 100;
      cmp = `<div class="tw-head"><span>${AOIS[T.tm.aoi].name}</span><b>${f.y}: ${U.fmt(f.km2, 0)} كم² ← ${l.y}: ${U.fmt(l.km2, 0)} كم²</b><span class="chip tone-${ch < -10 ? "bad" : ch > 10 ? "good" : "info"}">${ch > 0 ? "+" : ""}${U.fmt(ch, 0)}%</span></div>`;
    }
    box.innerHTML = `${cmp}<div class="tw-ystat"><span class="tw-ybig">${y}</span><span>${it.date} · ${satName(it.plat)} · غيوم ${U.fmt(it.cloud, 0)}%${it.striped ? " · <span class=\"warnc\">صورة مخططة (عطل Landsat 7)</span>" : ""}</span>
      <span>مساحة الماء: ${a ? (a.cover > 0.85 ? `<b>${U.fmt(a.km2, a.km2 < 100 ? 1 : 0)} كم²</b>` : `تغطية الصورة ${Math.round(a.cover * 100)}% فقط من المنطقة`) : `<span class="faint">جارٍ الحساب…</span>`}${T.tm.flow && T.tm.flow[y] ? ` · التصريف ${U.fmt(T.tm.flow[y], 0)} م³/ث` : ""}</span></div>`;
    const sl = U.$("#tw-year"); if (sl) { sl.value = String(T.tm.years.indexOf(y)); U.$("#tw-yearlbl").textContent = y; }
    renderChart();
  }
  function setYear(y) { if (y === T.tm.year) return; showYear(y, "A"); }
  async function enterTime() {
    const P = U.$("#tw-panel-time"); prog("جارٍ جلب أرشيف Landsat…");
    try { await landsatItems(); } catch (e) { prog(ECO.space.errText(e).replace(/<[^>]+>/g, "")); return; }
    bestPerYear(); prog("");
    if (!T.tm.years.length) { prog("لا توجد صور مناسبة."); return; }
    const sl = U.$("#tw-year"); sl.max = String(T.tm.years.length - 1);
    U.$("#tw-yfirst").textContent = T.tm.years[0]; U.$("#tw-ylast").textContent = T.tm.years[T.tm.years.length - 1];
    loadFlow().then(renderChart).catch(() => { /* */ });
    const y = T.tm.year && T.tm.best.has(T.tm.year) ? T.tm.year : T.tm.years[0];
    T.tm.year = null; await showYear(y);
    if (T.tm.aoi === "tharthar") lookOblique(43.30, 33.95, 120000, 20, -40); else lookOblique(43.7, 34.55, 90000, 340, -38);
    P.hidden = false;
  }
  function leaveTime() {
    stopPlay();
    dropLayers(T.tm.layer); dropLayers(T.tm.layerB); T.tm.layer = T.tm.layerB = null; T.tm.year = null; setCompare(false); rq();
  }
  function startPlay() {
    if (T.tm.playing) { stopPlay(); return; }
    T.tm.playing = true; playIcon(U.$("#tw-play"), true); U.$("#tw-play").setAttribute("aria-label", "إيقاف");
    let i = T.tm.years.indexOf(T.tm.year); if (i >= T.tm.years.length - 1) i = -1;
    const step = () => { if (!T.tm.playing) return; i++; if (i >= T.tm.years.length) { stopPlay(); return; } showYear(T.tm.years[i]); T.tm.timer = setTimeout(step, 2600); };
    step();
  }
  function stopPlay() { T.tm.playing = false; clearTimeout(T.tm.timer); const b = U.$("#tw-play"); if (b) { playIcon(b, false); b.setAttribute("aria-label", "تشغيل"); } }
  function setCompare(on) {
    T.tm.cmp = on; const C = T.C, sc = T.v && T.v.scene;
    U.$("#tw-split").hidden = !on; U.$("#tw-cmpbox").hidden = !on;
    if (!sc) return;
    if (on) {
      sc.splitPosition = 0.5; U.$("#tw-split").style.left = "50%";
      if (T.tm.layer) T.tm.layer.splitDirection = C.SplitDirection.LEFT;
      const yb = T.tm.years[T.tm.years.length - 1];
      U.$("#tw-yb").innerHTML = T.tm.years.map(y => `<option ${y === yb ? "selected" : ""}>${y}</option>`).join("");
      showYear(+U.$("#tw-yb").value, "B");
    } else {
      if (T.tm.layer) T.tm.layer.splitDirection = C.SplitDirection.NONE;
      dropLayers(T.tm.layerB); T.tm.layerB = null;
    }
    rq();
  }
  function dragSplit(e) {
    const st = U.$("#tw-stage").getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - st.left;
    const k = U.clamp(x / st.width, 0.03, 0.97);
    U.$("#tw-split").style.left = (k * 100) + "%"; T.v.scene.splitPosition = k; rq();
  }

  /* =================== محاكاة التسرب =================== */
  function setSource(lon, lat) {
    const r = nearest(T.river.line, T.river.cum, [lon, lat], T.river.grid);
    T.pickingSource = false; U.$("#tw-pick").classList.remove("on");
    if (r.d > 3000) { U.toast("اختر نقطة على مجرى دجلة أو قريبة منه"); return; }
    T.src = { s: r.s, p: T.river.line[r.i], label: "نقطة مختارة على النهر" };
    renderSrc(); markSource(); clearSim();
  }
  function markSource() {
    const C = T.C; if (T.ents.src) T.v.entities.remove(T.ents.src);
    T.ents.src = addTag("tw-src", T.src.p[0], T.src.p[1], "مصدر التسرب", { color: "rgba(239,90,100,0.95)", pin: true, bold: true });
    rq();
  }
  function renderSrc() {
    const s = T.src; U.$("#tw-srclbl").innerHTML = s ? `${U.esc(s.label)} <span class="faint" dir="ltr">${s.p[1].toFixed(4)}, ${s.p[0].toFixed(4)}</span>` : "لم يُحدَّد";
  }
  async function fetchInputs() {
    const s = T.src, box = U.$("#tw-inputs");
    box.innerHTML = `<p class="faint">جارٍ جلب تصريف النهر والريح الحقيقيين…</p>`;
    const [lon, lat] = s.p, today = new Date().toISOString().slice(0, 10);
    const inp = { Q: null, Qdate: null, wind: null, wdir: null, slope: null };
    try {
      const r = await fetch(`${FLOOD}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=river_discharge&past_days=3&forecast_days=3`);
      const j = await r.json(); const t = j.daily.time, q = j.daily.river_discharge;
      let i = t.indexOf(today); if (i < 0 || !U.isNum(q[i])) i = q.map((v, k) => (U.isNum(v) ? k : -1)).filter(k => k >= 0).pop();
      if (i != null && i >= 0) { inp.Q = q[i]; inp.Qdate = t[i]; }
    } catch (e) { /* */ }
    try {
      const r = await fetch(`${WXAPI}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`);
      const j = await r.json(); inp.wind = j.current.wind_speed_10m; inp.wdir = j.current.wind_direction_10m;
    } catch (e) { /* */ }
    // الانحدار من التضاريس: متوسط ارتفاع 5 كم عند المصدر وعند نهاية المسار
    const sEnd = Math.min(T.river.len - 1, s.s + 120000);
    const near = riverSlice(s.s, s.s + 5000), far = riverSlice(sEnd - 5000, sEnd);
    const [h1, h2] = await Promise.all([elevations(near), elevations(far)]);
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    inp.slope = U.clamp((mean(h1) - mean(h2)) / (sEnd - s.s), 0.00005, 0.002);
    inp.h1 = mean(h1); inp.h2 = mean(h2); inp.reach = (sEnd - s.s) / 1000;
    T.inp = inp;
    U.$("#tw-q").value = inp.Q != null ? Math.round(inp.Q) : "";
    box.innerHTML = `<div class="tw-real">
      <span><small>تصريف النهر (GloFAS)</small><b>${inp.Q != null ? U.fmt(inp.Q, 0) + " م³/ث" : "غير متاح"}</b><small>${inp.Qdate || ""}</small></span>
      <span><small>انحدار المجرى (من التضاريس)</small><b>${U.fmt(inp.slope * 1e5, 1)} سم/كم</b><small>${Math.round(inp.h1)} ← ${Math.round(inp.h2)} م خلال ${Math.round(inp.reach)} كم</small></span>
      <span><small>الريح الآن</small><b>${inp.wind != null ? U.fmt(inp.wind, 1) + " م/ث" : "—"}</b><small>${inp.wdir != null ? "من " + Math.round(inp.wdir) + "°" : ""}</small></span></div>
      ${inp.Q == null ? `<p class="warnc tw-small">لم يُتح التصريف؛ اكتب قيمة معروفة لديك في الخانة أدناه.</p>` : ""}`;
    return inp;
  }
  function compute() {
    const inp = T.inp, P = POLL[U.$("#tw-type").value];
    const Q = +U.$("#tw-q").value, W = +U.$("#tw-w").value, n = +U.$("#tw-n").value, M = +U.$("#tw-m").value, S = inp.slope;
    if (!(Q > 0) || !(W > 0) || !(n > 0) || !(M > 0)) return null;
    const H = Math.pow(Q * n / (W * Math.sqrt(S)), 0.6);           // عمق طبيعي – Manning لقناة عريضة
    const Uv = Q / (W * H);                                            // السرعة المتوسطة
    const us = Math.sqrt(9.81 * H * S);                                // سرعة الاحتكاك
    const D = U.clamp(0.011 * Uv * Uv * W * W / (H * us), 5, 30000);   // Fischer et al. (1979)
    let Ueff = Uv, wpar = 0;
    if (P.oil && inp.wind != null && inp.wdir != null) {
      const sp = pointAt(T.src.s), sq = pointAt(Math.min(T.river.len, T.src.s + 3000)), rb = bearing(sp, sq), toward = (inp.wdir + 180) * R;
      wpar = inp.wind * Math.cos(toward - rb); Ueff = Math.max(0.05, Uv + 0.03 * wpar);
    }
    const A = W * H, k = P.k / 86400;
    const down = TOWNS.filter(t => t.s > T.src.s + 500 && t.dRiver < 6000).map(t => {
      const x = t.s - T.src.s, tp = x / Ueff;
      const q = (-2 * Math.sqrt(2 * D) + Math.sqrt(8 * D + 4 * Ueff * x)) / (2 * Ueff), t0 = q * q;
      const C = P.oil ? null : M * Math.exp(-k * tp) / (A * Math.sqrt(4 * Math.PI * D * tp)) * 1000;
      return { t, x, tp, t0, C };
    });
    const tEnd = down.length ? down[down.length - 1].tp * 1.12 : 48 * 3600;
    return { P, Q, W, n, M, S, H, Uv, Ueff, wpar, D, A, k, down, tEnd };
  }
  const hhmm = sec => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return `${h}:${String(m).padStart(2, "0")}`; };
  const clock = sec => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baghdad" }).format(new Date(T.sim.t0 + sec * 1000));
  async function runSim() {
    if (!T.src) { U.toast("حدّد مصدر التسرب أولاً"); return; }
    if (!T.inp || T.inp.for !== T.src.s) { await fetchInputs(); T.inp.for = T.src.s; }
    const r = compute();
    if (!r) { U.toast("أكمل القيم: التصريف والعرض والكمية"); return; }
    T.sim = { ...r, t0: Date.now(), t: 0 };
    renderResults();
    U.$("#tw-clock").hidden = false; U.$("#tw-simt").max = String(Math.round(r.tEnd));
    drawPlume();
    const p = T.src.p, q = pointAt(Math.min(T.river.len, T.src.s + 8000));
    await lookOblique(p[0], p[1], 26000, bearing(p, q) / R, -30);
    playSim(true);
  }
  function renderResults() {
    const s = T.sim, P = s.P;
    U.$("#tw-res").innerHTML = `
      <div class="tw-real tw-calc">
        <span><small>السرعة المحسوبة</small><b>${U.fmt(s.Uv, 2)} م/ث</b><small>${U.fmt(s.Uv * 3.6, 1)} كم/ساعة</small></span>
        <span><small>العمق المكافئ</small><b>${U.fmt(s.H, 1)} م</b><small>Manning</small></span>
        <span><small>معامل التشتت</small><b>${U.fmt(s.D, 0)} م²/ث</b><small>Fischer</small></span>
        ${P.oil ? `<span><small>سرعة البقعة مع الريح</small><b>${U.fmt(s.Ueff, 2)} م/ث</b><small>ريح موازية ${U.fmt(s.wpar, 1)} م/ث</small></span>` : ""}
      </div>
      ${s.down.length ? `<div class="tbl-wrap"><table class="tbl tw-tbl"><thead><tr><th>المدينة</th><th>المسافة بالنهر</th><th>بداية الوصول</th><th>ذروة الوصول</th>${P.oil ? "" : "<th>أعلى تركيز</th>"}</tr></thead><tbody>
        ${s.down.map(d => `<tr><td><b>${d.t.name}</b></td><td>${U.fmt(d.x / 1000, 0)} كم</td><td>بعد ${hhmm(d.t0)} س<br><small>${clock(d.t0)}</small></td><td>بعد ${hhmm(d.tp)} س<br><small>${clock(d.tp)}</small></td>${P.oil ? "" : `<td dir="ltr">${d.C >= 0.01 ? U.fmt(d.C, d.C < 1 ? 2 : 1) : "&lt; 0.01"} mg/L</td>`}</tr>`).join("")}
      </tbody></table></div>` : `<p class="faint">لا توجد مدن أسفل هذه النقطة ضمن المسار.</p>`}
      <p class="faint tw-small">نموذج تعليمي مبسّط أحادي البعد: تسرب لحظي يختلط كلياً في مقطع النهر. العرض ومعامل Manning مفترضان (عدّلهما)، والتصريف من نموذج GloFAS وليس قياساً. ${P.oil ? "البقعة النفطية تنجرف بسرعة التيار + 3% من مركّبة الريح الموازية للنهر، ولا يحسب النموذج التبخر والانتشار الأفقي." : P.k ? "التحلل من الرتبة الأولى بمعدل 0.23 يوم⁻¹ (BOD عند 20 °م)." : "مادة ثابتة لا تتحلل."}</p>
      <div class="row tw-acts"><button class="btn btn-sm" type="button" id="tw-rep"><svg><use href="#i-file"/></svg>تقرير PDF</button></div>`;
    U.$("#tw-rep").onclick = simReport;
  }
  function plumeAt(t) {
    const s = T.sim, sc = T.src.s + s.Ueff * t, sig = Math.sqrt(2 * s.D * Math.max(t, 60));
    return { sc, sig };
  }
  // نقاط جزء من النهر مع ارتفاعاتها الحقيقية × التضخيم + رفع بسيط فوق الماء
  function slicePos(s0, s1, lift) {
    const C = T.C, { line, cum, len } = T.river, H = T.lineH;
    s0 = Math.max(0, s0); s1 = Math.min(len, s1); if (s1 - s0 < 50) return [];
    const idx = s => { let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } return lo; };
    const a = idx(s0), b = Math.min(line.length - 1, idx(s1) + 1), out = [];
    for (let i = a; i <= b; i++) out.push(line[i][0], line[i][1], (H[i] + lift) * T.exag);
    return C.Cartesian3.fromDegreesArrayHeights(out);
  }
  function drawPlume() {
    const C = T.C; clearPlume();
    const core = () => { const { sc, sig } = plumeAt(T.sim.t); return slicePos(sc - sig, sc + sig, 60); };
    const halo = () => { const { sc, sig } = plumeAt(T.sim.t); return slicePos(sc - 2.5 * sig, sc + 2.5 * sig, 45); };
    T.ents.halo = T.v.entities.add({ polyline: { positions: new C.CallbackProperty(halo, false), width: 22, arcType: C.ArcType.NONE, material: new C.PolylineGlowMaterialProperty({ glowPower: 0.35, color: C.Color.fromCssColorString(T.sim.P.oil ? "#3a2a1a" : "#e6ae4f").withAlpha(0.75) }) } });
    T.ents.core = T.v.entities.add({ polyline: { positions: new C.CallbackProperty(core, false), width: 12, arcType: C.ArcType.NONE, material: new C.PolylineGlowMaterialProperty({ glowPower: 0.25, color: C.Color.fromCssColorString(T.sim.P.oil ? "#111" : "#ef5a64") }) } });
  }
  function clearPlume() { ["halo", "core"].forEach(k => { if (T.ents[k]) { T.v.entities.remove(T.ents[k]); T.ents[k] = null; } }); }
  function clearSim() { stopSim(); clearPlume(); T.sim = null; U.$("#tw-res").innerHTML = ""; U.$("#tw-clock").hidden = true; rq(); }
  function playSim(fromStart) {
    if (!T.sim) return;
    if (fromStart) T.sim.t = 0;
    stopSim(); playIcon(U.$("#tw-simplay"), true);
    let last = performance.now();
    const speed = () => +U.$("#tw-speed").value; // ساعات محاكاة لكل ثانية
    const tick = now => {
      const dt = (now - last) / 1000; last = now;
      T.sim.t = Math.min(T.sim.tEnd, T.sim.t + dt * speed() * 3600);
      updClock();
      if (T.follow) followCam();
      rq();
      if (T.sim.t >= T.sim.tEnd) { stopSim(); return; }
      T.play = requestAnimationFrame(tick);
    };
    T.play = requestAnimationFrame(tick);
  }
  function stopSim() { if (T.play) cancelAnimationFrame(T.play); T.play = null; playIcon(U.$("#tw-simplay"), false); }
  function updClock() {
    const s = T.sim; U.$("#tw-simt").value = String(Math.round(s.t));
    const { sc } = plumeAt(s.t), done = s.down.filter(d => d.tp <= s.t).map(d => d.t.name);
    U.$("#tw-clockt").innerHTML = `<b>+${hhmm(s.t)} ساعة</b> · ${clock(s.t)} · البقعة على بعد ${U.fmt((sc - T.src.s) / 1000, 0)} كم${done.length ? ` · وصلت: ${done.join("، ")}` : ""}`;
  }
  function followCam() {
    const now = performance.now(); if (T._lf && now - T._lf < 1200) return; T._lf = now;
    const { sc } = plumeAt(T.sim.t), p = pointAt(sc), q = pointAt(Math.min(T.river.len, sc + 5000));
    const C = T.C, hd = bearing(p, q), back = 22000, up = 13000;
    T.v.camera.flyTo({ destination: C.Cartesian3.fromDegrees(p[0] - Math.sin(hd) * back / KX, p[1] - Math.cos(hd) * back / KY, up), orientation: { heading: hd, pitch: C.Math.toRadians(-30), roll: 0 }, duration: 1.1, easingFunction: C.EasingFunction.LINEAR_NONE });
  }
  function simReport() {
    const s = T.sim; if (!s) return;
    ECO.report.run({
      title: "محاكاة تسرب ملوث في نهر دجلة", subtitle: `${s.P.name} · ${new Date(s.t0).toLocaleString("ar-IQ-u-nu-latn")}`, file: "محاكاة-تسرب-دجلة",
      blocks: [
        { type: "kv", items: [["المصدر", `${T.src.label} (${T.src.p[1].toFixed(4)}, ${T.src.p[0].toFixed(4)})`], ["نوع الملوث", s.P.name], ["الكمية", `${s.M} ${s.P.unit}`], ["تصريف النهر", `${U.fmt(s.Q, 0)} م³/ث${T.inp.Qdate ? " (GloFAS، " + T.inp.Qdate + ")" : ""}`], ["انحدار المجرى", `${U.fmt(s.S * 1e5, 1)} سم/كم (من التضاريس)`], ["العرض / معامل Manning", `${s.W} م / ${s.n}`], ["السرعة / العمق", `${U.fmt(s.Uv, 2)} م/ث / ${U.fmt(s.H, 2)} م`], ["معامل التشتت الطولي", `${U.fmt(s.D, 0)} م²/ث`]] },
        { type: "table", caption: "أوقات الوصول المتوقعة", head: ["المدينة", "المسافة (كم)", "بداية الوصول (ساعة)", "الذروة (ساعة)", "أعلى تركيز (mg/L)"], rows: s.down.map(d => [d.t.name, U.fmt(d.x / 1000, 0), hhmm(d.t0), hhmm(d.tp), d.C == null ? "—" : U.fmt(d.C, 2)]) },
        { type: "text", html: "نموذج أحادي البعد للنقل والتشتت: السرعة من معادلة Manning لقناة عريضة بالتصريف والانحدار، والتشتت الطولي من معادلة Fischer وآخرين (1979)، والتركيز الأعلى = M·e^(−kt)/(A·√(4πDt)). النتائج تقديرية للتخطيط والتعليم ولا تغني عن الرصد الميداني." },
        { type: "refs", items: ["Fischer, H.B., List, E.J., Koh, R.C.Y., Imberger, J. & Brooks, N.H. (1979). Mixing in Inland and Coastal Waters. Academic Press.", "Chow, V.T. (1959). Open-Channel Hydraulics. McGraw-Hill.", "ASCE Task Committee on Modeling of Oil Spills (1996). State-of-the-art review of modeling transport and fate of oil spills. Journal of Hydraulic Engineering, 122(11), 594–609.", "Copernicus Emergency Management Service – GloFAS v4 river discharge, via Open-Meteo Flood API.", "Mapzen / AWS Terrain Tiles (SRTM); OpenStreetMap contributors."] },
        { type: "sign" }
      ]
    });
  }

  /* =================== الأوضاع والواجهة =================== */
  function setMode(m) {
    if (m === T.mode) return;
    if (T.mode === "time") leaveTime();
    if (T.mode === "spill") { T.pickingSource = false; stopSim(); }
    T.mode = m;
    U.$$("#tw-tabs button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
    ["explore", "time", "spill"].forEach(k => { U.$("#tw-panel-" + k).hidden = k !== m; });
    U.$("#tw-tbar").hidden = m !== "time"; U.$("#tw-clock").hidden = !(m === "spill" && T.sim);
    U.$("#tw-probe").hidden = true;
    if (m === "time") enterTime();
    if (m === "spill" && !T.src) {
      const b = (ECO.RESEARCH || []).find(r => r.id === "baiji-2025");
      if (b) { const r = nearest(T.river.line, T.river.cum, [b.lon, b.lat], T.river.grid); T.src = { s: r.s, p: T.river.line[r.i], label: "قرب بيجي – مصب قناة المصافي (موقع تقريبي من البحث المنشور)" }; renderSrc(); markSource(); }
      lookOblique(43.6, 34.8, 70000, 330, -35);
    }
    rq();
  }
  function setExag(x) { T.exag = x; if (T.v) { T.v.scene.verticalExaggeration = x; T._rp = null; rq(); } U.$("#tw-exv").textContent = "×" + x; }
  function fullscreen() {
    const st = U.$("#tw-stage");
    if (document.fullscreenElement) document.exitFullscreen(); else if (st.requestFullscreen) st.requestFullscreen().catch(() => { st.classList.toggle("tw-max"); }); else st.classList.toggle("tw-max");
    setTimeout(rq, 300);
  }

  function bindUI() {
    U.$("#tw-start").onclick = start;
    U.$("#tw-tabs").onclick = e => { const b = e.target.closest("button[data-m]"); if (b) setMode(b.dataset.m); };
    U.$("#tw-tour").onclick = riverTour;
    U.$("#tw-full").onclick = fullscreen;
    U.$("#tw-panelbtn").onclick = () => U.$("#tw-stage").classList.toggle("tw-panel-off");
    U.$("#tw-ex").oninput = e => setExag(+e.target.value);
    U.$("#tw-jump").onclick = e => {
      const b = e.target.closest("button[data-j]"); if (!b) return;
      if (b.dataset.j === "tharthar") { lookOblique(43.3, 33.95, 110000, 20, -40); return; }
      const t = TOWNS.find(x => x.id === b.dataset.j); lookOblique(t.lon, t.lat, 16000, 340, -30);
    };
    U.$("#tw-ov").onclick = e => { const b = e.target.closest("button[data-ov]"); if (b) setOverlay(b.dataset.ov); };
    U.$("#tw-lab").onchange = e => { T.layers.labels.forEach(l => { l.show = e.target.checked; }); rq(); };
    U.$("#tw-riv").onchange = e => { if (T.ents.river) T.ents.river.show = e.target.checked; rq(); };
    U.$("#tw-year").oninput = e => { const y = T.tm.years[+e.target.value]; U.$("#tw-yearlbl").textContent = y; clearTimeout(T._ys); T._ys = setTimeout(() => setYear(y), 250); };
    U.$("#tw-play").onclick = startPlay;
    U.$("#tw-aoi").onclick = e => { const b = e.target.closest("button[data-a]"); if (!b) return; T.tm.aoi = b.dataset.a; U.$$("#tw-aoi button").forEach(x => x.classList.toggle("on", x === b)); renderYearInfo(); areaFor(T.tm.year).then(renderYearInfo).catch(() => { /* */ }); if (T.tm.aoi === "tharthar") lookOblique(43.30, 33.95, 120000, 20, -40); else lookOblique(43.7, 34.55, 90000, 340, -38); };
    U.$("#tw-season").onchange = e => { T.tm.season = e.target.value; bestPerYear(); const sl = U.$("#tw-year"); sl.max = String(T.tm.years.length - 1); U.$("#tw-yfirst").textContent = T.tm.years[0]; U.$("#tw-ylast").textContent = T.tm.years[T.tm.years.length - 1]; const y = T.tm.years.includes(T.tm.year) ? T.tm.year : T.tm.years[0]; T.tm.year = null; showYear(y); };
    U.$("#tw-all").onclick = allYears;
    U.$("#tw-cmp").onchange = e => setCompare(e.target.checked);
    U.$("#tw-yb").onchange = e => showYear(+e.target.value, "B");
    const sp = U.$("#tw-split");
    const startDrag = e => { e.preventDefault(); const mv = ev => dragSplit(ev), up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); }; document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); };
    sp.addEventListener("pointerdown", startDrag);
    U.$("#tw-type").innerHTML = Object.entries(POLL).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join("");
    U.$("#tw-type").onchange = e => { const p = POLL[e.target.value]; U.$("#tw-m").value = p.def; U.$("#tw-munit").textContent = p.unit; };
    U.$("#tw-m").value = POLL.oil.def; U.$("#tw-munit").textContent = POLL.oil.unit;
    U.$("#tw-pick").onclick = () => { T.pickingSource = !T.pickingSource; U.$("#tw-pick").classList.toggle("on", T.pickingSource); if (T.pickingSource) U.toast("اضغط على مجرى النهر في المجسم"); };
    U.$("#tw-run").onclick = runSim;
    U.$("#tw-simplay").onclick = () => { if (T.play) stopSim(); else playSim(T.sim && T.sim.t >= T.sim.tEnd); };
    U.$("#tw-simt").oninput = e => { if (!T.sim) return; stopSim(); T.sim.t = +e.target.value; updClock(); rq(); };
    U.$("#tw-follow").onchange = e => { T.follow = e.target.checked; };
    U.$("#view-twin").addEventListener("click", e => { const a = e.target.closest("[data-tw-space]"); if (!a) return; const [la, lo] = a.dataset.twSpace.split(",").map(Number); ECO._spaceGoto = { lat: la, lon: lo }; });
    ECO.bus.on("twin-pc-proxy", () => { if (T.mode === "time" && T.tm.year) { const y = T.tm.year; T.tm.year = null; showYear(y); } });
    document.addEventListener("fullscreenchange", () => setTimeout(rq, 200));
  }

  async function start() {
    if (T.started) { intro(); return; }
    U.$("#tw-start").disabled = true;
    const ok = await build();
    U.$("#tw-start").disabled = false;
    if (!ok) return;
    T.started = true; intro();
  }

  ECO.twin = { state: T, compute, riverFromOSM, setRiver, nearest, densify, aoiStats, areaFor, bestPerYear, TOWNS, AOIS, setMode, setSource, runSim, setYear, setExag, start };
  ECO.views.twin = {
    init() { bindUI(); },
    show() { if (T.v) setTimeout(rq, 60); },
    hide() { stopPlay(); stopSim(); T.touring = false; }
  };
})();
