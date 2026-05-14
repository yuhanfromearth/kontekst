import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service.js';
import { LlmModule } from '../llm/llm.module.js';
import { KontekstModule } from '../kontekst/kontekst.module.js';
import { MemoryModule } from '../memory/memory.module.js';
import { BraveKeyModule } from '../brave-key/brave-key.module.js';
import { WebSearchModule } from '../web-search/web-search.module.js';

@Module({
  imports: [
    LlmModule,
    KontekstModule,
    MemoryModule,
    BraveKeyModule,
    WebSearchModule,
  ],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
