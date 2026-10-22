/* =====================================================================
   الباحث الذكي — أدوات ذكاء اصطناعي مبنية على مصادر حقيقية فقط
   1) البحث في الأدبيات: بحوث حقيقية من OpenAlex (أكثر من 250 مليون عمل علمي)،
      وGemini يجيب من ملخصاتها فقط مع رقم المرجع لكل معلومة.
   2) قارئ البحوث: يستخرج من ملف PDF البيانات الوصفية والقيم المقاسة إلى جدول.
   3) مرشّح طريقة المعالجة: يبحث عن دراسات إزالة الملوث ويقارن الطرق من ملخصاتها.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, esc = U.esc;
  const OA = "https://api.openalex.org/works";
  const S = { tab: "lit", lit: [], treat: [], pdf: null };
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- OpenAlex ---------- */
  const abstractOf = inv => {
    if (!inv) return "";
    const w = []; Object.entries(inv).forEach(([t, ps]) => ps.forEach(p => { w[p] = t; }));
    return w.filter(Boolean).join(" ");
  };
  async function openalex(query, n = 12, from = 2005) {
    const u = `${OA}?search=${encodeURIComponent(query)}&per_page=${n}&filter=has_abstract:true,from_publication_date:${from}-01-01&select=id,title,publication_year,doi,authorships,primary_location,cited_by_count,abstract_inverted_index`;
    const r = await fetch(u); if (!r.ok) throw new Error("تعذّر الوصول إلى OpenAlex (" + r.status + ")");
    const j = await r.json();
    return (j.results || []).map((w, i) => ({
      n: i + 1, title: w.title || "", year: w.publication_year, doi: w.doi ? w.doi.replace("https://doi.org/", "") : "",
      url: w.doi || w.id, cites: w.cited_by_count || 0,
      journal: (w.primary_location && w.primary_location.source && w.primary_location.source.display_name) || "",
      authors: (w.authorships || []).slice(0, 3).map(a => a.author && a.author.display_name).filter(Boolean).join("، ") + ((w.authorships || []).length > 3 ? " وآخرون" : ""),
      abstract: abstractOf(w.abstract_inverted_index).slice(0, 1800)
    })).filter(p => p.abstract.length > 80);
  }
  /* سؤال عربي → عبارة بحث إنكليزية (الأدبيات العلمية أغلبها بالإنكليزية) */
  async function toQuery(q) {
    if (!/[؀-ۿ]/.test(q)) return q;
    let out = "";
    await ECO.gemini.generate({ json: true, temperature: 0, system: "Translate a research question into a concise English academic search query (5–10 keywords). Return JSON {\"q\": \"...\"} only.",
      contents: [{ role: "user", parts: [{ text: q }] }], onText: t => { out = t; } });
    try { return JSON.parse(out).q || q; } catch (e) { return q; }
  }
  const refList = P => `<ol class="sch-refs">${P.map(p => `<li data-r="${p.n}"><b>[${p.n}]</b> ${esc(p.authors)} (${p.year || "—"}). <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>. <i>${esc(p.journal)}</i>${p.cites ? ` · استُشهد به ${U.fmt(p.cites, 0)} مرة` : ""}</li>`).join("")}</ol>`;
  const ctx = P => P.map(p => `[${p.n}] ${p.title} (${p.year}, ${p.journal})\nAbstract: ${p.abstract}`).join("\n\n");
  const needAI = box => { if (ECO.gemini.ready && !ECO.gemini.ready()) { ECO.gemini.renderInto(box, ""); return true; } return false; };

  /* ---------- 1) الأدبيات ---------- */
  async function runLit() {
    const q = U.$("#sch-q").value.trim(), out = U.$("#sch-lit-out"); if (!q) return;
    if (needAI(out)) return;
    out.innerHTML = `<p class="muted">جارٍ البحث في OpenAlex…</p>`;
    try {
      const eq = await toQuery(q);
      const P = await openalex(eq, 12);
      if (!P.length) { out.innerHTML = `<p class="empty">لم أجد بحوثاً لها ملخصات عن «${esc(eq)}». جرّب كلمات أعم.</p>`; return; }
      S.lit = P;
      out.innerHTML = `<p class="db-cap">بحثت عن: <bdi dir="ltr">${esc(eq)}</bdi> · ${P.length} بحثاً حقيقياً بملخصاتها</p><div class="sch-ans" id="sch-ans"><p class="typing"><i></i><i></i><i></i></p></div><h4 class="an-h">المراجع</h4>${refList(P)}`;
      await ECO.gemini.generate({ temperature: 0.2,
        system: "أنت باحث علمي دقيق. أجب بالعربية الفصحى المبسطة اعتماداً فقط على ملخصات البحوث المرقّمة المعطاة. ضع رقم المرجع بين قوسين مربعين بعد كل معلومة مثل [3]. لا تذكر أي رقم أو نتيجة غير موجودة في الملخصات. إذا لم تكفِ الملخصات للإجابة فقل ذلك صراحة. اختم بفقرة قصيرة: ما الذي لم تدرسه هذه البحوث ويصلح فجوة بحثية في العراق.",
        contents: [{ role: "user", parts: [{ text: `السؤال: ${q}\n\nالبحوث:\n${ctx(P)}` }] }],
        onText: t => { U.$("#sch-ans").innerHTML = U.md(t).replace(/\[(\d+)\]/g, '<a href="#" data-ref="$1" class="sch-cite">[$1]</a>'); } });
    } catch (e) { out.innerHTML = `<div class="notice warn">${esc(e.message)}</div>`; }
  }

  /* ---------- 2) قارئ PDF ---------- */
  function readFile(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); }); }
  async function runPdf(f) {
    const out = U.$("#sch-pdf-out"); if (!f) return;
    if (f.size > 10 * 1024 * 1024) { out.innerHTML = `<div class="notice warn">الملف أكبر من 10 ميغابايت.</div>`; return; }
    if (needAI(out)) return;
    out.innerHTML = `<p class="muted">جارٍ قراءة «${esc(f.name)}»… قد يستغرق دقيقة.</p>`;
    try {
      const b64 = await readFile(f); let txt = "";
      await ECO.gemini.generate({ json: true, temperature: 0,
        system: "You extract data from scientific papers exactly as written. Never infer or invent values. Use null when something is not stated.",
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: f.type || "application/pdf", data: b64 } }, { text: `استخرج من هذا البحث JSON بهذا الشكل فقط:
{"title":"","authors":"","year":null,"journal":"","doi":"","place":"","lat":null,"lon":null,"medium":"","period":"","methods":"","main_findings":"جملتان بالعربية",
 "values":[{"site":"","parameter":"","value":null,"unit":"","stat":"mean|min|max|value","season":""}]}
القيم: كل قيمة رقمية مقاسة في جداول البحث (حتى 150 قيمة)، كما وردت تماماً بوحداتها. الإحداثيات فقط إذا ذُكرت صراحة في البحث.` }] }],
        onText: t => { txt = t; } });
      const J = JSON.parse(txt.replace(/^```json|```$/g, "").trim());
      S.pdf = J;
      const V = (J.values || []).filter(v => v && v.parameter);
      out.innerHTML = `<div class="panel"><h4>${esc(J.title || f.name)}</h4>
        <dl class="kv"><dt>الباحثون</dt><dd>${esc(J.authors || "—")}</dd><dt>المجلة والسنة</dt><dd>${esc(J.journal || "—")} ${J.year ? "· " + esc(J.year) : ""}</dd>
        ${J.doi ? `<dt>DOI</dt><dd><a href="https://doi.org/${esc(J.doi)}" target="_blank" rel="noopener">${esc(J.doi)}</a></dd>` : ""}
        <dt>المكان</dt><dd>${esc(J.place || "—")}${U.isNum(J.lat) ? ` · <bdi dir="ltr">${J.lat}, ${J.lon}</bdi>` : ""}</dd><dt>الوسط والفترة</dt><dd>${esc(J.medium || "—")} · ${esc(J.period || "—")}</dd>
        <dt>طرق القياس</dt><dd>${esc(J.methods || "—")}</dd><dt>أهم النتائج</dt><dd>${esc(J.main_findings || "—")}</dd></dl>
        <div class="row"><button type="button" class="btn btn-sm" id="sch-pdf-x">${ico("i-table")}Excel</button><button type="button" class="btn btn-ghost btn-sm" id="sch-pdf-c">${ico("i-down")}CSV</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>الموقع</th><th>المعيار</th><th class="num">القيمة</th><th>الوحدة</th><th>النوع</th><th>الموسم</th></tr></thead><tbody>
        ${V.map(v => `<tr><td>${esc(v.site || "")}</td><td>${esc(v.parameter)}</td><td class="num">${esc(v.value)}</td><td><bdi>${esc(v.unit || "")}</bdi></td><td>${esc(v.stat || "")}</td><td>${esc(v.season || "")}</td></tr>`).join("")}</tbody></table></div>
        <p class="db-cap">${V.length} قيمة مستخرجة. راجعها مقابل جداول البحث الأصلية قبل استعمالها؛ الاستخراج الآلي قد يخطئ في جداول معقدة.</p></div>`;
      const rows = [["site", "parameter", "value", "unit", "stat", "season"]].concat(V.map(v => [v.site, v.parameter, v.value, v.unit, v.stat, v.season]));
      const save = (blob, name) => (ECO.native && ECO.native.save ? ECO.native.save(blob, name) : ECO.xlsx.download(blob, name));
      U.$("#sch-pdf-x").onclick = () => save(ECO.xlsx.write([{ name: "القيم", rows }, { name: "البحث", rows: Object.entries(J).filter(([k]) => k !== "values").map(([k, v]) => [k, v == null ? "" : String(v)]) }]), "بيانات-البحث.xlsx");
      U.$("#sch-pdf-c").onclick = () => save(new Blob(["﻿" + rows.map(r => r.map(c => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), "بيانات-البحث.csv");
    } catch (e) { out.innerHTML = `<div class="notice warn">تعذّرت القراءة: ${esc(e.message)}</div>`; }
  }

  /* ---------- 3) مرشّح طريقة المعالجة ---------- */
  const POLL = { Pb: "lead Pb", Cd: "cadmium Cd", Cr: "chromium Cr", Ni: "nickel Ni", Cu: "copper Cu", Zn: "zinc Zn", As: "arsenic", TPH: "petroleum hydrocarbons oil TPH", phenol: "phenol", NO3: "nitrate", PO4: "phosphate", COD: "COD BOD organic load", dye: "dye" };
  const POLL_AR = { Pb: "الرصاص", Cd: "الكادميوم", Cr: "الكروم", Ni: "النيكل", Cu: "النحاس", Zn: "الزنك", As: "الزرنيخ", TPH: "الهيدروكربونات النفطية", phenol: "الفينول", NO3: "النترات", PO4: "الفوسفات", COD: "الحمل العضوي (BOD/COD)", dye: "الأصباغ" };
  const MED = { water: "contaminated water", ww: "industrial wastewater refinery effluent", soil: "contaminated soil", sed: "river sediment" };
  async function runTreat() {
    const p = U.$("#sch-tp").value, m = U.$("#sch-tm").value, c = U.$("#sch-tc").value.trim(), out = U.$("#sch-tr-out");
    if (needAI(out)) return;
    out.innerHTML = `<p class="muted">جارٍ جمع دراسات الإزالة من OpenAlex…</p>`;
    try {
      const qs = [`${POLL[p]} removal ${MED[m]} phytoremediation efficiency`, `${POLL[p]} removal ${MED[m]} biosorption bioremediation bacteria`, `${POLL[p]} adsorption biochar low-cost ${MED[m]} removal efficiency`];
      const all = []; for (const q of qs) { try { (await openalex(q, 7, 2010)).forEach(x => { if (!all.some(y => y.title === x.title)) all.push(x); }); } catch (e) { /* */ } }
      const P = all.slice(0, 18).map((x, i) => Object.assign(x, { n: i + 1 }));
      if (!P.length) { out.innerHTML = `<p class="empty">لم أجد دراسات كافية.</p>`; return; }
      S.treat = P;
      out.innerHTML = `<div class="sch-ans" id="sch-tr-ans"><p class="typing"><i></i><i></i><i></i></p></div><h4 class="an-h">الدراسات المعتمدة (${P.length})</h4>${refList(P)}`;
      await ECO.gemini.generate({ temperature: 0.2,
        system: "أنت خبير معالجة بيئية. اعتمد فقط على ملخصات الدراسات المرقّمة. كل نسبة إزالة أو ظرف تشغيل يجب أن يأتي من ملخص مع رقمه [n]؛ إن لم يُذكر رقم فاكتب «غير مذكور». لا تخترع.",
        contents: [{ role: "user", parts: [{ text: `الملوث: ${POLL_AR[p]} · الوسط: ${U.$("#sch-tm").selectedOptions[0].text}${c ? ` · التركيز: ${c}` : ""} · المكان: محافظة صلاح الدين، العراق (مناخ حار جاف، صيف 45°م).
اكتب:
1) جدول Markdown يقارن الطرق: الطريقة | الكائن أو المادة | نسبة الإزالة | الظروف (pH، زمن، تركيز) | المرجع.
2) الأنسب لصلاح الدين ولماذا (التكلفة، توفر المادة محلياً مثل القصب والبردي ومخلفات النخيل إن ذُكرت في الدراسات، تحمّل الحرارة).
3) تجربة مختبرية مقترحة لطالب ماجستير لاختبار الطريقة الأنسب بأجهزة بسيطة.

الدراسات:
${ctx(P)}` }] }],
        onText: t => { U.$("#sch-tr-ans").innerHTML = U.md(t).replace(/\[(\d+)\]/g, '<a href="#" data-ref="$1" class="sch-cite">[$1]</a>'); } });
      out.insertAdjacentHTML("beforeend", `<p class="db-cap">كل الأرقام من ملخصات دراسات حقيقية منشورة؛ افتح المرجع وتحقق من النص الكامل قبل الاقتباس.</p>`);
    } catch (e) { out.innerHTML = `<div class="notice warn">${esc(e.message)}</div>`; }
  }

  function setTab(t) {
    S.tab = t;
    U.$$("#sch-tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
    U.$$(".sch-panel").forEach(p => { p.hidden = p.id !== "sch-p-" + t; });
  }
  function init() {
    const root = U.$("#view-scholar");
    U.$("#sch-tabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); };
    U.$("#sch-go").onclick = runLit;
    U.$("#sch-q").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); runLit(); } };
    U.$$("[data-sch-ex]").forEach(b => { b.onclick = () => { U.$("#sch-q").value = b.textContent; runLit(); }; });
    U.$("#sch-file").onchange = e => runPdf(e.target.files[0]);
    U.$("#sch-tp").innerHTML = Object.entries(POLL_AR).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    U.$("#sch-tr-go").onclick = runTreat;
    root.addEventListener("click", e => { const a = e.target.closest(".sch-cite"); if (!a) return; e.preventDefault(); const li = a.closest(".sch-panel").querySelector(`[data-r="${a.dataset.ref}"]`); if (li) { li.scrollIntoView({ behavior: "smooth", block: "center" }); li.classList.add("hl"); setTimeout(() => li.classList.remove("hl"), 1600); } });
  }
  ECO.views.scholar = { init, show() {} };
})();
