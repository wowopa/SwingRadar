param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$ComposeFile = "docker-compose.yml",
  [string]$AppUrl = "http://localhost:3000",
  [string]$DailyTaskName = "SwingRadarDailyKrxCycle",
  [string]$AutoHealTaskName = "SwingRadarAutoHeal"
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

Write-Output "SwingRadar production stack check"
Write-Output ("ProjectRoot: {0}" -f $ProjectRoot)
Write-Output ("ComposeFile: {0}" -f $ComposeFile)
Write-Output ""

Write-Output "[docker compose ps]"
docker compose -f $ComposeFile ps

Write-Output ""
Write-Output "[api health]"
try {
  $health = Invoke-RestMethod -Uri "$AppUrl/api/health" -TimeoutSec 15
  $health | ConvertTo-Json -Depth 5
} catch {
  Write-Output ("health request failed: {0}" -f $_.Exception.Message)
}

Write-Output ""
Write-Output "[scheduled tasks]"
schtasks /Query /TN $DailyTaskName 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Output ("missing task: {0}" -f $DailyTaskName)
}

schtasks /Query /TN $AutoHealTaskName 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Output ("missing task: {0}" -f $AutoHealTaskName)
}
