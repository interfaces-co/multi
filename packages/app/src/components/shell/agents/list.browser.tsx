import "../../../index.css";
import "../../../styles/tokens.css";
import "../../../styles/shell.css";

import { createRoot } from "react-dom/client";
import type { ComponentProps, ReactNode } from "react";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SidebarSectionModel } from "~/lib/sidebar-chat-view-model";
import { AgentList } from "./list";

vi.mock("~/components/shell/sidebar/thread-context-menu", () => ({
  ThreadContextMenu: (props: { children: ReactNode; onRename: () => void }) => (
    <div>
      <button type="button" onClick={props.onRename}>
        Rename row
      </button>
      {props.children}
    </div>
  ),
}));

vi.mock("~/hooks/use-thread-actions", () => ({
  useThreadActions: () => ({
    archiveThread: vi.fn(async () => undefined),
    commitRename: vi.fn(async () => undefined),
  }),
}));

vi.mock("~/lib/thread-unread-store", () => ({
  useThreadUnreadStore: (selector: (state: { mark: (id: string) => void }) => unknown) =>
    selector({ mark: vi.fn() }),
}));

vi.mock("~/store", () => ({
  selectThreadsAcrossEnvironments: () => [{ id: "thread-1", environmentId: "env-1" }],
  useStore: (selector: (state: object) => unknown) => selector({}),
}));

const sections: SidebarSectionModel[] = [
  {
    id: "ws:/tmp/project",
    label: "project",
    cwd: "/tmp/project",
    active: true,
    items: [
      {
        id: "thread-1",
        kind: "thread",
        title: "Implement compact sidebar rows",
        state: "running",
        unread: true,
        updatedAt: "2026-04-29T12:00:00.000Z",
        ago: "4m",
        cwd: "/tmp/project",
      },
      {
        id: "draft-1",
        kind: "draft",
        title: "Draft follow-up",
        state: "draft",
        unread: false,
        updatedAt: "2026-04-29T12:01:00.000Z",
        ago: "now",
        cwd: "/tmp/project",
      },
    ],
  },
];

async function mount(props: Partial<ComponentProps<typeof AgentList>> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  root.render(
    <AgentList
      sections={sections}
      selectedId="thread-1"
      onSelectAgent={vi.fn()}
      onNewAgent={vi.fn()}
      {...props}
    />,
  );
  await Promise.resolve();
  const cleanup = async () => {
    root.unmount();
    host.remove();
  };
  return {
    [Symbol.asyncDispose]: cleanup,
    cleanup,
  };
}

describe("AgentList sidebar", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders compact selected rows with stable status and time slots", async () => {
    await using _ = await mount();

    const selectedRow = page.getByRole("button", {
      name: /Implement compact sidebar rows/,
    });
    await expect.element(selectedRow).toHaveAttribute("data-selected", "true");

    const selectedElement = document.querySelector<HTMLElement>(
      '[data-agent-sidebar-cell][data-selected="true"]',
    );
    expect(selectedElement?.querySelector(".agent-sidebar-cell-status")).not.toBeNull();
    expect(selectedElement?.querySelector(".agent-sidebar-cell-subtitle")).not.toBeNull();
    expect(selectedElement?.querySelector(".agent-sidebar-cell-subtitle")?.textContent).toBe("4m");
  });

  it("keeps the row geometry when entering rename mode", async () => {
    await using _ = await mount();

    await page.getByRole("button", { name: "Rename row" }).click();

    const renameRow = document.querySelector<HTMLElement>(
      "[data-agent-sidebar-cell][data-renaming]",
    );
    expect(renameRow).not.toBeNull();
    expect(renameRow?.querySelector(".agent-sidebar-cell-status")).not.toBeNull();
    expect(renameRow?.querySelector(".agent-sidebar-cell-subtitle")?.textContent).toBe("4m");
    await expect
      .element(page.getByLabelText("Rename thread"))
      .toHaveValue("Implement compact sidebar rows");
  });
});
