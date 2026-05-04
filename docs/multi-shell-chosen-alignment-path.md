# Multi Shell Chosen Alignment Path

Research base:

- [multi-shell-glass-reverse-engineering.md](./multi-shell-glass-reverse-engineering.md)
- Cursor bundle/CSS findings.
- Notion Calendar hosted renderer findings.
- Four-agent council review of Multi shell code.

Decision date: 2026-05-03

## Chosen Path

Use a **CSS-first root shell contract**:

- Zustand stores only durable user intent.
- `AppShell` publishes one stable set of CSS variables and data attributes.
- CSS/container queries derive transient responsive collapse.
- Header and workbench x-axis alignment consume the same root variables.
- No new global responsive state.
- No new `useEffect` for measuring layout.

This is the route to implement. Do not split into a measured-capacity hook unless CSS container queries fail in a verified case.

## Why This Path

Cursor and Notion both use a clear shell contract:

- Cursor: persistent width plus `data-state`, `data-side`, `data-resizing`, and CSS variables.
- Notion: `--sidebar-width-default`, `--sidebar-pane-width-default`, z-index tokens, host window state, and renderer-controlled chrome positions.

Multi already has the right durable state in `packages/app/src/lib/shell-panels-store.ts`:

- `leftOpen`
- `leftW`
- `rightOpen`
- `rightW`
- `activeTab`
- `muted`
- secondary rail `open/width`
- terminal sessions

The missing piece is not another store. It is one root projection that all shell pieces consume.

## Council Summary

Council 1 proposed a CSS-first projection with container queries. It keeps Zustand as durable intent and uses root CSS variables/data attributes for transient layout.

Council 2 proposed a root x-axis chrome contract. Left controls, right toggle, and workbench end spacers should consume the same variables instead of each owning separate absolute offsets.

Council 3 warned against adding another store. It recommended a selector/action cleanup and keeping resize drag state local.

Council 4 highlighted the main failure mode: even with Electron’s `840 x 620` minimum, default widths can leave the center almost unusable:

```text
left default 180 + right default 400 + secondary rail default 220 = 800
840 window width leaves about 40px before other chrome/content constraints
```

The chosen path takes Council 1 and 2 as the implementation route, with Council 4’s capacity order encoded in CSS:

1. Collapse secondary rails first.
2. Collapse right workbench next.
3. Collapse left sidebar last.
4. Preserve persisted user intent.

## Non-Negotiable Requirements

### Works At Any Window Size

Desktop already has a hard Electron minimum:

```ts
// packages/desktop/src/main.ts
minWidth: 840;
minHeight: 620;
```

Keep that guardrail.

For web/dev/embed/narrow cases, CSS must guarantee:

- center content never collapses to unusable width;
- right workbench auto-collapses before center breaks;
- secondary rails auto-collapse before the right workbench breaks;
- left sidebar auto-collapses after the right side is gone;
- persisted `leftOpen/rightOpen` preferences are not overwritten.

### X-Axis Alignment

Both Cursor and Notion align titlebar controls from shared shell geometry. Multi should do the same.

All of these must align from one root contract:

- left titlebar toggle cluster;
- optional back button;
- right workbench toggle;
- drag region;
- right workbench header end spacer;
- sidebar/workbench sashes.

No component should invent its own `left-2`, `right-2`, or independent spacer width once the contract exists.

### Less Hooks

Do not add a window-size React hook for the first implementation.

Use:

- CSS container queries for transient responsive layout.
- Existing `useColumnResize` for drag interaction.
- Existing Zustand selectors for persisted shell intent.

Keep the existing body glass `useEffect` until there is a better document-level integration point; it is a document side effect, not responsive layout state.

### Zustand Scope

Use Zustand only for durable/global state:

- user panel open intent;
- user panel widths;
- active workbench tab;
- muted/forced workbench state;
- secondary rail persisted state;
- terminal sessions.

Do not store:

- `effectiveRightOpen`;
- `effectiveLeftOpen`;
- `isNarrow`;
- `containerWidth`;
- `shouldCollapseForViewport`;
- hover/peek state unless it becomes a real cross-component interaction.

