import { Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import { KontekstService } from '../kontekst/kontekst.service.js';
import { Message } from '../dtos/chat.dto.js';
import { LlmChatResult } from '../dtos/chat-response.dto.js';
import { ModelDto, OpenRouterModelsResponse } from '../dtos/model.dto.js';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const INITIAL_DEFAULT_MODEL = 'google/gemini-3-flash-preview';

@Injectable()
export class LlmService {
  private readonly client: OpenRouter;
  private defaultModel = INITIAL_DEFAULT_MODEL;

  constructor(private readonly kontekstService: KontekstService) {
    this.client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  async chat(
    messages: Message[],
    kontekstName: string,
    model: string,
  ): Promise<LlmChatResult> {
    const systemPrompt = this.kontekstService.getKontekst(kontekstName);

    const result = await this.client.chat.send({
      chatRequest: {
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      },
    });

    if (result.usage) {
      return {
        content: result.choices[0].message.content as string,
        usage: {
          completionTokens: result.usage.completionTokens,
          promptTokens: result.usage.promptTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    }

    return {
      content: result.choices[0].message.content as string,
    };
  }

  async generateTitle(userMessage: string, model: string): Promise<string> {
    const result = await this.client.chat.send({
      chatRequest: {
        model,
        messages: [
          {
            role: 'system',
            content:
              'Generate a concise 3-6 word title for a conversation that begins with the given user message. Respond with only the title — no quotes, no trailing punctuation.',
          },
          { role: 'user', content: userMessage },
        ],
      },
    });

    return (result.choices[0].message.content as string).trim();
  }

  async getModels(search?: string, limit = 10): Promise<ModelDto[]> {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });

    const json = (await response.json()) as OpenRouterModelsResponse;

    const models: ModelDto[] = json.data.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description ?? null,
      contextLength: m.context_length,
      pricing: { prompt: m.pricing.prompt, completion: m.pricing.completion },
    }));

    const filtered = search
      ? models.filter((m) => {
          const query = search.toLowerCase();
          return (
            m.id.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query)
          );
        })
      : models;

    return filtered.slice(0, limit);
  }

  setDefaultModel(modelId: string): void {
    this.defaultModel = modelId;
  }

  async getDefaultModel(): Promise<ModelDto> {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });

    const json = (await response.json()) as OpenRouterModelsResponse;

    const match = json.data.find((m) => m.id === this.defaultModel);

    if (!match) {
      throw new Error(`Default model '${this.defaultModel}' not found`);
    }

    return {
      id: match.id,
      name: match.name,
      description: match.description ?? null,
      contextLength: match.context_length,
      pricing: {
        prompt: match.pricing.prompt,
        completion: match.pricing.completion,
      },
    };
  }
}
