import { z } from 'zod';

export const SetDefaultModelSchema = z.object({
  modelId: z.string().min(1),
});

export type SetDefaultModelRequest = z.infer<typeof SetDefaultModelSchema>;

export interface ModelPricing {
  prompt: string;
  completion: string;
}

export interface ModelDto {
  id: string;
  name: string;
  description: string | null;
  contextLength: number;
  pricing: ModelPricing;
}
