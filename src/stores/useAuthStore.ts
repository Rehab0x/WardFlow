import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/user';
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
import { fromUserProfile, loginIdentifierToEmail } from '@/mappers/userView.mapper';
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
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
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
          await registerProfile({
            email: loginIdentifierToEmail(input.username),
            password: input.password,
            username: input.username,
            displayName: input.name,
            department: input.department,
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
        signOut().catch(() => {
          // Local state is still cleared even if the remote sign-out request fails.
        });
        set({
          currentUser: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
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
      },

      clearError: () => {
        set({ error: null });
      },

      // Admin actions
      getPendingUsers: async () => {
        const profiles = await listPendingProfiles();
        return profiles.map(fromUserProfile);
      },

      getAllUsers: async () => {
        const profiles = await listProfiles();
        return profiles.map(fromUserProfile);
      },

      approveUser: async (userId: string, role: User['role'], modules: User['modules']) => {
        await approveProfile(userId, normalizeUserRole(role), normalizeWardModules(modules));
      },

      updateUserAccess: async (userId: string, role: User['role'], modules: User['modules']) => {
        await updateProfileAccess(userId, normalizeUserRole(role), normalizeWardModules(modules));
      },

      rejectUser: async (userId: string) => {
        await rejectProfile(userId);
      },

      deleteUser: async (userId: string) => {
        await rejectProfile(userId);
      },
    }),
    {
      name: 'wardflow-auth-supabase',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
