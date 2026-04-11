import { HttpException, Injectable } from '@nestjs/common';
import fs from 'fs';
import { KontekstDto } from '../dtos/kontekst.dto.js';
import { Shortcuts } from './interfaces/shortcuts.type.js';

@Injectable()
export class KontekstService {
  private readonly SHORTCUTS_FILE = `shortcuts.json`;

  fetchKonteksts(): string[] {
    const files = fs.readdirSync(`${process.env.KONTEKST_FOLDER}/konteksts`);
    const kontekstFiles = files.filter(
      (file) => file.endsWith('.md') && !file.startsWith('base_'),
    );

    return kontekstFiles.map((file) => file.replace('.md', ''));
  }

  getKontekst(name?: string): string {
    const base1 = fs.readFileSync(
      `${process.env.KONTEKST_FOLDER}/konteksts/base_1.md`,
      'utf8',
    );

    if (!name) {
      return base1;
    }

    const base2 = fs.readFileSync(
      `${process.env.KONTEKST_FOLDER}/konteksts/base_2.md`,
      'utf8',
    );

    const normalizedName = name.trim().toLocaleLowerCase();
    try {
      const context = fs.readFileSync(
        `${process.env.KONTEKST_FOLDER}/konteksts/${normalizedName}.md`,
        'utf8',
      );
      return `${base1}\n${base2}\n${context}`;
    } catch {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }
  }

  findKontekst(name: string): KontekstDto {
    const normalizedName = name.trim().toLocaleLowerCase();
    const path = `${process.env.KONTEKST_FOLDER}/konteksts/${normalizedName}.md`;
    const kontekst = fs.existsSync(path)
      ? fs.readFileSync(path, 'utf8')
      : undefined;
    const shortcuts = this.readShortcuts();
    const shortcut = shortcuts[normalizedName];

    return { name: normalizedName, kontekst, shortcut };
  }

  saveKontekst(
    name: string,
    content: string,
    overwrite: boolean = false,
    shortcut?: string,
  ): KontekstDto {
    const normalizedName = name.trim().toLocaleLowerCase();
    const path = `${process.env.KONTEKST_FOLDER}/konteksts/${normalizedName}.md`;

    const exists = fs.existsSync(path);

    if (exists && !overwrite) {
      throw new HttpException(
        `Kontekst with name '${name}' already exists. Set 'overwrite' to true to overwrite`,
        409,
      );
    }

    fs.writeFileSync(path, content);

    if (shortcut) {
      this.setShortcut(normalizedName, shortcut);
    }

    return this.findKontekst(normalizedName);
  }

  renameKontekst(name: string, newName: string): KontekstDto {
    const normalizedName = name.trim().toLocaleLowerCase();
    const normalizedNewName = newName.trim().toLocaleLowerCase();
    const folder = `${process.env.KONTEKST_FOLDER}/konteksts`;
    const oldPath = `${folder}/${normalizedName}.md`;
    const newPath = `${folder}/${normalizedNewName}.md`;

    if (!fs.existsSync(oldPath)) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    fs.renameSync(oldPath, newPath);

    const shortcuts = this.readShortcuts();
    if (normalizedName in shortcuts) {
      shortcuts[normalizedNewName] = shortcuts[normalizedName];
      delete shortcuts[normalizedName];
      this.writeShortcuts(shortcuts);
    }

    return this.findKontekst(normalizedNewName);
  }

  private shortcutsPath(): string {
    return `${process.env.KONTEKST_FOLDER}/${this.SHORTCUTS_FILE}`;
  }

  private readShortcuts(): Shortcuts {
    const path = this.shortcutsPath();
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '{}');
      return {};
    }

    return JSON.parse(fs.readFileSync(path, 'utf8')) as Shortcuts;
  }

  private writeShortcuts(shortcuts: Shortcuts): void {
    fs.writeFileSync(this.shortcutsPath(), JSON.stringify(shortcuts, null, 2));
  }

  getShortcuts(): Shortcuts {
    return this.readShortcuts();
  }

  setShortcut(kontekstName: string, shortcut: string): void {
    const normalizedName = kontekstName.trim().toLocaleLowerCase();
    const normalizedShortcut = shortcut.trim().toLocaleLowerCase();

    const existing = this.fetchKonteksts();
    if (!existing.includes(normalizedName)) {
      throw new HttpException(
        `Kontekst with name '${kontekstName}' does not exist`,
        404,
      );
    }

    const shortcuts = this.readShortcuts();

    // Enforce shortcut uniqueness
    const conflict = Object.entries(shortcuts).find(
      ([kontekstName, s]) =>
        s === normalizedShortcut && kontekstName !== normalizedName,
    );
    if (conflict) {
      throw new HttpException(
        `Shortcut '${shortcut}' is already assigned to '${conflict[0]}'`,
        409,
      );
    }

    shortcuts[normalizedName] = normalizedShortcut;
    this.writeShortcuts(shortcuts);
  }

  deleteShortcut(kontekstName: string): void {
    const normalizedName = kontekstName.trim().toLocaleLowerCase();
    const shortcuts = this.readShortcuts();

    if (!(normalizedName in shortcuts)) {
      throw new HttpException(`No shortcut assigned to '${kontekstName}'`, 404);
    }

    delete shortcuts[normalizedName];
    this.writeShortcuts(shortcuts);
  }
}
