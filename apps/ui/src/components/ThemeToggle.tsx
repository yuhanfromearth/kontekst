import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { resolveTheme, setTheme, type Theme } from '#/lib/theme';
import { cn } from '#/lib/utils';

type DocWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(resolveTheme());
  }, []);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const doc = document as DocWithViewTransition;

    // Reduced-motion or unsupported browser → instant swap.
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (!doc.startViewTransition || prefersReducedMotion) {
      setTheme(next);
      setThemeState(next);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      setTheme(next);
      setThemeState(next);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === null ? (
        <Sun className="size-4 opacity-0" />
      ) : isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
