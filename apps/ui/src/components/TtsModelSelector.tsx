import type { DefaultTtsModelResponse, TtsModel } from '@kontekst/dtos';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import { Input } from '#/components/ui/input';
import {
  getDefaultTtsModel,
  listTtsModels,
  setDefaultTtsModel,
} from '#/lib/speechClient';

interface TtsModelSelectorProps {
  selected: TtsModel | null;
  onSelect: (model: TtsModel) => void;
}

function formatPrice(perToken: string): string {
  const usd = parseFloat(perToken) * 1_000_000;
  if (!isFinite(usd) || usd === 0) return 'free';
  return `$${usd.toFixed(2)}/M`;
}

export default function TtsModelSelector({
  selected,
  onSelect,
}: TtsModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: models = [] } = useQuery<TtsModel[]>({
    queryKey: ['tts-models'],
    queryFn: listTtsModels,
  });

  const { data: defaultModel } = useQuery<DefaultTtsModelResponse>({
    queryKey: ['tts-models', 'default'],
    queryFn: getDefaultTtsModel,
    enabled: open,
  });

  async function markDefault(modelId: string) {
    await setDefaultTtsModel(modelId);
    await queryClient.invalidateQueries({
      queryKey: ['tts-models', 'default'],
    });
  }

  const filtered = models
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      a.id === selected?.id ? -1 : b.id === selected?.id ? 1 : 0
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 cursor-pointer inline-flex items-center gap-1">
        {selected?.name ?? 'select TTS model'}
        <ChevronDown className="size-3" />
      </PopoverTrigger>
      <PopoverContent className="w-[28rem] p-2" align="start">
        <Input
          placeholder="Search TTS models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-2"
        />
        <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
          {filtered.map((m, idx) => {
            const isDefault = m.id === defaultModel?.modelId;
            const isSelected = selected?.id === m.id;
            const showDivider = isSelected && idx === 0 && filtered.length > 1;
            return (
              <Fragment key={m.id}>
                <div
                  className={`group flex items-center rounded ${isSelected ? 'bg-accent' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(m);
                      setOpen(false);
                    }}
                    className="flex-1 text-left px-2 py-1.5 rounded transition-colors hover:bg-accent"
                  >
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="flex items-start gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono break-all min-w-0 flex-1">
                        {m.id}
                      </span>
                      <span className="shrink-0 flex gap-2 font-medium">
                        <span className="text-emerald-700 dark:text-emerald-400">
                          in {formatPrice(m.pricing.prompt)}
                        </span>
                        {parseFloat(m.pricing.completion) > 0 && (
                          <span className="text-sky-700 dark:text-sky-400">
                            out {formatPrice(m.pricing.completion)}
                          </span>
                        )}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    title={isDefault ? 'Default TTS model' : 'Set as default'}
                    className={`mr-1 p-1 rounded transition-colors ${isDefault ? 'text-foreground' : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDefault) markDefault(m.id);
                    }}
                  >
                    <Star
                      className="size-3.5"
                      fill={isDefault ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                {showDivider && (
                  <div className="my-1 border-t border-border/50" />
                )}
              </Fragment>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">
              No models match.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
