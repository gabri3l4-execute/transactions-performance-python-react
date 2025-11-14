# start-sanic.ps1

# Navigate to the Sanic app directory
Set-Location "C:\Users\gkgab\Dev\transaction-management-main\app-sanic"

# Activate virtual environment
& ".\.venv\Scripts\Activate.ps1"

# Run the Sanic server
python server.py