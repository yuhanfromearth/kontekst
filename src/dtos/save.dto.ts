import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SaveKontekstSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9 _-]+$/),
  content: z.string().min(1),
  overwrite: z.boolean().optional(),
  shortcut: z.string().optional(),
});

export class SaveKontekstDto extends createZodDto(SaveKontekstSchema) {}

const RenameKontekstSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9 _-]+$/),
  newName: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9 _-]+$/),
});

export class RenameKontekstDto extends createZodDto(RenameKontekstSchema) {}
