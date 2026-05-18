# Model And Provider Spec

Model/provider selection should have a small core, then dumb renderers. Picker
components should not own fallback policy, provider availability policy, or
model ordering.

## Current Anchors

- [x] `packages/shared/src/model.ts`
- [x] `packages/app/src/model/chat-selection.ts`
- [x] `packages/app/src/model/ordering.ts`
- [x] `packages/app/src/model/provider-instances.ts`
- [x] `packages/app/src/model/provider-models.ts`
- [x] `packages/app/src/model/provider-state.ts`
- [x] `packages/app/src/model/selection.ts`
- [x] `packages/app/src/components/chat/picker/*`
- [x] `packages/app/src/components/chat/composer/use-model-state.ts`
- [x] `packages/app/src/components/settings/provider-*`

Inventory commands:

```bash
wc -l packages/app/src/model/*.ts packages/app/src/components/chat/picker/*.ts packages/app/src/components/chat/picker/*.tsx packages/app/src/components/settings/provider-*.ts packages/app/src/components/settings/provider-*.tsx packages/app/src/components/chat/composer/use-model-state.ts packages/app/src/components/settings/settings-panels.tsx packages/app/src/components/chat/view/inline-message-edit-composer.tsx
rg -n "from \"(\\.\\./|.*)model/|from \".*provider-state|from \".*provider-models|from \".*provider-instances|from \".*selection|from \".*chat-selection|from \".*ordering" packages/app/src --glob '!*.test.*' --glob '!*.browser.*'
rg -n "resolveSelectableModel|normalizeModelSlug|defaultInstanceIdForDriver|DEFAULT_MODEL|getDefaultServerModel|resolveSelectableProvider|sortModelsForProviderInstance|sortProviderModelItems|modelOptionsByInstance|providerStatuses|serverProviders" packages/app/src/components packages/app/src/routes packages/app/src/app --glob '!*.test.*' --glob '!*.browser.*'
```

## Current Inventory

- [x] `packages/app/src/model/provider-instances.ts` owns provider-instance
      display normalization, enabled-state overlay from settings, and instance
      ordering. Keep this as the instance entry source until the resolver core
      absorbs it.
- [x] `packages/app/src/model/selection.ts` owns custom model normalization,
      hidden/model-order preferences, text-generation selection fallback, and
      per-instance model option lists. It is the current normalized resolver core.
- [x] `packages/app/src/model/chat-selection.ts` owns composer/chat selection
      priority across draft, active thread session, thread model selection,
      settings default, and project default.
- [x] `packages/app/src/model/provider-state.ts` owns provider option
      descriptor normalization for dispatch, including prompt-injected effort
      detection.
- [x] `packages/app/src/model/ordering.ts` is currently the single ordering
      primitive used by picker, settings, and selection.
- [x] `packages/app/src/components/chat/picker/model-content.tsx` still owns
      picker flattening, ready-provider filtering, favorites grouping, search
      ranking application, and selected row key handling.
- [x] `packages/app/src/components/settings/provider-models-section.tsx` still
      owns custom model validation messages and settings row ordering controls.
- [x] `packages/app/src/components/settings/settings-panels.tsx` still owns
      provider-instance row assembly and text-generation model settings writes.
- [x] `packages/app/src/components/chat/view/chat-view.tsx` still contains a
      provider-status lookup by driver for the status banner and direct
      instance/model selection writes.

## Current Contract Facts

- [x] Provider option selections are keyed by `ProviderInstanceId`, not by
      `ProviderDriverKind`. Default instances happen to use the same slug as their
      driver, but custom instances do not.
- [x] `stores/chat-drafts.ts` still persists the legacy field name
      `modelSelectionByProvider`; its keys are `ProviderInstanceId`. Do not rename
      that persisted key without an explicit migration.
- [x] Picker model lists are keyed by `ProviderInstanceId` and model slug.
- [x] Settings favorites are keyed by `ProviderInstanceId` and model slug.
- [x] The normalized resolver return type has a discriminated
      availability result.
