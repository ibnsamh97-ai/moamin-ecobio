/* =====================================================================
   EcoBio AI — محرك الإحصاء: توزيعات F وt والمدى المعياري (Tukey)،
   تحليل التباين، اختبار دنكن متعدد المدى، ارتباط بيرسون.
   توزيع المدى المعياري منقول من خوارزمية Copenhaver & Holland (1988)
   كما في ptukey/qtukey في R.
   ===================================================================== */
(function (root) {
  "use strict";
  const ST = {};

  /* ---------- دوال أساسية ---------- */
  const LG = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  function lgamma(x) {
    let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += LG[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  ST.lgamma = lgamma;

  function erf(x) {
    // Abramowitz & Stegun 7.1.26 غير كافية للذيول؛ نستخدم كسر مستمر عبر الدالة غير المكتملة
    const t = 1 / (1 + 0.5 * Math.abs(x));
    const y = 1 - t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? y : -y;
  }
  const pnorm = (x, mu = 0) => 0.5 * (1 + erf((x - mu) / Math.SQRT2));
  ST.pnorm = pnorm;

  // الدالة بيتا غير المكتملة المنظمة I_x(a,b) — Numerical Recipes (betacf)
  function betacf(a, b, x) {
    const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  ST.ibeta = ibeta;
  // P(F > f)
  ST.pF = (f, d1, d2) => (f <= 0 ? 1 : ibeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2));
  // قيمة p ثنائية الطرف لاختبار t
  ST.pT2 = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);

  /* ---------- توزيع المدى المعياري (ptukey / qtukey) ---------- */
  const XLEG = [0.981560634246719250690549090149, 0.904117256370474856678465866119, 0.769902674194304687036893833213, 0.587317954286617447296702418941, 0.367831498998180193752691536644, 0.125233408511468915472441369464];
  const ALEG = [0.047175336386511827194615961485, 0.106939325995318430960254718194, 0.160078328543346226334652529543, 0.203167426723065921749064455810, 0.233492536538354808760849898925, 0.249147045813402785000562436043];
  function wprob(w, rr, cc) {
    const nleg = 12, ihalf = 6, C1 = -30, C2 = -50, C3 = 60, bb = 8, wlar = 3, wincr1 = 2, wincr2 = 3;
    const qsqz = w * 0.5;
    if (qsqz >= bb) return 1.0;
    let pr_w = 2 * pnorm(qsqz) - 1;
    pr_w = pr_w >= Math.exp(C2 / cc) ? Math.pow(pr_w, cc) : 0;
    const wincr = w > wlar ? wincr1 : wincr2;
    let blb = qsqz; const binc = (bb - qsqz) / wincr; let bub = blb + binc, einsum = 0;
    const cc1 = cc - 1;
    for (let wi = 1; wi <= wincr; wi++) {
      let elsum = 0; const a = 0.5 * (bub + blb), b = 0.5 * (bub - blb);
      for (let jj = 1; jj <= nleg; jj++) {
        let j, xx;
        if (ihalf < jj) { j = nleg - jj + 1; xx = XLEG[j - 1]; } else { j = jj; xx = -XLEG[j - 1]; }
        const c = b * xx, ac = a + c, qexpo = ac * ac;
        if (qexpo > C3) break;
        const pplus = 2 * pnorm(ac), pminus = 2 * pnorm(ac, w);
        let rinsum = pplus * 0.5 - pminus * 0.5;
        if (rinsum >= Math.exp(C1 / cc1)) { rinsum = ALEG[j - 1] * Math.exp(-(0.5 * qexpo)) * Math.pow(rinsum, cc1); elsum += rinsum; }
      }
      elsum *= 2.0 * b * cc / Math.sqrt(2 * Math.PI);
      einsum += elsum; blb = bub; bub += binc;
    }
    pr_w += einsum;
    if (pr_w <= Math.exp(C1 / rr)) return 0;
    pr_w = Math.pow(pr_w, rr);
    return pr_w >= 1 ? 1 : pr_w;
  }
  const XLEGQ = [0.989400934991649932596154173450, 0.944575023073232576077988415535, 0.865631202387831743880467897712, 0.755404408355003033895101194847, 0.617876244402643748446671764049, 0.458016777657227386342419442984, 0.281603550779258913230460501460, 0.950125098376374401853193354250e-1];
  const ALEGQ = [0.271524594117540948517805724560e-1, 0.622535239386478928628438369944e-1, 0.951585116824927848099251076022e-1, 0.124628971255533872052476282192, 0.149595988816576732081501730547, 0.169156519395002538189312079030, 0.182603415044923588866763667969, 0.189450610455068496285396723208];
  function ptukey(q, cc, df, rr = 1) {
    const nlegq = 16, ihalfq = 8, eps1 = -30, eps2 = 1e-14, dhaf = 100, dquar = 800, deigh = 5000, dlarg = 25000;
    if (q <= 0) return 0;
    if (df < 2 || rr < 1 || cc < 2) return NaN;
    if (!isFinite(q)) return 1;
    if (df > dlarg) return wprob(q, rr, cc);
    const f2 = df * 0.5;
    let f2lf = f2 * Math.log(df) - df * Math.LN2 - lgamma(f2);
    const f21 = f2 - 1, ff4 = df * 0.25;
    const ulen = df <= dhaf ? 1 : df <= dquar ? 0.5 : df <= deigh ? 0.25 : 0.125;
    f2lf += Math.log(ulen);
    let ans = 0, otsum = 0;
    for (let i = 1; i <= 50; i++) {
      otsum = 0;
      const twa1 = (2 * i - 1) * ulen;
      for (let jj = 1; jj <= nlegq; jj++) {
        let j, t1;
        if (ihalfq < jj) { j = jj - ihalfq - 1; t1 = f2lf + f21 * Math.log(twa1 + XLEGQ[j] * ulen) - (XLEGQ[j] * ulen + twa1) * ff4; }
        else { j = jj - 1; t1 = f2lf + f21 * Math.log(twa1 - XLEGQ[j] * ulen) + (XLEGQ[j] * ulen - twa1) * ff4; }
        if (t1 >= eps1) {
          const qsqz = ihalfq < jj ? q * Math.sqrt((XLEGQ[j] * ulen + twa1) * 0.5) : q * Math.sqrt((-(XLEGQ[j] * ulen) + twa1) * 0.5);
          otsum += wprob(qsqz, rr, cc) * ALEGQ[j] * Math.exp(t1);
        }
      }
      if (i * ulen >= 1.0 && otsum <= eps2) break;
      ans += otsum;
    }
    return ans > 1 ? 1 : ans;
  }
  function qinv(p, c, v) {
    const p0 = 0.322232421088, q0 = 0.993484626060e-01, p1 = -1.0, q1 = 0.588581570495, p2 = -0.342242088547, q2 = 0.531103462366,
      p3 = -0.204231210125, q3 = 0.103537752850, p4 = -0.453642210148e-04, q4 = 0.38560700634e-02, c1 = 0.8832, c2 = 0.2368, c3 = 1.214, c4 = 1.208, c5 = 1.4142, vmax = 120.0;
    const ps = 0.5 - 0.5 * p, yi = Math.sqrt(Math.log(1.0 / (ps * ps)));
    let t = yi + ((((yi * p4 + p3) * yi + p2) * yi + p1) * yi + p0) / ((((yi * q4 + q3) * yi + q2) * yi + q1) * yi + q0);
    if (v < vmax) t += (t * t * t + t) / v / 4.0;
    let q = c1 - c2 * t;
    if (v < vmax) q += -c3 / v + c4 * t / v;
    return t * (q * Math.log(c - 1.0) + c5);
  }
  function qtukey(p, cc, df) {
    const eps = 0.0001, maxiter = 50;
    let x0 = qinv(p, cc, df), valx0 = ptukey(x0, cc, df) - p, x1;
    x1 = valx0 > 0 ? Math.max(0, x0 - 1) : x0 + 1;
    let valx1 = ptukey(x1, cc, df) - p, ans = 0;
    for (let iter = 1; iter < maxiter; iter++) {
      ans = x1 - valx1 * (x1 - x0) / (valx1 - valx0);
      valx0 = valx1; x0 = x1;
      if (ans < 0) { ans = 0; valx1 = -p; }
      valx1 = ptukey(ans, cc, df) - p; x1 = ans;
      if (Math.abs(x1 - x0) < eps) return ans;
    }
    return ans;
  }
  ST.ptukey = ptukey; ST.qtukey = qtukey;
  // المدى المعياري المعنوي لدنكن: q بمستوى حماية αp = 1 − (1 − α)^(p−1)
  ST.duncanSSR = (p, df, alpha = 0.05) => qtukey(Math.pow(1 - alpha, p - 1), p, df);

  /* ---------- وصف ---------- */
  ST.describe = a => {
    const x = a.filter(v => typeof v === "number" && isFinite(v)), n = x.length;
    if (!n) return { n: 0 };
    const mean = x.reduce((s, v) => s + v, 0) / n;
    const sd = n > 1 ? Math.sqrt(x.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : NaN;
    return { n, mean, sd, se: sd / Math.sqrt(n), min: Math.min(...x), max: Math.max(...x), cv: sd / mean * 100 };
  };

  /* ---------- تحليل التباين ----------
     rows: [{a: مستوى العامل الأول, b: مستوى العامل الثاني (اختياري), y}]
     بدون العامل الثاني: اتجاه واحد. معه: نموذج جمعي (A + B) بلا تداخل،
     مثل تصميم القطاعات (الفصول قطاعات).                                  */
  ST.anova = (rows, useB) => {
    const R = rows.filter(r => typeof r.y === "number" && isFinite(r.y) && r.a != null && r.a !== "" && (!useB || (r.b != null && r.b !== "")));
    const N = R.length; if (N < 3) return null;
    const lv = k => [...new Set(R.map(r => String(r[k])))];
    const A = lv("a"), B = useB ? lv("b") : [];
    if (A.length < 2) return null;
    const G = R.reduce((s, r) => s + r.y, 0) / N;
    const grp = (k, levels) => levels.map(l => { const ys = R.filter(r => String(r[k]) === l).map(r => r.y); return { l, n: ys.length, mean: ys.reduce((s, v) => s + v, 0) / ys.length, ys }; });
    const gA = grp("a", A), gB = useB ? grp("b", B) : [];
    const SST = R.reduce((s, r) => s + (r.y - G) ** 2, 0);
    const SSA = gA.reduce((s, g) => s + g.n * (g.mean - G) ** 2, 0);
    const SSB = useB ? gB.reduce((s, g) => s + g.n * (g.mean - G) ** 2, 0) : 0;
    const dfA = A.length - 1, dfB = useB ? B.length - 1 : 0;
    const SSE = Math.max(0, SST - SSA - SSB), dfE = N - 1 - dfA - dfB;
    if (dfE < 1) return null;
    const MSA = SSA / dfA, MSE = SSE / dfE, MSB = useB ? SSB / dfB : NaN;
    const FA = MSE > 0 ? MSA / MSE : Infinity, FB = useB && MSE > 0 ? MSB / MSE : NaN;
    // في النموذج الجمعي غير المتوازن يقدّم SS التتابعي تقريباً؛ ننبّه عند عدم التوازن
    const balanced = !useB || (gA.every(g => g.n === gA[0].n) && gB.every(g => g.n === gB[0].n));
    return {
      N, groups: gA, groupsB: gB, SST, SSA, SSB, SSE, dfA, dfB, dfE, MSA, MSB, MSE, FA, FB,
      pA: isFinite(FA) ? ST.pF(FA, dfA, dfE) : 0, pB: useB ? ST.pF(FB, dfB, dfE) : NaN, balanced
    };
  };

  /* ---------- اختبار دنكن متعدد المدى (حرف a لأعلى متوسط) ---------- */
  ST.duncan = (groups, MSE, dfE, alpha = 0.05) => {
    const g = groups.filter(x => x.n > 0).slice().sort((x, y) => y.mean - x.mean);
    const k = g.length; if (k < 2 || !(MSE >= 0) || dfE < 1) return null;
    const ssr = {}; for (let p = 2; p <= k; p++) ssr[p] = ST.duncanSSR(p, dfE, alpha);
    // ns[i][j] = المتوسطان i..j غير مختلفين معنوياً (مع حماية المدى الأكبر)
    const ns = Array.from({ length: k }, () => Array(k).fill(false));
    for (let p = k; p >= 2; p--) {
      for (let i = 0; i + p - 1 < k; i++) {
        const j = i + p - 1;
        let covered = false;
        for (let a = 0; a <= i && !covered; a++) for (let b = j; b < k; b++) if ((a !== i || b !== j) && ns[a][b]) { covered = true; break; }
        if (covered) { ns[i][j] = true; continue; }
        const se = Math.sqrt(MSE / 2 * (1 / g[i].n + 1 / g[j].n)); // Kramer للأعداد غير المتساوية
        ns[i][j] = (g[i].mean - g[j].mean) < ssr[p] * se;
      }
    }
    // المجموعات المتجانسة: لكل i أبعد j غير مختلف
    const spans = [];
    for (let i = 0; i < k; i++) { let j = i; for (let t = k - 1; t > i; t--) if (ns[i][t]) { j = t; break; } spans.push([i, j]); }
    const maximal = spans.filter(([i, j], idx) => !spans.some(([a, b], id2) => id2 !== idx && a <= i && b >= j && (a !== i || b !== j)));
    const uniq = []; maximal.forEach(s => { if (!uniq.some(u => u[0] === s[0] && u[1] === s[1])) uniq.push(s); });
    uniq.sort((x, y) => x[0] - y[0]);
    const letters = g.map(() => "");
    uniq.forEach(([i, j], li) => { const ch = String.fromCharCode(97 + li); for (let t = i; t <= j; t++) letters[t] += ch; });
    const out = {}; g.forEach((x, i) => { out[x.l] = letters[i]; });
    return { letters: out, ssr, order: g.map(x => x.l) };
  };

  /* ---------- ارتباط بيرسون ---------- */
  ST.pearson = (x, y) => {
    const P = []; for (let i = 0; i < x.length; i++) if (isFinite(x[i]) && isFinite(y[i]) && typeof x[i] === "number" && typeof y[i] === "number") P.push([x[i], y[i]]);
    const n = P.length; if (n < 3) return { n, r: NaN, p: NaN };
    const mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0; P.forEach(([a, b]) => { sxy += (a - mx) * (b - my); sxx += (a - mx) ** 2; syy += (b - my) ** 2; });
    if (sxx === 0 || syy === 0) return { n, r: NaN, p: NaN };
    const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
    const df = n - 2, t = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt(df / (1 - r * r));
    return { n, r, p: isFinite(t) ? ST.pT2(t, df) : 0 };
  };

  /* ---------- مقلوب التوزيع الطبيعي (Acklam) ---------- */
  ST.qnorm = p => {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00],
      b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
      c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00],
      d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };

  /* ---------- اختبار شابيرو–ويلك (Royston 1995، الخوارزمية AS R94) ---------- */
  ST.shapiro = arr => {
    const x = arr.filter(v => typeof v === "number" && isFinite(v)).slice().sort((p, q) => p - q), n = x.length;
    if (n < 3 || n > 5000 || x[n - 1] - x[0] < 1e-12) return null;
    const poly = (cc, xx) => cc.reduce((s, c, i) => s + c * Math.pow(xx, i), 0);
    const nn2 = Math.floor(n / 2), a = new Array(nn2 + 1).fill(0);
    if (n === 3) a[1] = Math.SQRT1_2;
    else {
      const an25 = n + 0.25, m = [0]; let summ2 = 0;
      for (let i = 1; i <= nn2; i++) { m[i] = ST.qnorm((i - 0.375) / an25); summ2 += m[i] * m[i]; }
      summ2 *= 2; const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n);
      const a1 = poly([0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], rsn) - m[1] / ssumm2;
      let i1, fac;
      if (n > 5) { i1 = 3; const a2 = -m[2] / ssumm2 + poly([0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], rsn);
        fac = Math.sqrt((summ2 - 2 * m[1] * m[1] - 2 * m[2] * m[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2)); a[2] = a2; }
      else { i1 = 2; fac = Math.sqrt((summ2 - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1)); }
      a[1] = a1; for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
    }
    const mean = x.reduce((s, v) => s + v, 0) / n, ss = x.reduce((s, v) => s + (v - mean) ** 2, 0);
    let b = 0; for (let i = 1; i <= nn2; i++) b += a[i] * (x[n - i] - x[i - 1]);
    const W = Math.min(1, b * b / ss);
    let p;
    if (n === 3) p = Math.max(0, 1.90985931710274 * (Math.asin(Math.sqrt(W)) - 1.04719755119660));
    else {
      let y = Math.log(1 - W), mu, sg; const xx = Math.log(n);
      if (n <= 11) { const gam = -2.273 + 0.459 * n; if (y >= gam) return { W, p: 1e-99, n }; y = -Math.log(gam - y); mu = poly([0.544, -0.39978, 0.025054, -6.714e-4], n); sg = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n)); }
      else { mu = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx); sg = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx)); }
      p = 1 - ST.pnorm((y - mu) / sg);
    }
    return { W, p: Math.min(1, Math.max(0, p)), n };
  };

  /* ---------- دالة غاما غير التامة (للتوزيع χ²) ---------- */
  function gammq(a, x) {
    if (x <= 0) return 1;
    const gln = lgamma(a);
    if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let i = 0; i < 500; i++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; } return 1 - sum * Math.exp(-x + a * Math.log(x) - gln); }
    let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break; }
    return Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  ST.pChi2 = (x, df) => gammq(df / 2, x / 2);

  /* ---------- كروسكال–والس (مع تصحيح التعادل) ---------- */
  ST.kruskal = groups => {
    const G = groups.map(g => g.filter(v => typeof v === "number" && isFinite(v))).filter(g => g.length);
    const k = G.length, all = []; G.forEach((g, i) => g.forEach(v => all.push([v, i])));
    const N = all.length; if (k < 2 || N < 3) return null;
    all.sort((p, q) => p[0] - q[0]);
    const rank = new Array(N); let tie = 0;
    for (let i = 0; i < N;) { let j = i; while (j + 1 < N && all[j + 1][0] === all[i][0]) j++; const r = (i + j) / 2 + 1, t = j - i + 1; for (let q = i; q <= j; q++) rank[q] = r; tie += t * t * t - t; i = j + 1; }
    const R = new Array(k).fill(0); all.forEach((p, i) => { R[p[1]] += rank[i]; });
    let H = 12 / (N * (N + 1)) * G.reduce((s, g, i) => s + R[i] * R[i] / g.length, 0) - 3 * (N + 1);
    const C = 1 - tie / (N * N * N - N); if (C > 0) H /= C;
    return { H, df: k - 1, p: ST.pChi2(H, k - 1), meanRanks: R.map((r, i) => r / G[i].length) };
  };

  /* ---------- ليفين (براون–فورسايث: الانحراف عن الوسيط) ---------- */
  const median = a => { const s = a.slice().sort((p, q) => p - q), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  ST.median = median;
  ST.levene = groups => {
    const G = groups.map(g => g.filter(v => typeof v === "number" && isFinite(v))).filter(g => g.length >= 2);
    if (G.length < 2) return null;
    const rows = []; G.forEach((g, i) => { const md = median(g); g.forEach(v => rows.push({ a: String(i), y: Math.abs(v - md) })); });
    const an = ST.anova(rows, false); return an ? { F: an.FA, df1: an.dfA, df2: an.dfE, p: an.pA } : null;
  };

  /* ---------- تحليل تباين ويلش (لا يفترض تساوي التباين) ---------- */
  ST.welch = groups => {
    const G = groups.map(g => g.filter(v => typeof v === "number" && isFinite(v))).filter(g => g.length >= 2);
    const k = G.length; if (k < 2) return null;
    const st = G.map(g => ST.describe(g)); if (st.some(s => !(s.sd > 0))) return null;
    const w = st.map(s => s.n / (s.sd * s.sd)), W = w.reduce((p, q) => p + q, 0), mw = st.reduce((p, s, i) => p + w[i] * s.mean, 0) / W;
    const A = st.reduce((p, s, i) => p + w[i] * (s.mean - mw) ** 2, 0) / (k - 1);
    const tmp = st.reduce((p, s, i) => p + (1 - w[i] / W) ** 2 / (s.n - 1), 0);
    const F = A / (1 + 2 * (k - 2) / (k * k - 1) * tmp), df2 = (k * k - 1) / (3 * tmp);
    return { F, df1: k - 1, df2, p: ST.pF(F, k - 1, df2) };
  };

  /* ---------- القيم الشاذة بقاعدة IQR (توكي) ---------- */
  ST.outliersIQR = arr => {
    const x = arr.filter(v => typeof v === "number" && isFinite(v)).slice().sort((p, q) => p - q); if (x.length < 4) return [];
    const qt = p => { const h = (x.length - 1) * p, l = Math.floor(h); return x[l] + (x[Math.min(l + 1, x.length - 1)] - x[l]) * (h - l); };
    const q1 = qt(0.25), q3 = qt(0.75), iqr = q3 - q1;
    return arr.filter(v => typeof v === "number" && (v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr));
  };

  /* حجم العينة لكل مجموعة لكشف حجم الأثر المشاهد بقوة 80% وα = 0.05 (Cohen 1988، λ المعلمة اللامركزية) */
  const LAMBDA80 = { 1: 7.85, 2: 9.64, 3: 10.91, 4: 11.94, 5: 12.83, 6: 13.62, 7: 14.32, 8: 14.98, 9: 15.58, 10: 16.14 };
  ST.nPerGroup = (eta2, k) => {
    if (!(eta2 > 0 && eta2 < 1) || k < 2) return null;
    const f2 = eta2 / (1 - eta2), lam = LAMBDA80[Math.min(10, k - 1)];
    return Math.max(2, Math.ceil(lam / f2 / k) + 1);
  };

  root.ECO_STATS = ST;
  if (root.ECO) root.ECO.stats = ST;
  if (typeof module !== "undefined") module.exports = ST;
})(typeof window !== "undefined" ? window : globalThis);
