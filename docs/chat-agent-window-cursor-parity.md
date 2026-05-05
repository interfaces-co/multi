# Chat agent window vs Cursor parity

This note records findings from comparing Multi’s chat column to Cursor’s agent window: shell alignment ([multi-shell-chosen-alignment-path.md](./multi-shell-chosen-alignment-path.md)), inset/layout drift, composer chrome, and structured activity (thoughts, tasks, subagents).

## Shell alignment doc scope

[multi-shell-chosen-alignment-path.md](./multi-shell-chosen-alignment-path.md) defines a **shell-level** contract: `.agent-window` container queries, `--multi-shell-*` widths, titlebar and workbench x-axis alignment, secondary rail collapse order, and avoidance of viewport measurement hooks for that layer.

It does **not** define:

- Chat thread padding or `--composer-max-width` consumption in the timeline vs footer
- Composer visual parity with Cursor’s binary
- Reasoning blocks, task tools, or subagent lists

Issues in the conversation column are therefore mostly **orthogonal** to that doc unless the whole center column width is wrong from shell geometry.

## Human message bubble (binary-derived)

From `workbench.desktop.main.css` in Cursor **3.3.4**, the agent thread applies:

```css
.agent-panel-meta-agent-chat__row--human .ui-meta-agent-human-message__bubble {
  backdrop-filter: blur(10px);
  background: var(--glass-chat-bubble-background, var(--cursor-bg-elevated));
  border-color: var(--cursor-stroke-tertiary);
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
```

Plus a separate width rule: `min(85%, var(--ui-imsg-tight-bubble-width, …))`. Multi implements the same geometry with Tailwind utilities wired to theme tokens (for example `bg-multi-bubble`, `border-multi-stroke-tertiary`, `rounded-xl`, `max-w-[85%]`, `shadow-sm`, `backdrop-blur-[10px]`), not Cursor’s class names.

For a **sticky** latest human prompt (composer flow), the same bundle defines `.composer-sticky-human-message` with opaque pane background, `padding-top: 10px`, `position: sticky`, `top: 0`, `z-index: 100`. Multi’s pinned-latest-user strip intentionally avoids a full-width band behind the scroll rail: it uses only `pt-2.5` (`10px`) and the same centered content box as the list; the human bubble’s own fill handles readability. The agent meta-agent scroll surface itself (`.agent-panel-meta-agent-chat`) uses vertical padding `var(--cursor-spacing-3)` top and `var(--cursor-spacing-6)` bottom only—horizontal inset lives on `.agent-panel-meta-agent-chat__content` as `padding-left/right: var(--cursor-spacing-4)`.

## Chat column layout drift

### Message list vs composer horizontal inset

The scrollable timeline centers content with **`--composer-max-width`** and **`--composer-messages-padding-inline`** (default **16px**) via `CHAT_TIMELINE_CONTENT_STYLE` in `packages/app/src/components/chat/messages-timeline.tsx`. The same inline padding is applied to `[data-composer-messages]` in `packages/app/src/styles/shell.css` so the scroll region matches the composer column rail.

The docked composer sits in `agent-panel-followup-input` in `packages/app/src/components/chat-view.tsx`, which applies **`px-3` / `sm:px-5`** (12px / 20px), not `spacing-4`. The prompt root (`agent-prompt-input-root`) already uses `max-width: var(--composer-max-width)` and `margin-inline: auto` in `shell.css`, but the **outer** footer padding does not match the timeline’s inner padding.

**Effect:** Composer edges and message text rails can disagree across breakpoints—the bottom of the thread looks misaligned even when both regions use the same max width.

### “Refining …” / working row vs assistant bubbles

The working indicator (`ThinkingIndicator` in `thinking-indicator.tsx`, `WorkingStatusRow`, timeline row kind `working`) is **not** inside `CursorMessageBubble`. It uses **`inline-flex`** and minimal horizontal padding, while assistant copy uses tokenized bubble padding in `shell.css` (`.ui-meta-agent-assistant-message__bubble`).

