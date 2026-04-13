import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LlmService } from './llm/llm.service.js';
import { InputDto } from './dtos/input.dto.js';
import { KontekstService } from './kontekst/kontekst.service.js';
import { RenameKontekstDto, SaveKontekstDto } from './dtos/save.dto.js';
import { DeleteShortcutDto, SaveShortcutDto } from './dtos/shortcut.dto.js';
import { ChatDto } from './dtos/chat.dto.js';
import type { KontekstDto } from './dtos/kontekst.dto.js';
import type { Shortcuts } from './kontekst/interfaces/shortcuts.type.js';
import type { ModelDto } from './dtos/model.dto.js';

@Controller()
export class AppController {
  constructor(
    private readonly llmService: LlmService,
    private readonly kontekstService: KontekstService,
  ) {}

  @Post()
  async generate(@Body() body: InputDto): Promise<string> {
    const { input, kontekstName, model } = body;
    return await this.llmService.generate(input, kontekstName, model);
  }

  @Post('chat')
  async chat(@Body() body: ChatDto): Promise<string> {
    const { kontekstName, messages, model } = body;
    return await this.llmService.chat(messages, kontekstName, model);
  }

  @Get('models/default')
  getDefaultModel(): Promise<ModelDto> {
    return this.llmService.getDefaultModel();
  }

  @Get('models')
  getModels(
    @Query('search') search?: string,
    @Query('limit', ParseIntPipe) limit = 10,
  ): Promise<ModelDto[]> {
    return this.llmService.getModels(search, limit);
  }

  @Get('kontekst')
  getKontekst(@Query('name') name: string): KontekstDto {
    return this.kontekstService.findKontekst(name);
  }

  @Post('kontekst')
  saveKontekst(@Body() body: SaveKontekstDto): KontekstDto {
    const { name, content, overwrite, shortcut } = body;
    return this.kontekstService.saveKontekst(
      name,
      content,
      overwrite,
      shortcut,
    );
  }

  @Patch('kontekst')
  renameKontekst(@Body() body: RenameKontekstDto): KontekstDto {
    const { name, newName } = body;
    return this.kontekstService.renameKontekst(name, newName);
  }

  @Delete('kontekst')
  @HttpCode(204)
  deleteKontekst(@Query('name') name: string): void {
    this.kontekstService.deleteKontekst(name);
  }

  @Get('konteksts')
  listKonteksts(): string[] {
    return this.kontekstService.listKonteksts();
  }

  @Post('shortcuts')
  setShortcut(@Body() body: SaveShortcutDto): void {
    const { kontekstName, shortcut } = body;
    this.kontekstService.setShortcut(kontekstName, shortcut);
  }

  @Get('shortcuts')
  getShortcuts(): Shortcuts {
    return this.kontekstService.getShortcuts();
  }

  @Delete('shortcuts')
  deleteShortcut(@Body() body: DeleteShortcutDto): void {
    const { kontekstName } = body;
    this.kontekstService.deleteShortcut(kontekstName);
  }
}
