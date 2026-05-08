import { Badge } from './ui/badge';
import { Kbd } from './ui/kbd';
import VoiceEditor from './VoiceEditor';
import { useEffect, useRef, useState } from 'react';
import { useIsMac } from '#/lib/platform';
import type { VoicePrefsForModel } from '@kontekst/dtos';

interface VoiceBadgesProps {
  voices: string[];
  selected: string;
  onSelect: (voiceId: string) => void;
  prefs: VoicePrefsForModel;
  modelId: string;
}

const MODIFIER_KEYS = new Set(['meta', 'control', 'shift', 'alt']);

function parseShortcut(shortcut: string) {
  const tokens = shortcut.toLowerCase().split('+');
  return {
    mod: tokens.includes('cmd') || tokens.includes('ctrl'),
    letters: tokens.filter((t) => !['cmd', 'ctrl', 'shift', 'alt'].includes(t)),
  };
}

function ShortcutDisplay({
  shortcut,
  isMac,
}: {
  shortcut: string;
  isMac: boolean;
}) {
  const keys = shortcut.split('+').map((k) => {
    const lower = k.toLowerCase();
    if (lower === 'cmd' || lower === 'ctrl') return isMac ? '⌘' : 'ctrl';
    return k;
  });
  return <Kbd className="w-fit h-fit">{keys.join(' + ')}</Kbd>;
}

export default function VoiceBadges({
  voices,
  selected,
  onSelect,
  prefs,
  modelId,
}: VoiceBadgesProps) {
  const isMac = useIsMac();
  const [isModHeld, setIsModHeld] = useState(false);
  const [hoveredVoice, setHoveredVoice] = useState<string | null>(null);
  const [editingVoice, setEditingVoice] = useState<string | null>(null);
  const badgeRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (isMac === null) return;
    const modKeyName = isMac ? 'Meta' : 'Control';
    const down = (e: KeyboardEvent) => {
      if (e.key === modKeyName) setIsModHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === modKeyName) setIsModHeld(false);
    };
    const blur = () => setIsModHeld(false);
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [isMac]);

  useEffect(() => {
    if (isMac === null) return;
    if (editingVoice) return;
    const pressedKeys = new Set<string>();
    const isModEvent = (e: KeyboardEvent) => (isMac ? e.metaKey : e.ctrlKey);

    const entries = Object.entries(prefs)
      .filter(([, p]) => p.shortcut)
      .map(([voiceId, p]) => [voiceId, p.shortcut as string] as const);

    const keydownHandler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const key = e.key.toLowerCase();
      if (MODIFIER_KEYS.has(key)) return;
      pressedKeys.add(key);

      if (isModEvent(e)) {
        for (const [voiceId, shortcut] of entries) {
          const parsed = parseShortcut(shortcut);
          if (
            parsed.mod &&
            parsed.letters.length === 1 &&
            parsed.letters[0] === key
          ) {
            e.preventDefault();
            onSelect(voiceId);
            pressedKeys.clear();
            return;
          }
        }
      }
    };

    const keyupHandler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const key = e.key.toLowerCase();
      if (MODIFIER_KEYS.has(key)) return;

      if (!isModEvent(e)) {
        for (const [voiceId, shortcut] of entries) {
          const parsed = parseShortcut(shortcut);
          if (parsed.mod) continue;
          if (
            parsed.letters.length === pressedKeys.size &&
            parsed.letters.every((l) => pressedKeys.has(l))
          ) {
            onSelect(voiceId);
            pressedKeys.clear();
            return;
          }
        }
      }

      pressedKeys.delete(key);
    };

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    return () => {
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);
    };
  }, [prefs, onSelect, isMac, editingVoice]);

  if (voices.length === 0) return null;

  const defaultVoiceId = Object.entries(prefs).find(
    ([, p]) => p.isDefault
  )?.[0];

  return (
    <div className="flex w-full mt-8 flex-wrap justify-center gap-2">
      {voices.map((v) => {
        const pref = prefs[v];
        const label = pref?.name?.trim() || v;
        const sc = pref?.shortcut;
        const isDefaultVoice = defaultVoiceId === v;
        return (
          <Badge
            key={v}
            ref={(node) => {
              if (node) badgeRefs.current.set(v, node);
              else badgeRefs.current.delete(v);
            }}
            onClick={(e) => {
              const modClick = isMac ? e.metaKey : e.ctrlKey;
              if (modClick) {
                e.preventDefault();
                setEditingVoice(v);
              } else {
                onSelect(v);
              }
            }}
            onMouseEnter={() => setHoveredVoice(v)}
            onMouseLeave={() => setHoveredVoice(null)}
            variant={selected === v ? 'default' : 'outline'}
            className={`gap-1 font-mono ${isModHeld && hoveredVoice === v ? 'cursor-alias opacity-70 ring-2 ring-ring/50' : 'cursor-pointer'} ${selected === v ? 'transition-opacity' : 'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95'}`}
          >
            {isDefaultVoice && (
              <span
                className="text-muted-foreground/80"
                title="Default voice for this model"
              >
                ★
              </span>
            )}
            {label}
            {sc && selected !== v && isMac !== null && (
              <ShortcutDisplay shortcut={sc} isMac={isMac} />
            )}
          </Badge>
        );
      })}
      {editingVoice && (
        <VoiceEditor
          modelId={modelId}
          voiceId={editingVoice}
          pref={prefs[editingVoice]}
          isCurrentDefault={defaultVoiceId === editingVoice}
          open
          onOpenChange={(o) => {
            if (!o) setEditingVoice(null);
          }}
          anchor={badgeRefs.current.get(editingVoice) ?? null}
        />
      )}
    </div>
  );
}