**Effect:** Streaming status lines do not optically line up with assistant markdown the way a full bubble row would.

### Shell CSS contract tests

`app-shell-css-contract.test.ts` validates workbench/shell variables and breakpoints, not chat timeline vs composer insets. Any “contract” for message/composer rail alignment would be a separate assertion or shared CSS variable if we want it enforced.

## Cursor binary inspection

Reference binary inspected: `/Applications/Cursor.app`, Cursor **3.3.4**, commit `e7262be617643fb2bd412dfdcca2ed82b21d0fa0`, build date `2026-05-03T00:48:29.057Z`. Relevant assets are in:

- `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css`
- `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`

Cursor sets `--composer-max-width` on `.monaco-workbench` from a configuration-backed helper (`Hvw` / `Jvw` in the minified bundle), and the meta-agent thread also injects `--composer-max-width` plus `--meta-agent-overlay-height` on its shell. That means the max width is a shell/thread contract, not only a composer-local token.

### Chat content and footer padding

Cursor’s `.agent-panel-meta-agent-chat__content` matches the pattern Multi copied: `max-width: var(--composer-max-width,840px)`, centered with `margin: 0 auto`, full width, and `padding-left/right: var(--cursor-spacing-4)` (Cursor’s token name in their bundle). Multi’s timeline and `[data-composer-messages]` use **`--composer-messages-padding-inline`** for the same 16px default without relying on `--cursor-*` aliases in our theme. Cursor’s `.agent-panel-followup-input` itself only has bottom padding and `position: relative`; it does **not** add a separate `px-3` / `sm:px-5` horizontal wrapper around the docked composer.

This makes Multi’s current `chat-view.tsx` footer padding a real parity drift, not just a visual preference. Multi wraps docked `ChatComposer` with `px-3 sm:px-5`, while the timeline uses the shared inline padding token above. Cursor relies on the prompt root/max-width layer and the shared 16px thread padding instead of a breakpoint-specific footer inset.

### Composer chrome vs Cursor binary

Cursor’s current agent composer uses:

- `.agent-panel-followup-input .ui-prompt-input` with `--prompt-input-section-gap: 8px`
- prompt input container tokens for `--prompt-input-container-bg`, `--prompt-input-container-border`, and hover border
- `.agent-panel-followup-input .ui-prompt-input__container { backdrop-filter: none }`
- focus border changes through `.ui-prompt-input__container:focus-within`

Multi’s docked input is intentionally defined in this repo: `.chat-composer-shell`, `--prompt-input-*` tokens, expanded vs compact variants, shadows and hover in `shell.css`. Exact chrome differences remain expected unless we choose to mirror Cursor’s prompt input DOM/classes more closely.

### Focused composer delta: Cursor 3.3.4 vs Multi current code

Binary evidence:

- Cursor prompt-input base styles are embedded in `workbench.desktop.main.js` around the `ui-prompt-input` style module, not only `workbench.desktop.main.css`.
- Cursor agent follow-up overrides are in `workbench.desktop.main.css` under `.agent-panel .agent-panel-followup-input`.
- Cursor stable `3.3.4` and Nightly `3.2.0-pre.48.patch.0` do **not** contain the literal placeholder string `Ask anything`; current Multi owns that string in `chat-composer.tsx`.

Concrete style differences:

