/* =====================================================================
   EcoBio AI — التحليل الذكي: تعلم آلي (Ridge)، كشف الشذوذ، الارتباط، اتجاه المصادر
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, D = ECO.data;
  const A = { anomKey: "pm10", res: null, running: false };
  const HORIZON = 6; // ساعات التنبؤ للأمام

  /* ---------- رياضيات ---------- */
  function solve(M, b) { // حذف غاوس مع المحور الجزئي
    const n = b.length, a = M.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      [a[c], a[p]] = [a[p], a[c]];
      const pv = a[c][c] || 1e-12;
      for (let r = 0; r < n; r++) { if (r === c) continue; const f = a[r][c] / pv; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; }
    }
    return a.map((r, i) => r[n] / (r[i] || 1e-12));
  }
  function ridge(X, y, lambda = 1) {
    const p = X[0].length, mu = [], sd = [];
    for (let j = 0; j < p; j++) { const col = X.map(r => r[j]); mu[j] = U.mean(col); sd[j] = U.std(col) || 1; }
    const Z = X.map(r => [1, ...r.map((v, j) => (v - mu[j]) / sd[j])]);
    const q = p + 1, XtX = Array.from({ length: q }, () => Array(q).fill(0)), Xty = Array(q).fill(0);
    Z.forEach((r, i) => { for (let a = 0; a < q; a++) { Xty[a] += r[a] * y[i]; for (let b = 0; b < q; b++) XtX[a][b] += r[a] * r[b]; } });
    for (let a = 1; a < q; a++) XtX[a][a] += lambda;
    const beta = solve(XtX, Xty);
    return { beta, mu, sd, predict: r => beta[0] + r.reduce((s, v, j) => s + beta[j + 1] * (v - mu[j]) / sd[j], 0) };
  }
  const metrics = (y, p) => {
    const n = y.length, my = U.mean(y);
    const sse = y.reduce((s, v, i) => s + (v - p[i]) ** 2, 0), sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
    return { r2: 1 - sse / sst, rmse: Math.sqrt(sse / n), mae: y.reduce((s, v, i) => s + Math.abs(v - p[i]), 0) / n };
  };
  function pearson(a, b) {
    const xs = [], ys = []; a.forEach((v, i) => { if (U.isNum(v) && U.isNum(b[i])) { xs.push(v); ys.push(b[i]); } });
    if (xs.length < 10) return NaN;
    const mx = U.mean(xs), my = U.mean(ys); let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    return sxy / Math.sqrt(sxx * syy);
  }
  function linSlope(ys) { const xs = ys.map((_, i) => i), mx = U.mean(xs), my = U.mean(ys); let n = 0, d = 0; xs.forEach((x, i) => { n += (x - mx) * (ys[i] - my); d += (x - mx) ** 2; }); return n / d; }

  /* ---------- التحليل ---------- */
  async function run() {
    if (A.running) return; A.running = true;
    const btn = U.$("#an-run"); btn.disabled = true; btn.lastChild.textContent = "جارٍ التحليل…";
    const id = U.$("#an-station").value;
    try {
      const air = await D.air(id, 30, 2), wx = await D.weather(id, 30, 2);
      if (!air || !wx) { U.$("#an-notice").innerHTML = ECO.offlineNotice() || `<div class="notice warn">تعذّر جلب بيانات الأرصاد الجوية الآن. أعد المحاولة بعد قليل.</div>`; throw new Error("OFFLINE"); }
      const wmap = new Map(wx.time.map((t, i) => [t, i]));
      const W = k => air.time.map(t => { const i = wmap.get(t); return i == null ? NaN : wx[k][i]; });
      const T = { temp: W("temperature_2m"), rh: W("relative_humidity_2m"), ws: W("wind_speed_10m"), wd: W("wind_direction_10m") };
      const now = air.nowIdx;
      const past = k => (air[k] || []).slice(0, now + 1);

      // متوسطات يومية
      const days = new Map();
      air.time.slice(0, now + 1).forEach((t, i) => {
        const day = new Date((t + 3 * 3600) * 1000).toISOString().slice(0, 10);
        if (!days.has(day)) days.set(day, { t, idx: [] });
        days.get(day).idx.push(i);
      });
      const dayList = [...days.values()].filter(d => d.idx.length >= 12);
      const daily = k => dayList.map(d => U.mean(d.idx.map(i => air[k][i])));

      // إحصاءات
      const pm25d = daily("pm2_5"), pm10 = past("pm10");
      const maxI = pm10.reduce((b, v, i) => (U.isNum(v) && v > (pm10[b] || -1) ? i : b), 0);
      const exceed = pm25d.filter(v => v > 15).length;
      const pm10d = daily("pm10"), slope = linSlope(pm10d.map(v => (U.isNum(v) ? v : U.mean(pm10d))));
      const trendPct = (slope * 7) / U.mean(pm10d) * 100;
      const stats = { meanPM25: U.mean(past("pm2_5")), maxPM10: pm10[maxI], maxPM10t: air.time[maxI], exceed, days: pm25d.length, trendPct };

      // مؤشر المخاطر (آخر 24 ساعة)
      const W8 = { pm2_5: 0.35, pm10: 0.25, nitrogen_dioxide: 0.15, sulphur_dioxide: 0.15, ozone: 0.10 };
      const last24 = k => U.mean(air[k].slice(Math.max(0, now - 23), now + 1));
      const parts = Object.entries(W8).map(([k, w]) => { const m = ECO.AIR.find(a => a.key === k), c = last24(k), r = Math.min((c / m.who) || 0, 3) / 3; return { k, w, c, who: m.who, name: m.short, contrib: 100 * w * r }; });
      const risk = parts.reduce((s, p) => s + p.contrib, 0);

      // كشف الشذوذ
      const anomalies = {};
      ["pm10", "pm2_5", "dust", "nitrogen_dioxide", "sulphur_dioxide"].forEach(k => {
        const ys = daily(k), med = U.median(ys), mad = U.median(ys.map(v => Math.abs(v - med))) || 1e-6;
        anomalies[k] = { ys, z: ys.map(v => 0.6745 * (v - med) / mad), med };
      });

      // نموذج التعلم الآلي: PM10 بعد 6 ساعات
      const feats = ["PM10 الحالي", "الغبار الحالي", "سرعة الرياح", "الرطوبة النسبية", "درجة الحرارة", "اتجاه الرياح (sin)", "اتجاه الرياح (cos)", "الساعة (sin)", "الساعة (cos)"];
      const row = (i, j) => { // i: وقت الإدخال، j: الوقت الهدف
        const hr = ((air.time[j] / 3600) + 3) % 24, wd = T.wd[j] * Math.PI / 180;
        return [air.pm10[i], air.dust[i], T.ws[j], T.rh[j], T.temp[j], Math.sin(wd), Math.cos(wd), Math.sin(hr / 24 * 2 * Math.PI), Math.cos(hr / 24 * 2 * Math.PI)];
      };
      const X = [], y = [], tt = [], persist = [];
      for (let i = 0; i + HORIZON <= now; i++) {
        const r = row(i, i + HORIZON), tgt = air.pm10[i + HORIZON];
        if (r.every(U.isNum) && U.isNum(tgt)) { X.push(r); y.push(tgt); tt.push(air.time[i + HORIZON]); persist.push(air.pm10[i]); }
      }
      let ml = null;
      if (X.length > 100) {
        const cut = Math.floor(X.length * 0.8);
        const model = ridge(X.slice(0, cut), y.slice(0, cut), 2);
        const yt = y.slice(cut), pt = X.slice(cut).map(model.predict).map(v => Math.max(0, v));
        const m = metrics(yt, pt), mp = metrics(yt, persist.slice(cut));
        const imp = model.beta.slice(1).map(Math.abs), s = imp.reduce((a, b) => a + b, 0);
        // توقع تكراري 48 ساعة
        const fc = []; let lastPM = air.pm10[now], lastDust = air.dust[now], i0 = now;
        for (let h = HORIZON; h <= 48 && i0 + HORIZON < air.time.length; h += HORIZON) {
          const j = i0 + HORIZON, r = row(i0, j); r[0] = lastPM; r[1] = lastDust;
          if (!r.every(U.isNum)) break;
          const p = Math.max(0, model.predict(r)); fc.push({ t: air.time[j], ours: p, cams: air.pm10[j] });
          lastPM = p; i0 = j; // الغبار يبقى على آخر قيمة مرصودة حتى يبقى النموذج مستقلاً عن توقعات CAMS
        }
        ml = { ...m, persist: mp, n: X.length, nTrain: cut, test: { t: tt.slice(cut), y: yt, p: pt }, imp: feats.map((f, k) => ({ f, v: imp[k] / s })), fc };
      }

      // الارتباط
      const vars = [["PM2.5", past("pm2_5")], ["PM10", pm10], ["Dust", past("dust")], ["NO₂", past("nitrogen_dioxide")], ["SO₂", past("sulphur_dioxide")], ["O₃", past("ozone")], ["CO", past("carbon_monoxide")], ["Temp", T.temp.slice(0, now + 1)], ["RH", T.rh.slice(0, now + 1)], ["Wind", T.ws.slice(0, now + 1)]];
      const corr = vars.map(a => vars.map(b => pearson(a[1], b[1])));

      // وردة التلوث
      const sectors = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"], acc = sectors.map(() => []);
      pm10.forEach((v, i) => { const d = T.wd[i]; if (U.isNum(v) && U.isNum(d)) acc[Math.round(d / 45) % 8].push(v); });
      const rose = acc.map(a => U.mean(a));

      A.res = { id, station: D.station(id), air, now, stats, parts, risk, anomalies, dayList, ml, corr, vars: vars.map(v => v[0]), rose, sectors };
      ECO.lastAnalysis = summary();
      render();
    } catch (e) {
      if (e.message !== "OFFLINE") { console.error(e); U.$("#an-notice").innerHTML = `<div class="notice warn">تعذّر إكمال التحليل: ${U.esc(e.message)}</div>`; }
    }
    btn.disabled = false; btn.lastChild.textContent = "تشغيل التحليل"; A.running = false;
  }

  /* ---------- العرض ---------- */
  function render() {
    const r = A.res; if (!r) return;
    U.$("#an-notice").innerHTML = ECO.offlineNotice();
    const s = r.stats, tr = s.trendPct;
    U.$("#an-stats").innerHTML = [
      { k: "متوسط PM2.5 – 30 يوماً", v: U.fmt(s.meanPM25, 1), u: "µg/m³", d: `الحد السنوي لـ WHO = 5 · اليومي = 15`, tone: U.toneFor("pm2_5", s.meanPM25) },
      { k: "أعلى قراءة PM10 ساعية", v: U.fmt(s.maxPM10, 0), u: "µg/m³", d: s.maxPM10t ? U.fmtTime(s.maxPM10t) : "", tone: U.toneFor("pm10", s.maxPM10) },
      { k: "أيام تجاوز حد PM2.5 اليومي", v: `${s.exceed}/${s.days}`, u: "يوم", d: `${Math.round(s.exceed / Math.max(1, s.days) * 100)}% من أيام الفترة`, tone: s.exceed / s.days > 0.5 ? "bad" : s.exceed > 0 ? "warn" : "good" },
      { k: "اتجاه PM10 الأسبوعي", v: (tr > 0 ? "+" : "") + U.fmt(tr, 1) + "%", u: "", d: tr > 5 ? "التلوث في تصاعد" : tr < -5 ? "التلوث في تراجع" : "مستقر تقريباً", tone: tr > 5 ? "warn" : tr < -5 ? "good" : "info" }
    ].map(x => `<div class="stat"><div class="k">${x.k}</div><div class="v" style="color:${ECO.TONES[x.tone]}">${x.v} <small class="faint" style="font-size:.7rem">${x.u}</small></div><div class="d">${x.d}</div></div>`).join("");

    // المخاطر
    const rt = r.risk < 20 ? "good" : r.risk < 40 ? "fair" : r.risk < 60 ? "warn" : r.risk < 80 ? "bad" : "severe";
    const rl = { good: "منخفض", fair: "معتدل", warn: "مرتفع", bad: "مرتفع جداً", severe: "حرج" }[rt];
    U.$("#risk-gauge").innerHTML = U.gauge({ value: r.risk, max: 100, tone: rt, label: `خطر ${rl}`, sub: r.station.name });
    U.$("#risk-break").innerHTML = r.parts.map(p => `<div class="meter"><div class="row"><span>${p.name} <span class="faint">(${U.fmt(p.c, 1)} / ${p.who})</span></span><b>${U.fmt(p.contrib, 1)}</b></div><div class="track"><i style="width:${Math.min(100, p.contrib / (p.w * 100) * 100)}%;background:${ECO.TONES[U.toneFor(p.k, p.c)]}"></i></div></div>`).join("");

    renderAnom();

    // التعلم الآلي
    const ml = r.ml;
    if (!ml) { U.$("#ml-metrics").innerHTML = `<div class="empty">البيانات غير كافية لتدريب النموذج.</div>`; }
    else {
      const gain = (1 - ml.rmse / ml.persist.rmse) * 100;
      U.$("#ml-metrics").innerHTML = [
        ["R² (اختبار)", U.fmt(ml.r2, 3)], ["RMSE", U.fmt(ml.rmse, 1) + " µg/m³"], ["MAE", U.fmt(ml.mae, 1) + " µg/m³"],
        ["عينات التدريب", ml.nTrain], ["مقارنة بنموذج الاستمرارية", (gain >= 0 ? "أفضل بـ " : "أضعف بـ ") + U.fmt(Math.abs(gain), 1) + "%"]
      ].map(([k, v]) => `<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
      U.chart(U.$("#chart-ml"), {
        type: "line",
        data: { labels: ml.test.t, datasets: [
          { label: "PM10 الفعلي", data: ml.test.y, borderColor: ECO.COL.river, borderWidth: 1.6 },
          { label: `تنبؤ النموذج (+${HORIZON} ساعات)`, data: ml.test.p, borderColor: ECO.COL.chloro, borderWidth: 1.6, borderDash: [4, 3] }
        ] },
        options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: { maxTicksLimit: 6, maxRotation: 0, callback(v) { return U.fmtDay(ml.test.t[v]); } }, grid: { display: false } }, y: { beginAtZero: true } }, plugins: { legend: { position: "bottom" } } }
      });
      const imp = [...ml.imp].sort((a, b) => b.v - a.v);
      U.chart(U.$("#chart-imp"), {
        type: "bar", data: { labels: imp.map(x => x.f), datasets: [{ data: imp.map(x => x.v * 100), backgroundColor: ECO.COL.chloro + "bb", borderRadius: 4 }] },
        options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => U.fmt(c.raw, 1) + "%" } } }, scales: { x: { ticks: { callback: v => v + "%" } }, y: { position: "right", grid: { display: false }, ticks: { font: { size: 10 } } } } }
      });
      U.chart(U.$("#chart-fc"), {
        type: "line",
        data: { labels: ml.fc.map(f => U.fmtTime(f.t)), datasets: [
          { label: "نموذج EcoBio", data: ml.fc.map(f => f.ours), borderColor: ECO.COL.chloro, pointRadius: 3, borderWidth: 2 },
          { label: "Copernicus CAMS", data: ml.fc.map(f => f.cams), borderColor: ECO.COL.silt, pointRadius: 3, borderWidth: 2, borderDash: [4, 3] }
        ] },
        options: { scales: { x: { ticks: { maxTicksLimit: 4, maxRotation: 0 }, grid: { display: false } }, y: { beginAtZero: true } }, plugins: { legend: { position: "bottom" } } }
      });
    }

    // الارتباط
    const n = r.vars.length;
    let h = `<div style="display:grid;grid-template-columns:52px repeat(${n},minmax(40px,1fr));gap:2px">`;
    h += `<div></div>` + r.vars.map(v => `<div class="h" style="justify-content:center">${v}</div>`).join("");
    r.corr.forEach((row, i) => {
      h += `<div class="h">${r.vars[i]}</div>`;
      row.forEach(c => {
        const a = U.isNum(c) ? Math.abs(c) : 0, col = c >= 0 ? `rgba(79,200,220,${0.08 + a * 0.75})` : `rgba(238,122,79,${0.08 + a * 0.75})`;
        h += `<div class="c" style="background:${col};color:${a > 0.55 ? "#031a20" : "#cfe3de"}" title="r = ${U.fmt(c, 2)}">${U.isNum(c) ? c.toFixed(2) : "—"}</div>`;
      });
    });
    U.$("#corr-heat").innerHTML = h + "</div>";

    // وردة التلوث
    U.chart(U.$("#chart-rose"), {
      type: "radar",
      data: { labels: r.sectors, datasets: [{ label: "متوسط PM10 (µg/m³)", data: r.rose, borderColor: ECO.COL.silt, backgroundColor: "rgba(230,174,79,0.22)", pointRadius: 3, pointBackgroundColor: ECO.COL.silt }] },
      options: { plugins: { legend: { display: false } }, scales: { r: { beginAtZero: true, angleLines: { color: ECO.COL.grid }, grid: { color: ECO.COL.grid }, pointLabels: { color: ECO.COL.muted, font: { size: 11 } }, ticks: { display: false } } } }
    });
    const mi = r.rose.reduce((b, v, i) => (U.isNum(v) && v > (r.rose[b] || -1) ? i : b), 0);
    const hint = [6, 7, 5].includes(mi) ? "وهو اتجاه الصحراء الغربية وبادية الجزيرة، المصدر الرئيسي للغبار في المنطقة" : (mi === 0 && r.id === "tikrit") ? "وهو اتجاه قضاء بيجي ومصفاه النفطي" : "ويستحق ربطه بالأنشطة الواقعة في هذا الاتجاه";
    U.$("#rose-note").textContent = `أعلى تراكيز PM10 تصل مع الرياح القادمة من ${r.sectors[mi]} (متوسط ${U.fmt(r.rose[mi], 0)} µg/m³)، ${hint}.`;
  }

  const ANOM_KEYS = [["pm10", "PM10"], ["pm2_5", "PM2.5"], ["dust", "الغبار"], ["nitrogen_dioxide", "NO₂"], ["sulphur_dioxide", "SO₂"]];
  const ANOM_WHY = { pm10: "ارتفاع حاد في الجسيمات العالقة: عاصفة غبارية محتملة", pm2_5: "ارتفاع الجسيمات الدقيقة: دخان أو احتراق أو غبار ناعم", dust: "حدث غباري واضح", nitrogen_dioxide: "ذروة انبعاثات احتراق (مرور أو مولدات)", sulphur_dioxide: "انبعاثات صناعية محتملة (حرق نفط ثقيل أو مصافٍ)" };
  function renderAnom() {
    const r = A.res; if (!r) return;
    const k = A.anomKey, an = r.anomalies[k], labels = r.dayList.map(d => U.fmtDay(d.t));
    const flag = an.z.map(z => Math.abs(z) >= 2.5);
    U.chart(U.$("#chart-anom"), {
      type: "bar",
      data: { labels, datasets: [{ label: "المتوسط اليومي", data: an.ys, backgroundColor: flag.map((f, i) => (f ? (an.z[i] > 0 ? ECO.COL.crimson : ECO.COL.chloro) : "rgba(79,200,220,0.45)")), borderRadius: 3 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: c => "z = " + U.fmt(an.z[c.dataIndex], 2) } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } }, y: { beginAtZero: true } } }
    });
    const list = an.z.map((z, i) => ({ z, i })).filter(x => Math.abs(x.z) >= 2.5).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    U.$("#anom-list").innerHTML = list.length ? list.map(x => `<div class="anom"><span class="z">z=${U.fmt(x.z, 1)}</span><span><b>${labels[x.i]}</b> · ${U.fmt(an.ys[x.i], 1)} µg/m³<br><span class="muted">${x.z > 0 ? ANOM_WHY[k] : "هواء أنظف من المعتاد (أمطار أو رياح نظيفة)"}</span></span></div>`).join("") : `<div class="empty">لا توجد أيام شاذة لهذا الملوث خلال الفترة.</div>`;
  }

  function summary() {
    const r = A.res; if (!r) return null;
    const anoms = [];
    Object.entries(r.anomalies).forEach(([k, a]) => a.z.forEach((z, i) => { if (Math.abs(z) >= 2.5) anoms.push({ ملوث: k, يوم: U.fmtDay(r.dayList[i].t), متوسط: +a.ys[i].toFixed(1), z: +z.toFixed(1) }); }));
    const strongCorr = [];
    r.corr.forEach((row, i) => row.forEach((c, j) => { if (j > i && Math.abs(c) >= 0.5) strongCorr.push(`${r.vars[i]}–${r.vars[j]}: ${c.toFixed(2)}`); }));
    return {
      المحطة: r.station.name, الفترة: "آخر 30 يوماً (ساعي)", مصدر_البيانات: "Copernicus CAMS عبر Open-Meteo",
      متوسط_PM25: +r.stats.meanPM25.toFixed(1), أعلى_PM10: +r.stats.maxPM10.toFixed(0), أيام_تجاوز_PM25: `${r.stats.exceed} من ${r.stats.days}`, اتجاه_PM10_أسبوعياً: r.stats.trendPct.toFixed(1) + "%",
      مؤشر_المخاطر_24س: +r.risk.toFixed(1), متوسطات_24س: Object.fromEntries(r.parts.map(p => [p.name, +p.c.toFixed(1)])),
      الحالات_الشاذة: anoms.slice(0, 10),
      نموذج_التعلم_الآلي: r.ml ? { الهدف: `PM10 بعد ${HORIZON} ساعات`, R2: +r.ml.r2.toFixed(3), RMSE: +r.ml.rmse.toFixed(1), RMSE_الاستمرارية: +r.ml.persist.rmse.toFixed(1), أهم_المتغيرات: [...r.ml.imp].sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.f) } : null,
      ارتباطات_قوية: strongCorr.slice(0, 10),
      اتجاه_أعلى_PM10: r.sectors[r.rose.reduce((b, v, i) => (v > (r.rose[b] || -1) ? i : b), 0)]
    };
  }

  function report() {
    const out = U.$("#an-report-out");
    if (!A.res) { out.innerHTML = `<p class="warnc">شغّل التحليل أولاً.</p>`; return; }
    const prompt = `أنت تكتب قسم "النتائج والمناقشة" لتقرير علمي عن جودة الهواء فوق نهر دجلة. هذه نتائج التحليل الآلي من منصة EcoBio AI بصيغة JSON:
${JSON.stringify(summary(), null, 1)}

اكتب تقريراً عربياً أكاديمياً منظماً بالعناوين التالية:
1. ملخص تنفيذي (3 أسطر).
2. تقييم الملوثات مقارنة بإرشادات WHO 2021.
3. تفسير الحالات الشاذة والمصادر المحتملة (الغبار، مصفى بيجي، المرور، الزراعة) مستفيداً من الارتباطات واتجاه الرياح.
4. تقييم نموذج التعلم الآلي وحدوده.
5. توصيات عملية للتخفيف والمعالجة مع التركيز على الحلول الحيوية (أحزمة خضراء بأنواع محلية، مرشحات حيوية، تثبيت التربة بالنباتات).
6. توصيات لبحوث مستقبلية.
اذكر صراحة أن البيانات نموذجية بدقة نحو 45 كم وليست قياسات محطة أرضية. لا تخترع أرقاماً غير موجودة في البيانات.`;
    ECO.gemini.renderInto(out, prompt);
  }

  ECO.views.analysis = {
    init() {
      U.$("#an-station").innerHTML = ECO.STATIONS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
      U.$("#an-station").value = ECO.state.station;
      U.$("#an-run").onclick = run;
      U.$("#an-report").onclick = report;
      U.$("#anom-seg").innerHTML = ANOM_KEYS.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === A.anomKey ? "on" : ""}">${l}</button>`).join("");
      U.$("#anom-seg").onclick = e => { const b = e.target.closest("button"); if (!b) return; A.anomKey = b.dataset.k; U.$$("#anom-seg button").forEach(x => x.classList.toggle("on", x === b)); renderAnom(); };
      run();
    },
    show() {}
  };
  ECO.analysisSummary = summary;
})();
