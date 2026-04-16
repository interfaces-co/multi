/**
 * Draft store shim: orchestration-backed state owns real drafts; this module exposes
 * the subset of types and APIs the shell composer expects (backed by composerDraftStore).
 *
 * TODO: Wire the real c-t3 composerDraftStore methods into the hooks below.
 */

import type { HarnessKind } from "~/lib/ui-session-types";
import { create } from "zustand";

export interface ChatDraftFile {
  type: "path" | "inline";
  path: string;
  name: string;
  kind: "file" | "image";
  mimeType?: string;
  data?: string;
  size?: number;
}

export interface ChatDraftSkill {
  id: string;
  name: string;
}

export interface ChatDraftSnapshot {
  id: string;
  text: string;
  files: ChatDraftFile[];
  skills: ChatDraftSkill[];
  cwd: string;
  harness: HarnessKind;
  interactionMode: "default" | "plan";
  createdAt: string;
  modifiedAt: string;
}

interface ChatDraftState {
  root: {
    text: string;
    files: ChatDraftFile[];
    skills: ChatDraftSkill[];
    interactionMode: "default" | "plan";
  };
  items: Record<string, ChatDraftSnapshot>;
  cur: string | null;
  pick: (id: string | null) => void;
  park: (cwd: string, harness: HarnessKind) => string | null;
  save: (id: string, text: string, files: ChatDraftFile[], skills: ChatDraftSkill[]) => void;
  saveRoot: (text: string, files: ChatDraftFile[], skills: ChatDraftSkill[]) => void;
  toggleRootPlanInteraction: () => void;
  setActiveInteractionMode: (mode: "default" | "plan") => void;
  drop: (id: string) => void;
  promote: (id: string) => void;
}

export const useChatDraftStore = create<ChatDraftState>()((set) => ({
  root: { text: "", files: [], skills: [], interactionMode: "default" },
  items: {},
  cur: null,
  pick: (id) => set({ cur: id }),
  park: () => null,
  save: () => {},
  saveRoot: (text, files, skills) => set((s) => ({ root: { ...s.root, text, files, skills } })),
  toggleRootPlanInteraction: () =>
    set((s) => ({
      root: {
        ...s.root,
        interactionMode: s.root.interactionMode === "plan" ? "default" : "plan",
      },
    })),
  setActiveInteractionMode: (mode) => set((s) => ({ root: { ...s.root, interactionMode: mode } })),
  drop: () => {},
  promote: () => {},
}));

export function hasDraft(text: string, files: ChatDraftFile[]): boolean {
  return text.trim().length > 0 || files.length > 0;
}
