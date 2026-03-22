import { useEffect, useRef, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface ResizableTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

/**
 * ResizableTextArea - 자동으로 높이가 조절되는 텍스트 영역
 *
 * 사용자가 입력하면 자동으로 높이가 늘어나고,
 * 내용을 지우면 자동으로 줄어듭니다.
 */
export const ResizableTextArea = forwardRef<HTMLTextAreaElement, ResizableTextAreaProps>(
  ({ className, minRows = 2, maxRows = 20, value, onChange, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Auto-resize logic
    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';

      // Calculate line height
      const style = window.getComputedStyle(textarea);
      const lineHeight = parseInt(style.lineHeight);

      // Calculate min and max heights
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;

      // Set new height based on content
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    };

    // Adjust height when value changes
    useEffect(() => {
      adjustHeight();
    }, [value, minRows, maxRows]);

    // Adjust height on mount
    useEffect(() => {
      adjustHeight();
    }, []);

    return (
      <textarea
        ref={(element) => {
          textareaRef.current = element;
          if (typeof ref === 'function') {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none overflow-y-auto',
          className
        )}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          adjustHeight();
        }}
        {...props}
      />
    );
  }
);

ResizableTextArea.displayName = 'ResizableTextArea';
