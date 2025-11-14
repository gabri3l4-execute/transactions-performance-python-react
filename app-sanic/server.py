from sanic import Sanic
import sanic.response as response
from sanic.response import json
from sanic_ext import Extend
from sanic_cors import CORS

import sqlite3
import os
import asyncio
import json as pyjson
import aiosqlite


app = Sanic("Transaction-Management-App")
app.config.CORS_ORIGINS = [
    "https://*.app.github.dev",  # allow all Codespace previews
    "http://localhost:3000"      # allow local React dev if needed
]
CORS(app, resources={r"/*": {"origins": app.config.CORS_ORIGINS}})
Extend(app)

# Database setup
DB_PATH = 'transactions.db'

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        # Only create transactions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                amount REAL NOT NULL
            )
        ''')
        # Create accounts table to keep running balances for accounts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                account_id TEXT PRIMARY KEY,
                balance REAL NOT NULL DEFAULT 0
            )
        ''')
        # Migrate existing transactions into accounts (idempotent)
        cursor.execute(
            'SELECT account_id, SUM(amount) as balance FROM transactions GROUP BY account_id'
        )
        rows = cursor.fetchall()
        for r in rows:
            acct_id = r[0]
            bal = r[1] or 0
            # Use INSERT ... ON CONFLICT to set the balance (idempotent)
            cursor.execute(
                'INSERT INTO accounts (account_id, balance) VALUES (?, ?) '
                'ON CONFLICT(account_id) DO UPDATE SET balance = excluded.balance',
                (acct_id, bal)
            )
        conn.commit()

# Initialize database before starting the server
init_db()

@app.route('/ping')
async def test(request):
    return json({'result': 'pong'})

@app.route('/transactions', methods=['POST'])
async def create_transaction(request):
    data = request.json
    account_id = data.get('account_id')
    amount = data.get('amount')
    
    if not account_id or amount is None:
        return json({'error': 'Invalid input'}, status=400)
    # Insert transaction and update account balance atomically
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('BEGIN')
        cursor.execute(
            'INSERT INTO transactions (account_id, amount) VALUES (?, ?)',
            (account_id, amount)
        )
        transaction_id = cursor.lastrowid
        # Update accounts table: insert if missing, otherwise increment balance
        cursor.execute(
            'INSERT INTO accounts (account_id, balance) VALUES (?, ?) '
            'ON CONFLICT(account_id) DO UPDATE SET balance = balance + ?',
            (account_id, amount, amount)
        )
        conn.commit()

    return json({'transaction_id': str(transaction_id)}, status=201)

@app.route('/transactions', methods=['GET'])
async def list_transactions(request):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT transaction_id, account_id, amount FROM transactions")
        transactions = cursor.fetchall()
    result = [{"transaction_id": str(t[0]), "account_id": t[1], "amount": t[2]} for t in transactions]
    return json(result)

@app.route('/transactions/v2', methods=['GET'])
async def stream_transactions(request):

    """
    Chunked JSON-array streaming endpoint (fallback for older Sanic versions).
    Emits a valid JSON array in chunks:  [obj,obj,obj]
    """

    def row_generator():
        # Yield the opening of the array, then each object (with commas), then the closing bracket.
        yield '['
        first = True
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT transaction_id, account_id, amount FROM transactions")
            for row in cursor:
                obj_json = pyjson.dumps({
                    "transaction_id": str(row[0]),
                    "account_id": row[1],
                    "amount": row[2]
                })
                if not first:
                    yield ',' + obj_json
                else:
                    yield obj_json
                    first = False
        yield ']'

    # Prefer sanic.response.stream (newer Sanic) if available
    """ if hasattr(response, 'stream'):
        async def streaming_fn(resp):
            for chunk in row_generator():
                await resp.write(chunk)

        return response.stream(streaming_fn, headers={"Content-Type": "application/json"}) """


    # Fallback: return the full array (blocking)
    all_rows = []
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT transaction_id, account_id, amount FROM transactions")
        for row in cursor:
            all_rows.append({
                "transaction_id": str(row[0]),
                "account_id": row[1],
                "amount": row[2]
            })
    return json(all_rows)

@app.route('/transactions/<transaction_id>')
async def get_transaction(request, transaction_id):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT transaction_id, account_id, amount FROM transactions WHERE transaction_id = ?',
            (transaction_id,)
        )
        transaction = cursor.fetchone()
        
        if not transaction:
            return json({'error': 'Transaction not found'}, status=404)
        
        result = {
            'transaction_id': str(transaction[0]),
            'account_id': transaction[1],
            'amount': transaction[2]
        }
        return json(result)

@app.route('/accounts/<account_id>')
async def get_account(request, account_id):
    # Read balance from accounts table (fast)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT balance FROM accounts WHERE account_id = ?', (account_id,))
        row = cursor.fetchone()
        if not row:
            return json({'error': 'Account not found'}, status=404)
        balance = row[0] or 0
        return json({
            'account_id': account_id,
            'balance': balance
        })


@app.route('/health')
async def health(request):
    """Return basic DB stats and a small sample of accounts."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM accounts')
        accounts_count = cursor.fetchone()[0]
        cursor.execute('SELECT SUM(balance) FROM accounts')
        accounts_sum = cursor.fetchone()[0] or 0
        cursor.execute('SELECT COUNT(*) FROM transactions')
        transactions_count = cursor.fetchone()[0]
        cursor.execute('SELECT SUM(amount) FROM transactions')
        transactions_sum = cursor.fetchone()[0] or 0
        cursor.execute('SELECT account_id, balance FROM accounts ORDER BY account_id LIMIT 10')
        sample = [{'account_id': r[0], 'balance': r[1]} for r in cursor.fetchall()]

    return json({
        'accounts_count': accounts_count,
        'accounts_sum': accounts_sum,
        'transactions_count': transactions_count,
        'transactions_sum': transactions_sum,
        'sample_accounts': sample
    })


@app.route('/accounts/verify')
async def verify_balances(request):
    """Verify that the sum of `accounts.balance` matches sum of `transactions.amount`.

    Returns `ok: true` when totals match (within a small epsilon) and includes totals.
    """
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT SUM(balance) FROM accounts')
        accounts_sum = cursor.fetchone()[0] or 0
        cursor.execute('SELECT SUM(amount) FROM transactions')
        transactions_sum = cursor.fetchone()[0] or 0

    diff = accounts_sum - transactions_sum
    ok = abs(diff) < 1e-9
    return json({
        'ok': ok,
        'accounts_sum': accounts_sum,
        'transactions_sum': transactions_sum,
        'difference': diff
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)