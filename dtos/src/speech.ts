import { z } from 'zod';

export const SPEECH_MAX_CHARS = 4096;

export const SpeechRequestSchema = z.object({
  input: z.string().min(1).max(SPEECH_MAX_CHARS),
  model: z.string(),
  voice: z.string(),
  speed: z.number().min(0.25).max(4).optional(),
});

export type SpeechRequest = z.infer<typeof SpeechRequestSchema>;

export const SpeechClipSchema = z.object({
  id: z.string(),
  text: z.string(),
  voice: z.string(),
  model: z.string(),
  format: z.literal('mp3'),
  speed: z.number().nullable(),
  durationSec: z.number(),
  createdAt: z.string(),
});

export type SpeechClip = z.infer<typeof SpeechClipSchema>;

export const TtsModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
  voices: z.array(z.string()),
  supportsSpeed: z.boolean(),
});

export type TtsModel = z.infer<typeof TtsModelSchema>;

export const VoicePrefSchema = z.object({
  name: z.string().optional(),
  shortcut: z.string().optional(),
  isDefault: z.boolean().optional(),
});
export type VoicePref = z.infer<typeof VoicePrefSchema>;

export const VoicePrefsForModelSchema = z.record(z.string(), VoicePrefSchema);
export type VoicePrefsForModel = z.infer<typeof VoicePrefsForModelSchema>;

export const SaveVoicePrefSchema = z.object({
  modelId: z.string().min(1),
  voiceId: z.string().min(1),
  name: z.string().optional(),
  shortcut: z.string().optional(),
});
export type SaveVoicePrefRequest = z.infer<typeof SaveVoicePrefSchema>;

export const SetDefaultVoiceSchema = z.object({
  modelId: z.string().min(1),
  voiceId: z.string().min(1),
});
export type SetDefaultVoiceRequest = z.infer<typeof SetDefaultVoiceSchema>;

export const SetDefaultTtsModelSchema = z.object({
  modelId: z.string().min(1),
});
export type SetDefaultTtsModelRequest = z.infer<
  typeof SetDefaultTtsModelSchema
>;
