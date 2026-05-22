export interface Schedule {
  id: string;
  patientId: string;
  title: string;
  scheduledDate: Date;
  scheduledTime?: string;
  category: string;
  isCompleted: boolean;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduleCreateInput = Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>;
export type ScheduleUpdateInput = Partial<Omit<Schedule, 'id' | 'patientId' | 'createdBy' | 'createdAt' | 'updatedAt'>>;

