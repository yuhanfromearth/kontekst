import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import { ShortcutCaptureInput } from '#/components/ShortcutCaptureInput';
import { useIsMac } from '#/lib/platform';
import {
  isValidShortcut,
  shortcutHint,
  shortcutValidationError,
} from '#/lib/shortcut';
import type { KontekstDto } from '@kontekst/dtos';

interface KontekstEditorProps {
  name: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KontekstEditor({
  name,
  open,
  onOpenChange,
}: KontekstEditorProps) {
  const queryClient = useQueryClient();
  const isMac = useIsMac();

  const isNew = name === null;

  const { data } = useQuery<KontekstDto>({
    queryKey: ['kontekst', name],
    queryFn: () =>
      fetch(`/api/kontekst?name=${encodeURIComponent(name!)}`).then((res) =>
        res.json()
      ),
    enabled: open && !isNew,
  });

  const { data: savedDefault } = useQuery<string | null>({
    queryKey: ['konteksts', 'default'],
    queryFn: async () => {
      const res = await fetch('/api/konteksts/default');
      if (!res.ok) throw new Error('Failed to fetch default kontekst');
      const body: { name: string | null } = await res.json();
      return body.name;
    },
  });

  const [editableName, setEditableName] = useState('');
  const [kontekst, setKontekst] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setNameError(null);
    setContentError(null);
    setShortcutError(null);
    setConfirmDelete(false);
    if (isNew) {
      setEditableName('');
      setKontekst('');
      setShortcut('');
    } else {
      setEditableName(name);
    }
  }, [open, name, isNew]);

  useEffect(() => {
    if (!open || isNew) return;
    if (data) {
      setKontekst(data.kontekst ?? '');
      setShortcut(data.shortcut ?? '');
      if (data.kontekst === undefined) setEditableName('');
    }
  }, [open, isNew, data]);

  useEffect(() => {
    if (!open) return;
    if (savedDefault !== undefined) {
      setIsDefault(!isNew && savedDefault === name);
    }
  }, [open, savedDefault, name, isNew]);

  useEffect(() => {
    if (!confirmDelete) return;
    const handler = (e: MouseEvent) => {
      if (deleteRef.current && !deleteRef.current.contains(e.target as Node)) {
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmDelete]);

  const wasDefault = !isNew && savedDefault === name;

  const {
    mutate: saveKontekst,
    isPending,
    error: saveError,
  } = useMutation({
    mutationFn: async () => {
      setNameError(null);
      setContentError(null);
      setShortcutError(null);

      let valid = true;
      if (!editableName.trim()) {
        setNameError('Name must contain at least 1 character.');
        valid = false;
      }
      if (!kontekst.trim()) {
        setContentError('Content must contain at least 1 character.');
        valid = false;
      }
      if (!isValidShortcut(shortcut)) {
        setShortcutError(shortcutValidationError());
        valid = false;
      }
      if (!valid) throw new Error('Validation failed');

      if (!isNew && editableName !== name) {
        const res = await fetch('/api/kontekst', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, newName: editableName }),
        });
        if (!res.ok) throw new Error('Rename failed');
      }

      const res = await fetch('/api/kontekst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editableName,
          content: kontekst,
          shortcut,
          overwrite: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Request failed: ${res.status}`);
      }

      if (isDefault && !wasDefault) {
        const defaultRes = await fetch('/api/konteksts/default', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editableName }),
        });
        if (!defaultRes.ok) {
          const body = await defaultRes.json().catch(() => null);
          throw new Error(body?.message ?? 'Failed to set as default');
        }
      } else if (!isDefault && wasDefault) {
        const defaultRes = await fetch('/api/konteksts/default', {
          method: 'DELETE',
        });
        if (!defaultRes.ok) {
          const body = await defaultRes.json().catch(() => null);
          throw new Error(body?.message ?? 'Failed to clear default');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['konteksts'] });
      queryClient.invalidateQueries({ queryKey: ['konteksts', 'default'] });
      queryClient.invalidateQueries({ queryKey: ['shortcuts'] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (error.message.includes('already assigned')) {
        setShortcutError(error.message);
      }
    },
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        saveKontekst();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, saveKontekst, isMac]);

  const { mutate: deleteKontekst, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      fetch(`/api/kontekst?name=${encodeURIComponent(name!)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['konteksts'] });
      queryClient.invalidateQueries({ queryKey: ['konteksts', 'default'] });
      queryClient.invalidateQueries({ queryKey: ['shortcuts'] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="mb-4">
          {isNew ? (
            'Create new Kontekst'
          ) : (
            <>
              Edit <span className="font-mono">{name}</span>
            </>
          )}
        </DialogTitle>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editableName}
              onChange={(e) => {
                setEditableName(e.target.value);
                setNameError(null);
              }}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="kontekst">Context</Label>
            <Textarea
              id="kontekst"
              value={kontekst}
              onChange={(e) => {
                setKontekst(e.target.value);
                setContentError(null);
              }}
            />
            {contentError && (
              <p className="text-sm text-destructive">{contentError}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shortcut">Shortcut</Label>
            <ShortcutCaptureInput
              value={shortcut}
              onChange={(v) => {
                setShortcut(v);
                setShortcutError(null);
              }}
              onError={setShortcutError}
            />
            {shortcutError ? (
              <p className="text-sm text-destructive">{shortcutError}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{shortcutHint()}</p>
            )}
          </div>
          {!isNew && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="isDefault">Set as default</Label>
            </div>
          )}
        </div>

        {saveError && !shortcutError && !nameError && !contentError && (
          <p className="mt-3 text-sm text-destructive">{saveError.message}</p>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          {!isNew && (
            <div ref={deleteRef} className="mr-auto">
              {confirmDelete ? (
                <Button
                  variant="destructive"
                  onClick={() => deleteKontekst()}
                  disabled={isDeleting}
                >
                  Confirm delete
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveKontekst()} disabled={isPending}>
            {isNew ? 'Create' : 'Update'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
