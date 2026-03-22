/**
 * DB 인덱스 쿼리 성능 테스트
 * 50명 환자 기준 주요 쿼리가 300ms 이내에 완료되는지 검증
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from './database';

const PATIENT_COUNT = 50;
const LAB_PER_PATIENT = 5; // 5일치 Lab
const MED_PER_PATIENT = 6; // 환자당 투약 6개
const NOTE_PER_PATIENT = 3;
const PERF_LIMIT_MS = 300;

function generateId() {
  return crypto.randomUUID();
}

beforeAll(async () => {
  // 50명 환자 + 관련 데이터 시드
  const now = new Date();
  const userId = generateId();

  // User
  await db.users.add({
    id: userId,
    username: 'testdoc',
    name: '테스트의사',
    role: 'doctor',
    department: '내과',
    status: 'approved',
    modules: ['wardflow'],
    createdAt: now,
    updatedAt: now,
  });

  // Patients
  const patientIds: string[] = [];
  for (let i = 0; i < PATIENT_COUNT; i++) {
    const pid = generateId();
    patientIds.push(pid);
    await db.patients.add({
      id: pid,
      registrationNumber: String(1000000 + i),
      name: `환자${i + 1}`,
      birthDate: new Date(1970 + (i % 50), i % 12, (i % 28) + 1),
      sex: i % 2 === 0 ? 'M' : 'F',
      roomBed: `${500 + Math.floor(i / 4)}-${(i % 4) + 1}`,
      admissionDate: new Date(2026, 2, 1),
      attendingPhysician: '테스트의사',
      status: 'active',
      patientType: i < 40 ? 'admitted' : 'consult',
      createdBy: userId,
      sharedWith: [],
      tags: i % 5 === 0 ? ['주의'] : [],
      chiefComplaint: '',
      onset: '',
      presentIllness: '',
      pastHistory: '',
      reviewOfSystem: '',
      physicalExam: '',
      problemList: [],
      plan: '',
      guardianExplanation: '',
      etc: '',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Lab results (50 * 5 = 250 records)
  for (const pid of patientIds) {
    for (let d = 0; d < LAB_PER_PATIENT; d++) {
      const testDate = new Date(2026, 2, 18 + d);
      await db.labResults.add({
        id: generateId(),
        patientId: pid,
        testDate,
        category: 'CBC',
        items: [
          { name: 'WBC', value: 6500 + Math.random() * 5000, unit: '/uL', isAbnormal: false },
          { name: 'Hb', value: 12 + Math.random() * 4, unit: 'g/dL', isAbnormal: false },
          { name: 'PLT', value: 150000 + Math.random() * 200000, unit: '/uL', isAbnormal: false },
        ],
        source: 'xls',
        createdAt: now,
      });
    }
  }

  // Medications (50 * 6 = 300 records)
  for (const pid of patientIds) {
    for (let m = 0; m < MED_PER_PATIENT; m++) {
      const isAbx = m < 2;
      await db.medications.add({
        id: generateId(),
        patientId: pid,
        drugName: isAbx ? `항생제${m + 1}` : `일반약${m + 1}`,
        drugBaseName: isAbx ? `항생제${m + 1}` : `일반약${m + 1}`,
        singleDose: 1,
        schedule: '아침,저녁',
        dosage: '500mg',
        frequency: 'TID',
        startDate: new Date(2026, 2, 10),
        isActive: true,
        isAntibiotic: isAbx,
        category: isAbx ? 'antibiotic' : 'hospital',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Notes (50 * 3 = 150 records)
  for (const pid of patientIds) {
    for (let n = 0; n < NOTE_PER_PATIENT; n++) {
      await db.notes.add({
        id: generateId(),
        patientId: pid,
        content: `환자 경과 메모 ${n + 1}. 오늘 상태 양호.`,
        type: n === 0 ? 'reminder' : 'progress',
        alertDate: n === 0 ? now : undefined,
        createdAt: new Date(2026, 2, 20 + n),
        updatedAt: now,
      });
    }
  }
});

afterAll(async () => {
  await db.delete();
});

describe('DB 인덱스 쿼리 성능 (50명 환자)', () => {
  it('환자 목록 조회 (status + roomBed 복합 인덱스) < 300ms', async () => {
    const start = performance.now();
    const result = await db.patients
      .where('[status+roomBed]')
      .between(['active', Dexie.minKey], ['active', Dexie.maxKey])
      .toArray();
    const elapsed = performance.now() - start;

    expect(result.length).toBe(PATIENT_COUNT);
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('의사별 환자 조회 (createdBy + status 복합 인덱스) < 300ms', async () => {
    const user = await db.users.where('username').equals('testdoc').first();
    expect(user).toBeDefined();

    const start = performance.now();
    const result = await db.patients
      .where('[createdBy+status+roomBed]')
      .between([user!.id, 'active', Dexie.minKey], [user!.id, 'active', Dexie.maxKey])
      .toArray();
    const elapsed = performance.now() - start;

    expect(result.length).toBe(PATIENT_COUNT);
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('환자별 Lab 조회 (patientId + testDate 복합 인덱스) < 300ms', async () => {
    const patient = await db.patients.toCollection().first();
    expect(patient).toBeDefined();

    const start = performance.now();
    const result = await db.labResults
      .where('[patientId+testDate]')
      .between([patient!.id, Dexie.minKey], [patient!.id, Dexie.maxKey])
      .toArray();
    const elapsed = performance.now() - start;

    expect(result.length).toBe(LAB_PER_PATIENT);
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('환자별 Lab 카테고리 조회 (patientId + category 복합 인덱스) < 300ms', async () => {
    const patient = await db.patients.toCollection().first();

    const start = performance.now();
    const result = await db.labResults
      .where('[patientId+category]')
      .equals([patient!.id, 'CBC'])
      .toArray();
    const elapsed = performance.now() - start;

    expect(result.length).toBe(LAB_PER_PATIENT);
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('활성 항생제 조회 (patientId 인덱스 + filter) < 300ms', async () => {
    const start = performance.now();
    const result = await db.medications
      .filter(m => m.isAntibiotic === true && m.isActive === true)
      .toArray();
    const elapsed = performance.now() - start;

    // 50 patients * 2 antibiotics = 100
    expect(result.length).toBe(PATIENT_COUNT * 2);
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('환자별 투약 조회 (patientId 인덱스 + filter) < 300ms', async () => {
    const patient = await db.patients.toCollection().first();

    const start = performance.now();
    const result = await db.medications
      .where('patientId')
      .equals(patient!.id)
      .filter(m => m.isActive === true)
      .toArray();
    const elapsed = performance.now() - start;

    expect(result.length).toBe(MED_PER_PATIENT);
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('환자별 메모 조회 (patientId + createdAt 복합 인덱스) < 300ms', async () => {
    const patient = await db.patients.toCollection().first();

    const start = performance.now();
    const result = await db.notes
      .where('[patientId+createdAt]')
      .between([patient!.id, Dexie.minKey], [patient!.id, Dexie.maxKey])
      .toArray();
    const elapsed = performance.now() - start;

    expect(result.length).toBe(NOTE_PER_PATIENT);
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('전체 메모 검색 (toArray + JS filter) < 300ms', async () => {
    const start = performance.now();
    const allNotes = await db.notes.orderBy('createdAt').reverse().toArray();
    const filtered = allNotes.filter(n => n.content.includes('경과'));
    const elapsed = performance.now() - start;

    expect(filtered.length).toBe(PATIENT_COUNT * NOTE_PER_PATIENT); // all notes contain '경과'
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('등록번호로 환자 조회 (registrationNumber 인덱스) < 300ms', async () => {
    const start = performance.now();
    const result = await db.patients
      .where('registrationNumber')
      .equals('1000025')
      .first();
    const elapsed = performance.now() - start;

    expect(result).toBeDefined();
    expect(result!.name).toBe('환자26');
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });

  it('알림 메모 날짜 조회 (alertDate 인덱스) < 300ms', async () => {
    const start = performance.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.notes
      .where('alertDate')
      .between(today, tomorrow)
      .toArray();
    const elapsed = performance.now() - start;

    expect(result.length).toBe(PATIENT_COUNT); // 1 reminder per patient
    expect(elapsed).toBeLessThan(PERF_LIMIT_MS);
  });
});
