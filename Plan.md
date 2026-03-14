A REST API — meaning a server that listens for HTTP requests and responds with JSON. Think of it like a bank's backend. No frontend, no UI. Just endpoints you call with a tool like Postman or curl.
The API does three things:

Manage wallets (create one, check its balance)
Deposit money into a wallet
Transfer money between two wallets


The three layers and what each does
Routes — the entry point. Just defines "this URL path goes to this controller." Nothing else. No logic.
Controllers — receives the request, calls the service, sends the response back. Thin layer. Just traffic control.
Services — where all the real logic lives. Balance checks, DB queries, transaction atomicity. This is the brain.
Think of it like a restaurant:

Route = the front door and menu
Controller = the waiter
Service = the kitchen


How a request flows end to end
Take a transfer request as the example:
POST /api/v1/transactions/transfer
{ "sender_wallet_id": "abc", "receiver_wallet_id": "xyz", "amount": "500" }

Express receives the request
Zod middleware validates the body — is amount a valid number? Are both IDs present? If not, reject immediately with a 400
Controller picks it up and calls transferService()
Service opens a DB transaction, locks both wallet rows, checks sender has enough balance, deducts from sender, credits receiver, records the transaction — all atomically
If anything fails, the whole thing rolls back. Nothing is written.
Controller gets the result back and sends a JSON response
If an error was thrown anywhere, the global error handler catches it and formats it cleanly


How the database fits in
You have two tables:
wallets — stores each wallet and its current balance
transactions — a permanent record of every deposit and transfer that ever happened. You never delete from this table. It's your audit trail.
When a transfer happens, you're doing three writes in one atomic operation:

Subtract from sender's balance
Add to receiver's balance
Insert a transaction record

If any one of those fails, all three are rolled back. That's what "atomic" means — all or nothing.

How Drizzle fits in
Drizzle is your ORM — it lets you write database queries in TypeScript instead of raw SQL. It also manages your schema and migrations.
You define your tables in schema.ts as TypeScript objects. Then run:
bashbunx drizzle-kit push
That creates the actual tables in your Neon PostgreSQL database.

Build order in plain terms

Scaffold the project — folders, tsconfig, install packages
Connect to Neon via Drizzle — confirm the connection works
Define your two tables in schema.ts, push them to the DB
Build wallet creation and fetch endpoints — simple, no financial logic yet
Build deposit — your first transaction, straightforward
Build transfer — the hardest part, add locking and atomicity here
Add Zod validation to all routes
Add the global error handler
Add idempotency key checking
Write the README with setup instructions and curl examples

Each step is testable before moving to the next. You never build blind.