/* =====================================================================
   EcoBio AI — معايرة القمر بقياساتك الحقلية (Sentinel-2 matchups)
   لكل عيّنة (تاريخ + موقع + قيمة مختبرية) تُبحث أقرب صورة Sentinel-2
   صنّفت فيها ESA بكسل الموقع ماءً خلال ±أيام، ويُقرأ الانعكاس والمؤشرات،
   ثم تُبنى معادلة تحويل بالانحدار مع تحقق «اترك واحدة» (LOOCV).
   الأرقام كلها من الصور والحساب؛ لا ذكاء اصطناعي هنا.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  if (!document.getElementById("sp-cal")) return;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const MAXN = 80;
  const S = U.store.get("s2cal_v1", null) || { src: "saved", param: "turb", win: 3, rows: null, cols: null, matches: null, label: "" };
  const save = () => { try { U.store.set("s2cal_v1", { src: S.src, param: S.param, win: S.win, rows: S.rows, cols: S.cols, matches: S.matches, label: S.label }); } catch (e) { /* */ } };
  let busy = false, chartC = null;

  const PRED = [
    ["B04", "انعكاس الأحمر ρ(B04)"], ["ndti", "NDTI"], ["ratio", "نسبة الأحمر/الأخضر B04/B03"], ["B05", "انعكاس حافة الأحمر ρ(B05)"], ["ndci", "NDCI"], ["B08", "انعكاس تحت الأحمر القريب ρ(B08)"]
  ];
  const BAND = k => /^B\d\d$/.test(k) || k === "ratio";
  const xOf = (m, k) => { const r = m.rho || {}; return k === "ratio" ? (U.isNum(r.B04) && U.isNum(r.B03) && r.B03 > 0 ? r.B04 / r.B03 : NaN) : BAND(k) ? (U.isNum(r[k]) ? r[k] : NaN) : m[k]; };

  /* ---------- مصادر البيانات ---------- */
  function savedPoints() {
    const list = ECO.samples ? ECO.samples.list() : [];
    return list.filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.date || "") && U.isNum(s.lat) && U.isNum(s.lon) && s.v && U.isNum(+s.v[S.param]) && s.v[S.param] !== "")
      .map(s => ({ id: s.code, date: s.date, lat: +s.lat, lon: +s.lon, y: +s.v[S.param] }));
  }
  const normDate = v => {
    if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return d.toISOString().slice(0, 10); }
    const s = String(v || "").trim().replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return "";
  };
  function guessCols(head) {
    const f = re => head.findIndex(h => re.test(String(h)));
    const date = f(/date|تاريخ|يوم/i), lat = f(/^lat|عرض|latitude/i), lon = f(/^lon|^lng|طول|longitude/i);
    const used = new Set([date, lat, lon]);
    const val = head.findIndex((h, i) => !used.has(i) && !/id|code|رمز|موقع|site|name|اسم/i.test(String(h)));
    return { date, lat, lon, val };
  }
  function tablePoints() {
    if (!S.rows || !S.cols) return [];
    const c = S.cols, TB = ECO.tab;
    return S.rows.slice(1).map((r, i) => ({ id: "صف " + (i + 2), date: normDate(r[c.date]), lat: TB.num(r[c.lat]), lon: TB.num(r[c.lon]), y: TB.num(r[c.val]) }))
      .filter(p => p.date && U.isNum(p.lat) && U.isNum(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 && U.isNum(p.y));
  }
  const points = () => (S.src === "saved" ? savedPoints() : tablePoints()).slice(0, MAXN);
  const yName = () => {
    if (S.src === "saved") { const p = (ECO.samples ? ECO.samples.params() : []).find(x => x.key === S.param); return p ? `${p.name}${p.unit ? ` (${p.unit})` : ""}` : S.param; }
    return S.rows && S.cols ? String(S.rows[0][S.cols.val] || "القيمة") : "القيمة";
  };

  /* ---------- المطابقة مع الصور ---------- */
  const addDays = (d, n) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  async function matchOne(p) {
    const SP = ECO.space;
    const items = SP.perDay(await SP.search({ bbox: [p.lon - 0.0008, p.lat - 0.0008, p.lon + 0.0008, p.lat + 0.0008], datetime: `${addDays(p.date, -S.win)}T00:00:00Z/${addDays(p.date, S.win)}T23:59:59Z`, limit: 40, sort: "datetime" }));
    if (!items.length) return { p, why: "لا توجد صورة في هذه المدة" };
    items.forEach(it => { it.dd = Math.round(Math.abs(Date.parse(it.date) - Date.parse(p.date)) / 864e5); });
    items.sort((a, b) => a.dd - b.dd || (a.cloud || 0) - (b.cloud || 0));
    let why = "";
    for (const it of items.slice(0, 4)) {
      let o; try { o = await SP.pixel(it, p.lat, p.lon); } catch (e) { why = "تعذّرت قراءة البكسل"; continue; }
      if (o.cls === "water") return { p, o: { date: o.date, id: o.id, cloud: o.cloud, rho: o.rho, ndti: o.ndti, ndci: o.ndci }, dd: it.dd };
      why = o.cls === "cloud" ? "غيوم فوق الموقع" : o.cls === "land" ? "الموقع ليس ماءً في الصورة (قرب الضفة؟)" : "لا بيانات في الصورة";
    }
    return { p, why: why || "لا صورة صافية" };
  }
  async function runMatch() {
    if (busy) return;
    const pts = points(), out = U.$("#spc-out");
    if (pts.length < 3) { out.innerHTML = `<div class="notice warn">${ico("i-info")}<span>تحتاج 3 عيّنات على الأقل لكل منها تاريخ وإحداثيات وقيمة${S.src === "saved" ? " لهذا المعيار في «خريطة العينات»" : " (تحقق من أعمدة التاريخ والعرض والطول والقيمة)"}. للمعادلة تحتاج 5 مطابقات فأكثر، والأفضل 10 أو أكثر.</span></div>`; return; }
    if (!ECO.space) { out.innerHTML = `<div class="notice warn">${ico("i-info")}<span>خدمة الصور غير محمّلة.</span></div>`; return; }
    busy = true; U.$("#spc-go").disabled = true;
    const res = new Array(pts.length); let done = 0, fail = null;
    const tick = () => { out.innerHTML = `<p class="faint">يطابق ${done} من ${pts.length} عيّنة مع صور Sentinel-2…</p><div class="spc-bar"><i style="width:${Math.round(100 * done / pts.length)}%"></i></div>`; };
    tick();
    let i = 0;
    const worker = async () => {
      while (i < pts.length && !fail) {
        const k = i++;
        try { res[k] = await matchOne(pts[k]); } catch (e) { if (e && (e.net || e.old)) fail = e; res[k] = { p: pts[k], why: "تعذّر الاتصال" }; }
        done++; tick();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    busy = false; U.$("#spc-go").disabled = false;
    if (fail) { out.innerHTML = `<div class="notice warn">${ico("i-info")}<span>${ECO.space.errText(fail)}</span></div>`; return; }
    S.matches = res; S.label = yName(); save(); render();
  }

  /* ---------- الانحدار ---------- */
  function fit(x, y, logY) {
    const n = x.length, yy = logY ? y.map(Math.log) : y;
    const mx = U.mean(x), my = U.mean(yy);
    let sxx = 0, sxy = 0; x.forEach((xi, i) => { sxx += (xi - mx) ** 2; sxy += (xi - mx) * (yy[i] - my); });
    if (!(sxx > 0)) return null;
    const b = sxy / sxx, a = my - b * mx, e = yy.map((v, i) => v - (a + b * x[i]));
    const sse = e.reduce((s, v) => s + v * v, 0), se = Math.sqrt(sse / (n - 2) / sxx), t = b / se;
    const back = v => logY ? Math.exp(v) : v;
    const pred = x.map(xi => back(a + b * xi));
    const loo = x.map((xi, i) => { const h = 1 / n + (xi - mx) ** 2 / sxx; return back(yy[i] - e[i] / (1 - h)); });
    const my0 = U.mean(y), sst = y.reduce((s, v) => s + (v - my0) ** 2, 0);
    const rmse = Math.sqrt(y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0) / n);
    const loormse = Math.sqrt(y.reduce((s, v, i) => s + (v - loo[i]) ** 2, 0) / n);
    return { a, b, logY, n, r2: sst > 0 ? 1 - y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0) / sst : NaN, rmse, loormse, p: isFinite(t) ? ECO.stats.pT2(Math.abs(t), n - 2) : 0, f: v => back(a + b * v) };
  }
  function models(ok) {
    const out = [];
    PRED.forEach(([k, label]) => {
      const pr = ok.map(m => [xOf(m.o, k), m.p.y]).filter(([a, b]) => U.isNum(a) && U.isNum(b));
      if (pr.length < 5) return;
      const x = pr.map(v => v[0]), y = pr.map(v => v[1]);
      const lin = fit(x, y, false); if (lin) out.push(Object.assign(lin, { k, label, xmin: Math.min(...x), xmax: Math.max(...x), x, y }));
      if (y.every(v => v > 0)) { const ex = fit(x, y, true); if (ex) out.push(Object.assign(ex, { k, label, xmin: Math.min(...x), xmax: Math.max(...x), x, y })); }
    });
    return out.sort((m1, m2) => m1.loormse - m2.loormse);
  }
  const fx = v => String(+(+v).toPrecision(5));
  const eqText = m => m.logY ? `y = exp(${fx(m.a)} ${m.b < 0 ? "−" : "+"} ${fx(Math.abs(m.b))} × ${m.k === "ratio" ? "B04/B03" : m.k.toUpperCase()})` : `y = ${fx(m.a)} ${m.b < 0 ? "−" : "+"} ${fx(Math.abs(m.b))} × ${m.k === "ratio" ? "B04/B03" : m.k.toUpperCase()}`;

  /* ---------- العرض ---------- */
  function render() {
    const out = U.$("#spc-out"); if (!out) return;
    if (chartC) { try { chartC.destroy(); } catch (e) { /* */ } chartC = null; }
    if (!S.matches) { out.innerHTML = ""; return; }
    const ok = S.matches.filter(m => m && m.o), bad = S.matches.filter(m => m && !m.o);
    const M = models(ok), best = M[0];
    const range = ok.length ? [Math.min(...ok.map(m => m.p.y)), Math.max(...ok.map(m => m.p.y))] : null;
    out.innerHTML = `
      <div class="spc-kpis"><div class="stat"><div class="k">عيّنات</div><div class="v">${S.matches.length}</div></div><div class="stat"><div class="k">طابقت صورة صافية</div><div class="v">${ok.length}</div></div><div class="stat"><div class="k">نافذة المطابقة</div><div class="v"><bdi dir="ltr">±${S.win}</bdi> ${S.win === 1 ? "يوم" : "أيام"}</div></div></div>
      ${!best ? `<div class="notice warn">${ico("i-info")}<span>${ok.length < 5 ? `طابقت ${ok.length} عيّنة فقط؛ المعادلة تحتاج 5 مطابقات فأكثر. وسّع نافذة الأيام أو أضف عيّنات من وسط المجرى في أيام صافية.` : "لم يمكن بناء معادلة (القيم متساوية)."}</span></div>` : `
      <div class="spc-best">
        <div class="spc-eq"><span class="faint">أفضل معادلة (أقل خطأ في التحقق «اترك واحدة»)</span><b dir="ltr">${esc(eqText(best))}</b><span>y = ${esc(S.label)}، و${esc(best.label)}</span></div>
        <div class="spc-m"><span>R² <b dir="ltr">${U.fmt(best.r2, 3)}</b></span><span>RMSE <b dir="ltr">${U.fmt(best.rmse, "auto")}</b></span><span>RMSE بالتحقق <b dir="ltr">${U.fmt(best.loormse, "auto")}</b></span><span>p <b dir="ltr">${best.p < 0.001 ? "&lt;0.001" : U.fmt(best.p, 3)}</b></span><span>n <b dir="ltr">${best.n}</b></span></div>
        ${best.n < 10 ? `<div class="notice warn">${ico("i-info")}<span>${best.n} مطابقات فقط: المعادلة استرشادية. المعايرات المنشورة تستعمل عادة 20 عيّنة فأكثر موزّعة على مدى القيم والمواسم.</span></div>` : ""}
        ${best.r2 < 0.5 || best.p >= 0.05 ? `<div class="notice warn">${ico("i-info")}<span>العلاقة ${best.p >= 0.05 ? "غير دالة إحصائياً" : "ضعيفة"} (R² = ${U.fmt(best.r2, 2)})؛ لا تستعمل المعادلة للتقدير. الأسباب الشائعة: فرق أيام كبير بين العيّنة والصورة، أو عيّنات قرب الضفة، أو مدى قيم ضيق.</span></div>` : ""}
      </div>
      <div class="chart-box"><canvas id="spc-c"></canvas></div>
      <details class="spc-all"><summary>كل النماذج المجرّبة (${M.length})</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>المتغير من الصورة</th><th>الشكل</th><th class="num">R²</th><th class="num">RMSE</th><th class="num">RMSE بالتحقق</th><th class="num">p</th></tr></thead>
        <tbody>${M.map((m, i) => `<tr${i === 0 ? ' class="is-best"' : ""}><td>${esc(m.label)}</td><td>${m.logY ? "أسّي" : "خطي"}</td><td class="num">${U.fmt(m.r2, 3)}</td><td class="num">${U.fmt(m.rmse, "auto")}</td><td class="num">${U.fmt(m.loormse, "auto")}</td><td class="num">${m.p < 0.001 ? "&lt;0.001" : U.fmt(m.p, 3)}</td></tr>`).join("")}</tbody></table></div>
        <p class="faint">اختيار الأفضل من بين ${M.length} نموذجاً يجعل الدقة الظاهرية متفائلة قليلاً؛ أكّد المعادلة بعيّنات جديدة لم تدخل في بنائها.</p></details>
      ${ECO.space && ECO.space.state.series && best.r2 >= 0.5 && best.p < 0.05 ? `<button type="button" class="btn btn-sm" id="spc-apply">${ico("i-trend")}طبّق المعادلة على السلسلة الزمنية للنقطة المختارة</button><div id="spc-apply-out"></div>` : ""}`}
      <details class="spc-all" ${best ? "" : "open"}><summary>جدول المطابقة (${S.matches.length})</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>العيّنة</th><th>تاريخها</th><th>الصورة</th><th class="num">الفرق</th><th class="num">ρ(B04)</th><th class="num">NDTI</th><th class="num">NDCI</th><th class="num">القيمة</th></tr></thead>
        <tbody>${S.matches.map(m => m.o ? `<tr><td>${esc(m.p.id)}</td><td>${esc(m.p.date)}</td><td>${esc(m.o.date)}</td><td class="num">${m.dd} يوم</td><td class="num">${U.fmt(m.o.rho.B04, 4)}</td><td class="num">${U.fmt(m.o.ndti, 3)}</td><td class="num">${U.fmt(m.o.ndci, 3)}</td><td class="num">${U.fmt(m.p.y, "auto")}</td></tr>`
          : `<tr class="spc-miss"><td>${esc(m.p.id)}</td><td>${esc(m.p.date)}</td><td colspan="5">${esc(m.why)}</td><td class="num">${U.fmt(m.p.y, "auto")}</td></tr>`).join("")}</tbody></table></div></details>
      <div class="row"><button type="button" class="btn btn-ghost btn-sm" id="spc-csv">${ico("i-down")}جدول المطابقة CSV</button><button type="button" class="btn btn-ghost btn-sm" data-explain="space">${ico("i-spark")}اشرح لي النتيجة</button></div>
      <p class="faint spc-ref">كل قراءة بكسل واحد (10 م) من صورة Sentinel-2 L2A صنّفته ESA ماءً، وأقرب صورة للتاريخ خلال <bdi dir="ltr">±${S.win}</bdi> ${S.win === 1 ? "يوم" : "أيام"}. ${range ? `المعادلة صالحة فقط ضمن مدى القيم التي بُنيت عليها (${U.fmt(range[0], "auto")}–${U.fmt(range[1], "auto")}) ومدى قيم الصورة نفسه. ` : ""}العلاقة بين العكورة وانعكاس الأحمر موثّقة في Nechad et al. (2010, Remote Sensing of Environment 114: 854–866) وDogliotti et al. (2015, RSE 156: 157–168)، لكن معاملاتها تختلف من نهر لآخر، ولهذا تُعاير محلياً.</p>`;
    if (best) {
      const xs = best.x, lo = best.xmin, hi = best.xmax, line = Array.from({ length: 40 }, (_, i) => { const v = lo + (hi - lo) * i / 39; return { x: v, y: best.f(v) }; });
      chartC = U.chart(U.$("#spc-c"), { type: "scatter", data: { datasets: [
        { label: "العيّنات", data: xs.map((v, i) => ({ x: v, y: best.y[i] })), backgroundColor: "#e6ae4fcc", pointRadius: 5 },
        { label: "المعادلة", type: "line", data: line, borderColor: "#4fc8dc", borderWidth: 2, pointRadius: 0 }
      ] }, options: { scales: { x: { type: "linear", title: { display: true, text: best.label } }, y: { title: { display: true, text: S.label } } }, plugins: { legend: { position: "bottom" } } } });
    }
    const ap = U.$("#spc-apply"); if (ap) ap.onclick = () => applySeries(best);
    U.$("#spc-csv").onclick = () => {
      const rows = [["sample", "sample_date", "lat", "lon", "value", "scene_date", "days_apart", "scene_id", "rho_B02", "rho_B03", "rho_B04", "rho_B05", "rho_B08", "NDTI", "NDCI", "note"]]
        .concat(S.matches.map(m => [m.p.id, m.p.date, m.p.lat, m.p.lon, m.p.y].concat(m.o ? [m.o.date, m.dd, m.o.id, ...["B02", "B03", "B04", "B05", "B08"].map(k => U.isNum(m.o.rho[k]) ? m.o.rho[k].toFixed(5) : ""), U.fmt(m.o.ndti, 4), U.fmt(m.o.ndci, 4), ""] : ["", "", "", "", "", "", "", "", "", "", m.why])));
      const blob = new Blob(["﻿" + rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
      ECO.xlsx.download(blob, "sentinel2-matchups.csv");
    };
  }
  function applySeries(m) {
    const ser = ECO.space.state.series, box = U.$("#spc-apply-out"); if (!ser || !box) return;
    const w = ser.points.filter(p => p.cls === "water");
    if (BAND(m.k) && w.length && !w.some(p => p.rho)) { box.innerHTML = `<p class="faint spc-sum">هذه السلسلة محفوظة من نسخة سابقة بلا قيم الانعكاس؛ اختر النقطة من الخريطة مرة ثانية واعرض سلسلتها ثم طبّق المعادلة.</p>`; return; }
    const est = w.map(p => { const x = xOf(p, m.k); return { date: p.date, x, y: U.isNum(x) && x >= m.xmin && x <= m.xmax ? m.f(x) : null }; });
    const n = est.filter(e => e.y != null).length;
    box.innerHTML = `<p class="spc-sum">قُدّرت ${n} من ${w.length} صورة ماء للنقطة ${ser.lat.toFixed(4)}, ${ser.lon.toFixed(4)}؛ ${w.length - n ? `${w.length - n} صورة خارج مدى المعايرة تُركت فارغة بدل الاستقراء.` : "كل الصور ضمن مدى المعايرة."}</p><div class="chart-box sm"><canvas id="spc-ac"></canvas></div>`;
    U.chart(U.$("#spc-ac"), { type: "line", data: { labels: est.map(e => e.date), datasets: [{ label: "تقدير " + S.label, data: est.map(e => e.y), borderColor: "#e6ae4f", pointRadius: 3, spanGaps: false }] }, options: { plugins: { legend: { position: "bottom" } }, scales: { x: { ticks: { maxTicksLimit: 6, maxRotation: 0 } } } } });
  }

  function renderIn() {
    U.$$("#spc-src button").forEach(b => b.classList.toggle("on", b.dataset.src === S.src));
    const host = U.$("#spc-in");
    if (S.src === "saved") {
      const P = ECO.samples ? ECO.samples.params() : [];
      const all = ECO.samples ? ECO.samples.list() : [];
      const cnt = k => all.filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.date || "") && U.isNum(s.lat) && s.v && s.v[k] !== "" && U.isNum(+s.v[k])).length;
      host.innerHTML = `<div class="field"><label for="spc-p">المعيار المقاس في عيّناتك</label><select id="spc-p" class="input">${P.map(p => `<option value="${p.key}"${p.key === S.param ? " selected" : ""}>${esc(p.name)}${p.unit ? ` (${esc(p.unit)})` : ""} · ${cnt(p.key)} عيّنة</option>`).join("")}</select></div>
        <p class="faint">تُؤخذ العيّنات المحفوظة في «خريطة العينات» التي لها تاريخ وموقع وقيمة لهذا المعيار. العكورة والمواد الصلبة العالقة والكلوروفيل هي التي يراها القمر مباشرة؛ الأملاح والمعادن الذائبة لا تُرى عادة.</p>`;
      U.$("#spc-p").onchange = e => { S.param = e.target.value; save(); };
    } else {
      host.innerHTML = `<div id="spc-tb"></div><div id="spc-cols"></div>`;
      ECO.tab.input(U.$("#spc-tb"), { id: "spc-t", placeholder: "date\tlat\tlon\tturbidity_NTU\n2025-04-12\t34.6050\t43.6950\t38\n2025-05-03\t34.9300\t43.4900\t22", template: [["date", "lat", "lon", "turbidity_NTU"], ["2025-04-12", 34.605, 43.695, ""]], templateName: "قالب-معايرة-القمر.xlsx",
        onLoad(rows) { S.rows = rows.map(r => r.map(c => c instanceof Date ? c.toISOString().slice(0, 10) : c)); S.cols = guessCols(S.rows[0]); S.matches = null; save(); colsUI(); render(); } });
      colsUI();
    }
  }
  function colsUI() {
    const box = U.$("#spc-cols"); if (!box) return;
    if (!S.rows || !S.cols) { box.innerHTML = ""; return; }
    const head = S.rows[0], sel = (k, l) => `<div class="field"><label for="spc-c-${k}">${l}</label><select id="spc-c-${k}" class="input" data-col="${k}"><option value="-1">—</option>${head.map((h, i) => `<option value="${i}"${S.cols[k] === i ? " selected" : ""}>${esc(h || "عمود " + (i + 1))}</option>`).join("")}</select></div>`;
    box.innerHTML = `<div class="spc-colsel">${sel("date", "التاريخ")}${sel("lat", "خط العرض")}${sel("lon", "خط الطول")}${sel("val", "القيمة المقاسة")}</div><p class="faint">${tablePoints().length} صفاً صالحاً من ${S.rows.length - 1}${S.rows.length - 1 > MAXN ? ` (تُستعمل أول ${MAXN})` : ""}.</p>`;
    box.onchange = e => { const k = e.target.dataset.col; if (!k) return; S.cols[k] = +e.target.value; S.matches = null; save(); colsUI(); render(); };
  }

  function init() {
    U.$("#spc-src").onclick = e => { const b = e.target.closest("[data-src]"); if (!b) return; S.src = b.dataset.src; S.matches = null; save(); renderIn(); render(); };
    U.$("#spc-win").value = String(S.win);
    U.$("#spc-win").onchange = e => { S.win = +e.target.value; save(); };
    U.$("#spc-go").onclick = runMatch;
    renderIn(); render();
  }
  let inited = false;
  const prev = ECO.views.space;
  if (prev) {
    const show0 = prev.show, init0 = prev.init;
    prev.init = async function () { if (!inited) { inited = true; init(); } return init0.apply(this, arguments); };
    prev.show = function () { if (!inited) { inited = true; init(); } return show0.apply(this, arguments); };
  }
  ECO.s2cal = { state: S, fit, models };
})();
