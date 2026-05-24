export type DataBackend = 'dexie' | 'supabase';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
export const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const dataBackend: DataBackend =
  import.meta.env.VITE_DATA_BACKEND === 'supabase' ? 'supabase' : 'dexie';

export const useSupabaseBackend = dataBackend === 'supabase' && isSupabaseConfigured;

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
}

if (dataBackend === 'supabase' && !isSupabaseConfigured) {
  console.warn(
    'VITE_DATA_BACKEND is supabase, but VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Falling back to IndexedDB/Dexie.'
  );
}

