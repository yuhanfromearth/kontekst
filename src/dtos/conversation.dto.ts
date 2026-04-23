import { Message } from './chat.dto.js';

export interface ConversationSummary {
  id: string;
  title?: string;
  kontekstName: string;
  model: string;
}

export interface ConversationDto {
  id: string;
  title?: string;
  kontekstName: string;
  model: string;
  messages: Message[];
}
