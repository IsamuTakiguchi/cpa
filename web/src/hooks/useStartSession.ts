import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { SessionConfig } from "@cpa/shared";
import { db } from "../db/local";
import { createSession } from "../lib/repo";
import { planSession } from "../lib/sessionPlanner";
import { buildHistory } from "../lib/stats";

/** 設定から出題を決めてセッションを作成し、実行画面へ遷移する */
export function useStartSession() {
  const navigate = useNavigate();
  return useCallback(
    async (config: SessionConfig): Promise<string | null> => {
      const attempts = await db.attempts.filter((a) => !a.deletedAt).toArray();
      const cards = await db.cardStates.filter((c) => !c.deletedAt).toArray();
      const plan = planSession(config, buildHistory(attempts, cards));
      if (plan.questionIds.length === 0) return null;
      const s = await createSession(config, plan.questionIds);
      navigate(`/session/${s.id}`);
      return s.id;
    },
    [navigate],
  );
}