| Surface                      | Cursor binary                                                                                                                                                                        | Multi current code                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base expanded radius         | `--prompt-input-border-radius-expanded: 12px`                                                                                                                                        | `8px` in `tokens.css`                                                                                                                              |
| Editor padding               | `8px 12px`                                                                                                                                                                           | `10px 12px 6px` in `tokens.css`, plus wrapper `px-3 pb-2 sm:px-4` / `pt-*` in `chat-composer.tsx`                                                  |
| Placeholder                  | ProseMirror pseudo-element: `content: attr(data-placeholder)`, `var(--cursor-text-quaternary)`, nowrap ellipsis                                                                      | Separate absolutely positioned `.composer-prompt-placeholder` div, `var(--multi-fg-tertiary)`, same text visible outside ProseMirror               |
| Follow-up overlay            | Absolute bottom overlay with full-viewport `:before` chrome mask and `:after` gradient                                                                                               | Relative overlay, no full-viewport mask/gradient                                                                                                   |
| Compact toolbar              | Cursor base compact toolbar participates through prompt-input selectors and has compact-specific display rules; model picker has explicit `glass-model-picker-wrapper` order/margins | Multi keeps `ui-prompt-input-toolbar`, left, and right as real flex wrappers with additional Tailwind classes                                      |
| Root/container styling split | Cursor styles `.ui-prompt-input` as root and `.ui-prompt-input__container` as the actual bordered surface                                                                            | Multi maps `chat-composer-shell` onto `.ui-prompt-input__container` and layers most visual rules there                                             |
| Disabled follow-up           | Cursor disables pointer events on `.ui-prompt-input` and all descendants, and applies opacity to status area/editor/toolbar                                                          | Multi disables `.ui-prompt-input`; opacity only targets editor input and toolbar descendants                                                       |
| Dock inset                   | Cursor follow-up wrapper has bottom padding only; chat content has `padding-left/right: var(--cursor-spacing-4)`                                                                     | Multi timeline uses `--composer-messages-padding-inline: 16px`; `chat-view.tsx` adds top/bottom classes and no longer adds horizontal padding here |

Important non-differences:

- Both systems use the same high-level DOM concept: `.ui-prompt-input` root, `.ui-prompt-input__header`, `.ui-prompt-input__container`, `.ui-prompt-input-editor`, `.ui-prompt-input-toolbar`, and compact/expanded `data-variant` / `data-expanded` states.
- Both use `13px` prompt text with `line-height: 1.5`.
- Both use compact prompt padding `8px 10px`, compact radius `9999px`, and compact-expanded radius `16px`.
- Both use `--composer-max-width: 840px` and centered prompt/message rails.

Most likely cause of the “way differently styled” report:

Multi copied the component vocabulary but not the exact binary style ownership. Cursor’s visual contract is mostly in generic prompt-input rules plus a small agent follow-up override. Multi replaces that with a bespoke `.chat-composer-shell` layer, a separate placeholder overlay, extra editor wrapper padding, a smaller expanded radius, and no full-viewport follow-up overlay mask. Those differences are enough for the docked composer to read as a different product even though the class names look similar.

## Cursor agent window presentation (reference UX)

In Cursor’s agent UI, a turn often includes a **structured activity block**, for example:

- A muted meta line such as **“Thought for Ns”**
- A short **summary** of intent
- **Action lines** (e.g. read file with path/range)
- A **nested task list** for parallel work (model badge, per-row status like completed vs in progress)

That is **information architecture and data wiring**, not only alignment.

Binary detail: Cursor has two related but distinct surfaces:

- `taskToolCall` renders through a dedicated `ui-task-tool-call` disclosure. Its header includes a status icon, title, subtitle, optional chevron, and an expandable body for error/turn details. Its display resolver labels this case as action `Task` and details from `args.description || "subagent"`.
- live parent/subagent progress renders through `.agent-panel-meta-agent-chat__status-row` plus `.agent-panel-meta-agent-chat__nested-subagents`. Each nested row uses `.agent-panel-meta-agent-chat__nested-subagent`, an `ui-agent-row-wrap` child, and an optional `Open` pill for opening the subagent in the Agents tray.

The Cursor bundle does not contain the literal string `collab_agent_tool_call`; it appears to normalize provider/protocol data before UI rendering into `taskToolCall` and status-row models. For Multi, `collab_agent_tool_call` is the local canonical item type that should feed the same UI concept.

