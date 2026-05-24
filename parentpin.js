// ════════════════════════════════════════════════════════════
// PARENT PIN — 4-digit gate for the parent dashboard.
// • First open  → user creates a new PIN
// • Next opens  → user must enter the same PIN
// PIN is stored hashed (SHA-256 + salt) in localStorage, never plaintext.
// ════════════════════════════════════════════════════════════
const ParentPIN = {
  KEY: 'brightminds.parentpin.v1',
  SALT: '::brightminds-pin-salt-v1',

  async _hash(pin) {
    const buf = new TextEncoder().encode(pin + this.SALT);
    const out = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(out))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  },

  isSet() {
    return !!localStorage.getItem(this.KEY);
  },

  async setup(pin) {
    if (!/^\d{4}$/.test(pin)) return false;
    localStorage.setItem(this.KEY, await this._hash(pin));
    return true;
  },

  async verify(pin) {
    if (!/^\d{4}$/.test(pin)) return false;
    const stored = localStorage.getItem(this.KEY);
    if (!stored) return false;
    return (await this._hash(pin)) === stored;
  },

  // Show modal → returns Promise<boolean> (true = unlocked)
  prompt() {
    return new Promise((resolve) => {
      const firstTime = !this.isSet();
      const modal = document.getElementById('parentpin-modal');
      const titleEl = modal.querySelector('.parentpin-title');
      const subEl = modal.querySelector('.parentpin-subtitle');
      const inputEl = modal.querySelector('.parentpin-input');
      const errorEl = modal.querySelector('.parentpin-error');
      const submitBtn = modal.querySelector('.parentpin-submit');
      const cancelBtn = modal.querySelector('.parentpin-cancel');

      titleEl.textContent = firstTime
        ? '🔒 أنشئ PIN جديد للأهل'
        : '🔒 أدخل PIN الأهل';
      subEl.textContent = firstTime
        ? 'اختر 4 أرقام تتذكّرها — ستحتاجها للدخول مرّة أخرى'
        : 'أدخل الأرقام الأربعة لفتح لوحة الأهل';
      inputEl.value = '';
      errorEl.textContent = '';
      modal.classList.add('show');
      setTimeout(() => inputEl.focus(), 100);

      const cleanup = () => {
        modal.classList.remove('show');
        inputEl.removeEventListener('input', onInput);
        submitBtn.onclick = null;
        cancelBtn.onclick = null;
      };

      const handleSubmit = async () => {
        const pin = (inputEl.value || '').trim();
        const ok = firstTime ? await this.setup(pin) : await this.verify(pin);
        if (ok) {
          cleanup();
          resolve(true);
        } else {
          errorEl.textContent = firstTime
            ? 'PIN يجب أن يكون 4 أرقام'
            : 'PIN غير صحيح، حاول مرّة أخرى';
          inputEl.value = '';
          inputEl.focus();
        }
      };

      // Auto-submit when 4 digits entered (faster UX)
      const onInput = () => {
        errorEl.textContent = '';
        // Strip non-digits + cap at 4
        const v = inputEl.value.replace(/\D/g, '').slice(0, 4);
        if (v !== inputEl.value) inputEl.value = v;
        if (v.length === 4) handleSubmit();
      };

      inputEl.addEventListener('input', onInput);
      submitBtn.onclick = handleSubmit;
      cancelBtn.onclick = () => { cleanup(); resolve(false); };
    });
  },
};
