// ════════════════════════════════════════════════════════════
// POST /api/webhook
// Stripe → us. Stores subscription state in Vercel KV.
// Configure in Stripe Dashboard → Developers → Webhooks:
//   Endpoint URL: https://YOUR-DOMAIN.vercel.app/api/webhook
//   Events to listen to:
//     - checkout.session.completed
//     - customer.subscription.updated
//     - customer.subscription.deleted
// ════════════════════════════════════════════════════════════
import Stripe from 'stripe';
import { kv } from '@vercel/kv';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
});

// Vercel needs raw body for Stripe signature verification
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let event;
  try {
    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(
      buf, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const subId = session.subscription;
        if (subId && customerEmail) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await saveSubscription(customerEmail, sub, session.id);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        if (customer.email) await saveSubscription(customer.email, sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        if (customer.email) {
          // Mark as cancelled (don't delete — keep history)
          const key = `sub:${customer.email.toLowerCase()}`;
          const existing = (await kv.get(key)) || {};
          await kv.set(key, { ...existing, status: 'cancelled', cancelledAt: Date.now() });
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('webhook handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function saveSubscription(email, sub, sessionId) {
  const key = `sub:${email.toLowerCase()}`;
  const data = {
    email: email.toLowerCase(),
    subscriptionId: sub.id,
    customerId: sub.customer,
    status: sub.status,                                // active / trialing / past_due / canceled
    currentPeriodEnd: sub.current_period_end * 1000,   // ms
    trialEnd: sub.trial_end ? sub.trial_end * 1000 : null,
    planType: sub.items.data[0]?.price?.recurring?.interval || 'month',
    updatedAt: Date.now(),
  };
  await kv.set(key, data);

  // Also map session ID → email (for redirect verification)
  if (sessionId) {
    await kv.set(`session:${sessionId}`, email.toLowerCase(), { ex: 60 * 60 }); // 1h
  }
}
