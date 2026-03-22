import { db } from '@/db/database';
import type { Template } from '@/db/database';

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
    return db.templates.orderBy('name').toArray();
  },

  async add(field: TemplateField, name: string, content: string): Promise<string> {
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
    await db.templates.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    await db.templates.delete(id);
  },
};
