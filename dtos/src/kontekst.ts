import { z } from 'zod';
import { KontekstNameSchema } from './primitives.js';

export const SaveKontekstSchema = z.object({
  name: KontekstNameSchema,
  content: z.string().min(1),
  overwrite: z.boolean().optional(),
  shortcut: z.string().optional(),
});

export const RenameKontekstSchema = z.object({
  name: KontekstNameSchema,
  newName: KontekstNameSchema,
});

export const SetDefaultKontekstSchema = z.object({
  name: KontekstNameSchema,
});

export type SaveKontekstRequest = z.infer<typeof SaveKontekstSchema>;
export type RenameKontekstRequest = z.infer<typeof RenameKontekstSchema>;
export type SetDefaultKontekstRequest = z.infer<typeof SetDefaultKontekstSchema>;

export interface KontekstDto {
  name: string;
  kontekst: string | undefined;
  shortcut: string | undefined;
}
