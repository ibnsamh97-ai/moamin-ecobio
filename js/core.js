/* =====================================================================
   EcoBio AI — النواة: أدوات مشتركة، جلب البيانات، التنقل، Gemini، التحكم بالكاميرا
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO;

  /* ------------------------------------------------------------------
     أدوات عامة
  ------------------------------------------------------------------ */
  const U = ECO.util = {};
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.el = (tag, attrs = {}, html) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "style") e.style.cssText = attrs[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  };
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.isNum = v => typeof v === "number" && isFinite(v);
  U.fmt = (v, d = 1) => {
    if (!U.isNum(v)) return "—";
    const a = Math.abs(v);
    if (d === "auto") d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
    return v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  };
  U.mean = a => { const f = a.filter(U.isNum); return f.length ? f.reduce((s, x) => s + x, 0) / f.length : NaN; };
  U.median = a => { const f = a.filter(U.isNum).sort((x, y) => x - y); if (!f.length) return NaN; const m = f.length >> 1; return f.length % 2 ? f[m] : (f[m - 1] + f[m]) / 2; };
  U.std = a => { const m = U.mean(a), f = a.filter(U.isNum); return Math.sqrt(f.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, f.length - 1)); };
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.rng = seed => { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  U.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dtf = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { timeZone: "Asia/Baghdad", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const dtDay = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { timeZone: "Asia/Baghdad", day: "numeric", month: "short" });
  const dtHour = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { timeZone: "Asia/Baghdad", hour: "2-digit", minute: "2-digit" });
  U.fmtTime = t => dtf.format(new Date(t * 1000));
  U.fmtDay = t => dtDay.format(new Date(t * 1000));
  U.fmtHour = t => dtHour.format(new Date(t * 1000));
  U.isoDate = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };

  U.store = {
    get(k, def) { try { const v = localStorage.getItem("ecobio:" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem("ecobio:" + k, JSON.stringify(v)); } catch (e) { /* التخزين غير متاح */ } },
    del(k) { try { localStorage.removeItem("ecobio:" + k); } catch (e) { /* */ } }
  };

  let toastT;
  U.toast = msg => {
    let t = U.$("#eco-toast");
    if (!t) { t = U.el("div", { id: "eco-toast", class: "toast", role: "status" }); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
  };

  /* الألوان الدلالية بقيم ثابتة (للرسوم والـ WebGL) */
  ECO.TONES = { good: "#93dd8a", fair: "#e8d35a", warn: "#e6ae4f", bad: "#ee7a4f", severe: "#ef5a64", hazard: "#b493ff", none: "#5f7d77", info: "#4fc8dc" };
  ECO.COL = { river: "#4fc8dc", chloro: "#93dd8a", silt: "#e6ae4f", rust: "#ee7a4f", crimson: "#ef5a64", violet: "#b493ff", muted: "#8eaea7", faint: "#5f7d77", text: "#e4f1ed", grid: "rgba(150,214,204,0.08)" };

  U.aqiBand = v => ECO.AQI_BANDS.find(b => v <= b.max) || ECO.AQI_BANDS[ECO.AQI_BANDS.length - 1];

  /* نغمة الخطورة لكل ملوث بالنسبة إلى حدّه */
  U.toneFor = (key, v) => {
    if (!U.isNum(v)) return "none";
    if (key === "us_aqi") return U.aqiBand(v).tone;
    if (key === "aerosol_optical_depth") return v < 0.2 ? "good" : v < 0.4 ? "fair" : v < 0.7 ? "warn" : v < 1 ? "bad" : "severe";
    if (key === "uv_index") return v < 3 ? "good" : v < 6 ? "fair" : v < 8 ? "warn" : v < 11 ? "bad" : "hazard";
    if (key === "dust") return v < 50 ? "good" : v < 100 ? "fair" : v < 200 ? "warn" : v < 500 ? "bad" : "severe";
    const m = ECO.AIR.find(a => a.key === key);
    if (!m || !m.who) return "info";
    const r = v / m.who;
    return r < 0.5 ? "good" : r < 1 ? "fair" : r < 2 ? "warn" : r < 3 ? "bad" : r < 5 ? "severe" : "hazard";
  };
  U.toneLabel = { good: "جيد", fair: "مقبول", warn: "مرتفع", bad: "مرتفع جداً", severe: "خطر", hazard: "خطر شديد", none: "لا بيانات", info: "مرجعي" };

  /* مقياس نصف دائري */
  U.gauge = ({ value, max, tone = "info", big, label, sub }) => {
    const v = U.isNum(value) ? U.clamp(value / max, 0, 1) : 0;
    const R = 90, cx = 110, cy = 110, a0 = Math.PI, a1 = Math.PI + v * Math.PI;
    const pt = a => [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1), [xe, ye] = pt(2 * Math.PI);
    const col = ECO.TONES[tone] || ECO.COL.river;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => { const a = Math.PI + t * Math.PI; const [ax, ay] = [cx + (R + 12) * Math.cos(a), cy + (R + 12) * Math.sin(a)]; return `<text x="${ax}" y="${ay}" fill="${ECO.COL.faint}" font-size="9" font-family="IBM Plex Mono, monospace" text-anchor="middle" dominant-baseline="middle">${Math.round(t * max)}</text>`; }).join("");
    return `<svg viewBox="0 0 220 132" role="img" aria-label="${U.esc(label || "")} ${U.isNum(value) ? Math.round(value) : ""}">
      <path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${xe} ${ye}" fill="none" stroke="rgba(150,214,204,0.12)" stroke-width="14" stroke-linecap="round"/>
      ${v > 0.001 ? `<path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" style="filter:drop-shadow(0 0 6px ${col}66)"/>` : ""}
      ${ticks}
      <text x="${cx}" y="${cy - 14}" fill="${ECO.COL.text}" font-size="38" font-weight="700" font-family="IBM Plex Mono, monospace" text-anchor="middle">${big != null ? big : U.isNum(value) ? Math.round(value) : "—"}</text>
    </svg><div class="lbl" style="color:${col}">${U.esc(label || "")}</div>${sub ? `<div class="faint" style="font-size:.75rem">${sub}</div>` : ""}`;
  };

  /* حساب US AQI من التراكيز (يُستخدم في وضع البيانات التجريبية) */
  const BP = {
    pm2_5: [[0, 9, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]],
    pm10: [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500]]
  };
  U.aqiFrom = (key, c) => {
    const t = BP[key]; if (!t || !U.isNum(c)) return NaN;
    for (const [cl, ch, il, ih] of t) if (c <= ch) return Math.round((ih - il) / (ch - cl) * (Math.max(c, cl) - cl) + il);
    return 500;
  };

  /* Markdown آمن */
  U.md = text => {
    try {
      const html = window.marked ? window.marked.parse(text || "", { breaks: true }) : U.esc(text).replace(/\n/g, "<br>");
      return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
    } catch (e) { return U.esc(text); }
  };

  /* إعدادات Chart.js العامة */
  if (window.Chart) {
    Chart.defaults.color = ECO.COL.muted;
    Chart.defaults.borderColor = ECO.COL.grid;
    Chart.defaults.font.family = '"IBM Plex Sans Arabic", "Readex Pro", Tahoma, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation.duration = U.reduced ? 0 : 600;
    Chart.defaults.plugins.legend.rtl = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.tooltip.rtl = true;
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(10,28,34,0.95)";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(150,214,204,0.25)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleFont = { family: '"IBM Plex Mono", monospace', size: 11 };
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.line.tension = 0.3;
  }
  U.chart = (canvas, cfg) => {
    if (!window.Chart || !canvas) return null;
    const old = Chart.getChart(canvas); if (old) old.destroy();
    return new Chart(canvas, cfg);
  };

  /* ------------------------------------------------------------------
     ناقل أحداث بسيط
  ------------------------------------------------------------------ */
  const handlers = {};
  ECO.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    emit(ev, data) { (handlers[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
  };

  /* ------------------------------------------------------------------
     طبقة البيانات (Open-Meteo / CAMS) مع وضع تجريبي عند تعذّر الاتصال
  ------------------------------------------------------------------ */
  const D = ECO.data = {};
  ECO.state = { station: U.store.get("station", ECO.DEFAULT_STATION), mode: "loading", lastUpdate: null };
  const cache = {};
  const TTL = 30 * 60 * 1000;
  D.station = id => ECO.STATIONS.find(s => s.id === id) || ECO.STATIONS[0];

  async function fetchJSON(url, ms = 15000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
  const WX_URL = "https://api.open-meteo.com/v1/forecast";
  const WX_VARS = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "wind_direction_10m"];

  function setMode(mode) {
    if (ECO.state.mode === mode) return;
    ECO.state.mode = mode;
    ECO.bus.emit("mode", mode);
  }

  /* السلسلة الساعية لمحطة واحدة */
  D.air = async (id, past = 7, fc = 3, force = false) => {
    const key = `air:${id}:${past}:${fc}`;
    if (!force && cache[key] && Date.now() - cache[key].at < TTL) return cache[key].v;
    const s = D.station(id);
    const url = `${AIR_URL}?latitude=${s.lat}&longitude=${s.lon}&hourly=${ECO.AIR_VARS.join(",")}&current=${ECO.AIR_VARS.join(",")}&timezone=Asia%2FBaghdad&timeformat=unixtime&past_days=${past}&forecast_days=${fc}&domains=cams_global`;
    let v;
    try {
      const j = await fetchJSON(url);
      v = normalizeAir(j); setMode("live");
    } catch (e) {
      console.warn("Air API unavailable:", e.message);
      setMode("offline"); return null;
    }
    cache[key] = { at: Date.now(), v };
    return v;
  };

  /* القراءات الحالية لكل المحطات بطلب واحد */
  D.current = async (force = false) => {
    const key = "current";
    if (!force && cache[key] && Date.now() - cache[key].at < TTL) return cache[key].v;
    const lat = ECO.STATIONS.map(s => s.lat).join(","), lon = ECO.STATIONS.map(s => s.lon).join(",");
    const url = `${AIR_URL}?latitude=${lat}&longitude=${lon}&current=${ECO.AIR_VARS.join(",")}&timezone=Asia%2FBaghdad&timeformat=unixtime&domains=cams_global`;
    let out = {};
    try {
      const j = await fetchJSON(url);
      const arr = Array.isArray(j) ? j : [j];
      ECO.STATIONS.forEach((s, i) => { out[s.id] = arr[i] && arr[i].current ? arr[i].current : {}; });
      setMode("live");
    } catch (e) {
      console.warn("Current API unavailable:", e.message);
      setMode("offline"); out = {};
      ECO.bus.emit("current", out);
      return out;
    }
    ECO.state.lastUpdate = Date.now();
    cache[key] = { at: Date.now(), v: out };
    ECO.bus.emit("current", out);
    return out;
  };

  /* الأحوال الجوية لنموذج التعلم الآلي */
  D.weather = async (id, past = 30, fc = 3) => {
    const key = `wx:${id}:${past}:${fc}`;
    if (cache[key] && Date.now() - cache[key].at < TTL) return cache[key].v;
    const s = D.station(id);
    const url = `${WX_URL}?latitude=${s.lat}&longitude=${s.lon}&hourly=${WX_VARS.join(",")}&timezone=Asia%2FBaghdad&timeformat=unixtime&past_days=${past}&forecast_days=${fc}`;
    let v;
    try { const j = await fetchJSON(url); v = { time: j.hourly.time, ...pick(j.hourly, WX_VARS) }; }
    catch (e) { console.warn("Weather API unavailable:", e.message); return null; }
    cache[key] = { at: Date.now(), v };
    return v;
  };

  function pick(h, vars) { const o = {}; vars.forEach(k => { o[k] = (h[k] || []).map(x => (x == null ? NaN : x)); }); return o; }

  function normalizeAir(j) {
    const h = j.hourly || {};
    const v = { time: h.time || [], ...pick(h, ECO.AIR_VARS), current: j.current || {} };
    const now = Date.now() / 1000;
    v.nowIdx = v.time.findIndex(t => t > now) - 1;
    if (v.nowIdx < 0) v.nowIdx = v.time.length - 1;
    return v;
  }

  /* تحديث تلقائي كل 30 دقيقة */
  let refreshTimer = null;
  D.startAutoRefresh = () => {
    D.stopAutoRefresh();
    refreshTimer = setInterval(() => { D.refreshAll(); }, TTL);
  };
  D.stopAutoRefresh = () => { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null; };
  D.refreshAll = async () => {
    await D.current(true);
    await D.air(ECO.state.station, 7, 3, true);
    ECO.bus.emit("refresh");
  };

  /* ------------------------------------------------------------------
     Gemini API
  ------------------------------------------------------------------ */
  U.fileSize = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const G = ECO.gemini = {};
  G.key = () => U.store.get("gemini_key", "");
  /* رابط الخادم المشترك (js/server.js): يجعل المساعد يعمل لكل الزوار دون كشف المفتاح */
  G.proxy = () => String(ECO.GEMINI_PROXY || "").trim().replace(/\/+$/, "");
  /* personal = مفتاح المستخدم في متصفحه، shared = الخادم المشترك، "" = غير مفعّل */
  G.mode = () => G.key() ? "personal" : (G.proxy() ? "shared" : "");
  G.model = () => U.store.get("gemini_model", ECO.GEMINI_DEFAULT_MODEL) || ECO.GEMINI_DEFAULT_MODEL;
  G.ready = () => !!G.mode();
  G.label = () => G.mode() === "shared" ? "متاح للجميع · Gemini" : G.mode() === "personal" ? "مفتاحك · " + G.model() : "غير مفعّل";
  const API = "https://generativelanguage.googleapis.com/v1beta";
  function endpoint(path, key, query = "") {
    if (key) return `${API}${path}?${query ? query + "&" : ""}key=${encodeURIComponent(key)}`;
    return `${G.proxy()}/v1beta${path}${query ? "?" + query : ""}`;
  }

  const NET_ERR = "تعذّر الوصول إلى خادم Gemini. تأكد من اتصال الإنترنت وافتح الموقع من رابطه على GitHub Pages (بعض صفحات المعاينة تمنع الاتصال الخارجي).";
  const NET_ERR_SHARED = "تعذّر الوصول إلى خادم المساعد. تأكد من اتصال الإنترنت ثم أعد المحاولة. (لصاحب الموقع: تحقق من الرابط في js/server.js)";
  async function gfetch(url, opts, shared) {
    try { return await fetch(url, opts); }
    catch (e) { if (e.name === "AbortError") throw e; throw new Error(shared ? NET_ERR_SHARED : NET_ERR); }
  }
  /* key فارغ = جلب النماذج عبر الخادم المشترك */
  G.listModels = async key => {
    if (!key && !G.proxy()) throw new Error("أدخل المفتاح أولاً.");
    const r = await gfetch(endpoint("/models", key, key ? "pageSize=200" : ""), undefined, !key);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(geminiError(r.status, j, !key));
    return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map(m => m.name.replace(/^models\//, ""))
      .filter(n => /gemini/i.test(n) && !/(image|tts|audio|embedding|vision|live)/i.test(n));
  };

  function geminiError(status, j, shared) {
    const e = (j && j.error) || {}, msg = e.message || "", code = e.status || "";
    if (status === 413) return "الملف المرفق كبير جداً. الحد الأقصى نحو 9 ميغابايت.";
    if (/location is not supported/i.test(msg)) return "خدمة Gemini غير متاحة من موقع الخادم الحالي.";
    if (shared) {
      if (code === "ORIGIN_NOT_ALLOWED") return "خادم المساعد لا يقبل الطلبات من هذا الرابط. (لصاحب الموقع: أضف رابط الموقع إلى ALLOWED_ORIGINS في إعدادات الـ Worker)";
      if (code === "GEMINI_KEY_MISSING") return "خادم المساعد يعمل لكن مفتاح Gemini لم يُضَف إليه بعد (GEMINI_KEY).";
      if (code === "VISITOR_RATE_LIMIT") return "أرسلت طلبات كثيرة خلال دقيقة واحدة. انتظر قليلاً ثم أعد المحاولة.";
      if (status === 429) return "استُهلكت الحصة المجانية للمساعد مؤقتاً بسبب كثرة الاستخدام. حاول بعد قليل، أو أضف مفتاحك المجاني الخاص من الإعدادات ليعمل عندك فوراً.";
      if (status === 400 && /API key/i.test(msg)) return "مفتاح Gemini المحفوظ في الخادم غير صالح. (لصاحب الموقع: حدّث GEMINI_KEY في Cloudflare)";
      if (status === 403) return "مفتاح الخادم لا يملك صلاحية استخدام Gemini API.";
      if (status === 404) return "النموذج المطلوب غير متاح على خادم المساعد.";
      return `خطأ من خادم المساعد (${status}): ${msg || "تعذّر الاتصال"}`;
    }
    if (status === 400 && /API key/i.test(msg)) return "المفتاح غير صالح. انسخه مجدداً من Google AI Studio.";
    if (status === 403) return "المفتاح لا يملك صلاحية استخدام Gemini API، أو أن الخدمة غير متاحة لحسابك.";
    if (status === 404) return "النموذج المحدد غير متاح. افتح الإعدادات واضغط «جلب النماذج المتاحة» ثم اختر نموذجاً.";
    if (status === 429) return "تجاوزت حد الاستخدام المجاني مؤقتاً. انتظر دقيقة ثم أعد المحاولة.";
    return `خطأ من Gemini (${status}): ${msg || "تعذّر الاتصال"}`;
  }

  /* توليد نص متدفق: contents = [{role:'user'|'model', parts:[{text}]}] */
  G.generate = async ({ contents, system = ECO.SYSTEM_PROMPT, onText, signal, temperature = 0.6, json = false }) => {
    const mode = G.mode();
    if (!mode) throw new Error("NO_KEY");
    const key = mode === "personal" ? G.key() : "", shared = !key;
    const url = endpoint(`/models/${encodeURIComponent(G.model())}:streamGenerateContent`, key, "alt=sse");
    const body = { contents, generationConfig: { temperature, maxOutputTokens: 4096 } };
    if (json) body.generationConfig.responseMimeType = "application/json";
    if (system) body.system_instruction = { parts: [{ text: system }] };
    const r = await gfetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }, shared);
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(geminiError(r.status, j, shared)); }
    G.lastModel = r.headers.get("X-EcoBio-Model") || G.model();
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = "", full = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const j = JSON.parse(line.slice(5));
          const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
          const txt = parts.filter(p => !p.thought).map(p => p.text || "").join("");
          if (txt) { full += txt; onText && onText(full); }
          if (j.promptFeedback && j.promptFeedback.blockReason) throw new Error("رفض Gemini الطلب: " + j.promptFeedback.blockReason);
        } catch (e) { if (e.message && e.message.startsWith("رفض")) throw e; }
      }
    }
    if (!full) throw new Error("لم يُرجع Gemini نصاً. جرّب نموذجاً آخر من الإعدادات.");
    return full;
  };

  /* تشغيل Gemini داخل عنصر وعرض النتيجة بتنسيق Markdown */
  G.renderInto = async (target, prompt, opts = {}) => {
    if (!G.ready()) {
      target.innerHTML = `<div class="notice info"><span>لتفعيل التحليل الذكي أضف مفتاح Gemini المجاني من الإعدادات.</span><button class="btn btn-sm" type="button">الإعدادات</button></div>`;
      target.querySelector("button").onclick = () => ECO.openSettings();
      return;
    }
    target.innerHTML = `<p class="typing"><i></i><i></i><i></i></p>`;
    try {
      await G.generate({ contents: [{ role: "user", parts: [{ text: prompt }] }], onText: t => { target.innerHTML = U.md(t); }, ...opts });
    } catch (e) {
      target.innerHTML = `<div class="notice warn">${U.esc(e.message)}</div>`;
    }
  };

  /* نافذة الإعدادات */
  function sharedBox() {
    const box = U.$("#set-shared"); if (!box) return;
    if (G.proxy()) {
      box.className = "notice ok";
      box.innerHTML = `<span><b>المساعد مفعّل لجميع زوار الموقع.</b> لا يحتاج أحد إلى مفتاح. ${G.key() ? "أنت تستخدم الآن مفتاحك الشخصي على هذا المتصفح؛ احذفه للعودة إلى الخادم المشترك." : "إضافة مفتاح شخصي أدناه اختيارية، وتفيد فقط إذا نفدت الحصة المشتركة."}</span><button class="btn btn-sm" type="button" id="set-test">اختبار الخادم</button>`;
      U.$("#set-test").onclick = async () => {
        const st = U.$("#set-status"); st.textContent = "جارٍ اختبار الخادم المشترك…";
        try { const l = await G.listModels(""); st.innerHTML = `<span class="ok">الخادم المشترك يعمل (${l.length} نموذجاً متاحاً).</span>`; }
        catch (e) { st.innerHTML = `<span class="bad">${U.esc(e.message)}</span>`; }
      };
    } else {
      box.className = "notice info";
      box.innerHTML = `<span>المساعد غير مفعّل للزوار بعد. لتشغيله عند الجميع ينشئ صاحب الموقع «الخادم المشترك» مرة واحدة (الخطوات في ملف README). ويمكنك الآن إضافة مفتاحك الشخصي ليعمل على هذا المتصفح فقط.</span>`;
    }
    U.$("#set-key-label").textContent = G.proxy() ? "مفتاح Gemini شخصي (اختياري)" : "مفتاح Gemini API";
  }
  ECO.openSettings = () => {
    const m = U.$("#settings");
    U.$("#set-key").value = G.key();
    U.$("#set-model").value = G.model();
    U.$("#set-status").textContent = "";
    sharedBox();
    m.hidden = false;
    if (!G.proxy() && window.matchMedia && matchMedia("(pointer: fine)").matches) setTimeout(() => U.$("#set-key").focus(), 50);
  };
  function initSettings() {
    const m = U.$("#settings"), st = U.$("#set-status");
    const close = () => { m.hidden = true; };
    U.$("#set-close").onclick = close;
    m.addEventListener("click", e => { if (e.target === m) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !m.hidden) close(); });
    U.$("#open-settings").onclick = ECO.openSettings;
    U.$("#set-show").onclick = () => { const k = U.$("#set-key"); k.type = k.type === "password" ? "text" : "password"; U.$("#set-show").textContent = k.type === "password" ? "إظهار" : "إخفاء"; };
    const fill = list => { U.$("#model-list").innerHTML = list.map(n => `<option value="${U.esc(n)}">`).join(""); };
    U.$("#set-fetch").onclick = async () => {
      const key = U.$("#set-key").value.trim();
      if (!key && !G.proxy()) { st.innerHTML = `<span class="warnc">أدخل المفتاح أولاً.</span>`; return; }
      st.textContent = "جارٍ جلب النماذج…";
      try { const l = await G.listModels(key); fill(l); st.innerHTML = `<span class="ok">وُجد ${l.length} نموذجاً. اختر من القائمة في حقل النموذج.</span>`; }
      catch (e) { st.innerHTML = `<span class="bad">${U.esc(e.message)}</span>`; }
    };
    U.$("#set-save").onclick = async () => {
      const key = U.$("#set-key").value.trim(), model = U.$("#set-model").value.trim() || ECO.GEMINI_DEFAULT_MODEL;
      if (!key && !G.proxy()) { st.innerHTML = `<span class="warnc">أدخل المفتاح أولاً.</span>`; return; }
      st.textContent = "جارٍ اختبار الاتصال…";
      try {
        const l = await G.listModels(key); fill(l);
        if (key) U.store.set("gemini_key", key); else U.store.del("gemini_key");
        U.store.set("gemini_model", model);
        const okModel = l.includes(model), who = key ? "بمفتاحك الشخصي" : "عبر الخادم المشترك";
        st.innerHTML = okModel ? `<span class="ok">تم الحفظ، والمساعد يعمل ${who}. النموذج: ${U.esc(model)}</span>` : `<span class="warnc">تم الحفظ ${who}، لكن النموذج «${U.esc(model)}» غير موجود في القائمة. اختر واحداً منها.</span>`;
        sharedBox(); ECO.bus.emit("gemini");
      } catch (e) { st.innerHTML = `<span class="bad">${U.esc(e.message)}</span>`; }
    };
    U.$("#set-remove").onclick = () => { U.store.del("gemini_key"); U.$("#set-key").value = ""; st.textContent = G.proxy() ? "حُذف مفتاحك الشخصي. المساعد يعمل الآن عبر الخادم المشترك." : "حُذف المفتاح من هذا المتصفح."; sharedBox(); ECO.bus.emit("gemini"); };
  }

  /* ------------------------------------------------------------------
     التحكم المداري بالكاميرا (سحب، عجلة، قرص بإصبعين)
  ------------------------------------------------------------------ */
  ECO.Orbit = class {
    constructor(camera, dom, o = {}) {
      this.cam = camera; this.dom = dom;
      this.target = o.target || new THREE.Vector3();
      this.r = o.radius || 10; this.theta = o.theta || 0; this.phi = o.phi || 1.1;
      this.minR = o.minR || 2; this.maxR = o.maxR || 50; this.minPhi = o.minPhi ?? 0.15; this.maxPhi = o.maxPhi ?? Math.PI - 0.15;
      this.auto = o.auto ?? 0.15; this.vt = 0; this.vp = 0; this.idle = 99; this.ptrs = new Map(); this.pinch = 0;
      this.tr = this.r;
      dom.addEventListener("pointerdown", e => { dom.setPointerCapture && dom.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, [e.clientX, e.clientY]); this.idle = 0; });
      dom.addEventListener("pointermove", e => {
        if (!this.ptrs.has(e.pointerId)) return;
        const [px, py] = this.ptrs.get(e.pointerId);
        if (this.ptrs.size === 1) {
          this.vt = -(e.clientX - px) * 0.006; this.vp = -(e.clientY - py) * 0.005;
        } else if (this.ptrs.size === 2) {
          this.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
          const [a, b] = [...this.ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (this.pinch) this.tr = U.clamp(this.tr * this.pinch / d, this.minR, this.maxR);
          this.pinch = d; return;
        }
        this.ptrs.set(e.pointerId, [e.clientX, e.clientY]); this.idle = 0;
      });
      const up = e => { this.ptrs.delete(e.pointerId); if (this.ptrs.size < 2) this.pinch = 0; };
      dom.addEventListener("pointerup", up); dom.addEventListener("pointercancel", up);
      dom.addEventListener("wheel", e => { e.preventDefault(); this.tr = U.clamp(this.tr * (1 + Math.sign(e.deltaY) * 0.1), this.minR, this.maxR); this.idle = 0; }, { passive: false });
      this.update(0);
    }
    update(dt) {
      this.idle += dt;
      this.theta += this.vt; this.phi = U.clamp(this.phi + this.vp, this.minPhi, this.maxPhi);
      this.vt *= 0.9; this.vp *= 0.9;
      if (this.idle > 2.5 && !U.reduced) this.theta += this.auto * dt;
      this.r += (this.tr - this.r) * Math.min(1, dt * 8);
      const s = Math.sin(this.phi);
      this.cam.position.set(this.target.x + this.r * s * Math.sin(this.theta), this.target.y + this.r * Math.cos(this.phi), this.target.z + this.r * s * Math.cos(this.theta));
      this.cam.lookAt(this.target);
    }
  };

  /* مساعد لإنشاء مسرح Three.js قابل للإيقاف عند إخفاء القسم */
  ECO.makeStage = (canvas, { fov = 50, near = 0.1, far = 500, clear = 0x03090c, alpha = false } = {}) => {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha }); }
    catch (e) {
      const p = canvas.parentElement; p.insertAdjacentHTML("beforeend", `<div class="notice warn" style="position:absolute;inset:auto 12px 12px 12px;z-index:5">متصفحك لا يدعم WebGL، لذلك لا يمكن عرض المشهد ثلاثي الأبعاد.</div>`);
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (!alpha) renderer.setClearColor(clear, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    const st = { renderer, scene, camera, running: false, raf: 0, last: 0, tick: null };
    st.resize = () => {
      const w = canvas.clientWidth || canvas.parentElement.clientWidth, h = canvas.clientHeight || canvas.parentElement.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const loop = t => {
      if (!st.running) return;
      const dt = Math.min(0.05, (t - (st.last || t)) / 1000); st.last = t;
      st.tick && st.tick(dt, t / 1000);
      renderer.render(scene, camera);
      st.raf = requestAnimationFrame(loop);
    };
    st.start = () => { if (st.running) return; st.running = true; st.last = 0; st.resize(); st.raf = requestAnimationFrame(loop); };
    st.stop = () => { st.running = false; cancelAnimationFrame(st.raf); };
    if (window.ResizeObserver) new ResizeObserver(() => st.resize()).observe(canvas);
    else window.addEventListener("resize", st.resize);
    return st;
  };

  /* ------------------------------------------------------------------
     التنقل بين الأقسام
  ------------------------------------------------------------------ */
  ECO.views = {};
  const GROUPS = [
    { id: "home", label: "الرئيسية", icon: "i-home" },
    { label: "الرصد", icon: "i-sat", items: [
      { id: "monitor", label: "الرصد الفضائي الحي", icon: "i-sat", desc: "قراءات الأقمار الصناعية لسبع محطات على دجلة" },
      { id: "samples", label: "خريطة العينات", icon: "i-pin", desc: "حدد عيناتك على خريطة فضائية عالية الدقة" },
      { id: "research", label: "بحوث جامعة تكريت", icon: "i-book", desc: "نتائج منشورة حقيقية على الخريطة والجداول" }
    ] },
    { label: "المختبر", icon: "i-flask", items: [
      { id: "water", label: "مختبر جودة المياه", icon: "i-drop", desc: "WQI و HPI والمطابقة للمواصفة العراقية" },
      { id: "calc", label: "الحاسبات العلمية", icon: "i-calc", desc: "أكثر من 20 حاسبة للتلوث والمعالجة" },
      { id: "vision", label: "قراءة الصور", icon: "i-camera", desc: "مؤشر لون الماء Forel-Ule وقراءة أوراق النتائج" },
      { id: "analysis", label: "التحليل الذكي", icon: "i-brain", desc: "تعلم آلي وكشف الشذوذ لبيانات الهواء" }
    ] },
    { label: "ثلاثي الأبعاد", icon: "i-cube", items: [
      { id: "river", label: "محاكاة دجلة", icon: "i-river", desc: "مصادر التلوث والمعالجة الحيوية" },
      { id: "micro", label: "العالم المجهري", icon: "i-microbe", desc: "بكتيريا تفكك النفط وتمتص المعادن" },
      { id: "molecules", label: "مكتبة الملوثات", icon: "i-atom", desc: "نماذج جزيئية لعشرة ملوثات" }
    ] },
    { id: "assistant", label: "المساعد", icon: "i-chat" },
    { id: "reports", label: "التقارير", icon: "i-file" },
    { id: "about", label: "عن المشروع", icon: "i-info" }
  ];
  const NAV = [];
  GROUPS.forEach(g => (g.items ? g.items.forEach(i => NAV.push({ ...i, group: g.label })) : NAV.push(g)));
  ECO.NAV = NAV;
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  let current = null;
  function buildNav() {
    const nav = U.$("#nav");
    nav.innerHTML = GROUPS.map((g, gi) => g.items
      ? `<div class="nav-group"><button type="button" class="nav-btn" data-g="${gi}" aria-expanded="false">${ico(g.icon)}<span>${g.label}</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
          <div class="mega" data-g="${gi}" hidden>${g.items.map(i => `<a href="#${i.id}" data-v="${i.id}" class="mega-item"><span class="mi-ic">${ico(i.icon)}</span><span><b>${i.label}</b><small>${i.desc}</small></span></a>`).join("")}</div></div>`
      : `<a href="#${g.id}" data-v="${g.id}" class="nav-btn">${ico(g.icon)}<span>${g.label}</span></a>`).join("");
    const closeAll = () => U.$$(".mega").forEach(m => { m.hidden = true; m.previousElementSibling.setAttribute("aria-expanded", "false"); });
    nav.addEventListener("click", e => {
      const b = e.target.closest("button.nav-btn");
      if (b) { const m = b.nextElementSibling, open = m.hidden; closeAll(); m.hidden = !open; b.setAttribute("aria-expanded", String(open)); e.stopPropagation(); return; }
      if (e.target.closest("a")) closeAll();
    });
    document.addEventListener("click", e => { if (!e.target.closest(".nav-group")) closeAll(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });

    U.$("#drawer-panel").innerHTML = `<div class="drawer-head"><b>EcoBio <em>AI</em></b><button class="btn icon-btn btn-ghost" type="button" aria-label="إغلاق">${ico("i-close")}</button></div>` +
      GROUPS.map(g => g.items
        ? `<div class="dr-group"><span class="dr-title">${g.label}</span>${g.items.map(i => `<a href="#${i.id}" data-v="${i.id}">${ico(i.icon)}<span>${i.label}<small>${i.desc}</small></span></a>`).join("")}</div>`
        : `<a href="#${g.id}" data-v="${g.id}">${ico(g.icon)}<span>${g.label}</span></a>`).join("");
    const dr = U.$("#drawer");
    const openDr = () => { dr.hidden = false; };
    U.$("#open-menu").onclick = openDr;
    dr.addEventListener("click", e => { if (e.target === dr || e.target.closest("a") || e.target.closest(".drawer-head button")) dr.hidden = true; });

    const bb = U.$("#bottombar");
    if (bb) {
      const items = [["home", "الرئيسية", "i-home"], ["samples", "الخريطة", "i-pin"], ["calc", "الحاسبات", "i-calc"], ["vision", "الصور", "i-camera"]];
      bb.innerHTML = items.map(([id, l, ic]) => `<a href="#${id}" data-v="${id}">${ico(ic)}<span>${l}</span></a>`).join("") + `<button type="button" id="bb-more">${ico("i-menu")}<span>المزيد</span></button>`;
      U.$("#bb-more").onclick = openDr;
    }
  }
  function route() {
    const id = (location.hash || "#home").slice(1).split("=")[0].split("&")[0];
    const v = NAV.find(n => n.id === id) ? id : "home";
    if (v === current) return;
    if (current && ECO.views[current] && ECO.views[current].hide) ECO.views[current].hide();
    U.$$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
    U.$$("[data-v]").forEach(a => a.classList.toggle("active", a.dataset.v === v));
    const grp = NAV.find(n => n.id === v).group;
    U.$$("button.nav-btn").forEach(b => b.classList.toggle("active", !!grp && b.querySelector("span").textContent === grp));
    const mod = ECO.views[v];
    if (mod) {
      if (!mod._inited && mod.init) { try { mod.init(); } catch (e) { console.error(e); } mod._inited = true; }
      if (mod.show) { try { mod.show(); } catch (e) { console.error(e); } }
    }
    current = v;
    document.title = v === "home" ? "EcoBio AI" : `${NAV.find(n => n.id === v).label} · EcoBio AI`;
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  ECO.go = id => { if (location.hash === "#" + id) route(); else location.hash = id; };

  /* ------------------------------------------------------------------
     أزرار وبطاقات ثلاثية الأبعاد: ميلان مع المؤشر + تموّج عند الضغط
  ------------------------------------------------------------------ */
  function init3DButtons() {
    const fine = window.matchMedia && matchMedia("(pointer: fine)").matches && !U.reduced;
    const SEL = ".btn, .module, .tile3d, .nav-btn, .mega-item, .reading, .station, .calc-card, .study-card";
    if (fine) {
      document.addEventListener("pointermove", e => {
        const el = e.target.closest && e.target.closest(SEL); if (!el) return;
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        const k = el.classList.contains("btn") || el.classList.contains("nav-btn") ? 10 : 6;
        el.style.setProperty("--ry", (x * k).toFixed(2) + "deg"); el.style.setProperty("--rx", (-y * k).toFixed(2) + "deg");
        el.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(1) + "%"); el.style.setProperty("--my", ((y + 0.5) * 100).toFixed(1) + "%");
      }, { passive: true });
      document.addEventListener("pointerout", e => {
        const el = e.target.closest && e.target.closest(SEL); if (!el || el.contains(e.relatedTarget)) return;
        el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
      }, { passive: true });
    }
    document.addEventListener("pointerdown", e => {
      const el = e.target.closest && e.target.closest(".btn, .nav-btn, .bottombar a, .bottombar button"); if (!el) return;
      const r = el.getBoundingClientRect(), rp = document.createElement("span");
      rp.className = "ripple"; rp.style.left = (e.clientX - r.left) + "px"; rp.style.top = (e.clientY - r.top) + "px";
      el.appendChild(rp); setTimeout(() => rp.remove(), 650);
    }, { passive: true });
  }

  /* الملف التعريفي (اسم المختبر والطالب والمشرف) قابل للتعديل من صفحة التقارير */
  ECO.profile = () => Object.assign({}, ECO.PROJECT, U.store.get("profile", {}));

  ECO.router = { start() { buildNav(); window.addEventListener("hashchange", route); route(); }, current: () => current };

  /* حالة البيانات في الشريط العلوي */
  ECO.bus.on("mode", mode => {
    const d = U.$("#live-dot"); if (!d) return;
    d.classList.toggle("demo", mode === "offline");
    U.$("#live-text").textContent = mode === "offline" ? "غير متصل" : "بيانات حية";
    d.title = mode === "offline" ? "تعذّر الوصول لخوادم البيانات" : "متصل بخدمة Copernicus CAMS";
  });
  ECO.offlineNotice = () => ECO.state.mode === "offline"
    ? `<div class="notice warn" style="margin-bottom:16px"><span>تعذّر الاتصال بخدمة بيانات الأقمار الصناعية الآن، لذلك لا تُعرض أي أرقام (لا نعرض بيانات وهمية). تأكد من الإنترنت ثم اضغط «إعادة المحاولة».</span><button class="btn btn-sm" type="button" onclick="ECO.data.refreshAll()">إعادة المحاولة</button></div>`
    : "";
  ECO.demoNotice = ECO.offlineNotice;

  ECO.initCore = () => { initSettings(); init3DButtons(); };
})();
