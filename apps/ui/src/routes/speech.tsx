import KontekstLogo from '#/components/KontekstLogo';
import KeyUsageDisplay from '#/components/KeyUsageDisplay';
import ThemeToggle from '#/components/ThemeToggle';
import SpeechModeChip from '#/components/SpeechModeChip';
import TtsModelSelector from '#/components/TtsModelSelector';
import VoiceBadges from '#/components/VoiceBadges';
import SpeedControl from '#/components/SpeedControl';
import SpeechPlayerDialog from '#/components/SpeechActivePlayer';
import SpeechHistory from '#/components/SpeechHistory';
import { Button } from '#/components/ui/button';
import { Spinner } from '#/components/ui/spinner';
import { Textarea } from '#/components/ui/textarea';
import {
  SPEECH_MAX_CHARS,
  type DefaultTtsModelResponse,
  type KeyListItem,
  type SpeechClip,
  type TtsModel,
  type VoicePrefsForModel,
} from '@kontekst/dtos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import ModeToggle from '#/components/ModeToggle';
import { useEffect, useRef, useState } from 'react';
import {
  deleteClip as apiDeleteClip,
  getDefaultTtsModel,
  listClips,
  listTtsModels,
  listVoicePrefs,
  synthesizeSpeech,
} from '#/lib/speechClient';

export const Route = createFileRoute('/speech')({ component: SpeechPage });

const STORAGE_PREFIX = 'kontekst-speech-';

