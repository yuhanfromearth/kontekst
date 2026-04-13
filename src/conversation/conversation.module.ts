import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service.js';
import { LlmModule } from '../llm/llm.module.js';

@Module({
  imports: [LlmModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
