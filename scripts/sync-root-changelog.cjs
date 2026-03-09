#!/usr/bin/env node
/**
 * sync-root-changelog.cjs
 *
 * After `changeset version` runs, it writes new entries to each package's CHANGELOG.md.
 * This script reads the new entries from packages/extension/CHANGELOG.md (the canonical
 * package changelog) and prepends them into the root CHANGELOG.md (the single source of
 * truth that gets synced to agent-teams-docs).
 *
 * Format produced by changesets: "## X.Y.Z\n\n### Minor Changes\n..."
 * Format used by root CHANGELOG: "## [X.Y.Z] - YYYY-MM-DD\n..."
 *
 * The script converts the changeset format to Keep-a-Changelog format before inserting.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXTENSION_CHANGELOG = path.join(ROOT, 'packages', 'extension', 'CHANGELOG.md');
const ROOT_CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Extract only the NEWEST entry block from a changeset-generated CHANGELOG.
 * Changesets prepends the new entry at the top, above any previous entries.
 * Returns the raw block (without the leading "## X.Y.Z" header line) plus the version string.
 */
function extractNewestChangesetEntry(content) {
  // Changesets format: "## X.Y.Z\n\n### ..."
  // We need the first ## block (the newest one).
  const lines = content.split('\n');
  let startIdx = -1;
  let endIdx = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      if (startIdx === -1) {
        startIdx = i;
      } else {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx === -1) {
    return null; // No entry found
  }

  const headerLine = lines[startIdx]; // e.g. "## 1.1.0"
  const versionMatch = headerLine.match(/^## (\d+\.\d+\.\d+)/);
  if (!versionMatch) {
    return null;
  }

  const version = versionMatch[1];
  const bodyLines = lines.slice(startIdx + 1, endIdx);

  // Strip leading/trailing blank lines from body
  while (bodyLines.length > 0 && bodyLines[0].trim() === '') bodyLines.shift();
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();

  return { version, body: bodyLines.join('\n') };
}

/**
 * Check whether root CHANGELOG already contains an entry for this version.
 */
function rootHasVersion(rootContent, version) {
  return (
    rootContent.includes(`## [${version}]`) ||
    rootContent.includes(`## ${version}`) ||
    rootContent.includes(`## v${version}`)
  );
}

/**
 * Build a Keep-a-Changelog formatted entry block.
 */
function buildRootEntry(version, body) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `## [${version}] - ${today}\n\n${body}`;
}

/**
 * Prepend newEntry into rootContent immediately after the header block
 * (the lines before the first "## " entry or the "[Unreleased]" section).
 *
 * Strategy:
 *   - Find the "## [Unreleased]" block if present and insert after it.
 *   - Otherwise insert before the first versioned "## " entry.
 *   - If neither exists, append at the end.
 */
function injectEntry(rootContent, newEntry) {
  const lines = rootContent.split('\n');

  // Try to find ## [Unreleased] block end
  let unreleasedEnd = -1;
  let inUnreleased = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^## \[Unreleased\]/i.test(lines[i])) {
      inUnreleased = true;
      continue;
    }
    if (inUnreleased && /^## /.test(lines[i])) {
      unreleasedEnd = i;
      break;
    }
  }

  let insertAt;
  if (unreleasedEnd !== -1) {
    // Insert right before the next versioned entry (after the Unreleased block)
    insertAt = unreleasedEnd;
  } else {
    // Find the first versioned ## entry
    insertAt = lines.findIndex((l) => /^## [[v]?\d/.test(l));
    if (insertAt === -1) {
      // No versioned entries; append
      insertAt = lines.length;
    }
  }

  const before = lines.slice(0, insertAt).join('\n');
  const after = lines.slice(insertAt).join('\n');

  // Ensure clean blank line separation
  const separator = '\n\n---\n\n';
  return `${before.trimEnd()}${separator}${newEntry}\n\n${after.trimStart()}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const extensionContent = readFile(EXTENSION_CHANGELOG);
const entry = extractNewestChangesetEntry(extensionContent);

if (!entry) {
  console.log(
    'sync-root-changelog: No new changeset entry found in extension CHANGELOG. Nothing to sync.',
  );
  process.exit(0);
}

const rootContent = readFile(ROOT_CHANGELOG);

if (rootHasVersion(rootContent, entry.version)) {
  console.log(
    `sync-root-changelog: Root CHANGELOG already has entry for v${entry.version}. Skipping.`,
  );
  process.exit(0);
}

const newEntry = buildRootEntry(entry.version, entry.body);
const updated = injectEntry(rootContent, newEntry);

fs.writeFileSync(ROOT_CHANGELOG, updated, 'utf8');
console.log(`sync-root-changelog: ✅ Prepended v${entry.version} entry to root CHANGELOG.md`);
