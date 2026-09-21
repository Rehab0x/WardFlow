/**
 * Template — 차팅 템플릿 타입.
 */
export type TemplateField =
  | 'chiefComplaint'
  | 'onset'
  | 'presentIllness'
  | 'pastHistory'
  | 'reviewOfSystem'
  | 'physicalExam'
  | 'plan'
  | 'guardianExplanation'
  | 'etc'
  | 'standingOrders'
  | 'global';

export interface Template {
  id: string;
  field: string; // TemplateField 값 또는 'global'
  name: string;
  content: string;
  createdAt: Date;
}
