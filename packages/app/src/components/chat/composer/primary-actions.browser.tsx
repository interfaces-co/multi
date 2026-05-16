import "../../../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ComposerPrimaryActions } from "./primary-actions";

describe("ComposerPrimaryActions", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("submits pending user-input answers through a direct click handler", async () => {
    const onAdvancePendingQuestion = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);

    const screen = await render(
      <ComposerPrimaryActions
        compact={false}
        dockSingleRow={false}
        pendingAction={{
          questionIndex: 0,
          isLastQuestion: true,
          canAdvance: true,
          isResponding: false,
          isComplete: true,
        }}
        isRunning={false}
        showPlanFollowUpPrompt={false}
        promptHasText={false}
        isSendBusy={false}
        isConnecting={false}
        isPreparingWorktree={false}
        hasSendableContent={false}
        sendWhileStreamingBehavior="queue"
        onAdvancePendingQuestion={onAdvancePendingQuestion}
        onPreviousPendingQuestion={vi.fn()}
        onInterrupt={vi.fn()}
        onImplementPlanInNewThread={vi.fn()}
      />,
      { container: host },
    );

    await page.getByRole("button", { name: "Submit answer" }).click();

    expect(onAdvancePendingQuestion).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });
});
