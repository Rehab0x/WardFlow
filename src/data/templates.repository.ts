import { supabase } from '@/lib/supabase';
import type { Template } from '@/db/database';
import type { TemplateField } from '@/services/templateService';
import type { Tables, Updates } from '@/types/supabase';

const templateColumns = `
  id,
  owner_id,
  field,
  name,
  content,
  scope,
  created_at,
  updated_at
`;

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select(templateColumns)
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(fromTemplateRow);
}

export async function listTemplatesByField(field: TemplateField): Promise<Template[]> {
  const fields = field === 'global' ? ['global'] : [field, 'global'];
  const { data, error } = await supabase
    .from('templates')
    .select(templateColumns)
    .in('field', fields)
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(fromTemplateRow);
}

export async function createTemplate(field: TemplateField, name: string, content: string): Promise<Template> {
  const ownerId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('templates')
    .insert({
      owner_id: ownerId,
      field,
      name,
      content,
      scope: 'personal',
    })
    .select(templateColumns)
    .single();

  if (error) throw error;
  return fromTemplateRow(data);
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, 'name' | 'content'>>
): Promise<void> {
  const update: Updates<'templates'> = {
    name: updates.name,
    content: updates.content,
  };
  const { error } = await supabase.from('templates').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw error;
}

function fromTemplateRow(row: Tables<'templates'>): Template {
  return {
    id: row.id,
    field: row.field,
    name: row.name,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
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
