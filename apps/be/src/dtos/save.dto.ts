import { createZodDto } from 'nestjs-zod';
import {
  RenameKontekstSchema,
  SaveKontekstSchema,
  SetDefaultKontekstSchema,
} from '@kontekst/dtos';

export class SaveKontekstDto extends createZodDto(SaveKontekstSchema) {}
export class RenameKontekstDto extends createZodDto(RenameKontekstSchema) {}
export class SetDefaultKontekstDto extends createZodDto(
  SetDefaultKontekstSchema,
) {}
