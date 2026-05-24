# BrightMinds QA — Production-Ready Code Fixes

## P0-1: Stop Premium localStorage spoofing

### a) Backend signs a short JWT-style token

```js
// api/verify-session.js (UPDATE — add signed token)
import crypto from 'crypto';

function signToken(payload, secret) {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

// In handler, replace `return res.status(200).json({...})` with:
const token = signToken(
  { email: sub.email, until: sub.currentPeriodEnd, sub: sub.subscriptionId },
  process.env.TOKEN_SECRET
);
return res.status(200).json({
  active: isActive,
  email: sub.email,
  status: sub.status,
  currentPeriodEnd: sub.currentPeriodEnd,
  trialEnd: sub.trialEnd,
  planType: sub.planType,
  token  // ← NEW
});
```

### b) New endpoint to verify token

```js
// api/verify-token.js (NEW FILE)
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ valid: false });

  const [head, body, sig] = token.split('.');
  if (!head || !body || !sig) return res.status(200).json({ valid: false });

  const expected = crypto.createHmac('sha256', process.env.TOKEN_SECRET)
    .update(`${head}.${body}`).digest('base64url');

  if (sig !== expected) return res.status(200).json({ valid: false, reason: 'bad_signature' });

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.until < Date.now()) return res.status(200).json({ valid: false, reason: 'expired' });

  return res.status(200).json({ valid: true, email: payload.email, until: payload.until });
}
```

### c) Frontend stores + checks the token

```js
// premium.js — REPLACE isActive() with:
async isActive() {
  const d = this._load();
  if (!d.token || !d.until) return false;
  if (d.until <= Date.now()) return false;

  // Re-validate signature with backend once per day
  const lastCheck = d.lastVerified || 0;
  if (Date.now() - lastCheck > 24 * 60 * 60 * 1000) {
    try {
      const r = await fetch('/api/verify-token', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ token: d.token })
      });
      const { valid } = await r.json();
      if (!valid) {
        localStorage.removeItem(this.KEY);
        return false;
      }
      this._save({ ...d, lastVerified: Date.now() });
    } catch { /* network error — trust cache */ }
  }
  return true;
}

// Synchronous version for hot paths (no network):
isActiveSync() {
  const d = this._load();
  return d.token && d.until > Date.now();
}
```

---

## P0-2: Remove Owner Mode paywall bypass

```js
// app.js:559 — REMOVE devMode check
// BEFORE:
if (typeof Premium !== 'undefined' && Premium.isLocked(subject) && !state.profile.devMode) {

// AFTER:
if (typeof Premium !== 'undefined' && Premium.isLocked(subject)) {
```

---

## P0-3: Fix viewport accessibility

