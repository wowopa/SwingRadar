param(
  [int]$Port = 3000,
  [string]$Workdir = "C:\Users\eugen\Documents\SwingRadar",
  [string]$Command = "npm run dev"
)

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Output "ALREADY_RUNNING:$($existing.OwningProcess)"
  exit 0
}

Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoLogo",
  "-NoProfile",
  "-Command",
  "Set-Location '$Workdir'; $Command"
) -WindowStyle Hidden

Start-Sleep -Seconds 10

$started = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($started) {
  Write-Output "STARTED:$($started.OwningProcess)"
  exit 0
}

Write-Error "FAILED_TO_START"
exit 1
