import KontekstDisplay from "#/components/KontekstDisplay";
import KontekstLogo from "#/components/KontekstLogo";
import ConversationHistory from "#/components/ConversationHistory";
import ConversationDisplay from "#/components/ConversationDisplay";
import KeyUsageDisplay from "#/components/KeyUsageDisplay";
import ModelSelector from "#/components/ModelSelector";
import ThemeToggle from "#/components/ThemeToggle";
import { Button } from "#/components/ui/button";
import { Kbd } from "#/components/ui/kbd";
import { Textarea } from "#/components/ui/textarea";
import type { KeyListItem, ModelDto, StreamEvent } from "@kontekst/dtos";
import { StreamEventSchema } from "@kontekst/dtos";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createParser } from "eventsource-parser";
import { formatCost } from "#/lib/cost";
import { formatTokens } from "#/lib/tokens";
import { useEffect, useRef, useState } from "react";
import { useConversation } from "#/components/ConversationContext";
import { useIsMac } from "#/lib/platform";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const isMac = useIsMac();
  const [input, setInput] = useState("");
  const {
    messages,
    setMessages,
    conversationId,
    setConversationId,
    tokenUsage,
    setTokenUsage,
    conversationCost,
    setConversationCost,
    selectedKontekst,
    setSelectedKontekst,
    selectedModel,
    setSelectedModel,
    selectedModelDto,
    setSelectedModelDto,
    modelContextLength,
    setModelContextLength,
    registerStreamCanceller,
  } = useConversation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const queryClient = useQueryClient();

  const cancelStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  useEffect(() => {
    registerStreamCanceller(cancelStream);
    return () => {
      cancelStream();
      registerStreamCanceller(null);
    };
  }, [registerStreamCanceller]);

  const { data: keys = [], isPending: keysLoading } = useQuery<KeyListItem[]>({
    queryKey: ["keys"],
    queryFn: () => fetch("/api/keys").then((res) => res.json()),
  });
  const hasActiveKey = keys.some((k) => k.isActive);
  const showNoKey = !keysLoading && !hasActiveKey;

  const { data: defaultModel } = useQuery<ModelDto>({
    queryKey: ["models", "default"],
    queryFn: () => fetch("/api/models/default").then((res) => res.json()),
    enabled: hasActiveKey,
  });

  useEffect(() => {
    if (defaultModel && !selectedModel) {
      setSelectedModel(defaultModel.id);
      setSelectedModelDto(defaultModel);
      setModelContextLength(defaultModel.contextLength);
    }
  }, [defaultModel, selectedModel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        textareaRef.current?.blur();
      }

      // skip if already typing in an input
      if (document.activeElement === textareaRef.current) return;

      if (e.key === "/") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const [chatError, setChatError] = useState<string | undefined>();

  const runStream = async (payload: {
    userMessage: string;
    conversationId?: string;
    kontekstName?: string;
    model?: string;
  }) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    let assistantStarted = false;
    let buffer = "";
    let animatorTimer: ReturnType<typeof setTimeout> | null = null;
    let drainResolve: () => void = () => {};
    const drainPromise = new Promise<void>((res) => {
      drainResolve = res;
    });

    const stopAnimator = () => {
      if (animatorTimer !== null) {
        clearTimeout(animatorTimer);
        animatorTimer = null;
      }
    };

    const flushPiece = (piece: string) => {
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: last.content + piece };
        return next;
      });
    };

    const tick = () => {
      animatorTimer = null;
      if (buffer.length === 0) {
        drainResolve();
        return;
      }

      const match = buffer.match(/^\s*\S+\s*/);
      const piece = match ? match[0] : buffer;
      buffer = buffer.slice(piece.length);
      flushPiece(piece);

      if (buffer.length === 0) {
        drainResolve();
        return;
      }
      // Adaptive cadence: target ~400ms drain regardless of backlog.
      const remainingWords = buffer.split(/\s+/).filter(Boolean).length || 1;
      const delay = Math.max(10, Math.min(45, 400 / remainingWords));
      animatorTimer = setTimeout(tick, delay);
    };

    const enqueue = (delta: string) => {
      if (!assistantStarted) {
        assistantStarted = true;
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      }
      buffer += delta;
      if (animatorTimer === null) animatorTimer = setTimeout(tick, 0);
    };

    const rollback = () => {
      stopAnimator();
      buffer = "";
      drainResolve();
      setMessages((prev) =>
        assistantStarted ? prev.slice(0, -2) : prev.slice(0, -1),
      );
    };

    const handleEvent = (evt: StreamEvent) => {
      switch (evt.type) {
        case "meta":
          setConversationId(evt.conversationId);
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          break;
        case "delta":
          enqueue(evt.content);
          break;
        case "title":
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          break;
        case "usage":
          setTokenUsage(evt.usage);
          setConversationCost((prev) => prev + evt.usage.cost);
          queryClient.invalidateQueries({ queryKey: ["keyInfo"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          break;
        case "done":
          break;
        case "error":
          setChatError(evt.message);
          rollback();
          break;
      }
    };

    const parser = createParser({
      onEvent: (e) => {
        try {
          const parsed = StreamEventSchema.parse(JSON.parse(e.data));
          handleEvent(parsed);
        } catch {
          // ignore malformed frame
        }
      },
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: payload.conversationId,
          kontekstName: payload.kontekstName,
          message: payload.userMessage,
          model: payload.model,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }

      // Wait for the animator to flush the remaining buffer before unblocking input.
      if (buffer.length > 0 || animatorTimer !== null) {
        await drainPromise;
      } else {
        drainResolve();
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const messageText = err instanceof Error ? err.message : "Stream failed";
      setChatError(messageText);
      rollback();
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsStreaming(false);
    }
  };

  const { data: shortcuts } = useQuery<Record<string, string>>({
    queryKey: ["shortcuts"],
    queryFn: () => fetch("/api/shortcuts").then((res) => res.json()),
  });

  const { data: kontekstList = [], isError: kontekstError } = useQuery<
    string[]
  >({
    queryKey: ["konteksts"],
    queryFn: async () => {
      const res = await fetch("/api/konteksts");
      if (!res.ok) throw new Error("Failed to fetch konteksts");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: defaultKontekst } = useQuery<string | null>({
    queryKey: ["konteksts", "default"],
    queryFn: async () => {
      const res = await fetch("/api/konteksts/default");
      if (!res.ok) throw new Error("Failed to fetch default kontekst");
      const data: { name: string | null } = await res.json();
      return data.name;
    },
  });

  const submit = () => {
    if (!input) return;
    const userMessage = input;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setChatError(undefined);
    void runStream({
      userMessage,
      conversationId,
      kontekstName: selectedKontekst,
      model: selectedModel || undefined,
    });
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-1">
      <div className="flex items-center justify-between mb-8 mt-2">
        <KontekstLogo className="ml-2" />
        <div className="flex items-center gap-1">
          <ConversationDisplay kontekstList={kontekstList} />
          <KeyUsageDisplay />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => navigate({ to: "/shortcuts" })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
          >
            <span className="size-4 flex items-center justify-center text-sm leading-none">
              ?
            </span>
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-2">
          {showNoKey ? (
            <span />
          ) : (
            <ModelSelector
              selectedModel={selectedModel}
              selectedModelDto={selectedModelDto}
              onSelect={(model) => {
                setSelectedModel(model.id);
                setSelectedModelDto(model);
                setModelContextLength(model.contextLength);
              }}
            />
          )}
          <div className="flex items-center gap-3 mr-1 text-xs text-muted-foreground">
            {conversationCost > 0 && (
              <span title="Spent on this conversation">
                {formatCost(conversationCost)}
              </span>
            )}
            {tokenUsage && modelContextLength > 0 && (
              <span>
                {formatTokens(tokenUsage.totalTokens)} /{" "}
                {formatTokens(modelContextLength)} (
                {Math.round(
                  (tokenUsage.totalTokens / modelContextLength) * 100,
                )}
                %)
              </span>
            )}
          </div>
        </div>
        {showNoKey && (
          <div className="mb-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Add an OpenRouter API key to start chatting. Open the wallet menu
            in the top bar.
          </div>
        )}
        <Textarea
          ref={textareaRef}
          placeholder={
            showNoKey ? "Add an API key first…" : "How can I help you? [/]"
          }
          value={input}
          disabled={showNoKey}
          onChange={(e) => {
            setInput(e.target.value);
            setChatError(undefined);
          }}
          onKeyDown={(e) => {
            const mod = isMac ? e.metaKey : e.ctrlKey;
            if (mod && e.key === "Enter" && input.trim() !== "") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-5 flex gap-2">
          <Button
            className="flex-1 hover:cursor-pointer"
            variant="outline"
            type="submit"
            disabled={isStreaming || showNoKey}
          >
            Send {isMac !== null && <Kbd>{isMac ? "⌘" : "ctrl"} + Enter</Kbd>}
          </Button>
          <Button
            className="hover:cursor-pointer"
            type="button"
            variant="outline"
            disabled={messages.length === 0}
            onClick={() => {
              cancelStream();
              setMessages([]);
              setConversationId(undefined);
              setTokenUsage(undefined);
              setConversationCost(0);
              setChatError(undefined);
            }}
          >
            New Chat
          </Button>
        </div>
        {chatError && (
          <p className="text-xs text-destructive mt-2 ml-1">{chatError}</p>
        )}
      </form>

      <KontekstDisplay
        kontekstList={kontekstList}
        isError={kontekstError}
        selected={selectedKontekst}
        onSelect={setSelectedKontekst}
        shortcuts={shortcuts}
        defaultKontekst={defaultKontekst}
      />

      {messages.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto mt-16">
          <ConversationHistory messages={messages} />
        </div>
      )}
    </div>
  );
}
