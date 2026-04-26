import { z } from 'zod';

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

export const ChatSchema = z.object({
  conversationId: z.string().optional(),
  kontekstName: z.string().optional(),
  message: z.string(),
  model: z.string().optional().default(DEFAULT_MODEL),
});

export type ChatRequest = z.infer<typeof ChatSchema>;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponseDto {
  conversationId: string;
  title?: string;
  content: string;
  usage?: TokenUsage;
}
