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
        <strong>Balance:</strong> <code>${transaction.balance}</code>
        {isLatestTransaction && <span className="latest-badge"> (latest)</span>}
      </div>
    </div>
  );
});

export default function TransactionStream() {
  // If we added ?stream=true on server then use '/transactions?stream=true'
  const { transactions, status, error, stop } = useTransactionStream(
    "http://127.0.0.1:8000/transactions/v2"
  );

  // memoize data reference so Virtuoso doesn't rerender unnecessarily
  const data = useMemo(() => transactions, [transactions]);

  return (
    <div>
      <h3>Transactions ({transactions.length})</h3>
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
