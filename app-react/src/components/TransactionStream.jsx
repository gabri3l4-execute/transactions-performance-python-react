import React, { useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import useTransactionStream from "../hooks/useTransactionStream";

const TransactionRow = React.memo(function TransactionRow({
  transaction,
  index,
}) {
  const isNegative = transaction.amount < 0;
  const isLatestTransaction = index === 0;
  return (
    <div
      key={transaction.transaction_id}
      className="transaction-item"
      data-type="transaction"
      data-account-id={transaction.account_id}
      data-amount={transaction.amount}
      data-balance={transaction.balance}
    >
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
      {isLatestTransaction && (
        <div className="balance-info">
          The current account balance is <code>${transaction.balance}</code>
        </div>
      )}
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
            <TransactionRow transaction={t} index={index} />
          )}
          overscan={200}
        />
      </div>
    </div>
  );
}
