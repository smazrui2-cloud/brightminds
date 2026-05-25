// ════════════════════════════════════════════════════════════
// CloudVoice — pre-generated MP3 audio playback
// All fixed phrases are pre-rendered with Microsoft Edge Natural Voices
// (Salma for Arabic, Aria for English) and saved to /audio/{lang}/{key}.mp3
//
// Use this for fixed phrases that benefit from natural-sounding voice.
// Variable text (numbers >25, kid's name) still uses Web Speech TTS.
// ════════════════════════════════════════════════════════════
const CloudVoice = {
  manifest: null,
  enabled: true,
  _current: null,
  _audioBase: 'audio',
  // Currently selected voice id per language (e.g. 'salma' for ar)
  _selectedVoice: { ar: 'salma', en: 'aria' },

  async init() {
    try {
      // Always fetch the latest manifest (small JSON); audio files themselves
      // are cached by the browser via normal HTTP caching.
      const res = await fetch('audio/manifest.json?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      this.manifest = await res.json();
      if (this.manifest.defaultVoice) {
        this._selectedVoice = { ...this._selectedVoice, ...this.manifest.defaultVoice };
      }
      // Build a per-voice coverage index for fast O(1) lookups in url()
      this._clipsByVoice = {};
      const cov = this.manifest.coverage || {};
      for (const lang of Object.keys(cov)) {
        this._clipsByVoice[lang] = {};
        for (const voiceId of Object.keys(cov[lang])) {
          this._clipsByVoice[lang][voiceId] = new Set(cov[lang][voiceId]);
        }
      }
    } catch (e) { /* manifest not generated yet */ }
  },

  setEnabled(on) {
    this.enabled = !!on;
    if (!on) this.stop();
  },

  stop() {
    if (this._current) {
      try { this._current.pause(); this._current.src = ''; } catch (e) {}
      this._current = null;
    }
  },

  has(key, lang) {
    return !!this.manifest && !!this.manifest.phrases[key]
        && !!this.manifest.phrases[key][lang];
  },

  numberKey(n) {
    const key = 'n_' + n;
    return (this.manifest && this.manifest.phrases[key]) ? key : null;
  },

  // List the available teacher voices for a language
  voicesFor(lang) {
    if (!this.manifest || !this.manifest.voices) return [];
    return this.manifest.voices[lang] || [];
  },

  setVoice(lang, voiceId) {
    if (!voiceId) return;
    this._selectedVoice[lang] = voiceId;
  },

  getVoice(lang) {
    return this._selectedVoice[lang] || (this.manifest?.defaultVoice?.[lang]);
  },

  // URL: audio/{lang}/{voiceId}/{key}.mp3
  // If the selected voice doesn't yet have this clip recorded but the default
  // voice does (Salma for ar, Aria for en), fall back to the default so the
  // user always hears the phrase. Without this, picking Shakir/Zariyah would
  // produce silence on every newly added clip until they're regenerated.
  url(key, lang, voiceIdOverride) {
    const requested = voiceIdOverride || this.getVoice(lang);
    const defaultVoice = this.manifest?.defaultVoice?.[lang];
    if (defaultVoice && requested !== defaultVoice && this._clipsByVoice) {
      const set = this._clipsByVoice[lang]?.[requested];
      if (set && !set.has(key) && this._clipsByVoice[lang]?.[defaultVoice]?.has(key)) {
        return `${this._audioBase}/${lang}/${defaultVoice}/${key}.mp3`;
      }
    }
    return `${this._audioBase}/${lang}/${requested}/${key}.mp3`;
  },

  // Plays the pre-recorded clip. Optional voiceId lets the caller preview a
  // specific voice (used by the teacher-picker screen). Routes through the
  // VoiceBus so MP3 and Web Speech can never overlap.
  play(key, lang = 'ar', opts = {}) {
    if (!this.enabled || !this.has(key, lang)) return Promise.resolve(false);
    const url = this.url(key, lang, opts.voiceId);
    const token = (typeof VoiceBus !== 'undefined') ? VoiceBus.acquire(url) : 0;
    if (token === null) return Promise.resolve(false);
    if (typeof VoiceBus !== 'undefined') VoiceBus.setBackend('mp3');
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.volume = opts.volume ?? 1.0;
      audio.playbackRate = opts.rate ?? 1.0;
      this._current = audio;
      const done = () => {
        if (this._current === audio) this._current = null;
        if (typeof VoiceBus !== 'undefined') VoiceBus.release(token, url);
        resolve(true);
      };
      audio.onended = done;
      audio.onerror = () => done();
      audio.play().catch(() => done());
    });
  },
};
