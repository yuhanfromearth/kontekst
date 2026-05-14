import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VoicePrefService } from '../voice-pref.service.js';
import { useTmpKontekstFolder } from '../../test-utils/tmp-kontekst-folder.js';

const MODEL = 'openai/tts-1';
const OTHER_MODEL = 'openai/tts-1-hd';

describe('VoicePrefService', () => {
  useTmpKontekstFolder();

  let service: VoicePrefService;

  async function prepareTestingModule(): Promise<void> {
    const module = await Test.createTestingModule({
      providers: [VoicePrefService],
    }).compile();
    service = module.get(VoicePrefService);
  }

  beforeEach(async () => {
    await prepareTestingModule();
  });

  it('returns an empty object for an unknown model', () => {
    expect(service.list(MODEL)).toEqual({});
  });

  it('upsert stores a name and shortcut for a voice', () => {
    service.upsert(MODEL, 'alloy', { name: 'Alloy', shortcut: 'cmd+1' });
    expect(service.list(MODEL)).toEqual({
      alloy: { name: 'Alloy', shortcut: 'cmd+1' },
    });
  });

  it('upsert rejects a duplicate shortcut within the same model', () => {
    service.upsert(MODEL, 'alloy', { shortcut: 'cmd+1' });
    expect(() =>
      service.upsert(MODEL, 'echo', { shortcut: 'cmd+1' }),
    ).toThrow(HttpException);
  });

  it('upsert allows the same shortcut across different models', () => {
    service.upsert(MODEL, 'alloy', { shortcut: 'cmd+1' });
    expect(() =>
      service.upsert(OTHER_MODEL, 'alloy', { shortcut: 'cmd+1' }),
    ).not.toThrow();
  });

  it('upsert removes the voice entry when name and shortcut both clear', () => {
    service.upsert(MODEL, 'alloy', { name: 'Alloy', shortcut: 'cmd+1' });
    service.upsert(MODEL, 'alloy', { name: '', shortcut: '' });
    expect(service.list(MODEL)).toEqual({});
  });

  it('upsert keeps the voice entry when isDefault is set even after clearing other fields', () => {
    service.upsert(MODEL, 'alloy', { name: 'Alloy' });
    service.setDefault(MODEL, 'alloy');
    service.upsert(MODEL, 'alloy', { name: '' });
    expect(service.list(MODEL)).toEqual({ alloy: { isDefault: true } });
  });

  it('setDefault clears isDefault from sibling voices in the same model', () => {
    service.setDefault(MODEL, 'alloy');
    service.setDefault(MODEL, 'echo');
    const entries = service.list(MODEL);
    expect(entries.echo).toEqual({ isDefault: true });
    expect(entries.alloy?.isDefault).toBeUndefined();
  });

  it('clearDefault removes the default flag and prunes empty entries', () => {
    service.setDefault(MODEL, 'alloy');
    service.clearDefault(MODEL);
    expect(service.list(MODEL)).toEqual({});
  });

  it('clearDefault preserves an entry that still has a name or shortcut', () => {
    service.upsert(MODEL, 'alloy', { name: 'Alloy', shortcut: 'cmd+1' });
    service.setDefault(MODEL, 'alloy');
    service.clearDefault(MODEL);
    expect(service.list(MODEL)).toEqual({
      alloy: { name: 'Alloy', shortcut: 'cmd+1' },
    });
  });

  it('persists state across service instances (real fs round-trip)', async () => {
    service.upsert(MODEL, 'alloy', { name: 'Alloy', shortcut: 'cmd+1' });

    await prepareTestingModule();
    expect(service.list(MODEL)).toEqual({
      alloy: { name: 'Alloy', shortcut: 'cmd+1' },
    });
  });
});
