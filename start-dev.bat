@echo off
title Sales Management - Development Server

echo =====================================
echo Starting Laravel Server...
echo =====================================

rem Resolve a PHP 8.3+ binary: prefer C:\xampp\php84 (this dev machine), else PATH php.
set "PHP=php"
if exist "C:\xampp\php84\php.exe" set "PHP=C:\xampp\php84\php.exe"
%PHP% -r "if (PHP_VERSION_ID < 80300) { exit(1); }" 2>nul
if errorlevel 1 (
    echo [ERROR] PHP 8.3+ is required but the resolved PHP is too old.
    echo         Install PHP 8.4 at C:\xampp\php84 (or add it to your PATH), then run again.
    pause
    exit /b 1
)

start "Laravel" cmd /k "cd /d %~dp0 && "%PHP%" artisan serve"

timeout /t 3 >nul

echo =====================================
echo Starting React (Vite)...
echo =====================================

start "Vite" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo =====================================
echo All development servers are running.
echo =====================================

exit