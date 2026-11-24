import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoteRow } from './NoteRow';

const soap = 'O) Fever, K 2.7\nA) #. R/O UTI\n#. HTN\nP) Tazocin 4V#4';

afterEach(() => vi.restoreAllMocks());

describe('NoteRow', () => {
  it('줄바꿈을 보존해 여러 줄로 보여 준다 (한 줄 말줄임이 아님)', () => {
    render(<NoteRow prefix="경과" content={soap} />);
    const text = screen.getByText(/Fever/);
    expect(text).toHaveClass('whitespace-pre-wrap');
    expect(text).not.toHaveClass('truncate');
    expect(text.textContent).toBe(soap);
  });

  it('복사 버튼이 메모 전체를 줄바꿈 그대로 클립보드에 넣는다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<NoteRow prefix="경과" content={soap} />);

    fireEvent.click(screen.getByRole('button', { name: '메모 복사' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(soap));
    expect(await screen.findByText('복사됨')).toBeInTheDocument();
  });

  it('클립보드가 막히면 내용을 선택해 Ctrl+C로 복사하게 안내한다', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<NoteRow prefix="경과" content={soap} />);

    fireEvent.click(screen.getByRole('button', { name: '메모 복사' }));

    expect(await screen.findByText('선택됨 · Ctrl+C')).toBeInTheDocument();
    expect(window.getSelection()?.toString()).toContain('Tazocin 4V#4');
  });
});
