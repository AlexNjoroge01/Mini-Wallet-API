import { Router } from 'express';
import { createWallet, getWallet, getTransactionHistory } from './wallet.controller';
import { validate } from '../../middleware/validate';
import { createWalletSchema, walletIdSchema } from './wallet.schema';

export const walletRouter = Router();

/**
 * @swagger
 * /wallets:
 *   post:
 *     summary: Create a wallet
 *     tags: [Wallets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWalletRequest'
 *     responses:
 *       201:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 */
walletRouter.post('/', validate(createWalletSchema), createWallet);

/**
 * @swagger
 * /wallets/{id}:
 *   get:
 *     summary: Get wallet by ID
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Wallet details
 *       400:
 *         description: Validation error
 *       404:
 *         description: Wallet not found
 */
walletRouter.get('/:id', validate(walletIdSchema), getWallet);

/**
 * @swagger
 * /wallets/{id}/transactions:
 *   get:
 *     summary: Get transaction history for a wallet
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Transaction history
 *       400:
 *         description: Validation error
 *       404:
 *         description: Wallet not found
 */
walletRouter.get('/:id/transactions', validate(walletIdSchema), getTransactionHistory);
