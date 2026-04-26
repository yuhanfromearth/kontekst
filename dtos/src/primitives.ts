import { z } from 'zod';

export const KontekstNameSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-zA-Z0-9 _-]+$/);
