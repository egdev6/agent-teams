Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$syncScriptPath = (Join-Path $PSScriptRoot 'sync-webviews.ps1')

$extWatch = 'pnpm --filter @agent-teams/extension watch'
$webviewsWatch = 'pnpm --filter @agent-teams/webviews watch'
$srcDir = (Join-Path $workspaceRoot 'packages/webviews/dist')
$destDir = (Join-Path $workspaceRoot 'packages/extension/dist/webviews')

Start-Process -FilePath pwsh -WorkingDirectory $workspaceRoot -ArgumentList '-NoProfile', '-Command', $extWatch | Out-Null
Start-Process -FilePath pwsh -WorkingDirectory $workspaceRoot -ArgumentList '-NoProfile', '-Command', $webviewsWatch | Out-Null
Start-Process -FilePath pwsh -WorkingDirectory $workspaceRoot -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $syncScriptPath, '-SourceDir', $srcDir, '-DestinationDir', $destDir | Out-Null

Write-Host 'WATCHERS_STARTED'
