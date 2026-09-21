import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiActionPanel } from './AiActionPanel';
import { insertAssessmentProblem } from '@/components/workspace/workspaceData';
import { useAIStore } from '@/stores/useAIStore';

const SOAP = ['S)', '열감 호소', 'O)', 'BT 38.2', 'A)', '#. R/O Pneumonia', 'P)', '경과 관찰'].join(
  '\n'
);

function renderPanel(overrides: Partial<Parameters<typeof AiActionPanel>[0]> = {}) {
  const props = {
    title: 'AI SOAP 생성',
    actionLabel: 'SOAP 생성',
    resultTitle: 'SOAP 초안',
    run: vi.fn().mockResolvedValue(SOAP),
    onSaveResult: vi.fn(),
    ...overrides,
  };
  render(<AiActionPanel {...props} />);
  return props;
}

describe('AiActionPanel', () => {
  beforeEach(() => {
    useAIStore.setState({ apiKey: 'test-api-key-value' });
  });

  it('lets the draft be edited before saving', async () => {
    const props = renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /SOAP 생성/ }));
    const draft = await screen.findByLabelText('SOAP 초안');
    await userEvent.type(draft, ' 추가');

    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(props.onSaveResult).toHaveBeenCalledWith(`${SOAP} 추가`);
  });

  it('runs the result tools against the current draft', async () => {
    renderPanel({
      renderResultTools: ({ result, setResult }) => (
        <button type="button" onClick={() => setResult(insertAssessmentProblem(result, 'HTN'))}>
          #. HTN
        </button>
      ),
    });

    await userEvent.click(screen.getByRole('button', { name: /SOAP 생성/ }));
    await userEvent.click(await screen.findByRole('button', { name: '#. HTN' }));

    // A) 섹션 끝, P) 앞에 들어간다
    expect(screen.getByLabelText('SOAP 초안')).toHaveValue(
      ['S)', '열감 호소', 'O)', 'BT 38.2', 'A)', '#. R/O Pneumonia', '#. HTN', 'P)', '경과 관찰'].join(
        '\n'
      )
    );
  });

  it('hides the tools until there is a draft', () => {
    renderPanel({ renderResultTools: () => <button type="button">#. HTN</button> });
    expect(screen.queryByRole('button', { name: '#. HTN' })).not.toBeInTheDocument();
  });
});
