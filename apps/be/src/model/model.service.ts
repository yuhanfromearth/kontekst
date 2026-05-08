import { Injectable } from '@nestjs/common';
import type { DefaultModelResponse, ModelDto } from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import { KeyService } from '../key/key.service.js';
import {
  OpenRouterModel,
  OpenRouterModelsResponse,
} from './interfaces/openrouter.interface.js';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const INITIAL_DEFAULT_MODEL = 'google/gemini-3-flash-preview';

interface DefaultModelStore {
  modelId: string;
}

@Injectable()
export class ModelService {
  private readonly defaultStore = new JsonStore<DefaultModelStore>(
    'default-model.json',
    () => ({ modelId: INITIAL_DEFAULT_MODEL }),
  );

  constructor(private readonly keyService: KeyService) {}

  async getModels(
    search?: string,
    limit = 10,
    free = false,
  ): Promise<ModelDto[]> {
    const all = (await this.fetchCatalog()).map(toModelDto);

    const query = search?.toLowerCase();
    const filtered = all.filter((m) => {
      if (free && !(m.pricing.prompt === '0' && m.pricing.completion === '0')) {
        return false;
      }
      if (
        query &&
        !m.id.toLowerCase().includes(query) &&
        !m.name.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, limit);
  }

  setDefaultModel(modelId: string): void {
    this.defaultStore.write({ modelId });
  }

  async getDefaultModel(): Promise<DefaultModelResponse> {
    const { modelId } = this.defaultStore.read();
    if (!modelId) return { modelId: null, model: null };
    const match = (await this.fetchCatalog()).find((m) => m.id === modelId);
    return { modelId, model: match ? toModelDto(match) : null };
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
    expirationDate: m.expiration_date ?? null,
  };
}
