import { Module } from '@nestjs/common';
import { BraveKeyModule } from '../brave-key/brave-key.module.js';
import { WebSearchPrefService } from './web-search-pref.service.js';
import { WebSearchService } from './web-search.service.js';

@Module({
  imports: [BraveKeyModule],
  providers: [WebSearchService, WebSearchPrefService],
  exports: [WebSearchService, WebSearchPrefService],
})
export class WebSearchModule {}
