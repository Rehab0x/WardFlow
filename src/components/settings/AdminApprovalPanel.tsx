import { UserCheck, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { User, UserRole, WardLinkModule } from '@/types/user';
import { AVAILABLE_MODULES, AVAILABLE_ROLES } from './adminAccessOptions';

export function AdminApprovalPanel({
  pendingUsers,
  approvalState,
  processingId,
  usersLoading,
  onApprove,
  onReject,
  onToggleModule,
  onRoleChange,
}: {
  pendingUsers: User[];
  approvalState: Record<string, { role: UserRole; modules: WardLinkModule[] }>;
  processingId: string | null;
  usersLoading: boolean;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onToggleModule: (userId: string, module: WardLinkModule) => void;
  onRoleChange: (user: User, role: UserRole) => void;
}) {
  if (usersLoading) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        가입 요청을 불러오는 중입니다.
      </p>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        승인 대기 중인 가입 요청이 없습니다. 두 번째 사용자부터는 이곳에서 승인해야 로그인할 수
        있습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pendingUsers.map((user) => {
        const state = approvalState[user.id] ?? { role: 'doctor', modules: ['wardflow'] };
        return (
          <Card key={user.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">
                  @{user.username} · {user.department || '-'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  가입 요청: {user.createdAt.toLocaleDateString('ko-KR')}
                </div>
              </div>
              <Badge variant="outline" className="border-amber-300 text-amber-600">
                대기 중
              </Badge>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">역할</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => (
                  <Button
                    key={role.value}
                    variant={state.role === role.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onRoleChange(user, role.value)}
                    aria-pressed={state.role === role.value}
                    disabled={processingId === user.id}
                  >
                    {role.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">모듈 권한</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_MODULES.map((module) => (
                  <Button
                    key={module.value}
                    variant={state.modules.includes(module.value) ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onToggleModule(user.id, module.value)}
                    aria-pressed={state.modules.includes(module.value)}
                    disabled={processingId === user.id}
                  >
                    {module.label}
                    <span className="ml-1 text-[10px] opacity-70">({module.description})</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onApprove(user.id)}
                disabled={processingId === user.id}
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                {processingId === user.id ? '승인 중' : '승인'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onReject(user.id)}
                disabled={processingId === user.id}
              >
                <UserX className="mr-1.5 h-3.5 w-3.5" />
                {processingId === user.id ? '처리 중' : '거절'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
