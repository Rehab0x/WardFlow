import { describe, expect, it } from 'vitest';
import { isCompactCultureResult, parseCultureText } from './cultureText';

// 실제 이원 XLS 문장결과의 "모양"만 재현한다 (환자 정보 없음)
const MULTI_LINE =
  '<Culture & ID>\r\nEscherichia coli\r\n<Sensitivity>\r\n' +
  'Amikacin              S (2)\r\nAmoxicillin/CA        R (>=32)\r\n' +
  'Ampicillin            R (>=32)\r\nCefazolin(other)      R (>=64)';

const EXPECTED = [
  { kind: 'heading', label: 'Culture & ID', text: 'Escherichia coli' },
  { kind: 'heading', label: 'Sensitivity', text: '' },
  { kind: 'susceptibility', drug: 'Amikacin', interpretation: 'S', mic: '2' },
  { kind: 'susceptibility', drug: 'Amoxicillin/CA', interpretation: 'R', mic: '>=32' },
  { kind: 'susceptibility', drug: 'Ampicillin', interpretation: 'R', mic: '>=32' },
  { kind: 'susceptibility', drug: 'Cefazolin(other)', interpretation: 'R', mic: '>=64' },
];

describe('parseCultureText', () => {
  it('puts the organism next to its heading and one antibiotic per line', () => {
    expect(parseCultureText(MULTI_LINE)).toEqual(EXPECTED);
  });

  it('recovers the same lines when everything came in on one line', () => {
    const oneLine =
      '<Culture & ID> Escherichia coli <Sensitivity> Amikacin S (2) ' +
      'Amoxicillin/CA R (>=32) Ampicillin R (>=32) Cefazolin(other) R (>=64)';
    expect(parseCultureText(oneLine)).toEqual(EXPECTED);
  });

  it('reads an antibiotic without MIC inside the sensitivity section', () => {
    expect(parseCultureText('<Sensitivity>\nVancomycin   R')).toEqual([
      { kind: 'heading', label: 'Sensitivity', text: '' },
      { kind: 'susceptibility', drug: 'Vancomycin', interpretation: 'R', mic: '' },
    ]);
  });

  it('does not mistake an organism name for a susceptibility result', () => {
    expect(parseCultureText('<Culture & ID>\nStreptococcus group B')).toEqual([
      { kind: 'heading', label: 'Culture & ID', text: 'Streptococcus group B' },
    ]);
  });

  it('keeps unknown lines as text instead of dropping them', () => {
    const lines = parseCultureText('<Culture & ID>\nEnterococcus faecium\nColony count: >10^5');
    expect(lines).toContainEqual({ kind: 'text', text: 'Colony count: >10^5' });
  });

  it('treats a one-line no-growth result as compact', () => {
    expect(isCompactCultureResult(parseCultureText('No growth of CRE'))).toBe(true);
    expect(isCompactCultureResult(parseCultureText(MULTI_LINE))).toBe(false);
  });
});