```html
<!-- index.html:5 — REPLACE -->
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## P0-4: Add CSP header

```json
// vercel.json — ADD to headers array (and poc/vercel.json)
{
  "source": "/(.*)",
  "headers": [
    {
      "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cloud.umami.is https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://cloud.umami.is https://api.stripe.com https://cloud.umami.is; frame-src https://checkout.stripe.com https://js.stripe.com; media-src 'self';"
    }
  ]
}
```

---

## P0-5: Parental consent before Stripe

```js
// premium.js — UPDATE startCheckout
async startCheckout(plan = 'yearly') {
  const consent = confirm(
    'هل أنت ولي أمر الطفل وعمرك 18 سنة أو أكثر؟\n\n' +
    'Are you the parent and 18+ years old?'
  );
  if (!consent) {
    if (window.track) window.track('checkout_consent_denied');
    return;
  }
  // ... existing code
}
```

---

## P1-1: Touch targets ≥ 44px

```css
/* styles.css — ADD to end */
.icon-btn,
.sound-toggle,
.splash-skip,
.settings-close {
  min-width: 44px;
  min-height: 44px;
}
.btn-secondary,
#btn-back-home,
#btn-session-home {
  min-height: 48px;
}
```

---

## P1-2: ESC + backdrop close Paywall

```js
// paywall.js — ADD inside DOMContentLoaded handler
document.querySelectorAll('.pwall').forEach(p => {
  p.addEventListener('click', (e) => {
    if (e.target === p) Paywall.hide();
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') Paywall.hide();
});
```

---

## P1-3: Loading state on checkout

```js
// premium.js — UPDATE startCheckout body
async startCheckout(plan = 'yearly', clickedBtn = null) {
  // ... consent check ...

  if (clickedBtn) {
    clickedBtn.disabled = true;
    clickedBtn._origHTML = clickedBtn.innerHTML;
    clickedBtn.innerHTML = '⏳ جارٍ التحويل...';
  }

  try {
    const r = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await r.json();
    if (data.url) {
      if (window.track) window.track('checkout_started', { plan });
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'فشل بدء الدفع');
    }
  } catch (e) {
    alert('فشل: ' + e.message);
  } finally {
    if (clickedBtn) {
      clickedBtn.disabled = false;
      clickedBtn.innerHTML = clickedBtn._origHTML;
    }
  }
}

// paywall.js — UPDATE button handlers
document.getElementById('paywall-yearly')?.addEventListener('click', (e) => {
  Premium.startCheckout('yearly', e.currentTarget);
});
document.getElementById('paywall-monthly')?.addEventListener('click', (e) => {
  Premium.startCheckout('monthly', e.currentTarget);
});
```

---

## P1-4: "Forgot PIN" option

```html
<!-- index.html — INSIDE .parentpin-card, after .parentpin-error -->
<button type="button" class="parentpin-forgot" style="background:none;border:none;color:#8B5CF6;text-decoration:underline;cursor:pointer;font-size:13px;margin-top:8px">
  نسيت PIN؟
</button>
```

```js
// parentpin.js — INSIDE prompt(), after cancelBtn handler:
const forgotBtn = modal.querySelector('.parentpin-forgot');
if (forgotBtn) {
  forgotBtn.style.display = firstTime ? 'none' : 'block';
  forgotBtn.onclick = () => {
    if (confirm('سيُعاد تعيين PIN. تقدّم الطفل لن يُحذف. هل أنت متأكّد؟')) {
      localStorage.removeItem(this.KEY);
      cleanup();
      // re-prompt as first-time setup
      this.prompt().then(resolve);
    }
  };
}
```

---

## P1-5: Safe-area for iPhone notch

```css
/* styles.css — ADD near top */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
.top-bar,
.sound-toggle-wrap,
.parent-btn {
  top: max(18px, env(safe-area-inset-top));
}
```

---

## P1-6: PIN rate limiting

```js
// parentpin.js — UPDATE verify()
const FAILS_KEY = 'brightminds.pinfails.v1';

async verify(pin) {
  // Check lockout
  try {
    const fails = JSON.parse(localStorage.getItem(FAILS_KEY) || '{"count":0,"until":0}');
    if (fails.until > Date.now()) {
      const secs = Math.ceil((fails.until - Date.now()) / 1000);
      throw new Error(`مقفل. حاول بعد ${secs} ثانية`);
    }
  } catch { /* corrupted, treat as fresh */ }

  if (!/^\d{4}$/.test(pin)) return false;
  const stored = localStorage.getItem(this.KEY);
  if (!stored) return false;

  const match = (await this._hash(pin)) === stored;

  // Update fail counter
  const fails = JSON.parse(localStorage.getItem(FAILS_KEY) || '{"count":0,"until":0}');
  if (!match) {
    fails.count = (fails.count || 0) + 1;
    if (fails.count >= 5) {
      // 1, 2, 4, 8, 16 minutes
      fails.until = Date.now() + Math.pow(2, Math.min(fails.count - 5, 4)) * 60_000;
    }
    localStorage.setItem(FAILS_KEY, JSON.stringify(fails));
    return false;
  }
  // Success — reset fails
  localStorage.removeItem(FAILS_KEY);
  return true;
},
```

---

## P1-7: Custom event when Premium changes (same-tab re-render)

```js
// premium.js — UPDATE _save()
_save(data) {
  try {
    localStorage.setItem(this.KEY, JSON.stringify(data));
    // Notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new CustomEvent('premium-changed', { detail: data }));
  } catch {}
},

// app.js — REPLACE the storage event listener with:
window.addEventListener('premium-changed', () => applyPremiumLocks());
window.addEventListener('storage', (e) => {
  if (e.key === 'brightminds.premium.v1') applyPremiumLocks();
});
```

---

## P2-1: Stripe rate limit per IP

```js
// api/create-checkout.js — ADD before stripe.checkout.sessions.create()
import { kv } from '@vercel/kv';

const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
const key = `rl:checkout:${ip}`;
const count = parseInt(await kv.get(key)) || 0;
if (count >= 10) {
  return res.status(429).json({ error: 'Too many requests, try again later' });
}
await kv.set(key, count + 1, { ex: 3600 });
```

---

## P2-2: SW seamless updates

```js
// sw.js — UPDATE install handler
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting(); // ← outside the .then()
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

```js
// app.js — ADD at end of initial SW registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW?.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          // New version ready — show banner
          showUpdateToast(() => newSW.postMessage({ type: 'SKIP_WAITING' }));
        }
      });
    });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
```

---

## P2-3: Right to be Forgotten endpoint

```js
// api/delete-user.js (NEW)
import { kv } from '@vercel/kv';
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, token } = req.body || {};
  // TODO: verify token before allowing delete

  const sub = await kv.get(`sub:${email.toLowerCase()}`);
  if (sub?.subscriptionId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.subscriptions.cancel(sub.subscriptionId).catch(() => {});
  }
  await kv.del(`sub:${email.toLowerCase()}`);
  return res.status(200).json({ deleted: true });
}
```
