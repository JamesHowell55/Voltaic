import Stripe from 'stripe';

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(secretKey);
}
