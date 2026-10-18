import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.APP_BASE || (repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/');
export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'prompt', injectRegister: false, base, scope: base,
    includeAssets: ['icon.svg', 'apple-touch-icon.png', 'samples/NOTICE.txt', 'PDFjs-LICENSE.txt', 'fflate-LICENSE.txt'],
    manifest: {
      name: 'Stillword — Focus Reader', short_name: 'Stillword', description: 'A quieter place to read.',
      id: base, start_url: base, scope: base, display: 'standalone',
      background_color: '#151a18', theme_color: '#151a18',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    },
    workbox: { globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, navigateFallback: `${base}index.html`, cleanupOutdatedCaches: true },
  })],
});
