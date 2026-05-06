import type { SpeechClip } from "@kontekst/dtos";
import { Play, Trash2 } from "lucide-react";

interface SpeechHistoryProps {
  clips: SpeechClip[];
  activeId?: string;
  onSelect: (clip: SpeechClip) => void;
  onDelete: (id: string) => void;
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function SpeechHistory({
  clips,
  activeId,
  onSelect,
  onDelete,
}: SpeechHistoryProps) {
  if (clips.length === 0) return null;
  return (
    <div className="mt-6 flex flex-col gap-1 overflow-y-auto">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 px-1">
        past generations
      </div>
      {clips.map((clip) => (
        <div
          key={clip.id}
          className={`group flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent hover:bg-accent transition-colors ${
            activeId === clip.id ? "bg-accent" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(clip)}
            className="flex items-center justify-center size-6 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Play"
          >
            <Play className="size-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => onSelect(clip)}
            className="flex-1 min-w-0 text-left cursor-pointer"
          >
            <div className="text-sm truncate">{clip.text}</div>
            <div className="text-xs text-muted-foreground flex gap-2 mt-0.5 font-mono">
              <span>{clip.voice}</span>
              <span>{fmtDuration(clip.durationSec)}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onDelete(clip.id)}
            className="size-6 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
