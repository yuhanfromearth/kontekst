import type { WebSearchHit } from '@kontekst/dtos';
import { ChevronDown, Globe } from 'lucide-react';
import { useState } from 'react';
import { cn } from '#/lib/utils';

export interface Search {
  query: string;
  resultCount?: number;
  hits: WebSearchHit[];
}

export default function SearchPills({ searches }: { searches: Search[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (searches.length === 0) return null;

  const open = openIdx !== null ? searches[openIdx] : null;

  return (
    <div className="mb-2">
      <div className="flex flex-wrap gap-1.5">
        {searches.map((s, i) => {
          const expanded = openIdx === i;
          const hasHits = s.hits.length > 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIdx(expanded ? null : i)}
              disabled={!hasHits}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors',
                hasHits
                  ? 'cursor-pointer hover:bg-muted hover:text-foreground'
                  : 'cursor-default',
                expanded && 'bg-muted text-foreground'
              )}
              aria-expanded={expanded}
            >
              <Globe className="size-3" />
              <span className="max-w-[18rem] truncate">{s.query}</span>
              <span className="tabular-nums">
                {s.resultCount === undefined
                  ? '…'
                  : `${s.resultCount} result${s.resultCount === 1 ? '' : 's'}`}
              </span>
              {hasHits && (
                <ChevronDown
                  className={cn(
                    'size-3 transition-transform',
                    expanded && 'rotate-180'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {open && open.hits.length > 0 && (
        <ul className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
          {open.hits.map((h, i) => (
            <li key={i} className="space-y-0.5">
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                {h.title}
              </a>
              <p className="truncate text-muted-foreground" title={h.url}>
                {h.url}
              </p>
              {h.snippet && (
                <p className="text-muted-foreground">{h.snippet}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
