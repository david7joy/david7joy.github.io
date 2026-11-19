import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/*
  The studio: a 3D model of David's real desk.
  Everything is geometry and canvas-drawn screens; there are no image assets.

  Clickable things and the panel each one opens:
    ultrawide monitor -> work      left monitor  -> career     wall calendar -> talks
    terminal laptop   -> rig       chat laptop   -> contact
    microphone        -> podcast   paper stack   -> writing

  The day cycles on its own, starting from the real time in Dallas.
  Add ?hour=22 to the URL to hold the room at one time of day.
*/

const canvas = document.getElementById('studio-canvas');
const viewport = document.querySelector('.scene-viewport');
const controls = document.getElementById('camera-controls');
const exploreButton = document.getElementById('explore-toggle');
const exploreLabel = document.getElementById('explore-label');
const resetButton = document.getElementById('camera-reset');
const dialog = document.getElementById('portfolio-dialog');
const body = document.body;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
} catch (_) { /* No WebGL: the page stays usable with the plain backdrop. */ }
if (renderer) buildStudio();

function buildStudio() {
  const clamp = THREE.MathUtils.clamp;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const ease = t => t * t * (3 - 2 * t);

  /* ---------- Time of day in Dallas drives the light ---------- */

  function dallasHour() {
    const forced = parseFloat(new URLSearchParams(location.search).get('hour'));
    if (Number.isFinite(forced)) return forced;
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      const get = type => Number(parts.find(part => part.type === type)?.value) || 0;
      return get('hour') + get('minute') / 60;
    } catch (_) { return 12; }
  }
  const hour = dallasHour();
  const day = smooth(6, 8, hour) * (1 - smooth(17.5, 19.5, hour));

  /* ---------- Renderer and scene ---------- */

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a1018').lerp(new THREE.Color('#d6e8f2'), day);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 700);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* Shadows are redrawn every third frame (see draw): the sun crawls, and nothing on the desk moves fast. */
  renderer.shadowMap.autoUpdate = false;
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const roomEnvironment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(roomEnvironment, 0.04).texture;
  scene.environmentIntensity = 0.22 + day * 0.4;
  roomEnvironment.dispose();
  pmrem.dispose();

  let seed = 49;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const timeUniform = { value: 0 };
  const pickables = [];
  let record = null, soundOn = false, recordSpeed = 0;
  const halos = [], notes = [], stickerSheets = [];
  let sidePatch = null, cat = null, catHead = null, micGlow = null;
  const micMeter = [];
  const targets = new Map();

  /* ---------- Small builders ---------- */

  /* Painted look: hand-drawn anime shading (a few soft bands of light, ink outlines, cool shadows).
     Add ?plain to the address to see the earlier realistic shading. */
  const PAINTED = !new URLSearchParams(location.search).has('plain');
  const toonRamp = new THREE.DataTexture(new Uint8Array([118, 118, 118, 255, 176, 176, 176, 255, 226, 226, 226, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
  toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.needsUpdate = true;
  const standard = (color, roughness = 0.65, metalness = 0) => PAINTED
    ? new THREE.MeshToonMaterial({ color, gradientMap: toonRamp })
    : new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mat = {
    wall: standard(PAINTED ? '#cdc9a2' : '#66735f', .95),
    trim: standard('#ece6d6', .7),
    carpet: standard('#77726a', 1),
    wood: PAINTED ? standard('#a3745a') : new THREE.MeshPhysicalMaterial({ color: '#7c3d24', roughness: .5, clearcoat: .45, clearcoatRoughness: .3 }),
    frame: standard('#dcdcd6', .5, .25),
    black: standard('#15171a', .38, .25),
    plastic: standard('#1d2024', .72),
    charcoal: standard('#3a3e44', .35, .6),
    foam: standard('#131416', 1),
    aluminium: standard('#8a8f96', .3, .85),
    darkMetal: standard('#22252a', .4, .7),
    silver: standard('#c3c8cc', .3, .85),
    gold: standard('#b9995c', .36, .7),
    deskMat: standard('#24272c', .9),
    paper: standard('#ebe8de', .95),
    teal: standard('#2f8f8a', .8),
    white: standard('#f3f1ea', .6),
    yellow: standard('#e8d44a', .7),
    pancake: standard('#c8975a', .9),
    berry: standard('#c8303a', .6),
    egg: standard('#e2b93f', .9),
    juice: standard('#5f7f2c', .45),
    lens: standard('#3a2418', .12, .6)
  };

  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w, h, d, material, parent, x = 0, y = 0, z = 0, r = .02) {
    const geometry = r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
    return mesh(geometry, material, parent, x, y, z);
  }
  function cylinder(rt, rb, h, material, parent, x = 0, y = 0, z = 0, segments = 32) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material, parent, x, y, z);
  }
  function sphere(r, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = mesh(new THREE.SphereGeometry(r, 20, 14), material, parent, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }
  function plane(w, h, material, parent, x = 0, y = 0, z = 0) {
    const m = mesh(new THREE.PlaneGeometry(w, h), material, parent, x, y, z);
    m.castShadow = false;
    return m;
  }
  function group(x, y, z, parent = scene) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
  function wire(points, radius, material, parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), material, parent);
  }
  /* A straight bar between two points. */
  function beam(a, b, radius, material, parent) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const m = cylinder(radius, radius, start.distanceTo(end), material, parent, 0, 0, 0, 12);
    m.position.copy(start).lerp(end, .5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    return m;
  }
  /* Marks a group as clickable. `anchor` is where its label sits; `lift` is how far it rises on hover. */
  function register(g, key, anchor, lift = .06) {
    g.userData.baseY = g.position.y;
    g.traverse(m => { if (m.isMesh) { m.userData.section = key; pickables.push(m); } });
    targets.set(key, {
      group: g, lift, hover: 0,
      anchor: new THREE.Vector3(...anchor),
      element: document.querySelector(`.scene-hotspot[data-open="${key}"]`)
    });
  }

  /* ---------- Canvas-drawn surfaces (screens, calendar, paper) ---------- */

  const FONT = { hand: 'Caveat, "Bradley Hand", cursive', display: '"Bricolage Grotesque", system-ui, sans-serif', sans: '"DM Sans", system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
  const INK = '#f2f4ee', ACCENT = '#b9a3ff', WARM = '#f0a868';

  function surface(width, height) {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    const texture = new THREE.CanvasTexture(element);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    return { element, ctx: element.getContext('2d'), texture, width, height };
  }
  const glowing = s => new THREE.MeshBasicMaterial({ map: s.texture, toneMapped: false });
  function rounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  function fit(ctx, text, maxWidth) {
    let value = String(text);
    if (ctx.measureText(value).width <= maxWidth) return value;
    while (value.length > 4 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
    return `${value.trimEnd()}…`;
  }

  const data = window.PORTFOLIO || {};
  const workItems = (data.items || []).filter(item => item && (item.type === 'project' || item.type === 'integration') && item.title);

  function sheen(ctx, width, height) {
    const glass = ctx.createLinearGradient(0, 0, width * .7, height);
    glass.addColorStop(0, 'rgba(255,255,255,.10)');
    glass.addColorStop(.35, 'rgba(255,255,255,.02)');
    glass.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glass;
    ctx.fillRect(0, 0, width, height);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const lines = [];
    let line = '';
    for (const word of String(text).split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines[maxLines - 1] = fit(ctx, lines.slice(maxLines - 1).join(' '), maxWidth);
      lines.length = maxLines;
    }
    lines.forEach((value, i) => ctx.fillText(value, x, y + i * lineHeight));
  }
  function backdrop(ctx, width, height, tint) {
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, '#0b1015');
    wash.addColorStop(1, tint);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, .035)';
    for (let x = 32; x < width; x += 32) for (let y = 32; y < height; y += 32) ctx.fillRect(x, y, 2, 2);
  }

  /* Right monitor: Work. Counts on the left, four cards on the right that change every few seconds.
     Orange marks company work, green marks my own projects. */
  const companyItems = workItems.filter(item => item.type === 'integration');
  const ownItems = workItems.filter(item => item.type === 'project');
  const mainScreen = surface(1280, 640);
  function drawMainScreen() {
    /* One thing to read from across the room: how much has shipped. The detail lives in the panel. */
    const { ctx, width, height } = mainScreen;
    backdrop(ctx, width, height, '#12241a');
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8fa0a6';
    ctx.font = `500 30px ${FONT.mono}`;
    ctx.fillText('PROJECTS', 80, 108);
    ctx.fillStyle = INK;
    ctx.font = `700 300px ${FONT.display}`;
    const count = String(workItems.length || '');
    ctx.fillText(count, 64, 400);
    const after = 64 + ctx.measureText(count).width + 44;
    ctx.font = `600 76px ${FONT.display}`;
    ctx.fillText('things', after, 300);
    ctx.fillText('shipped', after, 388);
    [[WARM, `${companyItems.length} with my team at Cockroach Labs`], [ACCENT, `${ownItems.length} independent, open source`]].forEach(([color, text], i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(94, 488 + i * 56, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe6e2';
      ctx.font = `500 36px ${FONT.sans}`;
      ctx.fillText(text, 126, 500 + i * 56);
    });
    sheen(ctx, width, height);
    mainScreen.texture.needsUpdate = true;
  }

  /* Left monitor: the career, year by year, as rising steps. The highlight walks through them. */
  const storyScreen = surface(1280, 640);
  const career = (data.career || []).filter(step => Number.isFinite(Number(step.year)) && step.onScreen !== false).sort((a, b) => a.year - b.year);
  function drawStoryScreen() {
    /* One thing to read from across the room: where I am now, and the path that led here in a single line. */
    const { ctx, width, height } = storyScreen;
    backdrop(ctx, width, height, '#181a2a');
    const now = career[career.length - 1] || {};
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8fa0a6';
    ctx.font = `500 30px ${FONT.mono}`;
    ctx.fillText('EXPERIENCE', 80, 108);
    ctx.fillStyle = INK;
    ctx.font = `700 190px ${FONT.display}`;
    ctx.fillText('15+ years', 70, 300);
    ctx.fillStyle = WARM;
    ctx.font = `600 54px ${FONT.display}`;
    ctx.fillText(fit(ctx, (now.roles?.[0]?.title || '').replace(/\s*\(.*\)\s*$/, ''), width - 160), 80, 390);
    ctx.fillStyle = '#c3ccd2';
    ctx.font = `500 38px ${FONT.sans}`;
    ctx.fillText(`${now.org || ''}, ${now.from || now.year || ''} to now`, 80, 448);
    /* The path: every stop as a dot on one line, the current one lit. */
    const left = 96, right = width - 96, y = 540;
    ctx.strokeStyle = 'rgba(242, 244, 238, .22)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    career.forEach((stop, i) => {
      const x = career.length > 1 ? left + (right - left) * i / (career.length - 1) : left, on = i === career.length - 1;
      ctx.fillStyle = on ? WARM : ACCENT;
      ctx.beginPath();
      ctx.arc(x, y, on ? 14 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = i === 0 ? 'left' : on ? 'right' : 'center';
      ctx.fillStyle = on ? INK : '#9aa7b0';
      ctx.font = `600 26px ${FONT.display}`;
      ctx.fillText(stop.short || stop.org || '', i === 0 ? x - 12 : on ? x + 12 : x, y + 46);
    });
    ctx.textAlign = 'left';
    sheen(ctx, width, height);
    storyScreen.texture.needsUpdate = true;
  }

  /* Two framed posters from David's own wall, drawn as portrait prints. */
  const posters = [surface(720, 1080), surface(720, 1080)];
  function fitted(ctx, text, weight, maxWidth, start) {
    let size = start;
    do { ctx.font = `${weight} ${size}px ${FONT.display}`; size -= 4; } while (ctx.measureText(text).width > maxWidth && size > 24);
  }
  /* Sets lines of capitals one above another, each sized to span the poster's width. */
  function stackType(ctx, lines, centre, top, maxWidth, maxHeight, cap) {
    const sizes = lines.map(([text]) => {
      ctx.font = `700 ${cap}px ${FONT.display}`;
      return Math.min(cap, cap * maxWidth / ctx.measureText(text).width);
    });
    const scale = Math.min(1, maxHeight / sizes.reduce((sum, size) => sum + size * .96, 0));
    let y = top;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    lines.forEach(([text, colour], i) => {
      const size = sizes[i] * scale;
      ctx.font = `700 ${size}px ${FONT.display}`;
      ctx.fillStyle = colour;
      ctx.fillText(text, centre, y + size * .8);
      y += size * .96;
    });
    ctx.textAlign = 'left';
    return y;
  }
  /* Painted-poster helpers: rolling ridgelines, heaped clouds, and a speckle of grain like gouache on paper. */
  function ridge(ctx, x, w, base, bottom, amp, colour, seed) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      ctx.lineTo(x + t * w, base - amp * (.55 * Math.sin(t * 5.1 + seed) + .3 * Math.sin(t * 11.3 + seed * 2.3) + .15 * Math.sin(t * 23 + seed * 5)));
    }
    ctx.lineTo(x + w, bottom);
    ctx.closePath();
    ctx.fill();
  }
  function heap(ctx, cx, cy, size, light, shade) {
    const puffs = [[-1.1, .1, .62], [-.45, -.28, .8], [.3, -.42, .92], [1, -.05, .7], [.1, .12, .95], [-.7, .2, .6], [.75, .22, .62]];
    for (const [colour, lift] of [[shade, .16], [light, 0]]) {
      ctx.fillStyle = colour;
      for (const [px, py, r] of puffs) {
        ctx.beginPath();
        ctx.arc(cx + px * size, cy + (py + lift) * size, r * size * .62, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  function grain(ctx, x, y, w, h, seed) {
    let state = seed;
    const next = () => (state = (state * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = next() > .5 ? 'rgba(255, 250, 235, .05)' : 'rgba(20, 10, 30, .06)';
      ctx.fillRect(x + next() * w, y + next() * h, 2 + next() * 5, 1.5 + next() * 2);
    }
  }
  function drawPosters() {
    /* 1. "Be fearless": a traveller on a ridge at sunset, the words filling the sky above. */
    {
      const { ctx, width, height } = posters[0];
      ctx.fillStyle = '#fbf3df';
      ctx.fillRect(0, 0, width, height);
      const x = 34, y = 34, w = width - 68, h = height - 68;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const sky = ctx.createLinearGradient(0, y, 0, y + h);
      sky.addColorStop(0, '#2b1245');
      sky.addColorStop(.45, '#7a2157');
      sky.addColorStop(.72, '#e2562f');
      sky.addColorStop(.9, '#ffb347');
      ctx.fillStyle = sky;
      ctx.fillRect(x, y, w, h);
      const glow = ctx.createRadialGradient(width / 2, y + h - 250, 20, width / 2, y + h - 250, 420);
      glow.addColorStop(0, 'rgba(255, 236, 170, .95)');
      glow.addColorStop(.25, 'rgba(255, 190, 90, .55)');
      glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#fff1b8';
      ctx.beginPath();
      ctx.arc(width / 2, y + h - 250, 96, 0, Math.PI * 2);
      ctx.fill();
      heap(ctx, 140, y + h - 300, 58, '#ffc27a', '#c4446a');
      heap(ctx, 600, y + h - 330, 66, '#ffd08a', '#b53c6e');
      ridge(ctx, x, w, y + h - 190, y + h, 46, '#8c2f5c', 1.2);
      ridge(ctx, x, w, y + h - 130, y + h, 54, '#5b1d4f', 3.4);
      ridge(ctx, x, w, y + h - 62, y + h, 44, '#2a0f33', 5.9);
      /* The traveller and a lone tree on the near ridge. */
      ctx.fillStyle = '#1a0a22';
      ctx.beginPath();
      ctx.arc(486, y + h - 170, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(480, y + h - 160);
      ctx.lineTo(492, y + h - 160);
      ctx.lineTo(498, y + h - 122);
      ctx.lineTo(491, y + h - 96);
      ctx.lineTo(485, y + h - 96);
      ctx.lineTo(486, y + h - 120);
      ctx.lineTo(481, y + h - 96);
      ctx.lineTo(475, y + h - 96);
      ctx.lineTo(476, y + h - 124);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a0a22';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(506, y + h - 158);
      ctx.lineTo(502, y + h - 94);
      ctx.stroke();
      ctx.fillRect(196, y + h - 150, 8, 60);
      for (const [px, py, r] of [[200, -170, 38], [172, -150, 28], [228, -152, 30], [200, -196, 26]]) {
        ctx.beginPath();
        ctx.arc(px, y + h + py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      grain(ctx, x, y, w, h, 7);
      ctx.restore();
      const cream = '#fff6e6', flame = '#ffd166';
      ctx.shadowColor = 'rgba(30, 8, 40, .55)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      stackType(ctx, [['BE', cream], ['FEARLESS', flame], ['IN THE', cream], ['PURSUIT OF', cream], ['WHAT SETS', cream], ['YOUR SOUL', cream], ['ON FIRE.', flame]], width / 2, y + 30, w - 64, h - 470, 210);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      posters[0].texture.needsUpdate = true;
    }
    /* 2. "Do what is right": a night valley, a winding path, and one lit window at the end of it. */
    {
      const { ctx, width, height } = posters[1];
      ctx.fillStyle = '#fbf3df';
      ctx.fillRect(0, 0, width, height);
      const x = 34, y = 34, w = width - 68, h = height - 68;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const wash = ctx.createLinearGradient(0, y, 0, y + h);
      wash.addColorStop(0, '#0b1247');
      wash.addColorStop(.6, '#27308f');
      wash.addColorStop(.85, '#3f6fb5');
      wash.addColorStop(1, '#7fc0c9');
      ctx.fillStyle = wash;
      ctx.fillRect(x, y, w, h);
      let star = 11;
      const next = () => (star = (star * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(255, 250, 220, ${.35 + next() * .6})`;
        const r = .8 + next() * 2;
        ctx.beginPath();
        ctx.arc(x + next() * w, y + next() * h * .7, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(590, y + h - 420, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a339a';
      ctx.beginPath();
      ctx.arc(572, y + h - 432, 40, 0, Math.PI * 2);
      ctx.fill();
      heap(ctx, 170, y + h - 330, 56, '#5d6fd0', '#2c3590');
      ridge(ctx, x, w, y + h - 250, y + h, 70, '#1d2a78', 2.2);
      ridge(ctx, x, w, y + h - 170, y + h, 58, '#152060', 4.6);
      ridge(ctx, x, w, y + h - 84, y + h, 46, '#0b1440', 0.7);
      /* The path, and the light it leads to. */
      ctx.strokeStyle = 'rgba(255, 226, 150, .75)';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(300, y + h + 6);
      ctx.bezierCurveTo(420, y + h - 60, 240, y + h - 120, 400, y + h - 168);
      ctx.bezierCurveTo(470, y + h - 190, 440, y + h - 214, 470, y + h - 228);
      ctx.stroke();
      ctx.fillStyle = '#0a1238';
      ctx.fillRect(456, y + h - 268, 46, 36);
      ctx.beginPath();
      ctx.moveTo(448, y + h - 266);
      ctx.lineTo(479, y + h - 296);
      ctx.lineTo(510, y + h - 266);
      ctx.closePath();
      ctx.fill();
      const lamp = ctx.createRadialGradient(479, y + h - 250, 2, 479, y + h - 250, 60);
      lamp.addColorStop(0, 'rgba(255, 224, 130, .9)');
      lamp.addColorStop(1, 'rgba(255, 224, 130, 0)');
      ctx.fillStyle = lamp;
      ctx.fillRect(400, y + h - 320, 160, 140);
      ctx.fillStyle = '#ffe58a';
      ctx.fillRect(472, y + h - 258, 14, 16);
      grain(ctx, x, y, w, h, 23);
      ctx.restore();
      const white = '#ffffff', gold = '#ffe66d', soft = '#cfd0ff';
      ctx.shadowColor = 'rgba(5, 8, 40, .6)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      stackType(ctx, [['DO', white], ['WHAT IS', white], ['RIGHT,', gold], ['NOT', soft], ['WHAT IS', soft], ['EASY.', soft]], width / 2, y + 30, w - 64, h - 470, 230);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      posters[1].texture.needsUpdate = true;
    }
  }

  /* Sticky notes. */
  function note(parent, x, y, z, tilt, color, lines, flat = false) {
    const sheet = surface(160, 160);
    const m = plane(.64, .64, new THREE.MeshStandardMaterial({ map: sheet.texture, roughness: .9, side: THREE.DoubleSide }), parent, x, y, z);
    if (flat) m.rotation.set(-Math.PI / 2, 0, tilt); else m.rotation.set(-.06, 0, tilt);
    notes.push({ sheet, color, lines });
  }
  function drawNotes() {
    for (const { sheet, color, lines } of notes) {
      const { ctx } = sheet;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = 'rgba(0, 0, 0, .07)';
      ctx.fillRect(0, 0, 160, 26);
      ctx.fillStyle = '#22262b';
      ctx.font = `600 37px ${FONT.hand}`;
      ctx.textAlign = 'center';
      lines.forEach((text, i) => ctx.fillText(text, 80, 98 - (lines.length - 1) * 19 + i * 38));
      ctx.textAlign = 'left';
      sheet.texture.needsUpdate = true;
    }
  }

  /* The terminal types Rig's loop, one line at a time. */
  const terminalScreen = surface(1024, 664);
  const terminalLines = [
    ['#7f8f98', 'rig · give agents the whole loop'],
    [INK, '> run the app'],
    [ACCENT, '  ✓ running'],
    [INK, '> drive it'],
    ['#ff8bd1', '  ● signed in, clicking through'],
    [INK, '> verify it'],
    [ACCENT, '  ✓ it works.']
  ];
  let terminalState = '';
  function drawTerminal(elapsed) {
    const cycle = terminalLines.length + 5;
    const shown = paused ? terminalLines.length : Math.min(terminalLines.length, 1 + Math.floor((elapsed / .9) % cycle));
    const cursor = Math.floor(elapsed * 2) % 2;
    const state = `${shown}:${cursor}`;
    if (state === terminalState) return;
    terminalState = state;
    const { ctx, width, height } = terminalScreen;
    ctx.fillStyle = '#07090b';
    ctx.fillRect(0, 0, width, height);
    ctx.font = `500 38px ${FONT.mono}`;
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < shown; i++) {
      ctx.fillStyle = terminalLines[i][0];
      ctx.fillText(terminalLines[i][1], 56, 100 + i * 70);
    }
    if (cursor) {
      ctx.fillStyle = INK;
      ctx.fillRect(56, 100 + shown * 70 - 34, 20, 40);
    }
    terminalScreen.texture.needsUpdate = true;
  }

  /* The phone: a contact card. Who I am, where to find me, and one button that leads to Contact. */
  const chatScreen = surface(400, 840);
  const portrait = new Image();
  portrait.onload = () => { drawChatScreen(); try { requestDraw(); } catch (_) { /* The scene is still starting; its first frame will pick this up. */ } };
  portrait.src = 'assets/david.jpg';
  function drawChatScreen() {
    const { ctx, width, height } = chatScreen;
    const ORANGE = '#f47b2a';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    rounded(ctx, 0, 0, width, height, 46);
    ctx.clip();
    /* Drawn to be read from across the room: a light screen, a large portrait, a name and one big button. */
    const DARK = '#1b1410';
    const back = ctx.createLinearGradient(0, 0, 0, height);
    back.addColorStop(0, '#fff3e4');
    back.addColorStop(1, '#ffe2c4');
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, width, height);
    /* Status bar and the island. */
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DARK;
    ctx.font = `700 26px ${FONT.sans}`;
    ctx.fillText('9:41', 40, 46);
    ctx.fillStyle = '#000000';
    rounded(ctx, width / 2 - 62, 24, 124, 40, 20);
    ctx.fill();
    ctx.fillStyle = DARK;
    rounded(ctx, width - 86, 34, 44, 22, 7);
    ctx.fill();
    /* Portrait. */
    const cx = width / 2, cy = 236, r = 112;
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    if (portrait.complete && portrait.naturalWidth) {
      const side = Math.min(portrait.naturalWidth, portrait.naturalHeight);
      ctx.drawImage(portrait, (portrait.naturalWidth - side) / 2, (portrait.naturalHeight - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = '#e8d3bd';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
    /* Name and role. */
    ctx.textAlign = 'center';
    ctx.fillStyle = DARK;
    ctx.font = `700 64px ${FONT.display}`;
    ctx.fillText('David Joy', cx, 426);
    ctx.fillStyle = '#6b5a4e';
    ctx.font = `600 27px ${FONT.sans}`;
    ctx.fillText('Director,', cx, 482);
    ctx.fillText('Solutions Architecture', cx, 518);
    /* Where to find me: three round marks. */
    [['in', -104], ['gh', 0], ['yt', 104]].forEach(([mark, dx]) => {
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.arc(cx + dx, 612, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 30px ${FONT.sans}`;
      ctx.fillText(mark, cx + dx, 614);
    });
    /* The one thing to do here. */
    ctx.fillStyle = ORANGE;
    rounded(ctx, 28, 692, width - 56, 96, 48);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 40px ${FONT.sans}`;
    ctx.fillText('Say hello', cx, 742);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(27, 20, 16, .55)';
    rounded(ctx, cx - 62, height - 22, 124, 7, 3.5);
    ctx.fill();
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
    chatScreen.texture.needsUpdate = true;
  }

  const calendarSheet = surface(1024, 620);
  function drawCalendar() {
    const { ctx, width, height } = calendarSheet;
    ctx.fillStyle = '#f4f2ec';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#16191d';
    ctx.textAlign = 'center';
    ctx.font = `700 58px ${FONT.display}`;
    ctx.fillText('TALKS & EVENTS 2026', width / 2, 86);
    ctx.textAlign = 'left';
    const left = 76, top = 128, cellW = (width - 116) / 31, cellH = (height - 168) / 12;
    let s = 7;
    const next = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let month = 0; month < 12; month++) {
      ctx.fillStyle = '#6d7379';
      ctx.font = `600 17px ${FONT.mono}`;
      ctx.fillText('JFMAMJJASOND'[month], 40, top + month * cellH + cellH * .68);
      for (let dayIndex = 0; dayIndex < 31; dayIndex++) {
        const roll = next();
        ctx.fillStyle = roll > .965 ? '#e0483d' : roll > .93 ? '#f0a868' : (dayIndex % 7 > 4 ? '#e4e1d8' : '#ffffff');
        ctx.fillRect(left + dayIndex * cellW + 1, top + month * cellH + 1, cellW - 2, cellH - 2);
      }
    }
    ctx.strokeStyle = '#30363c';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = left + next() * (width - 260), y = top + next() * (height - 190) + 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 30, y - 12, x + 60, y + 12, x + 96 + next() * 60, y - 2);
      ctx.stroke();
    }
    calendarSheet.texture.needsUpdate = true;
  }

  const pageSheet = surface(256, 332);
  function drawPage() {
    const { ctx, width, height } = pageSheet;
    ctx.fillStyle = '#f1eee5';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1e2328';
    ctx.fillRect(28, 34, 132, 12);
    ctx.fillStyle = '#9a9a92';
    for (let i = 0; i < 17; i++) ctx.fillRect(28, 68 + i * 14, i % 5 === 4 ? 120 : 200 - (i * 37) % 40, 4);
    pageSheet.texture.needsUpdate = true;
  }

  const keyboardSheet = surface(512, 208);
  (function drawKeyboard() {
    const { ctx, width, height } = keyboardSheet;
    ctx.fillStyle = '#0e0f11';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#23262a';
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 14; col++) { rounded(ctx, 6 + col * 36, 6 + row * 40, 31, 35, 5); ctx.fill(); }
    }
    ctx.fillStyle = '#0e0f11';
    ctx.fillRect(150, 166, 4, 35);
    ctx.fillStyle = '#23262a';
    ctx.fillRect(152, 166, 178, 35);
  })();

  function drawSurfaces() {
    drawMainScreen();
    drawStoryScreen();
    drawChatScreen();
    drawCalendar();
    drawPage();
    drawNotes();
    drawStickers();
    drawPosters();
    terminalState = '';
  }
  drawSurfaces();
  /* Redraw once the web fonts arrive, so the screens use them. */
  if (document.fonts?.ready) document.fonts.ready.then(() => { drawMicSticker(); requestDraw(); });
  if (document.fonts?.load) {
    Promise.all(['600 37px Caveat', '600 50px "Bricolage Grotesque"', '700 50px "Bricolage Grotesque"', '500 27px "DM Sans"', '500 38px "JetBrains Mono"'].map(font => document.fonts.load(font)))
      .then(() => { drawSurfaces(); requestDraw(); })
      .catch(() => {});
  }

  /* ---------- Light: sun through the window wall, soft fill from the room ---------- */

  const hemisphere = new THREE.HemisphereLight(PAINTED ? '#cfe2ff' : '#e4efe0', PAINTED ? '#9a7550' : '#6b5438', .35 + day * 1.05);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(day > .5 ? '#fff1d6' : '#9fb7dc', .25 + day * 3);
  sun.position.set(7, 13, -15);
  sun.target.position.set(0, 0, 2);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 16, bottom: -14, near: .5, far: 60 });
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .04;
  sun.shadow.radius = 5;
  /* Fill from the viewer's side, so the fronts of things are never in the dark. */
  const frontFill = new THREE.PointLight('#fff4e4', 80 + day * 150, 40, 1.6);
  frontFill.position.set(-3, 8, 12);
  scene.add(frontFill);
  const sideFill = new THREE.PointLight('#cfe8c0', 20 + day * 40, 30, 1.8);
  sideFill.position.set(9, 5, 7);
  scene.add(sideFill);
  /* A cool rim from behind, so dark objects keep a bright edge. */
  const rim = new THREE.DirectionalLight('#dfeaff', .25 + day * 1.1);
  rim.position.set(-9, 9, -9);
  scene.add(rim);
  /* The screens light the desk; they carry the room at night. */
  const monitorGlow = new THREE.PointLight('#b9a3ff', 4 + (1 - day) * 10, 9, 1.8);
  monitorGlow.position.set(1.5, 2.3, .4);
  scene.add(monitorGlow);

  const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;

  /* ---------- The world outside: terraced green hills under an open sky ---------- */

  const dayUniform = { value: day };
  const warmUniform = { value: 0 };
  const sunDirection = new THREE.Vector3(0, .6, -.8);
  const sunUniform = { value: sunDirection };
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uDay: dayUniform, uWarm: warmUniform, uSun: sunUniform, uTime: timeUniform },
    vertexShader: `varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vDir;uniform float uDay;uniform float uWarm;uniform float uTime;uniform vec3 uSun;${noise}
    void main(){vec3 d=normalize(vDir);float h=smoothstep(-.02,.5,d.y);
      vec3 dayCol=mix(vec3(.78,.91,.97),vec3(.16,.47,.9),h);
      vec3 duskCol=mix(vec3(1.,.6,.34),vec3(.34,.36,.62),smoothstep(0.,.42,d.y));
      vec3 nightCol=mix(vec3(.05,.08,.14),vec3(.012,.02,.05),h);
      vec3 col=mix(nightCol,dayCol,uDay);col=mix(col,duskCol,uWarm*.85);
      vec2 cell=floor(d.xy/(abs(d.z)+.4)*240.);
      col+=step(.9972,hash(cell))*(1.-uDay)*smoothstep(.04,.3,d.y)*.85;
      vec2 c=d.xz/(d.y+.3)*1.4+vec2(uTime*.006,0.);
      float cl=noise(c*1.5+3.)*.6+noise(c*3.7)*.3+noise(c*8.)*.1;
      float cloud=smoothstep(.5,.74,cl)*smoothstep(0.,.2,d.y);
      vec3 cloudCol=mix(vec3(.16,.18,.26),vec3(1.),uDay);cloudCol=mix(cloudCol,vec3(1.,.74,.58),uWarm*.75);
      col=mix(col,cloudCol,cloud*${PAINTED ? '.22' : '.85'});
      /* Summer cumulus stacked along the horizon: crisp edges, bright crowns, shaded bellies. */
      vec2 k=vec2(atan(d.x,-d.z)*2.6+uTime*.004,d.y*5.2);
      float base=noise(vec2(k.x*.9,0.)+11.)*.6+noise(vec2(k.x*2.3,3.))*.4;
      float puff=noise(k*vec2(2.2,2.6)+5.)*.55+noise(k*vec2(5.,5.5)+9.)*.3+noise(k*11.)*.15;
      float tower=base*1.25-d.y*3.4+puff*.5-.3;
      float body=smoothstep(.0,.035,tower)*smoothstep(-.02,.03,d.y)*${PAINTED ? '1.' : '0.'};
      float lit=smoothstep(.1,.5,puff+d.y*1.4-noise(k*3.+20.)*.35);
      vec3 crown=mix(vec3(.62,.70,.88),vec3(1.,.99,.95),lit);
      crown=mix(crown*vec3(.2,.22,.34),crown,uDay);crown=mix(crown,crown*vec3(1.08,.8,.66),uWarm*.8);
      col=mix(col,crown,body);
      float s=max(dot(d,normalize(uSun)),0.);
      col+=vec3(1.,.92,.72)*(smoothstep(.9988,.9994,s)*1.3+pow(s,160.)*.55+pow(s,12.)*.2)*smoothstep(-.12,.04,uSun.y);
      col=mix(vec3(dot(col,vec3(.3,.59,.11))),col,.62)*.8;
      gl_FragColor=vec4(col,1.);}`
  });
  const sky = mesh(new THREE.SphereGeometry(230, 32, 16), skyMaterial, scene, 0, 0, -40);
  sky.castShadow = false;
  sky.receiveShadow = false;

  /* Tea-country hills: contour terraces, fine planted rows, tree cover, a dirt path, ridges fading into haze. */
  const terrainGeometry = new THREE.PlaneGeometry(320, 190, 300, 180);
  terrainGeometry.rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(terrainGeometry, new THREE.ShaderMaterial({
    uniforms: { uDay: dayUniform, uWarm: warmUniform },
    vertexShader: `varying float vH;varying float vFar;varying vec2 vP;${noise}
    void main(){vec3 p=position;vec2 q=p.xz*.028+vec2(3.7,1.9);
      float n=(noise(q)+.5*noise(q*2.1+vec2(9.,4.))+.25*noise(q*4.3+vec2(0.,7.)))/1.75;
      float steps=n*18.;float terrace=(floor(steps)+smoothstep(0.,${PAINTED ? '1.' : '.3'},fract(steps)))/18.;
      float far=smoothstep(60.,-95.,p.z);
      float ridge=noise(p.xz*.012+vec2(40.,12.));
      p.y=terrace*16.+far*far*(2.+ridge*13.);
      vH=n;vFar=far;vP=p.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying float vH;varying float vFar;varying vec2 vP;uniform float uDay;uniform float uWarm;${noise}
    void main(){float bands=vH*18.;float band=fract(bands);float idx=floor(bands);
      float tone=pow(clamp(vH*1.3-.12,0.,1.),1.1);
      vec3 col=mix(vec3(.05,.24,.05),vec3(.55,.80,.16),tone);
      float near=1.-smoothstep(.25,.7,vFar);
      float rows=fract(vH*150.);
      col*=mix(1.,mix(.84,1.,smoothstep(0.,.5,rows)),near);
      col*=${PAINTED ? 'mix(.86,1.,smoothstep(0.,.4,band))' : '(band<.22?.76:1.)'};
      col*=.84+.3*noise(vP*.07+31.);
      float trees=smoothstep(.58,.72,noise(vP*.55))*smoothstep(.45,.62,noise(vP*.045+70.));
      col=mix(col,vec3(.03,.15,.06),trees*.85);
      if(mod(idx,6.)==2.&&band>.24&&band<.44)col=mix(col,vec3(.66,.45,.22),.7*near+.2);
      col=mix(col,col*vec3(1.3,.86,.58),uWarm*.6);
      col=mix(col,mix(vec3(.80,.89,.93),vec3(1.,.72,.5),uWarm*.75),smoothstep(.2,1.,vFar)*.84);
      col=mix(vec3(dot(col,vec3(.3,.6,.1))),col,${PAINTED ? '1.08' : '.62'});
      col=mix(col,mix(vec3(.80,.89,.93),vec3(1.,.72,.5),uWarm*.75),${PAINTED ? '.08' : '.2'});
      col=mix(col*vec3(.10,.15,.24),col,uDay);
      col=mix(vec3(dot(col,vec3(.3,.59,.11))),col,.62)*.8;
      gl_FragColor=vec4(col,1.);}`
  }));
  terrain.position.set(0, -7, -102);
  terrain.frustumCulled = false;
  scene.add(terrain);

  /* ---------- Room: walnut floor, a solid wall behind the title, glass from there to the right ---------- */

  mat.floor = standard('#5c4636', .5);
  mat.steel = standard('#17191c', .45, .6);
  mat.maple = standard('#d6b17a', .5);
  box(46, .3, 34, mat.floor, scene, 0, -3.15, 4, 0);
  const planks = surface(512, 512);
  (function drawPlanks() {
    const { ctx } = planks;
    let s2 = 11;
    const next = () => { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; };
    for (let row = 0; row < 8; row++) {
      let x = -next() * 200;
      while (x < 512) {
        const w = 150 + next() * 160, light = 78 + next() * 20;
        ctx.fillStyle = `rgb(${light + 18}, ${light - 6}, ${light - 22})`;
        ctx.fillRect(x, row * 64, w - 1, 63);
        ctx.strokeStyle = 'rgba(20, 12, 6, .2)';
        for (let g = 0; g < 7; g++) {
          const y = row * 64 + 6 + next() * 52;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + w * .3, y + next() * 6 - 3, x + w * .6, y + next() * 6 - 3, x + w, y);
          ctx.stroke();
        }
        x += w;
      }
    }
    ctx.fillStyle = 'rgba(10, 6, 2, .38)';
    for (let row = 0; row <= 8; row++) ctx.fillRect(0, row * 64 - 1, 512, 2);
    planks.texture.wrapS = planks.texture.wrapT = THREE.RepeatWrapping;
    planks.texture.repeat.set(2.5, 8);
    planks.texture.needsUpdate = true;
  })();
  const floorPlanks = plane(46, 34, new THREE.MeshStandardMaterial({ map: planks.texture, roughness: .42, metalness: .05 }), scene, 0, -2.995, 4);
  floorPlanks.rotation.x = -Math.PI / 2;

  /* The day turns: the sun crosses the sky and every light follows it. */
  const fixedHour = new URLSearchParams(location.search).has('hour');
  /* Day or night is the visitor's choice (the button in the bottom bar); until they choose, it follows Dallas. */
  const LIGHT_PHASE = { day: .55, night: .96 };
  let lightMode = hour >= 7 && hour < 18 ? 'day' : 'night';
  try { const saved = localStorage.getItem('idea-studio-light'); if (LIGHT_PHASE[saved]) lightMode = saved; } catch (_) { /* Storage is optional. */ }
  let dayPhase = fixedHour ? (hour / 24) % 1 : LIGHT_PHASE[lightMode], exposure = 1;
  window.addEventListener('studio:light', event => {
    if (!LIGHT_PHASE[event.detail?.mode]) return;
    lightMode = event.detail.mode;
    requestDraw();
  });
  const moonlight = new THREE.Color('#9fb7dc'), lowSun = new THREE.Color('#ffae62'), highSun = new THREE.Color('#fff1d6');
  /* Paper on the wall is toned down so it never outshines the labels: a little by day, a lot by night. */
  let calendarPaper = null;
  const paperDay = new THREE.Color('#d6d1c4'), paperNight = new THREE.Color('#8f8c84');
  function updateDaylight() {
    const theta = dayPhase * Math.PI * 2;
    const height = -Math.cos(theta) + .3;
    const light = smooth(-.08, .3, height);
    const warm = smooth(.6, .05, height) * smooth(-.3, 0, height);
    sunDirection.set(-Math.sin(theta) * .34, Math.max(height, -.4) * .5, -.9).normalize();
    dayUniform.value = light;
    warmUniform.value = warm;
    hemisphere.intensity = .35 + light * 1.05;
    if (height > -.05) {
      sun.position.copy(sunDirection).multiplyScalar(28).add(sun.target.position);
      sun.color.copy(lowSun).lerp(highSun, smooth(.1, .7, height));
      sun.intensity = .2 + light * 3;
    } else {
      sun.position.set(6, 13, -14);
      sun.color.copy(moonlight);
      sun.intensity = .3;
    }
    frontFill.intensity = 80 + light * 150;
    sideFill.intensity = 20 + light * 40;
    rim.intensity = .25 + light * 1.1;
    monitorGlow.intensity = 4 + (1 - light) * 10;
    scene.environmentIntensity = .22 + light * .4;
    exposure = 1 + (1 - light) * .25;
    for (const halo of halos) halo.opacity = .16 + (1 - light) * .3;
    if (sidePatch) sidePatch.opacity = light * .3;
    if (calendarPaper) calendarPaper.color.copy(paperNight).lerp(paperDay, light);
  }

  /* A walnut console with a record player, left of the window. */
  mat.walnut = standard('#6b4630', .5);
  const sideboard = group(-12.3, -3, -4.8);
  sideboard.rotation.y = .14;
  box(5.4, 1.55, 1.7, mat.walnut, sideboard, 0, 1.5, 0, .05);
  for (const x of [-2.4, 2.4]) for (const z of [-.6, .6]) cylinder(.06, .04, .75, mat.steel, sideboard, x, .37, z, 10);
  for (const x of [-.9, .9]) box(.03, 1.35, .02, standard('#3d2619', .6), sideboard, x, 1.5, .86, 0);
  for (const x of [-1.8, 0, 1.8]) sphere(.05, mat.gold, sideboard, x - .75, 1.5, .88);
  const deckY = 2.28;
  box(2.3, .24, 1.7, standard('#e6dfd0', .5), sideboard, -1.2, deckY + .12, 0, .05);
  cylinder(.74, .74, .08, mat.silver, sideboard, -1.4, deckY + .28, 0, 48);
  record = group(-1.4, deckY + .34, 0, sideboard);
  cylinder(.7, .7, .025, standard('#0c0c0d', .28, .3), record, 0, 0, 0, 64);
  for (const r of [.36, .48, .6]) {
    const groove = mesh(new THREE.TorusGeometry(r, .004, 4, 64), standard('#2a2a2c', .2, .6), record, 0, .014, 0);
    groove.rotation.x = Math.PI / 2;
    groove.castShadow = false;
  }
  cylinder(.25, .25, .03, standard('#f0a868', .6), record, 0, .003, 0, 40);
  box(.16, .032, .05, mat.white, record, .13, .004, 0, 0);
  /* Light streaks and a label stripe, so the turning reads from across the room. */
  for (const turn of [.5, 2.1, 3.7]) {
    const streak = box(.4, .006, .035, standard('#56565c', .2, .7), record, Math.cos(turn) * .48, .013, Math.sin(turn) * .48, 0);
    streak.rotation.y = -turn;
    streak.castShadow = false;
  }
  box(.05, .034, .46, standard('#3d2619', .6), record, -.06, .004, 0, 0);
  cylinder(.025, .025, .09, mat.silver, record, 0, .04, 0, 12);
  cylinder(.1, .1, .16, mat.silver, sideboard, -.42, deckY + .32, -.55, 20);
  beam([-.42, deckY + .42, -.55], [-.98, deckY + .4, .42], .022, mat.silver, sideboard);
  box(.14, .06, .22, mat.black, sideboard, -1, deckY + .38, .45, .01);
  for (const x of [-.5, -.32]) cylinder(.06, .06, .05, mat.black, sideboard, x, deckY + .26, .62, 16);
  /* A few records leaning beside it. */
  ['#b9a3ff', '#e8d9b5', '#c8432f', '#2f8f8a', '#1c2228', '#f0a868'].forEach((color, i) => {
    const sleeve = box(.05, 1.3, 1.3, standard(color, .7), sideboard, .9 + i * .1, deckY + .66, 0, .01);
    sleeve.rotation.z = -.16;
  });
  box(.12, 1.35, 1.3, mat.walnut, sideboard, 1.72, deckY + .68, 0, .02);
  register(sideboard, 'music', [-1.3, deckY + 1.25, 0], 0);

  /* Back wall, built around a window centred behind the monitors (x -5.85 to 5.85, y -1.7 to 10). */
  box(11.15, 17, .4, mat.wall, scene, -11.425, 5, -6.2, 0);
  box(11.15, 17, .4, mat.wall, scene, 11.425, 5, -6.2, 0);
  box(11.7, 3.6, .4, mat.wall, scene, 0, 11.8, -6.2, 0);
  box(11.7, 1.4, .4, mat.wall, scene, 0, -2.4, -6.2, 0);
  box(12.1, .14, .9, mat.trim, scene, 0, -1.66, -6.05, .03);
  box(.4, 17, 34, mat.wall, scene, -17, 5, 4, 0);
  /* Right-hand wall, built round a second window (z -5 to 3, y .5 to 8). */
  box(.4, 17, 8, mat.wall, scene, 17, 5, -9, 0);
  box(.4, 17, 18, mat.wall, scene, 17, 5, 12, 0);
  box(.4, 4, 8, mat.wall, scene, 17, -1.5, -1, 0);
  box(.4, 5.5, 8, mat.wall, scene, 17, 10.75, -1, 0);
  for (const z of [-5, -1, 3]) box(.16, 7.6, .11, mat.steel, scene, 17, 4.25, z, 0);
  for (const y of [.5, 5.6, 8]) box(.16, .11, 8.1, mat.steel, scene, 17, y, -1, 0);
  box(.9, .14, 8.4, mat.trim, scene, 16.6, .42, -1, .03);
  /* The light it throws: four panes of afternoon sun across the floor on the right. */
  const paneCanvas = document.createElement('canvas');
  paneCanvas.width = 256;
  paneCanvas.height = 256;
  const paneCtx = paneCanvas.getContext('2d');
  paneCtx.fillStyle = '#fff';
  paneCtx.filter = 'blur(5px)';
  for (const [px, py, ph] of [[14, 14, 76], [134, 14, 76], [14, 104, 138], [134, 104, 138]]) paneCtx.fillRect(px, py, 108, ph);
  sidePatch = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(paneCanvas), color: '#ffe2a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const patch = plane(6.4, 5.2, sidePatch, scene, 12.6, -2.96, 1.6);
  patch.rotation.set(-Math.PI / 2, 0, .3);
  patch.raycast = () => {};
  box(34, .4, .1, mat.trim, scene, 0, -2.8, -5.98, 0);
  /* Slim steel frame: three tall panes and a transom. */
  for (let i = 0; i <= 3; i++) box(.11, 11.7, .16, mat.steel, scene, -5.85 + i * 3.9, 4.15, -6.2, 0);
  for (const y of [-1.62, 6.9, 9.96]) box(11.7, .11, .16, mat.steel, scene, 0, y, -6.2, 0);

  /* Wall calendar, the centrepiece of the right-hand wall, with a poster on each side. */
  const calendar = group(11, 6.1, -5.96);
  box(4.6, 2.86, .05, mat.white, calendar, 0, 0, 0, .01);
  calendarPaper = new THREE.MeshStandardMaterial({ map: calendarSheet.texture, color: '#d6d1c4', roughness: .85 });
  plane(4.46, 2.72, calendarPaper, calendar, 0, 0, .03);
  register(calendar, 'talks', [0, 1.68, .1], 0);

  /* The posters flank the calendar. */
  posters.forEach((poster, i) => {
    const frame = group(i ? 14.65 : 7.35, 5.95, -5.96);
    frame.scale.setScalar(.9);
    box(2.62, 3.88, .1, PAINTED ? standard('#8a5a36') : mat.steel, frame, 0, 0, 0, .03);
    plane(2.42, 3.63, new THREE.MeshStandardMaterial({ map: poster.texture, color: '#b4b4b4', roughness: .7 }), frame, 0, 0, .055);
  });

  /* A guitar amp on the floor to the left, and an electric guitar hung on the wall under the calendar. */
  /* Things that do something when clicked, without opening a panel. */
  function toy(object, name) {
    object.traverse(m => { if (m.isMesh) { m.userData.toy = name; pickables.push(m); } });
  }
  const play = { strum: 0, amp: 0, ampOn: false, mouse: 0, keys: -1, sway: 0, cat: 0 };

  const guitarAmp = group(14.35, -3, -4.3);
  guitarAmp.userData.rigid = true;
  guitarAmp.rotation.y = -.36;
  box(3.3, 2.9, 1.5, standard('#1b1d21'), guitarAmp, 0, 1.45, 0, .1);
  box(3.02, 2.02, .06, standard('#4a4136'), guitarAmp, 0, 1.18, .74, .03);
  for (let i = 0; i < 9; i++) box(.02, 1.9, .02, standard('#352e26'), guitarAmp, -1.28 + i * .32, 1.18, .775, 0);
  box(3.02, .4, .05, mat.gold, guitarAmp, 0, 2.5, .75, .01);
  for (let i = 0; i < 6; i++) {
    const knob = cylinder(.09, .09, .1, mat.black, guitarAmp, -1.1 + i * .4, 2.5, .81, 16);
    knob.rotation.x = Math.PI / 2;
    box(.02, .07, .02, mat.white, guitarAmp, -1.1 + i * .4, 2.54, .865, 0);
  }
  for (const x of [-1.52, 1.52]) for (const y of [.12, 2.78]) box(.22, .22, .2, mat.silver, guitarAmp, x, y, .68, .04);
  const ampLamp = new THREE.MeshStandardMaterial({ color: '#3a0d0d', emissive: '#ff3b2f', emissiveIntensity: 0, roughness: .4 });
  sphere(.07, ampLamp, guitarAmp, 1.3, 2.5, .8);
  toy(guitarAmp, 'amp');

  /* A T-style electric in mustard yellow: slab body, single cutaway, maple neck, six tuners in a row. */
  const guitar = group(12.2, -2.5, -5.9);
  guitar.userData.rigid = true;
  guitar.scale.setScalar(1.12);
  guitar.rotation.z = -.07;
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(0, -1.12);
  bodyShape.bezierCurveTo(.78, -1.14, 1.08, -.72, 1.02, -.26);
  bodyShape.bezierCurveTo(.98, .04, .8, .16, .82, .42);
  bodyShape.bezierCurveTo(.84, .64, .78, .82, .62, .86);
  bodyShape.bezierCurveTo(.44, .9, .36, .74, .18, .74);
  bodyShape.lineTo(-.18, .74);
  bodyShape.bezierCurveTo(-.3, 1.06, -.86, 1.12, -.92, .62);
  bodyShape.bezierCurveTo(-.95, .32, -.8, .14, -.86, -.16);
  bodyShape.bezierCurveTo(-1.06, -.62, -.8, -1.14, 0, -1.12);
  const mustard = PAINTED ? standard('#e3a534') : new THREE.MeshPhysicalMaterial({ color: '#dba02c', roughness: .22, clearcoat: 1, clearcoatRoughness: .08 });
  mesh(new THREE.ExtrudeGeometry(bodyShape, { depth: .16, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 3, curveSegments: 28 }), mustard, guitar, 0, 1.45, 0);
  /* Black pickguard on the treble side, round the neck pickup. */
  const guardShape = new THREE.Shape();
  guardShape.moveTo(-.2, .7);
  guardShape.lineTo(.2, .7);
  guardShape.bezierCurveTo(.4, .72, .5, .86, .68, .74);
  guardShape.bezierCurveTo(.8, .5, .7, .2, .78, -.02);
  guardShape.bezierCurveTo(.6, -.2, .34, -.1, .22, -.22);
  guardShape.lineTo(-.26, -.22);
  guardShape.bezierCurveTo(-.5, 0, -.5, .5, -.2, .7);
  mesh(new THREE.ExtrudeGeometry(guardShape, { depth: .014, bevelEnabled: false, curveSegments: 20 }), standard('#141517'), guitar, 0, 1.45, .188);
  box(.36, .14, .05, mat.silver, guitar, 0, 1.76, .215, .05);
  for (const [x, y] of [[-.34, 2.02], [.6, 2.14], [.72, 1.72], [.7, 1.44], [-.42, 1.62], [-.2, 1.27], [.2, 1.27]]) {
    cylinder(.014, .014, .01, mat.silver, guitar, x, y, .205, 8).rotation.x = Math.PI / 2;
  }
  /* Strap buttons: top horn and the tail. */
  cylinder(.035, .045, .07, mat.silver, guitar, -.86, 2.38, .08, 12).rotation.z = Math.PI / 3;
  cylinder(.035, .045, .07, mat.silver, guitar, 0, .28, .08, 12);
  /* Bridge plate with its slanted pickup and three brass saddles. */
  box(.5, .62, .03, mat.silver, guitar, 0, .86, .2, .02);
  box(.36, .1, .03, mat.black, guitar, 0, 1.0, .225, .02).rotation.z = .22;
  for (const x of [-.13, 0, .13]) {
    const saddle = cylinder(.03, .03, .11, mat.gold, guitar, x, .74, .235, 10);
    saddle.rotation.z = Math.PI / 2;
    box(.012, .2, .012, mat.silver, guitar, x - .03, .62, .235, 0);
    box(.012, .2, .012, mat.silver, guitar, x + .03, .62, .235, 0);
  }
  for (const x of [-.25, .25]) box(.016, .34, .06, mat.silver, guitar, x, .66, .225, 0);
  box(.5, .016, .06, mat.silver, guitar, 0, .5, .225, 0);
  /* Control plate: two knobs and the selector. */
  const plate = box(.17, .78, .02, mat.silver, guitar, .56, .82, .2, .06);
  plate.rotation.z = .1;
  for (const y of [.62, .86]) {
    const knob = cylinder(.062, .062, .07, mat.silver, guitar, .56 - (y - .82) * .1, y, .245, 16);
    knob.rotation.x = Math.PI / 2;
  }
  box(.03, .1, .06, mat.black, guitar, .53, 1.12, .23, .01);
  /* Maple neck and fingerboard, dot markers, frets. */
  const neckMaple = standard('#dfb873', .38);
  box(.27, 2.8, .1, neckMaple, guitar, 0, 3.25, .1, .03);
  box(.25, 2.74, .02, standard('#e6c486', .34), guitar, 0, 3.26, .16, 0);
  /* Frets at real spacing: each one a twelfth-root-of-two closer than the last, nut to saddles. */
  const NUT = 4.63, SADDLE = .74;
  const fretY = n => NUT - (NUT - SADDLE) * (1 - Math.pow(2, -n / 12));
  for (let n = 1; n <= 21; n++) box(.25, .012, .025, mat.silver, guitar, 0, fretY(n), .165, 0);
  for (const n of [3, 5, 7, 9, 15, 17, 19, 21]) {
    cylinder(.02, .02, .01, mat.black, guitar, 0, (fretY(n) + fretY(n - 1)) / 2, .172, 10).rotation.x = Math.PI / 2;
  }
  for (const x of [-.06, .06]) cylinder(.02, .02, .01, mat.black, guitar, x, (fretY(12) + fretY(11)) / 2, .172, 10).rotation.x = Math.PI / 2;
  const headShape = new THREE.Shape();
  headShape.moveTo(-.135, 0);
  headShape.bezierCurveTo(-.2, .1, -.32, .22, -.28, .7);
  headShape.bezierCurveTo(-.26, .92, .04, .94, .1, .78);
  headShape.bezierCurveTo(.15, .5, .135, .2, .135, 0);
  mesh(new THREE.ExtrudeGeometry(headShape, { depth: .07, bevelEnabled: false, curveSegments: 16 }), neckMaple, guitar, 0, 4.62, .06);
  for (let i = 0; i < 6; i++) {
    cylinder(.03, .03, .06, mat.silver, guitar, -.16, 4.74 + i * .115, .15, 10).rotation.x = Math.PI / 2;
    cylinder(.035, .035, .1, mat.silver, guitar, -.33, 4.74 + i * .115, .09, 8).rotation.z = Math.PI / 2;
  }
  box(.27, .03, .03, standard('#f1ead6'), guitar, 0, 4.63, .165, 0);
  const stringBlack = new THREE.MeshBasicMaterial({ color: '#0b0b0c' });
  const run = (x1, y1, x2, y2, width) => {
    const dx = x2 - x1, dy = y2 - y1;
    const wire = box(width, Math.hypot(dx, dy), .006, stringBlack, guitar, (x1 + x2) / 2, (y1 + y2) / 2, .182, 0);
    wire.rotation.z = -Math.atan2(dx, dy);
    wire.castShadow = false;
  };
  for (let i = 0; i < 6; i++) {
    const width = .013 - i * .0013, atNut = -.09 + i * .036;
    run(-.13 + i * .052, SADDLE, atNut, NUT, width);
    run(atNut, NUT, -.16, 4.74 + i * .115, width);
  }
  /* String tree for the two thinnest strings. */
  cylinder(.022, .022, .03, mat.silver, guitar, -.02, 5.12, .145, 10).rotation.x = Math.PI / 2;
  /* Wall hanger. */
  box(.5, .12, .3, mat.steel, guitar, 0, 4.5, .02, .02);
  toy(guitar, 'guitar');

  /* ---------- Desk: cherry top on a white standing frame ---------- */

  /* Painted plaster: broad, soft blotches so the walls never read as one flat colour. */
  if (PAINTED) {
    mat.wall.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPlaster;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlaster=(modelMatrix*vec4(position,1.)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vPlaster;\n${noise}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 pl=vPlaster.xy+vPlaster.zz*.7;
        diffuseColor.rgb*=.93+.1*noise(pl*.32)+.05*noise(pl*1.3+8.);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.04,.99,.9),noise(pl*.12+3.));`);
    };
  }
  mat.wood.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrain;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrain=position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vGrain;\n${noise}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float grain=sin(vGrain.z*46.+noise(vGrain.xz*vec2(.7,2.))*9.+sin(vGrain.x*1.1)*1.4);
      float pores=noise(vGrain.xz*vec2(7.,160.));
      diffuseColor.rgb*=.9+.045*grain+.09*pores;`);
  };
  box(17.6, .34, 6.6, mat.wood, scene, 0, -.17, 0, .07);
  for (const x of [-7, 7]) {
    box(.55, 2.6, .95, mat.frame, scene, x, -1.62, 0, .04);
    box(.6, .22, 5.2, mat.frame, scene, x, -2.89, 0, .05);
  }
  box(14, .5, .28, mat.frame, scene, 0, -.57, 0, .03);
  box(7.6, .03, 2.1, mat.deskMat, scene, .6, .015, 2.1, .012);

  /* Soft contact shadows keep small things grounded. */
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(4,6,8,.6)');
  gradient.addColorStop(.5, 'rgba(4,6,8,.24)');
  gradient.addColorStop(1, 'rgba(4,6,8,0)');
  shadowCtx.fillStyle = gradient;
  shadowCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  function contact(x, z, w, d, opacity = .7, y = .036) {
    const m = plane(w, d, new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity, depthWrite: false }), scene, x, y, z);
    m.rotation.x = -Math.PI / 2;
  }

  /* ---------- Two matching monitors, angled slightly inward ---------- */

  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 128;
  haloCanvas.height = 128;
  const haloCtx = haloCanvas.getContext('2d');
  const haloGradient = haloCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
  haloGradient.addColorStop(0, 'rgba(255,255,255,1)');
  haloGradient.addColorStop(1, 'rgba(255,255,255,0)');
  haloCtx.fillStyle = haloGradient;
  haloCtx.fillRect(0, 0, 128, 128);
  const haloTexture = new THREE.CanvasTexture(haloCanvas);
  /* A diagonal band of light across the glass. */
  const sheenCanvas = document.createElement('canvas');
  sheenCanvas.width = 256;
  sheenCanvas.height = 128;
  const sheenCtx = sheenCanvas.getContext('2d');
  const sheenGradient = sheenCtx.createLinearGradient(0, 0, 256, 128);
  sheenGradient.addColorStop(0, 'rgba(255,255,255,.9)');
  sheenGradient.addColorStop(.28, 'rgba(255,255,255,.12)');
  sheenGradient.addColorStop(.5, 'rgba(255,255,255,0)');
  sheenGradient.addColorStop(1, 'rgba(255,255,255,.2)');
  sheenCtx.fillStyle = sheenGradient;
  sheenCtx.fillRect(0, 0, 256, 128);
  const sheenTexture = new THREE.CanvasTexture(sheenCanvas);
  function monitor(x, y, z, width, height, screen, turn, tint) {
    const g = group(x, y, z);
    g.rotation.y = turn;
    /* A soft halo behind the panel, the way a bright screen bleeds onto the wall. */
    const halo = new THREE.MeshBasicMaterial({ map: haloTexture, color: tint, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending });
    halos.push(halo);
    plane(width * 1.7, height * 2, halo, g, 0, 0, -.2);
    /* Thin-bezel panel: a slim black frame, a deeper housing behind, glass with a faint sheen. */
    box(width + .07, height + .07, .07, mat.black, g, 0, 0, 0, .03);
    box(width * .62, height * .6, .14, mat.darkMetal, g, 0, -.05, -.09, .06);
    plane(width, height, glowing(screen), g, 0, 0, .037);
    const sheen = plane(width, height, new THREE.MeshBasicMaterial({ map: sheenTexture, transparent: true, opacity: .1, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), g, 0, 0, .04);
    sheen.raycast = () => {};
    sphere(.016, new THREE.MeshBasicMaterial({ color: '#dfe6ff', toneMapped: false }), g, width / 2 - .14, -height / 2 - .012, .04);
    /* Aluminium stand: a hinge block, a slim neck that leans back, and a low rounded foot. */
    box(.62, .34, .16, mat.aluminium, g, 0, -.5, -.2, .05);
    beam([0, -.5, -.24], [0, -y + .06, -.5], .085, mat.aluminium, g).scale.x = 1.9;
    const foot = cylinder(1, 1, .05, mat.aluminium, g, 0, -y + .028, -.2, 48);
    foot.scale.set(1.25, 1, .62);
    return g;
  }
  const storyMonitor = monitor(-3.25, 2.8, -1.9, 6.2, 3.1, storyScreen, .1, '#7fd0b0');
  register(storyMonitor, 'career', [0, 1.78, .1], 0);
  const mainMonitor = monitor(3.25, 2.8, -1.9, 6.2, 3.1, mainScreen, -.1, '#b9a3ff');
  box(.6, .2, .22, mat.black, mainMonitor, 0, 1.72, .02, .05);
  sphere(.055, mat.lens, mainMonitor, 0, 1.72, .13);
  note(storyMonitor, -2.72, -1.8, .1, .07, '#f5e26b', ['what if?']);
  note(storyMonitor, -2.02, -1.84, .1, -.06, '#ff9ec4', ['stay', 'curious']);
  note(mainMonitor, 2.74, -1.82, .1, .05, '#b9ec8a', ['run, drive,', 'verify']);
  register(mainMonitor, 'work', [1.5, 1.78, .1], 0);
  note(scene, 9.9, 4.27, -5.92, .06, '#f5e26b', ['Dec 15', 'webinar']);
  note(scene, 10.75, 4.25, -5.92, -.08, '#9fd4f5', ['Big Ideas', 'podcast']);
  note(scene, 11.6, 4.28, -5.92, .04, '#ff9ec4', ['ship it']);

  /* ---------- Keyboard and mouse in the middle ---------- */

  const keyboardMaterial = new THREE.MeshStandardMaterial({ map: keyboardSheet.texture, roughness: .7 });
  const keyboard = group(0, .03, 1.95);
  keyboard.rotation.x = .06;
  /* A 65% mechanical board: aluminium case, dark plate, and a real cap for every key. */
  box(4.24, .17, 1.62, mat.aluminium, keyboard, 0, .085, 0, .07);
  box(4.02, .03, 1.4, mat.black, keyboard, 0, .165, 0, .01);
  const U = .262, CAP = .1;
  const capMaterial = {
    light: standard('#e9e5d9', .62),
    dark: standard('#3a3e46', .6),
    accent: standard('#9aa0aa', .5)
  };
  const capGeometry = new Map();
  const keycaps = [];
  const ROWS = [
    [[1, 'accent'], ...Array(12).fill([1, 'light']), [2, 'dark']],
    [[1.5, 'dark'], ...Array(12).fill([1, 'light']), [1.5, 'dark']],
    [[1.75, 'dark'], ...Array(11).fill([1, 'light']), [2.25, 'accent']],
    [[2.25, 'dark'], ...Array(10).fill([1, 'light']), [2.75, 'dark']],
    [[1.25, 'dark'], [1.25, 'dark'], [1.25, 'dark'], [6.25, 'light'], [1.25, 'dark'], [1.25, 'dark'], [1.25, 'dark'], [1.25, 'dark']]
  ];
  ROWS.forEach((row, r) => {
    let cursor = -7.5;
    for (const [span, tone] of row) {
      if (!capGeometry.has(span)) capGeometry.set(span, new RoundedBoxGeometry(span * U - .034, CAP, U - .034, 3, .028));
      const cap = mesh(capGeometry.get(span), capMaterial[tone], keyboard, (cursor + span / 2) * U, .18 + CAP / 2, (r - 2) * U);
      cap.userData.restY = cap.position.y;
      keycaps.push(cap);
      cursor += span;
    }
  });
  const keyGlow = plane(4, 1.38, new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), keyboard, 0, .183, 0);
  keyGlow.rotation.x = -Math.PI / 2;
  keyGlow.raycast = () => {};
  toy(keyboard, 'keys');
  /* The mouse: a sculpted shell (high at the palm, sloping and narrowing to the buttons) on a dark base,
     with a button seam, a cross seam and a rubber scroll wheel. */
  const deskMouse = group(3.1, .03, 2);
  deskMouse.userData.rigid = true;
  deskMouse.rotation.y = -.12;
  {
    const SX = .33, SY = .215, SZ = .56;
    /* Shapes a point on the unit dome into the mouse body. The front is -z. */
    const sculpt = (x, y, z) => {
      const front = Math.max(0, -z), back = Math.max(0, z);
      return [
        x * (1 - .17 * front * front - .06 * back * back) * SX,
        y * (1 - .42 * Math.pow(front, 1.4) - .1 * back * back) * SY,
        z * SZ
      ];
    };
    const dome = new THREE.SphereGeometry(1, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2);
    const at = dome.attributes.position;
    for (let n = 0; n < at.count; n++) {
      const [x, y, z] = sculpt(at.getX(n), at.getY(n), at.getZ(n));
      at.setXYZ(n, x, y, z);
    }
    dome.computeVertexNormals();
    mesh(dome, standard('#f4f2ec', .3), deskMouse, 0, .03, 0);
    const base = cylinder(1, 1, .03, mat.charcoal, deskMouse, 0, .015, 0, 48);
    base.scale.set(SX * .985, 1, SZ * .985);
    /* Seams drawn as fine tubes lying on the shell. */
    const seamDark = new THREE.MeshBasicMaterial({ color: '#8f8c84' });
    const seam = points => {
      const line = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y + .031, z))), 32, .0045, 6), seamDark, deskMouse, 0, 0, 0);
      line.castShadow = false;
    };
    const along = [], across = [];
    for (let k = 0; k <= 14; k++) {
      const t = .14 + (k / 14) * 1.28;
      along.push(sculpt(0, Math.cos(t), -Math.sin(t)));
    }
    /* The cross seam, where the two buttons end: an arc over the shell just ahead of the palm. */
    for (let k = 0; k <= 16; k++) {
      const a = -1.32 + (k / 16) * 2.64, z = -.14;
      const r = Math.sqrt(1 - z * z);
      across.push(sculpt(Math.sin(a) * r, Math.cos(a) * r, z));
    }
    seam(along);
    seam(across);
    const [, wheelY, wheelZ] = sculpt(0, Math.cos(.62), -Math.sin(.62));
    const wheel = cylinder(.04, .04, .034, standard('#2a2c30', .8), deskMouse, 0, wheelY + .012, wheelZ, 24);
    wheel.rotation.z = Math.PI / 2;
  }
  toy(deskMouse, 'mouse');
  contact(0, 1.95, 5.2, 2.2, .5);

  /* ---------- The laptop, off to the right ---------- */

  const laptop = group(6.3, 0, 1.5);
  laptop.rotation.y = -.42;
  box(3.05, .11, 2.08, mat.aluminium, laptop, 0, .055, 0, .05);
  const keys = plane(2.62, 1.06, keyboardMaterial, laptop, 0, .112, -.32);
  keys.rotation.x = -Math.PI / 2;
  const pad = plane(1.15, .66, standard('#565a61', .3, .7), laptop, 0, .112, .62);
  pad.rotation.x = -Math.PI / 2;
  const lid = group(0, .11, -1.02, laptop);
  lid.rotation.x = -.2;
  box(3.05, 2.04, .07, mat.aluminium, lid, 0, 1.02, 0, .05);
  box(2.97, 1.96, .02, mat.black, lid, 0, 1.02, .037, .03);
  plane(2.82, 1.83, glowing(terminalScreen), lid, 0, 1.03, .05);
  contact(6.3, 1.5, 3.9, 2.9, .6, .006);
  register(laptop, 'rig', [1.1, 2.3, -1.3]);

  /* ---------- Phone on a stand: say hello ---------- */

  const phone = group(-2.95, 0, 1.9);
  phone.userData.rigid = true;
  phone.rotation.y = .2;
  phone.scale.setScalar(1.22);
  const handset = group(0, .1, 0, phone);
  handset.rotation.x = -.36;
  /* An orange phone: coloured frame and back, black glass, camera plateau across the top of the back. */
  const phoneOrange = standard('#f0762a', .38, .35);
  box(.86, 1.74, .085, phoneOrange, handset, 0, .87, 0, .085);
  box(.83, 1.71, .01, mat.black, handset, 0, .87, .042, .005);
  plane(.79, 1.66, glowing(chatScreen), handset, 0, .87, .049);
  box(.012, .22, .03, phoneOrange, handset, .434, 1.16, 0, 0);
  box(.012, .12, .03, phoneOrange, handset, -.434, 1.3, 0, 0);
  box(.012, .12, .03, phoneOrange, handset, -.434, 1.12, 0, 0);
  box(.78, .4, .03, standard('#d9661f', .34, .4), handset, 0, 1.47, -.055, .03);
  for (const [x, y] of [[-.24, 1.54], [-.24, 1.38], [-.06, 1.46]]) {
    cylinder(.075, .075, .03, mat.black, handset, x, y, -.075, 20).rotation.x = Math.PI / 2;
    cylinder(.045, .045, .032, standard('#20242c', .15, .6), handset, x, y, -.078, 16).rotation.x = Math.PI / 2;
  }
  box(.7, .1, .9, mat.darkMetal, phone, 0, .05, -.2, .03);
  box(.5, .9, .08, mat.darkMetal, phone, 0, .45, -.42, .02).rotation.x = -.36;
  contact(-2.95, 1.9, 1.5, 1.5, .5, .006);
  register(phone, 'contact', [-.95, 1.35, 0]);

  /* ---------- Microphone, on its boom arm, with room around it ---------- */

  const MIC_STICKER_TURN = 3.33;
  const mic = group(-7.6, 0, 2.3);
  mic.rotation.y = .95;
  mic.scale.setScalar(1.32);
  /* A broadcast mic hung from the boom, lying level and pointed at the chair: local +z is the front. */
  const lay = m => { m.rotation.x = Math.PI / 2; return m; };
  const HEAD = 2.55;
  /* Cream enamel barrel with brass fittings, a purple band, and a chrome grille head: built to be seen. */
  const enamel = standard('#f3ecd9'), brass = standard('#d9a441'), grille = standard('#a3acb5');
  lay(cylinder(.3, .3, 1.25, enamel, mic, 0, HEAD, -.15, 40));
  lay(cylinder(.318, .318, .1, brass, mic, 0, HEAD, .44, 40));
  lay(cylinder(.312, .312, .09, standard(ACCENT), mic, 0, HEAD, -.5, 40));
  lay(cylinder(.318, .29, .12, brass, mic, 0, HEAD, -.8, 40));
  lay(mesh(new THREE.CapsuleGeometry(.4, .46, 8, 28), grille, mic, 0, HEAD, .92));
  for (const z of [.62, .72, .82, .92, 1.02, 1.12, 1.22]) {
    const band = mesh(new THREE.TorusGeometry(.402, .01, 6, 40), mat.charcoal, mic, 0, HEAD, z);
    band.castShadow = false;
  }
  for (let i = 0; i < 6; i++) {
    const rib = lay(cylinder(.012, .012, .62, mat.charcoal, mic, Math.cos(i * Math.PI / 3) * .405, HEAD + Math.sin(i * Math.PI / 3) * .405, .9, 6));
    rib.castShadow = false;
  }
  /* On-air ring at the back, with a glow that breathes. */
  const onAir = new THREE.MeshBasicMaterial({ color: '#ff4a3a', toneMapped: false });
  mesh(new THREE.TorusGeometry(.31, .045, 10, 40), onAir, mic, 0, HEAD, -.7);
  micGlow = plane(2.6, 2.6, new THREE.MeshBasicMaterial({ map: haloTexture, color: '#ff5a44', transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), mic, 0, HEAD, -.7);
  micGlow.raycast = () => {};
  /* The show's sticker, wrapped round the barrel. */
  const micSticker = surface(640, 400);
  micSticker.texture.center.set(.5, .5);
  micSticker.texture.rotation = Math.PI / 2;
  function drawMicSticker() {
    const { ctx, width, height } = micSticker;
    const fill = ctx.createLinearGradient(0, 0, width, height);
    fill.addColorStop(0, '#2a1d5c');
    fill.addColorStop(1, '#6b3fd6');
    ctx.fillStyle = '#f6f4e6';
    rounded(ctx, 0, 0, width, height, 46);
    ctx.fill();
    ctx.fillStyle = fill;
    rounded(ctx, 16, 16, width - 32, height - 32, 34);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f6f4e6';
    ctx.font = `700 150px ${FONT.display}`;
    ctx.fillText('BIG IDEAS', width / 2, 150, width - 80);
    ctx.fillStyle = '#ffd98a';
    ctx.font = `600 54px ${FONT.display}`;
    ctx.fillText('in App Architecture', width / 2, 268, width - 90);
    ctx.fillStyle = 'rgba(246, 244, 230, .8)';
    ctx.font = `500 30px ${FONT.mono}`;
    ctx.fillText('THE PODCAST', width / 2, 336);
    micSticker.texture.needsUpdate = true;
  }
  drawMicSticker();
  const stickerArc = mesh(new THREE.CylinderGeometry(.304, .304, .7, 40, 1, true, 0, 1.75),
    new THREE.MeshStandardMaterial({ map: micSticker.texture, roughness: .6, side: THREE.DoubleSide }), mic, 0, HEAD, .03);
  stickerArc.rotation.set(Math.PI / 2, MIC_STICKER_TURN, 0);
  stickerArc.castShadow = false;
  /* Yoke and swivel. */
  for (const x of [-.39, .39]) {
    box(.06, .86, .14, brass, mic, x, HEAD + .4, -.5, .02);
    const knob = cylinder(.08, .08, .08, mat.silver, mic, x * 1.1, HEAD, -.5, 20);
    knob.rotation.z = Math.PI / 2;
  }
  box(.88, .08, .16, brass, mic, 0, HEAD + .82, -.5, .02);
  cylinder(.06, .06, .4, mat.charcoal, mic, 0, HEAD + 1.02, -.5, 14);
  /* Pop filter on a gooseneck, and the cable back up the arm. */
  const popZ = 1.72;
  mesh(new THREE.TorusGeometry(.52, .034, 10, 44), brass, mic, 0, HEAD, popZ);
  const mesh2 = mesh(new THREE.CircleGeometry(.52, 40), new THREE.MeshStandardMaterial({ color: '#2a2530', transparent: true, opacity: .2, roughness: 1, side: THREE.DoubleSide }), mic, 0, HEAD, popZ);
  mesh2.castShadow = false;
  wire([[.3, HEAD + .84, -.5], [.62, HEAD + 1.0, .5], [.5, HEAD + .86, 1.3], [.12, HEAD + .52, popZ]], .028, mat.black, mic);
  wire([[0, HEAD, -.86], [0, HEAD - .2, -1.25], [-.1, HEAD + .6, -1.1], [0, HEAD + 1.2, -.5]], .032, standard(ACCENT), mic);
  register(mic, 'podcast', [0, HEAD + 1.75, 0]);
  const micShadow = plane(2.2, 1.6, new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: .3, depthWrite: false }), scene, mic.position.x, .006, mic.position.z);
  micShadow.rotation.x = -Math.PI / 2;
  const micHome = mic.position.clone();

  /* The arm: clamped to the back-left corner. It is re-posed every frame so the mic can be dragged about. */
  const UP = new THREE.Vector3(0, 1, 0);
  const shoulder = new THREE.Vector3(-8.5, 2.6, -2.9), elbow = new THREE.Vector3(), wrist = new THREE.Vector3();
  const armA = new THREE.Vector3(), armB = new THREE.Vector3(), armDir = new THREE.Vector3(), armUp = new THREE.Vector3();
  const UPPER = 4, LOWER = 4.4;
  box(.6, .5, .5, mat.black, scene, shoulder.x, -.05, shoulder.z, .05);
  beam([shoulder.x, 0, shoulder.z], [shoulder.x, shoulder.y, shoulder.z], .09, mat.black, scene);
  const rails = [-.08, .08].map(offset => ({
    offset,
    upper: cylinder(.05, .05, 1, mat.charcoal, scene, 0, 0, 0, 12),
    lower: cylinder(.05, .05, 1, mat.charcoal, scene, 0, 0, 0, 12)
  }));
  sphere(.17, mat.black, scene, shoulder.x, shoulder.y, shoulder.z);
  const elbowJoint = sphere(.17, mat.black, scene, 0, 0, 0), wristJoint = sphere(.15, mat.black, scene, 0, 0, 0);
  function setBeam(m, from, to) {
    m.position.copy(from).lerp(to, .5);
    m.scale.y = from.distanceTo(to);
    m.quaternion.setFromUnitVectors(UP, armDir.copy(to).sub(from).normalize());
  }
  function poseArm() {
    mic.updateMatrixWorld(true);
    wrist.set(0, HEAD + 1.22, -.5);
    mic.localToWorld(wrist);
    armDir.copy(wrist).sub(shoulder);
    const reach = Math.min(armDir.length(), UPPER + LOWER - .05);
    armDir.normalize();
    const along = (UPPER * UPPER - LOWER * LOWER + reach * reach) / (2 * reach);
    const rise = Math.sqrt(Math.max(UPPER * UPPER - along * along, 0));
    armUp.copy(UP).addScaledVector(armDir, -armDir.y).normalize();
    elbow.copy(shoulder).addScaledVector(armDir, along).addScaledVector(armUp, rise);
    elbowJoint.position.copy(elbow);
    wristJoint.position.copy(wrist);
    for (const rail of rails) {
      setBeam(rail.upper, armA.copy(shoulder).setY(shoulder.y + rail.offset), armB.copy(elbow).setY(elbow.y + rail.offset));
      setBeam(rail.lower, armA.copy(elbow).setY(elbow.y + rail.offset), armB.copy(wrist).setY(wrist.y + rail.offset));
    }
  }
  poseArm();

  /* ---------- Sticker board on the wall under the title: where I have worked, and what I work with ---------- */

  const board = group(-12.7, 5.1, -5.96);
  box(5.5, 4.6, .1, standard('#4a3526', .6), board, 0, 0, 0, .03);
  box(5.2, 4.3, .06, standard('#c79f6f', .95), board, 0, 0, .04, .01);
  /* Each sticker is a white die-cut label carrying the brand's own mark, loaded from assets/logos.
     `tint` colours a single-colour mark with the brand colour; full-colour logos are drawn as they are. */
  function sticker(x, y, w, h, tilt, logo, label, tint) {
    const sheet = surface(Math.round(256 * w / h), 256);
    const m = plane(w, h, new THREE.MeshStandardMaterial({ map: sheet.texture, roughness: 1, metalness: 0, envMapIntensity: 0, alphaTest: .5 }), board, x, y, .08 + stickerSheets.length * .0015);
    m.rotation.z = tilt;
    const entry = { sheet, label, image: null };
    stickerSheets.push(entry);
    fetch(`assets/logos/${logo}.svg`).then(response => response.ok ? response.text() : Promise.reject()).then(source => {
      /* Give the drawing an explicit size (canvas needs one) and, for one-colour marks, the brand colour. */
      const sized = source.replace(/<svg\b/, tint ? `<svg width="256" height="256" fill="${tint}"` : (/<svg[^>]*\swidth=/.test(source) ? '<svg' : '<svg width="512" height="512"'));
      const image = new Image();
      image.onload = () => { entry.image = image; drawStickers(); requestDraw(); };
      image.src = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
    }).catch(() => {});
  }
  function drawStickers() {
    for (const { sheet, label, image } of stickerSheets) {
      const { ctx, width, height } = sheet;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fbfaf6';
      rounded(ctx, 0, 0, width, height, height * .26);
      ctx.fill();
      const pad = height * .2;
      let textLeft = pad;
      if (image) {
        const ratio = image.width / image.height;
        if (!label) {
          const drawW = Math.min(width - pad * 2, (height - pad * 2) * ratio), drawH = drawW / ratio;
          ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
        } else {
          const drawH = height - pad * 2, drawW = drawH * ratio;
          ctx.drawImage(image, pad, pad, drawW, drawH);
          textLeft = pad + drawW + pad * .7;
        }
      }
      if (label) {
        ctx.fillStyle = '#16191d';
        ctx.textBaseline = 'middle';
        let size = 96;
        do { ctx.font = `700 ${size}px ${FONT.display}`; size -= 4; } while (ctx.measureText(label).width > width - textLeft - pad && size > 28);
        ctx.fillText(label, textLeft, height / 2 + 4);
        ctx.textBaseline = 'alphabetic';
      }
      sheet.texture.needsUpdate = true;
    }
  }
  /* Where I have worked and studied. */
  sticker(-.89, 1.56, 2.3, .6, .03, 'cockroachlabs', 'Cockroach Labs', '#0b0f0c');
  sticker(1.24, 1.58, 1.6, .6, -.04, 'datastax', 'DataStax', '#000000');
  sticker(-1.53, .78, 1.55, .6, -.03, 'walmart', 'Walmart', '#0071CE');
  sticker(-.02, .8, 1.1, .6, .05, 'fiserv', '');
  sticker(1.51, .77, 1.6, .6, -.02, 'utdallas', 'UT Dallas');
  /* What I work with. */
  sticker(-1.28, 0, 1.95, .6, .02, 'claude', 'Claude Code', '#D97757');
  sticker(.45, .02, 1.15, .6, -.05, 'modelcontextprotocol', 'MCP', '#000000');
  sticker(1.73, 0, 1.05, .6, .04, 'aws', 'AWS', '#232F3E');
  sticker(-1.63, -.78, 1.4, .6, -.04, 'python', 'Python', '#3776AB');
  sticker(.07, -.77, 1.65, .6, .03, 'terraform', 'Terraform', '#844FBA');
  sticker(1.7, -.79, 1.25, .6, -.03, 'docker', 'Docker', '#2496ED');
  sticker(-1.45, -1.56, 1.7, .6, .04, 'langchain', 'LangChain', '#1C3C3C');
  note(board, .55, -1.56, .09, -.07, '#f5e26b', ['what next?']);
  register(board, 'skills', [0, 2.45, .1], 0);

  /* ---------- Writing: a teal folder with a stack of pages and a pen ---------- */

  const writing = group(-4.9, 0, 2.3);
  writing.rotation.y = .1;
  box(2.3, .05, 1.75, mat.teal, writing, 0, .025, 0, .02);
  for (let i = 0; i < 4; i++) {
    const page = box(1.65, .022, 2.05, mat.paper, writing, -.1 + (random() - .5) * .16, .062 + i * .024, (random() - .5) * .12, 0);
    page.rotation.y = (random() - .5) * .2;
  }
  const topPage = plane(1.6, 2, new THREE.MeshStandardMaterial({ map: pageSheet.texture, roughness: .95 }), writing, -.1, .16, 0);
  topPage.rotation.x = -Math.PI / 2;
  topPage.rotation.z = .06;
  const pen = cylinder(.035, .035, 1.25, mat.black, writing, .95, .09, .25, 10);
  pen.rotation.set(Math.PI / 2, 0, .35);
  contact(-4.9, 2.3, 3, 2.6, .55, .006);
  register(writing, 'writing', [0, .5, .9]);

  /* A pair of studio speakers at the back corners. */
  for (const side of [-1, 1]) {
    const speaker = group(side * 7.7, 0, -1.9);
    speaker.userData.rigid = true;
    const cabinet = standard('#2b2e34'), baffle = standard('#3a3e45');
    speaker.rotation.y = -side * .32;
    /* Studio monitor: charcoal cabinet, a lighter front baffle, cone with rings, waveguide tweeter, port and power light. */
    box(1.6, 2.6, 1.5, cabinet, speaker, 0, 1.3, 0, .08);
    box(1.46, 2.46, .06, baffle, speaker, 0, 1.3, .74, .07);
    const surround = mesh(new THREE.TorusGeometry(.56, .055, 10, 48), mat.black, speaker, 0, .98, .79);
    surround.castShadow = false;
    const cone = cylinder(.52, .16, .16, standard('#e4dfd0'), speaker, 0, .98, .72, 48);
    cone.rotation.x = Math.PI / 2;
    for (const r of [.3, .42]) {
      const ring = mesh(new THREE.TorusGeometry(r, .008, 6, 48), standard('#b9b3a2'), speaker, 0, .98, .705 + r * .19);
      ring.castShadow = false;
    }
    sphere(.17, standard('#3a3d43'), speaker, 0, .98, .68, 1, 1, .5);
    const guide = cylinder(.3, .3, .03, standard('#3c4047'), speaker, 0, 2, .775, 40);
    guide.rotation.x = Math.PI / 2;
    const lip = mesh(new THREE.TorusGeometry(.3, .02, 8, 40), mat.silver, speaker, 0, 2, .79);
    lip.castShadow = false;
    sphere(.1, mat.silver, speaker, 0, 2, .78, 1, 1, .55);
    box(.7, .08, .03, mat.black, speaker, 0, .22, .775, .03);
    sphere(.028, new THREE.MeshBasicMaterial({ color: ACCENT, toneMapped: false }), speaker, .56, 2.38, .775);
    box(.3, .05, .01, mat.silver, speaker, -.48, 2.38, .775, 0);
  }

  /* Dust in the light. */
  const moteCount = 160;
  const motePositions = new Float32Array(moteCount * 3), moteSeeds = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = -8 + random() * 18;
    motePositions[i * 3 + 1] = .6 + random() * 6;
    motePositions[i * 3 + 2] = -4 + random() * 9;
    moteSeeds[i] = random();
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  moteGeometry.setAttribute('aSeed', new THREE.BufferAttribute(moteSeeds, 1));
  scene.add(new THREE.Points(moteGeometry, new THREE.ShaderMaterial({
    uniforms: { uTime: timeUniform }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime;attribute float aSeed;varying float vA;void main(){vec3 p=position;p.x+=sin(uTime*.19+aSeed*19.)*.35;p.y+=sin(uTime*.13+aSeed*30.)*.22;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(22./-mv.z,1.,2.6);vA=.08+aSeed*.18;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vA;void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.92,.88,.7,a*vA);}`
  })));

  /* ---------- Camera ---------- */

  /* Close-ups for each clickable thing: where the camera stands and what it looks at. */
  /* ---------- A lived-in room: plants, and a mug of tea still steaming ---------- */

  const steam = [];
  if (PAINTED) {
    const terracotta = standard('#c2693f'), soil = standard('#3b2a1e');
    const greens = ['#3f8f3a', '#57a843', '#2f7a3c', '#74b84a'].map(c => standard(c));
    /* A pot with leaves fanned out round a centre; `droop` lets the outer ones hang. */
    function plant(x, y, z, size, leaves, droop = .5, parent = scene) {
      const g = group(x, y, z, parent);
      g.userData.rigid = true;
      g.scale.setScalar(size);
      cylinder(.42, .3, .62, terracotta, g, 0, .31, 0, 24);
      cylinder(.45, .45, .09, terracotta, g, 0, .62, 0, 24);
      cylinder(.38, .38, .04, soil, g, 0, .66, 0, 20);
      for (let i = 0; i < leaves; i++) {
        const turn = i * 2.4, ring = i / leaves;
        const lean = .25 + ring * droop * 1.9, reach = .5 + ring * .55;
        const stem = group(0, .66, 0, g);
        stem.rotation.set(0, turn, lean, 'YXZ');
        cylinder(.022, .03, reach, greens[2], stem, 0, reach / 2, 0, 6);
        const leaf = sphere(1, greens[i % greens.length], stem, 0, reach + .3, 0, .2, .38, .05);
        leaf.rotation.y = .5;
      }
      return g;
    }
    plant(-16.1, -3, -4.3, 1.9, 13, .5);
    plant(8.35, 0, -2.3, .82, 9, .62);
    /* A woven rug under the desk, in muted colours so it sits under the room instead of leading it. */
    const rugSheet = surface(1024, 512);
    {
      const { ctx, width, height } = rugSheet;
      ctx.fillStyle = '#a59a84';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#22383f';
      ctx.fillRect(26, 26, width - 52, height - 52);
      ctx.strokeStyle = '#8f7c4c';
      ctx.lineWidth = 10;
      ctx.strokeRect(52, 52, width - 104, height - 104);
      ctx.strokeStyle = '#7d4f3d';
      ctx.lineWidth = 5;
      ctx.strokeRect(74, 74, width - 148, height - 148);
      for (let i = 0; i < 7; i++) {
        const cx = 152 + i * 120, cy = height / 2, big = i % 2 === 0;
        ctx.fillStyle = big ? '#7f7450' : '#6f6c60';
        ctx.beginPath();
        ctx.moveTo(cx, cy - (big ? 96 : 60));
        ctx.lineTo(cx + (big ? 52 : 34), cy);
        ctx.lineTo(cx, cy + (big ? 96 : 60));
        ctx.lineTo(cx - (big ? 52 : 34), cy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = big ? '#7d4f3d' : '#22383f';
        ctx.beginPath();
        ctx.arc(cx, cy, big ? 16 : 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(60, 20, 10, .07)';
      for (let row = 30; row < height - 30; row += 6) ctx.fillRect(26, row, width - 52, 2);
      rugSheet.texture.needsUpdate = true;
    }
    const rug = plane(22, 10.4, new THREE.MeshToonMaterial({ map: rugSheet.texture, gradientMap: toonRamp }), scene, 0, -2.975, 1.2);
    rug.rotation.x = -Math.PI / 2;
    rug.raycast = () => {};

    /* Trees outside both windows: a trunk and a heap of round crowns. */
    const bark = standard('#6b4a2f'), crowns = ['#2f7d3a', '#3f9344', '#56a84a', '#297034'].map(c => standard(c));
    function tree(x, y, z, size) {
      const g = group(x, y, z);
      g.scale.setScalar(size);
      cylinder(.22, .34, 9, bark, g, 0, -4.6, 0, 10);
      [[0, 0, 0, 1.25], [-.95, -.2, .2, .9], [.95, -.1, .1, .95], [.2, .75, 0, .9], [-.5, .55, .3, .75], [.55, -.55, .45, .7]]
        .forEach(([px, py, pz, r], i) => sphere(r, crowns[i % crowns.length], g, px, py, pz));
      g.traverse(m => { m.castShadow = false; });
    }
    tree(-8.6, 4.4, -14, 2.3);
    tree(9.4, 2.4, -17, 1.9);
    tree(25, 4.2, 3.5, 2.4);
    tree(27, 2.8, -6, 2);

    /* A ginger cat asleep in the sun from the side window. Click it. */
    cat = group(12.4, -2.95, -.9);
    cat.rotation.y = -.5;
    cat.scale.setScalar(1.45);
    const ginger = standard('#e08a3a'), cream = standard('#f6e6cc');
    sphere(1, ginger, cat, 0, .3, 0, .78, .36, .56);
    sphere(1, cream, cat, .2, .2, .3, .34, .2, .26);
    catHead = group(.6, .34, .3, cat);
    sphere(.29, ginger, catHead, 0, 0, 0, 1, .86, .95);
    for (const side of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(.1, .17, 4), ginger, catHead, .02, .25, side * .15);
      ear.rotation.x = side * .25;
    }
    sphere(.035, standard('#d86a6a'), catHead, .27, -.03, 0);
    for (const side of [-1, 1]) box(.02, .014, .09, standard('#3a2418'), catHead, .23, .05, side * .11, 0);
    const tail = mesh(new THREE.TorusGeometry(.56, .075, 8, 28, Math.PI * 1.15), ginger, cat, .02, .1, .12);
    tail.rotation.set(Math.PI / 2, 0, 2.2);
    toy(cat, 'cat');

    /* The mug, by the keyboard. */
    const mug = group(4.05, .03, 1.45);
    const glaze = standard('#e9e2cf');
    cylinder(.26, .22, .5, glaze, mug, 0, .25, 0, 28);
    cylinder(.215, .215, .02, standard('#7a4a26'), mug, 0, .49, 0, 24);
    const handle = mesh(new THREE.TorusGeometry(.15, .04, 8, 20, Math.PI), glaze, mug, .25, .26, 0);
    handle.rotation.z = -Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const wisp = plane(.2, .5, new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), mug, 0, .7, 0);
      wisp.raycast = () => {};
      steam.push({ mesh: wisp, offset: i / 3 });
    }
  }

  /* Fewer, bigger pieces: a prop that only ever moves as a whole (marked rigid) has its parts welded together,
     one mesh per material, so the guitar is a dozen draw calls instead of ninety. */
  {
    const inverse = new THREE.Matrix4(), local = new THREE.Matrix4();
    const weld = root => {
      root.updateMatrixWorld(true);
      inverse.copy(root.matrixWorld).invert();
      const buckets = new Map();
      root.traverse(m => {
        if (!m.isMesh || Array.isArray(m.material) || m.children.length || !m.geometry.attributes.normal) return;
        if (m.matrixWorld.determinant() < 0) return;
        const type = m.geometry.type;
        const flat = type === 'PlaneGeometry' || type === 'CircleGeometry' || type === 'BoxGeometry';
        const key = [m.material.uuid, m.castShadow, m.receiveShadow, flat, m.userData.section || '', m.userData.toy || '', m.renderOrder, m.visible].join('|');
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(m);
      });
      for (const list of buckets.values()) {
        if (list.length < 2) continue;
        const parts = list.map(m => {
          const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
          g.applyMatrix4(local.multiplyMatrices(inverse, m.matrixWorld));
          return g;
        });
        const total = parts.reduce((sum, g) => sum + g.attributes.position.count, 0);
        const position = new Float32Array(total * 3), normal = new Float32Array(total * 3), uv = new Float32Array(total * 2);
        let at = 0;
        for (const g of parts) {
          position.set(g.attributes.position.array, at * 3);
          normal.set(g.attributes.normal.array, at * 3);
          if (g.attributes.uv) uv.set(g.attributes.uv.array, at * 2);
          at += g.attributes.position.count;
          g.dispose();
        }
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
        merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        const first = list[0];
        const type = first.geometry.type;
        const one = new THREE.Mesh(merged, first.material);
        one.castShadow = first.castShadow;
        one.receiveShadow = first.receiveShadow;
        one.renderOrder = first.renderOrder;
        one.userData = { ...first.userData, weldedFlat: type === 'PlaneGeometry' || type === 'CircleGeometry' || type === 'BoxGeometry' };
        root.add(one);
        const picked = pickables.includes(first);
        for (const m of list) {
          m.parent.remove(m);
          m.geometry.dispose();
          const index = pickables.indexOf(m);
          if (index >= 0) pickables.splice(index, 1);
        }
        if (picked) pickables.push(one);
      }
    };
    const rigid = [];
    scene.traverse(node => { if (node.userData.rigid) rigid.push(node); });
    rigid.forEach(weld);
  }

  /* Ink outlines: every solid shape gets a slightly larger dark shell, seen only at its edges. */
  if (PAINTED) {
    const inks = new Map();
    const ink = thickness => {
      const key = thickness.toFixed(3);
      if (!inks.has(key)) {
        const m = new THREE.MeshBasicMaterial({ color: '#1f1815', side: THREE.BackSide });
        m.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normalize(normal) * ${key};`);
        };
        m.customProgramCacheKey = () => 'ink' + key;
        inks.set(key, m);
      }
      return inks.get(key);
    };
    scene.updateMatrixWorld(true);
    const size = new THREE.Vector3(), solids = [];
    scene.traverse(m => {
      if (!m.isMesh || !(m.material.isMeshToonMaterial || m.material.isMeshPhysicalMaterial)) return;
      const type = m.geometry.type;
      if (type === 'PlaneGeometry' || type === 'CircleGeometry' || type === 'BoxGeometry' || m.userData.weldedFlat) return;
      solids.push(m);
    });
    for (const m of solids) {
      m.getWorldScale(size);
      const shell = new THREE.Mesh(m.geometry, ink(Math.min(.026 / Math.max((size.x + size.y + size.z) / 3, .05), .2)));
      shell.raycast = () => {};
      shell.userData.ink = true;
      m.add(shell);
    }
  }

  const focusViews = {
    work: { position: [3.1, 3.9, 11], look: [3.25, 2.8, -1.9] },
    career: { position: [-3.1, 3.9, 11], look: [-3.25, 2.8, -1.9] },
    rig: { position: [4.6, 3.4, 7.6], look: [6.2, 1, 1.1] },
    contact: { position: [-3.35, 2.8, 7], look: [-2.95, .9, 1.9] },
    podcast: { position: [-4.4, 3.6, 9.4], look: [-7.2, 3.1, 2.6] },
    writing: { position: [-4.2, 4.6, 8.2], look: [-4.9, .1, 2.3] },
    talks: { position: [10.2, 5.8, 7.4], look: [11, 5.8, -5.96] },
    skills: { position: [-11.2, 2.8, 6.6], look: [-12.7, 2.55, -5.96] }
  };
  for (const view of Object.values(focusViews)) {
    view.position = new THREE.Vector3(...view.position);
    view.look = new THREE.Vector3(...view.look);
  }

  const podcastHome = { position: focusViews.podcast.position.clone(), look: focusViews.podcast.look.clone() };
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const micTurn = new THREE.Quaternion();
  const dragPlane = new THREE.Plane(), grabPoint = new THREE.Vector3(), grabStart = new THREE.Vector3(), dragHit = new THREE.Vector3();
  let lastHit = null, micGrab = false;
  const baseLook = new THREE.Vector3(), orbitPosition = new THREE.Vector3(), cameraLook = new THREE.Vector3();
  const focusPosition = new THREE.Vector3(), focusLook = new THREE.Vector3(), projected = new THREE.Vector3();
  let width = 0, height = 0, compact = false, paused = body.classList.contains('motion-paused');
  let exploring = false, dragging = false, moved = false, downX = 0, downY = 0, startYaw = 0, startPitch = 0;
  let yaw = 0, pitch = 0, smoothYaw = 0, smoothPitch = 0, zoom = 1, smoothZoom = 1;
  let hoverKey = null, focusKey = null, lastFocusKey = 'work', focusAmount = 0;
  let introAmount = body.classList.contains('intro') ? 0 : 1, introGoal = introAmount, enteredAt = -10;
  let panelOpen = dialog.open, openTimer = 0;
  /* A direct link (#podcast) opens its panel before this module runs: start on that close-up. */
  if (panelOpen && focusViews[dialog.dataset.panel]) {
    focusKey = lastFocusKey = dialog.dataset.panel;
    focusAmount = 1;
  }
  let frameId = 0, last = 0, elapsed = 0, contextLost = false;

  function resize() {
    if (contextLost) return;
    const rect = viewport.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    compact = width < 760;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, 3400 / width));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = compact ? 50 : 42;
    camera.updateProjectionMatrix();
    draw(0, true);
  }

  function placeCamera(dt, instant) {
    const damp = instant ? 1 : 1 - Math.exp(-dt * 4.5);
    if (!exploring && !dragging && !instant) {
      const settle = Math.exp(-dt * .9);
      yaw *= settle;
      pitch *= settle;
    }
    smoothYaw += (yaw - smoothYaw) * damp;
    smoothPitch += (pitch - smoothPitch) * damp;
    smoothZoom += (zoom - smoothZoom) * damp;
    introAmount += (introGoal - introAmount) * (instant ? 1 : 1 - Math.exp(-dt * 1.5));
    focusAmount += ((focusKey ? 1 : 0) - focusAmount) * (instant ? 1 : 1 - Math.exp(-dt * 3.6));

    /* Stand far enough back that the desk fits the frame at this aspect ratio. */
    const halfHorizontal = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const span = compact ? 18.5 : 32;
    const distance = clamp(span / 2 / Math.tan(halfHorizontal), 12, compact ? 42 : 31) * smoothZoom;
    baseLook.set(0, compact ? 3.2 : 2.3, -1);

    const drift = paused ? 0 : Math.sin(elapsed * .14) * .012;
    const intro = 1 - ease(clamp(introAmount, 0, 1));
    /* In the dark, before the lights go on, the room leans further toward the cursor. */
    const angle = smoothYaw + drift + (paused ? 0 : pointer.x * -(.035 + intro * .13));
    const elevation = clamp(.21 + smoothPitch + (paused ? 0 : pointer.y * -(.02 + intro * .05)), .06, .62);
    const reach = distance + intro * 9;
    orbitPosition.set(
      baseLook.x + Math.sin(angle) * Math.cos(elevation) * reach,
      baseLook.y + Math.sin(elevation) * reach + intro * 2.4,
      baseLook.z + Math.cos(angle) * Math.cos(elevation) * reach
    );
    cameraLook.copy(baseLook);

    const view = focusViews[focusKey || lastFocusKey];
    const blend = ease(clamp(focusAmount, 0, 1));
    if (view && blend > .0005) {
      focusLook.copy(view.look);
      focusPosition.copy(view.position).sub(view.look).multiplyScalar(compact ? 1.5 : 1).add(view.look);
      orbitPosition.lerp(focusPosition, blend);
      cameraLook.lerp(focusLook, blend);
    }
    camera.position.copy(orbitPosition);
    camera.lookAt(cameraLook);

    /* With the panel docked on the right, keep the close-up centred in the space left of it. */
    let shift = 0;
    if (panelOpen && width >= 1100) {
      const sheet = dialog.getBoundingClientRect();
      if (sheet.width && sheet.width < width * .9) shift = (width - sheet.left) / 2 * blend;
    }
    if (shift > .5) camera.setViewOffset(width, height, shift, 0, width, height);
    else if (camera.view) camera.clearViewOffset();
    camera.updateMatrixWorld();
    /* Lights on: two soft blinks, like a tube catching, then full brightness. */
    const since = elapsed - enteredAt;
    const blink = !paused && since > 0 && since < .5 ? (Math.sin(since * 25) > .3 ? 1.5 : .8) : 1;
    renderer.toneMappingExposure = exposure * Math.min(1, (1 - intro * .2) * blink);
  }

  function placeLabels() {
    for (const item of targets.values()) {
      if (!item.element) continue;
      projected.copy(item.anchor);
      item.group.localToWorld(projected);
      projected.project(camera);
      const x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
      item.element.style.left = `${x.toFixed(1)}px`;
      item.element.style.top = `${y.toFixed(1)}px`;
      item.element.style.visibility = projected.z > 1 || x < 30 || x > width - 30 || y < 70 || y > height * (compact ? .6 : .92) ? 'hidden' : 'visible';
    }
  }

  const TOY_HINTS = {
    'toy:guitar': 'Strum it', 'toy:amp': 'Switch the amp on or off', 'toy:mouse': 'Click: next page on the Work screen',
    'toy:keys': 'Type something', 'toy:cat': 'Say hello to the cat', podcast: 'Click to open the podcast · drag to move the mic'
  };
  function setHovered(key) {
    if (key === hoverKey) return;
    hoverKey = key;
    canvas.title = TOY_HINTS[key] || '';
    canvas.style.cursor = key && !exploring ? 'pointer' : dragging ? 'grabbing' : 'grab';
    targets.forEach((item, name) => item.element?.classList.toggle('is-hover', name === key));
    requestDraw();
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    if (panelOpen || exploring || introGoal < 1) return null;
    raycaster.setFromCamera(pointer, camera);
    lastHit = raycaster.intersectObjects(pickables, false)[0] || null;
    const data = lastHit?.object.userData;
    return data?.section || (data?.toy ? 'toy:' + data.toy : null);
  }

  /* The small pleasures: each of these answers a click with a sound and a movement. */
  function playToy(name) {
    const sound = window.StudioSound;
    if (name === 'guitar') { play.strum = 1; sound?.fx('strum', play.ampOn); }
    else if (name === 'amp') {
      play.ampOn = !play.ampOn;
      play.amp = 1;
      ampLamp.emissiveIntensity = play.ampOn ? 2.4 : 0;
      sound?.fx('amp', play.ampOn);
    } else if (name === 'mouse') {
      play.mouse = 1;
      sound?.fx('click');
    } else if (name === 'keys') { play.keys = 0; sound?.fx('keys'); }
    else if (name === 'cat') { play.cat = 1; sound?.fx('cat'); }
    requestDraw();
  }
  function animateToys(dt) {
    const still = paused;
    play.strum = still ? 0 : play.strum * Math.exp(-dt * 2.6);
    guitar.rotation.z = -.07 + Math.sin(elapsed * 26) * play.strum * .022;
    play.amp = still ? 0 : play.amp * Math.exp(-dt * 6);
    guitarAmp.scale.setScalar(1 + play.amp * .03);
    play.mouse = still ? 0 : play.mouse * Math.exp(-dt * 9);
    deskMouse.position.z = 2 - play.mouse * .14;
    if (play.keys >= 0 && !still) {
      play.keys += dt / .62;
      /* A wave of key presses runs left to right, with a glow rising from under the caps. */
      const front = -2.3 + Math.min(play.keys, 1) * 4.6;
      for (const cap of keycaps) {
        const near = Math.max(0, 1 - Math.abs(cap.position.x - front) / .45);
        cap.position.y = cap.userData.restY - near * .045;
      }
      keyGlow.material.opacity = Math.sin(Math.min(play.keys, 1) * Math.PI) * .32;
      if (play.keys >= 1) { play.keys = -1; for (const cap of keycaps) cap.position.y = cap.userData.restY; }
    } else { keyGlow.material.opacity = 0; play.keys = -1; }
    for (const wisp of steam) {
      const life = (elapsed * .22 + wisp.offset) % 1;
      wisp.mesh.position.set(Math.sin((life + wisp.offset) * 7) * .07, .62 + life * .9, 0);
      wisp.mesh.scale.setScalar(.7 + life * 1.3);
      wisp.mesh.material.opacity = Math.sin(life * Math.PI) * .32;
      wisp.mesh.quaternion.copy(camera.quaternion);
    }
    if (cat) {
      /* The cat breathes in its sleep, and lifts its head when touched. */
      play.cat = still ? 0 : play.cat * Math.exp(-dt * 1.1);
      cat.scale.y = 1.45 * (1 + (still ? 0 : Math.sin(elapsed * 1.6) * .025));
      catHead.position.y = .34 + play.cat * .16;
      catHead.rotation.z = play.cat * .35;
    }
    if (micGlow) {
      /* The on-air glow breathes, and the meter dances while music plays. */
      micGlow.quaternion.copy(camera.quaternion).premultiply(mic.getWorldQuaternion(micTurn).invert());
      micGlow.material.opacity = still ? .3 : .26 + Math.sin(elapsed * 2.4) * .1;
      const level = still ? 2 : soundOn ? 2.4 + Math.sin(elapsed * 9.6) * 1.3 + Math.sin(elapsed * 23) * .9 : 1 + Math.sin(elapsed * 1.5) * .4;
      micMeter.forEach((light, i) => light.lamp.color.copy(i < level ? light.on : light.off));
    }
    play.sway = still ? 0 : play.sway * Math.exp(-dt * 2.2);
    mic.rotation.z = Math.sin(elapsed * 6.5) * play.sway * .07;
    poseArm();
  }
  function moveMic(x, z) {
    mic.position.x = clamp(x, -9.3, -1.2);
    mic.position.z = clamp(z, .5, 3.7);
    micShadow.position.x = mic.position.x;
    micShadow.position.z = mic.position.z;
    const view = focusViews.podcast;
    view.position.copy(podcastHome.position).add(mic.position).sub(micHome);
    view.look.copy(podcastHome.look).add(mic.position).sub(micHome);
  }

  /* The camera moves in first; the panel follows. */
  function openFromScene(key) {
    clearTimeout(openTimer);
    if (key === 'music') { window.StudioSound?.toggle(); return; }
    if (key.startsWith('toy:')) { playToy(key.slice(4)); return; }
    const announce = () => window.dispatchEvent(new CustomEvent('studio:open', { detail: { section: key } }));
    window.StudioSound?.fx('open');
    if (paused) { announce(); return; }
    focusKey = lastFocusKey = key;
    openTimer = setTimeout(announce, 520);
  }

  canvas.addEventListener('pointermove', event => {
    const key = pick(event);
    if (!dragging) setHovered(key);
    if (dragging) {
      const dx = event.clientX - downX, dy = event.clientY - downY;
      moved = moved || Math.abs(dx) + Math.abs(dy) > 6;
      if (moved && micGrab) {
        /* Dragging the mic slides it over the desk; the boom arm follows. */
        const rect = canvas.getBoundingClientRect();
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(dragPlane, dragHit)) {
          const before = mic.position.x;
          moveMic(grabStart.x + dragHit.x - grabPoint.x, grabStart.z + dragHit.z - grabPoint.z);
          play.sway = Math.min(1, play.sway + Math.abs(mic.position.x - before) * .5);
        }
      } else if (moved && introGoal === 1) {
        yaw = clamp(startYaw - dx * .0028, -.55, .55);
        pitch = clamp(startPitch + dy * .0022, -.12, .34);
      }
    }
    requestDraw();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    dragging = true;
    moved = false;
    downX = event.clientX;
    downY = event.clientY;
    startYaw = yaw;
    startPitch = pitch;
    micGrab = pick(event) === 'podcast' && Boolean(lastHit);
    if (micGrab) {
      grabPoint.copy(lastHit.point);
      grabStart.copy(mic.position);
      dragPlane.setFromNormalAndCoplanarPoint(UP, grabPoint);
    }
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointerup', event => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (!moved) { const key = pick(event); if (key) openFromScene(key); }
    else if (micGrab) play.sway = Math.max(play.sway, .6);
    micGrab = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; canvas.classList.remove('is-dragging'); });
  canvas.addEventListener('pointerleave', () => { if (!dragging) { pointer.set(0, 0); setHovered(null); } });
  canvas.addEventListener('wheel', event => {
    if (panelOpen || introGoal < 1) return;
    event.preventDefault();
    zoom = clamp(zoom + event.deltaY * .0009, .68, 1.12);
    requestDraw();
  }, { passive: false });

  /* Hovering a menu item lifts the matching thing on the desk. */
  document.querySelectorAll('[data-open]').forEach(button => {
    const show = () => { if (!panelOpen) setHovered(button.dataset.open); };
    button.addEventListener('pointerenter', show);
    button.addEventListener('focus', show);
    button.addEventListener('pointerleave', () => setHovered(null));
    button.addEventListener('blur', () => setHovered(null));
  });

  const chrome = '.hero-copy,.collection-nav,.site-header,.scene-hotspot';
  function setExploring(value) {
    exploring = value;
    document.querySelectorAll(chrome).forEach(node => { node.inert = value; });
    body.classList.toggle('exploring', value);
    exploreLabel.textContent = value ? 'Back to the desk' : 'Look around';
    resetButton.hidden = !value;
    setHovered(null);
    if (!value) zoom = 1;
    requestDraw();
  }
  exploreButton.addEventListener('click', () => setExploring(!exploring));
  resetButton.addEventListener('click', () => { yaw = 0; pitch = 0; zoom = 1; requestDraw(); });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.altKey || event.metaKey || panelOpen || introGoal < 1) return;
    if (event.target instanceof Element && event.target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); setExploring(!exploring); }
    if (!exploring) return;
    if (event.key === 'Escape') { event.preventDefault(); setExploring(false); exploreButton.focus(); }
    const turn = { ArrowLeft: [.08, 0], ArrowRight: [-.08, 0], ArrowUp: [0, .05], ArrowDown: [0, -.05] }[event.key];
    if (turn) {
      event.preventDefault();
      yaw = clamp(yaw + turn[0], -.55, .55);
      pitch = clamp(pitch + turn[1], -.16, .3);
      requestDraw();
    }
  });

  window.addEventListener('studio:sound', event => { soundOn = Boolean(event.detail?.playing); requestDraw(); });
  window.addEventListener('studio:peek', event => {
    if (introGoal < 1) { pointer.set(event.detail.x, event.detail.y); requestDraw(); }
  });
  window.addEventListener('studio:enter', () => { introGoal = 1; enteredAt = elapsed; pointer.set(0, 0); if (paused) introAmount = 1; requestDraw(); });
  window.addEventListener('studio:panel', event => {
    clearTimeout(openTimer);
    panelOpen = event.detail.open;
    const section = panelOpen ? event.detail.section : null;
    focusKey = section && focusViews[section] ? section : null;
    if (focusKey) lastFocusKey = focusKey;
    if (panelOpen) { introGoal = 1; if (exploring) setExploring(false); }
    setHovered(null);
    requestDraw();
  });
  window.addEventListener('studio:motion', event => {
    paused = event.detail.paused;
    cancelAnimationFrame(frameId);
    last = 0;
    if (!paused && !document.hidden && !contextLost) frameId = requestAnimationFrame(tick);
    else requestDraw();
  });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frameId);
    last = 0;
    if (!document.hidden && !paused && !contextLost) frameId = requestAnimationFrame(tick);
  });

  /* ---------- Frame ---------- */

  let shadowTurn = 0;
  function draw(dt, instant = false) {
    if (!width || !height) return;
    if (!fixedHour) {
      /* Ease toward the chosen light the short way round the clock. */
      const gap = ((LIGHT_PHASE[lightMode] - dayPhase + 1.5) % 1) - .5;
      dayPhase = (dayPhase + gap * (instant || paused ? 1 : Math.min(dt * 2.4, 1)) + 1) % 1;
    }
    updateDaylight();
    placeCamera(dt, instant);
    drawTerminal(elapsed);
    for (const [key, item] of targets) {
      const goal = key === hoverKey && !panelOpen ? 1 : 0;
      item.hover += (goal - item.hover) * (instant ? 1 : Math.min(dt * 7, 1));
      item.group.position.y = item.group.userData.baseY + item.hover * item.lift;
      if (!item.lift) item.group.scale.setScalar(1 + item.hover * .018);
    }
    animateToys(dt);
    if (record) {
      /* The platter eases up to 33 rpm while music plays, and winds down when it stops. */
      recordSpeed += ((soundOn ? 3.49 : 0) - recordSpeed) * Math.min(dt * 2.2, 1);
      record.rotation.y -= dt * recordSpeed;
    }
    timeUniform.value = elapsed;
    placeLabels();
    renderer.shadowMap.needsUpdate = instant || shadowTurn++ % 3 === 0;
    renderer.render(scene, camera);
  }
  /* With motion paused there is no loop, so changes ask for a single frame. */
  function requestDraw() {
    if (paused && !contextLost) draw(0, true);
  }
  /* Half rate when nobody is touching anything, or while a panel is open over the room. */
  let lastInput = 0, skipFrame = false;
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(type, () => { lastInput = performance.now(); }, { passive: true });
  }
  function tick(now) {
    if (!paused && !document.hidden) frameId = requestAnimationFrame(tick);
    const resting = !dragging && (panelOpen || (!exploring && introGoal >= 1 && now - lastInput > 4000));
    skipFrame = resting && !skipFrame;
    if (skipFrame) return;
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now;
    elapsed += dt;
    draw(dt);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frameId);
    body.classList.remove('scene-3d', 'exploring');
    exploring = false;
    document.querySelectorAll(chrome).forEach(node => { node.inert = false; });
    controls.hidden = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (!contextLost) return;
    contextLost = false;
    body.classList.add('scene-3d');
    controls.hidden = false;
    resize();
    if (!paused) frameId = requestAnimationFrame(tick);
  });

  drawNotes();
  drawStickers();
  updateDaylight();
  body.classList.add('scene-3d');
  controls.hidden = false;
  resize();
  new ResizeObserver(resize).observe(viewport);
  if (!paused && !document.hidden) frameId = requestAnimationFrame(tick);
}
