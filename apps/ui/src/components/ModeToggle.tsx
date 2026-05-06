import { MessageSquare, Mic } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type Mode = "chat" | "speech";

interface ModeToggleProps {
  mode: Mode;
}

export default function ModeToggle({ mode }: ModeToggleProps) {
  const navigate = useNavigate();

  const select = (next: Mode) => {
    if (next === mode) return;
    navigate({ to: next === "chat" ? "/" : "/speech" });
  };

  return (
    <div
      className="relative inline-flex items-center border border-border rounded-full p-0.5 h-7"
      role="tablist"
      aria-label="Mode"
    >
      <span
        aria-hidden
        className="absolute top-0.5 left-0.5 size-6 rounded-full transition-transform duration-200 ease-out"
        style={{
          background: "oklch(0.6 0.18 265)",
          transform: mode === "speech" ? "translateX(24px)" : "translateX(0)",
        }}
      />
      <button
        type="button"
        role="tab"
        aria-selected={mode === "chat"}
        title="Chat mode"
        onClick={() => select("chat")}
        className={`relative z-10 size-6 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          mode === "chat"
            ? "text-white"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <MessageSquare className="size-3.5" />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "speech"}
        title="Speech mode"
        onClick={() => select("speech")}
        className={`relative z-10 size-6 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          mode === "speech"
            ? "text-white"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Mic className="size-3.5" />
      </button>
    </div>
  );
}
