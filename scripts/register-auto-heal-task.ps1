param(
  [string]$TaskName = "SwingRadarAutoHeal",
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$StartTime = "18:40",
  [switch]$SkipIngest,
  [switch]$SkipDailyCycle,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $ProjectRoot "scripts\run-ops-auto-heal.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

$taskCommand = @(
  "powershell.exe",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$scriptPath`"",
  "-ProjectRoot", "`"$ProjectRoot`""
)

if ($SkipIngest.IsPresent) {
  $taskCommand += "-SkipIngest"
}

if ($SkipDailyCycle.IsPresent) {
  $taskCommand += "-SkipDailyCycle"
}

if ($Force.IsPresent) {
  $taskCommand += "-Force"
}

$taskRun = $taskCommand -join " "

schtasks /Create /F /SC DAILY /TN $TaskName /TR $taskRun /ST $StartTime
