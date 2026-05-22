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

export type NoteCreateInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
export type NoteUpdateInput = Partial<Omit<Note, 'id' | 'patientId' | 'createdBy' | 'createdAt' | 'updatedAt'>>;

