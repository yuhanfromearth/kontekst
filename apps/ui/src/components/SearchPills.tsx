import type { WebSearchHit } from '@kontekst/dtos';
import { ChevronDown, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import { springPopup, springSoft } from '#/lib/motion';
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
        <AnimatePresence initial={false}>
          {searches.map((s, i) => {
            const expanded = openIdx === i;
            const hasHits = s.hits.length > 0;
            return (
              <motion.button
                key={i}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={springSoft}
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
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={springSoft}
                    className="inline-flex"
                  >
                    <ChevronDown className="size-3" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {open && open.hits.length > 0 && (
          <motion.ul
            key={openIdx}
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={springPopup}
            style={{ overflow: 'hidden' }}
            className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs"
          >
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
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
