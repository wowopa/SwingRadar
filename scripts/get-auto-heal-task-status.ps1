param(
  [string]$TaskName = "SwingRadarAutoHeal"
)

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"

$queryOutput = cmd /c "schtasks /Query /TN `"$TaskName`" /FO LIST /V" 2>&1
$exitCode = $LASTEXITCODE

$ErrorActionPreference = $previousErrorActionPreference

if ($exitCode -ne 0) {
  Write-Output "Task not found: $TaskName"
  exit 1
}

$queryOutput
