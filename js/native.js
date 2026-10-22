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
  const getCfg = () => Object.assign({ on: false, d: U.store.get("dbDistrict", "tikrit"), h: 7, mode: "daily", air: true, dust: true, low: true }, U.store.get("dailyAlert", {}));
  /* يبني رسالة الصباح؛ في وضع «الشروط» لا يُرسل شيئاً إذا لم يتحقق أي شرط */
  function message(d, cfg, day) {
    const f = (d.forecast || []).find(x => x.for_date === day) || (d.forecast || [])[0], v = f && f.value;
    const dp = (d.dust || []).find(x => x.date === day) || (d.dust || [])[0];
    const rv = d.river, out = [];
    const unhealthy = U.isNum(v) && v > 37.5, dusty = dp && dp.prob >= 0.2, low = rv && U.isNum(rv.pct) && rv.pct < 10;
    if (cfg.mode === "daily" || (cfg.air && unhealthy)) out.push(f ? `PM2.5 المتوقّع ${Math.round(v)} µg/m³${v > 15 ? ` (${(v / 15).toFixed(1)} ضعف حد الصحة العالمية)` : ""}` : `آخر PM2.5 ${d.air ? Math.round(d.air.pm2_5) : "—"} µg/m³`);
    if ((cfg.mode === "daily" && dp) || (cfg.dust && dusty)) out.push(`احتمال غبار فعلي ${Math.round(100 * dp.prob)}%`);
    if ((cfg.mode === "daily" && rv) || (cfg.low && low)) out.push(`تصريف دجلة ${Math.round(rv.q)} م³/ثا${low ? " (من أدنى 10% لهذا الشهر)" : ""}`);
    if (!out.length) return null;
    const title = dusty && cfg.dust ? "غبار مرجّح اليوم" : unhealthy ? "هواء غير صحي متوقّع اليوم" : low && cfg.low ? "تصريف دجلة منخفض" : "حالة البيئة اليوم";
    return { title, body: `${d.name_ar}: ${out.join(" · ")}. اضغط للتفاصيل.` };
  }
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
    const m = message(d, cfg, U.isoDate(at)); if (!m) return;
    await P.LocalNotifications.schedule({ notifications: [{ id: NID, title: m.title, body: m.body, schedule: { at, allowWhileIdle: true }, extra: { d: d.id }, smallIcon: "ic_stat_ecobio", iconColor: "#4FC8DC" }] });
  }
  async function setAlert(patch) {
    const cfg = Object.assign(getCfg(), patch);
    if (cfg.on) {
      let p = await P.LocalNotifications.checkPermissions();
      if (p.display !== "granted") p = await P.LocalNotifications.requestPermissions();
      if (p.display !== "granted") { U.toast("لم يُسمح بالإشعارات. فعّلها من إعدادات الجهاز."); cfg.on = false; }
    }
    U.store.set("dailyAlert", cfg);
    await schedule();
    paintAlert();
  }
  function paintAlert() {
    const host = document.getElementById("db-status"); if (!host) return;
    let b = document.getElementById("db-alert");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "db-alert"; b.className = "btn btn-ghost btn-sm"; host.appendChild(b); }
    const cfg = getCfg();
    b.innerHTML = `<svg aria-hidden="true"><use href="#i-spark"/></svg>${cfg.on ? "التنبيهات مفعّلة" : "التنبيهات"}`;
    b.setAttribute("aria-pressed", String(!!cfg.on));
    b.onclick = () => {
      let box = document.getElementById("db-alert-box");
      if (box) { box.remove(); return; }
      const cur = U.store.get("dbDistrict", cfg.d), name = (document.querySelector(`#db-ribbon [data-d="${cur}"] b`) || {}).textContent || cur, c = getCfg();
      box = document.createElement("div"); box.id = "db-alert-box"; box.className = "panel db-alert-box";
      box.innerHTML = `<b>تنبيه الصباح لقضاء ${name}</b>
        <label><input type="radio" name="al-mode" value="daily" ${c.mode === "daily" ? "checked" : ""}> ملخص كل يوم</label>
        <label><input type="radio" name="al-mode" value="cond" ${c.mode !== "daily" ? "checked" : ""}> فقط عندما:</label>
        <div class="al-conds"><label><input type="checkbox" id="al-air" ${c.air ? "checked" : ""}> يُتوقّع هواء غير صحي (PM2.5 فوق 37.5)</label>
        <label><input type="checkbox" id="al-dust" ${c.dust ? "checked" : ""}> احتمال غبار فعلي 20% أو أكثر</label>
        <label><input type="checkbox" id="al-low" ${c.low ? "checked" : ""}> تصريف دجلة ضمن أدنى 10% لهذا الشهر</label></div>
        <label>الساعة <select id="al-h" class="input">${[5, 6, 7, 8, 9].map(h => `<option value="${h}" ${h === c.h ? "selected" : ""}>${h}:30 صباحاً</option>`).join("")}</select></label>
        <div class="row"><button type="button" class="btn btn-sm" id="al-save">${c.on ? "حفظ" : "تفعيل"}</button>${c.on ? `<button type="button" class="btn btn-ghost btn-sm" id="al-off">إيقاف</button>` : ""}</div>
        <small class="muted">يُحدَّث التنبيه كلما فتحت التطبيق، من آخر بيانات القاعدة.</small>`;
      host.after(box);
      box.querySelector("#al-save").onclick = () => setAlert({ on: true, d: cur, mode: box.querySelector('[name="al-mode"]:checked').value, air: box.querySelector("#al-air").checked, dust: box.querySelector("#al-dust").checked, low: box.querySelector("#al-low").checked, h: +box.querySelector("#al-h").value })
        .then(() => { box.remove(); if (getCfg().on) U.toast(`تم ضبط تنبيه ${name}`); });
      const off = box.querySelector("#al-off"); if (off) off.onclick = () => setAlert({ on: false }).then(() => box.remove());
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
