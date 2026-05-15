import { Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { springSoft } from '#/lib/motion';

export interface MemoryUpdate {
  done: boolean;
}

export default function MemoryPills({
  updates,
  onOpen,
}: {
  updates: MemoryUpdate[];
  onOpen: () => void;
}) {
  if (updates.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {updates.map((u, i) => (
          <motion.button
            key={i}
            type="button"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={springSoft}
            onClick={onOpen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
            title="Open global memory"
          >
            <Brain className="size-3" />
            <span>{u.done ? 'Memory updated' : 'Updating memory…'}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
