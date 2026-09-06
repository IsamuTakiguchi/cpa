// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { allDiagrams, SUBJECTS } from "@cpa/shared";

/**
 * 教材内の全 Mermaid 図が構文的に正しいことを検証する（描画はしない）。
 */
describe("Mermaid 図解の構文", () => {
  it("全論点の図解と科目体系マップがパースできる", async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    const targets: { id: string; src: string }[] = [
      ...allDiagrams().map(({ diagram }) => ({ id: diagram.id, src: diagram.mermaid })),
      ...SUBJECTS.map((s) => ({ id: `${s.id}:systemMap`, src: s.systemMap.mermaid })),
    ];
    expect(targets.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const t of targets) {
      try {
        const ok = await mermaid.parse(t.src, { suppressErrors: false });
        if (!ok) failures.push(`${t.id}: parse returned false`);
      } catch (e) {
        failures.push(`${t.id}: ${(e as Error).message.split("\n")[0]}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  }, 120000);

  it("体系マップの nodeTopics が図中のノード id と実在する論点を指す", () => {
    for (const s of SUBJECTS) {
      const topicIds = new Set(s.topics.map((t) => t.id));
      for (const [node, topicId] of Object.entries(s.systemMap.nodeTopics)) {
        expect(topicIds.has(topicId), `${s.id}: ${node} → ${topicId}`).toBe(true);
        expect(new RegExp(`(^|[\\s\\(\\[>-])${node}[\\[\\(\\{\\s]`, "m").test(s.systemMap.mermaid), `${s.id}: ノード ${node} が図中にない`).toBe(true);
      }
    }
  });
});
