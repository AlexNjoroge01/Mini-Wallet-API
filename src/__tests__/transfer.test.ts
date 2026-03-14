import { describe, it, expect, afterEach } from 'bun:test';
import { BASE_URL, cleanDb } from './helpers';

afterEach(cleanDb);

describe('POST /transactions/transfer', () => {
  async function setupWallets() {
    const sRes = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: 'Sender' })
    });
    const { data: sender } = await sRes.json();

    const rRes = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: 'Receiver' })
    });
    const { data: receiver } = await rRes.json();

    await fetch(`${BASE_URL}/transactions/deposit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_id: sender.id, amount: '1000.00' })
    });

    return { sender, receiver };
  }

  it('valid transfer deducts from sender and credits receiver', async () => {
    const { sender, receiver } = await setupWallets();

    const res = await fetch(`${BASE_URL}/transactions/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_wallet_id: sender.id, receiver_wallet_id: receiver.id, amount: '250.00' })
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const sCheck = await fetch(`${BASE_URL}/wallets/${sender.id}`);
    expect((await sCheck.json()).data.balance).toBe('750.00');

    const rCheck = await fetch(`${BASE_URL}/wallets/${receiver.id}`);
    expect((await rCheck.json()).data.balance).toBe('250.00');

    const hCheck = await fetch(`${BASE_URL}/wallets/${sender.id}/transactions`);
    const historyBody = await hCheck.json();
    // history length = 2 (deposit + transfer)
    expect(historyBody.data.length).toBe(2);
  }, 15000);

  it('returns 422 for insufficient funds', async () => {
    const { sender, receiver } = await setupWallets();

    const res = await fetch(`${BASE_URL}/transactions/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_wallet_id: sender.id, receiver_wallet_id: receiver.id, amount: '2000.00' })
    });
    
    expect(res.status).toBe(422);
    
    // Validate failed transaction was recorded
    const hCheck = await fetch(`${BASE_URL}/wallets/${sender.id}/transactions`);
    const historyBody = await hCheck.json();
    expect(historyBody.data.length).toBe(2);
    expect(historyBody.data[0].status).toBe('failed');
  });

  it('returns 404 if sender does not exist', async () => {
    const { receiver } = await setupWallets();
    const res = await fetch(`${BASE_URL}/transactions/transfer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_wallet_id: '123e4567-e89b-12d3-a456-426614174000', receiver_wallet_id: receiver.id, amount: '100.00' })
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 if receiver does not exist', async () => {
    const { sender } = await setupWallets();
    const res = await fetch(`${BASE_URL}/transactions/transfer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_wallet_id: sender.id, receiver_wallet_id: '123e4567-e89b-12d3-a456-426614174000', amount: '100.00' })
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 if sender and receiver are the same', async () => {
    const { sender } = await setupWallets();
    const res = await fetch(`${BASE_URL}/transactions/transfer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_wallet_id: sender.id, receiver_wallet_id: sender.id, amount: '100.00' })
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for amount = 0, negative, or invalid string', async () => {
    const { sender, receiver } = await setupWallets();
    const amounts = ['0', '-50.00', 'abc'];
    
    for (const amt of amounts) {
      const res = await fetch(`${BASE_URL}/transactions/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_wallet_id: sender.id, receiver_wallet_id: receiver.id, amount: amt })
      });
      expect(res.status).toBe(400);
    }
  });

  it('handles duplicate idempotency key correctly', async () => {
    const { sender, receiver } = await setupWallets();
    
    const reqBody = JSON.stringify({
      sender_wallet_id: sender.id,
      receiver_wallet_id: receiver.id,
      amount: '50.00',
      idempotency_key: 'tx-key-123'
    });

    const res1 = await fetch(`${BASE_URL}/transactions/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reqBody
    });
    const res2 = await fetch(`${BASE_URL}/transactions/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reqBody
    });

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(body1.data.id).toBe(body2.data.id);

    const sCheck = await fetch(`${BASE_URL}/wallets/${sender.id}`);
    expect((await sCheck.json()).data.balance).toBe('950.00'); // Deducted only once
  });
});
