'use strict';

const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '../../core/schemas');
const dest = path.resolve(__dirname, '../dist/schemas');

function copyDirSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(src)) {
  console.error(`[copy-schemas] Source directory not found: ${src}`);
  process.exit(1);
}

copyDirSync(src, dest);
console.log(`[copy-schemas] Copied schemas → ${dest}`);
