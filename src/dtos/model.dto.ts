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
