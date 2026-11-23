/**
 * アプリごとの共通設定（iOS 化の共通方針で全アプリ同じ形にしている）。
 * アプリごとに書き換えるのはこのファイルだけ、が原則。
 *
 * 参照しているところ:
 * - web/capacitor.config.ts（Bundle ID・表示名）
 * - web/scripts/ios-apply-config.cjs（`npx cap sync` の後に自動実行。iPad 対応などを Xcode プロジェクトへ反映）
 * - web/src/native/*（課金・ネイティブ機能のオンオフ）
 *
 * 注意: ここに秘密鍵を書かないこと。RevenueCat は「公開 SDK キー」（appl_ で始まる）だけを書く。
 * Secret API key（sk_ で始まる）は絶対に入れない。
 */
export const appConfig = {
  /** Bundle ID。App Store Connect / Apple Developer で登録するものと一致させる */
  appId: "com.example.cpa2027",
  /** ホーム画面のアイコン下に出る名前（短く） */
  displayName: "CPA論文",
  /** App Store 上のアプリ名（30 文字以内）。docs/ios-release.md の掲載情報と合わせる */
  storeName: "CPA論文 2027",

  /** 機能のスイッチ（アプリごとにオンオフ） */
  features: {
    /** iPad 対応。false にすると iPhone 専用（TARGETED_DEVICE_FAMILY=1）になる */
    ipad: true,
    /**
     * ネイティブアプリでのログイン機能。今回は off。
     * on にする場合は次がすべて必要（docs/ios-release.md「ログインを入れるとき」参照）:
     * - API のベース URL 指定と、Cookie ではなくトークンでの認証（capacitor://localhost からは Cookie が使えない）
     * - アプリ内からのアカウント削除
     * - SNS ログインを出すなら「Apple でサインイン」
     * - RevenueCat の appUserID を自分のアカウント ID にする（billing.identify を呼ぶ）
     * Web 版（PWA）のログインはこのスイッチに関係なく従来どおり動く。
     */
    login: false,
    /**
     * Stripe などの Web 課金（利用タイプ C 用）。今回は off。
     * on にする場合は RevenueCat の appUserID を自分のアカウント ID と共通にすること
     * （Web で買った人が iOS でログインしたときに同じ「pro」を受け取れるようにするため）。
     */
    webBilling: false,
  },

  /** 課金（RevenueCat） */
  revenueCat: {
    /** RevenueCat の iOS 用 公開 SDK キー（Project settings → API keys → App specific keys）。未設定のままだと課金画面は「準備中」表示になる */
    iosApiKey: "appl_REPLACE_WITH_YOUR_PUBLIC_SDK_KEY",
    /** エンタイトルメント名（全アプリ共通で "pro"） */
    entitlement: "pro",
    /** 表示する Offering の ID。空なら RevenueCat で「Current」にした Offering を使う */
    offeringId: "",
  },

  /** 規約・サポート */
  legal: {
    /** App Store Connect に登録する公開 URL（Web 版をデプロイしたドメインの /legal/... を想定）。アプリ内では同梱ページを表示する */
    termsUrl: "https://example.com/legal/terms",
    privacyUrl: "https://example.com/legal/privacy",
    /** 問い合わせ先（App Store の「サポート URL」とは別に、アプリ内に表示するメールアドレス。空なら表示しない） */
    supportEmail: "",
    /** 運営者名（規約・プライバシーポリシーに表示） */
    operatorName: "CPA論文 2027 運営者",
  },

  /** 起動画面・ステータスバーの色（アプリごとに変えて他アプリと見た目を差別化する） */
  theme: {
    background: "#f5f7ff",
    brand: "#1e3a5f",
  },
} as const;

export type AppConfig = typeof appConfig;
