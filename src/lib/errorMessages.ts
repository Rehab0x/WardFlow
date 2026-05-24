export function formatUserFacingError(error: unknown, fallbackMessage: string) {
  const message = getErrorMessage(error);
  if (!message) return fallbackMessage;

  if (message.includes('로그인') || message.includes('권한') || message.includes('승인')) {
    return message;
  }

  const technicalPatterns = [
    /supabase/i,
    /row-level security/i,
    /duplicate key/i,
    /foreign key/i,
    /violates/i,
    /constraint/i,
    /network/i,
    /failed to fetch/i,
    /JWT/i,
    /PGRST/i,
  ];

  if (technicalPatterns.some((pattern) => pattern.test(message))) {
    if (import.meta.env.DEV) {
      return `${fallbackMessage} (${getDetailedErrorMessage(error, message)})`;
    }
    return fallbackMessage;
  }

  return message;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === 'string') return error.trim();
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message.trim() : '';
  }
  return '';
}

function getDetailedErrorMessage(error: unknown, message: string) {
  if (!error || typeof error !== 'object') return message;
  const details = (error as { details?: unknown }).details;
  const hint = (error as { hint?: unknown }).hint;
  const code = (error as { code?: unknown }).code;
  return [
    typeof code === 'string' && code,
    message,
    typeof details === 'string' && details,
    typeof hint === 'string' && hint,
  ]
    .filter(Boolean)
    .join(' / ');
}
