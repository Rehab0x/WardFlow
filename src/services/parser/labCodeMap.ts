export interface LabCodeInfo {
  name: string;
  category: string;
  unit: string;
}

export const LAB_CODE_MAP: Record<string, LabCodeInfo> = {
  // Chemistry
  B2500: { name: 'Total Protein', category: 'BC', unit: 'g/dL' },
  B2510: { name: 'Albumin', category: 'BC', unit: 'g/dL' },
  B2570: { name: 'AST (SGOT)', category: 'BC', unit: 'U/L' },
  B2580: { name: 'ALT (SGPT)', category: 'BC', unit: 'U/L' },
  B2602: { name: 'ALP', category: 'BC', unit: 'U/L' },
  B2710: { name: 'γ-GTP', category: 'BC', unit: 'U/L' },
  B2730: { name: 'BUN', category: 'BC', unit: 'mg/dL' },
  B2740: { name: 'Creatinine', category: 'BC', unit: 'mg/dL' },
  B2521: { name: 'Glucose', category: 'BC', unit: 'mg/dL' },
  B2750: { name: 'Uric Acid', category: 'BC', unit: 'mg/dL' },
  B2760: { name: 'Total Bilirubin', category: 'BC', unit: 'mg/dL' },
  B2770: { name: 'Direct Bilirubin', category: 'BC', unit: 'mg/dL' },
  B2781: { name: 'LDH', category: 'BC', unit: 'U/L' },
  B2782: { name: 'Amylase', category: 'BC', unit: 'U/L' },
  B2783: { name: 'Lipase', category: 'BC', unit: 'U/L' },
  B2920: { name: 'CK', category: 'BC', unit: 'U/L' },
  B2921: { name: 'CK-MB', category: 'BC', unit: 'U/L' },
  B2640: { name: 'Troponin I', category: 'BC', unit: 'ng/mL' },
  B4820: { name: 'NT-proBNP', category: 'BC', unit: 'pg/mL' },
  B2830: { name: 'Calcium', category: 'BC', unit: 'mg/dL' },
  B2840: { name: 'Phosphorus', category: 'BC', unit: 'mg/dL' },
  B2850: { name: 'Magnesium', category: 'BC', unit: 'mg/dL' },
  B3120: { name: 'HbA1c', category: 'BC', unit: '%' },
  b3120: { name: 'HbA1c', category: 'BC', unit: '%' },

  // Lipid
  B2561: { name: 'Total Cholesterol', category: 'BC', unit: 'mg/dL' },
  B2910: { name: 'HDL-Cholesterol', category: 'BC', unit: 'mg/dL' },
  A0118: { name: 'LDL-Cholesterol', category: 'BC', unit: 'mg/dL' },
  B2903: { name: 'TG', category: 'BC', unit: 'mg/dL' },

  // Electrolyte
  B2790: { name: 'Na', category: 'BC', unit: 'mmol/L' },
  B2800: { name: 'K', category: 'BC', unit: 'mmol/L' },
  B2810: { name: 'Cl', category: 'BC', unit: 'mmol/L' },
  B2820: { name: 'CO2', category: 'BC', unit: 'mmol/L' },

  // Inflammatory
  B4621: { name: 'CRP', category: 'BC', unit: 'mg/dL' },
  B4710: { name: 'ESR', category: 'BC', unit: 'mm/hr' },
  B4810: { name: 'Ferritin', category: 'BC', unit: 'ng/mL' },
  B4800: { name: 'PCT', category: 'BC', unit: 'ng/mL' },

  // CBC
  B1050: { name: 'WBC', category: 'CBC', unit: '×10³/μL' },
  B1040: { name: 'RBC', category: 'CBC', unit: '×10⁶/μL' },
  B1010: { name: 'Hb', category: 'CBC', unit: 'g/dL' },
  B10201: { name: 'Hct', category: 'CBC', unit: '%' },
  B1060: { name: 'PLT', category: 'CBC', unit: '×10³/μL' },
  B1080: { name: 'MCV', category: 'CBC', unit: 'fL' },
  B1090: { name: 'MCH', category: 'CBC', unit: 'pg' },
  B1100: { name: 'MCHC', category: 'CBC', unit: 'g/dL' },
  B1110: { name: 'RDW', category: 'CBC', unit: '%' },

  // Differential
  B10911: { name: 'Neutrophil', category: 'WBC Diff', unit: '%' },
  B10912: { name: 'Lymphocyte', category: 'WBC Diff', unit: '%' },
  B10913: { name: 'Monocyte', category: 'WBC Diff', unit: '%' },
  B10914: { name: 'Eosinophil', category: 'WBC Diff', unit: '%' },
  B10915: { name: 'Basophil', category: 'WBC Diff', unit: '%' },

  // Coagulation
  B1210: { name: 'PT (INR)', category: 'Coagulation', unit: 'INR' },
  B1211: { name: 'PT (%)', category: 'Coagulation', unit: '%' },
  B1220: { name: 'aPTT', category: 'Coagulation', unit: 'sec' },
  B1230: { name: 'D-dimer', category: 'Coagulation', unit: 'μg/mL' },

  // Thyroid
  B4110: { name: 'TSH', category: 'Thyroid', unit: 'μIU/mL' },
  B4120: { name: 'Free T4', category: 'Thyroid', unit: 'ng/dL' },
  B4130: { name: 'T3', category: 'Thyroid', unit: 'ng/dL' },

  // UA (B-codes)
  B00301: { name: 'Color', category: 'UA', unit: '' },
  B003011: { name: 'Leukocyte', category: 'UA', unit: '' },
  B00302: { name: 'Occult Blood', category: 'UA', unit: '' },
  B00303: { name: 'Bilirubin', category: 'UA', unit: '' },
  B00304: { name: 'Urobilinogen', category: 'UA', unit: '' },
  B00305: { name: 'Ketone', category: 'UA', unit: '' },
  B00306: { name: 'Protein', category: 'UA', unit: '' },
  B00307: { name: 'Nitrite', category: 'UA', unit: '' },
  B00308: { name: 'Glucose (UA)', category: 'UA', unit: '' },
  B00309: { name: 'pH (UA)', category: 'UA', unit: '' },
  B003010: { name: 'S.G', category: 'UA', unit: '' },
  // UA (D-codes)
  D0030100: { name: 'Color', category: 'UA', unit: '' },
  D0030111: { name: 'Leukocyte', category: 'UA', unit: '' },
  D0030200: { name: 'Occult Blood', category: 'UA', unit: '' },
  D0030300: { name: 'Bilirubin', category: 'UA', unit: '' },
  D0030400: { name: 'Urobilinogen', category: 'UA', unit: '' },
  D0030500: { name: 'Ketone', category: 'UA', unit: '' },
  D0030600: { name: 'Protein', category: 'UA', unit: '' },
  D0030700: { name: 'Nitrite', category: 'UA', unit: '' },
  D0030800: { name: 'Glucose (UA)', category: 'UA', unit: '' },
  D0030900: { name: 'pH (UA)', category: 'UA', unit: '' },
  D0031000: { name: 'S.G', category: 'UA', unit: '' },
  // Urine Sediment (Micro)
  B00411: { name: 'RBC (Micro)', category: 'Urine Sediment', unit: '/HPF' },
  B00412: { name: 'WBC (Micro)', category: 'Urine Sediment', unit: '/HPF' },
  B00413: { name: 'Epithelial cell', category: 'Urine Sediment', unit: '' },
  B00414: { name: 'Bacteria', category: 'Urine Sediment', unit: '' },
  B00415: { name: 'Cast', category: 'Urine Sediment', unit: '' },
  B00416: { name: 'Crystal', category: 'Urine Sediment', unit: '' },
  D0041100: { name: 'RBC (Micro)', category: 'Urine Sediment', unit: '/HPF' },
  D0041200: { name: 'WBC (Micro)', category: 'Urine Sediment', unit: '/HPF' },
  D0041300: { name: 'Epithelial cell', category: 'Urine Sediment', unit: '' },
  D0041400: { name: 'Bacteria', category: 'Urine Sediment', unit: '' },
  D0041500: { name: 'Cast', category: 'Urine Sediment', unit: '' },
  D0041600: { name: 'Crystal', category: 'Urine Sediment', unit: '' },

  // HbA1c
  B1270: { name: 'HbA1c', category: 'BC', unit: '%' },
  D0127000: { name: 'HbA1c', category: 'BC', unit: '%' },

  // Culture
  b4114B: { name: 'CRE-Blood Culture', category: 'Culture', unit: '' },
  B4051: { name: 'Wound Culture', category: 'Culture', unit: '' },

  // Serology
  B4511: { name: 'HBs Ag', category: 'Serology', unit: '' },
  b4521: { name: 'HBs Ab', category: 'Serology', unit: '' },

  // D-codes (hospital internal format)
  D0002010: { name: 'WBC', category: 'CBC', unit: '×10³/μL' },
  D000201HZ: { name: 'WBC', category: 'CBC', unit: '×10³/μL' },
  D0002030: { name: 'RBC', category: 'CBC', unit: '×10⁶/μL' },
  D000203HZ: { name: 'RBC', category: 'CBC', unit: '×10⁶/μL' },
  D0002040: { name: 'Hct', category: 'CBC', unit: '%' },
  D000204HZ: { name: 'Hct', category: 'CBC', unit: '%' },
  D0002050: { name: 'Hb', category: 'CBC', unit: 'g/dL' },
  D000205HZ: { name: 'Hb', category: 'CBC', unit: 'g/dL' },
  D0002070: { name: 'PLT', category: 'CBC', unit: '×10³/μL' },
  D000207HZ: { name: 'PLT', category: 'CBC', unit: '×10³/μL' },
  D1840: { name: 'Total Protein', category: 'BC', unit: 'g/dL' },
  D1880: { name: 'Albumin', category: 'BC', unit: 'g/dL' },
  D1860: { name: 'AST (SGOT)', category: 'BC', unit: 'U/L' },
  D1850: { name: 'ALT (SGPT)', category: 'BC', unit: 'U/L' },
  D1870: { name: 'ALP', category: 'BC', unit: 'U/L' },
  D1890: { name: 'γ-GTP', category: 'BC', unit: 'U/L' },
  D2611: { name: 'Total Cholesterol', category: 'BC', unit: 'mg/dL' },
  D2613: { name: 'HDL-Cholesterol', category: 'BC', unit: 'mg/dL' },
  D2614: { name: 'LDL-Cholesterol', category: 'BC', unit: 'mg/dL' },
  D2263: { name: 'TG', category: 'BC', unit: 'mg/dL' },
  D2300: { name: 'BUN', category: 'BC', unit: 'mg/dL' },
  D2280: { name: 'Creatinine', category: 'BC', unit: 'mg/dL' },
  D3022: { name: 'Glucose', category: 'BC', unit: 'mg/dL' },
  D2800020: { name: 'Na', category: 'BC', unit: 'mmol/L' },
  D2800060: { name: 'K', category: 'BC', unit: 'mmol/L' },
  D2800030: { name: 'Cl', category: 'BC', unit: 'mmol/L' },
  D0113003: { name: 'CRP', category: 'BC', unit: 'mg/dL' },
  D7001: { name: 'HBs Ag', category: 'Serology', unit: '' },
  D7002: { name: 'HBs Ab', category: 'Serology', unit: '' },
};

