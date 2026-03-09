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
