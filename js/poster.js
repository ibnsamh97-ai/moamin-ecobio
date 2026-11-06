/* =====================================================================
   EcoBio AI — ملصق علمي من بحثك
   Gemini يستخرج أقسام الملصق من رسالتك (PDF) أو من نص تلصقه، بلا إضافة،
   والطالب يراجع كل حقل ويعدّله قبل الطباعة. حين يكون المصدر نصاً ملصوقاً
   تُفحص الأرقام: كل رقم في الملصق غير موجود في النص يُعلَّم بالأصفر.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  if (!document.getElementById("sch-p-poster")) return;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const KEY = "poster_v1";
  const FIELDS = [
    ["title", "العنوان", 1], ["authors", "الباحث والمشرف", 1], ["affil", "الجهة", 1],
    ["intro", "المقدمة", 4], ["aims", "الأهداف (سطر لكل هدف)", 4], ["methods", "المواد وطرائق العمل (سطر لكل نقطة)", 6],
    ["results", "النتائج الرئيسة (سطر لكل نتيجة)", 7], ["concl", "الاستنتاجات والتوصيات (سطر لكل نقطة)", 4], ["refs", "أهم المراجع (سطر لكل مرجع)", 4]
  ];
  const P = Object.assign({ lang: "ar", size: "a0", src: "", srcKind: "", f: {}, imgs: [] }, U.store.get(KEY, {}) || {});
  P.imgs = []; // الصور لا تُحفظ في الجهاز لكبر حجمها
  const save = () => { try { U.store.set(KEY, { lang: P.lang, size: P.size, src: P.srcKind === "text" ? P.src.slice(0, 60000) : "", srcKind: P.srcKind === "text" ? "text" : "", f: P.f }); } catch (e) { /* */ } };
  let pdf64 = null, pdfName = "", busy = false;

  /* ---------- فحص الأرقام مقابل النص المصدر ---------- */
  const normNum = s => String(s).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/٫/g, ".").replace(/,(?=\d{3}\b)/g, "");
  const numsIn = s => (normNum(s).match(/\d+(?:\.\d+)?/g) || []).filter(n => n.length > 1 || +n > 9 || /\./.test(n));
  function missingNums(text) {
    if (P.srcKind !== "text" || !P.src) return [];
    const src = normNum(P.src);
    return Array.from(new Set(numsIn(text))).filter(n => !src.includes(n));
  }

  /* ---------- الاستخراج ---------- */
  async function extract() {
    if (busy) return;
    const out = U.$("#ps-msg");
    if (!ECO.gemini || !ECO.gemini.ready()) { out.innerHTML = `<div class="notice warn">${ico("i-info")}<span>استخراج الأقسام يحتاج المساعد الذكي، وهو غير مفعّل الآن. تقدر تكتب الحقول بنفسك أدناه وتطبع الملصق.</span></div>`; return; }
    const txt = U.$("#ps-text").value.trim();
    if (!pdf64 && txt.length < 300) { out.innerHTML = `<div class="notice warn">${ico("i-info")}<span>ارفع رسالتك PDF أو الصق ملخصها ونتائجها (300 حرف على الأقل).</span></div>`; return; }
    if (txt && !pdf64) { P.src = txt; P.srcKind = "text"; } else { P.src = ""; P.srcKind = "pdf"; }
    busy = true; U.$("#ps-go").disabled = true; out.innerHTML = `<p class="typing"><i></i><i></i><i></i></p><p class="faint">يقرأ بحثك ويستخرج أقسام الملصق…</p>`;
    const lang = P.lang === "en" ? "English" : "العربية الفصحى";
    const prompt = `استخرج محتوى ملصق علمي (poster) من ${pdf64 ? "هذا البحث" : "النص الآتي"} باللغة ${lang}. أعد JSON فقط:
{"title":"","authors":"الأسماء كما وردت","affil":"القسم والكلية والجامعة كما وردت","intro":"مقدمة من 2-3 جمل","aims":["..."],"methods":["..."],"results":["..."],"concl":["..."],"refs":["..."]}
القواعد الصارمة:
- لا تضف أي معلومة أو رقم أو مرجع غير موجود في البحث. انسخ كل رقم ووحدته كما وردا حرفياً.
- النتائج: 4-7 نقاط قصيرة، كل نقطة فيها رقم أو مقارنة من النتائج الفعلية للبحث.
- الطرائق: 4-6 نقاط قصيرة (المواد، التجارب، الأجهزة، التحليل الإحصائي).
- المراجع: 3-4 مراجع من قائمة مراجع البحث نفسه فقط؛ إن لم توجد اترك القائمة فارغة.
- إذا لم تجد حقلاً اتركه فارغاً.${pdf64 ? "" : "\n\nالنص:\n" + txt.slice(0, 60000)}`;
    const parts = pdf64 ? [{ inline_data: { mime_type: "application/pdf", data: pdf64 } }, { text: prompt }] : [{ text: prompt }];
    try {
      const r = await ECO.gemini.generate({ json: true, temperature: 0.1, system: "أنت تلخّص بحوثاً علمية في ملصقات دون أي إضافة أو تخمين.", contents: [{ role: "user", parts }] });
      const j = JSON.parse(String(r).replace(/^```json|```$/g, "").trim());
      const L = v => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).join("\n") : String(v || "").trim();
      P.f = { title: L(j.title), authors: L(j.authors), affil: L(j.affil), intro: L(j.intro), aims: L(j.aims), methods: L(j.methods), results: L(j.results), concl: L(j.concl), refs: L(j.refs) };
      save(); renderForm();
      const miss = missingNums(Object.values(P.f).join("\n"));
      out.innerHTML = P.srcKind === "text"
        ? `<div class="notice ${miss.length ? "warn" : "ok"}">${ico(miss.length ? "i-warn" : "i-check")}<span>${miss.length ? `أرقام في الملصق لم أجدها في نصك: <bdi dir="ltr">${miss.map(esc).join("، ")}</bdi>. صحّحها أو احذفها قبل الطباعة (مؤشرة بالأصفر).` : "كل الأرقام في الملصق موجودة في نصك. راجع الصياغة ثم اطبع."}</span></div>`
        : `<div class="notice warn">${ico("i-warn")}<span>استُخرجت الأقسام من ملف PDF. راجع كل رقم ونتيجة مع رسالتك قبل الطباعة؛ أنت المسؤول عن صحة الملصق.</span></div>`;
    } catch (e) {
      out.innerHTML = `<div class="notice warn">${ico("i-info")}<span>${esc(e && e.message && !/JSON|Unexpected/.test(e.message) ? e.message : "لم تُستخرج الأقسام بشكل منظم؛ أعد المحاولة أو اكتب الحقول بنفسك.")}</span></div>`;
    }
    busy = false; U.$("#ps-go").disabled = false;
  }

  /* ---------- النموذج ---------- */
  function renderForm() {
    U.$("#ps-form").innerHTML = FIELDS.map(([k, l, rows]) => `<div class="field${rows > 1 ? " ps-wide" : ""}"><label for="ps-f-${k}">${l}</label>${rows > 1
      ? `<textarea id="ps-f-${k}" class="input" rows="${rows}" data-pf="${k}" dir="auto">${esc(P.f[k] || "")}</textarea>`
      : `<input id="ps-f-${k}" class="input" data-pf="${k}" dir="auto" value="${esc(P.f[k] || "")}">`}<small class="ps-flag" id="ps-fl-${k}"></small></div>`).join("");
    flagAll();
  }
  function flagAll() {
    FIELDS.forEach(([k]) => {
      const el = U.$("#ps-fl-" + k), inp = U.$("#ps-f-" + k); if (!el) return;
      const m = missingNums(P.f[k] || "");
      el.innerHTML = m.length ? `أرقام غير موجودة في نصك: <bdi dir="ltr">${m.map(esc).join("، ")}</bdi>` : "";
      inp.classList.toggle("flag", m.length > 0);
    });
  }

  /* ---------- الملصق ---------- */
  const lines = s => String(s || "").split(/\n+/).map(x => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
  function posterHTML() {
    const f = P.f, en = P.lang === "en", dir = en ? "ltr" : "rtl";
    const T = en ? { intro: "Introduction", aims: "Objectives", methods: "Materials & Methods", results: "Results", concl: "Conclusions", refs: "References", figs: "Figures" }
      : { intro: "المقدمة", aims: "الأهداف", methods: "المواد وطرائق العمل", results: "النتائج", concl: "الاستنتاجات والتوصيات", refs: "المراجع", figs: "أشكال" };
    const sec = (k, body, cls = "") => body ? `<section class="pp-sec ${cls}"><h2>${T[k]}</h2>${body}</section>` : "";
    const ul = k => { const L = lines(f[k]); return L.length ? `<ul>${L.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""; };
    const figs = P.imgs.map((im, i) => `<figure><img src="${im.src}" alt=""><figcaption>${esc(im.cap || (en ? "Figure " : "شكل ") + (i + 1))}</figcaption></figure>`).join("");
    return `<div class="pp ${P.size}" dir="${dir}" lang="${en ? "en" : "ar"}">
      <header class="pp-h"><h1>${esc(f.title || (en ? "Poster title" : "عنوان الملصق"))}</h1><p class="pp-a">${esc(f.authors || "")}</p><p class="pp-af">${esc(f.affil || "")}</p></header>
      <div class="pp-cols">
        <div class="pp-col">${sec("intro", f.intro ? `<p>${esc(f.intro)}</p>` : "")}${sec("aims", ul("aims"))}${sec("methods", ul("methods"))}</div>
        <div class="pp-col">${sec("results", ul("results"), "pp-res")}${figs ? `<section class="pp-sec pp-figs">${figs}</section>` : ""}</div>
        <div class="pp-col">${sec("concl", ul("concl"), "pp-concl")}${sec("refs", (r => r.length ? `<ol>${r.map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : "")(lines(f.refs)), "pp-refs")}</div>
      </div>
      <footer class="pp-f">${en ? "Prepared with EcoBio AI" : "أُعدّ بمساعدة منصة EcoBio AI"}</footer>
    </div>`;
  }
  const POSTER_CSS = `
    .pp{width:841mm;height:1189mm;box-sizing:border-box;padding:28mm 26mm;background:#fff;color:#14232a;font-family:"IBM Plex Sans Arabic","Readex Pro",Tahoma,sans-serif;display:flex;flex-direction:column;gap:14mm;overflow:hidden}
    .pp.a1{width:594mm;height:841mm;padding:20mm 18mm;gap:10mm;font-size:.707em}
    .pp-h{background:linear-gradient(120deg,#0b4f5c,#127d8f 60%,#2e8b57);color:#fff;border-radius:10mm;padding:16mm 20mm;text-align:center}
    .pp-h h1{font-size:30pt;line-height:1.35;margin:0 0 6mm}
    .pp.a0 .pp-h h1{font-size:72pt}
    .pp-a{font-size:32pt;margin:0 0 3mm;font-weight:600}.pp-af{font-size:24pt;margin:0;opacity:.9}
    .pp.a1 .pp-a{font-size:22.5pt}.pp.a1 .pp-af{font-size:17pt}.pp.a1 .pp-h h1{font-size:51pt}
    .pp-cols{flex:1;display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:12mm;min-height:0}
    .pp-col{display:flex;flex-direction:column;gap:10mm;min-height:0}.pp-col>.pp-sec:last-child{flex:1}
    .pp-sec{background:#f3f8f7;border:1.2mm solid #d4e7e3;border-radius:7mm;padding:10mm 11mm}
    .pp-sec h2{font-size:38pt;color:#0b4f5c;margin:0 0 6mm;padding-bottom:3mm;border-bottom:1mm solid #9fd0c8}
    .pp.a1 .pp-sec h2{font-size:27pt}
    .pp-sec p,.pp-sec li{font-size:27pt;line-height:1.7}
    .pp.a1 .pp-sec p,.pp.a1 .pp-sec li{font-size:19pt}
    .pp-sec ul,.pp-sec ol{margin:0;padding-inline-start:12mm}.pp-sec li{margin-bottom:3mm}
    .pp-res{background:#eef7fb;border-color:#bfe0ea}.pp-concl{background:#f1f8ef;border-color:#cfe6c9}
    .pp-refs li{font-size:18pt!important;line-height:1.6}.pp.a1 .pp-refs li{font-size:12.7pt!important}
    .pp-figs{display:grid;gap:6mm}.pp-figs figure{margin:0;text-align:center}.pp-figs img{max-width:100%;max-height:300mm;border-radius:3mm}
    .pp.a1 .pp-figs img{max-height:210mm}
    .pp-figs figcaption{font-size:20pt;color:#4a5e63;margin-top:2mm}.pp.a1 .pp-figs figcaption{font-size:14pt}
    .pp-f{text-align:center;font-size:16pt;color:#6b7f83}.pp.a1 .pp-f{font-size:11pt}`;

  function preview() {
    const box = U.$("#ps-prev"); if (!box) return;
    box.innerHTML = `<style>${POSTER_CSS}</style><div class="ps-scale">${posterHTML()}</div>`;
    const pp = box.querySelector(".pp"), sc = box.querySelector(".ps-scale");
    const fit = () => { const w = box.clientWidth; const pw = pp.offsetWidth, ph = pp.offsetHeight; const k = w / pw; sc.style.transform = `scale(${k})`; sc.style.height = ph * k + "px"; sc.style.width = pw * k + "px"; };
    requestAnimationFrame(fit);
    const over = [...pp.querySelectorAll(".pp-col")].some(c => c.scrollHeight > c.clientHeight + 2);
    U.$("#ps-over").innerHTML = over ? `<div class="notice warn">${ico("i-warn")}<span>المحتوى أطول من الملصق؛ اختصر بعض النقاط أو احذف صورة حتى لا يُقص شيء.</span></div>` : "";
  }
  function print() {
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')].filter(l => /fonts|css\/style/.test(l.href)).map(l => `<link rel="stylesheet" href="${l.href}">`).join("");
    const size = P.size === "a1" ? "594mm 841mm" : "841mm 1189mm";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(P.f.title || "poster")}</title>${css}<style>@page{size:${size};margin:0}html,body{margin:0;background:#fff}${POSTER_CSS}</style></head><body>${posterHTML()}</body></html>`;
    const f = U.el("iframe", { style: "position:fixed;width:0;height:0;border:0;left:-9999px" }); document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { U.toast("الطباعة غير متاحة هنا"); } setTimeout(() => f.remove(), 4000); }, 900);
  }

  function addImage(file) {
    if (!file || !/^image\//.test(file.type)) { U.toast("اختر صورة"); return; }
    if (P.imgs.length >= 3) { U.toast("ثلاث صور كحد أقصى"); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const k = Math.min(1, 2400 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      P.imgs.push({ src: c.toDataURL("image/jpeg", 0.92), cap: "" }); renderImgs(); preview(); };
    img.src = url;
  }
  function renderImgs() {
    U.$("#ps-imgs").innerHTML = P.imgs.map((im, i) => `<div class="ps-img"><img src="${im.src}" alt=""><input class="input" data-cap="${i}" placeholder="عنوان الشكل" value="${esc(im.cap)}"><button type="button" class="btn btn-ghost btn-sm" data-rm="${i}" aria-label="حذف الصورة">${ico("i-trash")}</button></div>`).join("");
  }

  function init() {
    const root = U.$("#sch-p-poster");
    U.$("#ps-lang").value = P.lang; U.$("#ps-size").value = P.size;
    if (P.srcKind === "text") U.$("#ps-text").value = P.src;
    renderForm(); setTimeout(preview, 40);
    U.$("#ps-file").onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      if (f.size > 9 * 1024 * 1024) { U.toast("حجم الملف أكبر من 9 ميغابايت"); return; }
      pdf64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
      pdfName = f.name; U.$("#ps-fname").textContent = pdfName;
    };
    U.$("#ps-go").onclick = extract;
    U.$("#ps-lang").onchange = e => { P.lang = e.target.value; save(); preview(); };
    U.$("#ps-size").onchange = e => { P.size = e.target.value; save(); preview(); };
    U.$("#ps-print").onclick = print;
    U.$("#ps-img").onchange = e => { addImage(e.target.files[0]); e.target.value = ""; };
    let t = 0;
    root.addEventListener("input", e => {
      const k = e.target.dataset.pf; if (k) { P.f[k] = e.target.value; save(); clearTimeout(t); t = setTimeout(() => { flagAll(); preview(); }, 250); }
      if (e.target.dataset.cap !== undefined) { P.imgs[+e.target.dataset.cap].cap = e.target.value; clearTimeout(t); t = setTimeout(preview, 250); }
    });
    root.addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { P.imgs.splice(+b.dataset.rm, 1); renderImgs(); preview(); } });
    window.addEventListener("resize", U.debounce ? U.debounce(preview, 200) : preview);
  }
  let inited = false;
  U.$("#sch-tabs").addEventListener("click", e => { const b = e.target.closest('[data-tab="poster"]'); if (!b) return; if (!inited) { inited = true; init(); } else setTimeout(preview, 30); });
  ECO.poster = { state: P, posterHTML, missingNums };
})();
