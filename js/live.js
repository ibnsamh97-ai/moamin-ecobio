/* =====================================================================
   EcoBio AI — «صلاح الدين الحية»: أدوات مشتركة لصفحات القسم
   البيانات الثابتة (حرارة 1940، المدارات، تغيّر الماء) ملفات JSON صغيرة
   في data/live/ يحسبها GitHub Actions (etl/live/build.py)، والحية
   (الريح والغبار) تُجلب من Open-Meteo مباشرة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const cache = new Map();

  const L = ECO.live = {
    /* ملف من data/live مع ذاكرة داخل الصفحة */
    get(name) {
      if (!cache.has(name)) {
        const p = fetch("data/live/" + name, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
        p.catch(() => cache.delete(name));
        cache.set(name, p);
      }
      return cache.get(name);
    },
    ico: (id, cls) => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="#${id}"/></svg>`,
    esc: s => U.esc(s == null ? "" : String(s)),
    save(blob, name) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    },
    csv(name, rows) {
      const q = c => { const s = c == null || (typeof c === "number" && !isFinite(c)) ? "" : String(c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      L.save(new Blob(["﻿" + rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), name);
    },
    /* رسالة خطأ موحّدة داخل الصفحة */
    fail(box, msg) { if (box) box.innerHTML = `<div class="panel lv-fail">${L.ico("i-info")}<p>${L.esc(msg)}</p></div>`; },
    /* تاريخ عربي بأرقام لاتينية */
    day: iso => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z")),
    dayY: iso => new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z")),
    signed: (v, d = 1) => (v > 0 ? "+" : v < 0 ? "−" : "") + U.fmt(Math.abs(v), d)
  };
})();
