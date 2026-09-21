export type NoteType = 'progress' | 'reminder';

export interface Note {
  id: string;
  patientId: string;
  content: string;
  type: NoteType;
  alertDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteCreateInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & {
  /** 지난 날짜로 적을 때만 지정한다. 없으면 서버 기본값(now) */
  createdAt?: Date;
};
export type NoteUpdateInput = Partial<Omit<Note, 'id' | 'patientId' | 'createdBy' | 'createdAt' | 'updatedAt'>>;

