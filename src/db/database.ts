import Dexie, { type EntityTable } from 'dexie';
import type { User, AuthCredentials, UserRole, UserStatus, WardLinkModule } from '@/types/user';

// Re-export user types
export type { User, AuthCredentials, UserRole, UserStatus, WardLinkModule };

// Type definitions
export interface Patient {
  id: string;
  // Basic info
  registrationNumber: string; // 환자등록번호 (필수) - 외부 Lab 파일 매칭용
  name: string;
  birthDate: Date;
  sex: 'M' | 'F';
  roomBed: string; // "301" or "301-1" (bed number is optional)
  admissionDate: Date;
  dischargeDate?: Date;
  attendingPhysician: string;
  patientType: 'admitted' | 'consult'; // 입원환자 vs 컨설트환자
  status: 'active' | 'discharged';

  // Ownership (의사별 환자 구분)
  createdBy: string; // User ID who created this patient
  sharedWith?: string[]; // User IDs who can access this patient (for collaboration)

  // Tags for patient overview (주의사항)
  tags?: string[]; // ['#Hypernatremia', '#Recurrent pneumonia']

  // Attention flag (수동 체크 — 주의 필요 환자 표시)
  attention?: boolean;

  // Charting fields (C/C ~ Etc)
  chiefComplaint: string;
  onset: string;
  presentIllness: string;
  pastHistory: string;
  reviewOfSystem: string;
  physicalExam: string;
  problemList: string[]; // Array for list mode
  plan: string;
  guardianExplanation: string;
  etc: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface LabResult {
  id: string;
  patientId: string;
  testDate: Date;
  category: string; // 'Chemistry', 'CBC', 'Electrolyte', 'UA', etc.
  items: LabItem[];
  source: 'manual' | 'parsed' | 'csv' | 'xls';
  rawText?: string;
  createdAt: Date;
}

export interface LabItem {
  code?: string; // B2500, B1050, etc.
  name: string; // 'Na', 'K', 'WBC'
  value: number | string; // Can be text for culture results
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  isAbnormal: boolean;
  hlFlag?: 'H' | 'L'; // High/Low flag from OCS
}

export interface Medication {
  id: string;
  patientId: string;

  // Category: 처방약 / 지참약 / 항생제
  category: 'hospital' | 'personal' | 'antibiotic';

  // Common fields
  drugName: string; // Full name with dosage
  drugBaseName: string; // Base name for search

  // For 처방약/지참약 (Parsed from OCS)
  singleDose: number; // 1회 투약량 (예: 1)
  schedule: string; // 투약 시간 (예: "아침,저녁")
  timing?: string; // 복용 타이밍 (예: "식전 30분", "식후 30분", null)
  daysRemaining?: number; // From OCS paste (표시하지 않음, 파싱용)

  // For 항생제 (Free-text manual input)
  dosage?: string; // 하루 용량 + 단위 (예: "4V", "2g")
  frequency?: string; // 용법 (예: "#4", "#2")

