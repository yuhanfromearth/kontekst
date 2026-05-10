import { z } from 'zod';

export const WebSearchPrefSchema = z.object({
  enabled: z.boolean(),
});

export type WebSearchPref = z.infer<typeof WebSearchPrefSchema>;

export const SetWebSearchEnabledSchema = z.object({
  enabled: z.boolean(),
});

export type SetWebSearchEnabledRequest = z.infer<
  typeof SetWebSearchEnabledSchema
>;

export const WebSearchHitSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});

export type WebSearchHit = z.infer<typeof WebSearchHitSchema>;
