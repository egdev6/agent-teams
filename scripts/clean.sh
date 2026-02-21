#!/usr/bin/env bash
# Clean script for Agent Teams monorepo
# Removes all node_modules, lock files and dist/build artifacts
# Usage: bash scripts/clean.sh [--reinstall]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REINSTALL=false

for arg in "$@"; do
  case $arg in
    --reinstall) REINSTALL=true ;;
  esac
done

echo -e "\033[34m🧹 Cleaning Agent Teams monorepo...\033[0m"
echo ""

# ── Remove directories ────────────────────────────────────────────────────────
echo -e "\033[33m🗑️  Removing build artifacts and node_modules...\033[0m"

FOLDER_PATTERNS=("node_modules" "dist" "out" "build" ".turbo")

for pattern in "${FOLDER_PATTERNS[@]}"; do
  while IFS= read -r -d '' dir; do
    echo -e "   \033[90m✓ Deleted ${dir#"$ROOT"/}\033[0m"
    rm -rf "$dir"
  done < <(find "$ROOT" -name ".git" -prune -o -type d -name "$pattern" -print0 2>/dev/null)
done

echo ""

# ── Remove lock files ─────────────────────────────────────────────────────────
echo -e "\033[33m🔒 Removing lock files...\033[0m"

LOCK_PATTERNS=("pnpm-lock.yaml" "package-lock.json" "yarn.lock" "*.tsbuildinfo")

for pattern in "${LOCK_PATTERNS[@]}"; do
  while IFS= read -r -d '' file; do
    echo -e "   \033[90m✓ Deleted ${file#"$ROOT"/}\033[0m"
    rm -f "$file"
  done < <(find "$ROOT" -name ".git" -prune -o -type f -name "$pattern" -print0 2>/dev/null)
done

echo ""
echo -e "\033[32m✅ Clean complete!\033[0m"
echo ""

# ── Reinstall ─────────────────────────────────────────────────────────────────
if [ "$REINSTALL" = true ]; then
  if ! command -v pnpm &>/dev/null; then
    echo -e "\033[31m❌ pnpm is not installed. Please install it first: npm install -g pnpm\033[0m"
    exit 1
  fi

  echo -e "\033[33m📦 Reinstalling dependencies...\033[0m"
  cd "$ROOT"
  pnpm install

  echo ""
  echo -e "\033[32m✅ Dependencies reinstalled!\033[0m"
else
  echo -e "\033[36m💡 Run with --reinstall to also reinstall dependencies:\033[0m"
  echo -e "   \033[90mbash scripts/clean.sh --reinstall\033[0m"
fi
