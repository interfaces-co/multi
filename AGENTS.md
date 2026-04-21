# Development rules

Concise, technical prose. No emojis in commits, issues, PRs, or code comments unless explicitly requested.

## Verification

After **code** changes, from repo root:

- `pnpm run fmt:check`
- `pnpm run lint`
- `pnpm run typecheck`

There is **no** automated unit test suite in this repo; do not add a `test` step unless the maintainers ask for it.

## TypeScript & modules

- Avoid `any`. Prefer reading real types from dependencies over guessing.
- Top-level imports only for implementation and types (no inline / dynamic `import()` for normal code paths).
- Rely on inference; avoid explicit annotations or interfaces unless they clarify a **public** API or fix inference gaps.
- If a type error comes from a stale dependency, **upgrade the dependency** instead of weakening code.

## Style guide

### General principles

- Keep logic in one function unless it is clearly composable or reused.
- Avoid `try` / `catch` unless you are translating failures at a boundary (I/O, JSON parse with a real recovery path).
- Avoid `any`.
- Use **Node** built-ins where appropriate (`node:fs` / `node:fs/promises`, `node:path`, `node:child_process`, etc.)
- Prefer functional array methods (`flatMap`, `filter`, `map`) over `for` loops when readability wins; use type guards on `filter` so types narrow downstream.
- Reduce locals by inlining when a value is used only once.

```ts
// Good (Node)
import { readFile } from "node:fs/promises";

const journal = JSON.parse(await readFile(path.join(dir, "journal.json"), "utf8"));

// Bad
import { readFile } from "node:fs/promises";

const journalPath = path.join(dir, "journal.json");
const journal = JSON.parse(await readFile(journalPath, "utf8"));
```

If you introduce **shared config modules** under something like `src/config` in a package, follow a small **self-export / barrel** pattern at the package entry (for example `export * as ConfigAgent from "./agent"`) consistent with existing files in that package.

### Destructuring

Avoid unnecessary destructuring; dot notation keeps the source of truth obvious.

```ts
// Good
obj.a;
obj.b;

// Bad
const { a, b } = obj;
```

### Variables

Prefer `const`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2;

// Bad
let foo;
if (condition) foo = 1;
else foo = 2;
```

### Control flow

Avoid `else` after `return`. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1;
  return 2;
}

// Bad
function foo() {
  if (condition) return 1;
  else return 2;
}
```

## Tooling

- **pnpm** workspaces; versions for the shared toolchain live in `pnpm-workspace.yaml` → `catalog` (e.g. `typescript`, `@typescript/native-preview`, `vite`, `turbo`, `electron`, `react`). Depend on them with `"catalog:"` in `package.json`.
- **Format / lint**: oxfmt, oxlint.
- **Typecheck**: `tsgo` from `@typescript/native-preview` (`tsgo --noEmit`) in packages that typecheck.
- **Dev**: `pnpm dev` → Electron desktop (Turbo `apps/desktop` dev: bundled server + Vite + Electron). `pnpm dev:web` → browser workflow (server + web only). `pnpm dev:server` → backend only. `scripts/dev-runner.ts` sets ports / `VITE_WS_URL` (path `/ws`).

## Packages

### `apps/server` (`usemulti` on npm)

Node HTTP static + WebSocket (`/ws`). Spawns `codex app-server` (stdio JSON-RPC), `experimentalRawEvents: true`, pushes `codex.raw` lines and minimal `server.status`.

Entry points: `src/bin.ts`, `src/run-server.ts`, `src/codex-raw-pipe.ts`.

### `apps/web`

Vite + React 19 + Tailwind 4. Single screen: WebSocket status + append-only raw log. `src/App.tsx`, `src/main.tsx`.

### `apps/desktop`

Electron shell, preload/main bundles via tsdown. Loads bundled server + static web assets in production.

### `packages/contracts`

Zod + types for WS protocol and desktop IPC. Contract-only; no heavy runtime.

### `packages/shared`

Small utilities with **explicit subpath exports** (no root barrel): `listen`, `logging`, `shell`, `server-settings`, `cli-args`, `Struct`.

### `scripts`

Repo automation (`dev-runner.ts`, `build-desktop-artifact.ts`, release helpers). Plain Node; no Effect.

## Codex app-server

Multi is Codex-first. Reference: [Codex app-server](https://developers.openai.com/codex/sdk/#app-server). Implementation inspiration: [openai/codex](https://github.com/openai/codex), [CodexMonitor](https://github.com/Dimillian/CodexMonitor).