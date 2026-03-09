param(
  [string]$DailyTaskName = "SwingRadarDailyKrxCycle",
  [string]$AutoHealTaskName = "SwingRadarAutoHeal"
)

$ErrorActionPreference = "Continue"

& "$PSScriptRoot\unregister-daily-krx-task.ps1" -TaskName $DailyTaskName
& "$PSScriptRoot\unregister-auto-heal-task.ps1" -TaskName $AutoHealTaskName
