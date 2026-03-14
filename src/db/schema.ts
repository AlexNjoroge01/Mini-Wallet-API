import { pgTable, uuid, varchar, numeric, timestamp, check, pgEnum, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const transactionStatusEnum = pgEnum('transaction_status', ['success', 'failed']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'transfer']);

export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  owner_name: varchar('owner_name', { length: 100 }).notNull(),
  balance: numeric('balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return [
    check('wallets_balance_check', sql`${table.balance} >= 0`)
  ];
});

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: transactionTypeEnum('type').notNull(),
  sender_wallet_id: uuid('sender_wallet_id').references((): AnyPgColumn => wallets.id),
  receiver_wallet_id: uuid('receiver_wallet_id').notNull().references((): AnyPgColumn => wallets.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  idempotency_key: varchar('idempotency_key', { length: 255 }).unique(),
  status: transactionStatusEnum('status').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return [
    check('transactions_amount_check', sql`${table.amount} > 0`)
  ];
});
