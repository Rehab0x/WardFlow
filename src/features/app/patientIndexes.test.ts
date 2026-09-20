import { describe, expect, it } from 'vitest';
import type { BriefingData } from '@/services/briefingService';
import type { Patient } from '@/types/patient';
import { buildPatientIndexes, buildPatientIndicators } from './patientIndexes';

const patients = [
  { id: 'p1', name: '김부경', roomBed: '101', status: 'active', patientType: 'admitted' } as Patient,
  { id: 'p2', name: '이영희', roomBed: '102', status: 'active', patientType: 'consult' } as Patient,
];

function briefing(overrides: Partial<BriefingData> = {}): BriefingData {
  return {
    reminders: [],
    progressNotes: [],
    antibiotics: [],
    recentLabs: [],
    todaySchedules: [],
    patientSummary: { total: 0, admitted: 0, consult: 0 },
    ...overrides,
  };
}

const note = (patientId: string, noteId: string) => ({
  patientId,
  patientName: '환자',
  roomBed: '101',
  noteId,
  content: 'S) 열감 O) BT 37.8',
});

describe('buildPatientIndicators', () => {
  const { patientsById } = buildPatientIndexes(patients);

  it("marks patients who already have today's note", () => {
    const indicators = buildPatientIndicators(
      patientsById,
      briefing({ progressNotes: [note('p1', 'n1')] })
    );

    expect(indicators.p1).toMatchObject({ note: true });
    expect(indicators.p2).toBeUndefined();
  });

  it('counts a patient once even with several notes today', () => {
    const indicators = buildPatientIndicators(
      patientsById,
      briefing({ progressNotes: [note('p1', 'n1'), note('p1', 'n2')] })
    );
    expect(indicators.p1).toEqual({ note: true });
  });

  it('ignores notes belonging to a patient not on the list', () => {
    const indicators = buildPatientIndicators(
      patientsById,
      briefing({ progressNotes: [note('gone', 'n1')] })
    );
    expect(indicators).toEqual({});
  });

  it('keeps the note flag separate from reminders and labs', () => {
    const indicators = buildPatientIndicators(
      patientsById,
      briefing({
        progressNotes: [note('p1', 'n1')],
        reminders: [{ ...note('p2', 'n2'), content: '보호자 설명' }],
        recentLabs: [
          {
            patientId: 'p2',
            patientName: '이영희',
            roomBed: '102',
            dateKey: '2026-09-20',
            abnormalCount: 2,
            abnormalItems: ['Na L', 'K H'],
            totalItems: 20,
          },
        ],
      })
    );

    expect(indicators.p1).toEqual({ note: true });
    expect(indicators.p2).toEqual({ reminder: true, lab: true });
  });
});
