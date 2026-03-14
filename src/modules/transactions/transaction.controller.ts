import type { Request, Response, NextFunction } from 'express';
import { TransactionService } from './transaction.service';
import { AppError } from '../../lib/errors';

export const deposit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { wallet_id, amount, idempotency_key } = req.body;
    const tx = await TransactionService.deposit(wallet_id, amount, idempotency_key);
    res.status(200).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

export const transfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sender_wallet_id, receiver_wallet_id, amount, idempotency_key } = req.body;
    if (sender_wallet_id === receiver_wallet_id) {
        throw new AppError(400, 'INVALID_TRANSFER', 'Sender and receiver cannot be the same');
    }
    const tx = await TransactionService.transfer(sender_wallet_id, receiver_wallet_id, amount, idempotency_key);
    res.status(200).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};
