@echo off
setlocal
chcp 65001 >nul
title ERP - Share Public Order Page (Internet)
cd /d "%~dp0"

echo.
echo Starting the public order page sharing...
echo (uses Tailscale Funnel - permanent URL, no downloads, no domain)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0share-public-order.ps1"

echo.
pause
