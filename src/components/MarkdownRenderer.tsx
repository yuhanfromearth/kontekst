import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({
  markdownString,
}: {
  markdownString: string;
}) {
  return (
    <div className="prose max-w-none text-justify w-full [&_p]:leading-6 [&_p]:my-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const isInline = !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  className="before:content-none after:content-none text-slate-900 bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 font-normal text-sm"
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
