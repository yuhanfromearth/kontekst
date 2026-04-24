import { Message } from 'src/dtos/chat.dto.js';

export interface ConversationEntry {
  messages: Message[];
  kontekstName?: string;
  model: string;
  title?: string;
}
