@echo off
title Sales Management - Development Server

echo =====================================
echo Starting Laravel Server...
echo =====================================

start "Laravel" cmd /k "cd /d %~dp0 && php artisan serve"

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