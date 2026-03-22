import { useState, useEffect } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ResizableTextArea } from './ResizableTextArea';
import { ProblemListEditor } from './ProblemListEditor';
import { TemplatePopup } from './TemplatePopup';
import { formatChartingForCopy, copyToClipboard, formatSingleField } from '@/services/chartingFormatter';
import { useChartingSettingsStore } from '@/stores/useChartingSettingsStore';
import type { ChartingFormData, ProblemListMode } from '@/types/charting';
import type { TemplateField } from '@/services/templateService';

export interface ChartingFormProps {
  patientId: string;
  initialData?: Partial<ChartingFormData>;
  onSave?: (data: ChartingFormData) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

/**
 * ChartingForm - 차팅 폼 (C/C ~ Etc)
 *
 * 의사가 환자 차팅을 입력하는 핵심 폼
 * - 구조화된 섹션 (C/C, Onset, PI, P/Hx, ROS, P/Ex, Problem List, Plan, Etc)
 * - 자동 높이 조절 텍스트 영역
 * - Problem List 이중 모드 (리스트 / 텍스트)
 * - OCS 복사 버튼
 */
export const ChartingForm = ({
  patientId: _patientId,
  initialData,
  onSave,
  autoSave = true,
  autoSaveDelay = 2000,
}: ChartingFormProps) => {
  const chartingSettings = useChartingSettingsStore();
  const copyFormat = chartingSettings.getCopyFormat();
  const { problemListStyle } = chartingSettings;

  const [formData, setFormData] = useState<ChartingFormData>({
    chiefComplaint: initialData?.chiefComplaint || '',
    onset: initialData?.onset || '',
    presentIllness: initialData?.presentIllness || '',
    pastHistory: initialData?.pastHistory || '',
    reviewOfSystem: initialData?.reviewOfSystem || '',
    physicalExam: initialData?.physicalExam || '',
    problemList: initialData?.problemList || [],
    problemListText: initialData?.problemListText || '',
    plan: initialData?.plan || '',
    guardianExplanation: initialData?.guardianExplanation || '',
    etc: initialData?.etc || '',
  });

  const [problemListMode, setProblemListMode] = useState<ProblemListMode>('list');
  const [onsetInputMode, setOnsetInputMode] = useState<'date' | 'text'>('text');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templatePopup, setTemplatePopup] = useState<{ field: TemplateField; label: string } | null>(null);

