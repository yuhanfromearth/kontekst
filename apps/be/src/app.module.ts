import { Module } from '@nestjs/common';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LlmModule } from './llm/llm.module.js';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { ServeStaticModule } from '@nestjs/serve-static';
import { KontekstModule } from './kontekst/kontekst.module.js';
import { MemoryModule } from './memory/memory.module.js';
import { ConversationModule } from './conversation/conversation.module.js';
import { KeyModule } from './key/key.module.js';
import { ModelModule } from './model/model.module.js';
import { SpeechModule } from './speech/speech.module.js';
import { VoicePrefModule } from './voice-pref/voice-pref.module.js';
import { BraveKeyModule } from './brave-key/brave-key.module.js';
import { WebSearchModule } from './web-search/web-search.module.js';

const clientRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'ui',
  'dist',
  'client',
);

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: clientRoot,
    }),
    LlmModule,
    KontekstModule,
    MemoryModule,
    ConversationModule,
    KeyModule,
    ModelModule,
    SpeechModule,
    VoicePrefModule,
    BraveKeyModule,
    WebSearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
