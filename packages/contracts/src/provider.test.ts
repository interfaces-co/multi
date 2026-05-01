import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import {
  ProviderEvent,
  ProviderSendTurnInput,
  ProviderSession,
  ProviderSessionStartInput,
} from "./provider";
import { ProviderDriverKind, ProviderInstanceId } from "./provider-instance";

const decodeProviderSessionStartInput = Schema.decodeUnknownSync(ProviderSessionStartInput);
const decodeProviderSendTurnInput = Schema.decodeUnknownSync(ProviderSendTurnInput);
const decodeProviderSession = Schema.decodeUnknownSync(ProviderSession);
const decodeProviderEvent = Schema.decodeUnknownSync(ProviderEvent);

function getOptionValue(
  options: ReadonlyArray<{ id: string; value: unknown }> | undefined,
  id: string,
): unknown {
  return options?.find((option) => option.id === id)?.value;
}

describe("ProviderSessionStartInput", () => {
  it("accepts codex-compatible payloads", () => {
    const parsed = decodeProviderSessionStartInput({
      threadId: "thread-1",
      provider: "codex",
      providerInstanceId: "codex",
      cwd: "/tmp/workspace",
      modelSelection: {
        instanceId: "codex",
        model: "gpt-5.3-codex",
        options: [
          { id: "reasoningEffort", value: "high" },
          { id: "fastMode", value: true },
        ],
      },
      runtimeMode: "full-access",
    });
    const selection = parsed.modelSelection;
    if (!selection) {
      throw new Error("Expected modelSelection");
    }
    expect(parsed.runtimeMode).toBe("full-access");
    expect(parsed.providerInstanceId).toBe("codex");
    expect(selection.instanceId).toBe("codex");
    expect(selection.model).toBe("gpt-5.3-codex");
    expect(getOptionValue(selection.options, "reasoningEffort")).toBe("high");
    expect(getOptionValue(selection.options, "fastMode")).toBe(true);
  });

  it("rejects payloads without runtime mode", () => {
    expect(() =>
      decodeProviderSessionStartInput({
        threadId: "thread-1",
        providerInstanceId: "codex",
      }),
    ).toThrow();
  });

  it("accepts claude runtime knobs", () => {
    const parsed = decodeProviderSessionStartInput({
      threadId: "thread-1",
      provider: "claudeAgent",
      providerInstanceId: "claudeAgent",
      cwd: "/tmp/workspace",
      modelSelection: {
        instanceId: "claudeAgent",
        model: "claude-sonnet-4-6",
        options: [
          { id: "thinking", value: true },
          { id: "effort", value: "max" },
          { id: "fastMode", value: true },
        ],
      },
      runtimeMode: "full-access",
    });
    const selection = parsed.modelSelection;
    if (!selection) {
      throw new Error("Expected modelSelection");
    }
    expect(parsed.provider).toBe("claudeAgent");
    expect(parsed.providerInstanceId).toBe("claudeAgent");
    expect(selection.instanceId).toBe("claudeAgent");
    expect(selection.model).toBe("claude-sonnet-4-6");
    expect(getOptionValue(selection.options, "thinking")).toBe(true);
    expect(getOptionValue(selection.options, "effort")).toBe("max");
    expect(getOptionValue(selection.options, "fastMode")).toBe(true);
    expect(parsed.runtimeMode).toBe("full-access");
  });

  it("accepts cursor provider", () => {
    const parsed = decodeProviderSessionStartInput({
      threadId: "thread-1",
      provider: "cursor",
      providerInstanceId: "cursor",
      cwd: "/tmp/workspace",
      runtimeMode: "full-access",
      modelSelection: {
        instanceId: "cursor",
        model: "composer-2",
        options: [{ id: "fastMode", value: true }],
      },
    });
    const selection = parsed.modelSelection;
    if (!selection) {
      throw new Error("Expected modelSelection");
    }
    expect(parsed.provider).toBe("cursor");
    expect(parsed.providerInstanceId).toBe("cursor");
    expect(selection.instanceId).toBe("cursor");
    expect(selection.model).toBe("composer-2");
    expect(getOptionValue(selection.options, "fastMode")).toBe(true);
  });

  it("accepts fork-provided driver kinds as branded slugs", () => {
    const parsed = decodeProviderSessionStartInput({
      threadId: "thread-1",
      provider: "ollama",
      providerInstanceId: "ollama_local",
      cwd: "/tmp/workspace",
      runtimeMode: "full-access",
      modelSelection: {
        instanceId: "ollama_local",
        model: "llama3.3",
      },
    });

    expect(parsed.provider).toBe("ollama");
    expect(parsed.providerInstanceId).toBe("ollama_local");
    expect(parsed.modelSelection?.instanceId).toBe("ollama_local");
  });
});

