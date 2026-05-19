# Multi Specs

This directory contains durable engineering specs for Multi.

Current entry points:

- [effect/guide.md](./effect/guide.md): service, runtime, schema, error, and
  verification rules for new work.
- [effect/todo.md](./effect/todo.md): priority tracks and current cleanup queue.
- [effect/errors.md](./effect/errors.md): typed error and user-facing rendering
  rules.
- [effect/schema.md](./effect/schema.md): schema ownership and migration rules.
- [effect/routes.md](./effect/routes.md): HTTP, WebSocket RPC, and TanStack route
  boundaries.
- [effect/react.md](./effect/react.md): no-direct-`useEffect` rules,
  replacement patterns, and migration inventory.
- [effect/react-effect-callsite-inventory.md](./effect/react-effect-callsite-inventory.md):
  read ledger and migration categories for existing React effects.
- [effect/app-simplification.md](./effect/app-simplification.md): app file
  ownership, deletion gates, CSS cleanup, and cleanup-wave criteria.
- [effect/app-root-files.md](./effect/app-root-files.md): root
  `packages/app/src/*.ts(x)` file classification and first cleanup candidates.
- [effect/app-state-files.md](./effect/app-state-files.md): app stores,
  thread sync/state, sidebar projections, and state helper cleanup rules.
- [effect/app-route-files.md](./effect/app-route-files.md): TanStack route
  files, route views, search helpers, and route cleanup rules.
- [effect/app-css-files.md](./effect/app-css-files.md): app CSS ownership,
  shell selector classification, and styling cleanup rules.
- [effect/server-shared-files.md](./effect/server-shared-files.md): server and
  shared package file ownership, duplication, and cleanup candidates.
- [effect/server-runtime.md](./effect/server-runtime.md): server Effect
  runtime, service contract, route error, defect, and facade cleanup rules.
- [effect/usability-testing.md](./effect/usability-testing.md): browser and
  integration coverage required before deleting UI helper files.

Inventories and execution ledgers live in [../docs](../docs). Specs describe
the target shape; ledgers track the current cleanup wave.
