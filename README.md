# Multi

Minimal web UI for coding agents (Codex and Claude today; more providers later).

Install desktop builds from [GitHub Releases](https://github.com/interfaces-co/Multi/releases). Stable shipping is automated: push a semver tag matching `v*.*.*` (for example `v0.0.1`) and the [Release workflow](https://github.com/interfaces-co/Multi/actions/workflows/release.yml) builds artifacts, publishes the `usemulti` CLI to npm, and opens a GitHub release.

## Install

Authenticate at least one backend before running:

- **Codex:** [Codex CLI](https://github.com/openai/codex), then `codex login`
- **Claude:** Claude Code, then `claude auth login`

```bash
npx usemulti
```

### Desktop

**Windows** (`winget`): `winget install InterfacesCo.Multi`  
**macOS** (Homebrew): `brew install --cask multi`  
**Arch** (AUR): `yay -S multi-bin`

## Develop

See [CONTRIBUTING.md](./CONTRIBUTING.md). Observability: [docs/observability.md](./docs/observability.md). Support: [Discord](https://discord.gg/jn4EGJjrvv).

```bash
mise install   # optional
bun install .
```
