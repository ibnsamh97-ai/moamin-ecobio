/* =====================================================================
   EcoBio AI — قراءة الصور: مؤشر لون الماء Forel-Ule + مؤشرات مرئية + Gemini
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util;
  const S = { img: null, sel: { x: 0.2, y: 0.2, w: 0.6, h: 0.6 }, gps: null, res: null, b64: null, ocrB64: null, ocr: null };

  /* ---------- قراءة إحداثيات GPS من بيانات EXIF للصورة ---------- */
  function exifGPS(buf) {
    try {
      const v = new DataView(buf); if (v.getUint16(0) !== 0xFFD8) return null;
      let o = 2;
      while (o < v.byteLength - 4) {
        const mk = v.getUint16(o), len = v.getUint16(o + 2);
        if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {
          const t = o + 10, le = v.getUint16(t) === 0x4949;
          const g16 = p => v.getUint16(p, le), g32 = p => v.getUint32(p, le);
          const ifd0 = t + g32(t + 4); let gpsOff = null;
          for (let i = 0, nE = g16(ifd0); i < nE; i++) { const e = ifd0 + 2 + i * 12; if (g16(e) === 0x8825) gpsOff = t + g32(e + 8); }
          if (!gpsOff) return null;
          const tags = {};
          for (let i = 0, nE = g16(gpsOff); i < nE; i++) {
            const e = gpsOff + 2 + i * 12, tag = g16(e), type = g16(e + 2), cnt = g32(e + 4);
            if (type === 2) tags[tag] = String.fromCharCode(v.getUint8(cnt > 4 ? t + g32(e + 8) : e + 8));
            if (type === 5) { const p = t + g32(e + 8), a = []; for (let k = 0; k < cnt; k++) a.push(g32(p + k * 8) / g32(p + k * 8 + 4)); tags[tag] = a; }
          }
          if (!tags[2] || !tags[4]) return null;
          const dms = a => a[0] + a[1] / 60 + a[2] / 3600;
          const lat = dms(tags[2]) * (tags[1] === "S" ? -1 : 1), lon = dms(tags[4]) * (tags[3] === "W" ? -1 : 1);
          return U.isNum(lat) && U.isNum(lon) && (lat || lon) ? { lat, lon } : null;
        }
        if ((mk & 0xFF00) !== 0xFF00) break;
        o += 2 + len;
      }
    } catch (e) { /* لا بيانات */ }
    return null;
  }

  /* ---------- التحميل والعرض ---------- */
  function load(file) {
    const fr = new FileReader();
    fr.onload = () => {
      S.gps = exifGPS(fr.result);
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        S.img = img; S.sel = { x: 0.2, y: 0.25, w: 0.6, h: 0.5 };
        const k = Math.min(1, 1024 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        S.b64 = c.toDataURL("image/jpeg", 0.85); S.thumb = (() => { const t = document.createElement("canvas"), kk = Math.min(1, 640 / Math.max(img.width, img.height)); t.width = img.width * kk; t.height = img.height * kk; t.getContext("2d").drawImage(img, 0, 0, t.width, t.height); return t.toDataURL("image/jpeg", 0.8); })();
        U.$("#vi-drop").hidden = true; U.$("#vi-stage").hidden = false;
        const g = U.$("#vi-gps"); g.hidden = !S.gps; if (S.gps) g.textContent = `موقع الصورة: ${S.gps.lat.toFixed(5)}, ${S.gps.lon.toFixed(5)}`;
        draw(); analyze();
        U.$("#vi-ai-out").innerHTML = `<p class="faint">اضغط «حلّل الصورة بـ Gemini» للحصول على تفسير مرئي.</p>`;
      };
      img.src = url;
    };
    fr.readAsArrayBuffer(file);
  }
  function draw() {
    const cv = U.$("#vi-canvas"), img = S.img; if (!img) return;
    const w = cv.parentElement.clientWidth, h = Math.round(w * img.height / img.width);
    cv.width = w * 2; cv.height = h * 2; cv.style.height = h + "px";
    const g = cv.getContext("2d"); g.drawImage(img, 0, 0, cv.width, cv.height);
    const s = S.sel, X = s.x * cv.width, Y = s.y * cv.height, W = s.w * cv.width, H = s.h * cv.height;
    g.fillStyle = "rgba(3,9,12,0.55)"; g.fillRect(0, 0, cv.width, Y); g.fillRect(0, Y + H, cv.width, cv.height - Y - H); g.fillRect(0, Y, X, H); g.fillRect(X + W, Y, cv.width - X - W, H);
    g.strokeStyle = "#4fc8dc"; g.lineWidth = 4; g.setLineDash([16, 10]); g.strokeRect(X, Y, W, H);
  }
  function bindSelect() {
    const cv = U.$("#vi-canvas"); let st = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: U.clamp((e.clientX - r.left) / r.width, 0, 1), y: U.clamp((e.clientY - r.top) / r.height, 0, 1) }; };
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); st = pos(e); });
    cv.addEventListener("pointermove", e => { if (!st) return; const p = pos(e); S.sel = { x: Math.min(st.x, p.x), y: Math.min(st.y, p.y), w: Math.abs(p.x - st.x), h: Math.abs(p.y - st.y) }; draw(); });
    cv.addEventListener("pointerup", () => { if (st && S.sel.w > 0.03 && S.sel.h > 0.03) analyze(); st = null; });
  }

  /* ---------- التحليل اللوني ---------- */
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  function fuFromAlpha(a) { if (a > 290) a -= 360; let best = 0, bd = 1e9; ECO.FU.forEach((h, i) => { const d = Math.abs(h - a); if (d < bd) { bd = d; best = i; } }); return best + 1; }
  const FU_TEXT = fu => fu <= 5 ? ["مياه زرقاء صافية", "مياه منخفضة الإنتاجية، عكورة ومغذيات منخفضة غالباً.", "good"]
    : fu <= 9 ? ["زرقاء مخضرة", "بداية تأثير الطحالب أو الرواسب الدقيقة.", "fair"]
    : fu <= 13 ? ["خضراء", "طحالب أو مغذيات بتراكيز ملحوظة.", "warn"]
    : fu <= 17 ? ["خضراء مائلة للبني", "طحالب كثيفة أو رواسب عالقة أو مواد عضوية ذائبة.", "bad"]
    : ["بنية", "رواسب عالقة كثيرة أو مواد دبالية؛ عكورة مرتفعة على الأرجح.", "severe"];

  function analyze() {
    const img = S.img; if (!img) return;
    const k = Math.min(1, 420 / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
    const s = S.sel, x0 = Math.floor(s.x * c.width), y0 = Math.floor(s.y * c.height), w = Math.max(1, Math.floor(s.w * c.width)), h = Math.max(1, Math.floor(s.h * c.height));
    const d = g.getImageData(x0, y0, w, h).data;
    let R = 0, G = 0, B = 0, nV = 0, cnt = { green: 0, brown: 0, blue: 0, foam: 0, dark: 0, oil: 0, glint: 0 }, tot = 0, sR = 0, sG = 0, sB = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255; tot++;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
      let hue = 0; if (mx !== mn) { hue = mx === r ? ((gg - b) / (mx - mn)) % 6 : mx === gg ? (b - r) / (mx - mn) + 2 : (r - gg) / (mx - mn) + 4; hue *= 60; if (hue < 0) hue += 360; }
      if (mn > 0.96) { cnt.glint++; continue; }
      if (mx < 0.06) { cnt.dark++; continue; }
      if (sat < 0.12 && mx > 0.78) cnt.foam++;
      else if (mx < 0.2) cnt.dark++;
      else if (sat > 0.2 && hue >= 70 && hue < 170) cnt.green++;
      else if (sat > 0.18 && hue >= 15 && hue < 70) cnt.brown++;
      else if (sat > 0.15 && hue >= 170 && hue < 260) cnt.blue++;
      else if (sat > 0.25 && (hue >= 260 && hue < 345)) cnt.oil++;
      R += lin(r); G += lin(gg); B += lin(b); sR += r; sG += gg; sB += b; nV++;
    }
    if (!nV) { U.$("#vi-result").innerHTML = `<div class="notice warn">المنطقة المحددة شديدة السطوع أو الإعتام. حدّد منطقة ماء أخرى.</div>`; return; }
    R /= nV; G /= nV; B /= nV;
    const X = 0.4124 * R + 0.3576 * G + 0.1805 * B, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = 0.0193 * R + 0.1192 * G + 0.9505 * B;
    const sum = X + Y + Z, cx = X / sum, cy = Y / sum;
    let alpha = Math.atan2(cy - 1 / 3, cx - 1 / 3) * 180 / Math.PI; if (alpha < 0) alpha += 360;
    const fu = fuFromAlpha(alpha), pct = k2 => cnt[k2] / tot * 100;
    const P = { green: pct("green"), brown: pct("brown"), blue: pct("blue"), foam: pct("foam"), dark: pct("dark"), oil: pct("oil"), glint: pct("glint") };
    const score = U.clamp((fu - 1) / 20 * 55 + P.green * 0.25 + P.brown * 0.2 + P.foam * 0.3 + P.oil * 0.6, 0, 100);
    const turb = fu <= 6 ? ["منخفضة", "good"] : fu <= 12 ? ["متوسطة", "fair"] : fu <= 17 ? ["مرتفعة", "warn"] : ["مرتفعة جداً", "bad"];
    S.res = { fu, alpha, cx, cy, P, score, turb, rgb: [sR / nV * 255, sG / nV * 255, sB / nV * 255].map(Math.round), pixels: nV };
    render();
  }

  function render() {
    const r = S.res, [ttl, txt, tone] = FU_TEXT(r.fu), sc = r.score, stTone = sc < 25 ? "good" : sc < 45 ? "fair" : sc < 65 ? "warn" : sc < 80 ? "bad" : "severe";
    const meters = [["طحالب محتملة (أخضر)", r.P.green, "#93dd8a"], ["رواسب/طين (بني)", r.P.brown, "#c9935a"], ["رغوة أو زبد", r.P.foam, "#e4f1ed"], ["ألوان زيتية محتملة", r.P.oil, "#b493ff"], ["مناطق داكنة", r.P.dark, "#5f7d77"], ["ماء أزرق صافٍ", r.P.blue, "#4fc8dc"]];
    const tests = [];
    if (r.fu >= 10 || r.P.green > 15) tests.push("الكلوروفيل-أ والنترات والفوسفات (إثراء غذائي)");
    if (r.fu >= 14 || r.P.brown > 15) tests.push("العكورة NTU والمواد الصلبة العالقة TSS");
    if (r.P.foam > 5) tests.push("BOD₅ وCOD والمنظفات (المواد الفعالة سطحياً)");
    if (r.P.oil > 2) tests.push("الزيوت والشحوم والهيدروكربونات النفطية الكلية TPH");
    if (!tests.length) tests.push("pH وDO والعكورة كفحص روتيني");
    U.$("#vi-result").innerHTML = `
      <div class="fu-head">
        <div class="fu-swatch tile3d" style="--sw:${ECO.FU_COLORS[r.fu - 1]}"><span>FU</span><b>${r.fu}</b></div>
        <div><span class="chip tone-${tone}">${ttl}</span><p style="margin-top:6px;font-size:.9rem">${txt}</p>
          <p class="faint mono" style="font-size:.72rem;margin-top:4px" dir="ltr">α = ${r.alpha.toFixed(1)}° · x = ${r.cx.toFixed(4)} · y = ${r.cy.toFixed(4)} · RGB(${r.rgb.join(", ")})</p></div>
      </div>
      <div class="fu-scale" aria-label="مقياس Forel-Ule من 1 إلى 21">${ECO.FU_COLORS.map((c, i) => `<i style="background:${c}" class="${i + 1 === r.fu ? "on" : ""}" title="FU ${i + 1}"></i>`).join("")}</div>
      <div class="fu-ends"><span>1 صافٍ</span><span>21 عكر جداً</span></div>
      <div class="grid g-2" style="margin-top:14px;gap:12px">
        <div class="gauge-wrap">${U.gauge({ value: sc, max: 100, tone: stTone, label: "درجة التلوث المرئي التقريبية", sub: "عكورة تقديرية: " + r.turb[0] })}</div>
        <div class="grp" style="display:grid;gap:8px">${meters.map(([l, v, c]) => `<div class="meter"><div class="row"><span>${l}</span><b>${U.fmt(v, 1)}%</b></div><div class="track"><i style="width:${Math.min(100, v)}%;background:${c}"></i></div></div>`).join("")}</div>
      </div>
      <div class="treat-card" style="margin-top:12px"><h4>فحوص مختبرية مقترحة لتأكيد القراءة</h4><ul>${tests.map(t => `<li>${t}</li>`).join("")}</ul></div>
      <p class="faint" style="font-size:.72rem;margin-top:10px">مؤشر FU محسوب من زاوية اللون في فضاء CIE 1931 وجدول Wang وآخرين (2021). القراءة من كاميرا الهاتف تقريبية للفرز السريع وتتأثر بالإضاءة وتوازن الأبيض، ولا تغني عن التحليل المختبري. النسب المئوية هي نسب البكسلات في المنطقة المحددة.</p>`;
    ECO.lastVision = { fu: r.fu, class: ttl, score: Math.round(sc), percents: Object.fromEntries(Object.entries(r.P).map(([k2, v]) => [k2, +v.toFixed(1)])) };
  }

  /* ---------- Gemini ---------- */
  function aiAnalyze() {
    const out = U.$("#vi-ai-out");
    if (!S.b64) { out.innerHTML = `<p class="warnc">ارفع صورة أولاً.</p>`; return; }
    if (!ECO.gemini.ready()) { ECO.gemini.renderInto(out, ""); return; }
    const r = S.res, prompt = `هذه صورة لمياه${S.gps ? ` التقطت عند الإحداثيات ${S.gps.lat.toFixed(4)}, ${S.gps.lon.toFixed(4)}` : ""}. التحليل اللوني الآلي للمنطقة المحددة أعطى: مؤشر Forel-Ule = ${r.fu} (زاوية اللون ${r.alpha.toFixed(1)}°)، نسب البكسلات: أخضر ${r.P.green.toFixed(1)}%، بني ${r.P.brown.toFixed(1)}%، رغوة ${r.P.foam.toFixed(1)}%، ألوان زيتية ${r.P.oil.toFixed(1)}%.
اكتب بالعربية تحليلاً مختصراً منظماً:
1. ما تراه في الصورة من علامات تلوث مرئية (لون، عكورة، رغوة، بقع زيت، طحالب، نفايات، مصبات).
2. تقديرك التقريبي لدرجة التلوث المرئي (منخفض/متوسط/مرتفع/شديد) ونسبة تقريبية لكل نوع ظاهر، مع توضيح أنها تقديرات بصرية.
3. هل يتفق التحليل اللوني الآلي مع ما تراه؟ ولماذا؟
4. الفحوص المختبرية المطلوبة للتأكد، وطريقة المعالجة الحيوية الأنسب إن ثبت التلوث.
لا تخترع أرقاماً تركيزية لا يمكن معرفتها من صورة.`;
    out.innerHTML = `<p class="typing"><i></i><i></i><i></i></p>`;
    ECO.gemini.generate({ contents: [{ role: "user", parts: [{ inline_data: { mime_type: "image/jpeg", data: S.b64.split(",")[1] } }, { text: prompt }] }], onText: t => { out.innerHTML = U.md(t); } })
      .catch(e => { out.innerHTML = `<div class="notice warn">${U.esc(e.message)}</div>`; });
  }

  /* ---------- قراءة ورقة نتائج (صورة أو PDF) ---------- */
  function ocrLoad(f) {
    const pv = U.$("#vo-prev"), pdf = U.$("#vo-pdf"), isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    const fr = new FileReader();
    if (isPdf) {
      if (f.size > 9 * 1024 * 1024) { U.toast("حجم ملف PDF أكبر من 9 ميغابايت"); return; }
      fr.onload = () => {
        S.ocrB64 = String(fr.result); S.ocrMime = "application/pdf"; pv.hidden = true;
        pdf.hidden = false; pdf.innerHTML = `<svg><use href="#i-file"/></svg><b>${U.esc(f.name)}</b><span class="faint">${U.fileSize(f.size)}</span>`;
      };
      fr.readAsDataURL(f); return;
    }
    fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); S.ocrB64 = c.toDataURL("image/jpeg", 0.9); S.ocrMime = "image/jpeg"; pv.src = S.ocrB64; pv.hidden = false; pdf.hidden = true; }; img.onerror = () => U.toast("تعذّر فتح الصورة"); img.src = fr.result; };
    fr.readAsDataURL(f);
  }
  const OCR_KEYS = () => [{ key: "temp", name: "حرارة الماء", sym: "T", unit: "°C" }, { key: "ec", name: "التوصيلية", sym: "EC", unit: "µS/cm" }, ...ECO.WATER_PARAMS, ...ECO.METALS.map(m => ({ ...m, unit: "mg/L" }))];
  function ocrRun() {
    const out = U.$("#vo-out");
    if (!S.ocrB64) { out.innerHTML = `<p class="warnc">ارفع صورة الورقة أو ملف PDF أولاً.</p>`; return; }
    if (!ECO.gemini.ready()) { ECO.gemini.renderInto(out, ""); return; }
    const keys = OCR_KEYS().map(p => `"${p.key}": ${p.name} (${p.sym}) بوحدة ${p.unit || "بلا وحدة"}`).join("\n");
    const prompt = `اقرأ جدول نتائج تحليل المياه في المستند المرفق (صورة أو PDF). أعد JSON فقط بالشكل:
{"sample_name": "", "site": "", "date": "YYYY-MM-DD", "values": {المفتاح: رقم}, "notes": ""}
المفاتيح المسموحة ووحداتها المطلوبة:
${keys}
حوّل الوحدات عند الحاجة (مثلاً µg/L إلى mg/L بالقسمة على 1000، وppm = mg/L). ضع فقط القيم الموجودة فعلاً في الصورة، ولا تخمّن قيماً غير مكتوبة. إذا كانت هناك عدة عينات فخذ الأولى واذكر ذلك في notes.`;
    out.innerHTML = `<p class="typing"><i></i><i></i><i></i></p>`;
    ECO.gemini.generate({ json: true, temperature: 0.1, system: "أنت مساعد دقيق لاستخراج البيانات من صور المستندات المختبرية.", contents: [{ role: "user", parts: [{ inline_data: { mime_type: S.ocrMime || "image/jpeg", data: S.ocrB64.split(",")[1] } }, { text: prompt }] }] })
      .then(txt => {
        const j = JSON.parse(txt.replace(/^```json|```$/g, "").trim()); S.ocr = j;
        const vals = j.values || {};
        out.innerHTML = `<div class="grid g-3" style="gap:8px;margin-bottom:10px"><div class="field"><label for="vo-name">العينة</label><input id="vo-name" class="input" value="${U.esc(j.sample_name || "")}"></div><div class="field"><label for="vo-site">الموقع</label><input id="vo-site" class="input" value="${U.esc(j.site || "")}"></div><div class="field"><label for="vo-date">التاريخ</label><input id="vo-date" type="date" class="input" value="${U.esc(j.date || "")}"></div></div>
          <div class="param-grid">${OCR_KEYS().map(p => `<div class="field"><label for="vo-${p.key}"><span>${p.name} (${p.sym})</span><span class="u">${p.unit || ""}</span></label><input id="vo-${p.key}" type="number" step="any" class="input" dir="ltr" value="${U.isNum(+vals[p.key]) && vals[p.key] !== null && vals[p.key] !== "" ? vals[p.key] : ""}"></div>`).join("")}</div>
          ${j.notes ? `<p class="faint" style="font-size:.78rem;margin-top:8px">${U.esc(j.notes)}</p>` : ""}`;
        U.$("#vo-send").disabled = false;
      })
      .catch(e => { out.innerHTML = `<div class="notice warn">${U.esc(e.message.startsWith("Unexpected") ? "لم يُرجع Gemini بيانات منظمة؛ جرّب صورة أوضح أو ملفاً آخر." : e.message)}</div>`; });
  }

  function report(mode) {
    if (!S.res) { U.toast("ارفع صورة أولاً"); return; }
    const r = S.res, [ttl, txt] = FU_TEXT(r.fu);
    ECO.report.run({
      title: "تقرير قراءة صورة مياه", subtitle: "مؤشر Forel-Ule والمؤشرات المرئية", file: "تقرير-صورة-مياه",
      blocks: [
        { type: "image", src: U.$("#vi-canvas").toDataURL("image/jpeg", 0.85), caption: "الصورة مع المنطقة المحللة", maxH: 360 },
        { type: "cards", items: [{ label: "مؤشر Forel-Ule", value: "FU " + r.fu, sub: ttl }, { label: "درجة التلوث المرئي", value: Math.round(r.score) + " / 100" }, { label: "العكورة التقديرية", value: r.turb[0] }] },
        { type: "kv", items: [["زاوية اللون α", r.alpha.toFixed(2) + "°"], ["الإحداثيات اللونية x, y", r.cx.toFixed(4) + ", " + r.cy.toFixed(4)], ["متوسط RGB", r.rgb.join(", ")], ["موقع الصورة (EXIF)", S.gps ? `${S.gps.lat.toFixed(5)}, ${S.gps.lon.toFixed(5)}` : "غير متوفر"], ["التفسير", txt]] },
        { type: "table", head: ["المؤشر المرئي", "نسبة البكسلات %"], rows: [["طحالب محتملة", r.P.green], ["رواسب/طين", r.P.brown], ["رغوة", r.P.foam], ["ألوان زيتية محتملة", r.P.oil], ["مناطق داكنة", r.P.dark], ["ماء أزرق صافٍ", r.P.blue]].map(x => [x[0], U.fmt(x[1], 1)]) },
        U.$("#vi-ai-out").textContent.trim().length > 60 ? { type: "h", text: "تفسير الذكاء الاصطناعي (Gemini)" } : null,
        U.$("#vi-ai-out").textContent.trim().length > 60 ? { type: "text", html: U.$("#vi-ai-out").innerHTML } : null,
        { type: "note", text: "قراءة الصورة تقريبية للفرز السريع وتتأثر بالإضاءة وإعدادات الكاميرا، ولا تغني عن التحليل المختبري." },
        { type: "refs", items: ["Wang, S., et al. (2021). A dataset of remote-sensed Forel-Ule Index for global inland waters during 2000–2018. Scientific Data 8: 26.", "Novoa, S., et al. (2013). The Forel-Ule scale revisited spectrally. J. Eur. Opt. Soc. 8: 13057."] },
        { type: "sign" }
      ]
    }, mode);
  }

  ECO.views.vision = {
    init() {
      bindSelect();
      U.$("#vi-tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; U.$$("#vi-tabs button").forEach(x => x.classList.toggle("on", x === b)); U.$("#vi-water").hidden = b.dataset.t !== "water"; U.$("#vi-ocr").hidden = b.dataset.t !== "ocr"; };
      U.$("#vi-file").onchange = e => { const f = e.target.files[0]; if (f) load(f); e.target.value = ""; };
      const drop = U.$("#vi-drop");
      drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) load(f); });
      U.$("#vi-reset").onclick = () => { S.sel = { x: 0.2, y: 0.25, w: 0.6, h: 0.5 }; draw(); analyze(); };
      U.$("#vi-ai").onclick = aiAnalyze;
      U.$("#vi-pdf").onclick = () => report();
      U.$("#vi-save").onclick = () => {
        if (!S.res) { U.toast("ارفع صورة أولاً"); return; }
        const data = { type: "مياه نهر", photo: S.thumb, notes: `قراءة صورة: Forel-Ule = ${S.res.fu} (${FU_TEXT(S.res.fu)[0]})، درجة التلوث المرئي ${Math.round(S.res.score)}/100` };
        if (S.gps) ECO.samples.openNew({ ...data, lat: S.gps.lat, lon: S.gps.lon }); else ECO.samples.startAdd(data);
      };
      U.$("#vo-file").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) ocrLoad(f); };
      U.$("#vo-run").onclick = ocrRun;
      U.$("#vo-send").onclick = () => {
        const v = {}; OCR_KEYS().forEach(p => { const x = parseFloat((U.$("#vo-" + p.key) || {}).value); if (U.isNum(x)) v[p.key] = x; });
        ECO.water.fill(v, { name: U.$("#vo-name").value || "عيّنة من ورقة نتائج", site: U.$("#vo-site").value, date: U.$("#vo-date").value, source: "قيم مستخرجة من صورة ورقة نتائج (راجعها)" });
      };
      window.addEventListener("resize", U.debounce(draw, 200));
    }
  };
})();
