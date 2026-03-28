param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDir,

  [Parameter(Mandatory = $true)]
  [string]$DestinationDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-TreeSignature {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    return 'missing'
  }

  $entries = Get-ChildItem -Path $Path -Recurse -File | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($Path.Length).TrimStart('\', '/')
    "$relative|$($_.Length)|$($_.LastWriteTimeUtc.Ticks)"
  }

  if ($entries.Count -eq 0) {
    return 'empty'
  }

  return ($entries -join ';')
}

function Sync-Tree {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [string]$Destination
  )

  if (Test-Path $Destination) {
    Remove-Item -Path $Destination -Recurse -Force -ErrorAction SilentlyContinue
  }

  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item -Path (Join-Path $Source '*') -Destination $Destination -Recurse -Force -ErrorAction SilentlyContinue
}

$lastSignature = ''

while ($true) {
  if (Test-Path $SourceDir) {
    $currentSignature = Get-TreeSignature -Path $SourceDir
    if ($currentSignature -ne $lastSignature) {
      Sync-Tree -Source $SourceDir -Destination $DestinationDir
      $lastSignature = $currentSignature
    }
  }
  Start-Sleep -Milliseconds 400
}
