import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { SessionConfig } from "@cpa/shared";
import { db } from "../db/local";
import { createSession } from "../lib/repo";
import { planSession } from "../lib/sessionPlanner";
import { buildHistory } from "../lib/stats";
import { usePaywall, usePro } from "../billing/ProProvider";
import { gateSession } from "../billing/proFeatures";

/**
 * 設定から出題を決めてセッションを作成し、実行画面へ遷移する。
 * 戻り値: セッション ID ／ null（条件に合う問題なし）／ "locked"（プロ版が必要 → 課金画面へ遷移済み）
 */
export function useStartSession() {
  const navigate = useNavigate();
  const { unlocked } = usePro();
  const openPaywall = usePaywall();
  return useCallback(
    async (requested: SessionConfig): Promise<string | null> => {
      const gate = gateSession(requested, unlocked);
      if (gate.kind === "locked") {
        openPaywall(gate.feature);
        return "locked";
      }
      const config = gate.config;
      const attempts = await db.attempts.filter((a) => !a.deletedAt).toArray();
      const cards = await db.cardStates.filter((c) => !c.deletedAt).toArray();
      const plan = planSession(config, buildHistory(attempts, cards));
      if (plan.questionIds.length === 0) return null;
      const s = await createSession(config, plan.questionIds);
      navigate(`/session/${s.id}`);
      return s.id;
    },
    [navigate, unlocked, openPaywall],
  );
}
