Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host 'DEV_WATCH_BEGIN'
Write-Host 'DEV_WATCH_READY'

pnpm exec concurrently `
  --prefix '[{name}]' `
  --names 'extension,webviews,sync' `
  --prefix-colors 'blue,magenta,cyan' `
  "pnpm --filter @agent-teams/extension watch" `
  "pnpm --filter @agent-teams/webviews watch" `
  "pwsh -NoProfile -ExecutionPolicy Bypass -File .vscode/sync-webviews.ps1 -SourceDir packages/webviews/dist -DestinationDir packages/extension/dist/webviews"