/** Lookup by code (case-insensitive) */
export function getLabInfo(code: string): LabCodeInfo | undefined {
  return LAB_CODE_MAP[code] ?? LAB_CODE_MAP[code.toUpperCase()] ?? LAB_CODE_MAP[code.toLowerCase()];
}

/** Lookup by code plus raw XLS name for hospital-code collisions. */
export function getLabInfoForXls(code: string, rawName: string): LabCodeInfo | undefined {
  const normalizedCode = code.trim();
  const normalizedName = rawName.trim().toLowerCase();

  if (normalizedCode.toUpperCase() === 'B00301' && normalizedName.includes('leukocyte')) {
    return { name: 'Leukocyte', category: 'UA', unit: '' };
  }

  return getLabInfo(normalizedCode);
}

/** Lookup by name (fuzzy match) */
export function findLabByName(name: string): (LabCodeInfo & { code: string }) | undefined {
  const lower = name.toLowerCase().trim();
  for (const [code, info] of Object.entries(LAB_CODE_MAP)) {
    if (info.name.toLowerCase() === lower) {
      return { ...info, code };
    }
  }
  // Partial match fallback
  for (const [code, info] of Object.entries(LAB_CODE_MAP)) {
    if (info.name.toLowerCase().includes(lower) || lower.includes(info.name.toLowerCase())) {
      return { ...info, code };
    }
  }
  return undefined;
}

