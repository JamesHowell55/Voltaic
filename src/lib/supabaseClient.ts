import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Falls back to a harmless placeholder client when env vars aren't set (e.g. this
// repo checked out fresh, before the manual Supabase setup in supabase/migration.sql
// has been done) — auth calls will simply fail rather than crashing the whole app
// at import time.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-anon-key');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
