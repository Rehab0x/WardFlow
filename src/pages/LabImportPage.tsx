import { LabImportInbox } from '@/components/lab/LabImportInbox';
import { uploadBackupToServer } from '@/services/backupService';

/**
 * Standalone Lab Import page — /lab-import
 *
 * 오픈클로 자동화용: 이 URL만 열면 자동으로
 * 폴더 스캔 → 파싱 → 환자 매칭 → DB 저장 → 서버 동기화
 */
const LabImportPage = () => {
  // 서버 동기화 설정 읽기
  const serverKey = localStorage.getItem('wardflow-server-key') || '';
  const serverPw = localStorage.getItem('wardflow-server-pw') || '';

  const handleServerSync = serverKey && serverPw
    ? async () => { await uploadBackupToServer(serverPw, serverKey); }
    : undefined;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-primary">Lab Auto Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            폴더의 XLS 파일을 자동으로 파싱하여 환자에게 등록합니다.
          </p>
        </div>

        {/* Import Inbox with autoRun */}
        <LabImportInbox
          onServerSync={handleServerSync}
          autoRun={true}
        />

        {/* Footer info */}
        <p className="text-xs text-muted-foreground text-center">
          WardFlow Lab Import — 폴더 연결은 최초 1회만 필요합니다.
        </p>
      </div>
    </div>
  );
};

export default LabImportPage;
