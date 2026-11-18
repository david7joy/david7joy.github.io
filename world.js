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
  let record = null, soundOn = false;
  const halos = [], notes = [], stickerSheets = [];
  const targets = new Map();

  /* ---------- Small builders ---------- */

  const standard = (color, roughness = 0.65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mat = {
    wall: standard('#66735f', .95),
    trim: standard('#ece6d6', .7),
    carpet: standard('#77726a', 1),
    wood: new THREE.MeshPhysicalMaterial({ color: '#7c3d24', roughness: .5, clearcoat: .45, clearcoatRoughness: .3 }),
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
  const deck = [{ title: 'Rig: give agents the whole loop', own: true, tag: 'INDEPENDENT · IN PROGRESS' }];
  for (let i = 0; i < Math.max(companyItems.length, ownItems.length); i++) {
    if (companyItems[i]) deck.push({ title: companyItems[i].title, own: false, tag: 'COMPANY · COCKROACH LABS' });
    if (ownItems[i]) deck.push({ title: ownItems[i].title, own: true, tag: 'INDEPENDENT · OPEN SOURCE' });
  }
  const deckPages = Math.max(1, Math.ceil(deck.length / 4));
  const mainScreen = surface(1280, 640);
  let mainPage = 0;
  function drawMainScreen() {
    const { ctx, width, height } = mainScreen;
    backdrop(ctx, width, height, '#12241a');
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8fa0a6';
    ctx.font = `500 24px ${FONT.mono}`;
    ctx.fillText('WORK', 64, 92);
    ctx.fillStyle = INK;
    ctx.font = `700 200px ${FONT.display}`;
    ctx.fillText(String(workItems.length || ''), 52, 300);
    ctx.font = `600 40px ${FONT.display}`;
    ctx.fillText('things shipped', 64, 364);
    [[WARM, `${companyItems.length} company, with my team`], [ACCENT, `${ownItems.length} independent, open source`]].forEach(([color, text], i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(74, 430 + i * 44, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe6e2';
      ctx.font = `500 25px ${FONT.sans}`;
      ctx.fillText(text, 98, 439 + i * 44);
    });
    for (let i = 0; i < deckPages; i++) {
      ctx.fillStyle = i === mainPage % deckPages ? INK : 'rgba(242, 244, 238, .25)';
      rounded(ctx, 64 + i * 30, 560, 20, 6, 3);
      ctx.fill();
    }
    deck.slice((mainPage % deckPages) * 4, (mainPage % deckPages) * 4 + 4).forEach((card, i) => {
      const x = 452 + (i % 2) * 396, y = 56 + Math.floor(i / 2) * 272;
      ctx.fillStyle = '#17212a';
      rounded(ctx, x, y, 372, 250, 22);
      ctx.fill();
      ctx.fillStyle = card.own ? ACCENT : WARM;
      rounded(ctx, x + 28, y + 30, 54, 8, 4);
      ctx.fill();
      ctx.font = `500 19px ${FONT.mono}`;
      ctx.fillText(card.tag, x + 28, y + 80);
      ctx.fillStyle = INK;
      ctx.font = `600 33px ${FONT.display}`;
      wrapText(ctx, card.title, x + 28, y + 130, 316, 40, 3);
    });
    sheen(ctx, width, height);
    mainScreen.texture.needsUpdate = true;
  }

  /* Left monitor: the career, year by year, as rising steps. The highlight walks through them. */
  const storyScreen = surface(1280, 640);
  let storyStep = -1, storyFrame = -1;
  const career = (data.career || []).filter(step => Number.isFinite(Number(step.year)) && step.onScreen !== false).sort((a, b) => a.year - b.year);
  function drawStoryScreen(time = 0) {
    const { ctx, width, height } = storyScreen;
    backdrop(ctx, width, height, '#181a2a');
    const count = Math.max(career.length, 1);
    const active = storyStep < 0 ? count - 1 : storyStep % count;
    const step = career[active] || {};
    ctx.textBaseline = 'alphabetic';

    /* Top: the stop being shown. */
    ctx.fillStyle = '#8fa0a6';
    ctx.font = `500 24px ${FONT.mono}`;
    ctx.fillText('MY CAREER', 72, 96);
    ctx.textAlign = 'right';
    ctx.fillText(`${String(active + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`, width - 72, 96);
    ctx.textAlign = 'left';
    ctx.fillStyle = WARM;
    ctx.font = `500 30px ${FONT.mono}`;
    ctx.fillText(`${step.from || step.year || ''} – ${step.to === 'Present' ? 'now' : (step.to || '')}`, 72, 164);
    ctx.fillStyle = INK;
    ctx.font = `700 78px ${FONT.display}`;
    ctx.fillText(fit(ctx, step.org || '', width - 144), 72, 248);
    ctx.fillStyle = '#c3ccd2';
    ctx.font = `500 30px ${FONT.sans}`;
    ctx.fillText(fit(ctx, step.roles?.[0]?.title || '', width - 144), 72, 300);
    const awards = step.awards?.length || 0;
    if (awards) {
      const label = `★ ${awards} award${awards > 1 ? 's' : ''}`;
      ctx.font = `500 24px ${FONT.mono}`;
      const w = ctx.measureText(label).width + 36;
      ctx.fillStyle = 'rgba(240, 168, 104, .16)';
      rounded(ctx, 72, 326, w, 44, 10);
      ctx.fill();
      ctx.fillStyle = WARM;
      ctx.fillText(label, 90, 357);
    }

    /* Bottom: the whole path as a rising line, lit up to the stop on show, with a spark running along it. */
    const left = 96, right = width - 96, low = 528, high = 418;
    const point = i => {
      const t = count > 1 ? i / (count - 1) : 0;
      return [left + (right - left) * t, low - (low - high) * t * t];
    };
    const trace = upTo => {
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const u = upTo * k / 60, [px] = [left + (right - left) * u], py = low - (low - high) * u * u;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
    };
    const reach = count > 1 ? active / (count - 1) : 1;
    const fill = ctx.createLinearGradient(0, high - 40, 0, height);
    fill.addColorStop(0, 'rgba(185, 163, 255, .16)');
    fill.addColorStop(1, 'rgba(185, 163, 255, 0)');
    trace(reach);
    ctx.lineTo(left + (right - left) * reach, height);
    ctx.lineTo(left, height);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(242, 244, 238, .16)';
    ctx.lineWidth = 4;
    trace(1);
    ctx.stroke();
    const stroke = ctx.createLinearGradient(left, 0, right, 0);
    stroke.addColorStop(0, '#f0a868');
    stroke.addColorStop(1, '#b9a3ff');
    ctx.save();
    ctx.shadowColor = 'rgba(185, 163, 255, .7)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 6;
    trace(reach);
    ctx.stroke();
    const spark = (time * .16) % 1, sx = left + (right - left) * spark, sy = low - (low - high) * spark * spark;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    career.forEach((stop, i) => {
      const [px, py] = point(i), on = i === active, passed = i < active;
      if (on) {
        const pulse = 18 + (Math.sin(time * 4) * .5 + .5) * 14;
        ctx.fillStyle = 'rgba(240, 168, 104, .22)';
        ctx.beginPath();
        ctx.arc(px, py, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = on ? WARM : passed ? ACCENT : '#5d6a78';
      ctx.beginPath();
      ctx.arc(px, py, on ? 14 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = i === 0 ? 'left' : i === count - 1 ? 'right' : 'center';
      const tx = i === 0 ? px - 12 : i === count - 1 ? px + 12 : px;
      ctx.fillStyle = on ? WARM : '#8fa0a6';
      ctx.font = `500 22px ${FONT.mono}`;
      ctx.fillText(String(stop.year), tx, py + 46);
      ctx.fillStyle = on ? INK : '#9aa7b0';
      ctx.font = `600 24px ${FONT.display}`;
      ctx.fillText(stop.short || stop.org || '', tx, py + 76);
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
  function drawPosters() {
    /* 1. "Be fearless": a retro sunset, the sun sliced by the horizon. */
    {
      const { ctx, width, height } = posters[0];
      ctx.fillStyle = '#fbf6ea';
      ctx.fillRect(0, 0, width, height);
      const x = 40, y = 40, w = width - 80, h = height - 80;
      const sky = ctx.createLinearGradient(0, y, 0, y + h);
      sky.addColorStop(0, '#24093a');
      sky.addColorStop(.42, '#b21e5b');
      sky.addColorStop(.72, '#ff6a1f');
      sky.addColorStop(1, '#ffc94d');
      ctx.fillStyle = sky;
      ctx.fillRect(x, y, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const sunY = y + h * .86, sun = ctx.createLinearGradient(0, sunY - 250, 0, sunY + 250);
      sun.addColorStop(0, '#fff3a6');
      sun.addColorStop(1, '#ff8a3c');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(width / 2, sunY, 250, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c2305a';
      for (let i = 0; i < 6; i++) ctx.fillRect(x, sunY + 16 + i * 44, w, 8 + i * 5);
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff4e0';
      fitted(ctx, 'BE', 700, w - 120, 190);
      ctx.fillText('BE', width / 2, y + 200);
      fitted(ctx, 'FEARLESS', 700, w - 90, 190);
      ctx.fillText('FEARLESS', width / 2, y + 330);
      ctx.fillStyle = '#ffd9a8';
      ctx.font = `500 30px ${FONT.mono}`;
      ctx.fillText('I N   T H E   P U R S U I T   O F', width / 2, y + 400);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 54px ${FONT.display}`;
      ctx.fillText('what sets your', width / 2, y + 478);
      ctx.fillText('soul on fire.', width / 2, y + 542);
      ctx.textAlign = 'left';
      posters[0].texture.needsUpdate = true;
    }
    /* 2. "Do what is right": the harder path up the mountain. */
    {
      const { ctx, width, height } = posters[1];
      ctx.fillStyle = '#fbf6ea';
      ctx.fillRect(0, 0, width, height);
      const x = 40, y = 40, w = width - 80, h = height - 80;
      const wash = ctx.createLinearGradient(x, y, x + w, y + h);
      wash.addColorStop(0, '#0a1550');
      wash.addColorStop(.55, '#4520a8');
      wash.addColorStop(1, '#0fb5a6');
      ctx.fillStyle = wash;
      ctx.fillRect(x, y, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const peak = (px, top, half, colour) => {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.moveTo(px, top);
        ctx.lineTo(px + half, y + h);
        ctx.lineTo(px - half, y + h);
        ctx.closePath();
        ctx.fill();
      };
      peak(190, y + h * .62, 330, 'rgba(10, 21, 80, .55)');
      peak(560, y + h * .56, 360, 'rgba(18, 12, 70, .6)');
      peak(380, y + h * .5, 300, '#120a4a');
      /* The path: steep, with switchbacks, ending at a bright summit. */
      ctx.strokeStyle = '#ffe66d';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([2, 20]);
      ctx.beginPath();
      [[250, y + h - 20], [430, y + h * .86], [320, y + h * .74], [420, y + h * .64], [350, y + h * .57], [380, y + h * .5]].forEach(([px, py], i) => { if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(380, y + h * .5 - 6, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      fitted(ctx, 'DO WHAT', 700, w - 100, 150);
      ctx.fillText('DO WHAT', width / 2, y + 170);
      fitted(ctx, 'IS RIGHT,', 700, w - 100, 150);
      ctx.fillText('IS RIGHT,', width / 2, y + 290);
      ctx.fillStyle = '#ffe66d';
      ctx.font = `600 62px ${FONT.display}`;
      ctx.fillText('not what is easy.', width / 2, y + 384);
      ctx.textAlign = 'left';
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

  /* The phone: a short conversation that leads to Contact. */
  const chatScreen = surface(400, 840);
  function drawChatScreen() {
    const { ctx, width, height } = chatScreen;
    ctx.fillStyle = '#f7f5f0';
    ctx.fillRect(0, 0, width, height);
    const top = ctx.createLinearGradient(0, 0, width, 0);
    top.addColorStop(0, '#8a2140');
    top.addColorStop(1, '#3c1d63');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, width, 132);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 34px ${FONT.display}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('Say hello', 32, 84);
    const bubble = (text, x, y, w, fill, color) => {
      ctx.fillStyle = fill;
      rounded(ctx, x, y, w, 76, 26);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = `500 27px ${FONT.sans}`;
      ctx.fillText(text, x + 24, y + 40);
    };
    bubble('Hey David', 28, 190, 190, '#e4e1da', '#1c2228');
    bubble('Got an idea to build?', 28, 286, 318, '#e4e1da', '#1c2228');
    bubble('Let’s talk.', 196, 400, 176, '#3c1d63', '#ffffff');
    ctx.strokeStyle = '#c9c5bb';
    ctx.lineWidth = 3;
    rounded(ctx, 28, height - 118, width - 56, 72, 22);
    ctx.stroke();
    ctx.fillStyle = '#8b8a84';
    ctx.font = `400 26px ${FONT.sans}`;
    ctx.fillText('Message…', 54, height - 80);
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
  if (document.fonts?.load) {
    Promise.all(['600 37px Caveat', '600 50px "Bricolage Grotesque"', '700 50px "Bricolage Grotesque"', '500 27px "DM Sans"', '500 38px "JetBrains Mono"'].map(font => document.fonts.load(font)))
      .then(() => { drawSurfaces(); requestDraw(); })
      .catch(() => {});
  }

  /* ---------- Light: sun through the window wall, soft fill from the room ---------- */

  const hemisphere = new THREE.HemisphereLight('#e4efe0', '#6b5438', .35 + day * 1.05);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(day > .5 ? '#fff1d6' : '#9fb7dc', .25 + day * 3);
  sun.position.set(7, 13, -15);
  sun.target.position.set(0, 0, 2);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(innerWidth < 760 ? 2048 : 4096, innerWidth < 760 ? 2048 : 4096);
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
      vec3 dayCol=mix(vec3(.84,.91,.95),vec3(.27,.55,.88),h);
      vec3 duskCol=mix(vec3(1.,.6,.34),vec3(.34,.36,.62),smoothstep(0.,.42,d.y));
      vec3 nightCol=mix(vec3(.05,.08,.14),vec3(.012,.02,.05),h);
      vec3 col=mix(nightCol,dayCol,uDay);col=mix(col,duskCol,uWarm*.85);
      vec2 cell=floor(d.xy/(abs(d.z)+.4)*240.);
      col+=step(.9972,hash(cell))*(1.-uDay)*smoothstep(.04,.3,d.y)*.85;
      vec2 c=d.xz/(d.y+.3)*1.4+vec2(uTime*.006,0.);
      float cl=noise(c*1.5+3.)*.6+noise(c*3.7)*.3+noise(c*8.)*.1;
      float cloud=smoothstep(.5,.74,cl)*smoothstep(0.,.2,d.y);
      vec3 cloudCol=mix(vec3(.16,.18,.26),vec3(1.),uDay);cloudCol=mix(cloudCol,vec3(1.,.74,.58),uWarm*.75);
      col=mix(col,cloudCol,cloud*.85);
      float s=max(dot(d,normalize(uSun)),0.);
      col+=vec3(1.,.92,.72)*(smoothstep(.9988,.9994,s)*1.3+pow(s,160.)*.55+pow(s,12.)*.2)*smoothstep(-.12,.04,uSun.y);
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
      float steps=n*18.;float terrace=(floor(steps)+smoothstep(0.,.3,fract(steps)))/18.;
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
      col*=band<.22?.76:1.;
      col*=.84+.3*noise(vP*.07+31.);
      float trees=smoothstep(.58,.72,noise(vP*.55))*smoothstep(.45,.62,noise(vP*.045+70.));
      col=mix(col,vec3(.03,.15,.06),trees*.85);
      if(mod(idx,6.)==2.&&band>.24&&band<.44)col=mix(col,vec3(.66,.45,.22),.7*near+.2);
      col=mix(col,col*vec3(1.3,.86,.58),uWarm*.6);
      col=mix(col,mix(vec3(.80,.89,.93),vec3(1.,.72,.5),uWarm*.75),smoothstep(.2,1.,vFar)*.84);
      col=mix(vec3(dot(col,vec3(.3,.6,.1))),col,.62);
      col=mix(col,mix(vec3(.80,.89,.93),vec3(1.,.72,.5),uWarm*.75),.2);
      col=mix(col*vec3(.10,.15,.24),col,uDay);
      gl_FragColor=vec4(col,1.);}`
  }));
  terrain.position.set(0, -7, -102);
  terrain.frustumCulled = false;
  scene.add(terrain);

  /* ---------- Room: oak floor, a solid wall behind the title, glass from there to the right ---------- */

  mat.floor = standard('#a47c52', .5);
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
        const w = 150 + next() * 160, light = 150 + next() * 34;
        ctx.fillStyle = `rgb(${light + 14}, ${light - 30}, ${light - 74})`;
        ctx.fillRect(x, row * 64, w - 1, 63);
        ctx.strokeStyle = 'rgba(60, 36, 16, .16)';
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
    ctx.fillStyle = 'rgba(40, 24, 10, .28)';
    for (let row = 0; row <= 8; row++) ctx.fillRect(0, row * 64 - 1, 512, 2);
    planks.texture.wrapS = planks.texture.wrapT = THREE.RepeatWrapping;
    planks.texture.repeat.set(2.5, 8);
    planks.texture.needsUpdate = true;
  })();
  const floorPlanks = plane(46, 34, new THREE.MeshStandardMaterial({ map: planks.texture, roughness: .42, metalness: .05 }), scene, 0, -2.995, 4);
  floorPlanks.rotation.x = -Math.PI / 2;

  /* The day turns: the sun crosses the sky and every light follows it. */
  const fixedHour = new URLSearchParams(location.search).has('hour');
  const DAY_SECONDS = 300;
  let dayPhase = (hour / 24) % 1, exposure = 1;
  const moonlight = new THREE.Color('#9fb7dc'), lowSun = new THREE.Color('#ffae62'), highSun = new THREE.Color('#fff1d6');
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

  /* Back wall, built around the window opening (x -2.1 to 9.6, y -1.7 to 10). */
  box(14.9, 17, .4, mat.wall, scene, -9.55, 5, -6.2, 0);
  box(7.4, 17, .4, mat.wall, scene, 13.3, 5, -6.2, 0);
  box(11.7, 3.6, .4, mat.wall, scene, 3.75, 11.8, -6.2, 0);
  box(11.7, 1.4, .4, mat.wall, scene, 3.75, -2.4, -6.2, 0);
  box(12.1, .14, .9, mat.trim, scene, 3.75, -1.66, -6.05, .03);
  for (const side of [-1, 1]) box(.4, 17, 34, mat.wall, scene, side * 17, 5, 4, 0);
  box(34, .4, .1, mat.trim, scene, 0, -2.8, -5.98, 0);
  /* Slim steel frame: three tall panes and a transom. */
  for (let i = 1; i <= 4; i++) box(.11, 11.7, .16, mat.steel, scene, -6 + i * 3.9, 4.15, -6.2, 0);
  for (const y of [-1.62, 6.9, 9.96]) box(11.7, .11, .16, mat.steel, scene, 3.75, y, -6.2, 0);

  /* Wall calendar, above the left monitor. */
  const calendar = group(-3.72, 6.35, -5.96);
  calendar.scale.setScalar(.8);
  box(3.76, 2.34, .05, mat.white, calendar, 0, 0, 0, .01);
  plane(3.64, 2.22, new THREE.MeshStandardMaterial({ map: calendarSheet.texture, roughness: .85 }), calendar, 0, 0, .03);
  register(calendar, 'talks', [0, 1.4, .1], 0);

  /* The posters hang on the right-hand wall, above the guitar. */
  posters.forEach((poster, i) => {
    const frame = group(10.95 + i * 2.55, 5.65, -5.96);
    box(2.36, 3.5, .09, mat.steel, frame, 0, 0, 0, .02);
    plane(2.22, 3.33, new THREE.MeshStandardMaterial({ map: poster.texture, roughness: .7 }), frame, 0, 0, .055);
  });

  /* A guitar amp on the floor to the left, and an electric guitar hung on the wall under the calendar. */
  const guitarAmp = group(13.4, -3, -4.2);
  guitarAmp.rotation.y = -.35;
  box(3.3, 2.9, 1.5, mat.black, guitarAmp, 0, 1.45, 0, .1);
  plane(2.9, 1.95, standard('#3a332b', 1), guitarAmp, 0, 1.2, .76);
  box(2.9, .34, .04, mat.gold, guitarAmp, 0, 2.48, .76, .01);
  for (let i = 0; i < 6; i++) {
    const knob = cylinder(.09, .09, .1, mat.black, guitarAmp, -1.1 + i * .44, 2.48, .81, 16);
    knob.rotation.x = Math.PI / 2;
  }
  box(1.1, .08, .22, mat.plastic, guitarAmp, 0, 2.95, 0, .03);

  const guitar = group(12.1, -2.5, -5.9);
  guitar.scale.setScalar(1.12);
  guitar.rotation.z = -.07;
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(0, -1);
  bodyShape.bezierCurveTo(.98, -1.06, 1.02, -.2, .72, .1);
  bodyShape.bezierCurveTo(.6, .3, .76, .56, .7, .96);
  bodyShape.bezierCurveTo(.5, .9, .3, .62, .18, .56);
  bodyShape.lineTo(-.18, .56);
  bodyShape.bezierCurveTo(-.36, .7, -.5, 1.1, -.76, 1.16);
  bodyShape.bezierCurveTo(-.82, .6, -.62, .3, -.74, .1);
  bodyShape.bezierCurveTo(-1.02, -.2, -.98, -1.06, 0, -1);
  const guitarBody = mesh(new THREE.ExtrudeGeometry(bodyShape, { depth: .16, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 3, curveSegments: 24 }),
    new THREE.MeshPhysicalMaterial({ color: '#8f1b1b', roughness: .22, clearcoat: 1, clearcoatRoughness: .08 }), guitar, 0, 1.45, 0);
  const guard = mesh(new THREE.ExtrudeGeometry(bodyShape, { depth: .012, bevelEnabled: false, curveSegments: 24 }), standard('#101113', .35), guitar, .05, 1.36, .19);
  guard.scale.set(.62, .7, 1);
  for (const y of [1.02, 1.3, 1.58]) box(.44, .085, .03, standard('#ece5d2', .5), guitar, .02, y, .215, .02);
  box(.48, .13, .05, mat.silver, guitar, .02, .8, .215, .01);
  for (const [x, y] of [[.42, .74], [.52, .98], [.34, .52]]) {
    const knob = cylinder(.055, .055, .05, mat.silver, guitar, x, y, .22, 14);
    knob.rotation.x = Math.PI / 2;
  }
  box(.27, 2.7, .1, mat.maple, guitar, 0, 3.3, .1, .03);
  box(.25, 2.6, .02, standard('#3a2718', .6), guitar, 0, 3.3, .16, 0);
  for (let i = 0; i < 9; i++) box(.25, .012, .025, mat.silver, guitar, 0, 2.2 + i * .27, .165, 0);
  const headstock = box(.38, .74, .08, mat.maple, guitar, -.04, 4.98, .08, .05);
  headstock.rotation.z = .06;
  for (let i = 0; i < 6; i++) cylinder(.035, .035, .1, mat.silver, guitar, -.26, 4.72 + i * .11, .08, 8).rotation.z = Math.PI / 2;
  for (const x of [-.08, -.03, .03, .08]) box(.006, 3.9, .004, mat.silver, guitar, x, 2.72, .18, 0);
  /* Wall hanger. */
  box(.5, .12, .3, mat.steel, guitar, 0, 4.5, .02, .02);
  void guitarBody;

  /* ---------- Desk: cherry top on a white standing frame ---------- */

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
  function monitor(x, y, z, width, height, screen, turn, tint) {
    const g = group(x, y, z);
    g.rotation.y = turn;
    /* A soft halo behind the panel, the way a bright screen bleeds onto the wall. */
    const halo = new THREE.MeshBasicMaterial({ map: haloTexture, color: tint, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending });
    halos.push(halo);
    plane(width * 1.7, height * 2, halo, g, 0, 0, -.2);
    box(width + .1, height + .1, .12, mat.black, g, 0, 0, 0, .04);
    plane(width, height, glowing(screen), g, 0, 0, .065);
    box(.5, .16, .05, mat.darkMetal, g, 0, -height / 2 - .02, .05, .01);
    box(.36, y, .12, mat.darkMetal, g, 0, -y / 2, -.14, .03);
    box(2.4, .07, 1.3, mat.darkMetal, g, 0, -y + .035, -.05, .03);
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
  register(mainMonitor, 'work', [.8, 1.78, .1], 0);
  note(scene, -4.85, 4.86, -5.92, .06, '#f5e26b', ['Dec 15', 'webinar']);
  note(scene, -4.05, 4.84, -5.92, -.08, '#9fd4f5', ['Big Ideas', 'podcast']);
  note(scene, -3.25, 4.87, -5.92, .04, '#ff9ec4', ['ship it']);

  /* ---------- Keyboard and mouse in the middle ---------- */

  const keyboardMaterial = new THREE.MeshStandardMaterial({ map: keyboardSheet.texture, roughness: .7 });
  const keyboard = group(0, .03, 1.95);
  box(4.3, .13, 1.55, mat.aluminium, keyboard, 0, .065, 0, .06);
  const keyDeck = plane(4.1, 1.36, keyboardMaterial, keyboard, 0, .135, 0);
  keyDeck.rotation.x = -Math.PI / 2;
  keyboard.rotation.x = .04;
  sphere(.33, mat.white, scene, 3.1, .14, 2, .9, .42, 1.45);
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

  const phone = group(4.1, 0, 1.9);
  phone.rotation.y = -.2;
  const handset = group(0, .1, 0, phone);
  handset.rotation.x = -.36;
  box(.86, 1.72, .08, mat.black, handset, 0, .86, 0, .04);
  plane(.78, 1.64, glowing(chatScreen), handset, 0, .86, .045);
  box(.7, .1, .9, mat.darkMetal, phone, 0, .05, -.2, .03);
  box(.5, .9, .08, mat.darkMetal, phone, 0, .45, -.42, .02).rotation.x = -.36;
  contact(4.1, 1.9, 1.5, 1.5, .5, .006);
  register(phone, 'contact', [-.5, 2.15, -.5]);

  /* ---------- Microphone, on its boom arm, with room around it ---------- */

  const mic = group(-7.5, 0, 2);
  mic.rotation.y = .45;
  mic.scale.setScalar(1.35);
  cylinder(.27, .27, 1.05, mat.charcoal, mic, 0, 1.02, 0, 40);
  for (const y of [.62, 1.42]) cylinder(.278, .278, .05, mat.silver, mic, 0, y, 0, 40);
  cylinder(.29, .29, .1, mat.black, mic, 0, .5, 0, 40);
  cylinder(.2, .24, .12, mat.black, mic, 0, .41, 0, 32);
  mesh(new THREE.CapsuleGeometry(.37, .62, 8, 28), mat.foam, mic, 0, 1.98, 0);
  box(.2, .2, .02, mat.yellow, mic, 0, .9, .272, .004);
  wire([[-.3, 1.05, 0], [-.42, 1.05, -.28], [0, 1.08, -.56], [.42, 1.05, -.28], [.3, 1.05, 0]], .04, mat.black, mic);
  for (const x of [-.34, .34]) {
    const knob = cylinder(.09, .09, .1, mat.silver, mic, x, 1.05, 0, 20);
    knob.rotation.z = Math.PI / 2;
  }
  beam([0, 1.08, -.56], [-.62, 2.5, -.5], .05, mat.charcoal, mic);
  register(mic, 'podcast', [.5, 2.75, .3]);
  contact(-7.5, 2, 1.9, 1.6, .45, .006);

  /* The arm: clamped to the back-left corner, elbow high above the desk. */
  mic.updateMatrixWorld(true);
  const armEnd = mic.localToWorld(new THREE.Vector3(-.62, 2.5, -.5));
  const clampPoint = [-8.5, 0, -2.9], shoulder = [-8.5, 2.6, -2.9], elbow = [-8.7, 5.7, -.8];
  box(.6, .5, .5, mat.black, scene, clampPoint[0], -.05, clampPoint[2], .05);
  beam(clampPoint, shoulder, .09, mat.black, scene);
  for (const offset of [-.08, .08]) {
    beam([shoulder[0], shoulder[1] + offset, shoulder[2]], [elbow[0], elbow[1] + offset, elbow[2]], .05, mat.charcoal, scene);
    beam([elbow[0], elbow[1] + offset, elbow[2]], [armEnd.x, armEnd.y + offset, armEnd.z], .05, mat.charcoal, scene);
  }
  for (const joint of [shoulder, elbow, [armEnd.x, armEnd.y, armEnd.z]]) sphere(.17, mat.black, scene, ...joint);

  /* ---------- Sticker board on the wall under the title: where I have worked, and what I work with ---------- */

  const board = group(-12.7, 2.55, -5.96);
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
    speaker.rotation.y = -side * .32;
    box(1.6, 2.6, 1.5, mat.plastic, speaker, 0, 1.3, 0, .08);
    const woofer = cylinder(.54, .54, .04, mat.white, speaker, 0, .98, .76, 48);
    woofer.rotation.x = Math.PI / 2;
    const surround = mesh(new THREE.TorusGeometry(.56, .06, 10, 48), mat.black, speaker, 0, .98, .77);
    surround.castShadow = false;
    sphere(.19, mat.white, speaker, 0, .98, .75, 1, 1, .45);
    const tweeter = cylinder(.22, .22, .04, mat.black, speaker, 0, 2, .76, 32);
    tweeter.rotation.x = Math.PI / 2;
    sphere(.09, mat.charcoal, speaker, 0, 2, .77, 1, 1, .5);
  }

  /* Steel water bottle. */
  const bottle = group(-6.2, 0, -.5);
  const bottleSteel = standard('#a9bdb8', .28, .9);
  cylinder(.31, .31, 1.9, bottleSteel, bottle, 0, .95, 0, 40);
  cylinder(.17, .31, .32, bottleSteel, bottle, 0, 2.06, 0, 40);
  cylinder(.19, .19, .26, mat.black, bottle, 0, 2.34, 0, 32);
  const loop = mesh(new THREE.TorusGeometry(.13, .03, 8, 20), mat.black, bottle, 0, 2.55, 0);
  loop.castShadow = false;
  contact(-6.2, -.5, 1.2, 1.1, .6, .006);

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
    work: { position: [3.1, 3.9, 11], look: [3.25, 2.8, -1.9] },
    career: { position: [-3.1, 3.9, 11], look: [-3.25, 2.8, -1.9] },
    rig: { position: [4.6, 3.4, 7.6], look: [6.2, 1, 1.1] },
    contact: { position: [4.5, 2.8, 7], look: [4.1, .9, 1.9] },
    podcast: { position: [-5.2, 2.9, 8.6], look: [-7.5, 2.1, 2] },
    writing: { position: [-4.2, 4.6, 8.2], look: [-4.9, .1, 2.3] },
    talks: { position: [-3.3, 6, 5.6], look: [-3.95, 6.1, -5.96] },
    skills: { position: [-11.2, 2.8, 6.6], look: [-12.7, 2.55, -5.96] }
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 2, 3400 / width));
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
    const span = compact ? 18.5 : 28;
    const distance = clamp(span / 2 / Math.tan(halfHorizontal), 12, compact ? 42 : 27) * smoothZoom;
    baseLook.set(0, compact ? 3.2 : 2.3, -1);

    const drift = paused ? 0 : Math.sin(elapsed * .14) * .012;
    const angle = smoothYaw + drift + (paused ? 0 : pointer.x * -.035);
    const elevation = clamp(.21 + smoothPitch + (paused ? 0 : pointer.y * -.02), .06, .62);
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
    renderer.toneMappingExposure = exposure * (1 - intro * .62);
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
    if (key === 'music') { window.StudioSound?.toggle(); return; }
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
      if (moved && introGoal === 1) {
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

  window.addEventListener('studio:sound', event => { soundOn = Boolean(event.detail?.playing); requestDraw(); });
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
    if (!fixedHour && !paused) dayPhase = (dayPhase + dt / DAY_SECONDS) % 1;
    updateDaylight();
    placeCamera(dt, instant);
    drawTerminal(elapsed);
    /* The monitors change on their own: Work turns a page, the career highlight takes a step. */
    if (!paused) {
      const page = Math.floor(elapsed / 6), step = Math.floor(elapsed / 4);
      if (page !== mainPage) { mainPage = page; drawMainScreen(); }
      const frame = Math.floor(elapsed * 12);
      if (frame !== storyFrame) { storyFrame = frame; storyStep = step; drawStoryScreen(elapsed); }
    }
    for (const [key, item] of targets) {
      const goal = key === hoverKey && !panelOpen ? 1 : 0;
      item.hover += (goal - item.hover) * (instant ? 1 : Math.min(dt * 7, 1));
      item.group.position.y = item.group.userData.baseY + item.hover * item.lift;
      if (!item.lift) item.group.scale.setScalar(1 + item.hover * .018);
    }
    if (record && soundOn) record.rotation.y -= dt * 3.49;
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

  drawNotes();
  drawStickers();
  updateDaylight();
  body.classList.add('scene-3d');
  controls.hidden = false;
  resize();
  new ResizeObserver(resize).observe(viewport);
  if (!paused && !document.hidden) frameId = requestAnimationFrame(tick);
}
