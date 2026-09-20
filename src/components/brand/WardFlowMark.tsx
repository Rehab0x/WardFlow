import { cn } from '@/lib/utils';

/**
 * WardFlow 심볼 — 맥박이 그리는 W.
 *
 * 앱 아이콘(`public/icons/icon.svg`)과 같은 형태를 배경 없이 그린다.
 * 색은 `currentColor`를 따르므로 놓이는 자리의 글자색에 맞춰 쓰면 된다.
 * 모양을 고칠 때는 `scripts/generate-icons.mjs`의 마크 경로도 함께 고쳐야 한다.
 */
export function WardFlowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="60 90 392 326"
      role="img"
      aria-label="WardFlow"
      className={cn('h-5 w-5', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={44}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M92 178 L146 178 L200 378 L256 124 L312 378 L366 178 L420 178" />
    </svg>
  );
}
