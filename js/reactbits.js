/* =====================================================================
   مكونات React Bits منقولة إلى JavaScript عادي (المنصة لا تستعمل React)
   BlurText · LightRays · StarBorder · CountUp
   ---------------------------------------------------------------------
   Ported from React Bits — https://github.com/DavidHDev/react-bits
   Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0:
   used and modified as part of this website/application; the components
   themselves are not sold, sublicensed or redistributed on their own.
   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.
   ---------------------------------------------------------------------
   الاختلافات عن الأصل: الحركة تُدار بـ GSAP بدل motion/react، تقسيم النص بالكلمات
   يحافظ على العناصر الداخلية وعلى اتصال الحروف العربية، وكل مكوّن يحترم
   prefers-reduced-motion.
   ===================================================================== */
(function () {
  "use strict";
  const RB = (window.ECO = window.ECO || {}).rb = {};
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ------------------------------------------------------------------
     BlurText — كلمات تظهر من ضباب مع انزلاق خفيف (تأثير 'blur' الافتراضي)
     الأصل: from {blur(10px), opacity 0, y −50} → {blur(0), opacity 1, y 0}،
     الشفافية والضباب خطيان خلال stepDuration×2، وفاصل delay بين الكلمات.
  ------------------------------------------------------------------ */
  RB.blurText = (el, o = {}) => {
    const opt = Object.assign({ delay: 200, blur: 10, distance: 50, direction: "top", stepDuration: 0.35 }, o);
    // نقسّم عُقد النص فقط (العربية تبقى متصلة داخل الكلمة، والعناصر الداخلية تبقى كما هي)
    const words = [];
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.nodeValue.split(/(\s+)/);
          if (parts.length === 1 && !parts[0].trim()) return;
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement("span"); s.className = "rb-bt-w"; s.textContent = p;
            frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("rb-bt-w")) walk(n);
      });
    };
    const label = el.textContent.replace(/\s+/g, " ").trim();
    walk(el);
    if (words.length) el.setAttribute("aria-label", label);   // قارئ الشاشة يقرأ الجملة كاملة لا كلمة كلمة
    // الإزاحة بخاصية translate لا transform: لا تحتاج GSAP لقياس العنصر، فتعمل حتى لو كانت الصفحة
    // مخفية بعد (قياس GSAP لعنصر مخفي ينقله مؤقتاً ويعيده فيُربك المسافات بين الكلمات)
    const horiz = opt.direction === "left" || opt.direction === "right";
    const sign = opt.direction === "bottom" || opt.direction === "right" ? 1 : -1;
    const from = horiz ? `${sign * opt.distance}px 0px` : `0px ${sign * opt.distance}px`;
    const total = opt.stepDuration * 2, stagger = Math.max(0, opt.delay) / 1000;
    // بعد انتهاء الحركة يعود العنوان نصاً عادياً كما كان تماماً
    const restore = () => {
      words.forEach(w => { if (w.parentNode) w.parentNode.replaceChild(document.createTextNode(w.textContent), w); });
      el.normalize(); el.removeAttribute("aria-label"); words.length = 0;
    };
    return {
      words, restore,
      hide() { if (window.gsap && words.length) gsap.set(words, { opacity: 0, filter: `blur(${opt.blur}px)`, translate: from }); },
      play(at = 0) {
        const tl = gsap.timeline({ delay: at, onComplete: restore });
        tl.to(words, { opacity: 1, filter: "blur(0px)", duration: total, ease: "none", stagger }, 0)
          .to(words, { translate: "0px 0px", duration: total, ease: "power3.out", stagger }, 0);
        return tl;
      }
    };
  };

  /* ------------------------------------------------------------------
     LightRays — أشعة ضوء WebGL2 (الشيدر الأصلي كما هو)
  ------------------------------------------------------------------ */
  const PIXEL_BUDGET = 2.4e6;
  const MAX_PULSES = 4;
  const ORIGINS = {
    "top-left": { anchor: [0, -0.2], dir: [0, 1] },
    "top-center": { anchor: [0.5, -0.2], dir: [0, 1] },
    "top-right": { anchor: [1, -0.2], dir: [0, 1] },
    left: { anchor: [-0.2, 0.5], dir: [1, 0] },
    right: { anchor: [1.2, 0.5], dir: [-1, 0] },
    "bottom-left": { anchor: [0, 1.2], dir: [0, -1] },
    "bottom-center": { anchor: [0.5, 1.2], dir: [0, -1] },
    "bottom-right": { anchor: [1, 1.2], dir: [0, -1] }
  };
  const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;
  const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2 uSource;
