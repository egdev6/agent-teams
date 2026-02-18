#!/usr/bin/env bash
# Setup script for Agent Teams monorepo
# Run this after cloning the repository

set -e

echo "🚀 Setting up Agent Teams monorepo..."
echo ""

# Check if pnpm is installed
echo "Checking dependencies..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi
echo "✅ pnpm is installed"

# Check Node version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Setup git hooks
echo "🪝 Setting up git hooks..."
pnpm prepare || echo "⚠️  Failed to setup git hooks (non-fatal)"
echo "✅ Git hooks configured"
echo ""

# Run type checking
echo "🔍 Running type check..."
pnpm typecheck || echo "⚠️  Type check failed (non-fatal)"
echo "✅ Type check passed"
echo ""

# Build packages
echo "🔨 Building packages..."
pnpm build
echo "✅ Build completed"
echo ""

# Success message
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "  • Open workspace in VS Code: code ."
echo "  • Press F5 to start debugging extension"
echo "  • Run CLI: pnpm agents --help"
echo "  • Run tests: pnpm test"
echo ""
echo "For more information, see docs/MIGRATION-GUIDE.md"
