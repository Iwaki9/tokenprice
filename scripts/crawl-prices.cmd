@echo off
rem Runs the price crawler, then syncs local data to Cloudflare D1.
cd /d "%~dp0.."
set CLOUDFLARE_ACCOUNT_ID=60973ac834dd2a0c9e27b18325a5b256
call npx tsx crawler/index.ts prices
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
call npx tsx scripts/push-to-d1.ts
