import { describe, expect, it } from "vitest";

import {
  extractAskQuestions,
  extractPlanMarkdown,
  extractTodosAsPlan,
  toCursorAskQuestionAnswers,
} from "./CursorAcpExtension.ts";

describe("CursorAcpExtension", () => {
  it("extracts ask-question prompts from the real Cursor ACP payload shape", () => {
    const questions = extractAskQuestions({
      toolCallId: "ask-1",
      title: "Need input",
      questions: [
        {
          id: "language",
          prompt: "Which language should I use?",
          options: [
            { id: "ts", label: "TypeScript" },
            { id: "rs", label: "Rust" },
          ],
          allowMultiple: false,
        },
      ],
    });

    expect(questions).toEqual([
      {
        id: "language",
        header: "Question",
        question: "Which language should I use?",
        multiSelect: false,
        options: [
          { label: "TypeScript", description: "TypeScript" },
          { label: "Rust", description: "Rust" },
        ],
      },
    ]);
  });

  it("defaults ask-question multi-select to false when Cursor omits allowMultiple", () => {
    const questions = extractAskQuestions({
      toolCallId: "ask-2",
      questions: [
        {
          id: "mode",
          prompt: "Which mode should I use?",
          options: [
            { id: "agent", label: "Agent" },
            { id: "plan", label: "Plan" },
          ],
        },
      ],
    });

    expect(questions).toEqual([
      {
        id: "mode",
        header: "Question",
        question: "Which mode should I use?",
        multiSelect: false,
        options: [
          { label: "Agent", description: "Agent" },
          { label: "Plan", description: "Plan" },
        ],
      },
    ]);
  });

  it("maps canonical answer labels back to Cursor option ids", () => {
    const answers = toCursorAskQuestionAnswers(
      {
        toolCallId: "ask-3",
        questions: [
          {
            id: "surface",
            prompt: "Which surface?",
            options: [
              { id: "right_workbench", label: "Right workbench Plan/Tasks panel" },
              { id: "both", label: "Both workbench and composer as one cohesive pass" },
            ],
          },
          {
            id: "checks",
            prompt: "Which checks?",
            allowMultiple: true,
            options: [
              { id: "typecheck", label: "Typecheck" },
              { id: "browser", label: "Browser smoke" },
            ],
          },
        ],
      },
      {
        surface: "Both workbench and composer as one cohesive pass",
        checks: ["Typecheck", "Browser smoke"],
      },
    );

    expect(answers).toEqual({
      surface: "both",
      checks: ["typecheck", "browser"],
    });
  });

  it("extracts plan markdown from the real Cursor create-plan payload shape", () => {
    const planMarkdown = extractPlanMarkdown({
      toolCallId: "plan-1",
      name: "Refactor parser",
      overview: "Tighten ACP parsing",
      plan: "# Plan\n\n1. Add schemas\n2. Remove casts",
      todos: [
        { id: "t1", content: "Add schemas", status: "in_progress" },
        { id: "t2", content: "Remove casts", status: "pending" },
      ],
      isProject: false,
    });

    expect(planMarkdown).toBe("# Plan\n\n1. Add schemas\n2. Remove casts");
  });

  it("projects todo updates into a plan shape and drops invalid entries", () => {
    expect(
      extractTodosAsPlan({
        toolCallId: "todos-1",
        todos: [
          { id: "1", content: "Inspect state", status: "completed" },
          { id: "2", content: "  Apply fix  ", status: "in_progress" },
          { id: "3", title: "Fallback title", status: "pending" },
          { id: "4", content: "Unknown status", status: "weird_status" },
          { id: "5", content: "   " },
        ],
        merge: true,
      }),
    ).toEqual({
      plan: [
        { step: "Inspect state", status: "completed" },
        { step: "Apply fix", status: "inProgress" },
        { step: "Fallback title", status: "pending" },
        { step: "Unknown status", status: "pending" },
      ],
    });
  });
});
