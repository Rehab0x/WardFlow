import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientTextSection } from './PatientTextSection';

vi.mock('@/services/templateService', () => ({
  templateService: {
    getByField: vi.fn().mockResolvedValue([]),
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

/** 지시오더 박스처럼 템플릿·복사까지 켠 형태로 렌더한다. */
function renderOrders(props: Partial<Parameters<typeof PatientTextSection>[0]> = {}) {
  return render(
    <PatientTextSection
      title="지시오더"
      value=""
      templateField="standingOrders"
      copyTitle="지시오더 복사"
      {...props}
    />
  );
}

describe('PatientTextSection', () => {
  it('saves only what the user changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderOrders({ value: '기존 지시', onSave });

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
    renderOrders({ onDirtyChange });

    await userEvent.type(screen.getByLabelText('지시오더'), 'NPO');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('follows the patient when the saved value changes', () => {
    const { rerender } = renderOrders({ value: 'A 환자 지시' });
    rerender(
      <PatientTextSection
        title="지시오더"
        value="B 환자 지시"
        templateField="standingOrders"
        copyTitle="지시오더 복사"
      />
    );

    expect(screen.getByLabelText('지시오더')).toHaveValue('B 환자 지시');
  });

  it('offers the template popup like the charting form', async () => {
    renderOrders();

    await userEvent.click(screen.getByRole('button', { name: '템플릿' }));
    // 차팅과 같은 팝업이 지시오더 필드로 열린다
    expect(await screen.findByText('템플릿 — 지시오더')).toBeInTheDocument();
  });

  it('leaves out the template and copy controls when they are not wanted', () => {
    // 중요사항 박스는 저장만 한다
    render(<PatientTextSection title="중요사항" value="" />);

    expect(screen.getByLabelText('중요사항')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '템플릿' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /복사/ })).not.toBeInTheDocument();
  });
});
