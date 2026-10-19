/* =====================================================================
   التحقق الأرضي — أرصاد المطارات الحقيقية (METAR) قرب تكريت
   ---------------------------------------------------------------------
   أرقام الهواء في المنصة تقديرات من نموذج Copernicus CAMS بخلايا ≈45 كم،
   وليست قياس محطة أرضية في تكريت، وقد يبالغ النموذج في الغبار أحياناً.
   هنا نقارنها بما تسجله محطات الرصد الجوي الرسمية في المطارات القريبة:
   مدى الرؤية الأفقية ورموز الظواهر (غبار، رمل، عاصفة غبارية ...).
   المصدر: aviationweather.gov (NOAA) عبر الخادم المشترك، لأن الخدمة
   لا تسمح للمتصفح بطلبها مباشرة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const IDS = Object.keys(ECO.AIRPORTS);
  const TTL = 10 * 60 * 1000;            // لا نعيد الطلب قبل 10 دقائق
  const FRESH = 3 * 3600 * 1000;         // التقرير صالح للمقارنة 3 ساعات
  const SKEY = "ecobio_metar";
  const G = ECO.ground = { state: "idle", stations: [], fetched: 0, error: "" };

  /* ---------- قراءة تقرير METAR ---------- */
  const WXN = { DU: "غبار عالق", SA: "رمل عالق", HZ: "عَتَمة غبارية", FU: "دخان", SS: "عاصفة رملية", DS: "عاصفة غبارية", PO: "دوّامات غبار", BR: "نَدى خفيف", FG: "ضباب", RA: "مطر", DZ: "رذاذ", SN: "ثلج", GR: "بَرَد", GS: "بَرَد صغير", SQ: "رياح فجائية", FC: "إعصار قمعي", VA: "رماد بركاني", PY: "رذاذ مائي", IC: "بلورات جليد", PL: "حبيبات جليد", SG: "حبيبات ثلج", UP: "هطول" };
  const DESC = { BL: "تثيره الرياح", DR: "منجرف", SH: "زخات", MI: "ضحل", BC: "متقطع", PR: "جزئي", FZ: "متجمد" };
  const WX_RE = /^(\+|-|VC)?(MI|PR|BC|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)*)$/;
  const DUST_RE = /DU|SA|SS|DS|PO|HZ/;
  const WET_RE = /BR|FG|RA|DZ|SN|PY/;

  function wxLabel(tok) {
    const m = WX_RE.exec(tok); if (!m) return tok;
    const [, pre, desc, ph] = m;
    let s = (ph.match(/../g) || []).map(c => WXN[c] || c).join(" و");
    if (desc === "TS") s = s ? "عاصفة رعدية مع " + s : "عاصفة رعدية";
    else if (desc) s = (s ? s + " " : "") + DESC[desc];
    if (pre === "-") s += " (خفيف)"; else if (pre === "+") s += " (شديد)"; else if (pre === "VC") s += " بالجوار";
    return s.trim();
  }

  G.parse = raw => {
    const t = String(raw).trim().replace(/^(METAR|SPECI)\s+/, "").split(/\s+/);
    const id = t[0], m = /^(\d{2})(\d{2})(\d{2})Z$/.exec(t[1] || "");
    if (!/^[A-Z]{4}$/.test(id) || !m) return null;
    const now = new Date();
    let d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), +m[1], +m[2], +m[3]);
    if (d - now.getTime() > 86400000) d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, +m[1], +m[2], +m[3]);
    const o = { id, raw: String(raw).trim(), time: d / 1000, vis: null, cavok: false, wx: [], wind: null, temp: null };
    for (const tok of t.slice(2)) {
      if (/^(RMK|NOSIG|BECMG|TEMPO)$/.test(tok)) break;
      let x;
      if (tok === "CAVOK") { o.vis = 10000; o.cavok = true; continue; }
      if ((x = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/.exec(tok))) {
        const k = x[4] === "KT" ? 1.852 : 3.6;
        o.wind = { dir: x[1], kmh: Math.round(+x[2] * k), gust: x[3] ? Math.round(+x[3] * k) : null }; continue;
      }
      if (o.vis == null && /^\d{4}$/.test(tok)) { o.vis = +tok >= 9999 ? 10000 : +tok; continue; }
      if (o.vis == null && (x = /^P?(\d+)SM$/.exec(tok))) { o.vis = Math.min(10000, Math.round(+x[1] * 1609)); continue; }
      if ((x = /^(M?\d{2})\/(M?\d{2})?$/.exec(tok))) { o.temp = +x[1].replace("M", "-"); continue; }
      if (tok.length >= 2 && tok !== "VC" && WX_RE.test(tok)) o.wx.push(tok);
    }
    o.dust = o.wx.some(w => DUST_RE.test(w));
    const wet = o.wx.some(w => WET_RE.test(w));
    o.level = o.dust || (U.isNum(o.vis) && o.vis < 5000 && !wet) ? "dust"
      : U.isNum(o.vis) && o.vis >= 8000 ? "clear"
      : U.isNum(o.vis) ? "hazy" : "unknown";
    o.wxText = o.wx.map(wxLabel);
    return o;
  };

  const rad = d => d * Math.PI / 180;
  const km = (a, b) => {
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    return Math.round(12742 * Math.asin(Math.sqrt(h)));
  };

  function build(lines) {
    const tk = ECO.data.station(ECO.DEFAULT_STATION), groups = {};
    lines.map(G.parse).filter(o => o && ECO.AIRPORTS[o.id]).forEach(o => { (groups[o.id] = groups[o.id] || []).push(o); });
    G.stations = Object.entries(groups).map(([id, arr]) => {
      arr.sort((a, b) => b.time - a.time);
      const ap = ECO.AIRPORTS[id];
      return { id, name: ap.name, lat: ap.lat, lon: ap.lon, km: km(tk, ap), last: arr[0], hist: arr, dustSeen: arr.find(o => o.level === "dust") || null };
    }).sort((a, b) => a.km - b.km);
  }

  /* ---------- الجلب عبر الخادم المشترك ---------- */
  function readCache() {
    try { const c = JSON.parse(sessionStorage.getItem(SKEY) || "null"); return c && Date.now() - c.at < TTL ? c : null; } catch (e) { return null; }
  }
  function writeCache(obs) { try { sessionStorage.setItem(SKEY, JSON.stringify({ at: Date.now(), obs })); } catch (e) { /* التخزين غير متاح */ } }

  let busy = null;
  G.load = (force = false) => {
    if (busy) return busy;
    busy = (async () => {
      const base = ECO.gemini && ECO.gemini.proxy && ECO.gemini.proxy();
      if (!base) { G.state = "noproxy"; return; }
      if (!force && G.fetched && Date.now() - G.fetched < TTL) return;
      const c = !force && readCache();
      if (c) { build(c.obs); G.fetched = c.at; G.state = "ok"; return; }
      if (!G.stations.length) { G.state = "loading"; render(); }
      try {
        const r = await fetch(`${base}/v1/metar?ids=${IDS.join(",")}&hours=3`);
        let j = null; try { j = await r.json(); } catch (e) { /* ليس JSON */ }
        if (r.status === 404) { G.state = "old"; return; }
        if (!r.ok || !j) throw new Error((j && j.error && j.error.message) || "HTTP " + r.status);
        build(j.obs || []); writeCache(j.obs || []);
        G.fetched = Date.now(); G.state = "ok"; G.error = "";
      } catch (e) {
        G.error = e.message; if (!G.stations.length) G.state = "error";
      }
    })().finally(() => { busy = null; render(); ECO.bus.emit("ground", G); });
    return busy;
  };

  /* ---------- مقارنة النموذج بالرصد الأرضي ---------- */
  G.verdict = c => {
    c = c || (ECO._lastCurrent || {})[ECO.DEFAULT_STATION] || {};
    const now = Date.now();
    const fresh = G.stations.filter(s => now - s.last.time * 1000 < FRESH && s.last.level !== "unknown");
    const out = { kind: "none", fresh, dusty: [], clear: [], md: c.dust, ma: c.us_aqi };
    if (G.state !== "ok" || !fresh.length) return out;
    out.dusty = fresh.filter(s => s.last.level === "dust");
    out.clear = fresh.filter(s => s.last.level === "clear");
    const has = U.isNum(c.dust) || U.isNum(c.us_aqi);
    const high = (U.isNum(c.dust) && c.dust >= 200) || (U.isNum(c.us_aqi) && c.us_aqi > 300);
    const low = has && (!U.isNum(c.dust) || c.dust < 80) && (!U.isNum(c.us_aqi) || c.us_aqi <= 150);
    if (!has) out.kind = out.dusty.length ? "dust" : "clearonly";
    else if (high && !out.dusty.length && out.clear.length >= Math.ceil(fresh.length / 2)) out.kind = "over";
    else if (low && out.dusty.length) out.kind = "under";
    else if (out.dusty.length) out.kind = "dust";
    else out.kind = "ok";
    return out;
  };

  const visText = v => !U.isNum(v) ? "—" : v >= 10000 ? "أكثر من 10 كم" : v >= 1000 ? `${U.fmt(v / 1000, v % 1000 ? 1 : 0)} كم` : `${v} م`;
  const names = arr => arr.map(s => `${s.name} (${s.km} كم)`).join(" و");

  G.message = v => {
    v = v || G.verdict();
    const model = [U.isNum(v.md) ? `غباراً ${U.fmt(v.md, 0)} µg/m³` : "", U.isNum(v.ma) ? `ومؤشر هواء ${v.ma > 500 ? "فوق 500 (خارج المقياس)" : Math.round(v.ma)}` : ""].filter(Boolean).join(" ").replace(/^و/, "");
    switch (v.kind) {
      case "over": {
        const minVis = Math.min(...v.clear.map(s => s.last.vis));
        return { tone: "warn", html: `<b>تقدير النموذج أعلى بكثير مما تراه المحطات الأرضية.</b> النموذج يقدّر فوق تكريت ${model}، بينما الرؤية الأفقية في ${names(v.clear)} ${minVis >= 10000 ? "تتجاوز 10 كم" : "لا تقل عن " + visText(minVis)} ولا يُسجَّل فيها أي غبار. الأرجح أن التقدير مبالغ فيه الآن، فلا تعتمد رقم النموذج وحده.` };
      }
      case "under":
        return { tone: "warn", html: `<b>المحطات الأرضية تسجل غباراً الآن</b> (${v.dusty.map(s => s.name + ": " + (s.last.wxText.join("، ") || "رؤية " + visText(s.last.vis))).join(" · ")}) بينما تقدير النموذج فوق تكريت منخفض. قد يكون غباراً محلياً أو حديثاً لم يلتقطه النموذج بعد.` };
      case "dust":
        return { tone: "warn", html: `<b>الرصد الأرضي يؤكد وجود غبار في المنطقة</b> (${v.dusty.map(s => s.name + ": " + (s.last.wxText.join("، ") || "رؤية " + visText(s.last.vis))).join(" · ")}).` };
      case "ok":
        return { tone: "ok", html: "تقدير النموذج لا يتعارض مع الرصد الأرضي الآن." };
      case "clearonly":
        return { tone: "ok", html: "المحطات الأرضية القريبة لا تسجل غباراً الآن." };
      default:
        return { tone: "info", html: "لا توجد تقارير حديثة من المطارات القريبة خلال آخر 3 ساعات." };
    }
  };

  /* نص مختصر للمساعد الذكي والتقارير */
  G.summary = () => {
    if (G.state !== "ok" || !G.stations.length) return "";
    const rows = G.stations.map(s => `- ${s.name} (${s.km} كم عن تكريت) ${U.fmtTime(s.last.time)}: رؤية ${visText(s.last.vis)}، ${s.last.wxText.join("، ") || "لا ظواهر جوية"}${s.dustSeen && s.dustSeen !== s.last ? ` (سُجّل غبار عند ${U.fmtTime(s.dustSeen.time)})` : ""} | ${s.last.raw}`);
    const m = G.message();
    return `أرصاد المطارات الأرضية الرسمية (METAR – aviationweather.gov):\n${rows.join("\n")}\nالمقارنة مع النموذج: ${m.html.replace(/<[^>]+>/g, "")}`;
  };
  G.rows = () => G.stations.map(s => [s.name, `${s.km} كم`, U.fmtTime(s.last.time), visText(s.last.vis), s.last.wxText.join("، ") || "لا ظواهر", s.last.level === "dust" ? "غبار" : s.last.level === "clear" ? "صافٍ" : "عتمة خفيفة"]);

  /* ---------- العرض ---------- */
  const chip = o => o.level === "dust" ? `<span class="chip tone-bad">غبار</span>`
    : o.level === "clear" ? `<span class="chip tone-good">لا غبار</span>`
    : o.level === "hazy" ? `<span class="chip tone-fair">عتمة خفيفة</span>` : `<span class="chip tone-none">غير معروف</span>`;

  G.html = (compact) => {
    const head = sub => `<div class="gc-h"><svg aria-hidden="true"><use href="#i-check"/></svg><b>التحقق الأرضي</b><span class="gc-sub">${sub}</span></div>`;
    if (G.state === "noproxy") return "";
    if (G.state === "loading" || G.state === "idle") return `<div class="gc">${head("أرصاد المطارات القريبة")}<p class="gc-p">جارٍ جلب أرصاد المطارات…</p></div>`;
    if (G.state === "old") return `<div class="gc">${head("أرصاد المطارات القريبة")}<p class="gc-p">هذه الميزة تحتاج تحديث كود الخادم على Cloudflare مرة واحدة.</p></div>`;
    if (G.state === "error") return `<div class="gc">${head("أرصاد المطارات القريبة")}<p class="gc-p">تعذّر جلب أرصاد المطارات الآن. <button type="button" class="linkbtn" data-gc-retry>إعادة المحاولة</button></p></div>`;
    if (!G.stations.length) return `<div class="gc">${head("أرصاد المطارات القريبة")}<p class="gc-p">لا توجد تقارير من المطارات القريبة الآن.</p></div>`;
    const v = G.verdict(), m = G.message(v);
    const rows = G.stations.map(s => {
      const o = s.last, old = Date.now() - o.time * 1000 > FRESH;
      const extra = o.wxText.length ? o.wxText.join("، ") : (s.dustSeen ? `غبار عند ${U.fmtHour(s.dustSeen.time)}` : "");
      return `<div class="gc-row${old ? " gc-old" : ""}" title="${U.esc(o.raw)}">
        <span class="gc-n">${s.name}<small>${s.km} كم · ${U.fmtHour(o.time)}${old ? " · قديم" : ""}</small></span>
        <span class="gc-v">رؤية ${visText(o.vis)}${extra ? `<small>${U.esc(extra)}</small>` : ""}</span>
        ${chip(o)}
      </div>`;
    }).join("");
    return `<div class="gc">${head("أرصاد المطارات الرسمية (METAR)")}
      <div class="gc-list">${rows}</div>
      <div class="notice ${m.tone} gc-verdict"><span>${m.html}</span></div>
      ${compact ? "" : `<p class="gc-p faint">الرؤية الأفقية ورموز الطقس كما تسجلها محطات الأرصاد في المطارات (المصدر: aviationweather.gov – NOAA). لا توجد محطة رصد أرضية منشورة البيانات داخل تكريت، لذا نقارن بأقرب المطارات.</p>`}
    </div>`;
  };

  function render() {
    const h = U.$("#hero-ground"), m = U.$("#mon-ground");
    if (h) h.innerHTML = G.html(true);
    if (m) m.innerHTML = G.html(false) || `<p class="gc-p faint">التحقق الأرضي يعمل عند ربط الموقع بالخادم المشترك.</p>`;
  }
  G.render = render;

  document.addEventListener("click", e => { if (e.target.closest("[data-gc-retry]")) G.load(true); });
  ECO.bus.on("current", () => render());
  ECO.bus.on("refresh", () => G.load(false));
  setTimeout(() => G.load(false), 400);
  setInterval(() => { if (!document.hidden) G.load(false); }, 15 * 60 * 1000);
})();
