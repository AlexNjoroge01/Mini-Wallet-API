# VunaPay Mini Wallet Transaction API — Blueprint

**Stack:** Bun · Express · PostgreSQL · TypeScript · Drizzle ORM · Zod · Swagger (OpenAPI 3.0)

---

## 1. Project Philosophy

This is a financial API. That means three non-negotiables:
- **Atomicity** — transfers either fully succeed or fully fail. No partial state.
- **Idempotency** — duplicate requests must not double-charge or double-credit.
- **Auditability** — every balance change must trace back to a transaction record.

---

## 2. Folder Structure

```
vunapay-wallet/
├── src/
│   ├── db/
│   │   ├── index.ts          # Drizzle client + connection
│   │   ├── schema.ts         # Table definitions
│   │   └── migrations/       # Drizzle migration files
│   ├── modules/
│   │   ├── wallets/
│   │   │   ├── wallet.routes.ts
│   │   │   ├── wallet.controller.ts
│   │   │   ├── wallet.service.ts
│   │   │   └── wallet.schema.ts   # Zod validators
│   │   └── transactions/
│   │       ├── transaction.routes.ts
│   │       ├── transaction.controller.ts
│   │       ├── transaction.service.ts
│   │       └── transaction.schema.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── validate.ts       # Zod middleware wrapper
│   ├── lib/
│   │   └── errors.ts         # AppError class + error codes
│   ├── docs/
│   │   └── swagger.ts        # Swagger definition + setup
│   └── index.ts              # App entry point
├── drizzle.config.ts
├── .env.example
├── package.json
└── README.md
```

The module-per-feature pattern keeps concerns isolated. As the API grows, each module is self-contained.

---

## 3. Database Design

### Tables

**`wallets`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | `gen_random_uuid()` |
| `owner_name` | VARCHAR(100) | Not null |
| `balance` | NUMERIC(15,2) | Default 0.00, check >= 0 |
| `created_at` | TIMESTAMPTZ | Default now() |
| `updated_at` | TIMESTAMPTZ | Default now() |

> Use `NUMERIC`, never `FLOAT`, for money. Floating point arithmetic is not safe for currency.

**`transactions`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `type` | ENUM('deposit', 'transfer') | |
| `sender_wallet_id` | UUID (FK → wallets) | Null for deposits |
| `receiver_wallet_id` | UUID (FK → wallets) | Not null |
| `amount` | NUMERIC(15,2) | Check > 0 |
| `idempotency_key` | VARCHAR(255) | Unique, optional |
| `status` | ENUM('success', 'failed') | |
| `created_at` | TIMESTAMPTZ | Default now() |

> The `idempotency_key` column has a unique constraint. If a client retries with the same key, you return the original result instead of processing again.

### Key Constraint
Add a `CHECK (balance >= 0)` constraint at the DB level on `wallets.balance`. This is your last line of defence — even if application logic fails, the DB will reject a negative balance.

---

## 4. API Design

Base path: `/api/v1`

### Wallets

| Method | Path | Description |
|---|---|---|
| POST | `/wallets` | Create a wallet |
| GET | `/wallets/:id` | Get wallet + current balance |
| GET | `/wallets/:id/transactions` | List transaction history for a wallet |

### Transactions

| Method | Path | Description |
|---|---|---|
| POST | `/transactions/deposit` | Deposit funds into a wallet |
| POST | `/transactions/transfer` | Transfer between two wallets |

### Swagger UI

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/docs` | Interactive Swagger UI |

### Request/Response conventions
- All amounts are strings in requests (e.g. `"amount": "500.00"`) to avoid float precision issues from clients. Parse to `NUMERIC` server-side.
- All responses follow a consistent envelope:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "INSUFFICIENT_FUNDS", "message": "..." } }
```

---

## 5. Business Logic — Service Layer

### Create Wallet
1. Validate `owner_name` (non-empty, max length)
2. Insert wallet with balance = 0
3. Return wallet

### Deposit
1. Validate: `wallet_id` exists, `amount` > 0, `amount` is valid decimal
2. Check idempotency key — if already processed, return original transaction
3. In a **single DB transaction**:
   - Update `wallets.balance += amount` where `id = wallet_id`
   - Insert into `transactions` (type=deposit, receiver=wallet_id, amount, status=success)
4. Return transaction record

### Transfer
1. Validate: both `sender_wallet_id` and `receiver_wallet_id` exist
2. Validate: `sender != receiver`
3. Validate: `amount` > 0
4. Check idempotency key
5. In a **single DB transaction** (this is critical):
   - Lock both wallet rows with `SELECT FOR UPDATE` ordered by ID (lower ID first, always — this prevents deadlocks)
   - Check sender balance >= amount (fail fast before any writes)
   - Deduct from sender: `balance -= amount`
   - Credit receiver: `balance += amount`
   - Insert transaction record (status=success)
   - If any step throws, rollback everything — insert transaction with status=failed
6. Return transaction record

> **Why `SELECT FOR UPDATE`?** Without row-level locks, two concurrent transfers from the same wallet can both pass the balance check and both proceed, resulting in a negative balance. The DB constraint catches it but by then you have a failed transaction mid-flight. Lock first, check second.

### Get Transaction History
- Filter by wallet (either as sender or receiver)
- Order by `created_at DESC`
- Support optional `?limit` and `?offset` query params for pagination

---

## 6. Validation Layer (Zod)

Define schemas per endpoint in `*.schema.ts` files. A generic `validate` middleware wraps request parsing:

```
validate(schema) → parses req.body or req.params → attaches to req → 
passes to controller → controller trusts input is clean
```

