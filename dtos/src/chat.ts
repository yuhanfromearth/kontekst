import { z } from 'zod';
import { WebSearchHitSchema } from './web-search.js';

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

export const ChatSchema = z.object({
  conversationId: z.string().optional(),
  kontekstName: z.string().optional(),
  message: z.string(),
  model: z.string().optional().default(DEFAULT_MODEL),
  webSearchEnabled: z.boolean().optional(),
});

export type ChatRequest = z.infer<typeof ChatSchema>;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const TokenUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  cost: z.number(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const StreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meta'), conversationId: z.string() }),
  z.object({ type: z.literal('delta'), content: z.string() }),
  z.object({ type: z.literal('title'), title: z.string() }),
  z.object({ type: z.literal('usage'), usage: TokenUsageSchema }),
  z.object({
    type: z.literal('tool_call'),
    name: z.string(),
    query: z.string(),
  }),
  z.object({
    type: z.literal('tool_result'),
    name: z.string(),
    resultCount: z.number(),
    hits: z.array(WebSearchHitSchema),
  }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;
