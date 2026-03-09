param(
  [string]$ProjectRoot = "C:\Users\eugen\Documents\SwingRadar",
  [string]$ContainerName = "swing-radar-postgres",
  [string]$Database = "swing_radar",
  [string]$Username = "postgres",
  [string]$OutputDir = "",
  [switch]$PlainSql
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $ProjectRoot "backups\postgres"
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$extension = if ($PlainSql.IsPresent) { "sql" } else { "dump" }
$backupFile = Join-Path $OutputDir ("swing-radar-{0}.{1}" -f $timestamp, $extension)
$containerFile = "/tmp/swing-radar-backup-$timestamp.$extension"

$dockerCheck = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if (-not $dockerCheck) {
  throw "Postgres container '$ContainerName' is not running."
}

if ($PlainSql.IsPresent) {
  docker exec $ContainerName sh -lc "pg_dump -U $Username -d $Database -f $containerFile"
} else {
  docker exec $ContainerName sh -lc "pg_dump -U $Username -d $Database -Fc -f $containerFile"
}

docker cp "${ContainerName}:$containerFile" $backupFile
docker exec $ContainerName sh -lc "rm -f $containerFile" | Out-Null

Write-Output ("Backup saved: {0}" -f $backupFile)
