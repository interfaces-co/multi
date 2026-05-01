/**
 * ProviderAdapterRegistry - Lookup boundary for provider adapter implementations.
 *
 * Maps a provider kind to the concrete adapter service (Codex, Claude, etc).
 * It does not own session lifecycle or routing rules; `ProviderService` uses
 * this registry together with `ProviderSessionDirectory`.
 *
 * @module ProviderAdapterRegistry
 */
import type { ProviderDriverKind, ProviderInstanceId } from "@multi/contracts";
import { Context } from "effect";
import type { Effect, PubSub, Scope, Stream } from "effect";

import type { ProviderAdapterError, ProviderUnsupportedError } from "./Errors.ts";
import type { ProviderAdapterShape } from "./ProviderAdapter.service.ts";

/**
 * ProviderAdapterRegistryShape - Service API for adapter lookup by provider kind.
 */
export interface ProviderAdapterRegistryShape {
  readonly getByInstance: (
    instanceId: ProviderInstanceId,
  ) => Effect.Effect<ProviderAdapterShape<ProviderAdapterError>, ProviderUnsupportedError>;

  readonly getInstanceInfo: (instanceId: ProviderInstanceId) => Effect.Effect<
    {
      readonly instanceId: ProviderInstanceId;
      readonly driverKind: ProviderDriverKind;
      readonly displayName?: string | undefined;
      readonly accentColor?: string | undefined;
      readonly enabled: boolean;
    },
    ProviderUnsupportedError
  >;

  readonly listInstances: () => Effect.Effect<ReadonlyArray<ProviderInstanceId>>;

  /**
   * Resolve the adapter for a provider kind.
   *
   * @deprecated Prefer `getByInstance`.
   */
  readonly getByProvider: (
    provider: ProviderDriverKind,
  ) => Effect.Effect<ProviderAdapterShape<ProviderAdapterError>, ProviderUnsupportedError>;

  /**
   * List provider kinds currently registered.
   *
   * @deprecated Prefer `listInstances`.
   */
  readonly listProviders: () => Effect.Effect<ReadonlyArray<ProviderDriverKind>>;

  readonly streamChanges: Stream.Stream<void>;

  readonly subscribeChanges: Effect.Effect<PubSub.Subscription<void>, never, Scope.Scope>;
}

/**
 * ProviderAdapterRegistry - Service tag for provider adapter lookup.
 */
export class ProviderAdapterRegistry extends Context.Service<
  ProviderAdapterRegistry,
  ProviderAdapterRegistryShape
>()("multi/provider/ProviderAdapterRegistry.service") {}

// Dummy comment for workflow testing.
