import { Injectable } from '@nestjs/common';
import type { VersionInfo } from '@kontekst/dtos';

const REGISTRY_URL = 'https://registry.npmjs.org/kontekst/latest';
const CACHE_TTL_MS = 1000 * 60 * 60;
const DEV_VERSION = '0.0.0-development';

interface CachedLatest {
  value: string | null;
  fetchedAt: number;
}

@Injectable()
export class VersionService {
  private cache: CachedLatest | null = null;
  private inflight: Promise<string | null> | null = null;

  async getVersionInfo(): Promise<VersionInfo> {
    const current = process.env.KONTEKST_VERSION ?? DEV_VERSION;
    const latest = await this.fetchLatest();
    const hasUpdate =
      current !== DEV_VERSION &&
      latest !== null &&
      compareSemver(latest, current) > 0;
    return {
      current,
      latest,
      hasUpdate,
      updateCommand: 'npm install -g kontekst',
    };
  }

  private async fetchLatest(): Promise<string | null> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.value;
    }
    if (this.inflight) return this.inflight;

    this.inflight = (async () => {
      try {
        const res = await fetch(REGISTRY_URL, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { version?: string };
        return typeof json.version === 'string' ? json.version : null;
      } catch {
        return null;
      }
    })();

    try {
      const value = await this.inflight;
      this.cache = { value, fetchedAt: now };
      return value;
    } finally {
      this.inflight = null;
    }
  }
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a === b ? 0 : a > b ? 1 : -1;
  for (let i = 0; i < 3; i++) {
    if (pa.parts[i] !== pb.parts[i]) return pa.parts[i] - pb.parts[i];
  }
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre > pb.pre ? 1 : -1;
}

function parseSemver(
  v: string,
): { parts: [number, number, number]; pre: string } | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(v);
  if (!match) return null;
  return {
    parts: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ?? '',
  };
}
