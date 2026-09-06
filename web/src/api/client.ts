import type { AiFeedback, ExportFile, SyncRequest, SyncResponse } from "@cpa/shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
  return body as T;
}

export interface MeResponse {
  user: { id: string; email: string; isAdmin: boolean } | null;
  aiEnabled: boolean;
  aiModel: string;
  googleEnabled: boolean;
  googleRedirectUri: string;
}

export const api = {
  me: () => request<MeResponse>("/api/auth/me"),
  signup: (email: string, password: string, signupCode: string) => request<{ user: MeResponse["user"] }>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, signupCode }) }),
  login: (email: string, password: string) => request<{ user: MeResponse["user"] }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST", body: "{}" }),
  sync: (req: SyncRequest) => request<SyncResponse>("/api/sync", { method: "POST", body: JSON.stringify(req) }),
  aiStatus: () => request<{ enabled: boolean; model: string; used: number; limit: number; allowedModels: string[] }>("/api/ai/status"),
  gradeEssay: (questionId: string, answerText: string, subLabel?: string, model?: string) =>
    request<{ feedback: AiFeedback; quota: { used: number; limit: number } }>("/api/ai/grade-essay", { method: "POST", body: JSON.stringify({ questionId, answerText, subLabel, model: model || undefined }) }),
  summarize: (body: { examDate: string; topicIds: string[]; weakPoints: { questionId: string; subLabel?: string; missedPoints: string[]; score: number; maxScore: number }[]; model?: string }) =>
    request<{ markdown: string }>("/api/ai/summarize", { method: "POST", body: JSON.stringify({ ...body, model: body.model || undefined }) }),
  exportAll: () => request<ExportFile>("/api/backup/export"),
  importAll: (mode: "merge" | "replace", file: ExportFile) => request<{ ok: true; count: number }>("/api/backup/import", { method: "POST", body: JSON.stringify({ mode, file }) }),
  snapshots: () => request<{ snapshots: { day: string; createdAt: string; hasDbDump: boolean; dbDumpBytes: number; hasUserExport: boolean; userExportBytes: number }[]; dir: string; keep: number; isAdmin: boolean }>("/api/backup/snapshots"),
  runSnapshot: () => request<{ day: string; dbDump: boolean; users: number; skipped: boolean }>("/api/backup/snapshots/run", { method: "POST", body: "{}" }),
  restoreSnapshot: (day: string, mode: "merge" | "replace") => request<{ ok: true; count: number }>(`/api/backup/snapshots/${day}/restore`, { method: "POST", body: JSON.stringify({ mode }) }),
};
