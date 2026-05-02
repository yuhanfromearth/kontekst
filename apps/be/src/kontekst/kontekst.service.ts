import { HttpException, Injectable } from '@nestjs/common';
import type { KontekstDto, Shortcuts } from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import { KontekstStore } from './interfaces/kontekst.type.js';

@Injectable()
export class KontekstService {
  private readonly store = new JsonStore<KontekstStore>(
    'konteksts.json',
    () => ({}),
  );

  listKonteksts(): string[] {
    const store = this.store.read();
    const names = Object.keys(store);

    if (names.length === 0) {
      return [];
    }

    const defaultName = Object.entries(store).find(
      ([, entry]) => entry.isDefault,
    )?.[0];

    if (!defaultName) {
      return names.sort();
    }

    return [
      defaultName,
      ...names.filter((name) => name !== defaultName).sort(),
    ];
  }

  setDefaultKontekst(name: string): void {
    const normalizedName = name.trim();
    const store = this.store.read();

    if (!(normalizedName in store)) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    for (const entry of Object.values(store)) {
      delete entry.isDefault;
    }

    store[normalizedName].isDefault = true;
    this.store.write(store);
  }

  getDefaultKontekst(): string | null {
    const store = this.store.read();
    const entry = Object.entries(store).find(([, e]) => e.isDefault);
    return entry?.[0] ?? null;
  }

  clearDefaultKontekst(): void {
    const store = this.store.read();
    for (const entry of Object.values(store)) {
      delete entry.isDefault;
    }
    this.store.write(store);
  }

  getKontekst(name: string): string {
    const store = this.store.read();
    const entry = store[name.trim()];
    return entry?.content ?? '';
  }

  findKontekst(name: string): KontekstDto {
    const normalizedName = name.trim();
    const store = this.store.read();
    const entry = store[normalizedName];

    return {
      name: normalizedName,
      kontekst: entry?.content,
      shortcut: entry?.shortcut,
    };
  }

  saveKontekst(
    name: string,
    content: string,
    overwrite: boolean = false,
    shortcut?: string,
  ): KontekstDto {
    const normalizedName = name.trim();
    const store = this.store.read();

    if (normalizedName in store && !overwrite) {
      throw new HttpException(
        `Kontekst with name '${name}' already exists. Set 'overwrite' to true to overwrite`,
        409,
      );
    }

    store[normalizedName] = { content };
    this.store.write(store);

    if (shortcut) {
      this.setShortcut(normalizedName, shortcut);
    }

    return this.findKontekst(normalizedName);
  }

  deleteKontekst(name: string): void {
    const normalizedName = name.trim();
    const store = this.store.read();

    if (!(normalizedName in store)) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    delete store[normalizedName];
    this.store.write(store);
  }

  renameKontekst(name: string, newName: string): KontekstDto {
    const normalizedName = name.trim();
    const normalizedNewName = newName.trim();
    const store = this.store.read();

    if (!(normalizedName in store)) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    store[normalizedNewName] = store[normalizedName];
    delete store[normalizedName];
    this.store.write(store);

    return this.findKontekst(normalizedNewName);
  }

  getShortcuts(): Shortcuts {
    const store = this.store.read();
    return Object.fromEntries(
      Object.entries(store)
        .filter(([, entry]) => entry.shortcut !== undefined)
        .map(([name, entry]) => [name, entry.shortcut as string]),
    );
  }

  setShortcut(kontekstName: string, shortcut: string): void {
    const normalizedName = kontekstName.trim();
    const normalizedShortcut = shortcut.trim();
    const store = this.store.read();

    if (!(normalizedName in store)) {
      throw new HttpException(
        `Kontekst with name '${kontekstName}' does not exist`,
        404,
      );
    }

    // Enforce shortcut uniqueness
    const conflict = Object.entries(store).find(
      ([key, entry]) =>
        entry.shortcut === normalizedShortcut && key !== normalizedName,
    );
    if (conflict) {
      throw new HttpException(
        `Shortcut '${shortcut}' is already assigned to '${conflict[0]}'`,
        409,
      );
    }

    store[normalizedName].shortcut = normalizedShortcut;
    this.store.write(store);
  }

  deleteShortcut(kontekstName: string): void {
    const normalizedName = kontekstName.trim();
    const store = this.store.read();

    if (!store[normalizedName]?.shortcut) {
      throw new HttpException(`No shortcut assigned to '${kontekstName}'`, 404);
    }

    delete store[normalizedName].shortcut;
    this.store.write(store);
  }
}
