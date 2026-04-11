import { HttpException, Injectable } from '@nestjs/common';
import fs from 'fs';
import { KontekstDto } from '../dtos/kontekst.dto.js';
import { Shortcuts } from './interfaces/shortcuts.type.js';

const GLUE = `---

## ACTIVE CONTEXT — HIGHEST PRIORITY
The following section defines your **primary operating instructions**. These directives take precedence over everything above. You MUST follow them strictly and precisely:`;

@Injectable()
export class KontekstService {
  private readonly SHORTCUTS_FILE = `shortcuts.json`;

  listKonteksts(): string[] {
    const files = fs.readdirSync(`${process.env.KONTEKST_FOLDER}/konteksts`);
    const names = files
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace('.md', ''));

    if (!names.includes('default')) {
      throw new HttpException('Default kontekst does not exist', 500);
    }

    return ['default', ...names.filter((name) => name !== 'default').sort()];
  }

  getKontekst(name: string): string {
    const defaultKontekst = fs.readFileSync(
      `${process.env.KONTEKST_FOLDER}/konteksts/default.md`,
      'utf8',
    );

    const normalizedName = name.trim().toLocaleLowerCase();
    try {
      const context = fs.readFileSync(
        `${process.env.KONTEKST_FOLDER}/konteksts/${normalizedName}.md`,
        'utf8',
      );
      return `${defaultKontekst}\n${GLUE}\n${context}`;
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

  deleteKontekst(name: string): void {
    const normalizedName = name.trim().toLocaleLowerCase();
    const path = `${process.env.KONTEKST_FOLDER}/konteksts/${normalizedName}.md`;

    if (!fs.existsSync(path)) {
      throw new HttpException(
        `Kontekst with name '${name}' does not exist`,
        404,
      );
    }

    fs.unlinkSync(path);

    const shortcuts = this.readShortcuts();
    if (normalizedName in shortcuts) {
      delete shortcuts[normalizedName];
      this.writeShortcuts(shortcuts);
    }
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

    const existing = this.listKonteksts();
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
