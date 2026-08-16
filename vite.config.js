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
                name: 'POSDZ — نظام إدارة المبيعات',
                short_name: 'POSDZ',
                description: 'POSDZ — نظام إدارة المبيعات والبوابة الجزائري',
                theme_color: '#0a8a5c',
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
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,woff,woff2,ttf,png,svg,jpg,jpeg}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                // NO navigateFallback: this is a Laravel+Blade SPA with no static
                // index.html in the precache. Workbox's navigateFallback uses
                // createHandlerBoundToURL which THROWS non-precached-url for any
                // URL not in the precache manifest. Full-page navigations must hit
                // the network (Laravel serves the app shell); SPA client-side nav
                // is handled by react-router and never hits the SW.
                navigateFallback: null,
                runtimeCaching: [
                    // ppu-paddle-ocr model files + onnxruntime-web wasm/runtime.
                    // The OCR engine fetches the PP-OCRv6 detection/recognition
                    // models + dictionary from the ppu GitHub CDN and the
                    // onnxruntime-web wasm from jsDelivr on FIRST use. Cache
                    // them CacheFirst so the OCR modal works offline after the
                    // first successful run (same constraint as the old
                    // tesseract traineddata, but persisted).
                    {
                        urlPattern: /^https:\/\/media\.githubusercontent\.com\/media\/PT-Perkasa-Pilar-Utama\/ppu-paddle-ocr-models/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'ocr-models-cache',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 30 * 24 * 60 * 60,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PT-Perkasa-Pilar-Utama\/ppu-paddle-ocr-models/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'ocr-models-cache',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 30 * 24 * 60 * 60,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'ocr-models-cache',
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 30 * 24 * 60 * 60,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // Health/status probe: ALWAYS live — a diagnostic page must
                    // reflect reality, never a stale cached response. This must
                    // sit BEFORE the generic /api/v1/ rule (first match wins).
                    {
                        urlPattern: /\/api\/v1\/health/,
                        handler: 'NetworkOnly',
                    },
                    // Product photos via image-proxy: the request URL is
                    // /api/v1/image-proxy?url=...&w=... — it ends with query
                    // params, NOT an image extension, so the extension-based
                    // image rule below never matches it and it would fall into
                    // the generic /api/v1/ NetworkFirst rule. Cache it CacheFirst
                    // (same image-cache store) so the portal catalog / POS /
                    // products show their photos instantly and offline.
                    {
                        urlPattern: /\/api\/v1\/image-proxy/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 500,
                                maxAgeSeconds: 7 * 24 * 60 * 60,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // API: network-first, fall back to cached response for 1 day
                    {
                        urlPattern: /\/api\/v1\//,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            networkTimeoutSeconds: 4,
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 24 * 60 * 60,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // Images (incl. external product photos via proxy): cache-first
                    {
                        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico|gif|avif)(?:\?.*)?$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 500,
                                maxAgeSeconds: 7 * 24 * 60 * 60,
                            },
                        },
                    },
                    // Static assets: serve from cache instantly, refresh in background
                    {
                        urlPattern: /\.(?:woff|woff2|ttf|otf|css|js)$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'static-cache',
                            expiration: {
                                maxEntries: 120,
                                maxAgeSeconds: 7 * 24 * 60 * 60,
                            },
                        },
                    },
                ],
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
