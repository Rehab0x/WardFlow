import { describe, expect, it } from 'vitest';
import { lookupAntibioticName, normalizeAntibioticName } from './antibioticNames';

describe('항생제 이름 표준화', () => {
  it('타조신·tazocin·Zosyn은 모두 같은 일반명', () => {
    for (const name of ['타조신', 'Tazocin', 'tazocin', 'ZOSYN', ' 타조신 ']) {
      expect(normalizeAntibioticName(name)).toBe('Piperacillin/Tazobactam');
    }
  });

  it('메로·mero·메로페넴은 모두 Meropenem', () => {
    for (const name of ['메로', 'mero', '메로페넴', 'Meropenem']) {
      expect(normalizeAntibioticName(name)).toBe('Meropenem');
    }
  });

  it('공백·하이픈·대소문자 차이를 무시한다', () => {
    expect(normalizeAntibioticName('Pip-Taz')).toBe('Piperacillin/Tazobactam');
    expect(normalizeAntibioticName('pip / taz')).toBe('Piperacillin/Tazobactam');
  });

  it('표에 없는 이름은 바꾸지 않는다', () => {
    expect(lookupAntibioticName('처음보는약')).toBeNull();
    expect(normalizeAntibioticName(' 처음보는약 ')).toBe('처음보는약');
  });
});
