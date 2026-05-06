export const OPENROUTER_SPEECH_URL =
  'https://openrouter.ai/api/v1/audio/speech';

// `speech` (not `audio`) is OpenRouter's modality slug for pure TTS models —
// the ones that populate `supported_voices`. `audio` covers audio-out chat
// models (gpt-audio etc.) which don't expose voice IDs.
export const OPENROUTER_TTS_MODELS_URL =
  'https://openrouter.ai/api/v1/models?output_modalities=speech';

// OpenRouter doesn't surface per-model `speed` support directly. OpenAI's TTS
// is the only family that currently honors the `speed` parameter; everyone
// else ignores it (and some 400 if it's set). Restrict by id prefix.
export function modelSupportsSpeed(id: string): boolean {
  return id.startsWith('openai/');
}
