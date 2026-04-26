import type { TokenUsage } from '@kontekst/dtos';

export interface LlmChatResult {
  content: string;
  usage?: TokenUsage;
}
