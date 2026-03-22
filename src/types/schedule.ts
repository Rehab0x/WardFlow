/**
 * Schedule related types
 * Re-export from database.ts
 */
export type { Schedule } from '../db/database';

// 기본 카테고리 ID들 (커스텀 카테고리는 useScheduleCategoryStore에서 관리)
export type ScheduleCategory = string;
