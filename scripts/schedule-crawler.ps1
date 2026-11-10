# Registers two Windows scheduled tasks for the TokenRate crawler.
#   TokenRate-Health  every 30 minutes  → crawler health  + push to D1
#   TokenRate-Prices  daily at 04:00    → crawler prices  + push to D1
# Run once from the project root:  powershell -ExecutionPolicy Bypass -File scripts\schedule-crawler.ps1
# Remove:  Unregister-ScheduledTask -TaskName TokenRate-Health -Confirm:$false  (same for -Prices)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Register-CrawlerTask($name, $script, $trigger) {
    $cmd = Join-Path $root "scripts\$script"
    if (-not (Test-Path $cmd)) { throw "missing $cmd" }
    $action = New-ScheduledTaskAction -Execute $cmd -WorkingDirectory $root
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Write-Output "registered $name ($script)"
}

$healthTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::FromDays(3650))
Register-CrawlerTask -name "TokenRate-Health" -script "crawl-health.cmd" -trigger $healthTrigger

$pricesTrigger = New-ScheduledTaskTrigger -Daily -At "04:00"
Register-CrawlerTask -name "TokenRate-Prices" -script "crawl-prices.cmd" -trigger $pricesTrigger
