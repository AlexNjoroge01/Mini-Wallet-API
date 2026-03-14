import { z } from 'zod';

export const createWalletSchema = z.object({
  body: z.object({
    owner_name: z.string().min(1, 'Owner name cannot be empty').max(100, 'Owner name too long'),
  }),
});

export const walletIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid wallet ID'),
  }),
});
