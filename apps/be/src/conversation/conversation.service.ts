import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ConversationDto,
  ConversationSummary,
  StreamEvent,
  TokenUsage,
} from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import { KontekstService } from '../kontekst/kontekst.service.js';
import { LlmMessage, LlmService, LlmToolCall } from '../llm/llm.service.js';
import { BraveKeyService } from '../brave-key/brave-key.service.js';
import {
  WEB_SEARCH_TOOL,
  WebSearchService,
} from '../web-search/web-search.service.js';
import { ConversationEntry } from './interfaces/conversation.interface.js';
import { ConversationStore } from './interfaces/conversation-store.type.js';

// Hard cap on tool-calling iterations per turn so a misbehaving model can't
// loop forever on the user's OpenRouter or Brave quota.
const MAX_TOOL_ITERATIONS = 5;

@Injectable()
export class ConversationService {
  private readonly store = new JsonStore<ConversationStore>(
    'conversations.json',
    () => ({}),
  );

  constructor(
    private readonly llmService: LlmService,
    private readonly kontekstService: KontekstService,
    private readonly braveKeyService: BraveKeyService,
    private readonly webSearchService: WebSearchService,
  ) {}

  async *chatStream(
    conversationId: string | undefined,
    kontekstName: string | undefined,
    message: string,
    model: string,
    signal: AbortSignal,
    webSearchEnabled = false,
  ): AsyncGenerator<StreamEvent> {
    const store = this.store.read();

    const isNew = !conversationId;
    const id = conversationId ?? crypto.randomUUID();
    if (isNew) {
      // Persist immediately so a failure during the LLM call (e.g. an
      // OpenRouter credit error) doesn't leave the client holding a
      // conversationId that points to nothing on disk.
      store[id] = {
        messages: [],
        kontekstName,
        model,
        totalCost: 0,
        updatedAt: Date.now(),
      };
      this.store.write(store);
    }

    const conversation = this.findEntry(store, id);
    const systemPrompt = conversation.kontekstName
      ? this.kontekstService.getKontekst(conversation.kontekstName)
      : '';

    const useTools = webSearchEnabled && this.braveKeyService.hasActiveKey();

    // wireMessages is what we send to the LLM each iteration. It starts with
    // the persisted history plus the new user message and grows with assistant
    // tool_calls / tool results across iterations. Persisted history only
    // tracks final assistant text, not intermediate tool exchanges.
    const wireMessages: LlmMessage[] = [
      ...conversation.messages,
      { role: 'user', content: message },
    ];

    yield { type: 'meta', conversationId: id };

    const titlePromise = conversation.title
      ? null
      : this.llmService
          .generateTitle(systemPrompt, message, conversation.model, signal)
          .then(
            ({ title, cost }) => ({ ok: true, title, cost }) as const,
            () => ({ ok: false }) as const,
          );

    let titleEmitted = conversation.title !== undefined;
    let resolvedTitle: string | undefined;
    let titleCost = 0;
    if (titlePromise) {
      void titlePromise.then((res) => {
        if (res.ok) {
          resolvedTitle = res.title;
          titleCost = res.cost;
        }
      });
    }

    let accumulated = '';
    let totalUsageCost = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let iterationsUsed = 0;

    try {
      for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
        iterationsUsed = i + 1;
        // Reset assistant text per iteration. Only the final iteration's
        // content (the one that doesn't end with tool_calls) is the answer.
        let iterationContent = '';
        let pendingToolCalls: LlmToolCall[] | null = null;

        for await (const evt of this.llmService.chatStream(
          wireMessages,
          systemPrompt,
          conversation.model,
          signal,
          useTools ? { tools: [WEB_SEARCH_TOOL] } : {},
        )) {
          if (evt.type === 'delta') {
            iterationContent += evt.content;
            accumulated += evt.content;
            yield { type: 'delta', content: evt.content };
            if (!titleEmitted && resolvedTitle) {
              titleEmitted = true;
              yield { type: 'title', title: resolvedTitle };
            }
          } else if (evt.type === 'usage') {
            totalUsageCost += evt.usage.cost;
            promptTokens += evt.usage.promptTokens;
            completionTokens += evt.usage.completionTokens;
            totalTokens += evt.usage.totalTokens;
          } else if (evt.type === 'tool_calls') {
            pendingToolCalls = evt.calls;
          }
        }

        if (!pendingToolCalls || pendingToolCalls.length === 0) {
          break;
        }

        // Append the assistant turn that requested the tool calls so the
        // next iteration sees it in context.
        wireMessages.push({
          role: 'assistant',
          content: iterationContent || null,
          tool_calls: pendingToolCalls.map((c) => ({
            id: c.id,
            type: 'function',
            function: { name: c.name, arguments: c.arguments },
          })),
        });

        for (const call of pendingToolCalls) {
          const args = parseToolArgs(call.arguments);
          const query = typeof args.query === 'string' ? args.query : '';
          const count = typeof args.count === 'number' ? args.count : undefined;

          yield { type: 'tool_call', name: call.name, query };

          let toolPayload: string;
          let resultCount = 0;
          let hits: import('@kontekst/dtos').WebSearchHit[] = [];
          try {
            if (call.name !== 'web_search') {
              throw new Error(`Unknown tool '${call.name}'`);
            }
            hits = await this.webSearchService.search(query, count);
            resultCount = hits.length;
            toolPayload = JSON.stringify(hits);
          } catch (err) {
            const detail = err instanceof Error ? err.message : 'Tool failed';
            toolPayload = JSON.stringify({ error: detail });
          }

          yield { type: 'tool_result', name: call.name, resultCount, hits };

          wireMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: toolPayload,
          });
        }
      }

      if (!titleEmitted) {
        const res = await titlePromise;
        if (res?.ok) {
          resolvedTitle = res.title;
          titleCost = res.cost;
          titleEmitted = true;
          yield { type: 'title', title: res.title };
        }
      }

      const turnCost = totalUsageCost + titleCost;
      conversation.totalCost = (conversation.totalCost ?? 0) + turnCost;

      if (iterationsUsed > 0 && totalTokens > 0) {
        const usage: TokenUsage = {
          promptTokens,
          completionTokens,
          totalTokens,
          cost: turnCost,
        };
        yield { type: 'usage', usage };
      }

      conversation.messages.push({ role: 'user', content: message });
      conversation.messages.push({ role: 'assistant', content: accumulated });
      if (resolvedTitle) conversation.title = resolvedTitle;
      conversation.updatedAt = Date.now();
      this.store.write(store);

      yield { type: 'done' };
    } catch (err) {
      if (signal.aborted) return;

      // Title generation runs in parallel; if it resolved before the chat
      // call errored, credits were already spent. Capture them so the
      // persisted total reflects reality.
      if (titlePromise && !titleEmitted) {
        const res = await titlePromise;
        if (res.ok) {
          resolvedTitle = res.title;
          titleCost = res.cost;
          titleEmitted = true;
          yield { type: 'title', title: res.title };
        }
      }
      const errorTurnCost = totalUsageCost + titleCost;
      if (errorTurnCost > 0) {
        conversation.totalCost = (conversation.totalCost ?? 0) + errorTurnCost;
      }
      if (resolvedTitle) conversation.title = resolvedTitle;
      conversation.updatedAt = Date.now();
      this.store.write(store);

      const messageText = err instanceof Error ? err.message : 'Stream failed';
      yield { type: 'error', message: messageText };
    }
  }

  listConversations(): ConversationSummary[] {
    const store = this.store.read();
    return Object.entries(store)
      .map(([id, entry]) => ({
        id,
        title: entry.title,
        kontekstName: entry.kontekstName,
        model: entry.model,
        totalCost: entry.totalCost ?? 0,
        updatedAt: entry.updatedAt ?? 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getConversation(id: string): ConversationDto {
    const store = this.store.read();
    const entry = this.findEntry(store, id);
    return {
      id,
      title: entry.title,
      kontekstName: entry.kontekstName,
      model: entry.model,
      messages: entry.messages,
      totalCost: entry.totalCost ?? 0,
      updatedAt: entry.updatedAt ?? 0,
    };
  }

  deleteConversation(id: string): void {
    const store = this.store.read();
    if (!(id in store)) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }
    delete store[id];
    this.store.write(store);
  }

  deleteAllConversations(): void {
    this.store.write({});
  }

  private findEntry(store: ConversationStore, id: string): ConversationEntry {
    const conversation = store[id];
    if (!conversation) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }
    return conversation;
  }
}

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
