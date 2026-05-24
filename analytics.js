// ════════════════════════════════════════════════════════════
// ANALYTICS — privacy-first, kid-safe event tracking.
//
// What we DO track: aggregate counts of game/session events
// What we NEVER track: child's name, age, gender, exact answers,
//   any text they typed, IP, location, device fingerprint.
//
// Works with Umami (cloud OR self-hosted). If the Umami script
// isn't loaded, every call is a no-op — never breaks the app.
// ════════════════════════════════════════════════════════════
(function () {
  // Public API: window.track(eventName, propsObject?)
  window.track = function (event, props) {
    try {
      // Strip any accidentally-passed personal fields
      const safe = sanitize(props);
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(event, safe);
      }
      // Easy to add more providers later (Plausible, PostHog, etc.)
    } catch (_) { /* never break the app */ }
  };

  // Block specific keys that might accidentally leak personal data
  const BLOCKED_KEYS = new Set([
    'name', 'childName', 'email', 'phone', 'ip', 'address',
    'gender', 'birthday', 'fullName', 'answer'
  ]);
  function sanitize(props) {
    if (!props || typeof props !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(props)) {
      if (BLOCKED_KEYS.has(k)) continue;
      // Cap string length to prevent leaking long text
      if (typeof v === 'string') out[k] = v.slice(0, 50);
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    }
    return out;
  }

  // PWA install tracking (no setup needed)
  window.addEventListener('appinstalled', () => window.track('pwa_installed'));
})();
