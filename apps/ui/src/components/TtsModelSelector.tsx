import type { TtsModel } from "@kontekst/dtos";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Input } from "#/components/ui/input";
import {
  getDefaultTtsModel,
  listTtsModels,
  setDefaultTtsModel,
} from "#/lib/speechClient";

interface TtsModelSelectorProps {
  selected: TtsModel;
  onSelect: (model: TtsModel) => void;
}

function formatPrice(perToken: string): string {
  const usd = parseFloat(perToken) * 1_000_000;
  if (!isFinite(usd) || usd === 0) return "free";
  return `$${usd.toFixed(2)}/M`;
}

export default function TtsModelSelector({
  selected,
  onSelect,
}: TtsModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: models = [] } = useQuery<TtsModel[]>({
    queryKey: ["tts-models"],
    queryFn: listTtsModels,
  });

  const { data: defaultModel } = useQuery<TtsModel | null>({
    queryKey: ["tts-models", "default"],
    queryFn: getDefaultTtsModel,
    enabled: open,
  });

  async function markDefault(modelId: string) {
    await setDefaultTtsModel(modelId);
    await queryClient.invalidateQueries({ queryKey: ["tts-models", "default"] });
  }

  const filtered = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 cursor-pointer inline-flex items-center gap-1">
        {selected.name}
        <ChevronDown className="size-3" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Input
          placeholder="Search TTS models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-2"
        />
        <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
          {filtered.map((m) => {
            const isDefault = m.id === defaultModel?.id;
            return (
              <div
                key={m.id}
                className={`group flex items-center rounded ${selected.id === m.id ? "bg-accent" : ""}`}
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
                  <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                    <span className="font-mono">{m.id}</span>
                    <span>in {formatPrice(m.pricing.prompt)}</span>
                    {parseFloat(m.pricing.completion) > 0 && (
                      <span>out {formatPrice(m.pricing.completion)}</span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  title={isDefault ? "Default TTS model" : "Set as default"}
                  className={`mr-1 p-1 rounded transition-colors ${isDefault ? "text-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDefault) markDefault(m.id);
                  }}
                >
                  <Star
                    className="size-3.5"
                    fill={isDefault ? "currentColor" : "none"}
                  />
                </button>
              </div>
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
