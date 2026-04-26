import { Injectable, NotFoundException } from '@nestjs/common';
import fs from 'fs';
import type {
  ChatResponseDto,
  ConversationDto,
  ConversationSummary,
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

  async chat(
    conversationId: string | undefined,
    kontekstName: string | undefined,
    message: string,
    model: string,
  ): Promise<ChatResponseDto> {
    const store = this.readStore();

    let id = conversationId;
    if (!id) {
      id = crypto.randomUUID();
      store[id] = {
        messages: [],
        kontekstName,
        model,
      };
    }

    const conversation = this.findEntry(store, id);
    conversation.messages.push({ role: 'user', content: message });

    const systemPrompt = conversation.kontekstName
      ? this.kontekstService.getKontekst(conversation.kontekstName)
      : '';

    const [res, title] = await Promise.all([
      this.llmService.chat(
        conversation.messages,
        systemPrompt,
        conversation.model,
      ),
      conversation.title
        ? Promise.resolve(conversation.title)
        : this.llmService.generateTitle(
            systemPrompt,
            message,
            conversation.model,
          ),
    ]);

    conversation.messages.push({ role: 'assistant', content: res.content });
    conversation.title = title;

    this.writeStore(store);

    return {
      conversationId: id,
      title: conversation.title,
      content: res.content,
      usage: res.usage,
    };
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