## Implementation Contract

### Root Variables

`AppShell` should publish these on `.agent-window`:

```tsx
style={{
  "--multi-shell-left-width": `${leftWidth}px`,
  "--multi-shell-left-collapsed-width": "0px",
  "--multi-shell-left-min-width": `${LEFT_LIMITS.min}px`,
  "--multi-shell-left-max-width": `${LEFT_LIMITS.max}px`,
  "--multi-shell-right-workbench-width": `${rightWidth}px`,
  "--multi-shell-right-workbench-collapsed-width": "0px",
  "--multi-shell-right-workbench-min-width": `${RIGHT_LIMITS.min}px`,
  "--multi-shell-right-workbench-max-width": `${RIGHT_LIMITS.max}px`,
  "--multi-shell-titlebar-control-size": "var(--multi-titlebar-control-height)",
  "--multi-shell-titlebar-control-y": "var(--multi-titlebar-control-row-top)",
  "--multi-shell-titlebar-gutter": "8px",
}}
```

Use the current token names where possible; add aliases only when needed for clarity.

### Root Attributes

`AppShell` should publish:

```tsx
data-shell-left-intent={leftOpen ? "expanded" : "collapsed"}
data-shell-right-intent={rightOpen ? "expanded" : "collapsed"}
data-shell-right-panel={showRight ? "true" : "false"}
data-shell-platform={electron ? "electron" : "web"}
data-shell-chrome="glass"
```

Panels should publish:

```tsx
data-shell-panel="left|right|secondary"
data-side="left|right"
data-state="expanded|collapsed"
data-resizing="true|false"
```

The persisted intent and responsive effective state are not the same. Intent comes from Zustand. Effective state is CSS-derived.

## CSS Layout Route

Make `.agent-window` a container:

```css
.agent-window {
  container-type: inline-size;
}
```

Use panel width variables:

```css
.agent-window__sidebar {
  width: var(--multi-shell-left-effective-width);
}

.agent-window__workbench {
  width: var(--multi-shell-right-effective-width);
  min-width: min(
    var(--multi-shell-right-effective-width),
    var(--multi-shell-right-workbench-min-width)
  );
}
```

Set default effective widths:

```css
.agent-window {
  --multi-shell-left-effective-width: var(--multi-shell-left-width);
  --multi-shell-right-effective-width: var(--multi-shell-right-workbench-width);
  --multi-shell-right-workbench-header-end-space: calc(
    var(--multi-shell-titlebar-control-size) + var(--multi-shell-titlebar-gutter)
  );
}

.agent-window[data-shell-left-intent="collapsed"] {
  --multi-shell-left-effective-width: var(--multi-shell-left-collapsed-width);
}

.agent-window[data-shell-right-intent="collapsed"] {
  --multi-shell-right-effective-width: var(--multi-shell-right-workbench-collapsed-width);
}
```

Responsive collapse order:

```css
@container (max-width: 980px) {
  .agent-window {
    --multi-shell-secondary-rail-effective-width: 0px;
  }
}

@container (max-width: 900px) {
  .agent-window {
    --multi-shell-right-effective-width: 0px;
  }
}

@container (max-width: 620px) {
  .agent-window {
    --multi-shell-left-effective-width: 0px;
  }
}
```

The exact breakpoints should be verified visually, but the order is fixed.

Why CSS first:

- It avoids a new measurement hook.
- It avoids `useEffect` for responsive state.
- It guarantees layout changes before React catches up.
- It keeps persisted user intent untouched.

## Header Alignment Route

Replace independent offsets with root variables:

```css
.multi-shell-titlebar-left-controls {
  top: var(--multi-shell-titlebar-control-y);
  left: var(--multi-electron-traffic-inset);
}

.multi-shell-titlebar-right-toggle {
  top: var(--multi-shell-titlebar-control-y);
  right: var(--multi-shell-titlebar-gutter);
}

.multi-shell-titlebar-drag-region {
  margin-right: var(--multi-shell-right-effective-width);
}
```

Right workbench header should reserve the same right-side chrome space:

