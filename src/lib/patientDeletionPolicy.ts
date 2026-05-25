export const patientArchiveButtonLabel = '환자 숨김 처리';

export const patientArchiveHelpText =
  '환자 삭제는 Supabase에서 영구 삭제하지 않고 archived 상태와 deleted_at 값을 기록해 목록에서 숨기는 방식입니다.';

export function formatPatientArchiveConfirm(patientName: string): string {
  return `${patientName} 환자를 목록에서 숨길까요? 임상 기록은 Supabase에 보관되며 일반 환자 목록과 Today 큐에서는 보이지 않습니다.`;
}
