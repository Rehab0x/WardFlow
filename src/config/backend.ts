export type DataBackend = 'dexie' | 'supabase';

export const dataBackend: DataBackend =
  import.meta.env.VITE_DATA_BACKEND === 'supabase' ? 'supabase' : 'dexie';

export const useSupabaseBackend = dataBackend === 'supabase';

