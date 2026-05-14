import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach } from 'vitest';

export function useTmpKontekstFolder(): { dir: () => string } {
  let dir = '';
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env.KONTEKST_FOLDER;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kontekst-test-'));
    process.env.KONTEKST_FOLDER = dir;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (prev === undefined) delete process.env.KONTEKST_FOLDER;
    else process.env.KONTEKST_FOLDER = prev;
  });

  return { dir: () => dir };
}
