import { rank } from "./search";
import { recentBoost, type SlashRecentsSnapshot } from "./slash-recents";
import type { SlashItemKind } from "./slash-types";

export type { SlashItemKind } from "./slash-types";

export type SlashAction =
  | "new-chat"
  | "open-settings"
  | "open-model-picker"
  | "plan-mode"
  | "default-mode"
  | "fast-mode";

type SlashBase = {
  id: string;
  name: string;
  description?: string;
  pill: string;
};

export type SlashItem =
  | (SlashBase & { kind: "skill" })
  | (SlashBase & { kind: Exclude<SlashItemKind, "skill">; action: SlashAction });

export type SlashMenuRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "more"; key: string; count: number }
  | { kind: "option"; item: SlashItem; optionIndex: number };

const GROUPS: ReadonlyArray<{ kind: SlashItemKind; label: string; key: string }> = [
  { kind: "skill", label: "Skills", key: "skills" },
  { kind: "command", label: "Commands", key: "commands" },
  { kind: "mode", label: "Modes", key: "modes" },
  { kind: "subagent", label: "Subagents", key: "subagents" },
  { kind: "model", label: "Models", key: "models" },
  { kind: "open", label: "Open", key: "open" },
  { kind: "action", label: "Actions", key: "actions" },
  { kind: "tool", label: "Tools", key: "tools" },
] as const;

const GROUP_PREVIEW_LIMIT = 3;

function rankSlashItems(
  items: SlashItem[],
  query: string,
  snap: SlashRecentsSnapshot,
): SlashItem[] {
  const base = query.trim() ? rank(items, query, (item) => item.name) : items;
  return base.toSorted((left, right) => {
    const a = recentBoost(left.id, left.kind, snap) * 4 + (100 - Math.min(left.name.length, 64));
    const b = recentBoost(right.id, right.kind, snap) * 4 + (100 - Math.min(right.name.length, 64));
    return b - a;
  });
}

export function buildSlashMenuRows(
  items: SlashItem[],
  query: string,
  snap: SlashRecentsSnapshot,
  expandedGroups: ReadonlySet<string> = new Set(),
): SlashMenuRow[] {
  const trimmedQuery = query.trim();
  const ranked = rankSlashItems(items, query, snap);
  const byKind = (kind: SlashItemKind) => ranked.filter((item) => item.kind === kind);

  const rows: SlashMenuRow[] = [];
  let optionIndex = 0;

  const push = (kind: SlashItemKind, label: string, key: string) => {
    const list = byKind(kind);
    if (list.length === 0) return;
    rows.push({ kind: "header", key, label });
    const visible =
      trimmedQuery || expandedGroups.has(key) ? list : list.slice(0, GROUP_PREVIEW_LIMIT);
    for (const item of visible) {
      rows.push({ kind: "option", item, optionIndex: optionIndex++ });
    }
    const hidden = list.length - visible.length;
    if (hidden > 0) {
      rows.push({ kind: "more", key: `${key}:more`, count: hidden });
    }
  };

  for (const group of GROUPS) {
    push(group.kind, group.label, group.key);
  }

  return rows;
}
