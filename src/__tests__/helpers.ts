import { db } from '../db';
import { transactions, wallets } from '../db/schema';

export const BASE_URL = 'http://localhost:3000/api/v1';

export async function cleanDb() {
  await db.delete(transactions);
  await db.delete(wallets);
}
