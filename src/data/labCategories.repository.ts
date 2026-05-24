import { supabase } from '@/lib/supabase';
import type { LabDisplayCategory } from '@/db/database';
import type { Inserts, Tables } from '@/types/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const labCategoryColumns = `
  id,
  owner_id,
  name,
  display_order,
  items,
  created_at,
  updated_at
`;

export async function listLabCategories(): Promise<LabDisplayCategory[]> {
  const ownerId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('lab_categories')
    .select(labCategoryColumns)
    .order('display_order', { ascending: true });

  if (error) throw error;
  const ownRows = data.filter((row) => row.owner_id === ownerId);
  const rows = ownRows.length > 0 ? ownRows : data.filter((row) => row.owner_id === null);
  return rows.map(fromLabCategoryRow);
}

export async function replaceOwnLabCategories(categories: LabDisplayCategory[]): Promise<LabDisplayCategory[]> {
  const ownerId = await getCurrentUserId();
  const { error: deleteError } = await supabase
    .from('lab_categories')
    .delete()
    .eq('owner_id', ownerId);

  if (deleteError) throw deleteError;

  const rows = categories.map((category, index) => toLabCategoryInsert(category, index, ownerId));
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('lab_categories')
    .insert(rows)
    .select(labCategoryColumns)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data.map(fromLabCategoryRow);
}

export async function resetOwnLabCategories(): Promise<void> {
  const ownerId = await getCurrentUserId();
  const { error } = await supabase.from('lab_categories').delete().eq('owner_id', ownerId);
  if (error) throw error;
}

function fromLabCategoryRow(row: Tables<'lab_categories'>): LabDisplayCategory {
  return {
    id: row.id,
    name: row.name,
    order: row.display_order,
    items: row.items,
  };
}

function toLabCategoryInsert(
  category: LabDisplayCategory,
  order: number,
  ownerId: string
): Inserts<'lab_categories'> {
  return {
    ...(UUID_RE.test(category.id) ? { id: category.id } : {}),
    owner_id: ownerId,
    name: category.name,
    display_order: order,
    items: category.items,
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
