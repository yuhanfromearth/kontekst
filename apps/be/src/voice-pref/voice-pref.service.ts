import { HttpException, Injectable } from '@nestjs/common';
import type { VoicePref, VoicePrefsForModel } from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import { VoicePrefStore } from './interfaces/voice-pref.type.js';

@Injectable()
export class VoicePrefService {
  private readonly store = new JsonStore<VoicePrefStore>(
    'voice-prefs.json',
    () => ({}),
  );

  list(modelId: string): VoicePrefsForModel {
    const store = this.store.read();
    return store[modelId] ?? {};
  }

  upsert(
    modelId: string,
    voiceId: string,
    update: { name?: string; shortcut?: string },
  ): void {
    const store = this.store.read();
    const modelEntries = store[modelId] ?? {};
    const current: VoicePref = modelEntries[voiceId] ?? {};

    const trimmedName = update.name?.trim();
    const trimmedShortcut = update.shortcut?.trim();

    if (trimmedShortcut) {
      const conflict = Object.entries(modelEntries).find(
        ([id, entry]) => entry.shortcut === trimmedShortcut && id !== voiceId,
      );
      if (conflict) {
        throw new HttpException(
          `Shortcut '${trimmedShortcut}' is already assigned to '${conflict[0]}'`,
          409,
        );
      }
    }

    const next: VoicePref = { ...current };
    if (update.name !== undefined) {
      if (trimmedName) next.name = trimmedName;
      else delete next.name;
    }
    if (update.shortcut !== undefined) {
      if (trimmedShortcut) next.shortcut = trimmedShortcut;
      else delete next.shortcut;
    }

    if (!next.name && !next.shortcut && !next.isDefault) {
      delete modelEntries[voiceId];
    } else {
      modelEntries[voiceId] = next;
    }

    if (Object.keys(modelEntries).length === 0) {
      delete store[modelId];
    } else {
      store[modelId] = modelEntries;
    }

    this.store.write(store);
  }

  setDefault(modelId: string, voiceId: string): void {
    const store = this.store.read();
    const modelEntries = store[modelId] ?? {};

    for (const entry of Object.values(modelEntries)) {
      delete entry.isDefault;
    }

    modelEntries[voiceId] = {
      ...(modelEntries[voiceId] ?? {}),
      isDefault: true,
    };
    store[modelId] = modelEntries;
    this.store.write(store);
  }

  clearDefault(modelId: string): void {
    const store = this.store.read();
    const modelEntries = store[modelId];
    if (!modelEntries) return;

    let mutated = false;
    for (const [id, entry] of Object.entries(modelEntries)) {
      if (entry.isDefault) {
        delete entry.isDefault;
        mutated = true;
        if (!entry.name && !entry.shortcut) delete modelEntries[id];
      }
    }
    if (!mutated) return;

    if (Object.keys(modelEntries).length === 0) {
      delete store[modelId];
    } else {
      store[modelId] = modelEntries;
    }
    this.store.write(store);
  }
}
