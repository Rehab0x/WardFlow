import type { Template, TemplateField } from '@/types/template';
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  listTemplatesByField,
  updateTemplate,
} from '@/data/templates.repository';

export type { TemplateField };

export const templateService = {
  getByField(field: TemplateField): Promise<Template[]> {
    return listTemplatesByField(field);
  },

  getAll(): Promise<Template[]> {
    return listTemplates();
  },

  async add(field: TemplateField, name: string, content: string): Promise<string> {
    const template = await createTemplate(field, name, content);
    return template.id;
  },

  async update(id: string, updates: Partial<Pick<Template, 'name' | 'content'>>): Promise<void> {
    await updateTemplate(id, updates);
  },

  async delete(id: string): Promise<void> {
    await deleteTemplate(id);
  },
};
