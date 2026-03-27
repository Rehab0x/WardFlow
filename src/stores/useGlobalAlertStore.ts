import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GlobalAlert {
  id: string;
  content: string;
  startDate?: string; // YYYY-MM-DD, undefined = 항상 표시
  endDate?: string;   // YYYY-MM-DD, undefined = 무기한
  createdAt: string;
}

interface GlobalAlertStore {
  alerts: GlobalAlert[];
  addAlert: (content: string, startDate?: string, endDate?: string) => void;
  updateAlert: (id: string, updates: Partial<Pick<GlobalAlert, 'content' | 'startDate' | 'endDate'>>) => void;
  deleteAlert: (id: string) => void;
  getActiveAlerts: () => GlobalAlert[];
}

export const useGlobalAlertStore = create<GlobalAlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: (content, startDate, endDate) => {
        const alert: GlobalAlert = {
          id: `ga-${Date.now()}`,
          content,
          startDate,
          endDate,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ alerts: [...state.alerts, alert] }));
      },

      updateAlert: (id, updates) => {
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }));
      },

      deleteAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
      },

      getActiveAlerts: () => {
        const today = new Date().toISOString().split('T')[0]!;
        return get().alerts.filter((a) => {
          if (a.startDate && today < a.startDate) return false;
          if (a.endDate && today > a.endDate) return false;
          return true;
        });
      },
    }),
    {
      name: 'wardflow-global-alerts',
    }
  )
);
