@echo off
chcp 65001 >nul
cd /d "%~dp0"
set CLOUDFLARE_ACCOUNT_ID=60973ac834dd2a0c9e27b18325a5b256
title wrangler tail tokenprice
echo Streaming live logs for tokenprice. Ctrl+C to stop.
echo.
npx wrangler tail tokenprice
echo.
echo Stream stopped. Press any key to close.
pause >nul
