/* =====================================================================
   EcoBio AI — الخادم المشترك (Cloudflare Worker)
   ---------------------------------------------------------------------
   1) يحفظ مفتاح Gemini سراً ويمرّر طلبات موقعك فقط إلى Google، فيعمل
      المساعد الذكي عند كل من يفتح الموقع دون أن يظهر المفتاح لأحد.
   2) يحفظ «مواقع بحوث الأساتذة» في قاعدة بيانات مشتركة (Workers KV)،
      مع مراجعة المشرف قبل ظهور أي موقع للعموم.
   3) يجلب أرصاد المطارات الرسمية (METAR) من aviationweather.gov للتحقق
      الأرضي من تقديرات الغبار، لأن تلك الخدمة لا تسمح للمتصفح بطلبها مباشرة.
   4) ممر احتياطي لبيانات الأقمار Sentinel-2 وLandsat من Microsoft Planetary
      Computer (بحث الصور، قيم البكسل، مساحة الماء، البلاطات) إذا رفض المتصفح
      طلبها مباشرة، وصور احتياطية للمجسم ثلاثي الأبعاد، ومسار نهر دجلة من
      OpenStreetMap محفوظاً لكل الزوار.
   5) ينشر قاعدة بيانات أقضية دجلة اليومية للموقع والتطبيق والباحثين من
      Workers KV (المسار /v1/db/)، فتبقى متاحة وإن كان مستودع الكود خاصاً.
      يرفعها GitHub Actions كل يوم بهوية موقّعة من GitHub (OIDC) لهذا
      المستودع وحده، فلا تحتاج أي كلمة سر إضافية.

   المتغيرات (Worker → Settings → Variables and Secrets):
     GEMINI_KEY       نوعه Secret  — مفتاح Gemini من Google AI Studio (إلزامي)
     ALLOWED_ORIGINS  نوعه Text    — رابط موقعك بلا مسار، مثل:
                                     https://username.github.io
                                     (عدة روابط تُفصل بفاصلة)          (إلزامي)
     RATE_PER_MIN     نوعه Text    — أقصى طلبات للزائر الواحد في الدقيقة (اختياري، الافتراضي 10)
     RATE_PER_HOUR    نوعه Text    — أقصى طلبات للزائر الواحد في الساعة (اختياري، الافتراضي 120)
     MODEL            نوعه Text    — فرض نموذج واحد لكل الطلبات (اختياري)
     FALLBACK_MODELS  نوعه Text    — نماذج بديلة عند نفاد حصة النموذج الأول،
                                     مفصولة بفاصلة (اختياري، الافتراضي gemini-flash-lite-latest)
     ADMIN_KEY        نوعه Secret  — كلمة سر لوحة مراجعة مواقع الباحثين

   الربط (Worker → Settings → Bindings → Add → KV namespace):
     SITES            قاعدة بيانات KV لمواقع بحوث الأساتذة، وتحفظ أيضاً قاعدة الأقضية
   ===================================================================== */

const UPSTREAM = "https://generativelanguage.googleapis.com";
const MAX_BODY = 14 * 1024 * 1024;           // حد حجم الطلب (صور وملفات PDF)
// نماذج Flash وFlash-Lite النصية فقط: أرخص النماذج وأعلاها حصة مجانية، فلا يستهلك أحد المفتاح في نماذج Pro
// أو توليد الصور والصوت حتى لو تجاوز فحص الأصل بأداة مثل curl
const MODEL_RE = /^gemini-(?:[0-9.]+-)?flash(?:-lite)?(?:-latest|-preview(?:-[0-9a-z-]+)?|-[0-9]{3})?$/i;
const MODEL_BAD = /image|tts|audio|live|native|embed/i;
const modelOk = m => MODEL_RE.test(m || "") && !MODEL_BAD.test(m || "");
const PENDING_MAX = 300;                      // أقصى عدد مساهمات تنتظر المراجعة (حماية من الإغراق)
const hourly = new Map();                     // سقف الطلبات لكل زائر في الساعة
const hits = new Map();                       // عدّاد الطلبات لكل زائر (تقريبي)

function list(v) {
  return String(v || "").split(",").map(s => s.trim().replace(/\/+$/, "")).filter(Boolean);
}

function limited(ip, max) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (arr.length >= max) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

/* ---------------------------------------------------------------------
   مواقع بحوث الأساتذة (Workers KV)
   p:<id>     مساهمة بانتظار المراجعة
   approved   قائمة المواقع المعتمدة الظاهرة لكل الزوار
--------------------------------------------------------------------- */
const IRAQ = { s: 29.0, n: 37.6, w: 38.7, e: 48.8 };
const TYPES = ["مياه نهر", "مياه بئر", "مياه صرف", "مياه شرب", "تربة", "رواسب", "نبات", "هواء"];
const TITLES = ["أ.د.", "أ.م.د.", "م.د.", "م.م.", "د.", "باحث", "طالب دراسات عليا"];
const subs = new Map(), badKeys = new Map();

