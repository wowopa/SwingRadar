param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$EnvFile = ".env.local",
  [string]$ComposeFile = "docker-compose.yml",
  [string]$AppUrl = "http://localhost:3000",
  [string]$DownloadsDir = "",
  [string]$DownloadPattern = "",
  [switch]$SkipBuild,
  [switch]$SkipIngest,
  [switch]$SetupScheduler,
  [switch]$ForceScheduler
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

Write-Output "SwingRadar production deployment"
Write-Output ("ProjectRoot: {0}" -f $ProjectRoot)
Write-Output ("EnvFile: {0}" -f $EnvFile)
Write-Output ""

$composeArgs = @("--env-file", $EnvFile, "-f", $ComposeFile, "up", "-d")
if (-not $SkipBuild.IsPresent) {
  $composeArgs += "--build"
}

Write-Output "[docker compose up]"
docker compose @composeArgs

Write-Output ""
Write-Output "[wait for app]"
$healthReady = $false
for ($index = 0; $index -lt 20; $index += 1) {
  try {
    $response = Invoke-RestMethod -Uri "$AppUrl/api/health" -TimeoutSec 10
    if ($response.status) {
      $healthReady = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 3
  }
}

if (-not $healthReady) {
  throw "The app did not become healthy at $AppUrl within the expected time."
}

if (-not $SkipIngest.IsPresent) {
  Write-Output ""
  Write-Output "[db ingest]"
  docker compose --env-file $EnvFile -f $ComposeFile exec app npm run db:ingest:schema
  docker compose --env-file $EnvFile -f $ComposeFile exec app npm run db:ingest
}

Write-Output ""
Write-Output "[production stack check]"
& "$PSScriptRoot\check-production-stack.ps1" -ProjectRoot $ProjectRoot -ComposeFile $ComposeFile -AppUrl $AppUrl

if ($SetupScheduler.IsPresent) {
  Write-Output ""
  Write-Output "[scheduler setup]"
  $setupArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "setup-ops-scheduler.ps1"),
    "-ProjectRoot", $ProjectRoot,
    "-EnvFile", $EnvFile
  )

  if (-not [string]::IsNullOrWhiteSpace($DownloadsDir)) {
    $setupArgs += @("-DownloadsDir", $DownloadsDir)
  }

  if (-not [string]::IsNullOrWhiteSpace($DownloadPattern)) {
    $setupArgs += @("-DownloadPattern", $DownloadPattern)
  }

  if ($SkipIngest.IsPresent) {
    $setupArgs += "-SkipIngest"
  }

  if ($ForceScheduler.IsPresent) {
    $setupArgs += "-Force"
  }

  powershell @setupArgs
}
