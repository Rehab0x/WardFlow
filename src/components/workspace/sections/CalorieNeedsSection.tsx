import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DataSection } from '@/components/clinical/DataSection';
import { CopyBar } from '@/components/clinical/CopyBar';
import {
  ACTIVITY_FACTORS,
  DEFAULT_ACTIVITY_FACTOR_ID,
  DEFAULT_INJURY_FACTOR_ID,
  INJURY_FACTORS,
  calculateCalorieNeeds,
  type CalorieFactor,
} from '@/features/nutrition/calorieNeeds';
import type { Patient } from '@/types/patient';
import { calculateAge } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

/**
 * 1일 필요열량 계산기 (Mifflin-St Jeor).
 *
 * 모든 환자에게 필요한 값이 아니라 영양 처방을 낼 때만 보는 값이라,
 * 평소에는 접어 두고 스위치를 켠 환자에서만 입력칸을 연다.
 *
 * 입력값은 저장하지 않는다 — 브라우저 저장소는 UI 편의 상태만 두는 것이
 * 이 프로젝트의 규칙이고(키·체중은 임상 데이터다), 서버에 남기려면 컬럼이 필요하다.
 */
export function CalorieNeedsSection({ patient }: { patient: Patient }) {
  const [enabled, setEnabled] = useState(false);
  const [heightText, setHeightText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [activityId, setActivityId] = useState(DEFAULT_ACTIVITY_FACTOR_ID);
  const [injuryId, setInjuryId] = useState(DEFAULT_INJURY_FACTOR_ID);
  const [stepsOpen, setStepsOpen] = useState(false);

  const ageYears = useMemo(() => calculateAge(patient.birthDate), [patient.birthDate]);

  // 환자를 바꾸면 이전 환자의 키·체중이 남아 있으면 안 된다.
  useEffect(() => {
    setEnabled(false);
    setHeightText('');
    setWeightText('');
    setActivityId(DEFAULT_ACTIVITY_FACTOR_ID);
    setInjuryId(DEFAULT_INJURY_FACTOR_ID);
    setStepsOpen(false);
  }, [patient.id]);

  const result = useMemo(() => {
    if (!enabled) return null;
    return calculateCalorieNeeds({
      sex: patient.sex,
      ageYears,
      heightCm: Number(heightText),
      weightKg: Number(weightText),
      activityFactorId: activityId,
      injuryFactorId: injuryId,
    });
  }, [activityId, ageYears, enabled, heightText, injuryId, patient.sex, weightText]);

  const entered = heightText.trim() !== '' && weightText.trim() !== '';

  return (
    <DataSection
      title="1일 필요열량"
      action={
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="1일 필요열량 계산"
          onClick={() => setEnabled((current) => !current)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            enabled ? 'bg-zinc-900' : 'bg-zinc-200'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
            )}
          />
        </button>
      }
    >
      {!enabled ? (
        <p className="px-3 py-2 text-[11px] text-zinc-400">
          영양 처방이 필요한 환자에서만 켜서 씁니다. (Mifflin-St Jeor)
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-2 p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <NumberField
              label="키 (cm)"
              value={heightText}
              placeholder="170"
              onChange={setHeightText}
            />
            <NumberField
              label="몸무게 (kg)"
              value={weightText}
              placeholder="65"
              onChange={setWeightText}
            />
            <SelectField
              label="활동계수"
              value={activityId}
              options={ACTIVITY_FACTORS}
              onChange={setActivityId}
            />
            <SelectField
              label="상해·스트레스 계수"
              value={injuryId}
              options={INJURY_FACTORS}
              onChange={setInjuryId}
            />
          </div>

          <p className="px-0.5 font-mono text-[10.5px] text-zinc-400">
            기본정보 사용: {patient.sex === 'M' ? '남' : '여'} / {ageYears}세
          </p>

          {result ? (
            <>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[20px] font-semibold tabular-nums text-zinc-900">
                    {Math.round(result.total).toLocaleString()}
                  </span>
                  <span className="text-[12px] text-zinc-500">kcal / 일</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-zinc-500">
                  <span>REE {Math.round(result.ree).toLocaleString()} kcal</span>
                  <span>× 활동 {result.activity.value}</span>
                  <span>× 상해 {result.injury.value}</span>
                  <span>BMI {result.bmi.toFixed(1)}</span>
                  {result.adjustedWeightKg !== undefined && (
                    <span className="text-amber-700">
                      보정체중 {result.adjustedWeightKg.toFixed(1)} kg 적용
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStepsOpen((current) => !current)}
                aria-expanded={stepsOpen}
                className="inline-flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              >
                {stepsOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                계산 근거
              </button>

              {stepsOpen && (
                <div className="space-y-2">
                  <ol className="space-y-1 rounded-md border border-zinc-200 bg-white p-2">
                    {result.steps.map((step, index) => (
                      <li
                        key={index}
                        className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-zinc-600"
                      >
                        {step}
                      </li>
                    ))}
                  </ol>
                  <FactorTable title="활동계수" factors={ACTIVITY_FACTORS} selected={activityId} />
                  <FactorTable
                    title="상해·스트레스 계수"
                    factors={INJURY_FACTORS}
                    selected={injuryId}
                  />
                  <p className="text-[10.5px] leading-4 text-zinc-400">
                    BMI 30 초과에서는 보정체중(IBW + 0.25 × (실제체중 − IBW))을 씁니다. IBW는 키(m)²
                    × 22(남) / 21(여)입니다. 표시는 반올림값이고 계산은 반올림 전 값으로 합니다.
                  </p>
                </div>
              )}

              <CopyBar
                title="필요열량 복사"
                text={[
                  `1일 필요열량 ${Math.round(result.total).toLocaleString()} kcal`,
                  ...result.steps,
                ].join('\n')}
                emptyText="복사할 내용 없음"
              />
            </>
          ) : (
            <p className="px-0.5 text-[11px] text-zinc-400">
              {entered
                ? '키와 몸무게를 확인해주세요. (키 50~250cm, 몸무게 1~400kg)'
                : '키와 몸무게를 입력하면 계산합니다.'}
            </p>
          )}
        </div>
      )}
    </DataSection>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="font-mono text-[10.5px] text-zinc-400">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full min-w-0 rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly CalorieFactor[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="font-mono text-[10.5px] text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full min-w-0 rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} ({option.value})
          </option>
        ))}
      </select>
    </label>
  );
}

function FactorTable({
  title,
  factors,
  selected,
}: {
  title: string;
  factors: readonly CalorieFactor[];
  selected: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-2">
      <p className="mb-1 text-[11px] font-medium text-zinc-700">{title}</p>
      <ul className="grid gap-0.5 sm:grid-cols-2">
        {factors.map((factor) => (
          <li
            key={factor.id}
            className={cn(
              'flex items-baseline justify-between gap-2 rounded px-1 py-0.5 text-[11px]',
              factor.id === selected ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-500'
            )}
          >
            <span className="min-w-0 truncate">{factor.label}</span>
            <span className="shrink-0 font-mono tabular-nums">{factor.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
