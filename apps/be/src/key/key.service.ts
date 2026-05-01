import { HttpException, Injectable } from '@nestjs/common';
import fs from 'fs';
import { OpenRouter } from '@openrouter/sdk';
import type { KeyListItem } from '@kontekst/dtos';
import { KeyEntry, KeyStore } from './interfaces/key-store.type.js';

@Injectable()
export class KeyService {
  private storePath(): string {
    return `${process.env.KONTEKST_FOLDER}/keys.json`;
  }

  private readStore(): KeyStore {
    const path = this.storePath();
    if (!fs.existsSync(path)) {
      const empty: KeyStore = { keys: [] };
      this.writeStore(empty);
      return empty;
    }
    return JSON.parse(fs.readFileSync(path, 'utf8')) as KeyStore;
  }

  private writeStore(store: KeyStore): void {
    const path = this.storePath();
    fs.writeFileSync(path, JSON.stringify(store, null, 2));
    // Owner read/write only — keys.json holds raw API secrets.
    fs.chmodSync(path, 0o600);
  }

  private toListItem(entry: KeyEntry): KeyListItem {
    return {
      id: entry.id,
      label: entry.label,
      keyTail: entry.key.slice(-4),
      isActive: entry.isActive === true,
    };
  }

  listKeys(): KeyListItem[] {
    return this.readStore().keys.map((e) => this.toListItem(e));
  }

  getActiveKey(): string | null {
    const active = this.readStore().keys.find((k) => k.isActive);
    return active?.key ?? null;
  }

  hasActiveKey(): boolean {
    return this.getActiveKey() !== null;
  }

  async addKey(label: string, key: string): Promise<KeyListItem> {
    const trimmedLabel = label.trim();
    const trimmedKey = key.trim();

    await this.validateKey(trimmedKey);

    const store = this.readStore();
    const entry: KeyEntry = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      key: trimmedKey,
      isActive: store.keys.length === 0,
    };
    store.keys.push(entry);
    this.writeStore(store);
    return this.toListItem(entry);
  }

  deleteKey(id: string): void {
    const store = this.readStore();
    const idx = store.keys.findIndex((k) => k.id === id);
    if (idx === -1) {
      throw new HttpException(`Key '${id}' not found`, 404);
    }
    const wasActive = store.keys[idx].isActive === true;
    store.keys.splice(idx, 1);
    if (wasActive && store.keys.length > 0) {
      store.keys[0].isActive = true;
    }
    this.writeStore(store);
  }

  setActive(id: string): void {
    const store = this.readStore();
    const target = store.keys.find((k) => k.id === id);
    if (!target) {
      throw new HttpException(`Key '${id}' not found`, 404);
    }
    for (const k of store.keys) {
      delete k.isActive;
    }
    target.isActive = true;
    this.writeStore(store);
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
