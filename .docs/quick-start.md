# Quick start

```bash
# Development — Electron desktop (default)
pnpm dev

# Browser only — WebSocket server + Vite web app
pnpm dev:web

# Desktop on an isolated port set
MULTI_DEV_INSTANCE=feature-xyz pnpm dev

# Production
pnpm run build
pnpm run start

# Build a shareable macOS .dmg (arm64 by default)
pnpm run dist:desktop:dmg

# Or from any project directory after publishing:
npx usemulti
```
