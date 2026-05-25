// ════════════════════════════════════════════════════════════
// POST /api/create-checkout
// Body: { plan: 'monthly' | 'yearly' }
// Returns: { url } → frontend redirects user to Stripe Checkout
// ════════════════════════════════════════════════════════════
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
});

export default async function handler(req, res) {
  // CORS for safety (same-origin will pass anyway)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // SECURITY: reject calls from non-canonical hosts (defence in depth even
  // if duplicate Vercel projects are still alive)
  const host = req.headers.host || '';
  const allowedHosts = ['brightminds-app.vercel.app', 'brightminds.kids', 'www.brightminds.kids', 'localhost', '127.0.0.1'];
  if (!allowedHosts.some(h => host === h || host.startsWith(h + ':'))) {
    return res.status(403).json({ error: 'Forbidden: non-canonical host' });
  }

  try {
    const { plan } = req.body || {};
    const priceId = plan === 'yearly'
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured' });
    }

    // SECURITY: never trust req.headers.host — always redirect to canonical.
    // Prevents a duplicate Vercel alias from completing a checkout flow that
    // returns the user to the wrong origin.
    const CANONICAL_ORIGIN = process.env.CANONICAL_ORIGIN || 'https://brightminds-app.vercel.app';
    const origin = CANONICAL_ORIGIN;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { app: 'brightminds', plan },
      },
      success_url: `${origin}/?premium=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?premium=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Customer email is collected by Stripe Checkout itself
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
