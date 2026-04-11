import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const InputSchema = z.object({
  input: z.string(),
  kontekstName: z.string(),
});

export class InputDto extends createZodDto(InputSchema) {}
