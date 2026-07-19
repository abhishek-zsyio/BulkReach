# start_local.ps1
# Start BulkReach Services Natively (Windows)

# Clear error action to handle connection attempts silently
$ErrorActionPreference = "SilentlyContinue"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "        Starting BulkReach Services Natively (Windows)          " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Check Redis
$redisSocket = New-Object System.Net.Sockets.TcpClient
try {
    $redisSocket.Connect("127.0.0.1", 6379)
    if ($redisSocket.Connected) {
        Write-Host "[OK] Redis is running on port 6379." -ForegroundColor Green
        $redisSocket.Close()
    }
} catch {
    Write-Host "[WARN] Warning: Redis is not running on port 6379." -ForegroundColor Yellow
    Write-Host "   Make sure your Redis server is running before starting outreach tasks." -ForegroundColor Yellow
}

# Check PostgreSQL
$postgresSocket = New-Object System.Net.Sockets.TcpClient
try {
    $postgresSocket.Connect("127.0.0.1", 5432)
    if ($postgresSocket.Connected) {
        Write-Host "[OK] PostgreSQL is running on port 5432." -ForegroundColor Green
        $postgresSocket.Close()
    }
} catch {
    Write-Host "[WARN] Warning: PostgreSQL is not running on port 5432." -ForegroundColor Yellow
    Write-Host "   Make sure your PostgreSQL server is running before proceeding." -ForegroundColor Yellow
}

# Present options menu to user
Write-Host "`nPlease choose which services you want to launch:" -ForegroundColor Yellow
Write-Host "  1) Start All Services (Recommended)"
Write-Host "  2) Start Frontend Only (Vite Dev Server)"
Write-Host "  3) Start Backend Only (Django Server + Celery Workers)"
Write-Host "  4) Exit"
$choice = Read-Host "Enter choice [1-4, default 1]"
$choice = if ($choice) { $choice } else { "1" }

if ($choice -eq "4") {
    Write-Host "Exiting..." -ForegroundColor Green
    Exit
}

# 1. Start Backend API Server & Celery (if Option 1 or 3 selected)
if ($choice -eq "1" -or $choice -eq "3") {
    Write-Host "1. Starting Backend API Server (Django)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '   Django Backend Server (Port 8000)   ' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Set-Location '$PSScriptRoot\bulkreach\backend'; & '.\venv\Scripts\Activate.ps1'; python manage.py runserver 0.0.0.0:8000"
    
    Write-Host "2. Starting Celery Worker..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '          Celery Async Worker           ' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Set-Location '$PSScriptRoot\bulkreach\backend'; & '.\venv\Scripts\Activate.ps1'; celery -A config worker --loglevel=info --queues=default,emails,scraping"
    
    Write-Host "3. Starting Celery Beat Scheduler..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '        Celery Beat Scheduler          ' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Set-Location '$PSScriptRoot\bulkreach\backend'; & '.\venv\Scripts\Activate.ps1'; celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler"
}

# 2. Start Frontend React Client (if Option 1 or 2 selected)
if ($choice -eq "1" -or $choice -eq "2") {
    Write-Host "4. Starting Frontend React Server (Vite)..." -ForegroundColor Green
    $hasBun = Get-Command bun -ErrorAction SilentlyContinue
    $frontCmd = if ($hasBun) { "bun run dev -- --host --force" } else { "npm run dev -- --host --force" }
    $cmdName = if ($hasBun) { "Bun" } else { "NPM" }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '     Vite Frontend Client ($cmdName)    ' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Set-Location '$PSScriptRoot\bulkreach\frontend'; $frontCmd"
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "Services launched in separate PowerShell windows!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   - Frontend Client:   http://localhost:5173" -ForegroundColor Green
Write-Host "   - Backend API:       http://localhost:8000" -ForegroundColor Green
Write-Host "   - Django Admin:      http://localhost:8000/admin/" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   You can view active outputs and tracebacks in the respective windows." -ForegroundColor Yellow
Write-Host "   To stop any service, close its PowerShell window or press Ctrl+C inside it." -ForegroundColor Yellow
Write-Host "========================================================`n"
