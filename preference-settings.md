# Agent Window Preference Findings

Scope: Cursor preferences and source findings that apply to the Agents Window / Glass popout only. General IDE, editor, terminal Cmd-K, Cursor Tab, worktree cleanup, and network/debug settings are intentionally excluded unless they directly affect the Agents Window surface.

## Agent Window Identity

The Agents Window is the Glass surface, not the normal editor workbench.

Source evidence in `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`:

| Evidence                                                           |          Offset |    Line | Meaning                                                                 |
| ------------------------------------------------------------------ | --------------: | ------: | ----------------------------------------------------------------------- |
| `data-component="agent-panel"` and `data-glass-chat-popout="true"` |      `53810962` | `46919` | Popout root renders as an Agent panel.                                  |
| `GlassChatPopoutRoot`                                              |      `53812501` | `46919` | Agent Window chat root.                                                 |
| `followupSource:"popout"`                                          | near `53812501` | `46919` | Composer submissions from this surface are tagged as popout-originated. |
| `showUsageStatusBar: true`                                         | near `53812501` | `46919` | Usage status bar is explicitly enabled in the popout root.              |
| `targetWindow:t.window`                                            | near `53812501` | `46919` | Controls are rendered against the auxiliary Agents window.              |

## Agent Window Commands And Gates

These are Agent Window-specific command surfaces, not regular preferences.

| Command / gate                                 |          Offset |    Line | Behavior                                                                      |
| ---------------------------------------------- | --------------: | ------: | ----------------------------------------------------------------------------- |
| `workbench.contrib.glassOpenAgentInWindowGate` |      `55785986` | `47380` | Feature gate for opening agents in a separate window.                         |
| `New Agents Window`                            |      `55777362` | `47380` | Opens a new Agents Window when Glass is available but absent.                 |
| `Developer: New Additional Agents Window`      | near `55788065` | `47380` | Developer-only additional Agents window command.                              |
| `Switch to Agents Window`                      | near `55788065` | `47380` | Switches focus to an existing Agents Window.                                  |
| `Open or Focus Agents Window`                  |      `55788065` | `47380` | Opens or focuses the Agents Window.                                           |
| `Open or Focus Editor Window`                  |      `55788266` | `47380` | Returns from Agents Window to the editor/IDE window.                          |
| `Open Glass and Switch Model`                  |      `55789120` | `47380` | Opens/focuses Agents Window, then routes `cursorai.action.switchToModelSlug`. |
| `Open Glass and Change to Multitask`           |      `55789981` | `47380` | Opens/focuses Agents Window, then routes `glass.changeToMultitask`.           |
| `New Cloud Agent`                              | near `55789981` | `47380` | Opens/focuses Agents Window and starts a cloud agent via `glass.newAgent`.    |

Implementation implication: these belong in window/workspace command plumbing and Agent Window navigation, not in a normal Settings panel.

## Agent Window Appearance Preferences

These are the source-backed preferences worth adapting for the Agents Window first.

| Setting key                                    | Default | Agent Window relevance                                                                                   |
| ---------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `cursor.general.reduceTransparency`            | `false` | Replaces Glass translucency/vibrancy with opaque backgrounds. High-value for readability.                |
| `cursor.general.fontSmoothingAntialiased`      | `false` | Enables macOS-style grayscale antialiasing for the Glass root. High-value for text clarity.              |
| `cursor.general.emailPrivacyEnabled`           | `false` | Masks the user email in Cursor UI. Relevant if Agent Window headers/account surfaces expose identity.    |
| `cursor.general.glassShowWarningNotifications` | `false` | Controls warning-level in-app notifications in Glass mode. Relevant to Agent Window notification noise.  |
| `cursor.windowSwitcher.sidebarHoverCollapsed`  | `false` | Controls hover-expanded state for the Cloud Agents sidebar. Relevant if we ship an Agent Window sidebar. |
| `cursor.chatMaxWidth`                          | `840`   | Maximum chat content width in pixels. Relevant to Agent Window reading comfort and line length.          |

Source registration for these keys is in the Cursor `general` / `composer` configuration region around byte `45138684` to `45142129`, line `43737`.

## Multi Implementation Path

Multi already has the Agent Window root and most Glass styling hooks. Implement preference-backed behavior through the client settings path unless the setting changes server behavior.

### Existing Multi Anchors

