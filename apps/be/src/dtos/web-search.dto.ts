import { createZodDto } from 'nestjs-zod';
import { SetWebSearchEnabledSchema } from '@kontekst/dtos';

export class SetWebSearchEnabledDto extends createZodDto(
  SetWebSearchEnabledSchema,
) {}
