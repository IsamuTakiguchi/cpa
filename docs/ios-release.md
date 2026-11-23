# iOS アプリのリリース手順（CPA論文 2027）

この PWA を Capacitor で包んだ iOS アプリのビルド・申請手順と、申請用の下書きをまとめたものです。
Web 版（PWA）のビルド・動作は変わりません（ネイティブのときだけ分岐しています）。

- 設定ファイル: `web/app.config.ts`（Bundle ID・iPad/ログイン/Web 課金のスイッチ・RevenueCat 公開キー・規約 URL・配色）
- iOS プロジェクト: `web/ios/App/App.xcodeproj`（Capacitor 8／Swift Package Manager）
- 利用タイプ: C（将来 Windows・ブラウザでも使う想定）。ただし今回の iOS 版はログインなしで、端末内だけで動く
- 課金: 無料＋プロ版（買い切り推奨。RevenueCat、エンタイトルメント `pro`）

---

## 1. ビルド手順

必要なもの: macOS、最新の Xcode（App Store への提出には Apple が指定する SDK が必要）、Node.js 22 以上、Apple Developer Program。

```bash
npm ci

# 1) Web をビルド（web/dist を作る）
npm run build            # web と server の両方。web だけなら npm run build:web

# 2) iOS プロジェクトへ反映
cd web
npx cap sync ios         # web/dist をアプリへコピー＋プラグイン更新
                         # 続けて scripts/ios-apply-config.cjs が自動で実行され、
                         # app.config.ts の Bundle ID・iPad 対応・表示名などが Xcode プロジェクトへ反映される

# 3) Xcode を開く
npx cap open ios
```

ルートから一度に行う場合: `npm run ios:sync`（Web ビルド＋cap sync）→ `npm run ios:open`。

Xcode での作業:

1. ターゲット「App」→ Signing & Capabilities → Team を選ぶ（Bundle Identifier は app.config.ts の値が入っている）
2. 「+ Capability」→ In-App Purchase を追加
3. General → Version（例 1.0.0）と Build（1, 2, 3…）を設定
4. 実機または Any iOS Device を選び、Product → Archive → Distribute App → App Store Connect

アイコン・起動画面を作り直すとき: `web/assets/icon.svg` を編集 → `npm run ios:assets`（透過なしの 1024px アイコンと起動画面を作り、iOS 用の各サイズを生成）。

> この環境（Linux）では Xcode でのビルドを確認できていません。`npx cap sync ios` が通ること、Xcode プロジェクトのファイル構成が正しく読めることまでは確認済みです。自作の Swift ファイル（`MainViewController.swift`・`NativePrintPlugin.swift`）は初回ビルドで確認してください。

---

## 2. 自分で手作業が必要なことのチェックリスト

### アプリの登録・署名
- [ ] Bundle ID を決める → `web/app.config.ts` の `appId` を変更 → `npx cap sync ios`（Xcode へ自動反映）
- [ ] Apple Developer で App ID を作成（Capabilities は既定のままで可。In-App Purchase は既定で有効）
- [ ] Xcode の Signing で Team を設定（Automatically manage signing で可）
- [ ] App Store Connect でアプリを新規作成（プライマリ言語: 日本語、Bundle ID、SKU 例 `cpa2027`）
- [ ] 契約／税金／口座情報で「有料 App 契約」・銀行口座・税務情報を完了（未完了だと課金アイテムが取得できない）

### 課金アイテム（App Store Connect）
- [ ] 「App 内課金」→ 非消耗型を作成
  - 製品 ID: 例 `com.example.cpa2027.pro.lifetime`（Bundle ID に合わせる）
  - 参照名: Pro Lifetime 2027
  - 価格: 例 2,500 円（2,000〜3,000 円を想定）
  - ローカリゼーション（日本語）: 表示名「プロ版」、説明「論述・計算・本試験形式・まとめノートを解放」
  - 審査用スクリーンショット: 課金画面（/pro）のスクリーンショット
  - 審査メモ: 下の「5. 審査メモ」の課金部分
- [ ] 初回はアプリのバージョンと一緒に課金アイテムを審査に提出する（バージョン画面の「App 内課金」欄で選択）

