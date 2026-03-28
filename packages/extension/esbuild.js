'use strict';

const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './dist/extension.js',
  // vscode is provided by VS Code at runtime — never bundle it
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: watch, // only in watch/dev mode
  minify: !watch, // minify in production builds
  logLevel: 'info',
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('[esbuild] Watching for changes…');
  } else {
    await esbuild.build(buildOptions);
  }

  // Copy bundled agent YAML files to dist so the extension can read them at runtime
  const src = path.resolve(__dirname, 'media', 'bundled-agents');
  const dest = path.resolve(__dirname, 'dist', 'media', 'bundled-agents');
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }

  // Copy bundled skill files to dist so the extension can read them at runtime
  const skillsSrc = path.resolve(__dirname, 'media', 'bundled-skills');
  const skillsDest = path.resolve(__dirname, 'dist', 'media', 'bundled-skills');
  if (fs.existsSync(skillsSrc)) {
    fs.cpSync(skillsSrc, skillsDest, { recursive: true });
  }

  // Copy webviews dist so the webview panel can load them at startup
  const webviewsSrc = path.resolve(__dirname, '../webviews/dist');
  const webviewsDest = path.resolve(__dirname, 'dist/webviews');
  if (fs.existsSync(webviewsSrc)) {
    fs.cpSync(webviewsSrc, webviewsDest, { recursive: true });
  }
}

main().catch(() => process.exit(1));
