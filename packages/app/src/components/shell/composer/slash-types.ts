/**
 * Slash / @mention launcher item kinds.
 * Reference-only notes live in component files; behavior is defined by Glass, not external UI dumps.
 */
export type SlashItemKind =
  | "skill"
  | "command"
  | "mode"
  | "subagent"
  | "model"
  | "project"
  | "open"
  | "action"
  | "tool";