### RevenueCat
- [ ] プロジェクトを作成 → Apps で iOS アプリを追加（Bundle ID）
- [ ] App Store Connect の「In-App Purchase キー」（.p8）と Issuer ID・Key ID を RevenueCat に登録（StoreKit 2 の購入確認用）
- [ ] Products で上の製品 ID を追加（または App Store Connect から取り込み）
- [ ] Entitlements で `pro` を作成し、製品を紐付け
- [ ] Offerings で `default` を作成して Current にし、Package（Lifetime）に製品を入れる
- [ ] Project settings → API keys の iOS 用「公開 SDK キー」（`appl_` で始まる）を `web/app.config.ts` の `revenueCat.iosApiKey` に貼る（**`sk_` で始まる秘密鍵は絶対に入れない**）
- [ ] （推奨）App Store Connect の「App Store サーバー通知」の URL に RevenueCat の URL を設定（返金・取り消しを即時反映）

### 規約・サポート
- [ ] `web/app.config.ts` の `legal.operatorName`（運営者名）と `legal.supportEmail`（問い合わせ先）を設定
- [ ] Web 版をデプロイし、`https://<ドメイン>/legal/privacy` と `/legal/terms` が開くことを確認 → `legal.privacyUrl`・`legal.termsUrl` を更新
- [ ] App Store Connect の「プライバシーポリシー URL」に上の URL、「サポート URL」に問い合わせ先が載ったページを設定
- [ ] 規約・ポリシー本文（`web/src/legal/*.md`）を確認・修正（特に運営者の所在地を管轄する裁判所、問い合わせ先）。変更したら `web/src/pages/Legal.tsx` の `LEGAL_UPDATED` を更新

### 実機テスト（Xcode から実機にインストール）
- [ ] 起動画面 → ホームが白画面なしで表示される／アイコンが正しい
- [ ] ノッチ・ダイナミックアイランド・ホームバーに文字やボタンが重ならない（ヘッダー、下のタブ、モーダル）
- [ ] 論述の入力中にキーボードで入力欄が隠れない、下のタブバーが消える、「完了」で閉じられる
- [ ] 画面の左端からのスワイプとヘッダーの「戻る」で前の画面に戻れる
- [ ] 手続きページの「公式ページを開く」が Safari の画面で開き、閉じるとアプリに戻る
- [ ] 設定 → 通知: 許可ダイアログ → 許可後に通知が届く（時刻を数分後にして確認）／通知をタップすると復習・手続き画面が開く
- [ ] 設定 → 「JSON を書き出す」→ 共有シート →「“ファイル”に保存」→ 「JSON を読み込む」でファイルから読み込める
- [ ] まとめノート →「印刷 / PDF 保存」で印刷画面が開き、プレビューにタブバーやボタンが写っていない（`@media print` が効いているか）。PDF として共有できる
- [ ] 手続き →「すべてカレンダーに追加（.ics）」→ ファイルに保存 → ファイル App で開くとカレンダーに追加できる
- [ ] 正誤・計算・カード評価でハプティクスが鳴る
- [ ] 機内モードで起動し、教材・問題・図解（Mermaid）がすべて動く
- [ ] iPad: 縦横回転、サイドバー表示、Split View
- [ ] ログイン・同期・AI 採点の表示がどこにも出ない

### Sandbox での購入テスト
- [ ] App Store Connect → ユーザとアクセス → Sandbox → テスターを作成
- [ ] 実機の 設定 → App Store → 「Sandbox アカウント」でサインイン
- [ ] 無料状態: ホームの「本試験形式」→ 課金画面が開き「本試験形式はプロ版の機能です」と出る。価格が App Store Connect で設定したとおりに表示される
- [ ] 購入 → 「ご購入ありがとうございます」→ 元の画面に戻り、本試験形式が始まる／PRO 表示が消える
- [ ] もう一度 /pro（設定 → プロ版）を開くと「プロ版をご利用中です」「購入元: App Store」で、購入ボタンが出ない
- [ ] アプリを削除 → 再インストール → 設定 → 「購入を復元」でプロ版に戻る
- [ ] RevenueCat のダッシュボード（Customers）に匿名 ID の購入が表示される
- [ ] （任意）Xcode の StoreKit Configuration ファイルでの購入テスト・返金テスト

