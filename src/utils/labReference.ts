/**
 * Lab reference ranges.
 * Defaults are based on the hospital XLS format and can be overridden in Settings.
 */

interface LabReference {
  code: string;
  name: string;
  category:
    | 'CBC'
    | 'WBC Diff'
    | 'BC'
    | 'Chemistry'
    | 'Electrolyte'
    | 'LFT'
    | 'RFT'
    | 'Coagulation'
    | 'Cardiac'
    | 'Infection'
    | 'Thyroid'
    | 'UA'
    | 'Urine Sediment'
    | 'Serology'
    | 'Culture'
    | 'Other';
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  referenceText?: string;
}

export const LAB_REFERENCES: LabReference[] = [
  {
    code: 'B1050',
    name: 'WBC',
    category: 'CBC',
    unit: '×10³/μL',
    referenceMin: 4.0,
    referenceMax: 10.0,
  },
  {
    code: 'B1040',
    name: 'RBC',
    category: 'CBC',
    unit: '×10⁶/μL',
    referenceMin: 4.0,
    referenceMax: 6.0,
  },
  {
    code: 'B1010',
    name: 'Hb',
    category: 'CBC',
    unit: 'g/dL',
    referenceMin: 12.0,
    referenceMax: 16.0,
  },
  {
    code: 'B10201',
    name: 'Hct',
    category: 'CBC',
    unit: '%',
    referenceMin: 36.0,
    referenceMax: 47.0,
  },
  {
    code: 'B1060',
    name: 'PLT',
    category: 'CBC',
    unit: '×10³/μL',
    referenceMin: 150,
    referenceMax: 450,
  },
  { code: 'B1080', name: 'MCV', category: 'CBC', unit: 'fL', referenceMin: 80, referenceMax: 100 },
  { code: 'B1090', name: 'MCH', category: 'CBC', unit: 'pg', referenceMin: 27, referenceMax: 33 },
  {
    code: 'B1100',
    name: 'MCHC',
    category: 'CBC',
    unit: 'g/dL',
    referenceMin: 32,
    referenceMax: 36,
  },

  {
    code: 'B10911',
    name: 'Neutrophil',
    category: 'WBC Diff',
    unit: '%',
    referenceMin: 48,
    referenceMax: 75,
  },
  {
    code: 'B10912',
    name: 'Lymphocyte',
    category: 'WBC Diff',
    unit: '%',
    referenceMin: 15,
    referenceMax: 40,
  },
  {
    code: 'B10913',
    name: 'Monocyte',
    category: 'WBC Diff',
    unit: '%',
    referenceMin: 2,
    referenceMax: 11,
  },
  { code: 'B10914', name: 'Eosinophil', category: 'WBC Diff', unit: '%', referenceMax: 5 },
  { code: 'B10915', name: 'Basophil', category: 'WBC Diff', unit: '%', referenceMax: 2 },

  {
    code: 'B2500',
    name: 'Total Protein',
    category: 'BC',
    unit: 'g/dL',
    referenceMin: 6.6,
    referenceMax: 8.3,
  },
  {
    code: 'B2510',
    name: 'Albumin',
    category: 'BC',
    unit: 'g/dL',
    referenceMin: 3.5,
    referenceMax: 5.2,
  },
  { code: 'B2570', name: 'AST (SGOT)', category: 'BC', unit: 'U/L', referenceMax: 40 },
  { code: 'B2580', name: 'ALT (SGPT)', category: 'BC', unit: 'U/L', referenceMax: 41 },
  { code: 'B2602', name: 'ALP', category: 'BC', unit: 'U/L', referenceMin: 30, referenceMax: 120 },
  { code: 'B2710', name: 'γ-GTP', category: 'BC', unit: 'U/L', referenceMax: 38 },
  {
    code: 'B2730',
    name: 'BUN',
    category: 'BC',
    unit: 'mg/dL',
    referenceMin: 8.0,
    referenceMax: 23.0,
  },
  {
    code: 'B2740',
    name: 'Creatinine',
    category: 'BC',
    unit: 'mg/dL',
    referenceMin: 0.5,
    referenceMax: 1.2,
  },
  {
    code: 'B2521',
    name: 'Glucose',
    category: 'BC',
    unit: 'mg/dL',
    referenceMin: 70,
    referenceMax: 99,
  },
  { code: 'B1270', name: 'HbA1c', category: 'BC', unit: '%', referenceMin: 4.0, referenceMax: 6.0 },
  {
    code: 'B2790',
    name: 'Na',
    category: 'BC',
    unit: 'mmol/L',
    referenceMin: 136,
    referenceMax: 145,
  },
  {
    code: 'B2800',
    name: 'K',
    category: 'BC',
    unit: 'mmol/L',
    referenceMin: 3.5,
    referenceMax: 5.5,
  },
  {
    code: 'B2810',
    name: 'Cl',
    category: 'BC',
    unit: 'mmol/L',
    referenceMin: 101,
    referenceMax: 109,
  },
  { code: 'B2561', name: 'Total Cholesterol', category: 'BC', unit: 'mg/dL', referenceMax: 200 },
  { code: 'A0118', name: 'LDL-Cholesterol', category: 'BC', unit: 'mg/dL', referenceMax: 100 },
  { code: 'B2910', name: 'HDL-Cholesterol', category: 'BC', unit: 'mg/dL', referenceMin: 40 },
  { code: 'B2903', name: 'TG', category: 'BC', unit: 'mg/dL', referenceMax: 150 },
  { code: 'B4621', name: 'CRP', category: 'BC', unit: 'mg/dL', referenceMax: 0.5 },
  { code: 'B4710', name: 'ESR', category: 'BC', unit: 'mm/hr', referenceMax: 20 },
  { code: 'B4800', name: 'PCT', category: 'BC', unit: 'ng/mL', referenceMax: 0.5 },
  { code: 'B4810', name: 'Ferritin', category: 'BC', unit: 'ng/mL' },

  {
    code: 'B00309',
    name: 'pH (UA)',
    category: 'UA',
    unit: '',
    referenceMin: 5.0,
    referenceMax: 8.0,
  },
  {
    code: 'B003010',
    name: 'S.G',
    category: 'UA',
    unit: '',
    referenceMin: 1.005,
    referenceMax: 1.03,
  },
  {
    code: 'B00411',
    name: 'RBC (Micro)',
    category: 'Urine Sediment',
    unit: '/HPF',
    referenceMax: 3,
  },
  {
    code: 'B00412',
    name: 'WBC (Micro)',
    category: 'Urine Sediment',
    unit: '/HPF',
    referenceMax: 3,
  },
  {
    code: 'B00413',
    name: 'Epithelial cell',
    category: 'Urine Sediment',
    unit: '',
    referenceMax: 3,
  },

  {
    code: 'B1210',
    name: 'PT (INR)',
    category: 'Coagulation',
    unit: 'INR',
    referenceMin: 0.8,
    referenceMax: 1.2,
  },
  {
    code: 'B1220',
    name: 'aPTT',
    category: 'Coagulation',
    unit: 'sec',
    referenceMin: 25,
    referenceMax: 35,
  },
  { code: 'B1230', name: 'D-dimer', category: 'Coagulation', unit: 'μg/mL' },
  {
    code: 'B4110',
    name: 'TSH',
    category: 'Thyroid',
    unit: 'μIU/mL',
    referenceMin: 0.4,
    referenceMax: 4.0,
  },
  {
    code: 'B4120',
    name: 'Free T4',
    category: 'Thyroid',
    unit: 'ng/dL',
    referenceMin: 0.8,
    referenceMax: 1.8,
  },
  {
    code: 'B4130',
    name: 'T3',
    category: 'Thyroid',
    unit: 'ng/dL',
    referenceMin: 2.3,
    referenceMax: 4.2,
  },
];

