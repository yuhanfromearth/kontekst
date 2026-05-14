import { describe, expect, it } from 'vitest';
import { cleanMp3 } from '../mp3-clean.js';

// MPEG2 Layer III, 24 kHz, 32 kbps, no padding, no CRC.
// frameSize = floor(72 * 32000 / 24000) = 96 bytes; samplesPerFrame = 576.
const FRAME_SIZE = 96;
const SAMPLES = 576;
const SAMPLE_RATE = 24000;

function makeFrame(): Buffer {
  const buf = Buffer.alloc(FRAME_SIZE);
  buf[0] = 0xff;
  buf[1] = 0xf3;
  buf[2] = 0x44;
  buf[3] = 0x00;
  return buf;
}

function makeXingFrame(): Buffer {
  const buf = makeFrame();
  buf.write('Xing', 4, 'latin1');
  return buf;
}

describe('cleanMp3', () => {
  it('keeps a chain of valid audio frames and reports duration from frame count', () => {
    const buf = Buffer.concat([makeFrame(), makeFrame(), makeFrame()]);
    const result = cleanMp3(buf);
    expect(result.buffer.length).toBe(FRAME_SIZE * 3);
    expect(result.durationSec).toBeCloseTo((3 * SAMPLES) / SAMPLE_RATE, 6);
  });

  it('strips a leading Xing/Info VBR header frame', () => {
    const buf = Buffer.concat([makeXingFrame(), makeFrame(), makeFrame()]);
    const result = cleanMp3(buf);
    expect(result.buffer.length).toBe(FRAME_SIZE * 2);
    expect(result.durationSec).toBeCloseTo((2 * SAMPLES) / SAMPLE_RATE, 6);
  });

  it('rejects false-positive frame syncs that do not chain to another sync', () => {
    // Header bytes that pass parseFrame's bounds checks but are followed by
    // garbage instead of another 0xFF 0xE0+ sync. The old parser kept these;
    // the chain-validation should drop them.
    const fakeHeader = makeFrame();
    const garbage = Buffer.alloc(50, 0xaa);
    const buf = Buffer.concat([fakeHeader, garbage]);
    const result = cleanMp3(buf);
    expect(result.buffer.length).toBe(0);
    expect(result.durationSec).toBe(0);
  });

  it('passes through an ID3v2 header before audio frames', () => {
    const id3 = Buffer.concat([
      Buffer.from('ID3', 'latin1'),
      Buffer.from([0x03, 0x00, 0x00]),
      Buffer.from([0x00, 0x00, 0x00, 0x05]),
      Buffer.alloc(5, 0),
    ]);
    const buf = Buffer.concat([id3, makeFrame(), makeFrame()]);
    const result = cleanMp3(buf);
    expect(result.buffer.subarray(0, 3).toString('latin1')).toBe('ID3');
    expect(result.buffer.length).toBe(id3.length + FRAME_SIZE * 2);
  });
});
