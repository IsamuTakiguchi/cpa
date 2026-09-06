#!/usr/bin/env bash
# =============================================================================
# Railway への構築＋デプロイを 1 コマンドで行う冪等スクリプト。
#
#   RAILWAY_API_TOKEN=<アカウントトークン> bash scripts/railway-deploy.sh
#
# 初回はプロジェクト・Postgres・web サービス・環境変数・ボリューム・ドメインを作成し、
# 2 回目以降は「無いものだけ作って」デプロイします。GitHub Actions（deploy.yml）からも
# 手元の PC からも同じように使えます。
#
# 任意の環境変数:
#   RAILWAY_PROJECT_NAME  プロジェクト名（既定: cpa）
#   RAILWAY_WORKSPACE     ワークスペース名/ID（複数ある場合のみ必要）
#   RAILWAY_ENVIRONMENT   環境名（既定: production）
#   ANTHROPIC_API_KEY     設定すると AI 採点が有効になる
#   AI_MODEL              AI 採点の既定モデル（既定: claude-opus-5）
#   SKIP_DEPLOY=1         構築だけ行いデプロイしない
# =============================================================================
set -euo pipefail

PROJECT_NAME="${RAILWAY_PROJECT_NAME:-cpa}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
WEB_SERVICE="web"
MOUNT_PATH="/data"
PORT=3000

