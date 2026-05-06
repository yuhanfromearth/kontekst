import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service.js';
import { KeyModule } from '../key/key.module.js';

@Module({
  imports: [KeyModule],
  providers: [SpeechService],
  exports: [SpeechService],
})
export class SpeechModule {}
