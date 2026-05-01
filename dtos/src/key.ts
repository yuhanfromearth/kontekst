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

export const KeyLabelSchema = z.string().trim().min(1).max(64);

export const CreateKeySchema = z.object({
  label: KeyLabelSchema,
  key: z.string().trim().min(1),
});

export const SetActiveKeySchema = z.object({
  id: z.string().uuid(),
});

export type CreateKeyRequest = z.infer<typeof CreateKeySchema>;
export type SetActiveKeyRequest = z.infer<typeof SetActiveKeySchema>;

export interface KeyListItem {
  id: string;
  label: string;
  keyTail: string;
  isActive: boolean;
}
