import { create } from 'zustand';
import { db } from '@/db/database';
import type { LabResult, LabItem } from '@/types/lab';
import type { LabTrendData } from '@/types/lab';
import { useSupabaseBackend } from '@/config/backend';
import { useAuthStore } from './useAuthStore';
import {
  createLabResult as createSupabaseLabResult,
  listLabsByPatient as listSupabaseLabsByPatient,
  softDeleteLabResult as softDeleteSupabaseLabResult,
  updateLabItemValue as updateSupabaseLabItemValue,
} from '@/data/labs.repository';
import {
  fromDomainLabResult,
  toDomainLabItemCreateInput,
} from '@/mappers/legacyClinical.mapper';

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
  updateLabItemValue: (patientId: string, date: string, itemName: string, newValue: string | number) => Promise<void>;
  getLabTrendData: (patientId: string, itemCode: string, itemName: string) => Promise<LabTrendData | null>;
}

export const useLabStore = create<LabStore>((set) => ({
  labs: [],
  isLoading: false,
  error: null,

  fetchLabsByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      if (useSupabaseBackend) {
        const labs = await listSupabaseLabsByPatient(patientId);
        set({ labs: labs.map(fromDomainLabResult), isLoading: false });
        return;
      }

      const labs = await db.labResults
        .where('patientId')
        .equals(patientId)
        .reverse() // Most recent first
        .sortBy('testDate');

      set({ labs: labs.reverse(), isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch lab results',
        isLoading: false,
      });
    }
  },

  addLabResult: async (patientId, category, items, testDate, source = 'manual') => {
    try {
      if (useSupabaseBackend) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('User not authenticated');
        const labResult = await createSupabaseLabResult({
          patientId,
          category,
          items: items.map((item, index) => toDomainLabItemCreateInput(item, index)),
          testDate,
          source,
          createdBy: currentUser.id,
        });
        const legacyLab = fromDomainLabResult(labResult);
        set((state) => ({
          labs: [legacyLab, ...state.labs],
        }));
        return legacyLab.id;
      }

      const id = `lab${Date.now()}`;
      const now = new Date();

      const labResult: LabResult = {
        id,
        patientId,
        testDate,
        category,
        items,
        source,
        createdAt: now,
      };

      await db.labResults.add(labResult);

      // Update local state
      set((state) => ({
        labs: [labResult, ...state.labs],
      }));

      return id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add lab result',
      });
      throw error;
    }
  },

  deleteLabResult: async (id: string) => {
    try {
      if (useSupabaseBackend) {
        await softDeleteSupabaseLabResult(id);
        set((state) => ({
          labs: state.labs.filter((lab) => lab.id !== id),
        }));
        return;
      }

      await db.labResults.delete(id);

      // Update local state
      set((state) => ({
        labs: state.labs.filter((lab) => lab.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete lab result',
      });
      throw error;
    }
  },

  updateLabItemValue: async (patientId: string, date: string, itemName: string, newValue: string | number) => {
    try {
      if (useSupabaseBackend) {
        await updateSupabaseLabItemValue({ patientId, date, itemName, newValue });
        const labs = await listSupabaseLabsByPatient(patientId);
        set({ labs: labs.map(fromDomainLabResult) });
        return;
      }

      // Find the lab result matching patient + date + item
      const allLabs = await db.labResults
        .where('patientId')
        .equals(patientId)
        .toArray();

      // 순수 숫자 판별 (공백 trim 후 -?digits.digits 만 허용)
      // "1+", "2+", "+", "trace" 같은 질적 값은 문자열로 유지
      const PURE_NUMERIC = /^-?\d+(\.\d+)?$/;
      const valueStr = typeof newValue === 'string' ? newValue.trim() : String(newValue);
      const isNumeric = PURE_NUMERIC.test(valueStr);
      const numVal = isNumeric ? parseFloat(valueStr) : NaN;

      // Find labs matching date
      let targetLab: LabResult | undefined;
      let itemIndex = -1;

      for (const lab of allLabs) {
        const labDateKey = `${lab.testDate.getFullYear()}-${String(lab.testDate.getMonth() + 1).padStart(2, '0')}-${String(lab.testDate.getDate()).padStart(2, '0')}`;
        if (labDateKey !== date) continue;

        const idx = lab.items.findIndex((i) => i.name === itemName);
        if (idx !== -1) {
          targetLab = lab;
          itemIndex = idx;
          break;
        }
        // Remember first non-Culture lab on that date as fallback for adding new item
        if (!targetLab && lab.category !== 'Culture') targetLab = lab;
      }

      if (targetLab && itemIndex !== -1) {
        // If value is empty, remove the item
        if (valueStr === '') {
          const updatedItems = targetLab.items.filter((_, i) => i !== itemIndex);
          await db.labResults.update(targetLab.id, { items: updatedItems });
          set((state) => ({
            labs: state.labs.map((l) =>
              l.id === targetLab!.id ? { ...l, items: updatedItems } : l
            ),
          }));
          return;
        }

        // Update existing item with recalculated abnormal flags
        const updatedItems = [...targetLab.items];
        const existingItem = updatedItems[itemIndex]!;
        const refMin = existingItem.referenceMin;
        const refMax = existingItem.referenceMax;
        updatedItems[itemIndex] = {
          ...existingItem,
          value: isNumeric ? numVal : valueStr,
          isAbnormal: isNumeric
            ? (refMin !== undefined && (numVal as number) < refMin) ||
              (refMax !== undefined && (numVal as number) > refMax)
            : false,
          hlFlag: isNumeric
            ? (refMax !== undefined && (numVal as number) > refMax ? 'H'
              : refMin !== undefined && (numVal as number) < refMin ? 'L'
              : undefined)
            : undefined,
        };

        await db.labResults.update(targetLab.id, { items: updatedItems });

        set((state) => ({
          labs: state.labs.map((l) =>
            l.id === targetLab!.id ? { ...l, items: updatedItems } : l
          ),
        }));
      } else if (targetLab) {
        // Add new item to existing non-Culture lab result on that date
        const newItem: LabItem = {
          name: itemName,
          value: isNumeric ? numVal : valueStr,
          unit: '',
          isAbnormal: false,
        };
        const updatedItems = [...targetLab.items, newItem];
        await db.labResults.update(targetLab.id, { items: updatedItems });
        set((state) => ({
          labs: state.labs.map((l) =>
            l.id === targetLab!.id ? { ...l, items: updatedItems } : l
          ),
        }));
      } else {
        // No non-Culture lab result on that date — create a new one
        const [y, m, d] = date.split('-').map(Number);
        const testDate = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
        const newId = `lab${Date.now()}`;
        const newItem: LabItem = {
          name: itemName,
          value: isNumeric ? numVal : valueStr,
          unit: '',
          isAbnormal: false,
        };
        const newLab: LabResult = {
          id: newId,
          patientId,
          testDate,
          category: 'Other',
          items: [newItem],
          source: 'manual',
          createdAt: new Date(),
        };
        await db.labResults.add(newLab);
        set((state) => ({
          labs: [...state.labs, newLab],
        }));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update lab item',
      });
      throw error;
    }
  },

  getLabTrendData: async (patientId: string, itemCode: string, itemName: string) => {
    try {
      if (useSupabaseBackend) {
        const allLabs = await listSupabaseLabsByPatient(patientId);
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

          const dateKey = `${lab.testDate.getFullYear()}-${String(lab.testDate.getMonth() + 1).padStart(2, '0')}-${String(lab.testDate.getDate()).padStart(2, '0')}`;
          dataPoints.push({
            date: dateKey,
            value: item.valueNumeric ?? item.valueText,
            isAbnormal: item.isAbnormal,
            hlFlag: item.hlFlag,
          });
        }

        if (dataPoints.length === 0) return null;
        return { itemCode, itemName, unit, referenceMin, referenceMax, dataPoints };
      }

      // Fetch all lab results for this patient
      const allLabs = await db.labResults
        .where('patientId')
        .equals(patientId)
        .sortBy('testDate');

      // Extract data points for the specific item
      const dataPoints: LabTrendData['dataPoints'] = [];
      let unit = '';
      let referenceMin: number | undefined;
      let referenceMax: number | undefined;

      for (const lab of allLabs) {
        const item = lab.items.find(
          (i) => (itemCode && i.code === itemCode) || i.name === itemName
        );

        if (item) {
          // Set unit and reference range from first occurrence
          if (!unit && item.unit) {
            unit = item.unit;
          }
          if (referenceMin === undefined && item.referenceMin !== undefined) {
            referenceMin = item.referenceMin;
          }
          if (referenceMax === undefined && item.referenceMax !== undefined) {
            referenceMax = item.referenceMax;
          }

          // Use local date to avoid timezone shift (toISOString uses UTC)
          const td = lab.testDate;
          const localDate = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`;
          dataPoints.push({
            date: localDate,
            value: item.value,
            isAbnormal: item.isAbnormal,
            hlFlag: item.hlFlag,
          });
        }
      }

      if (dataPoints.length === 0) {
        return null;
      }

      return {
        itemCode,
        itemName,
        unit,
        referenceMin,
        referenceMax,
        dataPoints,
      };
    } catch (error) {
      console.error('Failed to get lab trend data:', error);
      return null;
    }
  },
}));