## Gaps in Multi’s implementation

### `collab_agent_tool_call` activities are dropped

`deriveWorkLogEntries` in `packages/app/src/session-logic.ts` filters out orchestration activities whose payload has `itemType === "collab_agent_tool_call"`. Those entries never become `WorkLogEntry` rows in the timeline, so Cursor-style parent **task** shells and nested **subagent** rows have no derived representation for the UI to render.

This is confirmed against the current code: `ToolCallMessage.resolveToolCase` already maps `WorkLogEntry.itemType === "collab_agent_tool_call"` to `taskToolCall`, but that branch is unreachable for those activities because `deriveWorkLogEntries` removes them first.

### `taskToolCall` nested UI is stale and unused

`ToolCallRenderer` in `tool-call-renderer.tsx` includes a **`taskToolCall`** branch with a card and optional **`subagentConversation`** / **`renderStep`**. `ToolCallMessage` never passes `subagentConversation` or `renderStep`, so nested subagent content cannot appear even when the tool case is selected.

The branch also no longer matches Cursor 3.3.4’s binary. Cursor renders a `ui-task-tool-call` disclosure rather than Multi’s current `ui-meta-agent-card` header/body. If we want binary parity, updating this renderer is part of the work, not only wiring data into the existing branch.

### Status-row subagent surface is missing

Cursor’s live subagent progress is not only a nested body inside `taskToolCall`. The binary has a separate status row model with:

- running/completed/interrupted classes (`agent-panel-meta-agent-chat__status-row--running`, `--completed`, `--interrupted`)
- a `status-cluster` containing the working row, task label, screen-reader completed label, and status icon
- nested subagents rendered under `agent-panel-meta-agent-chat__nested-subagents`
- per-subagent open affordance through `agent-panel-meta-agent-chat__subagent-open-pill`

Multi has `WorkLogEntry.subagents` and `WorkLogSubagentAction` types but no UI equivalent of this status-row/nested-subagents surface.

### Thought surface differs

Multi uses `ThinkingIndicator` / `WorkingStatusRow` and `CursorThinkingStatus` for some thinking-toned work entries. It does not currently mirror Cursor’s dedicated **thought duration line + summary + sub-task list** pattern as a single cohesive block unless that maps from provider payloads and new UI.

The inspected Cursor binary did not contain the literal string `Thought for`, so that label may come from runtime data, localization, or a different release/channel. The stable 3.3.4 evidence we can rely on is the status-row/task/subagent structure above.

### `WorkLogEntry` subagent fields unused

Types `WorkLogEntry.subagents` and `WorkLogSubagentAction` exist in `session-logic.ts`, but derivation does not populate them, so no checklist UI can consume them yet.

## Full implementation plan

The implementation should make Multi's composer use the same ownership model as Cursor:

- stable semantic selectors identify the prompt parts (`ui-prompt-input`, `ui-prompt-input__container`, `ui-prompt-input-editor`, toolbar, header);
- component layout stays in JSX/Tailwind where it is a local flex/grid concern;
- reusable visual values live in `--multi-*` tokens and are consumed through `--prompt-input-*` aliases;
- no decorative kebab-case `className` utility buckets are added only to group Tailwind.

### 1. Tokenize the Cursor-derived values with Multi names

Update `packages/app/src/styles/tokens.css`. Keep Cursor names out of Multi tokens; use Multi-owned names and alias the prompt-input variables to them.

