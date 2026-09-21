import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from './TopBar';

function renderTopBar(props: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const merged = { onToday: vi.fn(), ...props };
  render(
    <MemoryRouter>
      <TopBar {...merged} />
    </MemoryRouter>
  );
  return merged;
}

describe('TopBar 로고', () => {
  it('goes back to Today, not just to the route', async () => {
    // 앱은 이미 "/"에 있어서 라우터만으로는 환자 워크스페이스가 닫히지 않는다
    const props = renderTopBar();

    await userEvent.click(screen.getByRole('link', { name: 'WardFlow 홈 (Today)' }));

    expect(props.onToday).toHaveBeenCalledTimes(1);
  });

  it('leaves a new-tab click alone', () => {
    const props = renderTopBar();

    // ⌘/Ctrl+클릭은 브라우저가 새 탭으로 여는 동작이라 가로채지 않는다
    fireEvent.click(screen.getByRole('link', { name: 'WardFlow 홈 (Today)' }), { metaKey: true });

    expect(props.onToday).not.toHaveBeenCalled();
  });

  it('still offers the separate Today button', async () => {
    const props = renderTopBar();

    await userEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(props.onToday).toHaveBeenCalled();
  });
});
