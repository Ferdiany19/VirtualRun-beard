import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const setAdminPasswordSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12),
});
