import { create } from 'zustand';
import type { Template } from '@/db/database';
import { templateService, type TemplateField } from '@/services/templateService';

interface TemplateStore {
  templates: Template[];
  isLoading: boolean;

  fetchAll: () => Promise<void>;
  fetchByField: (field: TemplateField) => Promise<void>;
  addTemplate: (field: TemplateField, name: string, content: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<Pick<Template, 'name' | 'content'>>) => Promise<void>;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true });
    const templates = await templateService.getAll();
    set({ templates, isLoading: false });
  },

  fetchByField: async (field) => {
    set({ isLoading: true });
    const templates = await templateService.getByField(field);
    set({ templates, isLoading: false });
  },

  addTemplate: async (field, name, content) => {
    await templateService.add(field, name, content);
    await get().fetchAll();
  },

  deleteTemplate: async (id) => {
    await templateService.delete(id);
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
  },

  updateTemplate: async (id, updates) => {
    await templateService.update(id, updates);
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },
}));
