#!/usr/bin/env node
/**
 * changeset-add.cjs
 *
 * Wraps `changeset add` to support multi-line summaries.
 * After the standard interactive wizard completes, it prompts for additional
 * bullet points (one per line, empty line to finish) and rewrites the
 * changeset file with all collected entries.
 *
 * For any subcommand other than `add`, this script passes through to the
 * regular `changeset` CLI unchanged.
 */

'use strict';

const { spawnSync } = require('node:child_process');
const { readdirSync, statSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const readline = require('node:readline');

const CHANGESET_DIR = join(process.cwd(), '.changeset');
const args = process.argv.slice(2);

// ---- pass-through for non-add subcommands --------------------------------

if (args[0] !== 'add') {
  const result = spawnSync('pnpm', ['exec', 'changeset', ...args], {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(result.status ?? 0);
}

// ---- helpers ---------------------------------------------------------------

function listChangesets() {
  return readdirSync(CHANGESET_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ name: f, mtime: statSync(join(CHANGESET_DIR, f)).mtimeMs }));
}

function findNewFile(snapTime) {
  const brand = listChangesets().filter((f) => f.mtime > snapTime);
  if (brand.length === 0) return null;
  brand.sort((a, b) => b.mtime - a.mtime);
  return join(CHANGESET_DIR, brand[0].name);
}

/** Parse a changeset .md file into { frontmatter, lines[] }. */
function parseChangeset(raw) {
  // Expected shape: ---\nfrontmatter\n---\n\nbody
  const parts = raw.split(/^---[ \t]*$/m);
  if (parts.length < 3) return null;
  const frontmatter = parts[1];
  const body = parts.slice(2).join('---').trimStart();
  const lines = body
    .split('\n')
    .map((l) => l.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
  return { frontmatter, lines };
}

function serializeChangeset(frontmatter, lines) {
  const body = lines.map((l) => `- ${l}`).join('\n');
  return `---${frontmatter}---\n\n${body}\n`;
}

/** Prompt for extra bullet points. Returns the array of entered strings. */
function promptExtraLines() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const lines = [];
  return new Promise((resolve) => {
    process.stdout.write(
      '\n\x1b[36mAdd more summary lines\x1b[0m (one per line, empty line to finish):\n',
    );
    const ask = () => {
      rl.question('  \x1b[90m-\x1b[0m ', (answer) => {
        if (answer.trim() === '') {
          rl.close();
          resolve(lines);
        } else {
          lines.push(answer.trim());
          ask();
        }
      });
    };
    ask();
  });
}

// ---- main ------------------------------------------------------------------

async function main() {
  const snapTime = Date.now();

  // Run the standard interactive changeset wizard.
  const result = spawnSync('pnpm', ['exec', 'changeset', 'add'], {
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const newFile = findNewFile(snapTime);
  if (!newFile) {
    // User cancelled the wizard — nothing to do.
    process.exit(0);
  }

  const raw = readFileSync(newFile, 'utf8');
  const parsed = parseChangeset(raw);
  if (!parsed) {
    process.exit(0);
  }

  const extraLines = await promptExtraLines();
  if (extraLines.length === 0) {
    process.exit(0);
  }

  const allLines = [...parsed.lines, ...extraLines];
  writeFileSync(newFile, serializeChangeset(parsed.frontmatter, allLines), 'utf8');

  const count = allLines.length;
  console.log(`\n\x1b[32m✓\x1b[0m Summary updated — ${count} entr${count === 1 ? 'y' : 'ies'}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
