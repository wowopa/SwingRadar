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
  [switch]$SkipIngest
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\ops-env.ps1"

$envConfig = Get-SwingRadarEnvConfig -ProjectRoot $ProjectRoot -EnvFile $EnvFile
$DownloadsDir = Resolve-SwingRadarSetting -Name "SWING_RADAR_KRX_DOWNLOADS_DIR" -ExplicitValue $DownloadsDir -DefaultValue "C:\Users\eugen\Downloads" -EnvConfig $envConfig
$DownloadPattern = Resolve-SwingRadarSetting -Name "SWING_RADAR_KRX_DOWNLOAD_PATTERN" -ExplicitValue $DownloadPattern -DefaultValue "KRX" -EnvConfig $envConfig
$Markets = Resolve-SwingRadarSetting -Name "SWING_RADAR_UNIVERSE_MARKETS" -ExplicitValue $Markets -DefaultValue "KOSPI,KOSDAQ" -EnvConfig $envConfig
$BatchSize = Resolve-SwingRadarIntSetting -Name "SWING_RADAR_UNIVERSE_BATCH_SIZE" -ExplicitValue $BatchSize -DefaultValue 20 -EnvConfig $envConfig
$DailyTaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_DAILY_TASK_NAME" -ExplicitValue $DailyTaskName -DefaultValue "SwingRadarDailyKrxCycle" -EnvConfig $envConfig
$DailyStartTime = Resolve-SwingRadarSetting -Name "SWING_RADAR_DAILY_TASK_START_TIME" -ExplicitValue $DailyStartTime -DefaultValue "18:10" -EnvConfig $envConfig
$AutoHealTaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_AUTO_HEAL_TASK_NAME" -ExplicitValue $AutoHealTaskName -DefaultValue "SwingRadarAutoHeal" -EnvConfig $envConfig
$AutoHealStartTime = Resolve-SwingRadarSetting -Name "SWING_RADAR_AUTO_HEAL_START_TIME" -ExplicitValue $AutoHealStartTime -DefaultValue "18:40" -EnvConfig $envConfig

& "$PSScriptRoot\register-daily-krx-task.ps1" `
  -TaskName $DailyTaskName `
  -ProjectRoot $ProjectRoot `
  -EnvFile $EnvFile `
  -DownloadsDir $DownloadsDir `
  -DownloadPattern $DownloadPattern `
  -Markets $Markets `
  -BatchSize $BatchSize `
  -StartTime $DailyStartTime `
  -SkipIngest:$SkipIngest.IsPresent

& "$PSScriptRoot\register-auto-heal-task.ps1" `
  -TaskName $AutoHealTaskName `
  -ProjectRoot $ProjectRoot `
  -EnvFile $EnvFile `
  -StartTime $AutoHealStartTime `
  -SkipIngest:$SkipIngest.IsPresent
