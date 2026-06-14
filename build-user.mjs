/**
 * Programmatic Vite build that bypasses the root-owned node_modules/.vite-temp problem.
 * Run: node build-user.mjs
 * Outputs to public/dist-app/assets-user/ and updates public/dist-app/manifest.json.
 */
import { build } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

await build({
  configFile: false,          // skip config-file bundling → no .vite-temp needed
  cacheDir: '/tmp/vite-cache-corpu',
  root: process.cwd(),
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.jsx'],
      buildDirectory: 'dist-app',
      refresh: false,
    }),
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'public/dist-app',
    assetsDir: 'assets-user',    // user-writable subdir (not the root-owned assets/)
    emptyOutDir: false,          // don't try to delete root-owned assets/
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
