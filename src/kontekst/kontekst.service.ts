import { HttpException, Injectable } from '@nestjs/common';
import fs from 'fs';
import { KontekstDto } from '../dtos/kontekst.dto.js';
import { Shortcuts } from './interfaces/shortcuts.type.js';
import { KontekstStore } from './interfaces/kontekst.type.js';
import { PROMPT_GLUE } from './constants/prompt.js';

@Injectable()
export class KontekstService {
  private storePath(): string {
    return `${process.env.KONTEKST_FOLDER}/konteksts.json`;
  }

  private readStore(): KontekstStore {
    const path = this.storePath();
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '{}');
      return {};
    }

    return JSON.parse(fs.readFileSync(path, 'utf8')) as KontekstStore;
  }

  private writeStore(store: KontekstStore): void {
    fs.writeFileSync(this.storePath(), JSON.stringify(store, null, 2));
  }

  listKonteksts(): string[] {
    const store = this.readStore();
    const names = Object.keys(store);

    if (!names.includes('default')) {
      throw new HttpException('Default kontekst does not exist', 500);
    }

    return ['default', ...names.filter((name) => name !== 'default').sort()];
  }

  getKontekst(name: string): string {
    const store = this.readStore();

    if (!store['default']) {
      throw new HttpException('Default kontekst does not exist', 500);
    }

    const normalizedName = name.trim();
    const entry = store[normalizedName];

    if (!entry) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    return `${store['default'].content}\n${PROMPT_GLUE}\n${entry.content}`;
  }

  findKontekst(name: string): KontekstDto {
    const normalizedName = name.trim();
    const store = this.readStore();
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
    const store = this.readStore();

    if (normalizedName in store && !overwrite) {
      throw new HttpException(
        `Kontekst with name '${name}' already exists. Set 'overwrite' to true to overwrite`,
        409,
      );
    }

    store[normalizedName] = { content };
    this.writeStore(store);

    if (shortcut) {
      this.setShortcut(normalizedName, shortcut);
    }

    return this.findKontekst(normalizedName);
  }

  deleteKontekst(name: string): void {
    const normalizedName = name.trim();
    const store = this.readStore();

    if (!(normalizedName in store)) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    delete store[normalizedName];
    this.writeStore(store);
  }

  renameKontekst(name: string, newName: string): KontekstDto {
    const normalizedName = name.trim();
    const normalizedNewName = newName.trim();
    const store = this.readStore();

    if (!(normalizedName in store)) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    store[normalizedNewName] = store[normalizedName];
    delete store[normalizedName];
    this.writeStore(store);

    return this.findKontekst(normalizedNewName);
  }

  getShortcuts(): Shortcuts {
    const store = this.readStore();
    return Object.fromEntries(
      Object.entries(store)
        .filter(([, entry]) => entry.shortcut !== undefined)
        .map(([name, entry]) => [name, entry.shortcut as string]),
    );
  }

  setShortcut(kontekstName: string, shortcut: string): void {
    const normalizedName = kontekstName.trim();
    const normalizedShortcut = shortcut.trim();
    const store = this.readStore();

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
    this.writeStore(store);
  }

  deleteShortcut(kontekstName: string): void {
    const normalizedName = kontekstName.trim();
    const store = this.readStore();

    if (!store[normalizedName]?.shortcut) {
      throw new HttpException(`No shortcut assigned to '${kontekstName}'`, 404);
    }

    delete store[normalizedName].shortcut;
    this.writeStore(store);
  }
}
