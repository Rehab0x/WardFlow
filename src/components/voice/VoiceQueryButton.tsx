import { useState } from 'react';
import { Mic } from 'lucide-react';
import { useVoiceQuery, useVoiceQueryReady } from '@/hooks/useVoiceQuery';
import { VoiceQueryOverlay } from './VoiceQueryOverlay';

/**
 * 회진 중 어디서든 쓸 수 있는 플로팅 마이크 버튼.
 * 특정 환자 화면에 종속되지 않도록 앱 셸에 배치한다.
 */
export function VoiceQueryButton({
  onOpenPatient,
}: {
  onOpenPatient?: (patientId: string, tab?: string) => void;
}) {
  const ready = useVoiceQueryReady();
  const [open, setOpen] = useState(false);
  const voice = useVoiceQuery();

  // API 키가 없으면 버튼 자체를 숨긴다 — 눌러도 실패하는 버튼을 두지 않는다.
  if (!ready) return null;

  const close = () => {
    voice.reset();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="음성으로 질문하기"
        title="음성으로 질문하기"
        onClick={() => {
          setOpen(true);
          void voice.start();
        }}
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-colors hover:bg-zinc-700 md:bottom-6"
      >
        <Mic className="h-5 w-5" />
      </button>

      {open && <VoiceQueryOverlay voice={voice} onClose={close} onOpenPatient={onOpenPatient} />}
    </>
  );
}
