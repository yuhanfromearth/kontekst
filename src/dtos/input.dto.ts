import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const InputSchema = z.object({
  input: z.string(),
  kontekstName: z.string(),
  model: z.string().optional().default(DEFAULT_MODEL),
});

export class InputDto extends createZodDto(InputSchema) {}
