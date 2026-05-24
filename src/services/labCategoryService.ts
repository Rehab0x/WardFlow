import { db } from '@/db/database';
import type { LabDisplayCategory } from '@/db/database';
import { useSupabaseBackend } from '@/config/backend';
import {
  listLabCategories,
  replaceOwnLabCategories,
  resetOwnLabCategories,
} from '@/data/labCategories.repository';

/** Default categories matching the hospital's common lab panels */
export const DEFAULT_LAB_CATEGORIES: LabDisplayCategory[] = [
  {
    id: 'default-cbc',
    name: 'CBC',
    order: 0,
    items: ['WBC', 'RBC', 'Hb', 'Hct', 'MCV', 'MCH', 'MCHC', 'PLT'],
  },
  {
    id: 'default-diff',
    name: 'WBC Diff.',
    order: 1,
    items: ['Neutrophil', 'Lymphocyte', 'Monocyte', 'Eosinophil', 'Basophil', 'Large unstained cell'],
  },
  {
    id: 'default-lft',
    name: 'LFT',
    order: 2,
    items: [
      'Total Protein', 'Albumin',
      'AST (SGOT)', 'ALT (SGPT)', 'ALP', 'γ-GTP',
      'Total Cholesterol', 'LDL-Cholesterol', 'HDL-Cholesterol', 'TG',
      'BUN', 'Creatinine', 'Glucose', 'HbA1c',
    ],
  },
  {
    id: 'default-electrolyte',
    name: 'Electrolyte',
    order: 3,
    items: ['Na', 'K', 'Cl'],
  },
  {
    id: 'default-crp',
    name: 'CRP',
    order: 4,
    items: ['CRP', 'ESR', 'PCT'],
  },
  {
    id: 'default-ua',
    name: 'UA',
    order: 5,
    items: ['Color', 'Leukocyte', 'Occult Blood', 'Bilirubin', 'Urobilinogen', 'Ketone', 'Protein', 'Nitrite', 'Glucose (UA)', 'pH (UA)', 'S.G'],
  },
  {
    id: 'default-micro',
    name: 'Urine Sediment',
    order: 6,
    items: ['RBC (Micro)', 'WBC (Micro)', 'Epithelial cell', 'Bacteria', 'Cast', 'Crystal'],
  },
  {
    id: 'default-hbs',
    name: 'HBs',
    order: 7,
    items: ['HBs Ag', 'HBs Ab'],
  },
];

export const labCategoryService = {
  /** Load categories from DB. If empty, return defaults (without seeding DB). */
  async getAll(): Promise<LabDisplayCategory[]> {
    if (useSupabaseBackend) {
      const stored = await listLabCategories();
      return stored.length > 0 ? stored : DEFAULT_LAB_CATEGORIES;
    }

    const stored = await db.labCategories.orderBy('order').toArray();
    if (stored.length > 0) return stored;
    return DEFAULT_LAB_CATEGORIES;
  },

  /** Save all categories (replaces existing). */
  async saveAll(categories: LabDisplayCategory[]): Promise<void> {
    if (useSupabaseBackend) {
      await replaceOwnLabCategories(categories);
      return;
    }

    await db.transaction('rw', db.labCategories, async () => {
      await db.labCategories.clear();
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i]!;
        const record: LabDisplayCategory = {
          id: cat.id,
          name: cat.name,
          order: i,
          items: cat.items,
        };
        await db.labCategories.put(record);
      }
    });
  },

  /** Reset to defaults. */
  async resetToDefaults(): Promise<void> {
    if (useSupabaseBackend) {
      await resetOwnLabCategories();
      return;
    }

    await db.labCategories.clear();
  },

  /** Build a flat map: itemName (lowercase) → { categoryName, orderWithinCategory } */
  buildDisplayOrderMap(categories: LabDisplayCategory[]): Map<string, { category: string; order: number }> {
    const map = new Map<string, { category: string; order: number }>();
    for (const cat of categories) {
      cat.items.forEach((item, idx) => {
        const entry = { category: cat.name, order: cat.order * 1000 + idx };
        map.set(item.toLowerCase(), entry);

        // Also register the abbreviated name before " (" to handle short aliases.
        // e.g. "AST (SGOT)" → also registers "ast"
        //      "ALT (SGPT)" → also registers "alt"
        //      "Glucose (UA)" → also registers "glucose"
        const parenIdx = item.indexOf(' (');
        if (parenIdx > 0) {
          const shortKey = item.slice(0, parenIdx).toLowerCase();
          if (!map.has(shortKey)) map.set(shortKey, entry);
        }
      });
    }
    return map;
  },
};
