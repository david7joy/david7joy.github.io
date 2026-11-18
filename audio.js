/*
  Studio sound.
  Three modes, cycled by the Sound button in the footer:
    "fx"    (default) short interface sounds only: a swoosh when a panel opens or closes, a tick between sections
    "music" the effects plus a quiet generated loop (soft chords, plucked notes, vinyl crackle)
    "off"   silence
  The record player switches the music on and off. Nothing sounds before the visitor's first click.
  window.StudioSound: toggle() (music on/off), fx(name), mode, playing
*/
(() => {
  'use strict';

  const CHORD_SECONDS = 6;
  /* Am7, Fmaj7, Cmaj7, G6 */
  const chords = [
    [220.0, 261.63, 329.63, 392.0],
    [174.61, 220.0, 261.63, 329.63],
    [130.81, 196.0, 246.94, 329.63],
    [196.0, 246.94, 293.66, 329.63]
  ];
  const MODES = ['fx', 'music', 'off'];
  const LABELS = { fx: 'Sound: effects', music: 'Sound: music', off: 'Sound: off' };
  let context = null, music = null, effects = null, noise = null;
  let mode = 'fx', timer = 0, nextTime = 0, step = 0, lastFx = 0;
  try { const saved = localStorage.getItem('idea-studio-sound'); if (saved === 'off' || saved === 'fx') mode = saved; } catch (_) { /* Storage is optional. */ }

  function build() {
    if (context) return true;
    try { context = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return false; }
    const limiter = context.createDynamicsCompressor();
    limiter.connect(context.destination);
    music = context.createGain();
    music.gain.value = 0;
    music.connect(limiter);
    effects = context.createGain();
    effects.gain.value = .5;
    effects.connect(limiter);

    /* One noise buffer serves the vinyl crackle and the swooshes. */
    const length = context.sampleRate * 4;
    noise = context.createBuffer(1, length, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;

    const crackleBuffer = context.createBuffer(1, length, context.sampleRate);
    const crackleSamples = crackleBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) crackleSamples[i] = samples[i] * .02 + (Math.random() < .0006 ? (Math.random() * 2 - 1) * .6 : 0);
    const crackle = context.createBufferSource();
    crackle.buffer = crackleBuffer;
    crackle.loop = true;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1200;
    const level = context.createGain();
    level.gain.value = .22;
    crackle.connect(highpass);
    highpass.connect(level);
    level.connect(music);
    crackle.start();
    return true;
  }

  /* ---------- Effects ---------- */

  /* Air moving past: filtered noise whose pitch sweeps up (opening) or down (closing). */
  function swoosh(from, to, duration, loudness) {
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(loudness, now + duration * .35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(effects);
    source.start(now, Math.random() * 2);
    source.stop(now + duration + .05);
  }

  function tick(frequency) {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .7, now + .07);
    const gain = context.createGain();
    gain.gain.setValueAtTime(.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + .09);
    oscillator.connect(gain);
    gain.connect(effects);
    oscillator.start(now);
    oscillator.stop(now + .1);
  }

  function fx(name) {
    if (mode === 'off' || !build()) return;
    if (context.state === 'suspended') context.resume();
    const now = performance.now();
    if (name === 'open') {
      if (now - lastFx < 900) return;
      lastFx = now;
      swoosh(320, 2600, .42, .22);
    } else if (name === 'close') {
      lastFx = 0;
      swoosh(2200, 260, .34, .16);
    } else if (name === 'tick') {
      tick(880);
    }
  }

  /* ---------- Music ---------- */

  function pad(frequency, time, duration) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(.05, time + 1.6);
    gain.gain.setValueAtTime(.05, time + duration - 1);
    gain.gain.linearRampToValueAtTime(0, time + duration + 1.8);
    for (const detune of [-6, 6]) {
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      oscillator.connect(filter);
      oscillator.start(time);
      oscillator.stop(time + duration + 2);
    }
    filter.connect(gain);
    gain.connect(music);
  }

  function pluck(frequency, time) {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency * 2;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(.045, time + .02);
    gain.gain.exponentialRampToValueAtTime(.0005, time + 1.6);
    oscillator.connect(gain);
    gain.connect(music);
    oscillator.start(time);
    oscillator.stop(time + 1.7);
  }

  function schedule() {
    while (nextTime < context.currentTime + 1.5) {
      const chord = chords[step % chords.length];
      chord.forEach(frequency => pad(frequency, nextTime, CHORD_SECONDS));
      pad(chord[0] / 2, nextTime, CHORD_SECONDS);
      for (let beat = 0; beat < 8; beat++) {
        if (Math.random() < .55) pluck(chord[Math.floor(Math.random() * chord.length)], nextTime + beat * CHORD_SECONDS / 8 + (beat % 2 ? .04 : 0));
      }
      nextTime += CHORD_SECONDS;
      step++;
    }
  }

  function sync() {
    document.querySelectorAll('[data-sound-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(mode !== 'off'));
      const label = button.querySelector('[data-sound-text]');
      if (label) label.textContent = LABELS[mode];
    });
    document.querySelectorAll('[data-sound-label]').forEach(node => { node.textContent = mode === 'music' ? 'Pause music' : 'Play music'; });
    document.body.classList.toggle('sound-on', mode === 'music');
    window.dispatchEvent(new CustomEvent('studio:sound', { detail: { playing: mode === 'music', mode } }));
  }

  function setMode(next) {
    if (!MODES.includes(next) || next === mode) return;
    const wasMusic = mode === 'music';
    mode = next;
    try { localStorage.setItem('idea-studio-sound', mode === 'music' ? 'fx' : mode); } catch (_) { /* Storage is optional. */ }
    if (mode === 'music') {
      if (!build()) { mode = 'fx'; sync(); return; }
      context.resume();
      nextTime = Math.max(nextTime, context.currentTime + .1);
      schedule();
      clearInterval(timer);
      timer = setInterval(schedule, 400);
      music.gain.cancelScheduledValues(context.currentTime);
      music.gain.setTargetAtTime(.7, context.currentTime, .6);
    } else if (wasMusic && context) {
      clearInterval(timer);
      music.gain.cancelScheduledValues(context.currentTime);
      music.gain.setTargetAtTime(0, context.currentTime, .25);
    }
    sync();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-open="music"]')) setMode(mode === 'music' ? 'fx' : 'music');
    else if (event.target.closest('[data-sound-toggle]')) setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
  });

  /* Panels announce themselves: a swoosh in, a tick between sections, a swoosh out. */
  let panelWasOpen = false;
  window.addEventListener('studio:panel', event => {
    const open = Boolean(event.detail?.open);
    if (open && !panelWasOpen) fx('open');
    else if (open) fx('tick');
    else if (panelWasOpen) fx('close');
    panelWasOpen = open;
  });

  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) context.suspend(); else if (mode !== 'off') context.resume();
  });

  window.StudioSound = {
    toggle: () => setMode(mode === 'music' ? 'fx' : 'music'),
    set: on => setMode(on ? 'music' : 'fx'),
    setMode, fx,
    get mode() { return mode; },
    get playing() { return mode === 'music'; }
  };
  sync();
})();
