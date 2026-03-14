import { Request, Response, NextFunction } from 'express';
import { WalletService } from './wallet.service';

export const createWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner_name } = req.body;
    const wallet = await WalletService.createWallet(owner_name);
    res.status(201).json({ success: true, data: wallet });
  } catch (err) {
    next(err);
  }
};

export const getWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const wallet = await WalletService.getWalletById(id);
    res.status(200).json({ success: true, data: wallet });
  } catch (err) {
    next(err);
  }
};

export const getTransactionHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const history = await WalletService.getTransactionHistory(id, limit, offset);
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
