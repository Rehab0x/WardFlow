import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { shouldShowBackupPrompt, markBackupPrompted } from '@/services/backupService';
import { Button } from '@/components/ui/button';
import { HardDrive, X } from 'lucide-react';
import { usePatientStore } from '@/stores/usePatientStore';

const AppShell = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const navigate = useNavigate();
  const { fetchPatients } = usePatientStore();

  // 앱 진입 시 환자 목록 즉시 로드 (Sidebar, DetailPage 등에서 중복 호출 방지)
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    // 약간의 딜레이 후 체크 (앱 로드 완료 후)
    const timer = setTimeout(() => {
      if (shouldShowBackupPrompt()) {
        setShowBackupPrompt(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleBackupDismiss = () => {
    markBackupPrompted();
    setShowBackupPrompt(false);
  };

  const handleBackupGo = () => {
    markBackupPrompted();
    setShowBackupPrompt(false);
    navigate('/settings?section=backup');
  };

  const handleMenuClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop always visible, Mobile controlled by state */}
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} onOpen={handleOpenSidebar} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={handleMenuClick} onCloseSidebar={handleCloseSidebar} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Copyright - fixed above bottom nav */}
        <div className="hidden lg:block border-t bg-background py-1 text-center">
          <p className="text-[10px] text-muted-foreground/40">&copy; 2026 Neokuns</p>
        </div>

        {/* Bottom navigation - Mobile only */}
        <BottomNav onOpenSidebar={handleOpenSidebar} onCloseSidebar={handleCloseSidebar} />
      </div>

      {/* Daily backup prompt */}
      {showBackupPrompt && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="rounded-xl border bg-card p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">데이터 백업</p>
                <p className="text-xs text-muted-foreground mt-0.5">오늘 아직 백업하지 않았습니다. 지금 백업하시겠습니까?</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleBackupGo}>
                    백업하기
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleBackupDismiss}>
                    나중에
                  </Button>
                </div>
              </div>
              <button onClick={handleBackupDismiss} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppShell;