/** Short name aliases used for name-based lookups */
const NAME_ALIASES: Record<string, string> = {
  Platelet: 'PLT',
  Hemoglobin: 'Hb',
  Hematocrit: 'Hct',
  Haematocrit: 'Hct',
  'N.Segment': 'Neutrophil',
  Seg: 'Neutrophil',
  Lymph: 'Lymphocyte',
  Mono: 'Monocyte',
  Eosino: 'Eosinophil',
  Baso: 'Basophil',
  Creatinine: 'Creatinine',
  Cr: 'Creatinine',
  GGT: 'γ-GTP',
  GGTP: 'γ-GTP',
  'Ketone body': 'Ketone',
  'LDL Cholesterol': 'LDL-Cholesterol',
  'HDL cholesterol': 'HDL-Cholesterol',
  'TG(Triglyceride)': 'TG',
  HBA1C: 'HbA1c',
  HbA1C: 'HbA1c',
  pH: 'pH',
  // UA Micro/Sediment — "Micro RBC" → "RBC (Micro)" etc.
  'Micro RBC': 'RBC (Micro)',
  'RBC(Urine Micro)': 'RBC (Micro)',
  'RBC (Urine Micro)': 'RBC (Micro)',
  'Micro WBC': 'WBC (Micro)',
  'WBC(Urine Micro)': 'WBC (Micro)',
  'WBC (Urine Micro)': 'WBC (Micro)',
  'Micro Epithelial cell': 'Epithelial cell',
  'Micro Epithelial': 'Epithelial cell',
  'Micro Bacteria': 'Bacteria',
  'Micro Cast': 'Cast',
  'Micro Crystal': 'Crystal',
  // UA strip items that may come with different names
  'Leukocyte esterase': 'Leukocyte',
  Blood: 'Occult Blood',
  'Occult blood': 'Occult Blood',
};