```css
:root {
  --multi-composer-max-width: 840px;
  --multi-composer-column-padding-inline: 16px;
  --multi-composer-section-gap: 8px;
  --multi-composer-surface-bg: var(--glass-chat-bubble-background, var(--multi-color-bubble));
  --multi-composer-surface-border: var(--multi-stroke-tertiary);
  --multi-composer-surface-border-hover: var(--multi-stroke-secondary);
  --multi-composer-radius-expanded: 12px;
  --multi-composer-radius-compact: 9999px;
  --multi-composer-radius-compact-expanded: 16px;
  --multi-composer-editor-padding: 8px 12px;
  --multi-composer-toolbar-padding: 8px 10px;
  --multi-composer-editor-min-height: 36px;
  --multi-composer-editor-max-height: 200px;
  --multi-composer-placeholder-fg: var(--multi-fg-quaternary);
  --multi-composer-surface-shadow: 0 1px 2px 0 oklch(0 0 0 / 0.05);

  --composer-max-width: var(--multi-composer-max-width);
  --composer-messages-padding-inline: var(--multi-composer-column-padding-inline);
  --prompt-input-section-gap: var(--multi-composer-section-gap);
  --prompt-input-container-bg: var(--multi-composer-surface-bg);
  --prompt-input-container-border: var(--multi-composer-surface-border);
  --prompt-input-container-border-hover: var(--multi-composer-surface-border-hover);
  --prompt-input-border-radius-expanded: var(--multi-composer-radius-expanded);
  --prompt-input-border-radius-compact: var(--multi-composer-radius-compact);
  --prompt-input-border-radius-compact-expanded: var(--multi-composer-radius-compact-expanded);
  --prompt-input-editor-padding: var(--multi-composer-editor-padding);
  --prompt-input-toolbar-padding: var(--multi-composer-toolbar-padding);
  --prompt-input-editor-min-height: var(--multi-composer-editor-min-height);
  --prompt-input-editor-max-height: var(--multi-composer-editor-max-height);
}
```

Do not introduce `--cursor-*` variables in app code. Cursor values are research inputs; Multi tokens are the implementation API.

### 2. Keep semantic classes, remove styling-only aliases

Allowed semantic class names:

- `ui-prompt-input`
- `ui-prompt-input__header`
- `ui-prompt-input__container`
- `ui-prompt-input-editor`
- `ui-prompt-input-toolbar`
- `ui-prompt-input-toolbar__left`
- `ui-prompt-input-toolbar__right`
- `agent-panel-followup-input`
- `agent-prompt-input-root`

Allowed Multi-specific semantic selectors:

- `chat-composer-surface` only if it remains a real DOM boundary needed because `PromptInputRoot` owns `.ui-prompt-input__container`.
- `composer-prompt-placeholder` only if the placeholder remains a separate element.

Do **not** add class names like `AGENT_COMPOSER_CLASSNAME`, `composer-shell-frame`, `composer-footer-row`, or other kebab-case labels that only collect Tailwind utilities. Put Tailwind directly on the element, or use `cva` if a component has real variants.

Correct JSX pattern:

```tsx
<PromptInputRoot
  className="agent-prompt-input-root w-full min-w-0"
  containerClassName={cn(
    "chat-composer-surface transition-[border-color,background-color] duration-150",
    composerMenuOpen && "overflow-visible!",
  )}
  variant={composerVariant}
>
  <div className="ui-prompt-input-editor relative min-w-0">
    <ComposerPromptEditor ... />
  </div>
  <PromptInputToolbar className="min-w-0 flex-nowrap overflow-visible">
    ...
  </PromptInputToolbar>
</PromptInputRoot>
```

Incorrect pattern:

```tsx
const COMPOSER_ROW_CLASSNAME = "flex items-center gap-2 px-3";

<div className="composer-row">...</div>;
```

The first constant is banned by the project rule. The second selector is decorative unless CSS or tests depend on it.

### 3. Move visual chrome back to prompt-input selectors

Update `packages/app/src/styles/shell.css` so the generic prompt selectors own the visual surface. `.chat-composer-surface` should not duplicate border/background/radius if `.ui-prompt-input__container` can own it.

Target shape:

