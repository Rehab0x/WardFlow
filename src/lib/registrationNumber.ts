/**
 * 환자 등록번호(차트번호) 정규화.
 *
 * 병원 OCS는 같은 환자를 `"4532"` / `"0000004532"`처럼 앞자리 0 유무만 다르게 내보낸다.
 * 따라서 "같은 차트번호인가?"의 기준은 한 곳에서만 정의하고,
 * 환자 등록 중복 검사와 Lab XLS 일괄 입력의 환자 매칭이 모두 이 함수를 쓴다.
 *
 * @returns 비교용 키. 빈 값이면 `''` (비교 대상 아님)
 */
export function normalizeRegistrationNumber(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim().toLowerCase();
  if (!trimmed) return '';

  const stripped = trimmed.replace(/^0+/, '');
  // "0000"처럼 전부 0인 값은 빈 문자열이 되어버리므로 "0"으로 남긴다.
  return stripped || '0';
}
