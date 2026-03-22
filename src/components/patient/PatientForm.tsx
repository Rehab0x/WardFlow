import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '@/stores/usePatientStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PatientFormProps {
  patientId?: string; // If editing existing patient
  onClose?: () => void;
}

export function PatientForm({ patientId, onClose }: PatientFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getPatientById, addPatient, updatePatient, dischargePatient } = usePatientStore();
  const { currentUser } = useAuthStore();

  const existingPatient = patientId ? getPatientById(patientId) : undefined;
  const isEditing = !!existingPatient;

  // Form state
  const [formData, setFormData] = useState({
    registrationNumber: '',
    name: '',
    birthDate: '',
    sex: 'M' as 'M' | 'F',
    roomBed: '',
    admissionDate: '',
    patientType: 'admitted' as 'admitted' | 'consult',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discharge handling
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [dischargeDate, setDischargeDate] = useState('');

  // Readmission handling
  const [showReadmitConfirm, setShowReadmitConfirm] = useState(false);

  // Load existing patient data
  useEffect(() => {
    if (existingPatient) {
      setFormData({
        registrationNumber: existingPatient.registrationNumber,
        name: existingPatient.name,
        birthDate: existingPatient.birthDate.toISOString().split('T')[0] ?? '',
        sex: existingPatient.sex,
        roomBed: existingPatient.roomBed,
        admissionDate: existingPatient.admissionDate.toISOString().split('T')[0] ?? '',
        patientType: existingPatient.patientType,
      });
    }
  }, [existingPatient]);

  const handleChange = (field: string, value: string | 'M' | 'F' | 'admitted' | 'consult') => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.registrationNumber.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '환자 등록번호를 입력해주세요.',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '환자 이름을 입력해주세요.',
      });
      return;
    }

    if (!formData.roomBed.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '병실/침상 번호를 입력해주세요.',
      });
      return;
    }

    if (!formData.birthDate) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '생년월일을 입력해주세요.',
      });
      return;
    }

    if (!formData.admissionDate) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '입원일을 입력해주세요.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && patientId) {
        // Update existing patient
        await updatePatient(patientId, {
          registrationNumber: formData.registrationNumber,
          name: formData.name,
          birthDate: new Date(formData.birthDate),
          sex: formData.sex,
          roomBed: formData.roomBed,
          admissionDate: new Date(formData.admissionDate),
          patientType: formData.patientType,
        });

        toast({
          title: '환자 정보 수정',
          description: `${formData.name} 환자의 정보가 수정되었습니다.`,
        });
      } else {
        // Add new patient
        const id = await addPatient({
          registrationNumber: formData.registrationNumber,
          name: formData.name,
          birthDate: new Date(formData.birthDate),
          sex: formData.sex,
          roomBed: formData.roomBed,
          admissionDate: new Date(formData.admissionDate),
          dischargeDate: undefined,
          attendingPhysician: currentUser?.name || '미지정',
          patientType: formData.patientType,
          status: 'active',
          createdBy: currentUser?.id || '',
          sharedWith: [],
          // Initialize charting fields
          chiefComplaint: '',
          onset: '',
          presentIllness: '',
          pastHistory: '',
          reviewOfSystem: '',
          physicalExam: '',
          problemList: [],
          plan: '',
          guardianExplanation: '',
          etc: '',
        });

        toast({
          title: '환자 추가',
          description: `${formData.name} 환자가 추가되었습니다.`,
        });

        // Navigate to new patient detail page (only if not in modal mode)
        if (!onClose) {
          navigate(`/patients/${id}`);
        }
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '환자 정보 저장에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDischarge = async () => {
    if (!patientId || !dischargeDate) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '퇴원일을 입력해주세요.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await dischargePatient(patientId, new Date(dischargeDate));

      toast({
        title: '환자 퇴원 처리',
        description: `${existingPatient?.name} 환자가 퇴원 처리되었습니다.`,
      });

      if (onClose) {
        onClose();
      } else {
        navigate('/');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '퇴원 처리에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
      setShowDischargeConfirm(false);
    }
  };

  const handleReadmit = async () => {
    if (!patientId) return;

    setIsSubmitting(true);

    try {
      // Readmit patient: set status back to active, clear discharge date
      await updatePatient(patientId, {
        status: 'active',
        dischargeDate: undefined,
        admissionDate: new Date(formData.admissionDate), // Use new admission date from form
        patientType: formData.patientType, // Allow changing patient type
        roomBed: formData.roomBed, // Use new room/bed from form
      });

      toast({
        title: '환자 재입원',
        description: `${existingPatient?.name} 환자가 재입원 처리되었습니다.`,
      });

      if (onClose) {
        onClose();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '재입원 처리에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
      setShowReadmitConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {isEditing ? '환자 정보 수정' : '새 환자 추가'}
        </h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">기본 정보</h3>

          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">환자 등록번호 *</Label>
            <Input
              id="registrationNumber"
              value={formData.registrationNumber}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
              placeholder="12345678"
              required
            />
            <p className="text-xs text-muted-foreground">
              외부 검사실 결과 파일 매칭에 사용됩니다.
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">환자 이름 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="홍길동"
              required
            />
          </div>

          {/* Birth Date & Sex */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일 *</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">성별 *</Label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sex"
                    value="M"
                    checked={formData.sex === 'M'}
                    onChange={(e) => handleChange('sex', e.target.value as 'M' | 'F')}
                    className="w-4 h-4"
                  />
                  <span>남성 (M)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sex"
                    value="F"
                    checked={formData.sex === 'F'}
                    onChange={(e) => handleChange('sex', e.target.value as 'M' | 'F')}
                    className="w-4 h-4"
                  />
                  <span>여성 (F)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Admission Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">입원 정보</h3>

          {/* Patient Type */}
          <div className="space-y-2">
            <Label>환자 유형 *</Label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="patientType"
                  value="admitted"
                  checked={formData.patientType === 'admitted'}
                  onChange={(e) => handleChange('patientType', e.target.value as 'admitted' | 'consult')}
                  className="w-4 h-4"
                />
                <span>입원환자</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="patientType"
                  value="consult"
                  checked={formData.patientType === 'consult'}
                  onChange={(e) => handleChange('patientType', e.target.value as 'admitted' | 'consult')}
                  className="w-4 h-4"
                />
                <span>컨설트환자</span>
              </label>
            </div>
          </div>

          {/* Room & Bed */}
          <div className="space-y-2">
            <Label htmlFor="roomBed">병실 번호 (침상번호 선택) *</Label>
            <Input
              id="roomBed"
              value={formData.roomBed}
              onChange={(e) => handleChange('roomBed', e.target.value)}
              placeholder="301 또는 301-1"
              required
            />
            <p className="text-xs text-muted-foreground">
              침상번호는 선택사항입니다. 병실번호만 입력하거나 "301-1" 형식으로 입력하세요.
            </p>
          </div>

          {/* Admission Date */}
          <div className="space-y-2">
            <Label htmlFor="admissionDate">입원일 *</Label>
            <Input
              id="admissionDate"
              type="date"
              value={formData.admissionDate}
              onChange={(e) => handleChange('admissionDate', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {isEditing && existingPatient?.status === 'active' && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDischargeConfirm(true)}
                disabled={isSubmitting}
              >
                <Calendar className="h-4 w-4 mr-2" />
                퇴원 처리
              </Button>
            )}
            {isEditing && existingPatient?.status === 'discharged' && (
              <Button
                type="button"
                variant="default"
                onClick={() => setShowReadmitConfirm(true)}
                disabled={isSubmitting}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                재입원 처리
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                취소
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? '저장 중...' : isEditing ? '수정' : '추가'}
            </Button>
          </div>
        </div>
      </form>

      {/* Discharge Confirmation Dialog */}
      {showDischargeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-xl font-bold">퇴원 처리 확인</h3>
            <p className="text-muted-foreground">
              {existingPatient?.name} 환자를 퇴원 처리하시겠습니까?
            </p>

            <div className="space-y-2">
              <Label htmlFor="dischargeDate">퇴원일 *</Label>
              <Input
                id="dischargeDate"
                type="date"
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDischargeConfirm(false);
                  setDischargeDate('');
                }}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button variant="destructive" onClick={handleDischarge} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : '퇴원 처리'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Readmission Confirmation Dialog */}
      {showReadmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-xl font-bold">재입원 처리 확인</h3>
            <p className="text-muted-foreground">
              {existingPatient?.name} 환자를 재입원 처리하시겠습니까?
            </p>
            <p className="text-sm text-muted-foreground">
              위 폼에서 설정한 병실번호, 입원일, 환자유형으로 재입원됩니다.
            </p>

            <div className="bg-muted/50 p-3 rounded-md space-y-1 text-sm">
              <div><span className="font-medium">병실:</span> {formData.roomBed}</div>
              <div><span className="font-medium">입원일:</span> {formData.admissionDate}</div>
              <div>
                <span className="font-medium">환자유형:</span>{' '}
                {formData.patientType === 'admitted' ? '입원환자' : '컨설트환자'}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowReadmitConfirm(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button onClick={handleReadmit} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : '재입원 처리'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
