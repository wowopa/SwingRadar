param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$DownloadsDir = "C:\Users\eugen\Downloads",
  [string]$DownloadPattern = "KRX",
  [string]$Markets = "KOSPI,KOSDAQ",
  [int]$BatchSize = 100,
  [int]$Concurrency = 4,
  [int]$TopCandidates = 100,
  [int]$MaintenanceEtaMinutes = 90,
  [switch]$SkipIngest,
  [switch]$SkipExternalRefresh,
  [switch]$SkipMaintenance
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

$env:SWING_RADAR_SYMBOL_SYNC_ENABLED = "true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX = "true"
$env:SWING_RADAR_KRX_DOWNLOADS_DIR = $DownloadsDir
$env:SWING_RADAR_KRX_DOWNLOAD_PATTERN = $DownloadPattern
$env:SWING_RADAR_UNIVERSE_CONCURRENCY = "$Concurrency"
$env:SWING_RADAR_UNIVERSE_TOP_CANDIDATES = "$TopCandidates"

$npmPath = "C:\Program Files\nodejs\npm.cmd"

try {
  if (-not $SkipMaintenance.IsPresent) {
    & $npmPath "run" "ops:maintenance" "--" "--on" "--eta-minutes" "$MaintenanceEtaMinutes"
  }

  if (-not $SkipExternalRefresh.IsPresent) {
    & $npmPath "run" "etl:refresh:external"
    if ($LASTEXITCODE -ne 0) {
      throw "External refresh failed."
    }
  }

  $npmArgs = @("run", "universe:daily", "--", "--sync-symbols", "--markets", $Markets, "--batch-size", "$BatchSize", "--concurrency", "$Concurrency", "--top-candidates", "$TopCandidates")

  if ($SkipIngest.IsPresent) {
    $npmArgs += "--skip-ingest"
  }

  & $npmPath @npmArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Daily universe cycle failed."
  }
}
finally {
  if (-not $SkipMaintenance.IsPresent) {
    & $npmPath "run" "ops:maintenance" "--" "--off" | Out-Null
  }
}
