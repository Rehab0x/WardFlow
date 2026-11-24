/**
 * 항생제 이름 표준화 — 병동에서 쓰는 약칭·한글·상품명을 일반명(영어)으로 맞춘다.
 * 같은 약이 "타조신"/"Tazocin"으로 갈라져 기록되지 않게 하려는 것이 목적이다.
 *
 * 표에 없는 이름은 건드리지 않는다 (임의로 바꾸지 않는다).
 */

const ALIASES: Record<string, string[]> = {
  'Piperacillin/Tazobactam': ['tazocin', '타조신', '타조', 'zosyn', '조신', 'tazo', 'piptaz', 'pip/taz', 'piperacillin/tazobactam', '피페라실린/타조박탐'],
  Meropenem: ['mero', '메로', 'meropenem', '메로페넴', 'meronem', '메로넴'],
  'Imipenem/Cilastatin': ['imipenem', '이미페넴', 'tienam', '티에남', 'imipenem/cilastatin'],
  Ertapenem: ['ertapenem', '에르타페넴', 'invanz', '인반즈'],
  Cefazolin: ['cefazolin', '세파졸린', '세파졸', 'cefa', '세파'],
  Ceftriaxone: ['ceftriaxone', '세프트리악손', 'rocephin', '로세핀'],
  Cefepime: ['cefepime', '세페핌', 'maxipime', '맥시핌'],
  Ceftazidime: ['ceftazidime', '세프타지딤', 'fortum', '포텀'],
  Cefotaxime: ['cefotaxime', '세포탁심', 'claforan', '클라포란'],
  Vancomycin: ['vancomycin', 'vanco', '반코', '반코마이신', 'vancocin'],
  Teicoplanin: ['teicoplanin', '테이코플라닌', 'targocid', '타고시드'],
  Linezolid: ['linezolid', '리네졸리드', 'zyvox', '자이복스'],
  'Amoxicillin/Clavulanate': ['augmentin', '오구멘틴', '아구멘틴', 'amoxicillin/clavulanate', 'amox/clav'],
  'Ampicillin/Sulbactam': ['unasyn', '유나신', 'ampicillin/sulbactam', 'amp/sul'],
  Ciprofloxacin: ['ciprofloxacin', 'cipro', '시프로', '시프로플록사신', 'ciprobay'],
  Levofloxacin: ['levofloxacin', '레보플록사신', 'cravit', '크라비트', 'levaquin'],
  Metronidazole: ['metronidazole', '메트로니다졸', 'flagyl', '플라질', '후라질'],
  Clindamycin: ['clindamycin', '클린다마이신', 'clinda', '클린다', 'dalacin', '달라신'],
  Gentamicin: ['gentamicin', '젠타마이신', 'genta', '젠타'],
  Amikacin: ['amikacin', '아미카신', 'amika', '아미카'],
  Azithromycin: ['azithromycin', '아지스로마이신', 'azithro', '지스로맥스', 'zithromax'],
  Colistin: ['colistin', '콜리스틴', 'coly'],
  Tigecycline: ['tigecycline', '티게시클린', 'tygacil', '타이가실'],
  'Trimethoprim/Sulfamethoxazole': ['bactrim', '박트림', 'tmp/smx', 'tmp-smx', 'trimethoprim/sulfamethoxazole'],
  Doxycycline: ['doxycycline', '독시사이클린', 'doxy', '독시'],
};

function aliasKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]/g, '');
}

const LOOKUP = new Map<string, string>(
  Object.entries(ALIASES).flatMap(([generic, names]) =>
    [generic, ...names].map((name): [string, string] => [aliasKey(name), generic])
  )
);

/** 내장 별칭표에 있으면 일반명을, 없으면 null. */
export function lookupAntibioticName(name: string): string | null {
  return LOOKUP.get(aliasKey(name)) ?? null;
}

/** 표에 있으면 일반명, 없으면 적힌 그대로. */
export function normalizeAntibioticName(name: string): string {
  return lookupAntibioticName(name) ?? name.trim();
}
