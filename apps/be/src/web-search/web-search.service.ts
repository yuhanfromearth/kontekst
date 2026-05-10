import { Injectable } from '@nestjs/common';
import type { WebSearchHit } from '@kontekst/dtos';
import { BraveKeyService } from '../brave-key/brave-key.service.js';

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

// OpenAI-compatible function tool definition that we expose to OpenRouter when
// web search is enabled. Loose typing — the upstream API accepts any JSON
// schema, and the LLM only needs the structural fields.
export const WEB_SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'Search the public web with Brave Search. Use when up-to-date or external information is needed.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query.',
        },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description:
            'Number of results to return (1-20). Defaults to 5 if omitted.',
        },
      },
      required: ['query'],
    },
  },
} as const;

interface BraveSearchResponse {
  web?: {
    results?: {
      title?: string;
      url?: string;
      description?: string;
    }[];
  };
}

@Injectable()
export class WebSearchService {
  constructor(private readonly braveKeyService: BraveKeyService) {}

  async search(query: string, count = 5): Promise<WebSearchHit[]> {
    const apiKey = this.braveKeyService.requireActiveKey();
    const clamped = Math.max(1, Math.min(20, Math.trunc(count) || 5));

    const url = new URL(BRAVE_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(clamped));

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Brave Search failed: ${response.status} ${response.statusText} ${detail}`,
      );
    }

    const data = (await response.json()) as BraveSearchResponse;
    const results = data.web?.results ?? [];
    return results.map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.description ?? '',
    }));
  }
}
