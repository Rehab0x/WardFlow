import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvidencePanel } from './EvidencePanel';
import { useAIStore } from '@/stores/useAIStore';

const ai = vi.hoisted(() => ({ suggestEvidence: vi.fn() }));
vi.mock('@/services/aiService', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services/aiService');
  return { ...actual, suggestEvidence: ai.suggestEvidence };
});

const context = {
  patientSummary: '김철수 M/70 · fever',
  problemList: 'aspiration pneumonia',
  medications: 'Meropenem',
  recentLab: 'CRP 12',
};

describe('EvidencePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAIStore.setState({ apiKey: 'sk-test-key-that-is-long' });
    ai.suggestEvidence.mockResolvedValue({
      topics: [
        {
          title: '흡인성 폐렴 항생제 기간',
          rationale: '항생제 10일째',
          keywords: ['aspiration pneumonia', 'antibiotic duration'],
          query: 'aspiration pneumonia AND antibiotic duration',
          guideline: 'IDSA',
        },
      ],
      cautions: ['신기능 저하 시 용량 조절'],
    });
  });

  it('renders search links rather than citations', async () => {
    const user = userEvent.setup();
    render(<EvidencePanel context={context} />);

    await user.click(screen.getByRole('button', { name: /검색어 제안/ }));

    await waitFor(() => expect(screen.getByText('흡인성 폐렴 항생제 기간')).toBeInTheDocument());

    const pubmed = screen.getByRole('link', { name: /PubMed/ });
    expect(pubmed).toHaveAttribute(
      'href',
      'https://pubmed.ncbi.nlm.nih.gov/?term=aspiration%20pneumonia%20AND%20antibiotic%20duration'
    );
    expect(pubmed).toHaveAttribute('target', '_blank');
    expect(pubmed).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('link', { name: /Google Scholar/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /UpToDate/ })).toBeInTheDocument();
  });

  it('states plainly that the AI does not search literature', async () => {
    const user = userEvent.setup();
    render(<EvidencePanel context={context} />);

    await user.click(screen.getByRole('button', { name: /검색어 제안/ }));

    await waitFor(() =>
      expect(screen.getByText(/AI는 논문을 검색하지 않습니다/)).toBeInTheDocument()
    );
    expect(screen.getByText(/인용 정보는 의도적으로 생성하지 않습니다/)).toBeInTheDocument();
  });

  it('shows the cautions the model returned', async () => {
    const user = userEvent.setup();
    render(<EvidencePanel context={context} />);
    await user.click(screen.getByRole('button', { name: /검색어 제안/ }));

    await waitFor(() => expect(screen.getByText('신기능 저하 시 용량 조절')).toBeInTheDocument());
  });

  it('asks for a problem list before it can suggest anything', () => {
    render(
      <EvidencePanel
        context={{ patientSummary: '', problemList: '', medications: '', recentLab: '' }}
      />
    );
    expect(screen.getByRole('button', { name: /검색어 제안/ })).toBeDisabled();
    expect(screen.getByText(/Problem List를 먼저 입력/)).toBeInTheDocument();
  });

  it('tells the user to set an API key when none is configured', () => {
    useAIStore.setState({ apiKey: '' });
    render(<EvidencePanel context={context} />);
    expect(screen.getByRole('button', { name: /검색어 제안/ })).toBeDisabled();
    expect(screen.getByText(/API 키를 먼저 입력/)).toBeInTheDocument();
  });

  it('surfaces a failure instead of rendering stale results', async () => {
    ai.suggestEvidence.mockRejectedValue(new Error('rate limit'));
    const user = userEvent.setup();
    render(<EvidencePanel context={context} />);

    await user.click(screen.getByRole('button', { name: /검색어 제안/ }));

    await waitFor(() => expect(screen.getByText('rate limit')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /PubMed/ })).toBeNull();
  });
});
