import { Module } from '@nestjs/common';
import { KeyService } from './key.service.js';

@Module({
  providers: [KeyService],
  exports: [KeyService],
})
export class KeyModule {}
