import { Injectable } from '@nestjs/common';
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

// Both chat paths bypass the SDK so we can pass `usage: { include: true }`,
// which makes OpenRouter return `cost` directly on the response/final usage
// chunk and avoids the flaky `/generation` lookup entirely. The SDK's outbound
// zod schema strips that field, so the typed client cannot opt into it.
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class LlmService {
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
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.keyService.requireActiveKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: CHAT_MAX_TOKENS,
        usage: { include: true },
        messages: systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...messages]
          : messages,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `OpenRouter chat failed: ${response.status} ${response.statusText} ${detail}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage: TokenUsage | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const event = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          for (const line of event.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            let chunk: {
              choices?: { delta?: { content?: string } }[];
              usage?: {
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
                cost?: number;
              };
            };
            try {
              chunk = JSON.parse(data) as typeof chunk;
            } catch {
              continue;
            }
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) yield { type: 'delta', content: delta };
            if (chunk.usage) {
              usage = {
                promptTokens: chunk.usage.prompt_tokens,
                completionTokens: chunk.usage.completion_tokens,
                totalTokens: chunk.usage.total_tokens,
                cost: chunk.usage.cost ?? 0,
              };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (usage) yield { type: 'usage', usage };
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

    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.keyService.requireActiveKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: TITLE_MAX_TOKENS,
        usage: { include: true },
        messages: systemPrompt
          ? [{ role: 'system', content: systemPrompt }, userPrompt]
          : [userPrompt],
      }),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `OpenRouter title generation failed: ${response.status} ${response.statusText} ${detail}`,
      );
    }

    const result = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage?: { cost?: number };
    };

    const title = result.choices[0].message.content.trim();
    const cost = result.usage?.cost ?? 0;

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
}
