# setup_local.ps1
# BulkReach - Local Setup Assistant (Windows)

# Clear error action to handle connection attempts silently
$ErrorActionPreference = "SilentlyContinue"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "        BulkReach - Local Setup Assistant (Windows)            " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Prerequisite checker function
function Check-Command ($cmd, $name, $required) {
    $exists = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($exists) {
        $version = ""
        if ($cmd -eq "node") {
            $version = " (" + (node -v).Trim() + ")"
        } elseif ($cmd -eq "python") {
            $version = " (" + (python --version | Out-String).Trim().Split(" ")[1] + ")"
        }
        Write-Host "   [ OK ] $name is installed.$version" -ForegroundColor Green
        return $true
    } else {
        if ($required -eq $true) {
            Write-Host "   [FAIL] $name is NOT installed. (Required)" -ForegroundColor Red
            return $false
        } else {
            Write-Host "   [WARN] $name is NOT installed. (Optional)" -ForegroundColor Yellow
            return $true
        }
    }
}

Write-Host "`nChecking System Prerequisites..." -ForegroundColor Yellow
$hasPrereqs = $true
$hasPrereqs = (Check-Command "node" "Node.js" $true) -and $hasPrereqs
$hasPrereqs = (Check-Command "npm" "NPM" $true) -and $hasPrereqs
$hasPrereqs = (Check-Command "python" "Python 3" $true) -and $hasPrereqs
$hasPrereqs = (Check-Command "git" "Git" $true) -and $hasPrereqs
$hasPrereqs = (Check-Command "docker" "Docker" $false) -and $hasPrereqs

if (-not $hasPrereqs) {
    Write-Host "`n[FAIL] Prerequisite checks failed. Please install the required software listed above and re-run setup." -ForegroundColor Red
    Exit
}

# Step 1: Check Environment Files
Write-Host "`n[Step 1/4] Verifying Environment Variables Configuration..." -ForegroundColor Yellow

$backendDir = Join-Path $PSScriptRoot "bulkreach\backend"
$frontendDir = Join-Path $PSScriptRoot "bulkreach/frontend"
$backendEnvFile = Join-Path $backendDir ".env"
$frontendEnvFile = Join-Path $frontendDir ".env"
$envSetupFile = Join-Path $PSScriptRoot "env_setup.md"

$googleId = ""
$googleSecret = ""
$configureOauthRun = $false

