import { MessageSquare, Mic } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'motion/react';

import { springSnap } from '#/lib/motion';

type Mode = 'chat' | 'speech';

interface ModeToggleProps {
  mode: Mode;
}

export default function ModeToggle({ mode }: ModeToggleProps) {
  const navigate = useNavigate();

  const select = (next: Mode) => {
    if (next === mode) return;
    navigate({ to: next === 'chat' ? '/' : '/speech' });
  };

  return (
    <div
      className="relative inline-flex items-center border border-border rounded-full p-0.5 h-7"
      role="tablist"
      aria-label="Mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'chat'}
        title="Chat mode"
        onClick={() => select('chat')}
        className={`relative size-6 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          mode === 'chat'
            ? 'text-white'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {mode === 'chat' && (
          <motion.span
            aria-hidden
            layoutId="mode-toggle-pill"
            className="absolute inset-0 rounded-full"
            style={{ background: 'oklch(0.6 0.18 265)' }}
            transition={springSnap}
          />
        )}
        <MessageSquare className="size-3.5 relative z-10" />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'speech'}
        title="Speech mode"
        onClick={() => select('speech')}
        className={`relative size-6 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          mode === 'speech'
            ? 'text-white'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {mode === 'speech' && (
          <motion.span
            aria-hidden
            layoutId="mode-toggle-pill"
            className="absolute inset-0 rounded-full"
            style={{ background: 'oklch(0.6 0.18 265)' }}
            transition={springSnap}
          />
        )}
        <Mic className="size-3.5 relative z-10" />
      </button>
    </div>
  );
}
