import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import { LlmService } from './llm/llm.service.js';
import { KeyService } from './key/key.service.js';
import { KontekstService } from './kontekst/kontekst.service.js';
import { ModelService } from './model/model.service.js';
import {
  RenameKontekstDto,
  SaveKontekstDto,
  SetDefaultKontekstDto,
} from './dtos/save.dto.js';
import { DeleteShortcutDto, SaveShortcutDto } from './dtos/shortcut.dto.js';
import { ChatDto } from './dtos/chat.dto.js';
import {
  SaveVoicePrefDto,
  SetDefaultTtsModelDto,
  SetDefaultVoiceDto,
  SpeechDto,
} from './dtos/speech.dto.js';
import { ConversationService } from './conversation/conversation.service.js';
import { SpeechService } from './speech/speech.service.js';
import { VoicePrefService } from './voice-pref/voice-pref.service.js';
import type {
  ConversationDto,
  ConversationSummary,
  KeyInfo,
  KeyListItem,
  KontekstDto,
  ModelDto,
  Shortcuts,
  SpeechClip,
  StreamEvent,
  TtsModel,
  VoicePrefsForModel,
} from '@kontekst/dtos';
import { SetDefaultModelDto } from './dtos/model.dto.js';
import { CreateKeyDto, SetActiveKeyDto } from './dtos/key.dto.js';

@Controller()
export class AppController {
  constructor(
    private readonly llmService: LlmService,
    private readonly kontekstService: KontekstService,
    private readonly conversationService: ConversationService,
    private readonly keyService: KeyService,
    private readonly modelService: ModelService,
    private readonly speechService: SpeechService,
    private readonly voicePrefService: VoicePrefService,
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

  @Delete('conversations')
  @HttpCode(204)
  deleteAllConversations(): void {
    this.conversationService.deleteAllConversations();
  }

  @Get('models/default')
  getDefaultModel(): Promise<ModelDto> {
    return this.modelService.getDefaultModel();
  }

  @Post('models/default')
  @HttpCode(204)
  setDefaultModel(@Body() body: SetDefaultModelDto): void {
    this.modelService.setDefaultModel(body.modelId);
  }

  @Get('key')
  getKeyInfo(): Promise<KeyInfo> {
    return this.llmService.getKeyInfo();
  }

  @Get('keys')
  listKeys(): KeyListItem[] {
    return this.keyService.listKeys();
  }

  @Post('keys')
  addKey(@Body() body: CreateKeyDto): Promise<KeyListItem> {
    return this.keyService.addKey(body.label, body.key);
  }

  @Delete('keys')
  @HttpCode(204)
  deleteKey(@Query('id') id: string): void {
    this.keyService.deleteKey(id);
  }

  @Post('keys/active')
  @HttpCode(204)
  setActiveKey(@Body() body: SetActiveKeyDto): void {
    this.keyService.setActive(body.id);
  }

  @Get('models')
  getModels(
    @Query('search') search?: string,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('free', new ParseBoolPipe({ optional: true })) free?: boolean,
  ): Promise<ModelDto[]> {
    return this.modelService.getModels(search, limit, free);
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

  @Post('speech')
  synthesize(@Body() body: SpeechDto): Promise<SpeechClip> {
    return this.speechService.synthesize(body);
  }

  @Get('speech/clips')
  listSpeechClips(): SpeechClip[] {
    return this.speechService.listClips();
  }

  @Get('speech/clips/:id/audio')
  streamSpeechAudio(
    @Param('id') id: string,
    @Headers('range') rangeHeader: string | undefined,
    @Res() res: Response,
  ): void {
    const { filePath, size } = this.speechService.resolveClipAudio(id);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    const range = parseRangeHeader(rangeHeader, size);
    if (range) {
      const { start, end } = range;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', String(end - start + 1));
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Content-Length', String(size));
    fs.createReadStream(filePath).pipe(res);
  }

  @Delete('speech/clips/:id')
  @HttpCode(204)
  deleteSpeechClip(@Param('id') id: string): void {
    this.speechService.deleteClip(id);
  }

  @Get('speech/models')
  listTtsModels(): Promise<TtsModel[]> {
    return this.speechService.listModels();
  }

  @Get('speech/models/default')
  getDefaultTtsModel(): Promise<TtsModel | null> {
    return this.speechService.getDefaultModel();
  }

  @Post('speech/models/default')
  @HttpCode(204)
  setDefaultTtsModel(@Body() body: SetDefaultTtsModelDto): void {
    this.speechService.setDefaultModel(body.modelId);
  }

  @Get('speech/voice-prefs')
  listVoicePrefs(@Query('modelId') modelId: string): VoicePrefsForModel {
    return this.voicePrefService.list(modelId);
  }

  @Post('speech/voice-prefs')
  @HttpCode(204)
  saveVoicePref(@Body() body: SaveVoicePrefDto): void {
    const { modelId, voiceId, name, shortcut } = body;
    this.voicePrefService.upsert(modelId, voiceId, { name, shortcut });
  }

  @Post('speech/voice-prefs/default')
  @HttpCode(204)
  setDefaultVoice(@Body() body: SetDefaultVoiceDto): void {
    this.voicePrefService.setDefault(body.modelId, body.voiceId);
  }

  @Delete('speech/voice-prefs/default')
  @HttpCode(204)
  clearDefaultVoice(@Query('modelId') modelId: string): void {
    this.voicePrefService.clearDefault(modelId);
  }
}

// Parse a single-range `Range` header per RFC 7233. Supports `bytes=N-`,
// `bytes=N-M`, and the suffix form `bytes=-N` (last N bytes). Returns null
// for missing/malformed/unsatisfiable input so the caller can fall through
// to a 200 full-body response.
function parseRangeHeader(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const startStr = match[1];
  const endStr = match[2];
  if (startStr === '' && endStr === '') return null;

  let start: number;
  let end: number;
  if (startStr === '') {
    const suffix = parseInt(endStr, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(startStr, 10);
    end = endStr === '' ? size - 1 : parseInt(endStr, 10);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || start >= size || end >= size || start > end) return null;
  return { start, end };
}
