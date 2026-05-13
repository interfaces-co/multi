# App Stores

Stores in this directory own client-side UI state. Keep domain/runtime state near the domain module when moving it would obscure ownership.

## Guidelines

- Use small, focused stores instead of one global app store.
- Put persisted UI state here when React components need selectors/actions.
- Keep boot-critical DOM/localStorage runtimes separate from React stores. For example, `appearance-store.ts` wraps `lib/appearance-settings.ts`, but the runtime still applies root CSS variables before React renders.
- Use `lib/storage.ts` helpers for Zustand `persist` storage adapters and debounced writes.
- Document migration/version behavior in the store that owns persisted data.

## Current Stores

- `appearance-store.ts`: React-facing appearance settings snapshot/actions backed by the boot-safe appearance runtime.
- `shell-panels-store.ts`: persisted shell panel widths, active tab, secondary rails, and terminal sessions.
- `shell-layout-store.ts`: ephemeral shell layout invalidation and mute bookkeeping.
- `thread-unread-store.ts`: ephemeral unread thread markers.
- `thread-selection-store.ts`: ephemeral bulk thread selection state.
- `ui-state-store.ts`: persisted project/thread UI state.
- `ui/command-palette-store.ts`: ephemeral command palette open state and open intent.
- `ui/model-picker-open-state.ts`: ephemeral model picker open state.
