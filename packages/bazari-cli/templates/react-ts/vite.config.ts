import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // CRITICAL: Use relative base for IPFS compatibility
  // When served from /ipfs/CID/, assets must be relative paths
  base: './',
  server: {
    port: 3333,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure assets use relative paths
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Use relative paths for chunk imports
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