uniform vec2 uAim;
uniform float uReach;
uniform vec3 uColor;
uniform float uSpread;
uniform float uLength;
uniform float uFade;
uniform float uSaturation;
uniform float uPulsating;
uniform float uNoise;
uniform float uDistortion;
uniform float uDensity;
uniform float uSharpness;
uniform float uGlow;
uniform float uHaze;
uniform float uAtmosphere;
uniform float uIntensity;
uniform vec4 uShadow;
uniform vec4 uPulses[${MAX_PULSES}];
uniform vec2 uIntro;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float shape(float strength, float width) {
  float edge = max(mix(0.5, 0.08, uSharpness), width);
  return mix(strength, smoothstep(0.62 - edge, 0.62 + edge, strength), uSharpness);
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  vec2 delta = coord - uSource;
  float distance = length(delta);
  vec2 dir = delta / max(distance, 1e-4);
  float cosAngle = dot(dir, uAim);
  float angle = cosAngle + uDistortion * sin(uTime * 2.0 + distance * 0.02) * 0.2;
  float slope = fwidth(angle);
  float depth = distance / uReach;

  float source = exp(-depth * depth * 9.0) * 0.9 + exp(-depth * 3.2) * 0.25;
  float glowLight = uGlow * source * smoothstep(-0.2, 0.6, cosAngle);
  float spread = pow(max(angle, 0.0), 1.0 / uSpread);
  float lengthFalloff = clamp(1.0 - distance / (uReach * uLength), 0.0, 1.0);
  float fadeFalloff = clamp(1.0 - distance / (uReach * uFade), 0.5, 1.0);
  float envelope = spread * lengthFalloff * fadeFalloff;
  float reveal = uIntensity * uIntro.y * (1.0 - smoothstep(uIntro.x - 0.35, uIntro.x, depth));
  if ((envelope * 1.6 + glowLight) * reveal < 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float phaseA = angle * 36.2214 * uDensity + uTime * 1.5;
  float phaseB = -angle * 21.11349 * uDensity + uTime * 1.5;
  float phaseC = angle * 22.3991 * uDensity + uTime * 1.1;
  float phaseD = -angle * 18.0234 * uDensity + uTime * 1.1;
  float strengthA = clamp(0.75 + 0.15 * sin(phaseA) + 0.2 * cos(phaseB), 0.0, 1.0);
  float strengthB = clamp(0.75 + 0.15 * sin(phaseC) + 0.2 * cos(phaseD), 0.0, 1.0);
  float widthA = abs(0.15 * 36.2214 * cos(phaseA) + 0.2 * 21.11349 * sin(phaseB)) * uDensity * slope;
  float widthB = abs(0.15 * 22.3991 * cos(phaseC) + 0.2 * 18.0234 * sin(phaseD)) * uDensity * slope;
  float pulseA = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 4.5) : 1.0;
  float pulseB = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 3.3) : 1.0;
  float rayLight = envelope * (0.5 * shape(strengthA, widthA) * pulseA + 0.4 * shape(strengthB, widthB) * pulseB);

  if (uHaze > 0.0) {
    float around = atan(uAim.x * dir.y - uAim.y * dir.x, cosAngle);
    vec2 drift = vec2(around * 2.2 + uTime * 0.035, depth * 2.6 - uTime * 0.11);
    float fog = 0.65 * valueNoise(drift * vec2(3.0, 1.0)) + 0.35 * valueNoise(drift * vec2(7.0, 2.3) + 4.1);
    rayLight *= mix(1.0, 0.25 + 1.2 * fog, uHaze);
  }

  if (uShadow.z > 0.0) {
    vec2 toCursor = uShadow.xy - uSource;
    float cursorDistance = length(toCursor);
    float along = dot(delta, toCursor) / max(cursorDistance * cursorDistance, 1e-4);
    float side = abs(delta.x * toCursor.y - delta.y * toCursor.x) / max(cursorDistance, 1e-4);
    float trail = max(along - 1.0, 0.0);
    float width = uShadow.w * along + 0.22 * trail * cursorDistance;
    float behind = smoothstep(0.97, 1.25, along) * exp(-trail * 1.1);
    float shade = (1.0 - smoothstep(width * 0.3, width * 1.6, side)) * behind;
    rayLight *= 1.0 - uShadow.z * 0.62 * shade;
  }

  float boost = 0.0;
  for (int i = 0; i < ${MAX_PULSES}; i++) {
    vec4 wave = uPulses[i];
    if (wave.z <= 0.0) continue;
    float x = (depth - wave.x) / wave.y;
    boost += wave.z * exp(-x * x);
  }
  float light = (rayLight * (1.0 + boost) + glowLight) * reveal;

  if (uNoise > 0.0) {
    float n = fract(sin(dot(coord * 0.02 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
    light *= 1.0 - uNoise + uNoise * n;
  }

  float near = clamp(1.2 - distance / (uResolution.y / uScale), 0.0, 1.0);
  vec3 tint = mix(vec3(0.9), vec3(0.1, 0.3, 0.5) + near * vec3(0.8, 0.6, 0.5), uAtmosphere);
  float gray = dot(tint, vec3(0.299, 0.587, 0.114));
  vec3 hue = max(mix(vec3(gray), tint, uSaturation), 0.0) * uColor;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    vec3 color = hue * light;
    float energy = max(color.r, max(color.g, color.b));
    vec3 tone = clamp(1.0 - (1.0 - hue / max(max(hue.r, max(hue.g, hue.b)), 1e-4)) * 1.8, 0.0, 1.0);
    float warm = clamp((min(tone.r, tone.g) - tone.b) * 2.0, 0.0, 1.0);
    vec3 ink = tone * (mix(0.66, 0.94, warm) - 0.1 * smoothstep(0.4, 1.2, energy));
    float density = clamp(0.82 * (1.0 - exp(-1.5 * energy * energy)) * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(ink * density, density);
    return;
  }
  float level = light < 0.75 ? light : 0.75 + 0.25 * (1.0 - exp(-(light - 0.75) / 0.25));
  float top = max(hue.r, max(hue.g, hue.b));
  hue = mix(hue, vec3(top), smoothstep(0.8, 1.0, level) * 0.45);
  vec3 shown = clamp(hue * level, 0.0, 1.0) * level;
  fragColor = vec4(clamp(shown + grain, 0.0, level) * uOpacity, level * uOpacity);
}`;
  const parseColor = value => {
    const text = String(value || "").trim();
    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
    if (hex) {
      const full = hex[1].length === 3 ? hex[1].replace(/./g, d => d + d) : hex[1];
      return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
    }
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    if (rgb) return [rgb[1], rgb[2], rgb[3]].map(c => clamp(parseFloat(c) / 255, 0, 1));
    return null;
  };
  const compile = (gl, type, source) => {
    const sh = gl.createShader(type); if (!sh) return null;
    gl.shaderSource(sh, source); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(sh)); gl.deleteShader(sh); return null; }
    return sh;
  };
  const link = gl => {
    const v = compile(gl, gl.VERTEX_SHADER, VERTEX), f = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = v && f ? gl.createProgram() : null;
    if (!v || !f || !program) { if (v) gl.deleteShader(v); if (f) gl.deleteShader(f); return null; }
    gl.attachShader(program, v); gl.attachShader(program, f); gl.linkProgram(program); gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(program)); gl.deleteProgram(program); return null; }
    const uniforms = {}, count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) { const info = gl.getActiveUniform(program, i); if (info) uniforms[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, info.name); }
    return { program, uniforms };
  };
  const smoother = t => { const x = clamp(t, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };

  RB.lightRays = (container, o = {}) => {
    const p = Object.assign({
      raysOrigin: "top-center", raysColor: "#ffffff", raysSpeed: 1, lightSpread: 0.5, rayLength: 3, rayDensity: 1, tilt: 0,
      raySharpness: 0.35, glow: 0.6, haze: 0.25, atmosphere: 1, intensity: 1, pulsating: false, fadeDistance: 1, saturation: 1,
      followMouse: true, mouseInfluence: 0.1, cursorShadow: true, clickPulse: true, noiseAmount: 0, distortion: 0, intro: true,
      lightMode: false, opacity: 1, maxDevicePixelRatio: 2
    }, o);
    const s = {
      // إضافة على الأصل: يمكن تمرير مصدر مخصّص {anchor:[x,y], dir:[dx,dy]} بنسب من العرض والارتفاع
      origin: p.raysOrigin && typeof p.raysOrigin === "object" ? p.raysOrigin : (ORIGINS[p.raysOrigin] || ORIGINS["top-center"]),
      color: parseColor(p.raysColor) || [1, 1, 1], speed: Math.max(0, p.raysSpeed),
      spread: Math.max(0.001, p.lightSpread), length: Math.max(0.01, p.rayLength), density: clamp(p.rayDensity, 0.1, 6),
      tilt: (clamp(p.tilt, -90, 90) * Math.PI) / 180, sharpness: clamp(p.raySharpness, 0, 1), glow: Math.max(0, p.glow), haze: clamp(p.haze, 0, 1),
      atmosphere: clamp(p.atmosphere, 0, 1), intensity: Math.max(0, p.intensity), pulsating: p.pulsating, fade: Math.max(0.01, p.fadeDistance),
      saturation: Math.max(0, p.saturation), follow: p.followMouse, influence: clamp(p.mouseInfluence, 0, 1), cursorShadow: p.cursorShadow,
      clickPulse: p.clickPulse, noise: clamp(p.noiseAmount, 0, 1), distortion: p.distortion, intro: p.intro, light: p.lightMode,
      opacity: clamp(p.opacity, 0, 1), maxRatio: clamp(p.maxDevicePixelRatio, 0.5, 3)
    };
    const canvas = document.createElement("canvas"); canvas.className = "light-rays__canvas"; canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    const shader = gl ? link(gl) : null;
    if (!gl || !shader) { canvas.remove(); return null; }   // بلا WebGL2 تبقى الخلفية كما كانت

    const reduced = reducedMotion();
    const vao = gl.createVertexArray();
    const size = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0.5, y: 0.5, inside: false, seen: false };
    const aim = { x: 0.5, y: 0.5 };
    const shade = { x: 0.5, y: 0.5, presence: 0 };
    const pulses = [], pulseData = new Float32Array(MAX_PULSES * 4);
    let time = 0, opening = s.intro && !reduced ? 0 : 1, raf = 0, last = 0, visible = true, pageVisible = document.visibilityState !== "hidden", lost = false;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width), cssHeight = Math.max(1, rect.height);
      const detail = s.density * (0.35 + 0.65 * s.sharpness);
      const sampling = Math.max(clamp(0.35 + 0.3 * detail, 0.5, 2), s.noise > 0 ? 1 : 0);
      const ratio = Math.min(window.devicePixelRatio || 1, s.maxRatio, sampling, Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight)));
      const width = Math.max(1, Math.round(cssWidth * ratio)), height = Math.max(1, Math.round(cssHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      size.width = cssWidth; size.height = cssHeight; size.ratio = width / cssWidth;
    };

    const frame = now => {
      raf = 0;
      if (lost) return;
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      time += dt * s.speed * (reduced ? 0 : 1);
      if (opening < 1) opening = Math.min(1, opening + dt / 1.8);
      const steer = 1 - Math.exp(-dt / 0.2);
      const aimX = s.follow && pointer.seen ? pointer.x : 0.5, aimY = s.follow && pointer.seen ? pointer.y : 0.5;
      aim.x += (aimX - aim.x) * steer; aim.y += (aimY - aim.y) * steer;
      const glide = 1 - Math.exp(-dt / 0.08);
      shade.x += (pointer.x - shade.x) * glide; shade.y += (pointer.y - shade.y) * glide;
      const shading = pointer.inside && s.cursorShadow && !reduced;
      shade.presence += ((shading ? 1 : 0) - shade.presence) * (1 - Math.exp(-dt / (shading ? 0.25 : 0.5)));
      for (let i = pulses.length - 1; i >= 0; i--) { pulses[i].age += dt; if (pulses[i].age >= 2) pulses.splice(i, 1); }
      pulseData.fill(0);
      pulses.forEach((pulse, i) => { const t = pulse.age; pulseData[i * 4] = 0.05 + t * 1.05; pulseData[i * 4 + 1] = 0.14 + t * 0.14; pulseData[i * 4 + 2] = 0.9 * smoother(t / 0.15) * (1 - smoother(t / 2)); });

      const width = size.width, height = size.height;
      const sourceX = s.origin.anchor[0] * width, sourceY = s.origin.anchor[1] * height;
      const cos = Math.cos(s.tilt), sin = Math.sin(s.tilt);
      let dirX = s.origin.dir[0] * cos - s.origin.dir[1] * sin, dirY = s.origin.dir[0] * sin + s.origin.dir[1] * cos;
      if (s.follow && s.influence > 0) {
        const mx = aim.x * width - sourceX, my = aim.y * height - sourceY, ml = Math.hypot(mx, my) || 1;
        const bx = dirX + (mx / ml - dirX) * s.influence, by = dirY + (my / ml - dirY) * s.influence, bl = Math.hypot(bx, by) || 1;
        dirX = bx / bl; dirY = by / bl;
      }
      const eased = 1 - Math.pow(1 - opening, 3);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(shader.program); gl.bindVertexArray(vao);
      const u = shader.uniforms;
      gl.uniform2f(u.uResolution, canvas.width, canvas.height); gl.uniform1f(u.uScale, size.ratio); gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uSource, sourceX, sourceY); gl.uniform2f(u.uAim, dirX, dirY); gl.uniform1f(u.uReach, Math.max(width, height));
      gl.uniform3f(u.uColor, s.color[0], s.color[1], s.color[2]); gl.uniform1f(u.uSpread, s.spread); gl.uniform1f(u.uLength, s.length);
      gl.uniform1f(u.uFade, s.fade); gl.uniform1f(u.uSaturation, s.saturation); gl.uniform1f(u.uPulsating, s.pulsating ? 1 : 0);
      gl.uniform1f(u.uNoise, s.noise); gl.uniform1f(u.uDistortion, s.distortion); gl.uniform1f(u.uDensity, s.density);
      gl.uniform1f(u.uSharpness, s.sharpness); gl.uniform1f(u.uGlow, s.glow); gl.uniform1f(u.uHaze, s.haze);
      gl.uniform1f(u.uAtmosphere, s.atmosphere); gl.uniform1f(u.uIntensity, s.intensity);
      gl.uniform4f(u.uShadow, shade.x * width, shade.y * height, shade.presence, 16);
      gl.uniform4fv(u.uPulses, pulseData); gl.uniform2f(u.uIntro, eased * 2.6, smoother(opening / 0.5));
      gl.uniform1f(u.uLight, s.light ? 1 : 0); gl.uniform1f(u.uOpacity, s.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const settling = Math.abs(aim.x - aimX) > 1e-4 || Math.abs(aim.y - aimY) > 1e-4 ||
        (shade.presence > 1e-3 && Math.abs(shade.x - pointer.x) + Math.abs(shade.y - pointer.y) > 1e-4) ||
        Math.abs((shading ? 1 : 0) - shade.presence) > 1e-3 || pulses.length > 0;
      const busy = (s.speed > 0 && !reduced) || opening < 1 || settling;
      if (busy && visible && pageVisible) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (raf || lost || !visible || !pageVisible) return; last = performance.now(); raf = requestAnimationFrame(frame); };
    const locate = e => {
      const r = container.getBoundingClientRect();
      return { x: (e.clientX - r.left) / Math.max(1, r.width), y: (e.clientY - r.top) / Math.max(1, r.height),
        inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
    };
    const onMove = e => { const spot = locate(e); if (!pointer.inside && spot.inside) { shade.x = spot.x; shade.y = spot.y; } pointer.x = spot.x; pointer.y = spot.y; pointer.inside = spot.inside; pointer.seen = true; wake(); };
    const onDown = e => { const spot = locate(e); if (!spot.inside || !s.clickPulse || reduced) return; pulses.push({ age: 0 }); if (pulses.length > MAX_PULSES) pulses.shift(); wake(); };
    const onLeave = () => { pointer.inside = false; wake(); };
    const onUp = e => { if (e.pointerType !== "mouse") onLeave(); };
    if (s.follow || s.cursorShadow) { window.addEventListener("pointermove", onMove, { passive: true }); document.documentElement.addEventListener("pointerleave", onLeave); }
    if (s.clickPulse) window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true }); window.addEventListener("pointercancel", onUp, { passive: true });
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; });
    const ro = new ResizeObserver(() => { resize(); wake(); }); ro.observe(container);
    const io = new IntersectionObserver(es => { visible = es.some(x => x.isIntersecting); wake(); }); io.observe(container);
    document.addEventListener("visibilitychange", () => { pageVisible = document.visibilityState !== "hidden"; wake(); });
    resize(); wake();
    return { canvas, wake };
  };

  /* ------------------------------------------------------------------
     StarBorder — نجمة ضوء تدور على حافة الزر (Canvas 2D، الإعدادات الأصلية)
     لا تغيّر خلفية الزر ولا لون نصه: تُرسم فوق الخلفية وتحت النص.
  ------------------------------------------------------------------ */
  const BLEED = 48, LAP = 0.9, TAU = Math.PI * 2, WHITE = [255, 255, 255];
  const wrap = (v, t) => ((v % t) + t) % t;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (rgb, a) => `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${clamp(a, 0, 1).toFixed(3)})`;
  let colorCtx = null;
  const toRgb = color => {
    colorCtx = colorCtx || document.createElement("canvas").getContext("2d");
    if (!colorCtx) return WHITE;
    colorCtx.fillStyle = "#000000"; colorCtx.fillStyle = color;
    const v = String(colorCtx.fillStyle);
    if (v.startsWith("#")) { const h = parseInt(v.slice(1, 7), 16); return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; }
    const parts = (v.match(/[\d.]+/g) || []).map(Number); return parts.length >= 3 ? parts : WHITE;
  };
  const outline = (width, height, radius) => {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2)), arc = (Math.PI * r) / 2;
    const across = Math.max(0, width - 2 * r), down = Math.max(0, height - 2 * r);
    const segments = [
      { length: across, x: r, y: 0, dx: 1, dy: 0, angle: null }, { length: arc, x: width - r, y: r, dx: 0, dy: 0, angle: -Math.PI / 2 },
      { length: down, x: width, y: r, dx: 0, dy: 1, angle: null }, { length: arc, x: width - r, y: height - r, dx: 0, dy: 0, angle: 0 },
      { length: across, x: width - r, y: height, dx: -1, dy: 0, angle: null }, { length: arc, x: r, y: height - r, dx: 0, dy: 0, angle: Math.PI / 2 },
      { length: down, x: 0, y: height - r, dx: 0, dy: -1, angle: null }, { length: arc, x: r, y: r, dx: 0, dy: 0, angle: Math.PI }
    ];
    return { r, segments, total: Math.max(1, segments.reduce((a, g) => a + g.length, 0)) };
  };
  const pointAt = (shape, distance, pt) => {
    let d = wrap(distance, shape.total);
    for (const g of shape.segments) {
      if (g.length > 0 && d <= g.length) {
        if (g.angle === null) { pt.x = g.x + g.dx * d; pt.y = g.y + g.dy * d; pt.nx = g.dy; pt.ny = -g.dx; }
        else { const a = g.angle + d / shape.r; pt.nx = Math.cos(a); pt.ny = Math.sin(a); pt.x = g.x + pt.nx * shape.r; pt.y = g.y + pt.ny * shape.r; }
        return pt;
      }
      d -= g.length;
    }
    return pt;
  };
  const project = (shape, px, py) => {
    let best = Infinity, found = 0, offset = 0;
    shape.segments.forEach(g => {
      if (g.length > 0) {
        let d = 0, x = 0, y = 0;
        if (g.angle === null) { d = clamp((px - g.x) * g.dx + (py - g.y) * g.dy, 0, g.length); x = g.x + g.dx * d; y = g.y + g.dy * d; }
        else {
          let a = wrap(Math.atan2(py - g.y, px - g.x) - g.angle, TAU);
          if (a > Math.PI / 2) a = a > Math.PI * 1.25 ? 0 : Math.PI / 2;
          d = a * shape.r; x = g.x + Math.cos(g.angle + a) * shape.r; y = g.y + Math.sin(g.angle + a) * shape.r;
        }
        const dist = (px - x) ** 2 + (py - y) ** 2;
        if (dist < best) { best = dist; found = offset + d; }
      }
      offset += g.length;
    });
    return found;
  };

  RB.starBorder = (root, o = {}) => {
    const cs = getComputedStyle(root);
    const s = Object.assign({
      color: "#ffffff", trailColor: null, duration: 4, thickness: 1, radius: parseFloat(cs.borderTopLeftRadius) || 12,
      trailLength: 0.3, stars: 1, glow: 0.6, sparkle: false, direction: "clockwise", hover: "lap", clickPulse: true
    }, o);
    s.trailColor = s.trailColor || s.color; s.duration = Math.max(0.3, s.duration); s.thickness = Math.max(0.5, s.thickness);
    s.trailLength = clamp(s.trailLength, 0, 1); s.stars = clamp(Math.round(s.stars), 1, 6); s.glow = clamp(s.glow, 0, 1);
    s.direction = s.direction === "counterclockwise" ? -1 : 1;
    // في الواجهة العربية يدور مع اتجاه القراءة
    if (getComputedStyle(document.documentElement).direction === "rtl" && !o.direction) s.direction = -1;
    const canvas = document.createElement("canvas"); canvas.className = "rb-star__light"; canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d"); if (!ctx) return null;
    root.classList.add("rb-star");
    root.insertBefore(canvas, root.firstChild);
    // أزرار المنصة تقصّ ما يخرج عنها (لموجة الضغط)؛ نُبقي القصّ للموجة وحدها داخل غلاف،
    // ونترك هالة النجمة تظهر حول الزر
    const host = document.createElement("span"); host.className = "rb-star__clip"; host.setAttribute("aria-hidden", "true");
    root.insertBefore(host, canvas.nextSibling);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.classList.contains("ripple")) host.appendChild(n);
    }))).observe(root, { childList: true });
    const reduce = reducedMotion();
    const pt = { x: 0, y: 0, nx: 0, ny: -1 };
    const st = { width: 0, height: 0, dpr: 1, phase: 0, velocity: 0, motion: 0, lap: -1, time: 0, reveal: 0, boost: 0, flash: 0, hovered: false, focused: false, visible: true };
    const pulses = [];
    const colors = { head: toRgb(s.color), tail: toRgb(s.trailColor) };
    let raf = 0, last = performance.now();

    const measure = () => {
      const b = getComputedStyle(root);
      st.width = root.offsetWidth; st.height = root.offsetHeight; st.dpr = Math.min(window.devicePixelRatio || 1, 2);
      // اللوحة تغطي الزر من حافته الخارجية (مع الإطار) وتزيد 48px من كل جهة
      Object.assign(canvas.style, { left: -(BLEED + (parseFloat(b.borderLeftWidth) || 0)) + "px", top: -(BLEED + (parseFloat(b.borderTopWidth) || 0)) + "px",
        width: st.width + BLEED * 2 + "px", height: st.height + BLEED * 2 + "px" });
      canvas.width = Math.max(1, Math.round((st.width + BLEED * 2) * st.dpr)); canvas.height = Math.max(1, Math.round((st.height + BLEED * 2) * st.dpr));
      wake();
    };
    const local = e => { const r = root.getBoundingClientRect(); return [(e.clientX - r.left) * (r.width ? st.width / r.width : 1), (e.clientY - r.top) * (r.height ? st.height / r.height : 1)]; };
    const shapeFor = () => outline(Math.max(1, st.width - s.thickness), Math.max(1, st.height - s.thickness), s.radius - s.thickness / 2);
    const stroke = (x1, y1, x2, y2, w, style) => { ctx.lineWidth = w; ctx.strokeStyle = style; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const drawTrail = (shape, head, length, sign, intensity, tip = true) => {
      if (length < 0.5 || intensity <= 0) return;
      const steps = clamp(Math.ceil(length / 2), 2, 90);
      pointAt(shape, head, pt); let px = pt.x, py = pt.y;
      for (let i = 1; i <= steps; i++) {
        pointAt(shape, head - sign * length * (i / steps), pt);
        const u = 1 - (i - 0.5) / steps, fade = u * u * intensity;
        const tone = mix(mix(colors.tail, colors.head, u), WHITE, u ** 6 * 0.65);
        ctx.lineCap = tip && i === 1 ? "round" : "butt";
        stroke(px, py, pt.x, pt.y, 2 + 6 * s.glow, rgba(tone, fade * 0.2 * s.glow));
        stroke(px, py, pt.x, pt.y, s.thickness, rgba(tone, fade));
        px = pt.x; py = pt.y;
      }
    };
    const drawHead = (x, y, intensity) => {
      if (intensity <= 0) return;
      const reach = 12 + 40 * s.glow, bloom = ctx.createRadialGradient(x, y, 0, x, y, reach), strength = 0.4 * s.glow * intensity;
      bloom.addColorStop(0, rgba(colors.head, strength)); bloom.addColorStop(0.2, rgba(colors.head, strength * 0.4));
      bloom.addColorStop(0.5, rgba(colors.head, strength * 0.1)); bloom.addColorStop(1, rgba(colors.head, 0));
      ctx.fillStyle = bloom; ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);
    };
    const draw = shape => {
      const glow = st.boost > 0.001 ? Math.min(1.5, s.glow + 0.4 * st.boost) : s.glow;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (st.width < 2 || st.height < 2) return;
      const off = (BLEED + s.thickness / 2) * st.dpr;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, off, off);
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "butt";
      const total = shape.total, spacing = total / s.stars, speed = Math.abs(st.motion), sign = st.motion >= 0 ? 1 : -1;
      const length = Math.min(speed * s.trailLength * s.duration, spacing * 0.92, total * 0.6);
      const intensity = st.reveal * (1 + 0.4 * st.boost + 0.6 * st.flash);
      const ring = st.flash * 0.32 + st.boost * st.reveal * 0.12;
      if (ring > 0.005 && ctx.roundRect) { ctx.lineWidth = s.thickness + 2 * glow; ctx.strokeStyle = rgba(colors.head, ring); ctx.beginPath(); ctx.roundRect(0, 0, Math.max(1, st.width - s.thickness), Math.max(1, st.height - s.thickness), Math.max(0, shape.r)); ctx.stroke(); }
      const still = clamp(1 - speed / Math.max(1, (total / s.duration) * 0.6), 0, 1) * Math.min(1, intensity);
      const rest = (10 + 14 * glow + s.thickness * 2) * still;
      for (let i = 0; i < s.stars; i++) {
        const head = st.phase + i * spacing;
        drawTrail(shape, head, length, sign, Math.min(1, intensity));
        if (still > 0.01) { drawTrail(shape, head, rest, 1, still, false); drawTrail(shape, head, rest, -1, still, false); }
      }
      pulses.forEach(p => {
        const fade = (1 - p.age / 0.65) ** 2, travel = (total / 2) * (1 - (1 - Math.min(1, p.age / 0.5)) ** 2), tail = Math.min(travel, total * 0.16);
        [1, -1].forEach(way => { const front = p.origin + way * travel; drawTrail(shape, front, tail, way, fade); pointAt(shape, front, pt); drawHead(pt.x, pt.y, fade * 0.8); });
      });
      for (let i = 0; i < s.stars; i++) { pointAt(shape, st.phase + i * spacing, pt); drawHead(pt.x, pt.y, Math.min(1.3, intensity)); }
    };
    const frame = now => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now; st.time += dt;
      const shape = shapeFor(), total = shape.total, engaged = st.hovered || st.focused;
      const cruise = reduce ? 0 : (s.direction * total) / s.duration;
      const revealTarget = 1;
      st.reveal += (revealTarget - st.reveal) * (1 - Math.exp(-dt / 0.16));
      const boostTarget = s.hover === "brighten" && engaged ? 1 : 0;
      st.boost += (boostTarget - st.boost) * (1 - Math.exp(-dt / (boostTarget > st.boost ? 0.18 : 0.5)));
      st.flash *= Math.exp(-dt / 0.22);
      st.velocity += (cruise - st.velocity) * (1 - Math.exp(-dt / 0.45));
      let extra = 0;
      if (st.lap >= 0) { const before = ease(Math.min(1, st.lap / LAP)); st.lap += dt; extra = (ease(Math.min(1, st.lap / LAP)) - before) * total * s.direction; if (st.lap >= LAP) st.lap = -1; }
      st.motion = st.velocity + extra / dt;
      st.phase = wrap(st.phase + st.velocity * dt + extra, total);
      for (let i = pulses.length - 1; i >= 0; i--) { pulses[i].age += dt; if (pulses[i].age >= 0.65) pulses.splice(i, 1); }
      draw(shape);
      const settling = Math.abs(revealTarget - st.reveal) > 0.002 || Math.abs(boostTarget - st.boost) > 0.002 || st.flash > 0.01 || pulses.length > 0;
      const moving = Math.abs(st.motion) > 0.05 || cruise !== 0 || st.lap >= 0;
      if (st.visible && (settling || moving || st.hovered)) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (raf || !st.visible) return; last = performance.now(); raf = requestAnimationFrame(frame); };
    root.addEventListener("pointerenter", e => { st.hovered = true; if (s.hover === "lap" && st.lap < 0 && !reduce) st.lap = 0; wake(); });
    root.addEventListener("pointerleave", () => { st.hovered = false; wake(); });
    const pulse = origin => { if (!s.clickPulse || reduce) return; pulses.push({ origin, age: 0 }); if (pulses.length > 4) pulses.shift(); st.flash = 1; wake(); };
    root.addEventListener("pointerdown", e => { if (e.button !== 0 && e.pointerType === "mouse") return; const [x, y] = local(e); pulse(project(shapeFor(), x - s.thickness / 2, y - s.thickness / 2)); });
    root.addEventListener("focus", () => { st.focused = root.matches(":focus-visible"); if (st.focused && s.hover === "lap" && st.lap < 0 && !reduce) st.lap = 0; wake(); });
    root.addEventListener("blur", () => { st.focused = false; wake(); });
    new ResizeObserver(measure).observe(root);
    new IntersectionObserver(es => { st.visible = es.some(x => x.isIntersecting); if (st.visible) wake(); }).observe(root);
    measure();
    return { canvas };
  };

  /* ------------------------------------------------------------------
     CountUp (وضع count) — يعدّ الرقم من الصفر إلى قيمته بتباطؤ easeOut
     ثم يعيد النص الأصلي حرفاً بحرف، فلا يتغيّر أي رقم معروض.
  ------------------------------------------------------------------ */
  const firstNumberNode = el => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (/\d/.test(n.nodeValue)) return n;
    return null;
  };
  const NUM = /([-−]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?/g;
  // نعدّ رقماً واحداً واضحاً فقط؛ التواريخ والأوقات والمديات تبقى كما هي
  RB.countable = el => {
    const node = firstNumberNode(el); if (!node) return null;
    const t = node.nodeValue;
    if (/\d\s*[-–/:]\s*\d/.test(t) || (t.match(NUM) || []).length !== 1) return null;
    return node;
  };
  RB.countUp = (el, o = {}) => {
    // easeOut الأصلي في React Bits هو cubic-bezier(0.33, 1, 0.68, 1) = power3.out في GSAP
    const opt = Object.assign({ duration: 2, delay: 0, from: 0, easing: "power3.out" }, o);
    const node = RB.countable(el); if (!node || !window.gsap) return null;
    const original = node.nodeValue;
    NUM.lastIndex = 0;
    const m = NUM.exec(original); if (!m) return null;
    const sep = m[2].includes(",") ? "," : "", decimals = m[3] ? m[3].length : 0;
    const target = parseFloat(m[2].replace(/,/g, "") + (m[3] ? "." + m[3] : ""));
    if (!isFinite(target) || target === 0) return null;
    const before = original.slice(0, m.index), after = original.slice(m.index + m[0].length), minus = m[1];
    const fmt = v => {
      const [i, f] = Math.abs(v).toFixed(decimals).split(".");
      return before + minus + (sep ? i.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : i) + (f ? "." + f : "") + after;
    };
    // داخل منطقة تُقرأ آلياً (aria-live) نؤجّل الإعلان حتى تنتهي الأرقام
    const live = el.closest("[aria-live]");
    if (live) live.setAttribute("aria-busy", "true");
    const obj = { v: Math.min(Math.abs(opt.from) || 0, target) };
    node.nodeValue = fmt(obj.v);
    const done = () => { node.nodeValue = original; if (live) live.removeAttribute("aria-busy"); };
    return gsap.to(obj, { v: target, duration: opt.duration, delay: opt.delay, ease: opt.easing,
      onUpdate: () => { node.nodeValue = fmt(obj.v); }, onComplete: done, onInterrupt: done });
  };
})();