| Concern                         | Multi path                                                                                                                                          | Current behavior                                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent Window root               | `packages/app/src/components/shell/shell/app.tsx`                                                                                                   | Renders `.agent-window`, `data-component="root"`, `data-agent-window`, `data-shell-chrome="glass"`, and the child `main[data-component="agent-panel"]`. |
| Agent Window layout tokens      | `packages/app/src/styles/tokens.css`                                                                                                                | Defines `--multi-composer-max-width: 840px` and aliases `--composer-max-width`.                                                                         |
| Chat/composer width consumption | `packages/app/src/styles/shell.css`, `packages/app/src/components/chat/messages-timeline.tsx`, `packages/app/src/components/chat/chat-composer.tsx` | Message rows and composer already consume `--composer-max-width`.                                                                                       |
| Existing reduce transparency    | `packages/app/src/lib/appearance-settings.ts`, `packages/app/src/styles/tokens.css`                                                                 | Stores `multi:reduce-transparency`, toggles `html.multi-reduce-transparency`, and disables translucent token opacity/blur.                              |
| Settings schema                 | `packages/contracts/src/settings.ts`                                                                                                                | `ClientSettingsSchema` is local-only; `ServerSettings` is server-authoritative.                                                                         |
| Settings read/write hook        | `packages/app/src/hooks/use-settings.ts`                                                                                                            | `useSettings` merges server and client settings; `useUpdateSettings` routes non-server keys to client persistence.                                      |
| Browser client persistence      | `packages/app/src/client-persistence-storage.ts`                                                                                                    | Stores client settings under `multi:client-settings:v1` and decodes with `ClientSettingsSchema`.                                                        |
| Desktop client persistence      | `packages/desktop/src/settings/DesktopClientSettings.ts`                                                                                            | Stores decoded `ClientSettings` in the desktop client settings file.                                                                                    |
| Settings UI                     | `packages/app/src/components/settings/settings-panels.tsx`                                                                                          | `AppearanceSettingsPanel` already owns theme, transparency, tint, and font controls.                                                                    |
| Settings restore                | `packages/app/src/components/settings/settings-restore-context.tsx` and `useSettingsRestore` in `settings-panels.tsx`                               | Global restore button resets unified settings and legacy appearance settings.                                                                           |

### Recommended Preference Data Path

Add new Agent Window preferences as flat local-only keys in `ClientSettingsSchema`:

| Proposed Multi key                    | Cursor source key                              | Default | Reason                                                                             |
| ------------------------------------- | ---------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `agentWindowFontSmoothingAntialiased` | `cursor.general.fontSmoothingAntialiased`      | `false` | New local UI preference; no server behavior.                                       |
| `agentWindowChatMaxWidth`             | `cursor.chatMaxWidth`                          | `840`   | Existing Multi token already defaults to `840px`; this makes it user-configurable. |
| `agentWindowEmailPrivacyEnabled`      | `cursor.general.emailPrivacyEnabled`           | `false` | Only useful once real account identity is rendered.                                |
| `agentWindowShowWarningNotifications` | `cursor.general.glassShowWarningNotifications` | `false` | Only useful once warning notifications have an Agent Window-specific policy.       |
| `agentWindowSidebarHoverCollapsed`    | `cursor.windowSwitcher.sidebarHoverCollapsed`  | `false` | Only useful if collapsed Agent Window sidebar hover-expansion is implemented.      |

Keep `reduceTransparency` on the existing appearance path for now because Multi already ships it through `appearance-settings.ts` and `html.multi-reduce-transparency`. If the appearance system is cleaned up later, migrate all appearance keys together into `ClientSettingsSchema` instead of creating a duplicate Agent Window transparency setting.

Implementation notes:

- Add schema fields in `packages/contracts/src/settings.ts` under `ClientSettingsSchema`; `DEFAULT_CLIENT_SETTINGS` and `DEFAULT_UNIFIED_SETTINGS` then pick up defaults automatically.
- Do not add these keys to `ServerSettings` or `ServerSettingsPatch`; `useUpdateSettings` will persist them as client settings because they are not server keys.
- Keep the first pass flat rather than nested. Current client updates are shallow-merged in `useUpdateSettings`, so a nested `agentWindow` object would require callers to always spread the previous object or would need a client-side deep merge change.
- Update `useSettingsRestore` in `packages/app/src/components/settings/settings-panels.tsx` so the Restore defaults button reports and resets these new preferences.

### Recommended UI Path

First pass: add an `Agent Window` section inside `AppearanceSettingsPanel` in `packages/app/src/components/settings/settings-panels.tsx`.

This avoids a new route and uses the existing settings navigation. A separate settings page would require adding a route file, updating `packages/app/src/components/shell/settings/nav-rail.tsx`, and updating `packages/app/src/routeTree.gen.ts` through the TanStack route generator.

Controls to add first:

| Control        | UI component                    | Persistence call                                                   |
| -------------- | ------------------------------- | ------------------------------------------------------------------ |
| Font Smoothing | `Switch`                        | `updateSettings({ agentWindowFontSmoothingAntialiased: checked })` |
| Chat Max Width | existing numeric/slider control | `updateSettings({ agentWindowChatMaxWidth: next })`                |

Defer email privacy, warning notifications, and sidebar hover-collapsed until the corresponding Agent Window surface exists in Multi.

### Recommended Application Path

Read the new preferences in `AppShell` from `packages/app/src/components/shell/shell/app.tsx` with `useSettings`.

Apply them at the Agent Window root:

