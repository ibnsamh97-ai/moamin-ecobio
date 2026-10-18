/* =====================================================================
   EcoBio AI — المساعد الذكي (Gemini) المتخصص بالتلوث والمعالجة
   ===================================================================== */
(function () {
  "use strict";
  const ECO = window.ECO, U = ECO.util, G = ECO.gemini;
  let history = U.store.get("chat", []), ctrl = null, inited = false;

  function liveContext() {
    const parts = [];
    const cur = ECO._lastCurrent;
    if (cur) {
      const rows = ECO.STATIONS.map(s => { const c = cur[s.id] || {}; return `${s.name}: AQI=${U.fmt(c.us_aqi, 0)}, PM2.5=${U.fmt(c.pm2_5, 1)}, PM10=${U.fmt(c.pm10, 0)}, Dust=${U.fmt(c.dust, 0)}, NO2=${U.fmt(c.nitrogen_dioxide, 1)}, SO2=${U.fmt(c.sulphur_dioxide, 1)}, O3=${U.fmt(c.ozone, 0)} µg/m³`; });
      const t = (cur[ECO.DEFAULT_STATION] || {}).time;
      parts.push(`قراءات الهواء الحالية${t ? " (" + U.fmtTime(t) + " بتوقيت بغداد)" : ""}[Copernicus CAMS]:\n` + rows.join("\n"));
    }
    if (ECO.lastAnalysis) parts.push("ملخص آخر تحليل ذكي:\n" + JSON.stringify(ECO.lastAnalysis));
    const smp = ECO.samples ? ECO.samples.list() : [];
    if (smp.length) parts.push(`عينات المستخدم على الخريطة (${smp.length}): ` + smp.slice(-8).map(s => `${s.code} ${s.site || ""} [${s.type}] ${s.lat.toFixed(4)},${s.lon.toFixed(4)}${s.wqi != null ? " WQI=" + s.wqi : ""}`).join("؛ "));
    if (ECO.lastVision) parts.push(`آخر قراءة صورة: Forel-Ule=${ECO.lastVision.fu} (${ECO.lastVision.class})، درجة التلوث المرئي ${ECO.lastVision.score}/100`);
    if (ECO.RESEARCH) parts.push("بحوث جامعة تكريت المتاحة في المنصة (بيانات منشورة):\n" + ECO.RESEARCH.map(r => `- ${r.authors} (${r.year})، ${r.place}: ${r.summary}`).join("\n"));
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

  function renderHistory() {
    const log = U.$("#chat-log");
    if (!history.length) return;
    log.innerHTML = "";
    history.forEach(m => bubble(m.role === "user" ? "user" : "bot", m.role === "user" ? U.esc(m.text).replace(/\n/g, "<br>") : botHTML(m.text)));
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
    if (!text) return;
    if (!G.ready()) {
      const n = bubble("err", `أضف مفتاح Gemini المجاني أولاً حتى يعمل المساعد. <button class="btn btn-sm" type="button" style="margin-inline-start:8px">إضافة المفتاح</button>`);
      n.querySelector("button").onclick = ECO.openSettings; return;
    }
    U.$("#chat-text").value = ""; grow();
    bubble("user", U.esc(text).replace(/\n/g, "<br>"));
    history.push({ role: "user", text });
    const out = bubble("bot", `<div class="who">EcoBio AI · Gemini</div><p class="typing"><i></i><i></i><i></i></p>`);
    const contents = history.slice(-16).map((m, i, arr) => ({ role: m.role, parts: [{ text: i === arr.length - 1 && U.$("#chat-ctx").checked ? m.text + liveContext() : m.text }] }));
    ctrl = new AbortController(); setBusy(true);
    try {
      const full = await G.generate({ contents, signal: ctrl.signal, onText: t => { out.innerHTML = botHTML(t); scrollDown(); } });
      history.push({ role: "model", text: full });
    } catch (e) {
      if (e.name === "AbortError") { history.push({ role: "model", text: (out.textContent || "").replace("EcoBio AI · Gemini", "").trim() + "\n\n_(أُوقف الرد)_" }); }
      else { out.remove(); history.pop(); bubble("err", U.esc(e.message === "NO_KEY" ? "أضف مفتاح Gemini أولاً." : e.message)); }
    }
    ctrl = null; setBusy(false);
    history = history.slice(-40); U.store.set("chat", history);
  }

  function grow() { const t = U.$("#chat-text"); t.style.height = "auto"; t.style.height = Math.min(160, t.scrollHeight) + "px"; }

  function status() {
    const s = U.$("#gem-status"); if (!s) return;
    if (G.ready()) { s.className = "chip tone-good"; s.textContent = "متصل · " + G.model(); }
    else { s.className = "chip tone-none"; s.textContent = "غير متصل – أضف المفتاح"; }
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
      U.$("#chat-settings").onclick = ECO.openSettings;
      U.$("#chat-clear").onclick = () => { if (ctrl) ctrl.abort(); history = []; U.store.del("chat"); U.$("#chat-log").innerHTML = ""; bubble("bot", botHTML("بدأت محادثة جديدة. كيف أساعدك في بحثك؟")); };
      renderHistory(); status();
      if (ECO._pendingChat) { const t = ECO._pendingChat; ECO._pendingChat = null; ECO.prefillChat(t); }
    },
    show() { status(); if (window.matchMedia && matchMedia("(pointer: fine)").matches) setTimeout(() => U.$("#chat-text").focus({ preventScroll: true }), 80); }
  };
})();
