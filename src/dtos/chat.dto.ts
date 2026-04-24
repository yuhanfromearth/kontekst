import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const ChatSchema = z.object({
  conversationId: z.string().optional(),
  kontekstName: z.string().optional(),
  message: z.string(),
  model: z.string().optional().default(DEFAULT_MODEL),
});

export type Message = { role: 'user' | 'assistant'; content: string };
export class ChatDto extends createZodDto(ChatSchema) {}
