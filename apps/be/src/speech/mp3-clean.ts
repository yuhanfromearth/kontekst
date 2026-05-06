// Strips silent VBR-header frames (Xing/Info/VBRI) from a concatenated mp3
// stream and reports an accurate duration. OpenRouter's TTS providers (notably
// Kokoro) return the audio as several independent mp3 streams glued together;
// each stream begins with a silent metadata frame whose Xing header describes
// only that chunk. Browsers and macOS Finder read the first Xing header and
// believe the entire file is ~2 s. Removing those metadata frames leaves a
// single contiguous frame stream with no embedded duration, so players fall
// back to a frame scan and report the real length.

const MPEG1_BITRATES_LIII = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const MPEG2_BITRATES_LIII = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000];
const MPEG2_SAMPLE_RATES = [22050, 24000, 16000];
const MPEG25_SAMPLE_RATES = [11025, 12000, 8000];

interface FrameInfo {
  start: number;
  size: number;
  samplesPerFrame: number;
  sampleRate: number;
  isVbrHeader: boolean;
}

function parseFrame(buf: Buffer, pos: number): FrameInfo | null {
  if (pos + 4 > buf.length) return null;
  if (buf[pos] !== 0xff || (buf[pos + 1] & 0xe0) !== 0xe0) return null;

  const h1 = buf[pos + 1];
  const versionBits = (h1 >> 3) & 0x03; // 0=v2.5, 1=reserved, 2=v2, 3=v1
  const layerBits = (h1 >> 1) & 0x03; // 1=Layer III
  if (versionBits === 1 || layerBits !== 1) return null;

  const h2 = buf[pos + 2];
  const bitrateIdx = (h2 >> 4) & 0x0f;
  const sampleRateIdx = (h2 >> 2) & 0x03;
  const padding = (h2 >> 1) & 0x01;
  if (bitrateIdx === 0 || bitrateIdx === 0x0f || sampleRateIdx === 3)
    return null;

  const isV1 = versionBits === 3;
  const isV25 = versionBits === 0;
  const bitrate =
    (isV1 ? MPEG1_BITRATES_LIII : MPEG2_BITRATES_LIII)[bitrateIdx] * 1000;
  const sampleRate = isV1
    ? MPEG1_SAMPLE_RATES[sampleRateIdx]
    : isV25
      ? MPEG25_SAMPLE_RATES[sampleRateIdx]
      : MPEG2_SAMPLE_RATES[sampleRateIdx];
  if (!bitrate || !sampleRate) return null;

  const frameSize = isV1
    ? Math.floor((144 * bitrate) / sampleRate) + padding
    : Math.floor((72 * bitrate) / sampleRate) + padding;
  if (frameSize < 4 || pos + frameSize > buf.length) return null;

  const samplesPerFrame = isV1 ? 1152 : 576;
  const tail = buf
    .subarray(pos + 4, Math.min(pos + frameSize, pos + 40))
    .toString('latin1');
  const isVbrHeader = /Xing|Info|VBRI/.test(tail);

  return { start: pos, size: frameSize, samplesPerFrame, sampleRate, isVbrHeader };
}

export interface CleanedMp3 {
  buffer: Buffer;
  durationSec: number;
}

export function cleanMp3(buf: Buffer): CleanedMp3 {
  const chunks: Buffer[] = [];
  let pos = 0;
  let totalSamples = 0;
  let sampleRate = 0;

  if (
    buf.length >= 10 &&
    buf[0] === 0x49 &&
    buf[1] === 0x44 &&
    buf[2] === 0x33
  ) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    chunks.push(buf.subarray(0, 10 + size));
    pos = 10 + size;
  }

  while (pos < buf.length) {
    const frame = parseFrame(buf, pos);
    if (!frame) {
      pos++;
      continue;
    }
    if (!frame.isVbrHeader) {
      chunks.push(buf.subarray(frame.start, frame.start + frame.size));
      totalSamples += frame.samplesPerFrame;
      sampleRate = frame.sampleRate;
    }
    pos = frame.start + frame.size;
  }

  return {
    buffer: Buffer.concat(chunks),
    durationSec: sampleRate > 0 ? totalSamples / sampleRate : 0,
  };
}
