import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import eslint from 'vite-plugin-eslint'

// https://vite.dev/config/
export default defineConfig({
    plugins: [cloudflare(), eslint()],
    define: {
        __BUILD_HASH__: JSON.stringify(process.env.WORKERS_CI_COMMIT_SHA || 'DEV'),
    },
    server: {
        allowedHosts: ['localhost.test'],
    },
})
