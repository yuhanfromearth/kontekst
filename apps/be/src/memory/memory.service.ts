import { Injectable } from '@nestjs/common';
import fs from 'node:fs';

@Injectable()
export class MemoryService {
  private readonly path = `${process.env.KONTEKST_FOLDER}/memory.md`;

  read(): string {
    if (!fs.existsSync(this.path)) return '';
    return fs.readFileSync(this.path, 'utf8');
  }

  write(content: string): void {
    fs.writeFileSync(this.path, content);
  }
}
