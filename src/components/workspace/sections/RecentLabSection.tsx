import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import type { BriefingData } from '@/services/briefingService';
import { RemoveButton } from '../controls';
import type { PatientWorkspaceManualLab } from '../types';

export function RecentLabSection({
  labs,
  manualLabs,
  onRemoveLab,
}: {
  labs: BriefingData['recentLabs'];
  manualLabs: PatientWorkspaceManualLab[];
  onRemoveLab?: (lab: PatientWorkspaceManualLab) => void | Promise<void>;
}) {
  return (
    <DataSection title="최근 Lab" count={labs.length + manualLabs.length}>
      {manualLabs.map((item) => (
        <ClinicalRow
          key={item.id ?? `${item.dateKey}-${item.itemName}`}
          prefix={item.dateKey}
          title={item.itemName}
          detail={`${item.value}${item.unit ? ` ${item.unit}` : ''}`}
          tone={item.flag ? 'danger' : 'default'}
          action={
            item.id && onRemoveLab ? <RemoveButton onClick={() => onRemoveLab(item)} /> : undefined
          }
        />
      ))}
      {labs.map((item) => (
        <ClinicalRow
          key={`${item.patientId}-${item.dateKey}`}
          prefix={item.dateKey}
          title={item.abnormalCount > 0 ? item.abnormalItems.join(', ') : '정상'}
          detail={`${item.totalItems} items`}
          tone={item.abnormalCount > 0 ? 'danger' : 'muted'}
          pill={item.abnormalCount > 0 ? `${item.abnormalCount}` : undefined}
        />
      ))}
      {labs.length === 0 && manualLabs.length === 0 && (
        <ClinicalRow prefix="-" title="0" detail="Lab 없음" />
      )}
    </DataSection>
  );
}
