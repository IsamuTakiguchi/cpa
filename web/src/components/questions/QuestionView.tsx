import { getQuestion } from "@cpa/shared";
import { CardQ } from "./CardQ";
import { TfQ } from "./TfQ";
import { ShortQ } from "./ShortQ";
import { CalcQ } from "./CalcQ";
import { MiniEssayQ } from "./MiniEssayQ";
import { EssayQ } from "./EssayQ";
import type { AnswerResult, QuestionPhase } from "./types";

export function QuestionView({ questionId, phase, initialAnswer, onDraft, onDone, aiModel }: { questionId: string; phase?: QuestionPhase; initialAnswer?: unknown; onDraft?: (a: unknown) => void; onDone: (r: AnswerResult) => void; aiModel?: string }) {
  const found = getQuestion(questionId);
  if (!found) return <div className="card text-red-700">問題が見つかりません: {questionId}</div>;
  const common = { phase, initialAnswer, onDraft, onDone, aiModel };
  switch (found.kind) {
    case "card":
      return <CardQ q={found.q} {...common} />;
    case "tf":
      return <TfQ q={found.q} {...common} />;
    case "short":
      return <ShortQ q={found.q} {...common} />;
    case "calc":
      return <CalcQ q={found.q} {...common} />;
    case "mini":
      return <MiniEssayQ q={found.q} {...common} />;
    case "essay":
      return <EssayQ q={found.q} {...common} />;
  }
}
