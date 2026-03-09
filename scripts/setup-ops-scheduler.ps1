param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$EnvFile = ".env.local",
  [string]$DownloadsDir = "",
  [string]$DownloadPattern = "",
  [string]$Markets = "",
  [int]$BatchSize = 0,
  [string]$DailyTaskName = "",
  [string]$DailyStartTime = "",
  [string]$AutoHealTaskName = "",
  [string]$AutoHealStartTime = "",
  [switch]$SkipIngest,
  [switch]$CheckOnly,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\ops-env.ps1"

$envConfig = Get-SwingRadarEnvConfig -ProjectRoot $ProjectRoot -EnvFile $EnvFile
$resolvedDownloadsDir = Resolve-SwingRadarSetting -Name "SWING_RADAR_KRX_DOWNLOADS_DIR" -ExplicitValue $DownloadsDir -DefaultValue "C:\Users\eugen\Downloads" -EnvConfig $envConfig
$resolvedDownloadPattern = Resolve-SwingRadarSetting -Name "SWING_RADAR_KRX_DOWNLOAD_PATTERN" -ExplicitValue $DownloadPattern -DefaultValue "KRX" -EnvConfig $envConfig
$resolvedMarkets = Resolve-SwingRadarSetting -Name "SWING_RADAR_UNIVERSE_MARKETS" -ExplicitValue $Markets -DefaultValue "KOSPI,KOSDAQ" -EnvConfig $envConfig
$resolvedBatchSize = Resolve-SwingRadarIntSetting -Name "SWING_RADAR_UNIVERSE_BATCH_SIZE" -ExplicitValue $BatchSize -DefaultValue 20 -EnvConfig $envConfig
$resolvedDailyTaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_DAILY_TASK_NAME" -ExplicitValue $DailyTaskName -DefaultValue "SwingRadarDailyKrxCycle" -EnvConfig $envConfig
$resolvedDailyStartTime = Resolve-SwingRadarSetting -Name "SWING_RADAR_DAILY_TASK_START_TIME" -ExplicitValue $DailyStartTime -DefaultValue "18:10" -EnvConfig $envConfig
$resolvedAutoHealTaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_AUTO_HEAL_TASK_NAME" -ExplicitValue $AutoHealTaskName -DefaultValue "SwingRadarAutoHeal" -EnvConfig $envConfig
$resolvedAutoHealStartTime = Resolve-SwingRadarSetting -Name "SWING_RADAR_AUTO_HEAL_START_TIME" -ExplicitValue $AutoHealStartTime -DefaultValue "18:40" -EnvConfig $envConfig

$diagnostics = & "$PSScriptRoot\test-ops-environment.ps1" `
  -ProjectRoot $ProjectRoot `
  -EnvFile $EnvFile `
  -DownloadsDir $resolvedDownloadsDir `
  -DownloadPattern $resolvedDownloadPattern `
  -PassThru

if (-not $diagnostics.passed -and -not $Force.IsPresent) {
  throw "Critical ops environment checks failed. Fix the ACTION_NEEDED items above or rerun with -Force."
}

Write-Output ""
Write-Output "Resolved scheduler settings"
Write-Output ("- Daily task: {0} at {1}" -f $resolvedDailyTaskName, $resolvedDailyStartTime)
Write-Output ("- Auto-heal task: {0} at {1}" -f $resolvedAutoHealTaskName, $resolvedAutoHealStartTime)
Write-Output ("- Downloads dir: {0}" -f $resolvedDownloadsDir)
Write-Output ("- Download pattern: {0}" -f $resolvedDownloadPattern)
Write-Output ("- Markets: {0}" -f $resolvedMarkets)
Write-Output ("- Batch size: {0}" -f $resolvedBatchSize)

if ($CheckOnly.IsPresent) {
  return
}

& "$PSScriptRoot\register-ops-scheduler.ps1" `
  -ProjectRoot $ProjectRoot `
  -EnvFile $EnvFile `
  -DownloadsDir $resolvedDownloadsDir `
  -DownloadPattern $resolvedDownloadPattern `
  -Markets $resolvedMarkets `
  -BatchSize $resolvedBatchSize `
  -DailyTaskName $resolvedDailyTaskName `
  -DailyStartTime $resolvedDailyStartTime `
  -AutoHealTaskName $resolvedAutoHealTaskName `
  -AutoHealStartTime $resolvedAutoHealStartTime `
  -SkipIngest:$SkipIngest.IsPresent
