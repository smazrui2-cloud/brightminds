// ════════════════════════════════════════════════════════════
// GET /api/verify-session?session_id=cs_xxx
//   → called by frontend after Stripe redirects back
//   → returns { email, status, currentPeriodEnd }
//
// GET /api/verify-session?email=user@x.com
//   → called periodically to re-check (e.g. on app load)
//   → returns same shape, or { active: false }
// ════════════════════════════════════════════════════════════
import { kv } from '@vercel/kv';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end();

  const { session_id, email } = req.query;

  try {
    let targetEmail = email && email.toLowerCase();

    // If session_id provided, look up email (and fall back to Stripe API)
    if (session_id) {
      targetEmail = await kv.get(`session:${session_id}`);
      if (!targetEmail) {
        // Webhook hasn't fired yet — fetch from Stripe directly
        const session = await stripe.checkout.sessions.retrieve(session_id);
        targetEmail = (session.customer_email || session.customer_details?.email)?.toLowerCase();
      }
    }

    if (!targetEmail) {
      return res.status(200).json({ active: false, reason: 'no_email' });
    }

    const sub = await kv.get(`sub:${targetEmail}`);
    if (!sub) {
      return res.status(200).json({ active: false, reason: 'no_subscription' });
    }

    const now = Date.now();
    const isActive = ['active', 'trialing'].includes(sub.status)
      && sub.currentPeriodEnd > now;

    return res.status(200).json({
      active: isActive,
      email: sub.email,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEnd: sub.trialEnd,
      planType: sub.planType,
    });
  } catch (err) {
    console.error('verify-session error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
