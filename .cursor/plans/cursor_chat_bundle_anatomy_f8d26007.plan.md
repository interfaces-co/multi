---
name: Cursor chat bundle anatomy
overview: Dissection of Cursor’s shipped workbench shows chat/tool/UI styling largely lives as embedded CSS strings inside `workbench.desktop.main.js`, while message rendering is driven by discriminated step types (`thinking`, `assistant-message`, `tool-call`) and per-tool `tool.case` variants. Minified renderer symbols are not stable across Cursor builds; use string discriminators and `ui-*`/`agent-panel-meta-agent-chat__*` class contracts as the canonical evidence.
todos:
  - id: extract-css-chunk
    content: Extract the embedded `ui-*` CSS substring from workbench.desktop.main.js (script or manual bounds) for stable diffing across Cursor versions.
    status: completed
  - id: map-step-types
    content: Document step.type × tool.case matrix and which UI component/CSS block applies to each.
    status: completed
  - id: props-from-renderer
    content: Parse central tool renderer destructuring + context usage to list layout-affecting props and context (density, copy); do not treat minified names as stable.
    status: completed
  - id: mirror-in-multi
    content: Align packages/app chat components with extracted class semantics and state attributes as needed.
    status: completed
isProject: false
---

# Cursor workbench: chat messages, tools, and where CSS lives

## What we inspected

- [workbench.desktop.main.js](/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js) (~51 MB single line): application + **embedded Cursor UI CSS** (raw text, not minified CSS-in-JS object form—you can read rules as plain `.class { ... }` starting roughly in the **~6.7k–11k line range** when the editor soft-wraps the file; the bundle is one physical line).
- [workbench.desktop.main.css](/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css) (~2 MB): **mostly VS Code / Monaco / workbench chrome**; Cursor’s `ui-*` / `glass-*` chat look is **not the primary home** for those rules (your earlier grep on `chat` in `.css` only hit generic scrollbar `cursor:` rules).

**Subagents (n=10):** A full pass over a **51 MB one-line file** is better handled with **targeted `rg` + small `Read` windows** (what we did) than ten whole-file agents; parallel subagents would duplicate the same string scans. The useful “angles” are folded into the sections below.

---

## What the runtime can do (message / step model)

Conversation rows are built from **steps** with a string discriminator `step.type`:

| `step.type`         | Role                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `thinking`          | Collapsible “thought” text, optional header parsing (`parseHeaders`), duration (`thinkingDurationMs`), loading vs complete copy via helpers like `BKl`, `ckr`, `zoi`.       |
| `assistant-message` | Markdown / text body; participates in **grouping** when adjacent short messages meet `PKl` heuristics (`textMaxLength`, `textMaxLines`).                                    |
| `tool-call`         | Renders a **tool card**; subtype is **`toolCall.tool.case`** (protobuf oneof-style), e.g. `awaitToolCall`, `readToolCall`, `grepToolCall`, `shellToolCall`, `editToolCall`. |

**Grouping** ([`$Vm`](grep) in bundle): decides whether a step can merge with the next (e.g. `thinking` → `groupThinking`; `assistant-message` → `groupText`; `tool-call` → `isToolGroupable(case, toolCall)`).

**Aggregate “group header” states** (loading vs completed strings): logic branches on step mix—for example:

- Only thinking → “Thinking” / parsed title / duration text.
- Browser-related steps (`DKl`) → “Running” / “Ran” + browser action count.
- `summary.waitingActions` → “Monitoring background task(s)” with complete/active counts.
- Many more branches in the same function region as lines **631–632** in the bundle (minified `if (n.steps.some(...))` chain).

**Tool → coarse UI bucket** (`rBu`): `editToolCall` → `"edit"`, `shellToolCall` → `"shell"` (conditionally), else `"explore"`.

---

## Tool messages: props and variants to extract

The central tool-call renderer destructures props that are the practical **public surface** for replicating behavior. Older notes referred to this renderer as **`ZQl`**, but in the current local Cursor binary `function ZQl` is an unrelated string transform; do not anchor implementation to that symbol name.

- **`toolCall`** – full protobuf message; inner dispatch uses **`toolCall.tool.case`**.
- **`callId`**, **`loading`**, **`startedAtMs`**, **`hasError`**
- **`approval`** – UI for pending approval flows.
- **`editToolCallDisplay`** – drives **minimal vs expanded** edit UI (pairs with CSS modifiers below).
- **`subagentConversation`** – nested subagent/thread treatment.
- **`renderStep`** – injects custom step rendering.
- **`onFileClick`**, **`onUrlClick`**, **`onNestedToolExpand`**, **`defaultExpanded`**

**Context** (not props but affects layout): **`QDt()`** exposes at least **`conversationDensity`** (used inside `ZQl` dependency array) and **`copyToClipboard`** (used in copy rows / markdown).

**Special case – wait / poll tools:** **`BZm`** handles `awaitToolCall` with `args.blockUntilMs`, ticking `Date.now()` on an interval, and renders a compact row via **`bW`** with `action` / `details` / `loading` from **`Wkr`**.

**Copy / plain-text summary:** **`IKl(toolCall)`** produces human `{ action, details }`; used when flattening steps to text (line **641** region).

---

## Pretext evidence

The current local Cursor bundle contains Pretext-derived symbols even though the package name string is not preserved: `prepare`, `prepareWithSegments`, `layout`, `walkLineRanges`, `measureNaturalWidth`, `getPretextFontFromComputedStyle`, `truncatePretextMiddleText`, `preparePretextBubbleText`, `collectWrapMetrics`, `findTightPretextBubbleContentWidth`, and `measurePretextBubbleContent` appear together in `workbench.desktop.main.js`.

