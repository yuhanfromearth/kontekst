import { Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import { KontekstService } from '../kontekst/kontekst.service.js';

@Injectable()
export class LlmService {
  private readonly client: OpenRouter;

  constructor(private readonly kontekstService: KontekstService) {
    this.client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  async generate(input: string, kontekstName?: string): Promise<string> {
    const kontekst = this.kontekstService.getKontekst(kontekstName);

    const result = this.client.callModel({
      model: 'google/gemini-3-flash-preview',
      instructions: kontekst,
      input,
    });

    const text = await result.getText();

    return text;
  }
}
