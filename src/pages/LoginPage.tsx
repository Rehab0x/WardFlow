import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/useAuthStore';
import { db } from '@/db/database';
import { seedDatabase } from '@/db/seed';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const savedUsername = localStorage.getItem('wardflow-remember-username') || '';
  const savedRemember = localStorage.getItem('wardflow-remember-me') === 'true';
  const [username, setUsername] = useState(savedUsername);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(savedRemember);
  const [isCheckingDb, setIsCheckingDb] = useState(true);
  const [isReseeding, setIsReseeding] = useState(false);
  const [reseedMessage, setReseedMessage] = useState('');

  // Check and seed database if empty (dev only)
  useEffect(() => {
    const checkAndSeedDatabase = async () => {
      try {
        if (import.meta.env.DEV) {
          const userCount = await db.users.count();
          if (userCount === 0) {
            console.log('Database is empty, seeding data...');
            await seedDatabase();
            console.log('Seed data loaded successfully');
          }
        }
      } catch (error) {
        console.error('Error checking/seeding database:', error);
      } finally {
        setIsCheckingDb(false);
      }
    };

    checkAndSeedDatabase();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!username || !password) {
      return;
    }

    try {
      await login(username, password);
      // 아이디 기억하기
      if (rememberMe) {
        localStorage.setItem('wardflow-remember-username', username);
        localStorage.setItem('wardflow-remember-me', 'true');
      } else {
        localStorage.removeItem('wardflow-remember-username');
        localStorage.removeItem('wardflow-remember-me');
      }
      // Navigation will be handled by the useEffect above
    } catch (error) {
      // Error is already set in the store
      console.error('Login failed:', error);
    }
  };

  const handleReseedDatabase = async () => {
    setIsReseeding(true);
    setReseedMessage('');

    try {
      console.log('🔄 Reseeding database...');
      await seedDatabase();
      console.log('✅ Seed data loaded successfully');
      setReseedMessage('✅ 시드 데이터가 성공적으로 로드되었습니다!');

      // Clear message after 3 seconds
      setTimeout(() => {
        setReseedMessage('');
      }, 3000);
    } catch (error) {
      console.error('❌ Error reseeding database:', error);
      setReseedMessage('❌ 시드 데이터 로드 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsReseeding(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <LogIn className="h-8 w-8" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold">WardFlow</h1>
          <p className="text-sm text-muted-foreground">병동 환자 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
              사용자 ID
            </label>
            <Input
              id="username"
              type="text"
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              autoFocus={!savedUsername}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              autoFocus={!!savedUsername}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-muted-foreground">아이디 기억하기</span>
          </label>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isCheckingDb || isLoading || !username || !password}>
            {isCheckingDb ? '데이터베이스 확인 중...' : isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-sm text-muted-foreground">계정이 없으신가요? </span>
          <Link to="/register" className="text-sm font-medium text-primary hover:underline">
            회원가입
          </Link>
        </div>

        {/* Dev only: 테스트 계정 + 개발 도구 (프로덕션 빌드에서 자동 제거) */}
        {import.meta.env.DEV && (
          <>
            <div className="mt-6 border-t pt-6">
              <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
                테스트 계정
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between rounded border p-2">
                  <span className="font-medium">의사:</span>
                  <span>doctor1 / password</span>
                </div>
                <div className="flex justify-between rounded border p-2">
                  <span className="font-medium">간호사:</span>
                  <span>nurse1 / password</span>
                </div>
                <div className="flex justify-between rounded border p-2">
                  <span className="font-medium">관리자:</span>
                  <span>admin / password</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                개발 도구
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleReseedDatabase}
                disabled={isReseeding}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isReseeding ? 'animate-spin' : ''}`} />
                {isReseeding ? '시드 데이터 로딩 중...' : '시드 데이터 재로드'}
              </Button>

              {reseedMessage && (
                <div className={`mt-3 rounded-md p-2 text-xs text-center ${
                  reseedMessage.startsWith('✅')
                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {reseedMessage}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
