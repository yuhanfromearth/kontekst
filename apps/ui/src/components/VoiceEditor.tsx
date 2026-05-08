import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VoicePref } from '@kontekst/dtos';
import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Popover, PopoverContent } from '#/components/ui/popover';
import { ShortcutCaptureInput } from '#/components/ShortcutCaptureInput';
import { useIsMac } from '#/lib/platform';
import {
  isValidShortcut,
  shortcutHint,
  shortcutValidationError,
} from '#/lib/shortcut';
import {
  clearDefaultVoice,
  saveVoicePref,
  setDefaultVoice,
} from '#/lib/speechClient';

interface VoiceEditorProps {
  modelId: string;
  voiceId: string;
  pref: VoicePref | undefined;
  isCurrentDefault: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: Element | null;
}

export default function VoiceEditor({
  modelId,
  voiceId,
  pref,
  isCurrentDefault,
  open,
  onOpenChange,
  anchor,
}: VoiceEditorProps) {
  const isMac = useIsMac();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(pref?.name ?? '');
    setShortcut(pref?.shortcut ?? '');
    setIsDefault(isCurrentDefault);
    setShortcutError(null);
  }, [open, pref?.name, pref?.shortcut, isCurrentDefault]);

  const save = useMutation({
    mutationFn: async () => {
      if (shortcut && !isValidShortcut(shortcut)) {
        setShortcutError(shortcutValidationError());
        throw new Error('invalid shortcut');
      }
      await saveVoicePref({ modelId, voiceId, name, shortcut });

      if (isDefault && !isCurrentDefault) {
        await setDefaultVoice(modelId, voiceId);
      } else if (!isDefault && isCurrentDefault) {
        await clearDefaultVoice(modelId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-prefs', modelId] });
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Save failed';
      if (msg.includes('already assigned')) setShortcutError(msg);
      else if (msg !== 'invalid shortcut') setShortcutError(msg);
    },
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        save.mutate();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, isMac, save]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent anchor={anchor} className="w-80 p-4 gap-3" sideOffset={8}>
        <div className="flex flex-col gap-1">
          <p className="font-heading font-medium text-sm">Edit voice</p>
          <p className="font-mono text-xs text-muted-foreground">{voiceId}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="voice-name" className="text-xs">
            Display name
          </Label>
          <Input
            id="voice-name"
            value={name}
            placeholder={voiceId}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shortcut" className="text-xs">
            Shortcut
          </Label>
          <ShortcutCaptureInput
            value={shortcut}
            onChange={(v) => {
              setShortcut(v);
              setShortcutError(null);
            }}
            onError={setShortcutError}
          />
          {shortcutError ? (
            <p className="text-xs text-destructive">{shortcutError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{shortcutHint()}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="voice-default"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(checked === true)}
          />
          <Label htmlFor="voice-default" className="text-xs">
            Set as default for this model
          </Label>
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
