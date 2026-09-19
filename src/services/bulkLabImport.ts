/**
 * Bulk Lab Import Service
 *
 * 병원 OCS에서 내보낸 XLS 파일을 일괄 파싱하여
 * 등록된 환자와 차트번호(registrationNumber)로 매칭 후 저장합니다.
 *
 * ────────────────────────────────────────────────
 * 자동화 에이전트 사용 예시:
 *
 *   import { bulkLabImport } from '@/services/bulkLabImport';
 *
 *   // 파일 처리 + 미리보기
 *   const preview = await bulkLabImport.processFile(arrayBuffer);
 *   console.log(`매칭된 환자: ${preview.matched.length}명`);
 *   console.log(`미매칭: ${preview.unmatched.length}명`);
 *
 *   // 전체 저장 (확인 없이 자동 저장)
 *   const result = await bulkLabImport.saveAll(preview);
 *   console.log(`저장 완료: ${result.savedPatients}명 / ${result.savedItems}개 항목`);
 *
 *   // 특정 환자만 저장
 *   await bulkLabImport.savePatient(preview.matched[0]);
 * ────────────────────────────────────────────────
 */

import type { LabItem } from '@/types/lab';
import type { Patient } from '@/types/patient';
import { parseLabXls, type XlsPatientGroup, type ParsedLabItem } from './parser/labParser';
import { parseLocalDate } from '@/utils/dateUtils';
import {
  createLabResult,
  listNonCultureLabHeadersByPatients,
  listLabsByPatientDateAndCategory,
  softDeleteLabResult,
} from '@/data/labs.repository';
import { listActivePatients } from '@/data/patients.repository';
import { normalizeRegistrationNumber } from '@/lib/registrationNumber';
import { supabase } from '@/lib/supabase';
import { toDomainLabItemCreateInput } from '@/mappers/clinicalView.mapper';
import { fromDomainPatient } from '@/mappers/patientView.mapper';

// ─────────────────────────────────────────────────
// Types (exported for UI and automation use)
// ─────────────────────────────────────────────────

export interface MatchedPatient {
  patient: Patient;
  group: XlsPatientGroup;
  /** Test date resolved from XLS orderDate, defaults to today */
  testDate: Date;
  itemCount: number;
  selected: boolean;
}

export interface BulkImportPreview {
  matched: MatchedPatient[];
  /** Groups with no matching registrationNumber in DB */
  unmatched: XlsPatientGroup[];
  totalGroups: number;
  fileDate?: string; // Most common date found in file
}

export interface BulkImportResult {
  savedPatients: number;
  savedItems: number;
  failedPatients: number;
  errors: { patientId: string; name: string; error: string }[];
}

// ─────────────────────────────────────────────────
// Core service (no React dependencies)
// ─────────────────────────────────────────────────

/**
 * Parse XLS buffer and match against registered patients.
 * Call this first to get a preview before saving.
 */
async function processFile(buffer: ArrayBuffer): Promise<BulkImportPreview> {
  const groups = await parseLabXls(buffer);

  // Load all active patients from the server.
  // 매칭 기준(앞자리 0 무시)은 `lib/registrationNumber`에 한 번만 정의되어 있으며
  // 환자 등록 화면의 중복 검사도 같은 함수를 쓴다.
  const allPatients = (await listActivePatients()).map(fromDomainPatient);
  const byRegNum = new Map<string, Patient>();
  for (const p of allPatients) {
    const key = normalizeRegistrationNumber(p.registrationNumber);
    if (key) byRegNum.set(key, p);
  }

  const matched: MatchedPatient[] = [];
  const unmatched: XlsPatientGroup[] = [];

  for (const group of groups) {
    const regNumKey = normalizeRegistrationNumber(group.registrationNumber);
    const patient = regNumKey ? byRegNum.get(regNumKey) : undefined;

    if (patient) {
      const testDate = group.orderDate
        ? parseLocalDate(group.orderDate.replace(/[/.]/g, '-'))
        : new Date();

      matched.push({
        patient,
        group,
        testDate,
        itemCount: group.items.length,
        selected: true, // Pre-select all matched by default
      });
    } else {
      unmatched.push(group);
    }
  }

  // Determine most common file date
  const dates = matched
    .map((m) => group_orderDate(m.group))
    .filter(Boolean) as string[];
  const dateFreq = new Map<string, number>();
  for (const d of dates) dateFreq.set(d, (dateFreq.get(d) ?? 0) + 1);
  const fileDate = [...dateFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    matched,
    unmatched,
    totalGroups: groups.length,
    fileDate,
  };
}

