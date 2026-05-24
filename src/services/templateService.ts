import { db } from '@/db/database';
import type { Template } from '@/db/database';
import { useSupabaseBackend } from '@/config/backend';
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  listTemplatesByField,
  updateTemplate,
} from '@/data/templates.repository';

export type TemplateField =
  | 'chiefComplaint'
  | 'onset'
  | 'presentIllness'
  | 'pastHistory'
  | 'reviewOfSystem'
  | 'physicalExam'
  | 'plan'
  | 'guardianExplanation'
  | 'etc'
  | 'global';

export const templateService = {
  async getByField(field: TemplateField): Promise<Template[]> {
    if (useSupabaseBackend) return listTemplatesByField(field);

    if (field === 'global') {
      return db.templates.where('field').equals('global').sortBy('name');
    }
    // Return field-specific + global templates
    const [fieldTemplates, globalTemplates] = await Promise.all([
      db.templates.where('field').equals(field).sortBy('name'),
      db.templates.where('field').equals('global').sortBy('name'),
    ]);
    return [...fieldTemplates, ...globalTemplates];
  },

  async getAll(): Promise<Template[]> {
    if (useSupabaseBackend) return listTemplates();

    return db.templates.orderBy('name').toArray();
  },

  async add(field: TemplateField, name: string, content: string): Promise<string> {
    if (useSupabaseBackend) {
      const template = await createTemplate(field, name, content);
      return template.id;
    }

    const template: Template = {
      id: crypto.randomUUID(),
      field,
      name,
      content,
      createdAt: new Date(),
    };
    await db.templates.add(template);
    return template.id;
  },

  async update(id: string, updates: Partial<Pick<Template, 'name' | 'content'>>): Promise<void> {
    if (useSupabaseBackend) {
      await updateTemplate(id, updates);
      return;
    }

    await db.templates.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    if (useSupabaseBackend) {
      await deleteTemplate(id);
      return;
    }

    await db.templates.delete(id);
  },
};
