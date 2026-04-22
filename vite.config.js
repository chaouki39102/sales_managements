import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
const laravelPlugin = laravel.default || laravel;
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        laravelPlugin({
            input: ['resources/js/app.jsx', 'resources/css/app.css'],
            buildDirectory: 'build',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    build: {
        outDir: 'public/build',
        emptyOutDir: true,
    },
    publicDir: false,
    server: {
        port: 5173,
        host: '127.0.0.1',
    },
});
