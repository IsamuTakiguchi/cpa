import { useLiveQuery } from "dexie-react-hooks";
import type { Attempt, CardState, StudySession, SummaryNote, TopicProgress, UserSettings } from "@cpa/shared";
import { db, DEFAULT_SETTINGS } from "../db/local";

const EMPTY: never[] = [];

export function useAttempts(): Attempt[] {
  return useLiveQuery(() => db.attempts.filter((a) => !a.deletedAt).toArray(), [], EMPTY as Attempt[]);
}
export function useCardStates(): CardState[] {
  return useLiveQuery(() => db.cardStates.filter((c) => !c.deletedAt).toArray(), [], EMPTY as CardState[]);
}
export function useTopicProgress(): TopicProgress[] {
  return useLiveQuery(() => db.topicProgress.filter((p) => !p.deletedAt).toArray(), [], EMPTY as TopicProgress[]);
}
export function useSessions(): StudySession[] {
  return useLiveQuery(() => db.sessions.filter((s) => !s.deletedAt).toArray(), [], EMPTY as StudySession[]);
}
export function useSummaries(): SummaryNote[] {
  return useLiveQuery(() => db.summaries.filter((s) => !s.deletedAt).toArray(), [], EMPTY as SummaryNote[]);
}
export function useSettings(): UserSettings {
  return useLiveQuery(() => db.settings.get("settings"), [], undefined) ?? ({ ...DEFAULT_SETTINGS, updatedAt: "", deviceId: "" } as UserSettings);
}
export function useSession(id: string | undefined): StudySession | undefined | null {
  return useLiveQuery(async () => (id ? await db.sessions.get(id) : undefined), [id], null);
}
