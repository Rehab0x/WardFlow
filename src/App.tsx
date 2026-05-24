import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import AppShell from './components/layout/AppShell';
import { Toaster } from './components/ui/toaster';
import { useAuthStore } from './stores/useAuthStore';
import { useAutoLock } from './hooks/usePinLock';
import { usePrefetch } from './hooks/usePrefetch';
import { useSupabaseUserSettingsSync } from './hooks/useSupabaseUserSettingsSync';
import PinLockOverlay from './pages/PinLockPage';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const LabImportPage = lazy(() => import('./pages/LabImportPage'));
const V2AppPage = lazy(() => import('./pages/v2/V2AppPage'));
const V2PreviewPage = lazy(() => import('./pages/v2/V2PreviewPage'));

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-center">
      <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
      <p className="text-muted-foreground">로딩 중...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { isLocked } = useAutoLock();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  useSupabaseUserSettingsSync();

  // PIN 잠금 중에도 배경 데이터를 미리 준비한다.
  usePrefetch(isLocked);

  useEffect(() => {
    let cancelled = false;
    setAuthChecked(false);
    checkAuth().finally(() => {
      if (!cancelled) setAuthChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [checkAuth]);

  if (!authChecked) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <V2AppPage />
              </ProtectedRoute>
            }
          />
          <Route path="/v2/app" element={<Navigate to="/" replace />} />
          <Route path="/v2" element={<V2PreviewPage />} />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/legacy" element={<HomePage />} />
            <Route path="/patients" element={<Navigate to="/" replace />} />
            <Route path="/patients/:patientId" element={<PatientDetailPage />} />
            <Route path="/legacy/settings" element={<SettingsPage />} />
            <Route path="/calendar" element={<SchedulePage />} />
          </Route>

          <Route path="/lab-import" element={<LabImportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
