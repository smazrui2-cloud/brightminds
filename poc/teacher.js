// ════════════════════════════════════════════════════════════
// TEACHER FEEDBACK — central, kid-friendly answer reactions.
// • Random phrase pool (no two-in-a-row repetition)
// • Sound first, then voice (350ms gap so they don't overlap)
// • Debounced (1.4s) — protects against spam taps
// • PREFERS natural-voice MP3 clips (Salma/Aria) over robotic Web Speech TTS.
//   Each entry is { mp3, text } — we try mp3 first; only fall back to TTS
//   when the bundled clip is missing.
// • Silent no-op if Voice module is missing — never crashes the game
// ════════════════════════════════════════════════════════════
const TeacherFeedback = {
  // ── Phrase pools ─────────────────────────────────────────
  // mp3 = key in audio/manifest.json (resolves to /audio/{lang}/{voice}/{key}.mp3)
  // text = fallback string used only when no MP3 clip is bundled.
  // "correct" is duplicated to bias selection toward the canonical phrase.
  CORRECT_PHRASES: {
    ar: [
      { mp3: 'correct',   text: 'إجابة صحيحة' },
      { mp3: 'correct',   text: 'إجابة صحيحة' },
      { mp3: 'great',     text: 'أحسنت' },
      { mp3: 'excellent', text: 'ممتاز' },
      { mp3: 'awesome',   text: 'رائع' },
      { mp3: 'champion',  text: 'أنت بطل' },
    ],
    en: [
      { mp3: 'correct',   text: 'Correct answer' },
      { mp3: 'correct',   text: 'Correct answer' },
      { mp3: 'great',     text: 'Great job' },
      { mp3: 'excellent', text: 'Excellent' },
      { mp3: 'awesome',   text: 'Awesome' },
      { mp3: 'champion',  text: 'You are a champion' },
    ],
  },
  WRONG_PHRASES: {
    ar: [
      { mp3: 'try_again', text: 'حاول مرة أخرى' },
      { mp3: 'try_again', text: 'حاول مرة أخرى' },
      { mp3: 'try_again', text: 'لا بأس، حاول مرّة أخرى' },
    ],
    en: [
      { mp3: 'try_again', text: 'Try again' },
      { mp3: 'try_again', text: 'Try again' },
      { mp3: 'try_again', text: "It's okay, try again" },
    ],
  },

  // ── Internal state ───────────────────────────────────────
  _lastIdx: { correct: -1, wrong: -1 },
  _lastFeedbackMs: 0,
  _DEBOUNCE_MS: 1400,

  _lang() { return (window.state?.language === 'en') ? 'en' : 'ar'; },

  _pick(arr, kind) {
    let i = Math.floor(Math.random() * arr.length);
    // Avoid playing the exact same phrase twice in a row
    if (arr.length > 1 && i === this._lastIdx[kind]) {
      i = (i + 1) % arr.length;
    }
    this._lastIdx[kind] = i;
    return arr[i];
  },

  _canSpeakNow() {
    const now = Date.now();
    if (now - this._lastFeedbackMs < this._DEBOUNCE_MS) return false;
    this._lastFeedbackMs = now;
    return true;
  },

  // Plays a phrase. Tries the natural-voice MP3 first; falls back to TTS only
  // if no clip is bundled for that key+language. Aggressively silences any
  // in-flight voice (both CloudVoice and Web Speech) so two voices can never
  // overlap — that's what produced the "two people talking" bug.
  _speak(phrase, lang) {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    try { CloudVoice?.stop?.(); } catch (_) {}

    if (typeof CloudVoice !== 'undefined' && CloudVoice.enabled
        && phrase.mp3 && CloudVoice.has(phrase.mp3, lang)) {
      CloudVoice.play(phrase.mp3, lang, { replace: true });
      return;
    }

    if (typeof Voice === 'undefined' || !Voice.enabled) return;
    Voice.speak(phrase.text, lang, { rate: 0.9, pitch: 1.05, replace: true });
  },

  // ── Public API ───────────────────────────────────────────
  /**
   * Played when the kid gives a correct answer.
   * Plays success sound first, then teacher voice.
   */
  correct() {
    if (!this._canSpeakNow()) return;
    const lang = this._lang();
    const phrase = this._pick(this.CORRECT_PHRASES[lang] || this.CORRECT_PHRASES.ar, 'correct');
    // 1) success chime
    try { Sound?.phaseComplete?.(); } catch (_) {}
    // 2) teacher voice (350ms later so sound doesn't mask speech)
    setTimeout(() => this._speak(phrase, lang), 350);
    if (window.Analytics) Analytics.track(Analytics.EVENTS.CORRECT_ANSWER, { subject: window.state?.subject });
  },

  /**
   * Played when the kid gives a wrong answer.
   * Plays gentle "try again" sound, then supportive voice.
   * Debounced to prevent spam during rapid-tap games.
   */
  wrong() {
    if (!this._canSpeakNow()) return;
    const lang = this._lang();
    const phrase = this._pick(this.WRONG_PHRASES[lang] || this.WRONG_PHRASES.ar, 'wrong');
    try { Sound?.wrongTap?.(); } catch (_) {}
    setTimeout(() => this._speak(phrase, lang), 350);
    if (window.Analytics) Analytics.track(Analytics.EVENTS.WRONG_ANSWER, { subject: window.state?.subject });
  },

  /**
   * Force-reset debounce (e.g. when a new exercise starts so the next
   * feedback isn't accidentally suppressed by the previous one).
   */
  reset() {
    this._lastFeedbackMs = 0;
  },
};

window.TeacherFeedback = TeacherFeedback;
