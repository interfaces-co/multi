// @ts-nocheck
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHarnessDescriptor } from "~/lib/harness-store";
import {
  isThreadPending,
  useThreadSessionStore,
  useThreadSummary,
} from "~/lib/thread-session-store";
import { selectBootstrapCompleteForActiveEnvironment, useStore } from "~/store";
import { createThreadSelectorAcrossEnvironments } from "~/storeSelectors";
import { AskTool } from "./ask-tool";
import { HeroComposerFooter } from "./hero-composer-footer";
import { ChatComposer, type ChatComposerHandle } from "~/components/shell/composer/chat";
import { HeroStage } from "./hero-stage";
import { ChatMessages } from "./messages";
import { ProviderNoticeBanner } from "~/components/shell/provider/notice-banner";
import { RootShell } from "~/components/shell/shell/root";
import { useRuntimeSession } from "~/components/shell/session/runtime";
import { deriveWorkLogEntries } from "~/lib/work-log";
import { clearSlash, draftSlash, slashPrefix } from "~/components/shell/composer/search";
import { Skeleton } from "~/components/ui/skeleton";

export function ThreadChatSession(props: { sessionId: string }) {
  const reduce = useReducedMotion();
  const sum = useThreadSummary(props.sessionId);
  const snap = useThreadSessionStore((state) => state.snaps[props.sessionId]);
  const boot = useStore(selectBootstrapCompleteForActiveEnvironment);
  const thread =
    useStore(
      useMemo(() => createThreadSelectorAcrossEnvironments(props.sessionId), [props.sessionId]),
    ) ?? null;
  const count = sum?.messageCount ?? snap?.messages.length ?? thread?.messages.length ?? 0;
  const live =
    isThreadPending(props.sessionId) ||
    Boolean(snap?.live) ||
    Boolean(snap?.isStreaming) ||
    thread?.session?.orchestrationStatus === "starting" ||
    thread?.session?.orchestrationStatus === "running";
  const provider = thread?.session?.provider ?? thread?.modelSelection.provider ?? null;
  const load = !boot && !thread && !sum && !snap;

  return (
    <motion.div
      key={props.sessionId}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      style={{ willChange: "opacity" }}
    >
      <RootShell>
        <ProviderNoticeBanner
          sessionId={props.sessionId}
          provider={provider}
          activities={thread?.activities ?? []}
        />
        {load ? (
          <BootView />
        ) : count === 0 && !live ? (
          <HeroSession sessionId={props.sessionId} />
        ) : (
          <DockSession sessionId={props.sessionId} />
        )}
      </RootShell>
    </motion.div>
  );
}

function BootView() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[43.875rem] flex-1 flex-col gap-6 px-4 py-4 md:px-8 md:py-6">
      <div className="flex flex-1 flex-col gap-4 pt-4">
        <Skeleton className="h-18 w-[78%] rounded-chrome-card bg-muted/24" />
        <Skeleton className="h-28 w-[90%] rounded-chrome-card bg-muted/18" />
        <Skeleton className="h-22 w-[72%] rounded-chrome-card bg-muted/16" />
      </div>
      <div className="shrink-0 rounded-[1.75rem] border border-white/8 bg-black/10 p-3 shadow-chrome-card backdrop-blur-xl">
        <Skeleton className="h-28 w-full rounded-[1.25rem] bg-muted/18" />
      </div>
    </div>
  );
}

