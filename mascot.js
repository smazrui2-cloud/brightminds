// ════════════════════════════════════════════════════════════
// MASCOT — Hakim the Wise Owl
// Inline SVG cartoon character with mood-based expressions.
// Moods: idle | happy | thinking | cheering | worried
// ════════════════════════════════════════════════════════════
const Mascot = {
  el: null,
  bubbleEl: null,
  _bubbleTimer: null,

  mount(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = this._html();
    this.el = container.querySelector('.mascot-svg');
    this.bubbleEl = container.querySelector('.mascot-bubble');
    this.setMood('idle');
  },

  setMood(mood) {
    if (!this.el) return;
    this.el.classList.remove('mood-idle','mood-happy','mood-thinking','mood-cheering','mood-worried');
    this.el.classList.add('mood-' + mood);
  },

  // Show a speech bubble. If durationMs given, auto-hide after.
  say(text, durationMs = 0) {
    if (!this.bubbleEl) return;
    clearTimeout(this._bubbleTimer);
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.add('show');
    if (durationMs > 0) {
      this._bubbleTimer = setTimeout(() => this.bubbleEl.classList.remove('show'), durationMs);
    }
  },

  hideBubble() {
    if (!this.bubbleEl) return;
    clearTimeout(this._bubbleTimer);
    this.bubbleEl.classList.remove('show');
  },

  _html() {
    // SVG owl with separate mood-toggleable parts
    return `
      <div class="mascot-wrap">
        <div class="mascot-bubble" aria-hidden="true"></div>
        <svg class="mascot-svg mood-idle" viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
          <!-- Hat brim -->
          <ellipse class="m-hatbrim" cx="60" cy="32" rx="28" ry="5" fill="#6D28D9"/>
          <!-- Hat cone -->
          <polygon class="m-hatcone" points="34,32 60,2 86,32" fill="#A855F7"/>
          <!-- Hat star -->
          <polygon class="m-hatstar" points="60,4 62,9 67,9 63,12 65,17 60,14 55,17 57,12 53,9 58,9" fill="#FBBF24"/>
          <!-- Hat band -->
          <rect class="m-hatband" x="36" y="28" width="48" height="4" rx="2" fill="#7C3AED"/>

          <!-- Body -->
          <ellipse class="m-body" cx="60" cy="78" rx="40" ry="42" fill="#7C3AED"/>
          <!-- Belly -->
          <ellipse class="m-belly" cx="60" cy="86" rx="28" ry="30" fill="#DDD6FE"/>

          <!-- Wings (left + right) -->
          <ellipse class="m-wing m-wing-l" cx="20" cy="78" rx="10" ry="24" fill="#5B21B6" transform="rotate(-12, 20, 78)"/>
          <ellipse class="m-wing m-wing-r" cx="100" cy="78" rx="10" ry="24" fill="#5B21B6" transform="rotate(12, 100, 78)"/>

          <!-- Feet -->
          <ellipse cx="48" cy="118" rx="6" ry="3" fill="#FBBF24"/>
          <ellipse cx="72" cy="118" rx="6" ry="3" fill="#FBBF24"/>

          <!-- Eye-rings (white) -->
          <circle class="m-eyering m-eyering-l" cx="45" cy="62" r="13" fill="#FFFFFF" stroke="#5B21B6" stroke-width="1.5"/>
          <circle class="m-eyering m-eyering-r" cx="75" cy="62" r="13" fill="#FFFFFF" stroke="#5B21B6" stroke-width="1.5"/>

          <!-- Pupils (open) -->
          <circle class="m-pupil m-pupil-l" cx="45" cy="62" r="5" fill="#1F1B4B"/>
          <circle class="m-pupil m-pupil-r" cx="75" cy="62" r="5" fill="#1F1B4B"/>
          <!-- Pupil highlights -->
          <circle class="m-glint m-glint-l" cx="47" cy="60" r="1.6" fill="#FFFFFF"/>
          <circle class="m-glint m-glint-r" cx="77" cy="60" r="1.6" fill="#FFFFFF"/>

          <!-- Closed-eye arcs (hidden in idle, shown in happy mood) -->
          <path class="m-eye-arc m-eye-arc-l" d="M 36 62 Q 45 70 54 62" stroke="#1F1B4B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path class="m-eye-arc m-eye-arc-r" d="M 66 62 Q 75 70 84 62" stroke="#1F1B4B" stroke-width="2.5" fill="none" stroke-linecap="round"/>

          <!-- Beak -->
          <polygon class="m-beak" points="60,68 53,77 67,77" fill="#FBBF24" stroke="#D97706" stroke-width="1"/>

          <!-- Cheeks (blush) -->
          <ellipse class="m-cheek m-cheek-l" cx="35" cy="76" rx="5" ry="3" fill="#FB7185" opacity="0.55"/>
          <ellipse class="m-cheek m-cheek-r" cx="85" cy="76" rx="5" ry="3" fill="#FB7185" opacity="0.55"/>

          <!-- Sparkles (for cheering mood) -->
          <g class="m-sparkles">
            <text x="14" y="40" font-size="14" fill="#FBBF24" class="m-sparkle">✦</text>
            <text x="98" y="42" font-size="12" fill="#22D3EE" class="m-sparkle">✧</text>
            <text x="6" y="100" font-size="10" fill="#A855F7" class="m-sparkle">✦</text>
            <text x="105" y="100" font-size="11" fill="#34D399" class="m-sparkle">✧</text>
          </g>
        </svg>
      </div>
    `;
  },
};