/**
 * Extract a clean short name from a raw lab name (often long Korean description).
 * Examples:
 *   "Hb-일반혈액검사(CBC)-[혈구세포-장비측정]_혈색소[광전비색법]" → "Hb"
 *   "RBC 일반혈액검사(CBC)-[혈구세포-장비측정]_적혈구수" → "RBC"
 *   "WBC 일반혈액검사(CBC)-백혈구수" → "WBC"
 *   "전해질[화학반응-장비측정]_소디움" → (returned as-is, rely on code lookup)
 *   "MCV" → "MCV"
 */
export function extractCleanName(code: string, rawName: string): string {
  // 1. D-code or B-code exact lookup
  const info = getLabInfo(code);
  if (info) return info.name;

  const trimmed = rawName.trim();

  // 2. Extract English prefix before "-" (e.g. "Hb-일반혈액검사...")
  const dashIdx = trimmed.indexOf('-');
  if (dashIdx > 0) {
    const prefix = trimmed.slice(0, dashIdx).trim();
    if (/^[A-Za-z0-9./()\s%]+$/.test(prefix) && prefix.length <= 20) {
      const normalized = NAME_ALIASES[prefix] ?? prefix;
      // Check if normalized name has a mapping
      const found = findLabByName(normalized);
      return found?.name ?? normalized;
    }
  }

  // 3. Extract English prefix before space+Korean (e.g. "WBC 일반혈액검사...")
  const spaceIdx = trimmed.search(/\s[\uAC00-\uD7A3]/);
  if (spaceIdx > 0) {
    const prefix = trimmed.slice(0, spaceIdx).trim();
    if (/^[A-Za-z0-9./()\s%]+$/.test(prefix) && prefix.length <= 20) {
      const normalized = NAME_ALIASES[prefix] ?? prefix;
      const found = findLabByName(normalized);
      return found?.name ?? normalized;
    }
  }

  // 4. If entirely English/short, normalize and return
  if (/^[A-Za-z0-9./()\s%-]+$/.test(trimmed) && trimmed.length <= 30) {
    return NAME_ALIASES[trimmed] ?? trimmed;
  }

  // 5. Fallback: try findLabByName
  const found = findLabByName(trimmed);
  return found?.name ?? trimmed;
}
