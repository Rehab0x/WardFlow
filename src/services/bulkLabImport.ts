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

import { db } from '@/db/database';
import type { Patient, LabItem } from '@/db/database';
import { parseLabXls, type XlsPatientGroup, type ParsedLabItem } from './parser/labParser';
import { parseLocalDate } from '@/utils/dateUtils';
import { useSupabaseBackend } from '@/config/backend';
import { createLabResult, listLabsByPatient, softDeleteLabResult } from '@/data/labs.repository';
import { listPatients } from '@/data/patients.repository';
import { supabase } from '@/lib/supabase';
import {
  fromDomainLabResult,
  toDomainLabItemCreateInput,
} from '@/mappers/legacyClinical.mapper';
import { fromDomainPatient } from '@/mappers/legacyPatient.mapper';

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

  // Load all patients from the active backend
  const allPatients = useSupabaseBackend
    ? (await listPatients()).map(fromDomainPatient)
    : await db.patients.toArray();
  const byRegNum = new Map<string, Patient>();
  for (const p of allPatients) {
    if (p.registrationNumber) {
      const raw = p.registrationNumber.trim();
      byRegNum.set(raw, p);
      // Also index by stripped leading zeros (e.g. "0000004532" → "4532")
      byRegNum.set(raw.replace(/^0+/, ''), p);
    }
  }

  const matched: MatchedPatient[] = [];
  const unmatched: XlsPatientGroup[] = [];

  for (const group of groups) {
    const regNum = group.registrationNumber?.trim();
    // Match by exact or leading-zero-stripped registration number
    const patient = regNum
      ? (byRegNum.get(regNum) ?? byRegNum.get(regNum.replace(/^0+/, '')))
      : undefined;

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

  // 날짜를 YYYY-MM-DD 문자열로 비교 (timezone 무관)
  const dateKey = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;

  const now = new Date();
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

    if (useSupabaseBackend) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated.');

      const existing = await listLabsByPatient(patient.id);
      for (const lab of existing) {
        const labDateKey = `${lab.testDate.getFullYear()}-${String(lab.testDate.getMonth() + 1).padStart(2, '0')}-${String(lab.testDate.getDate()).padStart(2, '0')}`;
        if (lab.category === category && labDateKey === dateKey) {
          await softDeleteLabResult(lab.id);
        }
      }

      await createLabResult({
        patientId: patient.id,
        testDate,
        category,
        source: 'xls',
        createdBy: user.id,
        items: labItems.map((item, index) => toDomainLabItemCreateInput(item, index)),
      });
      continue;
    }

    // 같은 환자+카테고리의 기존 레코드 중 날짜가 같은 것을 삭제 (upsert)
    const existing = await db.labResults
      .where('[patientId+category]')
      .equals([patient.id, category])
      .toArray();
    for (const e of existing) {
      const eDateKey = `${e.testDate.getFullYear()}-${String(e.testDate.getMonth() + 1).padStart(2, '0')}-${String(e.testDate.getDate()).padStart(2, '0')}`;
      if (eDateKey === dateKey) {
        await db.labResults.delete(e.id);
      }
    }

    await db.labResults.add({
      id: crypto.randomUUID(),
      patientId: patient.id,
      testDate,
      category,
      items: labItems,
      source: 'xls',
      createdAt: now,
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
  if (useSupabaseBackend) {
    const patients = (await listPatients())
      .map(fromDomainPatient)
      .filter((patient) => patient.status === 'active');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const result = await Promise.all(
      patients.map(async (patient): Promise<RecentLabStatus> => {
        const labs = (await listLabsByPatient(patient.id)).map(fromDomainLabResult);
        const latest = labs
          .filter((lab) => lab.category !== 'Culture')
          .map((lab) => lab.testDate)
          .sort((a, b) => b.getTime() - a.getTime())[0];

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
      })
    );

    return result.sort((a, b) => {
      if (a.latestLabDate === null && b.latestLabDate !== null) return -1;
      if (a.latestLabDate !== null && b.latestLabDate === null) return 1;
      if (a.latestLabDate && b.latestLabDate) {
        return a.latestLabDate.localeCompare(b.latestLabDate);
      }
      return a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true });
    });
  }

  const patients = await db.patients
    .where('status')
    .equals('active')
    .toArray();

  const allLabs = await db.labResults.toArray();

  // Latest non-Culture lab per patient
  const latestByPatient = new Map<string, Date>();
  for (const lab of allLabs) {
    if (lab.category === 'Culture') continue;
    const existing = latestByPatient.get(lab.patientId);
    if (!existing || lab.testDate > existing) {
      latestByPatient.set(lab.patientId, lab.testDate);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const result: RecentLabStatus[] = patients.map((p) => {
    const latest = latestByPatient.get(p.id);
    let daysSince: number | null = null;
    if (latest) {
      const latestStart = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate());
      daysSince = Math.floor((today.getTime() - latestStart.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      patientId: p.id,
      patientName: p.name,
      roomBed: p.roomBed,
      patientType: p.patientType,
      registrationNumber: p.registrationNumber ?? '',
      latestLabDate: latest ? toDateStr(latest) : null,
      daysSinceLatest: daysSince,
    };
  });

  // Sort: never-lab first, then oldest lab first (most urgent to update)
  result.sort((a, b) => {
    if (a.latestLabDate === null && b.latestLabDate !== null) return -1;
    if (a.latestLabDate !== null && b.latestLabDate === null) return 1;
    if (a.latestLabDate && b.latestLabDate) {
      return a.latestLabDate.localeCompare(b.latestLabDate);
    }
    return a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true });
  });

  return result;
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
