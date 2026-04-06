import { Module } from '@nestjs/common';
import { LlmService } from './llm.service.js';
import { KontekstModule } from '../kontekst/kontekst.module.js';

@Module({
  imports: [KontekstModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
