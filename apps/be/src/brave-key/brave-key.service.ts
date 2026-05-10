import { HttpException, Injectable } from '@nestjs/common';
import type { BraveKeyListItem } from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import {
  BraveKeyEntry,
  BraveKeyStore,
} from './interfaces/brave-key-store.type.js';

@Injectable()
export class BraveKeyService {
  // Mode 0o600: brave-keys.json holds raw API secrets, owner read/write only.
  private readonly store = new JsonStore<BraveKeyStore>(
    'brave-keys.json',
    () => ({ keys: [] }),
    0o600,
  );

  private toListItem(entry: BraveKeyEntry): BraveKeyListItem {
    return {
      id: entry.id,
      label: entry.label,
      keyTail: entry.key.slice(-4),
      isActive: entry.isActive === true,
    };
  }

  listKeys(): BraveKeyListItem[] {
    return this.store.read().keys.map((e) => this.toListItem(e));
  }

  getActiveKey(): string | null {
    const active = this.store.read().keys.find((k) => k.isActive);
    return active?.key ?? null;
  }

  requireActiveKey(): string {
    const key = this.getActiveKey();
    if (!key) {
      throw new HttpException('No active Brave Search API key configured', 400);
    }
    return key;
  }

  hasActiveKey(): boolean {
    return this.getActiveKey() !== null;
  }

  async addKey(label: string, key: string): Promise<BraveKeyListItem> {
    const trimmedLabel = label.trim();
    const trimmedKey = key.trim();

    await this.validateKey(trimmedKey);

    const store = this.store.read();
    const entry: BraveKeyEntry = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      key: trimmedKey,
      isActive: store.keys.length === 0,
    };
    store.keys.push(entry);
    this.store.write(store);
    return this.toListItem(entry);
  }

  // Brave doesn't expose a dedicated key-metadata endpoint, so we send a
  // minimal search to verify the token is accepted. Any non-2xx response
  // surfaces upstream so the user knows why the key was rejected.
  private async validateKey(key: string): Promise<void> {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', 'ping');
    url.searchParams.set('count', '1');

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': key,
        },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'network error';
      throw new HttpException(
        `Could not reach Brave Search to validate key: ${detail}`,
        400,
      );
    }

    if (response.ok) return;

    if (response.status === 401 || response.status === 403) {
      throw new HttpException('API key rejected by Brave Search', 400);
    }

    const detail = await response.text().catch(() => '');
    throw new HttpException(
      `Brave Search rejected the key (${response.status}): ${detail || response.statusText}`,
      400,
    );
  }

  deleteKey(id: string): void {
    const store = this.store.read();
    const idx = store.keys.findIndex((k) => k.id === id);
    if (idx === -1) {
      throw new HttpException(`Brave key '${id}' not found`, 404);
    }
    const wasActive = store.keys[idx].isActive === true;
    store.keys.splice(idx, 1);
    if (wasActive && store.keys.length > 0) {
      store.keys[0].isActive = true;
    }
    this.store.write(store);
  }

  setActive(id: string): void {
    const store = this.store.read();
    const target = store.keys.find((k) => k.id === id);
    if (!target) {
      throw new HttpException(`Brave key '${id}' not found`, 404);
    }
    for (const k of store.keys) {
      delete k.isActive;
    }
    target.isActive = true;
    this.store.write(store);
  }
}
