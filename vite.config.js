import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    cacheDir: 'node_modules/.vite-corpu-cache',
    build: {
        emptyOutDir: false,
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            buildDirectory: 'dist-app',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
});
