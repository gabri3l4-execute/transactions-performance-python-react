import { useState } from "react";
import TransactionStream from "./components/TransactionStream";
import "./App.css";

const API_URL = "http://localhost:8000";

function App() {
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [latestBalances, setLatestBalances] = useState({});

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
    // Optimistic UI: insert a temporary transaction immediately
    const amountNum = parseFloat(amount);
    const tempId = `temp-${Date.now()}`;
    // Estimate balance client-side when possible
    const estimatedBalance =
      latestBalances && latestBalances[accountId] != null
        ? latestBalances[accountId] + amountNum
        : null;

    const optimisticTransaction = {
      transaction_id: tempId,
      account_id: accountId,
      amount: amountNum,
      created_at: new Date().toISOString(),
      // balance may be estimated from latest known balance
      balance: estimatedBalance,
      optimistic: true,
    };

    // Add optimistic transaction to UI and clear form quickly
    setTransactions((prev) => [optimisticTransaction, ...prev]);
    setAccountId("");
    setAmount("");
    setError("");

    try {
      // Create transaction on server
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: accountId,
          amount: amountNum,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create transaction");
      }

      const data = await response.json();

      // Fetch updated transaction and balance
      const [transactionResponse, balanceResponse] = await Promise.all([
        fetch(`${API_URL}/transactions/${data.transaction_id}`),
        fetch(`${API_URL}/accounts/${accountId}`),
      ]);

      const transactionData = await transactionResponse.json();
      const balanceData = await balanceResponse.json();

      // Replace optimistic transaction with real server-provided one
      setTransactions((prev) =>
        prev.map((t) =>
          t.transaction_id === tempId
            ? { ...transactionData, balance: balanceData.balance }
            : t
        )
      );
    } catch (err) {
      // On error, remove optimistic transaction and show error
      setTransactions((prev) => prev.filter((t) => t.transaction_id !== tempId));
      setError(err.message || "Failed to create transaction");
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
          <TransactionStream
            injectedTransactions={transactions}
            onLatestBalances={(map) => setLatestBalances(map)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
