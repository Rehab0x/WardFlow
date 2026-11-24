import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useQuickEntry, type QuickEntryWriters } from '@/hooks/useQuickEntry';
import { useToast } from '@/hooks/use-toast';
import { usePatientStore } from '@/stores/usePatientStore';
import { calculateAntibioticEndDate, readAntibioticDays } from '@/utils/antibioticCourse';
import { formatDateInput } from '../clinical/dateLabels';

const PLACEHOLDER = `홍길동
Fever, K 2.7, CRP 15.0
Tazocin 7일, 알림설정, 케이콘틴 3T#3

(빈 줄로 환자를 구분합니다. 1줄=이름, 2줄=O, 3줄=P)`;

const fieldClass =
  'w-full rounded border border-zinc-200 bg-white px-2 py-1 text-[12px] text-zinc-900 focus:border-zinc-400 focus:outline-none';

/** Today 빠른 입력 — 환자별 3줄(이름/O/P)을 SOAP 메모 + 항생제 + 종료일 일정으로 정리한다. */
export function QuickEntryPanel({ writers }: { writers: QuickEntryWriters }) {
  const quick = useQuickEntry();
  const patients = usePatientStore((store) => store.patients).filter((p) => p.status === 'active');
  const { toast } = useToast();
  const [text, setText] = useState('');
  const { stage, items } = quick;
  const pending = items.filter((item) => item.selected && item.patientId).length;

  const save = async () => {
    const completed = await quick.saveSelected(writers);
    if (completed > 0) toast({ title: `${completed}명의 기록을 저장했습니다.` });
  };

  if (stage === 'review') {
    return (
      <section className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="space-y-3">
          {items.map((item) => {
            const saved = item.done.length > 0 && !item.error;
            return (
              <div key={item.key} className="rounded border border-zinc-200 p-2.5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={!item.patientId}
                    onChange={(e) => quick.updateItem(item.key, { selected: e.target.checked })}
                    aria-label={`${item.heardName} 저장 선택`}
                  />
                  <select
                    value={item.patientId ?? ''}
                    onChange={(e) =>
                      quick.updateItem(item.key, {
                        patientId: e.target.value || undefined,
                        selected: Boolean(e.target.value),
                      })
                    }
                    className="h-7 rounded border border-zinc-200 bg-white px-1 text-[12px]"
                  >
                    <option value="">환자 선택 ({item.heardName})</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.roomBed} {p.name}</option>
                    ))}
                  </select>
                  {item.nameMatch === 'similar' && (
                    <span className="text-[11px] text-amber-600">이름이 비슷해 연결 — 확인 필요</span>
                  )}
                  {saved && <span className="text-[11px] text-emerald-600">저장됨</span>}
                </div>
                {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => (
                  <label key={field} className="mb-1 block text-[11px] text-zinc-500">
                    {field[0]!.toUpperCase()})
                    <textarea
                      rows={field === 'assessment' ? 3 : 2}
                      value={item[field]}
                      onChange={(e) => quick.updateItem(item.key, { [field]: e.target.value })}
                      className={fieldClass}
                    />
                  </label>
                ))}
                {item.antibiotics.map((abx, index) => {
                  const days = readAntibioticDays(abx.days);
                  return (
                    <div key={index} className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="text-zinc-500">항생제</span>
                      <input
                        value={abx.drugName}
                        onChange={(e) => quick.updateItem(item.key, {
                          antibiotics: item.antibiotics.map((a, i) => i === index ? { ...a, drugName: e.target.value } : a),
                        })}
                        className={`${fieldClass} !w-36`}
                      />
                      <input
                        value={abx.dosage}
                        placeholder="용량"
                        onChange={(e) => quick.updateItem(item.key, {
                          antibiotics: item.antibiotics.map((a, i) => i === index ? { ...a, dosage: e.target.value } : a),
                        })}
                        className={`${fieldClass} !w-16`}
                        aria-label="용량"
                      />
                      <input
                        value={abx.frequency}
                        placeholder="횟수"
                        onChange={(e) => quick.updateItem(item.key, {
                          antibiotics: item.antibiotics.map((a, i) => i === index ? { ...a, frequency: e.target.value } : a),
                        })}
                        className={`${fieldClass} !w-16`}
                        aria-label="횟수"
                      />
                      <input
                        value={abx.days}
                        inputMode="numeric"
                        onChange={(e) => quick.updateItem(item.key, {
                          antibiotics: item.antibiotics.map((a, i) => i === index ? { ...a, days: e.target.value } : a),
                        })}
                        className={`${fieldClass} !w-14`}
                        aria-label="일수"
                      />
                      <span className="text-zinc-500">일 →</span>
                      <span className="text-zinc-700">
                        {days
                          ? `종료 ${formatDateInput(calculateAntibioticEndDate(new Date(), days))} · 종료 알림`
                          : '종료일 없음 (알림 없음)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => quick.updateItem(item.key, {
                          antibiotics: item.antibiotics.filter((_, i) => i !== index),
                        })}
                        className="text-[11px] text-zinc-400 hover:text-red-600"
                      >
                        제외
                      </button>
                    </div>
                  );
                })}
                {item.error && <p className="mt-1 text-[11px] text-red-600">{item.error}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={quick.reset} className="h-8 rounded-md border border-zinc-200 px-3 text-[12px] text-zinc-600 hover:bg-zinc-100">
            다시 입력
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={pending === 0 || quick.saving}
            className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {quick.saving ? '저장 중' : `선택한 ${pending}명 저장`}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-zinc-700">
        <Zap className="h-3.5 w-3.5 text-zinc-500" /> 빠른 입력
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={PLACEHOLDER}
        className={fieldClass}
        aria-label="빠른 입력"
      />
      {quick.error && <p className="mt-1 text-[11px] text-red-600">{quick.error}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">저장 전에 미리보기에서 확인합니다</span>
        <button
          type="button"
          onClick={() => void quick.analyze(text)}
          disabled={!text.trim() || stage === 'drafting'}
          className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {stage === 'drafting' ? '정리 중…' : '정리하기'}
        </button>
      </div>
    </section>
  );
}
