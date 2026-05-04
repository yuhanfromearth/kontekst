import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ConversationDto,
  ConversationSummary,
  StreamEvent,
  TokenUsage,
} from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import { KontekstService } from '../kontekst/kontekst.service.js';
import { LlmService } from '../llm/llm.service.js';
import { ConversationEntry } from './interfaces/conversation.interface.js';
import { ConversationStore } from './interfaces/conversation-store.type.js';

@Injectable()
export class ConversationService {
  private readonly store = new JsonStore<ConversationStore>(
    'conversations.json',
    () => ({}),
  );

  constructor(
    private readonly llmService: LlmService,
    private readonly kontekstService: KontekstService,
  ) {}

  async *chatStream(
    conversationId: string | undefined,
    kontekstName: string | undefined,
    message: string,
    model: string,
    signal: AbortSignal,
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

    const turnMessages = [
      ...conversation.messages,
      { role: 'user' as const, content: message },
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
    let usage: TokenUsage | undefined;

    try {
      for await (const evt of this.llmService.chatStream(
        turnMessages,
        systemPrompt,
        conversation.model,
        signal,
      )) {
        if (evt.type === 'delta') {
          accumulated += evt.content;
          yield { type: 'delta', content: evt.content };
          if (!titleEmitted && resolvedTitle) {
            titleEmitted = true;
            yield { type: 'title', title: resolvedTitle };
          }
        } else if (evt.type === 'usage') {
          usage = evt.usage;
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

      const turnCost = (usage?.cost ?? 0) + titleCost;
      conversation.totalCost = (conversation.totalCost ?? 0) + turnCost;

      if (usage) {
        usage.cost = turnCost;
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
      if (titleCost > 0) {
        conversation.totalCost = (conversation.totalCost ?? 0) + titleCost;
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