function over(map, key, max, ms) {
  const now = Date.now();
  const arr = (map.get(key) || []).filter(t => now - t < ms);
  map.set(key, arr);
  if (map.size > 5000) map.clear();
  return arr.length >= max;
}
const mark = (map, key) => { const arr = map.get(key) || []; arr.push(Date.now()); map.set(key, arr); };
const str = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
function same(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

function cleanSite(o) {
  const errors = [], lat = Number(o.lat), lon = Number(o.lon), year = Number(o.year);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < IRAQ.s || lat > IRAQ.n || lon < IRAQ.w || lon > IRAQ.e) errors.push("coords");
  const s = {
    lat: Number.isFinite(lat) ? +lat.toFixed(6) : null, lon: Number.isFinite(lon) ? +lon.toFixed(6) : null,
    place: str(o.place, 120), type: TYPES.includes(o.type) ? o.type : "مياه نهر",
    researcher: str(o.researcher, 80), title: TITLES.includes(o.title) ? o.title : "",
    institution: str(o.institution, 160), research: str(o.research, 300), year,
    link: str(o.link, 300), sampled: /^\d{4}(-\d{2}){0,2}$/.test(String(o.sampled || "")) ? String(o.sampled) : "",
    notes: str(o.notes, 800), params: {}
  };
  if (s.researcher.length < 3) errors.push("researcher");
  if (s.institution.length < 3) errors.push("institution");
  if (s.research.length < 5) errors.push("research");
  if (s.place.length < 2) errors.push("place");
  if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) errors.push("year");
  if (s.link && !/^https?:\/\/\S+$/i.test(s.link)) errors.push("link");
  if (o.params && typeof o.params === "object") {
    for (const [k, v] of Object.entries(o.params).slice(0, 40)) {
      const n = Number(v);
      if (/^[a-z0-9_]{1,16}$/.test(k) && v !== "" && v !== null && Number.isFinite(n) && n >= 0 && n < 1e7) s.params[k] = n;
    }
  }
  return { s, errors };
}

