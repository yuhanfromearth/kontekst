import ChatHeader from '#/components/ChatHeader';
import KontekstDisplay from '#/components/KontekstDisplay';
import ConversationDisplay from '#/components/ConversationDisplay';
import ModelSelector from '#/components/ModelSelector';
import { Button } from '#/components/ui/button';
import { Textarea } from '#/components/ui/textarea';
import type {
  BraveKeyListItem,
  DefaultModelResponse,
  KeyListItem,
  WebSearchPref,
} from '@kontekst/dtos';
import type { Search } from '#/components/SearchPills';
import type { MemoryUpdate } from '#/components/MemoryPills';
import MemoryEditor from '#/components/MemoryEditor';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Brain, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { formatCost } from '#/lib/cost';
import { formatTokens } from '#/lib/tokens';
import { streamChat } from '#/lib/chatStream';
import { isModifierEvent } from '#/lib/platform';
import { cn } from '#/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useConversation } from '#/components/ConversationContext';

export const Route = createFileRoute('/')({ component: App });

function App() {
  const [input, setInput] = useState('');
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
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isStreaming, setIsStreaming] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const slowHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const clearSlowHint = () => {
    if (slowHintTimerRef.current) {
      clearTimeout(slowHintTimerRef.current);
      slowHintTimerRef.current = null;
    }
    setSlowHint(false);
  };

  const cancelStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearSlowHint();
  };

  useEffect(() => {
    registerStreamCanceller(cancelStream);
    return () => {
      cancelStream();
      registerStreamCanceller(null);
    };
  }, [registerStreamCanceller]);

  const { data: keys = [], isPending: keysLoading } = useQuery<KeyListItem[]>({
    queryKey: ['keys'],
    queryFn: () => fetch('/api/keys').then((res) => res.json()),
  });
  const hasActiveKey = keys.some((k) => k.isActive);
  const showNoKey = !keysLoading && !hasActiveKey;

  const { data: braveKeys = [] } = useQuery<BraveKeyListItem[]>({
    queryKey: ['brave-keys'],
    queryFn: () => fetch('/api/brave-keys').then((res) => res.json()),
  });
  const hasBraveKey = braveKeys.some((k) => k.isActive);

  const { data: webSearchPref } = useQuery<WebSearchPref>({
    queryKey: ['web-search', 'enabled'],
    queryFn: () => fetch('/api/web-search/enabled').then((res) => res.json()),
  });
  const webSearchEnabled = webSearchPref?.enabled === true && hasBraveKey;

  const setWebSearchEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch('/api/web-search/enabled', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to update web search');
      return (await res.json()) as WebSearchPref;
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ['web-search', 'enabled'] });
      const previous = queryClient.getQueryData<WebSearchPref>([
        'web-search',
        'enabled',
      ]);
      queryClient.setQueryData<WebSearchPref>(['web-search', 'enabled'], {
        enabled,
      });
      return { previous };
    },
    onError: (_err, _enabled, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(['web-search', 'enabled'], ctx.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['web-search', 'enabled'] }),
  });

  const { data: defaultModel } = useQuery<DefaultModelResponse>({
    queryKey: ['models', 'default'],
    queryFn: () => fetch('/api/models/default').then((res) => res.json()),
    enabled: hasActiveKey,
  });
  const defaultModelMissing = !!defaultModel?.modelId && !defaultModel.model;
  const blockedByMissingDefault = defaultModelMissing && !selectedModel;

  useEffect(() => {
    if (defaultModel?.model && !selectedModel) {
      setSelectedModel(defaultModel.model.id);
      setSelectedModelDto(defaultModel.model);
      setModelContextLength(defaultModel.model.contextLength);
    }
  }, [defaultModel, selectedModel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        textareaRef.current?.blur();
      }

      if (isModifierEvent(e) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (messagesRef.current.length > 0) newChat();
        return;
      }

      // skip if already typing in an input
      if (document.activeElement === textareaRef.current) return;

      if (e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const [chatError, setChatError] = useState<string | undefined>();
  const [chromeVisible, setChromeVisible] = useState(true);

  const newChat = () => {
    cancelStream();
    setMessages([]);
    setConversationId(undefined);
    setTokenUsage(undefined);
    setConversationCost(0);
    setChatError(undefined);
    setSearchesByMsgIdx({});
    setMemoryUpdatesByMsgIdx({});
  };

  const [memoryOpen, setMemoryOpen] = useState(false);

  // Searches keyed by the assistant message index they belong to. The
  // current run's target index is captured at submit time and persisted in a
  // ref so streaming events can attribute pills to the right message.
  const [searchesByMsgIdx, setSearchesByMsgIdx] = useState<
    Record<number, Search[]>
  >({});
  const [memoryUpdatesByMsgIdx, setMemoryUpdatesByMsgIdx] = useState<
    Record<number, MemoryUpdate[]>
  >({});
  const currentAssistantIdxRef = useRef<number | null>(null);

  const appendSearch = (search: Search) => {
    const idx = currentAssistantIdxRef.current;
    if (idx === null) return;
    setSearchesByMsgIdx((prev) => ({
      ...prev,
      [idx]: [...(prev[idx] ?? []), search],
    }));
  };

  const appendMemoryUpdate = () => {
    const idx = currentAssistantIdxRef.current;
    if (idx === null) return;
    setMemoryUpdatesByMsgIdx((prev) => ({
      ...prev,
      [idx]: [...(prev[idx] ?? []), { done: false }],
    }));
  };

  const completeLastMemoryUpdate = () => {
    const idx = currentAssistantIdxRef.current;
    if (idx === null) return;
    setMemoryUpdatesByMsgIdx((prev) => {
      const list = prev[idx];
      if (!list || list.length === 0) return prev;
      const next = list.slice();
      for (let i = next.length - 1; i >= 0; i--) {
        if (!next[i].done) {
          next[i] = { ...next[i], done: true };
          break;
        }
      }
      return { ...prev, [idx]: next };
    });
  };

  const updateLastSearch = (patch: Partial<Search>) => {
    const idx = currentAssistantIdxRef.current;
    if (idx === null) return;
    setSearchesByMsgIdx((prev) => {
      const list = prev[idx];
      if (!list || list.length === 0) return prev;
      const next = list.slice();
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].resultCount === undefined) {
          next[i] = { ...next[i], ...patch };
          break;
        }
      }
      return { ...prev, [idx]: next };
    });
  };

  const runStream = async (payload: {
    message: string;
    conversationId?: string;
    kontekstName?: string;
    model?: string;
    webSearchEnabled?: boolean;
  }) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    slowHintTimerRef.current = setTimeout(() => setSlowHint(true), 5000);

    let assistantStarted = false;
    const rollback = () => {
      setMessages((prev) =>
        assistantStarted ? prev.slice(0, -2) : prev.slice(0, -1)
      );
    };

    try {
      for await (const evt of streamChat(payload, controller.signal)) {
        switch (evt.type) {
          case 'piece':
            if (!assistantStarted) {
              assistantStarted = true;
              clearSlowHint();
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '' },
              ]);
            }
            setMessages((prev) => {
              const next = prev.slice();
              const last = next[next.length - 1];
              next[next.length - 1] = {
                ...last,
                content: last.content + evt.text,
              };
              return next;
            });
            break;
          case 'meta':
            setConversationId(evt.conversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            break;
          case 'title':
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            break;
          case 'usage':
            setTokenUsage(evt.usage);
            setConversationCost((prev) => prev + evt.usage.cost);
            queryClient.invalidateQueries({ queryKey: ['keyInfo'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            break;
          case 'tool_call':
            appendSearch({ query: evt.query, hits: [] });
            break;
          case 'tool_result':
            updateLastSearch({
              resultCount: evt.resultCount,
              hits: evt.hits,
            });
            break;
          case 'memory_update':
            appendMemoryUpdate();
            break;
          case 'memory_updated':
            completeLastMemoryUpdate();
            queryClient.invalidateQueries({ queryKey: ['memory'] });
            break;
          case 'error':
            setChatError(evt.message);
            rollback();
            break;
          case 'done':
            break;
        }
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      clearSlowHint();
      setIsStreaming(false);
    }
  };

  const { data: shortcuts } = useQuery<Record<string, string>>({
    queryKey: ['shortcuts'],
    queryFn: () => fetch('/api/shortcuts').then((res) => res.json()),
  });

  const { data: kontekstList = [], isError: kontekstError } = useQuery<
    string[]
  >({
    queryKey: ['konteksts'],
    queryFn: async () => {
      const res = await fetch('/api/konteksts');
      if (!res.ok) throw new Error('Failed to fetch konteksts');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: defaultKontekst } = useQuery<string | null>({
    queryKey: ['konteksts', 'default'],
    queryFn: async () => {
      const res = await fetch('/api/konteksts/default');
      if (!res.ok) throw new Error('Failed to fetch default kontekst');
      const data: { name: string | null } = await res.json();
      return data.name;
    },
  });

  const submit = () => {
    if (!input) return;
    if (isStreaming) return;
    if (blockedByMissingDefault) return;
    const userMessage = input;
    // The user message goes to messages[messages.length]; the assistant
    // response will go to the slot after it. Lock that index now so async
    // tool_call/tool_result events attribute pills to the right message.
    currentAssistantIdxRef.current = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setChatError(undefined);
    void runStream({
      message: userMessage,
      conversationId,
      kontekstName: selectedKontekst,
      model: selectedModel || undefined,
      webSearchEnabled,
    });
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  const canToggleChrome = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-1">
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          chromeVisible || !canToggleChrome
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        )}
      >
        <div className="overflow-hidden">
          <ChatHeader kontekstList={kontekstList} />
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
                    {formatTokens(tokenUsage.totalTokens)} /{' '}
                    {formatTokens(modelContextLength)} (
                    {Math.round(
                      (tokenUsage.totalTokens / modelContextLength) * 100
                    )}
                    %)
                  </span>
                )}
              </div>
            </div>
            {showNoKey && (
              <div className="mb-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Add an OpenRouter API key to start chatting. Open the wallet
                menu in the top bar.
              </div>
            )}
            {!showNoKey && blockedByMissingDefault && (
              <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Your default model{' '}
                <span className="font-mono">'{defaultModel?.modelId}'</span> is
                no longer available. Pick a different model and set it to
                default to continue.
              </div>
            )}
            <Textarea
              ref={textareaRef}
              placeholder={
                showNoKey ? 'Add an API key first…' : 'How can I help you? [/]'
              }
              value={input}
              disabled={showNoKey || blockedByMissingDefault}
              onChange={(e) => {
                setInput(e.target.value);
                setChatError(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() !== '' && !isStreaming) submit();
                }
              }}
            />
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant={webSearchEnabled ? 'default' : 'outline'}
                size="icon"
                className="hover:cursor-pointer"
                disabled={!hasBraveKey || setWebSearchEnabled.isPending}
                onClick={() =>
                  setWebSearchEnabled.mutate(!(webSearchPref?.enabled === true))
                }
                title={
                  hasBraveKey
                    ? webSearchEnabled
                      ? 'Web search on (Brave) — click to disable'
                      : 'Enable web search (Brave)'
                    : 'Add a Brave Search API key in the wallet menu'
                }
                aria-label="Toggle web search"
                aria-pressed={webSearchEnabled}
              >
                <Globe className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="hover:cursor-pointer"
                onClick={() => setMemoryOpen(true)}
                title="Edit global memory"
                aria-label="Edit global memory"
              >
                <Brain className="size-4" />
              </Button>
              <Button
                className="flex-1 hover:cursor-pointer"
                variant="outline"
                type="submit"
                disabled={
                  isStreaming ||
                  showNoKey ||
                  blockedByMissingDefault ||
                  input.trim() === ''
                }
              >
                Send
              </Button>
              <Button
                className="hover:cursor-pointer"
                type="button"
                variant="outline"
                disabled={messages.length === 0}
                onClick={newChat}
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
        </div>
      </div>

      {canToggleChrome && (
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={() => setChromeVisible((v) => !v)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title={chromeVisible ? 'Hide controls' : 'Show controls'}
            aria-label={chromeVisible ? 'Hide controls' : 'Show controls'}
          >
            {chromeVisible ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
      )}

      {messages.length > 0 && (
        <div
          className={cn(
            'flex-1 min-h-0 overflow-y-auto',
            chromeVisible ? 'mt-16' : 'mt-4'
          )}
        >
          <ConversationDisplay
            messages={messages}
            searchesByMsgIdx={searchesByMsgIdx}
            memoryUpdatesByMsgIdx={memoryUpdatesByMsgIdx}
            onOpenMemory={() => setMemoryOpen(true)}
          />
        </div>
      )}

      <MemoryEditor open={memoryOpen} onOpenChange={setMemoryOpen} />

      {slowHint && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
          <p className="animate-slow-fade max-w-md text-center text-xs text-muted-foreground">
            This model is taking longer than usual. Some models can be slow —
            you can switch to another in the model picker.
          </p>
        </div>
      )}
    </div>
  );
}
