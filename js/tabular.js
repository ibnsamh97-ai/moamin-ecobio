/* =====================================================================
   EcoBio AI — أدوات مشتركة للجداول: قراءة CSV/Excel/اللصق، تحويل الأرقام،
   وواجهة إدخال موحّدة (ملف، لصق، قالب، بيانات منشورة للتجربة).
   تستعملها الأدوات الجديدة (مدقق النتائج، مصمّم التجارب، مصادر التلوث، الخرائط).
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const TB = ECO.tab = {};
  const esc = s => U.esc(s == null ? "" : String(s));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  /* رقم من خلية: يقبل الفاصلة العشرية العربية والإنكليزية والأرقام العربية-الهندية،
     ويعيد {v, below} للقيم «أقل من حد الكشف» مثل ‎<0.01 أو ND */
  TB.cell = x => {
    if (typeof x === "number") return isFinite(x) ? { v: x } : null;
    let s = String(x == null ? "" : x).trim();
    if (!s) return null;
    s = s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/٫/g, ".").replace(/[−–]/g, "-");
    if (/^(nd|n\.d\.?|bdl|<\s*dl|غير محسوس|لم يُكشف)$/i.test(s)) return { v: NaN, below: true, raw: s };
    const lt = /^[<≤]\s*/.test(s); s = s.replace(/^[<≤]\s*/, "").replace(/\s+/g, "");
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
    if (!/^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
    const v = parseFloat(s);
    return lt ? { v, below: true, raw: String(x) } : { v };
  };
  TB.num = x => { const c = TB.cell(x); return c && !c.below && isFinite(c.v) ? c.v : NaN; };

  TB.parseText = text => {
    text = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    const first = text.split("\n").find(l => l.trim()) || "";
    const cand = ["\t", ";", ","].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1]);
    const d = cand[0][1] > 1 ? cand[0][0] : ",";
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"' && cell === "") q = true;
      else if (c === d) { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ""));
  };

  TB.readFile = async f => {
    const name = f.name || "";
    if (/\.xlsx$/i.test(name)) { const r = await ECO.xlsx.read(await f.arrayBuffer()); return { rows: r.rows, label: `ملف Excel: ${name}` }; }
    if (/\.xls$/i.test(name)) throw new Error("صيغة xls القديمة غير مدعومة؛ احفظ الملف من Excel بصيغة xlsx أو CSV");
    return { rows: TB.parseText(await f.text()), label: `ملف: ${name}` };
  };

  /* واجهة إدخال: ملف أو لصق أو قالب أو بيانات منشورة */
  TB.input = (host, o) => {
    const id = o.id;
    host.innerHTML = `<div class="tb-in">
      <div class="tb-row">
        <label class="btn btn-primary" for="${id}-file">${ico("i-upload")}اختر ملف Excel أو CSV</label>
        <input id="${id}-file" type="file" accept=".xlsx,.csv,.txt,text/csv" hidden>
        ${o.template ? `<button type="button" class="btn" id="${id}-tpl">${ico("i-table")}قالب Excel فارغ</button>` : ""}
        ${(o.demos || []).map((d, i) => `<button type="button" class="btn btn-ghost btn-sm" data-demo="${i}">${ico("i-book")}${esc(d.label)}</button>`).join("")}
      </div>
      <div class="field"><label for="${id}-paste">أو انسخ الخلايا من Excel (مع صف العناوين) والصقها هنا</label>
        <textarea id="${id}-paste" class="input mono" rows="4" placeholder="${esc(o.placeholder || "")}" dir="ltr"></textarea></div>
      <button type="button" class="btn" id="${id}-go">${ico("i-spark")}حلّل الجدول الملصوق</button>
    </div>`;
    const done = (rows, label, meta) => {
      if (!rows || rows.length < 2) { U.toast("الجدول يحتاج صف عناوين وصفاً واحداً من القيم على الأقل"); return; }
      o.onLoad(rows, Object.assign({ label }, meta || {}));
    };
    U.$(`#${id}-file`).onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      try { const r = await TB.readFile(f); done(r.rows, r.label, { file: f.name }); } catch (x) { U.toast("تعذّرت قراءة الملف: " + x.message); }
    };
    U.$(`#${id}-go`).onclick = () => done(TB.parseText(U.$(`#${id}-paste`).value), "بيانات ملصوقة");
    if (o.template) U.$(`#${id}-tpl`).onclick = () => ECO.xlsx.download(ECO.xlsx.write([{ name: o.templateSheet || "بياناتي", rows: o.template }]), o.templateName || "قالب-EcoBio.xlsx");
    host.querySelectorAll("[data-demo]").forEach(b => b.onclick = () => { const d = o.demos[+b.dataset.demo]; done(d.rows(), d.label, { demo: d }); });
  };

  /* تنزيل أوراق Excel */
  TB.xlsx = (sheets, name) => ECO.xlsx.download(ECO.xlsx.write(sheets), name);

  /* نسخ نص */
  TB.copy = async text => {
    try { await navigator.clipboard.writeText(text); U.toast("نُسخ"); }
    catch (e) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); U.toast("نُسخ"); } catch (x) { /* */ } t.remove(); }
  };
})();