export function getLabReference(code: string): LabReference | undefined {
  const normalized = code.trim().toLowerCase();
  return LAB_REFERENCES.find((ref) => ref.code.toLowerCase() === normalized);
}

export function getLabReferenceByName(name: string): LabReference | undefined {
  const normalized = normalizeReferenceName(name);
  return LAB_REFERENCES.find((ref) => normalizeReferenceName(ref.name) === normalized);
}

export function getLabReferencesByCategory(category: string): LabReference[] {
  return LAB_REFERENCES.filter((ref) => ref.category === category);
}

export function isValueNormal(value: number | string, reference: LabReference): boolean {
  if (typeof value === 'string') return true;
  const { referenceMin, referenceMax } = reference;
  if (referenceMin === undefined && referenceMax === undefined) return true;
  if (referenceMin !== undefined && referenceMax === undefined) return value >= referenceMin;
  if (referenceMin === undefined && referenceMax !== undefined) return value <= referenceMax;
  return value >= referenceMin! && value <= referenceMax!;
}

export function getHLFlag(value: number | string, reference: LabReference): 'H' | 'L' | undefined {
  if (typeof value === 'string') return undefined;
  const { referenceMin, referenceMax } = reference;
  if (referenceMax !== undefined && value > referenceMax) return 'H';
  if (referenceMin !== undefined && value < referenceMin) return 'L';
  return undefined;
}

function normalizeReferenceName(name: string) {
  return name.trim().toLowerCase();
}
