#!/usr/bin/env pwsh
# Clean script for Agent Teams monorepo
# Removes all node_modules, lock files and dist/build artifacts
# Usage: pwsh scripts/clean.ps1 [--reinstall]

param(
    [switch]$Reinstall
)

$Root = Split-Path -Parent $PSScriptRoot

Write-Host "🧹 Cleaning Agent Teams monorepo..." -ForegroundColor Blue
Write-Host ""

# Folders to delete
$FolderPatterns = @("node_modules", "dist", "out", "build", ".turbo")

# Lock files to delete
$LockPatterns = @("pnpm-lock.yaml", "package-lock.json", "yarn.lock", "*.tsbuildinfo")

# ── Remove directories ────────────────────────────────────────────────────────
Write-Host "🗑️  Removing build artifacts and node_modules..." -ForegroundColor Yellow

foreach ($Pattern in $FolderPatterns) {
    $Dirs = Get-ChildItem -Path $Root -Filter $Pattern -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\\.git\\' }

    foreach ($Dir in $Dirs) {
        try {
            Remove-Item -Recurse -Force $Dir.FullName -ErrorAction Stop
            Write-Host "   ✓ Deleted $($Dir.FullName.Replace($Root, '.'))" -ForegroundColor Gray
        } catch {
            Write-Host "   ✗ Failed to delete $($Dir.FullName): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""

# ── Remove lock files ─────────────────────────────────────────────────────────
Write-Host "🔒 Removing lock files..." -ForegroundColor Yellow

foreach ($Pattern in $LockPatterns) {
    $Files = Get-ChildItem -Path $Root -Filter $Pattern -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\\.git\\' }

    foreach ($File in $Files) {
        try {
            Remove-Item -Force $File.FullName -ErrorAction Stop
            Write-Host "   ✓ Deleted $($File.FullName.Replace($Root, '.'))" -ForegroundColor Gray
        } catch {
            Write-Host "   ✗ Failed to delete $($File.FullName): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "✅ Clean complete!" -ForegroundColor Green
Write-Host ""

# ── Reinstall ─────────────────────────────────────────────────────────────────
if ($Reinstall) {
    if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Host "❌ pnpm is not installed. Please install it first: npm install -g pnpm" -ForegroundColor Red
        exit 1
    }

    Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Yellow
    Set-Location $Root
    pnpm install

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ pnpm install failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "✅ Dependencies reinstalled!" -ForegroundColor Green
} else {
    Write-Host "💡 Run with -Reinstall to also reinstall dependencies:" -ForegroundColor Cyan
    Write-Host "   pwsh scripts/clean.ps1 -Reinstall" -ForegroundColor Gray
}
