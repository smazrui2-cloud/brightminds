// ════════════════════════════════════════════════════════════
// POST /api/portal
// Body: { email }
// Returns: { url } → redirect user to Stripe's hosted billing portal
//   (cancel subscription, change payment method, view invoices)
// ════════════════════════════════════════════════════════════
import Stripe from 'stripe';
import { kv } from '@vercel/kv';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });

    const sub = await kv.get(`sub:${email.toLowerCase()}`);
    if (!sub?.customerId) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.customerId,
      return_url: `${origin}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
