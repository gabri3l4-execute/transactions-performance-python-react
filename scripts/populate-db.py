import random
import sqlite3

DB_PATH = '../app-sanic/transactions.db'

ACCOUNT_IDS = ['account1', 'account2', 'account3', 'account4', 'account5']
TRANSACTIONS_PER_ACCOUNT = 10000

"""
This script populates the database with random transactions.
Make sure you have the database file in the correct location.
"""
def populate_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        for _ in range(TRANSACTIONS_PER_ACCOUNT):
            for account_id in ACCOUNT_IDS:
                amount = round(random.uniform(-1000, 1000), 2)
                cursor.execute(
                    'INSERT INTO transactions (account_id, amount) VALUES (?, ?)',
                    (account_id, amount)
                )
        conn.commit()

if __name__ == '__main__':
    populate_db()
    print(f"Database populated with {len(ACCOUNT_IDS) * TRANSACTIONS_PER_ACCOUNT} transactions")