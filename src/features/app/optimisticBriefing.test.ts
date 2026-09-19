import { describe, expect, it } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { BriefingData } from '@/services/briefingService';
import type { Patient } from '@/types/patient';
import {
  applyOptimisticAntibiotic,
  applyOptimisticNote,
  applyOptimisticPatientIdentity,
  applyOptimisticRemoveAntibiotic,
  applyOptimisticRemoveNote,
  applyOptimisticRemovePatientItems,
  emptyBriefingData,
} from './optimisticBriefing';

const patient = {
  id: 'p1',
  name: '김환자',
  roomBed: '302',
} as Patient;

/** useState의 setter를 흉내내어 최종 상태를 돌려주는 테스트 헬퍼 */
function withBriefingState(initial: BriefingData) {
  let state = initial;
  const setState: Dispatch<SetStateAction<BriefingData>> = (update) => {
    state = typeof update === 'function' ? (update as (prev: BriefingData) => BriefingData)(state) : update;
  };
  return { setState, get: () => state };
}

describe('applyOptimisticNote / applyOptimisticRemoveNote', () => {
  it('adds a reminder and removes it again by note id', () => {
    const store = withBriefingState(emptyBriefingData);

    applyOptimisticNote(store.setState, patient, 'n1', '가족 면담', 'reminder');
    expect(store.get().reminders).toHaveLength(1);
    expect(store.get().progressNotes).toHaveLength(0);
    expect(store.get().reminders[0]).toMatchObject({ noteId: 'n1', patientName: '김환자' });

    applyOptimisticRemoveNote(store.setState, 'n1');
    expect(store.get().reminders).toHaveLength(0);
  });

  it('does not duplicate a note that is applied twice', () => {
    const store = withBriefingState(emptyBriefingData);
    applyOptimisticNote(store.setState, patient, 'n1', '첫 입력', 'progress');
    applyOptimisticNote(store.setState, patient, 'n1', '수정된 입력', 'progress');

    expect(store.get().progressNotes).toHaveLength(1);
    expect(store.get().progressNotes[0]?.content).toBe('수정된 입력');
  });
});

describe('applyOptimisticAntibiotic', () => {
  it('adds an antibiotic row and removes it by medication id', () => {
    const store = withBriefingState(emptyBriefingData);

    applyOptimisticAntibiotic(store.setState, patient, 'm1', {
      drugName: 'Meropenem',
      dosage: '1g',
      frequency: '#3',
      startDate: new Date(),
    });
    expect(store.get().antibiotics).toHaveLength(1);
    expect(store.get().antibiotics[0]).toMatchObject({ medicationId: 'm1', drugName: 'Meropenem' });

    applyOptimisticRemoveAntibiotic(store.setState, 'm1');
    expect(store.get().antibiotics).toHaveLength(0);
  });
});

describe('applyOptimisticPatientIdentity', () => {
  it('renames the patient across every briefing list', () => {
    const store = withBriefingState(emptyBriefingData);
    applyOptimisticNote(store.setState, patient, 'n1', '메모', 'reminder');

    applyOptimisticPatientIdentity(store.setState, patient, { name: '김철수', roomBed: '505' });

    expect(store.get().reminders[0]).toMatchObject({ patientName: '김철수', roomBed: '505' });
  });
});

describe('applyOptimisticRemovePatientItems', () => {
  it('drops every row belonging to the removed patient only', () => {
    const store = withBriefingState(emptyBriefingData);
    applyOptimisticNote(store.setState, patient, 'n1', '메모', 'reminder');
    applyOptimisticNote(store.setState, { ...patient, id: 'p2' } as Patient, 'n2', '다른 환자', 'reminder');

    applyOptimisticRemovePatientItems(store.setState, 'p1');

    expect(store.get().reminders.map((item) => item.noteId)).toEqual(['n2']);
  });
});
