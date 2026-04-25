import { Module } from '@nestjs/common';
import { KontekstService } from './kontekst.service.js';

@Module({
  providers: [KontekstService],
  exports: [KontekstService],
})
export class KontekstModule {}
