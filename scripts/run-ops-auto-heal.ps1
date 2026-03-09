param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [switch]$SkipIngest,
  [switch]$SkipDailyCycle,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

$npmArgs = @("run", "ops:auto-heal", "--")

if ($SkipIngest.IsPresent) {
  $npmArgs += "--skip-ingest"
}

if ($SkipDailyCycle.IsPresent) {
  $npmArgs += "--skip-daily-cycle"
}

if ($Force.IsPresent) {
  $npmArgs += "--force"
}

& "C:\Program Files\nodejs\npm.cmd" @npmArgs
