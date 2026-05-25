import { useSupabaseBackend } from '@/config/backend';
import { LegacyBackupSettings } from './LegacyBackupSettings';
import { SupabaseBackupSettings } from './SupabaseBackupSettings';

export {
  formatRestoreDelta,
  formatSnapshotCounts,
  formatSnapshotOption,
} from './SupabaseBackupSettings';

export function BackupSettings() {
  return useSupabaseBackend ? <SupabaseBackupSettings /> : <LegacyBackupSettings />;
}
