import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SetDefaultModelSchema = z.object({
  modelId: z.string().min(1),
});

export class SetDefaultModelDto extends createZodDto(SetDefaultModelSchema) {}

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

// OpenRouter API response shape
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: ModelPricing;
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}
