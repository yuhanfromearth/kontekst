import { Module } from '@nestjs/common';
import { BraveKeyService } from './brave-key.service.js';

@Module({
  providers: [BraveKeyService],
  exports: [BraveKeyService],
})
export class BraveKeyModule {}
