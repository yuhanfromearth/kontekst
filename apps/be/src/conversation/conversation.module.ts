import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service.js';
import { LlmModule } from '../llm/llm.module.js';
import { KontekstModule } from '../kontekst/kontekst.module.js';

@Module({
  imports: [LlmModule, KontekstModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
