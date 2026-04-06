import { Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';

@Injectable()
export class LlmService {
  private readonly client: OpenRouter;

  constructor() {
    this.client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  async generate(input: string): Promise<string> {
    const result = this.client.callModel({
      model: 'google/gemini-3-flash-preview',
      input,
    });

    const text = await result.getText();

    return text;
  }
}
