/**
 * 実行環境の判定と、環境で変わる機能のスイッチ。
 * Web 版（PWA）の挙動は変えず、ネイティブ（Capacitor）のときだけ分岐させるための入口。
 */
import { Capacitor } from "@capacitor/core";
import { appConfig } from "../../app.config";

/** iOS アプリ（Capacitor）内で動いているか */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIos(): boolean {
  return Capacitor.getPlatform() === "ios";
}

/**
 * ログイン・同期・AI 採点・サーバー内スナップショット（サーバーが必要な機能）を出すか。
 * - Web 版: 従来どおり常に出す
 * - ネイティブ: app.config.ts の features.login に従う（今回は off）
 */
export function serverFeaturesEnabled(): boolean {
  return !isNative() || appConfig.features.login;
}

/**
 * アプリ内課金（RevenueCat）を使うか。
 * - ネイティブ: 使う
 * - Web 版: 今回は表示しない（features.webBilling は利用タイプ C で後から対応するためのスイッチ）
 */
export function billingEnabled(): boolean {
  return isNative();
}
