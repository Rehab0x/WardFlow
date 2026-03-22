import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronDown, ChevronRight, Pill, Search, Stethoscope, Heart, UserCog, ShieldCheck, UserPlus, Bell, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePatientStore } from '@/stores/usePatientStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { PatientForm } from '@/components/patient/PatientForm';
import { getRoleDisplayName } from '@/utils/permissions';
import { calculateAge } from '@/utils/dateUtils';
import { useSidebarFlags } from '@/hooks/useSidebarFlags';
import type { UserRole } from '@/types/user';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

type PatientCategory = 'admitted' | 'consult' | 'discharged';

const Sidebar = ({ isOpen = true, onClose, onOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patients, fetchPatients } = usePatientStore();
  const { currentUser } = useAuthStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

  const [expandedCategory, setExpandedCategory] = useState<PatientCategory>('admitted');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);

  // 사이드바 플래그 (항생제/알림) - 활성 환자만
  const activePatientIds = patients.filter(p => p.status === 'active').map(p => p.id);
  const sidebarFlags = useSidebarFlags(activePatientIds);

  // Get role icon
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return Stethoscope;
      case 'nurse':
        return Heart;
      case 'therapist':
        return UserCog;
      case 'admin':
        return ShieldCheck;
      default:
        return UserCog;
    }
  };

  const RoleIcon = currentUser ? getRoleIcon(currentUser.role) : UserCog;

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Swipe gesture handler
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0]?.clientX ?? 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchCurrentX.current = e.touches[0]?.clientX ?? 0;
    };

    const handleTouchEnd = () => {
      const diff = touchCurrentX.current - touchStartX.current;
      // Swipe from left edge to right (open sidebar)
      if (touchStartX.current < 50 && diff > 100 && !isOpen) {
        onOpen?.();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onOpen]);

  const handlePatientClick = (patientId: string) => {
    // Always navigate to overview tab when clicking a patient
    navigate(`/patients/${patientId}?tab=overview`);
    onClose?.();
  };

  const toggleCategory = (category: PatientCategory) => {
    setExpandedCategory(expandedCategory === category ? 'admitted' : category);
  };

  // Filter patients by search query (room/bed number or name)
  const filterPatients = (patientList: typeof patients) => {
    if (!searchQuery.trim()) return patientList;

    const query = searchQuery.toLowerCase().trim();
    return patientList.filter((p) =>
      p.roomBed.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query)
    );
  };

  // Categorize and sort patients
  // Active patients: sort by room/bed number
  // Discharged patients: sort by discharge date (most recent first)
  const admittedPatients = filterPatients(
    patients
      .filter((p) => p.status === 'active' && p.patientType === 'admitted')
      .sort((a, b) => a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true }))
  );
  const consultPatients = filterPatients(
    patients
      .filter((p) => p.status === 'active' && p.patientType === 'consult')
      .sort((a, b) => a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true }))
  );
  const dischargedPatients = filterPatients(
    patients
      .filter((p) => p.status === 'discharged')
      .sort((a, b) => {
        // Sort by discharge date descending (most recent first)
        if (!a.dischargeDate) return 1;
        if (!b.dischargeDate) return -1;
        return b.dischargeDate.getTime() - a.dischargeDate.getTime();
      })
  );

  const categories = [
    { id: 'admitted' as const, label: '입원환자', count: admittedPatients.length, patients: admittedPatients },
    { id: 'consult' as const, label: '컨설트', count: consultPatients.length, patients: consultPatients },
    { id: 'discharged' as const, label: '퇴원환자', count: dischargedPatients.length, patients: dischargedPatients },
  ];

  return (
    <>
      {/* Mobile overlay - below header */}
      {isOpen && (
        <div
          className="fixed inset-0 top-14 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed left-0 border-r bg-background transition-all duration-300 lg:static lg:translate-x-0',
          // Mobile: below header (top-14, h-[calc(100vh-3.5rem)]), Desktop: full height
          'top-14 h-[calc(100vh-3.5rem)] z-40 lg:top-0 lg:h-screen lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Dynamic width based on department name length
          currentUser?.department && currentUser.department.length > 4 ? 'w-72' : 'w-64'
        )}
      >
        {/* User Info Card (at top) */}
        {currentUser && (
          <div className="border-b bg-gradient-to-r from-primary/5 to-primary/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <RoleIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-1 items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold whitespace-nowrap">{currentUser.name}</span>
                <Badge variant="secondary" className="text-xs h-5 px-2 flex-shrink-0">
                  {getRoleDisplayName(currentUser.role)}
                </Badge>
                {currentUser.department && (
                  <span className="text-xs text-muted-foreground truncate">
                    {currentUser.department}
                  </span>
                )}
              </div>
              {/* Mobile close button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex-shrink-0"
                onClick={onClose}
                aria-label="사이드바 닫기"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="병실번호 또는 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>

        {/* Add Patient Button */}
        <div className="border-b p-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddPatient(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            새 환자 추가
          </Button>
        </div>

        {/* Patient Categories */}
        <div className="flex flex-col overflow-hidden h-[calc(100vh-14rem)] lg:h-[calc(100vh-10.5rem)]">
          <div className="flex-1 overflow-y-auto">
            {categories.map((category) => {
              const isExpanded = expandedCategory === category.id;
              const Icon = isExpanded ? ChevronDown : ChevronRight;

              return (
                <div key={category.id} className="border-b">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{category.label}</span>
                      <span className="text-xs text-muted-foreground">({category.count})</span>
                    </div>
                  </button>

                  {/* Patient List */}
                  {isExpanded && (
                    <div className="space-y-1 p-2">
                      {category.patients.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                          {category.id === 'admitted' && '입원환자가 없습니다'}
                          {category.id === 'consult' && '컨설트 환자가 없습니다'}
                          {category.id === 'discharged' && '퇴원환자가 없습니다'}
                        </div>
                      ) : (
                        category.patients.map((patient) => {
                          const age = calculateAge(patient.birthDate);
                          // Exact match: check if URL is /patients/:patientId or /patients/:patientId/...
                          const isActive = location.pathname === `/patients/${patient.id}` ||
                                          location.pathname.startsWith(`/patients/${patient.id}/`) ||
                                          location.pathname.startsWith(`/patients/${patient.id}?`);
                          const isDischarged = category.id === 'discharged';

                          // 실제 플래그 데이터
                          const flags = sidebarFlags.get(patient.id);
                          const hasAttention = !!patient.attention;
                          const hasAntibiotic = !!flags?.hasAntibiotic;
                          const hasReminder = !!flags?.hasReminder;

                          // Format discharge date for display
                          const dischargeDisplay = patient.dischargeDate
                            ? patient.dischargeDate.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              }).replace(/\. /g, '-').replace('.', '')
                            : '';

                          return (
                            <button
                              key={patient.id}
                              onClick={() => handlePatientClick(patient.id)}
                              className={cn(
                                'group relative w-full rounded-lg border px-3 py-2.5 text-left transition-all',
                                isActive
                                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                  : hasAttention
                                    ? 'border-red-200 bg-red-50/70 hover:bg-red-100/70 dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-950/50'
                                    : hasReminder
                                      ? 'border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50'
                                      : hasAntibiotic
                                        ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-950/50'
                                        : 'border-transparent bg-accent/50 hover:border-accent-foreground/20 hover:bg-accent hover:shadow-sm'
                              )}
                            >
                              {isDischarged ? (
                                // Discharged patient: Name Sex/Age DischargeDate
                                <div className="flex items-center justify-between">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium">{patient.name}</span>
                                    <span
                                      className={cn(
                                        'text-xs',
                                        isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                      )}
                                    >
                                      {patient.sex}/{age}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-xs',
                                        isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/80'
                                      )}
                                    >
                                      {dischargeDisplay} 퇴원
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                // Active patient: Room Name Sex/Age + Icons
                                <div className="flex items-center justify-between">
                                  <div className="flex items-baseline gap-2">
                                    <span
                                      className={cn(
                                        'text-xs font-semibold',
                                        isActive ? 'text-primary-foreground' : 'text-primary'
                                      )}
                                    >
                                      {patient.roomBed}
                                    </span>
                                    <span className="text-sm font-medium">{patient.name}</span>
                                    <span
                                      className={cn(
                                        'text-xs',
                                        isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                      )}
                                    >
                                      {patient.sex}/{age}
                                    </span>
                                  </div>

                                  {/* Status Icons */}
                                  <div className="flex items-center gap-1">
                                    {hasAttention && (
                                      <AlertTriangle className={cn('h-3.5 w-3.5', isActive ? 'text-red-200' : 'text-red-500')} />
                                    )}
                                    {hasReminder && (
                                      <Bell className={cn('h-3.5 w-3.5', isActive ? 'text-blue-200' : 'text-blue-500')} />
                                    )}
                                    {hasAntibiotic && (
                                      <Pill className={cn('h-3.5 w-3.5', isActive ? 'text-amber-200' : 'text-amber-500')} />
                                    )}
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <PatientForm onClose={() => {
                setShowAddPatient(false);
                fetchPatients(); // Refresh patient list
              }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
