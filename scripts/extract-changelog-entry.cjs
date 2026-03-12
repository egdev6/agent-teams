#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeVersion(value) {
  return value.trim().replace(/^v/i, '');
}

function extractEntry(content, version) {
  const lines = content.split(/\r?\n/);
  const versionPattern = escapeRegExp(version);
  const headerRegex = new RegExp(`^##\\s+(?:\\[)?v?${versionPattern}(?:\\])?(?:\\s+-\\s+.+)?$`);

  const startIndex = lines.findIndex((line) => headerRegex.test(line.trim()));
  if (startIndex === -1) {
    return null;
  }

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      endIndex = index;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n').trim();
}

const rawVersion = process.argv[2] ?? process.env.VERSION ?? process.env.VERSION_NUM;
if (!rawVersion) {
  fail('Version argument is required. Usage: node scripts/extract-changelog-entry.cjs <version>');
}

if (!fs.existsSync(CHANGELOG_PATH)) {
  fail(`File not found: ${CHANGELOG_PATH}`);
}

const version = normalizeVersion(rawVersion);
const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
const entry = extractEntry(changelog, version);

if (!entry) {
  fail(`No CHANGELOG entry found for version ${version}`);
}

process.stdout.write(`${entry}\n`);
