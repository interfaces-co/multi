// @ts-nocheck
import { useMemo, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";

import { useAppearanceSettings } from "../../hooks/use-appearance-settings";
import { useRuntimeDefaults } from "../../hooks/use-runtime-models";
import { useShellState } from "../../hooks/use-shell-cwd";
import { useTheme } from "../../hooks/use-theme";
import { readNativeEnvironmentApi, readNativeApi } from "../../native-api";
import {
  clearRuntimeDefaultModel,
  writeRuntimeDefaultFastMode,
  writeRuntimeDefaultModel,
  writeRuntimeDefaultThinkingLevel,
} from "../../lib/runtime-models";
import {
  type ColorPaletteId,
  resetAppearanceSettings,
  setCodeFontFamily,
  setCodeFontSize,
  setColorPalette,
  setReduceTransparency,
  setTintHue,
  setTintSaturation,
  setUiFontFamily,
  setUiFontSize,
  setWindowTransparency,
} from "../../lib/appearance-settings";
import { pickWorkspace } from "../../lib/workspace-routing";
import { setDefaultHarness, setHarnessEnabled, useHarnessList } from "../../lib/harness-store";
import { cn } from "../../lib/utils";
import { useServerProviders } from "../../rpc/server-state";
import {
  selectProjectsAcrossEnvironments,
  selectThreadsAcrossEnvironments,
  useStore,
} from "../../store";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SimpleSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { OpenPicker } from "../shell/pickers/open";
import { TintPopover } from "../shell/shared/tint-popover";
import { ModelPicker } from "../shell/pickers/model";

const levels = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;
const APPEARANCE_KEYS = [
  "multi:color-preset",
  "multi:reduce-transparency",
  "multi:window-transparency",
  "multi:accent-hue",
  "multi:accent-saturation",
  "multi:ui-font-size",
  "multi:code-font-size",
  "multi:ui-font",
  "multi:mono-font",
];

function SettingsSection(props: { label: string; children: ReactNode }) {
  return (
    <div className="mt-8 first:mt-0">
      <div data-settings-settings-section className="mb-2 font-medium text-muted-foreground">
        {props.label}
      </div>
      <div className="divide-y divide-border/70 border-border/70 border-b">{props.children}</div>
    </div>
  );
}

function SettingsRow(props: {
  label: string;
  description: string;
  control?: ReactNode;
  /** Wider control column (e.g. model pickers, split buttons) so labels are not over-truncated. */
  controlWide?: boolean;
}) {
  return (
    <div className="flex min-h-14 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <div data-settings-settings-label className="font-medium text-foreground">
          {props.label}
        </div>
        <div data-settings-settings-description className="mt-0.5 text-muted-foreground">
          {props.description}
        </div>
      </div>
      {props.control ? (
        <div
          className={cn(
            "min-w-0 shrink-0 sm:flex sm:justify-end",
            props.controlWide
              ? "sm:max-w-[min(100%,min(36rem,58%))]"
              : "sm:max-w-[min(100%,20rem)]",
          )}
        >
          {props.control}
        </div>
      ) : null}
    </div>
  );
}

function FontInput(props: {
  value: string;
  placeholder: string;
  className?: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(props.value);

  return (
    <Input
      className={props.className}
      value={draft}
      placeholder={props.placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => props.onCommit(draft)}
    />
  );
}

function scale(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function ToneSlider(props: {
  value: number;
  min: number;
  max: number;
  track: string;
  suffix?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: number) => void;
}) {
  const left = scale(props.value, props.min, props.max);

  return (
    <div className={cn("flex min-w-[16rem] items-center gap-3", props.disabled && "opacity-50")}>
      <div className="relative flex h-10 min-w-56 flex-1 items-center rounded-full">
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-[18px] -translate-y-1/2 rounded-full bg-foreground/10"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-[18px] -translate-y-1/2 rounded-full border border-chrome-stroke/60"
          style={{ background: props.track }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 h-[18px] w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-chrome-border/60 bg-background shadow-[0_4px_14px_rgb(0_0_0/0.14)]"
          style={{ left: `${left}%` }}
        />
        <input
          type="range"
          min={props.min}
          max={props.max}
          step={1}
          value={props.value}
          disabled={props.disabled}
          aria-label={props.label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(event) => props.onChange(Number(event.target.value))}
        />
      </div>
      <span className="min-w-11 text-right font-medium tabular-nums text-body text-foreground">
        {props.value}
        {props.suffix ?? ""}
      </span>
    </div>
  );
}

export function AppearanceSettingsPanel() {
  const theme = useTheme();
  const g = useAppearanceSettings();
  const tintOff = g.palette !== "multi";

  return (
    <div className="settings-form-page mx-auto w-full max-w-2xl px-1 py-2">
      <h1 className="font-semibold tracking-tight text-foreground">Appearance</h1>
      <p className="mt-1 text-muted-foreground">Keep the Multi look, tune the atmosphere.</p>

      <SettingsSection label="Theme">
        <SettingsRow
          label="Appearance mode"
          description="Match the system theme, or lock the app to light or dark."
          control={
            <SimpleSelect
              value={theme.theme}
              onValueChange={(v) => theme.setTheme(v as "system" | "light" | "dark")}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          }
        />
        <SettingsRow
          label="Color palette"
          description="Stay on Multi or swap to Pierre while keeping the same layout."
          control={
            <SimpleSelect
              value={g.palette}
              onValueChange={(v) => setColorPalette(v as ColorPaletteId)}
              options={[
                { value: "multi", label: "Multi" },
                { value: "pierre", label: "Pierre" },
              ]}
            />
          }
        />
      </SettingsSection>

      <SettingsSection label="Window">
        <SettingsRow
          label="Transparency"
          description="Blend the shell with the desktop background more or less aggressively."
          control={
            <ToneSlider
              label="Window transparency"
              min={0}
              max={100}
              track="linear-gradient(90deg, color-mix(in srgb, var(--chrome-base-surface) 96%, var(--background)), color-mix(in srgb, var(--chrome-base-surface) 54%, transparent))"
              value={g.transparency}
              onChange={setWindowTransparency}
            />
          }
        />
        <SettingsRow
          label="Hue and saturation"
          description={
            tintOff
              ? "Available again when the Multi palette is active."
              : "Shift the tint without changing the full UI system."
          }
          control={
            <TintPopover
              disabled={tintOff}
              hue={g.hue}
              saturation={g.saturation}
              onHueChange={setTintHue}
              onSatChange={setTintSaturation}
            />
          }
        />
        <SettingsRow
          label="Reduce transparency"
          description="Use more solid surfaces while keeping the same shell structure."
          control={
            <Switch checked={g.reduceTransparency} onCheckedChange={setReduceTransparency} />
          }
        />
      </SettingsSection>

      <SettingsSection label="Typography">
        <SettingsRow
          label="UI font"
          description="Override the interface font family."
          control={<FontInput value={g.uiFont} placeholder="Inter" onCommit={setUiFontFamily} />}
        />
        <SettingsRow
          label="Code font"
          description="Override the monospace font used in code and terminal surfaces."
          control={
            <FontInput
              value={g.codeFont}
              placeholder="JetBrains Mono"
              onCommit={setCodeFontFamily}
            />
          }
        />
        <SettingsRow
          label="UI size"
          description="Adjust labels and controls without changing the overall shell geometry."
          control={
            <ToneSlider
              label="UI size"
              min={11}
              max={16}
              track="linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 45%, var(--background)))"
              value={g.uiFontSize}
              suffix="px"
              onChange={setUiFontSize}
            />
          }
        />
        <SettingsRow
          label="Code size"
          description="Adjust mono text density in code surfaces."
          control={
            <ToneSlider
              label="Code size"
              min={10}
              max={18}
              track="linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 45%, var(--background)))"
              value={g.codeFontSize}
              suffix="px"
              onChange={setCodeFontSize}
            />
          }
        />
      </SettingsSection>
    </div>
  );
}

export function AgentsSettingsPanel() {
  const shell = useShellState();
  const defaults = useRuntimeDefaults();
  const { descriptors, defaultKind, loading } = useHarnessList();
  const api = readNativeApi();
  const [busy, setBusy] = useState(false);
  const fail = (error: unknown, fallback: string) => {
    toast.error(error instanceof Error ? error.message : fallback);
  };

  return (
    <div className="settings-form-page mx-auto w-full max-w-2xl px-1 py-2">
      <h1 className="font-semibold tracking-tight text-foreground">Agents</h1>
      <p className="mt-1 text-muted-foreground">
        Turn providers on or off, set which harness new chats use, then pick the default model for
        that harness.
      </p>

      <SettingsSection label="Workspace">
        <SettingsRow
          label="Current workspace"
          description="Pick the project Multi should treat as the active default surface."
          control={
            <span className="max-w-xs truncate text-right text-body">
              {shell.cwd ?? "No workspace selected"}
            </span>
          }
        />
        <SettingsRow
          label="Workspace actions"
          description="Add a workspace to Multi or open it in your editor."
          controlWide
          control={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void pickWorkspace()}
              >
                Choose workspace
              </Button>
              <OpenPicker variant="settings" />
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection label="Installed harnesses">
        {descriptors.map((item) => (
          <SettingsRow
            key={item.kind}
            label={item.label}
            description={item.reason ?? "Availability is reported directly by the app server."}
            control={
              <div className="flex items-center gap-2">
                <Switch
                  checked={item.enabled}
                  onCheckedChange={(next) => void setHarnessEnabled(item.kind, next)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="min-w-[7.25rem]"
                  variant={defaultKind === item.kind ? "default" : "outline"}
                  onClick={() => void setDefaultHarness(item.kind)}
                >
                  {defaultKind === item.kind ? "Default" : "Set default"}
                </Button>
              </div>
            }
          />
        ))}
        {loading ? <div className="py-3 text-muted-foreground">Loading providers…</div> : null}
      </SettingsSection>

      <SettingsSection label="Default model">
        <SettingsRow
          label="New chat model"
          description="Default model for new chats in this project (for the harness marked default above)."
          controlWide
          control={
            <ModelPicker
              items={defaults.items}
              loading={defaults.loading}
              status={defaults.status}
              selection={{
                model: defaults.model,
                fastMode: defaults.fastMode,
                thinkingLevel: defaults.thinkingLevel,
              }}
              variant="settings"
              onSelect={(item) =>
                void writeRuntimeDefaultModel(item).catch((error) =>
                  fail(error, "Unable to save the default model."),
                )
              }
              onFastMode={(on) =>
                void writeRuntimeDefaultFastMode(on).catch((error) =>
                  fail(error, "Unable to save the default fast mode."),
                )
              }
              onThinkingLevel={(level) =>
                void writeRuntimeDefaultThinkingLevel(level).catch((error) =>
                  fail(error, "Unable to save the default thinking level."),
                )
              }
            />
          }
        />
        <SettingsRow
          label="Default thinking"
          description="Maps the Multi thinking control onto provider model options."
          control={
            <SimpleSelect
              value={defaults.thinkingLevel}
              onValueChange={(v) =>
                void writeRuntimeDefaultThinkingLevel(v as (typeof levels)[number]).catch((error) =>
                  fail(error, "Unable to save the default thinking level."),
                )
              }
              options={levels.map((item) => ({ value: item, label: item }))}
            />
          }
        />
        <SettingsRow
          label="Refresh provider state"
          description="Re-run the server provider checks after changing CLI auth or binaries outside the app."
          control={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (!api) return;
                setBusy(true);
                void api.server.refreshProviders().finally(() => setBusy(false));
              }}
            >
              {busy ? "Refreshing…" : "Refresh providers"}
            </Button>
          }
        />
      </SettingsSection>
    </div>
  );
}

export function ArchivedThreadsPanel() {
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const all = useStore(useShallow(selectThreadsAcrossEnvironments));
  const groups = useMemo(() => {
    const byId = new Map(projects.map((item) => [item.id, item] as const));
    return [...byId.values()]
      .map((project) => ({
        project,
        threads: all
          .filter((item) => item.projectId === project.id && item.archivedAt !== null)
          .toSorted((left, right) => {
            const l = left.archivedAt ?? left.createdAt;
            const r = right.archivedAt ?? right.createdAt;
            return r.localeCompare(l) || right.id.localeCompare(left.id);
          }),
      }))
      .filter((item) => item.threads.length > 0);
  }, [all, projects]);

  return (
    <div className="settings-form-page mx-auto w-full max-w-2xl px-1 py-2">
      <h1 className="font-semibold tracking-tight text-foreground">Archived chats</h1>
      {groups.length === 0 ? (
        <SettingsSection label="Archived chats">
          <SettingsRow label="Nothing archived" description="Archived chats will show up here." />
        </SettingsSection>
      ) : (
        groups.map(({ project, threads }) => (
          <SettingsSection key={project.id} label={project.name}>
            {threads.map((thread) => (
              <SettingsRow
                key={thread.id}
                label={thread.title}
                description={thread.archivedAt ?? thread.createdAt}
                control={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const orchestration = readNativeEnvironmentApi(
                        thread.environmentId,
                      )?.orchestration;
                      if (!orchestration) return;
                      void orchestration.dispatchCommand({
                        type: "thread.unarchive",
                        commandId: crypto.randomUUID() as import("@multi/contracts").CommandId,
                        threadId: thread.id,
                      });
                    }}
                  >
                    Unarchive
                  </Button>
                }
              />
            ))}
          </SettingsSection>
        ))
      )}
    </div>
  );
}

export function useSettingsRestore(onRestore?: () => void) {
  const defaults = useRuntimeDefaults();
  const providers = useServerProviders();

  const changedSettingLabels = useMemo(() => {
    const out: string[] = [];
    if (defaults.stored) out.push("Default model");
    if (providers.some((item) => item.enabled === false)) out.push("Provider enablement");
    if (APPEARANCE_KEYS.some((item) => localStorage.getItem(item) !== null)) out.push("Appearance");
    return out;
  }, [defaults.stored, providers]);

  return {
    changedSettingLabels,
    restoreDefaults: async () => {
      resetAppearanceSettings();
      await clearRuntimeDefaultModel();
      onRestore?.();
    },
  };
}
