import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

export type Plan = 'free' | 'premium_subscription' | 'premium_lifetime';

export interface Entitlement {
  plan: Plan;
  isPremium: boolean;
  loading: boolean;
  currentPeriodEnd: string | null;
}

const FREE_ENTITLEMENT: Omit<Entitlement, 'loading'> = { plan: 'free', isPremium: false, currentPeriodEnd: null };

// TEMPORARY: the premium paywall is switched off while the calculator library
// is still being built out — every visitor is treated as premium so nothing
// is behind a lock yet. All the gating machinery (PremiumGate, Busbar's
// section/load-profile limits, the Supabase entitlement lookup below, Stripe
// checkout, the webhook, etc.) is unchanged and ready to go — flip this back
// to `true` when it's time to actually launch the paywall.
const GATING_ENABLED = false;
const EVERYONE_IS_PREMIUM_ENTITLEMENT: Omit<Entitlement, 'loading'> = { plan: 'premium_lifetime', isPremium: true, currentPeriodEnd: null };

export function useEntitlement(): Entitlement {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<Omit<Entitlement, 'loading'>>(FREE_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!GATING_ENABLED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (!user) {
      setEntitlement(FREE_ENTITLEMENT);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('entitlements')
      .select('plan, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const plan: Plan = (data?.plan as Plan) ?? 'free';
        setEntitlement({ plan, isPremium: plan === 'premium_subscription' || plan === 'premium_lifetime', currentPeriodEnd: data?.current_period_end ?? null });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!GATING_ENABLED) return { ...EVERYONE_IS_PREMIUM_ENTITLEMENT, loading: false };

  return { ...entitlement, loading };
}
