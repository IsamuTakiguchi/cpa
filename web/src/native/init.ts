/**
 * 起動時の環境別初期化。main.tsx から最初に呼ぶ。
 * - Web 版: 従来どおり Service Worker を登録（PWA のオフライン対応・自動更新）
 * - ネイティブ: Service Worker は使わない（アプリに同梱しているので不要。古いキャッシュが邪魔をしないよう解除）
 *              ステータスバー・キーボード・外部リンク・起動画面を整える
 */
import { isNative, isIos } from "./platform";
import { installExternalLinkHandler } from "./externalLinks";

export function initPlatform(): void {
  if (!isNative()) {
    void import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
    return;
  }

  const root = document.documentElement;
  root.classList.add("native");
  if (isIos()) root.classList.add("platform-ios");

  // Service Worker を使わない（念のため既存の登録を解除）
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => undefined);
  }

  installExternalLinkHandler();
  void setupStatusBar();
  void setupKeyboard();
}

async function setupStatusBar() {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // 明るい背景なので濃い文字
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    /* ignore */
  }
}

/** キーボード表示中は下部タブバーを隠し、入力欄の上にかぶらないようにする */
async function setupKeyboard() {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    const root = document.documentElement;
    await Keyboard.addListener("keyboardWillShow", (info) => {
      root.classList.add("kb-open");
      root.style.setProperty("--kb-height", `${info.keyboardHeight}px`);
    });
    await Keyboard.addListener("keyboardWillHide", () => {
      root.classList.remove("kb-open");
      root.style.setProperty("--kb-height", "0px");
    });
    // 入力欄の上の「完了」バーを出す（数値入力などで閉じられるように）
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch {
    /* ignore */
  }
}

/** 最初の画面が描画されたら起動画面を閉じる */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* ignore */
  }
}