if (-not (Test-Path $backendEnvFile)) {
    Write-Host "[WARN] Warning: Backend .env file not found in $backendEnvFile." -ForegroundColor Yellow
    if (Test-Path $envSetupFile) {
        Write-Host "Extracting backend .env template from env_setup.md..." -ForegroundColor Green
        
        $envSetupContent = Get-Content -Path $envSetupFile -Raw
        $backendRegex = "(?s)## .*?Backend Configuration.*?\`\`\`env\r?\n(.*?)\`\`\`"
        $backendMatch = [regex]::Match($envSetupContent, $backendRegex)
        if ($backendMatch.Success) {
            $backendMatch.Groups[1].Value | Out-File -FilePath $backendEnvFile -Encoding utf8 -NoNewline
            Write-Host "Successfully generated backend/.env template." -ForegroundColor Green
            
            # Interactively prompt for Google OAuth Client secrets
            Write-Host "`nGoogle OAuth Setup Assistant" -ForegroundColor Yellow
            $doOauth = Read-Host "Would you like to configure your Google OAuth credentials now? (y/n) [default n]"
            if ($doOauth -like "y*" -or $doOauth -like "Y*") {
                $googleId = Read-Host "Enter Google OAuth Client ID"
                $googleSecret = Read-Host "Enter Google OAuth Client Secret"
                $googleId = $googleId.Trim()
                $googleSecret = $googleSecret.Trim()
                
                if ($googleId) {
                    $envContent = Get-Content -Path $backendEnvFile -Raw
                    $envContent = $envContent -replace "(?m)^GOOGLE_CLIENT_ID=.*", "GOOGLE_CLIENT_ID=$googleId"
                    $envContent | Out-File -FilePath $backendEnvFile -Encoding utf8 -NoNewline
                }
                if ($googleSecret) {
                    $envContent = Get-Content -Path $backendEnvFile -Raw
                    $envContent = $envContent -replace "(?m)^GOOGLE_CLIENT_SECRET=.*", "GOOGLE_CLIENT_SECRET=$googleSecret"
                    $envContent | Out-File -FilePath $backendEnvFile -Encoding utf8 -NoNewline
                }
                Write-Host "[OK] Google credentials written to backend/.env." -ForegroundColor Green
                $configureOauthRun = $true
            } else {
                Write-Host "Using default placeholders for Google OAuth variables." -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "[OK] Backend .env file found." -ForegroundColor Green
}

if (-not (Test-Path $frontendEnvFile)) {
    Write-Host "[WARN] Warning: Frontend .env file not found in $frontendEnvFile." -ForegroundColor Yellow
    if (Test-Path $envSetupFile) {
        Write-Host "Extracting frontend .env template from env_setup.md..." -ForegroundColor Green
        
        $envSetupContent = Get-Content -Path $envSetupFile -Raw
        $frontendRegex = "(?s)## .*?Frontend Configuration.*?\`\`\`env\r?\n(.*?)\`\`\`"
        $frontendMatch = [regex]::Match($envSetupContent, $frontendRegex)
        if ($frontendMatch.Success) {
            $frontendMatch.Groups[1].Value | Out-File -FilePath $frontendEnvFile -Encoding utf8 -NoNewline
            Write-Host "Successfully generated frontend/.env template." -ForegroundColor Green
            
            # Inject Google Client ID if configured in the step above
            if ($configureOauthRun -and $googleId) {
                $frontContent = Get-Content -Path $frontendEnvFile -Raw
                $frontContent = $frontContent -replace "(?m)^VITE_GOOGLE_CLIENT_ID=.*", "VITE_GOOGLE_CLIENT_ID=$googleId"
                $frontContent | Out-File -FilePath $frontendEnvFile -Encoding utf8 -NoNewline
                Write-Host "[OK] Synced Google Client ID to frontend/.env." -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "[OK] Frontend .env file found." -ForegroundColor Green
}

# Step 2: Choose Setup Type
Write-Host "`n[Step 2/4] Choose Setup Type" -ForegroundColor Yellow
Write-Host "How would you like to run the databases (PostgreSQL, Redis) and services?"
Write-Host "  1) Docker Compose (runs everything in Docker containers - recommended)"
Write-Host "  2) Completely Natively (runs Postgres, Redis, Django, and React locally on host PC)"
$setupChoice = Read-Host "Enter choice [1 or 2]"

if ($setupChoice -eq "1") {
    # --- DOCKER SETUP ---
    Write-Host "`nSetting up with Docker Compose..." -ForegroundColor Yellow
    
    # Check if Docker is running
    docker info > $null 2>&1
    if (-not $?) {
        Write-Host "[ERROR] Error: Docker daemon is not running. Please open Docker Desktop on your PC and wait for it to start before continuing." -ForegroundColor Red
        Exit
    }
    
    Write-Host "[OK] Docker daemon is active." -ForegroundColor Green
    Set-Location "$PSScriptRoot\bulkreach"
    
    Write-Host "Building and starting Docker services..." -ForegroundColor Blue
    docker compose up -d db redis backend
    
    Write-Host "Waiting for Database to start up..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host "Running Django migrations in Docker..." -ForegroundColor Blue
    docker compose exec backend python manage.py migrate
    
    $createSu = Read-Host "Would you like to create a superuser admin account now? (y/n)"
    if ($createSu -like "y*" -or $createSu -like "Y*") {
        docker compose exec backend python manage.py createsuperuser
    }
    
    Write-Host "Starting remaining services (celery, beat, frontend)..." -ForegroundColor Blue
    docker compose up -d
    
    Write-Host "`n================================================================" -ForegroundColor Green
    Write-Host "Setup Complete! BulkReach is running via Docker Compose." -ForegroundColor Green
    Write-Host "   - Frontend: http://localhost:5173" -ForegroundColor Green
    Write-Host "   - Backend API: http://localhost:8000" -ForegroundColor Green
    Write-Host "   - API Docs: http://localhost:8000/api/docs/" -ForegroundColor Green
    Write-Host "   - Django Admin: http://localhost:8000/admin/" -ForegroundColor Green
    Write-Host "`nTo see logs, run: docker compose logs -f" -ForegroundColor Yellow
    Write-Host "To stop services, run: docker compose down" -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Green

} else {
    # --- NATIVE SETUP ---
    Write-Host "`nSetting up Natively without Docker..." -ForegroundColor Yellow
    
    # Check Redis
    Write-Host "Checking local services status..." -ForegroundColor Yellow
    $redisSocket = New-Object System.Net.Sockets.TcpClient
    try {
        $redisSocket.Connect("127.0.0.1", 6379)
        if ($redisSocket.Connected) {
            Write-Host "   [ OK ] Redis is running on port 6379." -ForegroundColor Green
            $redisSocket.Close()
        }
    } catch {
        Write-Host "   [ WARN ] Redis is NOT running on port 6379." -ForegroundColor Yellow
        Write-Host "            (Please install and start Redis for Windows before running start_local.ps1)" -ForegroundColor Yellow
    }
    
    # Check Postgres
    $postgresSocket = New-Object System.Net.Sockets.TcpClient
    try {
        $postgresSocket.Connect("127.0.0.1", 5432)
        if ($postgresSocket.Connected) {
            Write-Host "   [ OK ] PostgreSQL is running on port 5432." -ForegroundColor Green
            $postgresSocket.Close()
            Write-Host "            Note: Make sure a PostgreSQL role and database named 'bulkreach' exist." -ForegroundColor Yellow
            Write-Host "            If not, run: CREATE DATABASE bulkreach; CREATE USER bulkreach WITH PASSWORD 'password'; GRANT ALL PRIVILEGES ON DATABASE bulkreach TO bulkreach;" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   [ WARN ] PostgreSQL is NOT running on port 5432." -ForegroundColor Yellow
        Write-Host "            (Please install and start PostgreSQL for Windows before running start_local.ps1)" -ForegroundColor Yellow
    }
    
    # Setup Python environment
    Write-Host "`n[Step 3/4] Setting up Backend Python Environment..." -ForegroundColor Yellow
    Set-Location $backendDir
    
    if (-not (Test-Path "venv")) {
        Write-Host "Creating virtual environment (venv)..." -ForegroundColor Blue
        python -m venv venv
    }
    
    Write-Host "Activating virtual environment & installing dependencies..." -ForegroundColor Blue
    # Spawn in powershell context
    $env:PATH = "$(Join-Path $backendDir 'venv\Scripts');$env:PATH"
    python -m pip install --upgrade pip
    
    # Run pip install and check status
    $pipInstall = Start-Process python -ArgumentList "-m pip install -r requirements.txt" -Wait -NoNewWindow -PassThru
    if ($pipInstall.ExitCode -ne 0) {
        Write-Host "[FAIL] Failed to install Python dependencies. Please verify your Python configuration and environment." -ForegroundColor Red
        Exit
    }
    
    Write-Host "Running Django migrations..." -ForegroundColor Blue
    python manage.py migrate
    
    Write-Host "Installing Playwright web driver (Phase 2 Scraper)..." -ForegroundColor Blue
    $playwrightInstall = Start-Process playwright -ArgumentList "install chromium" -Wait -NoNewWindow -PassThru
    if ($playwrightInstall.ExitCode -ne 0) {
        Write-Host "[WARN] Warning: Playwright browser download failed. You can run 'playwright install chromium' manually later." -ForegroundColor Yellow
    }
    
    $createSu = Read-Host "Would you like to create a superuser admin account now? (y/n)"
    if ($createSu -like "y*" -or $createSu -like "Y*") {
        python manage.py createsuperuser
    }
    
    # Setup Frontend React app
    Write-Host "`n[Step 4/4] Setting up Frontend React Application..." -ForegroundColor Yellow
    Set-Location $frontendDir
    
    Write-Host "Installing npm packages..." -ForegroundColor Blue
    $npmInstall = Start-Process npm -ArgumentList "install" -Wait -NoNewWindow -PassThru
    if ($npmInstall.ExitCode -ne 0) {
        Write-Host "[FAIL] npm install failed. Please check your Node/NPM version." -ForegroundColor Red
        Exit
    }
    
    Set-Location $PSScriptRoot
    Write-Host "`n================================================================" -ForegroundColor Green
    Write-Host "Native Setup Complete! Here's how to run the services:" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "`nRun this PowerShell script from the project root to start the app natively on Windows:" -ForegroundColor Yellow
    Write-Host "   .\start_local.ps1" -ForegroundColor Green
    Write-Host "`nAccess URLs:" -ForegroundColor Yellow
    Write-Host "   - Frontend Client: http://localhost:5173" -ForegroundColor Green
    Write-Host "   - Django API: http://localhost:8000" -ForegroundColor Green
    Write-Host "   - Swagger Docs: http://localhost:8000/api/docs/" -ForegroundColor Green
    Write-Host "   - Django Admin: http://localhost:8000/admin/" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
}
