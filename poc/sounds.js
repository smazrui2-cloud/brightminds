// ════════════════════════════════════════════════════════════
// SOUND SYSTEM — Web Audio API, no external assets
// All sounds are synthesized at runtime → zero network cost.
// ════════════════════════════════════════════════════════════
const Sound = {
  ctx: null,
  enabled: true,
  masterGain: null,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) { /* audio not available */ }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setEnabled(on) {
    this.enabled = !!on;
  },

  // Core synth: a tone with attack/decay envelope
  _tone(freq, duration, type = 'sine', volume = 0.25, attack = 0.01) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(g);
    g.connect(this.masterGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.start(t);
    o.stop(t + duration + 0.02);
  },

  // Frequency slide
  _slide(fromFreq, toFreq, duration, type = 'sine', volume = 0.2) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(fromFreq, t);
    o.frequency.exponentialRampToValueAtTime(toFreq, t + duration);
    o.connect(g);
    g.connect(this.masterGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.start(t);
    o.stop(t + duration + 0.02);
  },

  // ── Public sound effects ──────────────────────────────────
  tap() { this._tone(880, 0.08, 'sine', 0.25, 0.005); },

  draw() { this._slide(420, 720, 0.18, 'triangle', 0.18); },

  lineDone() { this._slide(700, 1100, 0.16, 'sine', 0.22); },

  error() { this._slide(330, 180, 0.25, 'sawtooth', 0.15); },

  phaseComplete() {
    // C-major arpeggio
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.18, 'triangle', 0.22), i * 90);
    });
  },

  celebrate() {
    // Ascending fanfare
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.28, 'triangle', 0.25), i * 110);
    });
    // Sparkle layer
    setTimeout(() => this._tone(1568, 0.4, 'sine', 0.18), 600);
    setTimeout(() => this._tone(2093, 0.5, 'sine', 0.15), 750);
  },

  // ─── Applause (cheering crowd) ───────────────────────────
  // Uses filtered white noise to simulate clapping hands + crowd.
  applause() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const duration = 2.4;
    // Noise buffer with claps at random intervals
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * duration, sr);
    const data = buf.getChannelData(0);
    // Generate clap-like envelope: dense fast bursts that taper
    for (let i = 0; i < data.length; i++) {
      const tt = i / sr;
      // Each "clap" is a quick noise burst
      const clapPhase = (tt * 18) % 1;                        // 18 claps/sec base
      const burst = clapPhase < 0.04 ? Math.exp(-clapPhase * 80) : 0;
      const decay = Math.exp(-tt * 0.6);                       // overall fade
      data[i] = (Math.random() * 2 - 1) * burst * decay;
    }
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    // Band-pass filter to make it sound less harsh
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter); filter.connect(g); g.connect(this.masterGain);
    src.start(t);
    src.stop(t + duration + 0.02);
  },

  // ─── Encouraging chime (correct answer) ─────────────────
  // Three rising bell tones, warm and cheerful.
  encouragement() {
    if (!this.enabled || !this.ctx) return;
    [{f:880,d:.18}, {f:1175,d:.18}, {f:1568,d:.32}].forEach((n, i) => {
      setTimeout(() => this._tone(n.f, n.d, 'sine', 0.24, 0.005), i * 110);
    });
  },

  // Splash-screen welcome melody — magical/warm, 2.5s long
  splashMelody() {
    // Twinkly bell intro (4 high notes)
    [1568, 1976, 2349, 1976].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.22, 'sine', 0.16), i * 90);
    });
    // Main melody — C major arpeggio rising
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.32, 'triangle', 0.22), 400 + i * 200);
    });
    // Resolution chord at the end (C major)
    setTimeout(() => {
      [523, 659, 784].forEach(f => this._tone(f, 0.7, 'triangle', 0.18));
    }, 1400);
    // Final sparkle
    setTimeout(() => this._tone(2349, 0.5, 'sine', 0.20), 2000);
  },

  wrongTap() { this._tone(220, 0.12, 'square', 0.12); },
};

