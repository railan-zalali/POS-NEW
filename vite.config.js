import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
// https://vite.dev/config/

const getPackageName = (id) => {
    const normalizedId = id.replace(/\\/g, '/');
    const marker = '/node_modules/';
    const markerIndex = normalizedId.lastIndexOf(marker);
    if (markerIndex === -1) {
        return '';
    }
    const packagePath = normalizedId.slice(markerIndex + marker.length);
    const [scopeOrName, packageName] = packagePath.split('/');
    if (scopeOrName?.startsWith('@') && packageName) {
        return `${scopeOrName}/${packageName}`;
    }
    return scopeOrName || '';
};
const matchesPackageGroup = (id, packageNames) => {
    const packageName = getPackageName(id);
    return packageNames.some((name) => {
        if (name.endsWith('/*')) {
            const prefix = name.slice(0, -2);
            return packageName === prefix || packageName.startsWith(`${prefix}/`);
        }
        if (name.endsWith('-*')) {
            const prefix = name.slice(0, -2);
            return packageName === prefix || packageName.startsWith(`${prefix}-`);
        }
        return packageName === name;
    });
};

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons.svg'],
            manifest: {
                name: 'Toko Tani Makmur',
                short_name: 'TaniMakmur',
                description: 'Aplikasi POS Toko Tani Makmur',
                theme_color: '#2D6A4F',
                background_color: '#F8F9FA',
                display: 'standalone',
                orientation: 'landscape',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return;
                    }
                    if (matchesPackageGroup(id, ['@radix-ui/*', '@floating-ui/*', 'react-remove-scroll', 'react-remove-scroll-bar', 'react-focus-scope', 'react-slot', 'react-collection', 'react-context', 'react-primitive', 'react-use-measure', 'react-popper', 'aria-*', 'lucide-react'])) {
                        return 'ui';
                    }
                    if (matchesPackageGroup(id, ['react', 'react-dom', 'react-router-dom', 'react-is', 'scheduler', 'use-sync-external-store', 'loose-envify', 'js-tokens', 'react-*', 'cmdk', '@tanstack/*', 'react-hot-toast', 'react-hook-form', 'react-dropzone', 'dexie-react-hooks'])) {
                        return 'react-vendor';
                    }
                    if (matchesPackageGroup(id, ['dexie'])) {
                        return 'db';
                    }
                    if (matchesPackageGroup(id, ['@supabase/*'])) {
                        return 'supabase';
                    }
                    if (matchesPackageGroup(id, ['recharts', 'd3-*', 'victory-*', 'internmap', 'delaunator', 'robust-predicates'])) {
                        return 'charts';
                    }
                    if (matchesPackageGroup(id, ['framer-motion', 'motion-*', 'framesync'])) {
                        return 'motion';
                    }
                    if (matchesPackageGroup(id, ['@react-pdf/*', 'pdfkit', 'fontkit', 'yoga-layout', 'linebreak', 'unicode-*'])) {
                        return 'pdf';
                    }
                    if (matchesPackageGroup(id, ['@zxing/*', 'browser-image-compression', 'jpeg-js', 'pngjs', 'utif'])) {
                        return 'media';
                    }
                    if (matchesPackageGroup(id, ['date-fns'])) {
                        return 'date';
                    }
                    if (matchesPackageGroup(id, ['xlsx', 'cfb', 'codepage', 'crc-32', 'ssf', 'frac', 'wmf', 'parse-svg-path'])) {
                        return 'excel';
                    }
                    if (matchesPackageGroup(id, ['zod', '@hookform/resolvers'])) {
                        return 'validation';
                    }
                    if (matchesPackageGroup(id, ['zustand'])) {
                        return 'state';
                    }
                    if (matchesPackageGroup(id, ['clsx', 'tailwind-merge', 'class-variance-authority', 'tailwindcss-animate'])) {
                        return 'styling';
                    }
                    return 'vendor';
                },
            },
        },
    },
});
