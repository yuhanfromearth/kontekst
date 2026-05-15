#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import updateNotifier from 'update-notifier';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
process.env.KONTEKST_VERSION = pkg.version;

const notifier = updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24,
});
if (notifier.update) {
  notifier.notify({
    defer: false,
    isGlobal: true,
    message:
      `Update available {currentVersion} → {latestVersion}\n` +
      `Run {updateCommand} to update\n` +
      `Release notes: https://github.com/yuhanfromearth/kontekst/releases/tag/v{latestVersion}`,
  });
}

const configDir = join(homedir(), '.config', 'kontekst');
const configFile = join(configDir, 'folder');

if (!process.env.KONTEKST_FOLDER) {
  if (existsSync(configFile)) {
    process.env.KONTEKST_FOLDER = readFileSync(configFile, 'utf8').trim();
  } else {
    const defaultFolder = join(homedir(), '.kontekst');
    if (stdin.isTTY) {
      const rl = createInterface({ input: stdin, output: stdout });
      const answer = (
        await rl.question(
          `KONTEKST_FOLDER [hit 'Enter' for ${defaultFolder}]: `
        )
      ).trim();
      rl.close();
      process.env.KONTEKST_FOLDER = answer
        ? resolve(answer.replace(/^~(?=$|\/|\\)/, homedir()))
        : defaultFolder;
    } else {
      process.env.KONTEKST_FOLDER = defaultFolder;
    }
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configFile, process.env.KONTEKST_FOLDER);
  }
}
mkdirSync(process.env.KONTEKST_FOLDER, { recursive: true });

if (!process.env.PORT) {
  process.env.PORT = '8080';
}

const mainPath = join(here, '..', 'apps', 'be', 'dist', 'main.js');

await import(pathToFileURL(mainPath).href);

const url = `http://localhost:${process.env.PORT}`;
console.log(`\n  kontekst running on ${url}\n`);

if (!process.env.KONTEKST_NO_OPEN) {
  const opener =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  spawn(opener, [url], {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  }).unref();
}
