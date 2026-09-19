/**
 * Schedule — 앱 레벨(뷰모델) 일정 타입.
 */
// 기본 카테고리 ID들 (커스텀 카테고리는 useScheduleCategoryStore에서 관리)
export type ScheduleCategory = string;

export interface Schedule {
  id: string;
  patientId: string;
  title: string;
  scheduledDate: Date;
  scheduledTime?: string;
  category: ScheduleCategory;
  isCompleted: boolean;
  notes?: string;
  createdAt: Date;
}
