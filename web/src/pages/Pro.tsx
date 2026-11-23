import { useNavigate, useSearchParams } from "react-router-dom";
import { Paywall } from "../components/paywall/Paywall";
import { PageTitle } from "../components/ui";
import { PRO_BENEFITS, PRO_FEATURE_LABELS } from "../billing/proFeatures";

/** 課金画面（/pro） */
export function ProPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = params.get("from") ?? "";
  return (
    <div className="max-w-lg mx-auto">
      <PageTitle title="プロ版" />
      <Paywall
        headline="論述・計算・本試験形式で、論文式の答案力を仕上げる"
        benefits={PRO_BENEFITS}
        fromLabel={PRO_FEATURE_LABELS[from]}
        onUnlocked={() => {
          // 機能の途中から来た場合は少し待って元の画面へ戻す
          if (from) setTimeout(() => navigate(-1), 1200);
        }}
      />
    </div>
  );
}
