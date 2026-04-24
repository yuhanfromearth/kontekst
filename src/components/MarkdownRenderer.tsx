import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function MarkdownRenderer({
  markdownString,
}: {
  markdownString: string;
}) {
  return (
    <div className="prose dark:prose-invert max-w-none text-justify w-full [&_p]:leading-6 [&_p]:my-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, className, children, ...props }) {
            const isInline = !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  className="before:content-none after:content-none text-foreground bg-muted border border-border rounded px-1.5 py-0.5 font-normal text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {markdownString}
      </ReactMarkdown>
    </div>
  );
}
