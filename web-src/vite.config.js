import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: '../web',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: { port: 5173 }
});
