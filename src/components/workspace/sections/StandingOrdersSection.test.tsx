import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StandingOrdersSection } from './StandingOrdersSection';

vi.mock('@/services/templateService', () => ({
  templateService: {
    getByField: vi.fn().mockResolvedValue([]),
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('StandingOrdersSection', () => {
  it('saves only what the user changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<StandingOrdersSection value="기존 지시" onSave={onSave} />);

    const field = screen.getByLabelText('지시오더');
    expect(field).toHaveValue('기존 지시');
    // 고치기 전에는 저장 버튼이 잠겨 있다
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    await userEvent.clear(field);
    await userEvent.type(field, 'V/S q8hr');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onSave).toHaveBeenCalledWith('V/S q8hr');
  });

  it('reports unsaved edits so the shell can warn before leaving', async () => {
    const onDirtyChange = vi.fn();
    render(<StandingOrdersSection value="" onDirtyChange={onDirtyChange} />);

    await userEvent.type(screen.getByLabelText('지시오더'), 'NPO');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('follows the patient when the saved value changes', () => {
    const { rerender } = render(<StandingOrdersSection value="A 환자 지시" />);
    rerender(<StandingOrdersSection value="B 환자 지시" />);

    expect(screen.getByLabelText('지시오더')).toHaveValue('B 환자 지시');
  });

  it('offers the template popup like the charting form', async () => {
    render(<StandingOrdersSection value="" />);

    await userEvent.click(screen.getByRole('button', { name: '템플릿' }));
    // 차팅과 같은 팝업이 지시오더 필드로 열린다
    expect(await screen.findByText('템플릿 — 지시오더')).toBeInTheDocument();
  });
});
