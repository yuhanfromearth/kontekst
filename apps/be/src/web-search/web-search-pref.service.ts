import { Injectable } from '@nestjs/common';
import type { WebSearchPref } from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';

@Injectable()
export class WebSearchPrefService {
  private readonly store = new JsonStore<WebSearchPref>(
    'web-search-pref.json',
    () => ({ enabled: false }),
  );

  get(): WebSearchPref {
    return this.store.read();
  }

  set(enabled: boolean): WebSearchPref {
    const next = { enabled };
    this.store.write(next);
    return next;
  }
}