// ════════════════════════════════════════════════════════════
// BACKGROUND MUSIC — soft looping melody during gameplay
// Plays at low volume (~8%) so it doesn't fight with the teacher voice.
// ════════════════════════════════════════════════════════════
const BgMusic = {
  enabled: false,            // off by default — user enables via toggle
  _timer: null,
  _step: 0,
  _melodyGain: null,
  // Pentatonic-ish sequence: warm, calm, never clashes with voice
  // Each entry: [frequency, duration in seconds, type]
  // C major pentatonic loop, 8 beats × 0.6s each = 4.8s loop
  _melody: [
    [523, 0.6, 'triangle'],   // C5
    [659, 0.6, 'sine'],       // E5
    [784, 0.6, 'triangle'],   // G5
    [659, 0.6, 'sine'],       // E5
    [880, 0.6, 'triangle'],   // A5
    [784, 0.6, 'sine'],       // G5
    [659, 0.6, 'triangle'],   // E5
    [523, 0.6, 'sine'],       // C5
  ],

  start() {
    if (this._timer) return;
    if (!Sound.ctx) Sound.init();
    if (!Sound.ctx) return;
    // Dedicated gain so we can fade in/out without affecting other sounds
    this._melodyGain = Sound.ctx.createGain();
    this._melodyGain.gain.value = 0.0;
    this._melodyGain.connect(Sound.masterGain);
    // Fade in
    this._melodyGain.gain.linearRampToValueAtTime(0.08, Sound.ctx.currentTime + 0.4);
    this._step = 0;
    this._tick();
  },

  _tick() {
    if (!this.enabled || !this._melodyGain) return;
    const [freq, dur, type] = this._melody[this._step % this._melody.length];
    const t = Sound.ctx.currentTime;
    const o = Sound.ctx.createOscillator();
    const g = Sound.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this._melodyGain);
    o.start(t); o.stop(t + dur + 0.02);
    this._step++;
    this._timer = setTimeout(() => this._tick(), dur * 1000);
  },

  stop() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._melodyGain && Sound.ctx) {
      // Fade out
      this._melodyGain.gain.linearRampToValueAtTime(0, Sound.ctx.currentTime + 0.4);
      const ref = this._melodyGain;
      setTimeout(() => { try { ref.disconnect(); } catch(e){} }, 500);
      this._melodyGain = null;
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) { Sound.resume(); this.start(); } else { this.stop(); }
    return this.enabled;
  },
};

// ════════════════════════════════════════════════════════════
// VOICE BUS — single chokepoint for ALL voice playback
//
// Eliminates "two people talking" and echo bugs by guaranteeing:
//   • Only one utterance ever plays at a time (TTS or MP3, never both)
//   • Duplicate calls fired within DEBOUNCE_MS are dropped silently
//   • Latest call always wins — anything in-flight is hard-stopped first
//   • State auto-clears on natural end OR error (no stale locks)
//
// Lifecycle every caller follows:
//   const token = VoiceBus.acquire(text);   // returns null if debounced
//   if (token === null) return;
//   VoiceBus.setBackend('mp3' | 'tts');
//   ...start playback...
//   onend / onerror → VoiceBus.release(token, text);
//
// Toggle verbose logging in DevTools:  VoiceBus.setDebug(true)
// ════════════════════════════════════════════════════════════
const VoiceBus = {
  _busy: false,
  _lastText: '',
  _lastStartedMs: 0,
  _DEBOUNCE_MS: 180,
  _currentBackend: null,      // 'mp3' | 'tts' | null
  _currentToken: 0,
  _logEnabled: false,

  setDebug(on) { this._logEnabled = !!on; },
  _log(...args) { if (this._logEnabled) { try { console.log('[VoiceBus]', ...args); } catch (_) {} } },

  // Last-played clip, exposed for the Debug Panel
  lastClip: null,
  totalPlays: 0,

  acquire(text) {
    const now = Date.now();
    const key = String(text || '');
    if (key && key === this._lastText && (now - this._lastStartedMs) < this._DEBOUNCE_MS) {
      this._log('DROP duplicate within debounce:', key);
      return null;
    }
    this._lastText = key;
    this._lastStartedMs = now;
    this.lastClip = key;
    this.totalPlays++;
    this.silenceAll();
    const token = ++this._currentToken;
    this._busy = true;
    this._log('START token=' + token, key);
    return token;
  },

  release(token, text) {
    if (token !== this._currentToken) {
      this._log('IGNORE stale release token=' + token);
      return;
    }
    this._busy = false;
    this._currentBackend = null;
    this._log('END token=' + token, String(text || ''));
  },

  setBackend(b) {
    this._currentBackend = b;
    this._log('SOURCE backend=' + b);
  },

  silenceAll() {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    try { if (typeof CloudVoice !== 'undefined') CloudVoice.stop(); } catch (_) {}
    this._busy = false;
    this._currentBackend = null;
  },
};
if (typeof window !== 'undefined') window.VoiceBus = VoiceBus;

