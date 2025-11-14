import React, { useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import useTransactionStream from "../hooks/useTransactionStream";

const TransactionRow = React.memo(function TransactionRow({
  transaction,
  isLatestTransaction,
}) {
  const isNegative = transaction.amount < 0;
  // Server supplies `created_at` as "YYYY-MM-DD HH:MM:SS"; make it JS Date-friendly
  let createdAtDisplay = transaction.created_at || null;
  try {
    if (transaction.created_at) {
      const dt = new Date(transaction.created_at.replace(" ", "T"));
      createdAtDisplay = isNaN(dt.getTime())
        ? transaction.created_at
        : dt.toLocaleString();
    }
  } catch (e) {
    // fallback to raw string
    createdAtDisplay = transaction.created_at;
  }

  return (
    <div
      key={transaction.transaction_id}
      className="transaction-item"
      data-type="transaction"
      data-account-id={transaction.account_id}
      data-amount={transaction.amount}
      data-balance={transaction.balance}
      data-created-at={transaction.created_at}
    >
      <div className="tx-meta">
        <div>
          <strong>ID:</strong> {transaction.transaction_id}
        </div>
        <div>
          <strong>Time:</strong> {createdAtDisplay}
        </div>
      </div>

      {isNegative ? (
        <div className="withdrawal">
          <div>Transaction amount (withdrawal)</div>
          <div>
            Transferred <code>${Math.abs(transaction.amount)}</code> from
            account <strong>{transaction.account_id}</strong>
          </div>
        </div>
      ) : (
        <div className="deposit">
          <div>Transaction amount (deposit)</div>
          <div>
            Transferred <code>${transaction.amount}</code> to account{" "}
            <strong>{transaction.account_id}</strong>
          </div>
        </div>
      )}

      <div className="balance-line">
        <strong>Balance:</strong>{' '}
        <code>
          {transaction.balance == null ? '...' : `$${transaction.balance}`}
        </code>
        {transaction.optimistic && <span className="pending-badge"> (pending)</span>}
        {isLatestTransaction && <span className="latest-badge"> (latest)</span>}
      </div>
    </div>
  );
});

export default function TransactionStream({ injectedTransactions = [], onLatestBalances }) {
  // If we added ?stream=true on server then use '/transactions?stream=true'
  const { transactions, status, error, stop } = useTransactionStream(
    "http://127.0.0.1:8000/transactions/v2"
  );

  // merge optimistic/injected transactions (from parent) with streamed ones
  const data = useMemo(() => {
    // injectedTransactions are assumed to be newest-first so keep them at front
    if (!injectedTransactions || injectedTransactions.length === 0) return transactions;
    return [...injectedTransactions, ...transactions];
  }, [injectedTransactions, transactions]);

  // Notify parent about the latest known balances per account so the parent
  // can estimate balances for optimistic transactions.
  React.useEffect(() => {
    if (typeof onLatestBalances !== "function") return;
    try {
      const map = new Map();
      for (const t of data) {
        if (t && t.account_id != null && t.balance != null) {
          // first occurrence is the newest (data is newest-first)
          if (!map.has(t.account_id)) map.set(t.account_id, t.balance);
        }
      }
      // convert to plain object
      const obj = {};
      for (const [k, v] of map.entries()) obj[k] = v;
      onLatestBalances(obj);
    } catch (e) {
      // swallow — reporting balances is optional
    }
  }, [data, onLatestBalances]);

  return (
    <div>
      <h3>Transactions ({data.length})</h3>
      <div>Status: {status}</div>
      {error && <div style={{ color: "red" }}>Error: {error.message}</div>}
      <button onClick={stop}>Stop stream</button>

      {/* Fixed-height container required for virtualization */}
      <div style={{ height: "50vh" }}>
        <Virtuoso
          data={data}
          itemContent={(index, t) => (
            // server now returns newest-first ordering, so index===0 is latest
            <TransactionRow transaction={t} isLatestTransaction={index === 0} />
          )}
          overscan={200}
        />
      </div>
    </div>
  );
}
