const API_BASE = 'http://localhost:8000'; // Sanic server

export async function createTransaction(accountId, amount) {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, amount })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { transaction_id: "..." }
}

export async function getAccount(accountId) {
  const res = await fetch(`${API_BASE}/accounts/${encodeURIComponent(accountId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { account_id, balance }
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function verifyBalances() {
  const res = await fetch(`${API_BASE}/accounts/verify`);
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { ok, accounts_sum, transactions_sum, difference }
}

export default {
  createTransaction,
  getAccount,
  getHealth,
  verifyBalances
};
