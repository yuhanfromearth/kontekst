import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { KontekstService } from '../kontekst.service.js';
import { useTmpKontekstFolder } from '../../test-utils/tmp-kontekst-folder.js';

describe('KontekstService', () => {
  useTmpKontekstFolder();

  let service: KontekstService;

  async function prepareTestingModule(): Promise<void> {
    const module = await Test.createTestingModule({
      providers: [KontekstService],
    }).compile();
    service = module.get(KontekstService);
  }

  beforeEach(async () => {
    await prepareTestingModule();
  });

  it('returns an empty list when no konteksts exist', () => {
    expect(service.listKonteksts()).toEqual([]);
  });

  it('lists names sorted alphabetically when no default is set', () => {
    service.saveKontekst('zebra', 'z');
    service.saveKontekst('alpha', 'a');
    service.saveKontekst('mike', 'm');
    expect(service.listKonteksts()).toEqual(['alpha', 'mike', 'zebra']);
  });

  it('places the default kontekst first, then the rest sorted', () => {
    service.saveKontekst('zebra', 'z');
    service.saveKontekst('alpha', 'a');
    service.saveKontekst('mike', 'm');
    service.setDefaultKontekst('mike');
    expect(service.listKonteksts()).toEqual(['mike', 'alpha', 'zebra']);
  });

  it('clearDefaultKontekst removes the default flag', () => {
    service.saveKontekst('a', 'x');
    service.setDefaultKontekst('a');
    expect(service.getDefaultKontekst()).toBe('a');
    service.clearDefaultKontekst();
    expect(service.getDefaultKontekst()).toBeNull();
  });

  it('saveKontekst with overwrite=false throws 409 on duplicate name', () => {
    service.saveKontekst('a', 'first');
    expect(() => service.saveKontekst('a', 'second')).toThrow(HttpException);
  });

  it('saveKontekst with overwrite=true replaces existing content', () => {
    service.saveKontekst('a', 'first');
    service.saveKontekst('a', 'second', true);
    expect(service.getKontekst('a')).toBe('second');
  });

  it('trims whitespace from names on save and lookup', () => {
    service.saveKontekst('  spaced  ', 'content');
    expect(service.getKontekst('spaced')).toBe('content');
    expect(service.findKontekst('  spaced  ').name).toBe('spaced');
  });

  it('setShortcut throws 409 when the shortcut is already in use', () => {
    service.saveKontekst('a', 'x', false, 'cmd+1');
    service.saveKontekst('b', 'y');
    expect(() => service.setShortcut('b', 'cmd+1')).toThrow(/already assigned/);
  });

  it('setShortcut allows re-assigning the same shortcut to its current owner', () => {
    service.saveKontekst('a', 'x', false, 'cmd+1');
    expect(() => service.setShortcut('a', 'cmd+1')).not.toThrow();
    expect(service.getShortcuts()).toEqual({ a: 'cmd+1' });
  });

  it('deleteShortcut throws 404 when no shortcut is assigned', () => {
    service.saveKontekst('a', 'x');
    expect(() => service.deleteShortcut('a')).toThrow(HttpException);
  });

  it('renameKontekst moves the entry under the new name', () => {
    service.saveKontekst('old', 'content', false, 'cmd+1');
    const result = service.renameKontekst('old', 'new');
    expect(result.name).toBe('new');
    expect(service.getKontekst('old')).toBe('');
    expect(service.getKontekst('new')).toBe('content');
    expect(service.getShortcuts()).toEqual({ new: 'cmd+1' });
  });

  it('deleteKontekst throws 404 for unknown names', () => {
    expect(() => service.deleteKontekst('missing')).toThrow(HttpException);
  });

  it('persists state across service instances (real fs round-trip)', async () => {
    service.saveKontekst('a', 'one');
    service.setDefaultKontekst('a');

    await prepareTestingModule();
    expect(service.listKonteksts()).toEqual(['a']);
    expect(service.getDefaultKontekst()).toBe('a');
  });
});
