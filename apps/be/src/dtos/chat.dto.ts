import { createZodDto } from 'nestjs-zod';
import { ChatSchema } from '@kontekst/dtos';

export class ChatDto extends createZodDto(ChatSchema) {}
