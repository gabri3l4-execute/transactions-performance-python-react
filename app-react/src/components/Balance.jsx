import React, { useEffect, useState } from 'react';
import { getAccount } from '../api';

export default function Balance({ accountId, pollInterval = null }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAccount(accountId);
      if (!data) {
        setError('Account not found');
        setBalance(null);
      } else {
        setBalance(data.balance);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accountId) return;
    fetchBalance();
    if (pollInterval) {
      const id = setInterval(fetchBalance, pollInterval);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, pollInterval]);

  if (!accountId) return <div>Please provide an account ID.</div>;
  if (loading) return <div>Loading balance…</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  return <div>Balance: ${Number(balance).toFixed(2)}</div>;
}
