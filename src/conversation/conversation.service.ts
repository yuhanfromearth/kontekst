import { Injectable, NotFoundException } from '@nestjs/common';
import fs from 'fs';
import type { ChatResponseDto } from '../dtos/chat-response.dto.js';
import { LlmService } from '../llm/llm.service.js';
import { ConversationEntry } from './interfaces/conversation.interface.js';
import { ConversationStore } from './interfaces/conversation-store.type.js';

@Injectable()
export class ConversationService {
  constructor(private readonly llmService: LlmService) {}

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
        kontekstName: kontekstName!,
        model,
      };
    }

    const conversation = this.getConversation(store, id);
    conversation.messages.push({ role: 'user', content: message });

    const res = await this.llmService.chat(
      conversation.messages,
      conversation.kontekstName,
      conversation.model,
    );

    conversation.messages.push({ role: 'assistant', content: res.content });
    this.writeStore(store);

    return { conversationId: id, content: res.content, usage: res.usage };
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

  private getConversation(
    store: ConversationStore,
    id: string,
  ): ConversationEntry {
    const conversation = store[id];
    if (!conversation) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }
    return conversation;
  }
}
