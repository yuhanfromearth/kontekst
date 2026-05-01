import { z } from 'zod';

export const KeyInfoSchema = z.object({
  label: z.string(),
  limit: z.number().nullable(),
  limitRemaining: z.number().nullable(),
  limitReset: z.string().nullable(),
  usage: z.number(),
  usageDaily: z.number(),
  usageWeekly: z.number(),
  usageMonthly: z.number(),
  isFreeTier: z.boolean(),
});

export type KeyInfo = z.infer<typeof KeyInfoSchema>;
