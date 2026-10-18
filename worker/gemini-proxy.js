/* =====================================================================
   EcoBio AI — خادم Gemini المشترك (Cloudflare Worker)
   ---------------------------------------------------------------------
   يحفظ مفتاح Gemini سراً على خوادم Cloudflare، ويمرّر طلبات موقعك فقط
   إلى Google، فيعمل المساعد الذكي عند كل من يفتح الموقع دون أن يظهر
   المفتاح لأحد.

   المتغيرات (Worker → Settings → Variables and Secrets):
     GEMINI_KEY       نوعه Secret  — مفتاح Gemini من Google AI Studio (إلزامي)
     ALLOWED_ORIGINS  نوعه Text    — رابط موقعك بلا مسار، مثل:
                                     https://username.github.io
                                     (عدة روابط تُفصل بفاصلة)          (إلزامي)
     RATE_PER_MIN     نوعه Text    — أقصى طلبات للزائر الواحد في الدقيقة (اختياري، الافتراضي 10)
     MODEL            نوعه Text    — فرض نموذج واحد لكل الطلبات (اختياري)
     FALLBACK_MODELS  نوعه Text    — نماذج بديلة عند نفاد حصة النموذج الأول،
                                     مفصولة بفاصلة (اختياري، الافتراضي gemini-flash-lite-latest)
   ===================================================================== */

const UPSTREAM = "https://generativelanguage.googleapis.com";
const MAX_BODY = 14 * 1024 * 1024;           // حد حجم الطلب (صور وملفات PDF)
const MODEL_RE = /^gemini-[a-z0-9.\-]+$/i;   // نماذج Gemini النصية فقط
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

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    // يقبل الرابط كاملاً أو أصله فقط: https://user.github.io/ecobio-ai ← https://user.github.io
    const allowed = list(env.ALLOWED_ORIGINS).map(o => { if (o === "*") return o; try { return new URL(o).origin; } catch (e) { return o; } });
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
      status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
    const fail = (status, code, message) => reply(status, { error: { code: status, status: code, message } });

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    // فحص سريع من المتصفح: افتح رابط الخادم مباشرة لترى حالته (لا يكشف المفتاح)
    if (req.method === "GET" && (path === "/" || path === "/health")) {
      return reply(200, {
        service: "EcoBio AI – Gemini shared server",
        key_configured: Boolean(env.GEMINI_KEY),
        allowed_origins: allowed,
        ok: Boolean(env.GEMINI_KEY) && allowed.length > 0
      });
    }

    if (!okOrigin) return fail(403, "ORIGIN_NOT_ALLOWED", "This server only answers requests from the EcoBio AI site. Add the site origin to ALLOWED_ORIGINS.");
    if (!env.GEMINI_KEY) return fail(500, "GEMINI_KEY_MISSING", "GEMINI_KEY secret is not set on the Worker.");

    /* قائمة النماذج */
    if (req.method === "GET" && path === "/v1beta/models") {
      const up = await fetch(`${UPSTREAM}/v1beta/models?pageSize=200`, { headers: { "x-goog-api-key": env.GEMINI_KEY } });
      return new Response(up.body, { status: up.status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    }

    /* التوليد */
    const m = path.match(/^\/v1beta\/models\/([^/:]+):(generateContent|streamGenerateContent)$/);
    if (req.method !== "POST" || !m) return fail(404, "NOT_ALLOWED", "Only model listing and content generation are available.");
    const asked = decodeURIComponent(m[1]);
    if (!MODEL_RE.test(asked)) return fail(400, "MODEL_NOT_ALLOWED", "Only Gemini text models are available on this server.");

    const ip = req.headers.get("CF-Connecting-IP") || "local";
    if (limited(ip, Number(env.RATE_PER_MIN) || 10)) return fail(429, "VISITOR_RATE_LIMIT", "Too many requests from this visitor. Wait a minute.");

    const len = Number(req.headers.get("Content-Length") || 0);
    if (len > MAX_BODY) return fail(413, "TOO_LARGE", "The attached file is too large.");
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY) return fail(413, "TOO_LARGE", "The attached file is too large.");

    const first = MODEL_RE.test(env.MODEL || "") ? env.MODEL : asked;
    const fallbacks = (env.FALLBACK_MODELS === undefined ? ["gemini-flash-lite-latest"] : list(env.FALLBACK_MODELS)).filter(x => MODEL_RE.test(x));
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