Multi already carries the same dependency (`@chenglou/pretext`) in `packages/app/package.json`. The concrete usage is `packages/app/src/hooks/use-composer-pretext-one-line.ts`, consumed by Git and model-picker labels through `PretextOneLine`; this is the right local primitive for Cursor-style tight/middle text fitting instead of ad hoc truncation.

---

## User vs assistant presentation (CSS-level contracts)

Embedded CSS documents **two user message layouts**:

1. **Tray / composer-style** – [`.ui-user-message-box`](7742:7753:/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js) / `__card` (full-width card, `cursor-bg-input`, 8px radius).
2. **Meta-agent transcript bubble** – [`.ui-meta-agent-human-message`](10825:10846:/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js) (flex end, bubble `max-width: 85%`, 18px radius, elevated bg).

**Assistant** in the same block: `.ui-meta-agent-assistant-message` with modifiers like `--has-leading-icon`, `__bubble` (optional `role="button"` for interactive collapse), `__body`.

**Tool chrome** (same embedded stylesheet):

- `.ui-tool-call-card`, `__header`, `__body`, `data-has-content=true`, expand button classes.
- `.ui-tool-call-line`, `--clickable`, `.ui-tool-call-line-details--linkable`, `.ui-tool-call-line-shimmer` + `@keyframes tool-call-line-shine`.
- `.ui-edit-tool-call` + **`--minimal`** (collapsed filename row, additions/deletions colors, expand chevron).
- `.ui-shell-tool-call` + **`--pending`** (pending state on card).

**Cross-cutting tokens:** Cursor’s embedded stylesheet uses **`var(--cursor-*)`** heavily, plus conversation fallbacks like `--conversation-font-size` / `--conversation-text-font-size`. Multi’s app theme uses **`--multi-*`** tokens instead; we do not ship **`--cursor-*`** compatibility aliases in `tokens.css`.

---

## Multi implementation note

- Transcript bubbles and tool rows emit the durable Cursor class hooks (`ui-meta-agent-*`, `ui-tool-call-*`, `ui-edit-tool-call*`, `ui-shell-tool-call*`) from focused components (for example `human-message.tsx`, `assistant-message.tsx`, `message-surface.tsx`, `tool-call-renderer.tsx`) rather than a single legacy bundle module.
- `packages/app/src/components/chat/messages-timeline.tsx` now uses Cursor row/list hooks (`ui-imsg-thread__messages`, `agent-panel-meta-agent-chat__message-entry`, `agent-panel-meta-agent-chat__row--human|assistant|tool-call|loading`) instead of wrapping every row in a `multi-message-thread` shell.
- Bubble sizing, padding, hover, tool-line shimmer, edit minimal rows, shell cards, and meta-agent cards live in the scoped chat CSS contract in `packages/app/src/styles/shell.css`, so the JSX emits canonical hooks rather than a parallel Tailwind-only clone.
- Multi-specific classes remain only for behavior that is not represented by the Cursor bubble contract: media attachments, footer metadata, and hover action visibility.
- Binary evidence used for the cleanup: targeted reads from `workbench.desktop.main.js` around `.ui-meta-agent-human-message`, `.ui-meta-agent-assistant-message`, `.ui-tool-call-line`, `.ui-tool-call-card`, `.ui-edit-tool-call`, `.ui-shell-tool-call`, and Pretext-derived text-fitting symbols.
- The chat/composer shared chip cleanup followed the same rule: remove exported class-string tokens when the markup is better represented by a reusable component. `ComposerInlineChip` now owns the repeated chip frame, and markdown file-link/chip line-height utilities use Tailwind v4 text-size/line-height syntax instead of separate `leading-*` helpers.

---

## Where “the CSS” lives in the binary

| Location                         | Contents                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`workbench.desktop.main.js`**  | Large **literal CSS string** interleaved with app code (starts in the **~6k-line** region in editors that wrap; includes tool + meta-agent + tray rules cited above). This is the right place to **mine class names and state attributes** (`data-has-content`, `data-tone`, `aria-expanded`, `role=button`). |
| **`workbench.desktop.main.css`** | Workbench / editor / Monaco; not the main catalog for Cursor chat `ui-*` rules.                                                                                                                                                                                                                               |

---

## Practical extraction workflow (for your Multi app or a reference doc)

1. **`rg '^\.ui-(meta-agent|tool-call|user-message|edit-tool-call|shell-tool-call|hover-row)'`** on `workbench.desktop.main.js` (or extract the CSS substring between the first `.ui-` block and the closing backtick) to list **all class contracts**.
2. **`rg 'case\"assistant-message\"|tool-call|awaitToolCall|editToolCall'`** to map **runtime branches**.
3. **`rg 'function ZQl|ZQl\('` or read the single long line** around the **`ZQl`** definition to enumerate **remaining props** after minification renames.
4. Mirror **state attributes** in CSS (`data-tone`, `data-has-content`, `aria-expanded`) in your component API.

---

## Caveats

- Symbols are **minified** (`ZQl`, `bW`, `QDt`, etc.); only **string literals** (`step.type`, `tool.case` values, class names) stay stable across builds.
- Cursor updates can **rename minified identifiers** and **move CSS chunks**; class names and string discriminators are the durable reference points.
- Licensing: the bundle is proprietary; use findings to **inform your own UI**, not to copy large pasted chunks into open source without legal review.
