param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$DownloadsDir = "C:\Users\eugen\Downloads",
  [string]$DownloadPattern = "KRX",
  [string]$Markets = "KOSPI,KOSDAQ",
  [int]$BatchSize = 20,
  [string]$DailyTaskName = "SwingRadarDailyKrxCycle",
  [string]$DailyStartTime = "18:10",
  [string]$AutoHealTaskName = "SwingRadarAutoHeal",
  [string]$AutoHealStartTime = "18:40",
  [switch]$SkipIngest
)

$ErrorActionPreference = "Stop"

& "$PSScriptRoot\register-daily-krx-task.ps1" `
  -TaskName $DailyTaskName `
  -ProjectRoot $ProjectRoot `
  -DownloadsDir $DownloadsDir `
  -DownloadPattern $DownloadPattern `
  -Markets $Markets `
  -BatchSize $BatchSize `
  -StartTime $DailyStartTime `
  -SkipIngest:$SkipIngest.IsPresent

& "$PSScriptRoot\register-auto-heal-task.ps1" `
  -TaskName $AutoHealTaskName `
  -ProjectRoot $ProjectRoot `
  -StartTime $AutoHealStartTime `
  -SkipIngest:$SkipIngest.IsPresent
