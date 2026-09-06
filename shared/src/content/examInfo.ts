/**
 * 令和9年（2027年）公認会計士試験の日程・手続き・適用法令基準。
 *
 * 出典（公認会計士・監査審査会）:
 * - 令和９年公認会計士試験の施行及び実施日程について（令和８年６月19日）
 *   https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/r9schedule20260619.html
 * - 令和９年公認会計士試験受験案内（第Ⅰ回短答式試験用）（令和８年７月21日）
 *   https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/seikyu01/seikyu01.html
 * - 令和９年公認会計士試験の出題範囲の要旨について（令和８年６月19日）
 *   https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/hanir9-a.html
 * - インターネット出願サイト（受付開始日時のご案内）（令和８年８月28日）
 *   https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/netshutsugan/2026-1.html
 *
 * 「予定」の日付は公表され次第この表を更新する（lastVerified を更新すること）。
 */

/** この情報を公式サイトで最後に確認した日 */
export const EXAM_INFO_LAST_VERIFIED = "2026-09-06";

export const EXAM_INFO_SOURCES = [
  { title: "令和９年試験について（総合ページ）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/2027shiken.html" },
  { title: "令和９年公認会計士試験の施行及び実施日程について", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/r9schedule20260619.html" },
  { title: "受験案内（第Ⅰ回短答式試験用）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/seikyu01/seikyu01.html" },
  { title: "出題範囲の要旨について", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/hanir9-a.html" },
  { title: "インターネット出願サイトのご案内", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/netshutsugan/2026-1.html" },
  { title: "日本公認会計士協会: 令和9年（2027年）試験について", url: "https://jicpa.or.jp/cpainfo/applicant/31exam.html" },
];

/**
 * 受験区分。どの出願期間が自分に関係するかを決める。
 * - tanto1: 第Ⅰ回短答式から受験する
 * - tanto2: 第Ⅱ回短答式から受験する（第Ⅰ回は受けない）
 * - exempt: 短答式に合格済み（令和7年・8年）または短答式全部免除 → 第Ⅱ回短答式の出願期間に論文式のみ出願
 */
export type ExamTrack = "tanto1" | "tanto2" | "exempt";

export const EXAM_TRACK_LABELS: Record<ExamTrack, string> = {
  tanto1: "第Ⅰ回短答式（2026年12月）から受験",
  tanto2: "第Ⅱ回短答式（2027年5月）から受験",
  exempt: "短答式合格済み・全部免除（論文式のみ受験）",
};

export type EventKind = "deadline" | "exam" | "announcement" | "info";

export interface ExamEvent {
  id: string;
  title: string;
  /** ISO 日付 (YYYY-MM-DD)。期間なら start。 */
  date: string;
  /** 期間の終了日（同日なら省略） */
  endDate?: string;
  /** 時刻など補足（例: 23:59 期限厳守） */
  time?: string;
  kind: EventKind;
  /** 関係する受験区分（省略＝全区分） */
  tracks?: ExamTrack[];
  /** 「予定」など未確定の場合 true */
  tentative?: boolean;
  description: string;
  url?: string;
}

export const EXAM_EVENTS: ExamEvent[] = [
  {
    id: "t1-apply",
    title: "第Ⅰ回短答式 インターネット出願期間",
    date: "2026-08-28",
    endDate: "2026-09-17",
    time: "8/28 10:30頃 〜 9/17 23:59（期限厳守）",
    kind: "deadline",
    tracks: ["tanto1"],
    description: "出願はインターネット出願サイトのみ（紙の願書はありません）。ID登録→出願事項入力→納付番号の発行。9/17 23:59 を過ぎると出願できません。",
    url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/netshutsugan/2026-1.html",
  },
  {
    id: "t1-fee",
    title: "第Ⅰ回短答式 受験手数料 19,500円 の納付期限（Pay-easy）",
    date: "2026-09-18",
    time: "23:59（期限厳守）",
    kind: "deadline",
    tracks: ["tanto1"],
    description: "出願完了後に発行される納付番号で、ATM またはインターネットバンキングから電子納付。納付が確認できないと出願は不受理。領収書は出ないので ATM の明細票は受験票ダウンロードまで保管。",
  },
  {
    id: "t1-special",
    title: "第Ⅰ回短答式 受験特別措置（障がい・妊娠等）の書類提出期限",
    date: "2026-09-17",
    kind: "deadline",
    tracks: ["tanto1"],
    description: "希望する場合は出願前に tokubetsusochi@fsa.go.jp に問い合わせ、申請書と証明書類を提出。",
  },
  {
    id: "t1-ticket-mail",
    title: "第Ⅰ回短答式 受験票・写真票ダウンロード案内メール",
    date: "2026-11-13",
    kind: "info",
    tracks: ["tanto1"],
    description: "出願サイトから案内メールが届く。届かない場合は迷惑メールフォルダとメールアドレス変更の有無を確認。",
  },
  {
    id: "t1-venue",
    title: "第Ⅰ回短答式 試験場の公表（試験日の約1か月前）",
    date: "2026-11-13",
    kind: "info",
    tracks: ["tanto1"],
    tentative: true,
    description: "審査会ウェブサイトと官報で公表。試験場を間違えると受験できないため、同一試験地に複数会場がある場合は特に確認。",
  },
  {
    id: "t1-ticket-dl",
    title: "第Ⅰ回短答式 受験票・写真票のダウンロード期限",
    date: "2026-12-13",
    time: "9:00 まで",
    kind: "deadline",
    tracks: ["tanto1"],
    description: "受験票と写真票の両方を印刷して持参。あわせて有効期限内の顔写真付き本人確認書類（運転免許証、マイナンバーカード、パスポート等）が必要。",
  },
  {
    id: "t1-exam",
    title: "第Ⅰ回短答式試験",
    date: "2026-12-13",
    kind: "exam",
    tracks: ["tanto1"],
    description: "財務会計論・管理会計論・監査論・企業法。令和9年試験から財務会計論・管理会計論・監査論で一部英語による出題あり。試験時間中の耳栓は禁止。",
  },
  {
    id: "t1-result",
    title: "第Ⅰ回短答式 合格発表",
    date: "2027-01-22",
    kind: "announcement",
    tracks: ["tanto1"],
    tentative: true,
    description: "公式には「令和9年1月下旬」。合格すると同年の論文式試験を受験できる（受験票は論文式でも同じものを使用するので保管）。",
  },
  {
    id: "scope-rev",
    title: "出題範囲の要旨（改訂版）の再公表",
    date: "2027-01-15",
    kind: "info",
    tentative: true,
    description: "法令等の改正を踏まえ、令和9年1月時点で再度公表される予定。適用基準の変更がないか確認する。",
    url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/hanir9-a.html",
  },
  {
    id: "t2-guide",
    title: "第Ⅱ回短答式 受験案内の公表",
    date: "2027-01-15",
    kind: "info",
    tracks: ["tanto2", "exempt", "tanto1"],
    tentative: true,
    description: "公式には「令和9年1月中予定」。出願期間・納付期限・免除手続の詳細はこの受験案内で確定する。",
  },
  {
    id: "t2-apply",
    title: "第Ⅱ回短答式 インターネット出願期間（論文式のみ受験する人もこの期間に出願）",
    date: "2027-02-01",
    endDate: "2027-02-24",
    kind: "deadline",
    tracks: ["tanto2", "exempt"],
    tentative: true,
    description: "公式には「令和9年2月上旬〜2月下旬」（日本公認会計士協会の案内では 2/1〜2/24）。短答式合格者（令和7・8年）、短答式全部免除者、旧2次試験合格者は第Ⅰ回には出願できず、この期間に出願する必要がある。",
  },
  {
    id: "t2-fee",
    title: "第Ⅱ回短答式 受験手数料 19,500円 の納付期限",
    date: "2027-02-25",
    kind: "deadline",
    tracks: ["tanto2", "exempt"],
    tentative: true,
    description: "出願期間最終日の翌日が納付期限になる見込み（第Ⅰ回と同じ運用）。受験案内で確定。",
  },
  {
    id: "t2-exempt-docs",
    title: "免除申請書類・出願補正願などの提出期限（審査会必着）",
    date: "2027-02-24",
    kind: "deadline",
    tracks: ["tanto2", "exempt", "tanto1"],
    tentative: true,
    description: "「公認会計士試験免除通知書」の取得が必要な人、論文式一部科目免除を受ける人などは書面の提出が必要。第Ⅰ回短答式合格後に論文式一部科目免除を受ける場合も同日必着。",
  },
  {
    id: "t2-exam",
    title: "第Ⅱ回短答式試験",
    date: "2027-05-23",
    kind: "exam",
    tracks: ["tanto2", "tanto1"],
    description: "第Ⅰ回で不合格の場合はこちらを受験。試験場は約1か月前に公表。",
  },
  {
    id: "t2-result",
    title: "第Ⅱ回短答式 合格発表",
    date: "2027-06-18",
    kind: "announcement",
    tracks: ["tanto2", "tanto1"],
    tentative: true,
    description: "公式には「令和9年6月中旬」。",
  },
  {
    id: "ron-special",
    title: "論文式 受験特別措置の書類提出期限",
    date: "2027-06-25",
    kind: "deadline",
    tentative: true,
    description: "第Ⅱ回短答式合格発表日から7日後（受験案内より）。特別措置は短答・論文の都度申請が必要。",
  },
  {
    id: "ron-venue",
    title: "論文式 試験場の公表（試験日の約1か月前）",
    date: "2027-07-20",
    kind: "info",
    tentative: true,
    description: "審査会ウェブサイトと官報で公表。宿泊が必要なら早めに手配。",
  },
  {
    id: "ron-exam",
    title: "論文式試験（3日間）",
    date: "2027-08-20",
    endDate: "2027-08-22",
    kind: "exam",
    description: "8/20（金）〜8/22（日）。会計学（午前: 管理会計論 2時間、午後: 財務会計論 3時間）、監査論・租税法（各2時間）、企業法、選択科目。合格ラインは52%から段階的に54%へ引き上げ予定。",
  },
  {
    id: "ron-result",
    title: "論文式 合格発表",
    date: "2027-11-19",
    kind: "announcement",
    tentative: true,
    description: "公式には「令和9年11月中旬」。",
  },
];

export interface ChecklistItem {
  id: string;
  title: string;
  /** 期限（ISO）。無い場合は目安 */
  due?: string;
  tracks?: ExamTrack[];
  detail: string;
  /** 関連イベント */
  eventId?: string;
}

/** 手続きチェックリスト（順番どおりに並べる） */
export const EXAM_CHECKLIST: ChecklistItem[] = [
  { id: "c-id", title: "インターネット出願サイトで新規ID登録（氏名・生年月日は正確に）", due: "2026-09-17", tracks: ["tanto1"], detail: "ID登録時の氏名・生年月日はパスワード再発行の認証情報になる。登録したメールアドレスは合格発表まで変更しない（変更するとマイページにログインできなくなる）。", eventId: "t1-apply" },
  { id: "c-photo", title: "顔写真データを用意（規格は出願サイトの案内どおり）", due: "2026-09-17", tracks: ["tanto1"], detail: "出願時にアップロード。背景・サイズ・撮影時期の規格を守る。" },
  { id: "c-apply1", title: "第Ⅰ回短答式に出願（免除科目があれば通知書番号を入力）", due: "2026-09-17", tracks: ["tanto1"], detail: "出願時に免除の適用を選択しないと免除は受けられない。会計専門職大学院修了見込者などは別途書類提出が必要。", eventId: "t1-apply" },
  { id: "c-fee1", title: "受験手数料 19,500円 を Pay-easy で納付し、明細を保管", due: "2026-09-18", tracks: ["tanto1"], detail: "納付期限 9/18 23:59。納付確認をもって出願受理。", eventId: "t1-fee" },
  { id: "c-idcheck", title: "本人確認書類（顔写真付き・有効期限内・生年月日記載）の有効期限を確認", due: "2026-12-01", detail: "運転免許証、マイナンバーカード、パスポート等の8種類に限定。期限切れは受験できない。" },
  { id: "c-ticket1", title: "受験票・写真票をダウンロードして印刷（12/13 9:00 まで）", due: "2026-12-13", tracks: ["tanto1"], detail: "11/13 の案内メールを確認。当日は両方を持参。", eventId: "t1-ticket-dl" },
  { id: "c-venue1", title: "第Ⅰ回短答式の試験場を確認し、経路・宿泊を手配", due: "2026-12-06", tracks: ["tanto1"], detail: "試験日の約1か月前に公表。", eventId: "t1-venue" },
  { id: "c-scope", title: "出題範囲の要旨（改訂版）で適用基準の変更を確認", due: "2027-01-31", detail: "令和9年1月時点で再公表される予定。このアプリの「適用基準・法令」も更新する。", eventId: "scope-rev" },
  { id: "c-guide2", title: "第Ⅱ回短答式の受験案内を読み、出願期間・納付期限を確認", due: "2027-01-31", tracks: ["tanto2", "exempt", "tanto1"], detail: "第Ⅰ回不合格の場合の再出願もこの期間。", eventId: "t2-guide" },
  { id: "c-apply2", title: "第Ⅱ回短答式の出願期間に出願（論文式のみの人もここで出願）", due: "2027-02-24", tracks: ["tanto2", "exempt"], detail: "短答式合格者・全部免除者は第Ⅰ回には出願できない。免除通知書の番号を出願時に入力。", eventId: "t2-apply" },
  { id: "c-fee2", title: "第Ⅱ回短答式の受験手数料を納付", due: "2027-02-25", tracks: ["tanto2", "exempt"], detail: "納付期限は受験案内で確定。", eventId: "t2-fee" },
  { id: "c-exempt-docs", title: "免除申請書・出願補正願など書面が必要な場合は審査会に提出（必着）", due: "2027-02-24", tracks: ["tanto2", "exempt", "tanto1"], detail: "簡易書留または特定記録で送付。", eventId: "t2-exempt-docs" },
  { id: "c-ticket2", title: "第Ⅱ回短答式の受験票・写真票をダウンロード", due: "2027-05-23", tracks: ["tanto2", "tanto1"], detail: "短答合格後は同じ受験票を論文式でも使うので紛失しない。", eventId: "t2-exam" },
  { id: "c-ron-venue", title: "論文式の試験場を確認し、3日間の宿泊・移動を手配", due: "2027-07-31", detail: "試験日の約1か月前に公表。", eventId: "ron-venue" },
  { id: "c-ron-items", title: "論文式の持ち物を準備（受験票・写真票・本人確認書類・筆記用具・電卓）", due: "2027-08-19", detail: "受験案内の持込可能物の規定を確認。耳栓は使用禁止。", eventId: "ron-exam" },
];

export interface StandardNote {
  subject: string;
  basisDate: string;
  points: string[];
}

/** 適用法令・基準（論文式試験） */
export const APPLICABLE_STANDARDS = {
  /** 論文式・第Ⅱ回短答式の法令基準日 */
  ronbunBasisDate: "2027-04-01",
  taxBasisDate: "2027-01-01",
  tanto1BasisDate: "2026-04-01",
  general: [
    "第Ⅱ回短答式試験および論文式試験は、令和9年4月1日現在施行（適用）の法令等が基準。租税法のみ令和9年1月1日現在。",
    "第Ⅰ回短答式試験は、令和8年4月1日現在施行（適用）の法令等が基準。",
    "早期適用が認められる会計基準は出題範囲に含まれることがある。その場合でも、従来の基準が適用可能な期間は従来の基準も出題範囲になる（新旧両方を押さえる）。",
    "出題範囲の要旨は、法令等の改正を踏まえて令和9年1月時点で再度公表される予定。",
  ],
  subjects: [
    {
      subject: "財務会計論",
      basisDate: "2027-04-01",
      points: [
        "新リース会計基準（企業会計基準第34号、2024年9月公表）は2027年4月1日以後開始する事業年度から強制適用（2025年4月1日以後開始年度から早期適用可）。基準日時点で「適用される」基準であり、従来基準（第13号）が適用可能な期間も残るため、借手の使用権資産・リース負債モデルと従来のファイナンス／オペレーティング区分の両方を確認する。",
        "収益認識に関する会計基準（第29号）、金融商品、減損、退職給付、税効果、企業結合・連結、外貨換算、資産除去債務、ストック・オプション、会計上の変更及び誤謬の訂正は現行基準のまま。",
        "会計基準の国際的コンバージェンス、指定国際会計基準・修正国際基準における代替的な考え方も出題範囲。",
      ],
    },
    {
      subject: "管理会計論",
      basisDate: "2027-04-01",
      points: ["原価計算基準（昭和37年）を中心とし、2027年試験に向けた新基準の予定はない。原価計算基準の条文番号と用語を正確に。"],
    },
    {
      subject: "監査論",
      basisDate: "2027-04-01",
      points: [
        "監査基準（2020年11月改訂: その他の記載内容、リスク・アプローチの強化）、監査に関する品質管理基準（2021年11月改訂、品質管理システム）、監査基準報告書（315・540・220 など改正後）を前提。",
        "内部統制基準は2023年4月改訂（2024年4月1日以後開始事業年度から適用）を反映。",
        "監査基準・監基報の改正が令和9年4月1日までに公表・適用された場合は再確認する（要旨の改訂版で確認）。",
      ],
    },
    {
      subject: "租税法",
      basisDate: "2027-01-01",
      points: [
        "令和9年1月1日現在施行の法令が基準。したがって令和8年度税制改正までが範囲で、令和9年度税制改正（通常2027年4月1日施行）は含まれない。",
        "出題範囲は法人税法を中心に所得税法・消費税法の構造的理解、関連する租税特別措置法。国際課税は外国法人の法人税、非居住者・法人の納税義務、外国税額控除のみ。外国子会社合算税制・移転価格税制・過少資本税制・国際最低課税額に対する法人税、グループ通算制度、相続税法、租税手続法等は除外。",
        "税率・限度額（法人税率、交際費の特例、少額減価償却資産の特例、所得税の基礎控除等）は令和9年1月1日時点の値で確認する。",
      ],
    },
  ] satisfies StandardNote[],
};

/** その他の制度変更 */
export const EXAM_CHANGES_2027 = [
  "短答式試験の財務会計論・管理会計論・監査論で一部英語による出題を開始（令和8年5月25日公表）。論文式には英語出題の予定なし。",
  "論文式試験の合格基準を52%から54%へ、3〜4年かけて段階的に引き上げ。",
  "試験時間中の耳栓の使用を禁止。本人確認書類は顔写真付き・有効期限内・生年月日記載のもの8種類に限定。",
  "出願はインターネットのみ。受験手数料は電子納付（Pay-easy）のみ。",
];
