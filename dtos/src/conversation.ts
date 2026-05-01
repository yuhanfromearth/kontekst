import type { Message } from './chat.js';

export interface ConversationSummary {
  id: string;
  title?: string;
  kontekstName?: string;
  model: string;
  totalCost: number;
}

export interface ConversationDto extends ConversationSummary {
  messages: Message[];
}
