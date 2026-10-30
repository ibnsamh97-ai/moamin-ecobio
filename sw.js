/* EcoBio AI — عامل الخدمة: يحفظ واجهة المنصة لتفتح دون إنترنت.
   الواجهة: الشبكة أولاً ثم النسخة المحفوظة. الملفات الثابتة: المحفوظ أولاً مع تحديثه في الخلفية.
   لا يتدخل في طلبات البيانات الحية (Open-Meteo وغيرها)؛ قاعدة الأقضية لها ذاكرتها الخاصة. */
const V = "ecobio-shell-v10";
const CORE = ["./", "index.html", "css/style.css", "css/shell.css", "css/tools.css", "css/motion.css", "manifest.webmanifest", "assets/icons/pwa-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ecobio-shell-") && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put("index.html", c)); return res; }).catch(() => caches.match("index.html")));
    return;
  }
  if (/\.(js|css|png|webp|jpg|svg|woff2?|wasm|json|glb|csv)$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
