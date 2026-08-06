@echo off
setlocal
chcp 65001 >nul
title ERP - Share Public Order Page (Internet)
cd /d "%~dp0"

echo.
echo Starting the public order page sharing...
echo (first run downloads a small free tunnel client from Cloudflare)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0share-public-order.ps1"

echo.
pause
