import { useEffect, useState } from 'react';
import { Cloud, FolderOpen, FlaskConical } from 'lucide-react';
import { LabImportInbox } from '@/components/lab/LabImportInbox';
import { StorageLabInbox } from '@/components/lab/StorageLabInbox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/db/database';
import { useSupabaseBackend } from '@/config/backend';
import { listActivePatients } from '@/data/patients.repository';

type ImportMode = 'storage' | 'local';

const storageKeyName = 'wardflow-lab-import-storage-key';

const LabImportPage = () => {
  const [storageKey, setStorageKey] = useState(() => localStorage.getItem(storageKeyName) || '');
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [mode, setMode] = useState<ImportMode>('storage');

  useEffect(() => {
    const loadPatientCount = async () => {
      const count = useSupabaseBackend
        ? (await listActivePatients()).length
        : await db.patients.where('status').equals('active').count();
      setPatientCount(count);
    };

    void loadPatientCount();
  }, []);

  const syncKey = storageKey.trim();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
            <FlaskConical className="h-5 w-5" />
            Lab XLS Import
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            이원랩 XLS 파일을 등록번호로 환자와 매칭하고, 파일 안의 검사일로 Supabase Lab 결과를
            바로 저장합니다.
          </p>
        </div>

        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">가져오기 방식</h2>
              <p className="text-xs text-muted-foreground">
                환자 데이터 다운로드/백업 업로드 없이 현재 로그인 권한으로 직접 저장합니다.
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              활성 환자 {patientCount ?? '-'}명
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={mode === 'storage' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setMode('storage')}
            >
              <Cloud className="mr-1 h-3.5 w-3.5" />
              Storage Inbox
            </Button>
            <Button
              size="sm"
              variant={mode === 'local' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setMode('local')}
            >
              <FolderOpen className="mr-1 h-3.5 w-3.5" />
              로컬 폴더
            </Button>
          </div>

          {mode === 'storage' && (
            <div className="space-y-2">
              <Input
                value={storageKey}
                placeholder="Storage sync key"
                onChange={(event) => {
                  const next = event.target.value;
                  setStorageKey(next);
                  localStorage.setItem(storageKeyName, next);
                }}
                className="text-sm"
              />
              {syncKey && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  업로드 경로: lab-inbox/{syncKey}/filename.xls
                </p>
              )}
            </div>
          )}
        </Card>

        {mode === 'storage' ? (
          syncKey ? (
            <StorageLabInbox syncKey={syncKey} autoRun={false} />
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Storage sync key를 입력하면 inbox 파일을 스캔할 수 있습니다.
            </Card>
          )
        ) : (
          <LabImportInbox autoRun={false} />
        )}
      </div>
    </div>
  );
};

export default LabImportPage;
