/**
 * 令和9年（2027年）公認会計士試験の日程・手続き・適用法令基準。
 *
 * 対象読者: 短答式試験の全部免除者（司法修習生となる資格を得た者）で、論文式試験は
 * 会計学・監査論・租税法のみを受験する人（企業法・民法〈選択科目〉は免除）。
 *
 * 出典（公認会計士・監査審査会）:
 * - 令和９年公認会計士試験の施行及び実施日程について（令和８年６月19日）
 *   https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/r9schedule20260619.html
 * - 令和９年公認会計士試験受験案内（第Ⅰ回短答式試験用）（令和８年７月21日）: 免除者の出願時期・特別措置期限
 * - 令和８年公認会計士試験受験案内（第Ⅱ回短答式試験用）: 論文式の時間割・受験票日程・納付期限の運用（令和９年分は受験案内で確定）
 * - 免除申請の手続について https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/menjosinsei.html
 * - 免除資格要件と免除科目 https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/youshiki/menjyokamoku.pdf
 * - 添付書類一覧 https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/youshiki/tenpusyorui2.pdf
 * - 令和９年公認会計士試験の出題範囲の要旨について（令和８年６月19日）
 *   https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/hanir9-a.html
 *
 * 「予定」の日付は公表され次第この表を更新する（lastVerified を更新すること）。
 */

/** この情報を公式サイトで最後に確認した日 */
export const EXAM_INFO_LAST_VERIFIED = "2026-09-09";

/** 対象読者の説明（画面表示用） */
export const EXAM_AUDIENCE = {
  title: "短答式試験 全部免除者（司法修習生となる資格を得た方）",
  subjects: "論文式で受験する科目: 会計学（午前・午後）／監査論／租税法",
  exempt: "免除: 短答式試験の全部、論文式試験の企業法・民法（選択科目）",
  notes: [
    "第Ⅰ回短答式試験（2026年12月）には出願できません。論文式の出願は「第Ⅱ回短答式試験の出願期間」（2027年2月上旬〜下旬）に行います。",
    "出願時に「公認会計士試験免除通知書」の番号が必要です。まだ持っていない場合は、出願前に免除申請を済ませます（平成18年以降に交付された通知書は合格まで有効で再申請不要）。",
    "合否は免除科目を除いた 3 科目の合計得点比率で判定されます（52%目安、段階的に 54%へ引き上げ予定。1 科目でも得点比率 40%未満なら不合格になることがあります）。",
    "論文式 3 日目（企業法・選択科目）は免除のため出席不要です。",
  ],
};

