/**
 * Note — 앱 레벨(뷰모델) 메모 타입.
 */
export type NoteType = 'progress' | 'reminder';

export interface Note {
  id: string;
  patientId: string;
  content: string;
  type: NoteType;
  alertDate?: Date; // 알림 날짜 (reminder 타입일 때만 사용)
  createdAt: Date;
  updatedAt: Date;
}
