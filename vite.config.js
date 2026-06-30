/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.jsx', 'resources/css/app.css'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@':             path.resolve(__dirname, './resources/js'),
        },
    },
    server: {
        port: 5173,
        host: '127.0.0.1',
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['resources/js/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['resources/js/**/*.pw.spec.ts'],
        root: '.',
    },
});
