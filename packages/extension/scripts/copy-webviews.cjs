const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '../../webviews/dist');
const dest = path.resolve(__dirname, '../dist/webviews');
const RETRYABLE_FS_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRetryable(error) {
  return Boolean(error && RETRYABLE_FS_CODES.has(error.code));
}

function runWithRetries(operation, attempts = 25, delayMs = 100) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || i === attempts - 1) {
        throw error;
      }
      sleep(delayMs);
    }
  }
  throw lastError;
}

function safeRemoveDir(target) {
  try {
    runWithRetries(() =>
      fs.rmSync(target, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      }),
    );
    return;
  } catch (error) {
    if (!isRetryable(error)) {
      throw error;
    }
  }

  if (!fs.existsSync(target)) {
    return;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    try {
      if (entry.isDirectory()) {
        runWithRetries(() =>
          fs.rmSync(entryPath, {
            recursive: true,
            force: true,
            maxRetries: 10,
            retryDelay: 100,
          }),
        );
      } else {
        runWithRetries(() => fs.unlinkSync(entryPath));
      }
    } catch (error) {
      if (!isRetryable(error)) {
        throw error;
      }
    }
  }
}

function copyRecursive(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(sourcePath, targetPath);
      continue;
    }

    runWithRetries(() => fs.copyFileSync(sourcePath, targetPath), 60, 100);
  }
}

function waitForSourceDist(source, attempts = 120, delayMs = 100) {
  for (let i = 0; i < attempts; i += 1) {
    if (fs.existsSync(source) && fs.readdirSync(source).length > 0) {
      return;
    }
    sleep(delayMs);
  }
  throw new Error(`Webviews build output not found or empty: ${source}`);
}

waitForSourceDist(src);
safeRemoveDir(dest);
copyRecursive(src, dest);
