import { db } from '../../db';
import { wallets, transactions } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { eq, sql } from 'drizzle-orm';

export class TransactionService {
  static async deposit(wallet_id: string, amountStr: string, idempotency_key?: string) {
    if (idempotency_key) {
      const [existingTx] = await db.select().from(transactions).where(eq(transactions.idempotency_key, idempotency_key));
      if (existingTx) return existingTx;
    }

    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, wallet_id));
    if (!wallet) throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');

    const amount = parseFloat(amountStr);

    try {
      return await db.transaction(async (tx) => {
        await tx.update(wallets)
          .set({ balance: sql`${wallets.balance} + ${amount}` })
          .where(eq(wallets.id, wallet_id));

        const [transaction] = await tx.insert(transactions).values({
          type: 'deposit',
          receiver_wallet_id: wallet_id,
          amount: amountStr,
          status: 'success',
          ...(idempotency_key ? { idempotency_key } : {})
        }).returning();

        return transaction;
      });
    } catch (err) {
      throw err;
    }
  }

  static async transfer(sender_wallet_id: string, receiver_wallet_id: string, amountStr: string, idempotency_key?: string) {
    if (idempotency_key) {
      const [existingTx] = await db.select().from(transactions).where(eq(transactions.idempotency_key, idempotency_key));
      if (existingTx) return existingTx;
    }

    const amount = parseFloat(amountStr);

    try {
      return await db.transaction(async (tx) => {
        const firstId = sender_wallet_id < receiver_wallet_id ? sender_wallet_id : receiver_wallet_id;
        const secondId = sender_wallet_id < receiver_wallet_id ? receiver_wallet_id : sender_wallet_id;

        const lockedRows: any = await tx.execute(
          sql`SELECT id, balance FROM wallets WHERE id IN (${firstId}, ${secondId}) FOR UPDATE`
        );
        const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows.rows || []);
        
        const senderRow = rows.find((r: any) => r.id === sender_wallet_id);
        const receiverRow = rows.find((r: any) => r.id === receiver_wallet_id);

        if (!senderRow || !receiverRow) {
          throw new AppError(404, 'WALLET_NOT_FOUND', 'One or both wallets not found');
        }

        if (parseFloat(senderRow.balance) < amount) {
          throw new AppError(422, 'INSUFFICIENT_FUNDS', 'Insufficient funds for transfer');
        }

        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${amount}` }).where(eq(wallets.id, sender_wallet_id));
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${amount}` }).where(eq(wallets.id, receiver_wallet_id));

        const [transaction] = await tx.insert(transactions).values({
          type: 'transfer',
          sender_wallet_id,
          receiver_wallet_id,
          amount: amountStr,
          status: 'success',
          ...(idempotency_key ? { idempotency_key } : {})
        }).returning();

        return transaction;
      });
    } catch (err: any) {
      if (err && typeof err.statusCode === 'number' && err.code !== 'WALLET_NOT_FOUND') {
        try {
          await db.insert(transactions).values({
            type: 'transfer',
            sender_wallet_id,
            receiver_wallet_id,
            amount: amountStr,
            status: 'failed',
            ...(idempotency_key ? { idempotency_key } : {})
          });
        } catch (e) { /* ignore constraint errors from bad ids */ }
      }
      throw err;
    }
  }
}
