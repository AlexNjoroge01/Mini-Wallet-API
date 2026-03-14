import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import { walletRouter } from './modules/wallets/wallet.routes';
import { transactionRouter } from './modules/transactions/transaction.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(express.json());

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/wallets', walletRouter);
app.use('/api/v1/transactions', transactionRouter);

// Global Error Handler must be after routers
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api/v1/docs`);
  });
}

export default app;
