import { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, FlaskConical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { bulkLabImport, type BulkImportPreview, type MatchedPatient, type BulkImportResult, type RecentLabStatus } from '@/services/bulkLabImport';

interface BulkLabImportProps {
  onClose: () => void;
  onComplete?: (result: BulkImportResult) => void;
}

type Step = 'upload' | 'preview' | 'done';

export function BulkLabImport({ onClose, onComplete }: BulkLabImportProps) {
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkImportPreview | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [expandedUnmatched, setExpandedUnmatched] = useState(false);
  const [recentStatus, setRecentStatus] = useState<RecentLabStatus[] | null>(null);
  const [showRecentStatus, setShowRecentStatus] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload 단계 진입 시 최근 Lab 현황 로드
  useEffect(() => {
    if (step === 'upload' && recentStatus === null) {
      bulkLabImport.getRecentLabStatus().then(setRecentStatus).catch(() => setRecentStatus([]));
    }
  }, [step, recentStatus]);

  // ── File processing ───────────────────────────────

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const p = await bulkLabImport.processFile(buffer);
      setPreview(p);
      setStep('preview');
    } catch (err) {
      setError('파일 파싱 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Selection ──────────────────────────────────────

  const toggleSelect = (idx: number) => {
    if (!preview) return;
    setPreview({
      ...preview,
      matched: preview.matched.map((m, i) =>
        i === idx ? { ...m, selected: !m.selected } : m
      ),
    });
  };

  const toggleAll = (val: boolean) => {
    if (!preview) return;
    setPreview({
      ...preview,
      matched: preview.matched.map((m) => ({ ...m, selected: val })),
    });
  };

  // ── Save ──────────────────────────────────────────

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const r = await bulkLabImport.saveAll(preview);
      setResult(r);
      setStep('done');
      onComplete?.(r);
    } catch (err) {
      setError('저장 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = preview?.matched.filter((m) => m.selected).length ?? 0;
  const selectedItems = preview?.matched
    .filter((m) => m.selected)
    .reduce((sum, m) => sum + m.itemCount, 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            병원 OCS에서 내보낸 XLS 파일을 업로드하면 등록된 모든 환자의 Lab 결과를
            차트번호(등록번호)로 자동 매칭하여 일괄 저장합니다.
          </p>

          {/* 최근 Lab 현황 */}
          {recentStatus && recentStatus.length > 0 && (
            <Card className="p-3 space-y-2">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowRecentStatus(!showRecentStatus)}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">환자별 최근 Lab 현황 ({recentStatus.length}명)</span>
                </div>
                {showRecentStatus ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {showRecentStatus && (
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                  {(() => {
                    // 날짜별 그룹화: latestLabDate 기준
                    const groups = new Map<string, RecentLabStatus[]>();
                    for (const p of recentStatus) {
                      const key = p.latestLabDate ?? '없음';
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(p);
                    }
                    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
                      if (a === '없음') return -1;
                      if (b === '없음') return 1;
                      return a.localeCompare(b); // 오래된 순
                    });

                    return sortedKeys.map((dateKey) => {
                      const patients = groups.get(dateKey)!;
                      const firstPatient = patients[0];
                      const days = firstPatient?.daysSinceLatest;
                      const isOld = days !== null && days !== undefined && days >= 3;
                      const isNone = dateKey === '없음';

                      return (
                        <div key={dateKey} className="flex items-start gap-2 text-xs">
                          <div className="shrink-0 w-24">
                            <Badge
                              variant="outline"
                              className={
                                isNone ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-300' :
                                isOld ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/20 dark:text-amber-300' :
                                'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-300'
                              }
                            >
                              {isNone ? 'Lab 없음' : dateKey}
                            </Badge>
                            {!isNone && days !== null && days !== undefined && days > 0 && (
                              <span className="ml-1 text-[10px] text-muted-foreground">D-{days}</span>
                            )}
                          </div>
                          <div className="flex-1 flex flex-wrap gap-x-2 gap-y-0.5">
                            {patients.map((p) => (
                              <span key={p.patientId} className="whitespace-nowrap">
                                <span className="text-muted-foreground">{p.roomBed}</span>{' '}
                                <span className="font-medium">{p.patientName}</span>
                                <span className="text-[10px] text-muted-foreground ml-0.5">
                                  {p.patientType === 'consult' ? '(C)' : ''}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                가장 오래된 순으로 표시. <span className="text-red-600">빨강</span>=Lab 없음, <span className="text-amber-600">주황</span>=3일 이상 경과
              </p>
            </Card>
          )}

          <div
            className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {loading ? (
              <>
                <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
                <p className="mt-3 text-sm font-medium">파싱 중...</p>
              </>
            ) : (
              <>
                <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">XLS 파일을 드래그하거나 클릭하여 선택</p>
                <p className="mt-1 text-xs text-muted-foreground">.xls, .xlsx 형식 지원</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>닫기</Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{preview.matched.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">매칭된 환자</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">{preview.unmatched.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">미매칭</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold">{preview.totalGroups}</p>
              <p className="text-xs text-muted-foreground mt-0.5">파일 내 전체</p>
            </Card>
          </div>

          {preview.fileDate && (
            <p className="text-sm text-muted-foreground">
              검사 날짜: <span className="font-medium text-foreground">{preview.fileDate}</span>
            </p>
          )}

          {/* Matched patients */}
          {preview.matched.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">매칭된 환자 ({preview.matched.length}명)</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleAll(true)}>전체 선택</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleAll(false)}>전체 해제</Button>
                </div>
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-1.5 rounded-md border p-2">
                {preview.matched.map((match, idx) => (
                  <MatchedRow
                    key={match.patient.id}
                    match={match}
                    onToggle={() => toggleSelect(idx)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Unmatched */}
          {preview.unmatched.length > 0 && (
            <div className="space-y-1">
              <button
                className="flex items-center gap-1.5 text-sm text-amber-600 hover:underline"
                onClick={() => setExpandedUnmatched(!expandedUnmatched)}
              >
                {expandedUnmatched ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                미매칭 환자 {preview.unmatched.length}명 (등록번호 없음 또는 미등록)
              </button>
              {expandedUnmatched && (
                <div className="rounded-md border p-2 space-y-1 max-h-[120px] overflow-y-auto">
                  {preview.unmatched.map((g, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      등록번호: {g.registrationNumber ?? '없음'} — {g.items.length}개 항목
                      {g.orderDate && ` (${g.orderDate})`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-sm text-muted-foreground">
              {selectedCount}명 / {selectedItems}개 항목 저장 예정
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>다시 선택</Button>
              <Button
                onClick={handleSave}
                disabled={selectedCount === 0 || saving}
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />저장 중...</>
                ) : (
                  `${selectedCount}명 저장`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-3 text-lg font-semibold">저장 완료</p>
            <p className="text-sm text-muted-foreground mt-1">
              {result.savedPatients}명 / {result.savedItems}개 항목이 저장되었습니다.
            </p>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive">실패 ({result.failedPatients}명)</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">{e.name}: {e.error}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>닫기</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchedRow({ match, onToggle }: { match: MatchedPatient; onToggle: () => void }) {
  const { patient, group, testDate, itemCount, selected } = match;

  return (
    <label className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${
      selected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/40 border border-transparent'
    }`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="h-4 w-4 rounded accent-primary"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{patient.name}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1">{patient.roomBed}</Badge>
          <span className="text-xs text-muted-foreground">{patient.registrationNumber}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {testDate.getFullYear()}-{String(testDate.getMonth() + 1).padStart(2, '0')}-{String(testDate.getDate()).padStart(2, '0')}
          &nbsp;·&nbsp;{itemCount}개 항목
          {group.orderDate && group.orderDate !== `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}` && (
            <span className="ml-1">(파일 날짜: {group.orderDate})</span>
          )}
        </p>
      </div>
    </label>
  );
}
