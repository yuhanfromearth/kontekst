import { z } from 'zod';

export const MemorySchema = z.object({
  content: z.string(),
});

export const UpdateMemorySchema = z.object({
  content: z.string(),
});

export type MemoryDto = z.infer<typeof MemorySchema>;
export type UpdateMemoryRequest = z.infer<typeof UpdateMemorySchema>;