async function readList(env, key) {
  try { const v = await env.SITES.get(key, "json"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
async function readBody(req, max) {
  if (Number(req.headers.get("Content-Length") || 0) > max) return { tooLarge: true };
  const t = await req.text();
  if (t.length > max) return { tooLarge: true };
  try { return { data: JSON.parse(t) }; } catch (e) { return { bad: true }; }
}

async function sites(req, env, path, ip, reply, fail) {
  if (!env.SITES) return fail(503, "SITES_NOT_CONFIGURED", "The SITES KV namespace is not bound to this Worker.");

  // قائمة المواقع المعتمدة (لكل الزوار)
  if (req.method === "GET" && path === "/v1/sites") {
    const list = await readList(env, "approved");
    return reply(200, { sites: list, count: list.length });
  }

  // مساهمة جديدة من باحث: تُحفظ بانتظار المراجعة
  if (req.method === "POST" && path === "/v1/sites") {
    const b = await readBody(req, 32768);
    if (b.tooLarge) return fail(413, "TOO_LARGE", "Submission is too large.");
    if (b.bad || !b.data || typeof b.data !== "object") return fail(400, "BAD_JSON", "Invalid JSON.");
    if (b.data.website) return reply(200, { ok: true, pending: true }); // فخ للبرامج الآلية
    if (over(subs, ip, 6, 3600000)) return fail(429, "TOO_MANY_SUBMISSIONS", "Too many submissions from this visitor. Try again later.");
    const { s, errors } = cleanSite(b.data);
    if (errors.length) return reply(400, { error: { code: 400, status: "INVALID_FIELDS", message: "Some fields are invalid.", fields: errors } });
    const queued = await env.SITES.list({ prefix: "p:", limit: PENDING_MAX + 1 });
    if (queued.keys.length > PENDING_MAX) return fail(503, "QUEUE_FULL", "The review queue is full. Try again after the supervisor reviews pending submissions.");
    mark(subs, ip);
    s.id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    s.submitted = new Date().toISOString();
    await env.SITES.put("p:" + s.id, JSON.stringify(s));
    return reply(200, { ok: true, pending: true, id: s.id });
  }

  // لوحة المراجعة (بكلمة سر المشرف)
  if (req.method === "POST" && path === "/v1/sites/admin") {
    if (!env.ADMIN_KEY) return fail(503, "ADMIN_NOT_CONFIGURED", "ADMIN_KEY secret is not set on the Worker.");
    if (over(badKeys, ip, 8, 900000)) return fail(429, "TOO_MANY_ATTEMPTS", "Too many wrong passwords. Wait 15 minutes.");
    const b = await readBody(req, 8192);
    if (b.tooLarge || b.bad || !b.data) return fail(400, "BAD_JSON", "Invalid JSON.");
    const o = b.data;
    if (typeof o.key !== "string" || !same(o.key, env.ADMIN_KEY)) { mark(badKeys, ip); return fail(401, "BAD_ADMIN_KEY", "Wrong review password."); }
    const id = String(o.id || "").replace(/[^a-f0-9]/g, "").slice(0, 12);
    if (o.action === "list") {
      const keys = await env.SITES.list({ prefix: "p:" });
      const pending = (await Promise.all(keys.keys.map(k => env.SITES.get(k.name, "json")))).filter(Boolean)
        .sort((a, b) => String(b.submitted).localeCompare(String(a.submitted)));
      return reply(200, { pending, approved: await readList(env, "approved") });
    }
    if (o.action === "approve") {
      const p = await env.SITES.get("p:" + id, "json");
      if (!p) return fail(404, "NOT_FOUND", "This submission no longer exists.");
      const list = (await readList(env, "approved")).filter(x => x.id !== p.id);
      list.push({ ...p, approved: new Date().toISOString() });
      await env.SITES.put("approved", JSON.stringify(list));
      await env.SITES.delete("p:" + id);
      return reply(200, { ok: true, count: list.length });
    }
    if (o.action === "reject") { await env.SITES.delete("p:" + id); return reply(200, { ok: true }); }
    if (o.action === "delete") {
      const list = (await readList(env, "approved")).filter(x => x.id !== id);
      await env.SITES.put("approved", JSON.stringify(list));
      return reply(200, { ok: true, count: list.length });
    }
    return fail(400, "BAD_ACTION", "Unknown action.");
  }
  return fail(404, "NOT_ALLOWED", "Unknown sites endpoint.");
}

/* ---------- أرصاد المطارات (METAR) من مركز الطقس الجوي الأمريكي NOAA ----------
   GET /v1/metar?ids=ORBI,ORKK,ORER&hours=3
   تُخزَّن النتيجة 10 دقائق حتى لا نُثقل على الخدمة (حدها 100 طلب في الدقيقة). */
const METAR_IDS = "ORKK,ORBI,ORER,ORSU,ORBM";
const METAR_TTL = 10 * 60 * 1000;
const metarCache = new Map();

async function metar(url, reply, fail) {
  const ids = String(url.searchParams.get("ids") || METAR_IDS).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z]{4}(,[A-Z]{4}){0,9}$/.test(ids)) return fail(400, "BAD_IDS", "ids must be up to 10 ICAO codes separated by commas.");
  const hours = Math.min(12, Math.max(1, parseInt(url.searchParams.get("hours"), 10) || 3));
  const key = ids + "|" + hours, now = Date.now(), hit = metarCache.get(key);
  if (hit && now - hit.at < METAR_TTL) return reply(200, hit.body);
  let r = null;
  try {
    r = await fetch(`https://aviationweather.gov/api/data/metar?ids=${ids}&format=raw&hours=${hours}`, {
      headers: { "User-Agent": "EcoBioAI/1.0 (Tikrit University environmental education project)", "Accept": "text/plain" },
      cf: { cacheTtl: 600, cacheEverything: true }
    });
  } catch (e) { r = null; }
  if (!r || (!r.ok && r.status !== 204)) {
    if (hit) return reply(200, { ...hit.body, stale: true });
    return fail(502, "METAR_UPSTREAM", "aviationweather.gov did not answer. Try again later.");
  }
  const text = r.status === 204 ? "" : await r.text();
  const obs = text.split(/\r?\n/).map(x => x.trim())
    .filter(x => /^(METAR |SPECI )?[A-Z]{4} \d{6}Z /.test(x) && x.length < 400).slice(0, 150);
  const body = { source: "aviationweather.gov (NOAA Aviation Weather Center)", fetched: now, ids: ids.split(","), hours, obs };
  metarCache.set(key, { at: now, body });
  if (metarCache.size > 50) metarCache.delete(metarCache.keys().next().value);
  return reply(200, body);
}

/* ---------- ممر بيانات الأقمار من Microsoft Planetary Computer ----------
   GET  /v1/pc/stac/search?...                ← /api/stac/v1/search
   GET  /v1/pc/data/item/point/lon,lat?...     ← قيم البكسل
   GET  /v1/pc/data/item/tilejson.json?...     ← قالب البلاطات
   POST /v1/pc/data/item/statistics?...        ← إحصاءات منطقة (مساحة الماء)
   GET  /v1/pc/data/item/tiles/WebMercatorQuad/z/x/y@1x.png?... ← بلاطة صورة
   بيانات عامة مجانية لا تحتاج مفتاحاً؛ نمرّر هذه المسارات فقط. */
const PC_API = "https://planetarycomputer.microsoft.com/api";
const PC_RE = /^\/v1\/pc\/(stac\/search|data\/item\/point\/-?\d{1,3}(\.\d{1,8})?,-?\d{1,2}(\.\d{1,8})?|data\/item\/tilejson\.json|data\/item\/statistics|data\/item\/tiles\/WebMercatorQuad\/\d{1,2}\/\d{1,7}\/\d{1,7}@1x(\.png)?)$/;
const pcCache = new Map();
const UA = { "User-Agent": "EcoBioAI/1.0 (Tikrit University environmental education project)" };
function remember(key, text) {
  if (text.length > 400000) return;
  pcCache.set(key, { at: Date.now(), text });
  if (pcCache.size > 400) pcCache.delete(pcCache.keys().next().value);
}

async function pc(req, url, path, raw, bin, fail) {
  if (!PC_RE.test(path)) return fail(404, "NOT_ALLOWED", "Unknown satellite endpoint.");
  if (url.search.length > 4000) return fail(414, "TOO_LONG", "Query is too long.");
  const target = PC_API + path.replace(/^\/v1\/pc\/(stac|data)\//, (m, a) => `/${a}/v1/`) + url.search;
  const isTile = path.includes("/item/tiles/"), isStats = path.endsWith("/item/statistics");
  if (isTile) {
    if (req.method !== "GET") return fail(405, "METHOD", "GET only.");
    let r; try { r = await fetch(target, { headers: UA }); } catch (e) { return fail(502, "PC_UPSTREAM", "Planetary Computer did not answer."); }
    return bin(r);
  }
  if (isStats ? req.method !== "POST" : req.method !== "GET") return fail(405, "METHOD", "Wrong method.");
  let body = null, key = target;
  if (isStats) {
    body = await req.text();
    if (body.length > 65536) return fail(413, "TOO_LARGE", "Area is too large.");
    key += "|" + body;
  }
  // قيم البكسل والإحصاءات لا تتغير لصورة معينة، فنخزنها أطول؛ نتائج البحث تتغير بوصول صور جديدة
  const ttl = isStats || path.includes("/point/") ? 86400000 : path.endsWith("tilejson.json") ? 3600000 : 900000;
  const hit = pcCache.get(key);
  if (hit && Date.now() - hit.at < ttl) return raw(200, hit.text);
  let r;
  try { r = await fetch(target, isStats ? { method: "POST", headers: { ...UA, "Content-Type": "application/json", "Accept": "application/json" }, body } : { headers: { ...UA, "Accept": "application/json" } }); }
  catch (e) { return fail(502, "PC_UPSTREAM", "Planetary Computer did not answer."); }
  const text = await r.text();
  if (!r.ok) return raw(r.status, text.slice(0, 2000));
  remember(key, text);
  return raw(200, text);
}

/* ---------- صور احتياطية للمجسم ثلاثي الأبعاد ----------
   إذا رفض المتصفح تحميل بلاطات التضاريس أو صور Esri داخل WebGL نمررها من هنا. */
const IMG_RE = /^\/v1\/img\/(terrarium\/\d{1,2}\/\d{1,7}\/\d{1,7}\.png|esri\/(World_Imagery|Reference\/World_Boundaries_and_Places|Reference\/World_Transportation)\/\d{1,2}\/\d{1,7}\/\d{1,7})$/;
async function img(path, bin, fail) {
  if (!IMG_RE.test(path)) return fail(404, "NOT_ALLOWED", "Unknown image endpoint.");
  const rest = path.replace(/^\/v1\/img\//, "");
  const target = rest.startsWith("terrarium/")
    ? "https://s3.amazonaws.com/elevation-tiles-prod/" + rest
    : "https://server.arcgisonline.com/ArcGIS/rest/services/" + rest.replace(/^esri\//, "").replace(/\/(\d+)\/(\d+)\/(\d+)$/, "/MapServer/tile/$1/$2/$3");
  let r; try { r = await fetch(target, { headers: UA }); } catch (e) { return fail(502, "IMG_UPSTREAM", "Image host did not answer."); }
  return bin(r);
}

/* ---------- مسار نهر دجلة الدقيق من OpenStreetMap ----------
   GET /v1/river ← يُجلب مرة واحدة من Overpass ويُحفظ في KV (إن وُجد) لكل الزوار. */
const RIVER_KEY = "river:tigris:v1";
const RIVER_Q = '[out:json][timeout:90];(way["waterway"="river"]["name:en"="Tigris"](33.9,43.0,35.8,44.6);way["waterway"="river"]["name"~"دجلة|Tigris"](33.9,43.0,35.8,44.6);way["waterway"="river"]["name:ar"~"دجلة"](33.9,43.0,35.8,44.6););out geom;';
let riverMem = null;
async function river(env, raw, fail) {
  if (riverMem) return raw(200, riverMem);
  if (env.SITES) { const v = await env.SITES.get(RIVER_KEY); if (v) { riverMem = v; return raw(200, v); } }
  let r;
  try { r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(RIVER_Q) }); }
  catch (e) { return fail(502, "OSM_UPSTREAM", "OpenStreetMap Overpass did not answer."); }
  if (!r.ok) return fail(502, "OSM_UPSTREAM", "Overpass status " + r.status);
  const j = await r.json().catch(() => null);
  if (!j || !Array.isArray(j.elements)) return fail(502, "OSM_UPSTREAM", "Bad Overpass response.");
  // نحتفظ بالإحداثيات فقط لتصغير الحجم
  const ways = j.elements.filter(e => e.type === "way" && Array.isArray(e.geometry)).map(e => ({ id: e.id, t: { name: e.tags && e.tags.name, side: e.tags && e.tags.side_channel }, g: e.geometry.map(p => [+p.lon.toFixed(5), +p.lat.toFixed(5)]) }));
  const text = JSON.stringify({ source: "OpenStreetMap contributors (ODbL)", fetched: Date.now(), ways });
  if (ways.length) { riverMem = text; if (env.SITES) await env.SITES.put(RIVER_KEY, text); }
  return raw(200, text);
}

/* ---------------------------------------------------------------------
   قاعدة بيانات أقضية دجلة (Workers KV، الربط SITES)
   db:cur            {v, files, at}  الإصدار المعروض الآن
   db:prev           الإصدار السابق (يبقى يوماً حتى لا ينقطع من يحمّل وقت التحديث)
   db:f:<v>:<path>   محتوى كل ملف
   القراءة مفتوحة للجميع (بيانات مفتوحة CC BY 4.0). الرفع لا يقبل إلا رمزاً
   يصدره GitHub Actions لهذا المستودع بالذات وفرعه main، ويُتحقق من توقيعه
   بمفاتيح GitHub العامة.
--------------------------------------------------------------------- */
const DB_ISS = "https://token.actions.githubusercontent.com";
const DB_AUD = "ecobio-db";
const DB_REPO_ID = "1424635562";   // ibnsamh97-ai/moamin-ecobio: رقم ثابت لا يتغير بتغيير اسم المستودع
const DB_OWNER_ID = "240066469";   // حساب ibnsamh97-ai
const DB_MAX = 25 * 1024 * 1024;   // أقصى حجم لقيمة واحدة في KV
const DB_FILE = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,80}(?:\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,80}){0,3}$/;
const DB_VER = /^[A-Za-z0-9-]{1,48}$/;
const DB_TYPES = { json: "application/json; charset=utf-8", csv: "text/csv; charset=utf-8", sql: "text/plain; charset=utf-8", log: "text/plain; charset=utf-8", txt: "text/plain; charset=utf-8" };
let dbCur = null, dbCurAt = 0, ghJwks = null, ghJwksAt = 0;

