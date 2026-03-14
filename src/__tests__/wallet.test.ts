import { describe, it, expect, afterEach } from 'bun:test';
import { BASE_URL, cleanDb } from './helpers';

afterEach(cleanDb);

describe('POST /wallets', () => {
  it('creates a wallet successfully', async () => {
    const res = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: 'Alex' })
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.owner_name).toBe('Alex');
    expect(body.data.balance).toBe('0.00'); // Note: pg numeric returns as string in postgres/drizzle
  });

  it('rejects missing owner_name', async () => {
    const res = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty owner_name', async () => {
    const res = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: '' })
    });
    const body = await res.json();

    expect(res.status).toBe(400);
  });
});

describe('GET /wallets/:id', () => {
  it('gets a wallet by valid ID', async () => {
    const createRes = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: 'Bob' })
    });
    const { data: wallet } = await createRes.json();

    const res = await fetch(`${BASE_URL}/wallets/${wallet.id}`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(wallet.id);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await fetch(`${BASE_URL}/wallets/123e4567-e89b-12d3-a456-426614174000`);
    const body = await res.json();
    
    expect(res.status).toBe(404);
    expect(body.error.code).toBe('WALLET_NOT_FOUND');
  });

  it('returns 400 for invalid UUID format', async () => {
    const res = await fetch(`${BASE_URL}/wallets/invalid-id`);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
