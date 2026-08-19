import { describe, expect, it, beforeAll, afterEach, vi } from "vitest";

beforeAll(() => {
  process.env.USE_LLM_GENERATION = "false";
  process.env.USE_IMAGE_GENERATION = "false";
});

afterEach(() => {
  delete process.env.GOOGLE_APPS_SCRIPT_URL;
  vi.restoreAllMocks();
});
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("activity", () => {
  it("generates 7 objective and 3 subjective questions without exposing the answer key", async () => {
    const result = await caller().activity.start();
    expect(result.attemptId).toBeTruthy();
    expect(result.questions).toHaveLength(10);
    expect(result.questions.filter(question => question.kind === "objective")).toHaveLength(7);
    expect(result.questions.filter(question => question.kind === "subjective")).toHaveLength(3);
    expect(result.questions.every(question => !("answer" in question))).toBe(true);
    expect(result.questions.every(question => question.image.startsWith("/manus-storage/") || question.image.startsWith("data:image/svg+xml"))).toBe(true);
    expect(result.questions.every(question => question.image.startsWith("/manus-storage/"))).toBe(true);
    expect(new Set(result.questions.map(question => question.image)).size).toBe(result.questions.length);
  });

  it("sends the complete payload to Apps Script when configured", async () => {
    process.env.GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 302, headers: { Location: "https://script.googleusercontent.com/macros/echo" } }));
    const api = caller();
    const attempt = await api.activity.start();
    const response = await api.activity.submit({
      attemptId: attempt.attemptId,
      studentName: "ALAN EDUARDO DOS SANTOS BARBOSA",
      objectiveAnswers: ["A", "B", "C", "D", "A", "B", "C"],
      subjectiveAnswers: ["Resposta sobre bioética.", "Resposta sobre replicação.", "Resposta sobre transcrição."],
    });
    expect(response.sheets.sent).toBe(true);
    expect(response.sheets.status).toBe(302);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("script.google.com");
  });

  it("calculates objective score on the server and accepts three essay answers", async () => {
    const api = caller();
    const attempt = await api.activity.start();
    const response = await api.activity.submit({
      attemptId: attempt.attemptId,
      studentName: "ALAN EDUARDO DOS SANTOS BARBOSA",
      objectiveAnswers: ["D", "A", "A", "A", "A", "A", "A"],
      subjectiveAnswers: ["Resposta sobre bioética.", "Resposta sobre replicação.", "Resposta sobre transcrição."],
    });
    expect(response.ok).toBe(true);
    expect(response.objectiveCount).toBe(7);
    expect(response.subjectiveCount).toBe(3);
    expect(response.sheets.sent).toBe(false);
  });
});
