import { IconBrain } from "central-icons";
import { forwardRef, useMemo, useSyncExternalStore, type HTMLAttributes } from "react";
import { cn } from "~/lib/utils";

const DEFAULT_WORDS = ["Thinking", "Planning", "Refining"] as const;
const THINKING_WORD_INTERVAL_MS = 4000;

interface ThinkingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  words?: ReadonlyArray<string>;
}

const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
  ({ className, words = DEFAULT_WORDS, ...props }, ref) => {
    const safeWords = words.length > 0 ? words : DEFAULT_WORDS;
    const wordIndexStore = useMemo(
      () => createThinkingWordIndexStore(safeWords.length),
      [safeWords.length],
    );
    const index = useSyncExternalStore(
      wordIndexStore.subscribe,
      wordIndexStore.getSnapshot,
      wordIndexStore.getSnapshot,
    );
    const currentWord = safeWords[index % safeWords.length] ?? DEFAULT_WORDS[0];
    const longestWord = safeWords.reduce((a, b) => (a.length >= b.length ? a : b));

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Working"
        className={cn(
          "inline-flex items-center gap-2 px-0.5 py-1.5 text-muted-foreground/80",
          className,
        )}
        {...props}
      >
        <IconBrain aria-hidden="true" className="size-5 shrink-0 opacity-80" />
        <span className="inline-flex items-baseline gap-1 text-body font-medium" aria-hidden="true">
          <span className="inline-grid overflow-hidden">
            <span className="col-start-1 row-start-1 invisible">{longestWord}</span>
            <span
              key={currentWord}
              className="col-start-1 row-start-1 animate-thinking-word-in thinking-shimmer will-change-[transform,opacity] motion-reduce:animate-none"
            >
              {currentWord}
            </span>
          </span>
        </span>
      </div>
    );
  },
);

ThinkingIndicator.displayName = "ThinkingIndicator";

export { ThinkingIndicator };

function createThinkingWordIndexStore(wordCount: number) {
  let index = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();

  const emit = () => {
    index = (index + 1) % wordCount;
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getSnapshot: () => index,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (wordCount > 1) {
        intervalId ??= setInterval(emit, THINKING_WORD_INTERVAL_MS);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
    },
  };
}
