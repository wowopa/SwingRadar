param(
  [string]$TaskName = "SwingRadarDailyKrxCycle",
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$DownloadsDir = "C:\Users\eugen\Downloads",
  [string]$DownloadPattern = "KRX",
  [string]$Markets = "KOSPI,KOSDAQ",
  [int]$BatchSize = 20,
  [string]$StartTime = "18:10",
  [switch]$SkipIngest
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $ProjectRoot "scripts\run-daily-krx-cycle.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

$taskCommand = @(
  "powershell.exe",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$scriptPath`"",
  "-ProjectRoot", "`"$ProjectRoot`"",
  "-DownloadsDir", "`"$DownloadsDir`"",
  "-DownloadPattern", "`"$DownloadPattern`"",
  "-Markets", "`"$Markets`"",
  "-BatchSize", "$BatchSize"
)

if ($SkipIngest.IsPresent) {
  $taskCommand += "-SkipIngest"
}

$taskRun = $taskCommand -join " "

schtasks /Create /F /SC DAILY /TN $TaskName /TR $taskRun /ST $StartTime
