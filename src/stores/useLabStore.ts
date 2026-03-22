import { create } from 'zustand';
import { db } from '@/db/database';
import type { LabResult, LabItem } from '@/types/lab';
import type { LabTrendData } from '@/types/lab';

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
  getLabTrendData: (patientId: string, itemCode: string, itemName: string) => Promise<LabTrendData | null>;
}

export const useLabStore = create<LabStore>((set) => ({
  labs: [],
  isLoading: false,
  error: null,

  fetchLabsByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
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

  getLabTrendData: async (patientId: string, itemCode: string, itemName: string) => {
    try {
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
          (i) => i.code === itemCode || i.name === itemName
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

          dataPoints.push({
            date: lab.testDate.toISOString().split('T')[0] ?? '',
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
