import { create } from 'zustand';
import type {
  AlertEvent,
  AlertRule,
  AlertRuleCreateInput,
  AlertRuleUpdateInput,
} from '@/domain/alert';
import {
  acknowledgeAlertEvent,
  createAlertRule,
  deleteAcknowledgedAlertEvents,
  deleteAlertEvent,
  deleteAlertRule,
  insertNewAlertEvents,
  listAlertEvents,
  listAlertRules,
  updateAlertRule,
} from '@/data/alerts.repository';
import { evaluateAlertRules, findOpenLabBreaches } from '@/services/alertEngine';
import { formatUserFacingError } from '@/lib/errorMessages';
import type { AlertLabResult, OpenLabBreach } from '@/services/alertEngine';
import type { Medication } from '@/types/medication';
import type { Patient } from '@/types/patient';
import { removeById, replaceById, upsertById } from './storeUtils';

interface AlertStore {
  rules: AlertRule[];
  events: AlertEvent[];
  /**
   * 마지막 평가 시점 기준으로 **지금도 열려 있는** Lab 임계값 위반.
   * 이벤트 기록(events)과 달리 다음 검사에서 값이 돌아오면 사라진다.
   */
  openLabBreaches: OpenLabBreach[];
  isLoading: boolean;
  error: string | null;

  fetchRules: () => Promise<void>;
  addRule: (input: Omit<AlertRuleCreateInput, 'ownerId'>, ownerId: string) => Promise<void>;
  editRule: (id: string, input: AlertRuleUpdateInput) => Promise<void>;
  removeRule: (id: string) => Promise<void>;

  fetchEvents: (options?: { unacknowledgedOnly?: boolean }) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  clearAcknowledged: () => Promise<void>;

  /** 규칙을 지금 데이터에 대해 평가하고, 새로 발생한 알림만 저장한다. */
  evaluate: (input: {
    ownerId: string;
    patients: Patient[];
    labResults: AlertLabResult[];
    medications: Medication[];
  }) => Promise<void>;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  rules: [],
  events: [],
  openLabBreaches: [],
  isLoading: false,
  error: null,

  fetchRules: async () => {
    set({ isLoading: true, error: null });
    try {
      set({ rules: await listAlertRules(), isLoading: false });
    } catch (error) {
      set({
        error: formatUserFacingError(error, '알림 규칙을 불러오지 못했습니다.'),
        isLoading: false,
      });
    }
  },

  addRule: async (input, ownerId) => {
    try {
      const rule = await createAlertRule({ ...input, ownerId });
      set((state) => ({ rules: upsertById(state.rules, rule, 'append'), error: null }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '알림 규칙을 추가하지 못했습니다.') });
      throw error;
    }
  },

  editRule: async (id, input) => {
    try {
      const rule = await updateAlertRule(id, input);
      set((state) => ({ rules: replaceById(state.rules, id, rule), error: null }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '알림 규칙을 수정하지 못했습니다.') });
      throw error;
    }
  },

  removeRule: async (id) => {
    try {
      await deleteAlertRule(id);
      set((state) => ({ rules: removeById(state.rules, id), error: null }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '알림 규칙을 삭제하지 못했습니다.') });
      throw error;
    }
  },

  fetchEvents: async (options) => {
    set({ isLoading: true, error: null });
    try {
      set({ events: await listAlertEvents(options), isLoading: false });
    } catch (error) {
      set({
        error: formatUserFacingError(error, '알림 기록을 불러오지 못했습니다.'),
        isLoading: false,
      });
    }
  },

  acknowledge: async (id) => {
    try {
      const event = await acknowledgeAlertEvent(id);
      set((state) => ({ events: replaceById(state.events, id, event), error: null }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '알림을 확인 처리하지 못했습니다.') });
      throw error;
    }
  },

  removeEvent: async (id) => {
    try {
      await deleteAlertEvent(id);
      set((state) => ({ events: removeById(state.events, id), error: null }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '알림을 삭제하지 못했습니다.') });
      throw error;
    }
  },

  clearAcknowledged: async () => {
    try {
      await deleteAcknowledgedAlertEvents();
      set((state) => ({
        events: state.events.filter((event) => !event.acknowledgedAt),
        error: null,
      }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '알림 기록을 정리하지 못했습니다.') });
      throw error;
    }
  },

  evaluate: async ({ ownerId, patients, labResults, medications }) => {
    const { rules } = get();
    if (rules.length === 0) return;

    // "지금도 문제인가"는 알림 저장과 무관하게 매 평가마다 새로 계산한다.
    set({ openLabBreaches: findOpenLabBreaches({ rules, labResults }) });

    const candidates = evaluateAlertRules({ ownerId, rules, patients, labResults, medications });
    if (candidates.length === 0) return;

    try {
      // 중복은 DB 유니크 제약이 걸러낸다. 새로 저장된 것만 돌아온다.
      const created = await insertNewAlertEvents(candidates);
      if (created.length === 0) return;
      set((state) => ({
        events: created.reduce((items, event) => upsertById(items, event, 'prepend'), state.events),
        error: null,
      }));
    } catch (error) {
      // 알림 평가 실패가 Today 로딩을 막아서는 안 된다.
      set({ error: formatUserFacingError(error, '알림을 평가하지 못했습니다.') });
    }
  },
}));
