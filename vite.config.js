/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
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
        {
            name: 'tabler-font-display',
            transform(code, id) {
                if (id.includes('tabler-icons.min.css')) {
                    return code.replace(
                        '@font-face{font-family:"tabler-icons"',
                        '@font-face{font-display:swap;font-family:"tabler-icons"',
                    );
                }
            }
        },
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'robots.txt'],
            manifest: {
                name: 'ERP Sales Management',
                short_name: 'ERP',
                description: 'Système de gestion des ventes ERP Algérien',
                theme_color: '#1F3864',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                orientation: 'any',
                lang: 'ar-DZ',
                dir: 'rtl',
                icons: [
                    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,woff,woff2,ttf,png,svg,jpg,jpeg}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                navigateFallback: null,
            },
        }),
        // Copy sw.js and workbox-*.js to public/ root so SW is at /sw.js (default scope /)
        // MUST run in closeBundle: vite-plugin-pwa generates sw.js in ITS closeBundle hook,
        // so writeBundle would copy a stale build. closeBundle of a later-registered plugin
        // runs after the PWA plugin's, so the freshly generated sw.js is copied.
        {
            name: 'copy-sw-to-root',
            closeBundle: {
                order: 'post',
                sequential: true,
                handler() {
                    const buildDir = path.resolve(__dirname, 'public/build');
                    const publicDir = path.resolve(__dirname, 'public');
                    const files = fs.readdirSync(buildDir).filter(f => f === 'sw.js' || f.startsWith('workbox-'));
                    for (const file of files) {
                        fs.copyFileSync(path.join(buildDir, file), path.join(publicDir, file));
                    }
                },
            },
        },
    ],
    resolve: {
        alias: {
            '@':             path.resolve(__dirname, './resources/js'),
        },
    },
    build: {
        chunkSizeWarningLimit: 1100,
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
