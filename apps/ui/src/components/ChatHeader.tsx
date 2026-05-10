import { useNavigate } from '@tanstack/react-router';
import ConversationHistory from '#/components/ConversationHistory';
import KeyUsageDisplay from '#/components/KeyUsageDisplay';
import KontekstLogo from '#/components/KontekstLogo';
import ModeToggle from '#/components/ModeToggle';
import ThemeToggle from '#/components/ThemeToggle';

interface ChatHeaderProps {
  kontekstList: string[];
}

export default function ChatHeader({ kontekstList }: ChatHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between mb-8 mt-2">
      <KontekstLogo className="ml-2" />
      <div className="flex items-center gap-1">
        <ConversationHistory kontekstList={kontekstList} />
        <ModeToggle mode="chat" />
        <KeyUsageDisplay />
        <ThemeToggle />
        <button
          type="button"
          onClick={() => navigate({ to: '/shortcuts' })}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
        >
          <span className="size-4 flex items-center justify-center text-sm leading-none">
            ?
          </span>
        </button>
      </div>
    </div>
  );
}
