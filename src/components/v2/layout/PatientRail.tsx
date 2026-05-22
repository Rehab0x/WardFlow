import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Patient } from '@/db/database';
import { calculateAge } from '@/utils/dateUtils';
import { PatientRow } from './PatientRow';

interface PatientRailProps {
  patients: Patient[];
  selectedPatientId?: string;
  onPatientSelect?: (patientId: string) => void;
  onAddPatient?: () => void;
}

export function PatientRail({
  patients,
  selectedPatientId,
  onPatientSelect,
  onAddPatient,
}: PatientRailProps) {
  const [query, setQuery] = useState('');

  const { admitted, consult, discharged } = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const visible = normalized
      ? patients.filter((patient) =>
          [patient.roomBed, patient.name, patient.registrationNumber]
            .join(' ')
            .toLowerCase()
            .includes(normalized)
        )
      : patients;

    const byRoom = (a: Patient, b: Patient) =>
      a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true });

    return {
      admitted: visible
        .filter((patient) => patient.status === 'active' && patient.patientType === 'admitted')
        .sort(byRoom),
      consult: visible
        .filter((patient) => patient.status === 'active' && patient.patientType === 'consult')
        .sort(byRoom),
      discharged: visible
        .filter((patient) => patient.status === 'discharged')
        .sort((a, b) => (b.dischargeDate?.getTime() ?? 0) - (a.dischargeDate?.getTime() ?? 0)),
    };
  }, [patients, query]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-3">
        <div className="mb-2 flex items-center gap-2">
          <input
            className="h-8 min-w-0 flex-1 rounded-md border border-zinc-200 px-2 text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="병실, 이름, 등록번호"
            type="search"
          />
          <button
            type="button"
            onClick={onAddPatient}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="환자 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <PatientGroup
          title="입원"
          patients={admitted}
          selectedPatientId={selectedPatientId}
          onPatientSelect={onPatientSelect}
        />
        <PatientGroup
          title="협진"
          patients={consult}
          selectedPatientId={selectedPatientId}
          onPatientSelect={onPatientSelect}
        />
        <PatientGroup
          title="퇴원"
          patients={discharged}
          selectedPatientId={selectedPatientId}
          onPatientSelect={onPatientSelect}
        />
      </div>
    </aside>
  );
}

function PatientGroup({
  title,
  patients,
  selectedPatientId,
  onPatientSelect,
}: {
  title: string;
  patients: Patient[];
  selectedPatientId?: string;
  onPatientSelect?: (patientId: string) => void;
}) {
  return (
    <section className="mb-3">
      <div className="mb-1 flex h-6 items-center justify-between px-1">
        <h2 className="text-[11px] font-medium text-zinc-500">{title}</h2>
        <span className="font-mono text-[10.5px] text-zinc-400 tabular-nums">{patients.length}</span>
      </div>
      <div className="space-y-0.5">
        {patients.map((patient) => (
          <PatientRow
            key={patient.id}
            roomBed={patient.roomBed}
            name={patient.name}
            sexAge={`${patient.sex}/${calculateAge(patient.birthDate)}`}
            selected={patient.id === selectedPatientId}
            attention={patient.attention}
            onClick={() => onPatientSelect?.(patient.id)}
          />
        ))}
        {patients.length === 0 && (
          <div className="h-8 rounded-md px-2 py-2 text-[12px] text-zinc-400">0</div>
        )}
      </div>
    </section>
  );
}

