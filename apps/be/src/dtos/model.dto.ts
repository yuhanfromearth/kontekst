import { createZodDto } from 'nestjs-zod';
import { SetDefaultModelSchema } from '@kontekst/dtos';

export class SetDefaultModelDto extends createZodDto(SetDefaultModelSchema) {}