function HeroSession(props: { sessionId: string }) {
  const [draft, setDraft] = useState("");
  const sum = useThreadSummary(props.sessionId);
  const snap = useThreadSessionStore((state) => state.snaps[props.sessionId]);
  const thread =
    useStore(
      useMemo(() => createThreadSelectorAcrossEnvironments(props.sessionId), [props.sessionId]),
    ) ?? null;
  const kind = sum?.harness ?? snap?.harness ?? "codex";
  const harnessDescriptor = useHarnessDescriptor(kind);
  const session = useRuntimeSession(props.sessionId, kind);
  const composerRef = useRef<ChatComposerHandle>(null);
  const prevSession = useRef(props.sessionId);

  const clearPlan = useCallback((value: string) => {
    const hit = draftSlash(value);
    if (!hit) return value;
    if (!slashPrefix(hit, "plan")) return value;
    return clearSlash(value, hit).value;
  }, []);

  const planOn = useCallback(() => {
    setDraft((cur) => clearPlan(cur));
    session.setInteractionMode("plan");
  }, [clearPlan, session]);

  const planMode = useCallback(() => {
    if (!thread) return;
    if (thread.interactionMode === "plan") {
      session.setInteractionMode("default");
      return;
    }
    planOn();
  }, [planOn, session, thread]);

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

  useLayoutEffect(() => {
    setDraft("");
  }, [props.sessionId]);

  useEffect(() => {
    if (prevSession.current !== props.sessionId) {
      prevSession.current = props.sessionId;
      composerRef.current?.focus();
    }
  }, [props.sessionId]);

  return (
    <HeroStage
      scene={props.sessionId}
      footer={
        <HeroComposerFooter
          onPlanMode={activatePlan}
          planActive={thread?.interactionMode === "plan"}
        />
      }
    >
      <div className="relative w-full">
        <ChatComposer
          ref={composerRef}
          sessionId={props.sessionId}
          draft={draft}
          onDraft={setDraft}
          busy={session.busy}
          model={session.model}
          modelLoading={session.modelLoading}
          variant="hero"
          onAbort={session.abort}
          onModel={session.setModel}
          fastActive={session.fastActive}
          fastSupported={session.fastSupported}
          onFastMode={session.setFastMode}
          onFastToggle={session.toggleFastMode}
          onThinkingLevel={session.setThinkingLevel}
          onPlanMode={() => session.setInteractionMode("plan")}
          planActive={thread?.interactionMode === "plan"}
          onPlanToggle={planMode}
          onSend={session.send}
          harness={kind}
          harnessDescriptor={harnessDescriptor}
        />
        <AnimatePresence>
          {session.ask ? <AskTool state={session.ask} onReply={session.answerAsk} /> : null}
        </AnimatePresence>
      </div>
    </HeroStage>
  );
}

function DockSession(props: { sessionId: string }) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const sum = useThreadSummary(props.sessionId);
  const snap = useThreadSessionStore((state) => state.snaps[props.sessionId]);
  const thread =
    useStore(
      useMemo(() => createThreadSelectorAcrossEnvironments(props.sessionId), [props.sessionId]),
    ) ?? null;
  const kind = sum?.harness ?? snap?.harness ?? "codex";
  const harnessDescriptor = useHarnessDescriptor(kind);
  const session = useRuntimeSession(props.sessionId, kind);
  const workLog = useMemo(
    () => (thread ? deriveWorkLogEntries(thread.activities, thread.latestTurn?.turnId) : []),
    [thread],
  );
  const plans = useMemo(() => thread?.proposedPlans ?? [], [thread]);
  const composerRef = useRef<ChatComposerHandle>(null);

  const clearPlan = useCallback((value: string) => {
    const hit = draftSlash(value);
    if (!hit) return value;
    if (!slashPrefix(hit, "plan")) return value;
    return clearSlash(value, hit).value;
  }, []);

  const planOn = useCallback(() => {
    setDraft((cur) => clearPlan(cur));
    session.setInteractionMode("plan");
  }, [clearPlan, session]);

  const planMode = useCallback(() => {
    if (!thread) return;
    if (thread.interactionMode === "plan") {
      session.setInteractionMode("default");
      return;
    }
    planOn();
  }, [planOn, session, thread]);

  const togglePlan = useCallback(() => {
    if (composerRef.current) {
      composerRef.current.togglePlan();
      return;
    }
    planMode();
  }, [planMode]);

  useHotkey(
    "Shift+Tab",
    (event) => {
      event.preventDefault();
      togglePlan();
    },
    { preventDefault: true },
  );

  useEffect(() => {
    setDraft("");
    setExpanded(false);
  }, [props.sessionId]);

  useHotkey(
    "Mod+O",
    (event) => {
      event.preventDefault();
      setExpanded((cur) => !cur);
    },
    { preventDefault: true },
  );

  return (
    <>
      <ChatMessages
        items={session.messages}
        work={session.work}
        workLog={workLog}
        plans={plans}
        busy={session.busy}
        thinking={session.thinking}
        since={session.since}
        expanded={expanded}
      />
      <div className="relative">
        <ChatComposer
          ref={composerRef}
          sessionId={props.sessionId}
          draft={draft}
          onDraft={setDraft}
          busy={session.busy}
          model={session.model}
          modelLoading={session.modelLoading}
          variant="dock"
          onAbort={session.abort}
          onModel={session.setModel}
          fastActive={session.fastActive}
          fastSupported={session.fastSupported}
          onFastMode={session.setFastMode}
          onFastToggle={session.toggleFastMode}
          onThinkingLevel={session.setThinkingLevel}
          onPlanMode={() => session.setInteractionMode("plan")}
          planActive={thread?.interactionMode === "plan"}
          onPlanToggle={planMode}
          onSend={session.send}
          harness={kind}
          harnessDescriptor={harnessDescriptor}
        />
        <AnimatePresence>
          {session.ask ? <AskTool state={session.ask} onReply={session.answerAsk} /> : null}
        </AnimatePresence>
      </div>
    </>
  );
}
