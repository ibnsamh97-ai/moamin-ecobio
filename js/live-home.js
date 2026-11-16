/* =====================================================================
   EcoBio AI — بطاقة «صلاح الدين الحية» في الرئيسية
   خلفيتها خطوط حرارة تكريت الحقيقية، وأرقامها من ملفات data/live نفسها.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  const box = document.getElementById("lv-home");
  if (!box || !L) return;
  const { ico } = L;
  let done = false;
  async function fill() {
    if (done) return; done = true;
    const get = n => L.get(n).catch(() => null);
    const [cl, fl, wc, tle] = await Promise.all([get("climate-tikrit.json"), get("flares.json"), get("water-change.json"), get("tle.json")]);
    const F = [];
    if (cl && cl.years && cl.years.length > 40) {
      const Y = cl.years, b = Y.filter(r => r.y >= 1961 && r.y <= 1990), mu = U.mean(b.map(r => r.tmean)), sd = U.std(b.map(r => r.tmean));
      const PAL = ["#08306b", "#2171b5", "#6baed6", "#c6dbef", "#f7fbff", "#fff5f0", "#fcbba1", "#fb6a4a", "#cb181d", "#67000d"];
      const col = a => PAL[Math.round(U.clamp((a / (2.6 * sd) + 1) / 2, 0, 1) * (PAL.length - 1))];
      U.$("#lvh-stripes").innerHTML = Y.map(r => `<i style="background:${col(r.tmean - mu)}"></i>`).join("");
      const d = U.mean(Y.slice(-10).map(r => r.tmean)) - mu;
      F.push(["stripes", "i-thermo", `<bdi dir="ltr">+${U.fmt(d, 1)} °C</bdi>`, "تكريت آخر 10 سنوات مقارنة بـ 1961–1990"]);
    }
    const site = fl && fl.sites ? fl.sites.filter(s => s.in_prov).sort((a, b) => b.days - a.days)[0] : null;
    if (site) F.push(["flares", "i-flame", `${site.days} يوماً`, `رأت الأقمار ناراً في ${site.name || "موقع نفطي"} خلال سنة`]);
    const th = wc && wc.regions ? wc.regions.find(r => r.id === "tharthar") : null;
    if (th) F.push(["waterloss", "i-drop", `<bdi dir="ltr">${U.fmt(th.lost_km2 + th.perm_to_seasonal_km2, 0)} km²</bdi>`, "من ماء الثرثار ضاع أو صار يجفّ (1984–2021)"]);
    if (tle && tle.sats) F.push(["sats", "i-orbit", `${tle.sats.length} أقمار`, "تمر فوق تكريت؛ اعرف متى يصوّرها كل منها"]);
    U.$("#lvh-facts").innerHTML = F.map(([h, i, v, t]) => `<a class="lvh-f" href="#${h}">${ico(i)}<b>${v}</b><span>${t}</span></a>`).join("");
  }
  const go = () => { if (document.body.dataset.view === "home") fill(); };
  window.addEventListener("hashchange", go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(go, 300)); else setTimeout(go, 300);
})();
