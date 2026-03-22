import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MedicationAntibioticFormProps {
  patientId: string;
  onSave: (data: AntibioticFormData) => void;
  onCancel: () => void;
}

export interface AntibioticFormData {
  drugName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
}

export function MedicationAntibioticForm({
  patientId: _patientId,
  onSave,
  onCancel,
}: MedicationAntibioticFormProps) {
  const [formData, setFormData] = useState<AntibioticFormData>({
    drugName: '',
    dosage: '',
    frequency: '',
    startDate: new Date().toISOString().split('T')[0] ?? '', // Today
    endDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.drugName.trim()) {
      alert('항생제명을 입력해주세요.');
      return;
    }
    if (!formData.dosage.trim()) {
      alert('용량을 입력해주세요.');
      return;
    }
    if (!formData.frequency.trim()) {
      alert('용법을 입력해주세요.');
      return;
    }
    if (!formData.startDate) {
      alert('시작일을 입력해주세요.');
      return;
    }
    if (!formData.endDate) {
      alert('종료일을 입력해주세요.');
      return;
    }

    // Check if end date is after start date
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      alert('종료일은 시작일보다 늦어야 합니다.');
      return;
    }

    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="drugName">항생제명</Label>
        <Input
          id="drugName"
          type="text"
          placeholder="예: Tazocin"
          value={formData.drugName}
          onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          항생제 이름을 입력하세요 (영문 권장)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dosage">용량</Label>
          <Input
            id="dosage"
            type="text"
            placeholder="예: 4V, 2g"
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            하루 총 용량 + 단위
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">용법</Label>
          <Input
            id="frequency"
            type="text"
            placeholder="예: #4"
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            하루 투약 횟수
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">시작일</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">종료일 (예정)</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-2">입력 예시</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• 항생제명: Tazocin</p>
          <p>• 용량: 4V (하루 총 4바이알)</p>
          <p>• 용법: #4 (하루 4회로 나눠서)</p>
          <p>• 표시 결과: Tazocin | 4V | #4</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">
          추가
        </Button>
      </div>
    </form>
  );
}
