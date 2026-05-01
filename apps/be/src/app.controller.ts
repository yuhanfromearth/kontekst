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
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
  ConversationDto,
  ConversationSummary,
  KeyInfo,
  KontekstDto,
  ModelDto,
  Shortcuts,
  StreamEvent,
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
  async chat(
    @Body() body: ChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { conversationId, kontekstName, message, model } = body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const write = (event: StreamEvent) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const evt of this.conversationService.chatStream(
        conversationId,
        kontekstName,
        message,
        model,
        controller.signal,
      )) {
        if (controller.signal.aborted) break;
        write(evt);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const messageText =
          err instanceof Error ? err.message : 'Stream failed';
        write({ type: 'error', message: messageText });
      }
    } finally {
      res.end();
    }
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

  @Get('key')
  getKeyInfo(): Promise<KeyInfo> {
    return this.llmService.getKeyInfo();
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

  @Get('konteksts/default')
  getDefaultKontekst(): { name: string | null } {
    return { name: this.kontekstService.getDefaultKontekst() };
  }

  @Delete('konteksts/default')
  @HttpCode(204)
  clearDefaultKontekst(): void {
    this.kontekstService.clearDefaultKontekst();
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
