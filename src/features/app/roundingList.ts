/**
 * 회진 모드용 환자 명단 구성 — 병동 → 병실 → 환자 순으로 묶는다.
 *
 * 병동은 하드코딩하지 않고 **실제 환자의 병실번호에서 파생**한다.
 * 병실번호 앞자리가 병동이다 (101 → 1병동, 302 → 3병동).
 * 병실번호를 읽을 수 없는 환자(외래·미배정 등)는 `기타`로 모은다.
 */

import type { Patient } from '@/types/patient';
import type { RoundingBadge } from './roundingBadges';

export interface RoundingPatient {
  patient: Patient;
  /** 병상 번호 ("301-1"의 "1"). 없으면 빈 문자열 */
  bed: string;
  /** 이름 옆에 띄울 신호들 — `buildRoundingBadges`가 만든다 */
  badges: RoundingBadge[];
}

export interface RoundingRoom {
  /** 정렬·조회용 키 ("301"). 병실번호를 못 읽으면 빈 문자열 */
  key: string;
  /** 화면에 쓰는 라벨 ("301호"). 못 읽으면 원본 문자열 또는 "병실 미지정" */
  label: string;
  patients: RoundingPatient[];
}

export interface RoundingWard {
  /** 병동 앞자리 ("3"). 못 읽으면 빈 문자열 */
  key: string;
  label: string;
  rooms: RoundingRoom[];
  patientCount: number;
  /** 뱃지가 하나라도 있는 환자 수 — 탭에 표시한다 */
  flaggedCount: number;
}

export const OTHER_WARD_KEY = '';

interface ParsedRoom {
  ward: string;
  room: string;
  bed: string;
}

/**
 * "301-1" → { ward: '3', room: '301', bed: '1' }
 * "101호 2" → { ward: '1', room: '101', bed: '2' }
 * 숫자가 없으면 ward/room 모두 빈 문자열.
 */
export function parseRoomBed(roomBed: string): ParsedRoom {
  const text = (roomBed ?? '').trim();
  const roomMatch = text.match(/\d+/);
  if (!roomMatch) return { ward: '', room: '', bed: '' };

  const room = roomMatch[0];
  // 병실번호 뒤에 남는 숫자를 병상으로 본다 ("301-1"의 1). 뒤에 아무것도 없으면 빈 값.
  const bed = text.slice(roomMatch.index! + room.length).match(/\d+/)?.[0] ?? '';
  return { ward: room[0]!, room, bed };
}

function wardLabel(key: string): string {
  return key ? `${key}병동` : '기타';
}

function roomLabel(room: string, roomBed: string): string {
  if (room) return `${room}호`;
  return roomBed.trim() || '병실 미지정';
}

/** 숫자 병실은 숫자 순으로, 그 외에는 사전순으로. 빈 키("기타")는 항상 마지막. */
function byKey(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, 'ko-KR', { numeric: true });
}

/**
 * 활성 환자를 병동 → 병실로 묶는다. 퇴원 환자는 회진 대상이 아니므로 제외하고,
 * 입원·컨설트는 모두 포함한다 (컨설트도 회진 때 같이 돈다).
 */
export function buildRoundingWards(
  patients: Patient[],
  badgesByPatientId: Record<string, RoundingBadge[]> = {}
): RoundingWard[] {
  const wards = new Map<string, Map<string, RoundingRoom>>();

  for (const patient of patients) {
    if (patient.status !== 'active') continue;

    const { ward, room, bed } = parseRoomBed(patient.roomBed);
    const badges = badgesByPatientId[patient.id] ?? [];

    const rooms = wards.get(ward) ?? new Map<string, RoundingRoom>();
    wards.set(ward, rooms);

    const entry = rooms.get(room) ?? {
      key: room,
      label: roomLabel(room, patient.roomBed),
      patients: [],
    };
    entry.patients.push({ patient, bed, badges });
    rooms.set(room, entry);
  }

  return [...wards.entries()]
    .map(([key, rooms]) => {
      const sortedRooms = [...rooms.values()]
        .map((room) => ({
          ...room,
          patients: [...room.patients].sort(
            (a, b) =>
              byKey(a.bed, b.bed) || a.patient.name.localeCompare(b.patient.name, 'ko-KR')
          ),
        }))
        .sort((a, b) => byKey(a.key, b.key));

      const allPatients = sortedRooms.flatMap((room) => room.patients);
      return {
        key,
        label: wardLabel(key),
        rooms: sortedRooms,
        patientCount: allPatients.length,
        flaggedCount: allPatients.filter((item) => item.badges.length > 0).length,
      };
    })
    .sort((a, b) => byKey(a.key, b.key));
}

/** 저장해 둔 병동이 사라졌을 때(퇴원 등) 첫 병동으로 되돌린다. */
export function resolveActiveWard(wards: RoundingWard[], requested?: string): string | undefined {
  if (wards.length === 0) return undefined;
  if (requested !== undefined && wards.some((ward) => ward.key === requested)) return requested;
  return wards[0]!.key;
}
