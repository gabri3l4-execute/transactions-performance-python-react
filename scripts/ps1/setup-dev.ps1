<#
setup-dev.ps1
PowerShell helper to set up this project for local development.

Usage examples:
# Install backend + frontend deps and populate DB
.\setup-dev.ps1

# Install and then start backend (runs in current shell)
.\setup-dev.ps1 -StartBackend

# Install and then start frontend (runs in current shell)
.\setup-dev.ps1 -StartFrontend

# Install, populate DB and open instructions only (default behaviour)
.
# This script intentionally does not start both servers in background windows; it prints the exact commands to run.
# Edit variables below if your paths differ.
#>

param(
    [switch]$StartBackend,
    [switch]$StartFrontend
)

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Repository root: $RepoRoot"

function Check-CommandExists {
    param([string]$cmd)
    $path = Get-Command $cmd -ErrorAction SilentlyContinue
    return $null -ne $path
}

# 1) Prerequisite checks
$prereqs = @('git','python','node','npm')
$missing = @()
foreach ($p in $prereqs) {
    if (-not (Check-CommandExists $p)) { $missing += $p }
}
if ($missing.Count -gt 0) {
    Write-Warning "Missing prerequisites: $($missing -join ', ')"
    Write-Host "Install them first and re-run this script. Recommended: Python 3.10+, Node 16+"
    # continue so user can still run partial steps if they have some tools
}

# 2) Python venv and pip install
$venvPath = Join-Path $RepoRoot '.venv'
$backendReqs = Join-Path $RepoRoot 'app-sanic\requirements.txt'
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating Python venv at $venvPath"
    python -m venv $venvPath
} else {
    Write-Host "Virtualenv already exists at $venvPath"
}

$pythonExe = Join-Path $venvPath 'Scripts\python.exe'
if (-not (Test-Path $pythonExe)) {
    Write-Warning "Could not find python in venv. Ensure Python is installed and venv creation succeeded."
} else {
    Write-Host "Upgrading pip and installing backend requirements..."
    & $pythonExe -m pip install --upgrade pip
    if (Test-Path $backendReqs) {
        & $pythonExe -m pip install -r $backendReqs
    } else {
        Write-Warning "No requirements file found at $backendReqs"
    }
}

# 3) Optional: populate DB if script exists
$populateScript = Join-Path $RepoRoot 'scripts\populate-db.py'
if (Test-Path $populateScript) {
    Write-Host "Found populate script: $populateScript. Running it now..."
    if (Test-Path $pythonExe) {
        & $pythonExe $populateScript
    } else {
        Write-Warning "Python executable not found in venv; running system python instead."
        python $populateScript
    }
} else {
    Write-Host "No populate-db script found at $populateScript — skipping DB population step."
}

# 4) Frontend npm install
$frontendPath = Join-Path $RepoRoot 'app-react'
if (Test-Path $frontendPath) {
    Push-Location $frontendPath
    Write-Host "Installing frontend npm dependencies in $frontendPath"
    npm install
    Pop-Location
} else {
    Write-Warning "Frontend directory not found at $frontendPath"
}

Write-Host "\n--- Setup complete ---\n"

# 5) Provide start instructions (safe, deterministic)
$backendActivateCmd = ".\.venv\Scripts\Activate.ps1; python .\app-sanic\server.py"
$frontendStartCmd = "cd app-react; npm run dev"

Write-Host "To start the backend (activate venv then run server):"
Write-Host "PowerShell (from repo root):"
Write-Host "    . $backendActivateCmd" -ForegroundColor Cyan
Write-Host "Or run directly using venv python (no activation):"
Write-Host "    .\.venv\Scripts\python.exe .\app-sanic\server.py" -ForegroundColor Cyan

Write-Host "\nTo start the frontend dev server (from repo root):"
Write-Host "    cd app-react; npm run dev" -ForegroundColor Cyan

if ($StartBackend) {
    if (Test-Path $pythonExe) {
        Write-Host "\nStarting backend now (this will run in the current shell; use Ctrl+C to stop)..." -ForegroundColor Yellow
        & $pythonExe (Join-Path $RepoRoot 'app-sanic\server.py')
    } else {
        Write-Warning "Cannot start backend: python executable not found in venv."
    }
}

if ($StartFrontend) {
    Write-Host "\nStarting frontend now (this will run in the current shell; use Ctrl+C to stop)..." -ForegroundColor Yellow
    Push-Location $frontendPath
    npm run dev
    Pop-Location
}

Write-Host "\nIf you want the script to open backend and frontend in separate terminal windows, run them manually in new PowerShell windows using the commands above."
