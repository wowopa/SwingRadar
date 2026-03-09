param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$EnvFile = ".env.local",
  [string]$AppUrl = "",
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\ops-env.ps1"

$envConfig = Get-SwingRadarEnvConfig -ProjectRoot $ProjectRoot -EnvFile $EnvFile
$resolvedAppUrl = Resolve-SwingRadarSetting -Name "NEXT_PUBLIC_APP_URL" -ExplicitValue $AppUrl -DefaultValue "http://localhost:3000" -EnvConfig $envConfig
$adminToken = Resolve-SwingRadarSetting -Name "SWING_RADAR_ADMIN_TOKEN" -ExplicitValue "" -DefaultValue "" -EnvConfig $envConfig
$dailyTaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_DAILY_TASK_NAME" -ExplicitValue "" -DefaultValue "SwingRadarDailyKrxCycle" -EnvConfig $envConfig
$autoHealTaskName = Resolve-SwingRadarSetting -Name "SWING_RADAR_AUTO_HEAL_TASK_NAME" -ExplicitValue "" -DefaultValue "SwingRadarAutoHeal" -EnvConfig $envConfig

if ([string]::IsNullOrWhiteSpace($adminToken)) {
  throw "SWING_RADAR_ADMIN_TOKEN is required to run the post-launch check."
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $ProjectRoot "data\ops\latest-post-launch-check.json"
}

$outputDirectory = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$headers = @{
  Authorization = "Bearer $adminToken"
}

function Get-TaskPresence {
  param([string]$TaskName)

  schtasks /Query /TN $TaskName 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

Write-Output "SwingRadar post-launch check"
Write-Output ("AppUrl: {0}" -f $resolvedAppUrl)
Write-Output ""

$health = Invoke-RestMethod -Uri "$resolvedAppUrl/api/health" -TimeoutSec 15
$status = Invoke-RestMethod -Uri "$resolvedAppUrl/api/admin/status" -Headers $headers -TimeoutSec 20
$audit = Invoke-RestMethod -Uri "$resolvedAppUrl/api/admin/audit" -Headers $headers -TimeoutSec 20

$recentFailures = @($audit.items | Where-Object { $_.status -eq "failure" } | Select-Object -First 5)
$recentWarnings = @($audit.items | Where-Object { $_.status -eq "warning" } | Select-Object -First 5)
$criticalIncidents = @($status.incidents | Where-Object { $_.severity -eq "critical" })
$warningIncidents = @($status.incidents | Where-Object { $_.severity -eq "warning" })

$report = [pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  appUrl = $resolvedAppUrl
  healthStatus = $health.status
  overallStatus = $status.overallStatus
  operationalMode = $status.operationalMode
  dailyTaskRegistered = Get-TaskPresence -TaskName $dailyTaskName
  autoHealTaskRegistered = Get-TaskPresence -TaskName $autoHealTaskName
  incidents = [pscustomobject]@{
    criticalCount = $criticalIncidents.Count
    warningCount = $warningIncidents.Count
    items = $status.incidents
  }
  reports = [pscustomobject]@{
    opsHealth = $status.opsHealthReport
    dailyCycle = $status.dailyCycleReport
    autoHeal = $status.autoHealReport
    newsFetch = $status.newsFetchReport
    snapshotGeneration = $status.snapshotGenerationReport
  }
  audits = [pscustomobject]@{
    total = @($audit.items).Count
    failureCount = $recentFailures.Count
    warningCount = $recentWarnings.Count
    recentFailures = $recentFailures
    recentWarnings = $recentWarnings
  }
}

$report | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding utf8

Write-Output ("Health: {0}" -f $report.healthStatus)
Write-Output ("Overall: {0}" -f $report.overallStatus)
Write-Output ("Critical incidents: {0}" -f $report.incidents.criticalCount)
Write-Output ("Warning incidents: {0}" -f $report.incidents.warningCount)
Write-Output ("Recent audit failures: {0}" -f $report.audits.failureCount)
Write-Output ("Recent audit warnings: {0}" -f $report.audits.warningCount)
Write-Output ("Daily task registered: {0}" -f $report.dailyTaskRegistered)
Write-Output ("Auto-heal task registered: {0}" -f $report.autoHealTaskRegistered)
Write-Output ("Saved report: {0}" -f $OutputPath)
