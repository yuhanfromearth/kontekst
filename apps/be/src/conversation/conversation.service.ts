import { Injectable, NotFoundException } from '@nestjs/common';
import fs from 'fs';
import type {
  ConversationDto,
  ConversationSummary,
  StreamEvent,
  TokenUsage,
} from '@kontekst/dtos';
import { KontekstService } from '../kontekst/kontekst.service.js';
import { LlmService } from '../llm/llm.service.js';
import { ConversationEntry } from './interfaces/conversation.interface.js';
import { ConversationStore } from './interfaces/conversation-store.type.js';

@Injectable()
export class ConversationService {
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
    const store = this.readStore();

    const isNew = !conversationId;
    const id = conversationId ?? crypto.randomUUID();
    if (isNew) {
      store[id] = { messages: [], kontekstName, model };
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
            (title) => ({ ok: true, title }) as const,
            () => ({ ok: false }) as const,
          );

    let titleEmitted = conversation.title !== undefined;
    let resolvedTitle: string | undefined;
    if (titlePromise) {
      void titlePromise.then((res) => {
        if (res.ok) resolvedTitle = res.title;
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
          titleEmitted = true;
          yield { type: 'title', title: res.title };
        }
      }

      if (usage) yield { type: 'usage', usage };

      conversation.messages.push({ role: 'user', content: message });
      conversation.messages.push({ role: 'assistant', content: accumulated });
      if (resolvedTitle) conversation.title = resolvedTitle;
      this.writeStore(store);

      yield { type: 'done' };
    } catch (err) {
      if (signal.aborted) return;
      const messageText = err instanceof Error ? err.message : 'Stream failed';
      yield { type: 'error', message: messageText };
    }
  }

  listConversations(): ConversationSummary[] {
    const store = this.readStore();
    return Object.entries(store).map(([id, entry]) => ({
      id,
      title: entry.title,
      kontekstName: entry.kontekstName,
      model: entry.model,
    }));
  }

  getConversation(id: string): ConversationDto {
    const store = this.readStore();
    const entry = this.findEntry(store, id);
    return {
      id,
      title: entry.title,
      kontekstName: entry.kontekstName,
      model: entry.model,
      messages: entry.messages,
    };
  }

  deleteConversation(id: string): void {
    const store = this.readStore();
    if (!(id in store)) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }
    delete store[id];
    this.writeStore(store);
  }

  private storePath(): string {
    return `${process.env.KONTEKST_FOLDER}/conversations.json`;
  }

  private readStore(): ConversationStore {
    const path = this.storePath();
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '{}');
      return {};
    }

    return JSON.parse(fs.readFileSync(path, 'utf8')) as ConversationStore;
  }

  private writeStore(store: ConversationStore): void {
    fs.writeFileSync(this.storePath(), JSON.stringify(store, null, 2));
  }

  private findEntry(store: ConversationStore, id: string): ConversationEntry {
    const conversation = store[id];
    if (!conversation) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }
    return conversation;
  }
}
