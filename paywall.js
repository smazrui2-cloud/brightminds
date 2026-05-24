// ════════════════════════════════════════════════════════════
// PAYWALL — two-screen flow:
//   1. Kid-friendly screen (no pricing): "ask mom/dad"
//   2. Parent screen (real pricing, Stripe Checkout)
// ════════════════════════════════════════════════════════════
const Paywall = {
  /** Show the kid-friendly version (when a child taps a locked game) */
  showKid() {
    if (window.track) window.track('paywall_kid_shown');
    document.getElementById('paywall-kid')?.classList.add('show');
    document.getElementById('paywall-parent')?.classList.remove('show');
  },

  /** Show the parent version (real pricing + Stripe button) */
  showParent(trigger = 'manual') {
    if (window.track) window.track('paywall_parent_shown', { trigger });
    document.getElementById('paywall-kid')?.classList.remove('show');
    document.getElementById('paywall-parent')?.classList.add('show');
  },

  hide() {
    document.getElementById('paywall-kid')?.classList.remove('show');
    document.getElementById('paywall-parent')?.classList.remove('show');
  },
};

// Wire up buttons once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Close buttons
  document.querySelectorAll('[data-paywall-close]').forEach(b =>
    b.addEventListener('click', () => Paywall.hide())
  );

  // "Ask parents" button on kid screen → opens parent screen
  document.getElementById('paywall-to-parent')?.addEventListener('click', () => {
    Paywall.showParent('kid_to_parent');
  });

  // Pricing buttons → Stripe Checkout
  document.getElementById('paywall-yearly')?.addEventListener('click', () => {
    Premium.startCheckout('yearly');
  });
  document.getElementById('paywall-monthly')?.addEventListener('click', () => {
    Premium.startCheckout('monthly');
  });

  // Manage subscription button (if active)
  document.getElementById('paywall-manage')?.addEventListener('click', () => {
    Premium.openPortal();
  });
});

window.Paywall = Paywall;

// ── Premium lock helpers ────────────────────────────────────
// Apply 🔒 badge to all locked subject cards
window.applyPremiumLocks = function () {
  document.querySelectorAll('.subject[data-subject]').forEach(el => {
    const subj = el.dataset.subject;
    const locked = Premium.isLocked(subj);
    el.classList.toggle('premium-locked', locked);
    // Add 🔒 badge once
    if (locked && !el.querySelector('.premium-lock-badge')) {
      const badge = document.createElement('div');
      badge.className = 'premium-lock-badge';
      badge.textContent = '🔒';
      el.appendChild(badge);
    } else if (!locked) {
      el.querySelector('.premium-lock-badge')?.remove();
    }
  });
};
