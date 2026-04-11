import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LlmService } from './llm/llm.service.js';
import { InputDto } from './dtos/input.dto.js';
import { KontekstService } from './kontekst/kontekst.service.js';
import { RenameKontekstDto, SaveKontekstDto } from './dtos/save.dto.js';
import { DeleteShortcutDto, SaveShortcutDto } from './dtos/shortcut.dto.js';
import type { KontekstDto } from './dtos/kontekst.dto.js';
import type { Shortcuts } from './kontekst/interfaces/shortcuts.type.js';

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

  @Get('kontekst')
  getKontekst(@Query('name') name: string): KontekstDto {
    return this.contextService.findKontekst(name);
  }

  @Post('kontekst')
  saveKontekst(@Body() body: SaveKontekstDto): KontekstDto {
    const { name, content, overwrite, shortcut } = body;
    return this.contextService.saveKontekst(name, content, overwrite, shortcut);
  }

  @Patch('kontekst')
  renameKontekst(@Body() body: RenameKontekstDto): KontekstDto {
    const { name, newName } = body;
    return this.contextService.renameKontekst(name, newName);
  }

  @Delete('kontekst')
  @HttpCode(204)
  deleteKontekst(@Query('name') name: string): void {
    this.contextService.deleteKontekst(name);
  }

  @Get('konteksts')
  listKonteksts(): string[] {
    return this.contextService.listKonteksts();
  }

  @Post('shortcuts')
  setShortcut(@Body() body: SaveShortcutDto): void {
    const { kontekstName, shortcut } = body;
    this.contextService.setShortcut(kontekstName, shortcut);
  }

  @Get('shortcuts')
  getShortcuts(): Shortcuts {
    return this.contextService.getShortcuts();
  }

  @Delete('shortcuts')
  deleteShortcut(@Body() body: DeleteShortcutDto): void {
    const { kontekstName } = body;
    this.contextService.deleteShortcut(kontekstName);
  }
}