- [ ] UI messages for missing provider, missing model, disabled provider, empty
      catalog, and loading are not yet centralized.

## Target Core

The model core returns facts and discriminated outcomes.

- [x] `packages/shared/src/model.ts` owns runtime-neutral primitives such as
      model selection creation, option descriptor normalization, slug
      normalization, and prompt-effort prefix application.
- [ ] Provider instances are normalized once from server config/provider status.
- [ ] Model options are normalized once per provider instance.
- [x] Active selection resolves to one discriminated result:
  - [x] `ready`
  - [x] `missing-provider`
  - [x] `missing-model`
  - [x] `disabled-provider`
  - [x] `empty-catalog`
  - [x] `loading`
- [ ] Fallback selection is owned by the model core, not picker components.
- [ ] Ordering is owned by the model core, not duplicated in settings, picker,
      composer, and command palette.
- [ ] Provider traits/options are rendered from normalized descriptors; UI
      components do not inspect provider-specific option IDs except for display
      affordances explicitly declared by the descriptor.
- [ ] App fallback, availability, ordering, and missing-state policy do not move
      into `@multi/shared/model`; they stay in the app model resolver.

## Component Responsibilities

Picker components may:

- [ ] Render sections, search results, rows, empty states, and disabled states.
- [ ] Call `onSelectionChange` with a normalized model selection.
- [ ] Render provider skills in the slash menu.
- [ ] Render provider/model details supplied by the core.

Picker components may not:

- [ ] Decide fallback provider/model policy.
- [ ] Know route-level defaults.
- [ ] Patch missing models with hardcoded IDs.
- [ ] Re-sort provider catalogs differently per surface.
- [ ] Read server config directly when a normalized model state is already
      available from the core.

## Deletion Candidates

Classify before deleting:

- [ ] `packages/app/src/model/ordering.ts` - keep only if it is the single
      ordering source.
- [ ] `packages/app/src/model/selection.ts` - keep only if it is the single
      provider/model resolver source.
- [ ] `packages/app/src/model/chat-selection.ts` - keep only if chat-specific
      handoff policy cannot live in the generic resolver.
- [ ] `packages/app/src/components/chat/picker/model-picker-model-highlights.ts`
  - keep only if highlight behavior is reused and tested as picker behavior.
- [ ] `packages/app/src/components/chat/picker/model-search.ts` - keep only if
      search ranking is a real reusable behavior, not component avoidance.
- [ ] `packages/app/src/components/command-palette-model.ts` - collapse if it is
      just another rendering of normalized model core output.

## Done Means

- [ ] One public model resolver owns availability, fallback, ordering, and
      current selection.
- [ ] Picker/settings/command palette tests assert behavior through UI or the
      resolver contract, not duplicate helper internals.
- [ ] No root-level `model-ordering.ts`, `model-selection.ts`, or equivalent
      files exist outside `packages/app/src/model`.
- [ ] Missing/disabled provider states render consistent user-facing messages in
      composer, picker, and settings.
- [ ] `pnpm run typecheck` passes.

## First Work Items

- [x] Key provider option selections by `ProviderInstanceId` in chat selection,
      composer traits, and plan implementation handoff.
- [x] Add a resolver contract section to `provider-state.ts` or a replacement
      one-file model core.
- [x] Route chat/composer selection through the normalized resolver contract
      instead of rebuilding option-map and fallback policy locally.
- [x] Route settings text-generation selection through the normalized resolver
      contract and delete unused exported resolver wrappers.
- [x] Remove unused exports from provider/model helper files after caller
      inventory.
- [ ] Update picker tests to cover discriminated missing/disabled states.
- [ ] Remove UI fallback branches after the resolver owns them.
- [ ] Collapse command-palette model helpers into either the command palette
      file or the model core.
- [ ] Add one browser test that changes viewport and verifies model selector
      placement does not overflow the composer.
