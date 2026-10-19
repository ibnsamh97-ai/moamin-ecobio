/* =====================================================================
   EcoBio AI — المساعد الذكي (Gemini) المتخصص بالتلوث والمعالجة
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, G = ECO.gemini;
  let history = U.store.get("chat", []), ctrl = null, inited = false;
  /* المرفق الحالي ومحتوى الملفات المرفقة (في الذاكرة فقط، لا يُحفظ في المتصفح) */
  let att = null;
  const fileData = new WeakMap();
  const MAX_PDF = 9 * 1024 * 1024;

  function liveContext() {
    const parts = [];
    const cur = ECO._lastCurrent;
    if (cur) {
      const rows = ECO.STATIONS.map(s => { const c = cur[s.id] || {}; return `${s.name}: AQI=${U.aqiText(c.us_aqi)}, PM2.5=${U.fmt(c.pm2_5, 1)}, PM10=${U.fmt(c.pm10, 0)}, Dust=${U.fmt(c.dust, 0)}, NO2=${U.fmt(c.nitrogen_dioxide, 1)}, SO2=${U.fmt(c.sulphur_dioxide, 1)}, O3=${U.fmt(c.ozone, 0)} µg/m³`; });
      const t = (cur[ECO.DEFAULT_STATION] || {}).time;
      parts.push(`تقديرات الهواء الحالية${t ? " (" + U.fmtTime(t) + " بتوقيت بغداد)" : ""} [نموذج Copernicus CAMS بدقة ≈45 كم، وليست قياسات محطات أرضية؛ قد يبالغ النموذج في الغبار، وAQI فوق 500 خارج المقياس الرسمي]:\n` + rows.join("\n"));
    }
    const gs = ECO.ground ? ECO.ground.summary() : "";
    if (gs) parts.push(gs + "\n(عند التعارض قدّم الرصد الأرضي على تقدير النموذج ووضّح ذلك للمستخدم)");
    if (ECO.lastAnalysis) parts.push("ملخص آخر تحليل ذكي:\n" + JSON.stringify(ECO.lastAnalysis));
    const smp = ECO.samples ? ECO.samples.list() : [];
    if (smp.length) parts.push(`عينات المستخدم على الخريطة (${smp.length}): ` + smp.slice(-8).map(s => `${s.code} ${s.site || ""} [${s.type}] ${s.lat.toFixed(4)},${s.lon.toFixed(4)}${s.wqi != null ? " WQI=" + s.wqi : ""}`).join("؛ "));
    if (ECO.lastVision) parts.push(`آخر قراءة صورة: Forel-Ule=${ECO.lastVision.fu} (${ECO.lastVision.class})، درجة التلوث المرئي ${ECO.lastVision.score}/100`);
    if (ECO.RESEARCH) parts.push("بحوث جامعة تكريت المتاحة في المنصة (بيانات منشورة):\n" + ECO.RESEARCH.map(r => `- ${r.authors} (${r.year})، ${r.place}: ${r.summary}`).join("\n"));
    const ct = ECO.contrib ? ECO.contrib.list() : [];
    if (ct.length) parts.push(`مواقع بحوث الأساتذة المعتمدة على خريطة المنصة (${ct.length}):\n` + ct.slice(-15).map(s => `- ${s.place} (${s.lat}, ${s.lon}) [${s.type}]: ${(s.title ? s.title + " " : "") + s.researcher}، ${s.institution} (${s.year}) – ${s.research}${s.params && Object.keys(s.params).length ? " | " + Object.entries(s.params).map(([k, v]) => k + "=" + v).join(", ") : ""}`).join("\n"));
    if (ECO.lastWater) parts.push(`آخر عيّنة مياه في المختبر: ${ECO.lastWater.name} – WQI=${ECO.lastWater.wqi.toFixed(1)} (${ECO.lastWater.cls})، HPI=${ECO.lastWater.hpi == null ? "—" : ECO.lastWater.hpi.toFixed(1)}، التجاوزات: ${ECO.lastWater.exceed.join("، ") || "لا يوجد"}`);
    return parts.length ? `\n\n---\n[بيانات المنصة الحية للاستخدام عند الحاجة فقط]\n${parts.join("\n\n")}` : "";
  }

  function bubble(role, html) {
    const w = U.$("#chat-welcome"); if (w) w.remove();
    const b = U.el("div", { class: `msg ${role}` }, html);
    U.$("#chat-log").appendChild(b); scrollDown(); return b;
  }
  const scrollDown = () => { const l = U.$("#chat-log"); l.scrollTop = l.scrollHeight; };
  const botHTML = t => `<div class="who">EcoBio AI · Gemini</div>${U.md(t)}`;

  const fileIcon = mime => mime === "application/pdf" ? "i-file" : "i-camera";
  const userHTML = m => (m.file ? `<div class="att-in"><svg><use href="#${fileIcon(m.file.mime)}"/></svg><span>${U.esc(m.file.name)}</span></div>` : "") + U.esc(m.text).replace(/\n/g, "<br>");

  function renderHistory() {
    const log = U.$("#chat-log");
    if (!history.length) return;
    log.innerHTML = "";
    history.forEach(m => bubble(m.role === "user" ? "user" : "bot", m.role === "user" ? userHTML(m) : botHTML(m.text)));
  }

  /* ---------- إرفاق PDF أو صورة ---------- */
  function setAtt(a) {
    att = a;
    const box = U.$("#chat-att");
    if (!a) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = `<span class="att-chip"><svg><use href="#${fileIcon(a.mime)}"/></svg><b>${U.esc(a.name)}</b><span class="faint">${U.fileSize(a.size)}</span><button type="button" aria-label="إزالة المرفق"><svg><use href="#i-close"/></svg></button></span>`;
    box.querySelector("button").onclick = () => setAtt(null);
  }
  function pickFile(f) {
    if (!f) return;
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (isPdf) {
      if (f.size > MAX_PDF) { U.toast("حجم ملف PDF أكبر من 9 ميغابايت"); return; }
      const fr = new FileReader();
      fr.onload = () => setAtt({ name: f.name, mime: "application/pdf", data: String(fr.result).split(",")[1], size: f.size });
      fr.onerror = () => U.toast("تعذّرت قراءة الملف");
      fr.readAsDataURL(f); return;
    }
    if (!/^image\//.test(f.type)) { U.toast("الملفات المدعومة: PDF أو صورة"); return; }
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      const d = c.toDataURL("image/jpeg", 0.86);
      setAtt({ name: f.name || "صورة", mime: "image/jpeg", data: d.split(",")[1], size: Math.round(d.length * 0.75) });
    };
    img.onerror = () => U.toast("تعذّر فتح الصورة");
    img.src = url;
  }

  function setBusy(b) {
    const btn = U.$("#chat-send");
    btn.innerHTML = b ? `<svg><use href="#i-close"/></svg>` : `<svg style="transform:scaleX(-1)"><use href="#i-send"/></svg>`;
    btn.setAttribute("aria-label", b ? "إيقاف" : "إرسال");
    btn.classList.toggle("btn-primary", !b);
  }

  async function send(text) {
    text = (text || "").trim();
    if (ctrl) { ctrl.abort(); return; }
    if (!text && !att) return;
    if (!G.ready()) {
      const n = bubble("err", `المساعد غير مفعّل بعد على هذا الموقع. يمكنك إضافة مفتاح Gemini المجاني الخاص بك ليعمل عندك. <button class="btn btn-sm" type="button" style="margin-inline-start:8px">الإعدادات</button>`);
      n.querySelector("button").onclick = ECO.openSettings; return;
    }
    if (!text) text = att.mime === "application/pdf"
      ? "اقرأ الملف المرفق ولخّصه: الهدف، مواقع الدراسة، طرق العمل، أهم النتائج الرقمية في جداول، والاستنتاجات والتوصيات المتعلقة بالتلوث والمعالجة."
      : "حلّل الصورة المرفقة من منظور التلوث والمعالجة البيئية، واذكر ما يمكن استنتاجه منها وما يحتاج إلى فحص مختبري.";
    U.$("#chat-text").value = ""; grow();
    const entry = { role: "user", text };
    if (att) { entry.file = { name: att.name, mime: att.mime }; fileData.set(entry, att.data); setAtt(null); }
    bubble("user", userHTML(entry));
    history.push(entry);
    const out = bubble("bot", `<div class="who">EcoBio AI · Gemini</div><p class="typing"><i></i><i></i><i></i></p>`);
    /* يُعاد إرسال آخر ملف مرفق فقط مع المحادثة حتى يبقى الطلب صغيراً */
    const recent = history.slice(-16), lastFile = [...recent].reverse().find(m => fileData.has(m));
    const contents = recent.map((m, i, arr) => {
      let t = i === arr.length - 1 && U.$("#chat-ctx").checked ? m.text + liveContext() : m.text;
      const parts = [];
      if (m === lastFile) parts.push({ inline_data: { mime_type: m.file.mime, data: fileData.get(m) } });
      else if (m.file) t = `(أُرفق سابقاً ملف: ${m.file.name})\n` + t;
      parts.push({ text: t });
      return { role: m.role, parts };
    });
    ctrl = new AbortController(); setBusy(true);
    try {
      const full = await G.generate({ contents, signal: ctrl.signal, onText: t => { out.innerHTML = botHTML(t); scrollDown(); } });
      history.push({ role: "model", text: full });
    } catch (e) {
      if (e.name === "AbortError") { history.push({ role: "model", text: (out.textContent || "").replace("EcoBio AI · Gemini", "").trim() + "\n\n_(أُوقف الرد)_" }); }
      else {
        out.remove(); history.pop(); bubble("err", U.esc(e.message === "NO_KEY" ? "المساعد غير مفعّل بعد." : e.message));
        if (entry.file && fileData.has(entry)) { const d = fileData.get(entry); setAtt({ ...entry.file, data: d, size: Math.round(d.length * 0.75) }); }
      }
    }
    ctrl = null; setBusy(false);
    history = history.slice(-40); U.store.set("chat", history);
  }

  function grow() { const t = U.$("#chat-text"); t.style.height = "auto"; t.style.height = Math.min(160, t.scrollHeight) + "px"; }

  function status() {
    const s = U.$("#gem-status"); if (!s) return;
    if (G.ready()) { s.className = "chip tone-good"; s.textContent = G.label(); }
    else { s.className = "chip tone-none"; s.textContent = "غير مفعّل"; }
  }
  ECO.bus.on("gemini", status);

  ECO.prefillChat = text => {
    const go = () => { const t = U.$("#chat-text"); t.value = text; grow(); t.focus(); };
    if (inited) setTimeout(go, 50); else ECO._pendingChat = text;
  };

  ECO.views.assistant = {
    init() {
      inited = true;
      U.$("#chat-sugg").innerHTML = ECO.CHAT_SUGGESTIONS.map(q => `<button type="button">${U.esc(q)}</button>`).join("");
      U.$("#chat-sugg").onclick = e => { const b = e.target.closest("button"); if (b) send(b.textContent); };
      U.$("#chat-form").onsubmit = e => { e.preventDefault(); send(U.$("#chat-text").value); };
      U.$("#chat-text").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(U.$("#chat-text").value); } });
      U.$("#chat-text").addEventListener("input", grow);
      U.$("#chat-attach").onclick = () => U.$("#chat-file").click();
      U.$("#chat-file").onchange = e => { pickFile(e.target.files[0]); e.target.value = ""; };
      const chatBox = U.$(".chat");
      chatBox.addEventListener("dragover", e => { e.preventDefault(); });
      chatBox.addEventListener("drop", e => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); });
      U.$("#chat-settings").onclick = ECO.openSettings;
      U.$("#chat-clear").onclick = () => { if (ctrl) ctrl.abort(); setAtt(null); history = []; U.store.del("chat"); U.$("#chat-log").innerHTML = ""; bubble("bot", botHTML("بدأت محادثة جديدة. كيف أساعدك في بحثك؟")); };
      renderHistory(); status();
      if (ECO._pendingChat) { const t = ECO._pendingChat; ECO._pendingChat = null; ECO.prefillChat(t); }
    },
    show() { status(); if (window.matchMedia && matchMedia("(pointer: fine)").matches) setTimeout(() => U.$("#chat-text").focus({ preventScroll: true }), 80); }
  };
})();
