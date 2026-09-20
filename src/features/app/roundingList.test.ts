import { describe, expect, it } from 'vitest';
import type { Patient } from '@/types/patient';
import { buildRoundingWards, parseRoomBed, resolveActiveWard } from './roundingList';

function patient(overrides: Partial<Patient> & { id: string; roomBed: string }): Patient {
  return {
    name: '환자',
    birthDate: new Date('1970-01-01'),
    sex: 'M',
    status: 'active',
    patientType: 'admitted',
    ...overrides,
  } as Patient;
}

describe('parseRoomBed', () => {
  it('splits ward, room and bed', () => {
    expect(parseRoomBed('301-1')).toEqual({ ward: '3', room: '301', bed: '1' });
    expect(parseRoomBed('101')).toEqual({ ward: '1', room: '101', bed: '' });
    expect(parseRoomBed(' 205호 2 ')).toEqual({ ward: '2', room: '205', bed: '2' });
  });

  it('returns empty parts when there is no room number', () => {
    expect(parseRoomBed('외래')).toEqual({ ward: '', room: '', bed: '' });
    expect(parseRoomBed('')).toEqual({ ward: '', room: '', bed: '' });
  });
});

describe('buildRoundingWards', () => {
  const patients = [
    patient({ id: 'c', roomBed: '302', name: '박민수' }),
    patient({ id: 'a', roomBed: '101-2', name: '김부경' }),
    patient({ id: 'b', roomBed: '101-1', name: '이영희' }),
    patient({ id: 'd', roomBed: '201', name: '최동훈', patientType: 'consult' }),
    patient({ id: 'gone', roomBed: '101-3', name: '퇴원함', status: 'discharged' }),
  ];

  it('groups patients by ward and room, in room and bed order', () => {
    const wards = buildRoundingWards(patients);

    expect(wards.map((ward) => ward.label)).toEqual(['1병동', '2병동', '3병동']);
    const first = wards[0]!;
    expect(first.rooms.map((room) => room.label)).toEqual(['101호']);
    // 병상 번호 순 — 101-1이 101-2보다 먼저
    expect(first.rooms[0]!.patients.map((item) => item.patient.name)).toEqual(['이영희', '김부경']);
    expect(first.rooms[0]!.patients[0]!.bed).toBe('1');
  });

  it('leaves discharged patients out of the rounding list', () => {
    const names = buildRoundingWards(patients)
      .flatMap((ward) => ward.rooms)
      .flatMap((room) => room.patients)
      .map((item) => item.patient.name);
    expect(names).not.toContain('퇴원함');
  });

  it('keeps consult patients — they are seen on rounds too', () => {
    const second = buildRoundingWards(patients).find((ward) => ward.key === '2');
    expect(second?.rooms[0]?.patients[0]?.patient.name).toBe('최동훈');
  });

  it('counts patients and flagged patients per ward', () => {
    const wards = buildRoundingWards(patients, {
      a: { reminder: true, lab: true },
      c: { antibiotic: true },
    });

    const first = wards.find((ward) => ward.key === '1')!;
    expect(first.patientCount).toBe(2);
    expect(first.flaggedCount).toBe(1);
    expect(first.rooms[0]!.patients[1]!.flags).toMatchObject({ reminder: true, lab: true });
    expect(first.rooms[0]!.patients[1]!.flagCount).toBe(2);
  });

  it('treats the manual attention mark as a flag', () => {
    const wards = buildRoundingWards([patient({ id: 'x', roomBed: '401', attention: true })]);
    expect(wards[0]!.rooms[0]!.patients[0]!.flags.attention).toBe(true);
    expect(wards[0]!.flaggedCount).toBe(1);
  });

  it('collects patients without a room number into 기타, listed last', () => {
    const wards = buildRoundingWards([
      patient({ id: 'x', roomBed: '외래', name: '미배정' }),
      patient({ id: 'y', roomBed: '101', name: '김부경' }),
    ]);
    expect(wards.map((ward) => ward.label)).toEqual(['1병동', '기타']);
    expect(wards[1]!.rooms[0]!.label).toBe('외래');
  });
});

describe('resolveActiveWard', () => {
  const wards = buildRoundingWards([
    patient({ id: 'a', roomBed: '101' }),
    patient({ id: 'b', roomBed: '301' }),
  ]);

  it('keeps the requested ward when it still exists', () => {
    expect(resolveActiveWard(wards, '3')).toBe('3');
  });

  it('falls back to the first ward when the requested one is gone', () => {
    expect(resolveActiveWard(wards, '9')).toBe('1');
    expect(resolveActiveWard(wards, undefined)).toBe('1');
  });

  it('returns undefined when there is nobody to round on', () => {
    expect(resolveActiveWard([], '1')).toBeUndefined();
  });
});
