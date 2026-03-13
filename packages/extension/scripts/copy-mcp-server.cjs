'use strict';

const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '../../cli/dist/mcp/dispatch-server.js');
const dest = path.resolve(__dirname, '../dist/mcp/dispatch-server.js');
const destPackageJson = path.resolve(__dirname, '../dist/mcp/package.json');

if (!fs.existsSync(src)) {
  console.error(
    `[copy-mcp-server] Source not found: ${src}\nRun: pnpm --filter @agent-teams/cli build`,
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
fs.writeFileSync(destPackageJson, `${JSON.stringify({ type: 'module' }, null, 2)}\n`, 'utf-8');
console.log(`[copy-mcp-server] Copied dispatch-server.js → ${dest}`);
console.log(`[copy-mcp-server] Wrote module package.json → ${destPackageJson}`);