  // Auto-save logic
  useEffect(() => {
    if (!autoSave || !onSave) return;

    const timer = setTimeout(() => {
      setSaving(true);
      onSave(formData);
      // Simulate save delay
      setTimeout(() => setSaving(false), 500);
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [formData, autoSave, autoSaveDelay, onSave]);

  const handleChange = (field: keyof ChartingFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle date selection for Onset field
  const handleOnsetDateChange = (dateString: string) => {
    if (!dateString) {
      handleChange('onset', '');
      return;
    }

    // Calculate duration
    const onsetDate = new Date(dateString);
    const today = new Date();
    const diffMs = today.getTime() - onsetDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const remainingDaysAfterYears = diffDays % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);
    const days = remainingDaysAfterYears % 30;

    // Build duration string
    const durationParts: string[] = [];
    if (years > 0) durationParts.push(`${years}년`);
    if (months > 0) durationParts.push(`${months}개월`);
    if (days > 0 || durationParts.length === 0) durationParts.push(`${days}일`);

    const durationText = durationParts.join(' ') + ' 전';
    const formattedOnset = `${dateString} (${durationText})`;

    handleChange('onset', formattedOnset);
  };

  const handleCopy = async () => {
    const text = formatChartingForCopy(formData, copyFormat);
    const success = await copyToClipboard(text);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 개별 필드 복사
  const handleFieldCopy = async (fieldLabel: string, value: string | string[], sameLine: boolean = false) => {
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) {
      return;
    }

    const text = formatSingleField(fieldLabel, value, sameLine, problemListStyle);
    const success = await copyToClipboard(text);

    if (success) {
      setCopiedField(fieldLabel);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  const handleTemplateOpen = (field: TemplateField, label: string) => {
    setTemplatePopup({ field, label });
  };

  const handleTemplateInsert = (content: string) => {
    if (!templatePopup) return;
    const field = templatePopup.field as keyof ChartingFormData;
    if (field === 'problemList') {
      // Append to problem list as new items
      const lines = content.split('\n').filter((l) => l.trim());
      setFormData((prev) => ({ ...prev, problemList: [...prev.problemList, ...lines] }));
    } else if (field in formData) {
      const current = formData[field];
      const newVal = typeof current === 'string'
        ? current ? `${current}\n${content}` : content
        : content;
      setFormData((prev) => ({ ...prev, [field]: newVal }));
    }
  };

  // Field Label with Copy & Template buttons
  const FieldLabel = ({
    htmlFor,
    label,
    displayLabel,
    value,
    sameLine = false,
  }: {
    htmlFor: string;
    label: string;
    displayLabel: string;
    value: string | string[];
    sameLine?: boolean;
  }) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor}>{displayLabel}</Label>
      <div className="flex gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleFieldCopy(label, value, sameLine)}
                disabled={!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')}
              >
                {copiedField === label ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>이 항목만 복사</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleTemplateOpen(htmlFor as TemplateField, displayLabel)}
              >
                <FileText className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>템플릿</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <>
    {templatePopup && (
      <TemplatePopup
        open={!!templatePopup}
        onClose={() => setTemplatePopup(null)}
        field={templatePopup.field}
        fieldLabel={templatePopup.label}
        currentContent={
          templatePopup.field in formData
            ? (formData[templatePopup.field as keyof ChartingFormData] as string) || ''
            : ''
        }
        onApply={handleTemplateInsert}
      />
    )}
    <div className="space-y-6 pb-6">
      {/* Section: Chief Complaint & Onset */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel
            htmlFor="chiefComplaint"
            label="C/C"
            displayLabel="C/C (Chief Complaint)"
            value={formData.chiefComplaint}
            sameLine={true}
          />
          <Input
            id="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={(e) => handleChange('chiefComplaint', e.target.value)}
            placeholder="예: Dyspnea, Fever, Abdominal pain"
          />
        </div>
        <div className="space-y-2">
          {/* Label + 토글 버튼 + 복사/템플릿 버튼 - 한 줄로 배치 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="onset">Onset</Label>
            <div className="flex items-center gap-2">
              {/* 토글 버튼들 - 작고 간결하게 */}
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  variant={onsetInputMode === 'date' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setOnsetInputMode('date')}
                >
                  날짜
                </Button>
                <Button
                  type="button"
                  variant={onsetInputMode === 'text' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setOnsetInputMode('text')}
                >
                  텍스트
                </Button>
              </div>
              {/* 복사/템플릿 버튼 */}
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleFieldCopy('Onset', formData.onset, true)}
                        disabled={!formData.onset || formData.onset.trim() === ''}
                      >
                        {copiedField === 'Onset' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>이 항목만 복사</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleTemplateOpen('onset', 'Onset')}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>템플릿 붙여넣기</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Input 필드 */}
          {onsetInputMode === 'date' ? (
            <Input
              id="onset"
              type="date"
              onChange={(e) => handleOnsetDateChange(e.target.value)}
              placeholder="날짜를 선택하세요"
            />
          ) : (
            <Input
              id="onset"
              value={formData.onset}
              onChange={(e) => handleChange('onset', e.target.value)}
              placeholder="예: 3 days ago, 1 week ago, 2026-01-15"
            />
          )}

          {/* 미리보기 (날짜 모드일 때만) */}
          {onsetInputMode === 'date' && formData.onset && (
            <p className="text-sm text-muted-foreground">
              {formData.onset}
            </p>
          )}
        </div>
      </div>

      {/* Section: Present Illness */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="presentIllness"
          label="PI"
          displayLabel="PI (Present Illness)"
          value={formData.presentIllness}
        />
        <ResizableTextArea
          id="presentIllness"
          value={formData.presentIllness}
          onChange={(e) => handleChange('presentIllness', e.target.value)}
          placeholder="현병력을 자세히 기술..."
          minRows={3}
          maxRows={10}
        />
      </div>

      {/* Section: Past History */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="pastHistory"
          label="P/Hx"
          displayLabel="P/Hx (Past History)"
          value={formData.pastHistory}
        />
        <ResizableTextArea
          id="pastHistory"
          value={formData.pastHistory}
          onChange={(e) => handleChange('pastHistory', e.target.value)}
          placeholder="예: DM, HTN, None"
          minRows={2}
          maxRows={6}
        />
      </div>

      {/* Section: Review of System */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="reviewOfSystem"
          label="ROS"
          displayLabel="ROS (Review of System)"
          value={formData.reviewOfSystem}
        />
        <ResizableTextArea
          id="reviewOfSystem"
          value={formData.reviewOfSystem}
          onChange={(e) => handleChange('reviewOfSystem', e.target.value)}
          placeholder="예: Constitutional: Fever(+), Chilling(-)"
          minRows={3}
          maxRows={8}
        />
      </div>

      {/* Section: Physical Exam */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="physicalExam"
          label="P/Ex"
          displayLabel="P/Ex (Physical Exam)"
          value={formData.physicalExam}
        />
        <ResizableTextArea
          id="physicalExam"
          value={formData.physicalExam}
          onChange={(e) => handleChange('physicalExam', e.target.value)}
          placeholder="예: Alert, oriented, Chest: crackle on Rt. lower lung"
          minRows={3}
          maxRows={8}
        />
      </div>

      {/* Section: Problem List */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="problemList"
          label="Problem List"
          displayLabel="Problem List"
          value={problemListMode === 'text' ? formData.problemListText || '' : formData.problemList}
        />
        <ProblemListEditor
          value={formData.problemList}
          textValue={formData.problemListText}
          onChange={(value) => handleChange('problemList', value)}
          onTextChange={(value) => handleChange('problemListText', value)}
          mode={problemListMode}
          onModeChange={setProblemListMode}
        />
      </div>

      {/* Section: Plan */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="plan"
          label="Plan"
          displayLabel="Plan"
          value={formData.plan}
        />
        <ResizableTextArea
          id="plan"
          value={formData.plan}
          onChange={(e) => handleChange('plan', e.target.value)}
          placeholder="치료 계획..."
          minRows={3}
          maxRows={10}
        />
      </div>

      {/* Section: Guardian Explanation */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="guardianExplanation"
          label="보호자 설명"
          displayLabel="보호자 설명"
          value={formData.guardianExplanation}
        />
        <ResizableTextArea
          id="guardianExplanation"
          value={formData.guardianExplanation}
          onChange={(e) => handleChange('guardianExplanation', e.target.value)}
          placeholder="보호자에게 설명한 내용..."
          minRows={2}
          maxRows={6}
        />
      </div>

      {/* Section: Etc */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="etc"
          label="Etc"
          displayLabel="Etc (기타)"
          value={formData.etc}
        />
        <ResizableTextArea
          id="etc"
          value={formData.etc}
          onChange={(e) => handleChange('etc', e.target.value)}
          placeholder="기타 메모..."
          minRows={2}
          maxRows={6}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {saving && '저장 중...'}
          {!saving && autoSave && '자동 저장됨'}
        </div>
        <Button onClick={handleCopy} variant={copied ? 'outline' : 'default'}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              복사 완료!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              전체 복사
            </>
          )}
        </Button>
      </div>
    </div>
    </>
  );
};
