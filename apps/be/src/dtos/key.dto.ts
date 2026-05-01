import { createZodDto } from 'nestjs-zod';
import { CreateKeySchema, SetActiveKeySchema } from '@kontekst/dtos';

export class CreateKeyDto extends createZodDto(CreateKeySchema) {}
export class SetActiveKeyDto extends createZodDto(SetActiveKeySchema) {}
