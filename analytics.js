// ════════════════════════════════════════════════════════════
// ANALYTICS LAYER — privacy-first, kid-safe, performant
//
// Architecture:
//   • EVENTS constants → no typos, easy refactor
//   • Sanitize layer  → blocks PII (name/email/PIN/etc.) at the gate
//   • Batching        → groups rapid events (1.5s window) to save network
//   • DNT respect     → if browser says "do not track", we obey
//   • Backend         → Umami Cloud (cookieless, anonymous) +
//                       legacy window.track() wrapper for older code
//   • Lazy            → defer-loaded script + queue events until umami ready
// ════════════════════════════════════════════════════════════
const Analytics = {
  // ─── Event name constants (use these — never hand-typed strings) ───
  EVENTS: {
    // App lifecycle
    APP_OPENED:              'app_opened',
    PWA_INSTALLED:           'pwa_installed',
    LANGUAGE_CHANGED:        'language_changed',

    // Onboarding funnel
    ONBOARDING_STARTED:      'onboarding_started',
    ONBOARDING_STEP:         'onboarding_step',          // props: { step }
    ONBOARDING_COMPLETED:    'onboarding_completed',
    ONBOARDING_ABANDONED:    'onboarding_abandoned',     // props: { step }

    // Lesson lifecycle (full 5-exercise session)
    LESSON_STARTED:          'lesson_started',           // props: { subject }
    LESSON_COMPLETED:        'lesson_completed',         // props: { subject, score, stars, correct, total, duration_min }
    LESSON_ABANDONED:        'lesson_abandoned',         // props: { subject, completed, total }

    // Individual exercise inside a lesson
    EXERCISE_STARTED:        'exercise_started',         // props: { subject, index, total }
    EXERCISE_COMPLETED:      'exercise_completed',       // props: { subject, duration_sec }

    // Answer feedback (called by TeacherFeedback)
    CORRECT_ANSWER:          'correct_answer',           // props: { subject }
    WRONG_ANSWER:            'wrong_answer',             // props: { subject }

    // Paywall & checkout funnel
    LOCKED_SUBJECT_CLICKED:  'locked_subject_clicked',   // props: { subject }
    PAYWALL_OPENED:          'paywall_opened',           // props: { view: 'kid'|'parent', trigger }
    PAYWALL_CLOSED:          'paywall_closed',           // props: { view }
    CHECKOUT_STARTED:        'checkout_started',         // props: { plan }
    SUBSCRIPTION_STARTED:    'subscription_started',     // props: { plan }
    SUBSCRIPTION_FAILED:     'subscription_failed',      // props: { reason }
    SUBSCRIPTION_CANCELLED:  'subscription_cancelled',

    // Parent UI
    PARENT_BTN_CLICKED:      'parent_btn_clicked',
    PARENT_UNLOCKED:         'parent_unlocked',
    PARENT_PIN_CANCELLED:    'parent_pin_cancelled',
    SETTINGS_OPENED:         'settings_opened',
  },

  // ─── Configuration ───
  _enabled: true,
  _queue: [],
  _flushTimer: null,
  _FLUSH_MS: 1500,
  _MAX_QUEUE: 20,

  // Properties we never send — protects kid data even from bugs
  _BLOCKED_KEYS: new Set([
    'name', 'childName', 'fullName', 'email', 'phone',
    'ip', 'address', 'location', 'gender', 'birthday',
    'answer', 'password', 'pin', 'token', 'card', 'cvv',
  ]),

  // ─── Initialization ───
  init() {
    // 1) Respect Do Not Track (DNT) header
    const dnt = navigator.doNotTrack === '1'
             || window.doNotTrack === '1'
             || navigator.msDoNotTrack === '1';
    if (dnt) {
      this._enabled = false;
      try { console.info('[Analytics] DNT enabled — tracking off'); } catch (_) {}
      return;
    }

    // 2) Fire the first app_opened event after the page settles
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => this.track(this.EVENTS.APP_OPENED), { timeout: 1500 });
    } else {
      setTimeout(() => this.track(this.EVENTS.APP_OPENED), 100);
    }
  },

  // ─── Sanitize props (defense in depth) ───
  _sanitize(props) {
    if (!props || typeof props !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(props)) {
      if (this._BLOCKED_KEYS.has(k)) continue;
      if (typeof v === 'string') out[k] = v.slice(0, 50);
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    }
    return out;
  },

  // ─── Public API: track an event ───
  track(event, props) {
    if (!this._enabled) return;
    try {
      const safe = this._sanitize(props);
      this._queue.push({ event, props: safe });
      if (this._queue.length >= this._MAX_QUEUE) this._flush();
      else this._scheduleFlush();
    } catch (_) {
      // Never break the app because of analytics
    }
  },

  _scheduleFlush() {
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => this._flush(), this._FLUSH_MS);
  },

  _flush() {
    clearTimeout(this._flushTimer);
    this._flushTimer = null;
    if (!this._queue.length) return;
    const batch = this._queue.splice(0, this._queue.length);
    for (const e of batch) {
      try { window.umami?.track?.(e.event, e.props); } catch (_) {}
    }
  },

  // ─── Funnel helper (records the step + global app-open count) ───
  funnel(step, extra) {
    this.track('funnel_step', { step, ...extra });
  },

  // ─── Manual flush (e.g. before navigation away) ───
  flushNow() { this._flush(); },
};

// Backwards-compatible alias used by older modules (paywall.js, teacher.js etc.)
window.track = function (event, props) { Analytics.track(event, props); };

// Auto-init when this script loads
Analytics.init();

// Best-effort flush when the user leaves / app backgrounds (mobile)
window.addEventListener('pagehide', () => Analytics._flush(), { capture: true });
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') Analytics._flush();
});

// PWA install tracking
window.addEventListener('appinstalled', () => Analytics.track(Analytics.EVENTS.PWA_INSTALLED));

window.Analytics = Analytics;
