import { LogOut, Menu, Search, Settings, Stethoscope, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TopBarProps {
  userName?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onAddPatient?: () => boolean | void;
  onSettings?: () => void;
  onLogout?: () => void;
  onTogglePatients?: () => void;
  className?: string;
}

export function TopBar({
  userName,
  searchValue,
  onSearchChange,
  onAddPatient,
  onSettings,
  onLogout,
  onTogglePatients,
  className,
}: TopBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (window.matchMedia('(max-width: 767px)').matches) {
        setMobileSearchOpen(true);
        window.setTimeout(() => mobileSearchRef.current?.focus(), 0);
        return;
      }
      searchRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSearchOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSearchOpen]);

  const clearSearch = useCallback((inputRef: React.RefObject<HTMLInputElement>) => {
    onSearchChange?.('');
    inputRef.current?.focus();
  }, [onSearchChange]);
  const toggleMobileSearch = useCallback(() => {
    setMobileSearchOpen((current) => !current);
    window.setTimeout(() => mobileSearchRef.current?.focus(), 0);
  }, []);
  const closeMobileSearch = useCallback(() => setMobileSearchOpen(false), []);

  return (
    <TooltipProvider delayDuration={250}>
      <header
        className={cn(
          'sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 bg-white/90 px-3 backdrop-blur-md sm:px-4',
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton aria-label="환자 목록 열기" tooltip="환자 목록" className="md:hidden" onClick={onTogglePatients}>
            <Menu className="h-4 w-4" />
          </IconButton>
          <Link to="/" className="flex min-w-0 items-center gap-2 text-zinc-900">
            <Stethoscope className="h-4 w-4 shrink-0" />
            <span className="truncate text-[13px] font-medium tracking-tight">WardFlow</span>
          </Link>
        </div>

        <div className="hidden min-w-0 max-w-sm flex-1 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 md:flex">
          <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <input
            ref={searchRef}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
            value={searchValue ?? ''}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="환자, 병실, 등록번호 검색"
            type="search"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => clearSearch(searchRef)}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="검색어 지우기"
              title="검색어 지우기"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <nav className="flex items-center gap-0.5">
          {userName && (
            <span className="mr-2 hidden max-w-[120px] truncate text-[12px] text-zinc-500 sm:inline">
              {userName}
            </span>
          )}
          <IconButton
            aria-label="환자 검색"
            tooltip="환자 검색"
            aria-expanded={mobileSearchOpen}
            className="md:hidden"
            onClick={toggleMobileSearch}
          >
            <Search className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="환자 추가" tooltip="환자 추가" onClick={onAddPatient}>
            <UserPlus className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="설정" tooltip="설정" onClick={onSettings}>
            <Settings className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="로그아웃" tooltip="로그아웃" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
          </IconButton>
        </nav>

        <div
          className={cn(
            'absolute inset-x-0 top-full border-b border-zinc-200 bg-white px-3 py-2 shadow-sm transition-opacity md:hidden',
            mobileSearchOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <div className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <input
              ref={mobileSearchRef}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
              value={searchValue ?? ''}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="환자, 병실, 등록번호 검색"
              type="search"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => clearSearch(mobileSearchRef)}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="검색어 지우기"
                title="검색어 지우기"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={closeMobileSearch}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="검색 닫기"
              title="검색 닫기"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

function IconButton({
  className,
  tooltip,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tooltip?: string }) {
  const button = (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
        className
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