```css
.agent-window .agent-prompt-input-root {
  box-sizing: border-box;
  margin-inline: auto;
  max-width: var(--composer-max-width);
  min-width: 0;
  width: 100%;
}

.agent-window .ui-prompt-input {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--prompt-input-section-gap);
  min-width: 100%;
  width: 100%;
}

.agent-window .ui-prompt-input__container {
  background: var(--prompt-input-container-bg);
  border: 1px solid var(--prompt-input-container-border);
  box-shadow: var(--multi-composer-surface-shadow);
  box-sizing: border-box;
  cursor: text;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.agent-window .ui-prompt-input__container:hover,
.agent-window .ui-prompt-input__container:focus-within {
  border-color: var(--prompt-input-container-border-hover);
}

.agent-window .ui-prompt-input__container[data-variant="expanded"] {
  border-radius: var(--prompt-input-border-radius-expanded);
}

.agent-window .ui-prompt-input__container[data-variant="compact"] {
  align-items: center;
  border-radius: var(--prompt-input-border-radius-compact);
  display: flex;
  gap: 4px;
  overflow: visible;
  padding: 8px 10px;
  z-index: 4;
}

.agent-window .ui-prompt-input__container[data-variant="compact"][data-expanded] {
  border-radius: var(--prompt-input-border-radius-expanded);
  display: block;
  overflow: visible;
  padding: 0;
}
```

Then delete or shrink the duplicate `.chat-composer-shell` rules. If the class is retained for React wiring, it should not be the main visual API.

### 4. Fix composer JSX padding

In `packages/app/src/components/chat/chat-composer.tsx`, remove the extra editor wrapper padding that conflicts with Cursor's prompt-input padding:

- remove `px-3 pb-2 sm:px-4`;
- remove `pt-2.5 sm:pt-3` / `pt-3.5 sm:pt-4` as the base text inset;
- keep only local spacing needed for image previews or pending panels.

The editor padding should come from:

```css
.agent-window .composer-prompt-editor-input {
  max-height: var(--prompt-input-editor-max-height);
  min-height: var(--prompt-input-editor-min-height);
  padding: var(--prompt-input-editor-padding);
}

.agent-window
  .ui-prompt-input-editor[data-variant="compact"]:not([data-expanded])
  .composer-prompt-editor-input {
  max-height: none;
  min-height: auto;
  padding: 0 0 0 4px;
}
```

If `ComposerPromptEditor` does not receive `data-variant` / `data-expanded` today, add those attributes to the `.ui-prompt-input-editor` wrapper rather than creating a new styling class.

### 5. Decide placeholder ownership

Best parity path: move placeholder rendering into the ProseMirror content using `data-placeholder`, matching Cursor's CSS-driven approach.

Implementation route:

1. In `ComposerPromptEditor`, pass the placeholder into the editor extension or DOM attrs so the empty paragraph receives `data-placeholder`.
2. Remove the separate absolute `<div data-composer-placeholder>`.
3. Style the empty ProseMirror paragraph:

```css
.agent-window .composer-prompt-editor-input p.is-editor-empty:first-child {
  position: relative;
}

.agent-window .composer-prompt-editor-input p.is-editor-empty:first-child::before {
  color: var(--multi-composer-placeholder-fg);
  content: attr(data-placeholder);
  left: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  right: 0;
  text-overflow: ellipsis;
  top: 0;
  white-space: nowrap;
}
```

If that is too invasive for the first patch, keep the separate placeholder temporarily but change it to use `--multi-composer-placeholder-fg` and record a follow-up. Do not leave two placeholder systems active.

### 6. Restore Cursor-like follow-up overlay behavior

In `packages/app/src/components/chat-view.tsx`, keep `agent-panel-followup-input` as the semantic wrapper and keep top/bottom Tailwind for local layout. Do not add horizontal Tailwind padding there.

In CSS, implement the overlay mask with Multi tokens:

