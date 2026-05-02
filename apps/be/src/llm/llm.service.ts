import { Injectable, Logger } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import type { KeyInfo, Message, TokenUsage } from '@kontekst/dtos';
import { KeyService } from '../key/key.service.js';

export type LlmStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'usage'; usage: TokenUsage };

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
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly keyService: KeyService) {}

  private getClient(): OpenRouter {
    return new OpenRouter({ apiKey: this.keyService.requireActiveKey() });
  }

  async *chatStream(
    messages: Message[],
    systemPrompt: string,
    model: string,
    signal: AbortSignal,
  ): AsyncGenerator<LlmStreamEvent> {
    const client = this.getClient();
    const stream = await client.chat.send(
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

    const client = this.getClient();
    const result = await client.chat.send(
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

  async getKeyInfo(): Promise<KeyInfo> {
    const client = this.getClient();
    const res = await client.apiKeys.getCurrentKeyMetadata();
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
    const client = this.getClient();
    for (let attempt = 0; attempt < GENERATION_LOOKUP_ATTEMPTS; attempt++) {
      try {
        const res = await client.generations.getGeneration({
          id: generationId,
        });
        return res.data.totalCost;
      } catch (error) {
        console.log(error);
        await new Promise((r) => setTimeout(r, GENERATION_LOOKUP_DELAY_MS));
      }
    }
    this.logger.warn(
      `Could not retrieve cost for generation ${generationId}; recording 0`,
    );
    return 0;
  }
}