function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function savePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function SpeechPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: keys = [], isPending: keysLoading } = useQuery<KeyListItem[]>({
    queryKey: ['keys'],
    queryFn: () => fetch('/api/keys').then((r) => r.json()),
  });
  const hasActiveKey = keys.some((k) => k.isActive);
  const showNoKey = !keysLoading && !hasActiveKey;

  const { data: models = [], isPending: modelsPending } = useQuery<TtsModel[]>({
    queryKey: ['tts-models'],
    queryFn: listTtsModels,
    enabled: hasActiveKey,
  });
  const { data: defaultTtsModel } = useQuery<DefaultTtsModelResponse>({
    queryKey: ['tts-models', 'default'],
    queryFn: getDefaultTtsModel,
    enabled: hasActiveKey,
  });
  const defaultTtsMissing =
    !!defaultTtsModel?.modelId && !defaultTtsModel.model;
  const { data: clips = [], isPending: clipsPending } = useQuery<SpeechClip[]>({
    queryKey: ['speech-clips'],
    queryFn: listClips,
  });

  const [selectedModel, setSelectedModel] = useState<TtsModel | null>(null);
  const { data: voicePrefs = {}, isPending: voicePrefsPending } =
    useQuery<VoicePrefsForModel>({
      queryKey: ['voice-prefs', selectedModel?.id],
      queryFn: () => listVoicePrefs(selectedModel!.id),
      enabled: !!selectedModel,
    });
  const [voice, setVoice] = useState<string>(() => loadPref('voice', ''));
  const [speed, setSpeed] = useState<number>(() => loadPref('speed', 1.0));
  const [text, setText] = useState('');
  const [activeClip, setActiveClip] = useState<SpeechClip | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (selectedModel) return;
    if (models.length === 0) return;
    if (!defaultTtsModel) return;
    if (defaultTtsMissing) return;
    const fromDefault = defaultTtsModel.model
      ? models.find((m) => m.id === defaultTtsModel.model!.id)
      : undefined;
    setSelectedModel(fromDefault ?? models[0]);
  }, [models, selectedModel, defaultTtsModel, defaultTtsMissing]);

  // When the model changes (or first loads with prefs), pick a voice. Prefer
  // the per-model default voice, then the persisted choice if still supported,
  // then the first listed voice. Do not override the user's selection within a
  // single model session.
  const lastResolvedModelId = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedModel) return;
    if (selectedModel.voices.length === 0) return;
    if (voicePrefsPending) return;
    if (lastResolvedModelId.current === selectedModel.id) {
      // Within the same model, only correct if the current voice was removed
      // from the upstream voice list.
      if (!selectedModel.voices.includes(voice)) {
        setVoice(selectedModel.voices[0]);
      }
      return;
    }
    const defaultVoiceId = Object.entries(voicePrefs).find(
      ([, p]) => p.isDefault
    )?.[0];
    if (defaultVoiceId && selectedModel.voices.includes(defaultVoiceId)) {
      setVoice(defaultVoiceId);
    } else if (!selectedModel.voices.includes(voice)) {
      setVoice(selectedModel.voices[0]);
    }
    lastResolvedModelId.current = selectedModel.id;
  }, [selectedModel, voice, voicePrefs]);

  useEffect(() => savePref('voice', voice), [voice]);
  useEffect(() => savePref('speed', speed), [speed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') textareaRef.current?.blur();
      if (document.activeElement === textareaRef.current) return;
      if (e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const charCount = text.length;
  const overLimit = charCount > SPEECH_MAX_CHARS;
  const supportsSpeed = selectedModel?.supportsSpeed ?? false;

  const synthesize = useMutation({
    mutationFn: () => {
      if (!selectedModel) throw new Error('No model selected');
      return synthesizeSpeech({
        input: text.trim(),
        model: selectedModel.id,
        voice,
        ...(supportsSpeed ? { speed } : {}),
      });
    },
    onSuccess: (clip) => {
      setActiveClip(clip);
      setError(undefined);
      queryClient.invalidateQueries({ queryKey: ['speech-clips'] });
      queryClient.invalidateQueries({ queryKey: ['keyInfo'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'TTS failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteClip,
    onSuccess: (_, id) => {
      if (activeClip?.id === id) setActiveClip(null);
      queryClient.invalidateQueries({ queryKey: ['speech-clips'] });
    },
  });

  const blockedByMissingDefault = defaultTtsMissing && !selectedModel;

  const generate = () => {
    if (
      !text.trim() ||
      synthesize.isPending ||
      overLimit ||
      showNoKey ||
      blockedByMissingDefault
    )
      return;
    synthesize.mutate();
  };

  const initialLoading =
    keysLoading || (hasActiveKey && modelsPending) || clipsPending;

  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner
          className="size-6 text-muted-foreground"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-1">
      <div className="flex items-center justify-between mb-8 mt-2">
        <div className="flex items-center gap-2.5 ml-2">
          <KontekstLogo />
          <SpeechModeChip />
        </div>
        <div className="flex items-center gap-1">
          <ModeToggle mode="speech" />
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

      <div className="flex items-center justify-between mb-2">
        {showNoKey || (!selectedModel && !defaultTtsMissing) ? (
          <span />
        ) : (
          <TtsModelSelector
            selected={selectedModel}
            onSelect={setSelectedModel}
          />
        )}
        <span
          className={`text-xs font-mono mr-1 ${overLimit ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {charCount.toLocaleString()} / {SPEECH_MAX_CHARS.toLocaleString()}
        </span>
      </div>

      {showNoKey && (
        <div className="mb-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Add an OpenRouter API key to start synthesizing. Open the wallet menu
          in the top bar.
        </div>
      )}

      {!showNoKey && blockedByMissingDefault && (
        <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Your default TTS model{' '}
          <span className="font-mono">'{defaultTtsModel?.modelId}'</span> is no
          longer available. Pick a different model and set it to default to
          continue.
        </div>
      )}

      <Textarea
        ref={textareaRef}
        placeholder={
          showNoKey
            ? 'Add an API key first…'
            : 'What would you like spoken aloud? [/]'
        }
        value={text}
        disabled={showNoKey || blockedByMissingDefault}
        onChange={(e) => {
          setText(e.target.value);
          setError(undefined);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generate();
          }
        }}
        className={overLimit ? 'border-destructive' : undefined}
      />

      <div className="mt-2.5 flex items-center justify-between gap-3 flex-wrap px-1">
        <SpeedControl
          value={speed}
          onChange={setSpeed}
          disabled={!supportsSpeed}
        />
        {!supportsSpeed && (
          <span className="text-[0.7rem] text-muted-foreground">
            speed unsupported by this provider
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 hover:cursor-pointer"
          onClick={generate}
          disabled={
            synthesize.isPending ||
            !text.trim() ||
            overLimit ||
            showNoKey ||
            blockedByMissingDefault
          }
        >
          {synthesize.isPending ? (
            <>
              <Spinner className="size-3" />
              Synthesizing…
            </>
          ) : (
            <>Generate</>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="hover:cursor-pointer"
          disabled={!text.length}
          onClick={() => {
            setText('');
            textareaRef.current?.focus();
          }}
        >
          Clear
        </Button>
      </div>

      {error && <p className="text-xs text-destructive mt-2 ml-1">{error}</p>}

      {selectedModel && (
        <VoiceBadges
          voices={selectedModel.voices}
          selected={voice}
          onSelect={setVoice}
          prefs={voicePrefs}
          modelId={selectedModel.id}
        />
      )}

      <div className="flex-1 min-h-0 overflow-y-auto mt-6">
        <SpeechHistory
          clips={clips}
          activeId={activeClip?.id}
          onSelect={setActiveClip}
          onDelete={deleteMutation.mutate}
        />
      </div>

      <SpeechPlayerDialog
        clip={activeClip}
        open={!!activeClip}
        onClose={() => setActiveClip(null)}
      />
    </div>
  );
}
