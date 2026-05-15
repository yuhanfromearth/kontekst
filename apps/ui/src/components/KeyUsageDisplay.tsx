import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Plus, Trash2, Wallet, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Spinner } from '#/components/ui/spinner';
import { formatCost } from '#/lib/cost';
import { springPopup } from '#/lib/motion';
import type { BraveKeyListItem, KeyInfo, KeyListItem } from '@kontekst/dtos';

export default function KeyUsageDisplay() {
  const queryClient = useQueryClient();

  const { data: keys = [], isPending: keysLoading } = useQuery<KeyListItem[]>({
    queryKey: ['keys'],
    queryFn: () => fetch('/api/keys').then((res) => res.json()),
  });

  const activeKey = keys.find((k) => k.isActive);
  const hasActive = activeKey !== undefined;
  const showNoKey = !keysLoading && !hasActive;

  const {
    data: usage,
    isLoading: usageLoading,
    isError: usageError,
  } = useQuery<KeyInfo>({
    queryKey: ['keyInfo'],
    queryFn: () => fetch('/api/key').then((res) => res.json()),
    enabled: hasActive,
    refetchOnWindowFocus: true,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['keys'] });
    queryClient.invalidateQueries({ queryKey: ['keyInfo'] });
    queryClient.invalidateQueries({ queryKey: ['models'] });
  };

  const setActive = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/keys/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to set active key');
    },
    onSuccess: invalidateAll,
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete key');
    },
    onSuccess: invalidateAll,
  });

  const addKey = useMutation({
    mutationFn: async (input: { label: string; key: string }) => {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? 'Failed to add key');
      }
    },
    onSuccess: invalidateAll,
  });

  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const resetForm = () => {
    setAdding(false);
    setNewLabel('');
    setNewKey('');
    setShowKey(false);
    setAddError(null);
  };

  const submitAdd = async () => {
    setAddError(null);
    try {
      await addKey.mutateAsync({ label: newLabel.trim(), key: newKey.trim() });
      resetForm();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add key');
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer relative"
        title="API keys"
      >
        <Wallet className="size-4" />
        {showNoKey && (
          <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-destructive" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            API keys
          </p>
          <a
            href="https://openrouter.ai/workspaces/default/keys/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Manage on OpenRouter
          </a>
        </div>

        {hasActive && (
          <div className="mb-3">
            {usageLoading && (
              <p className="text-xs text-muted-foreground">Loading usage…</p>
            )}
            {usageError && (
              <p className="text-xs text-destructive">Failed to load usage.</p>
            )}
            {usage && (
              <dl className="text-xs space-y-1.5">
                <Row label="Total spent" value={formatCost(usage.usage)} />
                <Row label="Today" value={formatCost(usage.usageDaily)} />
                <Row label="This week" value={formatCost(usage.usageWeekly)} />
                <Row
                  label="This month"
                  value={formatCost(usage.usageMonthly)}
                />
                {usage.limit !== null && (
                  <Row
                    label={`Remaining${usage.limitReset ? ` (${usage.limitReset})` : ''}`}
                    value={
                      usage.limitRemaining !== null
                        ? `${formatCost(usage.limitRemaining)} / ${formatCost(usage.limit)}`
                        : formatCost(usage.limit)
                    }
                  />
                )}
              </dl>
            )}
          </div>
        )}

        {showNoKey && (
          <p className="text-xs text-muted-foreground mb-3">
            No active key. Add one to enable chat.
          </p>
        )}

        {keys.length > 0 && (
          <ul className="border-t border-border pt-2 mb-2 space-y-0.5">
            {keys.map((k) => (
              <li key={k.id}>
                <div className="flex items-center gap-1.5 group">
                  <button
                    type="button"
                    onClick={() => {
                      if (!k.isActive) setActive.mutate(k.id);
                    }}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs hover:bg-accent transition-colors cursor-pointer disabled:cursor-default"
                    disabled={k.isActive || setActive.isPending}
                  >
                    <Check
                      className={`size-3 shrink-0 ${k.isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <span className="flex-1 truncate">{k.label}</span>
                    <span className="font-mono text-muted-foreground">
                      ····{k.keyTail}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteKey.mutate(k.id)}
                    disabled={deleteKey.isPending}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Delete key"
                    aria-label={`Delete key ${k.label}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <AnimatePresence initial={false} mode="wait">
          {!adding ? (
            <motion.div
              key="add-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setAdding(true)}
              >
                <Plus className="size-3" />
                Add key
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springPopup}
              style={{ overflow: 'hidden' }}
            >
              <div className="border-t border-border pt-2 space-y-2">
                <Input
                  placeholder="Label (e.g. Personal)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  autoFocus
                />
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={showKey ? 'Hide' : 'Show'}
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
                {addError && (
                  <p className="text-xs text-destructive break-words">
                    {addError}
                  </p>
                )}
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={submitAdd}
                    disabled={
                      !newLabel.trim() || !newKey.trim() || addKey.isPending
                    }
                  >
                    {addKey.isPending && <Spinner className="size-3" />}
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={resetForm}
                    disabled={addKey.isPending}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <BraveKeysSection />
      </PopoverContent>
    </Popover>
  );
}

function BraveKeysSection() {
  const queryClient = useQueryClient();

  const { data: keys = [] } = useQuery<BraveKeyListItem[]>({
    queryKey: ['brave-keys'],
    queryFn: () => fetch('/api/brave-keys').then((res) => res.json()),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['brave-keys'] });

  const setActive = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/brave-keys/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to set active Brave key');
    },
    onSuccess: invalidate,
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/brave-keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete Brave key');
    },
    onSuccess: invalidate,
  });

  const addKey = useMutation({
    mutationFn: async (input: { label: string; key: string }) => {
      const res = await fetch('/api/brave-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? 'Failed to add key');
      }
    },
    onSuccess: invalidate,
  });

  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const resetForm = () => {
    setAdding(false);
    setNewLabel('');
    setNewKey('');
    setShowKey(false);
    setAddError(null);
  };

  const submitAdd = async () => {
    setAddError(null);
    try {
      await addKey.mutateAsync({ label: newLabel.trim(), key: newKey.trim() });
      resetForm();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add key');
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Brave Search
        </p>
        <a
          href="https://api-dashboard.search.brave.com/app/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage on Brave
        </a>
      </div>

      {keys.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground mb-2">
          Add a Brave key to enable web search.
        </p>
      )}

      {keys.length > 0 && (
        <ul className="mb-2 space-y-0.5">
          {keys.map((k) => (
            <li key={k.id}>
              <div className="flex items-center gap-1.5 group">
                <button
                  type="button"
                  onClick={() => {
                    if (!k.isActive) setActive.mutate(k.id);
                  }}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs hover:bg-accent transition-colors cursor-pointer disabled:cursor-default"
                  disabled={k.isActive || setActive.isPending}
                >
                  <Check
                    className={`size-3 shrink-0 ${k.isActive ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span className="flex-1 truncate">{k.label}</span>
                  <span className="font-mono text-muted-foreground">
                    ····{k.keyTail}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteKey.mutate(k.id)}
                  disabled={deleteKey.isPending}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Delete key"
                  aria-label={`Delete Brave key ${k.label}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!adding && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3" />
          Add Brave key
        </Button>
      )}

      {adding && (
        <div className="space-y-2">
          <Input
            placeholder="Label (e.g. Personal)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            autoFocus
          />
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="BSA..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="pr-8"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={showKey ? 'Hide' : 'Show'}
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </button>
          </div>
          {addError && (
            <p className="text-xs text-destructive break-words">{addError}</p>
          )}
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={submitAdd}
              disabled={!newLabel.trim() || !newKey.trim() || addKey.isPending}
            >
              {addKey.isPending && <Spinner className="size-3" />}
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetForm}
              disabled={addKey.isPending}
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">{value}</dd>
    </div>
  );
}
