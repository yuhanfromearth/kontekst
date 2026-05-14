import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog';
import { Textarea } from '#/components/ui/textarea';
import { useIsMac } from '#/lib/platform';
import type { MemoryDto } from '@kontekst/dtos';

interface MemoryEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MemoryEditor({
  open,
  onOpenChange,
}: MemoryEditorProps) {
  const queryClient = useQueryClient();
  const isMac = useIsMac();

  const { data } = useQuery<MemoryDto>({
    queryKey: ['memory'],
    queryFn: () => fetch('/api/memory').then((res) => res.json()),
    enabled: open,
  });

  const [content, setContent] = useState('');

  useEffect(() => {
    if (open && data) setContent(data.content);
  }, [open, data]);

  useEffect(() => {
    if (open) setContent(data?.content ?? '');
  }, [open]);

  const {
    mutate: save,
    isPending,
    error: saveError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Request failed: ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, save, isMac]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="mb-1">Global memory</DialogTitle>
        <p className="mb-4 text-sm text-muted-foreground">
          Persistent global memory injected into every chat's system prompt. The
          model can also rewrite this on its own.
        </p>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60vh] font-mono text-sm"
          placeholder="Things you'd like the model to remember across all conversations…"
        />

        {saveError && (
          <p className="mt-3 text-sm text-destructive">{saveError.message}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save()} disabled={isPending}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
