function Get-SwingRadarEnvConfig {
  param(
    [string]$ProjectRoot,
    [string]$EnvFile = ".env.local"
  )

  $envPath = Join-Path $ProjectRoot $EnvFile
  $content = if (Test-Path $envPath) { Get-Content -Raw -Path $envPath } else { "" }

  return [pscustomobject]@{
    Path = $envPath
    Exists = Test-Path $envPath
    Content = $content
  }
}

function Get-SwingRadarEnvValue {
  param(
    [string]$Name,
    [string]$Content
  )

  if ([string]::IsNullOrWhiteSpace($Content)) {
    return $null
  }

  $pattern = "(?m)^\s*$([regex]::Escape($Name))\s*=\s*(.+)\s*$"
  $match = [regex]::Match($Content, $pattern)
  if (-not $match.Success) {
    return $null
  }

  return $match.Groups[1].Value.Trim().Trim("'`"")
}

function Resolve-SwingRadarSetting {
  param(
    [string]$Name,
    [string]$ExplicitValue,
    [string]$DefaultValue,
    [object]$EnvConfig
  )

  if (-not [string]::IsNullOrWhiteSpace($ExplicitValue)) {
    return $ExplicitValue
  }

  $envValue = if ($null -ne $EnvConfig) {
    Get-SwingRadarEnvValue -Name $Name -Content $EnvConfig.Content
  } else {
    $null
  }

  if (-not [string]::IsNullOrWhiteSpace($envValue)) {
    return $envValue
  }

  return $DefaultValue
}

function Resolve-SwingRadarIntSetting {
  param(
    [string]$Name,
    [int]$ExplicitValue,
    [int]$DefaultValue,
    [object]$EnvConfig
  )

  if ($ExplicitValue -gt 0) {
    return $ExplicitValue
  }

  $envValue = if ($null -ne $EnvConfig) {
    Get-SwingRadarEnvValue -Name $Name -Content $EnvConfig.Content
  } else {
    $null
  }

  $resolved = 0
  if ([int]::TryParse($envValue, [ref]$resolved) -and $resolved -gt 0) {
    return $resolved
  }

  return $DefaultValue
}

function Register-SwingRadarScheduledTask {
  param(
    [string]$TaskName,
    [string]$Command,
    [string[]]$Arguments,
    [string]$StartTime
  )

  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $today = Get-Date -Format "yyyy-MM-dd"
  $escapedCommand = [System.Security.SecurityElement]::Escape($Command)
  $escapedArguments = [System.Security.SecurityElement]::Escape(($Arguments -join " "))

  $xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>$today`T00:00:00</Date>
    <Author>$currentUser</Author>
    <URI>\$TaskName</URI>
  </RegistrationInfo>
  <Principals>
    <Principal id="Author">
      <UserId>$currentUser</UserId>
      <LogonType>S4U</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <StartWhenAvailable>true</StartWhenAvailable>
    <ExecutionTimeLimit>PT72H</ExecutionTimeLimit>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
  </Settings>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>$today`T$StartTime`:00</StartBoundary>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>$escapedCommand</Command>
      <Arguments>$escapedArguments</Arguments>
    </Exec>
  </Actions>
</Task>
"@

  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) "$TaskName.xml"

  try {
    [System.IO.File]::WriteAllText($tempFile, $xml, [System.Text.Encoding]::Unicode)
    schtasks /Create /F /TN $TaskName /XML $tempFile | Out-Null
  } finally {
    if (Test-Path $tempFile) {
      Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
  }
}
