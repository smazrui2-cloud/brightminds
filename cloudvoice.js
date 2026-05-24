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

  // URL now includes the selected voice id: audio/{lang}/{voiceId}/{key}.mp3
  url(key, lang, voiceIdOverride) {
    const v = voiceIdOverride || this.getVoice(lang);
    return `${this._audioBase}/${lang}/${v}/${key}.mp3`;
  },

  // Plays the pre-recorded clip. Optional voiceId lets the caller preview a
  // specific voice (used by the teacher-picker screen).
  play(key, lang = 'ar', opts = {}) {
    if (!this.enabled || !this.has(key, lang)) return Promise.resolve(false);
    if (opts.replace !== false) this.stop();
    return new Promise((resolve) => {
      const audio = new Audio(this.url(key, lang, opts.voiceId));
      audio.volume = opts.volume ?? 1.0;
      audio.playbackRate = opts.rate ?? 1.0;
      this._current = audio;
      const done = () => { if (this._current === audio) this._current = null; resolve(true); };
      audio.onended = done;
      audio.onerror = () => done();
      audio.play().catch(() => done());
    });
  },
};
