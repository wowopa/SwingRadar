param(
  [string]$TaskName = "",
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$EnvFile = ".env.local",
  [string]$DownloadsDir = "",
  [string]$DownloadPattern = "",
  [string]$Markets = "",
  [int]$BatchSize = 0,
  [int]$Concurrency = 0,
  [int]$TopCandidates = 0,
  [string]$StartTime = "",
  [int]$MaintenanceEtaMinutes = 0,
  [switch]$SkipIngest
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\ops-env.ps1"

$envConfig = Get-SwingRadarEnvConfig -ProjectRoot $ProjectRoot -EnvFile $EnvFile
$TaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_DAILY_TASK_NAME" -ExplicitValue $TaskName -DefaultValue "SwingRadarDailyKrxCycle" -EnvConfig $envConfig
$DownloadsDir = Resolve-SwingRadarSetting -Name "SWING_RADAR_KRX_DOWNLOADS_DIR" -ExplicitValue $DownloadsDir -DefaultValue "C:\Users\eugen\Downloads" -EnvConfig $envConfig
$DownloadPattern = Resolve-SwingRadarSetting -Name "SWING_RADAR_KRX_DOWNLOAD_PATTERN" -ExplicitValue $DownloadPattern -DefaultValue "KRX" -EnvConfig $envConfig
$Markets = Resolve-SwingRadarSetting -Name "SWING_RADAR_UNIVERSE_MARKETS" -ExplicitValue $Markets -DefaultValue "KOSPI,KOSDAQ" -EnvConfig $envConfig
$BatchSize = Resolve-SwingRadarIntSetting -Name "SWING_RADAR_UNIVERSE_BATCH_SIZE" -ExplicitValue $BatchSize -DefaultValue 20 -EnvConfig $envConfig
$Concurrency = Resolve-SwingRadarIntSetting -Name "SWING_RADAR_UNIVERSE_CONCURRENCY" -ExplicitValue $Concurrency -DefaultValue 4 -EnvConfig $envConfig
$TopCandidates = Resolve-SwingRadarIntSetting -Name "SWING_RADAR_UNIVERSE_TOP_CANDIDATES" -ExplicitValue $TopCandidates -DefaultValue 100 -EnvConfig $envConfig
$StartTime = Resolve-SwingRadarSetting -Name "SWING_RADAR_DAILY_TASK_START_TIME" -ExplicitValue $StartTime -DefaultValue "04:00" -EnvConfig $envConfig
$MaintenanceEtaMinutes = Resolve-SwingRadarIntSetting -Name "SWING_RADAR_MAINTENANCE_ETA_MINUTES" -ExplicitValue $MaintenanceEtaMinutes -DefaultValue 90 -EnvConfig $envConfig

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
  "-BatchSize", "$BatchSize",
  "-Concurrency", "$Concurrency",
  "-TopCandidates", "$TopCandidates",
  "-MaintenanceEtaMinutes", "$MaintenanceEtaMinutes"
)

if ($SkipIngest.IsPresent) {
  $taskCommand += "-SkipIngest"
}

$taskRun = $taskCommand -join " "

schtasks /Create /F /SC DAILY /TN $TaskName /TR $taskRun /ST $StartTime
