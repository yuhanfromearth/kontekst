import { Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import type { Message, ModelDto, TokenUsage } from '@kontekst/dtos';
import { OpenRouterModelsResponse } from './interfaces/openrouter.interface.js';

export type LlmStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'usage'; usage: TokenUsage };

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const INITIAL_DEFAULT_MODEL = 'google/gemini-3-flash-preview';

@Injectable()
export class LlmService {
  private readonly client: OpenRouter;
  private defaultModel = INITIAL_DEFAULT_MODEL;

  constructor() {
    this.client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  async *chatStream(
    messages: Message[],
    systemPrompt: string,
    model: string,
    signal: AbortSignal,
  ): AsyncGenerator<LlmStreamEvent> {
    const stream = await this.client.chat.send(
      {
        chatRequest: {
          model,
          stream: true,
          messages: systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages,
        },
      },
      { signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield { type: 'delta', content: delta };
      }
      if (chunk.usage) {
        yield {
          type: 'usage',
          usage: {
            completionTokens: chunk.usage.completionTokens,
            promptTokens: chunk.usage.promptTokens,
            totalTokens: chunk.usage.totalTokens,
          },
        };
      }
    }
  }

  async generateTitle(
    systemPrompt: string,
    userMessage: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const userPrompt = {
      role: 'user' as const,
      content: `Generate a concise 3-6 word title for a new conversation that begins with this message:\n\n"${userMessage}"\n\nRespond with ONLY the title — no quotes, no trailing punctuation, no explanation.`,
    };

    const result = await this.client.chat.send(
      {
        chatRequest: {
          model,
          messages: systemPrompt
            ? [{ role: 'system', content: systemPrompt }, userPrompt]
            : [userPrompt],
        },
      },
      { signal },
    );

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
