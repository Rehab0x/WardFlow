import { useSupabaseBackend } from '@/config/backend';
import { useSettingsSyncStatusStore } from '@/stores/useSettingsSyncStatusStore';

export function AutoSaveStatus({ settingKey }: { settingKey: string }) {
  const status = useSettingsSyncStatusStore((state) => state.statuses[settingKey]);

  if (!useSupabaseBackend || !status || status.state === 'idle') return null;

  if (status.state === 'pending') {
    return (
      <span className="text-xs text-amber-600" role="status" aria-live="polite">
        저장 중
      </span>
    );
  }

  if (status.state === 'error') {
    return (
      <span
        className="text-xs text-red-600"
        role="status"
        aria-live="polite"
        title={status.error ?? undefined}
      >
        저장 실패
      </span>
    );
  }

  return (
    <span
      className="text-xs text-emerald-600"
      role="status"
      aria-live="polite"
      title={formatSyncStatusTime(status.updatedAt)}
    >
      저장됨
    </span>
  );
}

function formatSyncStatusTime(updatedAt: number | null): string | undefined {
  if (!updatedAt) return undefined;
  return `마지막 저장: ${new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}
