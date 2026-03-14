import { db } from '../../db';
import { wallets, transactions } from '../../db/schema';
import { eq, or, desc } from 'drizzle-orm';
import { AppError } from '../../lib/errors';

export class WalletService {
  static async createWallet(owner_name: string) {
    const [wallet] = await db.insert(wallets).values({ owner_name }).returning();
    return wallet;
  }

  static async getWalletById(id: string) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    if (!wallet) {
      throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');
    }
    return wallet;
  }

  static async getTransactionHistory(walletId: string, limit = 50, offset = 0) {
    await this.getWalletById(walletId); // Reusing to throw 404 if wallet missing.

    const history = await db.select()
      .from(transactions)
      .where(
        or(
          eq(transactions.sender_wallet_id, walletId),
          eq(transactions.receiver_wallet_id, walletId)
        )
      )
      .orderBy(desc(transactions.created_at))
      .limit(limit)
      .offset(offset);

    return history;
  }
}
