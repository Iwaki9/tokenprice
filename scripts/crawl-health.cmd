# Runs the crawler health probe, then syncs only the delta to Cloudflare D1.
cd /d "%~dp0.."
set CLOUDFLARE_ACCOUNT_ID=60973ac834dd2a0c9e27b18325a5b256
call npx tsx crawler/index.ts health
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
call npx tsx scripts/push-to-d1.ts --stats-only
