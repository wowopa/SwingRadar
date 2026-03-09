param(
  [string]$BackupFile,
  [string]$ContainerName = "swing-radar-postgres",
  [string]$Database = "swing_radar",
  [string]$Username = "postgres",
  [switch]$PlainSql
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BackupFile)) {
  throw "Provide -BackupFile with a dump or sql backup path."
}

$resolvedBackupFile = Resolve-Path $BackupFile
if (-not (Test-Path $resolvedBackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$dockerCheck = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if (-not $dockerCheck) {
  throw "Postgres container '$ContainerName' is not running."
}

$extension = [System.IO.Path]::GetExtension($resolvedBackupFile)
$containerFile = "/tmp/swing-radar-restore$extension"

docker cp $resolvedBackupFile "${ContainerName}:$containerFile"

if ($PlainSql.IsPresent -or $extension -eq ".sql") {
  docker exec $ContainerName sh -lc "psql -U $Username -d $Database -f $containerFile"
} else {
  docker exec $ContainerName sh -lc "pg_restore -U $Username -d $Database --clean --if-exists $containerFile"
}

docker exec $ContainerName sh -lc "rm -f $containerFile" | Out-Null

Write-Output ("Restore completed from: {0}" -f $resolvedBackupFile)
