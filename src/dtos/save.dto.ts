import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SaveSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/),
  content: z.string(),
  overwrite: z.boolean().optional(),
});

export class SaveDto extends createZodDto(SaveSchema) {}
