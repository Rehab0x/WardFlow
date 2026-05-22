import { supabase } from '@/lib/supabase';
import type { RegisterProfileInput, UserProfile } from '@/domain/user';
import { fromProfileRow } from '@/mappers/user.mapper';

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  if (sessionError) throw sessionError;
  const user = sessionData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? fromProfileRow(data) : null;
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return getCurrentProfile();
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function registerProfile(input: RegisterProfileInput): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username ?? null,
        display_name: input.displayName,
        department: input.department ?? null,
      },
    },
  });
  if (error) throw error;
}

export async function listPendingProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(fromProfileRow);
}

export async function listProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(fromProfileRow);
}

export async function approveProfile(
  userId: string,
  role: UserProfile['role'],
  modules: string[]
): Promise<void> {
  const current = await getCurrentProfile();
  if (!current) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('profiles')
    .update({
      role,
      modules,
      status: 'approved',
      approved_by: current.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function rejectProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'rejected' })
    .eq('id', userId);

  if (error) throw error;
}
