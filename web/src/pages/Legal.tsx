import { Link, useParams } from "react-router-dom";
import { appConfig } from "../../app.config";
import { Markdown } from "../components/Markdown";
import termsMd from "../legal/terms.md?raw";
import privacyMd from "../legal/privacy.md?raw";

/** 規約・ポリシーの最終更新日（本文を変えたら更新する） */
export const LEGAL_UPDATED = "2026年11月23日";

const DOCS: Record<string, string> = { terms: termsMd, privacy: privacyMd };

function fill(md: string): string {
  const contact = appConfig.legal.supportEmail ? `メール: ${appConfig.legal.supportEmail}` : "App Store の本アプリのページにある「サポート」からお問い合わせください。";
  return md
    .replaceAll("{{appName}}", appConfig.storeName)
    .replaceAll("{{operator}}", appConfig.legal.operatorName)
    .replaceAll("{{updated}}", LEGAL_UPDATED)
    .replaceAll("{{contact}}", contact);
}

/** 利用規約・プライバシーポリシー（/legal/terms, /legal/privacy）。アプリに同梱しているのでオフラインでも読める */
export function LegalPage() {
  const { doc = "" } = useParams();
  const md = DOCS[doc];
  if (!md) {
    return (
      <div className="card">
        ページが見つかりません。<Link to="/settings" className="underline ml-1">設定へ</Link>
      </div>
    );
  }
  return (
    <article className="card max-w-3xl prose-legal">
      <Markdown>{fill(md)}</Markdown>
    </article>
  );
}