// ════════════════════════════════════════════════════════════
// VOICE — child-like TTS for counting (Web Speech API)
// Uses the browser's built-in synth at high pitch to mimic a child voice.
// No external files. Falls back silently if speechSynthesis unavailable.
// ════════════════════════════════════════════════════════════
// Voice character presets — let user pick the "personality"
const VOICE_PRESETS = {
  teacher: { pitch: 1.05, rate: 0.92, label: '🧑‍🏫 معلم هادئ' },
  friendly: { pitch: 1.25, rate: 0.98, label: '😊 ودود' },
  child:    { pitch: 1.55, rate: 1.05, label: '👶 طفل' },
};
const VOICE_PRESETS_EN = {
  teacher: { pitch: 1.05, rate: 0.92, label: '🧑‍🏫 Calm teacher' },
  friendly: { pitch: 1.25, rate: 0.98, label: '😊 Friendly' },
  child:    { pitch: 1.55, rate: 1.05, label: '👶 Child' },
};

const Voice = {
  enabled: true,
  _voices: [],
  preset: 'child',  // default to child-like voice

  init() {
    if (!window.speechSynthesis) return;
    const load = () => { this._voices = window.speechSynthesis.getVoices(); };
    load();
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.addEventListener('voiceschanged', load);
    }
  },

  // Force-refresh the voice list (call after user installs new voices)
  refreshVoices() {
    if (!window.speechSynthesis) return [];
    this._voices = window.speechSynthesis.getVoices();
    return this._voices;
  },

  setPreset(name) {
    if (VOICE_PRESETS[name]) this.preset = name;
  },

  getPresetParams() {
    return VOICE_PRESETS[this.preset] || VOICE_PRESETS.child;
  },

  setEnabled(on) {
    this.enabled = !!on;
    if (!on && window.speechSynthesis) window.speechSynthesis.cancel();
  },

  // User can override which voice to use (saved in profile)
  preferredVoiceName: null,

  setPreferredVoice(name) {
    this.preferredVoiceName = name;
  },

  // Match Edge "Natural / Online / Neural" cloud voices — the high-quality ones
  _isPremium(v) {
    return /online|natural|neural|premium|enhanced/i.test(v.name);
  },

  _findVoice(lang) {
    const prefix = lang === 'ar' ? 'ar' : 'en';
    // 1. Explicit user choice wins
    if (this.preferredVoiceName) {
      const exact = this._voices.find(v => v.name === this.preferredVoiceName);
      if (exact && exact.lang.startsWith(prefix)) return exact;
    }
    const langVoices = this._voices.filter(v => v.lang.startsWith(prefix));
    // 2. Premium (Edge Natural Voices) + friendly female name → BEST quality
    const friendlyNames = /aria|jenny|salma|amira|hoda|naayf|hamed|sonia|libby|female|girl/i;
    return langVoices.find(v => this._isPremium(v) && friendlyNames.test(v.name))
        || langVoices.find(v => this._isPremium(v))                              // 3. Any premium voice
        || langVoices.find(v => friendlyNames.test(v.name))                       // 4. Standard friendly female
        || langVoices.find(v => /susan|hazel|zira/i.test(v.name))                 // 5. Known good local voices
        || langVoices.find(v => /female/i.test(v.name))
        || langVoices[0];                                                          // 6. Last resort
  },

  // Returns true if any premium / cloud voice exists for the language
  hasPremiumVoiceFor(lang) {
    const prefix = lang === 'ar' ? 'ar' : 'en';
    return this._voices.some(v => v.lang.startsWith(prefix) && this._isPremium(v));
  },

  listVoicesFor(lang) {
    const prefix = lang === 'ar' ? 'ar' : 'en';
    return this._voices.filter(v => v.lang.startsWith(prefix));
  },

  hasVoiceFor(lang) {
    if (!window.speechSynthesis) return false;
    if (!this._voices.length) this._voices = window.speechSynthesis.getVoices();
    const prefix = lang === 'ar' ? 'ar' : 'en';
    return this._voices.some(v => v.lang.startsWith(prefix));
  },

  speak(text, lang = 'ar', opts = {}) {
    if (!this.enabled || !window.speechSynthesis) return;
    // STRICT POLICY: never use the OS TTS engine for Arabic. Even when an
    // Arabic voice is installed locally, quality varies wildly — some Android
    // engines mispronounce diacritics, others swap letters. We have ~90+
    // pre-recorded Neural MP3 clips that cover the lesson; the right answer
    // for any Arabic call that lands here is to fall through to silence.
    // English keeps the OS-TTS fallback because mainstream Windows/Android
    // voices are reliable and we don't ship clips for every English string.
    if (lang === 'ar') return;
    // Refuse to speak if there is no installed voice matching the requested
    // language. The browser would otherwise fall back to (say) Microsoft Hazel
    // trying to pronounce Arabic, which sounds awful and confuses kids.
    const matchedVoice = this._findVoice(lang);
    if (!matchedVoice) return;
    // Route through VoiceBus: it stops any in-flight MP3/TTS, debounces
    // duplicate calls, and hands back a token that ties this utterance to
    // its release.
    const token = VoiceBus.acquire(text);
    if (token === null) return;
    VoiceBus.setBackend('tts');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    const preset = this.getPresetParams();
    u.pitch = opts.pitch ?? preset.pitch;
    u.rate = opts.rate ?? preset.rate;
    u.volume = opts.volume ?? 1.0;
    u.voice = matchedVoice;
    u.onend = () => VoiceBus.release(token, text);
    u.onerror = () => VoiceBus.release(token, text);
    window.speechSynthesis.speak(u);
  },

  // Arabic numbers 0-81 (covers 9×9 = 81 max product)
  _arNumbers: [
    '','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة',
    'أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر','عشرون',
    'واحد وعشرون','اثنان وعشرون','ثلاثة وعشرون','أربعة وعشرون','خمسة وعشرون','ستة وعشرون','سبعة وعشرون','ثمانية وعشرون','تسعة وعشرون','ثلاثون',
    'واحد وثلاثون','اثنان وثلاثون','ثلاثة وثلاثون','أربعة وثلاثون','خمسة وثلاثون','ستة وثلاثون','سبعة وثلاثون','ثمانية وثلاثون','تسعة وثلاثون','أربعون',
    'واحد وأربعون','اثنان وأربعون','ثلاثة وأربعون','أربعة وأربعون','خمسة وأربعون','ستة وأربعون','سبعة وأربعون','ثمانية وأربعون','تسعة وأربعون','خمسون',
    'واحد وخمسون','اثنان وخمسون','ثلاثة وخمسون','أربعة وخمسون','خمسة وخمسون','ستة وخمسون','سبعة وخمسون','ثمانية وخمسون','تسعة وخمسون','ستون',
    'واحد وستون','اثنان وستون','ثلاثة وستون','أربعة وستون','خمسة وستون','ستة وستون','سبعة وستون','ثمانية وستون','تسعة وستون','سبعون',
    'واحد وسبعون','اثنان وسبعون','ثلاثة وسبعون','أربعة وسبعون','خمسة وسبعون','ستة وسبعون','سبعة وسبعون','ثمانية وسبعون','تسعة وسبعون','ثمانون','واحد وثمانون'
  ],
  _enOnes: ['','one','two','three','four','five','six','seven','eight','nine'],
  _enTeens: ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],
  _enTens: { 20:'twenty', 30:'thirty', 40:'forty', 50:'fifty', 60:'sixty', 70:'seventy', 80:'eighty', 90:'ninety' },

  _enNumber(n) {
    if (n < 10) return this._enOnes[n];
    if (n < 20) return this._enTeens[n - 10];
    if (n < 100) {
      const tens = Math.floor(n / 10) * 10;
      const ones = n % 10;
      const tw = this._enTens[tens];
      return ones === 0 ? tw : tw + ' ' + this._enOnes[ones];
    }
    return String(n);
  },

  countNumber(n, lang = 'ar') {
    // Prefer pre-recorded MP3 if we have a clip for this number
    if (typeof CloudVoice !== 'undefined' && CloudVoice.enabled) {
      const k = CloudVoice.numberKey(n);
      if (k && CloudVoice.has(k, lang)) {
        CloudVoice.play(k, lang, { replace: true });
        return;
      }
    }
    const useLang = this.hasVoiceFor(lang) ? lang : (this.hasVoiceFor('en') ? 'en' : lang);
    const text = useLang === 'ar' ? (this._arNumbers[n] || String(n)) : this._enNumber(n);
    const preset = this.getPresetParams();
    this.speak(text, useLang, { replace: true, rate: Math.min(preset.rate + 0.15, 1.5) });
  },

  // Speak a phrase like "Total: 25" / "المجموع 25"
  total(n, lang = 'ar') {
    const useLang = this.hasVoiceFor(lang) ? lang : (this.hasVoiceFor('en') ? 'en' : lang);
    const num = useLang === 'ar' ? (this._arNumbers[n] || String(n)) : this._enNumber(n);
    const text = useLang === 'ar' ? `المجموع ${num}` : `Total ${num}`;
    this.speak(text, useLang, { pitch: 1.15, rate: 0.95 });
  },
};

Voice.init();
