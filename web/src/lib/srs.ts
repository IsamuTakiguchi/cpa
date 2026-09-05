/**
 * 間隔反復（SM-2 系）。
 * rating: 0=もう一度, 1=難しい, 2=普通, 3=簡単
 */
import type { CardState } from "@cpa/shared";

export type Rating = 0 | 1 | 2 | 3;

export const RATING_LABELS: Record<Rating, string> = { 0: "もう一度", 1: "難しい", 2: "普通", 3: "簡単" };

export function newCardState(cardId: string, topicId: string, subject: string, deviceId: string, now = new Date()): CardState {
  return {
    id: cardId,
    topicId,
    subject,
    ease: 2.5,
    intervalDays: 0,
    dueAt: now.toISOString(),
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
    updatedAt: now.toISOString(),
    deletedAt: null,
    deviceId,
  };
}

/** 復習結果を反映した新しい状態を返す（元の状態は変更しない） */
export function review(state: CardState, rating: Rating, deviceId: string, now = new Date()): CardState {
  let { ease, intervalDays, reps, lapses } = state;
  if (rating === 0) {
    lapses += 1;
    reps = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) intervalDays = rating === 1 ? 1 : rating === 2 ? 1 : 3;
    else if (reps === 2) intervalDays = rating === 1 ? 2 : rating === 2 ? 4 : 7;
    else {
      const factor = rating === 1 ? 1.2 : rating === 2 ? ease : ease * 1.3;
      intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * factor));
    }
    ease = Math.max(1.3, ease + (rating === 1 ? -0.15 : rating === 2 ? 0 : 0.15));
    intervalDays = Math.min(intervalDays, 180);
  }
  const due = new Date(now);
  if (intervalDays === 0) due.setMinutes(due.getMinutes() + 10);
  else {
    due.setDate(due.getDate() + intervalDays);
    due.setHours(4, 0, 0, 0);
  }
  return {
    ...state,
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    reps,
    lapses,
    dueAt: due.toISOString(),
    lastReviewedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deviceId,
  };
}

export function isDue(state: CardState, now = new Date()): boolean {
  return new Date(state.dueAt).getTime() <= now.getTime();
}

/** 予告表示用: 各評価を選んだ場合の次回間隔 */
export function previewIntervals(state: CardState): Record<Rating, string> {
  const fmt = (s: CardState) => (s.intervalDays === 0 ? "10分" : `${s.intervalDays}日`);
  return { 0: fmt(review(state, 0, "")), 1: fmt(review(state, 1, "")), 2: fmt(review(state, 2, "")), 3: fmt(review(state, 3, "")) };
}
