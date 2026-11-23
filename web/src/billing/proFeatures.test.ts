import { describe, expect, it } from "vitest";
import type { SessionConfig } from "@cpa/shared";
import { examPreset, PRESETS } from "../lib/sessionPlanner";
import { gateSession, isProKind } from "./proFeatures";

const custom = (kinds: SessionConfig["kinds"]): SessionConfig => ({ preset: "custom", title: "t", subjects: [], topicIds: [], kinds, maxQuestions: 10, timeLimitMinutes: 0, order: "weak", preferUnseen: true, examMode: false });

describe("gateSession（無料／プロ版の線引き）", () => {
  it("プロ版（または課金なしの Web 版）は何も変えない", () => {
    const c = examPreset("audit");
    expect(gateSession(c, true)).toEqual({ kind: "ok", config: c });
  });
  it("本試験形式と弱点補強はプロ版が必要", () => {
    expect(gateSession(examPreset("tax"), false)).toEqual({ kind: "locked", feature: "exam" });
    expect(gateSession(PRESETS.find((p) => p.id === "weak")!.build(), false)).toEqual({ kind: "locked", feature: "weak" });
  });
  it("論述・計算だけの出題はプロ版が必要", () => {
    expect(gateSession(custom(["mini", "calc"]), false)).toEqual({ kind: "locked", feature: "essay" });
  });
  it("無料の形式が含まれていれば、無料の形式だけに絞って出題する", () => {
    const r = gateSession(custom(["short", "mini"]), false);
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.config.kinds).toEqual(["short"]);
  });
  it("暗記カード・正誤・一問一答は無料", () => {
    expect(["card", "tf", "short"].map(isProKind)).toEqual([false, false, false]);
    expect(["mini", "calc", "essay"].map(isProKind)).toEqual([true, true, true]);
  });
});
