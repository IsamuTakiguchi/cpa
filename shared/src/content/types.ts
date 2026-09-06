/**
 * 教材コンテンツの型定義。
 * 論点（Topic）単位でファイルを分け、手で追記・修正しやすい構造にしている。
 * すべての問題には `id` を付ける（アプリ内の履歴・SRS・弱点分析はこの id をキーにする）。
 * id は科目コード-論点コード-種別-連番 の形式（例: fa-01-card-03）。既存 id は変更しないこと。
 */

export type SubjectId = "financial" | "managerial" | "audit" | "tax";

export type Difficulty = 1 | 2 | 3;

export type QuestionKind = "card" | "tf" | "short" | "mini" | "essay" | "calc";

/** 暗記カード（定義・基準の文言・条文番号など） */
export interface Card {
  id: string;
  front: string;
  back: string;
  /** 補足（出典の基準名・条文など） */
  source?: string;
}

/** 正誤問題 */
export interface TrueFalseQuestion {
  id: string;
  statement: string;
  answer: boolean;
  reason: string;
  difficulty: Difficulty;
}

/** 穴埋め・一問一答（短文入力。acceptedKeywords のいずれかを含めば正解） */
export interface ShortAnswerQuestion {
  id: string;
  question: string;
  acceptedKeywords: string[];
  answer: string;
  explanation?: string;
  difficulty: Difficulty;
}

/** 採点ポイント（論述の採点基準） */
export interface GradingPoint {
  /** 採点者（自分・AI）が確認する観点。キーワードや論理の要素 */
  text: string;
  /** 配点 */
  score: number;
}

/** 小論述（3〜5行程度、5〜8分） */
export interface MiniEssayQuestion {
  id: string;
  question: string;
  modelAnswer: string;
  points: GradingPoint[];
  estimatedMinutes: number;
  difficulty: Difficulty;
}

/** 大問論述の枝問 */
export interface EssaySubQuestion {
  /** 枝問番号（問1, 問2 ...） */
  label: string;
  question: string;
  modelAnswer: string;
  points: GradingPoint[];
  /** この枝問の配点（points の合計と一致させる） */
  allocation: number;
}

/** 大問論述（本試験1問相当） */
export interface EssayQuestion {
  id: string;
  title: string;
  /** 資料・前提条件（Markdown） */
  intro: string;
  subQuestions: EssaySubQuestion[];
  estimatedMinutes: number;
  difficulty: Difficulty;
}

/** 計算問題の解答欄 */
export interface CalcAnswer {
  label: string;
  /** 正解値 */
  value: number;
  /** 許容誤差（絶対値）。省略時は 0 */
  tolerance?: number;
  /** 単位（円、千円、% など） */
  unit?: string;
}

/** 計算問題 */
export interface CalcQuestion {
  id: string;
  title: string;
  question: string;
  answers: CalcAnswer[];
  solution: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
}

/** 図解の種類 */
export type DiagramKind = "flow" | "decision" | "tree" | "relation" | "timeline" | "mindmap";

/**
 * 図解（Mermaid 記法）。体系的理解のためのビジュアル教材。
 * - flow: 処理の流れ（例: 収益認識の5ステップ）
 * - decision: 判断の分岐（例: 減損の兆候→認識→測定）
 * - tree: 分類ツリー（例: 有価証券の分類と評価）
 * - relation: 概念・主体の関係（例: 親会社・子会社・非支配株主）
 * - timeline: 時系列（例: 監査のプロセス）
 * - mindmap: 論点の全体像
 */
export interface Diagram {
  id: string;
  title: string;
  kind: DiagramKind;
  /** Mermaid のソース（flowchart / mindmap / timeline など） */
  mermaid: string;
  /** 図の読み方・要点（1〜2文） */
  caption: string;
  /** この図で押さえること（2〜4項目） */
  keyPoints: string[];
}

/** 科目の体系マップ（論点の位置づけを示す 1 枚の図） */
export interface SystemMap {
  /** Mermaid のソース（flowchart 推奨）。論点ノードの id は nodeTopics のキーと一致させる */
  mermaid: string;
  /** Mermaid ノード id → 論点 id。進捗による色分けとクリック遷移に使う */
  nodeTopics: Record<string, string>;
}

/** 論点 */
export interface Topic {
  id: string;
  subject: SubjectId;
  /** 表示順 */
  order: number;
  title: string;
  /** 論点の一言説明 */
  description: string;
  /** インプット用要点ノート（Markdown） */
  note: string;
  /** 試験直前に見る1〜3行の結論 */
  summary: string;
  cards: Card[];
  trueFalse: TrueFalseQuestion[];
  shortAnswers: ShortAnswerQuestion[];
  miniEssays: MiniEssayQuestion[];
  essays: EssayQuestion[];
  calcs: CalcQuestion[];
  /** 図解（1 論点 2〜3 枚を目安） */
  diagrams?: Diagram[];
}

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  /** 論文式での位置づけ */
  examNote: string;
  color: string;
  topics: Topic[];
  /** 科目の体系マップ */
  systemMap: SystemMap;
}

/** 本試験形式の科目別構成 */
export interface ExamFormat {
  subject: SubjectId;
  label: string;
  minutes: number;
  /** 大問数 */
  essayCount: number;
  /** 計算大問を含む数（租税法など） */
  calcCount: number;
}

/** 種別ごとの問題を統一的に扱うためのラッパー */
export interface QuestionRef {
  id: string;
  kind: QuestionKind;
  subject: SubjectId;
  topicId: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
}
