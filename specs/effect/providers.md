# Provider Foundations

This spec defines the provider surface Multi supports in this unreleased line.
Provider support is canonical only when contracts, server registries, adapters,
runtime discovery, settings, and picker UI all agree on the same driver list.
ACP support is intentionally narrow: Cursor is the ACP-first provider in this
foundation.

## Canonical Providers

- [x] Codex/OpenAI: supported through the Codex app-server provider and adapter.
- [x] Claude: supported through the Claude provider and adapter.
- [x] OpenCode: supported through the OpenCode server/SDK provider and adapter.
- [~] Cursor: supported through Cursor Agent ACP over stdio.
- [ ] Pi: visible only as an unsupported pending provider. It must not route
      sessions until a real provider contract and adapter exist.

No other hosted provider, ACP registry provider, or placeholder provider should
appear in settings, picker rails, or built-in server registries.

## Model Catalog Ownership

- [x] `packages/contracts/src/model.ts` defines provider option and capability
      schema only. It must not hardcode provider model catalogs, provider model
      aliases, or per-provider model defaults.
- [x] Live provider model lists come from provider snapshots, ACP discovery, or
      provider-owned settings. Cursor model additions such as Composer 2.5 must
      be accepted through discovery without editing contract constants.
- [x] Model input normalization trims user input and resolves exact slug/display
      matches from the live selectable catalog. Provider-specific shorthand
      aliases are not canonical unless the provider reports them.

## Driver Keys

- [x] `codex`
- [x] `claudeAgent`
- [x] `opencode`
- [~] `cursor`
- [ ] `pi` as pending only

Driver keys are persisted identifiers. UI labels may say `Claude` or `Pi`, but
server routing uses the exact driver key above.

## Cursor ACP Contract

- [x] Binary: Cursor Agent CLI, default command `agent acp`.
- [x] Transport: ACP JSON-RPC over stdio.
- [x] Auth method: `cursor_login`.
- [x] Client capability: parameterized model picker metadata must be sent during
      initialize so Cursor can expose model/config options.
- [x] Sessions: mode/config state comes from ACP setup responses and updates.
- [x] Model switching: set the base model through ACP and apply model option
      config updates.
- [x] Extension events: Cursor plan/todo/question extension messages are mapped
      into Multi plan and pending-user-input events.

## Done Means

- [ ] `packages/contracts` exposes model capability schema without
      provider-specific model defaults.
- [ ] Built-in server registries include only Codex/OpenAI, Claude, OpenCode,
      and Cursor.
- [ ] Renderer provider settings and model picker include only supported
      providers plus Pi pending.
- [ ] Typecheck passes after the provider rewrite.
