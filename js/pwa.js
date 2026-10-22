/* تثبيت المنصة كتطبيق ويب (PWA) وتسجيل عامل الخدمة. لا يعمل داخل تطبيق أندرويد/iOS. */
(function () {
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return;
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
