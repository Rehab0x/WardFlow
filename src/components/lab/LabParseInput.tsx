import { useState, useRef } from 'react';
import { Upload, ClipboardPaste, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { parseLabText, parseLabXls, type ParsedLabItem, type XlsPatientGroup } from '@/services/parser/labParser';
import { parseLocalDate } from '@/utils/dateUtils';

interface LabParseInputProps {
  mode: 'paste' | 'file';
  patientId: string;
  registrationNumber?: string;
  onSave: (items: ParsedLabItem[], testDate: Date) => Promise<void>;
  onClose: () => void;
}

export function LabParseInput({ mode, patientId: _patientId, registrationNumber, onSave, onClose }: LabParseInputProps) {
  const [pasteText, setPasteText] = useState('');
  const [testDateStr, setTestDateStr] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [parsedItems, setParsedItems] = useState<ParsedLabItem[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [parseRate, setParseRate] = useState(0);
  const [xlsGroups, setXlsGroups] = useState<XlsPatientGroup[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Paste mode ──────────────────────────────────────────

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const result = parseLabText(pasteText);
    setParsedItems(result.items);
    setUnmatched(result.unmatched);
    setParseRate(result.parseRate);
  };

  // ── File mode ────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const groups = await parseLabXls(buffer);

      if (groups.length === 0) {
        setError('파일에서 Lab 데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.');
        return;
      }

      setXlsGroups(groups);

      // Auto-select group matching patient's registration number
      if (registrationNumber) {
        const idx = groups.findIndex((g) => g.registrationNumber === registrationNumber);
        const matchedGroup = groups[idx];
        if (idx !== -1 && matchedGroup) {
          setSelectedGroup(idx);
          setParsedItems(matchedGroup.items);
          if (matchedGroup.orderDate) {
            setTestDateStr(matchedGroup.orderDate.replace(/[/.]/g, '-'));
          }
        }
      }

      if (groups.length === 1) {
        const firstGroup = groups[0];
        if (firstGroup) {
          setSelectedGroup(0);
          setParsedItems(firstGroup.items);
          if (firstGroup.orderDate) {
            setTestDateStr(firstGroup.orderDate.replace(/[/.]/g, '-'));
          }
        }
      }
    } catch (err) {
      setError('파일 읽기 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (idx: number) => {
    const group = xlsGroups?.[idx];
    if (!group) return;
    setSelectedGroup(idx);
    setParsedItems(group.items);
    if (group.orderDate) {
      setTestDateStr(group.orderDate.replace(/[/.]/g, '-'));
    }
  };

  // ── Save ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!parsedItems || parsedItems.length === 0) return;
    setSaving(true);
    try {
      const testDate = parseLocalDate(testDateStr);
      await onSave(parsedItems, testDate);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Date picker (always visible) */}
      <div className="flex items-center gap-3">
        <Label htmlFor="testDate" className="shrink-0">검사 날짜</Label>
        <Input
          id="testDate"
          type="date"
          value={testDateStr}
          onChange={(e) => setTestDateStr(e.target.value)}
          className="w-40"
        />
      </div>

      {/* ── PASTE MODE ── */}
      {mode === 'paste' && (
        <div className="space-y-3">
          <Label>OCS Lab 결과 붙여넣기</Label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`OCS에서 Lab 결과를 복사한 후 여기에 붙여넣으세요.\n\n예시:\nB2500\tTotal Protein\t7.45\t\t6.60 ~ 8.30\nB2510\tAlbumin\t3.20\tL\t3.50 ~ 5.20\nB1050\tWBC\t15.16\tH\t4.00 ~ 10.00`}
            className="w-full min-h-[180px] font-mono text-xs rounded-md border border-input bg-background px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            onClick={handleParsePaste}
            disabled={!pasteText.trim()}
            className="w-full"
          >
            파싱하기
          </Button>
        </div>
      )}

      {/* ── FILE MODE ── */}
      {mode === 'file' && (
        <div className="space-y-3">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInputRef.current.files = dt.files;
                fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }}
          >
            {loading ? (
              <Loader2 className="mx-auto h-10 w-10 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            )}
            <p className="mt-2 text-sm font-medium">
              {loading ? '파싱 중...' : 'XLS 파일을 드래그하거나 클릭하여 선택'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">.xls, .xlsx 형식 지원</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Multiple patient groups */}
          {xlsGroups && xlsGroups.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm">파일에 여러 환자가 포함되어 있습니다. 선택하세요:</Label>
              <div className="space-y-1.5">
                {xlsGroups.map((group, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectGroup(idx)}
                    className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                      selectedGroup === idx
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <span className="font-medium">
                      {group.registrationNumber ?? `환자 ${idx + 1}`}
                    </span>
                    {group.orderDate && (
                      <span className="ml-2 text-muted-foreground">{group.orderDate}</span>
                    )}
                    <span className="ml-2 text-muted-foreground">
                      ({group.items.length}개 항목)
                      {registrationNumber && group.registrationNumber === registrationNumber && (
                        <Badge className="ml-2 text-[10px] h-4 px-1">현재 환자</Badge>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PARSE RESULT PREVIEW ── */}
      {parsedItems !== null && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">{parsedItems.length}개 파싱 성공</span>
            </div>
            {unmatched.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600">{unmatched.length}개 미매칭</span>
              </div>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              파싱률 {Math.round(parseRate * 100)}%
            </div>
          </div>

          {/* Preview table */}
          {parsedItems.length > 0 && (
            <div className="max-h-[280px] overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">항목</th>
                    <th className="px-3 py-2 text-left font-medium">카테고리</th>
                    <th className="px-3 py-2 text-right font-medium">결과값</th>
                    <th className="px-3 py-2 text-left font-medium">단위</th>
                    <th className="px-3 py-2 text-left font-medium">참조범위</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item, i) => (
                    <tr
                      key={i}
                      className={`border-t ${
                        item.flag === 'H'
                          ? 'bg-red-50 dark:bg-red-950/20'
                          : item.flag === 'L'
                          ? 'bg-blue-50 dark:bg-blue-950/20'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-1.5 font-medium">{item.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.category}</td>
                      <td className="px-3 py-1.5 text-right">
                        <span
                          className={
                            item.flag === 'H'
                              ? 'font-bold text-red-600'
                              : item.flag === 'L'
                              ? 'font-bold text-blue-600'
                              : ''
                          }
                        >
                          {item.value}
                        </span>
                        {item.flag && (
                          <span className="ml-1 text-[10px]">
                            ({item.flag})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.unit}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {item.referenceMin !== undefined && item.referenceMax !== undefined
                          ? `${item.referenceMin} ~ ${item.referenceMax}`
                          : item.referenceMax !== undefined
                          ? `≤ ${item.referenceMax}`
                          : item.referenceMin !== undefined
                          ? `≥ ${item.referenceMin}`
                          : (item.referenceText ?? '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Unmatched rows */}
          {unmatched.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-amber-600 hover:underline">
                미매칭 항목 보기 ({unmatched.length}개)
              </summary>
              <Card className="mt-1 p-2 space-y-0.5 max-h-[100px] overflow-y-auto">
                {unmatched.map((row, i) => (
                  <p key={i} className="font-mono text-muted-foreground">{row}</p>
                ))}
              </Card>
            </details>
          )}

          {/* Save button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button
              onClick={handleSave}
              disabled={parsedItems.length === 0 || saving || !testDateStr}
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />저장 중...</>
              ) : (
                <><ClipboardPaste className="mr-2 h-4 w-4" />{parsedItems.length}개 저장</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Close button (when no parsed result yet) */}
      {parsedItems === null && (
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>닫기</Button>
        </div>
      )}
    </div>
  );
}
