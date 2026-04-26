import { z } from 'zod';
import { KontekstNameSchema } from './primitives.js';

export const SaveShortcutSchema = z.object({
  kontekstName: KontekstNameSchema,
  shortcut: z.string(),
});

export const DeleteShortcutSchema = z.object({
  kontekstName: KontekstNameSchema,
});

export type SaveShortcutRequest = z.infer<typeof SaveShortcutSchema>;
export type DeleteShortcutRequest = z.infer<typeof DeleteShortcutSchema>;

export type Shortcuts = Record<string, string>;
