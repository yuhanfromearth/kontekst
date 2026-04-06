import { HttpException, Injectable } from '@nestjs/common';
import fs from 'fs';

@Injectable()
export class KontekstService {
  getKontekst(name?: string): string {
    const base1 = fs.readFileSync(
      `${process.env.SYSTEM_INSTRUCTIONS_FOLDER}/base_1.md`,
      'utf8',
    );

    if (!name) {
      return base1;
    }

    const base2 = fs.readFileSync(
      `${process.env.SYSTEM_INSTRUCTIONS_FOLDER}/base_2.md`,
      'utf8',
    );

    const normalizedName = name.trim().toLocaleLowerCase();
    try {
      const context = fs.readFileSync(
        `${process.env.SYSTEM_INSTRUCTIONS_FOLDER}/${normalizedName}.md`,
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

  saveKontekst(
    name: string,
    content: string,
    overwrite: boolean = false,
  ): void {
    const normalizedName = name.trim().toLocaleLowerCase();
    const path = `${process.env.SYSTEM_INSTRUCTIONS_FOLDER}/${normalizedName}.md`;

    const exists = fs.existsSync(path);

    if (exists && !overwrite) {
      throw new HttpException(
        `Kontekst with name '${name}' already exists. Set 'overwrite' to true to overwrite`,
        409,
      );
    }

    fs.writeFileSync(path, content);
  }
}
