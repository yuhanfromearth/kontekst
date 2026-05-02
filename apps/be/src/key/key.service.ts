import { HttpException, Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import type { KeyListItem } from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import { KeyEntry, KeyStore } from './interfaces/key-store.type.js';

@Injectable()
export class KeyService {
  // Mode 0o600: keys.json holds raw API secrets, owner read/write only.
  private readonly store = new JsonStore<KeyStore>(
    'keys.json',
    () => ({ keys: [] }),
    0o600,
  );

  private toListItem(entry: KeyEntry): KeyListItem {
    return {
      id: entry.id,
      label: entry.label,
      keyTail: entry.key.slice(-4),
      isActive: entry.isActive === true,
    };
  }

  listKeys(): KeyListItem[] {
    return this.store.read().keys.map((e) => this.toListItem(e));
  }

  getActiveKey(): string | null {
    const active = this.store.read().keys.find((k) => k.isActive);
    return active?.key ?? null;
  }

  requireActiveKey(): string {
    const key = this.getActiveKey();
    if (!key) {
      throw new HttpException('No active API key configured', 400);
    }
    return key;
  }

  hasActiveKey(): boolean {
    return this.getActiveKey() !== null;
  }

  async addKey(label: string, key: string): Promise<KeyListItem> {
    const trimmedLabel = label.trim();
    const trimmedKey = key.trim();

    await this.validateKey(trimmedKey);

    const store = this.store.read();
    const entry: KeyEntry = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      key: trimmedKey,
      isActive: store.keys.length === 0,
    };
    store.keys.push(entry);
    this.store.write(store);
    return this.toListItem(entry);
  }

  deleteKey(id: string): void {
    const store = this.store.read();
    const idx = store.keys.findIndex((k) => k.id === id);
    if (idx === -1) {
      throw new HttpException(`Key '${id}' not found`, 404);
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
      throw new HttpException(`Key '${id}' not found`, 404);
    }
    for (const k of store.keys) {
      delete k.isActive;
    }
    target.isActive = true;
    this.store.write(store);
  }

  private async validateKey(key: string): Promise<void> {
    const client = new OpenRouter({ apiKey: key });
    try {
      await client.apiKeys.getCurrentKeyMetadata();
    } catch {
      throw new HttpException('API key rejected by OpenRouter', 400);
    }
  }
}
