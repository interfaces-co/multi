import { useCallback, useRef } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";

import { useChatDraftStore } from "~/lib/chat-draft-store";
import { useDefaultHarness } from "~/lib/harness-picker";
import { useHarnessDescriptor } from "~/lib/harness-store";
import { clearSlash, draftSlash, slashPrefix } from "~/components/shell/composer/search";
import { ChatComposer, type ChatComposerHandle } from "~/components/shell/composer/chat";
import { HeroComposerFooter } from "./hero-composer-footer";
import { HeroStage } from "./hero-stage";
import { useRuntimeSession } from "~/components/shell/session/runtime";

function title(text: string, files: { name: string }[]) {
  const line = text.trim().split("\n")[0]?.trim();
  if (line) return line;
  return files[0]?.name ?? "New chat";
}

export function HeroCanvas() {
  const { kind: defaultKind } = useDefaultHarness();
  const cur = useChatDraftStore((state) => state.cur);
  const items = useChatDraftStore((state) => state.items);
  const root = useChatDraftStore((state) => state.root);
  const save = useChatDraftStore((state) => state.save);
  const saveRoot = useChatDraftStore((state) => state.saveRoot);
  const setActiveInteractionMode = useChatDraftStore((state) => state.setActiveInteractionMode);
  const toggleRootPlanInteraction = useChatDraftStore((state) => state.toggleRootPlanInteraction);
  const draft = cur ? (items[cur] ?? null) : null;
  const kind = draft?.harness ?? defaultKind;
  const harnessDescriptor = useHarnessDescriptor(kind);
  const session = useRuntimeSession(null, kind);
  const text = draft?.text ?? root.text;
  const files = draft?.files ?? root.files;
  const skills = draft?.skills ?? root.skills;
  const planActive = (draft?.interactionMode ?? root.interactionMode) === "plan";
  const composerRef = useRef<ChatComposerHandle>(null);

  const clearPlan = useCallback((value: string) => {
    const hit = draftSlash(value);
    if (!hit) return value;
    if (!slashPrefix(hit, "plan")) return value;
    return clearSlash(value, hit).value;
  }, []);

  const write = useCallback(
    (next: { text: string; files: typeof files; skills: typeof skills }) => {
      if (draft) {
        save(draft.id, next.text, next.files, next.skills);
        return;
      }
      saveRoot(next.text, next.files, next.skills);
    },
    [draft, save, saveRoot],
  );

  const planOn = useCallback(() => {
    write({ text: clearPlan(text), files, skills });
    setActiveInteractionMode("plan");
  }, [clearPlan, files, setActiveInteractionMode, skills, text, write]);

  const planMode = useCallback(() => {
    if (planActive) {
      toggleRootPlanInteraction();
      return;
    }
    planOn();
  }, [planActive, planOn, toggleRootPlanInteraction]);

  const togglePlan = useCallback(() => {
    if (composerRef.current) {
      composerRef.current.togglePlan();
      return;
    }
    planMode();
  }, [planMode]);

  const activatePlan = useCallback(() => {
    if (composerRef.current) {
      composerRef.current.activatePlan();
      return;
    }
    planOn();
  }, [planOn]);

  useHotkey(
    "Shift+Tab",
    (event) => {
      event.preventDefault();
      togglePlan();
    },
    { preventDefault: true },
  );

  return (
    <HeroStage
      scene={draft?.id ?? "root"}
      footer={<HeroComposerFooter onPlanMode={activatePlan} planActive={planActive} />}
    >
      <ChatComposer
        ref={composerRef}
        key={draft?.id ?? "root"}
        sessionId={null}
        draft={text}
        files={files}
        skills={skills}
        onDraft={(value) => write({ text: value, files, skills })}
        onFiles={(next) => write({ text, files: next, skills })}
        onSkills={(next) => write({ text, files, skills: next })}
        busy={session.busy}
        model={session.model}
        modelLoading={session.modelLoading}
        variant="hero"
        onAbort={session.abort}
        onModel={session.setModel}
        fastActive={session.fastActive}
        fastSupported={session.fastSupported}
        onFastMode={session.setFastMode}
        onThinkingLevel={session.setThinkingLevel}
        onPlanMode={() => setActiveInteractionMode("plan")}
        planActive={planActive}
        onPlanToggle={planMode}
        onSend={(input) =>
          session.send(
            input,
            draft
              ? {
                  id: draft.id,
                  title: title(draft.text, draft.files),
                  interactionMode: draft.interactionMode,
                }
              : null,
          )
        }
        harness={kind}
        harnessDescriptor={harnessDescriptor}
      />
    </HeroStage>
  );
}
