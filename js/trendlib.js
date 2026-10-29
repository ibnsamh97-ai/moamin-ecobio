/* =====================================================================
   EcoBio AI — مكتبة اختبارات الاتجاه الزمني (دون واجهة):
   Mann–Kendall (Mann 1945؛ Kendall 1975) مع تصحيح التساوي،
   والصيغة المعدّلة للارتباط الذاتي (Hamed & Rao 1998)،
   وميل Sen (Sen 1968) بفترة ثقة (Gilbert 1987)،
   واختبار Kendall الموسمي (Hirsch, Slack & Smith 1982)،
   واختبار Pettitt لنقطة التغيّر (Pettitt 1979).
   النتائج مطابقة لحزمتي pymannkendall وpyhomogeneity.
   ===================================================================== */
(function (root) {
  "use strict";
  const TL = {};
  const ST = () => (root.ECO && root.ECO.stats) || root.ECO_STATS;
  const sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; if (!n) return NaN; const m = n >> 1; return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  TL.median = median;

  /* رتب متوسطة للقيم المتساوية */
  const rank = x => {
    const idx = x.map((v, i) => i).sort((a, b) => x[a] - x[b]), r = new Array(x.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && x[idx[j + 1]] === x[idx[i]]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k]] = avg; i = j + 1; }
    return r;
  };
  TL.rank = rank;

  const score = x => { let s = 0; for (let i = 0; i < x.length - 1; i++) for (let j = i + 1; j < x.length; j++) s += sign(x[j] - x[i]); return s; };
  const varS = x => {
    const n = x.length, cnt = new Map(); x.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1));
    let t = 0; cnt.forEach(c => { if (c > 1) t += c * (c - 1) * (2 * c + 5); });
    return (n * (n - 1) * (2 * n + 5) - t) / 18;
  };
  const zOf = (s, v) => (v > 0 ? (s > 0 ? (s - 1) / Math.sqrt(v) : s < 0 ? (s + 1) / Math.sqrt(v) : 0) : 0);
  const pOf = z => 2 * (1 - ST().pnorm(Math.abs(z)));
  const verdict = (z, p, alpha) => (p < alpha ? (z > 0 ? "increasing" : "decreasing") : "none");
  TL.score = score; TL.varS = varS;

  /* اختبار Mann–Kendall الأصلي */
  TL.mk = (x, alpha = 0.05) => {
    const n = x.length; if (n < 3) return null;
    const s = score(x), v = varS(x), z = zOf(s, v), p = pOf(z);
    return { n, s, varS: v, z, p, tau: s / (0.5 * n * (n - 1)), trend: verdict(z, p, alpha) };
  };

  /* ميل Sen على زمن فعلي t (بالسنوات أو أي وحدة)، مع فترة ثقة Gilbert (1987) */
  TL.sen = (t, x, alpha = 0.05, vS) => {
    const d = [];
    for (let i = 0; i < x.length - 1; i++) for (let j = i + 1; j < x.length; j++) if (t[j] !== t[i]) d.push((x[j] - x[i]) / (t[j] - t[i]));
    if (!d.length) return null;
    d.sort((a, b) => a - b);
    const slope = median(d), N = d.length;
    const v = vS != null ? vS : varS(x), C = ST().qnorm(1 - alpha / 2) * Math.sqrt(v);
    const m1 = Math.round((N - C) / 2), m2 = Math.round((N + C) / 2) + 1;
    const lo = m1 >= 1 && m1 <= N ? d[m1 - 1] : NaN, hi = m2 >= 1 && m2 <= N ? d[m2 - 1] : NaN;
    return { slope, lo, hi, intercept: median(x) - slope * median(t), N };
  };

  /* الدالة الذاتية للارتباط (مقام n كما في pymannkendall) */
  const acf = (x, nl) => {
    const n = x.length, m = x.reduce((a, b) => a + b, 0) / n, y = x.map(v => v - m);
    const c0 = y.reduce((s, v) => s + v * v, 0) / n, out = [1];
    for (let k = 1; k <= nl; k++) { let s = 0; for (let i = 0; i + k < n; i++) s += y[i] * y[i + k]; out.push(s / n / c0); }
    return out;
  };

  /* Mann–Kendall المعدّل لأثر الارتباط الذاتي (Hamed & Rao 1998): تُزال الاتجاهية بميل Sen
     على تسلسل القياس، وتُحسب معاملات الارتباط الذاتي لرتب البواقي، وتُضمّ المعنوية منها فقط */
  TL.hamedRao = (x, alpha = 0.05) => {
    const n = x.length; if (n < 4) return null;
    const s = score(x), v0 = varS(x);
    const idx = x.map((_, i) => i), b = TL.sen(idx, x, alpha, v0).slope;
    const I = rank(x.map((v, i) => v - (i + 1) * b)), r = acf(I, n - 1);
    const bound = ST().qnorm(1 - alpha / 2) / Math.sqrt(n);
    let sni = 0;
    for (let i = 1; i < n; i++) if (Math.abs(r[i]) > bound) sni += (n - i) * (n - i - 1) * (n - i - 2) * r[i];
    const ratio = 1 + (2 / (n * (n - 1) * (n - 2))) * sni;
    const v = v0 * ratio, z = zOf(s, v), p = pOf(z);
    return { n, s, varS: v, varS0: v0, ratio, z, p, tau: s / (0.5 * n * (n - 1)), trend: verdict(z, p, alpha) };
  };

  /* Kendall الموسمي (Hirsch et al. 1982): seasons = مصفوفة لكل فصل من {t, x} مرتبة زمنياً.
     الميل الموسمي = وسيط ميول كل فصل على حدة (بوحدة t) */
  TL.seasonal = (seasons, alpha = 0.05) => {
    let s = 0, v = 0, denom = 0, n = 0; const d = [];
    seasons.forEach(se => {
      const x = se.map(o => o.x), t = se.map(o => o.t), m = x.length;
      if (m < 2) return;
      s += score(x); v += varS(x); denom += 0.5 * m * (m - 1); n += m;
      for (let i = 0; i < m - 1; i++) for (let j = i + 1; j < m; j++) if (t[j] !== t[i]) d.push((x[j] - x[i]) / (t[j] - t[i]));
    });
    if (!denom) return null;
    const z = zOf(s, v), p = pOf(z);
    return { n, s, varS: v, z, p, tau: s / denom, trend: verdict(z, p, alpha), slope: median(d), nSlopes: d.length };
  };

  /* اختبار Pettitt لنقطة التغيّر: U_k = 2Σr_i − k(n+1)، K = max|U_k|، p ≈ 2·exp(−6K²/(n³+n²)).
     loc = عدد قيم المقطع الأول */
  TL.pettitt = (x, alpha = 0.05) => {
    const n = x.length; if (n < 4) return null;
    const r = rank(x); let cum = 0, K = -1, loc = 0;
    for (let k = 1; k < n; k++) { cum += r[k - 1]; const U = Math.abs(2 * cum - k * (n + 1)); if (U > K) { K = U; loc = k; } }
    const p = Math.min(1, 2 * Math.exp((-6 * K * K) / (n * n * n + n * n)));
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    return { n, K, loc, p, h: p < alpha, before: mean(x.slice(0, loc)), after: mean(x.slice(loc)) };
  };

  root.ECO = root.ECO || {};
  root.ECO.trend = TL;
  if (typeof module !== "undefined") module.exports = TL;
})(typeof window !== "undefined" ? window : globalThis);
