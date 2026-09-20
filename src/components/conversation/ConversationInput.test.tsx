import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationInput } from './ConversationInput';
import { useAIStore } from '@/stores/useAIStore';

vi.mock('@/services/sttService', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services/sttService');
  return { ...actual, isRecordingSupported: () => true };
});

const noop = () => {};

function renderInput(overrides: Partial<Parameters<typeof ConversationInput>[0]> = {}) {
  const props = {
    stage: 'idle' as const,
    onAnalyze: vi.fn(),
    onStartRecording: noop,
    onStopRecording: noop,
    onCancelRecording: noop,
    ...overrides,
  };
  render(<ConversationInput {...props} />);
  return props;
}

describe('ConversationInput', () => {
  beforeEach(() => {
    useAIStore.setState({ whisperApiKey: '' });
  });

  it('defaults to typing so phone handovers work without a microphone', async () => {
    const user = userEvent.setup();
    const props = renderInput();

    const box = screen.getByLabelText(/들은 내용을 그대로 적어주세요/);
    await user.type(box, '302호 김철수님 열 38.2도');
    await user.click(screen.getByRole('button', { name: '환자별로 정리' }));

    expect(props.onAnalyze).toHaveBeenCalledWith('302호 김철수님 열 38.2도');
  });

  it('keeps the analyse button disabled until something is typed', () => {
    renderInput();
    expect(screen.getByRole('button', { name: '환자별로 정리' })).toBeDisabled();
  });

  it('hides the recording option and explains why when no Whisper key is set', () => {
    renderInput();
    expect(screen.queryByRole('button', { name: /녹음/ })).toBeNull();
    expect(screen.getByText(/Whisper API 키를 입력하세요/)).toBeInTheDocument();
  });

  it('offers recording once a Whisper key exists', async () => {
    useAIStore.setState({ whisperApiKey: 'sk-test-key-that-is-long' });
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole('button', { name: /^녹음/ }));

    expect(screen.getByRole('button', { name: '녹음 시작' })).toBeInTheDocument();
  });

  it('shows progress while transcribing and segmenting', () => {
    const { unmount } = render(
      <ConversationInput
        stage="transcribing"
        onAnalyze={noop}
        onStartRecording={noop}
        onStopRecording={noop}
        onCancelRecording={noop}
      />
    );
    expect(screen.getByText('음성을 변환하는 중…')).toBeInTheDocument();
    unmount();

    render(
      <ConversationInput
        stage="segmenting"
        onAnalyze={noop}
        onStartRecording={noop}
        onStopRecording={noop}
        onCancelRecording={noop}
      />
    );
    expect(screen.getByText('환자별로 나누는 중…')).toBeInTheDocument();
  });
});
