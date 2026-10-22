/* =====================================================================
   EcoBio AI — جسر التطبيق (أندرويد وiOS عبر Capacitor)
   على الويب لا يفعل شيئاً. داخل التطبيق يضيف:
   حفظ الملفات ومشاركتها، تحديد أقرب قضاء، زر الرجوع، والتنبيه اليومي بتوقّع الهواء.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const Cap = window.Capacitor;
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  ECO.isApp = native;

  /* حفظ ملف: على الويب تنزيل عادي، وفي التطبيق كتابة في الجهاز ثم نافذة المشاركة */
  ECO.saveBlob = (blob, name) => {
    if (native) return ECO.native.save(blob, name);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  if (!native) return;

  const P = Cap.Plugins;
  document.documentElement.classList.add("is-app");
  const LATEST = "https://raw.githubusercontent.com/ibnsamh97-ai/moamin-ecobio/db/latest.json";

  const blobToB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
  const safeName = n => String(n || "ecobio").replace(/[\\/:*?"<>|]/g, "-");

  ECO.native = {
    async save(blob, name) {
      try {
        const data = await blobToB64(blob);
        const w = await P.Filesystem.writeFile({ path: safeName(name), data, directory: "CACHE" });
        await P.Share.share({ title: safeName(name), files: [w.uri], dialogTitle: "احفظ الملف أو شاركه" }).catch(() => P.Share.share({ title: safeName(name), url: w.uri }));
      } catch (e) {
        if (!/cancel/i.test(String(e && e.message))) U.toast("تعذّر حفظ الملف: " + (e && e.message || e));
      }
    },
    async locate() {
      const st = await P.Geolocation.checkPermissions();
      if (st.coarseLocation !== "granted" && st.location !== "granted") {
        const r = await P.Geolocation.requestPermissions({ permissions: ["coarseLocation"] });
        if (r.coarseLocation !== "granted" && r.location !== "granted") throw new Error("denied");
      }
      const p = await P.Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
      return { lat: p.coords.latitude, lon: p.coords.longitude };
    },
    share(data) { return P.Share.share(data); }
  };

  /* التنزيلات المبنية على روابط blob أو data في بقية الأدوات تمر عبر الحفظ الأصلي */
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute("download") && /^(blob:|data:)/.test(this.href)) {
      const name = this.getAttribute("download") || "ecobio";
      fetch(this.href).then(r => r.blob()).then(b => ECO.native.save(b, name));
      return;
    }
    return origClick.call(this);
  };
  // واجهة المشاركة في الويب غير متوفرة داخل WebView: نمررها إلى المشاركة الأصلية
  if (!navigator.share) navigator.share = d => P.Share.share({ title: d.title, text: d.text, url: d.url });
  // PDF من jsPDF
  const patchPdf = () => {
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J || J.__eco) return;
    J.__eco = true;
    const orig = J.API.save;
    J.API.save = function (name) { try { ECO.native.save(this.output("blob"), name || "ecobio.pdf"); } catch (e) { return orig && orig.apply(this, arguments); } return this; };
  };
  patchPdf(); window.addEventListener("load", patchPdf);

  /* زر الرجوع في أندرويد: يرجع داخل المنصة، ويخرج من الرئيسية */
  if (P.App) P.App.addListener("backButton", () => {
    const pal = document.getElementById("palette"), dr = document.getElementById("drawer");
    if (pal && !pal.hidden) { pal.hidden = true; return; }
    if (dr && !dr.hidden) { dr.hidden = true; return; }
    const open = document.querySelector(".modal:not([hidden])"); if (open) { open.hidden = true; return; }
    const v = ECO.router && ECO.router.current();
    if (v && v !== "home") history.length > 1 ? history.back() : ECO.go("home");
    else P.App.exitApp();
  });
  if (P.StatusBar) { P.StatusBar.setStyle({ style: "DARK" }).catch(() => {}); P.StatusBar.setBackgroundColor && P.StatusBar.setBackgroundColor({ color: "#051116" }).catch(() => {}); }

  /* ------------------------------------------------------------------
     التنبيه اليومي بتوقّع PM2.5 لقضاء يختاره المستخدم (معطّل حتى يفعّله)
  ------------------------------------------------------------------ */
  const NID = 7301;
  const getCfg = () => U.store.get("dailyAlert", { on: false, d: U.store.get("dbDistrict", "tikrit"), h: 7 });
  async function schedule() {
    const cfg = getCfg();
    try { await P.LocalNotifications.cancel({ notifications: [{ id: NID }] }); } catch (e) { /* */ }
    if (!cfg.on) return;
    let L = null;
    try { const r = await fetch(LATEST + "?t=" + Math.floor(Date.now() / 600000), { cache: "no-store" }); if (r.ok) { L = await r.json(); U.store.set("latestCache", L); } } catch (e) { /* دون اتصال */ }
    if (!L) L = U.store.get("latestCache", null);
    if (!L || !L.districts) return;
    const d = L.districts.find(x => x.id === cfg.d) || L.districts[0];
    const at = new Date(); at.setDate(at.getDate() + 1); at.setHours(cfg.h, 30, 0, 0);
    const day = U.isoDate(at);
    const f = (d.forecast || []).find(x => x.for_date === day) || (d.forecast || [])[0];
    const v = f && f.value, who = 15;
    const body = f ? `متوسط PM2.5 المتوقّع اليوم في ${d.name_ar}: ${Math.round(v)} µg/m³ ${v > who ? `(${(v / who).toFixed(1)} ضعف حد الصحة العالمية)` : "(ضمن حد الصحة العالمية)"}. اضغط للتفاصيل.`
      : `آخر قراءة PM2.5 في ${d.name_ar}: ${d.air ? Math.round(d.air.pm2_5) : "—"} µg/m³. اضغط للتفاصيل.`;
    await P.LocalNotifications.schedule({ notifications: [{ id: NID, title: v > 37.5 ? "هواء غير صحي متوقّع اليوم" : "توقّع الهواء اليوم", body, schedule: { at, allowWhileIdle: true }, extra: { d: d.id }, smallIcon: "ic_stat_ecobio", iconColor: "#4FC8DC" }] });
  }
  async function setAlert(on, d) {
    const cfg = getCfg();
    if (on) {
      let p = await P.LocalNotifications.checkPermissions();
      if (p.display !== "granted") p = await P.LocalNotifications.requestPermissions();
      if (p.display !== "granted") { U.toast("لم يُسمح بالإشعارات. فعّلها من إعدادات الجهاز."); on = false; }
    }
    U.store.set("dailyAlert", Object.assign(cfg, { on, d: d || cfg.d }));
    await schedule();
    paintAlert();
  }
  function paintAlert() {
    const host = document.getElementById("db-status"); if (!host) return;
    let b = document.getElementById("db-alert");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "db-alert"; b.className = "btn btn-ghost btn-sm"; host.appendChild(b); }
    const cfg = getCfg();
    b.innerHTML = `<svg aria-hidden="true"><use href="#i-spark"/></svg>${cfg.on ? "التنبيه اليومي مفعّل" : "فعّل التنبيه اليومي"}`;
    b.setAttribute("aria-pressed", String(!!cfg.on));
    b.onclick = () => {
      const cur = U.store.get("dbDistrict", cfg.d);
      const name = (document.querySelector(`#db-ribbon [data-d="${cur}"] b`) || {}).textContent || cur;
      setAlert(!cfg.on || cfg.d !== cur, cur).then(() => { if (getCfg().on) U.toast(`سيصلك كل صباح توقّع الهواء في ${name}`); });
    };
  }
  new MutationObserver(() => { if (document.getElementById("db-status") && document.getElementById("db-status").childElementCount && !document.getElementById("db-alert")) paintAlert(); })
    .observe(document.body, { childList: true, subtree: true });
  if (P.LocalNotifications) {
    P.LocalNotifications.addListener("localNotificationActionPerformed", e => {
      const d = e && e.notification && e.notification.extra && e.notification.extra.d;
      location.hash = d ? `districts&d=${d}&t=overview` : "districts";
    });
    schedule().catch(() => {});
    if (P.App) P.App.addListener("resume", () => schedule().catch(() => {}));
  }
})();
