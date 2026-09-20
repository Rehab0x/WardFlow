import { describe, expect, it } from 'vitest';
import { parseLabText, parseLabXls } from './labParser';
import { getLabInfoForXls, findLabByName } from './labCodeMap';

describe('parseLabText', () => {
  it('parses OCS paste text with section headers, default references, and HbA1c NGSP value', () => {
    const result = parseLabText(`
      Hb-일반혈액검사(CBC)-[혈구세포-장비측정]_혈색소[광전비색법]\t11.9
      Hct-일반혈액검사(CBC)-[혈구세포-장비측정]\t35.6
      WBC 일반혈액검사(CBC)-[혈구세포-장비측정]_백혈구수\t11.05
      Platelet 일반혈액검사(CBC)-[혈구세포-장비측정]_혈소판수\t252
      20250925;  2;  19
      백혈구백분율\t
      N.Segment\t78
      Lymphocyte\t9
      20250925;  2;  20
      Albumin\t3.04
      BUN\t33.3
      Glucose\t140
      UA1 - 요검사 (이원의료재단);  ;
      Glucose\t-
      pH\t5.0
      S.G\t1.019
      요침사검사-[관찰판정-육안·장비측정]_이미지분석법\t
      RBC(Urine Micro)\t3-5
      HBA1C - HbA1C (이원의료재단);  ;
      HbA1C\tHbA1c-NGSP   : 7.4
      HbA1c-IFCC   : 58
      HbA1c-eAG    : 166
    `);

    const byName = new Map(result.items.map((item) => [item.name, item]));
    expect(byName.get('Hb')?.flag).toBe('L');
    expect(byName.get('WBC')?.flag).toBe('H');
    expect(byName.get('Lymphocyte')?.category).toBe('WBC Diff');
    expect(byName.get('Lymphocyte')?.flag).toBe('L');
    expect(byName.get('Albumin')?.flag).toBe('L');
    expect(byName.get('BUN')?.flag).toBe('H');
    expect(byName.get('Glucose (UA)')?.category).toBe('UA');
    expect(byName.get('pH (UA)')?.category).toBe('UA');
    expect(byName.get('RBC (Micro)')?.category).toBe('Urine Sediment');
    expect(byName.get('HbA1c')?.value).toBe('7.4');
    expect(byName.get('HbA1c')?.flag).toBe('H');
    expect(result.unmatched).not.toContain('HbA1c-IFCC   : 58');
  });
});

describe('getLabInfoForXls', () => {
  it('keeps culture and uncommon WBC differential names in their clinical categories', () => {
    expect(getLabInfoForXls('B00301', 'CRE-Urine culture')).toMatchObject({
      name: 'CRE-Urine Culture',
      category: 'Culture',
    });
    expect(getLabInfoForXls('B10911', 'Myelocyte')).toMatchObject({
      name: 'Myelocyte',
      category: 'WBC Diff',
    });
    expect(getLabInfoForXls('B10911', 'Large unstained cell')).toMatchObject({
      name: 'Large unstained cell',
      category: 'WBC Diff',
    });
  });

  it('maps Creatinine chemistry codes/names without treating them as CRE culture', () => {
    expect(getLabInfoForXls('B2740', 'Creatinine')).toMatchObject({
      name: 'Creatinine',
      category: 'BC',
      unit: 'mg/dL',
    });
    expect(getLabInfoForXls('D2280', 'Creatinine')).toMatchObject({
      name: 'Creatinine',
      category: 'BC',
      unit: 'mg/dL',
    });
    expect(getLabInfoForXls('B2740', 'Cr')).toMatchObject({
      name: 'Creatinine',
      category: 'BC',
    });
  });

  it('maps CRE culture names and b4114 codes to culture, not Creatinine', () => {
    expect(getLabInfoForXls('b4114U', 'CRE-Urine')).toMatchObject({
      name: 'CRE-Urine Culture',
      category: 'Culture',
    });
    expect(getLabInfoForXls('b4114R', 'CRE-Rectal swab')).toMatchObject({
      name: 'CRE-Rectal swab',
      category: 'Culture',
    });
    expect(getLabInfoForXls('b4114B', 'CRE-Blood')).toMatchObject({
      name: 'CRE-Blood Culture',
      category: 'Culture',
    });
    expect(getLabInfoForXls('X', 'CRE-Urine')).toMatchObject({
      name: 'CRE-Urine Culture',
      category: 'Culture',
    });
    expect(getLabInfoForXls('X', 'CRE-Rectal swab')).toMatchObject({
      name: 'CRE-Rectal swab',
      category: 'Culture',
    });
    expect(getLabInfoForXls('X', 'CRE-Blood')).toMatchObject({
      name: 'CRE-Blood Culture',
      category: 'Culture',
    });
  });
});

