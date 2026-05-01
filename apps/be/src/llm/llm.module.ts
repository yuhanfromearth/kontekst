import { Module } from '@nestjs/common';
import { LlmService } from './llm.service.js';
import { KeyModule } from '../key/key.module.js';

@Module({
  imports: [KeyModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
