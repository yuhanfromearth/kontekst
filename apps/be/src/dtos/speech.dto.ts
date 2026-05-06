import { createZodDto } from 'nestjs-zod';
import {
  SaveVoicePrefSchema,
  SetDefaultVoiceSchema,
  SpeechRequestSchema,
} from '@kontekst/dtos';

export class SpeechDto extends createZodDto(SpeechRequestSchema) {}
export class SaveVoicePrefDto extends createZodDto(SaveVoicePrefSchema) {}
export class SetDefaultVoiceDto extends createZodDto(SetDefaultVoiceSchema) {}
