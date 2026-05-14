import { createZodDto } from 'nestjs-zod';
import { UpdateMemorySchema } from '@kontekst/dtos';

export class UpdateMemoryDto extends createZodDto(UpdateMemorySchema) {}
