#!/usr/bin/env pwsh
# Setup script for Agent Teams monorepo
# Run this after cloning the repository

Write-Host "🚀 Setting up Agent Teams monorepo..." -ForegroundColor Blue
Write-Host ""

# Check if pnpm is installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pnpm is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g pnpm" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ pnpm is installed" -ForegroundColor Green

# Check Node version
$nodeVersion = node --version
Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Setup git hooks
Write-Host "🪝 Setting up git hooks..." -ForegroundColor Yellow
pnpm prepare
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Failed to setup git hooks (non-fatal)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Git hooks configured" -ForegroundColor Green
}
Write-Host ""

# Run type checking
Write-Host "🔍 Running type check..." -ForegroundColor Yellow
pnpm typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Type check failed (non-fatal)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Type check passed" -ForegroundColor Green
}
Write-Host ""

# Build packages
Write-Host "🔨 Building packages..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed" -ForegroundColor Green
Write-Host ""

# Success message
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  • Open workspace in VS Code: code ." -ForegroundColor Gray
Write-Host "  • Press F5 to start debugging extension" -ForegroundColor Gray
Write-Host "  • Run CLI: pnpm agents --help" -ForegroundColor Gray
Write-Host "  • Run tests: pnpm test" -ForegroundColor Gray
Write-Host ""
Write-Host "For more information, see docs/MIGRATION-GUIDE.md" -ForegroundColor Gray
