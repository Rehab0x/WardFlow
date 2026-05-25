import { useMemo, useState } from 'react';
import { Search, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Patient } from '@/db/database';
import {
  buildPatientOwnershipEntries,
  countAdminPatients,
  filterAdminPatients,
  type AdminPatientStatusFilter,
  type PatientOwnershipEntry,
} from '@/lib/adminPatients';
import { ROLE_LABELS, STATUS_LABELS } from '@/lib/adminAccess';
import type { User } from '@/types/user';

const PATIENT_FILTERS: { value: AdminPatientStatusFilter; label: string }[] = [
  { value: 'active', label: '활성' },
  { value: 'attention', label: '주의' },
  { value: 'discharged', label: '퇴원' },
  { value: 'all', label: '전체' },
];

export function AdminPatientOwnership({ patients, users }: { patients: Patient[]; users: User[] }) {
  const [patientQuery, setPatientQuery] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] =
    useState<AdminPatientStatusFilter>('active');
  const patientCounts = useMemo(() => countAdminPatients(patients), [patients]);
  const visiblePatients = useMemo(
    () => filterAdminPatients(patients, patientQuery, patientStatusFilter),
    [patientQuery, patientStatusFilter, patients]
  );
  const entries = useMemo(
    () => buildPatientOwnershipEntries(visiblePatients, users),
    [users, visiblePatients]
  );

  if (patients.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">등록된 환자가 없습니다.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={patientQuery}
            onChange={(event) => setPatientQuery(event.target.value)}
            placeholder="환자명, 등록번호, 병실, 진단명 검색"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PATIENT_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={patientStatusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPatientStatusFilter(filter.value)}
              aria-pressed={patientStatusFilter === filter.value}
            >
              {filter.label} {patientCounts[filter.value]}
            </Button>
          ))}
        </div>
      </div>
      {entries.length === 0 && (
        <p className="rounded-lg border px-3 py-6 text-center text-sm text-muted-foreground">
          조건에 맞는 환자가 없습니다.
        </p>
      )}
      {entries.map((entry) => (
        <PatientOwnerCard key={entry.doctorId} entry={entry} />
      ))}
    </div>
  );
}

function PatientOwnerCard({ entry }: { entry: PatientOwnershipEntry }) {
  const {
    doctorName,
    department,
    status,
    role,
    active,
    discharged,
    admittedCount,
    consultCount,
    attentionCount,
  } = entry;

  return (
    <Card className="p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Stethoscope className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{doctorName}</span>
        {department && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {department}
          </Badge>
        )}
        {role && (
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {ROLE_LABELS[role]}
          </Badge>
        )}
        {status && status !== 'approved' && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {STATUS_LABELS[status]}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          활성 {active.length}명 · 입원 {admittedCount} / 협진 {consultCount} · 퇴원{' '}
          {discharged.length}
        </span>
      </div>
      {attentionCount > 0 && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          주의 환자 {attentionCount}명
        </div>
      )}
      <div className="space-y-1">
        {active.length === 0 ? (
          <p className="rounded bg-muted/30 px-2 py-2 text-sm text-muted-foreground">
            현재 활성 환자가 없습니다.
          </p>
        ) : (
          active.map((patient) => <AdminPatientRow key={patient.id} patient={patient} />)
        )}
      </div>
      {discharged.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            퇴원 환자 {discharged.length}명
          </summary>
          <div className="mt-1 space-y-1 opacity-70">
            {discharged.map((patient) => (
              <div key={patient.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                <Badge variant="secondary" className="w-12 justify-center px-1.5 py-0 text-[10px]">
                  퇴원
                </Badge>
                <span className="font-medium">{patient.name}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}

function AdminPatientRow({ patient }: { patient: Patient }) {
  return (
    <div
      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
      title={`${patient.name} · ${patient.registrationNumber}`}
    >
      <Badge
        variant={patient.patientType === 'admitted' ? 'default' : 'outline'}
        className="w-12 justify-center px-1.5 py-0 text-[10px]"
      >
        {patient.patientType === 'admitted' ? '입원' : '협진'}
      </Badge>
      <span className="w-14 text-xs text-muted-foreground">{patient.roomBed}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{patient.name}</span>
      {patient.attention && <span className="text-xs text-red-500">주의</span>}
    </div>
  );
}
