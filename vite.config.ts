import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  // Transpile modern syntax for Figma plugin sandbox compatibility
  esbuild: {
    target: 'es2017'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Figma plugin sandbox requires ES2017 — transpiles ??, ?., ??= away
    target: 'es2017',
    rollupOptions: {
      input: {
        plugin: resolve(__dirname, 'src/plugin/index.ts'),
        ui: resolve(__dirname, 'ui.html')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'plugin') {
            return 'code.js';
          }
          return '[name].js';
        },
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]'
      }
    }
  },
  // Optional: configure how the plugin and UI are served during development
  server: {
    port: 5173,
    strictPort: true
  },
  // Optimize dependencies for faster cold start
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});