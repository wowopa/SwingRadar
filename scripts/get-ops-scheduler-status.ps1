param(
  [string]$DailyTaskName = "SwingRadarDailyKrxCycle",
  [string]$AutoHealTaskName = "SwingRadarAutoHeal"
)

$ErrorActionPreference = "Continue"

Write-Output "=== Daily KRX Cycle ==="
& "$PSScriptRoot\get-daily-krx-task-status.ps1" -TaskName $DailyTaskName
Write-Output ""
Write-Output "=== Auto Heal ==="
& "$PSScriptRoot\get-auto-heal-task-status.ps1" -TaskName $AutoHealTaskName
