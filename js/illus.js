/* =====================================================================
   EcoBio AI — رسوم متحركة مرسومة بالكود (بدل الصور)
   كل رسم SVG خطي بلون القسم (--hue)، وحركته هادئة بـ CSS، وتتوقف حين
   يخرج الرسم من الشاشة أو عند تفعيل «تقليل الحركة».
   ECO.illus(key) يعيد نص SVG جاهزاً للإدراج.
   ===================================================================== */
(function () {
  "use strict";
  const ECO = (window.ECO = window.ECO || {});
  let uid = 0;
  const L = "rgba(238,245,243,.5)", L2 = "rgba(238,245,243,.22)", L3 = "rgba(238,245,243,.1)";
  // تدرّجات بمعرّفات فريدة لكل نسخة (المعرّف المكرر داخل صفحة مخفية لا يُرسم)
  const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;
  const svg = (body, defs, label) => `<svg class="il" viewBox="0 0 320 200" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet"><defs>${defs}</defs>${body}</svg>`;
  const H = "var(--hue, #4fc8dc)";

  const D = {
    /* الرصد: قمر صناعي يدور حول الأرض ويمسح نقاط الرصد */
    observe(k) {
      const g1 = `ob-e${k}`, g2 = `ob-b${k}`;
      return svg(`
        <g class="il-stars">${[[30, 30], [62, 70], [96, 22], [250, 28], [286, 64], [210, 52], [140, 40], [300, 110], [20, 110]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 0.9 : 1.4}" fill="${L}" class="il-blink" style="--d:${i * 0.4}s"/>`).join("")}</g>
        <circle cx="160" cy="330" r="190" fill="url(#${g1})" stroke="${H}" stroke-opacity=".5"/>
        ${[0, 1, 2].map(i => `<ellipse cx="160" cy="330" rx="${190 - i * 0}" ry="${70 + i * 34}" fill="none" stroke="${H}" stroke-opacity=".14"/>`).join("")}
        ${[100, 160, 220].map(x => `<path d="M${x} 140 Q ${x + (x - 160) * 0.25} 240 ${x + (x - 160) * 0.5} 330" fill="none" stroke="${H}" stroke-opacity=".12"/>`).join("")}
        <ellipse cx="160" cy="120" rx="150" ry="44" fill="none" stroke="${L2}" stroke-dasharray="3 6" transform="rotate(-8 160 120)"/>
        ${[[118, 160], [168, 152], [214, 166]].map(([x, y], i) => `<g transform="translate(${x} ${y})"><circle r="10" fill="none" stroke="${H}" class="il-ping" style="--d:${i * 0.9}s"/><circle r="2.6" fill="${H}"/></g>`).join("")}
        <g>
          <animateMotion dur="14s" repeatCount="indefinite" rotate="0" path="M10 140 A150 44 -8 1 1 310 100 A150 44 -8 1 1 10 140"/>
          <polygon points="0,8 -26,58 26,58" fill="url(#${g2})" class="il-beam"/>
          <rect x="-7" y="-5" width="14" height="10" rx="2" fill="${H}"/>
          <rect x="-26" y="-3" width="15" height="6" rx="1" fill="none" stroke="${H}"/><rect x="11" y="-3" width="15" height="6" rx="1" fill="none" stroke="${H}"/>
          <path d="M-11 0h4M7 0h4" stroke="${H}"/>
        </g>`,
        grad(g1, [[0, "#4fc8dc", 0.22], [0.5, "#0e3a44", 0.5], [1, "#061b22", 0.2]]) + grad(g2, [[0, "#4fc8dc", 0.45], [1, "#4fc8dc", 0]]), "رسم: قمر صناعي يرصد الأرض");
    },

    /* التحليل: دورق يغلي وفقاعات، ومنحنى نتائج يُرسم */
    analyze(k) {
      const c = `an-c${k}`, g = `an-l${k}`;
      const flask = "M92 46 h36 M98 46 v42 L62 160 a10 10 0 0 0 9 14 h78 a10 10 0 0 0 9 -14 L122 88 V46";
      return svg(`
        <clipPath id="${c}"><path d="M98 46 v42 L62 160 a10 10 0 0 0 9 14 h78 a10 10 0 0 0 9 -14 L122 88 V46 Z"/></clipPath>
        <g clip-path="url(#${c})">
          <g class="il-wave"><path d="M20 120 q 15 -8 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 V200 H20 Z" fill="url(#${g})"/></g>
          ${[[96, 0], [108, 1.1], [120, 0.5], [104, 1.7], [116, 2.3]].map(([x, d]) => `<circle cx="${x}" cy="168" r="${2 + (x % 3)}" fill="none" stroke="${H}" stroke-opacity=".8" class="il-rise" style="--d:${d}s"/>`).join("")}
        </g>
        <path d="${flask}" fill="none" stroke="${L}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M104 60h12M104 72h12" stroke="${L2}"/>
        <g transform="translate(176 52)">
          <rect width="118" height="96" rx="12" fill="rgba(255,255,255,.03)" stroke="${L3}"/>
          ${[24, 48, 72].map(y => `<path d="M12 ${y}h94" stroke="${L3}"/>`).join("")}
          <polyline points="14,76 34,62 52,68 70,40 88,46 104,22" fill="none" stroke="${H}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="il-draw"/>
          ${[[14, 76], [34, 62], [52, 68], [70, 40], [88, 46], [104, 22]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#051116" stroke="${H}" class="il-pop" style="--d:${0.3 + i * 0.25}s"/>`).join("")}
        </g>`,
        grad(g, [[0, "#4fc8dc", 0.55], [1, "#4fc8dc", 0.12]]), "رسم: دورق تحليل ومنحنى نتائج");
    },

    /* المعالجة: ماء عكر يمر بطبقات الترشيح فيخرج صافياً، وورق نبات يتمايل */
    treat(k) {
      const g = `tr-g${k}`, w = `tr-w${k}`;
      return svg(`
        <g transform="translate(110 22)">
          <rect x="0" y="0" width="100" height="150" rx="14" fill="rgba(255,255,255,.025)" stroke="${L}" stroke-width="1.5"/>
          <rect x="8" y="34" width="84" height="26" rx="6" fill="rgba(230,174,79,.16)"/>
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="${14 + (i * 13) % 78}" cy="${40 + (i * 7) % 16}" r="2.4" fill="rgba(230,174,79,.5)"/>`).join("")}
          <rect x="8" y="64" width="84" height="26" rx="6" fill="rgba(238,245,243,.07)"/>
          ${Array.from({ length: 22 }, (_, i) => `<circle cx="${12 + (i * 9) % 80}" cy="${69 + (i * 5) % 18}" r="1.1" fill="${L2}"/>`).join("")}
          <rect x="8" y="94" width="84" height="26" rx="6" fill="rgba(5,17,22,.9)" stroke="${L3}"/>
          ${Array.from({ length: 10 }, (_, i) => `<rect x="${13 + (i * 8) % 76}" y="${99 + (i * 6) % 14}" width="5" height="4" rx="1" fill="rgba(238,245,243,.18)"/>`).join("")}
          <text x="50" y="27" text-anchor="middle" font-size="9" fill="${L}" font-family="IBM Plex Mono, monospace">IN</text>
          <path d="M50 150 v18" stroke="${H}" stroke-width="2"/>
        </g>
        ${[0, 1, 2].map(i => `<path d="M${152 + i * 8} 6 q3 6 0 10 q-3 -4 0 -10z" fill="rgba(194,159,98,.9)" class="il-drop" style="--d:${i * 0.7}s"/>`).join("")}
        ${[0, 1, 2].map(i => `<path d="M160 186 q4 7 0 11 q-4 -4 0 -11z" fill="${H}" class="il-drop2" style="--d:${0.35 + i * 0.7}s"/>`).join("")}
        <g transform="translate(250 176)"><g class="il-sway" style="--d:.4s"><path d="M0 0 C -4 -40 10 -70 26 -96" fill="none" stroke="#93dd8a" stroke-width="1.6"/><path d="M8 -46 c 18 -14 32 -10 38 -2 c -14 8 -28 10 -38 2z" fill="url(#${g})"/><path d="M4 -24 c -18 -12 -32 -6 -36 2 c 14 6 26 6 36 -2z" fill="url(#${g})"/></g></g>
        <g transform="translate(70 176)"><g class="il-sway" style="--d:1.1s"><path d="M0 0 C 4 -36 -8 -62 -20 -80" fill="none" stroke="#93dd8a" stroke-width="1.4"/><path d="M-4 -40 c -16 -12 -30 -8 -34 0 c 12 6 24 8 34 0z" fill="url(#${g})"/></g></g>
        <path d="M20 190 q 30 -8 60 0 t 60 0 t 60 0 t 60 0 t 60 0" fill="none" stroke="url(#${w})" stroke-width="2" class="il-flow"/>`,
        grad(g, [[0, "#93dd8a", 0.55], [1, "#93dd8a", 0.12]]) + grad(w, [[0, "#4fc8dc", 0], [0.5, "#4fc8dc", 0.8], [1, "#4fc8dc", 0]], 1, 0), "رسم: ترشيح الماء ومعالجته بالنبات");
    },

    /* البحث: خريطة دجلة ودبابيس البحوث، وعدسة تبحث عن الفجوات */
    studies(k) {
      const g = `st-g${k}`;
      return svg(`
        <g transform="translate(46 26)">
          <rect width="228" height="148" rx="16" fill="rgba(255,255,255,.025)" stroke="${L2}"/>
          ${[30, 60, 90, 120].map(y => `<path d="M0 ${y}h228" stroke="${L3}"/>`).join("")}${[46, 92, 138, 184].map(x => `<path d="M${x} 0v148" stroke="${L3}"/>`).join("")}
          <path d="M150 -2 C 130 30 160 52 132 76 S 92 110 104 150" fill="none" stroke="url(#${g})" stroke-width="6" stroke-linecap="round"/>
          ${[[132, 38], [118, 86], [100, 128], [176, 108], [64, 56]].map(([x, y], i) => `<g transform="translate(${x} ${y})"><g class="il-pin" style="--d:${0.3 + i * 0.45}s"><path d="M0 0 c -7 -8 -9 -12 -9 -16 a9 9 0 0 1 18 0 c0 4 -2 8 -9 16z" fill="${i > 2 ? "rgba(238,245,243,.35)" : H}"/><circle cy="-16" r="3" fill="#051116"/></g></g>`).join("")}
        </g>
        <g class="il-lens"><animateMotion dur="11s" repeatCount="indefinite" path="M196 78 C 236 70 252 120 214 146 S 118 168 116 118 S 156 86 196 78"/><circle cx="0" cy="0" r="22" fill="rgba(79,200,220,.06)" stroke="${L}" stroke-width="2"/><path d="M16 16 l16 16" stroke="${L}" stroke-width="4" stroke-linecap="round"/></g>`,
        grad(g, [[0, "#4fc8dc", 0.15], [0.5, "#4fc8dc", 0.65], [1, "#4fc8dc", 0.15]]), "رسم: خريطة البحوث وعدسة الفجوات");
    },

    /* المختبر الافتراضي: ثلاث كؤوس بسوائل ملونة وماصة تقطّر */
    labs(k) {
      const ids = [0, 1, 2].map(i => `lb-${k}-${i}`), cols = ["#4fc8dc", "#e6ae4f", "#b493ff"];
      const beaker = (x, w, h, i) => `
        <clipPath id="${ids[i]}c"><rect x="${x + 2}" y="${178 - h}" width="${w - 4}" height="${h - 2}" rx="6"/></clipPath>
        <g clip-path="url(#${ids[i]}c)"><g class="il-wave" style="--d:${i * 0.6}s;--wl:-40px"><path d="M${x - 40} ${178 - h * 0.62} q 10 -5 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 V200 H${x - 40} Z" fill="url(#${ids[i]})"/></g>
          ${[0, 1, 2].map(j => `<circle cx="${x + w * (0.3 + j * 0.2)}" cy="176" r="2" fill="none" stroke="${cols[i]}" class="il-rise" style="--d:${i * 0.5 + j * 0.8}s"/>`).join("")}</g>
        <path d="M${x} ${178 - h} v${h - 8} a8 8 0 0 0 8 8 h${w - 16} a8 8 0 0 0 8 -8 v${-(h - 8)} M${x - 4} ${178 - h} h${w + 8}" fill="none" stroke="${L}" stroke-width="1.6"/>
        ${[0.3, 0.5, 0.7].map(f => `<path d="M${x + w - 12} ${178 - h * f}h8" stroke="${L2}"/>`).join("")}`;
      return svg(`
        <path d="M24 179h272" stroke="${L2}"/>
        ${beaker(60, 56, 92, 0)}${beaker(134, 52, 118, 1)}${beaker(206, 58, 78, 2)}
        <g class="il-bob"><path d="M160 6 v34 l-3 10 h6 l-3 -10" fill="none" stroke="${L}" stroke-width="1.4"/><ellipse cx="160" cy="8" rx="7" ry="9" fill="#ef5a64" opacity=".85"/></g>
        <circle cx="160" cy="58" r="2.6" fill="#e6ae4f" class="il-drop3"/>`,
        ids.map((id, i) => grad(id, [[0, cols[i], 0.7], [1, cols[i], 0.15]])).join(""), "رسم: كؤوس مختبر وماصة تقطّر");
    },

    /* الدليل: كتاب مفتوح وفقاعة سؤال ونجوم */
    help(k) {
      const g = `hp-g${k}`;
      return svg(`
        <g transform="translate(78 64)">
          <path d="M82 18 C 60 4 26 2 0 10 v104 c 26 -8 60 -6 82 8 c 22 -14 56 -16 82 -8 V10 C 138 2 104 4 82 18 Z" fill="url(#${g})" stroke="${L}" stroke-width="1.5"/>
          <path d="M82 18 v104" stroke="${L}"/>
          ${[34, 50, 66, 82].map((y, i) => `<path d="M14 ${y - 4} q 26 -6 56 0" fill="none" stroke="${L2}" pathLength="1" class="il-write" style="--d:${i * 0.5}s"/><path d="M94 ${y} q 30 -6 56 0" fill="none" stroke="${L2}" pathLength="1" class="il-write" style="--d:${0.25 + i * 0.5}s"/>`).join("")}
        </g>
        <g class="il-bob" style="--d:.6s"><rect x="200" y="18" width="84" height="44" rx="14" fill="rgba(255,255,255,.04)" stroke="${H}"/><path d="M220 62 l-6 12 l16 -12" fill="rgba(255,255,255,.04)" stroke="${H}"/><text x="242" y="46" text-anchor="middle" font-size="18" fill="${H}" font-family="Alexandria, sans-serif">؟</text></g>
        ${[[60, 40, 1], [262, 120, 0.7], [40, 150, 0.6], [150, 26, 0.8]].map(([x, y, s], i) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5Z" fill="${H}" class="il-twinkle" style="--d:${i * 0.7}s"/></g>`).join("")}`,
        grad(g, [[0, "#f0a6c8", 0.16], [1, "#f0a6c8", 0.03]]), "رسم: دليل مفتوح وسؤال");
    },

    /* القسم: مبنى الكلية بنوافذ تضيء */
    department(k) {
      const g = `dp-g${k}`;
      const win = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) win.push(`<rect x="${66 + c * 32}" y="${84 + r * 26}" width="16" height="14" rx="2" fill="${H}" class="il-light" style="--d:${((r * 6 + c) * 0.37) % 4}s"/>`);
      return svg(`
        <path d="M30 178h260" stroke="${L2}"/>
        <rect x="52" y="70" width="216" height="108" rx="6" fill="url(#${g})" stroke="${L}" stroke-width="1.5"/>
        <path d="M44 72 L160 30 L276 72" fill="none" stroke="${L}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M144 178 v-30 a16 16 0 0 1 32 0 v30" fill="rgba(79,200,220,.08)" stroke="${L}"/>
        ${win.join("")}
        <path d="M160 30 V8" stroke="${L}"/><path d="M160 8 h20 l-4 6 l4 6 h-20" fill="${H}" fill-opacity=".7" class="il-flag"/>
        ${[22, 290].map((x, i) => `<g transform="translate(${x} 178)"><g class="il-sway" style="--d:${i * 0.8}s"><path d="M0 0 v-34" stroke="#93dd8a" stroke-opacity=".7"/><circle cy="-44" r="14" fill="rgba(147,221,138,.18)" stroke="rgba(147,221,138,.5)"/></g></g>`).join("")}`,
        grad(g, [[0, "#c4d3cf", 0.08], [1, "#c4d3cf", 0.02]]), "رسم: مبنى قسم علوم الحياة");
    },

    /* محاكاة النهر: أمواج تجري ومصنع ونبات قصب */
    river(k) {
      const g = `rv-g${k}`;
      return svg(`
        <g transform="translate(40 50)"><rect width="48" height="36" rx="4" fill="rgba(255,255,255,.03)" stroke="${L}"/><rect x="30" y="-26" width="9" height="28" fill="none" stroke="${L}"/>
          ${[0, 1, 2].map(i => `<circle cx="35" cy="-34" r="${5 + i * 2}" fill="rgba(238,245,243,.18)" class="il-smoke" style="--d:${i * 1.1}s"/>`).join("")}</g>
        <path d="M64 86 v26" stroke="#e6ae4f" stroke-dasharray="3 4" class="il-flow"/>
        ${[0, 1, 2, 3].map(i => `<g class="il-wave" style="--d:${i * 0.7}s;--dur:${6 + i}s;--wl:-80px"><path d="M-40 ${118 + i * 16} q 20 -${7 - i} 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" fill="none" stroke="url(#${g})" stroke-width="${2.4 - i * 0.4}" stroke-opacity="${1 - i * 0.18}"/></g>`).join("")}
        ${[230, 246, 262, 278].map((x, i) => `<g transform="translate(${x} 118)"><g class="il-sway" style="--d:${i * 0.3}s"><path d="M0 0 C 2 -30 -2 -50 4 -70" fill="none" stroke="#93dd8a" stroke-width="1.4"/><ellipse cx="4" cy="-76" rx="2.5" ry="8" fill="#c29f62" opacity=".8"/></g></g>`).join("")}`,
        grad(g, [[0, "#4fc8dc", 0.1], [0.5, "#4fc8dc", 0.9], [1, "#4fc8dc", 0.1]], 1, 0), "رسم: نهر يجري ومصدر تلوث ونبات قصب");
    },

    /* محطة المعالجة: أحواض متصلة وماء يجري بينها */
    plant(k) {
      const tanks = [[24, "rgba(194,159,98,.55)", 0.82], [96, "rgba(160,160,130,.45)", 0.66], [168, "rgba(120,190,180,.45)", 0.5], [240, "rgba(79,200,220,.55)", 0.4]];
      return svg(`
        ${tanks.map(([x, c, f], i) => `
          <rect x="${x}" y="70" width="56" height="86" rx="10" fill="rgba(255,255,255,.025)" stroke="${L}" stroke-width="1.4"/>
          <rect x="${x + 4}" y="${74 + 78 * (1 - f)}" width="48" height="${78 * f}" rx="7" fill="${c}" class="il-level" style="--d:${i * 0.5}s"/>
          <text x="${x + 28}" y="182" text-anchor="middle" font-size="9" fill="${L}" font-family="IBM Plex Mono, monospace">${["IN", "COAG", "FILT", "OUT"][i]}</text>`).join("")}
        ${[80, 152, 224].map(x => `<path d="M${x} 96 h16" stroke="${L}" stroke-width="6" stroke-linecap="round"/><path d="M${x} 96 h16" stroke="${H}" stroke-width="2" stroke-dasharray="3 5" class="il-flow"/>`).join("")}
        <g transform="translate(24 30)"><rect width="272" height="22" rx="11" fill="rgba(255,255,255,.03)" stroke="${L3}"/><rect x="3" y="3" width="200" height="16" rx="8" fill="${H}" fill-opacity=".55" class="il-bar"/><text x="262" y="15" text-anchor="end" font-size="9" fill="${L}" font-family="IBM Plex Mono, monospace">BOD −93%</text></g>`,
        "", "رسم: أحواض محطة معالجة متصلة");
    },

    /* محلل البيانات: أعمدة تنمو وحروف دنكن */
    analyzer(k) {
      const bars = [[0.62, "a"], [0.84, "a"], [0.4, "b"], [0.74, "ab"], [0.28, "c"]];
      return svg(`
        <path d="M40 30 v140 h250" fill="none" stroke="${L2}"/>
        ${[60, 90, 120, 150].map(y => `<path d="M40 ${y}h250" stroke="${L3}"/>`).join("")}
        ${bars.map(([f, l], i) => { const x = 62 + i * 46, h = 130 * f; return `
          <rect x="${x}" y="${170 - h}" width="28" height="${h}" rx="5" fill="${H}" fill-opacity="${0.35 + i * 0.1}" class="il-grow" style="--d:${i * 0.18}s"/>
          <path d="M${x + 14} ${170 - h - 12} v12 M${x + 9} ${170 - h - 12} h10" stroke="${L}" class="il-fade" style="--d:${0.8 + i * 0.18}s"/>
          <text x="${x + 14}" y="${170 - h - 18}" text-anchor="middle" font-size="10" fill="${L}" font-family="IBM Plex Mono, monospace" class="il-fade" style="--d:${0.9 + i * 0.18}s">${l}</text>`; }).join("")}`,
        "", "رسم: أعمدة نتائج واختبار دنكن");
    }
  };

  ECO.illus = key => { const f = D[key] || D.observe; uid += 1; return f(uid); };
  ECO.illusKeys = Object.keys(D);

  /* إيقاف الحركة خارج الشاشة وعند «تقليل الحركة» */
  const reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let io = null;
  ECO.illusWatch = root => {
    const list = (root || document).querySelectorAll("svg.il:not([data-w])");
    list.forEach(s => {
      s.setAttribute("data-w", "1");
      if (reduced) { try { s.pauseAnimations(); } catch (e) { /* SMIL غير مدعوم */ } return; }
      if (!("IntersectionObserver" in window)) { s.setAttribute("data-run", ""); return; }
      if (!io) io = new IntersectionObserver(es => es.forEach(e => {
        const el = e.target;
        if (e.isIntersecting) { el.setAttribute("data-run", ""); try { el.unpauseAnimations(); } catch (x) { /* */ } }
        else { el.removeAttribute("data-run"); try { el.pauseAnimations(); } catch (x) { /* */ } }
      }), { rootMargin: "80px" });
      io.observe(s);
    });
  };
})();
