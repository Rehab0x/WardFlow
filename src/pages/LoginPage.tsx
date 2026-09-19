import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/useAuthStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const redirectTo =
    (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const redirectPath = redirectTo
    ? `${redirectTo.pathname ?? '/'}${redirectTo.search ?? ''}`
    : '/';

  const savedUsername = localStorage.getItem('wardflow-remember-username') || '';
  const savedRemember = localStorage.getItem('wardflow-remember-me') === 'true';
  const [username, setUsername] = useState(savedUsername);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(savedRemember);
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

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

          <Button type="submit" className="w-full" disabled={isLoading || !username || !password}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-sm text-muted-foreground">계정이 없으신가요? </span>
          <Link to="/register" className="text-sm font-medium text-primary hover:underline">
            회원가입
          </Link>
        </div>

      </Card>
    </div>
  );
};

export default LoginPage;
