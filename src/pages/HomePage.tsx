import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { fetchBriefingData, type BriefingData } from '@/services/briefingService';
import { formatDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bell, Pill, FlaskConical, AlertTriangle, ChevronRight, Calendar, Check, Search, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScheduleCategoryStore } from '@/stores/useScheduleCategoryStore';
import { db } from '@/db/database';
import type { Note } from '@/db/database';
import { usePatientStore } from '@/stores/usePatientStore';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { getLabel: getScheduleLabel } = useScheduleCategoryStore();
  const { patients } = usePatientStore();
  const [data, setData] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 메모 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 환자 ID → 환자 정보 매핑
  const patientMap = useMemo(() => {
    const map = new Map<string, { name: string; roomBed: string }>();
    for (const p of patients) {
      map.set(p.id, { name: p.name, roomBed: p.roomBed });
    }
    return map;
  }, [patients]);

  // 검색어 입력 시 전체 메모 로드
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
    return () => { cancelled = true; };
  }, [searchQuery]);

  // 검색 결과 필터링
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allNotes.filter((note) => {
      const patient = patientMap.get(note.patientId);
      return (
        note.content.toLowerCase().includes(q) ||
        (patient?.name.toLowerCase().includes(q)) ||
        (patient?.roomBed.toLowerCase().includes(q))
      );
    }).slice(0, 20); // 최대 20개
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

  const todayStr = formatDate(new Date());

  const goToPatient = (patientId: string, tab?: string) => {
    const query = tab ? `?tab=${tab}` : '';
    navigate(`/patients/${patientId}${query}`);
  };

  if (isLoading || !data) {
    return (
      <div className="container mx-auto p-3 sm:p-6">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-primary">Today's Note</h1>
        <p className="mb-6 text-sm text-muted-foreground">{todayStr}</p>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const hasReminders = data.reminders.length > 0;
  const hasLongTermAbx = data.antibiotics.some(a => a.isLongTerm);

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Today's Note</h1>
        <p className="text-sm text-muted-foreground">{todayStr} | {currentUser?.name} | 환자 {data.patientSummary.total}명 (입원 {data.patientSummary.admitted} / 컨설트 {data.patientSummary.consult})</p>
      </div>

      {/* 오늘의 알림 */}
      <Card className={hasReminders ? 'border-amber-300 dark:border-amber-700' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-amber-500" />
            오늘의 알림
            {hasReminders && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {data.reminders.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">오늘 알림이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {data.reminders.map((r) => (
                <div
                  key={r.noteId}
                  className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 cursor-pointer hover:bg-amber-100/50 transition-colors dark:border-amber-800 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                  onClick={() => goToPatient(r.patientId, 'notes')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs shrink-0">{r.roomBed}</Badge>
                      <span className="font-medium text-sm">{r.patientName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.content}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 항생제 현황 */}
      <Card className={hasLongTermAbx ? 'border-red-300 dark:border-red-700' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pill className="h-5 w-5 text-blue-500" />
            항생제 현황
            {data.antibiotics.length > 0 && (
              <Badge variant="secondary">{data.antibiotics.length}</Badge>
            )}
            {hasLongTermAbx && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                장기투여
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.antibiotics.length === 0 ? (
            <p className="text-sm text-muted-foreground">항생제 사용 중인 환자가 없습니다.</p>
          ) : (
            <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 sm:hidden">
              {data.antibiotics.map((abx) => (
                <div
                  key={abx.medicationId}
                  className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => goToPatient(abx.patientId, 'medications')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs shrink-0">{abx.roomBed}</Badge>
                      <span className="font-medium text-sm">{abx.patientName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {abx.drugName} {abx.dosage && abx.frequency ? `${abx.dosage} ${abx.frequency}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                    <Badge
                      variant={abx.isLongTerm ? 'destructive' : 'secondary'}
                      className={cn(!abx.isLongTerm && abx.dDay >= 10 && 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200')}
                    >
                      D+{abx.dDay}
                    </Badge>
                    {abx.endDate && (() => {
                      const end = new Date(abx.endDate);
                      const now = new Date();
                      const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                      const tmr = new Date(now); tmr.setDate(tmr.getDate()+1);
                      const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth()+1).padStart(2,'0')}-${String(tmr.getDate()).padStart(2,'0')}`;
                      const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
                      if (endStr === todayStr) return <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300">오늘 종료</Badge>;
                      if (endStr === tmrStr) return <Badge className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-300">내일 종료</Badge>;
                      return null;
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크톱: 테이블 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">환자</th>
                    <th className="pb-2 pr-3 font-medium">항생제</th>
                    <th className="pb-2 pr-3 font-medium">용법</th>
                    <th className="pb-2 font-medium text-center">D-day</th>
                  </tr>
                </thead>
                <tbody>
                  {data.antibiotics.map((abx) => (
                    <tr
                      key={abx.medicationId}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => goToPatient(abx.patientId, 'medications')}
                    >
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs shrink-0">{abx.roomBed}</Badge>
                          <span className="font-medium">{abx.patientName}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">{abx.drugName}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {abx.dosage && abx.frequency ? `${abx.dosage} ${abx.frequency}` : '-'}
                      </td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Badge
                            variant={abx.isLongTerm ? 'destructive' : 'secondary'}
                            className={abx.isLongTerm ? '' : abx.dDay >= 10 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''}
                          >
                            D+{abx.dDay}
                          </Badge>
                          {abx.endDate && (() => {
                            const end = new Date(abx.endDate);
                            const now = new Date();
                            const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                            const tmr = new Date(now); tmr.setDate(tmr.getDate()+1);
                            const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth()+1).padStart(2,'0')}-${String(tmr.getDate()).padStart(2,'0')}`;
                            const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
                            if (endStr === todayStr) return <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300">오늘 종료</Badge>;
                            if (endStr === tmrStr) return <Badge className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-300">내일 종료</Badge>;
                            return null;
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 최근 Lab 결과 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-green-500" />
            최근 Lab 결과
            {data.recentLabs.length > 0 && (
              <Badge variant="secondary">{data.recentLabs.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentLabs.length === 0 ? (
            <p className="text-sm text-muted-foreground">최근 2일간 새로운 Lab 결과가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {data.recentLabs.map((lab) => (
                <div
                  key={`${lab.patientId}-${lab.dateKey}`}
                  className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => goToPatient(lab.patientId, 'lab')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs shrink-0">{lab.roomBed}</Badge>
                      <span className="font-medium text-sm">{lab.patientName}</span>
                      <span className="text-xs text-muted-foreground">
                        {lab.dateKey === todayStr ? '오늘' : '어제'} ({lab.dateKey})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">총 {lab.totalItems}개 항목</span>
                      {lab.abnormalCount > 0 && (
                        <>
                          <span className="text-red-500 font-medium">비정상 {lab.abnormalCount}개</span>
                          <span className="text-red-400 truncate">
                            ({lab.abnormalItems.join(', ')}{lab.abnormalCount > 5 ? ' ...' : ''})
                          </span>
                        </>
                      )}
                      {lab.abnormalCount === 0 && (
                        <span className="text-green-600">모두 정상</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Schedules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-violet-500" />
            오늘 일정
            {data.todaySchedules.length > 0 && (
              <Badge variant="secondary">{data.todaySchedules.filter(s => !s.isCompleted).length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.todaySchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">오늘 예정된 일정이 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {data.todaySchedules.map((s) => (
                <div
                  key={s.scheduleId}
                  onClick={() => navigate(`/patient/${s.patientId}?tab=overview`)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                    s.isCompleted && 'opacity-50'
                  )}
                >
                  <div className={cn(
                    'h-5 w-5 rounded border flex items-center justify-center shrink-0',
                    s.isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                  )}>
                    {s.isCompleted && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        {getScheduleLabel(s.category)}
                      </Badge>
                      <span className={cn('text-sm font-medium truncate', s.isCompleted && 'line-through')}>
                        {s.title}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.roomBed} {s.patientName}
                      {s.scheduledTime && ` · ${s.scheduledTime}`}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 메모 검색 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-slate-500" />
            메모 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="환자명, 병실번호 또는 메모 내용으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {searchQuery.trim() && !isSearching && (
            <div className="mt-3">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">검색 결과가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{searchResults.length}개 결과{searchResults.length >= 20 ? ' (최대 20개 표시)' : ''}</p>
                  {searchResults.map((note) => {
                    const patient = patientMap.get(note.patientId);
                    return (
                      <div
                        key={note.id}
                        className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => goToPatient(note.patientId, 'notes')}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {patient && (
                              <>
                                <Badge variant="outline" className="text-xs shrink-0">{patient.roomBed}</Badge>
                                <span className="font-medium text-sm">{patient.name}</span>
                              </>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {note.type === 'reminder' ? '알림' : '경과'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">{note.content}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;
