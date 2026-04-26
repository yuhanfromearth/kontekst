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
import { KontekstService } from './kontekst/kontekst.service.js';
import {
  RenameKontekstDto,
  SaveKontekstDto,
  SetDefaultKontekstDto,
} from './dtos/save.dto.js';
import { DeleteShortcutDto, SaveShortcutDto } from './dtos/shortcut.dto.js';
import { ChatDto } from './dtos/chat.dto.js';
import { ConversationService } from './conversation/conversation.service.js';
import type {
  ChatResponseDto,
  ConversationDto,
  ConversationSummary,
  KontekstDto,
  ModelDto,
  Shortcuts,
} from '@kontekst/dtos';
import { SetDefaultModelDto } from './dtos/model.dto.js';

@Controller()
export class AppController {
  constructor(
    private readonly llmService: LlmService,
    private readonly kontekstService: KontekstService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('chat')
  async chat(@Body() body: ChatDto): Promise<ChatResponseDto> {
    const { conversationId, kontekstName, message, model } = body;
    return this.conversationService.chat(
      conversationId,
      kontekstName,
      message,
      model,
    );
  }

  @Get('conversations')
  listConversations(): ConversationSummary[] {
    return this.conversationService.listConversations();
  }

  @Get('conversation')
  getConversation(@Query('id') id: string): ConversationDto {
    return this.conversationService.getConversation(id);
  }

  @Delete('conversation')
  @HttpCode(204)
  deleteConversation(@Query('id') id: string): void {
    this.conversationService.deleteConversation(id);
  }

  @Get('models/default')
  getDefaultModel(): Promise<ModelDto> {
    return this.llmService.getDefaultModel();
  }

  @Post('models/default')
  @HttpCode(204)
  setDefaultModel(@Body() body: SetDefaultModelDto): void {
    this.llmService.setDefaultModel(body.modelId);
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

  @Post('konteksts/default')
  @HttpCode(204)
  setDefaultKontekst(@Body() body: SetDefaultKontekstDto): void {
    this.kontekstService.setDefaultKontekst(body.name);
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
