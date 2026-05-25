import { supabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/supabase';

export interface BackupSnapshotSummary {
  id: string;
  kind: 'manual' | 'automatic' | 'migration';
  recordCounts: Json;
  contentHash?: string;
  appVersion?: string;
  createdAt: Date;
}

type BackupSnapshotSummaryRow = Pick<
  Tables<'backup_snapshots'>,
  'id' | 'kind' | 'record_counts' | 'content_hash' | 'app_version' | 'created_at'
>;

const backupSnapshotSummaryColumns = `
  id,
  kind,
  record_counts,
  content_hash,
  app_version,
  created_at
`;

function fromBackupSnapshotRow(row: BackupSnapshotSummaryRow): BackupSnapshotSummary {
  return {
    id: row.id,
    kind: row.kind,
    recordCounts: row.record_counts,
    contentHash: row.content_hash ?? undefined,
    appVersion: row.app_version ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function createBackupSnapshot(input: {
  ownerId: string;
  kind: BackupSnapshotSummary['kind'];
  encryptedData: string;
  recordCounts: Json;
  contentHash?: string;
  appVersion?: string;
}): Promise<BackupSnapshotSummary> {
  const { data, error } = await supabase
    .from('backup_snapshots')
    .insert({
      owner_id: input.ownerId,
      kind: input.kind,
      encrypted_data: input.encryptedData,
      record_counts: input.recordCounts,
      content_hash: input.contentHash ?? null,
      app_version: input.appVersion ?? null,
    })
    .select(backupSnapshotSummaryColumns)
    .single();

  if (error) throw error;
  return fromBackupSnapshotRow(data);
}

export async function listBackupSnapshots(ownerId: string): Promise<BackupSnapshotSummary[]> {
  const { data, error } = await supabase
    .from('backup_snapshots')
    .select(backupSnapshotSummaryColumns)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(fromBackupSnapshotRow);
}

export async function getBackupSnapshotData(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('backup_snapshots')
    .select('encrypted_data')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data?.encrypted_data ?? null;
}

export async function deleteBackupSnapshot(id: string): Promise<void> {
  const { error } = await supabase
    .from('backup_snapshots')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
