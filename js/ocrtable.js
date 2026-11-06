/* =====================================================================
   EcoBio AI — تصوير جدول المختبر
   صورة صفحة الدفتر أو ورقة النتائج (أو PDF) ← جدول قابل للتعديل.
   Gemini يقرأ الخانات حرفياً ويؤشّر الخانات الغامضة أو المشطوبة، والمستخدم
   يراجعها بجانب الصورة، ولا يُرسل شيء إلى الحساب قبل تأكيده.
   ECO.ocrTable({ title, hint, onDone(rows) })   rows: [[header…], [cells…]…]
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const MAX_PDF = 9 * 1024 * 1024;
  let dlg = null, S = null;

  const digits = s => String(s == null ? "" : s).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/٫/g, ".").trim();

  function close() { if (dlg) { dlg.remove(); dlg = null; } S = null; document.body.classList.remove("ocr-open"); }
  function open(o) {
    close();
    S = { o: o || {}, file: null, data: null, mime: "", head: [], rows: [], flags: new Set(), notes: "", busy: false };
    dlg = document.createElement("div");
    dlg.className = "ocr-dlg"; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-label", "تصوير جدول");
    document.body.appendChild(dlg); document.body.classList.add("ocr-open");
    dlg.addEventListener("click", onClick); dlg.addEventListener("input", onInput); dlg.addEventListener("change", onChange);
    render();
  }
  function render() {
    if (!dlg) return;
    const has = S.rows.length > 0, nf = S.flags.size;
    dlg.innerHTML = `<div class="ocr-box">
      <header class="ocr-h"><span class="co-ic">${ico("i-camera")}</span><div><b>${esc(S.o.title || "صوّر جدولك")}</b><small>${esc(S.o.hint || "صورة واضحة لصفحة الدفتر أو ورقة النتائج، أو ملف PDF")}</small></div><button type="button" class="co-x" data-oc="close" aria-label="إغلاق">${ico("i-close")}</button></header>
      <div class="ocr-main">
        <div class="ocr-src">
          ${S.data ? (S.mime === "application/pdf" ? `<div class="ocr-pdf">${ico("i-file")}<b>${esc(S.file)}</b></div>` : `<img src="${S.data}" alt="الصورة المرفوعة">`) : `<div class="ocr-pick">${ico("i-camera")}<p>صوّر الجدول من فوق، بإضاءة جيدة، والصفحة كلها داخل الصورة.</p></div>`}
          <div class="row ocr-btns">
            <label class="btn btn-primary btn-sm" for="ocr-cam">${ico("i-camera")}صوّر الآن</label><input id="ocr-cam" type="file" accept="image/*" capture="environment" hidden>
            <label class="btn btn-sm" for="ocr-file">${ico("i-upload")}صورة أو PDF</label><input id="ocr-file" type="file" accept="image/*,application/pdf,.pdf" hidden>
            ${S.data ? `<button type="button" class="btn btn-sm" data-oc="read" ${S.busy ? "disabled" : ""}>${ico("i-spark")}${has ? "أعد القراءة" : "اقرأ الجدول"}</button>` : ""}
          </div>
        </div>
        <div class="ocr-out">
          ${S.busy ? `<p class="typing"><i></i><i></i><i></i></p><p class="faint">يقرأ الجدول…</p>` : has ? `
            <div class="notice ${nf ? "warn" : "ok"}">${ico(nf ? "i-warn" : "i-check")}<span>${nf ? `راجع ${nf} ${nf > 2 ? "خانات مؤشرة" : "خانة مؤشرة"} بالأصفر وصحّحها من الصورة، ثم اضغط «استعمل الجدول».` : "قورنت الخانات كلها؛ تأكد منها بنظرة أخيرة على الصورة."}</span></div>
            <div class="tbl-wrap"><table class="tbl ocr-tbl"><thead><tr>${S.head.map((h, c) => `<th><input class="input" data-oh="${c}" value="${esc(h)}" aria-label="عنوان العمود ${c + 1}"></th>`).join("")}<th></th></tr></thead><tbody>
              ${S.rows.map((r, i) => `<tr>${S.head.map((_, c) => `<td><input class="input num ${S.flags.has(i + ":" + c) ? "flag" : ""}" data-or="${i}" data-oc2="${c}" value="${esc(r[c] == null ? "" : r[c])}" dir="ltr" aria-label="الصف ${i + 1} العمود ${c + 1}"></td>`).join("")}<td><button type="button" class="btn btn-ghost btn-sm" data-oc="del" data-i="${i}" aria-label="حذف الصف">${ico("i-close")}</button></td></tr>`).join("")}
            </tbody></table></div>
            ${S.notes ? `<p class="faint ocr-notes">${esc(S.notes)}</p>` : ""}` : `<p class="faint">بعد الرفع اضغط «اقرأ الجدول». ستظهر القراءة هنا لتراجعها قبل استعمالها.</p>`}
        </div>
      </div>
      <footer class="co-f"><span class="faint">الذكاء الاصطناعي يقرأ فقط ولا يحسب ولا يكمل أي قيمة.</span><span class="co-nav"><button type="button" class="btn btn-sm btn-ghost" data-oc="close">إلغاء</button><button type="button" class="btn btn-sm btn-primary" data-oc="use" ${has && !S.busy ? "" : "disabled"}>${ico("i-check")}استعمل الجدول</button></span></footer>
    </div>`;
    const pick = e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) load(f); };
    dlg.querySelector("#ocr-cam").onchange = pick; dlg.querySelector("#ocr-file").onchange = pick;
  }
  function load(f) {
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (isPdf) {
      if (f.size > MAX_PDF) { U.toast("حجم ملف PDF أكبر من 9 ميغابايت"); return; }
      const fr = new FileReader(); fr.onload = () => { S.data = String(fr.result); S.mime = "application/pdf"; S.file = f.name; S.rows = []; render(); read(); }; fr.readAsDataURL(f); return;
    }
    if (!/^image\//.test(f.type)) { U.toast("الملفات المدعومة: صورة أو PDF"); return; }
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      S.data = c.toDataURL("image/jpeg", 0.9); S.mime = "image/jpeg"; S.file = f.name || "صورة"; S.rows = []; render(); read();
    };
    img.onerror = () => U.toast("تعذّر فتح الصورة"); img.src = url;
  }
  async function read() {
    if (!S || !S.data || S.busy) return;
    if (!ECO.gemini || !ECO.gemini.ready()) { U.toast("قراءة الصور تحتاج المساعد الذكي، وهو غير مفعّل الآن"); return; }
    S.busy = true; render();
    const prompt = `اقرأ الجدول الموجود في ${S.mime === "application/pdf" ? "الملف" : "الصورة"} كما هو مكتوب بالضبط. أعد JSON فقط بهذا الشكل:
{"headers": ["عنوان العمود الأول", "..."], "rows": [["قيمة", "..."]], "unclear": [[رقم_الصف, رقم_العمود]], "notes": "ملاحظة قصيرة إن وجدت"}
القواعد:
- انسخ كل خانة حرفياً كما كُتبت. حوّل الأرقام العربية (٠-٩) إلى 0-9، والفاصلة العشرية (٫ أو ،) إلى نقطة.
- لا تحسب ولا تكمل ولا تصحح ولا تخمّن أي قيمة. الخانة الفارغة تبقى "".
- ضع في unclear كل خانة غير واضحة أو مشطوبة أو مكتوبة فوقها أو قد تُقرأ بأكثر من طريقة، واكتب فيها أفضل قراءة لك.
- رقم الصف يبدأ من 0 لأول صف بيانات بعد العناوين، ورقم العمود من 0.
- إذا لم توجد عناوين فاكتب headers بأسماء "عمود 1"، "عمود 2"…
${S.o.expect ? "- الجدول المتوقع: " + S.o.expect : ""}`;
    try {
      const txt = await ECO.gemini.generate({ json: true, temperature: 0, system: "أنت قارئ دقيق للجداول المكتوبة باليد والمطبوعة في المختبرات. لا تخترع أي رقم.", contents: [{ role: "user", parts: [{ inline_data: { mime_type: S.mime, data: S.data.split(",")[1] } }, { text: prompt }] }] });
      const j = JSON.parse(String(txt).replace(/^```json|```$/g, "").trim());
      const head = (j.headers || []).map(h => String(h == null ? "" : h).trim());
      const rows = (j.rows || []).map(r => (Array.isArray(r) ? r : []).map(digits));
      const w = Math.max(head.length, ...rows.map(r => r.length), 1);
      while (head.length < w) head.push(`عمود ${head.length + 1}`);
      S.head = head; S.rows = rows.map(r => { const x = r.slice(0, w); while (x.length < w) x.push(""); return x; });
      S.flags = new Set((j.unclear || []).filter(p => Array.isArray(p) && p.length >= 2).map(p => `${+p[0]}:${+p[1]}`));
      S.notes = j.notes || "";
      if (!S.rows.length) U.toast("لم يُعثر على جدول في الصورة؛ جرّب صورة أوضح");
    } catch (e) {
      U.toast(e && e.message && !/JSON|Unexpected/.test(e.message) ? e.message : "لم تُقرأ الصورة بشكل منظم؛ جرّب صورة أوضح وأقرب");
    }
    if (S) { S.busy = false; render(); }
  }
  function onClick(e) {
    if (e.target === dlg) { close(); return; }
    const b = e.target.closest("[data-oc]"); if (!b || !S) return;
    const a = b.dataset.oc;
    if (a === "close") close();
    if (a === "read") read();
    if (a === "del") { const i = +b.dataset.i; S.rows.splice(i, 1); S.flags = new Set([...S.flags].map(k => k.split(":").map(Number)).filter(([r]) => r !== i).map(([r, c]) => `${r > i ? r - 1 : r}:${c}`)); render(); }
    if (a === "use") {
      const rows = [S.head.slice()].concat(S.rows.map(r => r.map(digits)));
      const cb = S.o.onDone; close();
      if (cb) cb(rows);
    }
  }
  function onInput(e) {
    const el = e.target; if (!S) return;
    if (el.dataset.or !== undefined) { S.rows[+el.dataset.or][+el.dataset.oc2] = el.value; if (el.classList.contains("flag")) { el.classList.remove("flag"); S.flags.delete(el.dataset.or + ":" + el.dataset.oc2); const n = dlg.querySelector(".ocr-out .notice span"); if (n) n.textContent = S.flags.size ? `راجع ${S.flags.size} ${S.flags.size > 2 ? "خانات مؤشرة" : "خانة مؤشرة"} بالأصفر وصحّحها من الصورة، ثم اضغط «استعمل الجدول».` : "راجعت الخانات المؤشرة. تأكد بنظرة أخيرة ثم استعمل الجدول."; } }
    if (el.dataset.oh !== undefined) S.head[+el.dataset.oh] = el.value;
  }
  function onChange() { /* القيم تُحفظ مع الكتابة */ }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && dlg) close(); });

  ECO.ocrTable = open;
})();
