import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Medication } from '@/db/database';
import { formatDate, parseLocalDate, getLocalToday } from '@/utils/dateUtils';

interface MedicationFormProps {
  medication: Medication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (medication: Medication) => void;
}

// 용법별 투약 시간 옵션
const SCHEDULE_OPTIONS: Record<number, string[]> = {
  1: ['아침', '점심', '저녁', '자기전'],
  2: ['아침,저녁', '아침,점심', '점심,저녁'],
  3: ['아침,점심,저녁'],
  4: ['아침,점심,저녁,자기전'],
};

// 복용 타이밍 옵션
const TIMING_OPTIONS = [
  { value: 'none', label: '없음' },
  { value: '식전 30분', label: '식전 30분' },
  { value: '식후 30분', label: '식후 30분' },
];

export function MedicationForm({ medication, open, onOpenChange, onSave }: MedicationFormProps) {
  const [formData, setFormData] = useState<Medication>(medication);
  const [frequency, setFrequency] = useState<number>(1);
  const [dailyDose, setDailyDose] = useState<number>(0);

  useEffect(() => {
    setFormData(medication);

    // 기존 데이터에서 frequency와 dailyDose 계산
    if (!medication.category || medication.category !== 'antibiotic') {
      const scheduleItems = medication.schedule.split(',').map(s => s.trim());
      const freq = scheduleItems.length;
      setFrequency(freq);
      setDailyDose(medication.singleDose * freq);
    }
  }, [medication]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // For antibiotics, check if endDate is in the past
    let isActive = formData.isActive;
    if (formData.category === 'antibiotic' && formData.endDate) {
      const endDate = new Date(formData.endDate);
      const today = getLocalToday();

      // If endDate is in the past, set isActive to false
      isActive = endDate >= today;
    }

    onSave({
      ...formData,
      isActive,
      updatedAt: new Date(),
    });
    onOpenChange(false);
  };

  const handleChange = (field: keyof Medication, value: string | number | Date) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 용법 변경 시 - singleDose와 schedule 자동 조정
  const handleFrequencyChange = (value: string) => {
    const newFrequency = parseInt(value);
    setFrequency(newFrequency);

    // 하루 용량이 설정되어 있으면 1회 용량 재계산
    if (dailyDose > 0) {
      const newSingleDose = dailyDose / newFrequency;
      setFormData((prev) => ({
        ...prev,
        singleDose: newSingleDose,
      }));
    }

    // 기본 투약시간 설정
    const defaultSchedule = SCHEDULE_OPTIONS[newFrequency]?.[0] || '';
    setFormData((prev) => ({
      ...prev,
      schedule: defaultSchedule,
    }));
  };

  // 하루 용량 변경 시 - singleDose 자동 계산
  const handleDailyDoseChange = (value: number) => {
    setDailyDose(value);
    const newSingleDose = value / frequency;
    setFormData((prev) => ({
      ...prev,
      singleDose: newSingleDose,
    }));
  };

  const isAntibiotic = formData.category === 'antibiotic';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>투약 정보 수정</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 약물명 */}
          <div className="space-y-2">
            <Label htmlFor="drugName">약물명</Label>
            <Input
              id="drugName"
              value={formData.drugName}
              onChange={(e) => handleChange('drugName', e.target.value)}
              required
            />
          </div>

          {isAntibiotic ? (
            <>
              {/* 항생제 필드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosage">용량</Label>
                  <Input
                    id="dosage"
                    placeholder="예: 4V, 2g"
                    value={formData.dosage || ''}
                    onChange={(e) => handleChange('dosage', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">용법</Label>
                  <Input
                    id="frequency"
                    placeholder="예: #4, #2"
                    value={formData.frequency || ''}
                    onChange={(e) => handleChange('frequency', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formatDate(formData.startDate)}
                    onChange={(e) => handleChange('startDate', parseLocalDate(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate ? formatDate(formData.endDate) : ''}
                    onChange={(e) => handleChange('endDate', parseLocalDate(e.target.value))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 처방약/지참약 필드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyDose">하루 용량</Label>
                  <Input
                    id="dailyDose"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="예: 2, 3"
                    value={dailyDose}
                    onChange={(e) => handleDailyDoseChange(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequencySelect">용법</Label>
                  <Select value={frequency.toString()} onValueChange={handleFrequencyChange}>
                    <SelectTrigger id="frequencySelect">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">#1</SelectItem>
                      <SelectItem value="2">#2</SelectItem>
                      <SelectItem value="3">#3</SelectItem>
                      <SelectItem value="4">#4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduleSelect">투약 시간</Label>
                <Select value={formData.schedule} onValueChange={(value) => handleChange('schedule', value)}>
                  <SelectTrigger id="scheduleSelect">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS[frequency]?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timingSelect">복용 타이밍</Label>
                <Select
                  value={formData.timing || ''}
                  onValueChange={(value) => handleChange('timing', value === 'none' ? '' : value)}
                >
                  <SelectTrigger id="timingSelect">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* 메모 (공통) */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Input
              id="notes"
              placeholder="추가 메모 (선택)"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
