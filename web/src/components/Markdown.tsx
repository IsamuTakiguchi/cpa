import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mermaid } from "./Mermaid";

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`prose-note ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            if (match?.[1] === "mermaid") return <Mermaid code={String(children).replace(/\n$/, "")} />;
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            // mermaid の場合は pre で包まない
            const child = Array.isArray(children) ? children[0] : children;
            const cls = (child as { props?: { className?: string } })?.props?.className ?? "";
            if (/language-mermaid/.test(cls)) return <>{children}</>;
            return <pre>{children}</pre>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
