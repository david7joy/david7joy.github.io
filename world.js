import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/*
  The studio: a 3D model of David's real desk.
  Everything is geometry and canvas-drawn screens; there are no image assets.

  Clickable things and the panel each one opens:
    ultrawide monitor -> work      left monitor  -> story     wall calendar -> talks
    terminal laptop   -> rig       chat laptop   -> contact
    microphone        -> podcast   paper stack   -> writing

  Add ?hour=22 to the URL to preview the room at another time of day.
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
  scene.background = new THREE.Color('#10161d');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const roomEnvironment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(roomEnvironment, 0.04).texture;
  scene.environmentIntensity = 0.1 + day * 0.22;
  roomEnvironment.dispose();
  pmrem.dispose();

  let seed = 49;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const timeUniform = { value: 0 };
  const pickables = [];
  const targets = new Map();

  /* ---------- Small builders ---------- */

  const standard = (color, roughness = 0.65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mat = {
    wall: standard('#27323f', .95),
    trim: standard('#e8e5dc', .7),
    carpet: standard('#77726a', 1),
    wood: standard('#7c3d24', .55),
    frame: standard('#dcdcd6', .5, .25),
    black: standard('#15171a', .5),
    plastic: standard('#1d2024', .72),
    charcoal: standard('#2b2e33', .6),
    foam: standard('#131416', 1),
    aluminium: standard('#62666d', .38, .75),
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

  const FONT = { display: 'Sora, system-ui, sans-serif', sans: 'Inter, system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
  const INK = '#f2f4ee', ACCENT = '#b8ef6b', WARM = '#f0a868';

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

  /* Wallpaper: terraced green fields, like the one on the real monitor. */
  function paintWallpaper() {
    const w = 640, h = 272;
    const element = document.createElement('canvas');
    element.width = w;
    element.height = h;
    const ctx = element.getContext('2d');
    const image = ctx.createImageData(w, h);
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const noise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x / w * 5.2, py = y / w * 5.2;
        const height = (noise(px, py) + .5 * noise(px * 2.1 + 9, py * 2.1 + 4) + .25 * noise(px * 4.3, py * 4.3 + 7)) / 1.75;
        const bands = height * 15;
        const band = bands - Math.floor(bands);
        const tone = Math.pow(clamp(height * 1.25 - .1, 0, 1), 1.15);
        const hedge = band < .16 ? .5 : 1;
        const rows = .93 + .07 * Math.sin(band * 42);
        const grain = .94 + .12 * hash(x, y);
        const shade = hedge * rows * grain;
        const i = (y * w + x) * 4;
        image.data[i] = (18 + tone * 162) * shade;
        image.data[i + 1] = (74 + tone * 150) * shade;
        image.data[i + 2] = (14 + tone * 26) * shade;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return element;
  }
  const wallpaper = paintWallpaper();

  const data = window.PORTFOLIO || {};
  const workItems = (data.items || []).filter(item => item && (item.type === 'project' || item.type === 'integration') && item.title);

  const mainScreen = surface(1536, 652);
  function drawMainScreen() {
    const { ctx, width, height } = mainScreen;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(wallpaper, 0, 0, width, height);
    const x = 92, y = 78, w = 660, h = 496;
    ctx.fillStyle = 'rgba(9, 14, 18, .88)';
    rounded(ctx, x, y, w, h, 24);
    ctx.fill();
    ['#ff6058', '#ffbd2e', '#28c941'].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 38 + i * 30, y + 38, 9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8fa0a6';
    ctx.font = `500 22px ${FONT.mono}`;
    ctx.fillText('~/work', x + 138, y + 46);
    ctx.fillStyle = INK;
    ctx.font = `600 50px ${FONT.display}`;
    ctx.fillText('Ideas, made real.', x + 36, y + 138);
    ctx.font = `500 27px ${FONT.sans}`;
    workItems.slice(0, 4).forEach((item, i) => {
      const rowY = y + 214 + i * 60;
      ctx.fillStyle = ACCENT;
      ctx.fillText('▸', x + 38, rowY);
      ctx.fillStyle = '#dfe6e2';
      ctx.fillText(fit(ctx, item.title, w - 120), x + 76, rowY);
    });
    ctx.fillStyle = ACCENT;
    ctx.font = `500 21px ${FONT.mono}`;
    ctx.fillText(workItems.length ? `${workItems.length} projects and integrations  →` : 'open  →', x + 38, y + h - 34);
    mainScreen.texture.needsUpdate = true;
  }

  const storyScreen = surface(1024, 582);
  function drawStoryScreen() {
    const { ctx, width, height } = storyScreen;
    ctx.fillStyle = '#0b1016';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#7f8f98';
    ctx.font = `500 22px ${FONT.mono}`;
    ctx.fillText('MY STORY', 64, 84);
    ctx.fillStyle = INK;
    ctx.font = `600 54px ${FONT.display}`;
    ctx.fillText('Follow the curiosity.', 64, 160);
    let years = (data.journey || []).map(chapter => Number(chapter.year)).filter(Number.isFinite);
    if (years.length < 2) years = [2008, 2017, 2019, 2026];
    years = [...new Set(years)].sort((a, b) => a - b);
    const left = 84, right = width - 84, base = height - 150, rise = 170;
    const point = i => {
      const t = i / (years.length - 1);
      return [left + (right - left) * t, base - rise * t * t];
    };
    ctx.strokeStyle = 'rgba(184, 239, 107, .55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    years.forEach((_, i) => { const [px, py] = point(i); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.stroke();
    years.forEach((year, i) => {
      const [px, py] = point(i);
      const last = i === years.length - 1;
      ctx.fillStyle = last ? WARM : ACCENT;
      ctx.beginPath();
      ctx.arc(px, py, last ? 14 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = last ? INK : '#a9b6bb';
      ctx.font = `500 23px ${FONT.mono}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(year), px, py + 52);
    });
    ctx.textAlign = 'left';
    storyScreen.texture.needsUpdate = true;
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
    const shown = Math.min(terminalLines.length, 1 + Math.floor((elapsed / .9) % cycle));
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

  const chatScreen = surface(1024, 664);
  function drawChatScreen() {
    const { ctx, width, height } = chatScreen;
    const side = ctx.createLinearGradient(0, 0, 0, height);
    side.addColorStop(0, '#8a2140');
    side.addColorStop(1, '#3c1d63');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 300, height);
    ctx.fillStyle = 'rgba(255, 255, 255, .22)';
    for (let i = 0; i < 8; i++) { rounded(ctx, 34, 96 + i * 62, 140 + (i * 53) % 90, 18, 9); ctx.fill(); }
    ctx.fillStyle = 'rgba(255, 255, 255, .5)';
    rounded(ctx, 34, 40, 180, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#f7f5f0';
    ctx.fillRect(300, 0, width - 300, height);
    ctx.textBaseline = 'middle';
    const bubble = (text, x, y, w, fill, color) => {
      ctx.fillStyle = fill;
      rounded(ctx, x, y, w, 78, 26);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = `500 31px ${FONT.sans}`;
      ctx.fillText(text, x + 30, y + 41);
    };
    bubble('Hey David', 344, 120, 250, '#e4e1da', '#1c2228');
    bubble('Got an idea worth building?', 344, 222, 500, '#e4e1da', '#1c2228');
    bubble('Let’s talk.', 744, 344, 236, '#3c1d63', '#ffffff');
    ctx.strokeStyle = '#c9c5bb';
    ctx.lineWidth = 3;
    rounded(ctx, 344, height - 126, width - 388, 78, 20);
    ctx.stroke();
    ctx.fillStyle = '#8b8a84';
    ctx.font = `400 29px ${FONT.sans}`;
    ctx.fillText('Say hello…', 374, height - 86);
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
    terminalState = '';
  }
  drawSurfaces();
  /* Redraw once the web fonts arrive, so the screens use them. */
  if (document.fonts?.load) {
    Promise.all(['600 50px Sora', '500 27px Inter', '500 38px "JetBrains Mono"'].map(font => document.fonts.load(font)))
      .then(() => { drawSurfaces(); requestDraw(); })
      .catch(() => {});
  }

  /* ---------- Light ---------- */

  const hemisphere = new THREE.HemisphereLight('#d5deea', '#3b2e26', .3 + day * 1.05);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(day > .5 ? '#fff0da' : '#9fb7dc', .22 + day * 2.5);
  sun.position.set(11, 9, 7);
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -8, near: .5, far: 40 });
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .03;
  sun.shadow.radius = 5;
  const coolFill = new THREE.PointLight('#8fb0d8', 14 + day * 26, 30, 2);
  coolFill.position.set(-7, 6, 9);
  scene.add(coolFill);
  /* The screens light the desk; they carry the room at night. */
  const monitorGlow = new THREE.PointLight('#a8dc6c', 5 + (1 - day) * 9, 9, 1.8);
  monitorGlow.position.set(.9, 2.3, .4);
  scene.add(monitorGlow);
  const chatGlow = new THREE.PointLight('#d9a0c0', 2 + (1 - day) * 4, 5, 2);
  chatGlow.position.set(-4.2, 1.4, 1.9);
  scene.add(chatGlow);
  const baseExposure = 1.02 + (1 - day) * .22;

  /* ---------- Room: dark walls, carpet, French doors, calendar, window ---------- */

  box(44, .3, 34, mat.carpet, scene, 0, -3.15, 4, 0);
  box(44, 16, .3, mat.wall, scene, 0, 5, -6.15, 0);
  box(.3, 16, 34, mat.wall, scene, -13, 5, 4, 0);
  box(.3, 16, 34, mat.wall, scene, 13, 5, 4, 0);
  box(44, .5, .1, mat.trim, scene, 0, -2.75, -5.95, 0);

  /* French doors on the back wall. */
  const doors = group(-2.3, -3, -5.98);
  const glassColor = new THREE.Color('#1b2128').lerp(new THREE.Color('#7f8a90'), day);
  const doorGlass = new THREE.MeshStandardMaterial({ color: glassColor, roughness: .25, metalness: .1, emissive: glassColor, emissiveIntensity: .35 });
  box(.34, 8.7, .2, mat.trim, doors, -2.5, 4.35, 0, .02);
  box(.34, 8.7, .2, mat.trim, doors, 2.5, 4.35, 0, .02);
  box(5.5, .36, .24, mat.trim, doors, 0, 8.68, 0, .03);
  for (const side of [-1, 1]) {
    const leaf = group(side * 1.17, 0, .02, doors);
    plane(1.6, 5.6, doorGlass, leaf, 0, 5.3, .03);
    box(.3, 8.5, .12, mat.trim, leaf, -.95, 4.25, 0, .015);
    box(.3, 8.5, .12, mat.trim, leaf, .95, 4.25, 0, .015);
    box(2.2, .32, .12, mat.trim, leaf, 0, 8.34, 0, .015);
    box(2.2, 2.4, .12, mat.trim, leaf, 0, 1.3, 0, .015);
    box(.07, 5.7, .1, mat.trim, leaf, 0, 5.3, .03, 0);
    for (let i = 1; i < 4; i++) box(1.6, .07, .1, mat.trim, leaf, 0, 2.5 + i * 1.4, .03, 0);
  }
  sphere(.07, mat.gold, doors, -.16, 4, .14);
  sphere(.07, mat.gold, doors, .16, 4, .14);

  /* Wall calendar. */
  const calendar = group(4.6, 5.05, -5.95);
  box(5.1, 3.12, .05, mat.white, calendar, 0, 0, 0, .01);
  plane(4.96, 3, new THREE.MeshStandardMaterial({ map: calendarSheet.texture, roughness: .85 }), calendar, 0, 0, .03);
  register(calendar, 'talks', [0, 0, .1], 0);

  /* Light switch. */
  const lightSwitch = group(-9.2, 1.9, -5.98);
  box(.62, .9, .05, mat.white, lightSwitch, 0, 0, 0, .02);
  for (const x of [-.14, .14]) box(.17, .42, .05, mat.trim, lightSwitch, x, 0, .03, .01);

  /* Window with shutters on the right wall: where the daylight comes from. */
  const windowColor = new THREE.Color('#0c1422').lerp(new THREE.Color('#f6ecd8'), day);
  const windowGroup = group(12.8, 3.4, 2.4);
  windowGroup.rotation.y = -Math.PI / 2;
  plane(6.4, 8.2, new THREE.MeshBasicMaterial({ color: windowColor }), windowGroup, 0, 0, 0);
  for (const x of [-3.3, 0, 3.3]) box(.3, 8.6, .16, mat.trim, windowGroup, x, 0, .08, .02);
  for (const y of [-4.2, 4.2]) box(6.9, .3, .16, mat.trim, windowGroup, 0, y, .08, .02);
  for (let i = 0; i < 26; i++) {
    const slat = box(6.3, .2, .03, mat.trim, windowGroup, 0, -3.9 + i * .31, .06, 0);
    slat.rotation.x = .7;
  }

  /* ---------- Desk: cherry top on a white standing frame ---------- */

  const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;
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
  box(14.6, .32, 5.7, mat.wood, scene, 0, -.16, 0, .06);
  for (const x of [-5.7, 5.7]) {
    box(.55, 2.6, .95, mat.frame, scene, x, -1.62, 0, .04);
    box(.6, .22, 4.6, mat.frame, scene, x, -2.89, 0, .05);
  }
  box(11.4, .5, .28, mat.frame, scene, 0, -.57, 0, .03);
  box(9.4, .03, 3.3, mat.deskMat, scene, .95, .015, 1.05, .012);

  /* Cables and a power strip on the carpet. */
  box(1.9, .18, .42, mat.white, scene, 1.6, -2.91, -.6, .04);
  wire([[1.6, -2.95, -.6], [.2, -2.97, .6], [-1.6, -2.97, .1], [-3.4, -2.97, 1.4], [-5.4, -2.97, .5]], .035, mat.black, scene);
  wire([[2.3, -2.95, -.5], [3.6, -2.97, .9], [5, -2.97, .2], [5.6, -1.5, -.2], [5.3, -.4, -.9]], .03, mat.black, scene);
  wire([[1.1, -2.95, -.7], [.4, -1.6, -1.6], [.8, -.4, -2.1]], .03, mat.black, scene);

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

  /* ---------- Monitors ---------- */

  function monitor(x, y, z, width, height, screen) {
    const g = group(x, y, z);
    box(width + .14, height + .14, .16, mat.black, g, 0, 0, 0, .04);
    plane(width, height, glowing(screen), g, 0, 0, .085);
    box(.42, y, .12, mat.darkMetal, g, 0, -y / 2, -.16, .03);
    box(2.5, .07, 1.25, mat.darkMetal, g, 0, -y + .035, -.05, .03);
    return g;
  }
  const mainMonitor = monitor(.9, 2.5, -1.55, 6.7, 2.84, mainScreen);
  box(.62, .2, .22, mat.black, mainMonitor, 0, 1.6, .02, .05);
  sphere(.055, mat.lens, mainMonitor, 0, 1.6, .13);
  register(mainMonitor, 'work', [0, .2, .1], 0);

  const storyMonitor = monitor(-4.75, 2.2, -1.45, 4.4, 2.5, storyScreen);
  storyMonitor.rotation.y = .2;
  register(storyMonitor, 'story', [0, .2, .1], 0);

  /* ---------- Laptops ---------- */

  const keyboardMaterial = new THREE.MeshStandardMaterial({ map: keyboardSheet.texture, roughness: .7 });
  function laptop(x, y, z, screen, openAngle) {
    const g = group(x, y, z);
    box(3.05, .11, 2.08, mat.aluminium, g, 0, .055, 0, .05);
    const keys = plane(2.62, 1.06, keyboardMaterial, g, 0, .112, -.32);
    keys.rotation.x = -Math.PI / 2;
    const pad = plane(1.15, .66, standard('#565a61', .3, .7), g, 0, .112, .62);
    pad.rotation.x = -Math.PI / 2;
    const lid = group(0, .11, -1.02, g);
    lid.rotation.x = -openAngle;
    box(3.05, 2.04, .07, mat.aluminium, lid, 0, 1.02, 0, .05);
    box(2.97, 1.96, .02, mat.black, lid, 0, 1.02, .037, .03);
    plane(2.82, 1.83, glowing(screen), lid, 0, 1.03, .05);
    return g;
  }
  const terminalLaptop = laptop(.35, .03, 1.2, terminalScreen, .2);
  contact(.35, 1.2, 3.9, 2.9, .6);
  register(terminalLaptop, 'rig', [0, 1.25, -1.1]);

  const chatLaptop = laptop(-4.75, .16, 1.55, chatScreen, .16);
  chatLaptop.rotation.set(.13, .4, 0, 'YXZ');
  const laptopStand = box(2.3, .26, .5, mat.darkMetal, scene, -5.1, .13, .75, .04);
  laptopStand.rotation.y = .4;
  contact(-4.75, 1.5, 4.2, 3.1, .6, .006);
  register(chatLaptop, 'contact', [0, 1.25, -1.1]);

  /* ---------- Microphone on its boom arm ---------- */

  const mic = group(-1.95, 0, 2.05);
  mic.rotation.y = .25;
  cylinder(.27, .27, 1.05, mat.charcoal, mic, 0, 1.02, 0, 40);
  cylinder(.29, .29, .1, mat.black, mic, 0, .5, 0, 40);
  cylinder(.2, .24, .12, mat.black, mic, 0, .41, 0, 32);
  mesh(new THREE.CapsuleGeometry(.36, .62, 8, 28), mat.foam, mic, 0, 1.98, 0);
  box(.2, .2, .02, mat.yellow, mic, 0, .86, .272, .004);
  wire([[-.3, 1.05, 0], [-.42, 1.05, -.28], [0, 1.08, -.56], [.42, 1.05, -.28], [.3, 1.05, 0]], .04, mat.black, mic);
  for (const x of [-.34, .34]) {
    const knob = cylinder(.09, .09, .1, mat.black, mic, x, 1.05, 0, 20);
    knob.rotation.z = Math.PI / 2;
  }
  beam([0, 1.08, -.56], [0, 1.62, -.78], .05, mat.black, mic);
  register(mic, 'podcast', [0, 2.45, 0]);
  contact(-1.95, 2.05, 1.5, 1.3, .45);

  /* The arm: clamped to the back-left corner, elbow above the laptop. */
  mic.updateMatrixWorld(true);
  const armEnd = mic.localToWorld(new THREE.Vector3(0, 1.62, -.78));
  const clampPoint = [-6.85, 0, -1.9], shoulder = [-6.85, 2.55, -1.9], elbow = [-3.7, 3.25, .5];
  box(.6, .5, .5, mat.black, scene, clampPoint[0], -.05, clampPoint[2], .05);
  beam(clampPoint, shoulder, .09, mat.black, scene);
  for (const offset of [-.07, .07]) {
    beam([shoulder[0], shoulder[1] + offset, shoulder[2]], [elbow[0], elbow[1] + offset, elbow[2]], .045, mat.black, scene);
    beam([elbow[0], elbow[1] + offset, elbow[2]], [armEnd.x, armEnd.y + offset, armEnd.z], .045, mat.black, scene);
  }
  for (const joint of [shoulder, elbow, [armEnd.x, armEnd.y, armEnd.z]]) sphere(.15, mat.black, scene, ...joint);
  wire([[shoulder[0], shoulder[1] - .2, shoulder[2]], [-5.6, 1.9, -.9], [-4.4, 2.3, .1], elbow, [-2.9, 2.1, 1.1], [armEnd.x, armEnd.y - .25, armEnd.z]], .022, mat.black, scene);

  /* ---------- Papers, lunch and everything else on the desk ---------- */

  for (let i = 0; i < 7; i++) {
    const sheet = box(1.7, .012, 2.2, mat.paper, scene, 2.3 + random() * 1.1, .012 + i * .013, -.35 + random() * .5, 0);
    sheet.rotation.y = (random() - .5) * 1.3;
  }
  const lunch = group(2.55, .11, -.1);
  cylinder(.98, .7, .07, mat.white, lunch, 0, .035, 0, 48);
  for (let i = 0; i < 2; i++) {
    const cake = cylinder(.5, .5, .06, mat.pancake, lunch, -.22 + i * .2, .1 + i * .05, -.12 + i * .16, 28);
    cake.rotation.z = .05 * i;
  }
  for (let i = 0; i < 5; i++) sphere(.1, mat.berry, lunch, .28 + Math.cos(i * 1.3) * .2, .12, -.5 + Math.sin(i * 1.3) * .16, 1, 1.2, 1);
  for (let i = 0; i < 6; i++) sphere(.13, mat.egg, lunch, .42 + Math.cos(i * 1.1) * .2, .11, .28 + Math.sin(i * 1.1) * .18, 1, .6, 1);
  const fork = box(.07, .02, 1.1, mat.juice, lunch, .15, .2, .3, .008);
  fork.rotation.y = .9;

  /* Writing: a teal folder with a stack of pages and a pen. */
  const writing = group(6.05, 0, 1.75);
  writing.rotation.y = -.22;
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
  contact(6.05, 1.75, 3, 2.6, .55, .006);
  register(writing, 'writing', [0, .45, 0]);

  /* Studio speaker with its white cone. */
  const studioSpeaker = group(6.35, 0, -1.25);
  studioSpeaker.rotation.y = -.3;
  box(1.75, 2.7, 1.6, mat.plastic, studioSpeaker, 0, 1.35, 0, .08);
  const woofer = cylinder(.58, .58, .04, mat.white, studioSpeaker, 0, 1.02, .81, 48);
  woofer.rotation.x = Math.PI / 2;
  const surround = mesh(new THREE.TorusGeometry(.6, .06, 10, 48), mat.black, studioSpeaker, 0, 1.02, .82);
  surround.castShadow = false;
  sphere(.2, mat.white, studioSpeaker, 0, 1.02, .8, 1, 1, .45);
  const tweeter = cylinder(.24, .24, .04, mat.black, studioSpeaker, 0, 2.1, .81, 32);
  tweeter.rotation.x = Math.PI / 2;
  sphere(.1, mat.charcoal, studioSpeaker, 0, 2.1, .82, 1, 1, .5);

  /* Small amp speaker with brass knobs. */
  const amp = group(3.75, .03, .95);
  amp.rotation.y = -.18;
  box(1.55, 1.15, .78, mat.black, amp, 0, .575, 0, .1);
  plane(1.3, .78, standard('#1d1a17', 1), amp, 0, .5, .395);
  box(1.3, .03, .32, mat.gold, amp, 0, 1.155, 0, .01);
  for (let i = 0; i < 3; i++) cylinder(.075, .075, .1, mat.gold, amp, -.32 + i * .32, 1.21, 0, 20);
  contact(3.75, .95, 2.1, 1.4, .6);

  /* Tumbler with handle and straw. */
  const tumbler = group(5.1, 0, .75);
  cylinder(.43, .33, 1.5, mat.black, tumbler, 0, .75, 0, 40);
  cylinder(.45, .45, .1, mat.silver, tumbler, 0, 1.54, 0, 40);
  const straw = cylinder(.035, .035, 1, mat.silver, tumbler, .05, 1.95, 0, 12);
  straw.rotation.z = -.12;
  const handle = mesh(new THREE.TorusGeometry(.33, .07, 10, 28, Math.PI), mat.black, tumbler, .42, .95, 0);
  handle.rotation.z = -Math.PI / 2;
  contact(5.1, .75, 1.5, 1.3, .6, .006);

  /* Juice, phone and sunglasses. */
  const juice = group(4.25, .03, 1.95);
  cylinder(.17, .19, .72, mat.juice, juice, 0, .36, 0, 24);
  cylinder(.13, .13, .12, mat.white, juice, 0, .78, 0, 24);
  box(.3, .3, .02, mat.white, juice, 0, .36, .185, .01);
  const phone = box(.78, .05, 1.55, mat.black, scene, 3.05, .057, 2.05, .02);
  phone.rotation.y = .55;
  const shades = group(2, .1, 1.75);
  shades.rotation.y = .5;
  for (const x of [-.26, .26]) sphere(.22, mat.lens, shades, x, 0, 0, 1, .16, .75);
  box(.14, .03, .04, mat.black, shades, 0, .01, -.08, .01);

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
  const focusViews = {
    work: { position: [-.4, 3.5, 8], look: [-.4, 2.5, -1.55] },
    story: { position: [-4.2, 4.3, 7.2], look: [-4.75, 2.3, -1.45] },
    rig: { position: [.35, 3.4, 7.4], look: [.35, 1, .6] },
    contact: { position: [-3, 3.4, 7.6], look: [-4.75, 1, 1.2] },
    podcast: { position: [-1.1, 3, 8.2], look: [-1.95, 1.4, 2.05] },
    writing: { position: [4.96, 4.6, 7.4], look: [6.05, .1, 1.6] },
    talks: { position: [2.86, 4.9, 7.9], look: [4.6, 4.9, -5.95] }
  };
  for (const view of Object.values(focusViews)) {
    view.position = new THREE.Vector3(...view.position);
    view.look = new THREE.Vector3(...view.look);
  }

  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const baseLook = new THREE.Vector3(), orbitPosition = new THREE.Vector3(), cameraLook = new THREE.Vector3();
  const focusPosition = new THREE.Vector3(), focusLook = new THREE.Vector3(), projected = new THREE.Vector3();
  let width = 0, height = 0, compact = false, paused = body.classList.contains('motion-paused');
  let exploring = false, dragging = false, moved = false, downX = 0, downY = 0, startYaw = 0, startPitch = 0;
  let yaw = 0, pitch = 0, smoothYaw = 0, smoothPitch = 0, zoom = 1, smoothZoom = 1;
  let hoverKey = null, focusKey = null, lastFocusKey = 'work', focusAmount = 0;
  let introAmount = body.classList.contains('intro') ? 0 : 1, introGoal = introAmount;
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 1.75, 2600 / width));
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
    const span = compact ? 12 : 25;
    const distance = clamp(span / 2 / Math.tan(halfHorizontal), 12, 27) * smoothZoom;
    baseLook.set(compact ? -.2 : -1.9, compact ? 3.5 : 2.9, -1);

    const drift = paused ? 0 : Math.sin(elapsed * .14) * .012;
    const angle = smoothYaw + drift + (paused ? 0 : pointer.x * -.035);
    const elevation = clamp(.3 + smoothPitch + (paused ? 0 : pointer.y * -.02), .06, .62);
    const intro = 1 - ease(clamp(introAmount, 0, 1));
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
    renderer.toneMappingExposure = baseExposure * (1 - intro * .62);
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
      item.element.style.visibility = projected.z > 1 || x < 30 || x > width - 30 || y < 70 || y > height * .8 ? 'hidden' : 'visible';
    }
  }

  function setHovered(key) {
    if (key === hoverKey) return;
    hoverKey = key;
    canvas.style.cursor = key && !exploring ? 'pointer' : dragging ? 'grabbing' : 'grab';
    targets.forEach((item, name) => item.element?.classList.toggle('is-hover', name === key));
    requestDraw();
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    if (panelOpen || exploring || introGoal < 1) return null;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickables, false)[0]?.object.userData.section || null;
  }

  /* The camera moves in first; the panel follows. */
  function openFromScene(key) {
    clearTimeout(openTimer);
    const announce = () => window.dispatchEvent(new CustomEvent('studio:open', { detail: { section: key } }));
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
      if (moved && introGoal === 1) {
        yaw = clamp(startYaw - dx * .0028, -.55, .55);
        pitch = clamp(startPitch + dy * .0022, -.16, .3);
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
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointerup', event => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (!moved) { const key = pick(event); if (key) openFromScene(key); }
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

  window.addEventListener('studio:enter', () => { introGoal = 1; if (paused) introAmount = 1; requestDraw(); });
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

  function draw(dt, instant = false) {
    if (!width || !height) return;
    placeCamera(dt, instant);
    drawTerminal(elapsed);
    for (const [key, item] of targets) {
      const goal = key === hoverKey && !panelOpen ? 1 : 0;
      item.hover += (goal - item.hover) * (instant ? 1 : Math.min(dt * 7, 1));
      item.group.position.y = item.group.userData.baseY + item.hover * item.lift;
      if (!item.lift) item.group.scale.setScalar(1 + item.hover * .018);
    }
    timeUniform.value = elapsed;
    placeLabels();
    renderer.render(scene, camera);
  }
  /* With motion paused there is no loop, so changes ask for a single frame. */
  function requestDraw() {
    if (paused && !contextLost) draw(0, true);
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now;
    elapsed += dt;
    draw(dt);
    if (!paused && !document.hidden) frameId = requestAnimationFrame(tick);
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

  body.classList.add('scene-3d');
  controls.hidden = false;
  resize();
  new ResizeObserver(resize).observe(viewport);
  if (!paused && !document.hidden) frameId = requestAnimationFrame(tick);
}
