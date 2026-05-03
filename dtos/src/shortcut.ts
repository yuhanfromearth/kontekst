import { z } from 'zod';
import { KontekstNameSchema } from './primitives.js';

export const ShortcutSchema = z
  .string()
  .regex(
    /^((cmd|ctrl)\+[a-z0-9]|[a-z0-9](\+[a-z0-9])*)$/i,
    'Shortcut must be a letter/number, combination (a+b), or cmd/ctrl+letter/number',
  );

export const SaveShortcutSchema = z.object({
  kontekstName: KontekstNameSchema,
  shortcut: ShortcutSchema,
});

export const DeleteShortcutSchema = z.object({
  kontekstName: KontekstNameSchema,
});

export type SaveShortcutRequest = z.infer<typeof SaveShortcutSchema>;
export type DeleteShortcutRequest = z.infer<typeof DeleteShortcutSchema>;

export type Shortcuts = Record<string, string>;
