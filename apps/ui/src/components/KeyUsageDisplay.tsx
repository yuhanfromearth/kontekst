import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Wallet } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { formatCost } from "#/lib/cost";
import type { KeyInfo } from "@kontekst/dtos";

export default function KeyUsageDisplay() {
  const { data, isLoading, isError } = useQuery<KeyInfo>({
    queryKey: ["keyInfo"],
    queryFn: () => fetch("/api/key").then((res) => res.json()),
    refetchOnWindowFocus: true,
  });

  return (
    <Popover>
      <PopoverTrigger
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        title="API key usage"
      >
        <Wallet className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
          API key usage
        </p>
        {isLoading && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <p className="text-xs text-destructive">Failed to load.</p>
        )}
        {data && (
          <dl className="text-xs space-y-1.5">
            <Row label="Total spent" value={formatCost(data.usage)} />
            <Row label="Today" value={formatCost(data.usageDaily)} />
            <Row label="This week" value={formatCost(data.usageWeekly)} />
            <Row label="This month" value={formatCost(data.usageMonthly)} />
            {data.limit !== null && (
              <Row
                label={`Remaining${data.limitReset ? ` (${data.limitReset})` : ""}`}
                value={
                  data.limitRemaining !== null
                    ? `${formatCost(data.limitRemaining)} / ${formatCost(data.limit)}`
                    : formatCost(data.limit)
                }
              />
            )}
            {data.label && (
              <p className="pt-2 mt-2 border-t border-border text-muted-foreground truncate">
                {data.label}
              </p>
            )}
          </dl>
        )}
        <a
          href="https://openrouter.ai/workspaces/default/keys/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage keys
          <ExternalLink className="size-3" />
        </a>
      </PopoverContent>
    </Popover>
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
