# Registers two Windows scheduled tasks for the TokenRate crawler.
#   TokenRate-Health  every 30 minutes  → crawler health
#   TokenRate-Prices  daily at 04:00    → crawler prices
# Run once from the project root:  powershell -ExecutionPolicy Bypass -File scripts\schedule-crawler.ps1
# Remove:  Unregister-ScheduledTask -TaskName TokenRate-Health -Confirm:$false  (same for -Prices)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
if (-not $npx) { throw "npx.cmd not found in PATH" }

function Register-CrawlerTask($name, $command, $trigger) {
    $action = New-ScheduledTaskAction -Execute $npx -Argument "tsx crawler/index.ts $command" -WorkingDirectory $root
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Write-Output "registered $name ($command)"
}

$healthTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::FromDays(3650))
Register-CrawlerTask -name "TokenRate-Health" -command "health" -trigger $healthTrigger

$pricesTrigger = New-ScheduledTaskTrigger -Daily -At "04:00"
Register-CrawlerTask -name "TokenRate-Prices" -command "prices" -trigger $pricesTrigger
