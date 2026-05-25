// ════════════════════════════════════════════════════════════
// PREMIUM — frontend subscription state.
// • Sources of truth: localStorage (fast) + backend (authoritative)
// • Backend re-check on app load + once a day, to detect cancellations.
// • All locked subjects are visually marked with 🔒 + paywall on click.
// ════════════════════════════════════════════════════════════
const Premium = {
  KEY: 'brightminds.premium.v1',

  // Which subjects are FREE forever; everything else needs Premium.
  FREE_SUBJECTS: ['multiply', 'letters', 'memory', 'story'],

  // ── State accessors ─────────────────────────────────────
  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
    catch { return {}; }
  },
  _save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch {}
  },

  /** Returns true if user has active Premium right now (local check only) */
  isActive() {
    const d = this._load();
    if (!d.until) return false;
    return d.until > Date.now() && d.status !== 'cancelled';
  },

  /** Returns true if a subject requires Premium and user doesn't have it */
  isLocked(subject) {
    return !this.FREE_SUBJECTS.includes(subject) && !this.isActive();
  },

  email() { return this._load().email || null; },

  // ── Backend verification ────────────────────────────────
  /**
   * Verify subscription with backend. Called:
   *   - After Stripe redirects back (with session_id in URL)
   *   - On app load (with stored email)
   *   - Once per 24h while app is open
   * Updates localStorage based on truth.
   */
  async verify({ sessionId, email } = {}) {
    try {
      const params = new URLSearchParams();
      if (sessionId) params.set('session_id', sessionId);
      else if (email) params.set('email', email);
      else if (this.email()) params.set('email', this.email());
      else return false;

      const r = await fetch(`/api/verify-session?${params}`);
      const data = await r.json();

      if (data.active) {
        this._save({
          email: data.email,
          until: data.currentPeriodEnd,
          status: data.status,
          planType: data.planType,
          trialEnd: data.trialEnd,
          lastVerified: Date.now(),
        });
        return true;
      } else {
        // Backend says inactive → clear local state
        const cur = this._load();
        if (cur.email) this._save({ ...cur, status: 'inactive', until: 0 });
        return false;
      }
    } catch (e) {
      // Network error — keep current local state, don't lock user out
      console.warn('Premium.verify failed (offline?):', e.message);
      return this.isActive();
    }
  },

  // ── Checkout flow ───────────────────────────────────────
  async startCheckout(plan = 'yearly') {
    try {
      const r = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await r.json();
      if (data.url) {
        if (window.Analytics) Analytics.track(Analytics.EVENTS.CHECKOUT_STARTED, { plan });
        window.location.href = data.url;
      } else {
        if (window.Analytics) Analytics.track(Analytics.EVENTS.SUBSCRIPTION_FAILED, { reason: 'no_url', plan });
        alert('فشل بدء الدفع — حاول مرّة أخرى. ' + (data.error || ''));
      }
    } catch (e) {
      if (window.Analytics) Analytics.track(Analytics.EVENTS.SUBSCRIPTION_FAILED, { reason: 'network', plan });
      alert('فشل الاتصال بخادم الدفع. تأكّد من الإنترنت.');
    }
  },

  // ── Customer Portal (manage/cancel) ─────────────────────
  async openPortal() {
    const email = this.email();
    if (!email) { alert('لا يوجد اشتراك حالي'); return; }
    try {
      const r = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (data.url) window.location.href = data.url;
      else alert('فشل فتح لوحة الإدارة');
    } catch (e) {
      alert('فشل الاتصال');
    }
  },

  // ── Post-redirect handler (runs once on app load) ───────
  async handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('premium');
    const sessionId = params.get('session_id');

    if (status === 'success' && sessionId) {
      // Stripe redirected user back successfully. Verify + welcome.
      const ok = await this.verify({ sessionId });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      if (ok) {
        if (window.Analytics) {
          const planType = this._load().planType || 'unknown';
          Analytics.track(Analytics.EVENTS.SUBSCRIPTION_STARTED, { plan: planType });
        }
        this._showWelcome();
        if (typeof applyPremiumLocks === 'function') applyPremiumLocks();
        return true;
      }
    } else if (status === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    return false;
  },

  _showWelcome() {
    // Lightweight welcome toast (real UI element is in DOM)
    const el = document.getElementById('premium-welcome');
    if (el) {
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 5000);
    }
  },
};

// Auto-initialise on script load
(async () => {
  // 1. Handle post-checkout redirect first
  await Premium.handleRedirect();
  // 2. Background re-verify if it's been > 24h
  const last = Premium._load().lastVerified || 0;
  if (Premium._load().email && Date.now() - last > 24 * 60 * 60 * 1000) {
    Premium.verify();
  }
})();

window.Premium = Premium;
