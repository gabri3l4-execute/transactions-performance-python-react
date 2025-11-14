import React, { useState } from 'react';
import { createTransaction, getAccount } from '../api';

export default function TransactionForm({ accountId: initialAccountId = '', onBalanceUpdated }) {
  const [accountId, setAccountId] = useState(initialAccountId);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const amt = parseFloat(amount);
    if (isNaN(amt)) return setErr('Invalid amount');
    if (!accountId) return setErr('Account ID required');
    setSubmitting(true);
    try {
      await createTransaction(accountId, amt);
      const acct = await getAccount(accountId);
      if (onBalanceUpdated) onBalanceUpdated(acct ? acct.balance : null);
      setAmount('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label>Account ID:</label>
        <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Amount:</label>
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      {err && <div style={{ color: 'red' }}>{err}</div>}
      <button type="submit" disabled={submitting}>Add Transaction</button>
    </form>
  );
}
