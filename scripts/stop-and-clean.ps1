$ErrorActionPreference = "Continue"
Set-Location "E:\сайт апи"
$targets = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
  $_.CommandLine -match "next dev|opennextjs-cloudflare|wrangler dev"
}
foreach ($t in $targets) {
  Write-Output ("stopping PID " + $t.ProcessId + " :: " + $t.CommandLine.Substring(0, [Math]::Min(120, $t.CommandLine.Length)))
  Stop-Process -Id $t.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
foreach ($d in @(".next", ".open-next", ".wrangler\tmp")) {
  if (Test-Path $d) { Remove-Item -Recurse -Force $d; Write-Output ("removed " + $d) }
}
Write-Output "clean-done"
