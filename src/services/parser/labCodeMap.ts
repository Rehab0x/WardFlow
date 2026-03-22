export interface LabCodeInfo {
  name: string;
  category: string;
  unit: string;
}

export const LAB_CODE_MAP: Record<string, LabCodeInfo> = {
  // Chemistry
  'B2500':  { name: 'Total Protein',     category: 'Chemistry',    unit: 'g/dL' },
  'B2510':  { name: 'Albumin',           category: 'Chemistry',    unit: 'g/dL' },
  'B2570':  { name: 'AST (SGOT)',        category: 'Chemistry',    unit: 'U/L' },
  'B2580':  { name: 'ALT (SGPT)',        category: 'Chemistry',    unit: 'U/L' },
  'B2602':  { name: 'ALP',              category: 'Chemistry',    unit: 'U/L' },
  'B2710':  { name: 'γ-GTP',            category: 'Chemistry',    unit: 'U/L' },
  'B2730':  { name: 'BUN',              category: 'Chemistry',    unit: 'mg/dL' },
  'B2740':  { name: 'Creatinine',       category: 'Chemistry',    unit: 'mg/dL' },
  'B2521':  { name: 'Glucose',          category: 'Chemistry',    unit: 'mg/dL' },
  'B2750':  { name: 'Uric Acid',        category: 'Chemistry',    unit: 'mg/dL' },
  'B2760':  { name: 'Total Bilirubin',  category: 'Chemistry',    unit: 'mg/dL' },
  'B2770':  { name: 'Direct Bilirubin', category: 'Chemistry',    unit: 'mg/dL' },
  'B2781':  { name: 'LDH',             category: 'Chemistry',    unit: 'U/L' },
  'B2782':  { name: 'Amylase',         category: 'Chemistry',    unit: 'U/L' },
  'B2783':  { name: 'Lipase',          category: 'Chemistry',    unit: 'U/L' },
  'B2920':  { name: 'CK',             category: 'Chemistry',    unit: 'U/L' },
  'B2921':  { name: 'CK-MB',          category: 'Chemistry',    unit: 'U/L' },
  'B2640':  { name: 'Troponin I',      category: 'Chemistry',    unit: 'ng/mL' },
  'B4820':  { name: 'NT-proBNP',       category: 'Chemistry',    unit: 'pg/mL' },
  'B2830':  { name: 'Calcium',         category: 'Chemistry',    unit: 'mg/dL' },
  'B2840':  { name: 'Phosphorus',      category: 'Chemistry',    unit: 'mg/dL' },
  'B2850':  { name: 'Magnesium',       category: 'Chemistry',    unit: 'mg/dL' },
  'B3120':  { name: 'HbA1c',          category: 'Special',      unit: '%' },
  'b3120':  { name: 'HbA1c',          category: 'Special',      unit: '%' },

  // Lipid
  'B2561':  { name: 'Total Cholesterol', category: 'Lipid',     unit: 'mg/dL' },
  'B2910':  { name: 'HDL-Cholesterol',   category: 'Lipid',     unit: 'mg/dL' },
  'A0118':  { name: 'LDL-Cholesterol',   category: 'Lipid',     unit: 'mg/dL' },
  'B2903':  { name: 'TG',               category: 'Lipid',     unit: 'mg/dL' },

  // Electrolyte
  'B2790':  { name: 'Na',  category: 'Electrolyte', unit: 'mmol/L' },
  'B2800':  { name: 'K',   category: 'Electrolyte', unit: 'mmol/L' },
  'B2810':  { name: 'Cl',  category: 'Electrolyte', unit: 'mmol/L' },
  'B2820':  { name: 'CO2', category: 'Electrolyte', unit: 'mmol/L' },

  // Inflammatory
  'B4621':  { name: 'CRP',     category: 'Inflammatory', unit: 'mg/dL' },
  'B4710':  { name: 'ESR',     category: 'Inflammatory', unit: 'mm/hr' },
  'B4810':  { name: 'Ferritin', category: 'Inflammatory', unit: 'ng/mL' },
  'B4800':  { name: 'PCT',     category: 'Inflammatory', unit: 'ng/mL' },

  // CBC
  'B1050':  { name: 'WBC',  category: 'CBC', unit: '×10³/μL' },
  'B1040':  { name: 'RBC',  category: 'CBC', unit: '×10⁶/μL' },
  'B1010':  { name: 'Hb',   category: 'CBC', unit: 'g/dL' },
  'B10201': { name: 'Hct',  category: 'CBC', unit: '%' },
  'B1060':  { name: 'PLT',  category: 'CBC', unit: '×10³/μL' },
  'B1080':  { name: 'MCV',  category: 'CBC', unit: 'fL' },
  'B1090':  { name: 'MCH',  category: 'CBC', unit: 'pg' },
  'B1100':  { name: 'MCHC', category: 'CBC', unit: 'g/dL' },
  'B1110':  { name: 'RDW',  category: 'CBC', unit: '%' },

  // Differential
  'B10911': { name: 'Neutrophil',  category: 'Differential', unit: '%' },
  'B10912': { name: 'Lymphocyte',  category: 'Differential', unit: '%' },
  'B10913': { name: 'Monocyte',    category: 'Differential', unit: '%' },
  'B10914': { name: 'Eosinophil',  category: 'Differential', unit: '%' },
  'B10915': { name: 'Basophil',    category: 'Differential', unit: '%' },

  // Coagulation
  'B1210':  { name: 'PT (INR)',  category: 'Coagulation', unit: 'INR' },
  'B1211':  { name: 'PT (%)',    category: 'Coagulation', unit: '%' },
  'B1220':  { name: 'aPTT',     category: 'Coagulation', unit: 'sec' },
  'B1230':  { name: 'D-dimer',  category: 'Coagulation', unit: 'μg/mL' },

  // Thyroid
  'B4110':  { name: 'TSH',  category: 'Thyroid', unit: 'μIU/mL' },
  'B4120':  { name: 'Free T4', category: 'Thyroid', unit: 'ng/dL' },
  'B4130':  { name: 'T3',   category: 'Thyroid', unit: 'ng/dL' },

  // UA
  'B00301':  { name: 'Color',       category: 'UA',       unit: '' },
  'B00303':  { name: 'Bilirubin',   category: 'UA',       unit: '' },
  'B00305':  { name: 'Ketone',      category: 'UA',       unit: '' },
  'B003010': { name: 'S.G',         category: 'UA',       unit: '' },
  'B00302':  { name: 'Occult Blood', category: 'UA',      unit: '' },
  'B00309':  { name: 'pH (UA)',     category: 'UA',       unit: '' },
  'B00306':  { name: 'Protein',     category: 'UA',       unit: '' },
  'B00304':  { name: 'Urobilinogen', category: 'UA',      unit: '' },
  'B00307':  { name: 'Nitrite',     category: 'UA',       unit: '' },
  'B00308':  { name: 'Glucose (UA)', category: 'UA',      unit: '' },
  'B00411':  { name: 'RBC (Micro)', category: 'UA Micro', unit: '/HPF' },
  'B00412':  { name: 'WBC (Micro)', category: 'UA Micro', unit: '/HPF' },
  'B00413':  { name: 'Epithelial cell', category: 'UA Micro', unit: '' },
  'B00414':  { name: 'Bacteria',    category: 'UA Micro', unit: '' },
  'B00415':  { name: 'Cast',        category: 'UA Micro', unit: '' },

  // Culture
  'b4114B': { name: 'CRE-Blood Culture', category: 'Culture', unit: '' },

  // D-codes (hospital internal format)
  'D0002010': { name: 'WBC',   category: 'CBC', unit: '×10³/μL' },
  'D000201HZ': { name: 'WBC',  category: 'CBC', unit: '×10³/μL' },
  'D0002030': { name: 'RBC',   category: 'CBC', unit: '×10⁶/μL' },
  'D000203HZ': { name: 'RBC',  category: 'CBC', unit: '×10⁶/μL' },
  'D0002040': { name: 'Hct',   category: 'CBC', unit: '%' },
  'D000204HZ': { name: 'Hct',  category: 'CBC', unit: '%' },
  'D0002050': { name: 'Hb',    category: 'CBC', unit: 'g/dL' },
  'D000205HZ': { name: 'Hb',   category: 'CBC', unit: 'g/dL' },
  'D0002070': { name: 'PLT',   category: 'CBC', unit: '×10³/μL' },
  'D000207HZ': { name: 'PLT',  category: 'CBC', unit: '×10³/μL' },
  'D1840':  { name: 'Total Protein',  category: 'LFT', unit: 'g/dL' },
  'D1880':  { name: 'Albumin',        category: 'LFT', unit: 'g/dL' },
  'D1860':  { name: 'AST (SGOT)',     category: 'LFT', unit: 'U/L' },
  'D1850':  { name: 'ALT (SGPT)',     category: 'LFT', unit: 'U/L' },
  'D1870':  { name: 'ALP',           category: 'LFT', unit: 'U/L' },
  'D1890':  { name: 'γ-GTP',         category: 'LFT', unit: 'U/L' },
  'D2611':  { name: 'Total Cholesterol', category: 'LFT', unit: 'mg/dL' },
  'D2613':  { name: 'HDL-Cholesterol', category: 'LFT', unit: 'mg/dL' },
  'D2614':  { name: 'LDL-Cholesterol', category: 'LFT', unit: 'mg/dL' },
  'D2263':  { name: 'TG',            category: 'LFT', unit: 'mg/dL' },
  'D2300':  { name: 'BUN',           category: 'LFT', unit: 'mg/dL' },
  'D2280':  { name: 'Creatinine',    category: 'LFT', unit: 'mg/dL' },
  'D3022':  { name: 'Glucose',       category: 'LFT', unit: 'mg/dL' },
  'D2800020': { name: 'Na', category: 'Electrolyte', unit: 'mmol/L' },
  'D2800060': { name: 'K',  category: 'Electrolyte', unit: 'mmol/L' },
  'D2800030': { name: 'Cl', category: 'Electrolyte', unit: 'mmol/L' },
  'D0113003': { name: 'CRP', category: 'Inflammatory', unit: 'mg/dL' },
  'D7001':  { name: 'HBs Ag', category: 'HBs', unit: '' },
  'D7002':  { name: 'HBs Ab', category: 'HBs', unit: '' },
};

/** Lookup by code (case-insensitive) */
export function getLabInfo(code: string): LabCodeInfo | undefined {
  return LAB_CODE_MAP[code] ?? LAB_CODE_MAP[code.toUpperCase()] ?? LAB_CODE_MAP[code.toLowerCase()];
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
  'Platelet': 'PLT',
  'Hemoglobin': 'Hb',
  'Hematocrit': 'Hct',
  'Haematocrit': 'Hct',
  'N.Segment': 'Neutrophil',
  'Seg': 'Neutrophil',
  'Lymph': 'Lymphocyte',
  'Mono': 'Monocyte',
  'Eosino': 'Eosinophil',
  'Baso': 'Basophil',
  'Creatinine': 'Creatinine',
  'Cr': 'Creatinine',
  'GGT': 'γ-GTP',
  'GGTP': 'γ-GTP',
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
