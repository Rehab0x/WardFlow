export const patientArchiveButtonLabel = '환자 삭제';

export const patientArchiveHelpText =
  '환자 삭제는 Supabase에서 환자와 연결된 임상 기록을 함께 삭제하는 방식입니다.';

export const patientArchiveFailureMessage = '환자를 삭제하지 못했습니다.';

export function formatPatientArchiveConfirm(patientName: string): string {
  return `${patientName} 환자를 삭제할까요? 환자 정보와 연결된 임상 기록이 Supabase에서 함께 삭제됩니다.`;
}
