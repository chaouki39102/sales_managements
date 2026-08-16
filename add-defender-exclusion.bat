@echo off
REM ============================================================
REM  Add Windows Defender exclusion for the project directory.
REM  Root fix for intermittent "unable to open database file"
REM  (SQLite error 14) on the dev machine — Defender/Search
REM  Indexer momentarily lock database.sqlite during writes.
REM
REM  Run this once as administrator (it self-elevates via UAC).
REM  Idempotent — safe to re-run.
REM ============================================================
setlocal
set "TARGET=C:\xampp\htdocs\sales_managements"

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
    exit /b
)

echo Adding Defender exclusion for: %TARGET%
powershell -NoProfile -Command "Add-MpPreference -ExclusionPath '%TARGET%'"

if %errorlevel% equ 0 (
    echo.
    echo Done. Exclusion added.
    echo Restart the dev servers if they were running.
) else (
    echo.
    echo FAILED to add exclusion. Run this file as administrator manually.
)

pause
