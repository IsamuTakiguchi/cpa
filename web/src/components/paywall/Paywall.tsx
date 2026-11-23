/**
 * 課金画面（ペイウォール）。全アプリ共通の部品。
 * - 開いたら最初にプロ版かどうかを確認し、プロ版の人には購入ボタンを出さない（購入元を表示）
 * - 価格は RevenueCat の Offerings から取得（ハードコードしない）
 * - サブスクの場合は価格・期間・自動更新の説明を表示
 * - 「購入を復元」と、利用規約・プライバシーポリシーへのリンクを置く
 * - Web 版の価格や外部での購入は案内しない
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPaywallPackages, purchase, restore, type PaywallPackage, type ProInfo } from "../../native/billing";
import { usePro } from "../../billing/ProProvider";
import { haptic } from "../../native/haptics";
import { Alert, Spinner } from "../ui";

export interface PaywallBenefit {
  icon: string;
  title: string;
  detail: string;
}

export interface PaywallProps {
  /** 見出し（例:「プロ版で論文式の書く力を鍛える」） */
  headline: string;
  benefits: PaywallBenefit[];
  /** どの機能から来たか（「◯◯はプロ版の機能です」と表示） */
  fromLabel?: string;
  /** 購入・復元が完了したとき */
  onUnlocked?: () => void;
}

const PERIOD_UNITS: Record<string, string> = { D: "日", W: "週間", M: "か月", Y: "年" };

/** ISO 8601 の期間（P1M など）を日本語に */
export function periodLabel(iso: string | null): string {
  const m = iso?.match(/^P(\d+)([DWMY])$/);
  if (!m) return "";
  return `${m[1]}${PERIOD_UNITS[m[2]!] ?? ""}`;
}

function packageLabel(p: PaywallPackage): string {
  if (!p.isSubscription) return "買い切り";
  const map: Record<string, string> = { ANNUAL: "年額プラン", SIX_MONTH: "6か月プラン", THREE_MONTH: "3か月プラン", TWO_MONTH: "2か月プラン", MONTHLY: "月額プラン", WEEKLY: "週額プラン" };
  return map[p.packageType] ?? `${periodLabel(p.period)}プラン`;
}

function priceLine(p: PaywallPackage): string {
  if (!p.isSubscription) return `${p.priceString}（1回のお支払いで、追加料金なし）`;
  return `${p.priceString} / ${periodLabel(p.period)}（自動更新）`;
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ja-JP") : "—";
}

