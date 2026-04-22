# Start Droply Development Environment
# This script starts both the email server and frontend simultaneously

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Droply Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Email Server in background
Write-Host "[1/2] Starting Email Server on Port 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command npm run email-server" -WorkingDirectory $PSScriptRoot

# Wait for email server to start
Start-Sleep -Seconds 2

# Start Vite Frontend
Write-Host "[2/2] Starting Vite Frontend on Port 5173..." -ForegroundColor Green
npm run dev

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Droply Development Ready" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Email Server:  http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend:      http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
