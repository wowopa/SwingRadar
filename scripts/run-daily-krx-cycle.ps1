param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$DownloadsDir = "C:\Users\eugen\Downloads",
  [string]$DownloadPattern = "KRX",
  [string]$Markets = "KOSPI,KOSDAQ",
  [int]$BatchSize = 20,
  [switch]$SkipIngest
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

$env:SWING_RADAR_SYMBOL_SYNC_ENABLED = "true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX = "true"
$env:SWING_RADAR_KRX_DOWNLOADS_DIR = $DownloadsDir
$env:SWING_RADAR_KRX_DOWNLOAD_PATTERN = $DownloadPattern

$npmArgs = @("run", "universe:daily", "--", "--sync-symbols", "--markets", $Markets, "--batch-size", "$BatchSize")

if ($SkipIngest.IsPresent) {
  $npmArgs += "--skip-ingest"
}

& "C:\Program Files\nodejs\npm.cmd" @npmArgs