const b64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const b64json = s => JSON.parse(new TextDecoder().decode(b64u(s)));

async function ghKeys(fresh) {
  if (ghJwks && !fresh && Date.now() - ghJwksAt < 3600000) return ghJwks;
  const r = await fetch(DB_ISS + "/.well-known/jwks", { headers: UA });
  if (!r.ok) throw new Error("GitHub JWKS " + r.status);
  const j = await r.json();
  ghJwks = Array.isArray(j.keys) ? j.keys : []; ghJwksAt = Date.now();
  return ghJwks;
}

// يعيد بيانات التشغيل إذا كان الطلب من GitHub Actions لهذا المستودع وفرعه main، وإلا null
async function ghCaller(req, env) {
  const m = /^Bearer\s+([\w-]+)\.([\w-]+)\.([\w-]+)$/i.exec(req.headers.get("Authorization") || "");
  if (!m) return null;
  let head, claims;
  try { head = b64json(m[1]); claims = b64json(m[2]); } catch (e) { return null; }
  if (!head || head.alg !== "RS256" || !claims) return null;
  let jwk;
  try {
    jwk = (await ghKeys(false)).find(k => k.kid === head.kid);
    if (!jwk) jwk = (await ghKeys(true)).find(k => k.kid === head.kid);
  } catch (e) { return null; }
  if (!jwk || jwk.kty !== "RSA") return null;
  try {
    const key = await crypto.subtle.importKey("jwk", { kty: "RSA", n: jwk.n, e: jwk.e, ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(m[3]), new TextEncoder().encode(m[1] + "." + m[2]))) return null;
  } catch (e) { return null; }
  const now = Date.now() / 1000, aud = [].concat(claims.aud);
  if (claims.iss !== DB_ISS || !aud.includes(DB_AUD)) return null;
  if (!(claims.exp > now - 30) || (claims.nbf && claims.nbf > now + 60)) return null;
  if (String(claims.repository_id) !== String(env.DB_REPO_ID || DB_REPO_ID)) return null;
  if (String(claims.repository_owner_id) !== String(env.DB_OWNER_ID || DB_OWNER_ID)) return null;
  if (claims.ref !== "refs/heads/main") return null;
  return claims;
}

