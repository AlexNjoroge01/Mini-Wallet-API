import { z } from 'zod';

const amountRegex = /^\d+(\.\d{1,2})?$/;

export const depositSchema = z.object({
  body: z.object({
    wallet_id: z.string().uuid('Invalid wallet ID'),
    amount: z.string().regex(amountRegex, 'Amount must be a valid numeric string').refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
    idempotency_key: z.string().max(255).optional(),
  }),
});

export const transferSchema = z.object({
  body: z.object({
    sender_wallet_id: z.string().uuid('Invalid sender wallet ID'),
    receiver_wallet_id: z.string().uuid('Invalid receiver wallet ID'),
    amount: z.string().regex(amountRegex, 'Amount must be a valid numeric string').refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
    idempotency_key: z.string().max(255).optional(),
  }).refine(data => data.sender_wallet_id !== data.receiver_wallet_id, {
    message: "INVALID_TRANSFER: Sender and receiver cannot be the same wallet",
    path: ["receiver_wallet_id"],
  }),
});
