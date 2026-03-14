import { describe, it, expect, afterEach } from 'bun:test';
import { BASE_URL, cleanDb } from './helpers';

afterEach(cleanDb);

describe('POST /transactions/deposit', () => {
  it('deposits valid amount and creates transaction record', async () => {
    const createRes = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: 'Charlie' })
    });
    const { data: wallet } = await createRes.json();

    const res = await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_id: wallet.id, amount: '150.00' })
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.amount).toBe('150.00');

    // Check balance
    const walletRes = await fetch(`${BASE_URL}/wallets/${wallet.id}`);
    const walletBody = await walletRes.json();
    expect(walletBody.data.balance).toBe('150.00');

    // Check transaction history
    const historyRes = await fetch(`${BASE_URL}/wallets/${wallet.id}/transactions`);
    const historyBody = await historyRes.json();
    expect(historyBody.data.length).toBe(1);
    expect(historyBody.data[0].amount).toBe('150.00');
  });

  it('returns 404 for non-existent wallet', async () => {
    const res = await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_id: '123e4567-e89b-12d3-a456-426614174000', amount: '100.00' })
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for amount = 0', async () => {
    const res = await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_id: '123e4567-e89b-12d3-a456-426614174000', amount: '0' })
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const res = await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_id: '123e4567-e89b-12d3-a456-426614174000', amount: '-10' })
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric string', async () => {
    const res = await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_id: '123e4567-e89b-12d3-a456-426614174000', amount: 'abc' })
    });
    expect(res.status).toBe(400);
  });

  it('handles duplicate idempotency key correctly', async () => {
    const createRes = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: 'Dave' })
    });
    const { data: wallet } = await createRes.json();

    const reqBody = JSON.stringify({
      wallet_id: wallet.id,
      amount: '50.00',
      idempotency_key: 'idemp-deposit-1'
    });

    const res1 = await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: reqBody
    });
    const body1 = await res1.json();

    const res2 = await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: reqBody
    });
    const body2 = await res2.json();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Should be exactly the same transaction ID returned
    expect(body1.data.id).toBe(body2.data.id);

    // Balance should only be 50.00
    const walletRes = await fetch(`${BASE_URL}/wallets/${wallet.id}`);
    const walletBody = await walletRes.json();
    expect(walletBody.data.balance).toBe('50.00');
  });
});
