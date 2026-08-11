@echo off
setlocal
chcp 65001 >nul
title ERP Server - Sales Management
cd /d "%~dp0"

echo ============================================
echo   ERP Sales Management - Server Launcher
echo ============================================
echo.

rem Resolve a PHP 8.3+ binary: prefer C:\xampp\php84 (this dev machine), else PATH php.
set "PHP=php"
if exist "C:\xampp\php84\php.exe" set "PHP=C:\xampp\php84\php.exe"
%PHP% -r "if (PHP_VERSION_ID < 80300) { fwrite(STDERR, 'found ' . PHP_VERSION . PHP_EOL); exit(1); }" 2>nul
if errorlevel 1 (
    echo [ERROR] PHP 8.3+ is required but the resolved PHP is too old.
    echo         This project needs Laravel 13 / PHP ^8.3 (XAMPP ships PHP 8.0).
    echo         On this machine install it at C:\xampp\php84\php.exe
    echo         (or add a PHP 8.3+ binary to your PATH), then run again.
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking sqlite database...
if not exist "database\database.sqlite" (
    type nul > "database\database.sqlite"
    echo       Created empty database/database.sqlite
) else (
    echo       database/database.sqlite found
)
echo.

echo [2/4] Applying pending migrations (no-op if already applied)...
"%PHP%" artisan migrate --force
echo.

echo [3/4] Clearing cached config/routes...
"%PHP%" artisan optimize:clear >nul 2>nul
echo.

echo [4/5] Starting control helper (port 8777)...
start "ERP Control Helper" /MIN cmd /C ""%PHP%" -S 0.0.0.0:8777 server-helper\router.php"
timeout /t 2 /nobreak >nul
echo       Control page: http://localhost:8777
echo.

echo [5/5] Starting main server...
echo.
echo   Local:   http://localhost:8000
echo   Network: http://192.168.1.61:8000
echo   Control: http://localhost:8777  (تشغيل/إيقاف/تشخيص)
echo   Press Ctrl+C to stop the server.
echo.

"%PHP%" artisan serve --host=0.0.0.0 --port=8000

echo.
echo Server stopped.
pause