### スクリーンショット・申請
- [ ] iPhone 6.9 インチ（1320×2868 など）を 3〜10 枚。iPad 対応のため iPad 13 インチ（2064×2752）も必要
  - 案: ①ホーム（試験までの日数・今日の復習）②論点の要点ノート＋図解 ③暗記カード／正誤 ④小論述と採点ポイント ⑤本試験形式 ⑥手続きリマインド＋通知 ⑦科目の体系マップ
- [ ] App プライバシー（下の「4.」）を回答
- [ ] 年齢制限: 質問はすべて「なし」→ 4+ の想定
- [ ] 輸出コンプライアンス: Info.plist に `ITSAppUsesNonExemptEncryption = false` を設定済み（質問は出ない）
- [ ] 「Apple シリコン搭載 Mac で利用可能」: Mac で動作確認するまではオフにするのが無難
- [ ] TestFlight で最終確認 → 審査へ提出

---

## 3. App Store の掲載情報（下書き）

| 項目 | 内容 | 文字数 |
|---|---|---|
| アプリ名（30 文字以内） | CPA論文 2027 | 10 |
| サブタイトル（30 文字以内） | 公認会計士 論文式の論述・計算対策 | 17 |
| キーワード（100 文字以内） | 会計士試験,財務会計論,管理会計論,監査論,租税法,会計学,暗記カード,一問一答,答案練習,論述問題,計算問題,理論,本試験,短答免除,資格勉強,間隔反復,試験対策,勉強アプリ,CPA | 92 |
| カテゴリ | 教育（サブ: 参考資料） | |
| 価格 | 無料（App 内課金あり） | |

キーワードは名前・サブタイトルに含まれる語（公認会計士・論文式など）を重複させていません。

### プロモーション用テキスト（170 文字以内）

> 2027年の論文式まで、毎日の積み重ねを。暗記カード・正誤・一問一答は無料。論述・計算・本試験形式の通し演習はプロ版で。教材はすべて端末に入っていて、オフラインでも学習できます。

### 説明文

```
2027年公認会計士試験・論文式の「会計学（財務会計論・管理会計論）」「監査論」「租税法」を、インプットから答案練習まで1つで回せる学習アプリです。短答式の合格・免除のあと、論文式に向けて理論と計算を仕上げたい方のために作りました。

■ インプット
・論点ごとの要点ノート（定義→趣旨→論点→結論）
・直前確認用の結論サマリー
・論点の全体像・処理の流れ・判断フローを示す図解
・学習状況で色が変わる科目の体系マップ

■ アウトプット（スキマ時間から本試験形式まで）
・暗記カード（間隔反復で、忘れかけた頃に自動で出題）
・正誤問題／一問一答（キーワードで自動判定）
・小論述・大問論述（模範解答と採点ポイントで自己採点）※プロ版
・計算問題（数値入力で自動採点、解法つき）※プロ版
・本試験形式：科目ごとに本試験と同じ時間・大問数で通し解答 ※プロ版
・プリセット：スキマ5分／通勤15分／1論点集中30分／弱点補強（※プロ版）

■ 復習と記録
・復習期限が来たカードをまとめて復習
・得点の低かった問題に再挑戦
・学習時間と科目別の進捗を記録
・まとめノート：範囲と素材を選んで1枚にまとめ、印刷・PDF保存 ※プロ版

■ 手続きリマインド（短答式免除者向け）
免除申請、論文式の出願期間、納付期限、受験票、試験日をタイムラインとチェックリストで管理。期限の7日前・前日・当日に通知でお知らせします。適用基準・法令の基準日と出典も確認できます。

■ iPhone・iPad で快適に
・毎日の学習リマインダー（今日の復習カードの枚数をお知らせ）
・正解・不正解を手ざわりで伝えるハプティクス
・学習データのバックアップを「ファイル」App や iCloud Drive に保存
・教材と問題はすべてアプリ内に。オフラインでも学習できます
・iPad 対応（キーボードで論述の練習に）

■ プロ版（App内課金）
小論述・大問論述・計算問題、本試験形式、弱点補強、まとめノートが使えるようになります。買い切りで、同じApple IDなら機種変更後も「購入を復元」で引き継げます。

■ ご注意
・本アプリは金融庁・公認会計士・監査審査会、資格予備校とは関係のない非公式の学習アプリです。
・教材はAIを用いて作成した学習補助資料です。2027年試験の法令基準日（論文式は2027年4月1日、租税法は2027年1月1日）に照らし、必ず原典・基準書で確認してください。
・学習データは端末内に保存されます。アプリを削除するとデータも消えるため、定期的にバックアップしてください。

利用規約: （termsUrl）
プライバシーポリシー: （privacyUrl）
```

