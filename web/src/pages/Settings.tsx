import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ExportFile } from "@cpa/shared";
import { api } from "../api/client";
import { Alert, Modal, PageTitle } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useAttempts, useSettings } from "../hooks/useData";
import { useSync } from "../hooks/useSync";
import { buildLocalExport, clearLocalData, importLocal, setAiModel, setExamDate } from "../lib/repo";
import { saveSettings } from "../db/local";
import { syncEngine } from "../sync/syncEngine";

type Snap = { day: string; createdAt: string; hasDbDump: boolean; dbDumpBytes: number; hasUserExport: boolean; userExportBytes: number };

export function SettingsPage() {
  const settings = useSettings();
  const attempts = useAttempts();
  const { user, aiEnabled, aiModel } = useAuth();
  const sync = useSync();
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<ExportFile | null>(null);
  const [snapshots, setSnapshots] = useState<Snap[] | null>(null);
  const [snapInfo, setSnapInfo] = useState<{ dir: string; keep: number; isAdmin: boolean } | null>(null);
  const [restoreDay, setRestoreDay] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSnapshots = async () => {
    try {
      const r = await api.snapshots();
      setSnapshots(r.snapshots);
      setSnapInfo({ dir: r.dir, keep: r.keep, isAdmin: r.isAdmin });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    }
  };
  useEffect(() => {
    if (user) void loadSnapshots();
  }, [user]);

  const doExport = async () => {
    const file = await buildLocalExport();
    const blob = new Blob([JSON.stringify(file, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpa-backup-${file.exportedAt.slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setMsg({ kind: "success", text: `${Object.values(file.data).reduce((s, arr) => s + arr.length, 0)} 件を書き出しました。` });
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as ExportFile;
      if (parsed.format !== "cpa-exam-app-export") throw new Error("このアプリのバックアップファイルではありません");
      setPendingImport(parsed);
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const doImport = async (mode: "merge" | "replace") => {
    if (!pendingImport) return;
    try {
      const n = await importLocal(pendingImport, mode);
      if (user && mode === "replace") await api.importAll("replace", pendingImport);
      setMsg({ kind: "success", text: `${n} 件を取り込みました（${mode === "merge" ? "統合" : "置換"}）。` });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    }
    setPendingImport(null);
  };

  const doRestore = async (mode: "merge" | "replace") => {
    if (!restoreDay) return;
    try {
      await api.restoreSnapshot(restoreDay, mode);
      // サーバー側を復元したので、この端末も置換の場合はサーバーから全件取り直す
      if (mode === "replace") {
        const exp = await api.exportAll();
        await importLocal(exp, "replace");
      }
      await syncEngine.resetCursor();
      await syncEngine.syncNow();
      setMsg({ kind: "success", text: `${restoreDay} のスナップショットへ復元しました。` });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    }
    setRestoreDay(null);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <PageTitle title="設定" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <section className="card space-y-3">
        <h2 className="font-bold">アカウントと同期</h2>
        {user ? (
          <>
            <div className="text-sm">
              ログイン中: <span className="font-medium">{user.email}</span>
              {user.isAdmin && <span className="chip bg-slate-100 text-slate-700 ml-2">管理者</span>}
            </div>
            <div className="text-sm text-slate-600">
              同期状態: {sync.status === "syncing" ? "同期中" : sync.status === "offline" ? "オフライン" : sync.status === "error" ? `エラー: ${sync.error}` : "正常"}　未送信 {sync.pending} 件
              {sync.lastSyncAt && <span>　最終同期 {new Date(sync.lastSyncAt).toLocaleString("ja-JP")}</span>}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" onClick={() => syncEngine.syncNow()}>
                今すぐ同期
              </button>
              <Link to="/auth" className="btn-ghost text-sm">
                アカウント管理
              </Link>
            </div>
          </>
        ) : (
          <div className="text-sm">
            ゲストモード（この端末のみに保存）。
            <Link to="/auth" className="underline text-brand ml-1">
              ログイン / 登録
            </Link>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">学習設定</h2>
        <div>
          <label className="label">試験日（論文式）</label>
          <input className="input max-w-xs" type="date" value={settings.examDate} onChange={(e) => e.target.value && setExamDate(e.target.value)} />
        </div>
        <div>
          <label className="label">1日の学習目標（分）</label>
          <input className="input max-w-xs" type="number" min={10} step={10} value={settings.dailyGoalMinutes} onChange={(e) => saveSettings({ dailyGoalMinutes: Number(e.target.value) || 60 })} />
        </div>
        <div>
          <label className="label">AI 採点に使うモデル</label>
          <select className="input max-w-xs" value={settings.aiModel} onChange={(e) => setAiModel(e.target.value)}>
            <option value="">サーバー既定{aiModel ? `（${aiModel}）` : ""}</option>
            <option value="claude-opus-5">claude-opus-5（最高品質）</option>
            <option value="claude-sonnet-5">claude-sonnet-5（高速・低コスト）</option>
            <option value="claude-haiku-4-5">claude-haiku-4-5（最速・最安）</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">{user ? (aiEnabled ? "AI 採点は有効です。" : "サーバーに ANTHROPIC_API_KEY が未設定のため AI 採点は無効です。") : "AI 採点はログイン時のみ利用できます。"}</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">バックアップ（この端末の全データ）</h2>
        <p className="text-sm text-slate-600">
          解答履歴・カードの復習状態・メモ・まとめノートをすべて 1 つの JSON ファイルに書き出します。現在 {attempts.length} 件の解答があります。
          {settings.lastExportAt && <span> 最終書き出し: {new Date(settings.lastExportAt).toLocaleString("ja-JP")}</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={doExport}>
            JSON を書き出す
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            JSON を読み込む
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </section>

      {user && (
        <section className="card space-y-3">
          <h2 className="font-bold">サーバー内スナップショット</h2>
          <p className="text-sm text-slate-600">
            サーバーが毎日自動で保存するバックアップです（{snapInfo?.keep ?? 30} 世代保持）。誤って消したデータを、その日の状態に戻せます。
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-sm"
              onClick={async () => {
                try {
                  const r = await api.runSnapshot();
                  setMsg({ kind: "success", text: `スナップショットを作成しました（${r.day}、DBダンプ: ${r.dbDump ? "あり" : "なし"}）` });
                  await loadSnapshots();
                } catch (e) {
                  setMsg({ kind: "error", text: (e as Error).message });
                }
              }}
            >
              今すぐ作成
            </button>
            <button className="btn-ghost text-sm" onClick={loadSnapshots}>
              更新
            </button>
          </div>
          {snapshots === null ? (
            <div className="text-sm text-slate-500">読み込み中…</div>
          ) : snapshots.length === 0 ? (
            <div className="text-sm text-slate-500">まだスナップショットはありません（起動後30秒で初回作成されます）。</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-1">日付</th>
                  <th>自分のデータ</th>
                  <th>DB全体</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.day} className="border-b border-slate-100">
                    <td className="py-1.5">{s.day}</td>
                    <td>
                      {s.hasUserExport ? (
                        <a className="underline text-brand" href={`/api/backup/snapshots/${s.day}/export`}>
                          {(s.userExportBytes / 1024).toFixed(0)} KB
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {s.hasDbDump ? (
                        snapInfo?.isAdmin ? (
                          <a className="underline text-brand" href={`/api/backup/snapshots/${s.day}/db`}>
                            {(s.dbDumpBytes / 1024).toFixed(0)} KB
                          </a>
                        ) : (
                          `${(s.dbDumpBytes / 1024).toFixed(0)} KB`
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-right">
                      {s.hasUserExport && (
                        <button className="btn-ghost text-xs" onClick={() => setRestoreDay(s.day)}>
                          復元
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="font-bold text-red-700">危険な操作</h2>
        <button className="btn-danger text-sm" onClick={() => setConfirmClear(true)}>
          この端末のデータをすべて削除
        </button>
        <p className="text-xs text-slate-500">サーバー上のデータは削除されません。ログイン中は次回同期で復元されます。</p>
      </section>

      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="バックアップの取り込み方法"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPendingImport(null)}>
              キャンセル
            </button>
            <button className="btn-danger" onClick={() => doImport("replace")}>
              置換（現在のデータを消して読み込む）
            </button>
            <button className="btn-primary" onClick={() => doImport("merge")}>
              統合（推奨）
            </button>
          </>
        }
      >
        <p>
          ファイル: {pendingImport?.exportedAt.slice(0, 16).replace("T", " ")} 書き出し、{pendingImport ? Object.values(pendingImport.data).reduce((s, arr) => s + arr.length, 0) : 0} 件
        </p>
        <p className="mt-2 text-slate-600">「統合」は新しい方の記録を残して合成します。「置換」はこの端末{user ? "とサーバー" : ""}のデータをファイルの内容で完全に置き換えます。</p>
      </Modal>

      <Modal
        open={!!restoreDay}
        onClose={() => setRestoreDay(null)}
        title={`${restoreDay} の状態へ復元`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRestoreDay(null)}>
              キャンセル
            </button>
            <button className="btn-danger" onClick={() => doRestore("replace")}>
              置換（その日の状態に戻す）
            </button>
            <button className="btn-primary" onClick={() => doRestore("merge")}>
              統合（消えた記録だけ戻す）
            </button>
          </>
        }
      >
        <p className="text-slate-600">「統合」は、その日以降に削除された記録を戻し、その後の学習記録は残します。「置換」はその日以降の記録をすべて破棄して、その日の状態に完全に戻します。</p>
      </Modal>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="この端末のデータを削除"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmClear(false)}>
              キャンセル
            </button>
            <button
              className="btn-danger"
              onClick={async () => {
                await clearLocalData();
                setConfirmClear(false);
                setMsg({ kind: "info", text: "この端末のデータを削除しました。" });
              }}
            >
              削除する
            </button>
          </>
        }
      >
        <p>先に「JSON を書き出す」でバックアップを取ることをおすすめします。</p>
      </Modal>
    </div>
  );
}
