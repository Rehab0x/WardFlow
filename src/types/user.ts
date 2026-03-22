/**
 * User and Authentication types
 */

/**
 * User role in the system
 */
export type UserRole = 'doctor' | 'nurse' | 'therapist' | 'admin';

/**
 * User approval status
 */
export type UserStatus = 'pending' | 'approved' | 'rejected';

/**
 * Available WardLink modules
 */
export type WardLinkModule = 'wardflow' | 'wardcare';

/**
 * User interface
 */
export interface User {
  id: string;
  username: string; // 로그인 ID (unique)
  name: string; // 실명
  role: UserRole;
  department?: string; // 소속 과 (예: "내과", "외과")
  email?: string;
  phone?: string;

  // Registration & Approval
  status: UserStatus; // 가입 승인 상태
  approvedBy?: string; // 승인한 관리자 ID
  approvedAt?: Date; // 승인 일시
  modules: WardLinkModule[]; // 승인된 모듈 목록 (예: ['wardflow'])

  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Authentication credentials (password는 해시된 상태로 저장)
 */
export interface AuthCredentials {
  userId: string;
  passwordHash: string; // bcrypt or similar
  pin?: string; // 빠른 잠금/해제용 (4-6자리 숫자)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session information
 */
export interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Login request
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}
