import { HttpException, Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import type { SpeechClip, SpeechRequest, TtsModel } from '@kontekst/dtos';
import { JsonStore } from '../common/json-store.js';
import { KeyService } from '../key/key.service.js';
import type {
  OpenRouterModel,
  OpenRouterModelsResponse,
} from '../model/interfaces/openrouter.interface.js';
import { SpeechStore } from './interfaces/speech-store.type.js';
import { cleanMp3 } from './mp3-clean.js';
import {
  OPENROUTER_SPEECH_URL,
  OPENROUTER_TTS_MODELS_URL,
  modelSupportsSpeed,
} from './speech.constants.js';

@Injectable()
export class SpeechService {
  private readonly store = new JsonStore<SpeechStore>(
    'speech-clips.json',
    () => ({
      clips: [],
    }),
  );
  private defaultModelId: string | null = null;

  constructor(private readonly keyService: KeyService) {}

  setDefaultModel(modelId: string): void {
    this.defaultModelId = modelId;
  }

  async getDefaultModel(): Promise<TtsModel | null> {
    if (!this.defaultModelId) return null;
    const all = await this.listModels();
    return all.find((m) => m.id === this.defaultModelId) ?? null;
  }

  private get audioDir(): string {
    const dir = path.join(process.env.KONTEKST_FOLDER ?? '', 'speech-audio');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private audioPath(id: string): string {
    return path.join(this.audioDir, `${id}.mp3`);
  }

  private estimateDuration(text: string, speed: number | null): number {
    const words = text.split(/\s+/).filter(Boolean).length;
    const sec = words / 2.6 / (speed ?? 1);
    return Math.max(1, Math.round(sec * 10) / 10);
  }

  async listModels(): Promise<TtsModel[]> {
    const apiKey = this.keyService.requireActiveKey();
    const response = await fetch(OPENROUTER_TTS_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new HttpException(
        `OpenRouter TTS model list failed: ${response.status} ${response.statusText} ${detail}`,
        response.status,
      );
    }
    const json = (await response.json()) as OpenRouterModelsResponse;
    return json.data
      .filter(
        (m: OpenRouterModel) =>
          Array.isArray(m.supported_voices) && m.supported_voices.length > 0,
      )
      .map<TtsModel>((m) => ({
        id: m.id,
        name: m.name,
        pricing: {
          prompt: m.pricing.prompt,
          completion: m.pricing.completion,
        },
        voices: m.supported_voices ?? [],
        supportsSpeed: modelSupportsSpeed(m.id),
      }));
  }

  listClips(): SpeechClip[] {
    return [...this.store.read().clips].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async synthesize(req: SpeechRequest): Promise<SpeechClip> {
    const speed = req.speed ?? null;

    const body: Record<string, unknown> = {
      input: req.input,
      model: req.model,
      voice: req.voice,
      response_format: 'mp3',
    };
    if (speed !== null) body.speed = speed;

    const response = await fetch(OPENROUTER_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.keyService.requireActiveKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new HttpException(
        `OpenRouter TTS failed: ${response.status} ${response.statusText} ${detail}`,
        response.status,
      );
    }

    const raw = Buffer.from(await response.arrayBuffer());
    const cleaned = cleanMp3(raw);
    const durationSec =
      cleaned.durationSec > 0
        ? Math.round(cleaned.durationSec * 10) / 10
        : this.estimateDuration(req.input, speed);

    const id = crypto.randomUUID();
    fs.writeFileSync(this.audioPath(id), cleaned.buffer);

    const clip: SpeechClip = {
      id,
      text: req.input,
      voice: req.voice,
      model: req.model,
      format: 'mp3',
      speed,
      durationSec,
      createdAt: new Date().toISOString(),
    };

    const store = this.store.read();
    store.clips.push(clip);
    this.store.write(store);

    return clip;
  }

  resolveClipAudio(id: string): {
    filePath: string;
    size: number;
    clip: SpeechClip;
  } {
    const clip = this.store.read().clips.find((c) => c.id === id);
    if (!clip) throw new HttpException(`Clip '${id}' not found`, 404);

    const filePath = this.audioPath(clip.id);
    if (!fs.existsSync(filePath)) {
      throw new HttpException(`Audio for clip '${id}' missing on disk`, 404);
    }

    const size = fs.statSync(filePath).size;
    return { filePath, size, clip };
  }

  deleteClip(id: string): void {
    const store = this.store.read();
    const idx = store.clips.findIndex((c) => c.id === id);
    if (idx === -1) throw new HttpException(`Clip '${id}' not found`, 404);

    const clip = store.clips[idx];
    const filePath = this.audioPath(clip.id);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    store.clips.splice(idx, 1);
    this.store.write(store);
  }
}