export function Paywall({ headline, benefits, fromLabel, onUnlocked }: PaywallProps) {
  const pro = usePro();
  const [checking, setChecking] = useState(true);
  const [packages, setPackages] = useState<PaywallPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "info" | "warn"; text: string } | null>(null);

  // 1) まずプロ版かどうかを確認 → 2) プロ版でなければ商品を取得
  useEffect(() => {
    let alive = true;
    void (async () => {
      setChecking(true);
      const info = await pro.refresh();
      if (!alive) return;
      if (!info?.isPro && pro.enabled && pro.configured) {
        try {
          const list = await getPaywallPackages();
          if (!alive) return;
          setPackages(list);
          setSelected(list.find((p) => !p.isSubscription)?.identifier ?? list[0]?.identifier ?? null);
        } catch {
          if (alive) setPackages([]);
        }
      }
      if (alive) setChecking(false);
    })();
    return () => {
      alive = false;
    };
    // 開いたときに 1 回だけ確認する
  }, []);

  const unlocked = (info: ProInfo, text: string) => {
    pro.setInfo(info);
    haptic.success();
    setMsg({ kind: "success", text });
    onUnlocked?.();
  };

  const doPurchase = async () => {
    const pkg = packages?.find((p) => p.identifier === selected);
    if (!pkg) return;
    setBusy("purchase");
    setMsg(null);
    try {
      const r = await purchase(pkg);
      if (r.kind === "purchased") unlocked(r.info, "ご購入ありがとうございます。プロ版の機能が使えるようになりました。");
      else if (r.kind === "already-pro") unlocked(r.info, "すでにプロ版をお持ちです。購入は行っていません。");
      else if (r.kind === "pending") setMsg({ kind: "info", text: "購入の承認待ちです。承認されると自動でプロ版になります。" });
    } catch (e) {
      haptic.error();
      setMsg({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    setBusy("restore");
    setMsg(null);
    try {
      const info = await restore();
      if (info.isPro) unlocked(info, "購入を復元しました。");
      else setMsg({ kind: "warn", text: "この Apple ID で復元できる購入は見つかりませんでした。" });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const legal = (
    <div className="flex justify-center gap-4 text-xs text-slate-500">
      <Link to="/legal/terms" className="underline">
        利用規約
      </Link>
      <Link to="/legal/privacy" className="underline">
        プライバシーポリシー
      </Link>
    </div>
  );

  if (!pro.enabled) {
    return <div className="card text-sm text-slate-600">この環境ではすべての機能をご利用いただけます。</div>;
  }

  if (checking) return <Spinner label="購入状況を確認しています…" className="py-16" />;

  // ---- すでにプロ版: 購入ボタンは出さない ----
  if (pro.isPro) {
    const info = pro.info;
    return (
      <div className="space-y-4">
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <div className="card text-center py-6">
          <div className="text-4xl" aria-hidden>
            ✅
          </div>
          <div className="text-lg font-bold mt-2">プロ版をご利用中です</div>
          <dl className="mt-4 text-sm text-left max-w-xs mx-auto space-y-1">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">購入元</dt>
              <dd className="font-medium">{info?.store ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">購入日</dt>
              <dd>{formatDate(info?.purchaseDate ?? null)}</dd>
            </div>
            {info?.expirationDate && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{info.willRenew ? "次回更新日" : "有効期限"}</dt>
                <dd>{formatDate(info.expirationDate)}</dd>
              </div>
            )}
            {info?.isSandbox && <div className="text-xs text-amber-700 text-right">（テスト購入）</div>}
          </dl>
          {info?.expirationDate && info.managementURL && (
            <a href={info.managementURL} className="btn-secondary text-sm mt-4 inline-flex">
              サブスクリプションを管理
            </a>
          )}
        </div>
        <ul className="space-y-2">
          {benefits.map((b) => (
            <li key={b.title} className="flex gap-3 text-sm">
              <span aria-hidden>{b.icon}</span>
              <span>{b.title}</span>
            </li>
          ))}
        </ul>
        <button className="btn-ghost w-full text-sm" disabled={!!busy} onClick={doRestore}>
          {busy === "restore" ? "確認中…" : "購入を復元"}
        </button>
        {legal}
      </div>
    );
  }

  const selectedPkg = packages?.find((p) => p.identifier === selected) ?? null;
  const hasSubscription = !!packages?.some((p) => p.isSubscription);

  return (
    <div className="space-y-4">
      {fromLabel && <Alert kind="info">「{fromLabel}」はプロ版の機能です。</Alert>}
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="rounded-3xl bg-gradient-to-br from-brand via-brand-light to-[#4f7cb3] text-white p-5 shadow-[0_20px_50px_-20px_rgba(30,58,95,.7)]">
        <div className="text-xs tracking-widest text-white/70">PRO</div>
        <div className="text-xl font-bold mt-1 leading-snug">{headline}</div>
      </div>

      <ul className="card space-y-3">
        {benefits.map((b) => (
          <li key={b.title} className="flex gap-3">
            <span className="text-xl leading-none mt-0.5" aria-hidden>
              {b.icon}
            </span>
            <span>
              <span className="font-semibold text-sm">{b.title}</span>
              <span className="block text-xs text-slate-500 leading-5">{b.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {!pro.configured ? (
        <Alert kind="warn">プロ版の購入は現在準備中です。</Alert>
      ) : packages === null ? (
        <Spinner label="価格を読み込み中…" className="py-6" />
      ) : packages.length === 0 ? (
        <Alert kind="warn">商品情報を取得できませんでした。通信状況を確認して、しばらくしてからお試しください。</Alert>
      ) : (
        <div className="space-y-2" role="radiogroup" aria-label="プラン">
          {packages.map((p) => (
            <button
              key={p.identifier}
              type="button"
              role="radio"
              aria-checked={selected === p.identifier}
              onClick={() => {
                haptic.selection();
                setSelected(p.identifier);
              }}
              className={`card w-full text-left flex items-center gap-3 border-2 ${selected === p.identifier ? "border-brand" : "border-transparent"}`}
            >
              <span className={`h-5 w-5 rounded-full border-2 shrink-0 ${selected === p.identifier ? "border-brand bg-brand shadow-[inset_0_0_0_3px_#fff]" : "border-slate-300"}`} aria-hidden />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-sm">{packageLabel(p)}</span>
                <span className="block text-xs text-slate-500">{p.title}</span>
                {p.introPriceString && <span className="block text-xs text-emerald-700">最初の{periodLabel(p.introPeriod)}は {p.introPriceString}</span>}
              </span>
              <span className="font-bold tabular-nums">{p.priceString}</span>
            </button>
          ))}
        </div>
      )}

      {selectedPkg && (
        <button className="btn-primary w-full py-3 text-base" disabled={!!busy} onClick={doPurchase}>
          {busy === "purchase" ? "処理中…" : selectedPkg.isSubscription ? `${priceLine(selectedPkg)}で登録` : `${selectedPkg.priceString}でプロ版を購入`}
        </button>
      )}

      {selectedPkg && (
        <p className="text-xs text-slate-500 leading-5">
          {selectedPkg.isSubscription ? (
            <>
              「{selectedPkg.title}」は {priceLine(selectedPkg)} の自動更新サブスクリプションです。お支払いは購入確定時に Apple ID に請求されます。現在の期間が終了する 24 時間前までに自動更新をオフにしない限り、同じ期間・価格で自動的に更新され、期間終了前の 24 時間以内に次の期間の料金が請求されます。購入後は App Store のアカウント設定（設定 → Apple ID → サブスクリプション）から自動更新の管理・解約ができます。
              {selectedPkg.introPriceString && "無料・割引期間がある場合、期間中に購入すると未使用分は失効します。"}
            </>
          ) : (
            <>「{selectedPkg.title}」は買い切りの商品です（{priceLine(selectedPkg)}）。お支払いは購入確定時に Apple ID に請求されます。同じ Apple ID であれば、機種変更や再インストール後も「購入を復元」で引き続き使えます。</>
          )}
        </p>
      )}
      {!selectedPkg && hasSubscription && <p className="text-xs text-slate-500">サブスクリプションは自動更新されます。解約は App Store のアカウント設定から行えます。</p>}

      <button className="btn-ghost w-full text-sm" disabled={!!busy || !pro.configured} onClick={doRestore}>
        {busy === "restore" ? "確認中…" : "購入を復元"}
      </button>
      {legal}
    </div>
  );
}