summary_lines=()
note() { echo "::notice::$*" 2>/dev/null || true; echo "  -> $*"; }
step() { echo; echo "==> $*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }
add_summary() { summary_lines+=("$1"); }

[[ -n "${RAILWAY_API_TOKEN:-}" ]] || fail "RAILWAY_API_TOKEN が設定されていません。Railway → Account Settings → Tokens で発行し、GitHub の Secrets（RAILWAY_API_TOKEN）に登録してください。"
command -v railway >/dev/null || fail "railway CLI がありません: npm i -g @railway/cli"
command -v jq >/dev/null || fail "jq がありません"
export RAILWAY_API_TOKEN

# JSON から name/id を柔軟に取り出す（CLI のバージョン差を吸収）
json_names() { jq -r '[.. | objects | select(has("name")) | .name] | unique[]' 2>/dev/null || true; }
json_id_by_name() { jq -r --arg n "$1" '[.. | objects | select(.name? == $n and has("id")) | .id][0] // empty' 2>/dev/null || true; }

# --- 1. プロジェクト ----------------------------------------------------------
step "プロジェクト '$PROJECT_NAME' を確認"
railway whoami >/dev/null || fail "トークンが無効です（railway whoami に失敗）"
project_id="$(railway list --json 2>/dev/null | json_id_by_name "$PROJECT_NAME")"
if [[ -z "$project_id" ]]; then
  note "プロジェクトが無いので作成します"
  init_args=(--name "$PROJECT_NAME" --json)
  [[ -n "${RAILWAY_WORKSPACE:-}" ]] && init_args+=(--workspace "$RAILWAY_WORKSPACE")
  railway init "${init_args[@]}" >/dev/null
  project_id="$(railway list --json | json_id_by_name "$PROJECT_NAME")"
  [[ -n "$project_id" ]] || fail "プロジェクト作成後に ID を取得できませんでした"
  add_summary "- プロジェクト \`$PROJECT_NAME\` を作成しました"
else
  note "既存プロジェクト: $project_id"
fi
railway link --project "$project_id" --environment "$ENVIRONMENT" >/dev/null

services() { railway service list --json 2>/dev/null | json_names; }

# --- 2. Postgres --------------------------------------------------------------
step "Postgres を確認"
pg_service="$(services | grep -i -m1 'postgres' || true)"
if [[ -z "$pg_service" ]]; then
  note "Postgres を追加します"
  railway add --database postgres >/dev/null
  sleep 5
  pg_service="$(services | grep -i -m1 'postgres' || true)"
  [[ -n "$pg_service" ]] || fail "Postgres サービスが見つかりません"
  add_summary "- Postgres サービス \`$pg_service\` を追加しました"
else
  note "既存: $pg_service"
fi

# --- 3. web サービス ------------------------------------------------------------
step "web サービスを確認"
if ! services | grep -qx "$WEB_SERVICE"; then
  note "サービス '$WEB_SERVICE' を作成します"
  railway add --service "$WEB_SERVICE" >/dev/null
  sleep 3
  add_summary "- アプリサービス \`$WEB_SERVICE\` を作成しました"
fi
railway link --project "$project_id" --environment "$ENVIRONMENT" --service "$WEB_SERVICE" >/dev/null

# --- 4. 環境変数 ----------------------------------------------------------------
step "環境変数を確認"
existing_vars="$(railway variable list --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --json 2>/dev/null || echo '{}')"
has_var() { echo "$existing_vars" | jq -e --arg k "$1" '(.[$k]? // (.. | objects | select(.name? == $k) | .value?) // empty) | length > 0' >/dev/null 2>&1; }
set_var() { railway variable set --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --skip-deploys "$1=$2" >/dev/null; }
ensure_var() { if has_var "$1"; then echo "  $1: 設定済み"; else set_var "$1" "$2"; echo "  $1: 設定しました"; fi; }

ensure_var DATABASE_URL "\${{${pg_service}.DATABASE_URL}}"
ensure_var PORT "$PORT"
ensure_var COOKIE_SECURE "true"
ensure_var BACKUP_DIR "$MOUNT_PATH/backups"
ensure_var BACKUP_KEEP "30"
ensure_var AI_MODEL "${AI_MODEL:-claude-opus-5}"
ensure_var AI_DAILY_LIMIT "40"
ensure_var NODE_ENV "production"
if has_var SESSION_SECRET; then echo "  SESSION_SECRET: 設定済み"; else set_var SESSION_SECRET "$(openssl rand -hex 32)"; echo "  SESSION_SECRET: 生成しました"; fi
signup_code_new=""
if has_var SIGNUP_CODE; then
  echo "  SIGNUP_CODE: 設定済み（Railway の Variables で確認できます）"
else
  signup_code_new="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 12)"
  set_var SIGNUP_CODE "$signup_code_new"
  echo "  SIGNUP_CODE: 生成しました"
fi
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  set_var ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
  echo "  ANTHROPIC_API_KEY: 設定しました（AI 採点 有効）"
  ai_status="有効（モデル: ${AI_MODEL:-claude-opus-5}）"
elif has_var ANTHROPIC_API_KEY; then
  ai_status="有効（既存のキー）"
else
  ai_status="無効（GitHub Secrets に ANTHROPIC_API_KEY を追加して再デプロイすると有効になります）"
fi

# --- 5. ボリューム --------------------------------------------------------------
step "ボリューム ($MOUNT_PATH) を確認"
if railway volume list --json 2>/dev/null | jq -e --arg m "$MOUNT_PATH" '[.. | strings | select(. == $m)] | length > 0' >/dev/null; then
  note "既存のボリュームあり"
else
  note "ボリュームを作成します"
  # `railway volume` の --service/--environment は ID 指定なので、名前から ID を引く
  svc_id="$(railway service list --json 2>/dev/null | json_id_by_name "$WEB_SERVICE")"
  env_id="$(railway environment list --json 2>/dev/null | json_id_by_name "$ENVIRONMENT")"
  if ! railway volume ${svc_id:+--service "$svc_id"} ${env_id:+--environment "$env_id"} add --mount-path "$MOUNT_PATH"; then
    echo "  ID 指定で失敗したため、リンク済みサービスで再試行します"
    railway volume add --mount-path "$MOUNT_PATH"
  fi
  add_summary "- スナップショット用ボリューム \`$MOUNT_PATH\` を作成しました"
fi

# --- 6. ドメイン ----------------------------------------------------------------
step "公開ドメインを確認"
domain="$(railway domain list --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --json 2>/dev/null | jq -r '[.. | strings | select(test("\\.up\\.railway\\.app$|\\.railway\\.app$"))][0] // empty' || true)"
if [[ -z "$domain" ]]; then
  note "ドメインを発行します"
  domain="$(railway domain --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --port "$PORT" --json 2>/dev/null | jq -r '[.. | strings | select(test("railway\\.app"))][0] // empty' || true)"
  [[ -n "$domain" ]] || domain="$(railway domain list --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --json | jq -r '[.. | strings | select(test("railway\\.app"))][0] // empty')"
  [[ -n "$domain" ]] || fail "ドメインを取得できませんでした"
  add_summary "- 公開ドメイン \`$domain\` を発行しました"
fi
domain="${domain#https://}"
url="https://${domain}"
note "URL: $url"

# --- 7. デプロイ ----------------------------------------------------------------
if [[ "${SKIP_DEPLOY:-0}" != "1" ]]; then
  step "デプロイ（ビルドログを表示）"
  if ! railway up --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --ci; then
    echo
    echo "==> デプロイ失敗。ビルドログ（直近 200 行）:"
    railway logs --build --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --lines 200 2>&1 | tail -200 || true
    echo "==> デプロイログ（直近 100 行）:"
    railway logs --deployment --service "$WEB_SERVICE" --environment "$ENVIRONMENT" --lines 100 2>&1 | tail -100 || true
    fail "railway up が失敗しました。上のログを確認してください"
  fi
  step "起動を待機"
  ok=0
  for i in $(seq 1 60); do
    if curl -fsS --max-time 10 "$url/api/health" >/dev/null 2>&1; then ok=1; break; fi
    sleep 5
  done
  if [[ "$ok" == "1" ]]; then note "ヘルスチェック OK: $url/api/health"; else echo "WARNING: 5 分以内にヘルスチェックが通りませんでした。Railway のログを確認してください。"; fi
fi

# --- 8. Railway 側バックアップスケジュール（ベストエフォート） --------------------
step "Railway のボリュームバックアップを設定（ベストエフォート）"
backup_note="Railway の画面で Postgres ボリューム → Backups タブから Daily/Weekly/Monthly を有効にしてください（1 回だけ）"
gql() { curl -sS --max-time 30 -H "Authorization: Bearer $RAILWAY_API_TOKEN" -H "Content-Type: application/json" https://backboard.railway.com/graphql/v2 -d "$1"; }
if mutations="$(gql '{"query":"{ __type(name: \"Mutation\") { fields { name } } }"}' 2>/dev/null | jq -r '.data.__type.fields[].name' 2>/dev/null)" && echo "$mutations" | grep -q '^volumeInstanceBackupScheduleUpdate$'; then
  vol_q="$(jq -cn --arg id "$project_id" '{query:"query($id:String!){ project(id:$id){ volumes{ edges{ node{ id name volumeInstances{ edges{ node{ id serviceId environmentId } } } } } } services{ edges{ node{ id name } } } } }", variables:{id:$id}}')"
  if proj="$(gql "$vol_q" 2>/dev/null)"; then
    pg_sid="$(echo "$proj" | jq -r --arg n "$pg_service" '.data.project.services.edges[]?.node | select(.name == $n) | .id' | head -1)"
    vi_ids="$(echo "$proj" | jq -r --arg s "$pg_sid" '.data.project.volumes.edges[]?.node.volumeInstances.edges[]?.node | select(.serviceId == $s) | .id')"
    done_any=0
    for vi in $vi_ids; do
      m="$(jq -cn --arg vi "$vi" '{query:"mutation($vi:String!){ volumeInstanceBackupScheduleUpdate(volumeInstanceId:$vi, kinds:[DAILY, WEEKLY, MONTHLY]) }", variables:{vi:$vi}}')"
      if gql "$m" 2>/dev/null | jq -e '.data.volumeInstanceBackupScheduleUpdate == true' >/dev/null 2>&1; then done_any=1; fi
    done
    if [[ "$done_any" == "1" ]]; then backup_note="Postgres ボリュームの自動バックアップ（Daily/Weekly/Monthly）を有効にしました"; fi
  fi
fi
note "$backup_note"

# --- 9. サマリー ----------------------------------------------------------------
{
  echo "## CPA 論文式 学習アプリ — デプロイ結果"
  echo
  echo "- **URL**: $url"
  if [[ -n "$signup_code_new" ]]; then
    echo "- **初回登録の招待コード**: \`$signup_code_new\`（この値は今回だけ表示されます。Railway の Variables → SIGNUP_CODE でも確認できます）"
  else
    echo "- 招待コード: 設定済み（Railway の web サービス → Variables → SIGNUP_CODE で確認）"
  fi
  echo "- AI 採点: $ai_status"
  echo "- バックアップ: $backup_note"
  for l in "${summary_lines[@]:-}"; do [[ -n "$l" ]] && echo "$l"; done
  echo
  echo "### 次にやること"
  echo "1. $url を開き「新規登録」からメールアドレス・パスワード・招待コードで登録（最初のユーザーが管理者）"
  echo "2. スマホでも同じ URL を開いてログイン。Safari は共有 → ホーム画面に追加、Chrome はメニュー → アプリをインストール"
} | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
