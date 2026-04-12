import { Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import { KontekstService } from '../kontekst/kontekst.service.js';
import { Message } from '../dtos/chat.dto.js';

@Injectable()
export class LlmService {
  private readonly client: OpenRouter;

  constructor(private readonly kontekstService: KontekstService) {
    this.client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  async generate(input: string, kontekstName: string): Promise<string> {
    const kontekst = this.kontekstService.getKontekst(kontekstName);

    const result = this.client.callModel({
      model: 'google/gemini-3-flash-preview',
      instructions: kontekst,
      input,
    });

    const text = await result.getText();

    return text;
  }

  async chat(messages: Message[], kontekstName: string): Promise<string> {
    const systemPrompt = this.kontekstService.getKontekst(kontekstName);

    const result = await this.client.chat.send({
      chatRequest: {
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      },
    });

    return result.choices[0].message.content as string;
  }
}
