import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VunaPay Mini Wallet Transaction API',
      version: '1.0.0',
      description: 'API for managing wallets, deposits, and transfers.',
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
      },
    ],
    components: {
      schemas: {
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            owner_name: { type: 'string' },
            balance: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['deposit', 'transfer'] },
            sender_wallet_id: { type: 'string', format: 'uuid', nullable: true },
            receiver_wallet_id: { type: 'string', format: 'uuid' },
            amount: { type: 'string' },
            idempotency_key: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['success', 'failed'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateWalletRequest: {
          type: 'object',
          required: ['owner_name'],
          properties: {
            owner_name: { type: 'string' },
          },
        },
        DepositRequest: {
          type: 'object',
          required: ['wallet_id', 'amount'],
          properties: {
            wallet_id: { type: 'string', format: 'uuid' },
            amount: { type: 'string' },
            idempotency_key: { type: 'string' },
          },
        },
        TransferRequest: {
          type: 'object',
          required: ['sender_wallet_id', 'receiver_wallet_id', 'amount'],
          properties: {
            sender_wallet_id: { type: 'string', format: 'uuid' },
            receiver_wallet_id: { type: 'string', format: 'uuid' },
            amount: { type: 'string' },
            idempotency_key: { type: 'string' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
