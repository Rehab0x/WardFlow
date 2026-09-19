/**
 * 서버 로그용 마스킹 유틸.
 *
 * Lab import 엔드포인트는 서비스 롤 키로 환자 데이터를 다루므로,
 * Vercel 로그(운영자·플랫폼이 보관)에 환자 식별정보가 그대로 남지 않도록 한다.
 * 호출자에게 돌려주는 **응답 본문**은 마스킹하지 않는다 —
 * 인증된 호출자는 어떤 행이 매칭되지 않았는지 알아야 하기 때문이다.
 */

/** 환자 이름: 첫 글자만 남긴다. "김환자" → "김**" */
export function maskName(value: string | undefined | null): string {
  const name = (value ?? '').trim();
  if (!name) return '(없음)';
  if (name.length === 1) return `${name}*`;
  return `${name[0]}${'*'.repeat(name.length - 1)}`;
}

/** 등록번호: 뒤 3자리만 남긴다. "0000004532" → "*******532" */
export function maskRegistrationNumber(value: string | undefined | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '(없음)';
  if (raw.length <= 3) return '*'.repeat(raw.length);
  return `${'*'.repeat(raw.length - 3)}${raw.slice(-3)}`;
}

/** UUID 등 식별자: 앞 8자만 남긴다. */
export function maskId(value: string | undefined | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '(없음)';
  return raw.length <= 8 ? raw : `${raw.slice(0, 8)}…`;
}

/** 파일명: 환자 이름/등록번호가 들어 있을 수 있으므로 확장자만 남긴다. */
export function maskFileName(value: string | undefined | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '(없음)';
  const dot = raw.lastIndexOf('.');
  const ext = dot > 0 ? raw.slice(dot) : '';
  return `<file:${raw.length}chars>${ext}`;
}

/**
 * 에러 메시지에서 숫자열(등록번호·차트번호로 볼 수 있는 4자리 이상)을 가린다.
 * Supabase 에러 문구에 값이 섞여 나오는 경우를 대비한 2차 방어선이다.
 */
export function maskErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.replace(/\d{4,}/g, (match) => '*'.repeat(match.length));
}
