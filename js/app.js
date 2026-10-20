/* =====================================================================
   EcoBio AI — التشغيل: شاشة الترحيب (3 ثوانٍ)، التنقل، أول تحميل للبيانات
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;

  function splash() {
    const el = U.$("#splash"), msg = U.$("#splash-status");
    // شاشة الترحيب مرة واحدة في الجلسة، وفقط عند فتح الرئيسية؛ الروابط المباشرة لأداة تفتح فوراً
    const hash = (location.hash || "#home").slice(1).split("=")[0];
    let seen = false; try { seen = sessionStorage.getItem("ecobio:splashed") === "1"; sessionStorage.setItem("ecobio:splashed", "1"); } catch (e) { /* التخزين غير متاح */ }
    if (seen || (hash && hash !== "home")) { el.remove(); return; }
    const steps = ["الاتصال بالأقمار الصناعية…", "جلب بيانات Copernicus CAMS…", "تهيئة نموذج التعلم الآلي…", "تجهيز المشاهد ثلاثية الأبعاد…"];
    let i = 0; msg.textContent = steps[0];
    const iv = setInterval(() => { i = Math.min(i + 1, steps.length - 1); msg.textContent = steps[i]; }, 720);
    setTimeout(() => { clearInterval(iv); el.classList.add("done"); setTimeout(() => el.remove(), 700); }, 3000);
  }

  function about() {
    const P = ECO.profile();
    U.$("#ab-title").textContent = P.titleAr;
    U.$("#ab-kv").innerHTML = [["اسم الطالب", P.student], ["المشرف", P.supervisor], ["الجامعة", P.university], ["الكلية", P.college], ["القسم", P.department], ["التخصص", P.specialty], ["العام الدراسي", P.year]]
      .map(([k, v]) => `<dt>${k}</dt><dd>${U.esc(v)}</dd>`).join("");
    U.$("#foot-l").textContent = `${P.name} · ${P.department} · ${P.college} · ${P.university} · ${P.year}`;
  }

  function start() {
    splash();
    ECO.initCore();
    about();
    ECO.router.start();
    ECO.data.current().catch(e => console.error(e));
    if (U.store.get("autorefresh", true)) ECO.data.startAutoRefresh();
    ECO.bus.emit("gemini");
    ECO.bus.emit("ready");
    ECO.bus.on("profile", about);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