> 説明文・スクリーンショットには、Web 版の存在・価格・外部での購入を書かないこと（ガイドライン 3.1.1／3.1.3）。

### このバージョンの最新情報

> 初回リリース

---

## 4. App Store のプライバシー情報（回答案）

App Store Connect →「App のプライバシー」。

| 質問 | 回答 |
|---|---|
| データを収集しますか | **はい**（RevenueCat による購入情報のため） |
| トラッキング | **なし**（広告・解析 SDK なし、IDFA 不使用、ATT ダイアログ不要） |

収集するデータの種類:

| データの種類 | 用途 | ユーザーに関連付け | トラッキング |
|---|---|---|---|
| 購入 → 購入履歴 | App の機能、分析 | いいえ（ログインがなく匿名 ID のみ） | いいえ |

収集しないもの（申告不要）:

- 学習データ（解答・メモ・まとめ・設定）: 端末内でのみ処理し、外部へ送信しない
- 連絡先情報・位置情報・ユーザコンテンツ・閲覧履歴・診断データ: 収集しない
- 通知: ローカル通知のみ（端末内で予約）

補足:

- RevenueCat の匿名 ID（`$RCAnonymousID:...`）を「識別子 → ユーザ ID」として申告するべきかは解釈が分かれます。RevenueCat 公式の App Privacy ガイド（RevenueCat のドキュメントで「Apple App Privacy」を検索）で最新の推奨を確認してください。申告する場合は「App の機能／関連付けなし／トラッキングなし」。
- ログイン（features.login）や AI 採点をアプリに入れたら、「連絡先情報 → メールアドレス」「ユーザコンテンツ」などを追加で申告し、`PrivacyInfo.xcprivacy` も更新すること。

---

## 5. 審査メモ（App Review Information → メモ）

審査担当者向け。英語版を先に、日本語版を後に貼ります。ログイン不要のため、デモアカウントは「サインインは不要」を選択。

```
This is a study app for the Japanese CPA exam (essay-style stage, 2027). No account or sign-in is required. All study content is bundled in the app and works offline.

Native features:
- Local notifications: Settings (設定) > 通知 > 毎日の学習リマインダー / 手続きの期限. Tapping a notification opens the related screen.
- Haptic feedback when answering questions (correct / incorrect), rating flashcards and switching tabs.
- Share sheet / Files: Settings > バックアップ > 「JSON を書き出す」 exports study data via the share sheet (Save to Files). 「JSON を読み込む」 imports it.
- AirPrint / PDF: Summary notes (まとめノート) > 「印刷 / PDF 保存」 (Pro).
- Edge-swipe back navigation and a native back button.

In-App Purchase (non-consumable "プロ版", product ID: com.example.cpa2027.pro.lifetime):
- Free: input notes, diagrams, flashcards, true/false, short-answer questions, review, procedure reminders, history, backup.
- Pro: essay questions, calculation questions, full mock exams, weak-point drills, summary notes.
- To see the paywall: Home (ホーム) > tap any "本試験形式" card, or Settings (設定) > プロ版 > 「プロ版について見る」.
- After purchasing, the mock exam starts and the "PRO" labels disappear. Opening the paywall again shows "プロ版をご利用中です" with the store (App Store) and no purchase button.
- Restore: Settings > プロ版 > 「購入を復元」, also available on the paywall.

This app is not affiliated with the Financial Services Agency or the CPA and Auditing Oversight Board of Japan. Exam schedule information links to their official websites. Study materials were created with AI assistance and are labeled as such in the app.
```

