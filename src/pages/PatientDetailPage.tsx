import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, AlertCircle, Edit, Plus, ChevronDown, Clipboard, Upload, X, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartingForm } from '@/components/charting/ChartingForm';
import { PatientForm } from '@/components/patient/PatientForm';
import { LabTable } from '@/components/lab/LabTable';
import { LabChart } from '@/components/lab/LabChart';
import { LabParseInput } from '@/components/lab/LabParseInput';
import type { ParsedLabItem } from '@/services/parser/labParser';
import { MedicationList } from '@/components/medication/MedicationList';
import { MedicationAntibioticForm, type AntibioticFormData } from '@/components/medication/MedicationAntibioticForm';
import { MedicationPasteInput } from '@/components/medication/MedicationPasteInput';
import { MedicationForm } from '@/components/medication/MedicationForm';
import { NoteTab } from '@/components/note/NoteTab';
import { ScheduleSection } from '@/components/schedule/ScheduleSection';
import type { ParsedMedication } from '@/services/parser/medParser';
import { usePatientStore } from '@/stores/usePatientStore';
import { useLabStore } from '@/stores/useLabStore';
import { useMedicationStore } from '@/stores/useMedicationStore';
import { useNoteStore } from '@/stores/useNoteStore';
import { calculateAge, calculateDetailedAge, calculateOnsetDuration, parseLocalDate, getLocalToday } from '@/utils/dateUtils';
import { cn } from '@/utils/cn';
import { db } from '@/db/database';
import { formatDate } from '@/utils/dateUtils';

