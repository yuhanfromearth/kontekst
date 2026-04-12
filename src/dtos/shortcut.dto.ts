import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SaveShortcutSchema = z.object({
  kontekstName: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9 _-]+$/),
  shortcut: z.string(),
});

const DeleteShortcutSchema = z.object({
  kontekstName: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9 _-]+$/),
});

export class SaveShortcutDto extends createZodDto(SaveShortcutSchema) {}
export class DeleteShortcutDto extends createZodDto(DeleteShortcutSchema) {}
