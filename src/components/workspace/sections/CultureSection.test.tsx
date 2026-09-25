import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LabResult } from '@/types/lab';
import { CultureSection } from './CultureSection';

function cultureResult(items: Array<{ name: string; value: string }>): LabResult {
  return {
    id: 'lab-1',
    patientId: 'patient-1',
    testDate: new Date(2026, 8, 19),
    category: 'Culture',
    source: 'xls',
    createdAt: new Date(2026, 8, 21),
    items: items.map((item) => ({ ...item, unit: '', isAbnormal: false })),
  };
}

describe('CultureSection', () => {
  it('keeps a no-growth result on one line next to its name', () => {
    render(
      <CultureSection
        results={[cultureResult([{ name: 'CRE-Rectal swab', value: 'No growth of CRE' }])]}
      />
    );
    expect(screen.getByText('CRE-Rectal swab')).toBeInTheDocument();
    expect(screen.getByText('No growth of CRE')).toBeInTheDocument();
    expect(screen.getByText(/접수 2026-09-19/)).toBeInTheDocument();
  });

  it('lays out an identified organism with one antibiotic per row', () => {
    render(
      <CultureSection
        results={[
          cultureResult([
            {
              name: 'Urine Culture',
              value:
                '<Culture & ID>\nEscherichia coli\n<Sensitivity>\nAmikacin   S (2)\nAmpicillin   R (>=32)',
            },
          ]),
        ]}
      />
    );
    expect(screen.getByText('Urine Culture')).toBeInTheDocument();
    expect(screen.getByText('Escherichia coli')).toBeInTheDocument();
    expect(screen.getByText('Amikacin')).toBeInTheDocument();
    expect(screen.getByText('Ampicillin')).toBeInTheDocument();
    expect(screen.getByText('R')).toHaveClass('text-red-600');
    expect(screen.getByText('(>=32)')).toBeInTheDocument();
  });
});
