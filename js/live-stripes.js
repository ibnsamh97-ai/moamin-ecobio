/* =====================================================================
   EcoBio AI — حرارة تكريت منذ 1940 (خطوط الاحترار)
   كل خط سنة كاملة من إعادة التحليل ERA5 لخلية تكريت، ولونه انحراف
   متوسطها عن معدل 1961–1990 بمقياس ±2.6σ كما في خطوط Ed Hawkins
   (#ShowYourStripes). الاتجاه بميل Sen واختبار Mann–Kendall المعدّل
   للارتباط الذاتي (Hamed & Rao 1998) من مكتبة المنصة.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, L = ECO.live;
  const root = () => document.getElementById("ws-root");
  if (!document.getElementById("view-stripes")) return;
  const { ico, esc, signed } = L;

  /* ألوان ColorBrewer (RdBu) التي يستعملها Hawkins: 9 زرقاء ثم 9 حمراء */
  const PAL = ["#08306b", "#08519c", "#2171b5", "#4292c6", "#6baed6", "#9ecae1", "#c6dbef", "#deebf7", "#f7fbff",
    "#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const PALRGB = PAL.map(hex);
  function colorOf(a, s) {
    const t = (U.clamp(a / (2.6 * s), -1, 1) + 1) / 2 * (PAL.length - 1), i = Math.min(PAL.length - 2, Math.floor(t)), f = t - i;
    const c = PALRGB[i].map((v, k) => Math.round(v + (PALRGB[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  const S = { data: null, yrs: [], base: null, birth: null, metric: "tmean", chart: null };
  const BASE = [1961, 1990];

  function compute(D) {
    const yrs = D.years;
    const b = yrs.filter(r => r.y >= BASE[0] && r.y <= BASE[1]).map(r => r.tmean);
    const mu = U.mean(b), sd = U.std(b);
    yrs.forEach(r => { r.anom = r.tmean - mu; r.col = colorOf(r.anom, sd); });
    const t = yrs.map(r => r.y), x = yrs.map(r => r.tmean);
    const TL = ECO.trend, hr = TL.hamedRao(x), sen = TL.sen(t, x, 0.05, hr.varS);
    const last = yrs[yrs.length - 1].y, recent = yrs.filter(r => r.y > last - 10), early = yrs.filter(r => r.y <= 1969);
    return { mu, sd, n: b.length, hr, sen, last, first: yrs[0].y, recent, early,
      dRecent: U.mean(recent.map(r => r.tmean)) - mu,
      d45e: U.mean(early.map(r => r.d45)), d45r: U.mean(recent.map(r => r.d45)),
      n30e: U.mean(early.map(r => r.n30)), n30r: U.mean(recent.map(r => r.n30)) };
  }

  const deg = (v, d) => `<bdi dir="ltr">${U.fmt(v, d)} °C</bdi>`;
  const pTxt = p => p < 0.001 ? "p < 0.001" : `p = ${U.fmt(p, 3)}`;

  function render() {
    const D = S.data, B = S.base, Y = D.yrs || D.years, box = root();
    const g = D.grid || {};
    box.innerHTML = `
      <section class="panel ws-hero">
        <div class="ws-tip" id="ws-tip" aria-live="polite"><span class="faint">مرّر على أي خط أو اضغطه لترى سنته</span></div>
        <div class="ws-bars" id="ws-bars" dir="ltr" role="img" aria-label="خطوط حرارة تكريت من ${B.first} إلى ${B.last}: ${Y.length} سنة، آخر عشر سنوات أحرّ من معدل 1961–1990 بـ ${U.fmt(B.dRecent, 1)} درجة">
          ${Y.map((r, i) => `<span style="background:${r.col}" data-i="${i}"></span>`).join("")}
          <div class="ws-life" id="ws-life" hidden><b>عمرك</b></div>
        </div>
        <div class="ws-axis" dir="ltr">${Y.filter(r => (r.y % 20 === 0 && B.last - r.y >= 8) || r.y === B.last).map(r => `<span style="left:${(Y.indexOf(r) + 0.5) / Y.length * 100}%">${r.y}</span>`).join("")}</div>
        <div class="ws-legend" dir="ltr"><span>أبرد</span><i style="background:linear-gradient(90deg,${PAL.join(",")})"></i><span>أحرّ</span></div>
        <div class="row ws-act">
          <button type="button" class="btn btn-sm" id="ws-png">${ico("i-download")}صورة للمشاركة</button>
          <button type="button" class="btn btn-sm" id="ws-csv">${ico("i-table")}البيانات CSV</button>
        </div>
      </section>

      <div class="ws-kpis">
        <div class="panel ws-kpi"><small>آخر 10 سنوات (${B.last - 9}–${B.last}) مقارنة بمعدل 1961–1990</small><b class="hot">${signed(B.dRecent, 1)}<i>°C</i></b><span>متوسط الحرارة السنوي في خلية تكريت</span></div>
        <div class="panel ws-kpi"><small>الاتجاه ${B.first}–${B.last} (ميل Sen)</small><b class="hot">${signed(B.sen.slope * 10, 2)}<i>°C كل 10 سنوات</i></b><span>فترة الثقة 95%: ${U.fmt(B.sen.lo * 10, 2)} إلى ${U.fmt(B.sen.hi * 10, 2)} · Mann–Kendall المعدّل ${pTxt(B.hr.p)}</span></div>
        <div class="panel ws-kpi"><small>أيام العظمى ≥ 45 درجة في السنة</small><b class="hot">${U.fmt(B.d45e, 1)} <i class="ar">→</i> ${U.fmt(B.d45r, 1)}</b><span>متوسط ${B.first}–1969 ← متوسط ${B.last - 9}–${B.last}</span></div>
        <div class="panel ws-kpi"><small>ليالٍ لا تنزل فيها الحرارة تحت 30 درجة</small><b class="hot">${U.fmt(B.n30e, 1)} <i class="ar">→</i> ${U.fmt(B.n30r, 1)}</b><span>متوسط ${B.first}–1969 ← متوسط ${B.last - 9}–${B.last}</span></div>
      </div>

      <section class="panel ws-birth">
        <div class="panel-h"><h3>${ico("i-user")}سنة ميلادك ضد السنة الماضية</h3><span class="sub">حسابك يبقى على جهازك</span></div>
        <form class="row ws-bform" id="ws-bform">
          <div class="field"><label for="ws-by">سنة ميلادك</label><input id="ws-by" class="input" type="number" inputmode="numeric" min="${B.first}" max="${B.last}" placeholder="مثلاً 1999" value="${S.birth || ""}"></div>
          <button type="submit" class="btn btn-primary">${ico("i-search")}قارن</button>
        </form>
        <div id="ws-bout"></div>
      </section>

      <section class="panel">
        <div class="panel-h"><h3>${ico("i-chart")}سنة بسنة</h3>
          <select id="ws-metric" class="input input-sm" aria-label="المتغير">
            <option value="tmean">متوسط الحرارة السنوي</option><option value="d45">أيام العظمى ≥ 45 درجة</option>
            <option value="d48">أيام العظمى ≥ 48 درجة</option><option value="n30">ليالٍ الصغرى ≥ 30 درجة</option><option value="hot">أعلى عظمى في السنة</option>
          </select></div>
        <div class="ws-chart"><canvas id="ws-cv" aria-label="رسم المتغير سنة بسنة"></canvas></div>
        <p class="faint" id="ws-cnote"></p>
      </section>

      <details class="panel ws-method">
        <summary>${ico("i-info")}المنهجية وحدود الدقة</summary>
        <ul>
          <li>البيانات: إعادة التحليل ERA5 من ECMWF / Copernicus (C3S) عبر Open-Meteo، خلية شبكة ${U.fmt(g.lat, 2)}° شمالاً و${U.fmt(g.lon, 2)}° شرقاً بارتفاع ${U.fmt(g.elevation, 0)} م، يومي بتوقيت بغداد، سنوات كاملة فقط (${Y.length} سنة).</li>
          <li>ERA5 نموذج يدمج أرصاد العالم كله في شبكة مربعاتها ≈ 25 كم، وليس قياس محرار في تكريت: الاتجاه عبر العقود موثوق، أما حرارة يوم بعينه فقد تختلف عن محطة المدينة، والعظمى في المناطق الحارة الجافة يميل ERA5 إلى تقديرها أقل من الواقع قليلاً، فأعداد أيام ≥ 45 درجة حدّ أدنى تقريبي.</li>
          <li>لون الخط: انحراف متوسط السنة عن معدل 1961–1990 (${deg(B.mu, 2)}، σ = ${deg(B.sd, 2)})، بمقياس من −2.6σ إلى +2.6σ كما في خطوط Ed Hawkins.</li>
          <li>الاتجاه: ميل Sen بفترة ثقة Gilbert، ومعنويته باختبار Mann–Kendall المعدّل للارتباط الذاتي (Hamed & Rao 1998)، محسوبة في متصفحك من الأرقام نفسها.</li>
        </ul>
        <p class="faint ws-refs">Hersbach, H. et al. (2020). The ERA5 global reanalysis. Q. J. R. Meteorol. Soc. 146: 1999–2049. · Hawkins, E. (2018). Warming stripes. Climate Lab Book. · Sen, P.K. (1968). JASA 63: 1379–1389. · Hamed, K.H. & Rao, A.R. (1998). J. Hydrol. 204: 182–196. · آخر تحديث للبيانات: ${esc((D.generated || "").slice(0, 10))}</p>
      </details>`;

    const bars = U.$("#ws-bars"), tip = U.$("#ws-tip");
    const show = i => {
      const r = Y[i]; if (!r) return;
      U.$$("#ws-bars > span.on").forEach(s => s.classList.remove("on")); bars.children[i].classList.add("on");
      tip.innerHTML = `<b>${r.y}</b><span>متوسطها ${deg(r.tmean, 1)} <em class="${r.anom > 0 ? "hot" : "cold"}">(<bdi dir="ltr">${signed(r.anom, 1)}</bdi> عن المعدل)</em></span><span>${r.d45} يوماً ≥ 45 درجة</span><span>أحرّ يوم ${deg(r.hot, 1)} في ${L.day(r.hot_date)}</span>`;
    };
    const idxAt = e => { const b = bars.getBoundingClientRect(); return Math.floor(U.clamp((e.clientX - b.left) / b.width, 0, 0.9999) * Y.length); };
    bars.addEventListener("pointermove", e => show(idxAt(e)));
    bars.addEventListener("pointerdown", e => show(idxAt(e)));
    U.$("#ws-png").onclick = png;
    U.$("#ws-csv").onclick = () => L.csv(`tikrit-era5-${B.first}-${B.last}.csv`, [["year", "t_mean_C", "anomaly_vs_1961_1990_C", "t_max_mean_C", "days_tmax_ge45", "days_tmax_ge48", "nights_tmin_ge30", "hottest_C", "hottest_date"]]
      .concat(Y.map(r => [r.y, r.tmean, +r.anom.toFixed(3), r.tmax, r.d45, r.d48, r.n30, r.hot, r.hot_date])));
    U.$("#ws-bform").onsubmit = e => { e.preventDefault(); birth(+U.$("#ws-by").value); };
    U.$("#ws-metric").value = S.metric;
    U.$("#ws-metric").onchange = e => { S.metric = e.target.value; chart(); };
    chart();
    if (S.birth) birth(S.birth, true);
  }

  function birth(y, quiet) {
    const B = S.base, Y = S.data.years, out = U.$("#ws-bout"), life = U.$("#ws-life");
    const r = Y.find(x => x.y === y), last = Y[Y.length - 1];
    if (!r) { out.innerHTML = `<p class="warnc">اكتب سنة بين ${B.first} و${B.last}.</p>`; life.hidden = true; return; }
    S.birth = y; U.store.set("ws_birth", y);
    const i = Y.indexOf(r);
    life.hidden = false; life.style.left = (i / Y.length * 100) + "%"; life.style.width = ((Y.length - i) / Y.length * 100) + "%";
    const win = (c, k) => Y.filter(x => Math.abs(x.y - c) <= 2).map(x => x[k]);
    const m0 = U.mean(win(y, "tmean")), m1 = U.mean(Y.slice(-5).map(x => x.tmean));
    const n0 = win(y, "tmean").length;
    const same = y === last.y;
    out.innerHTML = `
      <div class="ws-vs">
        <div class="ws-yr"><small>سنة ميلادك</small><b>${y}</b>
          <ul><li><span>متوسط الحرارة</span><b>${deg(r.tmean, 1)}</b></li><li><span>أيام ≥ 45 درجة</span><b>${r.d45}</b></li><li><span>ليالٍ ≥ 30 درجة</span><b>${r.n30}</b></li><li><span>أحرّ يوم</span><b>${deg(r.hot, 1)} · ${L.day(r.hot_date)}</b></li></ul></div>
        <div class="ws-yr now"><small>السنة الماضية</small><b>${last.y}</b>
          <ul><li><span>متوسط الحرارة</span><b>${deg(last.tmean, 1)}</b></li><li><span>أيام ≥ 45 درجة</span><b>${last.d45}</b></li><li><span>ليالٍ ≥ 30 درجة</span><b>${last.n30}</b></li><li><span>أحرّ يوم</span><b>${deg(last.hot, 1)} · ${L.day(last.hot_date)}</b></li></ul></div>
      </div>
      ${same ? "" : `<p class="ws-sum">سنة واحدة قد تكون باردة أو حارة بالصدفة، فالمقارنة العادلة بين متوسطين: متوسط ${n0} سنوات حول سنة ميلادك ${deg(m0, 2)}، ومتوسط آخر 5 سنوات ${deg(m1, 2)}، الفرق <b class="${m1 - m0 > 0 ? "hot" : "cold"}"><bdi dir="ltr">${signed(m1 - m0, 2)} °C</bdi></b>.</p>`}`;
    if (!quiet) out.scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "nearest" });
  }

  function chart() {
    const Y = S.data.years, B = S.base, k = S.metric, cv = U.$("#ws-cv");
    if (!window.Chart || !cv) return;
    if (S.chart) S.chart.destroy();
    const lab = { tmean: "متوسط الحرارة السنوي (°C)", d45: "أيام العظمى ≥ 45 درجة", d48: "أيام العظمى ≥ 48 درجة", n30: "ليالٍ الصغرى ≥ 30 درجة", hot: "أعلى عظمى في السنة (°C)" }[k];
    const ds = [];
    if (k === "tmean") {
      ds.push({ type: "bar", label: lab, data: Y.map(r => r.tmean), backgroundColor: Y.map(r => r.col), borderWidth: 0, barPercentage: 1, categoryPercentage: 1 });
      ds.push({ type: "line", label: "اتجاه Sen", data: Y.map(r => B.sen.intercept + B.sen.slope * r.y), borderColor: "#e4f1ed", borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0 });
    } else {
      ds.push({ type: k === "hot" ? "line" : "bar", label: lab, data: Y.map(r => r[k]), backgroundColor: k === "hot" ? "transparent" : Y.map(r => r.col), borderColor: "#ee7a4f", borderWidth: k === "hot" ? 1.6 : 0, pointRadius: 0, barPercentage: 1, categoryPercentage: 1 });
    }
    S.chart = new Chart(cv, {
      data: { labels: Y.map(r => r.y), datasets: ds },
      options: { interaction: { mode: "index", intersect: false }, plugins: { legend: { display: k === "tmean" } },
        scales: { x: { reverse: false, ticks: { maxRotation: 0, autoSkipPadding: 14 } }, y: { title: { display: true, text: lab }, beginAtZero: k !== "tmean" && k !== "hot" } } }
    });
    const tl = ECO.trend, x = Y.map(r => r[k]), hr = tl.hamedRao(x), sn = tl.sen(Y.map(r => r.y), x, 0.05, hr.varS);
    const unit = k === "tmean" || k === "hot" ? "°C" : "يوم";
    U.$("#ws-cnote").innerHTML = sn ? `الاتجاه ${B.first}–${B.last}: ${signed(sn.slope * 10, k === "tmean" || k === "hot" ? 2 : 1)} ${unit} كل 10 سنوات (فترة الثقة 95%: ${U.fmt(sn.lo * 10, 2)} إلى ${U.fmt(sn.hi * 10, 2)})، Mann–Kendall المعدّل ${pTxt(hr.p)}${hr.p < 0.05 ? "، اتجاه معنوي" : "، غير معنوي"}.` : "";
  }

  /* صورة 1600×900 للمشاركة */
  async function png() {
    const Y = S.data.years, B = S.base, W = 1600, H = 900, c = document.createElement("canvas");
    c.width = W; c.height = H; const x = c.getContext("2d");
    Y.forEach((r, i) => { x.fillStyle = r.col; x.fillRect(Math.floor(i * W / Y.length), 0, Math.ceil(W / Y.length) + 1, H); });
    const gr = x.createLinearGradient(0, H - 260, 0, H); gr.addColorStop(0, "rgba(5,17,22,0)"); gr.addColorStop(1, "rgba(5,17,22,0.86)");
    x.fillStyle = gr; x.fillRect(0, H - 260, W, 260);
    try { await document.fonts.ready; } catch (e) { /* */ }
    x.direction = "rtl"; x.textAlign = "right"; x.fillStyle = "#fff";
    x.font = '700 64px "Readex Pro", "IBM Plex Sans Arabic", Tahoma, sans-serif';
    x.fillText(`حرارة تكريت ${B.first}–${B.last}`, W - 60, H - 120);
    x.font = '400 30px "IBM Plex Sans Arabic", Tahoma, sans-serif';
    x.fillText(`آخر 10 سنوات أحرّ من معدل 1961–1990 بـ ${U.fmt(B.dRecent, 1)} °C · ERA5 · EcoBio AI – جامعة تكريت`, W - 60, H - 62);
    c.toBlob(b => b && L.save(b, `tikrit-stripes-${B.first}-${B.last}.png`), "image/png");
  }

  let loading = false;
  async function load() {
    if (S.data || loading) return; loading = true;
    root().innerHTML = `<div class="panel lv-load"><span class="spinner"></span>جارٍ تحميل ${new Date().getFullYear() - 1940} سنة من الحرارة…</div>`;
    try {
      const D = await L.get("climate-tikrit.json");
      if (!D.years || D.years.length < 30) throw new Error("no data");
      S.data = D; S.base = compute(D); S.birth = U.store.get("ws_birth", null);
      render();
    } catch (e) {
      L.fail(root(), "تعذّر تحميل بيانات الحرارة. تحقّق من الاتصال وأعد فتح الصفحة.");
    } finally { loading = false; }
  }
  ECO.views.stripes = { init: load, show() { if (!S.data) load(); else if (S.chart) S.chart.resize(); } };
})();
