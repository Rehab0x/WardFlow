import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/supabase';

const settingColumns = `
  user_id,
  key,
  value,
  updated_at
`;

export async function getUserSetting<T extends Json>(key: string): Promise<T | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('user_settings')
    .select(settingColumns)
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  return (data?.value as T | undefined) ?? null;
}

export async function setUserSetting(key: string, value: Json): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,key' }
  );

  if (error) throw error;
}

export async function deleteUserSetting(key: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', userId)
    .eq('key', key);

  if (error) throw error;
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('로그인이 필요합니다.');
  return user.id;
}