  // Management
  startDate: Date;
  endDate?: Date; // 항생제 종료일 (항생제는 필수)
  isAntibiotic: boolean; // Deprecated: use category === 'antibiotic' instead
  isActive: boolean;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  patientId: string;
  content: string;
  type: 'progress' | 'reminder'; // 변경: rounding, todo 제거
  alertDate?: Date; // 추가: 알림 날짜 (reminder 타입일 때만 사용)
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  patientId: string;
  title: string;
  scheduledDate: Date;
  scheduledTime?: string;
  category: string;
  isCompleted: boolean;
  notes?: string;
  createdAt: Date;
}

export interface Alert {
  id: string;
  patientId: string;
  type: 'lab_abnormal' | 'antibiotic_duration' | 'schedule' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  triggeredAt: Date;
  readAt?: Date;
}

export interface Template {
  id: string;
  field: string; // 'chiefComplaint', 'presentIllness', 'global'
  name: string;
  content: string;
  createdAt: Date;
}

export interface LabDisplayCategory {
  id: string;
  name: string;       // "CBC", "LFT", "Electrolyte", etc.
  order: number;      // Sort order for display (0 = first)
  items: string[];    // Ordered display names of items in this category
}

// Dexie database with performance-optimized compound indexes
const db = new Dexie('WardFlowDB') as Dexie & {
  users: EntityTable<User, 'id'>;
  authCredentials: EntityTable<AuthCredentials, 'userId'>;
  patients: EntityTable<Patient, 'id'>;
  labResults: EntityTable<LabResult, 'id'>;
  medications: EntityTable<Medication, 'id'>;
  notes: EntityTable<Note, 'id'>;
  schedules: EntityTable<Schedule, 'id'>;
  alerts: EntityTable<Alert, 'id'>;
  templates: EntityTable<Template, 'id'>;
  labCategories: EntityTable<LabDisplayCategory, 'id'>;
};

// Schema with compound indexes for performance
// See PRD.md section 7.3 for indexing strategy

// Version 1: Original schema
db.version(1).stores({
  patients: 'id, status, roomBed, name, admissionDate, [status+roomBed]',
  labResults: 'id, patientId, testDate, [patientId+testDate], [patientId+category]',
  medications: 'id, patientId, isActive, isAntibiotic, [patientId+isActive], [isAntibiotic+isActive]',
  notes: 'id, patientId, createdAt, [patientId+createdAt], *tags',
  schedules: 'id, patientId, scheduledDate, [patientId+scheduledDate], [scheduledDate+isCompleted]',
  alerts: 'id, patientId, isRead, severity, triggeredAt, [isRead+severity]',
  templates: 'id, field, name',
});

// Version 2: Add authentication and user management
db.version(2).stores({
  // Users table - indexed by username for login
  users: 'id, username, role, name',

  // Auth credentials - userId is the primary key (one-to-one with users)
  authCredentials: 'userId',

  // Update patients with createdBy and sharedWith for access control
  // [createdBy+status+roomBed] for user's active patients sorted by room
  // [status+roomBed] kept for backwards compatibility
  patients: 'id, status, roomBed, name, admissionDate, createdBy, [status+roomBed], [createdBy+status+roomBed], *sharedWith',

  // Keep other tables as-is
  labResults: 'id, patientId, testDate, [patientId+testDate], [patientId+category]',
  medications: 'id, patientId, isActive, isAntibiotic, [patientId+isActive], [isAntibiotic+isActive]',
  notes: 'id, patientId, createdAt, [patientId+createdAt], *tags',
  schedules: 'id, patientId, scheduledDate, [patientId+scheduledDate], [scheduledDate+isCompleted]',
  alerts: 'id, patientId, isRead, severity, triggeredAt, [isRead+severity]',
  templates: 'id, field, name',
}).upgrade(async (trans) => {
  // Migration: Add createdBy field to existing patients
  // For now, assign to a default "admin" user
  const patients = await trans.table('patients').toArray();
  await Promise.all(
    patients.map((patient) =>
      trans.table('patients').update(patient.id, {
        createdBy: 'admin', // Default value for existing patients
        sharedWith: [],
      })
    )
  );
});

// Version 3: Add registrationNumber as required field
db.version(3).stores({
  // Users table - no change
  users: 'id, username, role, name',

  // Auth credentials - no change
  authCredentials: 'userId',

  // Update patients to add registrationNumber to indexes
  patients: 'id, registrationNumber, status, roomBed, name, admissionDate, createdBy, [status+roomBed], [createdBy+status+roomBed], *sharedWith',

  // Keep other tables as-is
  labResults: 'id, patientId, testDate, [patientId+testDate], [patientId+category]',
  medications: 'id, patientId, isActive, isAntibiotic, [patientId+isActive], [isAntibiotic+isActive]',
  notes: 'id, patientId, createdAt, [patientId+createdAt], *tags',
  schedules: 'id, patientId, scheduledDate, [patientId+scheduledDate], [scheduledDate+isCompleted]',
  alerts: 'id, patientId, isRead, severity, triggeredAt, [isRead+severity]',
  templates: 'id, field, name',
}).upgrade(async (trans) => {
  // Migration: Add registrationNumber to existing patients
  const patients = await trans.table('patients').toArray();
  await Promise.all(
    patients.map((patient: any, index: number) =>
      trans.table('patients').update(patient.id, {
        registrationNumber: `TEMP${String(index + 1).padStart(8, '0')}`, // Temporary value for existing patients
      })
    )
  );
});

// Version 4: Redesign note system (remove tags from notes, add to patients; change note types)
db.version(4).stores({
  // Users table - no change
  users: 'id, username, role, name',

  // Auth credentials - no change
  authCredentials: 'userId',

  // Update patients to add *tags multi-entry index
  patients: 'id, registrationNumber, status, roomBed, name, admissionDate, createdBy, [status+roomBed], [createdBy+status+roomBed], *sharedWith, *tags',

  // Keep other tables as-is
  labResults: 'id, patientId, testDate, [patientId+testDate], [patientId+category]',
  medications: 'id, patientId, isActive, isAntibiotic, [patientId+isActive], [isAntibiotic+isActive]',

  // Update notes: remove *tags index, add alertDate
  notes: 'id, patientId, createdAt, alertDate, [patientId+createdAt]',

  schedules: 'id, patientId, scheduledDate, [patientId+scheduledDate], [scheduledDate+isCompleted]',
  alerts: 'id, patientId, isRead, severity, triggeredAt, [isRead+severity]',
  templates: 'id, field, name',
}).upgrade(async () => {
  // Migration: Notes - tags 필드는 자동으로 무시됨 (Dexie는 undefined 필드 무시)
  // Migration: Patients - tags 필드 추가는 자동 처리 (빈 배열 또는 undefined)
  // No explicit migration needed as Dexie handles this automatically
});

// Version 5: Add labCategories table for customizable lab display grouping
db.version(5).stores({
  users: 'id, username, role, name',
  authCredentials: 'userId',
  patients: 'id, registrationNumber, status, roomBed, name, admissionDate, createdBy, [status+roomBed], [createdBy+status+roomBed], *sharedWith, *tags',
  labResults: 'id, patientId, testDate, [patientId+testDate], [patientId+category]',
  medications: 'id, patientId, isActive, isAntibiotic, [patientId+isActive], [isAntibiotic+isActive]',
  notes: 'id, patientId, createdAt, alertDate, [patientId+createdAt]',
  schedules: 'id, patientId, scheduledDate, [patientId+scheduledDate], [scheduledDate+isCompleted]',
  alerts: 'id, patientId, isRead, severity, triggeredAt, [isRead+severity]',
  templates: 'id, field, name',
  labCategories: 'id, order',
});

// Version 6: Add user registration & approval system (status, modules fields)
db.version(6).stores({
  users: 'id, username, role, name, status',
  authCredentials: 'userId',
  patients: 'id, registrationNumber, status, roomBed, name, admissionDate, createdBy, [status+roomBed], [createdBy+status+roomBed], *sharedWith, *tags',
  labResults: 'id, patientId, testDate, [patientId+testDate], [patientId+category]',
  medications: 'id, patientId, isActive, isAntibiotic, [patientId+isActive], [isAntibiotic+isActive]',
  notes: 'id, patientId, createdAt, alertDate, [patientId+createdAt]',
  schedules: 'id, patientId, scheduledDate, [patientId+scheduledDate], [scheduledDate+isCompleted]',
  alerts: 'id, patientId, isRead, severity, triggeredAt, [isRead+severity]',
  templates: 'id, field, name',
  labCategories: 'id, order',
}).upgrade(async (trans) => {
  // Migration: Add status and modules to existing users
  const users = await trans.table('users').toArray();
  await Promise.all(
    users.map((user: any) =>
      trans.table('users').update(user.id, {
        status: 'approved', // 기존 유저는 모두 승인 상태
        modules: ['wardflow'], // 기존 유저는 WardFlow 접근 권한 부여
      })
    )
  );
});

export { db };
