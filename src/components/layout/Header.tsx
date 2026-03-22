import { useNavigate } from 'react-router-dom';
import { Menu, StickyNote, Settings, LogOut, UserPlus, FlaskConical, Lock, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAutoLock } from '@/hooks/usePinLock';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { PatientForm } from '@/components/patient/PatientForm';
import { BulkLabImport } from '@/components/lab/BulkLabImport';

interface HeaderProps {
  onMenuClick?: () => void;
  onCloseSidebar?: () => void;
}

const Header = ({ onMenuClick, onCloseSidebar }: HeaderProps) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { hasPin, lock } = useAutoLock();
  const isOffline = useOfflineStatus();
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showBulkLab, setShowBulkLab] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClosePatientForm = () => {
    setShowAddPatient(false);
  };

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center px-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/15"
            onClick={onMenuClick}
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <h1
              className="text-xl tracking-wide bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent drop-shadow-sm"
              style={{ fontFamily: "'Righteous', cursive" }}
            >WardFlow</h1>
            {isOffline && (
              <div className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-xs text-amber-950 dark:bg-amber-500/80 dark:text-amber-950">
                <WifiOff className="h-3 w-3" />
                <span>오프라인</span>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center space-x-0.5 sm:space-x-2 [&_button]:text-primary-foreground/80 [&_button:hover]:text-primary-foreground [&_button:hover]:bg-white/15">
            {/* 1. Today's Note */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => { onCloseSidebar?.(); navigate('/'); }}
                  aria-label="Today's Note"
                >
                  <StickyNote className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Today's Note</p>
              </TooltipContent>
            </Tooltip>

            {/* 2. Add Patient */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => { onCloseSidebar?.(); setShowAddPatient(true); }}
                  aria-label="새 환자 추가"
                >
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>새 환자 추가</p>
              </TooltipContent>
            </Tooltip>

            {/* 3. Bulk Lab Import */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => { onCloseSidebar?.(); setShowBulkLab(true); }}
                  aria-label="Lab 일괄 입력"
                >
                  <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lab 일괄 입력</p>
              </TooltipContent>
            </Tooltip>

            {/* 4. Lock */}
            {hasPin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => { onCloseSidebar?.(); lock(); }} aria-label="잠금">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>화면 잠금</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* 5. Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => { onCloseSidebar?.(); navigate('/settings'); }}
                  aria-label="설정"
                >
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>앱 설정</p>
              </TooltipContent>
            </Tooltip>

            {/* 6. Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => { onCloseSidebar?.(); handleLogout(); }} aria-label="로그아웃">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>로그아웃</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Bulk Lab Import Modal */}
      {showBulkLab && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Lab 일괄 입력
              </h2>
              <BulkLabImport onClose={() => setShowBulkLab(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <PatientForm onClose={handleClosePatientForm} />
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

export default Header;
