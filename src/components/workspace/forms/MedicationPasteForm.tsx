import { useCallback, useState } from 'react';
import { DataSection } from '@/components/clinical/DataSection';
import { parseOCSMedication, type ParsedMedication } from '@/services/parser/medParser';
import { CategoryToggle, SaveButton } from '../controls';
import type { PatientWorkspaceProps } from '../types';

export function MedicationPasteForm({
  patientId,
  onSaveParsedMedications,
  onLoadMedications,
}: {
  patientId: string;
  onSaveParsedMedications?: PatientWorkspaceProps['onSaveParsedMedications'];
  onLoadMedications?: PatientWorkspaceProps['onLoadMedications'];
}) {
  const [category, setCategory] = useState<'hospital' | 'personal'>('hospital');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedMedication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parse = useCallback(() => {
    const result = parseOCSMedication(text);
    if (result.length === 0) {
      setParsed([]);
      setError('파싱된 약제가 없습니다. OCS 처방 텍스트 형식을 확인해주세요.');
      return;
    }
    setParsed(result);
    setError(null);
  }, [text]);

  const save = useCallback(async () => {
    if (parsed.length === 0 || saving) return;
    setSaving(true);
    try {
      await onSaveParsedMedications?.(category, parsed);
      setText('');
      setParsed([]);
      setError(null);
      await onLoadMedications?.(patientId);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [category, onLoadMedications, onSaveParsedMedications, parsed, patientId, saving]);

  return (
    <DataSection title="처방 붙여넣기">
      <div className="space-y-2 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryToggle value={category} onChange={setCategory} />
          <button
            type="button"
            onClick={parse}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-[12px] font-medium hover:bg-zinc-50"
          >
            파싱
          </button>
          <SaveButton disabled={parsed.length === 0} pending={saving} onClick={save}>
            {parsed.length > 0 ? `${parsed.length}개 저장` : '저장'}
          </SaveButton>
        </div>
        <textarea
          aria-label="OCS 처방 텍스트"
          value={text}
          placeholder="OCS 처방을 붙여넣으세요"
          rows={5}
          onChange={(event) => {
            setText(event.target.value);
            setParsed([]);
            setError(null);
          }}
          className="w-full resize-y rounded-md border border-zinc-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-zinc-400"
        />
        {error && <div className="text-[11px] text-red-600">{error}</div>}
        {parsed.length > 0 && (
          <div className="max-h-44 overflow-auto rounded-md border border-zinc-100">
            {parsed.map((item, index) => (
              <div
                key={`${item.drugName}-${index}`}
                className="grid gap-2 border-b border-zinc-100 px-2 py-1.5 text-[12px] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_80px_minmax(0,0.8fr)_100px]"
              >
                <span className="truncate font-medium text-zinc-800">{item.drugName}</span>
                <span className="text-zinc-500">{item.singleDose}T</span>
                <span className="truncate text-zinc-500">{item.schedule}</span>
                <span className="truncate text-zinc-500">{item.timing ?? '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DataSection>
  );
}
