import KontekstDisplay from "#/components/KontekstDisplay";
import ConversationHistory from "#/components/ConversationHistory";
import ModelSelector from "#/components/ModelSelector";
import { Button } from "#/components/ui/button";
import { Kbd } from "#/components/ui/kbd";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import type { ChatResponseDto } from "#/types/message";
import type { ModelDto } from "#/types/model";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatTokens } from "#/lib/tokens";
import { useEffect, useRef, useState } from "react";
import { useConversation } from "#/components/ConversationContext";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const [input, setInput] = useState("");
  const {
    messages,
    setMessages,
    conversationId,
    setConversationId,
    tokenUsage,
    setTokenUsage,
    selectedKontekst,
    setSelectedKontekst,
    selectedModel,
    setSelectedModel,
    selectedModelDto,
    setSelectedModelDto,
    modelContextLength,
    setModelContextLength,
  } = useConversation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ignorePendingRef = useRef(false);

  const { data: defaultModel } = useQuery<ModelDto>({
    queryKey: ["models", "default"],
    queryFn: () => fetch("/api/models/default").then((res) => res.json()),
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

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: {
      userMessage: string;
      conversationId?: string;
      kontekstName?: string;
      model?: string;
    }) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: payload.conversationId,
          kontekstName: payload.kontekstName,
          message: payload.userMessage,
          model: payload.model,
        }),
      });

      if (response.status === 413) {
        throw new Error(
          "Conversation is too large to send. Start a new conversation or switch to a model with a larger context window.",
        );
      }

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      return response.json() as Promise<ChatResponseDto>;
    },
    onSuccess: (response) => {
      if (ignorePendingRef.current) {
        ignorePendingRef.current = false;
        return;
      }
      setChatError(undefined);
      setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.content },
      ]);
      setTokenUsage(response.usage);
    },
    onError: (error: Error) => {
      if (ignorePendingRef.current) {
        ignorePendingRef.current = false;
        return;
      }
      setChatError(error.message);
      // roll back the optimistic user message
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const { data: shortcuts } = useQuery<Record<string, string>>({
    queryKey: ["shortcuts"],
    queryFn: () => fetch("/api/shortcuts").then((res) => res.json()),
  });

  const submit = () => {
    if (!input) return;
    const userMessage = input;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    mutate({
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
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-bold text-2xl ml-2">kontekst.</h2>
        <button
          type="button"
          onClick={() => navigate({ to: "/shortcuts" })}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-2">
          <ModelSelector
            selectedModel={selectedModel}
            selectedModelDto={selectedModelDto}
            onSelect={(model) => {
              setSelectedModel(model.id);
              setSelectedModelDto(model);
              setModelContextLength(model.contextLength);
            }}
          />
          {tokenUsage && modelContextLength > 0 && (
            <span className="text-xs text-muted-foreground mr-1">
              {formatTokens(tokenUsage.totalTokens)} /{" "}
              {formatTokens(modelContextLength)} (
              {Math.round((tokenUsage.totalTokens / modelContextLength) * 100)}
              %)
            </span>
          )}
        </div>
        <Textarea
          ref={textareaRef}
          placeholder="How can I help you? [/]"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setChatError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.metaKey && e.key === "Enter" && input.trim() !== "") {
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
            disabled={isPending}
          >
            {isPending ? (
              <Spinner />
            ) : (
              <>
                Send <Kbd>⌘ + Enter</Kbd>
              </>
            )}
          </Button>
          <Button
            className="hover:cursor-pointer"
            type="button"
            variant="outline"
            disabled={messages.length === 0}
            onClick={() => {
              if (isPending) ignorePendingRef.current = true;
              setMessages([]);
              setConversationId(undefined);
              setTokenUsage(undefined);
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
        selected={selectedKontekst}
        onSelect={setSelectedKontekst}
        shortcuts={shortcuts}
      />

      {messages.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto mt-16">
          <ConversationHistory messages={messages} />
        </div>
      )}
    </div>
  );
}
