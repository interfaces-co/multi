import { scopeThreadRef } from "@multi/client-runtime";
import { EnvironmentId, ThreadId } from "@multi/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ToastProvider, toastManager } from "../app/toast";

const ACTIVE_ENVIRONMENT_ID = EnvironmentId.make("environment-toast-active");
const ACTIVE_THREAD_ID = ThreadId.make("thread-toast-active");

vi.mock("@tanstack/react-router", () => ({
  useParams: <TResult,>(options?: {
    select?: (
      params: Partial<Record<"environmentId" | "threadId" | "draftId", string | undefined>>,
    ) => TResult;
  }) => {
    const params = {
      environmentId: ACTIVE_ENVIRONMENT_ID,
      threadId: ACTIVE_THREAD_ID,
    };
    return options?.select ? options.select(params) : params;
  },
}));

const toastIds: ReturnType<typeof toastManager.add>[] = [];

function addToast(input: Parameters<typeof toastManager.add>[0]) {
  const id = toastManager.add(input);
  toastIds.push(id);
  return id;
}

function readToastTitles(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="toast-title"]')).map(
    (element) => element.textContent ?? "",
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    for (const id of toastIds.splice(0)) {
      toastManager.close(id);
    }
    document.body.innerHTML = "";
  });

  it("renders global and active-thread toasts while hiding other-thread toasts", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const screen = await render(
      <ToastProvider>
        <div />
      </ToastProvider>,
      { container: host },
    );

    try {
      addToast({
        title: "Global toast",
        type: "info",
      });
      addToast({
        title: "Active thread toast",
        type: "success",
        data: {
          threadRef: scopeThreadRef(ACTIVE_ENVIRONMENT_ID, ACTIVE_THREAD_ID),
        },
      });
      addToast({
        title: "Other thread toast",
        type: "warning",
        data: {
          threadRef: scopeThreadRef(
            EnvironmentId.make("environment-toast-other"),
            ACTIVE_THREAD_ID,
          ),
        },
      });

      await vi.waitFor(() => {
        const titles = readToastTitles();
        expect(titles).toContain("Global toast");
        expect(titles).toContain("Active thread toast");
      });
      expect(readToastTitles()).not.toContain("Other thread toast");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
