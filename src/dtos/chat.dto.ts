import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const ChatSchema = z
  .object({
    conversationId: z.string().optional(),
    kontekstName: z.string().optional(),
    message: z.string(),
    model: z.string().optional().default(DEFAULT_MODEL),
  })
  .refine((data) => data.conversationId || data.kontekstName, {
    message: 'kontekstName is required when starting a new conversation',
  });

export type Message = { role: 'user' | 'assistant'; content: string };
export class ChatDto extends createZodDto(ChatSchema) {}
