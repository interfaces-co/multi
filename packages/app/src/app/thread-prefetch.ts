import type { AppRouter } from "~/router";
import type { Thread } from "~/types";
import type { DraftId } from "~/composer-draft-store";

export function prefetchDraftNavigation(router: AppRouter, draftId: DraftId | string): void {
  void router
    .preloadRoute({
      to: "/draft/$draftId",
      params: { draftId },
    })
    .catch(() => undefined);
}

export function prefetchThreadNavigation(input: { router: AppRouter; thread: Thread }): void {
  void input.router
    .preloadRoute({
      to: "/$environmentId/$threadId",
      params: {
        environmentId: input.thread.environmentId,
        threadId: input.thread.id,
      },
    })
    .catch(() => undefined);
}
