// ════════════════════════════════════════════════════════════
// TEACHER FEEDBACK — central, kid-friendly answer reactions.
// • Random phrase pool (no two-in-a-row repetition)
// • Sound first, then voice (350ms gap so they don't overlap)
// • Debounced (1.4s) — protects against spam taps
// • SpeechSynthesis fallback: rate 0.9, pitch 1.05 (warm + clear)
// • Silent no-op if Voice module is missing — never crashes the game
// ════════════════════════════════════════════════════════════
const TeacherFeedback = {
  // ── Phrase pools ─────────────────────────────────────────
  // The "main" phrase is duplicated to bias random selection toward it.
  CORRECT_PHRASES: {
    ar: [
      'الإجابة صحيحة، ممتاز!',  // main (duplicated → ~33% chance)
      'الإجابة صحيحة، ممتاز!',
      'أحسنت!',
      'رائع!',
      'ممتاز يا بطل!',
      'عمل رائع!',
      'إجابة صحيحة!',
    ],
    en: [
      'Correct, excellent!',
      'Correct, excellent!',
      'Well done!',
      'Great!',
      'Awesome job!',
      'Excellent work!',
      "That's right!",
    ],
  },
  WRONG_PHRASES: {
    ar: [
      'الإجابة خاطئة، حاول مرّة أخرى',  // main
      'الإجابة خاطئة، حاول مرّة أخرى',
      'لا بأس، حاول مرّة أخرى',
      'اقتربت!',
      'حاول من جديد',
      'فكّر قليلاً ثم جرّب مرّة أخرى',
    ],
    en: [
      'Not quite, try again',
      'Not quite, try again',
      "It's okay, try again",
      'Close!',
      'Try once more',
      'Think a moment, then try again',
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

  _speak(text, lang) {
    if (typeof Voice === 'undefined' || !Voice.enabled) return;
    // Cancel any in-flight utterance to avoid stacking / overlap on mobile
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    Voice.speak(text, lang, {
      rate: 0.9,
      pitch: 1.05,
      replace: true,
    });
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
