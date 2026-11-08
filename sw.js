/* EcoBio AI — عامل الخدمة: يحفظ واجهة المنصة لتفتح دون إنترنت.
   الصفحة وملفات الكود (js وcss وjson): الشبكة أولاً ثم النسخة المحفوظة، حتى لا تجتمع صفحة جديدة مع كود قديم بعد أي تحديث.
   الصور والخطوط والنماذج الكبيرة: المحفوظ أولاً مع تحديثه في الخلفية.
   لا يتدخل في طلبات البيانات الحية (Open-Meteo وغيرها)؛ قاعدة الأقضية لها ذاكرتها الخاصة. */
const V = "ecobio-shell-v22";
const CORE = ["./", "index.html", "css/style.css", "css/shell.css", "css/tools.css", "css/motion.css", "css/redesign.css", "manifest.webmanifest", "assets/icons/pwa-192.png"];
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
  if (/\.(js|css|json|webmanifest)$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then(c => {
      const net = fetch(r, { cache: "no-cache" }).then(res => { if (res.ok) c.put(r, res.clone()); return res; });
      const slow = new Promise(ok => setTimeout(ok, 6000)).then(() => c.match(r)).then(hit => hit || net);
      return Promise.race([net.catch(() => c.match(r).then(hit => hit || Promise.reject(new Error("offline")))), slow]);
    }));
    return;
  }
  if (/\.(png|webp|jpg|svg|woff2?|wasm|glb|csv)$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