async function dbCurrent(env, fresh) {
  if (!fresh && dbCur && Date.now() - dbCurAt < 30000) return dbCur;
  const v = await env.SITES.get("db:cur", fresh ? "json" : { type: "json", cacheTtl: 30 });
  dbCur = v && v.v && Array.isArray(v.files) ? v : null; dbCurAt = Date.now();
  return dbCur;
}

async function db(req, env, path, reply, fail) {
  if (!env.SITES) return fail(503, "DB_NOT_CONFIGURED", "The SITES KV namespace is not bound to this Worker.");
  const rest = path === "/v1/db" ? "" : path.slice("/v1/db/".length);

  /* القراءة: /v1/db (فهرس الإصدار) أو /v1/db/<ملف> */
  if (req.method === "GET" || req.method === "HEAD") {
    const cur = await dbCurrent(env, false);
    if (!rest) return reply(cur ? 200 : 404, cur ? { version: cur.v, updated_at: cur.at, files: cur.files } : { version: null, error: { status: "NOT_PUBLISHED", message: "No database has been published yet." } });
    let file; try { file = decodeURIComponent(rest); } catch (e) { file = ""; }
    if (!DB_FILE.test(file) || file.split("/").includes("..")) return fail(404, "NOT_FOUND", "No such file.");
    if (!cur) return fail(404, "NOT_PUBLISHED", "No database has been published yet.");
    if (!cur.files.includes(file)) return fail(404, "NOT_FOUND", "No such file in the current database.");
    const tag = `"${cur.v}"`;
    const h = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "ETag, Content-Length, X-EcoBio-DB",
      "Content-Type": DB_TYPES[file.split(".").pop().toLowerCase()] || "application/octet-stream",
      "Cache-Control": "public, no-cache",
      "ETag": tag,
      "X-EcoBio-DB": cur.v,
      "X-Content-Type-Options": "nosniff",
      "Vary": "Origin"
    });
    if ((req.headers.get("If-None-Match") || "").split(/\s*,\s*/).includes(tag)) return new Response(null, { status: 304, headers: h });
    // الملفات بإصدار ثابت لا يتغير، فتحفظها حافات Cloudflare يوماً كاملاً
    const got = await env.SITES.getWithMetadata(`db:f:${cur.v}:${file}`, { type: "stream", cacheTtl: 86400 });
    if (!got || !got.value) return fail(404, "NOT_FOUND", "File not found in this version.");
    const size = got.metadata && Number(got.metadata.size);
    if (req.method === "HEAD") {
      await got.value.cancel();
      if (size >= 0) h.set("Content-Length", String(size));
      return new Response(null, { status: 200, headers: h });
    }
    let body = got.value;
    if (size >= 0 && typeof FixedLengthStream === "function") {
      const fl = new FixedLengthStream(size);
      got.value.pipeTo(fl.writable).catch(() => {});
      body = fl.readable;
    }
    return new Response(body, { status: 200, headers: h });
  }

  /* الرفع والنشر: من GitHub Actions فقط */
  const who = await ghCaller(req, env);
  if (!who) return fail(401, "NOT_GITHUB_ACTIONS", "Uploads are accepted only from this repository's GitHub Actions (OIDC).");

  // PUT /v1/db/_up/<إصدار>/<ملف>
  if (req.method === "PUT" && rest.startsWith("_up/")) {
    const i = rest.indexOf("/", 4), v = rest.slice(4, i), file = i > 0 ? rest.slice(i + 1) : "";
    if (!DB_VER.test(v) || !DB_FILE.test(file)) return fail(400, "BAD_NAME", "Bad version or file name.");
    const len = Number(req.headers.get("Content-Length"));
    if (!Number.isFinite(len) || len < 0) return fail(411, "LENGTH_REQUIRED", "Content-Length is required.");
    if (len > DB_MAX) return fail(413, "TOO_LARGE", "A file may not exceed 25 MiB.");
    const cur = await dbCurrent(env, true);
    if (cur && cur.v === v) return fail(409, "VERSION_LIVE", "This version is already published.");
    await env.SITES.put(`db:f:${v}:${file}`, req.body, { metadata: { size: len } });
    return reply(200, { ok: true, version: v, file, size: len });
  }

  // POST /v1/db/_commit/<إصدار>  {"files": [...]}
  if (req.method === "POST" && rest.startsWith("_commit/")) {
    const v = rest.slice(8);
    if (!DB_VER.test(v)) return fail(400, "BAD_NAME", "Bad version name.");
    const o = await req.json().catch(() => null);
    const files = o && Array.isArray(o.files) ? [...new Set(o.files)] : [];
    if (!files.length || files.length > 400 || !files.every(f => typeof f === "string" && DB_FILE.test(f))) return fail(400, "BAD_MANIFEST", "Send {\"files\": [...]} with the uploaded file names.");
    if (!files.includes("ecobio-meta.json")) return fail(400, "BAD_MANIFEST", "ecobio-meta.json is required.");
    const old = await dbCurrent(env, true);
    const next = { v, files: files.sort(), at: new Date().toISOString(), run: String(who.run_id || "") };
    await env.SITES.put("db:cur", JSON.stringify(next));
    if (old && old.v !== v) await env.SITES.put("db:prev", JSON.stringify(old));
    dbCur = next; dbCurAt = Date.now();
    // نحذف كل إصدار غير الحالي والسابق (ومنها رفعات لم تكتمل)
    const keep = new Set([v, old && old.v].filter(Boolean));
    let removed = 0, cursor;
    try {
      do {
        const l = await env.SITES.list({ prefix: "db:f:", cursor });
        for (const k of l.keys) {
          const kv = k.name.slice(5, k.name.indexOf(":", 5));
          if (!keep.has(kv) && removed < 600) { await env.SITES.delete(k.name); removed++; }
        }
        cursor = l.list_complete ? null : l.cursor;
      } while (cursor && removed < 600);
    } catch (e) { /* التنظيف يكتمل في النشر القادم */ }
    return reply(200, { ok: true, version: v, files: files.length, previous: old ? old.v : null, removed });
  }

  return fail(404, "NOT_ALLOWED", "Unknown database operation.");
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    // يقبل الرابط كاملاً أو أصله فقط: https://user.github.io/ecobio-ai ← https://user.github.io
    // تطبيق EcoBio AI على أندرويد وiOS يعمل من هذين الأصلين دائماً
    const allowed = list(env.ALLOWED_ORIGINS).map(o => { if (o === "*") return o; try { return new URL(o).origin; } catch (e) { return o; } }).concat(["https://localhost", "capacitor://localhost"]);
    const okOrigin = allowed.includes("*") || (origin !== "" && allowed.includes(origin));
    // نسمح للمتصفح بقراءة رسائل الخطأ من أي موقع، لكن لا نمرّر إلى Gemini إلا طلبات المواقع المسموحة
    const cors = {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    const reply = (status, obj) => new Response(JSON.stringify(obj), {
      status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
    const fail = (status, code, message) => reply(status, { error: { code: status, status: code, message } });
    const raw = (status, text) => new Response(text, {
      status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
    // تمرير صورة كما هي مع رؤوس CORS حتى تعمل داخل WebGL
    const bin = up => new Response(up.body, {
      status: up.status, headers: { ...cors, "Content-Type": up.headers.get("Content-Type") || "application/octet-stream", "Cache-Control": up.ok ? "public, max-age=86400" : "no-store" }
    });

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    // فحص سريع من المتصفح: افتح رابط الخادم مباشرة لترى حالته (لا يكشف المفتاح)
    if (req.method === "GET" && (path === "/" || path === "/health")) {
      let dbVersion = null;
      if (env.SITES) { try { const c = await dbCurrent(env, false); dbVersion = c ? c.v : null; } catch (e) { /* */ } }
      return reply(200, {
        service: "EcoBio AI – Gemini shared server",
        key_configured: Boolean(env.GEMINI_KEY),
        sites_configured: Boolean(env.SITES),
        admin_configured: Boolean(env.ADMIN_KEY),
        metar: true,
        satellite: true,
        twin: true,
        db: Boolean(env.SITES),
        db_version: dbVersion,
        allowed_origins: allowed,
        ok: Boolean(env.GEMINI_KEY) && allowed.length > 0
      });
    }

    /* قاعدة بيانات الأقضية: القراءة مفتوحة لأي موقع أو برنامج، والرفع محمي بهوية GitHub */
    if (path === "/v1/db" || path.startsWith("/v1/db/")) return db(req, env, path, reply, fail);

    if (!okOrigin) return fail(403, "ORIGIN_NOT_ALLOWED", "This server only answers requests from the EcoBio AI site. Add the site origin to ALLOWED_ORIGINS.");
    const ip = req.headers.get("CF-Connecting-IP") || "local";

    /* مواقع بحوث الأساتذة */
    if (path === "/v1/sites" || path.startsWith("/v1/sites/")) return sites(req, env, path, ip, reply, fail);

    /* أرصاد المطارات للتحقق الأرضي (لا تحتاج مفتاحاً) */
    if (req.method === "GET" && path === "/v1/metar") return metar(url, reply, fail);

    /* بيانات Sentinel-2 (ممر احتياطي، لا يحتاج مفتاحاً) */
    if (path.startsWith("/v1/pc/")) return pc(req, url, path, raw, bin, fail);
    if (req.method === "GET" && path.startsWith("/v1/img/")) return img(path, bin, fail);
    if (req.method === "GET" && path === "/v1/river") return river(env, raw, fail);

    if (!env.GEMINI_KEY) return fail(500, "GEMINI_KEY_MISSING", "GEMINI_KEY secret is not set on the Worker.");

    /* قائمة النماذج */
    if (req.method === "GET" && path === "/v1beta/models") {
      const up = await fetch(`${UPSTREAM}/v1beta/models?pageSize=200`, { headers: { "x-goog-api-key": env.GEMINI_KEY } });
      if (!up.ok) return new Response(up.body, { status: up.status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
      // نعرض للزائر النماذج المسموحة على هذا الخادم فقط
      const j = await up.json().catch(() => ({ models: [] }));
      return reply(200, { models: (j.models || []).filter(x => modelOk(String(x.name || "").replace(/^models\//, ""))) });
    }

    /* التوليد */
    const m = path.match(/^\/v1beta\/models\/([^/:]+):(generateContent|streamGenerateContent)$/);
    if (req.method !== "POST" || !m) return fail(404, "NOT_ALLOWED", "Only model listing and content generation are available.");
    const asked = decodeURIComponent(m[1]);
    if (!modelOk(asked)) return fail(400, "MODEL_NOT_ALLOWED", "Only Gemini Flash text models are available on this server.");

    if (limited(ip, Number(env.RATE_PER_MIN) || 10)) return fail(429, "VISITOR_RATE_LIMIT", "Too many requests from this visitor. Wait a minute.");
    if (over(hourly, ip, Number(env.RATE_PER_HOUR) || 120, 3600000)) return fail(429, "VISITOR_RATE_LIMIT", "Too many requests from this visitor this hour. Try again later.");
    mark(hourly, ip);

    const len = Number(req.headers.get("Content-Length") || 0);
    if (len > MAX_BODY) return fail(413, "TOO_LARGE", "The attached file is too large.");
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY) return fail(413, "TOO_LARGE", "The attached file is too large.");

    const first = modelOk(env.MODEL) ? env.MODEL : asked;
    const fallbacks = (env.FALLBACK_MODELS === undefined ? ["gemini-flash-lite-latest"] : list(env.FALLBACK_MODELS)).filter(modelOk);
    const models = [first, ...fallbacks.filter(x => x !== first)];
    const query = m[2] === "streamGenerateContent" ? "?alt=sse" : "";

    let up, used;
    for (let i = 0; i < models.length; i++) {
      used = models[i];
      up = await fetch(`${UPSTREAM}/v1beta/models/${encodeURIComponent(used)}:${m[2]}${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
        body
      });
      // عند نفاد حصة نموذج أو عدم توفره ننتقل إلى البديل التالي
      if ((up.status === 429 || up.status === 404 || up.status === 503) && i < models.length - 1) {
        if (up.body) await up.body.cancel();
        continue;
      }
      break;
    }
    const h = new Headers(cors);
    h.set("Content-Type", up.headers.get("Content-Type") || "application/json; charset=utf-8");
    h.set("Cache-Control", "no-store");
    h.set("X-EcoBio-Model", used);
    h.set("Access-Control-Expose-Headers", "X-EcoBio-Model");
    return new Response(up.body, { status: up.status, headers: h });
  }
};
