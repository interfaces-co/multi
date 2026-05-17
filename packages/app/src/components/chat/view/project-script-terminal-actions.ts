import type { TerminalOpenInput, ThreadId } from "@multi/contracts";

const SCRIPT_TERMINAL_COLS = 120;
const SCRIPT_TERMINAL_ROWS = 30;

export function resolveProjectScriptTerminalTarget(input: {
  activeTerminalId: string | null | undefined;
  terminalIds: readonly string[];
  runningTerminalIds: readonly string[];
  fallbackTerminalId: string;
  preferNewTerminal?: boolean | undefined;
  createTerminalId: () => string;
  worktreePath: string | null;
}) {
  const baseTerminalId = input.activeTerminalId || input.terminalIds[0] || input.fallbackTerminalId;
  const isBaseTerminalBusy = input.runningTerminalIds.includes(baseTerminalId);
  const shouldCreateNewTerminal = Boolean(input.preferNewTerminal) || isBaseTerminalBusy;

  return {
    terminalId: shouldCreateNewTerminal ? input.createTerminalId() : baseTerminalId,
    shouldCreateNewTerminal,
    worktreePath: input.worktreePath,
  };
}

export function buildProjectScriptTerminalOpenInput(input: {
  threadId: ThreadId;
  terminalId: string;
  cwd: string;
  worktreePath: string | null;
  env: Record<string, string>;
  shouldCreateNewTerminal: boolean;
}): TerminalOpenInput {
  const baseInput = {
    threadId: input.threadId,
    terminalId: input.terminalId,
    cwd: input.cwd,
    ...(input.worktreePath !== null ? { worktreePath: input.worktreePath } : {}),
    env: input.env,
  };

  return input.shouldCreateNewTerminal
    ? { ...baseInput, cols: SCRIPT_TERMINAL_COLS, rows: SCRIPT_TERMINAL_ROWS }
    : baseInput;
}
