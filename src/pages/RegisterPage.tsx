import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/useAuthStore';
import { db } from '@/db/database';
import { useSupabaseBackend } from '@/config/backend';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    if (useSupabaseBackend) {
      setIsFirstUser(false);
      return;
    }
    db.users.count().then(count => setIsFirstUser(count === 0));
  }, []);

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    passwordConfirm: '',
    department: '',
  });
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    // Validation
    if (!form.name.trim()) {
      setValidationError('이름을 입력하세요.');
      return;
    }
    if (!form.username.trim()) {
      setValidationError('아이디를 입력하세요.');
      return;
    }
    if (form.username.length < 3) {
      setValidationError('아이디는 3자 이상이어야 합니다.');
      return;
    }
    if (!form.password) {
      setValidationError('비밀번호를 입력하세요.');
      return;
    }
    if (form.password.length < 4) {
      setValidationError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setValidationError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!form.department.trim()) {
      setValidationError('진료과를 입력하세요.');
      return;
    }

    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        department: form.department.trim(),
      });
      setSuccess(true);
    } catch {
      // Error is set in store
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            {isFirstUser ? (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="mb-2 text-xl font-bold">관리자 계정 생성 완료!</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  첫 번째 가입자로 관리자 권한이 자동 부여되었습니다.
                  <br />
                  바로 로그인하실 수 있습니다.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <UserPlus className="h-8 w-8" />
                </div>
                <h2 className="mb-2 text-xl font-bold">가입 신청 완료</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  관리자의 승인 후 로그인할 수 있습니다.
                  <br />
                  승인이 완료되면 입력하신 아이디로 로그인하세요.
                </p>
              </>
            )}
            <Button onClick={() => navigate('/login')} className="w-full">
              로그인 페이지로 돌아가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserPlus className="h-8 w-8" />
            </div>
          </div>
          <h1 className="mb-1 text-2xl font-bold">WardFlow 회원가입</h1>
          <p className="text-sm text-muted-foreground">
            {isFirstUser ? '첫 가입자는 관리자로 자동 승인됩니다' : '가입 후 관리자 승인이 필요합니다'}
          </p>
        </div>

        {isFirstUser && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              첫 번째 사용자 — 관리자 계정으로 생성됩니다
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              이름 <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              type="text"
              placeholder="실명을 입력하세요"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="reg-username" className="mb-1.5 block text-sm font-medium">
              아이디 <span className="text-destructive">*</span>
            </label>
            <Input
              id="reg-username"
              type="text"
              placeholder="로그인에 사용할 아이디 (3자 이상)"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium">
              비밀번호 <span className="text-destructive">*</span>
            </label>
            <Input
              id="reg-password"
              type="password"
              placeholder="비밀번호 (4자 이상)"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="reg-password-confirm" className="mb-1.5 block text-sm font-medium">
              비밀번호 확인 <span className="text-destructive">*</span>
            </label>
            <Input
              id="reg-password-confirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={form.passwordConfirm}
              onChange={(e) => handleChange('passwordConfirm', e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="department" className="mb-1.5 block text-sm font-medium">
              진료과 <span className="text-destructive">*</span>
            </label>
            <Input
              id="department"
              type="text"
              placeholder="예: 내과, 외과, 정형외과"
              value={form.department}
              onChange={(e) => handleChange('department', e.target.value)}
              disabled={isLoading}
            />
          </div>

          {(validationError || error) && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {validationError || error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '가입 신청 중...' : '가입 신청'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
