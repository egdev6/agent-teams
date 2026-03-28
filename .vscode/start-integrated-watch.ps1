Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host 'DEV_WATCH_BEGIN'
Write-Host 'DEV_WATCH_READY'

pnpm exec concurrently `
  --prefix '[{name}]' `
  --names 'extension,webviews' `
  --prefix-colors 'blue,magenta' `
  "pnpm --filter agent-teams watch" `
  "pnpm --filter @agent-teams/webviews watch"
