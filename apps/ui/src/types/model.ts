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
