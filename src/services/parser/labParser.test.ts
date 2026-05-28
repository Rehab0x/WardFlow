import { describe, expect, it } from 'vitest';
import { parseLabText } from './labParser';
import { getLabInfoForXls } from './labCodeMap';

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
});
