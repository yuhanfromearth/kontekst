#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const folder = process.env.KONTEKST_FOLDER || `${process.env.HOME}/.kontekst`;
const audioDir = path.join(folder, 'speech-audio');
const clipsPath = path.join(folder, 'speech-clips.json');

if (!fs.existsSync(clipsPath)) {
  console.log('No speech-clips.json in', folder);
  process.exit(0);
}

const store = JSON.parse(fs.readFileSync(clipsPath, 'utf8'));
const before = store.clips.length;
const remaining = [];
for (const clip of store.clips) {
  if (clip.format === 'pcm') {
    const p = path.join(audioDir, `${clip.id}.pcm`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    console.log(`removed pcm clip ${clip.id}`);
  } else {
    remaining.push(clip);
  }
}
store.clips = remaining;
fs.writeFileSync(clipsPath, JSON.stringify(store, null, 2));
console.log(`Done. ${before - remaining.length} pcm clip(s) removed.`);