describe('findLabByName CRE vs Creatinine', () => {
  it('resolves Cr/Creatinine to chemistry and CRE* names to culture', () => {
    expect(findLabByName('Creatinine')?.name).toBe('Creatinine');
    expect(findLabByName('Cr')?.name).toBe('Creatinine');
    expect(findLabByName('CRE-Urine Culture')?.name).toBe('CRE-Urine Culture');
    expect(findLabByName('CRE-Blood Culture')?.name).toBe('CRE-Blood Culture');
    expect(findLabByName('cre')?.name).not.toBe('Creatinine');
  });
});

// ─────────────────────────────────────────────────
// XLS 경로 — 실제 이원의료재단 파일에서 확인된 케이스
// (환자 식별 정보는 쓰지 않는다. 행의 "모양"만 재현한다)
// ─────────────────────────────────────────────────

const XLS_HEADER = [
  '기관구분', '검체번호', '수신자명', '성별', '나이', '차트번호', '접수일자', '접수번호',
  '병원검사코드', '이원검사코드', '검사명', '문자결과', '문장결과', 'H/L', 'Remark', '참고치',
  '주민등록번호',
];

/** 검사 행 하나를 실제 컬럼 위치에 맞춰 만든다. */
function xlsRow(fields: {
  code: string;
  name: string;
  numResult?: string;
  textResult?: string;
  hl?: string;
  reference?: string;
}): string[] {
  const row = new Array(17).fill('');
  row[0] = '테스트병원';
  row[2] = '홍길동';
  row[5] = '0000000001';
  row[6] = '20260919';
  row[8] = fields.code;
  row[10] = fields.name;
  row[11] = fields.numResult ?? '';
  row[12] = fields.textResult ?? '';
  row[13] = fields.hl ?? '';
  row[15] = fields.reference ?? '';
  return row;
}

async function parseRows(rows: string[][]) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([XLS_HEADER, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'sheet1');
  const buffer = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const groups = await parseLabXls(buffer);
  return groups[0]?.items ?? [];
}

describe('parseLabXls — 문장결과에 값이 여러 개 든 행', () => {
  // 이원 XLS는 PT를 한 줄로 보내면서 INR·초·퍼센트를 문장결과에 함께 싣는다.
  const ptRow = xlsRow({
    code: 'B1520',
    name: '응고기능기본검사-프로트롬빈시간',
    textResult: 'INR       : 1.67\r\nPT        : 19.4\r\nPercent   : 47',
    reference: 'INR       : 0.80 ~ 1.30\r\nPercent   : 70 ~ 140',
  });

  it('splits the PT panel into INR, seconds and percent', async () => {
    const items = await parseRows([ptRow]);

    expect(items.map((item) => item.name)).toEqual(['PT (INR)', 'PT (sec)', 'PT (%)']);
    expect(items.map((item) => item.value)).toEqual(['1.67', '19.4', '47']);
    expect(items.map((item) => item.unit)).toEqual(['INR', 'sec', '%']);
    expect(items.every((item) => item.category === 'Coagulation')).toBe(true);
  });

  it('applies the per-item reference range that came in the same row', async () => {
    const items = await parseRows([ptRow]);

    // INR 1.67 > 1.30 → H, Percent 47 < 70 → L, 초는 참고치가 없어 판정하지 않는다
    expect(items.map((item) => item.flag)).toEqual(['H', '', 'L']);
    expect(items[0]).toMatchObject({ referenceMin: 0.8, referenceMax: 1.3 });
    expect(items[2]).toMatchObject({ referenceMin: 70, referenceMax: 140 });
    expect(items[1]?.referenceMin).toBeUndefined();
  });

  it('leaves an unknown multi-line result alone instead of guessing', async () => {
    const items = await parseRows([
      xlsRow({ code: 'Z9999', name: '모르는검사', textResult: 'Alpha : 1\r\nBeta : 2' }),
    ]);
    expect(items).toHaveLength(1);
  });
});

describe('parseLabXls — 선별 배양 검사 이름', () => {
  it('keeps the organism prefix instead of forcing CRE', async () => {
    // VRE 직장도말을 CRE로 기록하면 격리·항생제 판단이 달라진다
    const items = await parseRows([
      xlsRow({
        code: 'b4112R',
        name: 'VRE-Rectal Swab',
        textResult: '<Culture & ID>\r\nEnterococcus faecium',
      }),
    ]);

    expect(items[0]).toMatchObject({ name: 'VRE-Rectal swab', category: 'Culture' });
  });

  it('still maps a CRE rectal swab to CRE', async () => {
    const items = await parseRows([
      xlsRow({ code: 'b4114R', name: 'CRE-Rectal swab', textResult: 'No growth of CRE' }),
    ]);

    expect(items[0]).toMatchObject({ name: 'CRE-Rectal swab', category: 'Culture' });
  });
});
