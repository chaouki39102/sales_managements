import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const laravelPlugin = laravel.default || laravel;

export default defineConfig({
    plugins: [
        laravelPlugin({
            input: ['resources/js/app.jsx', 'resources/css/app.css'],
            refresh: true,
        }),
        react({
            // إخبار الإضافة صراحة بعدم استخدام المحرك القديم
            babel: {
                compact: true,
            }
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    // الحل المباشر لتحذير optimizeDeps
    optimizeDeps: {
        rolldownOptions: {
            // توجيه Vite لاستخدام التسمية الجديدة للمحرك
        }
    },
    // لإخفاء تحذير esbuild، نحدد المحرك المفضل للـ SSR أيضاً
    ssr: {
        optimizeDeps: {
            rolldownOptions: {}
        }
    },
    server: {
        port: 5173,
        host: '127.0.0.1',
    },
});
