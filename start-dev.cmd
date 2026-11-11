@echo off
chcp 65001 >nul
cd /d "%~dp0"
set CLOUDFLARE_ACCOUNT_ID=60973ac834dd2a0c9e27b18325a5b256
title dev server 8788
echo Starting wrangler dev on http://127.0.0.1:8788
echo Leave this window open. Close it or press Ctrl+C to stop the server.
echo.
npx wrangler dev --port 8788
echo.
echo Server stopped. Press any key to close.
pause >nul
