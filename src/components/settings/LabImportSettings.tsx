import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { LabImportInbox } from '@/components/lab/LabImportInbox';
import { Card } from '@/components/ui/card';
import { useSupabaseBackend } from '@/config/backend';
import { uploadBackupToServer } from '@/services/backupService';

export function LabImportSettings() {
  const [serverPw] = useState(() => localStorage.getItem('wardflow-server-pw') || '');
  const [serverKey] = useState(() => localStorage.getItem('wardflow-server-key') || '');

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Lab Import Inbox</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        오픈클로가 저장하는 XLS 폴더를 연결하면 Lab 결과를 파싱해 환자와 매칭합니다.
      </p>
      {useSupabaseBackend && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          Supabase 모드에서는 Lab import 결과가 현재 로그인 계정 권한으로 저장됩니다. 기존 IndexedDB
          서버 백업 동기화는 비활성화되어 있습니다.
        </div>
      )}
      <LabImportInbox
        onServerSync={
          !useSupabaseBackend && serverKey && serverPw
            ? async () => {
                await uploadBackupToServer(serverPw, serverKey.trim());
              }
            : undefined
        }
      />
    </Card>
  );
}
