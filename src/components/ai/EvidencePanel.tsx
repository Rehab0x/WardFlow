import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { DataSection } from '@/components/clinical/DataSection';
import { suggestEvidence, type EvidenceSuggestion, type EvidenceTopic } from '@/services/aiService';
import { useAIStore } from '@/stores/useAIStore';

/** 검색은 실제 서비스에서 하도록 링크만 만든다 — 인용은 AI가 만들지 않는다. */
const SEARCH_TARGETS = [
  { label: 'PubMed', build: (q: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encode(q)}` },
  {
    label: 'Google Scholar',
    build: (q: string) => `https://scholar.google.com/scholar?q=${encode(q)}`,
  },
  {
    label: 'UpToDate',
    build: (q: string) => `https://www.uptodate.com/contents/search?search=${encode(q)}`,
  },
] as const;

function encode(query: string) {
  return encodeURIComponent(query.trim());
}

interface EvidencePanelProps {
  /** AI에 넘길 환자 컨텍스트 */
  context: {
    patientSummary: string;
    problemList: string;
    medications: string;
    recentLab: string;
  };
  /** 환자가 바뀌면 결과를 초기화한다 */
  resetKey?: string;
}

/**
 * 근거연결 — 환자 정보를 보고 **무엇을 어떤 말로 찾아볼지** 제안한다.
 *
 * 의도적으로 논문 인용을 표시하지 않는다. LLM은 문헌 검색을 할 수 없어
 * 기억으로 인용을 쓰면 존재하지 않는 논문을 지어낸다. 임상 도구에서 이는 위험하므로,
 * 검색어와 검색식만 만들고 실제 결과는 PubMed 등에서 사용자가 직접 확인하게 한다.
 */
export function EvidencePanel({ context, resetKey }: EvidencePanelProps) {
  const aiConfigured = useAIStore((store) => store.isConfigured());
  const [result, setResult] = useState<EvidenceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setResult(null);
    setError('');
  }, [resetKey]);

  const ready = Boolean(context.problemList.trim() || context.patientSummary.trim());

  const run = useCallback(async () => {
    if (!aiConfigured || !ready || loading) return;
    setLoading(true);
    setError('');
    try {
      setResult(await suggestEvidence(context));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [aiConfigured, context, loading, ready]);

  return (
    <DataSection title="근거 찾아보기">
      <div className="space-y-2 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!aiConfigured || !ready || loading}
            onClick={run}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookOpen className="h-3.5 w-3.5" />
            )}
            검색어 제안
          </button>
          <span className="text-[11px] text-zinc-400">
            {!aiConfigured
              ? '설정 > AI 설정에서 API 키를 먼저 입력하세요.'
              : ready
                ? 'Problem List와 투약·Lab을 보고 확인할 주제를 제안합니다.'
                : 'Problem List를 먼저 입력해주세요.'}
          </span>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            {result.topics.length === 0 ? (
              <p className="text-[12px] text-zinc-500">제안할 주제를 찾지 못했습니다.</p>
            ) : (
              result.topics.map((topic, index) => <TopicCard key={index} topic={topic} />)
            )}

            {result.cautions.length > 0 && (
              <ul className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900">
                {result.cautions.map((caution, index) => (
                  <li key={index} className="list-inside list-disc">
                    {caution}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[11px] leading-relaxed text-zinc-400">
              AI는 논문을 검색하지 않습니다. 위는 <strong>검색어 제안</strong>이며, 실제 근거는 링크에서
              직접 확인하세요. 제목·저자·연도 같은 인용 정보는 의도적으로 생성하지 않습니다.
            </p>
          </div>
        )}
      </div>
    </DataSection>
  );
}

function TopicCard({ topic }: { topic: EvidenceTopic }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-2">
      <p className="text-[12.5px] font-medium text-zinc-900">{topic.title}</p>
      {topic.rationale && <p className="mt-0.5 text-[11.5px] text-zinc-500">{topic.rationale}</p>}

      {topic.keywords.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {topic.keywords.map((keyword) => (
            <span
              key={keyword}
              className="inline-flex h-5 items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 font-mono text-[10.5px] text-zinc-600"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      {topic.guideline && (
        <p className="mt-1.5 text-[11px] text-zinc-500">참고 기관: {topic.guideline}</p>
      )}

      {topic.query && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {SEARCH_TARGETS.map((target) => (
            <a
              key={target.label}
              href={target.build(topic.query)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {target.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
