import type { SpeechClip } from '@kontekst/dtos';
import { Download, Pause, Play, RotateCcw, RotateCw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogClose, DialogContent } from '#/components/ui/dialog';
import { clipAudioUrl } from '#/lib/speechClient';

interface SpeechPlayerDialogProps {
  clip: SpeechClip | null;
  open: boolean;
  onClose: () => void;
}

const BAR_COUNT = 96;
const TEXT_PREVIEW = 220;

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function deterministicBars(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const r = (h % 1000) / 1000;
    const env = Math.sin((i / count) * Math.PI);
    out.push(Math.min(1, 0.15 + r * 0.6 + env * 0.4));
  }
  return out;
}

export default function SpeechPlayerDialog({
  clip,
  open,
  onClose,
}: SpeechPlayerDialogProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const bars = useMemo(
    () => (clip ? deterministicBars(clip.id + clip.text, BAR_COUNT) : []),
    [clip?.id, clip?.text]
  );

  useEffect(() => {
    if (!open || !clip) return;
    setExpanded(false);
    setDuration(clip.durationSec);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [open, clip?.id]);

  // Pause on close.
  useEffect(() => {
    if (!open) audioRef.current?.pause();
  }, [open]);

  // rAF for smooth bar fill (timeupdate fires too coarsely).
  useEffect(() => {
    if (!isPlaying || scrubbing) return;
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, scrubbing]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skip(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skip(5);
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [open]);

  const liveDuration = (): number => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration) && audio.duration > 0) {
      return audio.duration;
    }
    return duration;
  };

  const positionAndPlay = (target: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = target;
    setCurrentTime(target);
    if (audio.paused || audio.ended) audio.play().catch(() => {});
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused || audio.ended) {
      if (audio.ended) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const skip = (deltaSec: number) => {
    const audio = audioRef.current;
    const dur = liveDuration();
    if (!audio || dur <= 0) return;
    const target = Math.max(0, Math.min(dur, audio.currentTime + deltaSec));
    positionAndPlay(target);
  };

  const targetFromClientX = (clientX: number): number => {
    const wave = waveRef.current;
    const dur = liveDuration();
    if (!wave || dur <= 0) return 0;
    const rect = wave.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return p * dur;
  };

  // Click + drag on the waveform.
  const onWaveDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const audio = audioRef.current;
    if (!audio) return;

    setScrubbing(true);
    positionAndPlay(targetFromClientX(e.clientX));

    const move = (ev: PointerEvent) => {
      const t = targetFromClientX(ev.clientX);
      audio.currentTime = t;
      setCurrentTime(t);
    };
    const up = () => {
      setScrubbing(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const text = clip?.text ?? '';
  const isLong = text.length > TEXT_PREVIEW;
  const shownText =
    !isLong || expanded ? text : text.slice(0, TEXT_PREVIEW).trimEnd() + '…';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {clip && (
          <>
            <audio
              key={clip.id}
              ref={audioRef}
              src={clipAudioUrl(clip.id)}
              autoPlay
              preload="auto"
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

            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="inline-flex items-center gap-1.5 text-foreground font-medium text-xs">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isPlaying
                      ? 'oklch(0.6 0.18 265)'
                      : 'var(--muted-foreground)',
                    animation: isPlaying
                      ? 'pulse 1.4s ease-in-out infinite'
                      : 'none',
                  }}
                />
                {isPlaying
                  ? 'playing'
                  : progress > 0 && progress < 1
                    ? 'paused'
                    : 'ready'}
              </span>
              <span className="opacity-50 text-muted-foreground text-xs">
                ·
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {clip.voice}
              </span>
              <span className="opacity-50 text-muted-foreground text-xs">
                ·
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {clip.format}
              </span>

              <a
                href={clipAudioUrl(clip.id)}
                download={`${clip.id}.mp3`}
                className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer hover:bg-muted transition-colors"
                title="Download mp3"
              >
                <Download className="size-3.5" />
                mp3
              </a>
              <DialogClose
                className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                aria-label="Close"
                title="Close (Esc)"
              >
                <X className="size-3.5" />
              </DialogClose>
            </div>

            <div
              ref={waveRef}
              onPointerDown={onWaveDown}
              className="relative h-16 flex items-center gap-0.5 cursor-pointer select-none touch-none"
            >
              {bars.map((b, i) => {
                const reached = (i + 0.5) / bars.length <= progress;
                return (
                  <span
                    key={i}
                    className="inline-block flex-1 rounded-[1px] pointer-events-none"
                    style={{
                      height: `${Math.round(b * 56) + 4}px`,
                      background: reached
                        ? 'var(--foreground)'
                        : 'var(--border)',
                      opacity: reached ? 1 : 0.8,
                      transition: scrubbing ? 'none' : 'background 80ms linear',
                    }}
                  />
                );
              })}
            </div>

            <div className="flex justify-between font-mono text-[0.7rem] text-muted-foreground mt-1.5">
              <span>{fmtTime(progress * duration)}</span>
              <span>{fmtTime(duration)}</span>
            </div>

            <div className="mt-3.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => skip(-5)}
                title="Back 5 seconds"
                aria-label="Back 5 seconds"
                className="inline-flex items-center justify-center gap-1 h-8 min-w-10 px-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer font-mono text-xs"
              >
                <RotateCcw className="size-3.5" />
                <span>5</span>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                title={isPlaying ? 'Pause (space)' : 'Play (space)'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex items-center justify-center size-11 rounded-full bg-primary text-primary-foreground border border-transparent cursor-pointer transition-transform active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="size-4 fill-current" />
                ) : (
                  <Play className="size-4 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={() => skip(5)}
                title="Forward 5 seconds"
                aria-label="Forward 5 seconds"
                className="inline-flex items-center justify-center gap-1 h-8 min-w-10 px-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer font-mono text-xs"
              >
                <span>5</span>
                <RotateCw className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 border border-border rounded-lg bg-muted/50 px-3.5 py-3">
              <div className="text-[0.7rem] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
                Text
              </div>
              <div
                className={`text-sm leading-relaxed text-foreground whitespace-pre-wrap ${
                  expanded ? 'max-h-60 overflow-y-auto' : ''
                }`}
              >
                {shownText}
              </div>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((x) => !x)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {expanded ? 'Show less' : `Show all (${text.length} chars)`}
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
