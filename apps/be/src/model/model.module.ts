import { Module } from '@nestjs/common';
import { ModelService } from './model.service.js';
import { KeyModule } from '../key/key.module.js';

@Module({
  imports: [KeyModule],
  providers: [ModelService],
  exports: [ModelService],
})
export class ModelModule {}
