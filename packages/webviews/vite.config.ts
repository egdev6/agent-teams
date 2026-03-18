import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Bundle analyzer (excluded from VSIX via .vscodeignore)
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@agent-teams/core': resolve(__dirname, '../core/src/index.ts'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@styles': resolve(__dirname, './src/styles'),
      '@lib': resolve(__dirname, './src/lib'),
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        manualChunks(id) {
          if (id.includes('/node_modules/')) {
            if (id.includes('/lucide-react/')) {
              return 'icons';
            }
            if (id.includes('/@radix-ui/')) {
              return 'radix-ui';
            }
            // Group all remaining node_modules (react, react-dom, react-router,
            // scheduler, and other small deps) into one vendor chunk to avoid
            // circular references between react internals and their peer deps.
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 4096,
  },
});
