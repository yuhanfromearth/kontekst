import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LlmModule } from './llm/llm.module.js';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { KontekstModule } from './kontekst/kontekst.module.js';
import { ConversationModule } from './conversation/conversation.module.js';
import { KeyModule } from './key/key.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LlmModule,
    KontekstModule,
    ConversationModule,
    KeyModule,
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
