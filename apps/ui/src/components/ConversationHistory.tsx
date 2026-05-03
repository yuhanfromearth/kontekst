import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useConversation } from "#/components/ConversationContext";
import { Input } from "#/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { formatCost } from "#/lib/cost";
import type { ConversationDto, ConversationSummary } from "@kontekst/dtos";

function formatDate(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    const hit = lower.indexOf(q, i);
    if (hit === -1) {
      parts.push({ text: text.slice(i), match: false });
      break;
    }
    if (hit > i) parts.push({ text: text.slice(i, hit), match: false });
    parts.push({ text: text.slice(hit, hit + q.length), match: true });
    i = hit + q.length;
  }
  return parts.map((p, idx) =>
    p.match ? (
      <mark
        key={idx}
        className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded-sm"
      >
        {p.text}
      </mark>
    ) : (
      <span key={idx}>{p.text}</span>
    ),
  );
}

export default function ConversationHistory({
  kontekstList,
}: {
  kontekstList: string[];
}) {
  const { loadConversation, conversationId } = useConversation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const kontekstSet = new Set(kontekstList);

  const { data: conversations = [], isLoading } = useQuery<
    ConversationSummary[]
  >({
    queryKey: ["conversations"],
    queryFn: () => fetch("/api/conversations").then((res) => res.json()),
    enabled: open,
  });

  const trimmedQuery = query.trim();
  const filtered = useMemo(() => {
    if (!trimmedQuery) return conversations;
    const q = trimmedQuery.toLowerCase();
    return conversations.filter((c) =>
      (c.title?.trim() || "Untitled").toLowerCase().includes(q),
    );
  }, [conversations, trimmedQuery]);

  const { mutate: deleteConversation } = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/conversation?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const selectConversation = async (id: string) => {
    const res = await fetch(`/api/conversation?id=${encodeURIComponent(id)}`);
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
        <div className="px-2 pt-1 pb-2">
          <Input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto flex flex-col gap-0.5 p-1 -m-1">
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
          {!isLoading && conversations.length > 0 && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">
              No matches.
            </p>
          )}
          {filtered.map((c) => {
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
                    {highlightMatch(
                      c.title?.trim() || "Untitled",
                      trimmedQuery,
                    )}
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
                    {c.updatedAt > 0 && (
                      <span
                        className="ml-auto shrink-0 tabular-nums"
                        title={new Date(c.updatedAt).toLocaleString()}
                      >
                        {formatDate(c.updatedAt)}
                      </span>
                    )}
                  </div>
                  {c.totalCost > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {formatCost(c.totalCost)}
                    </div>
                  )}
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
