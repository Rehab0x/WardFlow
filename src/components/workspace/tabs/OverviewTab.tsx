import { useCallback, useMemo } from 'react';
import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { CopyBar } from '@/components/clinical/CopyBar';
import { DataSection } from '@/components/clinical/DataSection';
import { formatDateInput, formatOnsetElapsedText } from '@/components/clinical/dateLabels';
import { AiActionPanel } from '@/components/ai/AiActionPanel';
import { EvidencePanel } from '@/components/ai/EvidencePanel';
import { generateHandoff } from '@/services/aiService';
import type { Patient } from '@/types/patient';
import type { BriefingData } from '@/services/briefingService';
import { calculateAge } from '@/utils/dateUtils';
import { buildHandoffLines, buildLabLines, buildMedicationLines, getPatientRows } from '../workspaceData';
import { CalorieNeedsSection } from '../sections/CalorieNeedsSection';
import { StandingOrdersSection } from '../sections/StandingOrdersSection';
import type { WorkspaceTabId } from '../WorkspaceTabs';

export function OverviewTab({
  patient,
  data,
  onOpenTab,
  onSaveStandingOrders,
  onDirtyChange,
}: {
  patient: Patient;
  data: BriefingData;
  onOpenTab: (tab: WorkspaceTabId) => void;
  onSaveStandingOrders?: (text: string) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const rows = useMemo(() => getPatientRows(patient.id, data), [patient.id, data]);
  const handoffLines = useMemo(() => buildHandoffLines(patient, rows), [patient, rows]);

  const runHandoff = useCallback(
    () =>
      generateHandoff({
        patientName: patient.name,
        sex: patient.sex,
        age: calculateAge(patient.birthDate),
        admissionDate: formatDateInput(patient.admissionDate),
        chiefComplaint: patient.chiefComplaint,
        onset: patient.onset,
        problemList: patient.problemList.join('\n'),
        currentMedications: buildMedicationLines(patient.id, data).join('\n'),
        antibiotics: rows.antibiotics
          .map((item) => `${item.drugName} ${item.dosage ?? ''} D+${item.dDay}`.trim())
          .join('\n'),
        recentLab: buildLabLines(patient.id, data).join('\n'),
        recentNotes: data.progressNotes
          .filter((item) => item.patientId === patient.id)
          .map((item) => item.content)
          .join('\n'),
        tags: (patient.tags ?? []).join(', '),
        attention: Boolean(patient.attention),
        schedules: rows.schedules
          .map((item) => `${item.scheduledTime ?? ''} ${item.title} (${item.category})`.trim())
          .join('\n'),
      }),
    [data, patient, rows.antibiotics, rows.schedules]
  );

  return (
    <div className="space-y-3">
      <CopyBar
        title="인계 요약 복사"
        text={handoffLines.join('\n')}
        emptyText="복사할 인계 내용 없음"
      />
      {/* 처방할 때마다 손대는 내용이라 요약 탭 위쪽에 둔다. */}
      <StandingOrdersSection
        value={patient.standingOrders}
        onSave={onSaveStandingOrders}
        onDirtyChange={onDirtyChange}
      />
      <CalorieNeedsSection patient={patient} />
      <div className="grid gap-3 lg:grid-cols-2">
        <DataSection title="차팅 요약">
          <ClinicalRow
            prefix="C/C"
            title={patient.chiefComplaint || '-'}
            detail={formatOnsetElapsedText(patient.onset) ?? undefined}
            onClick={() => onOpenTab('charting')}
          />
          <ClinicalRow
            prefix="PI"
            title={patient.presentIllness || '-'}
            onClick={() => onOpenTab('charting')}
          />
          <ClinicalRow
            prefix="Plan"
            title={patient.plan || '-'}
            onClick={() => onOpenTab('charting')}
          />
        </DataSection>
        <DataSection title="오늘 큐" count={rows.queue.length}>
          {rows.queue.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 표시할 큐 없음" />
          ) : (
            rows.queue.map((item) => (
              <ClinicalRow
                key={item.key}
                prefix={item.prefix}
                title={item.title}
                detail={item.detail}
                tone={item.tone}
                onClick={() => onOpenTab(item.tab)}
              />
            ))
          )}
        </DataSection>
      </div>
      <EvidencePanel
        resetKey={patient.id}
        context={{
          patientSummary: `${patient.name} ${patient.sex}/${calculateAge(patient.birthDate)} · ${patient.chiefComplaint || '주호소 미기재'}`,
          problemList: patient.problemList.join('\n'),
          medications: buildMedicationLines(patient.id, data).join('\n'),
          recentLab: buildLabLines(patient.id, data).join('\n'),
        }}
      />
      <AiActionPanel
        title="AI 인수인계 요약"
        actionLabel="인수인계 생성"
        resultTitle="인수인계 요약"
        resetKey={patient.id}
        readyHint="차팅·투약·Lab·메모·일정을 묶어 인수인계 보고서를 만듭니다."
        run={runHandoff}
      />
    </div>
  );
}
