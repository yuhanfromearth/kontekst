import { createZodDto } from 'nestjs-zod';
import { DeleteShortcutSchema, SaveShortcutSchema } from '@kontekst/dtos';

export class SaveShortcutDto extends createZodDto(SaveShortcutSchema) {}
export class DeleteShortcutDto extends createZodDto(DeleteShortcutSchema) {}
