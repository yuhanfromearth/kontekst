import type { TtsModel } from "@kontekst/dtos";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Input } from "#/components/ui/input";
import { listTtsModels } from "#/lib/speechClient";

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

  const { data: models = [] } = useQuery<TtsModel[]>({
    queryKey: ["tts-models"],
    queryFn: listTtsModels,
  });

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
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onSelect(m);
                setOpen(false);
              }}
              className={`text-left px-2 py-1.5 rounded transition-colors hover:bg-accent ${
                selected.id === m.id ? "bg-accent" : ""
              }`}
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
          ))}
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
