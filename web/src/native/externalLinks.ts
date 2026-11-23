/**
 * 外部リンクの扱い。
 * ネイティブでは WebView 内で外部サイトへ遷移させず、Safari（SFSafariViewController）で開く。
 * Web 版では従来どおり新しいタブで開く。
 */
import { Browser } from "@capacitor/browser";
import { appConfig } from "../../app.config";
import { isNative } from "./platform";

export function isExternalUrl(href: string): boolean {
  try {
    const u = new URL(href, window.location.href);
    return (u.protocol === "http:" || u.protocol === "https:") && u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export async function openExternal(url: string): Promise<void> {
  if (isNative()) {
    await Browser.open({ url, presentationStyle: "popover", toolbarColor: appConfig.theme.background });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * ページ内のすべての <a href="https://..."> クリックを横取りして Safari で開く（ネイティブのみ）。
 * 各コンポーネントを書き換えなくても、既存の target="_blank" リンクがそのまま正しく動く。
 */
export function installExternalLinkHandler(): void {
  if (!isNative()) return;
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!isExternalUrl(href)) return;
      e.preventDefault();
      void openExternal(a.href);
    },
    true,
  );
  // window.open で外部 URL を開こうとした場合も Safari へ
  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = url?.toString() ?? "";
    if (href && isExternalUrl(href)) {
      void openExternal(new URL(href, window.location.href).href);
      return null;
    }
    return originalOpen(url, target, features);
  }) as typeof window.open;
}
