import type { Message } from '@kontekst/dtos';

export interface ConversationEntry {
  messages: Message[];
  kontekstName?: string;
  model: string;
  title?: string;
}
