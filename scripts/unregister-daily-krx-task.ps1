param(
  [string]$TaskName = "SwingRadarDailyKrxCycle"
)

$ErrorActionPreference = "Stop"

schtasks /Delete /F /TN $TaskName
