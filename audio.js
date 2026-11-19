/*
  Studio sound.
  Three modes, cycled by the Sound button in the footer:
    "music" (default) a quiet generated lo-fi beat at 15% volume, plus the interface sounds
    "fx"    interface sounds only: a swoosh when a panel opens or closes, a tick between sections
    "off"   silence
  The record player switches the music on and off. Browsers do not allow sound before the visitor's
  first click or key press, so the music starts on that first interaction (normally "Step inside").
  window.StudioSound: toggle() (music on/off), fx(name), mode, playing
*/
(() => {
  'use strict';

  const BPM = 92;
  const STEP = 60 / BPM / 4; /* one sixteenth note */
  /* Am7, Fmaj7, Cmaj7, G6 */
  const chords = [
    [220.0, 261.63, 329.63, 392.0],
    [174.61, 220.0, 261.63, 329.63],
    [130.81, 196.0, 246.94, 329.63],
    [196.0, 246.94, 293.66, 329.63]
  ];
  const MODES = ['music', 'fx', 'off'];
  const MUSIC_LEVEL = .1;
  const LABELS = { fx: 'Sound: effects', music: 'Sound: music', off: 'Sound: off' };
  let context = null, music = null, effects = null, noise = null, drums = null, synths = null, pump = null;
  let mode = 'music', started = false, timer = 0, nextTime = 0, step = 0, lastFx = 0;
  try { const saved = localStorage.getItem('idea-studio-sound-v2'); if (MODES.includes(saved)) mode = saved; } catch (_) { /* Storage is optional. */ }

  function build() {
    if (context) return true;
    try { context = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return false; }
    const limiter = context.createDynamicsCompressor();
    limiter.connect(context.destination);
    /* Music bus: everything passes a low-pass filter for the worn, lo-fi top end.
       Chords and bass run through `pump`, which ducks on every kick (the side-chain feel). */
    music = context.createGain();
    music.gain.value = 0;
    const lofi = context.createBiquadFilter();
    lofi.type = 'lowpass';
    lofi.frequency.value = 5200;
    music.connect(lofi);
    lofi.connect(limiter);
    drums = context.createGain();
    drums.gain.value = .9;
    drums.connect(music);
    pump = context.createGain();
    pump.connect(music);
    synths = context.createGain();
    synths.gain.value = .9;
    synths.connect(pump);
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

  function fx(name, detail) {
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
    } else if (name === 'strum') {
      strum(detail);
    } else if (name === 'amp') {
      ampSwitch(detail);
    } else if (name === 'click') {
      clack(context.currentTime, 3200, .16);
      clack(context.currentTime + .07, 2400, .1);
    } else if (name === 'cat') {
      /* A short, sleepy "mrrp". */
      const now = context.currentTime;
      const voice = context.createOscillator();
      voice.type = 'sawtooth';
      voice.frequency.setValueAtTime(420, now);
      voice.frequency.linearRampToValueAtTime(760, now + .14);
      voice.frequency.linearRampToValueAtTime(560, now + .42);
      const mouth = context.createBiquadFilter();
      mouth.type = 'bandpass';
      mouth.Q.value = 3;
      mouth.frequency.setValueAtTime(900, now);
      mouth.frequency.linearRampToValueAtTime(1900, now + .16);
      mouth.frequency.linearRampToValueAtTime(1100, now + .42);
      const gain = context.createGain();
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.22, now + .05);
      gain.gain.exponentialRampToValueAtTime(.0005, now + .46);
      voice.connect(mouth);
      mouth.connect(gain);
      gain.connect(effects);
      voice.start(now);
      voice.stop(now + .5);
    } else if (name === 'keys') {
      let at = context.currentTime;
      for (let i = 0; i < 7; i++) { clack(at, 1700 + Math.random() * 1500, .1 + Math.random() * .06); at += .05 + Math.random() * .06; }
    }
  }

  /* ---------- Things on the desk that make a noise ---------- */

  const CHORDS = [
    [82.41, 123.47, 164.81, 196, 246.94, 329.63],
    [98, 123.47, 146.83, 196, 246.94, 392],
    [146.83, 220, 293.66, 369.99],
    [110, 164.81, 220, 277.18, 329.63]
  ];
  let chordIndex = 0, driveCurve = null;

  function clack(time, frequency, loudness) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.4;
    const gain = context.createGain();
    gain.gain.setValueAtTime(loudness, time);
    gain.gain.exponentialRampToValueAtTime(.0005, time + .035);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(effects);
    source.start(time, Math.random() * 3);
    source.stop(time + .05);
  }

  /* One chord per click, walking a four-chord loop. Through the amp it is louder and overdriven. */
  function strum(amped) {
    const chord = CHORDS[chordIndex++ % CHORDS.length];
    const now = context.currentTime;
    const out = context.createGain();
    out.gain.value = amped ? .5 : .34;
    const tone = context.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(amped ? 2600 : 3400, now);
    tone.frequency.exponentialRampToValueAtTime(amped ? 1200 : 900, now + 1.6);
    if (amped) {
      if (!driveCurve) {
        driveCurve = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; driveCurve[i] = Math.tanh(x * 6); }
      }
      const drive = context.createWaveShaper();
      drive.curve = driveCurve;
      tone.connect(drive);
      drive.connect(out);
    } else {
      tone.connect(out);
    }
    out.connect(effects);
    chord.forEach((frequency, i) => {
      const at = now + i * .028;
      const oscillator = context.createOscillator();
      oscillator.type = amped ? 'sawtooth' : 'triangle';
      oscillator.frequency.value = frequency;
      const gain = context.createGain();
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(amped ? .2 : .28, at + .008);
      gain.gain.exponentialRampToValueAtTime(.0005, at + (amped ? 2.2 : 1.7));
      oscillator.connect(gain);
      gain.connect(tone);
      oscillator.start(at);
      oscillator.stop(at + 2.4);
    });
  }

  function ampSwitch(on) {
    const now = context.currentTime;
    clack(now, 1400, .2);
    if (!on) return;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(70, now);
    oscillator.frequency.exponentialRampToValueAtTime(42, now + .25);
    const hum = context.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 60;
    const humGain = context.createGain();
    humGain.gain.setValueAtTime(.0001, now);
    humGain.gain.exponentialRampToValueAtTime(.035, now + .15);
    humGain.gain.exponentialRampToValueAtTime(.0005, now + 1.1);
    const gain = context.createGain();
    gain.gain.setValueAtTime(.4, now);
    gain.gain.exponentialRampToValueAtTime(.0006, now + .4);
    oscillator.connect(gain);
    hum.connect(humGain);
    gain.connect(effects);
    humGain.connect(effects);
    oscillator.start(now);
    hum.start(now);
    oscillator.stop(now + .45);
    hum.stop(now + 1.15);
  }

  /* ---------- Music ---------- */

  function kick(time, strong) {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(130, time);
    oscillator.frequency.exponentialRampToValueAtTime(44, time + .11);
    const gain = context.createGain();
    gain.gain.setValueAtTime(strong ? .5 : .36, time);
    gain.gain.exponentialRampToValueAtTime(.0008, time + .3);
    oscillator.connect(gain);
    gain.connect(drums);
    oscillator.start(time);
    oscillator.stop(time + .32);
    /* Duck the chords and bass, then let them swell back. */
    pump.gain.cancelScheduledValues(time);
    pump.gain.setValueAtTime(.38, time);
    pump.gain.linearRampToValueAtTime(1, time + STEP * 3.2);
  }

  function burst(time, duration, frequency, type, loudness) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = .8;
    const gain = context.createGain();
    gain.gain.setValueAtTime(loudness, time);
    gain.gain.exponentialRampToValueAtTime(.0006, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(drums);
    source.start(time, Math.random() * 3);
    source.stop(time + duration + .02);
  }

  /* One bar of warm, detuned chord with a filter that opens and closes. */
  function chordPad(notes, time, duration) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.linearRampToValueAtTime(1500, time + duration * .5);
    filter.frequency.linearRampToValueAtTime(600, time + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(.05, time + .08);
    gain.gain.setValueAtTime(.05, time + duration - .15);
    gain.gain.linearRampToValueAtTime(0, time + duration + .12);
    for (const frequency of notes) {
      for (const detune of [-9, 8]) {
        const oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = detune;
        oscillator.connect(filter);
        oscillator.start(time);
        oscillator.stop(time + duration + .2);
      }
    }
    filter.connect(gain);
    gain.connect(synths);
  }

  function bass(frequency, time, length) {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(.22, time + .02);
    gain.gain.exponentialRampToValueAtTime(.001, time + length);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(synths);
    oscillator.start(time);
    oscillator.stop(time + length + .05);
  }

  function pluck(frequency, time) {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency * 2;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(.05, time + .01);
    gain.gain.exponentialRampToValueAtTime(.0005, time + .7);
    oscillator.connect(gain);
    gain.connect(synths);
    oscillator.start(time);
    oscillator.stop(time + .75);
  }

  /* Sixteen steps to the bar, one chord per bar: four-on-the-floor kick, clap on two and four,
     swung hats, a syncopated sub bass and a few plucked notes on top. */
  function schedule() {
    while (nextTime < context.currentTime + .5) {
      const position = step % 16, chord = chords[Math.floor(step / 16) % chords.length];
      const time = nextTime + (position % 2 ? STEP * .16 : 0);
      if (position === 0) chordPad(chord, nextTime, STEP * 16);
      if (position % 4 === 0) kick(nextTime, position === 0);
      if (position === 4 || position === 12) burst(time, .16, 1700, 'bandpass', .2);
      if (position % 2 === 0) burst(time, position % 4 === 2 ? .09 : .035, 7500, 'highpass', position % 4 === 2 ? .07 : .04);
      else if (Math.random() < .3) burst(time, .03, 8000, 'highpass', .025);
      if (position === 0 || position === 3 || position === 10) bass(chord[0] / 2, time, STEP * 2.6);
      if (position === 6 || position === 14) bass(chord[2] / 4, time, STEP * 1.6);
      if ([2, 5, 7, 11, 13].includes(position) && Math.random() < .5) pluck(chord[Math.floor(Math.random() * chord.length)], time);
      nextTime += STEP;
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
    window.dispatchEvent(new CustomEvent('studio:sound', { detail: { playing: mode === 'music' && started, mode } }));
  }

  function startMusic() {
    if (!build()) return false;
    context.resume();
    nextTime = Math.max(nextTime, context.currentTime + .1);
    schedule();
    clearInterval(timer);
    timer = setInterval(schedule, 120);
    music.gain.cancelScheduledValues(context.currentTime);
    music.gain.setTargetAtTime(MUSIC_LEVEL, context.currentTime, .8);
    started = true;
    return true;
  }

  function stopMusic() {
    clearInterval(timer);
    started = false;
    if (!context) return;
    music.gain.cancelScheduledValues(context.currentTime);
    music.gain.setTargetAtTime(0, context.currentTime, .25);
  }

  function setMode(next) {
    if (!MODES.includes(next) || next === mode) return;
    mode = next;
    try { localStorage.setItem('idea-studio-sound-v2', mode); } catch (_) { /* Storage is optional. */ }
    if (mode === 'music') { if (!startMusic()) mode = 'fx'; }
    else stopMusic();
    sync();
  }

  /* Music is the default, but it can only begin once the visitor has interacted with the page. */
  function arm() {
    if (mode === 'music' && !started && startMusic()) sync();
    if (started || mode !== 'music') {
      document.removeEventListener('pointerdown', arm, true);
      document.removeEventListener('keydown', arm, true);
    }
  }
  document.addEventListener('pointerdown', arm, true);
  document.addEventListener('keydown', arm, true);

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
