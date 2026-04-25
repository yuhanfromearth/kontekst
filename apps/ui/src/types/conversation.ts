import type { Message } from "#/types/message";

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
