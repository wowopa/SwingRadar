param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$DownloadsDir = "C:\Users\eugen\Downloads",
  [string]$DownloadPattern = "KRX",
  [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"

function Write-CheckResult {
  param(
    [string]$Label,
    [bool]$Passed,
    [string]$Detail
  )

  $status = if ($Passed) { "OK" } else { "WARN" }
  Write-Output ("[{0}] {1} - {2}" -f $status, $Label, $Detail)
}

function Test-EnvValue {
  param(
    [string]$Name,
    [string]$Content
  )

  $pattern = "(?m)^\s*$([regex]::Escape($Name))\s*=\s*(.+)\s*$"
  $match = [regex]::Match($Content, $pattern)
  if (-not $match.Success) {
    return $null
  }

  return $match.Groups[1].Value.Trim().Trim("'`"")
}

$envPath = Join-Path $ProjectRoot $EnvFile
$envContent = if (Test-Path $envPath) { Get-Content -Raw -Path $envPath } else { "" }
$hasEnvFile = Test-Path $envPath

Write-Output "SwingRadar ops environment check"
Write-Output "ProjectRoot: $ProjectRoot"
Write-Output "EnvFile: $envPath"
Write-Output ""

Write-CheckResult -Label "project root" -Passed (Test-Path $ProjectRoot) -Detail $ProjectRoot
Write-CheckResult -Label "env file" -Passed $hasEnvFile -Detail $(if ($hasEnvFile) { "found" } else { "missing" })
Write-CheckResult -Label "downloads dir" -Passed (Test-Path $DownloadsDir) -Detail $DownloadsDir

$downloadMatches = @()
if (Test-Path $DownloadsDir) {
  $downloadMatches = Get-ChildItem -Path $DownloadsDir -File | Where-Object { $_.Name -like "*$DownloadPattern*" }
}
Write-CheckResult -Label "krx file hint" -Passed ($downloadMatches.Count -gt 0) -Detail $(if ($downloadMatches.Count -gt 0) { $downloadMatches[0].Name } else { "no file matched pattern '$DownloadPattern'" })

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
  Write-CheckResult -Label $name -Passed $passed -Detail $detail
}

$provider = Test-EnvValue -Name "SWING_RADAR_DATA_PROVIDER" -Content $envContent
$fallback = Test-EnvValue -Name "SWING_RADAR_FALLBACK_PROVIDER" -Content $envContent
Write-CheckResult -Label "data provider" -Passed ($provider -eq "postgres") -Detail $(if ($provider) { $provider } else { "not set" })
Write-CheckResult -Label "fallback provider" -Passed (-not [string]::IsNullOrWhiteSpace($fallback)) -Detail $(if ($fallback) { $fallback } else { "not set" })

$dailyTask = Test-EnvValue -Name "SWING_RADAR_DAILY_TASK_NAME" -Content $envContent
$autoHealTask = Test-EnvValue -Name "SWING_RADAR_AUTO_HEAL_TASK_NAME" -Content $envContent
Write-CheckResult -Label "daily task name" -Passed (-not [string]::IsNullOrWhiteSpace($dailyTask)) -Detail $(if ($dailyTask) { $dailyTask } else { "using default" })
Write-CheckResult -Label "auto-heal task name" -Passed (-not [string]::IsNullOrWhiteSpace($autoHealTask)) -Detail $(if ($autoHealTask) { $autoHealTask } else { "using default" })

$dailyScript = Join-Path $ProjectRoot "scripts\run-daily-krx-cycle.ps1"
$autoHealScript = Join-Path $ProjectRoot "scripts\run-ops-auto-heal.ps1"
Write-CheckResult -Label "daily script" -Passed (Test-Path $dailyScript) -Detail $dailyScript
Write-CheckResult -Label "auto-heal script" -Passed (Test-Path $autoHealScript) -Detail $autoHealScript

Write-Output ""
Write-Output "Recommended next step:"
Write-Output "powershell -ExecutionPolicy Bypass -File $ProjectRoot\scripts\register-ops-scheduler.ps1 -DailyStartTime 18:10 -AutoHealStartTime 18:40 -DownloadsDir $DownloadsDir -DownloadPattern $DownloadPattern"
