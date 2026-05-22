import { LogOut, Search, Settings, Stethoscope, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TopBarProps {
  userName?: string;
  onAddPatient?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function TopBar({ userName, onAddPatient, onSettings, onLogout, className }: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md',
        className
      )}
    >
      <Link to="/" className="flex items-center gap-2 text-zinc-900">
        <Stethoscope className="h-4 w-4" />
        <span className="text-[13px] font-medium tracking-tight">WardFlow</span>
      </Link>

      <div className="hidden min-w-0 max-w-sm flex-1 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 md:flex">
        <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        <input
          className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
          placeholder="환자, 병실, 등록번호 검색"
          type="search"
        />
      </div>

      <nav className="flex items-center gap-0.5">
        {userName && (
          <span className="mr-2 hidden max-w-[120px] truncate text-[12px] text-zinc-500 sm:inline">
            {userName}
          </span>
        )}
        <IconButton aria-label="환자 추가" onClick={onAddPatient}>
          <UserPlus className="h-4 w-4" />
        </IconButton>
        <IconButton aria-label="설정" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </IconButton>
        <IconButton aria-label="로그아웃" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
        </IconButton>
      </nav>
    </header>
  );
}

function IconButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
        className
      )}
    />
  );
}