export const EXAM_INFO_SOURCES = [
  { title: "令和９年試験について（総合ページ）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/2027shiken.html" },
  { title: "令和９年公認会計士試験の施行及び実施日程について", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/r9schedule20260619.html" },
  { title: "受験案内（令和９年 第Ⅰ回短答式試験用。免除者の出願時期・特別措置期限の根拠）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r9shiken/seikyu01/seikyu01.html" },
  { title: "受験案内（令和８年 第Ⅱ回短答式試験用。論文式の時間割・受験票日程の参考）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/r8shiken/seikyu02/seikyu02.html" },
  { title: "免除申請の手続について（申請書様式・送付先）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/menjosinsei.html" },
  { title: "免除資格要件と免除科目（PDF）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/youshiki/menjyokamoku.pdf" },
  { title: "免除申請の添付書類一覧（PDF）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/youshiki/tenpusyorui2.pdf" },
  { title: "出題範囲の要旨について", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/hanir9-a.html" },
  { title: "論文式試験で配付する法令基準等（令和８年。令和９年分は４月頃に確定版公表）", url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/hourei_r08-a.html" },
  { title: "日本公認会計士協会: 令和9年（2027年）試験について", url: "https://jicpa.or.jp/cpainfo/applicant/31exam.html" },
];

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
  /** 「予定」など未確定の場合 true */
  tentative?: boolean;
  description: string;
  url?: string;
}

export const EXAM_EVENTS: ExamEvent[] = [
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
    title: "第Ⅱ回短答式 受験案内の公表（論文式の出願手続もこれで確定）",
    date: "2027-01-15",
    kind: "info",
    tentative: true,
    description: "公式には「令和9年1月中予定」。免除申請の提出期限、出願期間、受験手数料の納付期限、受験票の日程、論文式の時間割がこの受験案内で確定する。公表されたら必ず読む。",
    url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/2027shiken.html",
  },
  {
    id: "exempt-apply",
    title: "免除申請書の提出期限（免除通知書をまだ持っていない場合）",
    date: "2027-01-22",
    time: "審査会必着",
    kind: "deadline",
    tentative: true,
    description: "令和8年試験では「その他の申請者: 1月23日（金）必着」だった。令和9年分は第Ⅱ回受験案内で確定。免除通知書が無いと免除の適用を受けて出願できないため、余裕をもって郵送する。平成18年以降に交付された免除通知書を持っていれば不要。",
    url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/menjosinsei.html",
  },
  {
    id: "t2-apply",
    title: "論文式の出願期間（第Ⅱ回短答式の出願期間にインターネット出願）",
    date: "2027-02-01",
    endDate: "2027-02-24",
    time: "初日 10:30頃 〜 最終日 23:59（期限厳守）の見込み",
    kind: "deadline",
    tentative: true,
    description: "公式には「令和9年2月上旬〜2月下旬」（日本公認会計士協会の案内では 2/1〜2/24）。出願サイトで ID 登録→出願事項入力。免除通知書の番号を入力し、選択科目は「民法」を選んで免除の適用を選択する。試験地・選択科目・免除科目は出願後に変更できない。",
  },
  {
    id: "t2-fee",
    title: "受験手数料 19,500円 の納付期限（Pay-easy）",
    date: "2027-02-25",
    time: "23:59（期限厳守）の見込み",
    kind: "deadline",
    tentative: true,
    description: "出願期間最終日の翌日が納付期限になる運用（令和8年: 2/24 出願締切→2/25 納付期限）。出願完了後に発行される納付番号で ATM またはインターネットバンキングから電子納付。納付が確認できないと出願は不受理。ATM の明細票は受験票ダウンロードまで保管。",
  },
  {
    id: "law-list",
    title: "論文式試験用 配付法令基準等一覧（確定版）の公表",
    date: "2027-04-15",
    kind: "info",
    tentative: true,
    description: "会計学（午後）・監査論・租税法では試験場で法令基準等が配付される。配付される基準・法令の一覧は4月頃に確定版が公表されるので、収録範囲と持込不可の資料を確認する。",
    url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/hourei_r08-a.html",
  },
  {
    id: "ticket-mail",
    title: "受験票・写真票 ダウンロード案内メール",
    date: "2027-04-24",
    kind: "info",
    tentative: true,
    description: "令和8年は4月24日に出願サイトから案内メール。届かない場合は迷惑メールフォルダと、出願後にメールアドレスを変えていないかを確認。",
  },
  {
    id: "ticket-dl",
    title: "受験票・写真票のダウンロード期限",
    date: "2027-05-23",
    time: "9:00 まで（見込み）",
    kind: "deadline",
    tentative: true,
    description: "令和8年は第Ⅱ回短答式試験日（5月）の 9:00 が期限。免除者も同じ受験票を論文式で使うので、A4 に印刷して試験当日まで保管する。",
  },
  {
    id: "ron-special",
    title: "論文式 受験特別措置（障がい・妊娠等）の書類提出期限",
    date: "2027-06-25",
    kind: "deadline",
    tentative: true,
    description: "第Ⅱ回短答式合格発表日から7日後（受験案内より）。希望する場合は事前に tokubetsusochi@fsa.go.jp に問い合わせ、申請書と証明書類を提出。該当しなければ不要。",
  },
  {
    id: "ron-venue",
    title: "論文式 試験場の公表（試験日の約1か月前）",
    date: "2027-07-20",
    kind: "info",
    tentative: true,
    description: "審査会ウェブサイトと官報で公表。試験場を間違えると受験できない。2日間（8/20・8/21）の移動・宿泊を手配する。",
  },
  {
    id: "ron-day1",
    title: "論文式試験 1日目: 監査論・租税法",
    date: "2027-08-20",
    time: "監査論 10:30〜12:30（着席 10:10）／租税法 14:30〜16:30（着席 14:10）※令和8年の時間割",
    kind: "exam",
    description: "受験票・写真票・本人確認書類（顔写真付き・有効期限内・生年月日記載）を持参。監査論・租税法では法令基準等が配付される。耳栓は使用禁止。",
  },
  {
    id: "ron-day2",
    title: "論文式試験 2日目: 会計学（午前: 管理会計論／午後: 財務会計論）",
    date: "2027-08-21",
    time: "午前 10:30〜12:30（着席 10:10）／午後 14:30〜17:30（着席 14:10）※令和8年の時間割",
    kind: "exam",
    description: "午前は管理会計論 2時間・大問2、午後は財務会計論 3時間・大問3。午後は法令基準等が配付される。",
  },
  {
    id: "ron-day3",
    title: "論文式試験 3日目: 企業法・選択科目（免除のため出席不要）",
    date: "2027-08-22",
    kind: "info",
    description: "企業法・民法は免除科目なので受験しない。",
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
  detail: string;
  /** 関連イベント */
  eventId?: string;
}

/** 手続きチェックリスト（順番どおりに並べる） */
export const EXAM_CHECKLIST: ChecklistItem[] = [
  {
    id: "c-notice",
    title: "「公認会計士試験免除通知書」を手元で確認（番号を控える）",
    due: "2026-12-31",
    detail: "平成18年以降に交付された通知書なら合格まで有効で再申請不要（令和4年9月30日以前に司法試験合格を要件として交付されたものも有効）。紛失した場合は再発行ではなく「免除証明書」の発行を申請する。",
  },
  {
    id: "c-certs",
    title: "（通知書が無い場合）司法試験合格証明書と法科大学院修了証明書（または予備試験合格証明書）の原本を取り寄せる",
    due: "2027-01-10",
    detail: "いずれも法務省・法科大学院が発行する「証明書」（合格証書ではない）。2種類とも必要。取得に日数がかかるので早めに。",
    eventId: "exempt-apply",
  },
  {
    id: "c-exempt-mail",
    title: "（通知書が無い場合）免除申請書＋証明書原本＋返信用封筒を審査会へ簡易書留で郵送",
    due: "2027-01-22",
    detail: "封筒に「公認会計士試験 免除申請書在中」と朱書き。返信用封筒には簡易書留 460円（または特定記録 320円）分の切手を貼り宛先を明記。期限は第Ⅱ回受験案内で確定（令和8年は1月23日必着）。",
    eventId: "exempt-apply",
  },
  {
    id: "c-guide2",
    title: "第Ⅱ回受験案内を読み、免除申請期限・出願期間・納付期限・受験票の日程を確認",
    due: "2027-01-31",
    detail: "このアプリの日程は「予定」。受験案内で確定した日付に置き換える（毎月の自動確認でも更新）。",
    eventId: "t2-guide",
  },
  {
    id: "c-id",
    title: "出願サイトで新規ID登録（氏名・生年月日は正確に）、顔写真データを用意",
    due: "2027-02-20",
    detail: "登録したメールアドレスは合格発表まで変更しない（変更するとマイページにログインできなくなる）。写真の規格は出願サイトの案内どおり。",
    eventId: "t2-apply",
  },
  {
    id: "c-apply",
    title: "論文式に出願（免除通知書の番号を入力、選択科目は「民法」を選び免除の適用を選択、試験地を確定）",
    due: "2027-02-24",
    detail: "出願時に免除の適用を選択しないと免除は受けられない。試験地・選択科目・免除科目は出願後いかなる理由でも変更不可。",
    eventId: "t2-apply",
  },
  {
    id: "c-fee",
    title: "受験手数料 19,500円 を Pay-easy で納付し、明細を保管",
    due: "2027-02-25",
    detail: "納付確認をもって出願受理。納付しないと不受理。受験しなくても返金されない。",
    eventId: "t2-fee",
  },
  {
    id: "c-idcheck",
    title: "本人確認書類（顔写真付き・有効期限内・生年月日記載）の有効期限を確認",
    due: "2027-07-31",
    detail: "運転免許証、マイナンバーカード、パスポート等の8種類に限定。期限切れは受験できない。",
  },
  {
    id: "c-ticket",
    title: "受験票・写真票をダウンロードして A4 に印刷し、試験当日まで保管",
    due: "2027-05-23",
    detail: "4月下旬の案内メールを確認。受験票と写真票は別 PDF。両面印刷は不可。",
    eventId: "ticket-dl",
  },
  {
    id: "c-lawlist",
    title: "配付法令基準等一覧（確定版）を確認し、収録範囲と持込不可の資料を把握",
    due: "2027-05-31",
    detail: "会計学（午後）・監査論・租税法で配付される基準・法令の収録範囲を知っておくと、答案で条文・基準を引く練習に活かせる。",
    eventId: "law-list",
  },
  {
    id: "c-venue",
    title: "試験場を確認し、2日間（8/20・8/21）の移動・宿泊を手配",
    due: "2027-07-31",
    detail: "試験日の約1か月前に公表。同一試験地に複数会場がある場合は特に注意。3日目は出席不要。",
    eventId: "ron-venue",
  },
  {
    id: "c-items",
    title: "持ち物を準備（受験票・写真票・本人確認書類・筆記用具・電卓）",
    due: "2027-08-19",
    detail: "受験案内の持込可能物の規定を確認。耳栓は使用禁止。",
    eventId: "ron-day1",
  },
];

export interface TimetableRow {
  day: string;
  date: string;
  subject: string;
  seated: string;
  time: string;
  /** この人が受験するか */
  attend: boolean;
  note?: string;
}

/** 論文式試験の時間割（令和8年実績。令和9年分は第Ⅱ回受験案内で確定） */
export const EXAM_TIMETABLE: TimetableRow[] = [
  { day: "1日目", date: "2027-08-20", subject: "監査論", seated: "10:10", time: "10:30〜12:30（120分・大問2）", attend: true, note: "法令基準等が配付される" },
  { day: "1日目", date: "2027-08-20", subject: "租税法", seated: "14:10", time: "14:30〜16:30（120分・大問2）", attend: true, note: "法令基準等が配付される" },
  { day: "2日目", date: "2027-08-21", subject: "会計学（午前）＝管理会計論", seated: "10:10", time: "10:30〜12:30（120分・大問2）", attend: true },
  { day: "2日目", date: "2027-08-21", subject: "会計学（午後）＝財務会計論", seated: "14:10", time: "14:30〜17:30（180分・大問3）", attend: true, note: "法令基準等が配付される" },
  { day: "3日目", date: "2027-08-22", subject: "企業法", seated: "10:10", time: "10:30〜12:30", attend: false, note: "免除（出席不要）" },
  { day: "3日目", date: "2027-08-22", subject: "選択科目（民法）", seated: "14:10", time: "14:30〜16:30", attend: false, note: "免除（出席不要）" },
];

/** 免除申請の手引き（免除通知書をまだ持っていない場合） */
export const EXEMPTION_GUIDE = {
  who: "司法修習生となる資格（高等試験司法科試験の合格を除く）を得た方。司法試験に合格していても、法科大学院修了または司法試験予備試験合格が必要（修了見込みでは申請不可）。",
  exempt: "短答式試験の全部、論文式試験の企業法・民法が免除される。",
  documents: [
    "公認会計士試験免除申請書（審査会ウェブサイトの様式。氏名は通知書に記載されるので正確に）",
    "司法試験合格証明書（法務省発行・原本）※合格証書ではない",
    "法科大学院修了証明書（法科大学院発行・原本）または司法試験予備試験合格証明書（法務省発行・原本）",
    "返信用封筒（簡易書留 460円 または 特定記録 320円 分の切手を貼り、「簡易書留」等と明記、自分の郵便番号・住所・氏名を記入）",
  ],
  sendTo: "〒100-8905 東京都千代田区霞が関3-2-1 中央合同庁舎第7号館 公認会計士・監査審査会事務局総務試験課試験担当係",
  how: "封筒の表に「公認会計士試験 免除申請書在中」と朱書きし、簡易書留または特定記録郵便で郵送する。郵送料金不足は受理されない。",
  notes: [
    "提出期限は受験案内に記載される（令和8年試験の第Ⅱ回では「その他の申請者: 1月23日必着」）。出願開始前に通知書が届くよう早めに送る。",
    "平成18年以降に交付された免除通知書は合格するまで有効で、再度の申請は不要。",
    "免除通知書は再発行できない。紛失した場合は「免除証明書」の発行を申請する。",
    "出願時に通知書右上の番号を入力し、免除の適用を受ける科目を選択する（選択しないと免除されない）。",
  ],
  url: "https://www.fsa.go.jp/cpaaob/kouninkaikeishi-shiken/menjosinsei.html",
};

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
    "論文式試験は、令和9年4月1日現在施行（適用）の法令等が基準。租税法のみ令和9年1月1日現在。",
    "早期適用が認められる会計基準は出題範囲に含まれることがある。その場合でも、従来の基準が適用可能な期間は従来の基準も出題範囲になる（新旧両方を押さえる）。",
    "出題範囲の要旨は、法令等の改正を踏まえて令和9年1月時点で再度公表される予定。",
    "会計学（午後）・監査論・租税法では試験場で法令基準等が配付される（収録一覧は4月頃に確定版公表）。",
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
  "論文式試験の合格基準を52%から54%へ、3〜4年かけて段階的に引き上げ。免除科目を除いた科目の合計得点比率で判定。",
  "試験時間中の耳栓の使用を禁止。本人確認書類は顔写真付き・有効期限内・生年月日記載のもの8種類に限定。",
  "出願はインターネットのみ。受験手数料は電子納付（Pay-easy）のみ。",
  "短答式試験では財務会計論・管理会計論・監査論で一部英語による出題を開始（短答式免除者には影響なし。論文式に英語出題の予定はない）。",
];
