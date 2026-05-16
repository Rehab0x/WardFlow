import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Pill as PillIcon,
  FlaskConical,
  CalendarDays,
  ClipboardList,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { fetchBriefingData, type BriefingData } from '@/services/briefingService';
import { formatDate } from '@/utils/dateUtils';
import { useScheduleCategoryStore } from '@/stores/useScheduleCategoryStore';
import { db } from '@/db/database';
import type { Note } from '@/db/database';
import { usePatientStore } from '@/stores/usePatientStore';
import { useGlobalAlertStore } from '@/stores/useGlobalAlertStore';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  SectionCard,
  Row,
  Room,
  Time,
  Body,
  Pill,
  Metric,
} from '@/components/dashboard/SectionCard';
import { cn } from '@/lib/utils';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { getLabel: getScheduleLabel } = useScheduleCategoryStore();
  const { patients } = usePatientStore();
  const [data, setData] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 범용 알림
  const globalAlertStore = useGlobalAlertStore();
  const { getActiveAlerts, addAlert, updateAlert, deleteAlert } = globalAlertStore;
  const allGlobalAlerts = globalAlertStore.alerts;
  const activeGlobalAlerts = getActiveAlerts();
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertFormData, setAlertFormData] = useState({
    content: '',
    startDate: '',
    endDate: '',
  });
  const [showAlertManager, setShowAlertManager] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);

  // 메모 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 시간 (1분마다 갱신)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // 환자 ID → 환자 정보 매핑
  const patientMap = useMemo(() => {
    const map = new Map<string, { name: string; roomBed: string }>();
    for (const p of patients) {
      map.set(p.id, { name: p.name, roomBed: p.roomBed });
    }
    return map;
  }, [patients]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setAllNotes([]);
      return;
    }
    let cancelled = false;
    const loadNotes = async () => {
      setIsSearching(true);
      try {
        const notes = await db.notes.orderBy('createdAt').reverse().toArray();
        if (!cancelled) setAllNotes(notes);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };
    loadNotes();
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allNotes
      .filter((note) => {
        const patient = patientMap.get(note.patientId);
        return (
          note.content.toLowerCase().includes(q) ||
          patient?.name.toLowerCase().includes(q) ||
          patient?.roomBed.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [searchQuery, allNotes, patientMap]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const result = await fetchBriefingData(currentUser.id, currentUser.role);
      setData(result);
    } catch (err) {
      console.error('Failed to load briefing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayStr = formatDate(now);
  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const timeStr = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const goToPatient = (patientId: string, tab?: string) => {
    const query = tab ? `?tab=${tab}` : '';
    navigate(`/patients/${patientId}${query}`);
  };

  // Antibiotic D-day → Pill tone
  const abxTone = (dDay: number, isLongTerm: boolean): 'muted' | 'warning' | 'danger' => {
    if (isLongTerm) return 'danger';
    const days = dDay + 1;
    if (days >= 10) return 'danger';
    if (days >= 6) return 'warning';
    return 'muted';
  };

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="mb-5">
          <h1 className="text-[22px] font-medium leading-tight tracking-tight text-zinc-900">
            Today
          </h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">{dateStr}</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
        </div>
      </div>
    );
  }

  const reminderTotal = data.reminders.length + activeGlobalAlerts.length;
  const alertTone: 'default' | 'warning' = reminderTotal > 0 ? 'warning' : 'default';
  const abxTotal = data.antibiotics.length;
  const abxStatTone: 'default' | 'warning' | 'danger' = data.antibiotics.some(
    (a) => a.isLongTerm,
  )
    ? 'danger'
    : abxTotal > 0
      ? 'warning'
      : 'default';

  // 항생제 환자별 그룹핑 (같은 환자 여러 약물)
  const abxRows: Array<{
    medicationId: string;
    patientId: string;
    patientName: string;
    roomBed: string;
    drugName: string;
    dDay: number;
    isLongTerm: boolean;
  }> = data.antibiotics.map((a) => ({
    medicationId: a.medicationId,
    patientId: a.patientId,
    patientName: a.patientName,
    roomBed: a.roomBed,
    drugName: a.drugName,
    dDay: a.dDay,
    isLongTerm: a.isLongTerm,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      {/* Page header */}
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-[22px] font-medium leading-tight tracking-tight text-zinc-900">
            Today
          </h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">
            {dateStr}
            {currentUser?.name && <> · {currentUser.name}</>}
          </p>
        </div>
        <div className="font-mono text-[11px] text-zinc-400 tabular-nums">{timeStr}</div>
      </div>

      {/* Stats */}
      <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="입원" value={data.patientSummary.admitted} />
        <StatCard label="컨설트" value={data.patientSummary.consult} />
        <StatCard label="항생제" value={abxTotal} tone={abxStatTone} />
        <StatCard label="알림" value={reminderTotal} tone={alertTone} />
      </div>

      {/* Sections 2x2 */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {/* 알림 */}
        <SectionCard icon={Bell} title="알림" count={reminderTotal}>
          {reminderTotal === 0 ? (
            <Row>
              <Body>
                <span className="text-zinc-400">없음</span>
              </Body>
            </Row>
          ) : (
            <>
              {activeGlobalAlerts.map((ga) => (
                <Row key={`ga-${ga.id}`}>
                  <Room>전체</Room>
                  <Body>{ga.content}</Body>
                  {ga.endDate && <Pill tone="muted">~{ga.endDate.slice(5)}</Pill>}
                </Row>
              ))}
              {data.reminders.map((r) => (
                <Row key={r.noteId} onClick={() => goToPatient(r.patientId, 'notes')}>
                  <Room>{r.roomBed}</Room>
                  <Body>
                    <span className="text-zinc-900">{r.patientName}</span>
                    <span className="ml-1.5 text-zinc-500">{r.content}</span>
                  </Body>
                </Row>
              ))}
            </>
          )}
          <div className="mt-2 flex items-center gap-1 border-t border-zinc-100 pt-1.5">
            <button
              type="button"
              onClick={() => {
                setEditingAlertId(null);
                setAlertFormData({ content: '', startDate: '', endDate: '' });
                setShowAlertForm(true);
              }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Plus className="h-3 w-3" />
              알림 추가
            </button>
            {allGlobalAlerts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAlertManager(true)}
                className="ml-auto inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                관리 ({allGlobalAlerts.length})
              </button>
            )}
          </div>
        </SectionCard>

        {/* 항생제 */}
        <SectionCard icon={PillIcon} title="항생제" count={abxTotal}>
          {abxRows.length === 0 ? (
            <Row>
              <Body>
                <span className="text-zinc-400">없음</span>
              </Body>
            </Row>
          ) : (
            abxRows.map((a) => (
              <Row
                key={a.medicationId}
                onClick={() => goToPatient(a.patientId, 'medication')}
              >
                <Room>{a.roomBed}</Room>
                <Body>
                  <span className="text-zinc-900">{a.patientName}</span>
                  <span className="ml-1.5 text-zinc-500">{a.drugName}</span>
                </Body>
                <Pill tone={abxTone(a.dDay, a.isLongTerm)}>D{a.dDay + 1}</Pill>
              </Row>
            ))
          )}
        </SectionCard>

        {/* 최근 Lab */}
        <SectionCard icon={FlaskConical} title="최근 Lab" count={data.recentLabs.length}>
          {data.recentLabs.length === 0 ? (
            <Row>
              <Body>
                <span className="text-zinc-400">없음</span>
              </Body>
            </Row>
          ) : (
            data.recentLabs.map((lab) => {
              const tone: 'danger' | 'default' = lab.abnormalCount > 0 ? 'danger' : 'default';
              const summary =
                lab.abnormalCount > 0
                  ? lab.abnormalItems.slice(0, 2).join(', ') +
                    (lab.abnormalCount > 2 ? ` +${lab.abnormalCount - 2}` : '')
                  : '정상';
              return (
                <Row
                  key={`${lab.patientId}-${lab.dateKey}`}
                  onClick={() => goToPatient(lab.patientId, 'lab')}
                >
                  <Room>{lab.roomBed}</Room>
                  <Body>
                    <span className="text-zinc-900">{lab.patientName}</span>
                    <span className="ml-1.5">
                      <Metric tone={tone} value={summary} />
                    </span>
                    <span className="ml-1.5 font-mono text-[10.5px] text-zinc-400">
                      {lab.dateKey === todayStr ? '오늘' : lab.dateKey.slice(5)}
                    </span>
                  </Body>
                </Row>
              );
            })
          )}
        </SectionCard>

        {/* 일정 */}
        <SectionCard
          icon={CalendarDays}
          title="일정"
          count={data.todaySchedules.length}
        >
          {data.todaySchedules.length === 0 ? (
            <Row>
              <Body>
                <span className="text-zinc-400">없음</span>
              </Body>
            </Row>
          ) : (
            data.todaySchedules.map((s) => (
              <Row
                key={s.scheduleId}
                onClick={() => navigate(`/patients/${s.patientId}?tab=overview`)}
              >
                <Time>{s.scheduledTime || '—'}</Time>
                <Body>
                  <span
                    className={cn(
                      'text-zinc-900',
                      s.isCompleted && 'text-zinc-400 line-through',
                    )}
                  >
                    {s.patientName}
                  </span>
                  <span
                    className={cn(
                      'ml-1.5 text-zinc-500',
                      s.isCompleted && 'line-through',
                    )}
                  >
                    {s.title}
                  </span>
                  <span className="ml-1.5 font-mono text-[10.5px] text-zinc-400">
                    {s.roomBed}
                  </span>
                </Body>
                <Pill tone="muted">{getScheduleLabel(s.category)}</Pill>
              </Row>
            ))
          )}
        </SectionCard>
      </div>

      {/* 오늘의 회진 (data.progressNotes 있을 때만) */}
      {data.progressNotes.length > 0 && (
        <div className="mt-2">
          <SectionCard
            icon={ClipboardList}
            title="오늘의 회진"
            count={data.progressNotes.length}
          >
            {data.progressNotes.map((p) => (
              <Row key={p.noteId} onClick={() => goToPatient(p.patientId, 'notes')}>
                <Room>{p.roomBed}</Room>
                <Body>
                  <span className="text-zinc-900">{p.patientName}</span>
                  <span className="ml-1.5 text-zinc-500">{p.content}</span>
                </Body>
              </Row>
            ))}
          </SectionCard>
        </div>
      )}

      {/* Memo search */}
      <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="환자명, 병실번호 또는 메모 내용으로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-zinc-400 hover:text-zinc-700"
              aria-label="검색 지우기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isSearching && (
          <div className="mt-2 flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          </div>
        )}
        {searchQuery.trim() && !isSearching && (
          <div className="mt-2 space-y-px border-t border-zinc-100 pt-2">
            {searchResults.length === 0 ? (
              <p className="py-1 text-[12px] text-zinc-400">검색 결과가 없습니다.</p>
            ) : (
              <>
                <p className="px-0.5 pb-1 font-mono text-[10.5px] text-zinc-400">
                  {searchResults.length}개 결과
                  {searchResults.length >= 20 ? ' (최대 20개 표시)' : ''}
                </p>
                {searchResults.map((note) => {
                  const patient = patientMap.get(note.patientId);
                  return (
                    <Row key={note.id} onClick={() => goToPatient(note.patientId, 'notes')}>
                      <Room>{patient?.roomBed || '—'}</Room>
                      <Body>
                        <span className="text-zinc-900">{patient?.name}</span>
                        <span className="ml-1.5 text-zinc-500">{note.content}</span>
                      </Body>
                      <Pill tone="muted">{note.type === 'reminder' ? '알림' : '경과'}</Pill>
                    </Row>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* 범용 알림 추가/수정 모달 */}
      {showAlertForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowAlertForm(false)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-lg border border-zinc-200 bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-900">
                <Megaphone className="h-3.5 w-3.5 text-zinc-500" />
                {editingAlertId ? '알림 수정' : '새 알림'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAlertForm(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={alertFormData.content}
              onChange={(e) =>
                setAlertFormData((p) => ({ ...p, content: e.target.value }))
              }
              placeholder="알림 내용..."
              className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] text-zinc-500">기간:</label>
              <input
                type="date"
                value={alertFormData.startDate}
                onChange={(e) =>
                  setAlertFormData((p) => ({ ...p, startDate: e.target.value }))
                }
                className="flex-1 rounded-md border border-zinc-200 px-2 py-1 font-mono text-[11px] text-zinc-700 focus:border-zinc-400 focus:outline-none"
              />
              <span className="text-[11px] text-zinc-400">~</span>
              <input
                type="date"
                value={alertFormData.endDate}
                onChange={(e) =>
                  setAlertFormData((p) => ({ ...p, endDate: e.target.value }))
                }
                className="flex-1 rounded-md border border-zinc-200 px-2 py-1 font-mono text-[11px] text-zinc-700 focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <p className="text-[10.5px] text-zinc-400">비워두면 항상 표시됩니다.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAlertForm(false)}
                className="rounded-md px-2.5 py-1 text-[12px] text-zinc-500 hover:bg-zinc-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!alertFormData.content.trim()) return;
                  if (editingAlertId) {
                    updateAlert(editingAlertId, {
                      content: alertFormData.content.trim(),
                      startDate: alertFormData.startDate || undefined,
                      endDate: alertFormData.endDate || undefined,
                    });
                  } else {
                    addAlert(
                      alertFormData.content.trim(),
                      alertFormData.startDate || undefined,
                      alertFormData.endDate || undefined,
                    );
                  }
                  setShowAlertForm(false);
                  setAlertFormData({ content: '', startDate: '', endDate: '' });
                }}
                className="rounded-md bg-zinc-900 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-zinc-800"
              >
                {editingAlertId ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 범용 알림 관리 모달 */}
      {showAlertManager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowAlertManager(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-900">
                <Megaphone className="h-3.5 w-3.5 text-zinc-500" />
                알림 관리
                <span className="ml-1 font-mono text-[11px] text-zinc-400">
                  {allGlobalAlerts.length}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAlertManager(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {allGlobalAlerts.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-zinc-400">
                등록된 알림이 없습니다.
              </p>
            ) : (
              <div className="space-y-1">
                {allGlobalAlerts.map((ga) => {
                  const today = new Date().toISOString().split('T')[0]!;
                  const isActive =
                    (!ga.startDate || today >= ga.startDate) &&
                    (!ga.endDate || today <= ga.endDate);
                  const isExpired = ga.endDate && today > ga.endDate;
                  return (
                    <div
                      key={ga.id}
                      className={cn(
                        'rounded-md border border-zinc-200 p-2.5',
                        isExpired && 'opacity-50',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-[12px] text-zinc-700">{ga.content}</p>
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAlertId(ga.id);
                              setAlertFormData({
                                content: ga.content,
                                startDate: ga.startDate || '',
                                endDate: ga.endDate || '',
                              });
                              setShowAlertManager(false);
                              setShowAlertForm(true);
                            }}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAlert(ga.id)}
                            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
                        {ga.startDate || ga.endDate ? (
                          <span>
                            {ga.startDate || '시작 없음'} ~ {ga.endDate || '종료 없음'}
                          </span>
                        ) : (
                          <span>항상 표시</span>
                        )}
                        {isExpired && <Pill tone="muted">만료</Pill>}
                        {isActive && !isExpired && <Pill tone="warning">활성</Pill>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingAlertId(null);
                setAlertFormData({ content: '', startDate: '', endDate: '' });
                setShowAlertManager(false);
                setShowAlertForm(true);
              }}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-[12px] text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
            >
              <Plus className="h-3 w-3" />
              새 알림 추가
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;
