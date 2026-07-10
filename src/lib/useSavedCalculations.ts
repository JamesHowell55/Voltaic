import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { useAuth } from './AuthContext';

export interface SavedCalculation {
  id: string;
  label: string;
  inputs: Record<string, unknown>;
  updated_at: string;
}

export function useSavedCalculations(calculatorSlug: string) {
  const { user } = useAuth();
  const [saves, setSaves] = useState<SavedCalculation[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoading(true);
    const { data } = await supabase
      .from('saved_calculations')
      .select('id, label, inputs, updated_at')
      .eq('calculator', calculatorSlug)
      .order('updated_at', { ascending: false });
    setSaves((data as SavedCalculation[] | null) ?? []);
    setLoading(false);
  }, [user, calculatorSlug]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (label: string, inputs: Record<string, unknown>) => {
    if (!user || !isSupabaseConfigured) return;
    await supabase.from('saved_calculations').insert({ calculator: calculatorSlug, label, inputs });
    await refresh();
  };

  const update = async (id: string, inputs: Record<string, unknown>) => {
    if (!user || !isSupabaseConfigured) return;
    await supabase.from('saved_calculations').update({ inputs, updated_at: new Date().toISOString() }).eq('id', id);
    await refresh();
  };

  const rename = async (id: string, label: string) => {
    if (!user || !isSupabaseConfigured) return;
    await supabase.from('saved_calculations').update({ label }).eq('id', id);
    await refresh();
  };

  const remove = async (id: string) => {
    if (!user || !isSupabaseConfigured) return;
    await supabase.from('saved_calculations').delete().eq('id', id);
    await refresh();
  };

  return { saves, loading, save, update, rename, remove, loggedIn: !!user };
}
