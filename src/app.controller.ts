import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service.js';
import { LlmService } from './llm/llm.service.js';
import { InputDto } from './dtos/input.dto.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly llmService: LlmService,
  ) {}

  @Post()
  async generate(@Body() body: InputDto): Promise<string> {
    return await this.llmService.generate(body.input);
  }
}
