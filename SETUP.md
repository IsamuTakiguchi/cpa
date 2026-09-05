# セットアップ手順（Railway 運用）

このアプリは 1 つの Railway プロジェクトで動きます。

- **web+api サービス**: Node（Hono）が API を提供し、ビルド済みのフロント（Vite/React）を同じ URL で配信します
- **Postgres サービス**: 学習データの保存先（Railway 公式テンプレート、永続ボリューム付き）

所要時間はおよそ 20 分です。料金は Hobby プラン（月 5 ドル、使用量クレジット 5 ドル込み）を想定しています。

---

## 1. Railway プロジェクトを作る

1. https://railway.com にログイン（GitHub アカウントで可）。
2. **New Project** → **Deploy from GitHub repo** → このリポジトリ（`IsamuTakiguchi/cpa`）を選ぶ。
   - 初回は GitHub 連携の許可を求められます。
3. サービスが 1 つ作られます（これが web+api サービス）。ビルドは自動で `Dockerfile` が使われます（`railway.json` で指定済み）。

## 2. Postgres を追加する

1. プロジェクト画面で **+ Create** → **Database** → **Add PostgreSQL**。
2. 追加された Postgres サービスの **Variables** タブに `DATABASE_URL` があることを確認します（自動生成）。

## 3. 環境変数を設定する

web+api サービスの **Variables** タブで以下を追加します。

| 変数名 | 値 | 説明 |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Postgres サービスへの参照（この書き方で自動的に接続文字列が入ります） |
| `SESSION_SECRET` | 長いランダム文字列 | 例: ターミナルで `openssl rand -hex 32` を実行した結果 |
| `SIGNUP_CODE` | 自分だけが知る文字列 | 新規登録に必要な招待コード。第三者の登録を防ぎます |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | AI 採点・まとめ生成に使用。未設定でも他の機能はすべて動きます |
| `AI_MODEL` | `claude-opus-5` | AI 採点の既定モデル。コストを抑えたい場合は `claude-sonnet-5` |
| `AI_DAILY_LIMIT` | `40` | 1 日あたりの AI 呼び出し上限（コスト暴走防止） |
| `BACKUP_DIR` | `/data/backups` | サーバー内スナップショットの保存先（次の手順でボリュームを付けます） |
| `BACKUP_KEEP` | `30` | スナップショットの保持世代数 |
| `COOKIE_SECURE` | `true` | HTTPS 前提の Cookie 設定（Railway は HTTPS なので true） |

> Anthropic API キーは https://console.anthropic.com で発行します。従量課金です。採点 1 回あたりの目安は数円〜十数円です（モデルと答案の長さで変わります）。

## 4. スナップショット用ボリュームを付ける

web+api サービスを右クリック（または **Settings**）→ **Volumes** → **Add Volume** → Mount path に `/data` を指定します。
ここに毎日の `pg_dump` と、ユーザーごとの学習データ JSON が 30 世代保存されます。

## 5. 公開 URL を発行する

web+api サービスの **Settings** → **Networking** → **Generate Domain**。
`xxxx.up.railway.app` のような URL が発行されます。ポートを聞かれたら `3000` を指定します。

デプロイが完了したら `https://<URL>/api/health` を開き、`{"ok":true,...}` が返ることを確認します。

## 6. 初回登録

1. 発行された URL を開く → 右上「ゲスト」または左メニュー「ログイン / 登録」→ **新規登録**。
2. メールアドレス、パスワード（10 文字以上）、`SIGNUP_CODE` に設定した招待コードを入力。
3. **最初に登録したユーザーが管理者**になります（DB 全体のダンプをダウンロードできます）。

スマホでも同じ URL を開いてログインすれば、同じデータが同期されます。
iPhone は Safari の共有ボタン → **ホーム画面に追加**、Android は Chrome のメニュー → **アプリをインストール** でアプリのように使えます。

## 7. Railway のバックアップを有効にする

Postgres サービスの **Volume** を選び **Backups** タブで、**Daily**（6 日保持）・**Weekly**（27 日保持）・**Monthly**（89 日保持）をすべて有効にします。
手動バックアップもこの画面から取れます。復元は同じ画面から「Restore」を選ぶと、新しいボリュームとして復元内容がステージされます。

---

## バックアップの全体像（4 層）

| 層 | 何が守られるか | 場所 | 操作 |
|---|---|---|---|
| 1. Railway ボリュームバックアップ | DB 全体 | Railway | 手順 7 で有効化。Railway の画面から復元 |
| 2. サーバー内スナップショット | DB 全体（pg_dump）＋ユーザー別 JSON、日次 30 世代 | web+api サービスの `/data/backups` | アプリの **設定 → サーバー内スナップショット** から一覧・ダウンロード・「その日の状態へ復元」 |
| 3. アプリ内エクスポート | 自分の全学習データ（JSON 1 ファイル） | 自分の PC / スマホ | **設定 → JSON を書き出す / 読み込む**。7 日以上書き出していないとホームにリマインドが出ます |
| 4. 端末内フルコピー | 自分の全学習データ | 各端末のブラウザ（IndexedDB） | 常時自動。オフラインでも学習でき、クラウド障害時も端末側から書き出せます |

### 復元の使い分け

- **誤って削除した・おかしくなった** → 設定のスナップショット一覧で該当日を選び「統合」（消えた記録だけ戻す）または「置換」（その日の状態に完全に戻す）
- **Railway の Postgres が壊れた** → Railway のボリュームバックアップから復元。または管理者が `db.dump` をダウンロードし、新しい Postgres に `pg_restore -d "$DATABASE_URL" --clean --if-exists db.dump` で戻す
- **別のサービスに移行したい** → JSON エクスポートを新環境で読み込む（データ形式は `shared/src/sync/types.ts` の `ExportFile`）

---

## 更新（新しい教材や機能の反映）

`main` ブランチに push すると Railway が自動で再ビルド・再デプロイします。データベースのマイグレーションは起動時に自動で適用されます。

## ローカルで動かす（開発者向け）

```bash
npm install
# Postgres を用意（例: docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16）
cp .env.example .env   # DATABASE_URL などを編集
npm run dev            # web: http://localhost:5173 / api: http://localhost:3000
```

本番と同じ構成で試す場合:

```bash
npm run build
DATABASE_URL=... SESSION_SECRET=... SIGNUP_CODE=... npm start   # http://localhost:3000
```

テスト:

```bash
npm run typecheck && npm run lint
npm test              # server のテストはローカルの Postgres (localhost:5432, postgres/postgres) を使います
```

## 動作確認チェックリスト（構築後）

- [ ] `/api/health` が `{"ok":true}` を返す
- [ ] 招待コード無しでは登録できない（403）
- [ ] 登録 → ログアウト → ログインできる
- [ ] PC で解答した内容がスマホに反映される（設定の「今すぐ同期」で即時）
- [ ] 論述で「AI に採点してもらう」が動く（API キー設定時）
- [ ] 設定 → サーバー内スナップショット に翌日以降エントリが増える（起動 30 秒後に初回作成）
- [ ] 設定 → JSON を書き出す でファイルがダウンロードできる
- [ ] Railway の Postgres ボリュームで Backups が有効になっている
