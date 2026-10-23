/* =====================================================================
   EcoBio AI — مكتبة الملاءمة: انحدار المربعات الصغرى (OLS) بالمصفوفات،
   والانحدار غير الخطي بخوارزمية Levenberg–Marquardt مع الأخطاء المعيارية،
   ومعايير المقارنة (R² وR² المعدّل وRMSE وAICc وχ²)، وكمّيات توزيع t.
   ===================================================================== */
(function (root) {
  "use strict";
  const FL = {};
  const ST = () => (root.ECO && root.ECO.stats) || root.ECO_STATS;

  /* حل نظام خطي بحذف غاوس مع المحور الجزئي */
  FL.solve = (A, b) => {
    const n = A.length, M = A.map((r, i) => r.slice().concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-14) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  };
  FL.inv = A => {
    const n = A.length, M = A.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-14) return null;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c]; for (let k = 0; k < 2 * n; k++) M[c][k] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map(r => r.slice(n));
  };
  const mul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const T = A => A[0].map((_, j) => A.map(r => r[j]));
  FL.mul = mul; FL.T = T;

  /* كمّية توزيع t ثنائية الطرف: t بحيث P(|T| > t) = alpha */
  FL.qt = (alpha, df) => {
    if (!(df > 0)) return NaN;
    let lo = 0, hi = 1000;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (ST().pT2(m, df) > alpha) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };

  /* المربعات الصغرى الخطية: X مصفوفة التصميم (مع عمود الثابت إن لزم) */
  FL.ols = (X, y) => {
    const n = X.length, p = X[0].length, Xt = T(X), XtX = mul(Xt, X), XtXi = FL.inv(XtX);
    if (!XtXi) return null;
    const Xty = Xt.map(r => r.reduce((s, v, i) => s + v * y[i], 0));
    const beta = XtXi.map(r => r.reduce((s, v, i) => s + v * Xty[i], 0));
    const fit = X.map(r => r.reduce((s, v, i) => s + v * beta[i], 0)), res = y.map((v, i) => v - fit[i]);
    const sse = res.reduce((s, e) => s + e * e, 0), df = n - p, mse = df > 0 ? sse / df : NaN;
    const my = y.reduce((a, b) => a + b, 0) / n, sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
    const h = X.map(r => { const a = XtXi.map(row => row.reduce((s, v, i) => s + v * r[i], 0)); return r.reduce((s, v, i) => s + v * a[i], 0); });
    const press = res.reduce((s, e, i) => s + (h[i] < 1 - 1e-10 ? (e / (1 - h[i])) ** 2 : Infinity), 0);
    const se = XtXi.map((r, i) => Math.sqrt(Math.max(0, r[i] * mse)));
    const tv = beta.map((b, i) => (se[i] > 0 ? b / se[i] : NaN)), pv = tv.map(t => (isFinite(t) && df > 0 ? ST().pT2(Math.abs(t), df) : NaN));
    return { beta, se, t: tv, p: pv, fit, res, sse, sst, df, mse, n, k: p, XtXi, h,
      r2: 1 - sse / sst, adj: 1 - (sse / df) / (sst / (n - 1)), pred: 1 - press / sst, press };
  };

  /* Levenberg–Marquardt عام (أي عدد من المعاملات) مع حدود اختيارية */
  FL.lm = (f, p0, xs, ys, o = {}) => {
    const lo = o.lower || [], hi = o.upper || [], clip = q => q.map((v, k) => Math.min(hi[k] != null ? hi[k] : Infinity, Math.max(lo[k] != null ? lo[k] : -Infinity, v)));
    let p = clip(p0.slice()), lam = 1e-3;
    const n = xs.length, m = p.length;
    const sse = q => { let s = 0; for (let i = 0; i < n; i++) { const e = ys[i] - f(xs[i], q); s += e * e; } return s; };
    const jac = q => xs.map(x => { const f0 = f(x, q); return q.map((v, k) => { const h = Math.max(1e-8, Math.abs(v) * 1e-6), r = q.slice(); r[k] += h; return (f(x, r) - f0) / h; }); });
    let cur = sse(p);
    if (!isFinite(cur)) return null;
    for (let it = 0; it < 400; it++) {
      const J = jac(p), r = xs.map((x, i) => ys[i] - f(x, p));
      const A = Array.from({ length: m }, () => new Array(m).fill(0)), g = new Array(m).fill(0);
      for (let i = 0; i < n; i++) for (let a = 0; a < m; a++) { g[a] += J[i][a] * r[i]; for (let b = 0; b < m; b++) A[a][b] += J[i][a] * J[i][b]; }
      let improved = false;
      for (let t = 0; t < 12; t++) {
        const M = A.map((row, a) => row.map((v, b) => (a === b ? v * (1 + lam) + 1e-12 : v)));
        const d = FL.solve(M, g);
        if (!d) { lam *= 10; continue; }
        const q = clip(p.map((v, k) => v + d[k])), s2 = sse(q);
        if (isFinite(s2) && s2 < cur) { const rel = (cur - s2) / Math.max(cur, 1e-300); p = q; cur = s2; lam = Math.max(1e-12, lam / 10); improved = true; if (rel < 1e-12) it = 1e9; break; }
        lam *= 10;
      }
      if (!improved || cur < 1e-20) break;
    }
    const J = jac(p), JtJ = mul(T(J), J), C = FL.inv(JtJ), df = n - m, s2 = df > 0 ? cur / df : NaN;
    const se = C ? C.map((row, i) => Math.sqrt(Math.max(0, row[i] * s2))) : p.map(() => NaN);
    const my = ys.reduce((a, b) => a + b, 0) / n, sst = ys.reduce((s, v) => s + (v - my) ** 2, 0);
    const fit = xs.map(x => f(x, p));
    const chi2 = ys.reduce((s, y, i) => s + (fit[i] !== 0 ? (y - fit[i]) ** 2 / Math.abs(fit[i]) : 0), 0);
    const aic = n * Math.log(cur / n) + 2 * m, aicc = n - m - 1 > 0 ? aic + (2 * m * (m + 1)) / (n - m - 1) : Infinity;
    return { p, se, sse: cur, df, n, m, fit, r2: 1 - cur / sst, adj: 1 - (cur / df) / (sst / (n - 1)), rmse: Math.sqrt(cur / n), chi2, aic, aicc, C, s2 };
  };

  /* أوزان أكايكي من AICc لمجموعة نماذج */
  FL.akaike = list => {
    const ok = list.filter(x => x && isFinite(x.aicc)), mn = Math.min(...ok.map(x => x.aicc));
    const w = ok.map(x => Math.exp(-(x.aicc - mn) / 2)), s = w.reduce((a, b) => a + b, 0);
    ok.forEach((x, i) => { x.dAicc = x.aicc - mn; x.wAicc = w[i] / s; });
    return list;
  };

  root.ECO = root.ECO || {};
  root.ECO.fit = FL;
  if (typeof module !== "undefined") module.exports = FL;
})(typeof window !== "undefined" ? window : globalThis);
