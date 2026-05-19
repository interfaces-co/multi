# Cleanup TODO

Open work and tracks. Durable rules: [guide.md](./guide.md). Completed wave
history: [docs/multi-app-slimming-spec.md](../docs/multi-app-slimming-spec.md).

## Tracks

`ERR` typed failures · `RENDER` UI surfacing · `ROUTE` transport mapping ·
`SCHEMA` contract ownership · `MODEL` resolver · `COMPOSER` / `PLAN` · `REACT`
effects · `DELETE` dead code · `TEST` behavior coverage · `EFFECT` runtime ·
`CSS` styling ownership

## Open

- [ ] Convert four production `Effect.die` callsites to typed expected errors:
  `NodeSqliteClient.ts`, `ProviderService.ts`, `ProviderCommandReactor.ts`

## Optional follow-ups

- Timeline override pruning via reducer if timeline state grows further
- Diff panel word-wrap: open handler vs persisted panel state
- Route navigation effects until loaders have synchronous dependencies
- Promoted-draft finalization in a store if a second caller needs it

## Verification

- `pnpm run typecheck` after code changes
- Focused tests when editing test-owned behavior
- Browser tests when changing layout or interaction contracts
