import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Stethoscope,
  StickyNote,
  Settings,
  LogOut,
  UserPlus,
  FlaskConical,
  Lock,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
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
import { cn } from '@/lib/utils';

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
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 bg-white/85 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick?.();
            }}
            aria-label="메뉴 열기"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Brand */}
          <button
            type="button"
            onClick={() => {
              onCloseSidebar?.();
              navigate('/');
            }}
            className="flex items-center gap-2 text-zinc-900"
            aria-label="WardFlow"
          >
            <Stethoscope className="h-4 w-4" strokeWidth={2} />
            <span className="text-[13px] font-medium tracking-tight">WardFlow</span>
          </button>

          {isOffline && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-px font-mono text-[10px] font-medium text-amber-700">
              <WifiOff className="h-2.5 w-2.5" />
              오프라인
            </span>
          )}
        </div>

        <nav className="flex items-center gap-0.5">
          <IconBtn
            aria-label="Today's Note"
            tooltip="Today's Note"
            onClick={() => {
              onCloseSidebar?.();
              navigate('/');
            }}
          >
            <StickyNote className="h-4 w-4" />
          </IconBtn>

          <IconBtn
            aria-label="새 환자 추가"
            tooltip="새 환자 추가"
            onClick={() => {
              onCloseSidebar?.();
              setShowAddPatient(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
          </IconBtn>

          <IconBtn
            aria-label="Lab 일괄 입력"
            tooltip="Lab 일괄 입력"
            onClick={() => {
              onCloseSidebar?.();
              setShowBulkLab(true);
            }}
          >
            <FlaskConical className="h-4 w-4" />
          </IconBtn>

          {hasPin && (
            <IconBtn
              aria-label="화면 잠금"
              tooltip="화면 잠금"
              onClick={() => {
                onCloseSidebar?.();
                lock();
              }}
            >
              <Lock className="h-4 w-4" />
            </IconBtn>
          )}

          <IconBtn
            aria-label="설정"
            tooltip="앱 설정"
            onClick={() => {
              onCloseSidebar?.();
              navigate('/settings');
            }}
          >
            <Settings className="h-4 w-4" />
          </IconBtn>

          <IconBtn
            aria-label="로그아웃"
            tooltip="로그아웃"
            onClick={() => {
              onCloseSidebar?.();
              handleLogout();
            }}
          >
            <LogOut className="h-4 w-4" />
          </IconBtn>
        </nav>
      </header>

      {/* Bulk Lab Import Modal */}
      {showBulkLab && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-zinc-200 bg-white">
            <div className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-[14px] font-medium text-zinc-900">
                <FlaskConical className="h-4 w-4 text-zinc-500" />
                Lab 일괄 입력
              </h2>
              <BulkLabImport onClose={() => setShowBulkLab(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white">
            <div className="p-6">
              <PatientForm onClose={handleClosePatientForm} />
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

interface IconBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string;
}

function IconBtn({ className, tooltip, children, ...props }: IconBtnProps) {
  const button = (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
        className,
      )}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default Header;
