import { z } from 'zod';

export const BraveKeyLabelSchema = z.string().trim().min(1).max(64);

export const CreateBraveKeySchema = z.object({
  label: BraveKeyLabelSchema,
  key: z.string().trim().min(1),
});

export const SetActiveBraveKeySchema = z.object({
  id: z.string().uuid(),
});

export type CreateBraveKeyRequest = z.infer<typeof CreateBraveKeySchema>;
export type SetActiveBraveKeyRequest = z.infer<typeof SetActiveBraveKeySchema>;

export interface BraveKeyListItem {
  id: string;
  label: string;
  keyTail: string;
  isActive: boolean;
}
