import type { SpeechClip } from "@kontekst/dtos";
import { Download, Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clipAudioUrl } from "#/lib/speechClient";

interface SpeechActivePlayerProps {
  clip: SpeechClip;
  onClose: () => void;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function deterministicBars(seed: string, count: number): number[] {
  let h = 987654321;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0;
    h = (h * 1664525 + 1013904223) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(0.2 + (((h >>> 0) % 1000) / 1000) * 0.8);
  }
  return out;
}

export default function SpeechActivePlayer({
  clip,
  onClose,
}: SpeechActivePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clip.durationSec);

  const bars = useMemo(() => deterministicBars(clip.id, 64), [clip.id]);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setDuration(clip.durationSec);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    }
  }, [clip.id]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className="mt-5 border border-border rounded-2xl px-4 py-3.5 bg-card">
      <audio
        ref={audioRef}
        src={clipAudioUrl(clip.id)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
        }}
      />
      <div className="flex items-center gap-2.5 text-[0.7rem] text-muted-foreground mb-2.5">
        <span className="inline-flex items-center gap-1.5 text-foreground font-medium text-xs">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isPlaying
                ? "oklch(0.6 0.18 265)"
                : "var(--muted-foreground)",
              animation: isPlaying ? "pulse 1.4s ease-in-out infinite" : "none",
            }}
          />
          {isPlaying ? "playing" : "ready"}
        </span>
        <span className="opacity-50">·</span>
        <span className="font-mono">{clip.voice}</span>
        <span className="ml-auto font-mono">
          {fmtTime(progress * duration)} / {fmtTime(duration)}
        </span>
        <button
          type="button"
          onClick={() => {
            audioRef.current?.pause();
            onClose();
          }}
          className="p-1 -mr-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          title="Close player"
          aria-label="Close player"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-border cursor-pointer flex-shrink-0 transition-colors"
          style={{
            background: isPlaying ? "var(--primary)" : "var(--background)",
            color: isPlaying ? "var(--primary-foreground)" : "var(--foreground)",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-3.5 fill-current" />
          ) : (
            <Play className="size-3.5 fill-current" />
          )}
        </button>
        <div className="flex-1 h-8 flex items-center gap-px overflow-hidden">
          {bars.map((b, i) => {
            const reached = i / bars.length <= progress;
            return (
              <span
                key={i}
                className="inline-block flex-1 rounded-[1px] transition-colors duration-75"
                style={{
                  height: `${Math.round(b * 28) + 2}px`,
                  background: reached ? "var(--foreground)" : "var(--border)",
                  opacity: reached ? 1 : 0.7,
                }}
              />
            );
          })}
        </div>
        <a
          href={clipAudioUrl(clip.id)}
          download={`${clip.id}.mp3`}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer hover:bg-muted transition-colors"
          title="Download"
        >
          <Download className="size-3.5" />
          mp3
        </a>
      </div>
    </div>
  );
}
