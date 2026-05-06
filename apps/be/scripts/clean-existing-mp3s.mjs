#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { cleanMp3 } from '../dist/speech/mp3-clean.js';

const folder = process.env.KONTEKST_FOLDER || `${process.env.HOME}/.kontekst`;
const audioDir = path.join(folder, 'speech-audio');
const clipsPath = path.join(folder, 'speech-clips.json');

if (!fs.existsSync(audioDir) || !fs.existsSync(clipsPath)) {
  console.log('No speech artifacts found in', folder);
  process.exit(0);
}

const store = JSON.parse(fs.readFileSync(clipsPath, 'utf8'));
let touched = 0;
for (const clip of store.clips) {
  if (clip.format !== 'mp3') continue;
  const p = path.join(audioDir, `${clip.id}.mp3`);
  if (!fs.existsSync(p)) continue;
  const raw = fs.readFileSync(p);
  const { buffer, durationSec } = cleanMp3(raw);
  if (buffer.length === raw.length) continue;
  fs.writeFileSync(p, buffer);
  if (durationSec > 0) clip.durationSec = Math.round(durationSec * 10) / 10;
  console.log(
    `cleaned ${clip.id}: ${raw.length} → ${buffer.length} bytes, ${clip.durationSec}s`,
  );
  touched++;
}
if (touched > 0) fs.writeFileSync(clipsPath, JSON.stringify(store, null, 2));
console.log(`Done. ${touched} file(s) updated.`);
