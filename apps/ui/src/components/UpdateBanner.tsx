import { useQuery } from '@tanstack/react-query';
import { ArrowUpCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { VersionInfo } from '@kontekst/dtos';

import { springPopup } from '#/lib/motion';

const DISMISS_KEY = 'kontekst:dismissed-version';

export default function UpdateBanner() {
  const { data } = useQuery<VersionInfo>({
    queryKey: ['version'],
    queryFn: () => fetch('/api/version').then((res) => res.json()),
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY));
  }, []);

  const visible =
    !!data?.hasUpdate && !!data.latest && dismissed !== data.latest;

  const dismiss = () => {
    if (data?.latest) {
      localStorage.setItem(DISMISS_KEY, data.latest);
      setDismissed(data.latest);
    }
  };

  return (
    <AnimatePresence initial={false}>
      {visible && data && (
        <motion.div
          initial={{ y: -20, opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ y: 0, opacity: 1, height: 'auto', marginBottom: 12 }}
          exit={{ y: -20, opacity: 0, height: 0, marginBottom: 0 }}
          transition={springPopup}
          style={{ overflow: 'hidden' }}
        >
          <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-2 text-xs">
            <ArrowUpCircle className="size-4 shrink-0 text-muted-foreground" />
            <p className="flex-1">
              Update available:{' '}
              <span className="font-mono text-muted-foreground">
                {data.current}
              </span>{' '}
              → <span className="font-mono font-medium">{data.latest}</span>.
              Run{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                {data.updateCommand}
              </code>
              .
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss update notice"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
