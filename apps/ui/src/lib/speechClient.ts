import type {
  DefaultTtsModelResponse,
  SpeechClip,
  TtsModel,
  VoicePrefsForModel,
} from '@kontekst/dtos';

export interface SynthesizeArgs {
  input: string;
  model: string;
  voice: string;
  speed?: number;
}

export async function synthesizeSpeech(
  args: SynthesizeArgs
): Promise<SpeechClip> {
  const res = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `TTS request failed (${res.status})`);
  }
  return res.json();
}

export async function listClips(): Promise<SpeechClip[]> {
  const res = await fetch('/api/speech/clips');
  if (!res.ok) throw new Error(`Failed to list clips (${res.status})`);
  return res.json();
}

export async function deleteClip(id: string): Promise<void> {
  const res = await fetch(`/api/speech/clips/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete clip (${res.status})`);
}

export async function listTtsModels(): Promise<TtsModel[]> {
  const res = await fetch('/api/speech/models');
  if (!res.ok) throw new Error(`Failed to list TTS models (${res.status})`);
  return res.json();
}

export async function getDefaultTtsModel(): Promise<DefaultTtsModelResponse> {
  const res = await fetch('/api/speech/models/default');
  if (!res.ok)
    throw new Error(`Failed to load default TTS model (${res.status})`);
  return res.json();
}

export async function setDefaultTtsModel(modelId: string): Promise<void> {
  const res = await fetch('/api/speech/models/default', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId }),
  });
  if (!res.ok)
    throw new Error(`Failed to set default TTS model (${res.status})`);
}

export function clipAudioUrl(id: string): string {
  return `/api/speech/clips/${id}/audio`;
}

export async function listVoicePrefs(
  modelId: string
): Promise<VoicePrefsForModel> {
  const res = await fetch(
    `/api/speech/voice-prefs?modelId=${encodeURIComponent(modelId)}`
  );
  if (!res.ok) throw new Error(`Failed to load voice prefs (${res.status})`);
  return res.json();
}

export interface SaveVoicePrefArgs {
  modelId: string;
  voiceId: string;
  name?: string;
  shortcut?: string;
}

export async function saveVoicePref(args: SaveVoicePrefArgs): Promise<void> {
  const res = await fetch('/api/speech/voice-prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message ?? `Failed to save voice pref (${res.status})`
    );
  }
}

export async function setDefaultVoice(
  modelId: string,
  voiceId: string
): Promise<void> {
  const res = await fetch('/api/speech/voice-prefs/default', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, voiceId }),
  });
  if (!res.ok) throw new Error(`Failed to set default voice (${res.status})`);
}

export async function clearDefaultVoice(modelId: string): Promise<void> {
  const res = await fetch(
    `/api/speech/voice-prefs/default?modelId=${encodeURIComponent(modelId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error(`Failed to clear default voice (${res.status})`);
}
