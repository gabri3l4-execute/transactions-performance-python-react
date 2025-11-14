import sqlite3

def inspect_database(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("📋 Tables found:", [t[0] for t in tables])

    # Print contents of each table
    for table_name in tables:
        print(f"\n📄 Contents of table '{table_name[0]}':")
        cursor.execute(f"SELECT * FROM {table_name[0]}")
        rows = cursor.fetchall()
        for row in rows:
            print(row)

    conn.close()

# Replace with your actual database file path
inspect_database("../app-sanic/transactions.db")