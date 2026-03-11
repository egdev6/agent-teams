param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDir,

  [Parameter(Mandatory = $true)]
  [string]$DestinationDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

while ($true) {
  if (Test-Path $SourceDir) {
    New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
    Copy-Item -Path (Join-Path $SourceDir '*') -Destination $DestinationDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 400
}