```
公認会計士試験（2027年・論文式）向けの学習アプリです。アカウント登録・ログインは不要で、教材はすべてアプリに同梱されておりオフラインで動作します。

ネイティブ機能:
・ローカル通知: 設定 > 通知（毎日の学習リマインダー／手続きの期限）。通知をタップすると該当画面が開きます
・ハプティクス: 正誤判定、暗記カードの評価、タブ切替
・共有シート／ファイル: 設定 > バックアップ >「JSON を書き出す」（共有シートから「ファイル」に保存）、「JSON を読み込む」
・印刷／PDF: まとめノート >「印刷 / PDF 保存」（プロ版）
・画面左端からのスワイプで戻る、ヘッダーの戻るボタン

App 内課金（非消耗型「プロ版」、製品 ID: com.example.cpa2027.pro.lifetime）:
・無料: 要点ノート、図解、暗記カード、正誤、一問一答、復習、手続きリマインド、履歴、バックアップ
・プロ版: 論述問題、計算問題、本試験形式、弱点補強、まとめノート
・課金画面の表示: ホーム > 「本試験形式」のいずれか、または 設定 > プロ版 >「プロ版について見る」
・購入後は本試験形式が始まり、「PRO」表示が消えます。再度課金画面を開くと「プロ版をご利用中です」と購入元（App Store）が表示され、購入ボタンは表示されません
・復元: 設定 > プロ版 >「購入を復元」（課金画面にもあります）

本アプリは金融庁・公認会計士・監査審査会とは関係のない非公式アプリです。試験日程は公式サイトへのリンクを掲載しています。教材は AI を用いて作成しており、その旨をアプリ内に表示しています。
```

（製品 ID は実際に作成したものに置き換える）

---

## 6. 構成メモ（実装の場所）

| 内容 | ファイル |
|---|---|
| 共通設定・スイッチ | `web/app.config.ts` |
| Capacitor 設定 | `web/capacitor.config.ts` |
| cap sync 後に Xcode へ設定を反映 | `web/scripts/ios-apply-config.cjs`（`web/package.json` の `capacitor:sync:after`） |
| アイコン元画像・生成 | `web/assets/icon.svg`、`web/scripts/make-icon-assets.cjs` |
| 環境判定（ネイティブ／Web） | `web/src/native/platform.ts` |
| 起動時処理（SW を使わない・ステータスバー・キーボード・起動画面） | `web/src/native/init.ts` |
| 外部リンク → Safari | `web/src/native/externalLinks.ts` |
| ハプティクス | `web/src/native/haptics.ts` |
| ローカル通知 | `web/src/native/notifications.ts`、`web/src/components/ReminderSettings.tsx` |
| 共有・ファイル保存・印刷 | `web/src/native/share.ts`、`web/ios/App/App/NativePrintPlugin.swift` |
| 戻るスワイプ・自作プラグイン登録 | `web/ios/App/App/MainViewController.swift` |
| 課金（RevenueCat） | `web/src/native/billing.ts` |
| プロ版の状態 | `web/src/billing/ProProvider.tsx` |
| 無料／プロの線引き（アプリ固有） | `web/src/billing/proFeatures.ts` |
| 課金画面（共通部品） | `web/src/components/paywall/Paywall.tsx`、`ProLock.tsx`、`ProSettings.tsx`、`web/src/pages/Pro.tsx` |
| 規約・プライバシー | `web/src/legal/*.md`、`web/src/pages/Legal.tsx`、`web/src/components/AboutSection.tsx` |
| プライバシーマニフェスト | `web/ios/App/App/PrivacyInfo.xcprivacy` |

### スイッチ（`web/app.config.ts` の `features`）

| スイッチ | 今回 | 内容 |
|---|---|---|
| `ipad` | on | off にすると `npx cap sync ios` 時に iPhone 専用（TARGETED_DEVICE_FAMILY=1）になる |
| `login` | off | ネイティブでログイン・同期・AI 採点・サーバー内スナップショットを出すか。Web 版は常に従来どおり |
| `webBilling` | off | Web 課金（利用タイプ C 用）。今回は Web 版に課金を一切表示しない |

### ログインを入れるとき（login を on にする前に必要なこと）

