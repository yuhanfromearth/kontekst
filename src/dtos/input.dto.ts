import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const InputSchema = z.object({
  input: z.string(),
});

// class is required for using DTO as a type
export class InputDto extends createZodDto(InputSchema) {}
