import type { Message } from "#/types/message";
import MarkdownRenderer from "#/components/MarkdownRenderer";
import { useEffect, useRef } from "react";

export default function ConversationHistory({
  messages,
}: {
  messages: Message[];
}) {
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        return message.role === "user" ? (
          <div
            key={index}
            ref={isLast ? lastMessageRef : null}
            className="flex justify-end"
          >
            <div className="bg-muted rounded-2xl px-4 py-2 max-w-[80%] text-base [&_.prose_p]:my-0">
              <MarkdownRenderer markdownString={message.content} />
            </div>
          </div>
        ) : (
          <div
            key={index}
            ref={isLast ? lastMessageRef : null}
            className="text-base"
          >
            <MarkdownRenderer markdownString={message.content} />
          </div>
        );
      })}
    </div>
  );
}
