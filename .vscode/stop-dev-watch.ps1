Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$patterns = @(
  '@agent-teams/extension watch',
  '@agent-teams/webviews watch',
  'sync-webviews.ps1'
)

$killed = 0
foreach ($proc in Get-CimInstance Win32_Process -Filter "Name = 'pwsh.exe'") {
  $cmd = [string]$proc.CommandLine
  if ($patterns | Where-Object { $cmd -like "*$_*" }) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    $killed++
  }
}

Write-Host "WATCHERS_STOPPED:$killed"
