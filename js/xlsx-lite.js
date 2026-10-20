/* =====================================================================
   EcoBio AI — قارئ وكاتب Excel خفيف (xlsx) بلا مكتبات خارجية
   القراءة: فك ضغط ZIP بـ DecompressionStream ثم قراءة XML الورقة الأولى.
   الكتابة: ZIP غير مضغوط (Stored) مع CRC32 وأوراق متعددة واتجاه يمين لليسار.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO;
  const X = {};

  /* ---------- ZIP: قراءة ---------- */
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  async function inflateRaw(bytes) {
    if (!("DecompressionStream" in window)) throw new Error("المتصفح لا يدعم فك ضغط ملفات Excel؛ احفظ الملف بصيغة CSV");
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }
  async function unzip(buf) {
    const b = new Uint8Array(buf);
    let e = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("الملف ليس Excel صالحاً (xlsx)");
    const n = u16(b, e + 10), cd = u32(b, e + 16), files = {};
    let p = cd;
    for (let k = 0; k < n; k++) {
      if (u32(b, p) !== 0x02014b50) break;
      const method = u16(b, p + 10), csize = u32(b, p + 20), nl = u16(b, p + 28), el = u16(b, p + 30), cl = u16(b, p + 32), lho = u32(b, p + 42);
      const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl));
      files[name] = { method, csize, lho };
      p += 46 + nl + el + cl;
    }
    return {
      names: Object.keys(files),
      async text(name) {
        const f = files[name]; if (!f) return null;
        const nl = u16(b, f.lho + 26), el = u16(b, f.lho + 28), start = f.lho + 30 + nl + el;
        const data = b.subarray(start, start + f.csize);
        const raw = f.method === 0 ? data : f.method === 8 ? await inflateRaw(data) : null;
        if (!raw) throw new Error("طريقة ضغط غير مدعومة في ملف Excel");
        return new TextDecoder().decode(raw);
      }
    };
  }

  const xml = s => new DOMParser().parseFromString(s, "application/xml");
  const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref || ""); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const tx = el => Array.from(el.getElementsByTagName("t")).map(t => t.textContent).join("");

  /* يعيد صفوف الورقة الأولى (أو المحددة) كمصفوفة مصفوفات */
  X.read = async (buf, sheetIndex = 0) => {
    const z = await unzip(buf);
    let target = null, sheetNames = [];
    const wb = await z.text("xl/workbook.xml"), rels = await z.text("xl/_rels/workbook.xml.rels");
    if (wb && rels) {
      const W = xml(wb), R = xml(rels);
      const sheets = Array.from(W.getElementsByTagName("sheet"));
      sheetNames = sheets.map(s => s.getAttribute("name"));
      const s = sheets[sheetIndex];
      if (s) {
        const rid = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
        const rel = Array.from(R.getElementsByTagName("Relationship")).find(r => r.getAttribute("Id") === rid);
        if (rel) { const t = rel.getAttribute("Target").replace(/^\//, ""); target = t.startsWith("xl/") ? t : "xl/" + t; }
      }
    }
    if (!target) target = z.names.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
    if (!target) throw new Error("لم تُعثر على ورقة بيانات في الملف");
    const ssTxt = await z.text("xl/sharedStrings.xml");
    const SS = ssTxt ? Array.from(xml(ssTxt).getElementsByTagName("si")).map(tx) : [];
    const D = xml(await z.text(target));
    const out = [];
    Array.from(D.getElementsByTagName("row")).forEach((row, ri) => {
      const r = parseInt(row.getAttribute("r"), 10) - 1, rowIdx = isFinite(r) ? r : ri, arr = [];
      Array.from(row.getElementsByTagName("c")).forEach((c, ci) => {
        const t = c.getAttribute("t"), ref = c.getAttribute("r"), col = ref ? colIdx(ref) : ci;
        const v = c.getElementsByTagName("v")[0];
        let val = null;
        if (t === "s") val = v ? SS[parseInt(v.textContent, 10)] : null;
        else if (t === "inlineStr") { const is = c.getElementsByTagName("is")[0]; val = is ? tx(is) : null; }
        else if (t === "str" || t === "e") val = v ? v.textContent : null;
        else if (t === "b") val = v ? v.textContent === "1" : null;
        else val = v ? parseFloat(v.textContent) : null;
        arr[col] = val;
      });
      out[rowIdx] = arr;
    });
    const width = Math.max(0, ...out.filter(Boolean).map(r => r.length));
    return { rows: Array.from(out, r => Array.from({ length: width }, (_, i) => (r && r[i] != null ? r[i] : null))), sheetNames };
  };

  /* ---------- ZIP: كتابة (Stored) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    const w16 = v => [v & 255, (v >>> 8) & 255], w32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    files.forEach(([name, text]) => {
      const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const head = [...w32(0x04034b50), ...w16(20), ...w16(0x0800), ...w16(0), ...w16(0), ...w16(0x21), ...w32(crc), ...w32(data.length), ...w32(data.length), ...w16(nb.length), ...w16(0)];
      parts.push(new Uint8Array(head), nb, data);
      central.push(new Uint8Array([...w32(0x02014b50), ...w16(20), ...w16(20), ...w16(0x0800), ...w16(0), ...w16(0), ...w16(0x21), ...w32(crc), ...w32(data.length), ...w32(data.length), ...w16(nb.length), ...w16(0), ...w16(0), ...w16(0), ...w16(0), ...w32(0), ...w32(off)]), nb);
      off += head.length + nb.length + data.length;
    });
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new Uint8Array([...w32(0x06054b50), ...w16(0), ...w16(0), ...w16(files.length), ...w16(files.length), ...w32(cdSize), ...w32(off), ...w16(0)]);
    return new Blob([...parts, ...central, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const colName = i => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const sheetName = s => String(s).replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";

  /* sheets: [{name, rows: [[...]], header: true}] */
  X.write = sheets => {
    const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    const files = [];
    files.push(["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`]);
    files.push(["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`]);
    files.push(["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ${ns} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(sheetName(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`]);
    files.push(["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
    files.push(["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet ${ns}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`]);
    sheets.forEach((s, i) => {
      const width = Math.max(1, ...s.rows.map(r => r.length));
      const cols = `<cols>${Array.from({ length: width }, (_, c) => `<col min="${c + 1}" max="${c + 1}" width="${c === 0 ? 30 : 18}" customWidth="1"/>`).join("")}</cols>`;
      const body = s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
        if (v == null || v === "") return "";
        const ref = colName(ci) + (ri + 1), st = s.header !== false && ri === 0 ? ' s="1"' : "";
        return typeof v === "number" && isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      }).join("")}</row>`).join("");
      files.push([`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${ns}><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>${cols}<sheetData>${body}</sheetData></worksheet>`]);
    });
    return zip(files);
  };

  X.download = (blob, name) => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };

  ECO.xlsx = X;
})();
