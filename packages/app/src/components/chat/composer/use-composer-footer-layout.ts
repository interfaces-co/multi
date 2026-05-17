import type { ThreadId } from "@multi/contracts";
import { useLayoutEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";

import {
  shouldUseCompactComposerFooter,
  shouldUseCompactComposerPrimaryActions,
} from "../../composer-footer-layout";

export function useComposerFooterLayout(input: {
  formRef: RefObject<HTMLFormElement | null>;
  activeThreadId: ThreadId | null;
  actionLayoutKey: string;
  hasWideActions: boolean;
  isModelPickerOpen: boolean;
  shouldAutoScrollRef: MutableRefObject<boolean>;
  scheduleStickToBottom: () => void;
}) {
  const {
    activeThreadId,
    actionLayoutKey,
    formRef,
    hasWideActions,
    isModelPickerOpen,
    scheduleStickToBottom,
    shouldAutoScrollRef,
  } = input;
  const [isComposerFooterCompact, setIsComposerFooterCompact] = useState(false);
  const [isComposerPrimaryActionsCompact, setIsComposerPrimaryActionsCompact] = useState(false);
  const composerFormHeightRef = useRef(0);
  const isComposerModelPickerOpenRef = useRef(isModelPickerOpen);
  isComposerModelPickerOpenRef.current = isModelPickerOpen;

  useLayoutEffect(() => {
    const composerForm = formRef.current;
    if (!composerForm) return;
    const measureComposerFormWidth = () => composerForm.clientWidth;
    const measureFooterCompactness = () => {
      const composerFormWidth = measureComposerFormWidth();
      const footerCompact = shouldUseCompactComposerFooter(composerFormWidth, {
        hasWideActions,
      });
      const primaryActionsCompact =
        footerCompact &&
        shouldUseCompactComposerPrimaryActions(composerFormWidth, {
          hasWideActions,
        });
      return {
        primaryActionsCompact,
        footerCompact,
      };
    };

    composerFormHeightRef.current = composerForm.getBoundingClientRect().height;
    const initialCompactness = measureFooterCompactness();
    setIsComposerPrimaryActionsCompact(initialCompactness.primaryActionsCompact);
    setIsComposerFooterCompact(initialCompactness.footerCompact);
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) return;
      const nextCompactness = measureFooterCompactness();
      setIsComposerPrimaryActionsCompact((previous) =>
        previous === nextCompactness.primaryActionsCompact
          ? previous
          : nextCompactness.primaryActionsCompact,
      );
      setIsComposerFooterCompact((previous) =>
        previous === nextCompactness.footerCompact ? previous : nextCompactness.footerCompact,
      );
      const nextHeight = entry.contentRect.height;
      const previousHeight = composerFormHeightRef.current;
      composerFormHeightRef.current = nextHeight;
      if (previousHeight > 0 && Math.abs(nextHeight - previousHeight) < 0.5) return;
      // The model picker owns a portalled popover whose opening can resize the footer.
      // Keep the timeline stationary while Base UI is anchoring that popup.
      if (isComposerModelPickerOpenRef.current) return;
      if (!shouldAutoScrollRef.current) return;
      scheduleStickToBottom();
    });

    observer.observe(composerForm);
    return () => {
      observer.disconnect();
    };
  }, [
    activeThreadId,
    actionLayoutKey,
    formRef,
    hasWideActions,
    scheduleStickToBottom,
    shouldAutoScrollRef,
  ]);

  return {
    isComposerFooterCompact,
    isComposerPrimaryActionsCompact,
  };
}