```css
.agent-panel-followup-input--conversation-overlay {
  --multi-composer-overlay-bleed-mask-height: 12px;
  --multi-composer-overlay-height: 0px;
  bottom: 0;
  isolation: isolate;
  left: 0;
  pointer-events: auto;
  position: absolute;
  right: 0;
  z-index: 30;
}

.agent-panel-followup-input--conversation-overlay::before {
  background: var(--multi-color-editor);
  bottom: calc(var(--multi-composer-overlay-bleed-mask-height) * -1);
  content: "";
  left: 50%;
  margin-left: -50vw;
  pointer-events: none;
  position: absolute;
  top: 50%;
  width: 100vw;
  z-index: 0;
}

.agent-panel-followup-input--conversation-overlay::after {
  background: linear-gradient(to top, var(--multi-color-editor), transparent);
  bottom: 50%;
  content: "";
  height: var(--multi-composer-overlay-height);
  left: 50%;
  margin-left: -50vw;
  pointer-events: none;
  position: absolute;
  width: 100vw;
  z-index: 0;
}
```

Use `--multi-color-editor` or a dedicated `--multi-composer-overlay-bg` token. Do not use `--cursor-bg-chrome`.

### 7. Align rails with one padding token

Use `--multi-composer-column-padding-inline` as the single source for:

- `[data-composer-messages]` padding;
- any composer form/content rail padding;
- empty-state prompt horizontal inset.

Do not add `px-3`, `px-4`, `sm:px-5`, or similar horizontal Tailwind on `agent-panel-followup-input` or the form. If a child needs internal control padding, use prompt-input tokens, not column padding.

### 8. Preserve compact controls without decorative classes

Keep compact visibility attributes:

- `data-compact-visible`
- `data-chat-composer-footer`
- `data-chat-composer-actions`

These are acceptable because they encode behavior/state and are already used by tests and CSS. Prefer attribute selectors for compact behavior:

```css
.agent-window
  .ui-prompt-input__container[data-variant="compact"]:not([data-expanded])
  .ui-prompt-input-toolbar {
  display: contents;
}
```

If Multi must keep real flex wrappers for popover anchors, document that as an intentional divergence in this file and scope the CSS narrowly:

```css
.agent-window
  .ui-prompt-input__container[data-variant="compact"]:not([data-expanded])
  .ui-prompt-input-toolbar {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  padding: 0;
}
```

### 9. Implement activity parity after composer chrome

Composer chrome and activity rendering are separate patches. After the visual composer patch lands:

1. Stop filtering `collab_agent_tool_call` out of `deriveWorkLogEntries`.
2. Populate `WorkLogEntry.subagents` from provider/orchestration payloads where stable IDs exist.
3. Replace the stale `taskToolCall` card with a `ui-task-tool-call` disclosure.
4. Add `agent-panel-meta-agent-chat__status-row` and `agent-panel-meta-agent-chat__nested-subagents` equivalents using Multi tokens:
   - `--multi-agent-status-accent`
   - `--multi-agent-status-fg`
   - `--multi-agent-status-muted-fg`
   - `--multi-agent-status-border`
   - `--multi-agent-status-bg`

Do not mix the activity patch with the prompt chrome patch. The composer can be verified visually without changing work-log derivation.

### 10. Verification checklist

After code changes, run `bun run typecheck` from the repo root.

Manual visual checks:

- docked composer uses a `12px` expanded radius when multiline and pill radius only when compact-collapsed;
- placeholder truncates with ellipsis and uses `--multi-composer-placeholder-fg`;
- no horizontal drift between message rails and docked composer;
- follow-up overlay masks the bottom of the conversation like Cursor;
- compact toolbar and model picker do not resize the prompt text unexpectedly;
- no new decorative className constants or Tailwind-only kebab-case selectors were introduced.

---

_Written from chat exploration 2026-05-04; code references may drift—verify against current `session-logic`, `messages-timeline`, `chat-view`, and `tool-call-message`._