| Preference                            | Application point                                                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentWindowChatMaxWidth`             | Add the `--multi-composer-max-width` style value to `shellStyle`, derived from `agentWindowChatMaxWidth` in pixels; current CSS will carry it through `--composer-max-width`.                                                           |
| `agentWindowFontSmoothingAntialiased` | Add a root data attribute such as `data-agent-window-font-smoothing="antialiased"` and CSS under `.agent-window` or `[data-component="root"]` that sets `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`. |
| `reduceTransparency`                  | Keep using `setReduceTransparency`, `html.multi-reduce-transparency`, and the existing token overrides in `tokens.css`.                                                                                                                 |

Minimum implementation order:

1. `agentWindowChatMaxWidth`, because Multi already has the `840px` token path.
2. `agentWindowFontSmoothingAntialiased`, because it is isolated to Agent Window text rendering.
3. Appearance-system cleanup only if needed, migrating legacy `appearance-settings.ts` keys into client settings as one deliberate pass.

## Agent Window Glass Theme State

The Glass theme service is the appearance owner for the Agents Window root.

Source wrapper:

- `out-build/vs/glass/browser/services/glass-theme-service.js`
- JS offset around `21361363`, line `29716`

Stored Glass theme keys:

| Key                               | Agent Window use                     |
| --------------------------------- | ------------------------------------ |
| `glass.theme.settingsId`          | Explicit/current Glass theme.        |
| `glass.theme.lightSettingsId`     | Theme used for light OS appearance.  |
| `glass.theme.darkSettingsId`      | Theme used for dark OS appearance.   |
| `glass.theme.detectColorScheme`   | Follow OS light/dark appearance.     |
| `glass.theme.customTintHue`       | Tint hue for the Glass surface.      |
| `glass.theme.customTintIntensity` | Tint strength for the Glass surface. |
| `glass.theme.customThemesV1`      | Persisted custom Glass themes.       |

Body classes controlled by the Glass theme service:

| Class                                     | Trigger                                                           |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `cursor-glass-os-vibrancy-on`             | Glass enabled, macOS, not high contrast, reduce transparency off. |
| `cursor-glass-os-vibrancy-off`            | Glass fallback path or reduce transparency/high contrast.         |
| `cursor-glass-windows-mica`               | Windows Glass fallback.                                           |
| `cursor-glass-reduce-transparency`        | `cursor.general.reduceTransparency` true.                         |
| `cursor-glass-font-smoothing-antialiased` | `cursor.general.fontSmoothingAntialiased` true.                   |

## Agent Window Font Smoothing

The Agent Window path to prioritize is Cursor Glass font smoothing, not the upstream workbench `workbench.fontAliasing` setting.

### Cursor Glass Path

| Item            | Evidence                                  |
| --------------- | ----------------------------------------- |
| Setting key     | `cursor.general.fontSmoothingAntialiased` |
| Schema location | byte `45142128`, line `43737`             |
| Default         | `false`                                   |
| UI label        | `Font Smoothing`                          |
| UI description  | `Use native macOS font anti-aliasing`     |
| UI location     | byte `47378556`, line `44905`             |
| Body class      | `cursor-glass-font-smoothing-antialiased` |

CSS in `workbench.desktop.main.css`, line `3`:

|    Offset | Selector                                                                                          | Effect                                                                                                                             |
| --------: | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `1888256` | `[data-component=root]`                                                                           | Defaults `--cursor-font-smoothing-webkit: subpixel-antialiased`, `--cursor-font-smoothing-moz: auto`, then applies both variables. |
| `1895506` | `body.cursor-glass-font-smoothing-antialiased[data-cursor-glass-mode=true] [data-component=root]` | Overrides variables to `antialiased` and `grayscale`.                                                                              |

### Upstream Workbench Path

`workbench.fontAliasing` exists, but it targets `.monaco-workbench.mac...` rather than the Glass Agent Window root. Keep it as reference only.

| Value         | DOM class                          | Effect                                                  |
| ------------- | ---------------------------------- | ------------------------------------------------------- |
| `default`     | none                               | Browser/native default smoothing.                       |
| `antialiased` | `monaco-font-aliasing-antialiased` | Grayscale antialiasing.                                 |
| `none`        | `monaco-font-aliasing-none`        | Disables WebKit smoothing.                              |
| `auto`        | `monaco-font-aliasing-auto`        | Grayscale antialiasing only under high-DPI media query. |

## Agent Window Feedback Preferences

These are preference-like because they are durable defaults, but the product surface should still be Agent Window-specific.

| Setting key                                    | Default | Agent Window relevance                               |
| ---------------------------------------------- | ------- | ---------------------------------------------------- |
| `cursor.composer.shouldChimeAfterChatFinishes` | `false` | Completion feedback when an Agent response finishes. |
| `cursor.composer.customChimeSoundPath`         | `""`    | Custom completion sound path.                        |

Implementation recommendation: keep these under Agent Window notification/sound settings, not general app notifications.

## Native Binary Check

The Agent Window-specific behavior is renderer JS/CSS, not native macOS binary logic.

Negative checks:

- `Info.plist` did not contain `cursor.general.fontSmoothingAntialiased`, `cursor-glass-font-smoothing-antialiased`, `font_smoothing_antialiased`, or `AppleFontSmoothing`.
- `Contents/MacOS/Cursor` did not contain those keys.
- `Electron Framework` contains generic Chromium strings such as `-webkit-font-smoothing`, but not Cursor-specific Agent Window preference keys.
