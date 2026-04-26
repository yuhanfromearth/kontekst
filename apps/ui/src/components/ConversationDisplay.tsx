import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, X } from "lucide-react";
import { useState } from "react";
import { useConversation } from "#/components/ConversationContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import type { ConversationDto, ConversationSummary } from "@kontekst/dtos";

export default function ConversationDisplay({
  kontekstList,
}: {
  kontekstList: string[];
}) {
  const { loadConversation, conversationId } = useConversation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const kontekstSet = new Set(kontekstList);

  const { data: conversations = [], isLoading } = useQuery<
    ConversationSummary[]
  >({
    queryKey: ["conversations"],
    queryFn: () => fetch("/api/conversations").then((res) => res.json()),
    enabled: open,
  });

  const { mutate: deleteConversation } = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/conversation?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const selectConversation = async (id: string) => {
    const res = await fetch(
      `/api/conversation?id=${encodeURIComponent(id)}`,
    );
    if (!res.ok) return;
    const dto: ConversationDto = await res.json();
    loadConversation(dto);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        title="Past conversations"
      >
        <History className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <p className="px-2 py-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Past conversations
        </p>
        <div className="max-h-80 overflow-y-auto flex flex-col gap-0.5 mt-1">
          {isLoading && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">
              Loading...
            </p>
          )}
          {!isLoading && conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">
              No past conversations.
            </p>
          )}
          {conversations.map((c) => {
            const isActive = c.id === conversationId;
            return (
              <div
                key={c.id}
                className={`group flex items-center rounded ${isActive ? "bg-accent" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className="flex-1 min-w-0 text-left px-2 py-1.5 text-sm hover:bg-accent transition-colors rounded"
                >
                  <div className="font-medium truncate">
                    {c.title?.trim() || "Untitled"}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-0.5 truncate">
                    {c.kontekstName && !kontekstSet.has(c.kontekstName) ? (
                      <span
                        className="font-mono text-destructive inline-flex items-center gap-0.5"
                        title="Kontekst no longer exists"
                      >
                        {c.kontekstName}
                        <X className="size-3" />
                      </span>
                    ) : (
                      <span className="font-mono">{c.kontekstName}</span>
                    )}
                    <span className="truncate">{c.model}</span>
                  </div>
                </button>
                <button
                  type="button"
                  title="Delete conversation"
                  className="mr-1 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
