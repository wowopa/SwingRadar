param(
  [string]$TaskName = "",
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$EnvFile = ".env.local",
  [string]$StartTime = "",
  [switch]$SkipIngest,
  [switch]$SkipDailyCycle,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\ops-env.ps1"

$envConfig = Get-SwingRadarEnvConfig -ProjectRoot $ProjectRoot -EnvFile $EnvFile
$TaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_AUTO_HEAL_TASK_NAME" -ExplicitValue $TaskName -DefaultValue "SwingRadarAutoHeal" -EnvConfig $envConfig
$StartTime = Resolve-SwingRadarSetting -Name "SWING_RADAR_AUTO_HEAL_START_TIME" -ExplicitValue $StartTime -DefaultValue "05:30" -EnvConfig $envConfig

$scriptPath = Join-Path $ProjectRoot "scripts\run-ops-auto-heal.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

$taskArguments = @(
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$scriptPath`"",
  "-ProjectRoot", "`"$ProjectRoot`""
)

if ($SkipIngest.IsPresent) {
  $taskArguments += "-SkipIngest"
}

if ($SkipDailyCycle.IsPresent) {
  $taskArguments += "-SkipDailyCycle"
}

if ($Force.IsPresent) {
  $taskArguments += "-Force"
}

Register-SwingRadarScheduledTask -TaskName $TaskName -Command "powershell.exe" -Arguments $taskArguments -StartTime $StartTime
