/* =====================================================================
   EcoBio AI — مكتبة التحليل متعدد المتغيرات (دون واجهة):
   القيم والمتجهات الذاتية لمصفوفة متماثلة (Jacobi)، التقييس، مصفوفة الارتباط،
   اختبارا KMO (Kaiser 1974) وBartlett (1950)، تحليل المكوّنات الرئيسة مع تدوير
   Varimax بتطبيع Kaiser (Kaiser 1958)، التحليل الموازي (Horn 1965)،
   ونموذج APCS-MLR لتوزيع مساهمات المصادر (Thurston & Spengler 1985)،
   والتجميع الهرمي بطريقة Ward (1963).
   ===================================================================== */
(function (root) {
  "use strict";
  const MV = {};
  const ST = () => (root.ECO && root.ECO.stats) || root.ECO_STATS;
  const eye = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  /* القيم والمتجهات الذاتية لمصفوفة متماثلة بطريقة Jacobi الدورية.
     تعيد القيم تنازلياً، والمتجهات أعمدةً في vectors[صف][عمود] */
  MV.eigSym = A0 => {
    const n = A0.length, A = A0.map(r => r.slice()), V = eye(n);
    let tot = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) tot += A[i][j] * A[i][j];
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off <= 1e-30 * Math.max(tot, 1e-300)) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) < 1e-300) continue;
        const th = (A[q][q] - A[p][p]) / (2 * apq);
        const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const kp = A[k][p], kq = A[k][q]; A[k][p] = c * kp - s * kq; A[k][q] = s * kp + c * kq; }
        for (let k = 0; k < n; k++) { const pk = A[p][k], qk = A[q][k]; A[p][k] = c * pk - s * qk; A[q][k] = s * pk + c * qk; }
        A[p][q] = A[q][p] = 0;
        for (let k = 0; k < n; k++) { const kp = V[k][p], kq = V[k][q]; V[k][p] = c * kp - s * kq; V[k][q] = s * kp + c * kq; }
      }
    }
    const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
    const values = idx.map(i => A[i][i]);
    const vectors = V.map(r => idx.map(i => r[i]));
    /* إشارة ثابتة: مجموع عناصر المتجه موجب (أو أكبر عنصر بالقيمة المطلقة إن كان المجموع صفراً) */
    for (let j = 0; j < n; j++) {
      let s = 0, big = 0; for (let i = 0; i < n; i++) { s += vectors[i][j]; if (Math.abs(vectors[i][j]) > Math.abs(big)) big = vectors[i][j]; }
      if (s < -1e-12 || (Math.abs(s) <= 1e-12 && big < 0)) for (let i = 0; i < n; i++) vectors[i][j] = -vectors[i][j];
    }
    return { values, vectors };
  };

  /* تقييس الأعمدة (الانحراف المعياري للعيّنة n−1) */
  MV.standardize = X => {
    const n = X.length, p = X[0].length, mean = new Array(p).fill(0), sd = new Array(p).fill(0);
    for (const r of X) for (let j = 0; j < p; j++) mean[j] += r[j] / n;
    for (const r of X) for (let j = 0; j < p; j++) sd[j] += (r[j] - mean[j]) ** 2;
    for (let j = 0; j < p; j++) sd[j] = Math.sqrt(sd[j] / (n - 1));
    const Z = X.map(r => r.map((v, j) => (sd[j] > 0 ? (v - mean[j]) / sd[j] : 0)));
    return { Z, mean, sd };
  };

  /* مصفوفة ارتباط Pearson من بيانات مقيّسة */
  MV.corrZ = Z => {
    const n = Z.length, p = Z[0].length, R = Array.from({ length: p }, () => new Array(p).fill(0));
    for (const r of Z) for (let i = 0; i < p; i++) { const a = r[i]; if (!a) continue; for (let j = i; j < p; j++) R[i][j] += a * r[j]; }
    for (let i = 0; i < p; i++) for (let j = i; j < p; j++) { R[i][j] /= n - 1; R[j][i] = R[i][j]; }
    for (let i = 0; i < p; i++) R[i][i] = 1;
    return R;
  };
  MV.corr = X => MV.corrZ(MV.standardize(X).Z);

  /* معكوس مصفوفة الارتباط من التحليل الذاتي (null إن كانت منفردة أو شبه منفردة) */
  MV.invSym = (R, E) => {
    E = E || MV.eigSym(R);
    const p = R.length, lmin = E.values[p - 1];
    if (!(lmin > 1e-10 * Math.max(1, E.values[0]))) return null;
    const I = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < p; i++) for (let j = i; j < p; j++) {
      let s = 0; for (let k = 0; k < p; k++) s += E.vectors[i][k] * E.vectors[j][k] / E.values[k];
      I[i][j] = I[j][i] = s;
    }
    return I;
  };

  /* مؤشر Kaiser–Meyer–Olkin لكفاية العيّنة، الكلي ولكل متغير (MSA) */
  MV.kmo = (R, E) => {
    const p = R.length, Ri = MV.invSym(R, E);
    if (!Ri) return null;
    let r2 = 0, q2 = 0; const msa = [];
    for (let i = 0; i < p; i++) {
      let a = 0, b = 0;
      for (let j = 0; j < p; j++) if (j !== i) { const pc = -Ri[i][j] / Math.sqrt(Ri[i][i] * Ri[j][j]); a += R[i][j] ** 2; b += pc * pc; }
      msa.push(a / (a + b)); r2 += a; q2 += b;
    }
    return { kmo: r2 / (r2 + q2), msa };
  };
  /* تصنيف Kaiser (1974) */
  MV.kmoLabel = v => (v >= 0.9 ? "ممتاز" : v >= 0.8 ? "جيد جداً" : v >= 0.7 ? "جيد" : v >= 0.6 ? "متوسط" : v >= 0.5 ? "ضعيف" : "غير مقبول");

  /* اختبار Bartlett للكروية: هل مصفوفة الارتباط تختلف عن مصفوفة الوحدة؟ */
  MV.bartlett = (E, n) => {
    const p = E.values.length;
    if (!(E.values[p - 1] > 1e-12)) return null;
    const lnDet = E.values.reduce((s, v) => s + Math.log(v), 0);
    const chi2 = -(n - 1 - (2 * p + 5) / 6) * lnDet, df = (p * (p - 1)) / 2;
    return { chi2, df, p: ST().pChi2(chi2, df), lnDet };
  };

  /* تدوير Varimax بتطبيع Kaiser: خوارزمية الدوران الثنائي الأصلية (Kaiser 1958).
     يعيد التحميلات المدوّرة L ومصفوفة الدوران T بحيث L = L₀ T */
  MV.varimax = (L0, o = {}) => {
    const p = L0.length, k = L0[0].length, norm = o.normalize !== false;
    const T = eye(k);
    if (k < 2) return { L: L0.map(r => r.slice()), T, iter: 0 };
    const h = L0.map(r => (norm ? Math.sqrt(r.reduce((s, v) => s + v * v, 0)) : 1));
    const A = L0.map((r, i) => r.map(v => (h[i] > 0 ? v / h[i] : 0)));
    let it = 0;
    for (; it < 1000; it++) {
      let maxPhi = 0;
      for (let j = 0; j < k - 1; j++) for (let l = j + 1; l < k; l++) {
        let a = 0, b = 0, c = 0, d = 0;
        for (let i = 0; i < p; i++) { const x = A[i][j], y = A[i][l], u = x * x - y * y, v = 2 * x * y; a += u; b += v; c += u * u - v * v; d += 2 * u * v; }
        const phi = 0.25 * Math.atan2(d - (2 * a * b) / p, c - (a * a - b * b) / p);
        if (Math.abs(phi) < 1e-14) continue;
        const cs = Math.cos(phi), sn = Math.sin(phi);
        for (let i = 0; i < p; i++) { const x = A[i][j], y = A[i][l]; A[i][j] = x * cs + y * sn; A[i][l] = -x * sn + y * cs; }
        for (let r = 0; r < k; r++) { const x = T[r][j], y = T[r][l]; T[r][j] = x * cs + y * sn; T[r][l] = -x * sn + y * cs; }
        maxPhi = Math.max(maxPhi, Math.abs(phi));
      }
      if (maxPhi < 1e-11) break;
    }
    return { L: A.map((r, i) => r.map(v => v * h[i])), T, iter: it };
  };
  /* معيار varimax (للتحقق): مجموع تباينات مربعات التحميلات المطبّعة */
  MV.varimaxCrit = L => {
    const p = L.length, k = L[0].length, h = L.map(r => Math.sqrt(r.reduce((s, v) => s + v * v, 0)));
    let s = 0;
    for (let j = 0; j < k; j++) {
      const q = L.map((r, i) => (h[i] > 0 ? (r[j] / h[i]) ** 2 : 0)), m = q.reduce((a, b) => a + b, 0) / p;
      s += q.reduce((a, b) => a + (b - m) ** 2, 0) / p;
    }
    return s;
  };

  /* مولّد أرقام عشوائية ثابت البذرة (mulberry32) وتوزيع طبيعي (Box–Muller) */
  MV.rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  MV.rnorm = rnd => { let u = 0; while (u <= 1e-300) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };

  /* التحليل الموازي (Horn 1965): القيم الذاتية لبيانات عشوائية بنفس الحجم،
     والمئين 95 (Glorfeld 1995) حداً لعدد المكوّنات التي تتجاوز الصدفة */
  MV.parallel = (n, p, o = {}) => {
    const budget = o.budget || 6e7, nsim = Math.max(30, Math.min(o.nsim || 200, Math.floor(budget / Math.max(1, n * p * p))));
    const rnd = MV.rng(o.seed || 20261023), all = Array.from({ length: p }, () => []);
    for (let s = 0; s < nsim; s++) {
      const X = Array.from({ length: n }, () => Array.from({ length: p }, () => MV.rnorm(rnd)));
      const ev = MV.eigSym(MV.corr(X)).values;
      ev.forEach((v, i) => all[i].push(v));
    }
    const q = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]; };
    return { nsim, mean: all.map(a => a.reduce((x, y) => x + y, 0) / a.length), p95: all.map(q) };
  };

  /* انحدار خطي متعدد صغير (مع ثابت) لـ APCS-MLR */
  const olsc = (Xc, y) => {
    const n = y.length, k = Xc[0].length + 1, A = Array.from({ length: k }, () => new Array(k).fill(0)), g = new Array(k).fill(0);
    for (let i = 0; i < n; i++) { const r = [1].concat(Xc[i]); for (let a = 0; a < k; a++) { g[a] += r[a] * y[i]; for (let b = a; b < k; b++) A[a][b] += r[a] * r[b]; } }
    for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) A[a][b] = A[b][a];
    const E = MV.eigSym(A), Ai = MV.invSym(A, E);
    if (!Ai) return null;
    const beta = Ai.map(r => r.reduce((s, v, i) => s + v * g[i], 0));
    let sse = 0, my = 0; for (let i = 0; i < n; i++) my += y[i] / n;
    let sst = 0; const fit = new Array(n);
    for (let i = 0; i < n; i++) { let f = beta[0]; for (let a = 1; a < k; a++) f += beta[a] * Xc[i][a - 1]; fit[i] = f; sse += (y[i] - f) ** 2; sst += (y[i] - my) ** 2; }
    const df = n - k, mse = df > 0 ? sse / df : NaN;
    const se = Ai.map((r, i) => Math.sqrt(Math.max(0, r[i] * mse)));
    const pv = beta.map((b, i) => (se[i] > 0 && df > 0 ? ST().pT2(Math.abs(b / se[i]), df) : NaN));
    return { beta, se, p: pv, fit, sse, sst, r2: sst > 0 ? 1 - sse / sst : NaN, mean: my, df };
  };
  MV.olsc = olsc;

  /* خط الأنابيب الكامل: PCA → Varimax → درجات المكوّنات → APCS → MLR.
     X: مصفوفة n×p بالوحدات الأصلية (دون قيم مفقودة). o.k عدد المكوّنات (افتراضياً معيار Kaiser λ>1).
     o.targets: متجهات إضافية (مثل الكتلة الكلية) تُنحدر على APCS دون أن تدخل في PCA */
  MV.apcsMlr = (X, o = {}) => {
    const n = X.length, p = X[0].length;
    const { Z, mean, sd } = MV.standardize(X);
    const R = MV.corrZ(Z), E = MV.eigSym(R);
    const kaiser = E.values.filter(v => v > 1).length || 1;
    const k = Math.max(1, Math.min(p, o.k || kaiser));
    const L0 = E.vectors.map(r => r.slice(0, k).map((v, j) => v * Math.sqrt(Math.max(0, E.values[j]))));
    const vm = MV.varimax(L0);
    /* ترتيب المكوّنات المدوّرة بالتباين المفسَّر، وإشارة موجبة لأكبر تحميل */
    const ss = Array.from({ length: k }, (_, j) => vm.L.reduce((s, r) => s + r[j] * r[j], 0));
    const ord = ss.map((v, j) => j).sort((a, b) => ss[b] - ss[a]);
    const sign = ord.map(j => { let big = 0; vm.L.forEach(r => { if (Math.abs(r[j]) > Math.abs(big)) big = r[j]; }); return big < 0 ? -1 : 1; });
    const Lr = vm.L.map(r => ord.map((j, c) => r[j] * sign[c]));
    const T = vm.T.map(r => ord.map((j, c) => r[j] * sign[c]));
    const ssRot = ord.map(j => ss[j]);
    /* معاملات الدرجات بطريقة الانحدار: B = R⁻¹ L = V_k D_k^(−½) T (دقيقة لـ PCA دون عكس R) */
    const B = Array.from({ length: p }, (_, i) => Array.from({ length: k }, (_, c) => {
      let s = 0; for (let j = 0; j < k; j++) s += (E.vectors[i][j] / Math.sqrt(E.values[j])) * T[j][c]; return s;
    }));
    const scores = Z.map(z => Array.from({ length: k }, (_, c) => z.reduce((s, v, i) => s + v * B[i][c], 0)));
    /* العيّنة «صفر التركيز»: Z₀ = −المتوسط/الانحراف؛ APCS = الدرجة − درجة الصفر */
    const z0 = mean.map((m, i) => (sd[i] > 0 ? -m / sd[i] : 0));
    const f0 = Array.from({ length: k }, (_, c) => z0.reduce((s, v, i) => s + v * B[i][c], 0));
    const apcs = scores.map(r => r.map((v, c) => v - f0[c]));
    const mApcs = f0.map(v => -v);
    const reg = y => {
      const m = olsc(apcs, y); if (!m) return null;
      const contrib = m.beta.slice(1).map((b, c) => b * mApcs[c]);
      return { r2: m.r2, b0: m.beta[0], b: m.beta.slice(1), se: m.se, p: m.p, mean: m.mean, contrib,
        pct: contrib.map(v => (m.mean !== 0 ? (100 * v) / m.mean : NaN)), unexp: m.beta[0], pctUnexp: m.mean !== 0 ? (100 * m.beta[0]) / m.mean : NaN, fit: m.fit };
    };
    const mlr = Array.from({ length: p }, (_, j) => reg(X.map(r => r[j])));
    const targets = (o.targets || []).map(reg);
    const comm = Lr.map(r => r.reduce((s, v) => s + v * v, 0));
    return { n, p, k, kaiser, mean, sd, R, eig: E, L0, L: Lr, T, ssRot, pctRot: ssRot.map(v => (100 * v) / p), comm, B, scores, f0, apcs, mApcs, mlr, targets,
      kmo: MV.kmo(R, E), bartlett: MV.bartlett(E, n), varimaxIter: vm.iter };
  };

  /* التجميع الهرمي بطريقة Ward على المسافة الإقليدية (تحديث Lance–Williams على المربعات).
     يعيد مصفوفة ربط بنمط SciPy: [معرّف أ، معرّف ب، الارتفاع، الحجم] */
  MV.ward = P => {
    const n = P.length;
    if (n < 2) return [];
    const D = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let s = 0; const a = P[i], b = P[j]; for (let c = 0; c < a.length; c++) s += (a[c] - b[c]) ** 2; D[i * n + j] = D[j * n + i] = s; }
    const size = new Array(n).fill(1), id = Array.from({ length: n }, (_, i) => i), alive = new Array(n).fill(true), link = [];
    for (let step = 0; step < n - 1; step++) {
      let bi = -1, bj = -1, bd = Infinity;
      for (let i = 0; i < n; i++) if (alive[i]) for (let j = i + 1; j < n; j++) if (alive[j]) { const d = D[i * n + j]; if (d < bd) { bd = d; bi = i; bj = j; } }
      const ni = size[bi], nj = size[bj];
      for (let k = 0; k < n; k++) if (alive[k] && k !== bi && k !== bj) {
        const nk = size[k], v = ((ni + nk) * D[bi * n + k] + (nj + nk) * D[bj * n + k] - nk * bd) / (ni + nj + nk);
        D[bi * n + k] = D[k * n + bi] = v;
      }
      const a = id[bi], b = id[bj];
      link.push([Math.min(a, b), Math.max(a, b), Math.sqrt(Math.max(0, bd)), ni + nj]);
      alive[bj] = false; size[bi] = ni + nj; id[bi] = n + step;
    }
    return link;
  };
  /* ترتيب الأوراق من الجذر */
  MV.leafOrder = (link, n) => {
    if (n < 2) return [0];
    const out = [], st = [n + link.length - 1];
    while (st.length) { const v = st.pop(); if (v < n) out.push(v); else { const r = link[v - n]; st.push(r[1], r[0]); } }
    return out;
  };
  /* قطع الشجرة إلى k مجاميع؛ الترقيم حسب ظهور المجموعة في ترتيب الأوراق */
  MV.cutTree = (link, n, k) => {
    const par = Array.from({ length: 2 * n }, (_, i) => i), f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let s = 0; s < n - k; s++) { const [a, b] = link[s]; par[f(a)] = n + s; par[f(b)] = n + s; }
    const order = MV.leafOrder(link, n), lab = new Array(n), map = new Map();
    order.forEach(i => { const r = f(i); if (!map.has(r)) map.set(r, map.size); lab[i] = map.get(r); });
    return lab;
  };

  root.ECO = root.ECO || {};
  root.ECO.mv = MV;
  if (typeof module !== "undefined") module.exports = MV;
})(typeof window !== "undefined" ? window : globalThis);
