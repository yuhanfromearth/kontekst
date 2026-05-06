import { createZodDto } from 'nestjs-zod';
import {
  SaveVoicePrefSchema,
  SetDefaultTtsModelSchema,
  SetDefaultVoiceSchema,
  SpeechRequestSchema,
} from '@kontekst/dtos';

export class SpeechDto extends createZodDto(SpeechRequestSchema) {}
export class SaveVoicePrefDto extends createZodDto(SaveVoicePrefSchema) {}
export class SetDefaultVoiceDto extends createZodDto(SetDefaultVoiceSchema) {}
export class SetDefaultTtsModelDto extends createZodDto(
  SetDefaultTtsModelSchema,
) {}
