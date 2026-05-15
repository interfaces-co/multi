/**
 * ProviderSessionReaper - Background cleanup for stale provider sessions.
 *
 * Stops persisted provider sessions that have been inactive for a bounded
 * period and are not currently running a turn.
 *
 * @module ProviderSessionReaper
 */
import { Context } from "effect";
import type { Effect, Scope } from "effect";

export interface ProviderSessionReaperShape {
  /**
   * Start the background reaper within the provided scope.
   */
  readonly start: () => Effect.Effect<void, never, Scope.Scope>;
}

export class ProviderSessionReaper extends Context.Service<
  ProviderSessionReaper,
  ProviderSessionReaperShape
>()("multi/provider/ProviderSessionReaper.service") {}
