@echo off
:: Right-click this file and select "Run as Administrator"
:: It adds the database folder to Windows Defender exclusions so it stops locking SQLite files.

echo ============================================
echo   SQLite CANTOPEN Fix - Windows Defender
echo ============================================
echo.

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: You must run this as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Adding exclusion for database folder...
powershell -Command "Add-MpPreference -ExclusionPath 'C:\xampp\htdocs\sales_managements\database'"
if %errorLevel% equ 0 (
    echo.
    echo SUCCESS! Database folder excluded from Windows Defender scanning.
    echo SQLite files will no longer be locked.
    echo.
) else (
    echo.
    echo FAILED. Try again or add manually via Windows Security settings.
    echo.
)

pause
