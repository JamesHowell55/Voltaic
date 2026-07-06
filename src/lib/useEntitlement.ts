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

export function useEntitlement(): Entitlement {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<Omit<Entitlement, 'loading'>>(FREE_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  return { ...entitlement, loading };
}
