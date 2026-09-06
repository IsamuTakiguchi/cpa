import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "./ui";

type MermaidApi = typeof import("mermaid").default;
let mermaidPromise: Promise<MermaidApi> | null = null;

/** mermaid は大きいので初回表示時に動的読み込みする */
export function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
        fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif',
        flowchart: { htmlLabels: true, curve: "basis", padding: 8, nodeSpacing: 30, rankSpacing: 40 },
        mindmap: { padding: 8 },
        themeVariables: { fontSize: "15px", primaryColor: "#e8eef7", primaryBorderColor: "#1e3a5f", primaryTextColor: "#0f172a", lineColor: "#475569", secondaryColor: "#fff7ed", tertiaryColor: "#f1f5f9" },
      });
      return m.default;
    });
  }
  return mermaidPromise;
}

export interface MermaidProps {
  code: string;
  /** 描画後に SVG を受け取る（ノードへのクリック付与などに使う） */
  onRendered?: (svg: SVGSVGElement) => void;
  className?: string;
  /** 拡大表示ボタンを出す */
  zoomable?: boolean;
  title?: string;
  /** true: 幅に合わせて縮小（既定）。false: 原寸で表示し横スクロール（体系マップなど大きい図向け） */
  fitWidth?: boolean;
}

/** SVG を原寸（viewBox の幅）で表示する */
function naturalSize(el: SVGSVGElement, minWidth = 0) {
  const vb = el.viewBox?.baseVal;
  const w = vb && vb.width > 0 ? Math.max(vb.width, minWidth) : minWidth;
  el.removeAttribute("height");
  el.style.maxWidth = "none";
  el.style.width = `${Math.ceil(w)}px`;
  el.style.height = "auto";
}

export function Mermaid({ code, onRendered, className = "", zoomable = true, title, fitWidth = true }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");
  const [zoom, setZoom] = useState(false);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadMermaid()
      .then(async (m) => {
        const { svg } = await m.render(`m${id}${Date.now().toString(36)}`, code);
        if (cancelled) return;
        setSvg(svg);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  useEffect(() => {
    if (!svg || !ref.current) return;
    const el = ref.current.querySelector("svg") as SVGSVGElement | null;
    if (el) {
      if (fitWidth) {
        el.removeAttribute("height");
        el.style.maxWidth = "100%";
        el.style.height = "auto";
      } else {
        // 画面幅より大きい図は原寸のまま横スクロールで見せる（縮小して読めなくなるのを防ぐ）
        const containerWidth = ref.current.clientWidth || 0;
        const vb = el.viewBox?.baseVal;
        // 縮小率が 0.7 を下回ると文字が読めないので、その場合は幅を広げて横スクロールにする
        if (vb && vb.width > 0 && containerWidth > 0 && containerWidth / vb.width < 0.7) naturalSize(el, Math.min(vb.width, containerWidth / 0.7));
        else {
          el.removeAttribute("height");
          el.style.maxWidth = "100%";
          el.style.height = "auto";
        }
      }
      onRendered?.(el);
    }
  }, [svg, onRendered, fitWidth]);

  useEffect(() => {
    if (!zoom || !svg || !zoomRef.current) return;
    const el = zoomRef.current.querySelector("svg") as SVGSVGElement | null;
    if (el) {
      naturalSize(el, 900);
      onRendered?.(el);
    }
  }, [zoom, svg, onRendered]);

  if (error) {
    return (
      <details className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
        <summary>図を描画できませんでした</summary>
        <pre className="mt-1 whitespace-pre-wrap">{error}</pre>
        <pre className="mt-1 whitespace-pre-wrap text-slate-600">{code}</pre>
      </details>
    );
  }
  return (
    <div className={`relative ${className}`}>
      {!svg && <div className="h-24 flex items-center justify-center text-xs text-slate-400">図を読み込み中…</div>}
      <div ref={ref} className="mermaid overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      {zoomable && svg && (
        <button className="absolute top-1 right-1 btn-ghost text-xs bg-white/80 no-print" onClick={() => setZoom(true)} aria-label="拡大表示">
          ⤢ 拡大
        </button>
      )}
      <Modal open={zoom} onClose={() => setZoom(false)} title={title ?? "図解"}>
        <p className="text-xs text-slate-500 mb-2 no-print">横にスクロールして全体を見られます。</p>
        <div ref={zoomRef} className="mermaid overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      </Modal>
    </div>
  );
}
