import { Module } from '@nestjs/common';
import { VoicePrefService } from './voice-pref.service.js';

@Module({
  providers: [VoicePrefService],
  exports: [VoicePrefService],
})
export class VoicePrefModule {}
