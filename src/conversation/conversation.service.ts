import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChatResponseDto } from '../dtos/chat-response.dto.js';
import { LlmService } from '../llm/llm.service.js';
import { ConversationEntry } from './interfaces/conversation.interface.js';

@Injectable()
export class ConversationService {
  private readonly conversations = new Map<string, ConversationEntry>();

  constructor(private readonly llmService: LlmService) {}

  async chat(
    conversationId: string | undefined,
    kontekstName: string | undefined,
    message: string,
    model: string,
  ): Promise<ChatResponseDto> {
    let id = conversationId;
    if (!id) {
      id = crypto.randomUUID();
      this.conversations.set(id, {
        messages: [],
        kontekstName: kontekstName!,
        model,
      });
    }

    const conversation = this.getConversation(id);
    conversation.messages.push({ role: 'user', content: message });

    const res = await this.llmService.chat(
      conversation.messages,
      conversation.kontekstName,
      conversation.model,
    );

    conversation.messages.push({ role: 'assistant', content: res.content });

    return { conversationId: id, content: res.content, usage: res.usage };
  }

  private getConversation(id: string): ConversationEntry {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }
    return conversation;
  }
}