1. API のベース URL を設定し、Cookie ではなくトークン（Authorization ヘッダー）で認証する（`capacitor://localhost` からはサーバーの Cookie を使えない）。サーバー側の CORS も許可
2. 新規登録の招待コード制・許可メール制を、一般公開向けに見直す
3. **アプリ内からのアカウント削除**（ガイドライン 5.1.1(v)）
4. Google などの SNS ログインを出すなら **Apple でサインイン** も必須（4.8）
5. ログイン成功時に `identify(アカウントID)`（`web/src/native/billing.ts`）を呼び、匿名 ID の購入をアカウントへ引き継ぐ。ログアウト時は `forgetIdentity()`
6. AI 採点をアプリで出すなら、外部 AI（Anthropic）へ答案を送る旨の説明と同意画面（5.1.2(i)）、サーバー側でのプロ版確認（RevenueCat REST API）と回数制限
7. App プライバシーの回答と `PrivacyInfo.xcprivacy` を更新

### Web 課金（利用タイプ C）を入れるとき

- RevenueCat Web Billing または Stripe 連携を使い、RevenueCat の appUserID を自分のアカウント ID と同じにする（Web で買った `pro` が iOS でも有効になる）
- iOS アプリ内では Web の価格・購入ページへの案内をしない（3.1.1／3.1.3）。Web で購入済みの人がログインしたら使える、という形にとどめる
- `web/src/native/platform.ts` の `billingEnabled()` を Web でも true にする条件（`features.webBilling`）を追加

### 他の PWA を同じ方針で iOS 化するとき

- そのまま流用できる共通部分: `web/src/native/*`、`web/src/billing/ProProvider.tsx`、`web/src/components/paywall/*`、`web/scripts/*.cjs`、Swift 2 ファイル、`PrivacyInfo.xcprivacy`、規約テンプレート
- アプリごとに必ず変える部分（ガイドライン 4.3 対策）: `app.config.ts`（Bundle ID・名前・配色）、`assets/icon.svg`（モチーフと色）、`proFeatures.ts`（線引き・課金画面の見出しと特典）、課金画面の見出し、通知の文面、規約の固有部分、掲載文・スクリーンショット。テンプレートの文言をそのまま使い回さない

---

## 7. 審査で指摘されそうな点（正直な評価）

1. **4.2（Web サイトを包んだだけ）**: ネイティブ機能（ローカル通知、ハプティクス、共有シート、印刷、スワイプで戻る）と、オフラインで完結する教材量があるため通る見込みは高いと考えますが、UI はブラウザ由来の見た目（ガラス風カード、絵文字アイコンのタブ）です。指摘された場合は、ホーム画面ウィジェット（試験まで◯日・今日の復習枚数）の追加が最も効果的です。
2. **3.1.1（課金）**: 価格は Offerings から取得、復元ボタンあり、プロ版の二重購入防止あり。初回はアプリと課金アイテムを同時に審査提出しないと「課金画面で商品が表示されない」として却下されやすい点に注意。
3. **3.1.2（サブスク）**: 買い切りにすれば対象外。サブスクを追加する場合、課金画面の説明・規約リンクは実装済みだが、App Store の説明文にも利用規約（EULA）へのリンクが必要。
4. **教材の正確性・AI 生成**: Apple が内容の正確性を審査することは通常ないものの、「AI 作成」の表示を隠さないこと。誤りの指摘が来たときの問い合わせ先（サポート URL）が必要。
5. **公的機関の情報**: 金融庁などの名称を出しているため、非公式である旨と出典リンクを表示済み（政府機関と誤認させない）。アプリ名・アイコンには公的機関を連想させる要素を入れていない。
6. **5.1.1（データ）**: ログインなし・端末内保存なので軽い。ただしアプリ削除でデータが消える点は利用者からの苦情になりやすい（設定・説明文で告知済み）。
7. **2.1（完成度）**: 2027年試験の「予定・未確定」の日付が含まれる。画面上で「予定」と表示しているので問題ない想定。
8. **4.3（類似アプリ）**: 今後同じテンプレートで多数のアプリを出す場合、課金画面・設定画面・通知設定の見た目が共通になる。アイコン・配色・課金画面の見出し・掲載文・スクリーンショットはアプリごとに必ず変えること。同じ開発者アカウントから似た構成のアプリを短期間に大量申請すると、まとめて 4.3 を指摘されるリスクがある。
9. **未検証の部分**: Xcode でのビルド、自作 Swift（印刷プラグイン・戻るスワイプ）、印刷時に `@media print` が効くか、実機での通知・購入は、この環境では確認できていない（上の実機テストで確認する）。
