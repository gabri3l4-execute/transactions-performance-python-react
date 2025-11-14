import { useState } from "react";
import TransactionStream from "./components/TransactionStream";
import "./App.css";

const API_URL = "http://localhost:8000";

function App() {
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  const validateInput = () => {
    // Reset error
    setError("");

    // Validate account ID (should not be numeric)
    if (!isNaN(accountId) && accountId !== "") {
      setError("Invalid account ID");
      return false;
    }

    // Validate amount (should be numeric)
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      setError("Invalid amount");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate input before submitting
    if (!validateInput()) {
      return;
    }

    try {
      // Create transaction
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: accountId,
          amount: parseFloat(amount),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create transaction");
      }

      const data = await response.json();

      // Fetch updated transaction
      const transactionResponse = await fetch(
        `${API_URL}/transactions/${data.transaction_id}`
      );
      const transactionData = await transactionResponse.json();

      // Fetch updated balance
      const balanceResponse = await fetch(`${API_URL}/accounts/${accountId}`);
      const balanceData = await balanceResponse.json();

      // Add transaction with balance to the list
      setTransactions((prev) => [
        {
          ...transactionData,
          balance: balanceData.balance,
        },
        ...prev,
      ]);

      // Clear both form fields
      setAccountId("");
      setAmount("");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="App">
      <div className="layout">
        <div className="left-panel">
          <h2>Submit new transaction</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Account ID:</label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                data-type="account-id"
              />
            </div>
            <div className="form-group">
              <label>Amount:</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                data-type="amount"
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" data-type="transaction-submit">
              Submit
            </button>
          </form>
        </div>

        <div className="right-panel">
          <TransactionStream />
          <h2>New transactions ({transactions.length})</h2>
          <div className="transactions-list">
            {transactions.map((tx, index) => {
              const isNegative = tx.amount < 0;
              const isLatestTransaction = index === 0;
              return (
                <div
                  key={tx.transaction_id}
                  className="transaction-item"
                  data-type="transaction"
                  data-account-id={tx.account_id}
                  data-amount={tx.amount}
                  data-balance={tx.balance}
                >
                  {isNegative ? (
                    <div className="withdrawal">
                      <div>Transaction amount (withdrawal)</div>
                      <div>
                        Transferred <code>${Math.abs(tx.amount)}</code> from
                        account <strong>{tx.account_id}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="deposit">
                      <div>Transaction amount (deposit)</div>
                      <div>
                        Transferred <code>${tx.amount}</code> to account{" "}
                        <strong>{tx.account_id}</strong>
                      </div>
                    </div>
                  )}
                  {isLatestTransaction && (
                    <div className="balance-info">
                      The current account balance is <code>${tx.balance}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
