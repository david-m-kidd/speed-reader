# Chosen dependency versions

Installed October 17, 2026 from npm stable tags. `package-lock.json` is authoritative; use `npm ci` for reproduction. Development used Node.js 24.19.0 and npm 12.2.0. GitHub Actions selects Node 24.

| Package | Locked version |
| --- | --- |
| @eslint/js | 10.0.1 |
| @fontsource-variable/dm-sans | 5.3.0 |
| @playwright/test | 1.64.1 |
| @types/node | 26.6.5 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @vitejs/plugin-react | 6.1.2 |
| dexie | 4.4.6 |
| eslint | 10.13.0 |
| fake-indexeddb | 6.2.6 |
| lucide-react | 1.59.0 |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| typescript | 6.0.3 |
| typescript-eslint | 8.71.2 |
| vite | 8.3.4 |
| vite-plugin-pwa | 2.0.0 |
| vitest | 5.0.5 |

Actions verified against official upstream releases during implementation: checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5. Their workflow still requires a real GitHub run after pushing; it has not run remotely.

Sources: [Vite](https://vite.dev/guide/), [Vite PWA React integration](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/frameworks/react.md), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), and upstream action repositories under https://github.com/actions.
