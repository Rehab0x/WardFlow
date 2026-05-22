export type UserRole = 'admin' | 'doctor' | 'nurse' | 'therapist';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  username?: string;
  displayName: string;
  department?: string;
  role: UserRole;
  status: UserStatus;
  modules: string[];
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterProfileInput {
  email: string;
  password: string;
  username?: string;
  displayName: string;
  department?: string;
}

