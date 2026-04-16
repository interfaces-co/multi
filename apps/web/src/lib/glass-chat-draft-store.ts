/**
 * Shim for Glass's draft store. The actual draft management is handled by
 * c-t3's composerDraftStore. This file re-exports the subset of types and
 * store API that Glass UI components depend on, backed by c-t3's store.
 *
 * TODO: Wire the real c-t3 composerDraftStore methods into the hooks below.
 */

import type { HarnessKind } from "~/lib/glass-types";
import { create } from "zustand";

export interface GlassDraftFile {
  type: "path" | "inline";
  path: string;
  name: string;
  kind: "file" | "image";
  mimeType?: string;
  data?: string;
  size?: number;
}

export interface GlassDraftSkill {
  id: string;
  name: string;
}

export interface GlassDraftChat {
  id: string;
  text: string;
  files: GlassDraftFile[];
  skills: GlassDraftSkill[];
  cwd: string;
  harness: HarnessKind;
  interactionMode: "default" | "plan";
  createdAt: string;
  modifiedAt: string;
}

interface GlassChatDraftState {
  root: {
    text: string;
    files: GlassDraftFile[];
    skills: GlassDraftSkill[];
    interactionMode: "default" | "plan";
  };
  items: Record<string, GlassDraftChat>;
  cur: string | null;
  pick: (id: string | null) => void;
  park: (cwd: string, harness: HarnessKind) => string | null;
  save: (id: string, text: string, files: GlassDraftFile[], skills: GlassDraftSkill[]) => void;
  saveRoot: (text: string, files: GlassDraftFile[], skills: GlassDraftSkill[]) => void;
  toggleRootPlanInteraction: () => void;
  setActiveInteractionMode: (mode: "default" | "plan") => void;
  drop: (id: string) => void;
  promote: (id: string) => void;
}

export const useGlassChatDraftStore = create<GlassChatDraftState>()((set) => ({
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

export function hasDraft(text: string, files: GlassDraftFile[]): boolean {
  return text.trim().length > 0 || files.length > 0;
}
