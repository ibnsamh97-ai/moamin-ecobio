/* =====================================================================
   EcoBio AI — قارئ الأطياف (FTIR وXRD وUV-Vis)
   ارفع ملف الجهاز (عمودان: الموجة أو الزاوية، والشدة) لثلاثة أطياف حتى،
   فتُحدَّد القمم بالحساب (البروز prominence) وتُقارن بجداول مرجعية منشورة،
   وتُحسب إزاحة القمم وظهورها واختفاؤها بين المادة قبل الامتزاز وبعده.
   التعيينات «مرشّحة» من مدى الجداول، وتُؤكَّد بخبرة الباحث ومراجعه.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, TB = ECO.tab;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const ok = v => typeof v === "number" && isFinite(v);
  const COLS = ["#4fc8dc", "#e6ae4f", "#93dd8a"];
  const KEY = "spectra_v1";

  /* جداول مرجعية: FTIR (Socrates 2001؛ Pavia et al. 2015)، XRD لأشعة Cu Kα (قاعدة RRUFF)، UV-Vis (Standard Methods) */
  const FTIR = [
    [3200, 3600, "O–H (هيدروكسيل، ماء، سليلوز) وقد يتداخل N–H"],
    [2850, 2970, "C–H تمدد أليفاتي (CH₂، CH₃)"],
    [2300, 2380, "CO₂ الجوي (أثر من القياس غالباً)"],
    [1700, 1750, "C=O (كربوكسيل أو إستر؛ الهيميسليلوز قرب 1730)"],
    [1630, 1665, "انحناء ماء ممتز H–O–H أو C=O مقترن / أميد"],
    [1580, 1610, "C=C حلقة عطرية (لجنين)"],
    [1500, 1520, "C=C حلقة عطرية (لجنين قرب 1510)"],
    [1400, 1460, "CO₃²⁻ تمدد غير متناظر (كالسايت قرب 1420) أو انحناء CH₂"],
    [1365, 1385, "انحناء C–H (سليلوز)"],
    [1225, 1275, "C–O (لجنين أو مجموعات أسيتيل)"],
    [1150, 1170, "C–O–C غير متناظر (سليلوز)"],
    [1000, 1110, "C–O (سليلوز) أو P–O (فوسفات) أو Si–O"],
    [890, 900, "رابطة β-جلايكوسيدية (سليلوز)"],
    [865, 885, "CO₃²⁻ انحناء خارج المستوى (كالسايت قرب 875)"],
    [705, 718, "CO₃²⁻ انحناء داخل المستوى (كالسايت قرب 712)"],
    [550, 610, "O–P–O انحناء (فوسفات)"],
    [400, 500, "M–O أو Si–O انحناء"]
  ];
  const XRD = [
    [29.4, "كالسايت CaCO₃ (104)"], [26.6, "كوارتز SiO₂ (101)"], [20.9, "كوارتز SiO₂ (100)"], [30.9, "دولومايت (104)"],
    [11.6, "جبس CaSO₄·2H₂O (020)"], [12.4, "كاولينايت (001)"], [31.7, "هالايت NaCl (200)"], [31.8, "هيدروكسي أباتايت (211)"],
    [33.2, "هيماتايت Fe₂O₃ (104)"], [35.5, "ماغنيتايت Fe₃O₄ (311)"], [21.2, "غوثايت (110)"], [26.2, "أراغونايت (111)"],
    [22.6, "سليلوز I (200)"], [16.0, "سليلوز I (110)"]
  ];
  const UV = [[880, "أزرق الموليبدينوم (فوسفات، SM 4500-P E)"], [664, "المثيلين الأزرق (أحادي) أو كلوروفيل-a"], [610, "المثيلين الأزرق (ثنائي)"], [220, "النترات (SM 4500-NO₃⁻ B)"], [275, "تصحيح المادة العضوية للنترات"], [292, "المثيلين الأزرق (UV)"]];
  const MODES = {
    ftir: { n: "FTIR", x: "العدد الموجي (cm⁻¹)", y: "النفاذية %", tol: 15, ctol: 40, dist: 8, prom: 2, rev: true },
    xrd: { n: "XRD", x: "2θ (درجة)", y: "الشدة (عدّات)", tol: 0.3, ctol: 0.3, dist: 0.25, prom: 4, rev: false },
    uv: { n: "UV-Vis", x: "الطول الموجي (nm)", y: "الامتصاصية", tol: 6, ctol: 10, dist: 6, prom: 3, rev: false }
  };

  const DEF = () => ({ v: 1, mode: "ftir", trans: true, sens: 2, smooth: true, sp: [{ name: "قبل الامتزاز", pts: [] }, { name: "بعد الامتزاز", pts: [] }, { name: "طيف ثالث (اختياري)", pts: [] }] });
  let S = (() => { const s = U.store.get(KEY, null); return s && s.v === 1 ? s : DEF(); })();
  const save = () => U.store.set(KEY, S);
  let ch = null;

  /* ---------- قراءة الملف ---------- */
  function parse(text) {
    const pts = [];
    String(text || "").split(/\r?\n/).forEach(line => {
      const nums = line.trim().split(/[\s,;\t]+/).map(x => parseFloat(x)).filter(ok);
      if (nums.length >= 2) pts.push([nums[0], nums[1]]);
    });
    return pts;
  }
  async function readFile(f) {
    if (/\.xlsx$/i.test(f.name)) { const r = await TB.readFile(f); return r.rows.map(row => row.map(TB.num)).filter(r => ok(r[0]) && ok(r[1])).map(r => [r[0], r[1]]); }
    return parse(await f.text());
  }

  /* ---------- معالجة الطيف ---------- */
  function prep(pts) {
    const p = pts.filter(q => ok(q[0]) && ok(q[1])).slice().sort((a, b) => a[0] - b[0]);
    if (!S.smooth || p.length < 9) return p;
    // تنعيم Savitzky–Golay بنافذة 5 نقاط (تربيعي)
    const c = [-3, 12, 17, 12, -3], out = p.map(q => q.slice());
    for (let i = 2; i < p.length - 2; i++) out[i][1] = (c[0] * p[i - 2][1] + c[1] * p[i - 1][1] + c[2] * p[i][1] + c[3] * p[i + 1][1] + c[4] * p[i + 2][1]) / 35;
    return out;
  }
  /* القمم بالبروز: ارتفاع القمة عن أعلى الحدين الأدنيين قبل الوصول إلى قمة أعلى */
  function peaks(pts) {
    const M = MODES[S.mode], inv = S.mode === "ftir" && S.trans;
    const y = pts.map(p => (inv ? -p[1] : p[1])), x = pts.map(p => p[0]);
    const range = Math.max(...y) - Math.min(...y); if (!(range > 0)) return [];
    const minProm = range * (Number(S.sens) || M.prom) / 100;
    const cand = [];
    for (let i = 1; i < y.length - 1; i++) {
      if (!(y[i] > y[i - 1] && y[i] >= y[i + 1])) continue;
      let l = y[i], j = i - 1; while (j >= 0 && y[j] <= y[i]) { if (y[j] < l) l = y[j]; j--; }
      let r = y[i], k = i + 1; while (k < y.length && y[k] <= y[i]) { if (y[k] < r) r = y[k]; k++; }
      const prom = y[i] - Math.max(l, r);
      if (prom >= minProm) cand.push({ x: x[i], y: pts[i][1], prom, rel: prom / range });
    }
    // مسافة دنيا بين القمم: نُبقي الأبرز
    cand.sort((a, b) => b.prom - a.prom);
    const kept = []; cand.forEach(c => { if (!kept.some(k => Math.abs(k.x - c.x) < M.dist)) kept.push(c); });
    return kept.sort((a, b) => (M.rev ? b.x - a.x : a.x - b.x)).slice(0, 40).map(p => ({ ...p, asg: assign(p.x) }));
  }
  function assign(x) {
    if (S.mode === "ftir") return FTIR.filter(([lo, hi]) => x >= lo - 5 && x <= hi + 5).map(r => r[2]);
    const ref = S.mode === "xrd" ? XRD : UV, tol = S.mode === "xrd" ? MODES.xrd.tol : MODES.uv.tol;
    return ref.filter(([p]) => Math.abs(p - x) <= tol).sort((a, b) => Math.abs(a[0] - x) - Math.abs(b[0] - x)).map(r => `${r[1]} (${r[0]})`);
  }
  function compare(P) {
    const tol = MODES[S.mode].ctol, base = P[0];
    if (!base || !base.length) return [];
    return P.slice(1).map((pk, idx) => {
      if (!pk || !pk.length) return null;
      const used = new Set(), rows = [];
      base.forEach(b => {
        let best = -1, bd = Infinity; pk.forEach((q, j) => { const d = Math.abs(q.x - b.x); if (d <= tol && d < bd && !used.has(j)) { bd = d; best = j; } });
        if (best >= 0) { used.add(best); const q = pk[best]; rows.push({ k: Math.abs(q.x - b.x) >= (S.mode === "xrd" ? 0.05 : 2) ? "shift" : "same", a: b.x, b: q.x, d: q.x - b.x, asg: b.asg }); }
        else rows.push({ k: "gone", a: b.x, b: NaN, d: NaN, asg: b.asg });
      });
      pk.forEach((q, j) => { if (!used.has(j)) rows.push({ k: "new", a: NaN, b: q.x, d: NaN, asg: q.asg }); });
      return { i: idx + 1, rows };
    }).filter(Boolean);
  }

  /* ---------- الواجهة ---------- */
  function render() {
    const host = document.getElementById("spec-root"); if (!host) return;
    const M = MODES[S.mode];
    host.innerHTML = `
      <section class="panel">
        <div class="panel-h"><h3>${ico("i-scan")}نوع الطيف والإعدادات</h3></div>
        <div class="seg" role="group" aria-label="نوع الطيف">${Object.entries(MODES).map(([k, m]) => `<button type="button" data-mode="${k}" class="${S.mode === k ? "on" : ""}" aria-pressed="${S.mode === k}">${m.n}</button>`).join("")}</div>
        <div class="sb-grid">
          ${S.mode === "ftir" ? `<div class="field"><label for="sp-trans">المحور الرأسي</label><select id="sp-trans" class="input" data-k="trans"><option value="1" ${S.trans ? "selected" : ""}>نفاذية %T (القمم إلى الأسفل)</option><option value="0" ${!S.trans ? "selected" : ""}>امتصاصية (القمم إلى الأعلى)</option></select></div>` : ""}
          <div class="field"><label for="sp-sens">حساسية كشف القمم (% من مدى الشدة)</label><input id="sp-sens" class="input num" data-k="sens" value="${esc(S.sens)}" inputmode="decimal"></div>
          <div class="field"><label class="sp-chk"><input type="checkbox" data-k="smooth" ${S.smooth ? "checked" : ""}> تنعيم خفيف (Savitzky–Golay، 5 نقاط)</label></div>
        </div>
        <div class="sp-list">${S.sp.map((s, i) => `<div class="sp-item" style="--c:${COLS[i]}"><i></i><input class="input" data-name="${i}" value="${esc(s.name)}" aria-label="اسم الطيف ${i + 1}">
          <label class="btn btn-sm ${i === 0 ? "btn-primary" : ""}" for="sp-f${i}">${ico("i-upload")}${s.pts.length ? "استبدل" : "ارفع الملف"}</label><input id="sp-f${i}" type="file" data-file="${i}" accept=".csv,.txt,.dpt,.xy,.asc,.prn,.xlsx,text/plain,text/csv" hidden>
          <span class="faint sp-n">${s.pts.length ? `${s.pts.length} نقطة · ${fmtX(Math.min(...s.pts.map(p => p[0])))}–${fmtX(Math.max(...s.pts.map(p => p[0])))}` : "لا ملف"}</span>
          ${s.pts.length ? `<button type="button" class="btn btn-ghost btn-sm" data-clear="${i}" aria-label="حذف الطيف">${ico("i-close")}</button>` : ""}</div>`).join("")}</div>
        <p class="faint ex-note">الملف عمودان من الجهاز: ${esc(M.x)} ثم الشدة (CSV أو TXT أو DPT أو Excel). أو الصق العمودين هنا:</p>
        <div class="sp-paste"><textarea class="input mono" id="sp-paste" rows="3" dir="ltr" placeholder="4000, 98.2&#10;3998, 98.1&#10;…"></textarea><div class="row"><select class="input" id="sp-into" aria-label="الطيف">${S.sp.map((s, i) => `<option value="${i}">${esc(s.name)}</option>`).join("")}</select><button type="button" class="btn btn-sm" data-act="paste">${ico("i-plus")}أضف الملصوق</button></div></div>
      </section>
      <div id="sp-out"></div>`;
    analyze();
  }
  const fmtX = v => (S.mode === "xrd" ? U.fmt(v, 2) : U.fmt(v, 0));
  function analyze() {
    const out = document.getElementById("sp-out"); if (!out) return;
    const M = MODES[S.mode], data = S.sp.map(s => prep(s.pts)), P = data.map(d => (d.length > 10 ? peaks(d) : null));
    if (!P.some(Boolean)) { out.innerHTML = `<div class="notice info">${ico("i-info")}<span>ارفع ملف طيف واحداً على الأقل. للمقارنة ارفع الطيف قبل الامتزاز أولاً ثم بعده.</span></div>`; if (ch) { ch.destroy(); ch = null; } return; }
    const cmp = compare(P);
    out.innerHTML = `
      <section class="panel"><div class="panel-h"><h3>${ico("i-chart")}الطيف والقمم</h3><span class="sub">${P.filter(Boolean).map((p, i) => `${esc(S.sp[i].name)}: ${p.length} قمة`).join(" · ")}</span></div>
        <div class="chart-box sp-chart"><canvas id="sp-chart"></canvas></div></section>
      ${P.map((pk, i) => !pk ? "" : `<section class="panel"><div class="panel-h"><h3><span class="sb-dot" style="--c:${COLS[i]}"></span>قمم «${esc(S.sp[i].name)}»</h3><span class="sub">التعيينات مرشّحة من الجداول المرجعية</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(M.x)}</th><th>${S.mode === "ftir" && S.trans ? "النفاذية" : "الشدة"}</th><th>البروز النسبي</th><th>التعيين المرشّح</th></tr></thead><tbody>
          ${pk.map(p => `<tr><td class="num">${fmtX(p.x)}</td><td class="num">${U.fmt(p.y, 2)}</td><td class="num">${U.fmt(100 * p.rel, 1)}%</td><td class="sp-asg">${p.asg.length ? p.asg.map(esc).join("<br>") : `<span class="faint">غير موجود في الجدول</span>`}</td></tr>`).join("")}
        </tbody></table></div></section>`).join("")}
      ${cmp.map(c => `<section class="panel"><div class="panel-h"><h3>${ico("i-refresh")}المقارنة: «${esc(S.sp[0].name)}» ← «${esc(S.sp[c.i].name)}»</h3><span class="sub">إزاحة القمة تدل على مشاركة المجموعة في الارتباط</span></div>
        ${cmpText(c)}
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>الحالة</th><th>${esc(S.sp[0].name)}</th><th>${esc(S.sp[c.i].name)}</th><th>الإزاحة</th><th>التعيين</th></tr></thead><tbody>
          ${c.rows.filter(r => r.k !== "same").concat(c.rows.filter(r => r.k === "same")).map(r => `<tr class="${r.k === "same" ? "faint" : ""}"><td>${{ shift: "انزاحت", gone: "اختفت", new: "ظهرت", same: "ثابتة" }[r.k]}</td><td class="num">${ok(r.a) ? fmtX(r.a) : "—"}</td><td class="num">${ok(r.b) ? fmtX(r.b) : "—"}</td><td class="num">${ok(r.d) ? (r.d > 0 ? "+" : "") + (S.mode === "xrd" ? U.fmt(r.d, 2) : U.fmt(r.d, 0)) : "—"}</td><td class="sp-asg">${r.asg.map(esc).join("<br>") || "—"}</td></tr>`).join("")}
        </tbody></table></div></section>`).join("")}
      <section class="panel"><div class="row"><button type="button" class="btn btn-primary" data-act="xlsx">${ico("i-down")}القمم والمقارنة Excel</button></div>
        <details class="db-method"><summary>${ico("i-book")}الطريقة والمراجع</summary><p>القمة تُقبل إذا زاد بروزها عن النسبة المحددة من مدى الشدة، مع مسافة دنيا بين القمم، بعد تنعيم Savitzky–Golay اختياري. التعيين بمطابقة موضع القمة مع مدى الجداول المرجعية: FTIR من Socrates, G. (2001) Infrared and Raman Characteristic Group Frequencies, 3rd ed., Wiley؛ وPavia, D.L. et al. (2015) Introduction to Spectroscopy, 5th ed.؛ XRD لأشعة Cu Kα من قاعدة RRUFF (rruff.info) بتسامح ±0.3°؛ UV-Vis من Standard Methods. التعيين مرشّح وليس تأكيداً؛ تحقق منه بمراجع مادتك.</p></details></section>`;
    draw(data, P);
  }
  function cmpText(c) {
    const sh = c.rows.filter(r => r.k === "shift"), nw = c.rows.filter(r => r.k === "new"), gn = c.rows.filter(r => r.k === "gone");
    const t = [];
    if (sh.length) t.push(`انزاحت ${sh.length} ${sh.length > 2 ? "قمم" : "قمة"} (${sh.slice(0, 4).map(r => `من ${fmtX(r.a)} إلى ${fmtX(r.b)}`).join("، ")})`);
    if (nw.length) t.push(`ظهرت ${nw.length} ${nw.length > 2 ? "قمم جديدة" : "قمة جديدة"} (${nw.slice(0, 4).map(r => fmtX(r.b)).join("، ")})`);
    if (gn.length) t.push(`اختفت ${gn.length} (${gn.slice(0, 4).map(r => fmtX(r.a)).join("، ")})`);
    if (S.mode === "ftir" && nw.concat(sh).some(r => (r.b >= 1000 && r.b <= 1110) || (r.b >= 550 && r.b <= 610))) t.push("وتغيّر منطقة 1000–1110 و550–610 cm⁻¹ يتفق مع ارتباط الفوسفات (P–O) بالسطح");
    return t.length ? `<p class="sb-note">${t.join("؛ ")}.</p>` : `<p class="sb-note">لا تغيير واضح في مواضع القمم ضمن التسامح.</p>`;
  }
  function draw(data, P) {
    if (ch) { ch.destroy(); ch = null; }
    const c = document.getElementById("sp-chart"); if (!c || !window.Chart) return;
    const M = MODES[S.mode];
    const thin = d => { const step = Math.max(1, Math.ceil(d.length / 1500)); return d.filter((_, i) => i % step === 0).map(p => ({ x: p[0], y: p[1] })); };
    const ds = [];
    data.forEach((d, i) => { if (d.length > 10) ds.push({ label: S.sp[i].name, data: thin(d), borderColor: COLS[i], backgroundColor: COLS[i], pointRadius: 0, borderWidth: 1.4, showLine: true, tension: 0 }); });
    P.forEach((pk, i) => { if (pk) ds.push({ label: `قمم ${S.sp[i].name}`, data: pk.map(p => ({ x: p.x, y: p.y })), borderColor: COLS[i], backgroundColor: "transparent", pointRadius: 4, pointStyle: "triangle", rotation: S.mode === "ftir" && S.trans ? 180 : 0, showLine: false }); });
    const labels = { id: "spLbl", afterDatasetsDraw(chart) {
      const ctx = chart.ctx; ctx.save(); ctx.font = "10px IBM Plex Mono, monospace"; ctx.textAlign = "center";
      chart.data.datasets.forEach((d, di) => { if (!/^قمم /.test(d.label) || chart.getDatasetMeta(di).hidden) return; ctx.fillStyle = d.borderColor;
        chart.getDatasetMeta(di).data.forEach((pt, j) => { const v = d.data[j]; if (!v || j > 18) return; ctx.fillText(S.mode === "xrd" ? v.x.toFixed(1) : Math.round(v.x), pt.x, pt.y + (S.mode === "ftir" && S.trans ? 14 : -8)); }); });
      ctx.restore();
    } };
    ch = new Chart(c, { type: "scatter", data: { datasets: ds }, options: { animation: false, maintainAspectRatio: false, parsing: false, plugins: { legend: { position: "bottom", labels: { filter: it => !/^قمم /.test(it.text) } }, tooltip: { callbacks: { label: t => `${t.dataset.label}: ${fmtX(t.parsed.x)} · ${U.fmt(t.parsed.y, 2)}` } } }, scales: { x: { type: "linear", reverse: !!M.rev, min: Math.min(...data.filter(d => d.length).map(d => d[0][0])), max: Math.max(...data.filter(d => d.length).map(d => d[d.length - 1][0])), title: { display: true, text: M.x } }, y: { title: { display: true, text: S.mode === "ftir" ? (S.trans ? "النفاذية %" : "الامتصاصية") : M.y } } } }, plugins: [labels] });
  }
  function exportXlsx() {
    const data = S.sp.map(s => prep(s.pts)), P = data.map(d => (d.length > 10 ? peaks(d) : null)), sheets = [];
    P.forEach((pk, i) => { if (pk) sheets.push({ name: `قمم ${i + 1}`, rows: [[MODES[S.mode].x, "الشدة", "البروز النسبي %", "التعيين المرشّح"]].concat(pk.map(p => [p.x, p.y, 100 * p.rel, p.asg.join(" | ")])) }); });
    compare(P).forEach(c => sheets.push({ name: `مقارنة 1-${c.i + 1}`, rows: [["الحالة", S.sp[0].name, S.sp[c.i].name, "الإزاحة", "التعيين"]].concat(c.rows.map(r => [r.k, r.a, r.b, r.d, r.asg.join(" | ")])) }));
    if (sheets.length) TB.xlsx(sheets, `قمم-${MODES[S.mode].n}.xlsx`);
  }

  function bind() {
    const host = document.getElementById("spec-root"); if (!host || host.dataset.bound) return; host.dataset.bound = "1";
    host.addEventListener("click", e => {
      const m = e.target.closest("[data-mode]"); if (m) { S.mode = m.dataset.mode; S.sens = MODES[S.mode].prom; save(); render(); return; }
      const cl = e.target.closest("[data-clear]"); if (cl) { S.sp[+cl.dataset.clear].pts = []; save(); render(); return; }
      const a = e.target.closest("[data-act]"); if (!a) return;
      if (a.dataset.act === "paste") { const pts = parse(document.getElementById("sp-paste").value), i = +document.getElementById("sp-into").value; if (pts.length < 10) { U.toast("الصق 10 نقاط على الأقل (عمودان)"); return; } S.sp[i].pts = pts; save(); render(); }
      if (a.dataset.act === "xlsx") exportXlsx();
    });
    host.addEventListener("change", async e => {
      const el = e.target;
      if (el.dataset.file !== undefined) { const f = el.files && el.files[0]; el.value = ""; if (!f) return; try { const pts = await readFile(f); if (pts.length < 10) throw new Error("الملف لا يحتوي عمودين رقميين كافيين"); S.sp[+el.dataset.file].pts = pts.length > 20000 ? pts.filter((_, i) => i % Math.ceil(pts.length / 20000) === 0) : pts; if (/^(قبل|بعد|طيف)/.test(S.sp[+el.dataset.file].name) && +el.dataset.file > 0 && !S.sp[0].pts.length) U.toast("ارفع الطيف المرجعي (قبل) في الخانة الأولى للمقارنة"); save(); render(); } catch (x) { U.toast("تعذّرت قراءة الملف: " + x.message); } return; }
      if (el.dataset.k === "trans") { S.trans = el.value === "1"; save(); analyze(); }
      if (el.dataset.k === "sens") { const v = parseFloat(el.value); if (v > 0) { S.sens = v; save(); analyze(); } }
      if (el.dataset.k === "smooth") { S.smooth = el.checked; save(); analyze(); }
      if (el.dataset.name !== undefined) { S.sp[+el.dataset.name].name = el.value || `طيف ${+el.dataset.name + 1}`; save(); analyze(); }
    });
  }
  ECO.views.spectra = { init() { bind(); render(); } };
})();
