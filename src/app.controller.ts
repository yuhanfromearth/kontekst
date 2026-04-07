import { Body, Controller, Get, Post } from '@nestjs/common';
import { LlmService } from './llm/llm.service.js';
import { InputDto } from './dtos/input.dto.js';
import { KontekstService } from './kontekst/kontekst.service.js';
import { SaveDto } from './dtos/save.dto.js';

@Controller()
export class AppController {
  constructor(
    private readonly llmService: LlmService,
    private readonly contextService: KontekstService,
  ) {}

  @Post()
  async generate(@Body() body: InputDto): Promise<string> {
    const { input, kontekstName } = body;
    return await this.llmService.generate(input, kontekstName);
  }

  @Post('kontekst')
  saveKontekst(@Body() body: SaveDto): void {
    const { name, content, overwrite } = body;
    this.contextService.saveKontekst(name, content, overwrite);
  }

  @Get('konteksts')
  fetchKonteksts(): string[] {
    return this.contextService.fetchKonteksts();
  }
}
