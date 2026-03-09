param(
  [string]$TaskName = "SwingRadarAutoHeal"
)

$ErrorActionPreference = "Stop"

schtasks /Delete /F /TN $TaskName
