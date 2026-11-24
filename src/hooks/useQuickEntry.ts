import { useCallback, useState } from 'react';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { listLabsByPatient } from '@/data/labs.repository';
import type { LabResult } from '@/domain/lab';
import {
  draftQuickEntry,
  formatQuickEntryNote,
  parseQuickEntryBlocks,
  type QuickEntryBlock,
} from '@/services/quickEntry';
import { calculateAntibioticEndDate, readAntibioticDays } from '@/utils/antibioticCourse';
import { useAIStore } from '@/stores/useAIStore';
import { usePatientStore } from '@/stores/usePatientStore';

export type QuickEntryStage = 'idle' | 'drafting' | 'review';

export interface QuickEntryAntibioticDraft {
  drugName: string;
  /** 입력칸 그대로(문자열). 비우면 종료일 없이 등록한다. */
  days: string;
  dosage: string;
  frequency: string;
}

/** 검토 화면에서 고칠 수 있는 한 환자분 */
export interface QuickEntryItem {
  key: string;
  heardName: string;
  nameMatch: QuickEntryBlock['nameMatch'];
  patientId?: string;
  /** 철자가 정확히 맞은 환자만 기본 선택 — 발음으로 이어 붙인 환자는 사람이 확인하고 체크한다. */
  selected: boolean;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  antibiotics: QuickEntryAntibioticDraft[];
  /** 이미 저장한 단계('note', 'abx:0') — 재시도 때 중복 저장을 막는다. */
  done: string[];
  error?: string;
}

export interface QuickEntryWriters {
  addNote: (patientId: string, content: string) => Promise<void>;
  addAntibiotic: (
    patientId: string,
    input: { drugName: string; dosage?: string; frequency?: string; startDate: Date; endDate?: Date }
  ) => Promise<void>;
}

export function useQuickEntry() {
  const [stage, setStage] = useState<QuickEntryStage>('idle');
  const [items, setItems] = useState<QuickEntryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setStage('idle');
    setItems([]);
    setError(null);
  }, []);

  const analyze = useCallback(async (text: string) => {
    const patients = usePatientStore.getState().patients.filter((item) => item.status === 'active');
    const blocks = parseQuickEntryBlocks(text, patients.map((item) => item.name));
    if (blocks.length === 0) {
      setError('내용이 비어 있습니다.');
      return;
    }
    if (!useAIStore.getState().isConfigured()) {
      setError('설정 > AI 설정에서 API 키를 먼저 입력해주세요.');
      return;
    }

    setError(null);
    setStage('drafting');
    const next = await Promise.all(
      blocks.map((block, index) => buildItem(block, index, patients))
    );
    setItems(next);
    setStage('review');
  }, []);

  const updateItem = useCallback((key: string, patch: Partial<QuickEntryItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  /** 선택된 항목을 저장한다. @returns 저장을 끝낸 환자 수 */
  const saveSelected = useCallback(
    async (writers: QuickEntryWriters) => {
      setSaving(true);
      let completed = 0;
      try {
        for (const item of items.filter((entry) => entry.selected && entry.patientId)) {
          const done = new Set(item.done);
          const patientId = item.patientId!;
          const startDate = new Date();
          let failure: string | undefined;

          const step = async (name: string, action: () => Promise<void>) => {
            if (failure || done.has(name)) return;
            try {
              await action();
              done.add(name);
            } catch (caught) {
              failure = caught instanceof Error ? caught.message : String(caught);
            }
          };

          const note = formatQuickEntryNote(item);
          if (note) await step('note', () => writers.addNote(patientId, note));

          for (const [index, antibiotic] of item.antibiotics.entries()) {
            const drugName = antibiotic.drugName.trim();
            if (!drugName) continue;
            const days = readAntibioticDays(antibiotic.days);
            const endDate = days ? calculateAntibioticEndDate(startDate, days) : undefined;
            await step(`abx:${index}`, () =>
              writers.addAntibiotic(patientId, {
                drugName,
                dosage: antibiotic.dosage.trim(),
                frequency: antibiotic.frequency.trim(),
                startDate,
                endDate,
              })
            );
          }

          updateItem(item.key, { done: [...done], error: failure });
          if (!failure) completed++;
        }
      } finally {
        setSaving(false);
      }
      return completed;
    },
    [items, updateItem]
  );

  return { stage, items, error, saving, analyze, updateItem, saveSelected, reset };
}

async function buildItem(
  block: QuickEntryBlock,
  index: number,
  patients: ReturnType<typeof usePatientStore.getState>['patients']
): Promise<QuickEntryItem> {
  const patient = patients.find((item) => item.name === block.patientName);
  const base = {
    key: `${index}-${block.heardName}`,
    heardName: block.heardName,
    nameMatch: block.nameMatch,
    patientId: patient?.id,
    selected: Boolean(patient) && block.nameMatch !== 'similar',
    done: [],
  };

  // 환자를 못 찾으면 AI를 부르지 않는다 — 원문을 O/P에 그대로 두고 사용자가 환자를 고르게 한다.
  if (!patient) {
    return {
      ...base,
      subjective: '',
      objective: block.objective,
      assessment: '',
      plan: block.plan,
      antibiotics: [],
    };
  }

  try {
    const labs = await listLabsByPatient(patient.id).catch(() => []);
    const draft = await draftQuickEntry(block, {
      patientName: patient.name,
      chiefComplaint: patient.chiefComplaint,
      onset: patient.onset,
      problemList: patient.problemList.filter((line) => line.trim()).join('\n'),
      currentMedications: '',
      recentLab: buildRecentLabText(labs),
    });
    return {
      ...base,
      ...draft,
      antibiotics: draft.antibiotics.map((item) => ({
        drugName: item.drugName,
        days: item.days ? String(item.days) : '',
        dosage: item.dosage,
        frequency: item.frequency,
      })),
    };
  } catch (caught) {
    return {
      ...base,
      selected: false,
      subjective: '',
      objective: block.objective,
      assessment: '',
      plan: block.plan,
      antibiotics: [],
      error: caught instanceof Error ? caught.message : String(caught),
    };
  }
}

/** 최근 두 검사일의 수치를 `날짜: 항목 값 단위(H/L), ...` 한 줄씩으로 만든다. */
export function buildRecentLabText(labs: LabResult[], dateLimit = 2, itemLimit = 40): string {
  const byDate = new Map<string, string[]>();
  for (const lab of labs) {
    const key = formatDateInput(lab.testDate);
    const entries = byDate.get(key) ?? [];
    for (const item of lab.items) {
      entries.push(`${item.name} ${item.valueText}${item.unit ? ` ${item.unit}` : ''}${item.hlFlag ? `(${item.hlFlag})` : ''}`);
    }
    byDate.set(key, entries);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, dateLimit)
    .map(([date, entries]) => `${date}: ${entries.slice(0, itemLimit).join(', ')}`)
    .join('\n');
}
