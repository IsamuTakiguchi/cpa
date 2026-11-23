import { useEffect, useState } from "react";
import { appConfig } from "../../app.config";
import { isNative } from "../native/platform";
import { MenuList, type MenuItem } from "./ui";

/** 設定画面の「このアプリについて」（規約・プライバシー・お問い合わせ・バージョン） */
export function AboutSection() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!isNative()) return;
    void import("@capacitor/app")
      .then(async ({ App }) => {
        const info = await App.getInfo();
        setVersion(`${info.version}（${info.build}）`);
      })
      .catch(() => undefined);
  }, []);

  const items: MenuItem[] = [
    { to: "/legal/terms", icon: "📄", label: "利用規約" },
    { to: "/legal/privacy", icon: "🔒", label: "プライバシーポリシー" },
  ];
  if (appConfig.legal.supportEmail) {
    items.push({ icon: "✉️", label: "お問い合わせ", onClick: () => (window.location.href = `mailto:${appConfig.legal.supportEmail}`) });
  }
  return (
    <section className="space-y-2">
      <h2 className="font-bold px-1">このアプリについて</h2>
      <MenuList items={items} />
      <p className="text-xs text-slate-500 px-1 leading-5">
        {appConfig.storeName}
        {version && ` バージョン ${version}`}
        <br />
        金融庁・公認会計士・監査審査会とは関係のない非公式の学習アプリです。教材は AI を用いて作成した学習補助資料のため、必ず原典・基準書で確認してください。
      </p>
    </section>
  );
}
