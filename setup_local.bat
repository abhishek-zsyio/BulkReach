@echo off
rem setup_local.bat
rem Click-to-run setup assistant for Windows

echo Starting BulkReach Local Setup Assistant...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_local.ps1"
echo.
pause
