import type { ModelDto } from "@kontekst/dtos";
import { formatTokens } from "#/lib/tokens";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Input } from "#/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Star } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  selectedModelDto?: ModelDto;
  onSelect: (model: ModelDto) => void;
}

function formatPrice(perToken: string): string {
  const usd = parseFloat(perToken) * 1_000_000;
  return `$${usd.toFixed(2)}/M`;
}

export default function ModelSelector({
  selectedModel,
  selectedModelDto,
  onSelect,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: models } = useQuery<ModelDto[]>({
    queryKey: ["models", debouncedSearch],
    queryFn: () =>
      fetch(
        `/api/models?search=${encodeURIComponent(debouncedSearch)}&limit=20`,
      ).then((res) => res.json()),
    enabled: open,
  });

  const { data: defaultModel } = useQuery<ModelDto>({
    queryKey: ["models", "default"],
    queryFn: () => fetch("/api/models/default").then((res) => res.json()),
    enabled: open,
  });

  async function setDefaultModel(modelId: string) {
    await fetch("/api/models/default", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    });
    await queryClient.invalidateQueries({ queryKey: ["models", "default"] });
  }

  // Pin the selected model at the top if it isn't in the current results
  const hasSelectedInResults = models?.some((m) => m.id === selectedModel);
  const displayModels: ModelDto[] = [
    ...(selectedModelDto && !hasSelectedInResults ? [selectedModelDto] : []),
    ...(models
      ?.slice()
      .sort((a, b) =>
        a.id === selectedModel ? -1 : b.id === selectedModel ? 1 : 0,
      ) ?? []),
  ];

  const label = selectedModelDto?.name || selectedModel || "select model";

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
          {displayModels.map((model) => {
            const isDefault = model.id === defaultModel?.id;
            return (
              <div
                key={model.id}
                className={`group flex items-center rounded ${model.id === selectedModel ? "bg-accent" : ""}`}
              >
                <button
                  type="button"
                  className="flex-1 text-left px-2 py-1.5 text-sm hover:bg-accent transition-colors rounded"
                  onClick={() => {
                    onSelect(model);
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
                <button
                  type="button"
                  title={isDefault ? "Default model" : "Set as default"}
                  className={`mr-1 p-1 rounded transition-colors ${isDefault ? "text-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDefault) setDefaultModel(model.id);
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
          {displayModels.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">
              No models found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
