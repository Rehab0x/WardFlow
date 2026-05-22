import { Bell, CalendarDays, FlaskConical, Pill, ClipboardList } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClinicalRow, DataSection, MetricTile, PatientRail, TopBar } from '@/components/v2';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePatientStore } from '@/stores/usePatientStore';
import { fetchBriefingData, type BriefingData } from '@/services/briefingService';

export default function V2PreviewPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const [data, setData] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const result = await fetchBriefingData(currentUser.id, currentUser.role);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const reminderCount = data?.reminders.length ?? 0;
  const antibioticCount = data?.antibiotics.length ?? 0;
  const abnormalLabCount = data?.recentLabs.filter((lab) => lab.abnormalCount > 0).length ?? 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-900">
      <TopBar
        userName={currentUser?.name}
        onAddPatient={() => navigate('/')}
        onSettings={() => navigate('/settings')}
        onLogout={logout}
      />
      <div className="flex min-h-0 flex-1">
        <PatientRail
          patients={patients}
          onPatientSelect={(patientId) => navigate(`/patients/${patientId}`)}
          onAddPatient={() => navigate('/')}
        />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h1 className="text-[22px] font-medium leading-tight tracking-tight">오늘</h1>
              <p className="mt-0.5 text-[12px] text-zinc-400">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
            {isLoading && <span className="text-[12px] text-zinc-400">불러오는 중</span>}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
            <MetricTile label="입원" value={data?.patientSummary.admitted ?? 0} />
            <MetricTile label="협진" value={data?.patientSummary.consult ?? 0} />
            <MetricTile label="알림" value={reminderCount} tone={reminderCount > 0 ? 'warning' : 'default'} />
            <MetricTile label="항생제" value={antibioticCount} tone={antibioticCount > 0 ? 'warning' : 'default'} />
            <MetricTile label="비정상 Lab" value={abnormalLabCount} tone={abnormalLabCount > 0 ? 'danger' : 'default'} />
          </div>

          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            <DataSection icon={Bell} title="알림" count={data?.reminders.length ?? 0}>
              {(data?.reminders.length ?? 0) === 0 ? (
                <ClinicalRow prefix="-" title="0" detail="오늘 알림 없음" />
              ) : (
                data?.reminders.map((item) => (
                  <ClinicalRow
                    key={item.noteId}
                    prefix={item.roomBed}
                    title={item.patientName}
                    detail={item.content}
                    onClick={() => navigate(`/patients/${item.patientId}?tab=notes`)}
                  />
                ))
              )}
            </DataSection>

            <DataSection icon={Pill} title="항생제" count={data?.antibiotics.length ?? 0}>
              {(data?.antibiotics.length ?? 0) === 0 ? (
                <ClinicalRow prefix="-" title="0" detail="활성 항생제 없음" />
              ) : (
                data?.antibiotics.map((item) => (
                  <ClinicalRow
                    key={item.medicationId}
                    prefix={item.roomBed}
                    title={item.patientName}
                    detail={item.drugName}
                    pill={`D${item.dDay + 1}`}
                    tone={item.isLongTerm ? 'danger' : 'warning'}
                    onClick={() => navigate(`/patients/${item.patientId}?tab=medication`)}
                  />
                ))
              )}
            </DataSection>

            <DataSection icon={FlaskConical} title="최근 Lab" count={data?.recentLabs.length ?? 0}>
              {(data?.recentLabs.length ?? 0) === 0 ? (
                <ClinicalRow prefix="-" title="0" detail="최근 Lab 없음" />
              ) : (
                data?.recentLabs.map((item) => (
                  <ClinicalRow
                    key={`${item.patientId}-${item.dateKey}`}
                    prefix={item.roomBed}
                    title={item.patientName}
                    detail={item.abnormalCount > 0 ? item.abnormalItems.join(', ') : '정상'}
                    meta={item.dateKey.slice(5)}
                    tone={item.abnormalCount > 0 ? 'danger' : 'muted'}
                    pill={String(item.totalItems)}
                    onClick={() => navigate(`/patients/${item.patientId}?tab=lab`)}
                  />
                ))
              )}
            </DataSection>

            <DataSection icon={CalendarDays} title="일정" count={data?.todaySchedules.length ?? 0}>
              {(data?.todaySchedules.length ?? 0) === 0 ? (
                <ClinicalRow prefix="-" title="0" detail="오늘 일정 없음" />
              ) : (
                data?.todaySchedules.map((item) => (
                  <ClinicalRow
                    key={item.scheduleId}
                    prefix={item.scheduledTime || '-'}
                    title={item.patientName}
                    detail={item.title}
                    meta={item.roomBed}
                    pill={item.category}
                    onClick={() => navigate(`/patients/${item.patientId}`)}
                  />
                ))
              )}
            </DataSection>
          </div>

          {(data?.progressNotes.length ?? 0) > 0 && (
            <div className="mt-2">
              <DataSection icon={ClipboardList} title="오늘 메모" count={data?.progressNotes.length ?? 0}>
                {data?.progressNotes.map((item) => (
                  <ClinicalRow
                    key={item.noteId}
                    prefix={item.roomBed}
                    title={item.patientName}
                    detail={item.content}
                    onClick={() => navigate(`/patients/${item.patientId}?tab=notes`)}
                  />
                ))}
              </DataSection>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

