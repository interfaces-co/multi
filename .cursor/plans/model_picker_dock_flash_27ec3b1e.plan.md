---
name: Model picker dock flash
overview: The model selector uses the same components in hero and dock; dock/threads mode additionally mounts the message timeline and scroll/resize side effects. Flashing is unlikely to be “because of useEffect vs useLayoutEffect” in the picker itself, but several layout/scroll-related effects only run in dock mode and can interact with the Base UI Popover (e.g. open/close churn or visual jitter).
todos:
  - id: log-popover-close-reason
    content: Inspect Base UI Popover API support for `eventDetails.reason`, focus control, and positioner options; do not ship temporary logging.
    status: completed
  - id: verify-open-state-flicker
    content: Verify the controlled picker state path by code inspection; keep the canonical fix focused on dock-only resize/scroll churn instead of adding debug state probes.
    status: completed
  - id: apply-targeted-fix
    content: "Apply the targeted fix: use explicit popover focus/positioning and gate composer resize auto-scroll while the model picker is open."
    status: completed
isProject: false
---

# Model picker flashing on dock/threads (not hero)

## What differs between hero and canvas/threads

- **Hero** is only when the thread is a local draft and has not started ([`isHeroComposer` in `chat-view.tsx`](packages/app/src/components/chat-view.tsx)): the **messages timeline wrapper is not rendered** (`{!isHeroComposer && (...)}`).
- **Dock / threads** renders [`MessagesTimeline`](packages/app/src/components/chat/messages-timeline.tsx) above the composer and applies follow-up layout classes (e.g. [`agent-panel-followup-input--conversation-overlay`](packages/app/src/styles/shell.css) when `showScrollToBottom` is false).

So any behavior that depends on the list scroller, row height measurement, or “at end” detection **only happens in dock mode**, not on the empty hero screen.

## Relevant effects (yes, some are `useLayoutEffect` — but the axis is timeline vs no timeline)

| Location                                                                                    | Effect                                                    | Why dock-only matters                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`provider-model-picker.tsx`](packages/app/src/components/chat/provider-model-picker.tsx)   | `useEffect` → `setModelPickerOpen(isMenuOpen)`            | [`useModelPickerOpen`](packages/app/src/model-picker-open-state.ts) has **no other callers** in-repo; unlikely to drive UI flash or close the popover.                                                                                                                                     |
| [`model-picker-content.tsx`](packages/app/src/components/chat/model-picker-content.tsx)     | `useLayoutEffect` on `popoverOpen`                        | On open: sets rail/search seed and `requestAnimationFrame` → `focusSearchInput()`. If `popoverOpen` **toggles false for even one commit**, `popoverWasOpenRef` treats the next open as “just opened” again (re-seed / re-focus).                                                           |
| [`chat-composer.tsx`](packages/app/src/components/chat/chat-composer.tsx)                   | `useLayoutEffect` + `ResizeObserver` on the composer form | On **height** change, if `shouldAutoScrollRef.current` (wired from chat-view’s `isAtEndRef`) is true, it calls `scheduleStickToBottom` → [`scrollToEnd`](packages/app/src/components/chat-view.tsx). In hero mode there is **no** `MessagesTimeline`, so this path does not scroll a list. |
| [`messages-timeline.tsx`](packages/app/src/components/chat/messages-timeline.tsx)           | `useEffect` / scroll handler → `onIsAtEndChange`          | Chat-view already notes LegendList can briefly report `isAtEnd=false` while settling; that toggles [`showScrollToBottom`](packages/app/src/components/chat-view.tsx) and **CSS on the composer wrapper** (`conversation-overlay`, `data-scrolled-to-bottom`).                              |
| [`human-message-collapse.tsx`](packages/app/src/components/chat/human-message-collapse.tsx) | `useLayoutEffect`                                         | Can change row heights → list remeasure → scroll events; **only when there are messages** (dock).                                                                                                                                                                                          |

None of this is “`useLayoutEffect` is wrong and `useEffect` is right” globally — it is **which surfaces mount** and whether **scroll/resize/focus** churn runs while the popover is opening.

## Popover behavior (Base UI)

[`Popover.Root` `onOpenChange`](https://base-ui.com/react/components/popover) receives **`eventDetails` with a `reason`** (`outside-press`, `focus-out`, `escape-key`, etc.). For the canonical fix, [`ProviderModelPicker`](packages/app/src/components/chat/provider-model-picker.tsx) does not ship diagnostic logging; it uses stable placement, focus, and collision settings instead.

## Canonical implementation

1. [`ProviderModelPicker`](packages/app/src/components/chat/provider-model-picker.tsx) now accepts an explicit popover placement and maps it to Base UI `side` / `align` props. The default remains `bottom-start` for non-dock callers.
2. [`ChatComposer`](packages/app/src/components/chat/chat-composer.tsx) uses `top-start` for the chat composer in both hero and dock mode, and forwards the same placement to the prompt-input data contract and the actual model picker popover, so dock no longer depends on collision flipping from a bottom placement.
3. The picker popover uses explicit focus/positioning settings (`initialFocus={false}`, fixed positioning, sticky viewport behavior) through the shared [`PopoverPopup`](packages/ui/src/popover.tsx) wrapper.
4. The composer resize observer keeps the timeline stationary while the model picker is open, preventing dock-only resize churn from calling `scrollToEnd` during popover anchoring.

## Likely conclusion for your question

- **Not primarily** “because of useEffect vs useLayoutEffect” as a generic React mistake.
- **Most plausible** is **dock-only interaction** between **LegendList scroll / at-end churn**, **composer resize → `scrollToEnd`**, and/or **Popover dismiss or reposition** — several of those hooks are implemented with `useLayoutEffect`/`useEffect`, but the **thread timeline** is the real differentiator from hero.
