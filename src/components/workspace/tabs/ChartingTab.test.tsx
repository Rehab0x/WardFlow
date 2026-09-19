import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartingTab } from './ChartingTab';
import type { ChartingDraft } from '../types';

const draft: ChartingDraft = {
  chiefComplaint: 'fever',
  onset: '2026-09-01',
  presentIllness: 'cough for 3 days',
  pastHistory: '',
  reviewOfSystem: '',
  physicalExam: '',
  problemListText: 'pneumonia',
  plan: 'start abx',
  guardianExplanation: '',
  etc: '',
};

describe('ChartingTab', () => {
  it('renders every charting field', () => {
    render(<ChartingTab initialDraft={draft} />);

    for (const label of ['C/C', 'Onset', 'P/I', 'P/H', 'ROS', 'P/Ex', 'Problem', 'Plan', '보호자설명', 'Etc']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByDisplayValue('fever')).toBeInTheDocument();
  });

  it('does not loop on the charting settings store subscription', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ChartingTab initialDraft={draft} />);
    const messages = errorSpy.mock.calls.map((call) => String(call[0])).join('\n');
    errorSpy.mockRestore();

    expect(messages).not.toMatch(/getSnapshot should be cached|Maximum update depth/);
  });
});
