import { create } from 'zustand';
import type { LabItem, LabResult, LabTrendData } from '@/types/lab';
import { useAuthStore } from './useAuthStore';
import {
  createLabResult,
  type LabItemValueMetadata,
  listLabsByPatient,
  softDeleteLabResult,
  updateLabItemValue as updateLabItemValueRow,
} from '@/data/labs.repository';
import { fromDomainLabResult, toDomainLabItemCreateInput } from '@/mappers/clinicalView.mapper';
import { formatUserFacingError } from '@/lib/errorMessages';
import { removeById, replaceById, upsertById } from './storeUtils';
import { formatDate } from '@/utils/dateUtils';

interface LabStore {
  labs: LabResult[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchLabsByPatient: (patientId: string) => Promise<void>;
  addLabResult: (
    patientId: string,
    category: string,
    items: LabItem[],
    testDate: Date,
    source?: 'manual' | 'parsed' | 'csv' | 'xls'
  ) => Promise<string>;
  deleteLabResult: (id: string) => Promise<void>;
  updateLabItemValue: (
    patientId: string,
    date: string,
    itemName: string,
    newValue: string | number,
    metadata?: LabItemValueMetadata
  ) => Promise<void>;
  getLabTrendData: (
    patientId: string,
    itemCode: string,
    itemName: string
  ) => Promise<LabTrendData | null>;
}

export const useLabStore = create<LabStore>((set) => ({
  labs: [],
  isLoading: false,
  error: null,

  fetchLabsByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const labs = (await listLabsByPatient(patientId)).map(fromDomainLabResult);
      set({ labs, isLoading: false });
    } catch (error) {
      set({
        error: formatUserFacingError(error, 'Lab 결과를 불러오지 못했습니다.'),
        isLoading: false,
      });
    }
  },

  addLabResult: async (patientId, category, items, testDate, source = 'manual') => {
    try {
      const { currentUser } = useAuthStore.getState();
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      const labResult = await createLabResult({
        patientId,
        category,
        items: items.map((item, index) => toDomainLabItemCreateInput(item, index)),
        testDate,
        source,
        createdBy: currentUser.id,
      });
      const viewLab = fromDomainLabResult(labResult);
      set((state) => ({
        labs: upsertById(state.labs, viewLab),
      }));
      return viewLab.id;
    } catch (error) {
      set({
        error: formatUserFacingError(error, 'Lab 결과를 추가하지 못했습니다.'),
      });
      throw error;
    }
  },

  deleteLabResult: async (id: string) => {
    try {
      await softDeleteLabResult(id);
      set((state) => ({
        labs: removeById(state.labs, id),
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, 'Lab 결과를 삭제하지 못했습니다.'),
      });
      throw error;
    }
  },

  updateLabItemValue: async (
    patientId: string,
    date: string,
    itemName: string,
    newValue: string | number,
    metadata?: LabItemValueMetadata
  ) => {
    try {
      const updatedLab = await updateLabItemValueRow({
        patientId,
        date,
        itemName,
        newValue,
        metadata,
      });
      if (!updatedLab) return;

      const viewLab = fromDomainLabResult(updatedLab);
      set((state) => {
        const exists = state.labs.some((lab) => lab.id === viewLab.id);
        if (!exists) return { labs: [viewLab, ...state.labs] };
        return { labs: replaceById(state.labs, viewLab.id, viewLab) };
      });
    } catch (error) {
      set({
        error: formatUserFacingError(error, 'Lab 항목을 수정하지 못했습니다.'),
      });
      throw error;
    }
  },

  getLabTrendData: async (patientId: string, itemCode: string, itemName: string) => {
    try {
      const allLabs = await listLabsByPatient(patientId);
      const dataPoints: LabTrendData['dataPoints'] = [];
      let unit = '';
      let referenceMin: number | undefined;
      let referenceMax: number | undefined;

      for (const lab of allLabs) {
        const item = lab.items.find(
          (i) => (itemCode && i.code === itemCode) || i.name === itemName
        );

        if (!item) continue;

        if (!unit && item.unit) unit = item.unit;
        if (referenceMin === undefined && item.referenceMin !== undefined) {
          referenceMin = item.referenceMin;
        }
        if (referenceMax === undefined && item.referenceMax !== undefined) {
          referenceMax = item.referenceMax;
        }

        dataPoints.push({
          date: formatDate(lab.testDate),
          value: item.valueNumeric ?? item.valueText,
          isAbnormal: item.isAbnormal,
          hlFlag: item.hlFlag,
        });
      }

      if (dataPoints.length === 0) return null;

      dataPoints.sort((a, b) => a.date.localeCompare(b.date));
      return { itemCode, itemName, unit, referenceMin, referenceMax, dataPoints };
    } catch (error) {
      console.error('Lab 추세 데이터를 불러오지 못했습니다:', error);
      return null;
    }
  },
}));