Reject immediately on:
- Missing required fields
- `amount <= 0`
- `amount` that isn't a valid number string
- Non-UUID wallet IDs
- `sender_wallet_id === receiver_wallet_id`

---

## 7. Error Handling

Create an `AppError` class with `statusCode`, `code` (machine-readable), and `message` (human-readable).

| Scenario | HTTP Status | Error Code |
|---|---|---|
| Wallet not found | 404 | `WALLET_NOT_FOUND` |
| Insufficient balance | 422 | `INSUFFICIENT_FUNDS` |
| Validation failure | 400 | `VALIDATION_ERROR` |
| Same sender/receiver | 400 | `INVALID_TRANSFER` |
| Duplicate idempotency key | 200 | Return original result |
| Unknown DB/server error | 500 | `INTERNAL_ERROR` |

A single global `errorHandler` middleware in Express catches all thrown errors and formats them into the envelope response. Controllers just `throw` — they never format errors themselves.

---

## 8. Swagger Documentation (OpenAPI 3.0)

### Packages

```bash
bun add swagger-ui-express swagger-jsdoc
bun add -d @types/swagger-ui-express @types/swagger-jsdoc
```

### How it works

`swagger-jsdoc` reads JSDoc comments written directly above each route and compiles them into an OpenAPI 3.0 spec object. `swagger-ui-express` serves that spec as an interactive browser UI at `/api/v1/docs`. No separate YAML file needed — the comments live next to the code they describe.

### Setup in `src/docs/swagger.ts`

This file does two things:
1. Defines the base OpenAPI config — API title, version, description, server URL
2. Defines all reusable component schemas that routes can reference with `$ref`

It exports a compiled `swaggerSpec` object that gets mounted in `index.ts`.

### Reusable component schemas to define

Define these once under `components.schemas` so routes never repeat themselves:

- `Wallet` — id, owner_name, balance, created_at, updated_at
- `Transaction` — id, type, sender_wallet_id, receiver_wallet_id, amount, status, created_at
- `CreateWalletRequest` — owner_name
- `DepositRequest` — wallet_id, amount, idempotency_key (optional)
- `TransferRequest` — sender_wallet_id, receiver_wallet_id, amount, idempotency_key (optional)
- `SuccessResponse` — success: true, data: object
- `ErrorResponse` — success: false, error: { code, message }

### How to document a route

Add a JSDoc block directly above each route definition in `*.routes.ts`. Each block covers:
- HTTP method and path
- Summary (short) and description (detailed)
- `tags` — which group it belongs to in the UI
- `requestBody` — shape of the POST body, referencing component schemas
- `parameters` — path params (`:id`) and query params (`?limit`, `?offset`)
- `responses` — every possible status code with description and schema

Example for the transfer endpoint:
```
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
```

### Tags

Group endpoints by feature so the Swagger UI renders organized sections:
- `Wallets` — create wallet, get wallet, get transaction history
- `Transactions` — deposit, transfer

### Mounting in `index.ts`

```ts
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './docs/swagger'

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

The reviewer opens `http://localhost:3000/api/v1/docs` and gets a fully interactive, testable UI for every endpoint. This is a significant quality signal in an assessment submission.

---

## 9. Implementation Order

Build in this order to keep things testable at each step:

1. **Project scaffolding** — Bun init, install deps, tsconfig, folder structure
2. **DB connection** — Drizzle client, `.env` setup, test connection
3. **Schema + migrations** — Define tables, push to DB, verify in Neon dashboard
4. **Wallet CRUD** — Create wallet, get wallet (no transactions yet)
5. **Deposit endpoint** — Simpler transaction, no concurrency concern
6. **Transfer endpoint** — Add locking, atomicity, balance checks
7. **Transaction history** — Query with filter + pagination
8. **Validation middleware** — Zod schemas wired to all routes
9. **Error handling** — Global handler, AppError class
10. **Idempotency** — Add key checking to deposit + transfer
11. **Swagger docs** — Add JSDoc comments to all routes, mount UI at `/api/v1/docs`
12. **README** — Setup steps, env vars, how to run, link to Swagger UI

---

## 10. Key Dependencies

```bash
# Production
bun add express drizzle-orm pg dotenv zod swagger-ui-express swagger-jsdoc

# Dev
bun add -d drizzle-kit typescript @types/express @types/pg @types/swagger-ui-express @types/swagger-jsdoc bun-types
```

Run with `bun run src/index.ts`. No `ts-node` needed — Bun runs TypeScript natively.
Use `bun --watch src/index.ts` during development for hot reload.

---

## 11. README Must-Haves

- Prerequisites (Bun version, Neon account or local Postgres)
- `.env.example` with blank `DATABASE_URL=`
- Install command: `bun install`
- Migration command: `bunx drizzle-kit push`
- Start command: `bun run src/index.ts`
- Dev command: `bun --watch src/index.ts`
- Swagger UI link: `http://localhost:3000/api/v1/docs`
- Example `curl` commands for: create wallet, deposit, transfer, get balance, get history
- Edge cases section describing how each one is handled

---

## Edge Cases Checklist

- [ ] Deposit to non-existent wallet → 404
- [ ] Transfer from wallet with insufficient funds → 422
- [ ] Transfer to non-existent receiver → 404
- [ ] Transfer to self → 400
- [ ] Amount = 0 → 400
- [ ] Amount < 0 → 400
- [ ] Amount = non-numeric string → 400
- [ ] Concurrent transfers from same wallet → handled by `SELECT FOR UPDATE`
- [ ] Duplicate request with same idempotency key → return original result, no double-processing
- [ ] DB down → 500 with generic message (never leak DB errors to client)