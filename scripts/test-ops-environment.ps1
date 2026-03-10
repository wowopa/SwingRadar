param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$DownloadsDir = "C:\Users\eugen\Downloads",
  [string]$DownloadPattern = "KRX",
  [string]$EnvFile = ".env.local",
  [switch]$PassThru
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\ops-env.ps1"

function Write-CheckResult {
  param(
    [string]$Label,
    [bool]$Passed,
    [string]$Detail
  )

  $status = if ($Passed) { "OK" } else { "WARN" }
  Write-Host ("[{0}] {1} - {2}" -f $status, $Label, $Detail)
}

function Test-EnvValue {
  param(
    [string]$Name,
    [string]$Content
  )

  return Get-SwingRadarEnvValue -Name $Name -Content $Content
}

$envConfig = Get-SwingRadarEnvConfig -ProjectRoot $ProjectRoot -EnvFile $EnvFile
$envPath = $envConfig.Path
$envContent = $envConfig.Content
$hasEnvFile = $envConfig.Exists
$checks = [System.Collections.Generic.List[object]]::new()

function Add-CheckResult {
  param(
    [string]$Label,
    [bool]$Passed,
    [string]$Detail,
    [string]$Severity = "warning"
  )

  $checks.Add([pscustomobject]@{
    label = $Label
    passed = $Passed
    detail = $Detail
    severity = $Severity
  }) | Out-Null

  Write-CheckResult -Label $Label -Passed $Passed -Detail $Detail
}

Write-Host "SwingRadar ops environment check"
Write-Host "ProjectRoot: $ProjectRoot"
Write-Host "EnvFile: $envPath"
Write-Host ""

Add-CheckResult -Label "project root" -Passed (Test-Path $ProjectRoot) -Detail $ProjectRoot -Severity "critical"
Add-CheckResult -Label "env file" -Passed $hasEnvFile -Detail $(if ($hasEnvFile) { "found" } else { "missing" }) -Severity "critical"
Add-CheckResult -Label "downloads dir" -Passed (Test-Path $DownloadsDir) -Detail $DownloadsDir -Severity "warning"

$downloadMatches = @()
if (Test-Path $DownloadsDir) {
  $downloadMatches = Get-ChildItem -Path $DownloadsDir -File | Where-Object { $_.Name -like "*$DownloadPattern*" }
}
Add-CheckResult -Label "krx file hint" -Passed ($downloadMatches.Count -gt 0) -Detail $(if ($downloadMatches.Count -gt 0) { $downloadMatches[0].Name } else { "no file matched pattern '$DownloadPattern'" }) -Severity "warning"

$requiredEnvVars = @(
  "SWING_RADAR_DATABASE_URL",
  "SWING_RADAR_ADMIN_TOKEN",
  "SWING_RADAR_NAVER_CLIENT_ID",
  "SWING_RADAR_NAVER_CLIENT_SECRET",
  "SWING_RADAR_DART_API_KEY"
)

foreach ($name in $requiredEnvVars) {
  $value = Test-EnvValue -Name $name -Content $envContent
  $passed = -not [string]::IsNullOrWhiteSpace($value) -and -not $value.StartsWith("replace-with")
  $detail = if ($passed) { "configured" } else { "missing or placeholder" }
  Add-CheckResult -Label $name -Passed $passed -Detail $detail -Severity "critical"
}

$provider = Test-EnvValue -Name "SWING_RADAR_DATA_PROVIDER" -Content $envContent
$fallback = Test-EnvValue -Name "SWING_RADAR_FALLBACK_PROVIDER" -Content $envContent
Add-CheckResult -Label "data provider" -Passed ($provider -eq "postgres") -Detail $(if ($provider) { $provider } else { "not set" }) -Severity "critical"
Add-CheckResult -Label "fallback provider" -Passed (-not [string]::IsNullOrWhiteSpace($fallback)) -Detail $(if ($fallback) { $fallback } else { "not set" }) -Severity "warning"

$dailyTask = Test-EnvValue -Name "SWING_RADAR_DAILY_TASK_NAME" -Content $envContent
$autoHealTask = Test-EnvValue -Name "SWING_RADAR_AUTO_HEAL_TASK_NAME" -Content $envContent
Add-CheckResult -Label "daily task name" -Passed (-not [string]::IsNullOrWhiteSpace($dailyTask)) -Detail $(if ($dailyTask) { $dailyTask } else { "using default" }) -Severity "warning"
Add-CheckResult -Label "auto-heal task name" -Passed (-not [string]::IsNullOrWhiteSpace($autoHealTask)) -Detail $(if ($autoHealTask) { $autoHealTask } else { "using default" }) -Severity "warning"

$dailyScript = Join-Path $ProjectRoot "scripts\run-daily-krx-cycle.ps1"
$autoHealScript = Join-Path $ProjectRoot "scripts\run-ops-auto-heal.ps1"
Add-CheckResult -Label "daily script" -Passed (Test-Path $dailyScript) -Detail $dailyScript -Severity "critical"
Add-CheckResult -Label "auto-heal script" -Passed (Test-Path $autoHealScript) -Detail $autoHealScript -Severity "critical"

$dailyStartTime = Test-EnvValue -Name "SWING_RADAR_DAILY_TASK_START_TIME" -Content $envContent
$autoHealStartTime = Test-EnvValue -Name "SWING_RADAR_AUTO_HEAL_START_TIME" -Content $envContent
$recommendedCommand = "powershell -ExecutionPolicy Bypass -File $ProjectRoot\scripts\setup-ops-scheduler.ps1 -DownloadsDir $DownloadsDir -DownloadPattern $DownloadPattern"

$criticalFailures = @($checks | Where-Object { -not $_.passed -and $_.severity -eq "critical" })
$summaryStatus = if ($criticalFailures.Count -eq 0) { "READY" } else { "ACTION_NEEDED" }

Write-Host ""
Write-Host ("Environment summary: {0}" -f $summaryStatus)
Write-Host "Recommended next step:"
Write-Host $recommendedCommand

if ($PassThru.IsPresent) {
  return [pscustomobject]@{
    passed = $criticalFailures.Count -eq 0
    summary = $summaryStatus
    recommendedCommand = $recommendedCommand
    settings = [pscustomobject]@{
      projectRoot = $ProjectRoot
      envFile = $envPath
      downloadsDir = $DownloadsDir
      downloadPattern = $DownloadPattern
      dailyTaskName = if ($dailyTask) { $dailyTask } else { "SwingRadarDailyKrxCycle" }
      autoHealTaskName = if ($autoHealTask) { $autoHealTask } else { "SwingRadarAutoHeal" }
      dailyStartTime = if ($dailyStartTime) { $dailyStartTime } else { "04:00" }
      autoHealStartTime = if ($autoHealStartTime) { $autoHealStartTime } else { "05:30" }
    }
    checks = $checks
  }
}
