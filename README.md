# VunaPay Mini Wallet Transaction API

This is a robust, idempotent financial API built to exact atomic specifications. It manages digital wallets, handle deposits, and executes high-concurrency wallet-to-wallet transfers safely.

## 🚀 Stack

- **Runtime:** Bun
- **Server:** Express
- **Database:** PostgreSQL (Neon)
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Documentation:** Swagger (OpenAPI 3.0)

## 🖥️ Setup & Prerequisites
1. Ensure you have **Bun** and a Postgres DB (preferably **Neon**) environment ready.
2. Clone the repository and install dependencies:
   ```bash
   bun install
   ```
3. Set up the `.env` file based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
   ```
4. Push the schema to your database:
   ```bash
   bun db:push
   ```

## 🛠️ Running the Application

### Development
```bash
bun dev
```

### Production
```bash
bun start
```

## 🧪 Testing

The server must be running in a separate terminal before running the integration test suite.
1. Run server: `bun dev`
2. Run tests: `bun test`

## 📖 API Documentation (Swagger)

Start your server and navigate to:
```
http://localhost:3000/api/v1/docs
```

## ✨ Example `curl` Commands

### 1. Create a Wallet
```bash
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{"owner_name": "Alice"}'
```

### 2. Deposit Funds
```bash
curl -X POST http://localhost:3000/api/v1/transactions/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_id": "00000000-0000-0000-0000-000000000000",
    "amount": "100.00",
    "idempotency_key": "dep-123"
  }'
```

### 3. Transfer Funds
```bash
curl -X POST http://localhost:3000/api/v1/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_wallet_id": "11111111-1111-1111-1111-111111111111",
    "receiver_wallet_id": "22222222-2222-2222-2222-222222222222",
    "amount": "50.00",
    "idempotency_key": "tx-123"
  }'
```

## 🚧 Edge Cases Handled

- **Missing/Invalid Wallets:** Returns `404 Not Found`
- **Insufficient Funds:** Transfer attempts return `422 Unprocessable Entity`
- **Self-Transfer:** Returns `400 Bad Request` through Zod validation
- **Zero/Negative Amounts:** Returns `400 Bad Request`
- **Concurrent Transfers:** Database row locks (`SELECT FOR UPDATE`) prevent race conditions from withdrawing more funds than the balance allows.
- **Duplicate Requests:** The `idempotency_key` ensures a duplicate transfer or deposit returns the exact same successful transaction without processing it twice.
- **Database System Errors:** Returns a clean `500` error envelope, logging errors safely without leaking DB queries.