describe("ProviderSendTurnInput", () => {
  it("accepts codex modelSelection", () => {
    const parsed = decodeProviderSendTurnInput({
      threadId: "thread-1",
      modelSelection: {
        instanceId: "codex",
        model: "gpt-5.3-codex",
        options: [
          { id: "reasoningEffort", value: "xhigh" },
          { id: "fastMode", value: true },
        ],
      },
    });

    const selection = parsed.modelSelection;
    if (!selection) {
      throw new Error("Expected modelSelection");
    }
    expect(selection.instanceId).toBe("codex");
    expect(selection.model).toBe("gpt-5.3-codex");
    expect(getOptionValue(selection.options, "reasoningEffort")).toBe("xhigh");
    expect(getOptionValue(selection.options, "fastMode")).toBe(true);
  });

  it("accepts claude modelSelection including ultrathink", () => {
    const parsed = decodeProviderSendTurnInput({
      threadId: "thread-1",
      modelSelection: {
        instanceId: "claudeAgent",
        model: "claude-sonnet-4-6",
        options: [
          { id: "effort", value: "ultrathink" },
          { id: "fastMode", value: true },
        ],
      },
    });

    const selection = parsed.modelSelection;
    if (!selection) {
      throw new Error("Expected modelSelection");
    }
    expect(selection.instanceId).toBe("claudeAgent");
    expect(getOptionValue(selection.options, "effort")).toBe("ultrathink");
    expect(getOptionValue(selection.options, "fastMode")).toBe(true);
  });
});

describe("providerInstanceId routing key", () => {
  it("requires providerInstanceId for ProviderSessionStartInput", () => {
    expect(() =>
      decodeProviderSessionStartInput({
        threadId: "thread-1",
        provider: "codex",
        runtimeMode: "full-access",
      }),
    ).toThrow();
  });

  it("propagates providerInstanceId through ProviderSession decode", () => {
    const session = decodeProviderSession({
      provider: "codex",
      providerInstanceId: "codex_work",
      status: "ready",
      runtimeMode: "full-access",
      threadId: "thread-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    expect(session.providerInstanceId).toBe("codex_work");
  });

  it("decodes ProviderSession for fork-provided driver kinds", () => {
    const session = decodeProviderSession({
      provider: "ollama",
      providerInstanceId: "ollama_local",
      status: "ready",
      runtimeMode: "full-access",
      threadId: "thread-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    expect(session.provider).toBe("ollama");
    expect(session.providerInstanceId).toBe("ollama_local");
  });

  it("decodes a ProviderEvent carrying driver metadata and instance routing", () => {
    const event = decodeProviderEvent({
      id: "event-1",
      kind: "notification",
      provider: "codex",
      providerInstanceId: "codex_personal",
      threadId: "thread-1",
      createdAt: "2024-01-01T00:00:00Z",
      method: "session.created",
    });
    expect(event.provider).toBe("codex");
    expect(event.providerInstanceId).toBe("codex_personal");
  });

  it("rejects providerInstanceId values that fail the slug pattern", () => {
    expect(() =>
      decodeProviderSessionStartInput({
        threadId: "thread-1",
        provider: "codex",
        providerInstanceId: "1bad",
        runtimeMode: "full-access",
      }),
    ).toThrow();
  });
});
