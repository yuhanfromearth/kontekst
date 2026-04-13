import type { ModelDto } from "#/types/model";
import { formatTokens } from "#/lib/tokens";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Input } from "#/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";

interface ModelSelectorProps {
  selectedModel: string;
  selectedModelName?: string;
  onSelect: (modelId: string, modelName: string, contextLength: number) => void;
}

function formatPrice(perToken: string): string {
  const usd = parseFloat(perToken) * 1_000_000;
  return `$${usd.toFixed(2)}/M`;
}

export default function ModelSelector({
  selectedModel,
  selectedModelName,
  onSelect,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: models } = useQuery<ModelDto[]>({
    queryKey: ["models", debouncedSearch],
    queryFn: () =>
      fetch(
        `/api/models?search=${encodeURIComponent(debouncedSearch)}&limit=10`,
      ).then((res) => res.json()),
    enabled: open,
  });

  const label = selectedModelName || selectedModel || "select model";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 cursor-pointer">
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-2" align="start">
        <Input
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-2"
        />
        <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
          {models?.map((model) => (
            <button
              key={model.id}
              type="button"
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors"
              onClick={() => {
                onSelect(model.id, model.name, model.contextLength);
                setOpen(false);
              }}
            >
              <div className="font-medium truncate">{model.name}</div>
              <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                <span>{formatTokens(model.contextLength)} ctx</span>
                <span>in {formatPrice(model.pricing.prompt)}</span>
                <span>out {formatPrice(model.pricing.completion)}</span>
              </div>
            </button>
          ))}
          {models?.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">
              No models found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
