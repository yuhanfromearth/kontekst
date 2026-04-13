import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const ChatSchema = z.object({
  kontekstName: z.string(),
  messages: z.array(MessageSchema).min(1),
  model: z.string().optional().default(DEFAULT_MODEL),
});

export type Message = z.infer<typeof MessageSchema>;
export class ChatDto extends createZodDto(ChatSchema) {}
