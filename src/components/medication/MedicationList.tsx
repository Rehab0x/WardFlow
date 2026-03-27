import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, AlertTriangle, Plus, Clipboard, Pencil, Trash2, CircleOff, RotateCcw } from 'lucide-react';
import type { Medication } from '@/db/database';
import { formatDate, getLocalToday } from '@/utils/dateUtils';

interface MedicationListProps {
  medications: Medication[];
  onDrugClick?: (drugBaseName: string) => void;
  onAddAntibiotic?: () => void;
  onPasteHospital?: () => void;
  onPastePersonal?: () => void;
  onEdit?: (medication: Medication) => void;
  onDelete?: (medicationId: string) => void;
  onDeleteAll?: (category: 'antibiotic' | 'hospital' | 'personal') => void;
  onToggleActive?: (medicationId: string) => void;
}

/**
 * Calculate D-day for antibiotics
 */
function calculateDDay(startDate: Date): number {
  const today = getLocalToday();
  const diff = today.getTime() - startDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function MedicationList({
  medications,
  onDrugClick,
  onAddAntibiotic,
  onPasteHospital,
  onPastePersonal,
  onEdit,
  onDelete,
  onDeleteAll,
  onToggleActive,
}: MedicationListProps) {
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Group medications by category
  const groupedMedications = useMemo(() => {
    const active = medications.filter((med) => med.isActive);

    return {
      antibiotic: active.filter((med) => med.category === 'antibiotic'),
      hospital: active.filter((med) => med.category === 'hospital'),
      personal: active.filter((med) => med.category === 'personal'),
    };
  }, [medications]);

  // Get inactive personal medications (종료된 지참약)
  const personalHistory = useMemo(() => {
    return medications
      .filter((med) => med.category === 'personal' && !med.isActive)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [medications]);

  // Get antibiotic history (inactive antibiotics only)
  const antibioticHistory = useMemo(() => {
    return medications
      .filter((med) => med.category === 'antibiotic' && !med.isActive)
      .sort((a, b) => {
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
        return bEnd - aEnd; // 최근 종료일 기준 내림차순
      });
  }, [medications]);

  // Display limited or all history
  const displayedHistory = showAllHistory ? antibioticHistory : antibioticHistory.slice(0, 3);

  const handleDrugClick = (drugBaseName: string) => {
    if (onDrugClick) {
      onDrugClick(drugBaseName);
    } else {
      // Default: open Naver drug dictionary
      const searchUrl = `https://terms.naver.com/search.naver?query=${encodeURIComponent(drugBaseName)}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-6">
      {/* 항생제 Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold">항생제</h3>
          <div className="flex items-center gap-2">
            {onDeleteAll && groupedMedications.antibiotic.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={() => onDeleteAll('antibiotic')}
              >
                <Trash2 className="h-3 w-3" />
                전체 삭제
              </Button>
            )}
            {onAddAntibiotic && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={onAddAntibiotic}
              >
                <Plus className="h-3 w-3" />
                추가
              </Button>
            )}
          </div>
        </div>
        {groupedMedications.antibiotic.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: 'auto' }} />
                  {(onEdit || onDelete) && <col style={{ width: '96px' }} />}
                </colgroup>
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-semibold">약물명</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용량</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용법</th>
                    <th className="text-left p-3 font-semibold">투약기간</th>
                    {(onEdit || onDelete) && <th className="text-right p-3 font-semibold"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedMedications.antibiotic.map((med) => {
                    const dDay = calculateDDay(med.startDate);
                    const shouldAlert = dDay >= 14;

                    // Calculate days until end
                    const today = getLocalToday();
                    const endDate = med.endDate ? new Date(med.endDate) : null;
                    const diffMs = endDate ? endDate.getTime() - today.getTime() : null;
                    const daysUntilEnd = diffMs !== null ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <tr key={med.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <button
                            onClick={() => handleDrugClick(med.drugBaseName)}
                            className="flex items-center gap-2 text-left group"
                          >
                            <span className="font-medium group-hover:text-primary transition-colors">
                              {med.drugName}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {med.dosage || '-'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {med.frequency || '-'}
                        </td>
                        <td className="p-3">
                          {med.endDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">
                                {formatDate(med.startDate)} ~ {formatDate(med.endDate)}
                              </span>
                              <span className={`font-mono text-xs font-semibold ${shouldAlert ? 'text-destructive' : 'text-primary'}`}>
                                (D+{dDay})
                              </span>
                              {shouldAlert && (
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                              )}
                              {daysUntilEnd !== null && daysUntilEnd <= 1 && (
                                <Badge variant={daysUntilEnd === 0 ? 'destructive' : 'default'} className={daysUntilEnd === 1 ? 'bg-orange-500' : ''}>
                                  {daysUntilEnd === 0 ? '오늘 종료' : '내일 종료'}
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        {(onEdit || onDelete) && (
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              {onEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => onEdit(med)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              {onDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => onDelete(med.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground px-1">현재 투약 중인 항생제가 없습니다.</p>
        )}
      </div>

      {/* 처방약 Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold">처방약</h3>
          <div className="flex items-center gap-2">
            {onDeleteAll && groupedMedications.hospital.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={() => onDeleteAll('hospital')}
              >
                <Trash2 className="h-3 w-3" />
                전체 삭제
              </Button>
            )}
            {onPasteHospital && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={onPasteHospital}
              >
                <Clipboard className="h-3 w-3" />
                붙여넣기
              </Button>
            )}
          </div>
        </div>
        {groupedMedications.hospital.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: 'auto' }} />
                  {(onEdit || onDelete) && <col style={{ width: '96px' }} />}
                </colgroup>
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-semibold">약물명</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용량</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용법</th>
                    <th className="text-left p-3 font-semibold">투약시간</th>
                    {(onEdit || onDelete) && <th className="text-right p-3 font-semibold"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedMedications.hospital.map((med) => {
                    // Calculate frequency from schedule
                    const scheduleItems = med.schedule.split(',').map(s => s.trim());
                    const frequency = scheduleItems.length;
                    // Calculate daily total dose
                    const dailyDose = med.singleDose * frequency;
                    const unit = med.drugName.includes('정') || med.drugName.includes('캡슐') ? 'T' : 'V';
                    const doseDisplay = `${dailyDose}${unit}`;

                    return (
                      <tr key={med.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <button
                            onClick={() => handleDrugClick(med.drugBaseName)}
                            className="flex items-center gap-2 text-left group"
                          >
                            <span className="font-medium group-hover:text-primary transition-colors">
                              {med.drugName}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {doseDisplay}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          #{frequency}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {med.schedule}
                          {med.timing && <span className="text-xs ml-1">({med.timing})</span>}
                        </td>
                        {(onEdit || onDelete) && (
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              {onEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => onEdit(med)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              {onDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => onDelete(med.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground px-1">현재 처방약이 없습니다.</p>
        )}
      </div>

      {/* 지참약 Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold">지참약</h3>
          <div className="flex items-center gap-2">
            {onDeleteAll && groupedMedications.personal.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={() => onDeleteAll('personal')}
              >
                <Trash2 className="h-3 w-3" />
                전체 삭제
              </Button>
            )}
            {onPastePersonal && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={onPastePersonal}
              >
                <Clipboard className="h-3 w-3" />
                붙여넣기
              </Button>
            )}
          </div>
        </div>
        {groupedMedications.personal.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: 'auto' }} />
                  {(onEdit || onDelete) && <col style={{ width: '96px' }} />}
                </colgroup>
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-semibold">약물명</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용량</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용법</th>
                    <th className="text-left p-3 font-semibold">투약시간</th>
                    {(onEdit || onDelete) && <th className="text-right p-3 font-semibold"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedMedications.personal.map((med) => {
                    // Calculate frequency from schedule
                    const scheduleItems = med.schedule.split(',').map(s => s.trim());
                    const frequency = scheduleItems.length;
                    // Calculate daily total dose
                    const dailyDose = med.singleDose * frequency;
                    const unit = med.drugName.includes('정') || med.drugName.includes('캡슐') ? 'T' : 'V';
                    const doseDisplay = `${dailyDose}${unit}`;

                    return (
                      <tr key={med.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <button
                            onClick={() => handleDrugClick(med.drugBaseName)}
                            className="flex items-center gap-2 text-left group"
                          >
                            <span className="font-medium group-hover:text-primary transition-colors">
                              {med.drugName}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {doseDisplay}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          #{frequency}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {med.schedule}
                          {med.timing && <span className="text-xs ml-1">({med.timing})</span>}
                        </td>
                        {(onEdit || onDelete || onToggleActive) && (
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              {onToggleActive && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground"
                                  title="종료 처리"
                                  onClick={() => onToggleActive(med.id)}
                                >
                                  <CircleOff className="h-3 w-3" />
                                </Button>
                              )}
                              {onEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => onEdit(med)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              {onDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => onDelete(med.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground px-1">현재 지참약이 없습니다.</p>
        )}

        {/* 종료된 지참약 */}
        {personalHistory.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">종료된 지참약</h4>
            <Card className="opacity-60">
              <div className="divide-y">
                {personalHistory.map((med) => (
                  <div key={med.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="flex-1 line-through text-muted-foreground">{med.drugName}</span>
                    {onToggleActive && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="다시 활성화" onClick={() => onToggleActive(med.id)}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(med.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 항생제 History Section */}
      {antibioticHistory.length > 0 && (
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-3 px-1 text-muted-foreground">항생제 History</h3>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '96px' }} />
                </colgroup>
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-semibold">약물명</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용량</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">용법</th>
                    <th className="text-left p-3 font-semibold">투약기간</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayedHistory.map((med) => {
                    const startDate = new Date(med.startDate);
                    const endDate = med.endDate ? new Date(med.endDate) : null;
                    const totalDays = endDate
                      ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                      : 0;

                    const formatHistoryDate = (date: Date) => {
                      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                    };

                    return (
                      <tr key={med.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <button
                            onClick={() => handleDrugClick(med.drugBaseName)}
                            className="flex items-center gap-2 text-left group"
                          >
                            <span className="font-medium group-hover:text-primary transition-colors">
                              {med.drugName}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {med.dosage || '-'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {med.frequency || '-'}
                        </td>
                        <td className="p-3">
                          {endDate && (
                            <span className="text-muted-foreground text-xs">
                              {formatHistoryDate(startDate)} ~ {formatHistoryDate(endDate)} ({totalDays}일)
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            {onEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => onEdit(med)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => onDelete(med.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {antibioticHistory.length > 3 && (
              <div className="p-3 border-t text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setShowAllHistory(!showAllHistory)}
                >
                  {showAllHistory ? '접기' : `더보기 (${antibioticHistory.length - 3}개 더 있음)`}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
