import { createZodDto } from 'nestjs-zod';
import { CreateBraveKeySchema, SetActiveBraveKeySchema } from '@kontekst/dtos';

export class CreateBraveKeyDto extends createZodDto(CreateBraveKeySchema) {}
export class SetActiveBraveKeyDto extends createZodDto(
  SetActiveBraveKeySchema,
) {}
