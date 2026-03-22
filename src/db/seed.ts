import { db } from './database';
import type { Patient, LabResult, Medication, Note, User, AuthCredentials } from './database';

/**
 * Development seed data
 * Run this to populate the database with test data
 */
export async function seedDatabase() {
  // Clear existing data
  await db.users.clear();
  await db.authCredentials.clear();
  await db.patients.clear();
  await db.labResults.clear();
  await db.medications.clear();
  await db.notes.clear();
  await db.schedules.clear();
  await db.alerts.clear();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Seed users
  const users: User[] = [
    {
      id: 'doctor1',
      username: 'doctor1',
      name: '홍길동',
      role: 'doctor',
      department: '내과',
      email: 'doctor1@hospital.com',
      status: 'approved',
      modules: ['wardflow'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'doctor2',
      username: 'doctor2',
      name: '김민수',
      role: 'doctor',
      department: '외과',
      email: 'doctor2@hospital.com',
      status: 'approved',
      modules: ['wardflow'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'nurse1',
      username: 'nurse1',
      name: '박간호',
      role: 'nurse',
      department: '3병동',
      email: 'nurse1@hospital.com',
      status: 'approved',
      modules: ['wardflow'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'admin',
      username: 'admin',
      name: '관리자',
      role: 'admin',
      email: 'admin@hospital.com',
      status: 'approved',
      modules: ['wardflow'],
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.users.bulkAdd(users);

  // Seed auth credentials (plaintext for dev only - NOT SECURE!)
  const authCredentials: AuthCredentials[] = [
    {
      userId: 'doctor1',
      passwordHash: 'password', // In production, use bcrypt
      pin: '1234',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'doctor2',
      passwordHash: 'password',
      pin: '5678',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'nurse1',
      passwordHash: 'password',
      pin: '9999',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'admin',
      passwordHash: 'password',
      pin: '0000',
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.authCredentials.bulkAdd(authCredentials);

  // Seed patients
  const patients: Patient[] = [
    {
      id: 'p1',
      registrationNumber: '12345678',
      name: '김철수',
      birthDate: new Date('1965-03-15'),
      sex: 'M',
      roomBed: '301-1',
      admissionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      attendingPhysician: '홍길동',
      patientType: 'admitted',
      status: 'active',
      createdBy: 'doctor1', // 홍길동 의사
      sharedWith: [],
      attention: true, // Attention 플래그 테스트
      chiefComplaint: 'Dyspnea',
      onset: '3 days ago',
      presentIllness: '3일 전부터 시작된 호흡곤란으로 응급실 내원',
      pastHistory: 'DM, HTN',
      reviewOfSystem: 'Constitutional: Fever(-), Chilling(-)',
      physicalExam: 'Alert, oriented',
      problemList: ['Community acquired pneumonia', 'Type 2 DM', 'HTN'],
      plan: 'Abx 투여, 산소 공급',
      guardianExplanation: '',
      etc: '',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      id: 'p2',
      registrationNumber: '87654321',
      name: '이영희',
      birthDate: new Date('1978-07-22'),
      sex: 'F',
      roomBed: '302-2',
      admissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      attendingPhysician: '홍길동',
      patientType: 'admitted',
      status: 'active',
      createdBy: 'doctor1', // 홍길동 의사
      sharedWith: [],
      chiefComplaint: 'Dysuria',
      onset: '2 days ago',
      presentIllness: '이틀 전부터 배뇨통 시작',
      pastHistory: 'None',
      reviewOfSystem: 'GU: Dysuria(+), Frequency(+)',
      physicalExam: 'CVA tenderness(-)',
      problemList: ['Acute cystitis'],
      plan: 'UA/UC 확인 후 Abx 조정',
      guardianExplanation: '',
      etc: '',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      id: 'p3',
      registrationNumber: '11223344',
      name: '박영수',
      birthDate: new Date('1982-11-10'),
      sex: 'M',
      roomBed: '303-1',
      admissionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      attendingPhysician: '김민수',
      patientType: 'consult',
      status: 'active',
      createdBy: 'doctor2', // 김민수 의사 (다른 의사)
      sharedWith: [],
      chiefComplaint: 'Left leg pain',
      onset: '1 week ago',
      presentIllness: '낙상 후 좌측 하지 통증',
      pastHistory: 'None',
      reviewOfSystem: 'MSK: Left leg pain(+), ROM limitation(+)',
      physicalExam: 'Swelling and tenderness on left leg',
      problemList: ['Left femur fracture'],
      plan: 'Orthopedic surgery consult',
      guardianExplanation: '',
      etc: '',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      id: 'p4',
      registrationNumber: '99887766',
      name: '최민지',
      birthDate: new Date('1990-05-18'),
      sex: 'F',
      roomBed: '304-2',
      admissionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      dischargeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Discharged 2 days ago
      attendingPhysician: '홍길동',
      patientType: 'admitted',
      status: 'discharged',
      createdBy: 'doctor1', // 홍길동 의사
      sharedWith: [],
      chiefComplaint: 'Abdominal pain',
      onset: '2024-01-15', // Date format - will show duration
      presentIllness: '2주 전부터 시작된 복통으로 내원',
      pastHistory: 'None',
      reviewOfSystem: 'GI: Abdominal pain(+), Nausea(+)',
      physicalExam: 'RLQ tenderness(+)',
      problemList: ['Acute appendicitis'],
      plan: 'Appendectomy 시행 완료, 퇴원',
      guardianExplanation: '수술 잘 되었고 회복 양호하여 퇴원합니다.',
      etc: 'F/U OPD 1주 후',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  await db.patients.bulkAdd(patients);

  // Seed lab results for 김철수 (3일간의 추이 데이터)
  const labResults: LabResult[] = [
    // Day 1 (5 days ago - 입원 직후)
    {
      id: 'lab1',
      patientId: 'p1',
      testDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      category: 'CBC',
      items: [
        {
          code: 'B1050',
          name: 'WBC',
          value: 18.5,
          unit: '×10³/μL',
          referenceMin: 4.0,
          referenceMax: 10.0,
          isAbnormal: true,
          hlFlag: 'H',
        },
        {
          code: 'B1010',
          name: 'Hb',
          value: 11.8,
          unit: 'g/dL',
          referenceMin: 12.0,
          referenceMax: 16.0,
          isAbnormal: true,
          hlFlag: 'L',
        },
        {
          code: 'B1060',
          name: 'Platelet',
          value: 180,
          unit: '×10³/μL',
          referenceMin: 150,
          referenceMax: 400,
          isAbnormal: false,
        },
      ],
      source: 'manual',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'lab2',
      patientId: 'p1',
      testDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      category: 'Chemistry',
      items: [
        {
          code: 'B2730',
          name: 'BUN',
          value: 22.5,
          unit: 'mg/dL',
          referenceMin: 8.0,
          referenceMax: 23.0,
          isAbnormal: false,
        },
        {
          code: 'B2740',
          name: 'Cr',
          value: 1.3,
          unit: 'mg/dL',
          referenceMin: 0.5,
          referenceMax: 1.2,
          isAbnormal: true,
          hlFlag: 'H',
        },
        {
          code: 'B2800',
          name: 'Glucose',
          value: 185,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 110,
          isAbnormal: true,
          hlFlag: 'H',
        },
      ],
      source: 'manual',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'lab3',
      patientId: 'p1',
      testDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      category: 'Infection',
      items: [
        {
          code: 'B5100',
          name: 'CRP',
          value: 8.5,
          unit: 'mg/dL',
          referenceMax: 0.5,
          isAbnormal: true,
          hlFlag: 'H',
        },
      ],
      source: 'manual',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },

    // Day 2 (3 days ago - 치료 중)
    {
      id: 'lab4',
      patientId: 'p1',
      testDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      category: 'CBC',
      items: [
        {
          code: 'B1050',
          name: 'WBC',
          value: 15.2,
          unit: '×10³/μL',
          referenceMin: 4.0,
          referenceMax: 10.0,
          isAbnormal: true,
          hlFlag: 'H',
        },
        {
          code: 'B1010',
          name: 'Hb',
          value: 12.1,
          unit: 'g/dL',
          referenceMin: 12.0,
          referenceMax: 16.0,
          isAbnormal: false,
        },
        {
          code: 'B1060',
          name: 'Platelet',
          value: 195,
          unit: '×10³/μL',
          referenceMin: 150,
          referenceMax: 400,
          isAbnormal: false,
        },
      ],
      source: 'manual',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'lab5',
      patientId: 'p1',
      testDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      category: 'Chemistry',
      items: [
        {
          code: 'B2730',
          name: 'BUN',
          value: 19.8,
          unit: 'mg/dL',
          referenceMin: 8.0,
          referenceMax: 23.0,
          isAbnormal: false,
        },
        {
          code: 'B2740',
          name: 'Cr',
          value: 1.15,
          unit: 'mg/dL',
          referenceMin: 0.5,
          referenceMax: 1.2,
          isAbnormal: false,
        },
        {
          code: 'B2800',
          name: 'Glucose',
          value: 142,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 110,
          isAbnormal: true,
          hlFlag: 'H',
        },
      ],
      source: 'manual',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'lab6',
      patientId: 'p1',
      testDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      category: 'Infection',
      items: [
        {
          code: 'B5100',
          name: 'CRP',
          value: 4.2,
          unit: 'mg/dL',
          referenceMax: 0.5,
          isAbnormal: true,
          hlFlag: 'H',
        },
      ],
      source: 'manual',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },

    // Day 3 (today - 호전 중)
    {
      id: 'lab7',
      patientId: 'p1',
      testDate: today,
      category: 'CBC',
      items: [
        {
          code: 'B1050',
          name: 'WBC',
          value: 11.5,
          unit: '×10³/μL',
          referenceMin: 4.0,
          referenceMax: 10.0,
          isAbnormal: true,
          hlFlag: 'H',
        },
        {
          code: 'B1010',
          name: 'Hb',
          value: 12.5,
          unit: 'g/dL',
          referenceMin: 12.0,
          referenceMax: 16.0,
          isAbnormal: false,
        },
        {
          code: 'B1060',
          name: 'Platelet',
          value: 210,
          unit: '×10³/μL',
          referenceMin: 150,
          referenceMax: 400,
          isAbnormal: false,
        },
      ],
      source: 'manual',
      createdAt: now,
    },
    {
      id: 'lab8',
      patientId: 'p1',
      testDate: today,
      category: 'Chemistry',
      items: [
        {
          code: 'B2730',
          name: 'BUN',
          value: 18.5,
          unit: 'mg/dL',
          referenceMin: 8.0,
          referenceMax: 23.0,
          isAbnormal: false,
        },
        {
          code: 'B2740',
          name: 'Cr',
          value: 1.05,
          unit: 'mg/dL',
          referenceMin: 0.5,
          referenceMax: 1.2,
          isAbnormal: false,
        },
        {
          code: 'B2800',
          name: 'Glucose',
          value: 115,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 110,
          isAbnormal: true,
          hlFlag: 'H',
        },
      ],
      source: 'manual',
      createdAt: now,
    },
    {
      id: 'lab9',
      patientId: 'p1',
      testDate: today,
      category: 'Infection',
      items: [
        {
          code: 'B5100',
          name: 'CRP',
          value: 1.8,
          unit: 'mg/dL',
          referenceMax: 0.5,
          isAbnormal: true,
          hlFlag: 'H',
        },
      ],
      source: 'manual',
      createdAt: now,
    },
    {
      id: 'lab10',
      patientId: 'p1',
      testDate: today,
      category: 'LFT',
      items: [
        {
          code: 'B2600',
          name: 'AST',
          value: 28,
          unit: 'U/L',
          referenceMax: 40,
          isAbnormal: false,
        },
        {
          code: 'B2610',
          name: 'ALT',
          value: 32,
          unit: 'U/L',
          referenceMax: 40,
          isAbnormal: false,
        },
        {
          code: 'B2630',
          name: 'Total Bilirubin',
          value: 0.8,
          unit: 'mg/dL',
          referenceMax: 1.2,
          isAbnormal: false,
        },
      ],
      source: 'manual',
      createdAt: now,
    },
    // Culture results for 김철수 (외부 검사실) - 병원 서식 형태
    // 첫 번째 Culture (3일 전)
    {
      id: 'lab11',
      patientId: 'p1',
      testDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      category: 'Culture',
      items: [
        {
          name: 'Specimen',
          value: 'Sputum',
          unit: '',
          isAbnormal: false,
        },
        {
          name: 'Culture & ID',
          value: 'Klebsiella pneumoniae',
          unit: '',
          isAbnormal: true,
        },
        {
          name: 'Sensitivity',
          value: `Amikacin                       S (2)
Amoxicillin/CA                 R (>=32)
Ampicillin                     R (>=32)
Cefazolin                      R (>=64)
Cefepime                       R (16)
Cefotaxime                     R (8)
Ceftazidime                    R (16)
Ciprofloxacin                  R (>=4)
Ertapenem                      R (>=8)
Gentamicin                     S (<=1)
Imipenem                       R (4)
Meropenem                      R (>=16)
Nitrofurantoin                 R (256)
Tobramycin                     S (2)
Trimethoprim/Sulfa             R (>=320)`,
          unit: '',
          isAbnormal: true,
        },
      ],
      source: 'manual',
      rawText: 'Sputum culture: Klebsiella pneumoniae with antibiotic sensitivity',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    // 두 번째 Culture (입원 당일)
    {
      id: 'lab13',
      patientId: 'p1',
      testDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago (admission day)
      category: 'Culture',
      items: [
        {
          name: 'Specimen',
          value: 'Blood',
          unit: '',
          isAbnormal: false,
        },
        {
          name: 'Culture & ID',
          value: 'No growth after 5 days',
          unit: '',
          isAbnormal: false,
        },
        {
          name: 'Sensitivity',
          value: 'N/A',
          unit: '',
          isAbnormal: false,
        },
      ],
      source: 'manual',
      rawText: 'Blood culture: No growth',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  // 이영희(p2) Lab - 어제
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const labResultsP2: LabResult[] = [
    {
      id: 'lab-p2-1',
      patientId: 'p2',
      testDate: yesterday,
      category: 'CBC',
      items: [
        { code: 'B1050', name: 'WBC', value: 12.8, unit: '×10³/μL', referenceMin: 4.0, referenceMax: 10.0, isAbnormal: true, hlFlag: 'H' },
        { code: 'B1010', name: 'Hb', value: 13.2, unit: 'g/dL', referenceMin: 12.0, referenceMax: 16.0, isAbnormal: false },
        { code: 'B1060', name: 'Platelet', value: 245, unit: '×10³/μL', referenceMin: 150, referenceMax: 400, isAbnormal: false },
      ],
      source: 'manual',
      createdAt: yesterday,
    },
    {
      id: 'lab-p2-2',
      patientId: 'p2',
      testDate: yesterday,
      category: 'UA',
      items: [
        { name: 'WBC (UA)', value: 'many', unit: '/HPF', isAbnormal: true },
        { name: 'RBC (UA)', value: '5-9', unit: '/HPF', isAbnormal: true },
        { name: 'Nitrite', value: '+', unit: '', isAbnormal: true },
        { name: 'Leukocyte', value: '+++', unit: '', isAbnormal: true },
      ],
      source: 'manual',
      createdAt: yesterday,
    },
    {
      id: 'lab-p2-3',
      patientId: 'p2',
      testDate: yesterday,
      category: 'Infection',
      items: [
        { code: 'B5100', name: 'CRP', value: 3.2, unit: 'mg/dL', referenceMax: 0.5, isAbnormal: true, hlFlag: 'H' },
      ],
      source: 'manual',
      createdAt: yesterday,
    },
  ];

  await db.labResults.bulkAdd([...labResults, ...labResultsP2]);

  // Seed medications for 김철수
  const medications: Medication[] = [
    // 항생제 (현재 투약 중)
    {
      id: 'med1',
      patientId: 'p1',
      category: 'antibiotic',
      drugName: 'Ceftriaxone',
      drugBaseName: 'Ceftriaxone',
      singleDose: 0, // 항생제는 dosage/frequency 사용
      schedule: '',
      dosage: '2g',
      frequency: '#1',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 10일 투약 (D+7, 3일 남음)
      isAntibiotic: true,
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    // 항생제 History (종료된 항생제)
    {
      id: 'med5',
      patientId: 'p1',
      category: 'antibiotic',
      drugName: 'Vancomycin',
      drugBaseName: 'Vancomycin',
      singleDose: 0,
      schedule: '',
      dosage: '2g',
      frequency: '#2',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 전 시작
      endDate: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), // 23일 전 종료 (7일간)
      isAntibiotic: true,
      isActive: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'med6',
      patientId: 'p1',
      category: 'antibiotic',
      drugName: 'Tazocin',
      drugBaseName: 'Tazocin',
      singleDose: 0,
      schedule: '',
      dosage: '4V',
      frequency: '#4',
      startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20일 전 시작
      endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10일 전 종료 (10일간)
      isAntibiotic: true,
      isActive: false,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'med7',
      patientId: 'p1',
      category: 'antibiotic',
      drugName: 'Meropenem',
      drugBaseName: 'Meropenem',
      singleDose: 0,
      schedule: '',
      dosage: '3g',
      frequency: '#3',
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15일 전 시작
      endDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8일 전 종료 (7일간)
      isAntibiotic: true,
      isActive: false,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    // 본원투약
    {
      id: 'med2',
      patientId: 'p1',
      category: 'hospital',
      drugName: '메트포르민정500mg',
      drugBaseName: '메트포르민정',
      singleDose: 1,
      schedule: '아침,저녁 식후30분',
      daysRemaining: 12,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isAntibiotic: false,
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      id: 'med3',
      patientId: 'p1',
      category: 'hospital',
      drugName: '암로스크정(6.42mg/1정)',
      drugBaseName: '암로스크정',
      singleDose: 1,
      schedule: '아침 식후30분',
      daysRemaining: 12,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isAntibiotic: false,
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    // 지참약
    {
      id: 'med4',
      patientId: 'p1',
      category: 'personal',
      drugName: '큐팜정500mg',
      drugBaseName: '큐팜정',
      singleDose: 1,
      schedule: '아침, 저녁 식후30분',
      daysRemaining: 12,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isAntibiotic: false,
      isActive: true,
      notes: '환자 지참약',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
  ];

  // 이영희(p2) 투약
  const medicationsP2: Medication[] = [
    {
      id: 'med-p2-1',
      patientId: 'p2',
      category: 'antibiotic',
      drugName: 'Ciprofloxacin',
      drugBaseName: 'Ciprofloxacin',
      singleDose: 0,
      schedule: '',
      dosage: '400mg',
      frequency: '#2',
      startDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), // D+16 장기 투여
      isAntibiotic: true,
      isActive: true,
      createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      id: 'med-p2-2',
      patientId: 'p2',
      category: 'antibiotic',
      drugName: 'Metronidazole',
      drugBaseName: 'Metronidazole',
      singleDose: 0,
      schedule: '',
      dosage: '500mg',
      frequency: '#3',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // D+3
      isAntibiotic: true,
      isActive: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
  ];

  await db.medications.bulkAdd([...medications, ...medicationsP2]);

  // Seed notes (progress + reminder)
  const notes: Note[] = [
    {
      id: 'note1',
      patientId: 'p1',
      content: '오늘 CXR 확인 필요. 호흡음 청진 시 crackle 감소',
      type: 'progress',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: 'note2',
      patientId: 'p1',
      content: 'CRP f/u 결과 확인 후 Abx 변경 여부 결정',
      type: 'reminder',
      alertDate: today,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'note3',
      patientId: 'p2',
      content: 'UA/UC 결과 확인 - 항생제 감수성에 따라 변경 필요',
      type: 'reminder',
      alertDate: today,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'note4',
      patientId: 'p2',
      content: '신장내과 외진 의뢰 결과 확인',
      type: 'reminder',
      alertDate: today,
      createdAt: today,
      updatedAt: today,
    },
  ];

  await db.notes.bulkAdd(notes);

  console.log('✅ Seed data loaded successfully');
}
