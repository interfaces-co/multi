# Scripts

- `pnpm run dev` — Electron desktop dev (Turbo: backend build + Vite + Electron).
- `pnpm run dev:server` — WebSocket server only (`usemulti`).
- `pnpm run dev:web` — Browser workflow: server + Vite web app together.
- Dev commands use `scripts/dev-runner.ts` for port selection and `VITE_WS_URL` (includes `/ws`).
- Override behavior with env vars (for example `MULTI_PORT`, `MULTI_DEV_INSTANCE`, `VITE_DEV_SERVER_URL`).
- `pnpm run start` — Production server (static web + API as configured).
- `pnpm run build` — Turbo build across workspaces.
- `pnpm run typecheck` — `tsgo` / strict checks per package.
- `pnpm run dist:desktop:artifact -- --platform <mac|linux|win> --target <target> --arch <arch>` — Desktop artifact for a platform.
- `pnpm run dist:desktop:dmg` — macOS `.dmg` into `./release`.
- `pnpm run dist:desktop:dmg:x64` — Intel macOS `.dmg`.
- `pnpm run dist:desktop:linux` — Linux AppImage into `./release`.
- `pnpm run dist:desktop:win` — Windows NSIS into `./release`.

## Desktop `.dmg` packaging notes

- Default build is unsigned/not notarized for local sharing.
- The DMG build uses `assets/macos-icon-1024.png` as the production app icon source.
- Desktop production windows load the bundled UI from the packaged static assets (not a remote dev URL).
- Desktop packaging includes `apps/server/dist` and starts the backend on loopback.
- Your tester can still open it on macOS by right-clicking the app and choosing **Open** on first launch.
- To keep staging files for debugging package contents, run: `pnpm run dist:desktop:dmg -- --keep-stage`
- To allow code-signing/notarization when configured in CI/secrets, add: `--signed`.
- Windows `--signed` uses Azure Trusted Signing and expects:
  `AZURE_TRUSTED_SIGNING_ENDPOINT`, `AZURE_TRUSTED_SIGNING_ACCOUNT_NAME`,
  `AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME`, and `AZURE_TRUSTED_SIGNING_PUBLISHER_NAME`.
- Azure authentication env vars are also required (for example service principal with secret):
  `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.

## Running multiple dev instances

Set `MULTI_DEV_INSTANCE` to any value to deterministically shift dev ports together.

- Example: `MULTI_DEV_INSTANCE=branch-a pnpm dev`

If you want full control instead of hashing, set `MULTI_PORT_OFFSET` to a numeric offset.
