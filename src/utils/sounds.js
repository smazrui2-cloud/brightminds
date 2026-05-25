// Web Audio synth — port of poc/sounds.js (see that file for full details).
// Exports `Sound` (SFX + music) and `Voice` (Web Speech API fallback).
// In the React build the underlying logic is identical — only the export
// shape changed.

export const Sound = {
  ctx: null, enabled: true, masterGain: null,
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
    } catch {}
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setEnabled(on) { this.enabled = !!on; },

  _tone(freq, duration, type = 'sine', volume = 0.25, attack = 0.01) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.connect(g); g.connect(this.masterGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.start(t); o.stop(t + duration + 0.02);
  },

  tap() { this._tone(880, 0.08, 'sine', 0.25, 0.005); },
  lineDone() { this._tone(900, 0.16, 'sine', 0.22); },
  phaseComplete() { [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'triangle', 0.22), i * 90)); },
  wrongTap() { this._tone(220, 0.12, 'square', 0.12); },
  encouragement() { [880, 1175, 1568].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'sine', 0.24, 0.005), i * 110)); },
  celebrate() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this._tone(f, 0.28, 'triangle', 0.25), i * 110));
  },
  applause() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime, sr = this.ctx.sampleRate, dur = 2.4;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const tt = i / sr, phase = (tt * 18) % 1;
      const burst = phase < 0.04 ? Math.exp(-phase * 80) : 0;
      data[i] = (Math.random() * 2 - 1) * burst * Math.exp(-tt * 0.6);
    }
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.masterGain);
    src.start(t); src.stop(t + dur + 0.02);
  },
  splashMelody() {
    [1568, 1976, 2349, 1976].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'sine', 0.16), i * 90));
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.32, 'triangle', 0.22), 400 + i * 200));
    setTimeout(() => [523, 659, 784].forEach(f => this._tone(f, 0.7, 'triangle', 0.18)), 1400);
    setTimeout(() => this._tone(2349, 0.5, 'sine', 0.20), 2000);
  },
};

export const Voice = {
  enabled: true, _voices: [], preset: 'child',
  init() {
    if (!window.speechSynthesis) return;
    const load = () => { this._voices = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
  },
  speak(text, lang = 'ar') {
    if (!this.enabled || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    u.pitch = 1.25; u.rate = 0.98;
    const v = this._voices.find(x => x.lang.startsWith(lang === 'ar' ? 'ar' : 'en'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  },
};

Voice.init();
