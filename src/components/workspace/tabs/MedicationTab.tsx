import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import { AiActionPanel } from '@/components/ai/AiActionPanel';
import { checkMedications } from '@/services/aiService';
import type { Medication } from '@/types/medication';
import { calculateAge } from '@/utils/dateUtils';
import { CollapsiblePanel, RemoveButton } from '../controls';
import { AntibioticForm } from '../forms/AntibioticForm';
import { ManualMedicationForm } from '../forms/ManualMedicationForm';
import { MedicationPasteForm } from '../forms/MedicationPasteForm';
import { emptyAntibioticDraft, emptyMedicationDraft } from '../forms/medicationDrafts';
import type { PatientWorkspaceProps, WorkspaceTabBaseProps } from '../types';
import { buildLabLines, buildMedicationLines } from '../workspaceData';

interface MedicationTabProps extends WorkspaceTabBaseProps {
  medications: Medication[];
  onAddAntibiotic?: PatientWorkspaceProps['onAddAntibiotic'];
  onAddMedication?: PatientWorkspaceProps['onAddMedication'];
  onSaveParsedMedications?: PatientWorkspaceProps['onSaveParsedMedications'];
  onRemoveAntibiotic?: PatientWorkspaceProps['onRemoveAntibiotic'];
  onRemoveMedication?: PatientWorkspaceProps['onRemoveMedication'];
  onLoadMedications?: PatientWorkspaceProps['onLoadMedications'];
}

export function MedicationTab({
  patient,
  data,
  medications,
  onAddAntibiotic,
  onAddMedication,
  onSaveParsedMedications,
  onRemoveAntibiotic,
  onRemoveMedication,
  onLoadMedications,
  onDirtyChange,
}: MedicationTabProps) {
  const [antibioticDraft, setAntibioticDraft] = useState(emptyAntibioticDraft);
  const [medicationDraft, setMedicationDraft] = useState(emptyMedicationDraft);

  const antibiotics = useMemo(
    () => data.antibiotics.filter((item) => item.patientId === patient.id),
    [data.antibiotics, patient.id]
  );
  const patientMedications = useMemo(
    () => medications.filter((item) => item.patientId === patient.id && item.isActive),
    [medications, patient.id]
  );
  const hospitalMedications = useMemo(
    () => patientMedications.filter((item) => item.category === 'hospital'),
    [patientMedications]
  );
  const personalMedications = useMemo(
    () => patientMedications.filter((item) => item.category === 'personal'),
    [patientMedications]
  );
  const hasDraft = Boolean(antibioticDraft.drugName.trim() || medicationDraft.drugName.trim());

  const resetAntibioticDraft = useCallback(() => setAntibioticDraft(emptyAntibioticDraft()), []);
  const resetMedicationDraft = useCallback(() => setMedicationDraft(emptyMedicationDraft()), []);

  useEffect(() => {
    setAntibioticDraft(emptyAntibioticDraft());
    setMedicationDraft(emptyMedicationDraft());
  }, [patient.id]);
  useEffect(() => {
    void onLoadMedications?.(patient.id);
  }, [onLoadMedications, patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);

  const medicationSummary = useMemo(
    () =>
      patientMedications
        .map((item) =>
          [
            item.drugName,
            item.singleDose ? `${item.singleDose}T` : '',
            item.schedule,
            item.timing,
          ]
            .filter(Boolean)
            .join(' ')
        )
        .join('\n'),
    [patientMedications]
  );

  const runMedicationCheck = useCallback(
    () =>
      checkMedications({
        patientName: patient.name,
        age: calculateAge(patient.birthDate),
        sex: patient.sex,
        currentMedications: medicationSummary,
        antibiotics: buildMedicationLines(patient.id, data).join('\n'),
        recentLab: buildLabLines(patient.id, data).join('\n'),
      }),
    [data, medicationSummary, patient.birthDate, patient.id, patient.name, patient.sex]
  );

  return (
    <div className="space-y-3">
      <DataSection title="항생제" count={antibiotics.length}>
        {antibiotics.length === 0 ? (
          <ClinicalRow prefix="-" title="0" detail="항생제 없음" />
        ) : (
          antibiotics.map((item) => (
            <ClinicalRow
              key={item.medicationId}
              prefix={`D+${item.dDay}`}
              title={item.drugName}
              detail={`${item.dosage ?? ''} ${item.frequency ?? ''}`.trim()}
              tone={item.isLongTerm ? 'danger' : 'warning'}
              pill={item.isLongTerm ? '장기' : undefined}
              action={
                onRemoveAntibiotic ? (
                  <RemoveButton onClick={() => onRemoveAntibiotic(item.medicationId)} />
                ) : undefined
              }
            />
          ))
        )}
      </DataSection>

      <MedicationListSection
        title="본원약"
        items={hospitalMedications}
        onRemove={onRemoveMedication}
      />
      <MedicationListSection
        title="지참약"
        items={personalMedications}
        onRemove={onRemoveMedication}
      />

      <AiActionPanel
        title="AI 투약 체크"
        actionLabel="투약 안전성 체크"
        resultTitle="투약 안전성 분석"
        resetKey={patient.id}
        ready={Boolean(medicationSummary || antibiotics.length > 0)}
        readyHint="투약과 최근 Lab을 교차 분석해 주의사항을 정리합니다."
        notReadyHint="분석할 투약 정보가 없습니다."
        run={runMedicationCheck}
      />

      <CollapsiblePanel title="약제 추가">
        <div className="space-y-3">
          <AntibioticForm
            draft={antibioticDraft}
            setDraft={setAntibioticDraft}
            onAddAntibiotic={onAddAntibiotic}
            onReset={resetAntibioticDraft}
          />
          <ManualMedicationForm
            draft={medicationDraft}
            setDraft={setMedicationDraft}
            onAddMedication={onAddMedication}
            onReset={resetMedicationDraft}
          />
          <MedicationPasteForm
            patientId={patient.id}
            onSaveParsedMedications={onSaveParsedMedications}
            onLoadMedications={onLoadMedications}
          />
        </div>
      </CollapsiblePanel>
    </div>
  );
}

function MedicationListSection({
  title,
  items,
  onRemove,
}: {
  title: string;
  items: Medication[];
  onRemove?: (medicationId: string) => void | Promise<void>;
}) {
  return (
    <DataSection title={title} count={items.length}>
      {items.length === 0 ? (
        <ClinicalRow prefix="-" title="0" detail={`${title} 없음`} />
      ) : (
        items.map((item) => (
          <ClinicalRow
            key={item.id}
            prefix="약"
            title={item.drugName}
            detail={[
              item.singleDose ? `${item.singleDose}T` : '',
              item.schedule,
              item.timing,
              item.notes,
            ]
              .filter(Boolean)
              .join(' · ')}
            tone="default"
            action={onRemove ? <RemoveButton onClick={() => onRemove(item.id)} /> : undefined}
          />
        ))
      )}
    </DataSection>
  );
}
