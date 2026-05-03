import type { ModelPricing } from '@kontekst/dtos';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: ModelPricing;
  expiration_date?: string | null;
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}
