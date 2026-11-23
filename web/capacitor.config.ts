import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";
import { appConfig } from "./app.config";

/**
 * Web の成果物（web/dist）をアプリ内に同梱する構成。
 * server.url でリモートのサイトを読み込む構成にはしない（オフラインで動かすため・審査対策）。
 */
const config: CapacitorConfig = {
  appId: appConfig.appId,
  appName: appConfig.displayName,
  webDir: "dist",
  ios: {
    // Web 側で env(safe-area-inset-*) を使ってノッチ・ホームバーを避ける
    contentInset: "never",
    backgroundColor: appConfig.theme.background,
    // リンクの長押しプレビュー（Safari 風）を出さない
    allowsLinkPreview: false,
    // 本番ビルドでは Safari Web インスペクタに出さない
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // Web 側の初期描画が終わってから hide する（白画面のちらつき防止）
      launchAutoHide: false,
      launchShowDuration: 3000,
      backgroundColor: appConfig.theme.background,
      showSpinner: false,
    },
    Keyboard: {
      // キーボード表示時は WebView 自体を縮める（入力欄が隠れない）
      resize: KeyboardResize.Native,
    },
    StatusBar: {
      // 明るい背景なので文字は濃い色
      style: "LIGHT",
      overlaysWebView: true,
    },
    LocalNotifications: {
      iconColor: appConfig.theme.brand,
      // アプリを開いている最中に届いた通知もバナーで表示する
      presentationOptions: ["banner", "sound", "list"],
    },
  },
};

export default config;
