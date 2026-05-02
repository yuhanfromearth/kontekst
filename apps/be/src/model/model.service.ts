import { Injectable } from '@nestjs/common';
import type { ModelDto } from '@kontekst/dtos';
import { KeyService } from '../key/key.service.js';
import {
  OpenRouterModel,
  OpenRouterModelsResponse,
} from './interfaces/openrouter.interface.js';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const INITIAL_DEFAULT_MODEL = 'google/gemini-3-flash-preview';

@Injectable()
export class ModelService {
  private defaultModel = INITIAL_DEFAULT_MODEL;

  constructor(private readonly keyService: KeyService) {}

  async getModels(search?: string, limit = 10): Promise<ModelDto[]> {
    const all = (await this.fetchCatalog()).map(toModelDto);

    const filtered = search
      ? all.filter((m) => {
          const query = search.toLowerCase();
          return (
            m.id.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query)
          );
        })
      : all;

    return filtered.slice(0, limit);
  }

  setDefaultModel(modelId: string): void {
    this.defaultModel = modelId;
  }

  async getDefaultModel(): Promise<ModelDto> {
    const match = (await this.fetchCatalog()).find(
      (m) => m.id === this.defaultModel,
    );

    if (!match) {
      throw new Error(`Default model '${this.defaultModel}' not found`);
    }

    return toModelDto(match);
  }

  private async fetchCatalog(): Promise<OpenRouterModel[]> {
    const apiKey = this.keyService.requireActiveKey();
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await response.json()) as OpenRouterModelsResponse;
    return json.data;
  }
}

function toModelDto(m: OpenRouterModel): ModelDto {
  return {
    id: m.id,
    name: m.name,
    description: m.description ?? null,
    contextLength: m.context_length,
    pricing: { prompt: m.pricing.prompt, completion: m.pricing.completion },
  };
}
