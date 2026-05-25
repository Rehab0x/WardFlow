import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db/database';
import type { User } from '@/types/user';
import { useSupabaseBackend } from '@/config/backend';
import {
  approveProfile,
  getCurrentProfile,
  listPendingProfiles,
  listProfiles,
  registerProfile,
  rejectProfile,
  signInWithEmail,
  signOut,
  updateProfileAccess,
} from '@/data/auth.repository';
import { normalizeUserRole, normalizeWardModules } from '@/lib/adminAccess';
import { fromUserProfile, loginIdentifierToEmail } from '@/mappers/legacyUser.mapper';
import { formatUserFacingError } from '@/lib/errorMessages';

interface RegisterInput {
  name: string;
  username: string;
  password: string;
  department: string;
}

interface AuthStore {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;

  // Admin actions
  getPendingUsers: () => Promise<User[]>;
  getAllUsers: () => Promise<User[]>;
  approveUser: (userId: string, role: User['role'], modules: User['modules']) => Promise<void>;
  updateUserAccess: (userId: string, role: User['role'], modules: User['modules']) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          if (useSupabaseBackend) {
            const profile = await signInWithEmail(loginIdentifierToEmail(username), password);
            if (!profile) throw new Error('프로필을 찾을 수 없습니다.');
            if (profile.status === 'pending') {
              throw new Error('가입 승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다.');
            }
            if (profile.status === 'rejected') {
              throw new Error('가입 요청이 거절되었습니다. 관리자에게 문의하세요.');
            }

            set({
              currentUser: { ...fromUserProfile(profile), lastLoginAt: new Date() },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return;
          }

          // Find user by username
          const user = await db.users.where('username').equals(username).first();

          if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
          }

          // Check approval status
          if (user.status === 'pending') {
            throw new Error('가입 승인 대기 중입니다. 관리자의 승인을 기다려주세요.');
          }
          if (user.status === 'rejected') {
            throw new Error('가입 요청이 거절되었습니다. 관리자에게 문의하세요.');
          }

          // Get auth credentials
          const credentials = await db.authCredentials.get(user.id);

          if (!credentials) {
            throw new Error('인증 정보를 찾을 수 없습니다.');
          }

          // Simple password comparison (in production, use bcrypt)
          if (credentials.passwordHash !== password) {
            throw new Error('비밀번호가 일치하지 않습니다.');
          }

          // Update last login
          await db.users.update(user.id, {
            lastLoginAt: new Date(),
          });

          // Set authenticated state
          set({
            currentUser: { ...user, lastLoginAt: new Date() },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: formatUserFacingError(error, '로그인에 실패했습니다.'),
            isLoading: false,
            isAuthenticated: false,
            currentUser: null,
          });
          throw error;
        }
      },

      register: async (input: RegisterInput) => {
        set({ isLoading: true, error: null });

        try {
          if (useSupabaseBackend) {
            await registerProfile({
              email: loginIdentifierToEmail(input.username),
              password: input.password,
              username: input.username,
              displayName: input.name,
              department: input.department,
            });

            set({ isLoading: false, error: null });
            return;
          }

          // Check duplicate username
          const existing = await db.users.where('username').equals(input.username).first();
          if (existing) {
            throw new Error('이미 사용 중인 아이디입니다.');
          }

          const now = new Date();
          const userId = crypto.randomUUID();

          // 첫 번째 가입자는 자동으로 admin + approved 처리
          const userCount = await db.users.count();
          const isFirstUser = userCount === 0;

          const newUser: User = {
            id: userId,
            username: input.username,
            name: input.name,
            role: isFirstUser ? 'admin' : 'doctor',
            department: input.department,
            status: isFirstUser ? 'approved' : 'pending',
            modules: isFirstUser ? ['wardflow'] : [],
            createdAt: now,
            updatedAt: now,
          };

          await db.users.add(newUser);

          await db.authCredentials.add({
            userId,
            passwordHash: input.password, // MVP: plaintext (NOT SECURE)
            createdAt: now,
            updatedAt: now,
          });

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            error: formatUserFacingError(error, '회원가입에 실패했습니다.'),
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        if (useSupabaseBackend) {
          signOut().catch(() => {
            // Local state is still cleared even if the remote sign-out request fails.
          });
        }
        set({
          currentUser: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        if (useSupabaseBackend) {
          try {
            const profile = await getCurrentProfile();
            if (!profile || profile.status !== 'approved') {
              set({ currentUser: null, isAuthenticated: false });
              return;
            }

            set({
              currentUser: fromUserProfile(profile),
              isAuthenticated: true,
            });
          } catch {
            set({ currentUser: null, isAuthenticated: false });
          }
          return;
        }

        const { currentUser } = get();

        if (!currentUser) {
          set({ isAuthenticated: false });
          return;
        }

        // Verify user still exists and is approved
        try {
          const user = await db.users.get(currentUser.id);
          if (!user || user.status !== 'approved') {
            set({
              currentUser: null,
              isAuthenticated: false,
            });
          } else {
            set({
              currentUser: user,
              isAuthenticated: true,
            });
          }
        } catch (error) {
          set({
            currentUser: null,
            isAuthenticated: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      // Admin actions
      getPendingUsers: async () => {
        if (useSupabaseBackend) {
          const profiles = await listPendingProfiles();
          return profiles.map(fromUserProfile);
        }

        return await db.users.where('status').equals('pending').toArray();
      },

      approveUser: async (userId: string, role: User['role'], modules: User['modules']) => {
        const normalizedRole = normalizeUserRole(role);
        const normalizedModules = normalizeWardModules(modules);

        if (useSupabaseBackend) {
          await approveProfile(userId, normalizedRole, normalizedModules);
          return;
        }

        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'admin') {
          throw new Error('관리자만 승인할 수 있습니다.');
        }

        const now = new Date();
        await db.users.update(userId, {
          status: 'approved',
          role: normalizedRole,
          modules: normalizedModules,
          approvedBy: currentUser.id,
          approvedAt: now,
          updatedAt: now,
        });
      },

      updateUserAccess: async (userId: string, role: User['role'], modules: User['modules']) => {
        const normalizedRole = normalizeUserRole(role);
        const normalizedModules = normalizeWardModules(modules);

        if (useSupabaseBackend) {
          await updateProfileAccess(userId, normalizedRole, normalizedModules);
          return;
        }

        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'admin') {
          throw new Error('관리자만 권한을 변경할 수 있습니다.');
        }
        if (userId === currentUser.id) {
          throw new Error('본인 계정 권한은 변경할 수 없습니다.');
        }

        await db.users.update(userId, {
          role: normalizedRole,
          modules: normalizedModules,
          updatedAt: new Date(),
        });
      },

      rejectUser: async (userId: string) => {
        if (useSupabaseBackend) {
          await rejectProfile(userId);
          return;
        }

        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'admin') {
          throw new Error('관리자만 거절할 수 있습니다.');
        }

        await db.users.update(userId, {
          status: 'rejected',
          updatedAt: new Date(),
        });
      },

      getAllUsers: async () => {
        if (useSupabaseBackend) {
          const profiles = await listProfiles();
          return profiles.map(fromUserProfile);
        }

        return await db.users.toArray();
      },

      deleteUser: async (userId: string) => {
        if (useSupabaseBackend) {
          await rejectProfile(userId);
          return;
        }

        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'admin') {
          throw new Error('관리자만 회원을 삭제할 수 있습니다.');
        }
        if (userId === currentUser.id) {
          throw new Error('본인 계정은 삭제할 수 없습니다.');
        }

        // Delete auth credentials and user
        await db.authCredentials.delete(userId);
        await db.users.delete(userId);
      },
    }),
    {
      name: useSupabaseBackend ? 'wardflow-auth-supabase' : 'wardflow-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
