/**
 * ファイルの書き出し・共有・印刷。
 * - Web 版: 従来どおり <a download> でダウンロード、window.print() で印刷
 * - ネイティブ: WKWebView ではダウンロードも window.print() も動かないため、
 *   一時ファイルに書いて共有シート（「ファイルに保存」「メール」など）を開く／iOS の印刷画面（AirPrint・PDF 保存）を開く
 */
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./platform";

export type ShareOutcome = "done" | "cancelled";

function isCancel(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  return msg.includes("cancel");
}

function downloadInBrowser(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** テキストファイルを書き出す（ネイティブは共有シートから「ファイルに保存」などを選べる） */
export async function exportTextFile(filename: string, content: string, mime: string): Promise<ShareOutcome> {
  if (!isNative()) {
    downloadInBrowser(filename, content, mime);
    return "done";
  }
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const res = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title: filename, files: [res.uri] });
    return "done";
  } catch (e) {
    if (isCancel(e)) return "cancelled";
    throw e;
  }
}

/** 文章を共有する（ネイティブ: 共有シート / Web: Web Share API があれば使い、なければクリップボードにコピー） */
export async function shareText(title: string, text: string): Promise<"shared" | "copied" | "cancelled"> {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    try {
      await Share.share({ title, text });
      return "shared";
    } catch (e) {
      if (isCancel(e)) return "cancelled";
      throw e;
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

/** iOS 側の自作プラグイン（ios/App/App/NativePrintPlugin.swift） */
interface NativePrintPlugin {
  printWebView(options: { jobName: string }): Promise<{ completed: boolean }>;
}
const NativePrint = registerPlugin<NativePrintPlugin>("NativePrint");

/** 今の画面を印刷する（ネイティブは AirPrint の画面。そこから PDF として保存・共有もできる） */
export async function printPage(jobName: string): Promise<void> {
  if (!isNative()) {
    window.print();
    return;
  }
  await NativePrint.printWebView({ jobName });
}
