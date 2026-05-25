import { create } from 'zustand';

export type SettingsSyncState = 'idle' | 'pending' | 'saved' | 'error';

export interface SettingsSyncStatus {
  state: SettingsSyncState;
  error: string | null;
  updatedAt: number | null;
  version: number;
}

interface SettingsSyncStatusStore {
  statuses: Record<string, SettingsSyncStatus>;
  markPending: (key: string) => number;
  markSaved: (key: string, version?: number) => void;
  markError: (key: string, error: unknown, version?: number) => void;
  clearStatus: (key: string) => void;
  clearAll: () => void;
}

const defaultStatus: SettingsSyncStatus = {
  state: 'idle',
  error: null,
  updatedAt: null,
  version: 0,
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || '설정을 저장하지 못했습니다.');
}

function normalizeKey(key: string): string {
  return key.trim();
}

let nextVersion = 0;

export const useSettingsSyncStatusStore = create<SettingsSyncStatusStore>()((set) => ({
  statuses: {},

  markPending: (key) => {
    const statusKey = normalizeKey(key);
    if (!statusKey) return 0;

    const version = ++nextVersion;
    set((state) => ({
      statuses: {
        ...state.statuses,
        [statusKey]: {
          ...(state.statuses[statusKey] ?? defaultStatus),
          state: 'pending',
          error: null,
          updatedAt: Date.now(),
          version,
        },
      },
    }));
    return version;
  },

  markSaved: (key, version) => {
    const statusKey = normalizeKey(key);
    if (!statusKey) return;

    set((state) => ({
      statuses:
        typeof version === 'number' && state.statuses[statusKey]?.version !== version
          ? state.statuses
          : {
              ...state.statuses,
              [statusKey]: {
                state: 'saved',
                error: null,
                updatedAt: Date.now(),
                version: version ?? state.statuses[statusKey]?.version ?? ++nextVersion,
              },
            },
    }));
  },

  markError: (key, error, version) => {
    const statusKey = normalizeKey(key);
    if (!statusKey) return;

    set((state) => ({
      statuses:
        typeof version === 'number' && state.statuses[statusKey]?.version !== version
          ? state.statuses
          : {
              ...state.statuses,
              [statusKey]: {
                state: 'error',
                error: toErrorMessage(error),
                updatedAt: Date.now(),
                version: version ?? state.statuses[statusKey]?.version ?? ++nextVersion,
              },
            },
    }));
  },

  clearStatus: (key) =>
    set((state) => {
      const statusKey = normalizeKey(key);
      if (!statusKey) return state;

      const statuses = { ...state.statuses };
      delete statuses[statusKey];
      return { statuses };
    }),

  clearAll: () => {
    nextVersion = 0;
    set({ statuses: {} });
  },
}));
