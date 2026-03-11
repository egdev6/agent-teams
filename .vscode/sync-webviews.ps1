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
    foreach ($srcFile in Get-ChildItem -Path $SourceDir -Recurse -File) {
      $relative = $srcFile.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
      $destFile = Join-Path $DestinationDir $relative
      $destDir = Split-Path $destFile -Parent
      if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
      }
      if (-not (Test-Path $destFile) -or $srcFile.LastWriteTimeUtc -gt (Get-Item $destFile).LastWriteTimeUtc) {
        Copy-Item -Path $srcFile.FullName -Destination $destFile -Force -ErrorAction SilentlyContinue
      }
    }
  }
  Start-Sleep -Milliseconds 400
}
