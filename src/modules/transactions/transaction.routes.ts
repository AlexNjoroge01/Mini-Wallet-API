import { Router } from 'express';
import { deposit, transfer } from './transaction.controller';
import { validate } from '../../middleware/validate';
import { depositSchema, transferSchema } from './transaction.schema';

export const transactionRouter = Router();

/**
 * @swagger
 * /transactions/deposit:
 *   post:
 *     summary: Deposit funds into a wallet
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepositRequest'
 *     responses:
 *       200:
 *         description: Deposit successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Wallet not found
 */
transactionRouter.post('/deposit', validate(depositSchema), deposit);

/**
 * @swagger
 * /transactions/transfer:
 *   post:
 *     summary: Transfer funds between two wallets
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input or same sender/receiver
 *       404:
 *         description: One or both wallets not found
 *       422:
 *         description: Insufficient funds
 *       500:
 *         description: Internal server error
 */
transactionRouter.post('/transfer', validate(transferSchema), transfer);
