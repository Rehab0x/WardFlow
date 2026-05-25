import type { UserRole, WardLinkModule } from '@/types/user';

export const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'doctor', label: '의사' },
  { value: 'nurse', label: '간호사' },
  { value: 'therapist', label: '치료사' },
];

export const AVAILABLE_MODULES: {
  value: WardLinkModule;
  label: string;
  description: string;
}[] = [
  { value: 'wardflow', label: 'WardFlow', description: '입원환자 관리' },
  { value: 'wardcare', label: 'WardCare', description: '간호 기록 (준비 중)' },
];
