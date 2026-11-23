/**
 * アプリ内課金（RevenueCat）の共通ラッパー。全アプリ共通の作り。
 *
 * 方針:
 * - エンタイトルメント名は "pro"（app.config.ts の revenueCat.entitlement）
 * - ログインがない間は RevenueCat の匿名 ID（$RCAnonymousID:...）で管理する
 * - あとでログインを追加したら identify(アカウントID) を呼ぶ。RevenueCat の logIn により
 *   匿名 ID で買った購入がそのアカウントへ引き継がれる（webBilling を使う場合も同じ ID にする）
 * - 価格はハードコードせず、Offerings から取得したものを表示する
 * - 公開 SDK キーだけを使う。秘密鍵（sk_...）はアプリに入れない
 */
import type { CustomerInfo, PurchasesEntitlementInfo, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { appConfig } from "../../app.config";
import { billingEnabled } from "./platform";

export interface ProInfo {
  isPro: boolean;
  /** 購入元（App Store / Google Play / Web など） */
  store: string | null;
  productIdentifier: string | null;
  purchaseDate: string | null;
  /** 買い切りなら null */
  expirationDate: string | null;
  willRenew: boolean;
  isSandbox: boolean;
  /** サブスクの管理画面（App Store のサブスクリプション設定）の URL */
  managementURL: string | null;
}

export interface PaywallPackage {
  identifier: string;
  packageType: string;
  title: string;
  description: string;
  priceString: string;
  /** 自動更新サブスクか */
  isSubscription: boolean;
  /** ISO 8601 の期間（P1M, P1Y など）。買い切りは null */
  period: string | null;
  introPriceString: string | null;
  introPeriod: string | null;
  raw: PurchasesPackage;
}

export type PurchaseOutcome = { kind: "purchased"; info: ProInfo } | { kind: "already-pro"; info: ProInfo } | { kind: "cancelled" } | { kind: "pending" };

const CACHE_KEY = "billing.isPro";
const PLACEHOLDER = /REPLACE|^$/;

let configured: Promise<boolean> | null = null;

/**
 * 注意: Capacitor のプラグイン（Purchases など）を Promise の結果として返してはいけない。
 * Promise が thenable 判定のために .then を読み、プラグインの「then() は未実装」エラーになるため。
 * ここではモジュール自体を返し、呼び出し側で .Purchases を取り出す。
 */
function rc() {
  return import("@revenuecat/purchases-capacitor");
}

/** RevenueCat の公開キーが設定済みか */
export function billingConfigured(): boolean {
  return !PLACEHOLDER.test(appConfig.revenueCat.iosApiKey);
}

/** SDK を初期化（何度呼んでも 1 回だけ）。課金が使えない環境では false */
export function initBilling(): Promise<boolean> {
  if (!billingEnabled() || !billingConfigured()) return Promise.resolve(false);
  if (!configured) {
    configured = (async () => {
      try {
        const { Purchases } = await rc();
        const { isConfigured } = await Purchases.isConfigured();
        if (!isConfigured) {
          // appUserID を渡さない = 匿名 ID。ログイン導入後は identify() でアカウント ID に切り替える
          await Purchases.configure({ apiKey: appConfig.revenueCat.iosApiKey });
        }
        return true;
      } catch (e) {
        console.warn("RevenueCat の初期化に失敗しました", e);
        configured = null;
        return false;
      }
    })();
  }
  return configured;
}

function storeLabel(store: string | null): string | null {
  if (!store) return null;
  return (
    {
      APP_STORE: "App Store",
      MAC_APP_STORE: "Mac App Store",
      PLAY_STORE: "Google Play",
      STRIPE: "Web（Stripe）",
      RC_BILLING: "Web",
      PADDLE: "Web（Paddle）",
      PROMOTIONAL: "プロモーション（無償付与）",
      AMAZON: "Amazon",
      TEST_STORE: "テスト",
    } as Record<string, string>
  )[store] ?? store;
}

export function toProInfo(ci: CustomerInfo): ProInfo {
  const ent: PurchasesEntitlementInfo | undefined = ci.entitlements.active[appConfig.revenueCat.entitlement];
  return {
    isPro: !!ent?.isActive,
    store: storeLabel(ent?.store ?? null),
    productIdentifier: ent?.productIdentifier ?? null,
    purchaseDate: ent?.originalPurchaseDate ?? null,
    expirationDate: ent?.expirationDate ?? null,
    willRenew: !!ent?.willRenew,
    isSandbox: !!ent?.isSandbox,
    managementURL: ci.managementURL ?? null,
  };
}

function cache(isPro: boolean) {
  try {
    localStorage.setItem(CACHE_KEY, isPro ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** 起動直後の表示用（前回確認した結果）。正式な判定は getProInfo() */
export function cachedIsPro(): boolean {
  try {
    return localStorage.getItem(CACHE_KEY) === "1";
  } catch {
    return false;
  }
}

/** 現在のプロ版の状態（SDK がオフライン時は端末内のキャッシュから返す） */
export async function getProInfo(): Promise<ProInfo | null> {
  if (!(await initBilling())) return null;
  const { Purchases } = await rc();
  const { customerInfo } = await Purchases.getCustomerInfo();
  const info = toProInfo(customerInfo);
  cache(info.isPro);
  return info;
}

/** プロ版の状態が変わったとき（購入・復元・返金・期限切れ）に呼ばれる */
export async function onProInfoChange(fn: (info: ProInfo) => void): Promise<() => void> {
  if (!(await initBilling())) return () => undefined;
  const { Purchases } = await rc();
  const id = await Purchases.addCustomerInfoUpdateListener((ci) => {
    const info = toProInfo(ci);
    cache(info.isPro);
    fn(info);
  });
  return () => void Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: id }).catch(() => undefined);
}

/** 課金画面に出す商品（RevenueCat の Offering から取得。価格は App Store の表示価格） */
export async function getPaywallPackages(): Promise<PaywallPackage[]> {
  if (!(await initBilling())) return [];
  const { Purchases } = await rc();
  const offerings = await Purchases.getOfferings();
  const id = appConfig.revenueCat.offeringId;
  const offering = id ? offerings.all[id] : offerings.current;
  if (!offering) return [];
  return offering.availablePackages.map((p) => {
    const prod = p.product;
    const isSubscription = prod.productType === "AUTO_RENEWABLE_SUBSCRIPTION" || (!!prod.subscriptionPeriod && prod.productType !== "NON_CONSUMABLE");
    return {
      identifier: p.identifier,
      packageType: p.packageType,
      title: prod.title,
      description: prod.description,
      priceString: prod.priceString,
      isSubscription,
      period: isSubscription ? prod.subscriptionPeriod : null,
      introPriceString: prod.introPrice?.priceString ?? null,
      introPeriod: prod.introPrice?.period ?? null,
      raw: p,
    };
  });
}

function errorCode(e: unknown): string | undefined {
  return (e as { code?: string | number })?.code?.toString();
}

/**
 * 購入。二重課金を防ぐため、購入直前にもう一度プロ版かどうかを確認し、プロ版なら購入しない。
 */
export async function purchase(pkg: PaywallPackage): Promise<PurchaseOutcome> {
  const before = await getProInfo();
  if (before?.isPro) return { kind: "already-pro", info: before };
  const { Purchases } = await rc();
  try {
    const res = await Purchases.purchasePackage({ aPackage: pkg.raw });
    const info = toProInfo(res.customerInfo);
    cache(info.isPro);
    return { kind: "purchased", info };
  } catch (e) {
    const code = errorCode(e);
    if (code === "1" || (e as { userCancelled?: boolean })?.userCancelled) return { kind: "cancelled" }; // PURCHASE_CANCELLED_ERROR
    if (code === "20") return { kind: "pending" }; // PAYMENT_PENDING_ERROR（承認待ち・ファミリー共有の承認など）
    if (code === "6") {
      // PRODUCT_ALREADY_PURCHASED_ERROR: 購入済み → 復元して反映
      const info = await restore();
      return { kind: "already-pro", info };
    }
    throw new Error(purchaseErrorMessage(e));
  }
}

/** 購入を復元（機種変更・再インストール時） */
export async function restore(): Promise<ProInfo> {
  if (!(await initBilling())) throw new Error("この環境では購入の復元を利用できません");
  const { Purchases } = await rc();
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const info = toProInfo(customerInfo);
    cache(info.isPro);
    return info;
  } catch (e) {
    throw new Error(purchaseErrorMessage(e));
  }
}

export function purchaseErrorMessage(e: unknown): string {
  const code = errorCode(e);
  if (code === "10") return "通信できませんでした。電波の良い場所でもう一度お試しください。";
  if (code === "2") return "App Store との通信で問題が起きました。しばらくしてからお試しください。";
  if (code === "3") return "この端末では購入が許可されていません（スクリーンタイムの設定などをご確認ください）。";
  if (code === "5") return "商品が見つかりませんでした。しばらくしてからお試しください。";
  return (e as Error)?.message || "処理に失敗しました。";
}

/**
 * ログイン機能を追加したときに呼ぶ（今回は未使用）。
 * 匿名 ID で購入した「pro」を、アカウント ID に引き継ぐ。
 * webBilling（Stripe 等）を使う場合も、Web 側で RevenueCat に渡す appUserID を同じアカウント ID にすること。
 */
export async function identify(accountId: string): Promise<ProInfo | null> {
  if (!(await initBilling())) return null;
  const { Purchases } = await rc();
  const { customerInfo } = await Purchases.logIn({ appUserID: accountId });
  const info = toProInfo(customerInfo);
  cache(info.isPro);
  return info;
}

/** ログアウト時に呼ぶ（匿名 ID に戻る）。今回は未使用 */
export async function forgetIdentity(): Promise<void> {
  if (!(await initBilling())) return;
  const { Purchases } = await rc();
  const { isAnonymous } = await Purchases.isAnonymous();
  if (!isAnonymous) await Purchases.logOut();
}