function group_orderDate(group: XlsPatientGroup): string | undefined {
  return group.orderDate;
}

/**
 * Save all selected matched patients from a preview.
 * Can be called by automation without UI confirmation.
 */
async function saveAll(preview: BulkImportPreview): Promise<BulkImportResult> {
  const toSave = preview.matched.filter((m) => m.selected);
  let savedPatients = 0;
  let savedItems = 0;
  const errors: BulkImportResult['errors'] = [];

  for (const match of toSave) {
    try {
      await savePatient(match);
      savedPatients++;
      savedItems += match.itemCount;
    } catch (err) {
      errors.push({
        patientId: match.patient.id,
        name: match.patient.name,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return {
    savedPatients,
    savedItems,
    failedPatients: errors.length,
    errors,
  };
}

/**
 * Save a single matched patient's lab results.
 * Groups items by category and upserts one LabResult per category.
 * 같은 환자+날짜+카테고리 데이터가 이미 있으면 교체 (재임포트 시 중복 방지).
 */
async function savePatient(match: MatchedPatient): Promise<void> {
  const { patient, group, testDate } = match;
  const grouped = groupByCategory(group.items);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('User not authenticated.');

  for (const [category, items] of grouped.entries()) {
    const labItems: LabItem[] = items.map((item) => ({
      code: item.code || undefined,
      name: item.name,
      value: item.value,
      unit: item.unit,
      referenceMin: item.referenceMin,
      referenceMax: item.referenceMax,
      isAbnormal: item.flag !== '',
      hlFlag: item.flag || undefined,
    }));

    // 같은 환자+날짜+카테고리의 기존 레코드를 지우고 다시 저장한다 (upsert)
    const existing = await listLabsByPatientDateAndCategory({
      patientId: patient.id,
      testDate,
      category,
    });
    for (const lab of existing) {
      await softDeleteLabResult(lab.id);
    }

    await createLabResult({
      patientId: patient.id,
      testDate,
      category,
      source: 'xls',
      createdBy: user.id,
      items: labItems.map((item, index) => toDomainLabItemCreateInput(item, index)),
    });
  }
}

function groupByCategory(items: ParsedLabItem[]): Map<string, ParsedLabItem[]> {
  const map = new Map<string, ParsedLabItem[]>();
  for (const item of items) {
    const cat = item.category || 'Other';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return map;
}

// ─────────────────────────────────────────────────
// Recent Lab status by patient
// ─────────────────────────────────────────────────

export interface RecentLabStatus {
  patientId: string;
  patientName: string;
  roomBed: string;
  patientType: 'admitted' | 'consult';
  registrationNumber: string;
  latestLabDate: string | null; // YYYY-MM-DD, null if no lab
  daysSinceLatest: number | null;
}

/**
 * 등록된 활성 환자(입원/컨설트)별로 최신 Lab 날짜를 집계합니다.
 * Lab 파싱 시작 전 "누가 언제까지 Lab 이 들어가있는지" 한눈에 보기 위함.
 */
async function getRecentLabStatus(): Promise<RecentLabStatus[]> {
  const patients = (await listActivePatients()).map(fromDomainPatient);
  const labs = await listNonCultureLabHeadersByPatients(patients.map((patient) => patient.id));
  const latestByPatient = new Map<string, Date>();

  for (const lab of labs) {
    const existing = latestByPatient.get(lab.patientId);
    if (!existing || lab.testDate > existing) {
      latestByPatient.set(lab.patientId, lab.testDate);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const result = patients.map((patient): RecentLabStatus => {
    const latest = latestByPatient.get(patient.id);
    let daysSince: number | null = null;
    if (latest) {
      const latestStart = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate());
      daysSince = Math.floor((today.getTime() - latestStart.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      patientId: patient.id,
      patientName: patient.name,
      roomBed: patient.roomBed,
      patientType: patient.patientType,
      registrationNumber: patient.registrationNumber ?? '',
      latestLabDate: latest ? toDateStr(latest) : null,
      daysSinceLatest: daysSince,
    };
  });

  return result.sort((a, b) => {
    if (a.latestLabDate === null && b.latestLabDate !== null) return -1;
    if (a.latestLabDate !== null && b.latestLabDate === null) return 1;
    if (a.latestLabDate && b.latestLabDate) {
      return a.latestLabDate.localeCompare(b.latestLabDate);
    }
    return a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true });
  });
}

// ─────────────────────────────────────────────────
// Export as singleton service object
// (automation agents import this directly)
// ─────────────────────────────────────────────────

export const bulkLabImport = {
  processFile,
  saveAll,
  savePatient,
  getRecentLabStatus,
};
