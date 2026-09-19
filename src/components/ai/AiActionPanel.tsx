import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bot, Check, Copy, Loader2, X } from 'lucide-react';
import { DataSection } from '@/components/clinical/DataSection';
import { useAIStore } from '@/stores/useAIStore';

interface AiActionPanelProps {
  /** 섹션 제목 (예: "AI Lab 요약") */
  title: string;
  /** 실행 버튼 라벨 (예: "Lab 요약 생성") */
  actionLabel: string;
  /** 결과 박스 제목 */
  resultTitle: string;
  /** AI 호출. 결과 텍스트를 반환한다. */
  run: () => Promise<string>;
  /** false면 버튼 비활성화 (AI 키 설정 여부와 별개인 데이터 조건) */
  ready?: boolean;
  /** ready가 false일 때 보여줄 안내 */
  notReadyHint?: string;
  /** 사용 준비가 되었을 때 보여줄 안내 */
  readyHint?: string;
  /** 결과를 다른 곳에 저장하는 부가 액션 (예: 메모로 저장) */
  onSaveResult?: (text: string) => void | Promise<void>;
  saveLabel?: string;
  /** 패널 상단에 끼워넣을 추가 컨트롤 */
  extraControls?: ReactNode;
  /** 환자 전환 등으로 결과를 초기화해야 할 때 바꿔주는 키 */
  resetKey?: string;
}

/**
 * AI 호출 진입점 공통 UI.
 * 버튼 → 로딩 → 에러/결과 표시 → 복사/저장까지의 흐름을 한 곳에서 처리한다.
 */
export function AiActionPanel({
  title,
  actionLabel,
  resultTitle,
  run,
  ready = true,
  notReadyHint,
  readyHint,
  onSaveResult,
  saveLabel = '저장',
  extraControls,
  resetKey,
}: AiActionPanelProps) {
  const aiConfigured = useAIStore((state) => state.isConfigured());
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    setResult('');
    setError('');
    setCopied(false);
  }, [resetKey]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const canRun = aiConfigured && ready;

  const execute = useCallback(async () => {
    if (!canRun || loading) return;
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const text = await run();
      setResult(text.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [canRun, loading, run]);

  const copy = useCallback(async () => {
    if (!result.trim()) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setError('클립보드 복사에 실패했습니다.');
    }
  }, [result]);

  const save = useCallback(async () => {
    const text = result.trim();
    if (!text || !onSaveResult || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSaveResult(text);
      setResult('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [onSaveResult, result, saving]);

  return (
    <DataSection title={title}>
      <div className="space-y-2 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canRun || loading}
            onClick={execute}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="h-3.5 w-3.5" />
            )}
            {actionLabel}
          </button>
          {extraControls}
          <span className="text-[11px] text-zinc-400">
            {!aiConfigured
              ? '설정 > AI 설정에서 API 키를 먼저 입력하세요.'
              : ready
                ? readyHint
                : notReadyHint}
          </span>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-md border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-2 py-1.5">
              <span className="text-[12px] font-medium text-zinc-800">{resultTitle}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] text-zinc-600 hover:bg-zinc-100"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  복사
                </button>
                {onSaveResult && (
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="inline-flex h-7 items-center justify-center rounded-md bg-zinc-900 px-2 text-[11px] font-medium text-white hover:bg-zinc-700 disabled:bg-zinc-300"
                  >
                    {saving ? '저장 중' : saveLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setResult('')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={`${resultTitle} 닫기`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-2 font-mono text-[12px] leading-5 text-zinc-700">
              {result}
            </pre>
          </div>
        )}
      </div>
    </DataSection>
  );
}
