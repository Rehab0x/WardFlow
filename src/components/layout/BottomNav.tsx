import { NavLink } from 'react-router-dom';
import { StickyNote, Settings, Users } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BottomNavProps {
  onOpenSidebar?: () => void;
  onCloseSidebar?: () => void;
}

const BottomNav = ({ onOpenSidebar, onCloseSidebar }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div className="flex items-center justify-around">
        {/* Today's Note */}
        <NavLink
          to="/"
          onClick={onCloseSidebar}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center space-y-1 py-3 text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <StickyNote className={cn('h-6 w-6', isActive && 'text-primary')} />
              <span>Today</span>
            </>
          )}
        </NavLink>

        {/* 환자 목록 (사이드바 열기) */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-1 flex-col items-center justify-center space-y-1 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Users className="h-6 w-6" />
          <span>환자</span>
        </button>

        {/* 설정 */}
        <NavLink
          to="/settings"
          onClick={onCloseSidebar}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center space-y-1 py-3 text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={cn('h-6 w-6', isActive && 'text-primary')} />
              <span>설정</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