```css
.multi-workbench-titlebar-end-space {
  width: var(--multi-shell-right-workbench-header-end-space);
  height: var(--multi-shell-titlebar-control-size);
}
```

Change `RightWorkbenchHeader` so the current hardcoded spacer:

```tsx
<div className="no-drag size-(--multi-titlebar-control-height) shrink-0" aria-hidden />
```

becomes a named element/class that consumes the root variable.

## Component Changes

### `AppShell`

File:

```text
packages/app/src/components/shell/shell/app.tsx
```

Do:

- centralize shell vars and attributes on the root;
- pass intent, not effective state, to data attributes;
- remove repeated right-open derivation where possible through a local derived object;
- keep body glass effect unchanged for now;
- make Electron header and right toggle consume class names tied to root vars.

Do not:

- add `useWindowSize`;
- add `ResizeObserver` in React;
- store effective responsive collapse in Zustand.

### `LeftAside`

Do:

- replace inline `width: leftOpen ? leftWidth : 0` with CSS variables/data attributes;
- keep the node mounted;
- set `aria-hidden` from intent for now;
- expose `data-state`.

The left panel can still render content at opacity `0` when collapsed.

### `RightAside`

Do:

- keep node mounted when `showRight`;
- replace inline width with `--multi-shell-right-effective-width`;
- keep inner workbench content conditional on user/route intent if needed for performance;
- expose `data-state`.

Important: CSS collapse may make effective width `0` while persisted intent is open. If inner content remains mounted, it must not trap focus when effective width is `0`. Prefer `visibility: hidden` and `pointer-events: none` in CSS for responsive-collapse states.

### `RightWorkbenchLayout`

File:

```text
packages/app/src/components/shell/shell/right-workbench-layout.tsx
```

Do:

- expose secondary rail width as `--multi-shell-secondary-rail-width`;
- add `--multi-shell-secondary-rail-effective-width`;
- use CSS/container query collapse for secondary rail before collapsing the full workbench.

This addresses the worst current failure case: right workbench plus nested secondary rail.

## Chosen Breakpoint Policy

Start with these thresholds:

```text
>= 1100px:
  left + center + right + secondary may be visible.

980px..1099px:
  secondary rail collapses first.

900px..979px:
  right workbench collapses.

620px..899px:
  left remains if user intended it; center gets the rest.

< 620px:
  left collapses too; center owns the viewport.
```

Electron currently starts at `1100 x 780` and cannot shrink below `840 x 620`, so desktop primarily exercises the first three states. Web/dev embeds must handle all states.

## Why Not The Capacity Hook Route

A capacity hook would work, and Council 4 correctly identified the current failure mode. But it is not the first path because:

- the user explicitly prefers fewer hooks and less `useEffect`;
- CSS container queries solve transient capacity without persistent responsive state;
- Cursor and Notion both use CSS-variable contracts heavily;
- Zustand should not own viewport-derived state.

Escalate to a hook only if CSS cannot safely handle focus/ARIA for responsive-hidden panels.

If that happens, implement one hook at `AppShell` only. Do not scatter window-size hooks through panels.

## Exact Path To Implement

1. Add root shell vars/attributes in `AppShell`.
2. Add container queries to `shell.css`.
3. Convert left/right inline widths to CSS variable consumption.
4. Add named classes for titlebar left controls, right toggle, drag region, and workbench end spacer.
5. Convert `RightWorkbenchHeader` spacer to `multi-workbench-titlebar-end-space`.
6. Convert secondary rail width to CSS variables and add its responsive collapse first.
7. Keep Zustand schema unchanged.
8. Keep `useColumnResize` unchanged except for data attributes.
9. Verify at widths:
   - 1100
   - 980
   - 900
   - 840
   - 620
   - 390

## Final Decision

The path is **root CSS shell contract + container-query effective collapse + Zustand durable intent only**.

This gives Multi the Cursor/Notion alignment model without adding a new global responsive state machine. It is the smallest route that satisfies:

- works at any window size;
- auto hides/collapses under pressure;
- preserves user intent;
- aligns x-axis chrome from one source;
- avoids new layout `useEffect`;
- keeps Zustand for persistent global state only.
