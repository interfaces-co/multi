import { describe, expect, it } from "vitest";

import {
  formatSchemaBackedTransportErrorDescription,
  isTransportConnectionErrorMessage,
  sanitizeThreadErrorMessage,
} from "./transport-error";

describe("transportError", () => {
  it("detects websocket transport failures", () => {
    expect(isTransportConnectionErrorMessage("SocketCloseError: 1006")).toBe(true);
    expect(isTransportConnectionErrorMessage("Unable to connect to the T3 server WebSocket.")).toBe(
      true,
    );
    expect(isTransportConnectionErrorMessage("SocketOpenError: Timeout")).toBe(true);
  });

  it("preserves non-transport thread errors", () => {
    expect(sanitizeThreadErrorMessage("Turn failed")).toBe("Turn failed");
    expect(sanitizeThreadErrorMessage("Select a base branch before sending.")).toBe(
      "Select a base branch before sending.",
    );
  });

  it("drops transport failures from thread surfaces", () => {
    expect(sanitizeThreadErrorMessage("SocketCloseError: 1006")).toBeNull();
  });

  it("formats schema-backed transport error details", () => {
    expect(
      formatSchemaBackedTransportErrorDescription(
        {
          _tag: "ServerSettingsError",
          message: "Server settings error at settings.json: invalid provider",
          settingsPath: "settings.json",
          detail: "Provider instance id must be unique.",
          cause: {
            _tag: "ProviderValidationError",
            operation: "ProviderService.refresh",
            issue: "Duplicate provider instance.",
          },
        },
        "Update failed.",
      ),
    ).toBe(
      [
        "Server settings error at settings.json: invalid provider",
        "Type: ServerSettingsError",
        "Detail: Provider instance id must be unique.",
        "Settings: settings.json",
        "Type: ProviderValidationError",
        "Issue: Duplicate provider instance.",
        "Operation: ProviderService.refresh",
      ].join("\n"),
    );
  });
});
