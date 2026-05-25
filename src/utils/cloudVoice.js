// CloudVoice — plays pre-rendered MP3 clips (Salma/Aria/etc.) from /audio.
// The audio files live in `public/audio/` and are served as static assets.
// Generate them with `node tools/generate-audio.js` (see poc/tools/).

export const CloudVoice = {
  manifest: null,
  enabled: true,
  _current: null,
  _selectedVoice: { ar: 'salma', en: 'aria' },

  async init() {
    if (this.manifest) return this.manifest;
    try {
      const res = await fetch('/audio/manifest.json?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      this.manifest = await res.json();
      if (this.manifest.defaultVoice) this._selectedVoice = { ...this._selectedVoice, ...this.manifest.defaultVoice };
      return this.manifest;
    } catch { return null; }
  },

  setEnabled(on) { this.enabled = !!on; if (!on) this.stop(); },
  stop() { if (this._current) { try { this._current.pause(); this._current.src = ''; } catch {} this._current = null; } },

  has(key, lang) { return !!this.manifest?.phrases?.[key]?.[lang]; },

  voicesFor(lang) { return this.manifest?.voices?.[lang] || []; },
  setVoice(lang, voiceId) { if (voiceId) this._selectedVoice[lang] = voiceId; },
  getVoice(lang) { return this._selectedVoice[lang] || this.manifest?.defaultVoice?.[lang]; },

  url(key, lang, voiceIdOverride) {
    const v = voiceIdOverride || this.getVoice(lang);
    return `/audio/${lang}/${v}/${key}.mp3`;
  },

  play(key, lang = 'ar', opts = {}) {
    if (!this.enabled || !this.has(key, lang)) return Promise.resolve(false);
    if (opts.replace !== false) this.stop();
    return new Promise((resolve) => {
      const audio = new Audio(this.url(key, lang, opts.voiceId));
      audio.volume = opts.volume ?? 1.0;
      this._current = audio;
      const done = () => { if (this._current === audio) this._current = null; resolve(true); };
      audio.onended = done; audio.onerror = () => done();
      audio.play().catch(done);
    });
  },
};