const PatientDetailPage = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { patients, isLoading: patientsLoading, fetchPatients, getPatientById, updatePatient } = usePatientStore();
  const { labs, fetchLabsByPatient, addLabResult, deleteLabResult, getLabTrendData } = useLabStore();
  const { medications, fetchMedicationsByPatient, addMedication, updateMedication, deleteMedication } = useMedicationStore();
  const { notes, fetchNotesByPatient } = useNoteStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddLabDropdown, setShowAddLabDropdown] = useState(false);
  const [labInputMode, setLabInputMode] = useState<'paste' | 'file' | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<any>(null);
  const [editingCell, setEditingCell] = useState<{ date: string; itemName: string; currentValue: string | number } | null>(null);
  const [showAddAntibioticModal, setShowAddAntibioticModal] = useState(false);
  const [showPasteMedicationModal, setShowPasteMedicationModal] = useState(false);
  const [medicationCategory, setMedicationCategory] = useState<'hospital' | 'personal'>('hospital');
  const [editingMedication, setEditingMedication] = useState<any | null>(null);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [cultureModal, setCultureModal] = useState<{
    mode: 'add' | 'edit';
    resultId?: string;
    date: string;
    name: string;
    text: string;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current tab from URL, default to 'overview'
  const currentTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    // patients가 비어있으면 (초기 로드 또는 새로고침) fetchPatients 호출
    if (patients.length === 0 && !patientsLoading) {
      fetchPatients();
    }
  }, [patients.length, patientsLoading, fetchPatients]);

  useEffect(() => {
    if (patientId) {
      fetchLabsByPatient(patientId);
      fetchMedicationsByPatient(patientId);
      fetchNotesByPatient(patientId);
    }
  }, [patientId, fetchLabsByPatient, fetchMedicationsByPatient, fetchNotesByPatient]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddLabDropdown(false);
      }
    };

    if (showAddLabDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddLabDropdown]);

  const patient = patientId ? getPatientById(patientId) : undefined;

  // patients가 아직 로딩 중이면 로딩 표시 (로딩 전에 not found를 잘못 표시하는 문제 방지)
  if (!patient) {
    if (patientsLoading || patients.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">환자 정보를 불러오는 중...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-6 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">환자를 찾을 수 없습니다</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            환자 정보가 존재하지 않거나 삭제되었습니다.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            홈으로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  const age = calculateAge(patient.birthDate);
  const detailedAge = calculateDetailedAge(patient.birthDate);
  const admissionDays = Math.floor(
    (new Date().getTime() - new Date(patient.admissionDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Format birthdate as "YYYY. M. D."
  const birthDate = new Date(patient.birthDate);
  const birthDateStr = `${birthDate.getFullYear()}. ${birthDate.getMonth() + 1}. ${birthDate.getDate()}.`;

  const handleCloseEditForm = () => {
    setIsEditMode(false);
    fetchPatients(); // Refresh patient data
  };

  // Save parsed lab items — group by category and save each as a LabResult
  const handleSaveParsedLabs = async (items: ParsedLabItem[], testDate: Date) => {
    if (!patientId) return;

    // Group items by category
    const grouped = new Map<string, ParsedLabItem[]>();
    for (const item of items) {
      const cat = item.category || 'Other';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }

    // Save each category as a separate LabResult
    const source = labInputMode === 'file' ? 'xls' : 'parsed';
    for (const [category, catItems] of grouped.entries()) {
      const labItems = catItems.map((item) => ({
        code: item.code || undefined,
        name: item.name,
        value: item.value,
        unit: item.unit,
        referenceMin: item.referenceMin,
        referenceMax: item.referenceMax,
        isAbnormal: item.flag !== '',
        hlFlag: item.flag || undefined,
      }));
      await addLabResult(patientId, category, labItems, testDate, source);
    }

    setLabInputMode(null);
    await fetchLabsByPatient(patientId);
  };

  // Handle tab change - update URL query parameter
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // Handle back button click
  const handleBack = () => {
    if (currentTab !== 'overview') {
      // If not on overview tab, go to overview
      setSearchParams({ tab: 'overview' });
    } else {
      // If on overview tab, go to home (Today's Note)
      navigate('/');
    }
  };

  const handleAddAntibiotic = async (formData: AntibioticFormData) => {
    if (!patientId) return;

    try {
      const endDate = parseLocalDate(formData.endDate);
      const today = getLocalToday();

      // If endDate is in the past, set isActive to false
      const isActive = endDate >= today;

      await addMedication({
        patientId,
        category: 'antibiotic',
        drugName: formData.drugName,
        drugBaseName: formData.drugName, // For antibiotics, use same as drugName
        singleDose: 0, // Not used for antibiotics
        schedule: '', // Not used for antibiotics
        dosage: formData.dosage,
        frequency: formData.frequency,
        startDate: parseLocalDate(formData.startDate),
        endDate: endDate,
        isAntibiotic: true,
        isActive: isActive,
      });

      setShowAddAntibioticModal(false);

      // Refresh medications
      fetchMedicationsByPatient(patientId);
    } catch (error) {
      console.error('Failed to add antibiotic:', error);
      alert('항생제 추가에 실패했습니다.');
    }
  };

  const handlePasteMedications = async (parsedMeds: ParsedMedication[]) => {
    if (!patientId) return;

    try {
      const now = new Date();

      // 모든 약물 일괄 추가
      for (const med of parsedMeds) {
        await addMedication({
          patientId,
          category: medicationCategory,
          drugName: med.drugName,
          drugBaseName: med.drugBaseName,
          singleDose: med.singleDose,
          schedule: med.schedule,
          timing: med.timing,
          daysRemaining: med.daysRemaining,
          startDate: now, // 현재 시작
          isAntibiotic: false,
          isActive: true,
        });
      }

      setShowPasteMedicationModal(false);

      // Refresh medications
      fetchMedicationsByPatient(patientId);
    } catch (error) {
      console.error('Failed to add medications:', error);
      alert('약물 추가에 실패했습니다.');
    }
  };

  const handleEditMedication = async (medication: any) => {
    setEditingMedication(medication);
  };

  const handleSaveMedication = async (medication: any) => {
    try {
      await updateMedication(medication.id, medication);
      setEditingMedication(null);
      if (patientId) {
        await fetchMedicationsByPatient(patientId);
      }
    } catch (error) {
      console.error('Failed to update medication:', error);
      alert('투약 정보 수정에 실패했습니다.');
    }
  };

  const handleDeleteMedication = async (medicationId: string) => {
    if (!window.confirm('이 약물을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteMedication(medicationId);
      if (patientId) {
        fetchMedicationsByPatient(patientId);
      }
    } catch (error) {
      console.error('Failed to delete medication:', error);
      alert('약물 삭제에 실패했습니다.');
    }
  };

  const handleDeleteAllMedications = async (category: 'antibiotic' | 'hospital' | 'personal') => {
    const categoryLabels = {
      antibiotic: '항생제',
      hospital: '처방약',
      personal: '지참약',
    };

    const categoryLabel = categoryLabels[category];
    const confirmMessage = `모든 ${categoryLabel}를 삭제하시겠습니까?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // 해당 카테고리의 모든 활성 약물 삭제
      const medsToDelete = medications.filter(
        (med) => med.category === category && med.isActive
      );

      for (const med of medsToDelete) {
        await deleteMedication(med.id);
      }

      if (patientId) {
        fetchMedicationsByPatient(patientId);
      }
    } catch (error) {
      console.error('Failed to delete all medications:', error);
      alert(`${categoryLabel} 전체 삭제에 실패했습니다.`);
    }
  };

  const handleAddTag = async () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) return;

    // # 자동 추가
    const formattedTag = trimmedTag.startsWith('#') ? trimmedTag : `#${trimmedTag}`;

    // 중복 체크
    const currentTags = patient.tags || [];
    if (currentTags.includes(formattedTag)) {
      alert('이미 존재하는 태그입니다.');
      return;
    }

    try {
      await updatePatient(patient.id, {
        tags: [...currentTags, formattedTag],
      });
      setTagInput('');
      fetchPatients(); // Refresh
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('태그 추가에 실패했습니다.');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const currentTags = patient.tags || [];
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);

    try {
      await updatePatient(patient.id, {
        tags: updatedTags,
      });
      fetchPatients(); // Refresh
    } catch (error) {
      console.error('Failed to remove tag:', error);
      alert('태그 삭제에 실패했습니다.');
    }
  };

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const handleAddCulture = () => {
    setCultureModal({ mode: 'add', date: todayStr, name: '', text: '' });
  };

  const handleEditCulture = (resultId: string, date: string, name: string, value: string) => {
    setCultureModal({ mode: 'edit', resultId, date, name, text: value });
  };

  const handleDeleteCulture = async (resultId: string) => {
    if (!window.confirm('이 Culture 결과를 삭제하시겠습니까?')) return;
    try {
      await deleteLabResult(resultId);
      if (patientId) await fetchLabsByPatient(patientId);
    } catch (error) {
      console.error('Failed to delete culture result:', error);
      alert('Culture 결과 삭제에 실패했습니다.');
    }
  };

  // 날짜별 Lab 전체 삭제
  const handleDeleteDate = async (dateStr: string) => {
    if (!patientId) return;
    if (!window.confirm(`${dateStr} 날짜의 모든 Lab 결과를 삭제하시겠습니까?`)) return;
    try {
      const patientLabs = await db.labResults
        .where('patientId')
        .equals(patientId)
        .toArray();
      const toDelete = patientLabs.filter((lab) => {
        const labDate = formatDate(lab.testDate);
        return labDate === dateStr;
      });
      await db.labResults.bulkDelete(toDelete.map((l) => l.id));
      await fetchLabsByPatient(patientId);
    } catch (error) {
      console.error('Failed to delete date labs:', error);
      alert('Lab 결과 삭제에 실패했습니다.');
    }
  };

  // 새 날짜 추가 (빈 Lab 레코드 생성)
  const handleAddDate = async (dateStr: string) => {
    if (!patientId) return;
    try {
      const testDate = parseLocalDate(dateStr);
      // 빈 Lab 레코드를 하나 생성 (수동 입력의 시작점)
      await addLabResult(patientId, 'Manual', [{
        name: '-',
        value: '',
        unit: '',
        isAbnormal: false,
      }], testDate, 'manual');
      await fetchLabsByPatient(patientId);
    } catch (error) {
      console.error('Failed to add date:', error);
      alert('날짜 추가에 실패했습니다.');
    }
  };

  const handleSaveCulture = async () => {
    if (!cultureModal || !patientId) return;
    const { mode, resultId, date, name, text } = cultureModal;
    if (!name.trim() || !text.trim()) {
      alert('검체명과 결과를 입력해주세요.');
      return;
    }

    try {
      const [year, month, day] = date.split('-').map(Number);
      const testDate = new Date(year!, month! - 1, day!);

      if (mode === 'add') {
        await addLabResult(
          patientId,
          'Culture',
          [{ name: name.trim(), value: text.trim(), unit: '', isAbnormal: false }],
          testDate,
          'manual'
        );
      } else if (mode === 'edit' && resultId) {
        // Find the existing record, update its item and date
        const existing = labs.find((l) => l.id === resultId);
        if (existing) {
          await deleteLabResult(resultId);
          const updatedItems = existing.items.map((item) =>
            item.name === name ? { ...item, value: text.trim() } : item
          );
          await addLabResult(patientId, 'Culture', updatedItems, testDate, existing.source);
        }
      }

      setCultureModal(null);
      await fetchLabsByPatient(patientId);
    } catch (error) {
      console.error('Failed to save culture result:', error);
      alert('Culture 결과 저장에 실패했습니다.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={handleBack}
              aria-label="뒤로 가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              {/* Name and badges - wrap on mobile */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">{patient.name}</h1>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {patient.roomBed}
                </Badge>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {patient.sex}/{age}
                </Badge>
                {patient.status === 'discharged' && (
                  <Badge variant="destructive" className="text-xs flex-shrink-0">
                    퇴원
                  </Badge>
                )}
              </div>

              {/* Patient info - stack on mobile */}
              <div className="mt-1.5 space-y-0.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="whitespace-nowrap">생년월일: {birthDateStr}</span>
                  <span className="text-xs whitespace-nowrap">({detailedAge})</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="whitespace-nowrap">
                    입원일: {new Date(patient.admissionDate).toLocaleDateString('ko-KR')}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">D+{admissionDays}</span>
                  {patient.dischargeDate && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="whitespace-nowrap">
                        퇴원일: {new Date(patient.dischargeDate).toLocaleDateString('ko-KR')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Edit Button - icon only on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setIsEditMode(true)}
          >
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">정보 수정</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="flex h-full flex-col">
          <div className="border-b px-4">
            <TabsList className="h-12 w-full justify-start rounded-none border-0 bg-transparent p-0 overflow-x-auto scrollbar-hide">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                개요
              </TabsTrigger>
              <TabsTrigger
                value="charting"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                차트
              </TabsTrigger>
              <TabsTrigger
                value="lab"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Lab 결과
              </TabsTrigger>
              <TabsTrigger
                value="medication"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                투약
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                메모
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 h-full">
              <div className="space-y-4">
                {/* Today's Alerts */}
                {(() => {
                  const today = getLocalToday();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);

                  // 날짜 객체 → 로컬 YYYY-MM-DD 문자열 (timezone 안전)
                  const toLocalStr = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };

                  const todayStr = toLocalStr(today);
                  const yesterdayStr = toLocalStr(yesterday);

                  // 오늘 알림 메모
                  const todayReminders = notes.filter((n) => {
                    if (n.type !== 'reminder' || !n.alertDate) return false;
                    const d = n.alertDate instanceof Date ? n.alertDate : new Date(n.alertDate);
                    return toLocalStr(d) === todayStr;
                  });

                  // 오늘/어제 Lab 날짜 목록 (중복 제거)
                  const recentLabDates = Array.from(
                    new Set(
                      labs
                        .map((l) => {
                          const d = l.testDate instanceof Date ? l.testDate : new Date(l.testDate);
                          return toLocalStr(d);
                        })
                        .filter((s) => s === todayStr || s === yesterdayStr)
                    )
                  ).sort();

                  if (todayReminders.length === 0 && recentLabDates.length === 0) return null;

                  return (
                    <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500 p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">알림</span>
                      </div>
                      {recentLabDates.map((dateStr) => (
                        <div key={dateStr} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                          <span className="mt-0.5 text-amber-500">•</span>
                          <span>
                            {dateStr === todayStr ? '오늘' : '어제'} ({dateStr}) Lab 결과가 있습니다.
                          </span>
                        </div>
                      ))}
                      {todayReminders.map((reminder) => (
                        <div key={reminder.id} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                          <span className="mt-0.5 text-amber-500">•</span>
                          <span>{reminder.content}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Chief Complaint & Onset Card */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Chief Complaint</h3>
                  {patient.chiefComplaint || patient.onset ? (
                    <div className="space-y-2">
                      {patient.chiefComplaint && (
                        <p className="text-sm">
                          <span className="font-medium">C/C:</span> {patient.chiefComplaint}
                        </p>
                      )}
                      {patient.onset && (
                        <div className="text-sm">
                          <span className="font-medium">Onset:</span> {patient.onset}
                          {!patient.onset.includes('(') && (() => {
                            const duration = calculateOnsetDuration(patient.onset);
                            if (duration) {
                              return (
                                <span className="ml-1 text-muted-foreground">
                                  ({duration})
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chief Complaint가 입력되지 않았습니다. 차트 탭에서 입력해주세요.
                    </p>
                  )}
                </Card>

                {/* Patient Tags Card - C/C 바로 아래에 추가 */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Tags</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTagEditor(!showTagEditor)}
                    >
                      {showTagEditor ? '완료' : '편집'}
                    </Button>
                  </div>

                  {/* Tag 표시 */}
                  {patient.tags && patient.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          className="text-sm px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 font-medium"
                        >
                          {tag}
                          {showTagEditor && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1.5 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      태그가 없습니다. 편집 버튼을 눌러 추가해주세요.
                    </p>
                  )}

                  {/* Tag 입력 (편집 모드일 때만) */}
                  {showTagEditor && (
                    <div className="flex gap-2 mt-4">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="태그 입력 (예: Hypernatremia, Recurrent pneumonia)"
                      />
                      <Button type="button" size="sm" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </Card>


                {/* Attention Toggle */}
                <Card className={cn(
                  'p-4 flex items-center justify-between',
                  patient.attention && 'border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-950/20'
                )}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn('h-5 w-5', patient.attention ? 'text-red-500' : 'text-muted-foreground/40')} />
                    <div>
                      <span className="text-sm font-medium">Attention</span>
                      <p className="text-xs text-muted-foreground">주의가 필요한 환자로 표시합니다</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updatePatient(patient.id, { attention: !patient.attention })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      patient.attention ? 'bg-red-500' : 'bg-muted-foreground/20'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                        patient.attention ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </Card>

                {/* Current Antibiotics */}
                {(() => {
                  const currentAntibiotics = medications
                    .filter((med) => med.category === 'antibiotic' && med.isActive)
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                  if (currentAntibiotics.length === 0) return null;

                  const calculateDDay = (startDate: Date): number => {
                    const today = getLocalToday();
                    const diff = today.getTime() - startDate.getTime();
                    return Math.floor(diff / (1000 * 60 * 60 * 24));
                  };

                  const getDaysUntilEnd = (endDate: Date): number => {
                    const today = getLocalToday();
                    const diff = endDate.getTime() - today.getTime();
                    return Math.floor(diff / (1000 * 60 * 60 * 24));
                  };

                  return (
                    <Card className="p-6">
                      <h3 className="mb-4 text-lg font-semibold">현재 항생제</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: '60px' }} />
                            <col style={{ width: '50px' }} />
                            <col style={{ width: 'auto' }} />
                          </colgroup>
                          <thead className="border-b bg-muted/30">
                            <tr>
                              <th className="text-left p-3 font-semibold">약물명</th>
                              <th className="text-left p-3 font-semibold whitespace-nowrap">용량</th>
                              <th className="text-left p-3 font-semibold whitespace-nowrap">용법</th>
                              <th className="text-left p-3 font-semibold">투약기간</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {currentAntibiotics.map((med) => {
                              const startDate = new Date(med.startDate);
                              const endDate = med.endDate ? new Date(med.endDate) : null;
                              const dDay = calculateDDay(startDate);
                              const daysUntilEnd = endDate ? getDaysUntilEnd(endDate) : null;

                              const formatDate = (date: Date) => {
                                return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                              };

                              // 경고 조건: D+14 이상, 또는 종료 1일전 또는 종료일
                              const isLongTerm = dDay >= 14;
                              const isEndingSoon = daysUntilEnd !== null && daysUntilEnd <= 1;
                              const shouldHighlight = isLongTerm || isEndingSoon;

                              return (
                                <tr key={med.id} className={cn("hover:bg-muted/20 transition-colors", shouldHighlight && "bg-destructive/5")}>
                                  <td className="p-3">
                                    <span className="font-medium">{med.drugName}</span>
                                  </td>
                                  <td className="p-3 text-muted-foreground">{med.dosage || '-'}</td>
                                  <td className="p-3 text-muted-foreground">{med.frequency || '-'}</td>
                                  <td className="p-3">
                                    {endDate && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs">
                                          {formatDate(startDate)} ~ {formatDate(endDate)}
                                        </span>
                                        <span className={cn(
                                          "font-mono text-xs font-semibold",
                                          isLongTerm ? "text-destructive" : "text-primary"
                                        )}>
                                          (D+{dDay})
                                        </span>
                                        {isLongTerm && (
                                          <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                                        )}
                                        {isEndingSoon && daysUntilEnd !== null && (
                                          <Badge variant="destructive" className="text-xs">
                                            {daysUntilEnd === 0 ? '오늘 종료' : '내일 종료'}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  );
                })()}

                {/* Schedule Section */}
                <ScheduleSection patientId={patient.id} />
              </div>
            </TabsContent>

            {/* Lab Tab */}
            <TabsContent value="lab" className="mt-0 h-full">
              <div className="space-y-4">
                {/* Add Lab Dropdown Button */}
                <div className="flex justify-end">
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      onClick={() => setShowAddLabDropdown(!showAddLabDropdown)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Lab 결과 추가
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    {showAddLabDropdown && (
                      <div className="absolute right-0 mt-2 w-56 rounded-md border bg-background shadow-lg z-50">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setLabInputMode('paste');
                              setShowAddLabDropdown(false);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                          >
                            <Clipboard className="h-4 w-4 text-muted-foreground" />
                            <div className="text-left">
                              <div className="font-medium">스프레드시트 붙여넣기</div>
                              <div className="text-xs text-muted-foreground">
                                OCS에서 복사한 데이터
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setLabInputMode('file');
                              setShowAddLabDropdown(false);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                          >
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <div className="text-left">
                              <div className="font-medium">엑셀 파일 업로드</div>
                              <div className="text-xs text-muted-foreground">
                                병원 검사실 결과 파일
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lab Table */}
                <LabTable
                  results={labs}
                  onItemClick={async (itemCode, itemName) => {
                    if (!patientId) return;
                    const trend = await getLabTrendData(patientId, itemCode, itemName);
                    if (trend) {
                      setSelectedTrend(trend);
                    } else {
                      alert(`"${itemName}" 항목의 추이 데이터가 없습니다.`);
                    }
                  }}
                  onCellClick={(date, itemName, currentValue) => {
                    setEditingCell({ date, itemName, currentValue });
                  }}
                  onAddCulture={handleAddCulture}
                  onEditCulture={handleEditCulture}
                  onDeleteCulture={handleDeleteCulture}
                  onDeleteDate={handleDeleteDate}
                  onAddDate={handleAddDate}
                />

                {/* Lab Trend Chart Modal */}
                {selectedTrend && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[85vh] overflow-y-auto">
                      <div className="p-6">
                        <LabChart trendData={selectedTrend} />
                        <div className="mt-4 flex justify-end">
                          <Button onClick={() => setSelectedTrend(null)}>닫기</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cell Edit Modal */}
                {editingCell && patientId && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg max-w-md w-full">
                      <div className="p-6">
                        <h3 className="mb-4 text-lg font-semibold">Lab 값 수정</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">항목: <span className="font-medium text-foreground">{editingCell.itemName}</span></p>
                            <p className="text-sm text-muted-foreground">날짜: <span className="font-medium text-foreground">{editingCell.date}</span></p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">결과값</label>
                            <Input
                              type="text"
                              defaultValue={editingCell.currentValue}
                              className="mt-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  // TODO: Save the value
                                  setEditingCell(null);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              Enter 저장 / Esc 취소
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditingCell(null)}>
                            취소
                          </Button>
                          <Button onClick={() => {
                            // TODO: Save the value
                            setEditingCell(null);
                          }}>
                            저장
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lab Input Modals */}
                {(labInputMode === 'paste' || labInputMode === 'file') && patientId && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          {labInputMode === 'paste' ? (
                            <><Clipboard className="h-5 w-5" />OCS 붙여넣기 파싱</>
                          ) : (
                            <><Upload className="h-5 w-5" />XLS 파일 업로드</>
                          )}
                        </h2>
                        <LabParseInput
                          mode={labInputMode}
                          patientId={patientId}
                          registrationNumber={patient?.registrationNumber}
                          onSave={handleSaveParsedLabs}
                          onClose={() => setLabInputMode(null)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Medication Tab */}
            <TabsContent value="medication" className="mt-0 h-full">
              <MedicationList
                medications={medications}
                onAddAntibiotic={() => setShowAddAntibioticModal(true)}
                onPasteHospital={() => {
                  setMedicationCategory('hospital');
                  setShowPasteMedicationModal(true);
                }}
                onPastePersonal={() => {
                  setMedicationCategory('personal');
                  setShowPasteMedicationModal(true);
                }}
                onEdit={handleEditMedication}
                onDelete={handleDeleteMedication}
                onDeleteAll={handleDeleteAllMedications}
              />
            </TabsContent>

            {/* Charting Tab */}
            <TabsContent value="charting" className="mt-0 h-full">
              <Card className="p-6">
                <ChartingForm
                  patientId={patient.id}
                  initialData={{
                    chiefComplaint: patient.chiefComplaint,
                    onset: patient.onset,
                    presentIllness: patient.presentIllness,
                    pastHistory: patient.pastHistory,
                    reviewOfSystem: patient.reviewOfSystem,
                    physicalExam: patient.physicalExam,
                    problemList: typeof patient.problemList === 'string'
                      ? []
                      : (patient.problemList || []),
                    problemListText: typeof patient.problemList === 'string'
                      ? patient.problemList
                      : undefined,
                    plan: patient.plan,
                    etc: patient.etc,
                  }}
                  onSave={async (data) => {
                    try {
                      await updatePatient(patient.id, {
                        chiefComplaint: data.chiefComplaint,
                        onset: data.onset,
                        presentIllness: data.presentIllness,
                        pastHistory: data.pastHistory,
                        reviewOfSystem: data.reviewOfSystem,
                        physicalExam: data.physicalExam,
                        problemList: data.problemList,
                        plan: data.plan,
                        guardianExplanation: data.guardianExplanation,
                        etc: data.etc,
                      });
                    } catch (error) {
                      console.error('Failed to save charting data:', error);
                    }
                  }}
                />
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0 h-full">
              {patientId && <NoteTab patientId={patientId} />}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Culture Add/Edit Modal */}
      {cultureModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-lg w-full">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">
                {cultureModal.mode === 'add' ? 'Culture 결과 추가' : 'Culture 결과 수정'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">검사일</label>
                  <input
                    type="date"
                    value={cultureModal.date}
                    onChange={(e) => setCultureModal({ ...cultureModal, date: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">검체명 (예: Blood, Urine, Sputum)</label>
                  <input
                    type="text"
                    value={cultureModal.name}
                    onChange={(e) => setCultureModal({ ...cultureModal, name: e.target.value })}
                    placeholder="예: Blood culture, Urine culture"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    readOnly={cultureModal.mode === 'edit'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">결과 내용</label>
                  <textarea
                    value={cultureModal.text}
                    onChange={(e) => setCultureModal({ ...cultureModal, text: e.target.value })}
                    placeholder="균 동정 결과 및 항생제 감수성 결과를 입력하세요"
                    rows={8}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCultureModal(null)}>취소</Button>
                <Button onClick={handleSaveCulture}>저장</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <PatientForm patientId={patientId} onClose={handleCloseEditForm} />
            </div>
          </div>
        </div>
      )}

      {/* Add Antibiotic Modal */}
      {showAddAntibioticModal && patientId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">항생제 추가</h2>
              <MedicationAntibioticForm
                patientId={patientId}
                onSave={handleAddAntibiotic}
                onCancel={() => setShowAddAntibioticModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Paste Medication Modal */}
      {showPasteMedicationModal && patientId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {medicationCategory === 'hospital' ? '처방약' : '지참약'} 붙여넣기
              </h2>
              <MedicationPasteInput
                category={medicationCategory}
                onSave={handlePasteMedications}
                onCancel={() => setShowPasteMedicationModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {editingMedication && (
        <MedicationForm
          medication={editingMedication}
          open={!!editingMedication}
          onOpenChange={(open) => !open && setEditingMedication(null)}
          onSave={handleSaveMedication}
        />
      )}
    </div>
  );
};

export default PatientDetailPage;
