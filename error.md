# Error Resolution Tracker & Strategies

## Current Issue: Integration Tests Returning 500 Responses
**Date**: 2026-03-14

### Observation
- The test suite is failing because endpoints are returning `500 INTERNAL_ERROR` instead of the expected `400 Bad Request`, `404 Not Found`, or `422 Unprocessable Entity`.
- I have previously tried multiple times to fix `validate.ts` types believing the issue was deeply nested within Express Zod resolution, but I was repeating the same failing process, which is a symptom of acting blindly.

### Root Cause Analysis (Duck Typing)
1. The 500 error resulted from uncaught errors in the global error handler. `AppError` and `ZodError` were not being recognized.
2. In Bun, it is well documented that checking `instanceof` custom objects thrown through middleware can sometimes be unreliable across module graphs.
3. Therefore `err instanceof AppError` in `errorHandler.ts` evaluated to `false`, causing the handler to throw a 500 error instead of formatting custom formatted JSON.
4. Additionally, `error instanceof ZodError` evaluated to `false` in `validate.ts`, sending the raw parsing error to the global handler.

### Resolved Strategy: Duck Typing
1. **Never repeat operations**: Do not repeatedly update TS typings in an attempt to solve logical runtime bugs. Stop, analyze the runtime flow, review logs directly, and evaluate the problem instead of fighting the linter directly.
2. **Duck Typing vs instanceof**: Replace direct `instanceof` usage with Duck Typing (Property checking) when assessing generic error objects passing across middlewares.
   - For `AppError`: check `typeof err.statusCode === 'number'`.
   - For `ZodError`: check `err.name === 'ZodError'`.
3. Implemented these property-checking modifications in `errorHandler.ts`, `validate.ts`, and `transaction.service.ts`.

### Follow-Up Bug Discovery 1 (Undetected Zod Arrays)
- The initial duck typing attempt fixed the cross-module `instanceof` issue, but revealed a new bug: `error.errors` was undefined.
- By looking at the exact unhandled rejection via a raw `curl` logged to a local file, I found: `TypeError: undefined is not an object (evaluating 'error.errors.map')`
- While Zod is documented to have an `.errors` property on `ZodError`, it appears in this Bun/Zod environment that either `.issues` must be used directly, or the `.errors` getter is not present on the surface object. 
- Using `(error.issues || error.errors || [])` safely extracts the messages to avoid another 500 error.

### Follow-Up Bug Discovery 2 (Drizzle Raw Execute payloads)
- The `transaction/transfer` tests remained failing after fixing Zod. By dumping a direct `fetch` manually, the following 500 stack trace appeared: `TypeError: rows.find is not a function`.
- `const rows = await tx.execute(...)` with `node-postgres` driver returns a `{ rows: [] }` wrapper, not the array directly. 
- The fix isolates `.rows` properly: `const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows.rows || []);`

### Follow-Up Bug Discovery 3 (Test Timeout)
- The final failure was simply a `Timeout`. The sequence of 6 `fetch` requests inside one single test hit the Neon Postgres remote DB consecutively, occasionally pushing past Bun's default 5000ms test limit.
- Solved by explicitly passing `15000` ms to the `it(...)` signature.
