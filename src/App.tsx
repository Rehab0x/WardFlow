import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import { Toaster } from './components/ui/toaster';
import { useAuthStore } from './stores/useAuthStore';
import { useAutoLock } from './hooks/usePinLock';
import { usePrefetch } from './hooks/usePrefetch';
import PinLockOverlay from './pages/PinLockPage';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const LabImportPage = lazy(() => import('./pages/LabImportPage'));
const V2PreviewPage = lazy(() => import('./pages/v2/V2PreviewPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-center">
      <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
      <p className="text-muted-foreground">로딩 중...</p>
    </div>
  </div>
);

// Protected route wrapper with PIN lock
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { isLocked } = useAutoLock();

  // PIN 잠금 중 백그라운드 데이터 프리페치
  usePrefetch(isLocked);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}
      {isLocked && <PinLockOverlay onUnlock={() => {}} />}
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes - require authentication */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/patients" element={<Navigate to="/" replace />} />
            <Route path="/patients/:patientId" element={<PatientDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/calendar" element={<SchedulePage />} />
          </Route>

          <Route
            path="/v2"
            element={
              <ProtectedRoute>
                <V2PreviewPage />
              </ProtectedRoute>
            }
          />

          {/* Lab Import - public, no auth/PIN (local IndexedDB only) */}
          <Route path="/lab-import" element={<LabImportPage />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
