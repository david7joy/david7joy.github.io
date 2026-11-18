/*
  Studio sound: a quiet, generated loop (soft chords, a few plucked notes, vinyl crackle).
  Nothing plays until the visitor asks for it, by clicking the record player or the Sound button.
  window.StudioSound.toggle() / .set(true|false) / .playing
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
  let context = null, master = null, playing = false, timer = 0, nextTime = 0, step = 0;

  function build() {
    context = new (window.AudioContext || window.webkitAudioContext)();
    master = context.createGain();
    master.gain.value = 0;
    const limiter = context.createDynamicsCompressor();
    master.connect(limiter);
    limiter.connect(context.destination);

    /* Vinyl crackle: faint hiss with the odd tick. */
    const length = context.sampleRate * 4;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      samples[i] = (Math.random() * 2 - 1) * .02 + (Math.random() < .0006 ? (Math.random() * 2 - 1) * .6 : 0);
    }
    const crackle = context.createBufferSource();
    crackle.buffer = buffer;
    crackle.loop = true;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1200;
    const level = context.createGain();
    level.gain.value = .22;
    crackle.connect(highpass);
    highpass.connect(level);
    level.connect(master);
    crackle.start();
  }

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
    gain.connect(master);
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
    gain.connect(master);
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
      button.setAttribute('aria-pressed', String(playing));
      const label = button.querySelector('[data-sound-text]');
      if (label) label.textContent = playing ? 'Sound on' : 'Sound off';
    });
    document.querySelectorAll('[data-sound-label]').forEach(node => { node.textContent = playing ? 'Pause music' : 'Play music'; });
    document.body.classList.toggle('sound-on', playing);
    window.dispatchEvent(new CustomEvent('studio:sound', { detail: { playing } }));
  }

  function set(on) {
    on = Boolean(on);
    if (on === playing) return;
    if (on) {
      try { if (!context) build(); } catch (_) { return; }
      context.resume();
      nextTime = Math.max(nextTime, context.currentTime + .1);
      schedule();
      timer = setInterval(schedule, 400);
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(.7, context.currentTime, .6);
    } else {
      clearInterval(timer);
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, .25);
      setTimeout(() => { if (!playing && context) context.suspend(); }, 1500);
    }
    playing = on;
    sync();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-sound-toggle], [data-open="music"]')) set(!playing);
  });
  document.addEventListener('visibilitychange', () => {
    if (!context || !playing) return;
    if (document.hidden) context.suspend(); else context.resume();
  });

  window.StudioSound = { toggle: () => set(!playing), set, get playing() { return playing; } };
  sync();
})();
