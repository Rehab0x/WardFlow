import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { parseOCSMedication, validateParsedMedication, type ParsedMedication } from '@/services/parser/medParser';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface MedicationPasteInputProps {
  category: 'hospital' | 'personal'; // 처방약 or 지참약
  onSave: (medications: ParsedMedication[]) => void;
  onCancel: () => void;
}

export function MedicationPasteInput({
  category: _category,
  onSave,
  onCancel,
}: MedicationPasteInputProps) {
  const [inputText, setInputText] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedMedication[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  const handleParse = () => {
    if (!inputText.trim()) {
      setParseErrors(['입력된 텍스트가 없습니다.']);
      return;
    }

    try {
      const results = parseOCSMedication(inputText);

      if (results.length === 0) {
        setParseErrors(['파싱된 약물이 없습니다. 입력 형식을 확인해주세요.']);
        setParsedResults([]);
        setIsParsed(false);
        return;
      }

      // 검증
      const allErrors: string[] = [];
      results.forEach((result, index) => {
        const errors = validateParsedMedication(result);
        if (errors.length > 0) {
          allErrors.push(`${index + 1}번째 약물: ${errors.join(', ')}`);
        }
      });

      if (allErrors.length > 0) {
        setParseErrors(allErrors);
        setParsedResults([]);
        setIsParsed(false);
        return;
      }

      // 성공
      setParsedResults(results);
      setParseErrors([]);
      setIsParsed(true);
    } catch (error) {
      setParseErrors([error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.']);
      setParsedResults([]);
      setIsParsed(false);
    }
  };

  const handleSave = () => {
    if (parsedResults.length === 0) {
      alert('저장할 약물이 없습니다.');
      return;
    }

    onSave(parsedResults);
  };

  return (
    <div className="space-y-4">
      {/* 입력 안내 */}
      <div className="space-y-2">
        <Label htmlFor="ocsInput">OCS 처방 붙여넣기</Label>
        <p className="text-sm text-muted-foreground">
          OCS에서 처방 내역을 복사하여 아래에 붙여넣으세요.
        </p>
      </div>

      {/* 텍스트 입력 영역 */}
      <div className="space-y-2">
        <textarea
          id="ocsInput"
          className="w-full min-h-[200px] p-3 text-sm font-mono border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="예시:
(12) 암로스크정(6.42mg/1정)	1.0000	아침 식후30분
(12) 메트포르민정500mg	1.0000	아침,저녁 식후30분
(7) 큐팜정500mg	1.0000	아침,점심,저녁 식후30분"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setIsParsed(false);
            setParseErrors([]);
            setParsedResults([]);
          }}
          autoFocus
        />
        <div className="flex justify-end">
          <Button type="button" onClick={handleParse} variant="outline" size="sm">
            파싱하기
          </Button>
        </div>
      </div>

      {/* 파싱 에러 */}
      {parseErrors.length > 0 && (
        <Card className="p-4 border-destructive bg-destructive/5">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive mb-1">파싱 실패</p>
              <ul className="text-sm text-destructive space-y-1">
                {parseErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* 파싱 성공 결과 */}
      {isParsed && parsedResults.length > 0 && (
        <Card className="p-4 border-primary/50 bg-primary/5">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">
                파싱 성공! {parsedResults.length}개의 약물이 감지되었습니다.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">미리보기:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-2 font-semibold">#</th>
                    <th className="text-left p-2 font-semibold">약물명</th>
                    <th className="text-left p-2 font-semibold">용량</th>
                    <th className="text-left p-2 font-semibold">투약시간</th>
                    <th className="text-left p-2 font-semibold">복용타이밍</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedResults.map((med, index) => {
                    const scheduleItems = med.schedule.split(',').map(s => s.trim());
                    const frequency = scheduleItems.length;
                    const scheduleDisplay = `#${frequency} (${med.schedule})`;

                    return (
                      <tr key={index} className="hover:bg-muted/20">
                        <td className="p-2 text-muted-foreground">{index + 1}</td>
                        <td className="p-2 font-medium">{med.drugName}</td>
                        <td className="p-2 text-muted-foreground">{med.singleDose}</td>
                        <td className="p-2 text-muted-foreground text-xs">{scheduleDisplay}</td>
                        <td className="p-2 text-muted-foreground text-xs">{med.timing || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* 입력 포맷 안내 */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2">입력 포맷</p>
            <div className="space-y-1 text-xs text-muted-foreground font-mono">
              <p>(잔여일수) 약물명[TAB]투약량[TAB]투약시간</p>
              <p className="mt-2 text-muted-foreground/70">
                * TAB은 탭 문자입니다 (OCS에서 복사 시 자동 포함)
              </p>
              <p className="text-muted-foreground/70">
                * 잔여일수는 선택사항입니다
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isParsed || parsedResults.length === 0}
        >
          {parsedResults.length}개 약물 추가
        </Button>
      </div>
    </div>
  );
}
