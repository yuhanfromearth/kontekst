import { Injectable, Logger } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import type { KeyInfo, Message, ModelDto, TokenUsage } from '@kontekst/dtos';
import { OpenRouterModelsResponse } from './interfaces/openrouter.interface.js';

export type LlmStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'usage'; usage: TokenUsage };

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const INITIAL_DEFAULT_MODEL = 'google/gemini-3-flash-preview';

// OpenRouter does a pre-flight credit check on `max_tokens × completion_price`.
// Without an explicit cap it uses the model's full output capacity (often 64k+),
// which fails on tight weekly budgets even for tiny prompts. Cap to a sensible
// reply size for chat and a tiny budget for the 3–6 word title generation.
const CHAT_MAX_TOKENS = 8192;
const TITLE_MAX_TOKENS = 32;

// OpenRouter records the generation asynchronously, so /generation can 404
// briefly after the stream closes. Retry a handful of times before giving up.
const GENERATION_LOOKUP_ATTEMPTS = 5;
const GENERATION_LOOKUP_DELAY_MS = 400;

@Injectable()
export class LlmService {
  private readonly client: OpenRouter;
  private readonly logger = new Logger(LlmService.name);
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
          maxTokens: CHAT_MAX_TOKENS,
          messages: systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages,
        },
      },
      { signal },
    );

    let lastChunkId: string | undefined;
    let usage: TokenUsage | undefined;

    for await (const chunk of stream) {
      if (chunk.id) lastChunkId = chunk.id;

      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield { type: 'delta', content: delta };
      }
      if (chunk.usage) {
        usage = {
          completionTokens: chunk.usage.completionTokens,
          promptTokens: chunk.usage.promptTokens,
          totalTokens: chunk.usage.totalTokens,
          cost: 0,
        };
      }
    }

    if (usage) {
      usage.cost = lastChunkId ? await this.lookupCost(lastChunkId) : 0;
      yield { type: 'usage', usage };
    }
  }

  async generateTitle(
    systemPrompt: string,
    userMessage: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<{ title: string; cost: number }> {
    const userPrompt = {
      role: 'user' as const,
      content: `Generate a concise 3-6 word title for a new conversation that begins with this message:\n\n"${userMessage}"\n\nRespond with ONLY the title — no quotes, no trailing punctuation, no explanation.`,
    };

    const result = await this.client.chat.send(
      {
        chatRequest: {
          model,
          maxTokens: TITLE_MAX_TOKENS,
          messages: systemPrompt
            ? [{ role: 'system', content: systemPrompt }, userPrompt]
            : [userPrompt],
        },
      },
      { signal },
    );

    const title = (result.choices[0].message.content as string).trim();
    const cost = result.id ? await this.lookupCost(result.id) : 0;

    return { title, cost };
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

  async getKeyInfo(): Promise<KeyInfo> {
    const res = await this.client.apiKeys.getCurrentKeyMetadata();
    const data = res.data;
    return {
      label: data.label,
      limit: data.limit,
      limitRemaining: data.limitRemaining,
      limitReset: data.limitReset,
      usage: data.usage,
      usageDaily: data.usageDaily,
      usageWeekly: data.usageWeekly,
      usageMonthly: data.usageMonthly,
      isFreeTier: data.isFreeTier,
    };
  }

  private async lookupCost(generationId: string): Promise<number> {
    for (let attempt = 0; attempt < GENERATION_LOOKUP_ATTEMPTS; attempt++) {
      try {
        const res = await this.client.generations.getGeneration({
          id: generationId,
        });
        return res.data.totalCost;
      } catch {
        await new Promise((r) => setTimeout(r, GENERATION_LOOKUP_DELAY_MS));
      }
    }
    this.logger.warn(
      `Could not retrieve cost for generation ${generationId}; recording 0`,
    );
    return 0;
  }
}
